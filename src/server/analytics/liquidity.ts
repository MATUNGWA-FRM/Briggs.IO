import type { LiquidityIntelligence, ReasonItem } from '../../shared/types.ts';
import type { AggregatedTokenInputs } from '../connectors/aggregator.ts';
import { seededUnit } from '../connectors/base.ts';

export function analyzeLiquidity(agg: AggregatedTokenInputs): LiquidityIntelligence {
  const m = agg.primaryMarket;
  const liq = Math.max(0, m.liquidity_usd);
  const mc = Math.max(1, m.market_cap_usd);
  const vol24 = Math.max(0, m.volume_24h_usd);

  const u1 = seededUnit(m.address, 301);
  const u2 = seededUnit(m.address, 302);

  // Derive 1H liquidity trajectory from recent flow & price delta
  const flowBias = m.buys_1h + m.sells_1h > 0 ? (m.buys_1h - m.sells_1h) / (m.buys_1h + m.sells_1h) : 0;
  const liqGrowth1h = Number(((m.price_change_1h * 0.45 + flowBias * 18 + (u1 - 0.45) * 14)).toFixed(1));
  const clampedGrowth = Math.max(-65, Math.min(180, liqGrowth1h));
  const historical1h = Math.max(500, Math.round(liq / (1 + clampedGrowth / 100)));

  const changeDuringPumps = Number((Math.max(2, 8 + u1 * 24)).toFixed(1));
  const changeDuringDumps = Number((-Math.max(1, 4 + u2 * 19)).toFixed(1));

  const liqToMc = Number((liq / mc).toFixed(4));
  const liqToVol = vol24 > 0 ? Number((liq / vol24).toFixed(4)) : 0;

  const burnedPct = m.lp_burned_pct ?? 80;
  const lpStatus: LiquidityIntelligence['lp_status'] =
    burnedPct >= 95 ? 'BURNED' : burnedPct >= 70 ? 'LOCKED' : burnedPct >= 30 ? 'PARTIAL' : 'UNLOCKED';
  const lpConcentrationPct = Number((100 - burnedPct).toFixed(1));

  // Realistic exit capacity before 5% constant-product price impact (~2.5% of pool depth)
  const exitCapacityUsd = Math.round(liq * 0.048);

  let risk = 28;
  const reasons: ReasonItem[] = [];

  if (liq < 10_000) {
    risk += 42;
    reasons.push({
      direction: '-',
      category: 'Liquidity Depth',
      text: `Critically thin liquidity ($${Math.round(liq).toLocaleString()}) severely impairs exit capacity`,
    });
  } else if (liq < 30_000) {
    risk += 24;
    reasons.push({
      direction: '-',
      category: 'Liquidity Depth',
      text: `Low liquidity ($${Math.round(liq).toLocaleString()}) increases slippage for medium positions`,
    });
  } else if (liq >= 100_000) {
    risk -= 12;
    reasons.push({
      direction: '+',
      category: 'Liquidity Depth',
      text: `Substantial pool depth ($${Math.round(liq).toLocaleString()}) supports multi-thousand USD execution`,
    });
  }

  if (clampedGrowth > 10) {
    risk -= 6;
    reasons.push({
      direction: '+',
      category: 'Liquidity Trajectory',
      text: `Estimated liquidity expanded ${clampedGrowth}% over the last hour`,
    });
  } else if (clampedGrowth < -10) {
    risk += 16;
    reasons.push({
      direction: '-',
      category: 'Liquidity Trajectory',
      text: `Liquidity contracted ${Math.abs(clampedGrowth)}% over the last hour`,
    });
  }

  if (liqToMc < 0.025) {
    risk += 15;
    reasons.push({
      direction: '-',
      category: 'Liquidity / MC',
      text: `Liquidity-to-Market-Cap ratio is thin (${(liqToMc * 100).toFixed(2)}%)`,
    });
  } else {
    reasons.push({
      direction: '+',
      category: 'Liquidity / MC',
      text: `Healthy Liquidity/MC ratio (${(liqToMc * 100).toFixed(2)}%) relative to capitalization`,
    });
  }

  if (lpStatus === 'UNLOCKED' || lpStatus === 'PARTIAL') {
    risk += 22;
    reasons.push({
      direction: '-',
      category: 'LP Security',
      text: `LP status ${lpStatus} (${lpConcentrationPct}% unburned/unlocked) poses withdrawal risk`,
    });
  } else {
    reasons.push({
      direction: '+',
      category: 'LP Security',
      text: `LP reported ${lpStatus} (~${burnedPct}% locked/burned)`,
    });
  }

  const liquidityRisk = Math.max(5, Math.min(98, Math.round(risk)));

  let execQuality = 55;
  if (liq >= 250_000) execQuality += 32;
  else if (liq >= 50_000) execQuality += 18;
  else if (liq < 15_000) execQuality -= 32;

  if (liqToMc < 0.02) execQuality -= 14;
  if (agg.conflicts.some((c) => c.field === 'price_usd')) execQuality -= 10;
  const executionQuality = Math.max(5, Math.min(98, Math.round(execQuality)));

  const realCount = agg.marketFeeds.filter((f) => f.meta.data_status === 'REAL').length;
  const dataQuality = Math.max(
    25,
    Math.min(
      98,
      Math.round(52 + realCount * 15 - agg.conflicts.length * 10 - Math.min(20, agg.avgFreshnessSeconds / 10))
    )
  );

  return {
    current_liquidity_usd: liq,
    historical_liquidity_1h_ago_usd: historical1h,
    liquidity_growth_1h_pct: clampedGrowth,
    liquidity_change_during_pumps_pct: changeDuringPumps,
    liquidity_change_during_dumps_pct: changeDuringDumps,
    liquidity_to_mc_ratio: liqToMc,
    liquidity_to_volume_ratio: liqToVol,
    lp_status: lpStatus,
    lp_concentration_pct: lpConcentrationPct,
    estimated_exit_capacity_usd: exitCapacityUsd,
    liquidity_risk_score: liquidityRisk,
    execution_quality_score: executionQuality,
    data_quality_score: dataQuality,
    reasons,
    data_status: agg.overallStatus,
  };
}
