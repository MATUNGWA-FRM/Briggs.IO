export type ChainId = 'solana';

export type BriggMode = 'SHITCOIN' | 'MEMECOIN';

export const SHITCOIN_MAX_AGE_MINUTES = 3 * 24 * 60; // 4,320m = 3 days initial baseline
export const MEMECOIN_MIN_AGE_MINUTES = 30 * 24 * 60; // 43,200m = 1 month (30 days) baseline

export interface TokenClassClassification {
  classified_mode: BriggMode;
  initial_rule_class: 'SHITCOIN' | 'TRANSITION' | 'MEMECOIN';
  ml_shitcoin_prob_pct: number;
  ml_memecoin_prob_pct: number;
  age_minutes: number;
  age_days: number;
  matches_active_mode: boolean;
  classification_reason: string;
}

export type Horizon = '4M' | '15M' | '1H' | '4H' | '24H';

export type ChartTimeframe = '1S' | '1M' | '5M' | '15M' | '1H' | '4H' | '24H';

export type DataStatus =
  | 'REAL'
  | 'DERIVED'
  | 'ESTIMATED'
  | 'MODEL_PREDICTION'
  | 'UNAVAILABLE'
  | 'MOCK'
  | 'TEST';

export type ApprovedMarketProvider = 'dexscreener' | 'mevx' | 'gmgn' | 'padre';
export type ApprovedSocialProvider = 'x' | 'telegram' | 'reddit' | 'twitch';
export type ApprovedProvider = ApprovedMarketProvider | ApprovedSocialProvider;

export interface DataIntegrityMeta {
  source: ApprovedProvider | 'brigg_engine' | 'brigg_ml';
  source_timestamp: string;
  ingestion_timestamp: string;
  freshness_seconds: number;
  confidence: number; // 0..1
  data_status: DataStatus;
  notes?: string;
}

export interface DataPoint<T> extends DataIntegrityMeta {
  raw_value: unknown;
  normalized_value: T;
}

export type ActionState =
  | 'WATCH'
  | 'WAIT'
  | 'CONFIRMATION REQUIRED'
  | 'HIGH-RISK OPPORTUNITY'
  | 'NO-TRADE'
  | 'ANALYSIS ONLY';

export type MarketRegimeType =
  | 'Risk-On'
  | 'Risk-Off'
  | 'High Volatility'
  | 'Low Liquidity'
  | 'Strong Meme Cycle'
  | 'Weak Meme Cycle'
  | 'Transition/Uncertain';

export type WalletClassification =
  | 'Normal'
  | 'Sniper'
  | 'Insider'
  | 'Dev/Team'
  | 'Bundled'
  | 'Whale'
  | 'Stealth Whale'
  | 'Bot'
  | 'LP'
  | 'Exchange/Known'
  | 'Burn'
  | 'Unknown';

export type NarrativeStage =
  | 'Emerging'
  | 'Growing'
  | 'Mature'
  | 'Overextended'
  | 'Declining';

export type ModelStatus = 'PROMOTED' | 'REJECTED' | 'UNDER EVALUATION' | 'ROLLED BACK';

export interface ReasonItem {
  direction: '+' | '-' | '!' | '?';
  category: string;
  text: string;
  weight?: number;
}

export interface ProviderConflict {
  field: string;
  providers: Array<{
    provider: ApprovedProvider;
    value: string | number;
    timestamp: string;
    data_status: DataStatus;
  }>;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  resolution_note: string;
}

