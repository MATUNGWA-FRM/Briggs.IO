import { evaluatePreDumpRisk } from './preDumpEngine.ts';
import {
  DEFAULT_SIGNAL_ENGINE_THRESHOLDS,
  type SignalEngineThresholds,
} from './terminalSettings.ts';
import type {
  LiveSignalState,
  LiveSignalType,
  SignalDecisionFlow,
  SignalRiskGate,
  BriggMode,
} from './types.ts';

export interface LiveSignalInputs {
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
  social_momentum: number;
  market_regime_score: number; // 0..1
  market_regime_label?: string;
  wash_trading_risk?: 'LOW' | 'ELEVATED' | 'HIGH';
  bot_activity_score?: number;
  ml_buy_probability_override?: number; // Optional external ML model prediction probability (0..100)
  thresholds?: SignalEngineThresholds;
  trigger_source: 'INITIAL_ANALYSIS' | 'LIVE_MARKET_TICK';
  timestamp_ms?: number;
}

function fmtPriceCompact(v: number): string {
  if (!Number.isFinite(v) || v <= 0) return '$0';
  if (v < 0.0001) return `$${v.toFixed(7)}`;
  if (v < 0.01) return `$${v.toFixed(6)}`;
  if (v < 1) return `$${v.toFixed(4)}`;
  return `$${v.toFixed(2)}`;
}

/**
 * Deterministic Brigg.AI Signal Engine (v1.2):
 * Flow: Market Data -> Feature Extraction -> ML Prediction -> Risk/Regime Validation -> Signal Decision -> Live Action
 *
 * Strictly separates ML inference probability from live Risk & Pre-Dump validation gates so a lagging
 * bullish ML prediction can NEVER override active bearish / dump conditions to display BUY.
 */
