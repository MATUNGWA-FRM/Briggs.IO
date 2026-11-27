import type {
  BriggMode,
  ChartIntelligence,
  EngineeredFeatures,
  HolderIntelligence,
  LiquidityIntelligence,
  MarketRegimeState,
  SocialIntelligence,
  TokenForensics,
  VolumeIntelligence,
} from '../../shared/types.ts';

export const CURRENT_FEATURE_VERSION = 'f_v2.1';

export interface FeatureDefinition {
  name: keyof EngineeredFeatures;
  definition: string;
  source: string;
  missing_behavior: string;
}

export const FEATURE_REGISTRY: FeatureDefinition[] = [
  {
    name: 'token_age_minutes',
    definition: 'Minutes elapsed since pair/token creation up to prediction timestamp T',
    source: 'dexscreener',
    missing_behavior: 'Default to 60 minutes if creation time unavailable',
  },
  {
    name: 'price_return_5m',
    definition: '5-minute percentage price return observed at T',
    source: 'dexscreener / padre',
    missing_behavior: 'Zero-fill and reduce confidence',
  },
  {
    name: 'price_return_1h',
    definition: '1-hour percentage price return observed at T',
    source: 'dexscreener / padre',
    missing_behavior: 'Zero-fill and reduce confidence',
  },
  {
    name: 'volatility_1h',
    definition: 'Bar-level ATR/close volatility % up to T',
    source: 'brigg_chart_engine',
    missing_behavior: 'Impute cross-sectional median 4.5%',
  },
  {
    name: 'volume_acceleration',
    definition: '1H volume run-rate % deviation vs 24H hourly baseline',
    source: 'dexscreener / mevx',
    missing_behavior: 'Zero-fill (neutral acceleration)',
  },
  {
    name: 'buy_sell_imbalance',
    definition: '(Buys - Sells) / (Buys + Sells) over 1H window at T',
    source: 'dexscreener / padre',
    missing_behavior: 'Zero-fill (balanced flow)',
  },
  {
    name: 'liquidity_change_1h',
    definition: 'Estimated 1H % change in pool liquidity USD',
    source: 'dexscreener / mevx',
    missing_behavior: 'Zero-fill and flag staleness',
  },
  {
    name: 'liquidity_to_mc',
    definition: 'Pool liquidity USD divided by market cap USD',
    source: 'dexscreener',
    missing_behavior: 'Impute 0.01 (conservative)',
  },
  {
    name: 'volume_to_liquidity',
    definition: '24H volume divided by pool liquidity',
    source: 'dexscreener',
    missing_behavior: 'Impute 1.0',
  },
  {
    name: 'holder_growth_1h',
    definition: '1-hour percentage growth in unique holders',
    source: 'gmgn',
    missing_behavior: 'Zero-fill and mark MOCK/UNAVAILABLE',
  },
  {
    name: 'top_10_concentration',
    definition: 'Share of circulating supply held by top 10 non-LP wallets (%)',
    source: 'gmgn',
    missing_behavior: 'Conservative 35% fallback',
  },
  {
    name: 'sniper_pct',
    definition: 'Estimated percentage of supply captured by early block snipers',
    source: 'mevx',
    missing_behavior: 'Conservative 20% fallback',
  },
  {
    name: 'insider_exposure',
    definition: '0-100 insider wallet exposure index based on funding/timing evidence',
    source: 'gmgn',
    missing_behavior: 'Conservative 40 fallback',
  },
  {
    name: 'bundle_concentration',
    definition: 'Combined supply % held by synchronized bundle clusters',
    source: 'mevx',
    missing_behavior: 'Conservative 15% fallback',
  },
  {
    name: 'social_velocity',
    definition: '1H mention velocity across X, Telegram, Reddit, Twitch',
    source: 'x / telegram / reddit / twitch',
    missing_behavior: 'Zero-fill and note unavailable social source',
  },
  {
    name: 'execution_quality',
    definition: '0-100 slippage and exit-capacity score at T',
    source: 'brigg_execution_engine',
    missing_behavior: 'Conservative 35/100',
  },
  {
    name: 'data_freshness_score',
    definition: '0-100 freshness score decaying with source ingestion lag',
    source: 'brigg_aggregator',
    missing_behavior: '0 (triggers No-Trade Engine)',
  },
];

const FORBIDDEN_FUTURE_KEYS = new Set([
  'actual_outcome',
  'outcome_timestamp',
  'return_pct',
  'max_favorable_excursion_pct',
  'max_adverse_excursion_pct',
  'exit_condition',
  'future_price',
  'future_volume',
  'future_holders',
]);

/**
 * Mandatory Temporal Leakage Prevention Guard (§36).
 * Verifies that:
 * 1) No future outcome/label keys appear in the feature object.
 * 2) Feature computation timestamp <= prediction timestamp T.
 * 3) Any time-series observations passed in with timestamp > T are rejected.
 */