export interface TokenForensics {
  address: string;
  symbol: string;
  name: string;
  chain: ChainId;
  creator_deployer: string;
  creation_timestamp: string;
  age_minutes: number;
  token_type: string;
  launch_platform: string;
  deployment_platform: string;
  initial_liquidity_usd: number;
  current_liquidity_usd: number;
  liquidity_source: string;
  market_cap_usd: number;
  fdv_usd: number;
  price_usd: number;
  price_change_5m: number;
  price_change_1h: number;
  price_change_6h: number;
  price_change_24h: number;
  volume_24h_usd: number;
  trading_pairs: Array<{
    pair_address: string;
    dex: string;
    quote_symbol: string;
    liquidity_usd: number;
    volume_24h_usd: number;
  }>;
  primary_dex: string;
  migration_status: 'NOT_MIGRATED' | 'MIGRATING' | 'MIGRATED' | 'UNKNOWN';
  migration_history: Array<{
    timestamp: string;
    from_venue: string;
    to_venue: string;
    note: string;
  }>;
  current_trading_venue: string;
  website?: string;
  social_links: {
    x?: string;
    telegram?: string;
    reddit?: string;
    twitch?: string;
  };
  contract_attributes: {
    mint_authority_revoked: boolean | null;
    freeze_authority_revoked: boolean | null;
    mutable_metadata: boolean | null;
    sell_restriction_detected: boolean | null;
    transfer_fee_bps: number | null;
    data_status: DataStatus;
  };
  lifecycle_timeline: Array<{
    stage:
      | 'Token Created'
      | 'Liquidity Added'
      | 'First Buyers'
      | 'Early Buyers / Snipers'
      | 'Migration'
      | 'Initial Pump'
      | 'Distribution'
      | 'Current State';
    timestamp: string;
    summary: string;
    completed: boolean;
    data_status: DataStatus;
  }>;
  data_status: DataStatus;
}

export interface LiquidityIntelligence {
  current_liquidity_usd: number;
  historical_liquidity_1h_ago_usd: number;
  liquidity_growth_1h_pct: number;
  liquidity_change_during_pumps_pct: number;
  liquidity_change_during_dumps_pct: number;
  liquidity_to_mc_ratio: number;
  liquidity_to_volume_ratio: number;
  lp_status: 'BURNED' | 'LOCKED' | 'UNLOCKED' | 'PARTIAL' | 'UNKNOWN';
  lp_concentration_pct: number;
  estimated_exit_capacity_usd: number;
  liquidity_risk_score: number; // 0..100
  execution_quality_score: number; // 0..100
  data_quality_score: number; // 0..100
  reasons: ReasonItem[];
  data_status: DataStatus;
}

export interface VolumeWindowMetrics {
  timeframe: '1M' | '5M' | '15M' | '1H' | '4H' | '24H';
  total_volume_usd: number;
  buy_volume_usd: number;
  sell_volume_usd: number;
  buy_count: number;
  sell_count: number;
  buy_sell_ratio: number;
  unique_traders: number;
}

export interface VolumeIntelligence {
  windows: VolumeWindowMetrics[];
  reported_volume_24h_usd: number;
  estimated_organic_pct: number;
  possible_automated_pct: number;
  volume_acceleration_pct: number;
  volume_decay_pct: number;
  volume_to_mc_ratio: number;
  volume_to_liquidity_ratio: number;
  volume_per_holder_usd: number;
  price_volume_relationship:
    | 'Price UP + Volume UP (Momentum Confirmation)'
    | 'Price UP + Volume DOWN (Weakening Momentum)'
    | 'Price DOWN + Volume UP (Selling Pressure)'
    | 'Price DOWN + Volume DOWN (Slowing Selling)'
    | 'Range / Neutral';
  anomalies: {
    wash_trading_risk: 'LOW' | 'ELEVATED' | 'HIGH';
    bot_activity_score: number;
    abnormal_trade_frequency: boolean;
    repeated_trade_sizes_pct: number;
    unique_wallet_volume_divergence: number;
    evidence_note: string;
  };
  volume_quality_score: number; // 0..100
  confidence: number; // 0..1
  reasons: ReasonItem[];
  data_status: DataStatus;
}

