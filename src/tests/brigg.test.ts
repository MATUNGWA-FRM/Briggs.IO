import { beforeEach, describe, expect, it } from 'vitest';
import { estimateSlippageAndExecution } from '../server/analytics/checklist.ts';
import { evaluateNoTradeEngine } from '../server/analytics/noTradeEngine.ts';
import { evaluateRiskEngine } from '../server/analytics/riskEngine.ts';
import { resetDbForTests } from '../server/database/db.ts';
import { runHistoricalBacktest } from '../server/ml/backtest.ts';
import { assertNoTemporalLeakage } from '../server/ml/features.ts';
import {
  listModelVersions,
  recordHumanOverride,
  rollbackToModelVersion,
  runDailyLearningCycle,
} from '../server/ml/learningPipeline.ts';
import { buildChartIntelligence, tfToSeconds } from '../server/analytics/chartAnalytics.ts';
import { analyzeHoldersAndWallets } from '../server/analytics/holders.ts';
import { buildBubbleMapPayload } from '../server/graph/bubbleMapBuilder.ts';
import { ensureInitialMlData } from '../server/ml/seedHistory.ts';
import {
  isValidSolanaAddress,
  sanitizeTextInput,
  ScannerQuerySchema,
  TokenAnalysisQuerySchema,
} from '../server/security/validators.ts';
import {
  BUY_NOTIFICATION_TTL_MS,
  BUY_POPUP_TTL_MS,
  dismissPopupNotificationById,
  getActivePopupNotifications,
  pruneExpiredBuyNotifications,
  removeBuyNotificationById,
  type BuyNotificationItem,
} from '../components/BuyNotificationStack.tsx';
import { sanitizeNotificationPrefs } from '../shared/notificationConfig.ts';
import {
  computeMeasureMetrics,
  computeSupplyScale,
  formatChartValue,
} from '../shared/chartHelpers.ts';
import { LAYOUT_PRESETS, sanitizeLayoutState } from '../shared/layoutConfig.ts';
import {
  DEFAULT_TERMINAL_COLORS,
  isDefaultThemeColors,
  resetDefaultThemeColors,
  sanitizeThemeColors,
} from '../shared/themeConfig.ts';

