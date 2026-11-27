import type {
  BriggMode,
  ChartIntelligence,
  HolderIntelligence,
  LiquidityIntelligence,
  PreTradeChecklist,
  SlippageExecutionEstimate,
  SocialIntelligence,
  TokenForensics,
  VolumeIntelligence,
} from '../../shared/types.ts';

export function runAutomatedChecklist(params: {
  mode: BriggMode;
  forensics: TokenForensics;
  liquidity: LiquidityIntelligence;
  volume: VolumeIntelligence;
  holders: HolderIntelligence;
  chart: ChartIntelligence;
  social: SocialIntelligence;
}): PreTradeChecklist {
  const { mode, forensics, liquidity, volume, holders, chart, social } = params;
  const h1 = volume.windows.find((w) => w.timeframe === '1H') || volume.windows[0];
  const devPct = holders.wallets.find((w) => w.classification === 'Dev/Team')?.supply_pct || 0;

  const items: PreTradeChecklist['items'] = [
    {
      id: 'buy_vs_sell',
      label: '1. Buy vs Sell Flow',
      passed: h1.buy_sell_ratio >= 1.05,
      severity: 'STANDARD',
      observed_value: `${h1.buy_sell_ratio.toFixed(2)}x (${h1.buy_count}B / ${h1.sell_count}S)`,
      threshold: '>= 1.05x 1H buy/sell ratio',
      explanation: h1.buy_sell_ratio >= 1.05 ? 'Net buy order flow active' : 'Sellers match or exceed buyers',
    },
    {
      id: 'holder_growth',
      label: '2. Holder Growth',
      passed: holders.holder_growth_1h_pct > 0,
      severity: 'STANDARD',
      observed_value: `${holders.holder_growth_1h_pct >= 0 ? '+' : ''}${holders.holder_growth_1h_pct}% (1H)`,
      threshold: '> 0% 1H growth',
      explanation: holders.holder_growth_1h_pct > 0 ? 'Unique holder base expanding' : 'Holder count stagnant or contracting',
    },
    {
      id: 'sniper_pct',
      label: '3. Sniper Exposure',
      passed: holders.sniper_analysis.supply_pct <= 25,
      severity: 'STANDARD',
      observed_value: `${holders.sniper_analysis.supply_pct.toFixed(1)}%`,
      threshold: '<= 25% initial heuristic',
      explanation:
        holders.sniper_analysis.supply_pct <= 25
          ? 'Sniper supply within manageable band'
          : 'High sniper overhang (>25%)',
    },
    {
      id: 'wallet_concentration',
      label: '4. Wallet Concentration',
      passed: holders.top_10_concentration_pct <= 30,
      severity: 'CRITICAL',
      observed_value: `${holders.top_10_concentration_pct.toFixed(1)}% Top 10`,
      threshold: '<= 30% Top 10',
      explanation:
        holders.top_10_concentration_pct <= 30
          ? 'Top-10 concentration within tolerance'
          : 'Elevated whale/cluster concentration risk',
    },
    {
      id: 'liquidity',
      label: '5. Liquidity Depth',
      passed: liquidity.current_liquidity_usd >= (mode === 'MEMECOIN' ? 50_000 : 12_000),
      severity: 'CRITICAL',
      observed_value: `$${Math.round(liquidity.current_liquidity_usd).toLocaleString()}`,
      threshold: mode === 'MEMECOIN' ? '>= $50,000' : '>= $12,000',
      explanation:
        liquidity.current_liquidity_usd >= 12_000 ? 'Sufficient baseline pool depth' : 'Insufficient liquidity for clean exit',
    },
    {
      id: 'chart_structure',
      label: '6. Chart Structure',
      passed: chart.trend !== 'DOWNTREND' && chart.momentum_state !== 'REVERSING',
      severity: 'STANDARD',
      observed_value: `${chart.trend} · ${chart.momentum_state}`,
      threshold: 'Non-downtrend structure',
      explanation: 'Evaluated from EMA9/21, VWAP, and RSI14 alignment',
    },
    {
      id: 'volume',
      label: '7. Volume Quality & Activity',
      passed: volume.volume_quality_score >= 45 && volume.reported_volume_24h_usd >= 20_000,
      severity: 'STANDARD',
      observed_value: `Q:${volume.volume_quality_score}/100 · $${Math.round(volume.reported_volume_24h_usd).toLocaleString()}`,
      threshold: 'Quality >= 45 & 24H >= $20k',
      explanation: `Estimated ~${volume.estimated_organic_pct}% organic volume`,
    },
    {
      id: 'token_age',
      label: '8. Token Age Alignment',
      passed: mode === 'SHITCOIN' ? forensics.age_minutes >= 5 : forensics.age_minutes >= 180,
      severity: 'STANDARD',
      observed_value:
        forensics.age_minutes < 120
          ? `${forensics.age_minutes}m`
          : `${(forensics.age_minutes / 60).toFixed(1)}h`,
      threshold: mode === 'SHITCOIN' ? '>= 5m' : '>= 3h (Memecoin Mode)',
      explanation: 'Age compatibility for selected Brigg analytical mode',
    },
    {
      id: 'paid_vs_organic',
      label: '9. Paid vs Organic Context',
      passed: social.social_organicity_estimate_pct >= 40,
      severity: 'STANDARD',
      observed_value: `${social.paid_vs_organic.classification} (${social.social_organicity_estimate_pct}% org)`,
      threshold: '>= 40% organic estimate (Paid ≠ Unsafe)',
      explanation: social.paid_vs_organic.note,
    },
    {
      id: 'dev_behavior',
      label: '10. Dev & Contract Behavior',
      passed:
        devPct <= 15 &&
        !forensics.contract_attributes.sell_restriction_detected &&
        forensics.contract_attributes.mint_authority_revoked !== false,
      severity: 'CRITICAL',
      observed_value: `Dev ${devPct.toFixed(1)}% · Mint ${
        forensics.contract_attributes.mint_authority_revoked ? 'Revoked' : 'Unverified/Active'
      }`,
      threshold: 'Dev <= 15% & no sell/mint flags',
      explanation: 'Checks deployer retention and token authority restrictions',
    },
  ];

  const passedCount = items.filter((i) => i.passed).length;
  const criticalFailure = items.some((i) => i.severity === 'CRITICAL' && !i.passed);

  return {
    passed_count: passedCount,
    total_count: items.length,
    critical_failure: criticalFailure,
    items,
  };
}