export interface WalletNode {
  id: string;
  address: string;
  short_address: string;
  balance_tokens: number;
  balance_usd: number;
  supply_pct: number;
  classification: WalletClassification;
  classification_confidence: number;
  first_funding_timestamp: string;
  funding_source: string;
  first_purchase_timestamp: string;
  buy_count: number;
  sell_count: number;
  realized_pnl_usd: number;
  behavior: 'Accumulating' | 'Holding' | 'Distributing' | 'Unknown';
  risk_score: number;
  cluster_id?: string;
  cross_token_launches?: number;
  notes: string;
  data_status: DataStatus;
}

export interface WalletEdge {
  id: string;
  source: string;
  target: string;
  relationship: 'transfer' | 'funding' | 'acquisition' | 'detected_relationship';
  confidence: number; // 0..1
  weight_usd: number;
  timestamp: string;
  evidence: string;
}

export interface WalletCluster {
  cluster_id: string;
  wallet_count: number;
  wallet_addresses: string[];
  combined_supply_pct: number;
  relationship_confidence: number;
  funding_relationship: string;
  synchronized_window_sec: number;
  evidence: string;
}

export interface HolderIntelligence {
  holder_count: number;
  holder_growth_1h_pct: number;
  holder_growth_24h_pct: number;
  top_10_concentration_pct: number;
  top_20_concentration_pct: number;
  top_50_concentration_pct: number;
  largest_wallet_pct: number;
  sniper_analysis: {
    suspected_snipers: number;
    supply_pct: number;
    exposure_band: 'LOWER (<15%)' | 'ELEVATED (15-25%)' | 'HIGH (>25%)';
    avg_entry_delay_sec: number;
    exited_pct: number;
    behavior: 'Accumulating' | 'Holding' | 'Distributing' | 'Mixed';
    heuristic_note: string;
  };
  insider_analysis: {
    exposure_score: number; // 0..100
    suspected_wallets: number;
    supply_pct: number;
    behavior: 'Accumulating' | 'Holding' | 'Distributing' | 'Unknown';
    evidence: string[];
  };
  bundle_analysis: {
    cluster_count: number;
    combined_supply_pct: number;
    clusters: WalletCluster[];
  };
  red_flags: Array<{
    type:
      | 'Giant Holder'
      | 'Connected Cluster'
      | 'Circular Transfers'
      | 'Potential Wash Trading'
      | 'Stealth Whale'
      | 'Concentrated Supply'
      | 'Synchronized Behavior';
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    description: string;
  }>;
  wallets: WalletNode[];
  edges: WalletEdge[];
  distribution_health_score: number;
  data_status: DataStatus;
}

export interface CandlePoint {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  ema9?: number;
  ema21?: number;
  sma50?: number;
  vwap?: number;
  bbUpper?: number;
  bbMiddle?: number;
  bbLower?: number;
  rsi14?: number;
  macd?: number;
  macdSignal?: number;
  macdHist?: number;
  atr14?: number;
}

export interface ChartSniperSignal {
  id: string;
  time: number; // unix seconds matching candle bar
  price: number;
  kind: 'PUMP_ENTRY' | 'DUMP_EXIT' | 'SNIPER_IN' | 'SNIPER_OUT';
  label: string;
  confidence_pct: number; // 0..100
  reason: string;
}

export interface PumpDumpOutlook {
  bias: 'PUMP_LIKELY' | 'DUMP_RISK' | 'CHOP_NEUTRAL';
  pump_probability_pct: number;
  dump_probability_pct: number;
  sniper_entry_price: number;
  sniper_exit_price: number;
  dump_invalidation_price: number;
  headline: string;
}