export function assertNoTemporalLeakage(
  predictionTimestampIso: string,
  featureObj: Record<string, unknown>,
  observationTimestampsIso: string[] = []
): { valid: boolean; violation?: string } {
  const predMs = Date.parse(predictionTimestampIso);
  if (Number.isNaN(predMs)) {
    return { valid: false, violation: 'Invalid prediction timestamp T' };
  }

  for (const key of Object.keys(featureObj)) {
    if (FORBIDDEN_FUTURE_KEYS.has(key)) {
      return { valid: false, violation: `Temporal leakage detected: forbidden future field "${key}" in feature vector` };
    }
  }

  const computedIso = featureObj.computed_at_timestamp;
  if (typeof computedIso === 'string') {
    const compMs = Date.parse(computedIso);
    if (!Number.isNaN(compMs) && compMs > predMs + 1000) {
      return {
        valid: false,
        violation: `Temporal leakage detected: feature timestamp (${computedIso}) exceeds prediction time T (${predictionTimestampIso})`,
      };
    }
  }

  for (const obsIso of observationTimestampsIso) {
    const obsMs = Date.parse(obsIso);
    if (!Number.isNaN(obsMs) && obsMs > predMs + 1000) {
      return {
        valid: false,
        violation: `Temporal leakage detected: observation timestamp (${obsIso}) > prediction time T (${predictionTimestampIso})`,
      };
    }
  }

  return { valid: true };
}

export function buildEngineeredFeatures(params: {
  mode: BriggMode;
  predictionTimeIso: string;
  forensics: TokenForensics;
  liquidity: LiquidityIntelligence;
  volume: VolumeIntelligence;
  holders: HolderIntelligence;
  chart: ChartIntelligence;
  social: SocialIntelligence;
  regime: MarketRegimeState;
  executionQuality: number;
  freshnessSeconds: number;
}): EngineeredFeatures {
  const {
    predictionTimeIso,
    forensics,
    liquidity,
    volume,
    holders,
    chart,
    social,
    regime,
    executionQuality,
    freshnessSeconds,
  } = params;

  const h1 = volume.windows.find((w) => w.timeframe === '1H') || volume.windows[0];
  const totalTx1h = Math.max(1, h1.buy_count + h1.sell_count);
  const buySellImbalance = Number(((h1.buy_count - h1.sell_count) / totalTx1h).toFixed(4));

  const regimeMap: Record<MarketRegimeState['regime'], number> = {
    'Strong Meme Cycle': 1.0,
    'Risk-On': 0.75,
    'Transition/Uncertain': 0.5,
    'High Volatility': 0.4,
    'Low Liquidity': 0.25,
    'Weak Meme Cycle': 0.2,
    'Risk-Off': 0.1,
  };

  const freshnessScore = Math.max(0, Math.min(100, Math.round(100 - freshnessSeconds * 0.45)));

  const features: EngineeredFeatures = {
    feature_version: CURRENT_FEATURE_VERSION,
    computed_at_timestamp: predictionTimeIso,
    token_age_minutes: forensics.age_minutes,
    price_return_5m: forensics.price_change_5m,
    price_return_1h: forensics.price_change_1h,
    volatility_1h: chart.volatility_pct,
    volume_acceleration: volume.volume_acceleration_pct,
    buy_sell_imbalance: buySellImbalance,
    liquidity_change_1h: liquidity.liquidity_growth_1h_pct,
    liquidity_to_mc: liquidity.liquidity_to_mc_ratio,
    volume_to_liquidity: volume.volume_to_liquidity_ratio,
    holder_growth_1h: holders.holder_growth_1h_pct,
    top_10_concentration: holders.top_10_concentration_pct,
    sniper_pct: holders.sniper_analysis.supply_pct,
    insider_exposure: holders.insider_analysis.exposure_score,
    bundle_concentration: holders.bundle_analysis.combined_supply_pct,
    wallet_cluster_score: Math.min(100, holders.bundle_analysis.cluster_count * 24 + holders.bundle_analysis.combined_supply_pct),
    social_velocity: social.social_momentum_score,
    narrative_acceleration: social.narrative.social_acceleration_pct,
    market_regime_encoded: regimeMap[regime.regime] ?? 0.5,
    execution_quality: executionQuality,
    data_freshness_score: freshnessScore,
    paid_promotion_flag: social.paid_vs_organic.paid_boost_detected ? 1 : 0,
    leakage_verified: true,
  };

  const check = assertNoTemporalLeakage(predictionTimeIso, features as unknown as Record<string, unknown>);
  if (!check.valid) {
    throw new Error(check.violation);
  }

  return features;
}
