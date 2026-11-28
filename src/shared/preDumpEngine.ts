import type { BriggMode, PreDumpAssessment, PreDumpRiskLevel } from './types.ts';
import type { SignalEngineThresholds } from './terminalSettings.ts';
import { DEFAULT_SIGNAL_ENGINE_THRESHOLDS } from './terminalSettings.ts';

export interface PreDumpInputs {
  mode: BriggMode;
  price_usd: number;
  price_change_5m: number;
  price_change_1h: number;
  buys_5m: number;
  sells_5m: number;
  buys_1h: number;
  sells_1h: number;
  liquidity_usd: number;
  liquidity_growth_1h_pct: number;
  liquidity_change_during_dumps_pct?: number;
  volume_acceleration_pct: number;
  volatility_pct: number;
  rsi14: number;
  ema9: number;
  ema21: number;
  vwap: number;
  support_level: number;
  resistance_level: number;
  execution_quality: number;
  sniper_pct: number;
  bundle_pct: number;
  wash_trading_risk?: 'LOW' | 'ELEVATED' | 'HIGH';
  bot_activity_score?: number;
  thresholds?: SignalEngineThresholds;
}

/**
 * Dedicated Pre-Dump Risk Detection Engine.
 * Evaluates multi-condition sequences of bearish/structural deterioration to surface
 * probabilistic dump risk before or during breakdown without claiming guaranteed prediction.
 */