export interface ChartIntelligence {
  timeframe: ChartTimeframe;
  candles: CandlePoint[];
  trend: 'UPTREND' | 'DOWNTREND' | 'SIDEWAYS';
  momentum_state: 'ACCELERATING' | 'STEADY' | 'WEAKENING' | 'REVERSING';
  volatility_pct: number;
  support_levels: number[];
  resistance_levels: number[];
  sniper_signals: ChartSniperSignal[];
  pump_dump_outlook: PumpDumpOutlook;
  breakout_sequence: {
    current_stage:
      | 'Quiet/Sideways'
      | 'Volume Expansion'
      | 'Potential Resistance Break'
      | 'Confirmation'
      | 'Liquidity Check'
      | 'Holder Check'
      | 'Wallet Check'
      | 'Social/Narrative Check'
      | 'Risk Check'
      | 'Action State';
    stages: Array<{
      name: string;
      status: 'PASSED' | 'ACTIVE' | 'PENDING' | 'FAILED';
      detail: string;
    }>;
  };
  probabilistic_zones: Array<{
    type: 'PUMP_ZONE' | 'DUMP_ZONE' | 'LIQUIDITY_ZONE';
    price_low: number;
    price_high: number;
    probability_pct: number;
    why_identified: string;
    supporting_data: string[];
    conflicting_evidence: string[];
    invalidation_conditions: string[];
  }>;
  data_status: DataStatus;
}

export interface SocialPlatformMetrics {
  platform: ApprovedSocialProvider;
  mentions: number;
  mention_velocity_1h: number;
  unique_accounts: number;
  engagement_total: number;
  engagement_velocity_1h: number;
  account_quality_score: number;
  bot_like_engagement_pct: number;
  repeated_content_pct: number;
  kol_concentration_pct: number;
  sentiment_score: number; // -1..1
  data_status: DataStatus;
  note?: string;
}

export interface SocialIntelligence {
  platforms: SocialPlatformMetrics[];
  social_momentum_score: number; // 0..100
  narrative_strength_score: number; // 0..100
  social_organicity_estimate_pct: number;
  community_activity_score: number; // 0..100
  social_risk_score: number; // 0..100
  narrative: {
    primary_theme: string;
    stage: NarrativeStage;
    virality_score: number;
    controversy_score: number;
    novelty_score: number;
    social_acceleration_pct: number;
    price_extension_note: string;
  };
  paid_vs_organic: {
    classification: 'ORGANIC_DOMINANT' | 'MIXED_PROMOTED' | 'PAID_BOOST_DETECTED' | 'INSUFFICIENT_DATA';
    paid_boost_detected: boolean;
    organic_discovery_pct: number;
    note: string; // Explicitly reflects: Paid != Unsafe, Organic != Safe
  };
  reasons: ReasonItem[];
  data_status: DataStatus;
}

export interface RiskEngineResult {
  liquidity_risk: number; // 0..100
  holder_risk: number; // 0..100
  dev_risk: number; // 0..100
  contract_risk: number; // 0..100
  bot_volume_risk: number; // 0..100
  social_risk: number; // 0..100
  overall_risk: number; // 0..100
  honeypot_flags: string[];
  rug_indicators: string[];
  reasons: ReasonItem[];
  safety_disclaimer: string;
}

export interface PreTradeChecklist {
  passed_count: number;
  total_count: number;
  critical_failure: boolean;
  items: Array<{
    id: string;
    label: string;
    passed: boolean;
    severity: 'CRITICAL' | 'STANDARD';
    observed_value: string;
    threshold: string;
    explanation: string;
  }>;
}

export interface SlippageExecutionEstimate {
  position_size_usd: number;
  expected_price_usd: number;
  estimated_executed_price_usd: number;
  price_impact_pct: number;
  slippage_pct: number; // (Expected Price - Executed Price) / Expected Price (positive = unfavorable execution cost on buy)
  sign_convention_note: string;
  priority_fee_sol: number;
  exit_liquidity_usd: number;
  execution_quality_score: number; // 0..100
  warning?: string;
}

export interface MarketRegimeState {
  regime: MarketRegimeType;
  confidence: number;
  sol_24h_change_pct: number;
  sol_volatility_pct: number;
  meme_sector_momentum: number; // 0..100
  market_breadth_pct: number;
  risk_appetite_score: number; // 0..100
  explanation: string;
  data_status: DataStatus;
}

