import type {
  ApprovedMarketProvider,
  ApprovedProvider,
  ApprovedSocialProvider,
  DataIntegrityMeta,
  DataStatus,
} from '../../shared/types.ts';
import { SERVER_CONFIG } from '../config.ts';
import { recordProviderCall } from '../security/observability.ts';

export interface NormalizedMarketPayload {
  provider: ApprovedMarketProvider;
  address: string;
  symbol: string;
  name: string;
  price_usd: number;
  market_cap_usd: number;
  fdv_usd: number;
  liquidity_usd: number;
  volume_5m_usd: number;
  volume_1h_usd: number;
  volume_6h_usd: number;
  volume_24h_usd: number;
  buys_5m: number;
  sells_5m: number;
  buys_1h: number;
  sells_1h: number;
  buys_24h: number;
  sells_24h: number;
  price_change_5m: number;
  price_change_1h: number;
  price_change_6h: number;
  price_change_24h: number;
  pair_created_at_ms: number;
  dex: string;
  pair_address: string;
  quote_symbol: string;
  pairs: Array<{
    pair_address: string;
    dex: string;
    quote_symbol: string;
    liquidity_usd: number;
    volume_24h_usd: number;
  }>;
  website?: string;
  socials: {
    x?: string;
    telegram?: string;
    reddit?: string;
    twitch?: string;
  };
  paid_boost_active: boolean;
  boost_amount: number;
  holder_count?: number;
  top_10_pct?: number;
  sniper_pct?: number;
  insider_pct?: number;
  bundle_pct?: number;
  dev_pct?: number;
  lp_burned_pct?: number;
  mint_revoked?: boolean;
  freeze_revoked?: boolean;
  meta: DataIntegrityMeta;
}

export interface NormalizedSocialPayload {
  provider: ApprovedSocialProvider;
  mentions: number;
  mention_velocity_1h: number;
  unique_accounts: number;
  engagement_total: number;
  engagement_velocity_1h: number;
  account_quality_score: number;
  bot_like_engagement_pct: number;
  repeated_content_pct: number;
  kol_concentration_pct: number;
  sentiment_score: number;
  meta: DataIntegrityMeta;
}

export function deterministicHash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function seededUnit(seed: string, offset = 0): number {
  const h = deterministicHash(`${seed}:${offset}`);
  return (h % 10000) / 10000;
}

export async function fetchJsonWithRetry<T>(
  provider: ApprovedProvider,
  url: string,
  options: RequestInit = {},
  mode: 'LIVE_API' | 'MOCK_FIXTURE' = 'LIVE_API'
): Promise<{ data: T | null; latencyMs: number; error?: string }> {
  const start = Date.now();
  let lastError = 'Unknown error';

  for (let attempt = 0; attempt <= SERVER_CONFIG.maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SERVER_CONFIG.requestTimeoutMs);
    try {
      const resp = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Brigg.AI-Terminal/1.0',
          ...(options.headers || {}),
        },
      });
      clearTimeout(timer);
      if (!resp.ok) {
        lastError = `HTTP ${resp.status}`;
        continue;
      }
      const json = (await resp.json()) as T;
      const latencyMs = Date.now() - start;
      recordProviderCall(provider, latencyMs, true, mode);
      return { data: json, latencyMs };
    } catch (err) {
      clearTimeout(timer);
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  const latencyMs = Date.now() - start;
  recordProviderCall(provider, latencyMs, false, 'UNAVAILABLE', lastError);
  return { data: null, latencyMs, error: lastError };
}

export function buildMeta(
  source: ApprovedProvider,
  data_status: DataStatus,
  sourceTimestampMs: number,
  confidence: number,
  notes?: string
): DataIntegrityMeta {
  const now = Date.now();
  const freshnessSeconds = Math.max(0, Math.round((now - sourceTimestampMs) / 1000));
  return {
    source,
    source_timestamp: new Date(sourceTimestampMs).toISOString(),
    ingestion_timestamp: new Date(now).toISOString(),
    freshness_seconds: freshnessSeconds,
    confidence: Math.max(0, Math.min(1, confidence)),
    data_status,
    notes,
  };
}