export function evaluatePreDumpRisk(input: PreDumpInputs): PreDumpAssessment {
  const th = input.thresholds ?? DEFAULT_SIGNAL_ENGINE_THRESHOLDS;
  const total5m = Math.max(1, input.buys_5m + input.sells_5m);
  const buyShare5m = input.buys_5m / total5m;
  const sellShare5m = 1 - buyShare5m;

  const total1h = Math.max(1, input.buys_1h + input.sells_1h);
  const buyShare1h = input.buys_1h / total1h;

  const minHealthyLiq = input.mode === 'MEMECOIN' ? 40_000 : 12_000;
  const conditions: Array<{ key: string; weight: number; label: string }> = [];

  // 1. Increasing sell pressure
  if (sellShare5m >= 0.56) {
    const w = sellShare5m >= 0.68 ? 17 : 11;
    conditions.push({
      key: 'sell_pressure',
      weight: w,
      label: `Sell pressure rising (${Math.round(sellShare5m * 100)}% 5M sells vs ${Math.round(buyShare5m * 100)}% buys)`,
    });
  }

  // 2. Deteriorating buy/sell imbalance (5M deteriorating vs 1H baseline)
  if (buyShare5m < buyShare1h - 0.08 || (buyShare1h < 0.47 && buyShare5m < 0.48)) {
    conditions.push({
      key: 'imbalance_decay',
      weight: 9,
      label: `Buy/sell imbalance deteriorating (5M ${(buyShare5m * 100).toFixed(0)}% vs 1H ${(buyShare1h * 100).toFixed(0)}%)`,
    });
  }

  // 3. Abnormal sell volume
  if (input.sells_5m >= Math.max(12, input.buys_5m * 1.4) || (input.price_change_5m <= -2.5 && input.volume_acceleration_pct >= 20)) {
    conditions.push({
      key: 'abnormal_sell_vol',
      weight: 12,
      label: `Abnormal sell volume (${input.sells_5m} sells vs ${input.buys_5m} buys in 5M)`,
    });
  }

  // 4. Liquidity deterioration
  if (input.liquidity_growth_1h_pct <= -10 || input.liquidity_usd < minHealthyLiq * 0.65) {
    const severeLiq = input.liquidity_growth_1h_pct <= -20 || input.liquidity_usd < 8_000;
    conditions.push({
      key: 'liq_drain',
      weight: severeLiq ? 16 : 10,
      label:
        input.liquidity_growth_1h_pct <= -10
          ? `Liquidity contracting (${input.liquidity_growth_1h_pct.toFixed(1)}% 1H)`
          : `Thin exit liquidity ($${Math.round(input.liquidity_usd).toLocaleString()})`,
    });
  }

  // 5. Weakening momentum
  if ((input.rsi14 <= 42 && input.price_change_5m < 0) || (input.rsi14 >= 72 && input.price_change_5m <= -1.2)) {
    conditions.push({
      key: 'momentum_weak',
      weight: 9,
      label: `Momentum weakening (RSI ${input.rsi14.toFixed(0)}, 5M ${input.price_change_5m.toFixed(1)}%)`,
    });
  }

  // 6. EMA bearish transition
  const emaBearishCross = input.ema9 < input.ema21;
  const emaNarrowingBearish =
    input.price_usd > 0 &&
    (input.ema9 - input.ema21) / input.price_usd < 0.003 &&
    input.price_change_5m <= -1.5;
  if (emaBearishCross || emaNarrowingBearish) {
    conditions.push({
      key: 'ema_bearish',
      weight: emaBearishCross ? 11 : 7,
      label: emaBearishCross
        ? 'EMA9 crossed below EMA21 (bearish trend transition)'
        : 'EMA9/EMA21 spread compressing downward',
    });
  }

  // 7. VWAP loss
  if (input.vwap > 0 && input.price_usd < input.vwap * 0.997) {
    const gapPct = ((input.price_usd - input.vwap) / input.vwap) * 100;
    conditions.push({
      key: 'vwap_lost',
      weight: gapPct <= -2 ? 12 : 8,
      label: `VWAP lost (${gapPct.toFixed(1)}% below session anchor)`,
    });
  }

  // 8. Support weakening / breakdown
  if (input.support_level > 0 && input.price_usd < input.support_level) {
    conditions.push({
      key: 'support_break',
      weight: 14,
      label: `Support breakdown below $${input.support_level.toPrecision(4)}`,
    });
  } else if (
    input.support_level > 0 &&
    input.price_usd <= input.support_level * 1.02 &&
    input.price_change_5m <= -1.0
  ) {
    conditions.push({
      key: 'support_weak',
      weight: 8,
      label: `Support weakening near $${input.support_level.toPrecision(4)}`,
    });
  }

  // 9. Failed breakout
  const nearUpperRejected =
    input.resistance_level > 0 &&
    input.price_usd < input.resistance_level * 0.97 &&
    input.price_change_1h >= 5 &&
    input.price_change_5m <= -2.5;
  if (nearUpperRejected || (input.price_change_1h >= 12 && input.price_change_5m <= -4)) {
    conditions.push({
      key: 'failed_breakout',
      weight: 11,
      label: `Failed breakout (+${input.price_change_1h.toFixed(1)}% 1H reversing ${input.price_change_5m.toFixed(1)}% 5M)`,
    });
  }

  // 10. Negative price acceleration
  if (input.price_change_5m <= -3.0) {
    const accelWeight = input.price_change_5m <= -8 ? 18 : input.price_change_5m <= -5 ? 14 : 10;
    conditions.push({
      key: 'neg_accel',
      weight: accelWeight,
      label: `Negative price acceleration (${input.price_change_5m.toFixed(1)}% in 5M)`,
    });
  }

  // 11. Abnormal volatility
  if (input.volatility_pct >= 8.5) {
    conditions.push({
      key: 'high_vol',
      weight: 7,
      label: `Abnormal volatility (${input.volatility_pct.toFixed(1)}%)`,
    });
  }

  // 12. Sniper/bundle overhang & weak execution
  if (input.sniper_pct + input.bundle_pct >= 32 || input.execution_quality < 42) {
    conditions.push({
      key: 'orderflow_risk',
      weight: 8,
      label: `Sniper/bundle supply overhang (${(input.sniper_pct + input.bundle_pct).toFixed(0)}%, Exec ${input.execution_quality}/100)`,
    });
  }

  // 13. Liquidity/volume anomalies
  if (
    input.wash_trading_risk === 'HIGH' ||
    (input.bot_activity_score ?? 0) >= 70 ||
    (input.liquidity_change_during_dumps_pct ?? 0) <= -15
  ) {
    conditions.push({
      key: 'anom_liq_vol',
      weight: 8,
      label: 'Liquidity/volume anomaly detected during sell waves',
    });
  }

  // Sequence detection: require >= 2 corroborating signals before amplifying risk
  let rawRisk = conditions.reduce((acc, c) => acc + c.weight, 8);
  const seqCount = conditions.length;
  if (seqCount <= 1) {
    // Do not let a single isolated indicator inflate dump risk into high alert
    rawRisk = Math.min(rawRisk, 32);
  } else if (seqCount >= 5) {
    rawRisk += 10;
  } else if (seqCount >= 3) {
    rawRisk += 5;
  }

  const riskPct = Math.max(4, Math.min(98, Math.round(rawRisk)));

  let level: PreDumpRiskLevel = 'NORMAL';
  if (riskPct >= th.confirmedDumpThresholdPct || (seqCount >= 6 && input.price_change_5m <= -7 && sellShare5m >= 0.62)) {
    level = 'CONFIRMED DUMP';
  } else if (riskPct >= th.highDumpThresholdPct) {
    level = 'HIGH DUMP RISK';
  } else if (riskPct >= th.earlyDumpThresholdPct && seqCount >= 2) {
    level = 'EARLY DUMP RISK';
  }

  conditions.sort((a, b) => b.weight - a.weight);

  return {
    risk_pct: riskPct,
    level,
    sequence_count: seqCount,
    active_conditions: conditions.slice(0, 6).map((c) => c.label),
    disclaimer: 'Probabilistic risk detection from multi-factor sequences — never a guaranteed prediction.',
  };
}