export interface NoTradeEvaluation {
  triggered: boolean;
  headline: string;
  triggers: string[];
  reasons: string[];
}

export interface EngineeredFeatures {
  feature_version: string;
  computed_at_timestamp: string; // T boundary
  token_age_minutes: number;
  price_return_5m: number;
  price_return_1h: number;
  volatility_1h: number;
  volume_acceleration: number;
  buy_sell_imbalance: number;
  liquidity_change_1h: number;
  liquidity_to_mc: number;
  volume_to_liquidity: number;
  holder_growth_1h: number;
  top_10_concentration: number;
  sniper_pct: number;
  insider_exposure: number;
  bundle_concentration: number;
  wallet_cluster_score: number;
  social_velocity: number;
  narrative_acceleration: number;
  market_regime_encoded: number;
  execution_quality: number;
  data_freshness_score: number;
  paid_promotion_flag: number;
  leakage_verified: boolean;
}

export interface BriggScorePanelData {
  token_address: string;
  symbol: string;
  mode: BriggMode;
  horizon: Horizon;
  opportunity_score: number; // 0..100
  risk_score: number; // 0..100
  calibrated_probability: number | null; // null if model calibration validation threshold not met
  calibration_status: string;
  confidence_pct: number; // 0..100
  execution_quality: number; // 0..100
  market_regime: MarketRegimeType;
  action_state: ActionState;
  classification: TokenClassClassification;
  no_trade: NoTradeEvaluation;
  model_outputs: {
    momentum_score: number;
    liquidity_score: number;
    volume_score: number;
    wallet_score: number;
    risk_model_score: number;
    social_model_score: number;
    anomaly_score: number;
    model_version: string;
    feature_version: string;
  };
  explainability: {
    why_opportunity_exists: ReasonItem[];
    why_risk_elevated: ReasonItem[];
    invalidation_conditions: string[];
    missing_data: string[];
    conflicting_evidence: string[];
    machine_metadata: {
      deterministic_rules_weight: number;
      statistical_weight: number;
      ml_weight: number;
      strategy: 'BRIGG_MOMENTUM_LIQUIDITY_FLOW';
    };
  };
}

export interface PredictionRecord {
  id: string;
  token_address: string;
  symbol: string;
  mode: BriggMode;
  horizon: Horizon;
  prediction_label: ActionState;
  opportunity_score: number;
  risk_score: number;
  calibrated_probability: number | null;
  confidence_pct: number;
  action_state: ActionState;
  model_version: string;
  feature_version: string;
  prediction_timestamp: string;
  entry_price_usd: number;
  features_snapshot_json: string;
  outcome?: {
    actual_outcome: 'POSITIVE' | 'NEGATIVE' | 'FLAT' | 'STOPPED_OUT' | 'NO_TRADE_CORRECT' | 'PENDING';
    outcome_timestamp: string;
    return_pct: number;
    max_favorable_excursion_pct: number;
    max_adverse_excursion_pct: number;
    exit_condition: string;
    prediction_error: number;
    quality_note: string;
  };
}

export interface HumanOverrideRecord {
  id: string;
  token_address: string;
  symbol: string;
  model_state: ActionState;
  user_decision: 'MANUAL_WATCH' | 'MANUAL_SKIP' | 'MANUAL_FLAG_RUG' | 'OVERRIDE_NO_TRADE';
  reason: string;
  timestamp: string;
  actual_outcome?: string;
  excluded_from_auto_labels: true;
}

