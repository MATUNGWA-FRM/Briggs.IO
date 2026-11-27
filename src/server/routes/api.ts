import { Router } from 'express';
import type {
  AlertEvent,
  AlertRule,
  BriggFilterPreset,
  BriggMode,
  ChartTimeframe,
  Horizon,
  LiveMarketTick,
  ScannerTokenSummary,
  TokenFullAnalysis,
} from '../../shared/types.ts';
import { buildChartIntelligence, tfToSeconds } from '../analytics/chartAnalytics.ts';
import { estimateSlippageAndExecution, runAutomatedChecklist } from '../analytics/checklist.ts';
import { buildTokenForensics } from '../analytics/forensics.ts';
import { analyzeHoldersAndWallets } from '../analytics/holders.ts';
import { analyzeLiquidity } from '../analytics/liquidity.ts';
import { detectMarketRegime } from '../analytics/marketRegime.ts';
import { evaluateRiskEngine } from '../analytics/riskEngine.ts';
import { analyzeSocialAndNarrative } from '../analytics/social.ts';
import { analyzeVolume } from '../analytics/volume.ts';
import { INITIAL_FILTER_PRESETS, SERVER_CONFIG } from '../config.ts';
import { aggregateTokenSources } from '../connectors/aggregator.ts';
import type { NormalizedMarketPayload } from '../connectors/base.ts';
import {
  fetchDexScreenerLiveQuote,
  fetchDexScreenerScannerUniverse,
  searchDexScreenerTokens,
} from '../connectors/dexscreener/adapter.ts';
import { getDb, logAudit } from '../database/db.ts';
import { buildBubbleMapPayload } from '../graph/bubbleMapBuilder.ts';
import { listPredictionsWithOutcomes, runHistoricalBacktest } from '../ml/backtest.ts';
import { buildEngineeredFeatures, FEATURE_REGISTRY } from '../ml/features.ts';
import {
  evaluateOutcomeForPrediction,
  getProductionWeights,
  listHumanOverrides,
  listModelVersions,
  recordHumanOverride,
  recordPredictionSnapshot,
  rollbackToModelVersion,
  runDailyLearningCycle,
} from '../ml/learningPipeline.ts';
import { computeBriggScorePanel } from '../ml/scoring.ts';
import { ensureInitialMlData } from '../ml/seedHistory.ts';
import { getSystemObservability, recordAnalysisLatency } from '../security/observability.ts';
import {
  AlertRuleInputSchema,
  BacktestRequestSchema,
  OverrideInputSchema,
  sanitizeTextInput,
  ScannerQuerySchema,
  TokenAddressParamSchema,
  TokenAnalysisQuerySchema,
} from '../security/validators.ts';

