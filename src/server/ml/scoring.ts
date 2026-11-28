import type {
  ActionState,
  BriggMode,
  BriggScorePanelData,
  ChartIntelligence,
  EngineeredFeatures,
  HolderIntelligence,
  Horizon,
  LiquidityIntelligence,
  MarketRegimeState,
  PreTradeChecklist,
  ProviderConflict,
  ReasonItem,
  RiskEngineResult,
  SlippageExecutionEstimate,
  SocialIntelligence,
  TokenForensics,
  VolumeIntelligence,
} from '../../shared/types.ts';
import { evaluateLiveSignal } from '../../shared/liveSignalEngine.ts';
import { evaluateNoTradeEngine } from '../analytics/noTradeEngine.ts';
import { classifyTokenKind } from './classifier.ts';
import { DEFAULT_PRODUCTION_WEIGHTS, runBriggEnsembleModels, type LearnedModelWeights } from './models.ts';

export function computeBriggScorePanel(params: {
  tokenAddress: string;
  symbol: string;
  mode: BriggMode;
  horizon: Horizon;
  forensics: TokenForensics;
  features: EngineeredFeatures;
  liquidity: LiquidityIntelligence;
  volume: VolumeIntelligence;
  holders: HolderIntelligence;
  chart: ChartIntelligence;
  social: SocialIntelligence;
  risk: RiskEngineResult;
  checklist: PreTradeChecklist;
  slippage: SlippageExecutionEstimate;
  regime: MarketRegimeState;
  conflicts: ProviderConflict[];
  freshnessSeconds: number;
  weights?: LearnedModelWeights;
}): BriggScorePanelData {
  const {
    tokenAddress,
    symbol,
    mode,
    horizon,
    forensics,
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
    conflicts,
    freshnessSeconds,
    weights = DEFAULT_PRODUCTION_WEIGHTS,
  } = params;

  const ml = runBriggEnsembleModels(features, mode, weights);

  // Blend deterministic Brigg Momentum-Liquidity-Flow score (55%) with ML ensemble score (45%)
  const strategyDeterministic = Math.round(
    (volume.volume_quality_score * 0.25 +
      liquidity.execution_quality_score * 0.2 +
      holders.distribution_health_score * 0.2 +
      social.social_momentum_score * 0.15 +
      (checklist.passed_count / checklist.total_count) * 100 * 0.2)
  );

  const opportunityScore = Math.max(
    4,
    Math.min(97, Math.round(strategyDeterministic * 0.45 + ml.raw_opportunity * 0.55))
  );

  const riskScore = Math.max(
    8,
    Math.min(99, Math.round(risk.overall_risk * 0.72 + ml.risk_model_score * 0.28))
  );

  // Analytical confidence depends on data quality, freshness, provider agreement, and model agreement
  let confidence =
    liquidity.data_quality_score * 0.45 +
    volume.confidence * 100 * 0.25 +
    (100 - Math.min(60, ml.model_disagreement * 1.6)) * 0.3;
  if (conflicts.length > 0) confidence -= conflicts.length * 8;
  if (freshnessSeconds > 60) confidence -= Math.min(25, (freshnessSeconds - 60) * 0.2);
  const confidencePct = Math.max(15, Math.min(94, Math.round(confidence)));

  const noTrade = evaluateNoTradeEngine({
    mode,
    liquidity,
    volume,
    holders,
    risk: { ...risk, overall_risk: riskScore },
    slippage,
    regime,
    conflicts,
    freshnessSeconds,
    confidencePct,
    modelDisagreement: ml.model_disagreement,
  });

  let actionState: ActionState = 'ANALYSIS ONLY';
  if (noTrade.triggered) {
    actionState = 'NO-TRADE';
  } else if (opportunityScore >= 72 && riskScore <= 75 && !checklist.critical_failure && confidencePct >= 55) {
    actionState = riskScore >= 55 || mode === 'SHITCOIN' ? 'HIGH-RISK OPPORTUNITY' : 'WATCH';
  } else if (opportunityScore >= 60 && checklist.passed_count >= 6) {
    actionState = 'CONFIRMATION REQUIRED';
  } else if (opportunityScore >= 48) {
    actionState = 'WAIT';
  } else {
    actionState = 'WATCH';
  }

  // Explainability assembly (§49 & §56)
  const whyOpp: ReasonItem[] = [
    ...volume.reasons.filter((r) => r.direction === '+'),
    ...liquidity.reasons.filter((r) => r.direction === '+'),
    ...social.reasons.filter((r) => r.direction === '+'),
  ].slice(0, 5);

  if (whyOpp.length === 0) {
    whyOpp.push({
      direction: '?',
      category: 'Momentum',
      text: `ML Momentum ${ml.momentum_score}/100 and Liquidity ${ml.liquidity_score}/100 under ${regime.regime}`,
    });
  }

  const whyRisk: ReasonItem[] = [
    ...risk.reasons.filter((r) => r.direction === '-'),
    ...holders.red_flags.map((rf) => ({
      direction: '-' as const,
      category: rf.type,
      text: rf.description,
    })),
  ].slice(0, 5);

  const invalidation: string[] = [
    `Liquidity falls >15% below $${Math.round(liquidity.current_liquidity_usd).toLocaleString()}`,
    '1H buy/sell imbalance reverses below 0.85x on rising sell volume',
    `Price breaks below structural support ($${chart.support_levels[0] ?? 'N/A'})`,
  ];
  if (holders.insider_analysis.exposure_score > 40) {
    invalidation.push('Detected insider/cluster wallets shift to active distribution');
  }

  const missingData: string[] = [];
  if (liquidity.data_status !== 'REAL') {
    missingData.push('Primary market liquidity/price relying on MOCK fallback fixture');
  }
  const mockProviders = social.platforms
    .filter((p) => p.data_status === 'MOCK' || p.data_status === 'UNAVAILABLE')
    .map((p) => p.platform.toUpperCase());
  if (mockProviders.length > 0) {
    missingData.push(`Social/wallet feeds without live API keys (${mockProviders.join(', ')}) are in MOCK/UNAVAILABLE state`);
  }

  const conflicting: string[] = conflicts.map(
    (c) => `${c.field}: ${c.resolution_note}`
  );
  if (opportunityScore >= 65 && riskScore >= 65) {
    conflicting.push('Strong short-term flow/momentum coexists with elevated structural holder/liquidity risk');
  }
  if (chart.trend === 'UPTREND' && volume.anomalies.wash_trading_risk === 'HIGH') {
    conflicting.push('Uptrend price action accompanied by elevated automated/repeated trade-size signals');
  }

  const classification = classifyTokenKind({
    age_minutes: forensics.age_minutes,
    market_cap_usd: forensics.market_cap_usd,
    liquidity_usd: liquidity.current_liquidity_usd,
    holder_count: holders.holder_count,
    sniper_pct: holders.sniper_analysis.supply_pct,
    bundle_pct: holders.bundle_analysis.combined_supply_pct,
    migration_status: forensics.migration_status,
    volume_24h_usd: volume.reported_volume_24h_usd,
    active_mode: mode,
  });

  const w5m = volume.windows.find((w) => w.timeframe === '5M') || volume.windows[0];
  const w1h = volume.windows.find((w) => w.timeframe === '1H') || volume.windows[0];
  const lastCandle = chart.candles[chart.candles.length - 1];
  const liveSignal = evaluateLiveSignal({
    mode,
    price_usd: forensics.price_usd,
    price_change_5m: forensics.price_change_5m,
    price_change_1h: forensics.price_change_1h,
    buys_5m: w5m?.buy_count ?? 12,
    sells_5m: w5m?.sell_count ?? 10,
    buys_1h: w1h?.buy_count ?? 80,
    sells_1h: w1h?.sell_count ?? 70,
    liquidity_usd: liquidity.current_liquidity_usd,
    liquidity_growth_1h_pct: liquidity.liquidity_growth_1h_pct,
    liquidity_change_during_dumps_pct: liquidity.liquidity_change_during_dumps_pct,
    volume_acceleration_pct: volume.volume_acceleration_pct,
    volatility_pct: chart.volatility_pct,
    rsi14: lastCandle?.rsi14 ?? 50,
    ema9: lastCandle?.ema9 ?? forensics.price_usd,
    ema21: lastCandle?.ema21 ?? forensics.price_usd,
    vwap: lastCandle?.vwap ?? forensics.price_usd,
    support_level: chart.support_levels[0] ?? forensics.price_usd * 0.94,
    resistance_level: chart.resistance_levels[0] ?? forensics.price_usd * 1.08,
    execution_quality: slippage.execution_quality_score,
    sniper_pct: holders.sniper_analysis.supply_pct,
    bundle_pct: holders.bundle_analysis.combined_supply_pct,
    social_momentum: social.social_momentum_score,
    market_regime_score: features.market_regime_encoded,
    market_regime_label: regime.regime,
    wash_trading_risk: volume.anomalies.wash_trading_risk,
    bot_activity_score: volume.anomalies.bot_activity_score,
    ml_buy_probability_override: Math.round(ml.raw_opportunity),
    trigger_source: 'INITIAL_ANALYSIS',
  });

  if (liveSignal.decision_flow.blocked_or_changed_reason) {
    conflicting.unshift(liveSignal.decision_flow.blocked_or_changed_reason);
  }

  return {
    token_address: tokenAddress,
    symbol,
    mode,
    horizon,
    opportunity_score: opportunityScore,
    risk_score: riskScore,
    calibrated_probability: noTrade.triggered ? null : ml.calibrated_probability,
    calibration_status:
      noTrade.triggered
        ? 'Suppressed during NO-TRADE state'
        : ml.calibrated_probability !== null
        ? `Platt-calibrated (${weights.version} validated)`
        : 'Hidden — calibration validation not met',
    confidence_pct: confidencePct,
    execution_quality: slippage.execution_quality_score,
    market_regime: regime.regime,
    action_state: actionState,
    classification,
    live_signal: liveSignal,
    no_trade: noTrade,
    model_outputs: {
      momentum_score: ml.momentum_score,
      liquidity_score: ml.liquidity_score,
      volume_score: ml.volume_score,
      wallet_score: ml.wallet_score,
      risk_model_score: ml.risk_model_score,
      social_model_score: ml.social_model_score,
      anomaly_score: ml.anomaly_score,
      model_version: weights.version,
      feature_version: weights.feature_version,
    },
    explainability: {
      why_opportunity_exists: whyOpp,
      why_risk_elevated: whyRisk,
      invalidation_conditions: invalidation,
      missing_data: missingData,
      conflicting_evidence: conflicting,
      machine_metadata: {
        deterministic_rules_weight: 0.45,
        statistical_weight: 0.2,
        ml_weight: 0.35,
        strategy: 'BRIGG_MOMENTUM_LIQUIDITY_FLOW',
      },
    },
  };
}