export interface ModelVersionRecord {
  version: string;
  training_date: string;
  dataset_version: string;
  feature_version: string;
  model_type: string;
  hyperparameters: Record<string, string | number>;
  training_period: string;
  validation_period: string;
  new_observations: number;
  training_samples: number;
  metrics: {
    precision: number;
    recall: number;
    f1: number;
    roc_auc: number;
    pr_auc: number;
    brier_score: number;
    calibration_error: number;
    false_positive_rate: number;
    expected_value_pct: number;
    win_rate_pct: number;
    avg_return_pct: number;
    max_drawdown_pct: number;
    profit_factor: number;
    sharpe_ratio: number;
  };
  backtest_summary: {
    label: 'BACKTEST';
    total_trades: number;
    win_rate_pct: number;
    expectancy_pct: number;
    max_drawdown_pct: number;
    profit_factor: number;
    disclaimer: string;
  };
  changes: string[];
  reason_for_change: string;
  decision: ModelStatus;
  is_production: boolean;
  feature_importance: Array<{ feature: string; importance: number }>;
}

export interface BacktestRequest {
  mode: BriggMode;
  horizon: Horizon;
  position_size_usd: number;
  min_opportunity_score: number;
  max_risk_score: number;
  slippage_bps: number;
  priority_fee_usd: number;
  min_liquidity_usd: number;
}

export interface BacktestResult {
  label: 'BACKTEST';
  disclaimer: string;
  config: BacktestRequest;
  trades_count: number;
  wins: number;
  losses: number;
  win_rate_pct: number;
  avg_trade_pct: number;
  max_drawdown_pct: number;
  profit_factor: number;
  expectancy_pct: number;
  sharpe_ratio: number;
  opportunity_count: number;
  missed_opportunities: number;
  false_positives: number;
  equity_curve: Array<{ timestamp: string; equity_usd: number; trade_return_pct: number; symbol: string }>;
  trades: Array<{
    symbol: string;
    token_address: string;
    entry_time: string;
    exit_time: string;
    opportunity_score: number;
    risk_score: number;
    gross_return_pct: number;
    slippage_cost_pct: number;
    net_return_pct: number;
    outcome: 'WIN' | 'LOSS';
  }>;
}

export interface ScannerTokenSummary {
  address: string;
  symbol: string;
  name: string;
  chain: ChainId;
  age_minutes: number;
  price_usd: number;
  price_change_5m: number;
  price_change_1h: number;
  market_cap_usd: number;
  liquidity_usd: number;
  volume_24h_usd: number;
  holder_count: number;
  top_10_pct: number;
  sniper_pct: number;
  insider_exposure: number;
  bundle_pct: number;
  migration_status: TokenForensics['migration_status'];
  social_momentum: number;
  holder_growth_1h_pct: number;
  opportunity_score: number;
  risk_score: number;
  confidence_pct: number;
  execution_quality: number;
  action_state: ActionState;
  classification: TokenClassClassification;
  ranking_explanation: string;
  has_source_conflict: boolean;
  data_status: DataStatus;
  freshness_seconds: number;
  active_providers: ApprovedProvider[];
}

export interface TokenFullAnalysis {
  forensics: TokenForensics;
  liquidity: LiquidityIntelligence;
  volume: VolumeIntelligence;
  holders: HolderIntelligence;
  chart: ChartIntelligence;
  social: SocialIntelligence;
  risk: RiskEngineResult;
  checklist: PreTradeChecklist;
  slippage: SlippageExecutionEstimate;
  regime: MarketRegimeState;
  features: EngineeredFeatures;
  score_panel: BriggScorePanelData;
  historical_predictions: PredictionRecord[];
  human_overrides: HumanOverrideRecord[];
  data_sources: DataIntegrityMeta[];
  conflicts: ProviderConflict[];
  freshness: {
    updated_seconds_ago: number;
    source_freshness_ms: number;
    ingestion_delay_ms: number;
    processing_delay_ms: number;
    total_analysis_latency_ms: number;
    is_stale: boolean;
    stale_warning?: string;
  };
}