export function evaluateLiveSignal(input: LiveSignalInputs): LiveSignalState {
  const ts = input.timestamp_ms ?? Date.now();
  const th = input.thresholds ?? DEFAULT_SIGNAL_ENGINE_THRESHOLDS;

  // 1. Synchronized Market Snapshot Feature Extraction
  const total5m = Math.max(1, input.buys_5m + input.sells_5m);
  const buyShare5m = input.buys_5m / total5m;
  const sellShare5m = 1 - buyShare5m;
  const buyShare5mPct = Math.round(buyShare5m * 100);

  const total1h = Math.max(1, input.buys_1h + input.sells_1h);
  const buyShare1h = input.buys_1h / total1h;

  const aboveVwap = input.vwap <= 0 || input.price_usd >= input.vwap * 0.998;
  const emaBull = input.ema9 >= input.ema21;
  const minHealthyLiq = input.mode === 'MEMECOIN' ? 40_000 : 12_000;
  const supportBroken = input.support_level > 0 && input.price_usd < input.support_level;
  const nearResistance =
    input.resistance_level > 0 && input.price_usd >= input.resistance_level * 0.985;

  // 2. ML Prediction Component (inference probability from multi-horizon structure)
  let mlLogit = 0;
  mlLogit += (buyShare1h - 0.5) * 3.2;
  mlLogit += (input.price_change_1h / 20) * 0.95;
  mlLogit += (input.volume_acceleration_pct / 50) * 0.65;
  mlLogit += (input.social_momentum - 50) / 55;
  mlLogit += (input.execution_quality - 55) / 60;
  mlLogit += (input.market_regime_score - 0.5) * 1.1;
  mlLogit -= Math.max(0, input.sniper_pct + input.bundle_pct - 28) * 0.025;
  if (input.price_change_5m > 0.5) mlLogit += 0.35;
  if (input.price_change_5m < -4) mlLogit -= 0.45;

  const computedMlBuyPct = Math.max(
    8,
    Math.min(93, Math.round((1 / (1 + Math.exp(-Math.max(-5, Math.min(5, mlLogit))))) * 100))
  );
  const mlBuyProbPct =
    typeof input.ml_buy_probability_override === 'number'
      ? Math.max(1, Math.min(99, Math.round(input.ml_buy_probability_override)))
      : computedMlBuyPct;
  const mlSellProbPct = 100 - mlBuyProbPct;
  const mlDirection: SignalDecisionFlow['ml_prediction']['direction'] =
    mlBuyProbPct >= th.mlBuyMinProbPct ? 'BUY' : mlBuyProbPct <= 42 ? 'BEARISH' : 'NEUTRAL';
  const mlConfidencePct = Math.max(35, Math.min(92, Math.round(50 + Math.abs(mlBuyProbPct - 50) * 0.9)));

  // 3. Dedicated Pre-Dump Risk Detection (same live snapshot)
  const preDump = evaluatePreDumpRisk({
    ...input,
    thresholds: th,
  });

  // Collect synced Bullish vs Bearish factor lists
  const bullishFactors: string[] = [];
  const bearishFactors: string[] = [];

  if (buyShare5mPct >= th.minBuyShare5mForBuyPct) {
    bullishFactors.push(`5M buy orderflow dominant (${buyShare5mPct}% buys: ${input.buys_5m}B/${input.sells_5m}S)`);
  } else if (sellShare5m >= 0.55) {
    bearishFactors.push(`Sell pressure elevated (${Math.round(sellShare5m * 100)}% 5M sells: ${input.sells_5m}S/${input.buys_5m}B)`);
  }

  if (emaBull && aboveVwap) {
    bullishFactors.push('Price holding above VWAP with EMA9 >= EMA21');
  } else {
    if (!aboveVwap) bearishFactors.push('VWAP lost — price trading below session anchor');
    if (!emaBull) bearishFactors.push('EMA9 crossed below EMA21 (bearish trend)');
  }

  if (input.price_change_5m >= 1.0 && input.rsi14 < 74) {
    bullishFactors.push(`Positive 5M momentum (+${input.price_change_5m.toFixed(1)}%, RSI ${input.rsi14.toFixed(0)})`);
  } else if (input.price_change_5m <= -2.0) {
    bearishFactors.push(`Negative 5M acceleration (${input.price_change_5m.toFixed(1)}%)`);
  }

  if (input.liquidity_usd >= minHealthyLiq && input.liquidity_growth_1h_pct > -8) {
    bullishFactors.push(`Liquidity depth healthy ($${Math.round(input.liquidity_usd).toLocaleString()})`);
  } else {
    bearishFactors.push(
      input.liquidity_growth_1h_pct <= -8
        ? `Liquidity declining (${input.liquidity_growth_1h_pct.toFixed(1)}% 1H)`
        : `Thin liquidity ($${Math.round(input.liquidity_usd).toLocaleString()})`
    );
  }

  if (supportBroken) {
    bearishFactors.push(`Support breakdown below ${fmtPriceCompact(input.support_level)}`);
  }
  if (input.volume_acceleration_pct >= 18 && input.price_change_5m > 0) {
    bullishFactors.push(`Organic volume expansion (+${input.volume_acceleration_pct.toFixed(0)}%)`);
  }
  if (input.rsi14 >= 75) {
    bearishFactors.push(`RSI overbought (${input.rsi14.toFixed(0)}) near take-profit resistance`);
  }
  if (input.volatility_pct > th.maxVolatilityForBuyPct) {
    bearishFactors.push(`Volatility spike (${input.volatility_pct.toFixed(1)}% > ${th.maxVolatilityForBuyPct}% cap)`);
  }
  if (input.market_regime_score < 0.35) {
    bearishFactors.push(`Bearish market regime (${input.market_regime_label || 'Defensive'})`);
  }

  // 4. Risk & Market-Regime Validation Gates
  const riskGates: SignalRiskGate[] = [
    {
      id: 'pre_dump_gate',
      label: 'Pre-Dump Risk Gate',
      passed: preDump.risk_pct < th.maxDumpRiskForBuyPct && preDump.level === 'NORMAL',
      detail: `Dump Risk ${preDump.risk_pct}% (${preDump.level}, ceiling <${th.maxDumpRiskForBuyPct}%)`,
    },
    {
      id: 'orderflow_gate',
      label: 'Orderflow Balance Gate',
      passed: buyShare5mPct >= th.minBuyShare5mForBuyPct,
      detail: `5M Buys ${buyShare5mPct}% (min ${th.minBuyShare5mForBuyPct}%)`,
    },
    {
      id: 'trend_vwap_gate',
      label: 'VWAP & Trend Gate',
      passed: aboveVwap && (emaBull || input.price_change_5m > 0),
      detail: aboveVwap ? 'Above VWAP' : 'Below VWAP',
    },
    {
      id: 'support_velocity_gate',
      label: 'Support & Velocity Gate',
      passed: !supportBroken && input.price_change_5m > -2.5,
      detail: supportBroken
        ? `Broken below ${fmtPriceCompact(input.support_level)}`
        : `5M delta ${input.price_change_5m >= 0 ? '+' : ''}${input.price_change_5m.toFixed(1)}%`,
    },
    {
      id: 'liquidity_gate',
      label: 'Liquidity & Execution Gate',
      passed: input.liquidity_usd >= 8_000 && input.liquidity_growth_1h_pct > -15 && input.execution_quality >= 38,
      detail: `$${Math.round(input.liquidity_usd).toLocaleString()} LP · Exec ${input.execution_quality}/100`,
    },
    {
      id: 'regime_vol_gate',
      label: 'Regime & Volatility Gate',
      passed:
        (!th.requireBullishRegimeOrNeutral || input.market_regime_score >= 0.35) &&
        input.volatility_pct <= th.maxVolatilityForBuyPct,
      detail: `${input.market_regime_label || 'Regime'} (${Math.round(input.market_regime_score * 100)}%) · Vol ${input.volatility_pct.toFixed(1)}%`,
    },
  ];

  const failedGates = riskGates.filter((g) => !g.passed);
  const allBuyGatesPass = failedGates.length === 0;

  // 5. Deterministic Signal Priority Resolution
  // Priority: CONFIRMED DUMP -> HIGH DUMP RISK -> STRONG BEARISH -> CONFLICT/BLOCKED/WAIT -> CONFIRMATION REQUIRED -> BUY
  const sellConfirmationMet =
    preDump.risk_pct >= th.sellConfirmationMinDumpPct &&
    sellShare5m >= 0.56 &&
    (!th.sellConfirmRequiresVwapLoss || !aboveVwap || supportBroken);

  let finalSignal: LiveSignalType;
  let decisionStatus: SignalDecisionFlow['decision_status'] = 'ALLOWED';
  let blockedReason: string | undefined;

  if (preDump.level === 'CONFIRMED DUMP') {
    if (sellConfirmationMet || input.price_change_5m <= -6.5) {
      finalSignal = 'SELL';
      decisionStatus = mlDirection === 'BUY' ? 'BUY BLOCKED' : 'SELL CONFIRMED';
    } else {
      finalSignal = 'DUMP RISK';
      decisionStatus = mlDirection === 'BUY' ? 'BUY BLOCKED' : 'DOWNGRADED';
    }
    blockedReason =
      mlDirection === 'BUY'
        ? `ML BUY (${mlBuyProbPct}%) blocked by Confirmed Dump (${preDump.risk_pct}%): ${preDump.active_conditions.slice(0, 2).join(' + ')}`
        : `Confirmed multi-factor dump sequence (${preDump.risk_pct}%)`;
  } else if (preDump.level === 'HIGH DUMP RISK') {
    if (sellConfirmationMet) {
      finalSignal = 'SELL';
      decisionStatus = mlDirection === 'BUY' ? 'BUY BLOCKED' : 'SELL CONFIRMED';
      blockedReason = `Sell confirmation reached (${preDump.risk_pct}% dump risk, ${Math.round(sellShare5m * 100)}% 5M sells)`;
    } else {
      finalSignal = 'DUMP RISK';
      decisionStatus = mlDirection === 'BUY' ? 'BUY BLOCKED' : 'DOWNGRADED';
      blockedReason =
        mlDirection === 'BUY'
          ? `ML BUY (${mlBuyProbPct}%) blocked — High Pre-Dump Risk (${preDump.risk_pct}%): ${failedGates.map((g) => g.label.replace(' Gate', '')).join(' + ')}`
          : `High pre-dump risk detected (${preDump.risk_pct}%) — await sell confirmation or recovery`;
    }
  } else if (bearishFactors.length >= 3 && sellShare5m >= 0.57 && !aboveVwap) {
    finalSignal = preDump.risk_pct >= th.earlyDumpThresholdPct ? 'DUMP RISK' : 'PARTIAL SELL';
    decisionStatus = mlDirection === 'BUY' ? 'BUY BLOCKED' : 'DOWNGRADED';
    blockedReason = `Strong bearish confirmation (${bearishFactors.length} risk factors, ${Math.round(sellShare5m * 100)}% 5M sells)`;
  } else if (nearResistance && input.rsi14 >= 72 && sellShare5m >= 0.48) {
    finalSignal = 'PARTIAL SELL';
    decisionStatus = mlDirection === 'BUY' ? 'BUY BLOCKED' : 'DOWNGRADED';
    blockedReason = `Stretched near resistance (RSI ${input.rsi14.toFixed(0)}) — partial take-profit zone`;
  } else if (mlDirection === 'BUY' && !allBuyGatesPass) {
    decisionStatus = 'BUY BLOCKED';
    if (preDump.level === 'EARLY DUMP RISK' || preDump.risk_pct >= th.earlyDumpThresholdPct) {
      finalSignal = 'DUMP RISK';
    } else if (failedGates.length >= 2) {
      finalSignal = 'WAIT';
    } else {
      finalSignal = 'CONFIRMATION REQUIRED';
    }
    blockedReason = `ML BUY (${mlBuyProbPct}%) blocked by ${failedGates.map((g) => g.label.replace(' Gate', '')).join(' + ')}`;
  } else if (mlDirection === 'BUY' && allBuyGatesPass && bullishFactors.length >= 3) {
    finalSignal = 'BUY';
    decisionStatus = 'ALLOWED';
  } else if (mlBuyProbPct >= 54 && allBuyGatesPass && bullishFactors.length >= 2) {
    finalSignal = 'CONFIRMATION REQUIRED';
    decisionStatus = 'DOWNGRADED';
    blockedReason = 'Moderate bullish bias — requires stronger orderflow or volume breakout';
  } else if (preDump.level === 'EARLY DUMP RISK') {
    finalSignal = 'DUMP RISK';
    decisionStatus = 'DOWNGRADED';
    blockedReason = `Early pre-dump warning (${preDump.risk_pct}%): ${preDump.active_conditions.slice(0, 2).join(' + ')}`;
  } else if (failedGates.length > 0) {
    finalSignal = 'WAIT';
    decisionStatus = 'DOWNGRADED';
    blockedReason = `Waiting for risk gates: ${failedGates.map((g) => g.label.replace(' Gate', '')).join(', ')}`;
  } else {
    finalSignal = 'HOLD';
    decisionStatus = 'ALLOWED';
  }

  // 6. Synchronized Non-Contradictory Signal Explanations & Context
  const reasons: LiveSignalState['reasons'] = [];
  if (finalSignal === 'BUY') {
    // Only synchronized bullish/passing reasons when BUY is allowed
    for (const f of bullishFactors.slice(0, 4)) {
      reasons.push({ direction: '+', text: f });
    }
    if (reasons.length === 0) {
      reasons.push({
        direction: '+',
        text: `All ${riskGates.length} risk gates passed (Dump Risk ${preDump.risk_pct}%)`,
      });
    }
  } else {
    // Active bearish, dump-risk, and failed-gate explanations synchronized to current snapshot
    for (const c of preDump.active_conditions.slice(0, 3)) {
      reasons.push({ direction: '-', text: c });
    }
    for (const b of bearishFactors) {
      if (reasons.length >= 5) break;
      if (!reasons.some((r) => r.text === b)) {
        reasons.push({ direction: '-', text: b });
      }
    }
    if (reasons.length < 3) {
      for (const fg of failedGates) {
        if (reasons.length >= 4) break;
        reasons.push({ direction: '-', text: `${fg.label}: ${fg.detail}` });
      }
    }
    if (reasons.length === 0) {
      reasons.push({
        direction: '+',
        text: bullishFactors[0] || 'Orderflow and VWAP balanced near current range',
      });
    }
  }

  const compositeScore = Math.max(
    4,
    Math.min(
      96,
      Math.round(mlBuyProbPct * 0.45 + (100 - preDump.risk_pct) * 0.4 + buyShare5mPct * 0.15)
    )
  );

  const signalConfidence = Math.max(
    40,
    Math.min(
      95,
      Math.round(
        finalSignal === 'BUY'
          ? (mlConfidencePct + (100 - preDump.risk_pct)) / 2
          : finalSignal === 'SELL' || finalSignal === 'DUMP RISK'
          ? Math.max(mlConfidencePct, preDump.risk_pct)
          : 50 + Math.abs(compositeScore - 50) * 0.85
      )
    )
  );

  const entryContext =
    finalSignal === 'BUY'
      ? `Confirmed above VWAP (${fmtPriceCompact(input.vwap || input.price_usd)}) with ${buyShare5mPct}% 5M buy share`
      : decisionStatus === 'BUY BLOCKED'
      ? `Entry blocked — reclaim VWAP (${fmtPriceCompact(input.vwap || input.price_usd)}) & drop Dump Risk <${th.maxDumpRiskForBuyPct}%`
      : `Stand aside until ${buyShare5mPct < th.minBuyShare5mForBuyPct ? 'buy flow recovers' : 'risk gates clear'}`;

  const stopPrice =
    input.support_level > 0
      ? Math.min(input.price_usd * 0.96, input.support_level * 0.985)
      : input.price_usd * 0.92;
  const targetPrice =
    input.resistance_level > input.price_usd
      ? input.resistance_level
      : input.price_usd * 1.12;

  const stopContext = `Invalidation / Stop near ${fmtPriceCompact(stopPrice)} · Pre-Dump ${preDump.risk_pct}% (${preDump.level})`;
  const targetContext =
    finalSignal === 'SELL' || finalSignal === 'DUMP RISK' || finalSignal === 'PARTIAL SELL'
      ? `Protect capital · Watch resistance ${fmtPriceCompact(targetPrice)} only on full reclaim`
      : `Nearest resistance target ${fmtPriceCompact(targetPrice)}`;

  const decisionFlow: SignalDecisionFlow = {
    ml_prediction: {
      direction: mlDirection,
      buy_probability_pct: mlBuyProbPct,
      sell_probability_pct: mlSellProbPct,
      confidence_pct: mlConfidencePct,
    },
    bullish_factors: bullishFactors,
    bearish_factors: bearishFactors,
    dump_risk: preDump,
    market_regime: input.market_regime_label || (input.market_regime_score >= 0.5 ? 'Constructive' : 'Defensive'),
    risk_gates: riskGates,
    decision_status: decisionStatus,
    final_signal: finalSignal,
    blocked_or_changed_reason: blockedReason,
    snapshot_timestamp_ms: ts,
    snapshot_values: {
      price_usd: input.price_usd,
      price_change_5m: input.price_change_5m,
      price_change_1h: input.price_change_1h,
      buy_share_5m_pct: buyShare5mPct,
      rsi14: input.rsi14,
      ema9: input.ema9,
      ema21: input.ema21,
      vwap: input.vwap,
      liquidity_usd: input.liquidity_usd,
    },
  };

  return {
    signal: finalSignal,
    confidence_pct: signalConfidence,
    updated_at_ms: ts,
    updated_at_iso: new Date(ts).toISOString(),
    trigger_source: input.trigger_source,
    composite_score: compositeScore,
    reasons,
    pre_dump: preDump,
    decision_flow: decisionFlow,
    entry_context: entryContext,
    stop_context: stopContext,
    target_context: targetContext,
  };
}