async function evaluateAndStoreAlerts(analysis: TokenFullAnalysis): Promise<AlertEvent[]> {
  const db = getDb();
  const rules = db
    .prepare(`SELECT * FROM alert_rules WHERE enabled = 1`)
    .all() as Array<Record<string, unknown>>;
  const triggered: AlertEvent[] = [];

  for (const r of rules) {
    const cond = String(r.condition_type) as AlertRule['condition_type'];
    const thresh = Number(r.threshold);
    let match = false;
    let detail = '';

    if (cond === 'OPPORTUNITY_ABOVE' && analysis.score_panel.opportunity_score >= thresh) {
      match = true;
      detail = `Opportunity ${analysis.score_panel.opportunity_score}/100 >= ${thresh}`;
    } else if (cond === 'RISK_BELOW' && analysis.score_panel.risk_score <= thresh) {
      match = true;
      detail = `Risk ${analysis.score_panel.risk_score}/100 <= ${thresh}`;
    } else if (cond === 'LIQUIDITY_DECLINE' && analysis.liquidity.liquidity_growth_1h_pct <= thresh) {
      match = true;
      detail = `Liquidity 1H delta ${analysis.liquidity.liquidity_growth_1h_pct}% <= ${thresh}%`;
    } else if (cond === 'BUNDLE_DETECTION' && analysis.holders.bundle_analysis.combined_supply_pct >= thresh) {
      match = true;
      detail = `Bundle supply ${analysis.holders.bundle_analysis.combined_supply_pct}% >= ${thresh}%`;
    } else if (cond === 'VOLUME_ACCELERATION' && analysis.volume.volume_acceleration_pct >= thresh) {
      match = true;
      detail = `Volume acceleration +${analysis.volume.volume_acceleration_pct}% >= ${thresh}%`;
    }

    if (match) {
      // Avoid duplicate alert spam within 15 mins for same rule+token
      const recent = db
        .prepare(
          `SELECT id FROM alerts WHERE rule_id = ? AND token_address = ? AND timestamp > ? LIMIT 1`
        )
        .get(String(r.id), analysis.forensics.address, new Date(Date.now() - 900_000).toISOString());

      if (!recent) {
        const channels = ['dashboard'];
        if (Number(r.channel_telegram) === 1 && SERVER_CONFIG.providers.telegram.configured) {
          channels.push('telegram');
        }
        const ev: AlertEvent = {
          id: `alt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          rule_id: String(r.id),
          token_address: analysis.forensics.address,
          symbol: analysis.forensics.symbol,
          title: String(r.name),
          detail,
          severity: cond === 'LIQUIDITY_DECLINE' || cond === 'BUNDLE_DETECTION' ? 'HIGH_PRIORITY' : 'INFO',
          timestamp: new Date().toISOString(),
          acknowledged: false,
          delivered_channels: channels,
        };
        db.prepare(
          `INSERT INTO alerts (id, rule_id, token_address, symbol, title, detail, severity, timestamp, acknowledged, delivered_channels_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`
        ).run(
          ev.id,
          ev.rule_id,
          ev.token_address,
          ev.symbol,
          ev.title,
          ev.detail,
          ev.severity,
          ev.timestamp,
          JSON.stringify(ev.delivered_channels)
        );
        triggered.push(ev);
      }
    }
  }
  return triggered;
}

export async function buildFullTokenAnalysis(
  address: string,
  mode: BriggMode,
  horizon: Horizon,
  timeframe: ChartTimeframe,
  positionSizeUsd: number,
  universeCache?: NormalizedMarketPayload[]
): Promise<TokenFullAnalysis> {
  const procStart = Date.now();
  ensureInitialMlData();

  const [agg, universe] = await Promise.all([
    aggregateTokenSources(address),
    universeCache ? Promise.resolve(universeCache) : fetchDexScreenerScannerUniverse(),
  ]);

  const forensics = buildTokenForensics(agg);
  const liquidity = analyzeLiquidity(agg);
  const volume = analyzeVolume(agg);
  const holders = analyzeHoldersAndWallets(agg);
  const chart = buildChartIntelligence(agg, timeframe);
  const social = analyzeSocialAndNarrative(agg);
  const risk = evaluateRiskEngine({ forensics, liquidity, volume, holders, social });
  const checklist = runAutomatedChecklist({ mode, forensics, liquidity, volume, holders, chart, social });
  const slippage = estimateSlippageAndExecution({
    priceUsd: forensics.price_usd,
    liquidityUsd: liquidity.current_liquidity_usd,
    positionSizeUsd,
    executionQualityBase: liquidity.execution_quality_score,
  });
  const regime = detectMarketRegime(universe);

  const nowIso = new Date().toISOString();
  const features = buildEngineeredFeatures({
    mode,
    predictionTimeIso: nowIso,
    forensics,
    liquidity,
    volume,
    holders,
    chart,
    social,
    regime,
    executionQuality: slippage.execution_quality_score,
    freshnessSeconds: agg.avgFreshnessSeconds,
  });

  const weights = getProductionWeights();
  const scorePanel = computeBriggScorePanel({
    tokenAddress: address,
    symbol: forensics.symbol,
    mode,
    horizon,
    features,
    liquidity,
    volume,
    holders,
    chart,
    social,
    risk,
    checklist,
    slippage,
    regime,
    conflicts: agg.conflicts,
    freshnessSeconds: agg.avgFreshnessSeconds,
    weights,
  });

  const processingDelayMs = Date.now() - procStart;
  recordAnalysisLatency(processingDelayMs);

  const analysis: TokenFullAnalysis = {
    forensics,
    liquidity,
    volume,
    holders,
    chart,
    social,
    risk,
    checklist,
    slippage,
    regime,
    features,
    score_panel: scorePanel,
    historical_predictions: listPredictionsWithOutcomes(address),
    human_overrides: listHumanOverrides(address),
    data_sources: agg.allMeta,
    conflicts: agg.conflicts,
    freshness: {
      updated_seconds_ago: agg.avgFreshnessSeconds,
      source_freshness_ms: agg.avgFreshnessSeconds * 1000,
      ingestion_delay_ms: agg.ingestionDelayMs,
      processing_delay_ms: processingDelayMs,
      total_analysis_latency_ms: agg.ingestionDelayMs + processingDelayMs,
      is_stale: agg.avgFreshnessSeconds > 120,
      stale_warning:
        agg.avgFreshnessSeconds > 120
          ? 'Critical market sources exceeded 120s freshness window; confidence reduced.'
          : undefined,
    },
  };

  await evaluateAndStoreAlerts(analysis);
  return analysis;
}

export function createApiRouter(): Router {
  const router = Router();
  ensureInitialMlData();

  router.get('/health', (_req, res) => {
    res.json(getSystemObservability());
  });

  router.get('/scanner', async (req, res) => {
    const parsed = ScannerQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid scanner parameters', details: parsed.error.flatten() });
      return;
    }

    const { mode, horizon, preset, sortBy, q, minLiquidity, maxRisk, minOpportunity, hideNewPairs, migratedOnly } =
      parsed.data;

    try {
      let universe = q && q.trim().length > 1
        ? await searchDexScreenerTokens(sanitizeTextInput(q, 48))
        : await fetchDexScreenerScannerUniverse();

      if (universe.length === 0 && q) {
        universe = await fetchDexScreenerScannerUniverse();
      }

      const presetObj: BriggFilterPreset =
        INITIAL_FILTER_PRESETS.find((p) => p.id === preset) || INITIAL_FILTER_PRESETS[0];

      // Build lightweight full analysis for ranking & explainability across universe
      const summaries: ScannerTokenSummary[] = await Promise.all(
        universe.slice(0, 14).map(async (item) => {
          const full = await buildFullTokenAnalysis(item.address, mode, horizon, '15M', 1500, universe);
          return {
            address: full.forensics.address,
            symbol: full.forensics.symbol,
            name: full.forensics.name,
            chain: 'solana',
            age_minutes: full.forensics.age_minutes,
            price_usd: full.forensics.price_usd,
            price_change_5m: full.forensics.price_change_5m,
            price_change_1h: full.forensics.price_change_1h,
            market_cap_usd: full.forensics.market_cap_usd,
            liquidity_usd: full.liquidity.current_liquidity_usd,
            volume_24h_usd: full.volume.reported_volume_24h_usd,
            holder_count: full.holders.holder_count,
            top_10_pct: full.holders.top_10_concentration_pct,
            sniper_pct: full.holders.sniper_analysis.supply_pct,
            insider_exposure: full.holders.insider_analysis.exposure_score,
            bundle_pct: full.holders.bundle_analysis.combined_supply_pct,
            migration_status: full.forensics.migration_status,
            social_momentum: full.social.social_momentum_score,
            holder_growth_1h_pct: full.holders.holder_growth_1h_pct,
            opportunity_score: full.score_panel.opportunity_score,
            risk_score: full.score_panel.risk_score,
            confidence_pct: full.score_panel.confidence_pct,
            execution_quality: full.score_panel.execution_quality,
            action_state: full.score_panel.action_state,
            ranking_explanation:
              full.score_panel.no_trade.triggered
                ? full.score_panel.no_trade.headline
                : full.score_panel.explainability.why_opportunity_exists[0]?.text || 'Balanced multi-factor flow',
            has_source_conflict: full.conflicts.length > 0,
            data_status: full.forensics.data_status,
            freshness_seconds: full.freshness.updated_seconds_ago,
            active_providers: ['dexscreener', 'mevx', 'gmgn', 'padre'],
          };
        })
      );

      const effMinLiq = minLiquidity ?? (preset !== 'GENERAL' ? presetObj.min_liquidity_usd : 0);
      const effHideNew = hideNewPairs ? hideNewPairs === 'true' : presetObj.hide_new_pairs;
      const effMigrated = migratedOnly ? migratedOnly === 'true' : presetObj.migrated_only;

      const filtered = summaries.filter((t) => {
        if (q) {
          const ql = q.toLowerCase();
          const match =
            t.symbol.toLowerCase().includes(ql) ||
            t.name.toLowerCase().includes(ql) ||
            t.address.toLowerCase().includes(ql);
          if (!match && universe.length > 1) return false;
        }
        if (t.liquidity_usd < effMinLiq) return false;
        if (maxRisk !== undefined && t.risk_score > maxRisk) return false;
        if (minOpportunity !== undefined && t.opportunity_score < minOpportunity) return false;
        if (effHideNew && t.age_minutes < 15) return false;
        if (effMigrated && t.migration_status !== 'MIGRATED') return false;
        return true;
      });

      filtered.sort((a, b) => {
        switch (sortBy) {
          case 'risk':
            return a.risk_score - b.risk_score;
          case 'confidence':
            return b.confidence_pct - a.confidence_pct;
          case 'volume':
            return b.volume_24h_usd - a.volume_24h_usd;
          case 'liquidity':
            return b.liquidity_usd - a.liquidity_usd;
          case 'age':
            return a.age_minutes - b.age_minutes;
          case 'social':
            return b.social_momentum - a.social_momentum;
          case 'holder_growth':
            return b.holder_growth_1h_pct - a.holder_growth_1h_pct;
          default:
            return b.opportunity_score - a.opportunity_score;
        }
      });

      const regime = detectMarketRegime(universe);
      res.json({
        mode,
        horizon,
        preset: presetObj,
        regime,
        total_scanned: summaries.length,
        tokens: filtered.length > 0 ? filtered : summaries,
      });
    } catch (err) {
      res.status(500).json({ error: 'Scanner pipeline failure', detail: String(err) });
    }
  });

  router.get('/token/:address', async (req, res) => {
    const paramParsed = TokenAddressParamSchema.safeParse(req.params);
    if (!paramParsed.success) {
      res.status(400).json({ error: paramParsed.error.issues[0]?.message || 'Invalid token address' });
      return;
    }
    const queryParsed = TokenAnalysisQuerySchema.safeParse(req.query);
    if (!queryParsed.success) {
      res.status(400).json({ error: 'Invalid query parameters', details: queryParsed.error.flatten() });
      return;
    }

    try {
      const analysis = await buildFullTokenAnalysis(
        paramParsed.data.address,
        queryParsed.data.mode,
        queryParsed.data.horizon,
        queryParsed.data.timeframe,
        queryParsed.data.positionSizeUsd
      );
      const bubbleMap = buildBubbleMapPayload(analysis.holders);
      res.json({ ...analysis, bubble_map: bubbleMap });
    } catch (err) {
      res.status(500).json({ error: 'Token analysis error', detail: String(err) });
    }
  });

  router.get('/stream/:address', async (req, res) => {
    const paramParsed = TokenAddressParamSchema.safeParse(req.params);
    if (!paramParsed.success) {
      res.status(400).json({ error: paramParsed.error.issues[0]?.message || 'Invalid token address' });
      return;
    }

    const rawTf = String(req.query.timeframe || '15M').toUpperCase();
    const validTfs: ChartTimeframe[] = ['1M', '5M', '15M', '1H', '4H', '24H'];
    const timeframe: ChartTimeframe = validTfs.includes(rawTf as ChartTimeframe)
      ? (rawTf as ChartTimeframe)
      : '15M';
    const stepSec = tfToSeconds(timeframe);
    const address = paramParsed.data.address;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    let closed = false;
    let lastLivePrice = 0;
    let workingPrice = 0;
    let tickCount = 0;
    const makers = ['7xKp...3mQa', '9vRt...8pWz', '4dLm...2cYn', '6bHq...5rVx', '2nFs...9kTe', '5wJc...1zGp'];

    const sendTick = async () => {
      if (closed) return;
      try {
        const quote = await fetchDexScreenerLiveQuote(address);
        const nowMs = Date.now();
        const nowSec = Math.floor(nowMs / 1000);
        const candleTime = Math.floor(nowSec / stepSec) * stepSec;

        const realChanged = lastLivePrice > 0 && Math.abs(quote.price_usd - lastLivePrice) > 1e-12;
        if (lastLivePrice === 0 || realChanged) {
          lastLivePrice = quote.price_usd;
          workingPrice = quote.price_usd;
        } else {
          // Smooth intrabar orderflow movement anchored strictly within +/-0.45% of latest live quote
          const buyBias = (quote.buys_5m - quote.sells_5m) / Math.max(10, quote.buys_5m + quote.sells_5m);
          const wave = Math.sin(tickCount * 1.15) * 0.0014 + (Math.random() - 0.48 + buyBias * 0.16) * 0.0018;
          workingPrice = Math.max(1e-9, workingPrice * (1 + wave));
          const maxDrift = quote.price_usd * 0.0045;
          if (Math.abs(workingPrice - quote.price_usd) > maxDrift) {
            workingPrice = quote.price_usd + Math.sign(workingPrice - quote.price_usd) * maxDrift * 0.7;
          }
        }

        const tickSource: LiveMarketTick['tick_source'] =
          quote.meta.data_status === 'MOCK'
            ? 'MOCK'
            : realChanged || tickCount === 0
            ? 'LIVE_DEXSCREENER'
            : 'ESTIMATED_INTRABAR';

        const isBuy = workingPrice >= lastLivePrice || Math.random() < 0.54;
        const avgTradeSize = Math.max(45, Math.min(8500, Math.round((quote.volume_5m_usd || 4000) / 18)));
        const tradeAmountUsd = Math.round(avgTradeSize * (0.25 + Math.random() * 1.65));
        const barVolumeDelta = Math.max(25, Math.round(tradeAmountUsd * 0.85));

        const payload: LiveMarketTick = {
          address,
          symbol: quote.symbol,
          timeframe,
          timestamp_ms: nowMs,
          candle_time: candleTime,
          price_usd: Number(workingPrice.toPrecision(7)),
          price_change_5m: quote.price_change_5m,
          price_change_1h: quote.price_change_1h,
          market_cap_usd: quote.market_cap_usd,
          liquidity_usd: quote.liquidity_usd,
          volume_24h_usd: quote.volume_24h_usd,
          buys_5m: quote.buys_5m + (isBuy ? tickCount % 3 : 0),
          sells_5m: quote.sells_5m + (!isBuy ? tickCount % 3 : 0),
          bar_volume_delta: barVolumeDelta,
          data_status: tickSource === 'MOCK' ? 'MOCK' : tickSource === 'LIVE_DEXSCREENER' ? quote.meta.data_status : 'DERIVED',
          tick_source: tickSource,
          trade: {
            id: `tr_${nowMs}_${tickCount}`,
            timestamp_ms: nowMs,
            side: isBuy ? 'BUY' : 'SELL',
            price_usd: Number(workingPrice.toPrecision(7)),
            amount_usd: tradeAmountUsd,
            maker_short: makers[tickCount % makers.length],
            source: tickSource,
          },
        };

        tickCount += 1;
        res.write(`event: tick\ndata: ${JSON.stringify(payload)}\n\n`);
      } catch {
        // Ignore transient poll errors on stream
      }
    };

    void sendTick();
    const timer = setInterval(() => {
      void sendTick();
    }, 1500);

    req.on('close', () => {
      closed = true;
      clearInterval(timer);
    });
  });

  router.post('/predictions/record', async (req, res) => {
    const bodySchema = TokenAddressParamSchema.extend({
      mode: TokenAnalysisQuerySchema.shape.mode,
      horizon: TokenAnalysisQuerySchema.shape.horizon,
    });
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid prediction request', details: parsed.error.flatten() });
      return;
    }
    try {
      const analysis = await buildFullTokenAnalysis(
        parsed.data.address,
        parsed.data.mode,
        parsed.data.horizon,
        '15M',
        1500
      );
      const id = recordPredictionSnapshot({
        scorePanel: analysis.score_panel,
        features: analysis.features,
        entryPriceUsd: analysis.forensics.price_usd,
        predictionTimestampIso: analysis.features.computed_at_timestamp,
      });
      res.status(201).json({ id, predictions: listPredictionsWithOutcomes(parsed.data.address) });
    } catch (err) {
      res.status(500).json({ error: 'Failed to record prediction', detail: String(err) });
    }
  });

  router.post('/predictions/:id/evaluate', async (req, res) => {
    const id = sanitizeTextInput(req.params.id, 64);
    const db = getDb();
    const pred = db.prepare(`SELECT token_address FROM predictions WHERE id = ?`).get(id) as
      | { token_address: string }
      | undefined;
    if (!pred) {
      res.status(404).json({ error: 'Prediction not found' });
      return;
    }
    try {
      const agg = await aggregateTokenSources(pred.token_address);
      const result = evaluateOutcomeForPrediction({
        predictionId: id,
        currentPriceUsd: agg.primaryMarket.price_usd,
      });
      res.json({ result, predictions: listPredictionsWithOutcomes(pred.token_address) });
    } catch (err) {
      res.status(500).json({ error: 'Outcome evaluation failed', detail: String(err) });
    }
  });

  router.post('/overrides', (req, res) => {
    const parsed = OverrideInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid override payload', details: parsed.error.flatten() });
      return;
    }
    const record = recordHumanOverride({
      token_address: parsed.data.token_address,
      symbol: sanitizeTextInput(parsed.data.symbol, 24),
      model_state: parsed.data.model_state,
      user_decision: parsed.data.user_decision,
      reason: sanitizeTextInput(parsed.data.reason, 300),
    });
    res.status(201).json({ record, overrides: listHumanOverrides(parsed.data.token_address) });
  });

  router.get('/ml/versions', (_req, res) => {
    res.json({
      versions: listModelVersions(),
      feature_registry: FEATURE_REGISTRY,
      recent_predictions: listPredictionsWithOutcomes(),
    });
  });

  router.post('/ml/learn', (req, res) => {
    const simulateDegradation = req.body?.simulate_degradation === true;
    const result = runDailyLearningCycle(simulateDegradation);
    res.json({
      ...result,
      versions: listModelVersions(),
    });
  });

  router.post('/ml/rollback', (req, res) => {
    const version = sanitizeTextInput(String(req.body?.version || ''), 16);
    if (!/^v\d+\.\d+$/.test(version)) {
      res.status(400).json({ error: 'Invalid model version format' });
      return;
    }
    try {
      const active = rollbackToModelVersion(version);
      res.json({ active, versions: listModelVersions() });
    } catch (err) {
      res.status(404).json({ error: String(err) });
    }
  });

  router.post('/backtest', (req, res) => {
    const parsed = BacktestRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid backtest configuration', details: parsed.error.flatten() });
      return;
    }
    res.json(runHistoricalBacktest(parsed.data));
  });

  router.get('/alerts', (_req, res) => {
    const db = getDb();
    const rules = db.prepare(`SELECT * FROM alert_rules ORDER BY created_at DESC`).all() as Array<Record<string, unknown>>;
    const events = db.prepare(`SELECT * FROM alerts ORDER BY timestamp DESC LIMIT 50`).all() as Array<Record<string, unknown>>;

    res.json({
      rules: rules.map((r) => ({
        id: String(r.id),
        name: String(r.name),
        condition_type: String(r.condition_type),
        threshold: Number(r.threshold),
        channel_dashboard: Number(r.channel_dashboard) === 1,
        channel_telegram: Number(r.channel_telegram) === 1,
        enabled: Number(r.enabled) === 1,
        created_at: String(r.created_at),
      })),
      events: events.map((e) => ({
        id: String(e.id),
        rule_id: String(e.rule_id),
        token_address: String(e.token_address),
        symbol: String(e.symbol),
        title: String(e.title),
        detail: String(e.detail),
        severity: String(e.severity),
        timestamp: String(e.timestamp),
        acknowledged: Number(e.acknowledged) === 1,
        delivered_channels: JSON.parse(String(e.delivered_channels_json || '["dashboard"]')),
      })),
    });
  });

  router.post('/alerts/rules', (req, res) => {
    const parsed = AlertRuleInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid alert rule', details: parsed.error.flatten() });
      return;
    }
    const db = getDb();
    const id = `rule_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const nowIso = new Date().toISOString();
    db.prepare(
      `INSERT INTO alert_rules (id, name, condition_type, threshold, channel_dashboard, channel_telegram, enabled, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?)`
    ).run(
      id,
      sanitizeTextInput(parsed.data.name, 80),
      parsed.data.condition_type,
      parsed.data.threshold,
      parsed.data.channel_dashboard ? 1 : 0,
      parsed.data.channel_telegram ? 1 : 0,
      nowIso
    );
    logAudit('ALERT_RULE_CREATED', 'user', `${parsed.data.name} (${parsed.data.condition_type} ${parsed.data.threshold})`);
    res.status(201).json({ id });
  });

  router.post('/alerts/:id/ack', (req, res) => {
    const id = sanitizeTextInput(req.params.id, 64);
    const db = getDb();
    db.prepare(`UPDATE alerts SET acknowledged = 1 WHERE id = ?`).run(id);
    res.json({ ok: true });
  });

  router.get('/presets', (_req, res) => {
    res.json({ presets: INITIAL_FILTER_PRESETS });
  });

  router.get('/observability', (_req, res) => {
    res.json(getSystemObservability());
  });

  return router;
}
