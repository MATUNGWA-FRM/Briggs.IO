import type {
  BriggMode,
  HolderIntelligence,
  LiquidityIntelligence,
  MarketRegimeState,
  NoTradeEvaluation,
  ProviderConflict,
  RiskEngineResult,
  SlippageExecutionEstimate,
  VolumeIntelligence,
} from '../../shared/types.ts';

export function evaluateNoTradeEngine(params: {
  mode: BriggMode;
  liquidity: LiquidityIntelligence;
  volume: VolumeIntelligence;
  holders: HolderIntelligence;
  risk: RiskEngineResult;
  slippage: SlippageExecutionEstimate;
  regime: MarketRegimeState;
  conflicts: ProviderConflict[];
  freshnessSeconds: number;
  confidencePct: number;
  modelDisagreement: number;
}): NoTradeEvaluation {
  const {
    mode,
    liquidity,
    volume,
    holders,
    risk,
    slippage,
    regime,
    conflicts,
    freshnessSeconds,
    confidencePct,
    modelDisagreement,
  } = params;

  const triggers: string[] = [];
  const reasons: string[] = [];

  if (liquidity.current_liquidity_usd < (mode === 'MEMECOIN' ? 15_000 : 8_000)) {
    triggers.push('Insufficient Liquidity');
    reasons.push(`Pool depth $${Math.round(liquidity.current_liquidity_usd).toLocaleString()} below minimum safe threshold`);
  }

  if (liquidity.data_quality_score < 42) {
    triggers.push('Poor Data Quality');
    reasons.push(`Data Quality score ${liquidity.data_quality_score}/100 below reliability floor`);
  }

  if (freshnessSeconds > 180) {
    triggers.push('Stale Critical Data');
    reasons.push(`Market data is ${freshnessSeconds}s old (>180s staleness limit)`);
  }

  if (conflicts.some((c) => c.severity === 'HIGH')) {
    triggers.push('Source Disagreement');
    reasons.push('High-severity disagreement detected across approved market providers');
  }

  if (risk.honeypot_flags.length > 0 && risk.contract_risk >= 50) {
    triggers.push('Possible Honeypot / Contract Risk');
    reasons.push(risk.honeypot_flags[0]);
  }

  if (risk.overall_risk >= 86) {
    triggers.push('Major Rug Indicators');
    reasons.push(`Overall Risk (${risk.overall_risk}/100) exceeds capital protection ceiling`);
  }

  if (holders.top_10_concentration_pct > 55) {
    triggers.push('Extreme Holder Concentration');
    reasons.push(`Top 10 wallets control ${holders.top_10_concentration_pct.toFixed(1)}% of supply`);
  }

  if (volume.anomalies.wash_trading_risk === 'HIGH' && volume.estimated_organic_pct < 30) {
    triggers.push('Suspicious Trading / Low Organicity');
    reasons.push('Reported volume appears heavily automated with minimal organic confirmation');
  }

  if (slippage.execution_quality_score < 22 || slippage.price_impact_pct > 12) {
    triggers.push('Poor Execution Quality');
    reasons.push(`Estimated price impact (${slippage.price_impact_pct}%) erodes expected edge`);
  }

  if (regime.regime === 'Low Liquidity' && liquidity.current_liquidity_usd < 25_000) {
    triggers.push('Poor Market Regime');
    reasons.push('Market regime is Low Liquidity and token depth is insufficient');
  }

  if (modelDisagreement > 34) {
    triggers.push('Model Disagreement');
    reasons.push('Sub-model ensemble shows high dispersion across momentum and risk predictions');
  }

  if (confidencePct < 38) {
    triggers.push('Insufficient Evidence');
    reasons.push(`Analytical confidence (${confidencePct}%) is below minimum actionable threshold`);
  }

  const triggered = triggers.length > 0;
  return {
    triggered,
    headline: triggered ? 'NO-TRADE — INSUFFICIENT EVIDENCE' : 'NO-TRADE GATE PASSED',
    triggers,
    reasons,
  };
}