describe('Brigg.AI V1 Core Verification Suite', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    resetDbForTests();
    ensureInitialMlData();
  });

  it('validates Solana Base58 addresses and rejects injection/invalid strings', () => {
    expect(isValidSolanaAddress('DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263')).toBe(true);
    expect(isValidSolanaAddress('EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm')).toBe(true);
    expect(isValidSolanaAddress('0x1234567890abcdef')).toBe(false);
    expect(isValidSolanaAddress("'; DROP TABLE tokens;--")).toBe(false);
    expect(sanitizeTextInput('<script>alert(1)</script>Hello')).toBe('scriptalert(1)/scriptHello');
  });

  it('enforces strict Temporal Leakage Prevention at prediction time T', () => {
    const T = '2026-11-27T10:00:00.000Z';
    const validFeatures = {
      computed_at_timestamp: '2026-11-27T09:59:58.000Z',
      price_return_1h: 4.5,
      liquidity_to_mc: 0.08,
    };
    expect(assertNoTemporalLeakage(T, validFeatures, ['2026-11-27T09:58:00.000Z']).valid).toBe(true);

    // Reject forbidden future outcome fields
    const leakedByKey = { ...validFeatures, return_pct: 12.4 };
    expect(assertNoTemporalLeakage(T, leakedByKey).valid).toBe(false);

    // Reject future observation timestamp > T
    const leakedByTime = assertNoTemporalLeakage(T, validFeatures, ['2026-11-27T10:05:00.000Z']);
    expect(leakedByTime.valid).toBe(false);
  });

  it('computes Slippage using (Expected Price - Executed Price) / Expected Price', () => {
    const slip = estimateSlippageAndExecution({
      priceUsd: 1.0,
      liquidityUsd: 20_000,
      positionSizeUsd: 2_000,
      executionQualityBase: 75,
    });
    expect(slip.estimated_executed_price_usd).toBeGreaterThan(slip.expected_price_usd);
    expect(slip.slippage_pct).toBeLessThan(0); // Buy executed above expected spot
    expect(slip.price_impact_pct).toBeGreaterThan(10);
    expect(slip.warning).toBeDefined();
  });

  it('triggers No-Trade Engine on insufficient liquidity, stale data, or honeypot flags', () => {
    const res = evaluateNoTradeEngine({
      mode: 'SHITCOIN',
      liquidity: {
        current_liquidity_usd: 4200,
        historical_liquidity_1h_ago_usd: 6000,
        liquidity_growth_1h_pct: -30,
        liquidity_change_during_pumps_pct: 5,
        liquidity_change_during_dumps_pct: -20,
        liquidity_to_mc_ratio: 0.01,
        liquidity_to_volume_ratio: 0.1,
        lp_status: 'UNLOCKED',
        lp_concentration_pct: 90,
        estimated_exit_capacity_usd: 200,
        liquidity_risk_score: 88,
        execution_quality_score: 18,
        data_quality_score: 35,
        reasons: [],
        data_status: 'MOCK',
      },
      volume: {
        windows: [],
        reported_volume_24h_usd: 50000,
        estimated_organic_pct: 22,
        possible_automated_pct: 78,
        volume_acceleration_pct: 0,
        volume_decay_pct: 0,
        volume_to_mc_ratio: 1,
        volume_to_liquidity_ratio: 12,
        volume_per_holder_usd: 100,
        price_volume_relationship: 'Range / Neutral',
        anomalies: {
          wash_trading_risk: 'HIGH',
          bot_activity_score: 82,
          abnormal_trade_frequency: true,
          repeated_trade_sizes_pct: 45,
          unique_wallet_volume_divergence: 12,
          evidence_note: 'test',
        },
        volume_quality_score: 24,
        confidence: 0.4,
        reasons: [],
        data_status: 'MOCK',
      },
      holders: {
        holder_count: 100,
        holder_growth_1h_pct: -5,
        holder_growth_24h_pct: 0,
        top_10_concentration_pct: 62,
        top_20_concentration_pct: 75,
        top_50_concentration_pct: 90,
        largest_wallet_pct: 25,
        sniper_analysis: {
          suspected_snipers: 10,
          supply_pct: 32,
          exposure_band: 'HIGH (>25%)',
          avg_entry_delay_sec: 2,
          exited_pct: 10,
          behavior: 'Holding',
          heuristic_note: '',
        },
        insider_analysis: {
          exposure_score: 75,
          suspected_wallets: 3,
          supply_pct: 18,
          behavior: 'Distributing',
          evidence: [],
        },
        bundle_analysis: { cluster_count: 2, combined_supply_pct: 28, clusters: [] },
        red_flags: [],
        wallets: [],
        edges: [],
        distribution_health_score: 15,
        data_status: 'MOCK',
      },
      risk: {
        liquidity_risk: 88,
        holder_risk: 85,
        dev_risk: 70,
        contract_risk: 65,
        bot_volume_risk: 82,
        social_risk: 60,
        overall_risk: 89,
        honeypot_flags: ['Mint authority active'],
        rug_indicators: ['Liquidity Rug Risk'],
        reasons: [],
        safety_disclaimer: 'Never 100% safe',
      },
      slippage: {
        position_size_usd: 1500,
        expected_price_usd: 0.01,
        estimated_executed_price_usd: 0.014,
        price_impact_pct: 28,
        slippage_pct: -40,
        sign_convention_note: '',
        priority_fee_sol: 0.002,
        exit_liquidity_usd: 200,
        execution_quality_score: 15,
      },
      regime: {
        regime: 'Low Liquidity',
        confidence: 0.6,
        sol_24h_change_pct: -2,
        sol_volatility_pct: 8,
        meme_sector_momentum: 30,
        market_breadth_pct: 30,
        risk_appetite_score: 30,
        explanation: '',
        data_status: 'MOCK',
      },
      conflicts: [],
      freshnessSeconds: 240,
      confidencePct: 30,
      modelDisagreement: 40,
    });

    expect(res.triggered).toBe(true);
    expect(res.headline).toContain('NO-TRADE');
    expect(res.triggers.length).toBeGreaterThanOrEqual(5);
  });

  it('never declares a token 100% safe in Risk Engine', () => {
    const risk = evaluateRiskEngine({
      forensics: {
        address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        symbol: 'BONK',
        name: 'Bonk',
        chain: 'solana',
        creator_deployer: 'abc',
        creation_timestamp: new Date().toISOString(),
        age_minutes: 5000,
        token_type: 'SPL',
        launch_platform: 'Raydium',
        deployment_platform: 'Raydium',
        initial_liquidity_usd: 100000,
        current_liquidity_usd: 10000000,
        liquidity_source: 'Raydium',
        market_cap_usd: 1000000000,
        fdv_usd: 1000000000,
        price_usd: 0.00002,
        price_change_5m: 1,
        price_change_1h: 2,
        price_change_6h: 3,
        price_change_24h: 4,
        volume_24h_usd: 5000000,
        trading_pairs: [],
        primary_dex: 'raydium',
        migration_status: 'MIGRATED',
        migration_history: [],
        current_trading_venue: 'raydium',
        social_links: {},
        contract_attributes: {
          mint_authority_revoked: true,
          freeze_authority_revoked: true,
          mutable_metadata: false,
          sell_restriction_detected: false,
          transfer_fee_bps: 0,
          data_status: 'REAL',
        },
        lifecycle_timeline: [],
        data_status: 'REAL',
      },
      liquidity: {
        current_liquidity_usd: 10000000,
        historical_liquidity_1h_ago_usd: 9900000,
        liquidity_growth_1h_pct: 1,
        liquidity_change_during_pumps_pct: 2,
        liquidity_change_during_dumps_pct: -1,
        liquidity_to_mc_ratio: 0.01,
        liquidity_to_volume_ratio: 2,
        lp_status: 'BURNED',
        lp_concentration_pct: 0,
        estimated_exit_capacity_usd: 400000,
        liquidity_risk_score: 10,
        execution_quality_score: 95,
        data_quality_score: 95,
        reasons: [],
        data_status: 'REAL',
      },
      volume: {
        windows: [],
        reported_volume_24h_usd: 5000000,
        estimated_organic_pct: 80,
        possible_automated_pct: 20,
        volume_acceleration_pct: 15,
        volume_decay_pct: 0,
        volume_to_mc_ratio: 0.005,
        volume_to_liquidity_ratio: 0.5,
        volume_per_holder_usd: 100,
        price_volume_relationship: 'Price UP + Volume UP (Momentum Confirmation)',
        anomalies: {
          wash_trading_risk: 'LOW',
          bot_activity_score: 15,
          abnormal_trade_frequency: false,
          repeated_trade_sizes_pct: 8,
          unique_wallet_volume_divergence: 0,
          evidence_note: '',
        },
        volume_quality_score: 88,
        confidence: 0.9,
        reasons: [],
        data_status: 'REAL',
      },
      holders: {
        holder_count: 50000,
        holder_growth_1h_pct: 2,
        holder_growth_24h_pct: 5,
        top_10_concentration_pct: 12,
        top_20_concentration_pct: 18,
        top_50_concentration_pct: 25,
        largest_wallet_pct: 3,
        sniper_analysis: {
          suspected_snipers: 2,
          supply_pct: 3,
          exposure_band: 'LOWER (<15%)',
          avg_entry_delay_sec: 3,
          exited_pct: 90,
          behavior: 'Mixed',
          heuristic_note: '',
        },
        insider_analysis: {
          exposure_score: 10,
          suspected_wallets: 0,
          supply_pct: 1,
          behavior: 'Holding',
          evidence: [],
        },
        bundle_analysis: { cluster_count: 0, combined_supply_pct: 2, clusters: [] },
        red_flags: [],
        wallets: [],
        edges: [],
        distribution_health_score: 90,
        data_status: 'REAL',
      },
      social: {
        platforms: [],
        social_momentum_score: 75,
        narrative_strength_score: 70,
        social_organicity_estimate_pct: 82,
        community_activity_score: 80,
        social_risk_score: 18,
        narrative: {
          primary_theme: 'Animal',
          stage: 'Mature',
          virality_score: 70,
          controversy_score: 20,
          novelty_score: 40,
          social_acceleration_pct: 10,
          price_extension_note: '',
        },
        paid_vs_organic: {
          classification: 'ORGANIC_DOMINANT',
          paid_boost_detected: false,
          organic_discovery_pct: 82,
          note: '',
        },
        reasons: [],
        data_status: 'MOCK',
      },
    });
    expect(risk.overall_risk).toBeGreaterThan(0);
    expect(risk.safety_disclaimer.toLowerCase()).toContain('never');
  });

  it('runs Backtesting simulation with slippage/fees and explicit BACKTEST label', () => {
    const bt = runHistoricalBacktest({
      mode: 'SHITCOIN',
      horizon: '15M',
      position_size_usd: 1500,
      min_opportunity_score: 60,
      max_risk_score: 80,
      slippage_bps: 100,
      priority_fee_usd: 1.0,
      min_liquidity_usd: 10000,
    });
    expect(bt.label).toBe('BACKTEST');
    expect(bt.trades_count).toBeGreaterThan(0);
    expect(bt.equity_curve.length).toBe(bt.trades_count);
  });

  it('auto-rejects degraded candidate models and supports Rollback in Learning Pipeline', () => {
    const rejectedRun = runDailyLearningCycle(true);
    expect(rejectedRun.promoted).toBe(false);
    expect(rejectedRun.candidate.decision).toBe('REJECTED');

    const promotedRun = runDailyLearningCycle(false);
    expect(promotedRun.promoted).toBe(true);
    expect(promotedRun.candidate.decision).toBe('PROMOTED');

    const rolled = rollbackToModelVersion('v1.3');
    expect(rolled.is_production).toBe(true);
    const all = listModelVersions();
    expect(all.find((v) => v.version === 'v1.3')?.is_production).toBe(true);
  });

  it('records Human Overrides separately and excludes them from automatic training labels', () => {
    const ovr = recordHumanOverride({
      token_address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
      symbol: 'BONK',
      model_state: 'WATCH',
      user_decision: 'MANUAL_SKIP',
      reason: 'Waiting for pullback to VWAP',
    });
    expect(ovr.excluded_from_auto_labels).toBe(true);
  });

  it('builds finite 2D/3D Holder Bubble Map geometry, proportional radii, and valid edges', () => {
    const holders = analyzeHoldersAndWallets({
      primaryMarket: {
        provider: 'dexscreener',
        address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        symbol: 'BONK',
        name: 'Bonk',
        price_usd: 0.00002,
        price_change_5m: 0.5,
        price_change_1h: 2.1,
        price_change_6h: 4.5,
        price_change_24h: 8.2,
        liquidity_usd: 4_500_000,
        market_cap_usd: 1_200_000_000,
        fdv_usd: 1_200_000_000,
        volume_5m_usd: 45_000,
        volume_1h_usd: 520_000,
        volume_6h_usd: 2_100_000,
        volume_24h_usd: 12_000_000,
        buys_5m: 35,
        sells_5m: 20,
        buys_1h: 320,
        sells_1h: 210,
        buys_24h: 4200,
        sells_24h: 3500,
        holder_count: 15000,
        top_10_pct: 22.5,
        sniper_pct: 9.4,
        insider_pct: 4.2,
        bundle_pct: 8.6,
        dev_pct: 1.5,
        dex: 'raydium',
        pair_address: 'pair_123',
        quote_symbol: 'SOL',
        pair_created_at_ms: Date.now() - 86_400_000 * 30,
        pairs: [],
        socials: {},
        paid_boost_active: false,
        boost_amount: 0,
        meta: {
          source: 'dexscreener',
          source_timestamp: new Date().toISOString(),
          ingestion_timestamp: new Date().toISOString(),
          freshness_seconds: 2,
          confidence: 0.9,
          data_status: 'REAL',
        },
      },
      marketFeeds: [],
      socialFeeds: [],
      conflicts: [],
      allMeta: [],
      overallStatus: 'REAL',
      avgFreshnessSeconds: 2,
      ingestionDelayMs: 40,
    });

    const graph = buildBubbleMapPayload(holders);
    expect(graph.nodes.length).toBeGreaterThanOrEqual(12);
    expect(graph.edges.length).toBeGreaterThanOrEqual(5);
    expect(graph.clusters.length).toBeGreaterThanOrEqual(2);

    const nodeIds = new Set(graph.nodes.map((n) => n.id));
    for (const n of graph.nodes) {
      expect(Number.isFinite(n.x2d)).toBe(true);
      expect(Number.isFinite(n.y2d)).toBe(true);
      expect(Number.isFinite(n.x3d)).toBe(true);
      expect(Number.isFinite(n.y3d)).toBe(true);
      expect(Number.isFinite(n.z3d)).toBe(true);
      expect(n.radius).toBeGreaterThan(0);
      expect(n.radius_usd).toBeGreaterThan(0);
    }
    for (const e of graph.edges) {
      expect(nodeIds.has(e.source)).toBe(true);
      expect(nodeIds.has(e.target)).toBe(true);
    }
  });

  it('clamps workspace panel sizes and sanitizes persisted layout tabs', () => {
    const sanitized = sanitizeLayoutState({
      presetId: 'CUSTOM',
      leftWidth: 9999,
      rightWidth: 20,
      chartHeight: -50,
      showScanner: false,
      openTabs: ['GRAPH', 'ANALYSIS', 'INVALID_TAB_ID'],
      activeTab: 'INVALID_TAB_ID',
    });

    expect(sanitized.leftWidth).toBe(460);
    expect(sanitized.rightWidth).toBe(250);
    expect(sanitized.chartHeight).toBe(200);
    expect(sanitized.showScanner).toBe(false);
    expect(sanitized.openTabs).toEqual(['GRAPH', 'ANALYSIS']);
    expect(sanitized.activeTab).toBe('GRAPH');

    expect(LAYOUT_PRESETS.CHART_FOCUS.chartHeight).toBeGreaterThan(LAYOUT_PRESETS.DEFAULT.chartHeight);
    expect(LAYOUT_PRESETS.ANALYSIS_FOCUS.openTabs).toContain('ANALYSIS');
    expect(LAYOUT_PRESETS.DEFAULT.openTabs).toContain('HOLDERS');
    expect(LAYOUT_PRESETS.DEFAULT.openTabs).toContain('SOCIAL_TRACKER');

    const withSocial = sanitizeLayoutState({
      openTabs: ['SOCIAL_TRACKER', 'HOLDERS', 'GRAPH'],
      activeTab: 'SOCIAL_TRACKER',
    });
    expect(withSocial.openTabs).toEqual(['SOCIAL_TRACKER', 'HOLDERS', 'GRAPH']);
    expect(withSocial.activeTab).toBe('SOCIAL_TRACKER');
  });

  it('supports 1S candlestick timeframe and scanner refresh validation', () => {
    expect(tfToSeconds('1S')).toBe(1);
    const tq = TokenAnalysisQuerySchema.safeParse({ timeframe: '1S' });
    expect(tq.success).toBe(true);
    const sq = ScannerQuerySchema.safeParse({ refresh: 'true' });
    expect(sq.success).toBe(true);

    const chart = buildChartIntelligence(
      {
        primaryMarket: {
          provider: 'dexscreener',
          address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
          symbol: 'BONK',
          name: 'Bonk',
          price_usd: 0.000024,
          price_change_5m: 1.5,
          price_change_1h: 4.2,
          price_change_6h: 8.1,
          price_change_24h: 12.0,
          liquidity_usd: 5_000_000,
          market_cap_usd: 1_500_000_000,
          fdv_usd: 1_500_000_000,
          volume_5m_usd: 120_000,
          volume_1h_usd: 900_000,
          volume_6h_usd: 4_200_000,
          volume_24h_usd: 22_000_000,
          buys_5m: 60,
          sells_5m: 42,
          buys_1h: 520,
          sells_1h: 410,
          buys_24h: 8200,
          sells_24h: 7100,
          dex: 'raydium',
          pair_address: 'pair_1s',
          quote_symbol: 'SOL',
          pair_created_at_ms: Date.now() - 86_400_000,
          pairs: [],
          socials: {},
          paid_boost_active: false,
          boost_amount: 0,
          meta: {
            source: 'dexscreener',
            source_timestamp: new Date().toISOString(),
            ingestion_timestamp: new Date().toISOString(),
            freshness_seconds: 1,
            confidence: 0.9,
            data_status: 'REAL',
          },
        },
        marketFeeds: [],
        socialFeeds: [],
        conflicts: [],
        allMeta: [],
        overallStatus: 'REAL',
        avgFreshnessSeconds: 1,
        ingestionDelayMs: 25,
      },
      '1S'
    );

    expect(chart.timeframe).toBe('1S');
    expect(chart.candles.length).toBe(90);
    expect(chart.candles[1].time - chart.candles[0].time).toBe(1);
    expect(chart.pump_dump_outlook.pump_probability_pct).toBeGreaterThanOrEqual(12);
    expect(chart.pump_dump_outlook.dump_probability_pct).toBeGreaterThanOrEqual(12);
    expect(chart.pump_dump_outlook.sniper_entry_price).toBeGreaterThan(0);
    expect(chart.pump_dump_outlook.sniper_exit_price).toBeGreaterThan(0);
    expect(chart.pump_dump_outlook.dump_invalidation_price).toBeGreaterThan(0);
    expect(Array.isArray(chart.sniper_signals)).toBe(true);
  });

  it('shows pop-ups on screen for 2.5s, retains them in notification bar for 2m, and supports position prefs & deletion', () => {
    expect(BUY_POPUP_TTL_MS).toBe(2_500);
    expect(BUY_NOTIFICATION_TTL_MS).toBe(120_000);

    const start = 1_700_000_000_000;
    const itemA: BuyNotificationItem = {
      id: 'buy_1',
      address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
      symbol: 'BONK',
      price_usd: 0.000024,
      amount_usd: 1200,
      maker_short: '7xKp...3mQa',
      source: 'LIVE_DEXSCREENER',
      created_at_ms: start,
      popup_expires_at_ms: start + BUY_POPUP_TTL_MS,
      expires_at_ms: start + BUY_NOTIFICATION_TTL_MS,
    };
    const itemB: BuyNotificationItem = {
      ...itemA,
      id: 'buy_2',
      created_at_ms: start + 30_000,
      popup_expires_at_ms: start + 30_000 + BUY_POPUP_TTL_MS,
      expires_at_ms: start + 30_000 + BUY_NOTIFICATION_TTL_MS,
    };

    // Screen pop-up is visible at +2.0s and hides at +2.5s while staying in the 2m bar
    expect(getActivePopupNotifications([itemA], start + 2_000)).toHaveLength(1);
    expect(getActivePopupNotifications([itemA], start + 2_500)).toHaveLength(0);
    expect(pruneExpiredBuyNotifications([itemA], start + 2_500)).toHaveLength(1);

    // Dismissing pop-up hides it from screen early without deleting from 2m bar
    const dismissed = dismissPopupNotificationById([itemA], 'buy_1');
    expect(getActivePopupNotifications(dismissed, start + 1_000)).toHaveLength(0);
    expect(pruneExpiredBuyNotifications(dismissed, start + 60_000)).toHaveLength(1);

    // Notification bar keeps items for 2 minutes (120s)
    expect(pruneExpiredBuyNotifications([itemA, itemB], start + 119_000)).toHaveLength(2);
    expect(pruneExpiredBuyNotifications([itemA, itemB], start + 120_000).map((x) => x.id)).toEqual(['buy_2']);

    // Manual deletion removes target from both pop-up and 2m bar immediately
    expect(removeBuyNotificationById([itemA, itemB], 'buy_2').map((x) => x.id)).toEqual(['buy_1']);

    // Validates 4-corner pop-up screen position preferences
    expect(sanitizeNotificationPrefs({ position: 'TOP_LEFT', popupsEnabled: false })).toEqual({
      position: 'TOP_LEFT',
      popupsEnabled: false,
    });
    expect(sanitizeNotificationPrefs({ position: 'INVALID_POS' }).position).toBe('BOTTOM_RIGHT');
  });

  it('scales Y-axis between Token Price and Market Cap and computes Measure Rule percentage move', () => {
    const supply = computeSupplyScale(0.002, 2_000_000);
    expect(supply).toBe(1_000_000_000);
    expect(formatChartValue(0.002 * supply, 'MC')).toBe('$2.00M');
    expect(formatChartValue(0.002, 'PRICE')).toBe('$0.002000');

    const measure = computeMeasureMetrics(
      { time: 1_700_000_000, price: 0.002 },
      { time: 1_700_000_900, price: 0.0025 },
      60,
      supply
    );
    expect(measure.pctChange).toBeCloseTo(25, 5);
    expect(measure.valueDelta).toBeCloseTo(500_000, 3);
    expect(measure.barsCount).toBe(15);
    expect(measure.durationLabel).toBe('15m');
  });

  it('validates default terminal color scheme and resets custom colors to defaults', () => {
    expect(DEFAULT_TERMINAL_COLORS).toEqual({
      bgCanvas: '#07080C',
      bgSurface: '#0C0E14',
      borderColor: '#1E2330',
      accentColor: '#7C5CFF',
      bullColor: '#00E599',
      bearColor: '#FF4D6A',
    });
    expect(isDefaultThemeColors(DEFAULT_TERMINAL_COLORS)).toBe(true);

    const custom = sanitizeThemeColors({
      bgCanvas: '#111827',
      accentColor: 'not-a-hex',
      bullColor: '#22c55e',
    });
    expect(custom.bgCanvas).toBe('#111827');
    expect(custom.accentColor).toBe(DEFAULT_TERMINAL_COLORS.accentColor);
    expect(custom.bullColor).toBe('#22C55E');
    expect(isDefaultThemeColors(custom)).toBe(false);

    const reset = resetDefaultThemeColors();
    expect(reset).toEqual(DEFAULT_TERMINAL_COLORS);
    expect(isDefaultThemeColors(reset)).toBe(true);
  });
});