export interface AlertRule {
  id: string;
  name: string;
  condition_type:
    | 'OPPORTUNITY_ABOVE'
    | 'RISK_BELOW'
    | 'VOLUME_ACCELERATION'
    | 'HOLDER_GROWTH'
    | 'SOCIAL_ACCELERATION'
    | 'LIQUIDITY_DECLINE'
    | 'INSIDER_SELLING'
    | 'BUNDLE_DETECTION'
    | 'SNIPER_INCREASE'
    | 'MARKET_REGIME_CHANGE'
    | 'SCANNER_ENTRY';
  threshold: number;
  channel_dashboard: boolean;
  channel_telegram: boolean;
  enabled: boolean;
  created_at: string;
}

export interface AlertEvent {
  id: string;
  rule_id: string;
  token_address: string;
  symbol: string;
  title: string;
  detail: string;
  severity: 'INFO' | 'WARNING' | 'HIGH_PRIORITY';
  timestamp: string;
  acknowledged: boolean;
  delivered_channels: string[];
}

export interface BriggFilterPreset {
  id: 'GENERAL' | 'SOON_PAIR' | 'MIGRATED_PAIR' | 'SCALPING_15M' | 'DEXSCREENER_MEME' | 'AXIOM_STYLE' | 'CUSTOM';
  label: string;
  hide_new_pairs: boolean;
  require_socials: boolean;
  require_x: boolean;
  min_liquidity_usd: number;
  min_mc_usd: number;
  max_mc_usd: number;
  min_age_minutes: number;
  max_age_minutes: number;
  min_volume_24h_usd: number;
  max_top10_pct: number;
  max_dev_pct: number;
  max_sniper_pct: number;
  max_insider_score: number;
  max_bundle_pct: number;
  migrated_only: boolean;
}

export interface SystemObservability {
  status: 'HEALTHY' | 'DEGRADED';
  uptime_seconds: number;
  database_status: 'CONNECTED' | 'ERROR';
  production_model_version: string;
  providers: Array<{
    provider: ApprovedProvider;
    category: 'MARKET' | 'SOCIAL';
    configured: boolean;
    mode: 'LIVE_API' | 'MOCK_FIXTURE' | 'UNAVAILABLE';
    last_latency_ms: number;
    success_rate_pct: number;
    last_error?: string;
  }>;
  pipeline_metrics: {
    avg_processing_latency_ms: number;
    total_analyses_run: number;
    predictions_recorded: number;
    outcomes_evaluated: number;
    no_trade_rate_pct: number;
  };
  recent_audit_logs: Array<{
    id: string;
    timestamp: string;
    action: string;
    actor: string;
    detail: string;
  }>;
}

export interface LiveTradeEvent {
  id: string;
  timestamp_ms: number;
  side: 'BUY' | 'SELL';
  price_usd: number;
  amount_usd: number;
  maker_short: string;
  source: 'LIVE_DEXSCREENER' | 'ESTIMATED_INTRABAR' | 'MOCK';
}

export interface SocialMentionEvent {
  id: string;
  platform: ApprovedSocialProvider;
  author: string;
  channel: string;
  text: string;
  sentiment: 'BULLISH' | 'NEUTRAL' | 'BEARISH';
  engagement: number;
  organicity: 'ORGANIC' | 'AUTOMATED_RISK';
  url?: string;
  timestamp_ms: number;
  data_status: DataStatus;
}

export interface LiveMarketTick {
  address: string;
  symbol: string;
  timeframe: ChartTimeframe;
  timestamp_ms: number;
  candle_time: number;
  price_usd: number;
  price_change_5m: number;
  price_change_1h: number;
  market_cap_usd: number;
  liquidity_usd: number;
  volume_24h_usd: number;
  buys_5m: number;
  sells_5m: number;
  bar_volume_delta: number;
  data_status: DataStatus;
  tick_source: 'LIVE_DEXSCREENER' | 'ESTIMATED_INTRABAR' | 'MOCK';
  trade?: LiveTradeEvent;
  social_event?: SocialMentionEvent;
}