export function estimateSlippageAndExecution(params: {
  priceUsd: number;
  liquidityUsd: number;
  positionSizeUsd: number;
  executionQualityBase: number;
}): SlippageExecutionEstimate {
  const { priceUsd, liquidityUsd, positionSizeUsd, executionQualityBase } = params;
  const safePrice = Math.max(1e-9, priceUsd);
  const safeLiq = Math.max(500, liquidityUsd);

  // Constant-product AMM price impact approximation: impact ≈ tradeSize / (0.5 * liquidity + tradeSize)
  const halfPool = safeLiq * 0.5;
  const impactFraction = positionSizeUsd / (halfPool + positionSizeUsd);
  const priceImpactPct = Number((impactFraction * 100).toFixed(2));

  // Executed price on a buy is worse (higher) than expected spot price;
  // Using spec formula: (Expected Price - Executed Price) / Expected Price
  // Negative result indicates unfavorable execution cost above Expected Price.
  const executedPrice = safePrice * (1 + impactFraction * 1.15);
  const rawSlippageRatio = (safePrice - executedPrice) / safePrice;
  const slippagePct = Number((rawSlippageRatio * 100).toFixed(2));

  const sizePenalty = Math.min(45, Math.round(priceImpactPct * 4.5));
  const finalExecScore = Math.max(5, Math.min(98, executionQualityBase - sizePenalty));

  return {
    position_size_usd: positionSizeUsd,
    expected_price_usd: safePrice,
    estimated_executed_price_usd: Number(executedPrice.toPrecision(6)),
    price_impact_pct: priceImpactPct,
    slippage_pct: slippagePct,
    sign_convention_note:
      'Formula: (Expected Price - Executed Price) / Expected Price. Negative % on buys denotes execution above spot.',
    priority_fee_sol: priceImpactPct > 2 ? 0.0025 : 0.0008,
    exit_liquidity_usd: Math.round(safeLiq * 0.048),
    execution_quality_score: finalExecScore,
    warning:
      priceImpactPct > 4
        ? `High price impact (${priceImpactPct}%) for $${positionSizeUsd.toLocaleString()} position relative to pool depth.`
        : undefined,
  };
}
