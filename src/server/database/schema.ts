export const BRIGG_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS chains (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  native_symbol TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS tokens (
  address TEXT PRIMARY KEY,
  chain_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  creator_deployer TEXT,
  creation_timestamp TEXT,
  launch_platform TEXT,
  migration_status TEXT,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (chain_id) REFERENCES chains(id)
);

CREATE TABLE IF NOT EXISTS token_pairs (
  pair_address TEXT PRIMARY KEY,
  token_address TEXT NOT NULL,
  dex TEXT NOT NULL,
  quote_symbol TEXT NOT NULL,
  liquidity_usd REAL NOT NULL,
  volume_24h_usd REAL NOT NULL,
  price_usd REAL NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS price_candles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token_address TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  timestamp_sec INTEGER NOT NULL,
  open REAL NOT NULL,
  high REAL NOT NULL,
  low REAL NOT NULL,
  close REAL NOT NULL,
  volume REAL NOT NULL,
  UNIQUE(token_address, timeframe, timestamp_sec)
);
CREATE INDEX IF NOT EXISTS idx_candles_lookup ON price_candles(token_address, timeframe, timestamp_sec);

CREATE TABLE IF NOT EXISTS liquidity_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token_address TEXT NOT NULL,
  event_type TEXT NOT NULL,
  amount_usd REAL NOT NULL,
  lp_status TEXT NOT NULL,
  timestamp TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  token_address TEXT NOT NULL,
  tx_type TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  amount_usd REAL NOT NULL,
  timestamp TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS trades (
  id TEXT PRIMARY KEY,
  token_address TEXT NOT NULL,
  side TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  amount_usd REAL NOT NULL,
  price_usd REAL NOT NULL,
  timestamp TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS wallets (
  address TEXT PRIMARY KEY,
  first_seen_at TEXT NOT NULL,
  funding_source TEXT,
  cross_token_launches INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS holders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token_address TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  balance_tokens REAL NOT NULL,
  supply_pct REAL NOT NULL,
  classification TEXT NOT NULL,
  snapshot_timestamp TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_holders_token ON holders(token_address, snapshot_timestamp);

CREATE TABLE IF NOT EXISTS wallet_relationships (
  id TEXT PRIMARY KEY,
  token_address TEXT NOT NULL,
  source_wallet TEXT NOT NULL,
  target_wallet TEXT NOT NULL,
  relationship TEXT NOT NULL,
  confidence REAL NOT NULL,
  weight_usd REAL NOT NULL,
  timestamp TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS wallet_clusters (
  cluster_id TEXT PRIMARY KEY,
  token_address TEXT NOT NULL,
  wallet_count INTEGER NOT NULL,
  combined_supply_pct REAL NOT NULL,
  confidence REAL NOT NULL,
  evidence TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS snipers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token_address TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  entry_delay_sec INTEGER NOT NULL,
  supply_pct REAL NOT NULL,
  exited INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS insiders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token_address TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  supply_pct REAL NOT NULL,
  behavior TEXT NOT NULL,
  evidence TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bundles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token_address TEXT NOT NULL,
  cluster_id TEXT NOT NULL,
  combined_supply_pct REAL NOT NULL,
  synchronized_window_sec INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS social_accounts (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL,
  handle TEXT NOT NULL,
  quality_score REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS social_posts (
  id TEXT PRIMARY KEY,
  token_address TEXT NOT NULL,
  platform TEXT NOT NULL,
  author_id TEXT,
  sentiment REAL NOT NULL,
  engagement INTEGER NOT NULL,
  timestamp TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS social_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token_address TEXT NOT NULL,
  platform TEXT NOT NULL,
  mentions INTEGER NOT NULL,
  organicity_pct REAL NOT NULL,
  timestamp TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sentiment_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token_address TEXT NOT NULL,
  sentiment_score REAL NOT NULL,
  controversy_score REAL NOT NULL,
  timestamp TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS narratives (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token_address TEXT NOT NULL,
  theme TEXT NOT NULL,
  stage TEXT NOT NULL,
  virality_score REAL NOT NULL,
  timestamp TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS market_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token_address TEXT NOT NULL,
  price_usd REAL NOT NULL,
  liquidity_usd REAL NOT NULL,
  volume_24h_usd REAL NOT NULL,
  market_cap_usd REAL NOT NULL,
  snapshot_timestamp TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS market_regimes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  regime TEXT NOT NULL,
  confidence REAL NOT NULL,
  sol_24h_change_pct REAL NOT NULL,
  timestamp TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS risk_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token_address TEXT NOT NULL,
  overall_risk REAL NOT NULL,
  liquidity_risk REAL NOT NULL,
  holder_risk REAL NOT NULL,
  contract_risk REAL NOT NULL,
  timestamp TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS predictions (
  id TEXT PRIMARY KEY,
  token_address TEXT NOT NULL,
  symbol TEXT NOT NULL,
  mode TEXT NOT NULL,
  horizon TEXT NOT NULL,
  prediction_label TEXT NOT NULL,
  opportunity_score REAL NOT NULL,
  risk_score REAL NOT NULL,
  calibrated_probability REAL,
  confidence_pct REAL NOT NULL,
  action_state TEXT NOT NULL,
  model_version TEXT NOT NULL,
  feature_version TEXT NOT NULL,
  prediction_timestamp TEXT NOT NULL,
  entry_price_usd REAL NOT NULL,
  features_snapshot_json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_predictions_token ON predictions(token_address, prediction_timestamp DESC);

CREATE TABLE IF NOT EXISTS prediction_outcomes (
  prediction_id TEXT PRIMARY KEY,
  actual_outcome TEXT NOT NULL,
  outcome_timestamp TEXT NOT NULL,
  return_pct REAL NOT NULL,
  max_favorable_excursion_pct REAL NOT NULL,
  max_adverse_excursion_pct REAL NOT NULL,
  exit_condition TEXT NOT NULL,
  prediction_error REAL NOT NULL,
  quality_note TEXT NOT NULL,
  FOREIGN KEY (prediction_id) REFERENCES predictions(id)
);

CREATE TABLE IF NOT EXISTS human_overrides (
  id TEXT PRIMARY KEY,
  token_address TEXT NOT NULL,
  symbol TEXT NOT NULL,
  model_state TEXT NOT NULL,
  user_decision TEXT NOT NULL,
  reason TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  actual_outcome TEXT
);

CREATE TABLE IF NOT EXISTS model_versions (
  version TEXT PRIMARY KEY,
  training_date TEXT NOT NULL,
  dataset_version TEXT NOT NULL,
  feature_version TEXT NOT NULL,
  model_type TEXT NOT NULL,
  hyperparameters_json TEXT NOT NULL,
  training_period TEXT NOT NULL,
  validation_period TEXT NOT NULL,
  new_observations INTEGER NOT NULL,
  training_samples INTEGER NOT NULL,
  metrics_json TEXT NOT NULL,
  backtest_summary_json TEXT NOT NULL,
  changes_json TEXT NOT NULL,
  reason_for_change TEXT NOT NULL,
  decision TEXT NOT NULL,
  is_production INTEGER NOT NULL DEFAULT 0,
  feature_importance_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS model_evaluations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  model_version TEXT NOT NULL,
  evaluation_type TEXT NOT NULL,
  metrics_json TEXT NOT NULL,
  passed INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS data_sources (
  provider TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  last_status TEXT NOT NULL,
  last_latency_ms INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS data_quality_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token_address TEXT NOT NULL,
  provider TEXT NOT NULL,
  data_status TEXT NOT NULL,
  conflict_detected INTEGER NOT NULL DEFAULT 0,
  detail TEXT NOT NULL,
  timestamp TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS alert_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  condition_type TEXT NOT NULL,
  threshold REAL NOT NULL,
  channel_dashboard INTEGER NOT NULL DEFAULT 1,
  channel_telegram INTEGER NOT NULL DEFAULT 0,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY,
  rule_id TEXT NOT NULL,
  token_address TEXT NOT NULL,
  symbol TEXT NOT NULL,
  title TEXT NOT NULL,
  detail TEXT NOT NULL,
  severity TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  acknowledged INTEGER NOT NULL DEFAULT 0,
  delivered_channels_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_preferences (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  action TEXT NOT NULL,
  actor TEXT NOT NULL,
  detail TEXT NOT NULL
);
`;
