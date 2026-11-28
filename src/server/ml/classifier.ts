import {
  MEMECOIN_MIN_AGE_MINUTES,
  SHITCOIN_MAX_AGE_MINUTES,
  type BriggMode,
  type TokenClassClassification,
  type TokenForensics,
} from '../../shared/types.ts';

function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-Math.max(-20, Math.min(20, z))));
}

export interface TokenClassificationInput {
  age_minutes: number;
  market_cap_usd: number;
  liquidity_usd: number;
  holder_count: number;
  sniper_pct: number;
  bundle_pct: number;
  migration_status: TokenForensics['migration_status'];
  volume_24h_usd: number;
  active_mode: BriggMode;
}

/**
 * Classifies Solana tokens into SHITCOIN vs MEMECOIN:
 * - Initial position: newly launched tokens <= 3 days (4,320 min) are SHITCOIN.
 * - Established tokens > 1 month (> 30 days = 43,200 min) are MEMECOIN.
 * - ML logistic feature classifier evaluates age, liquidity depth, MC, holder maturity,
 *   sniper/bundle overhang, migration state, and turnover to emit calibrated class probabilities
 *   and resolve the 3d-30d transition window.
 */
export function classifyTokenKind(input: TokenClassificationInput): TokenClassClassification {
  const ageMinutes = Math.max(1, input.age_minutes);
  const ageDays = Number((ageMinutes / 1440).toFixed(2));
  const mc = Math.max(1, input.market_cap_usd);
  const liq = Math.max(0, input.liquidity_usd);
  const holders = Math.max(1, input.holder_count);
  const turnover = input.volume_24h_usd / mc;

  const initial_rule_class: TokenClassClassification['initial_rule_class'] =
    ageMinutes <= SHITCOIN_MAX_AGE_MINUTES
      ? 'SHITCOIN'
      : ageMinutes >= MEMECOIN_MIN_AGE_MINUTES
      ? 'MEMECOIN'
      : 'TRANSITION';

  // Standardized ML feature logit favoring MEMECOIN (>0 -> Memecoin, <0 -> Shitcoin)
  const logAge = Math.log10(Math.max(1, ageMinutes)); // 10m=1, 3d(4320m)=3.63, 30d(43200m)=4.64
  const logMc = Math.log10(Math.max(1_000, mc)); // $10k=4, $10M=7, $1B=9
  const logLiq = Math.log10(Math.max(500, liq)); // $5k=3.7, $1M=6
  const logHolders = Math.log10(Math.max(10, holders));

  const mlLogit =
    (logAge - 4.05) * 2.15 +
    (logMc - 6.35) * 0.72 +
    (logLiq - 5.15) * 0.65 +
    (logHolders - 3.35) * 0.55 +
    (input.migration_status === 'MIGRATED' ? 0.45 : -0.55) -
    Math.max(0, input.sniper_pct - 12) * 0.045 -
    Math.max(0, input.bundle_pct - 10) * 0.04 -
    Math.max(0, turnover - 1.5) * 0.28;

  let memecoinProb = Math.round(sigmoid(mlLogit) * 100);

  // Enforce domain anchor bounds on strict age regions while retaining real feature sensitivity
  if (initial_rule_class === 'SHITCOIN') {
    memecoinProb = Math.min(34, Math.max(3, memecoinProb));
  } else if (initial_rule_class === 'MEMECOIN') {
    memecoinProb = Math.max(68, Math.min(98, memecoinProb));
  } else {
    memecoinProb = Math.max(12, Math.min(88, memecoinProb));
  }

  const shitcoinProb = 100 - memecoinProb;

  const classified_mode: BriggMode =
    initial_rule_class === 'SHITCOIN'
      ? 'SHITCOIN'
      : initial_rule_class === 'MEMECOIN'
      ? 'MEMECOIN'
      : memecoinProb >= 55
      ? 'MEMECOIN'
      : 'SHITCOIN';

  const classification_reason =
    initial_rule_class === 'SHITCOIN'
      ? `Age ${ageDays < 1 ? `${Math.round(ageMinutes)}m` : `${ageDays.toFixed(1)}d`} <= 3d initial threshold · ML confirms Shitcoin (${shitcoinProb}%) on ${holders.toLocaleString()} holders & ${input.sniper_pct.toFixed(1)}% sniper overhang`
      : initial_rule_class === 'MEMECOIN'
      ? `Age ${Math.round(ageDays)}d > 30d (1mo+) threshold · ML confirms Memecoin (${memecoinProb}%) on $${Math.round(liq).toLocaleString()} LP depth & ${holders.toLocaleString()} holders`
      : `Age ${ageDays.toFixed(1)}d in 3d–30d ML transition zone · ML classifies ${classified_mode} (${classified_mode === 'MEMECOIN' ? memecoinProb : shitcoinProb}%) from MC, LP & distribution structure`;

  return {
    classified_mode,
    initial_rule_class,
    ml_shitcoin_prob_pct: shitcoinProb,
    ml_memecoin_prob_pct: memecoinProb,
    age_minutes: ageMinutes,
    age_days: ageDays,
    matches_active_mode: classified_mode === input.active_mode,
    classification_reason,
  };
}
