import type { DataIntegrityMeta, DataStatus, ProviderConflict } from '../../shared/types.ts';
import type { NormalizedMarketPayload, NormalizedSocialPayload } from './base.ts';
import { fetchDexScreenerToken } from './dexscreener/adapter.ts';
import { fetchGmgnToken } from './gmgn/adapter.ts';
import { fetchMevXToken } from './mevx/adapter.ts';
import { fetchPadreToken } from './padre/adapter.ts';
import { fetchRedditSocial } from './reddit/adapter.ts';
import { fetchTelegramSocial } from './telegram/adapter.ts';
import { fetchTwitchSocial } from './twitch/adapter.ts';
import { fetchXSocial } from './x/adapter.ts';

export interface AggregatedTokenInputs {
  primaryMarket: NormalizedMarketPayload;
  marketFeeds: NormalizedMarketPayload[];
  socialFeeds: NormalizedSocialPayload[];
  conflicts: ProviderConflict[];
  allMeta: DataIntegrityMeta[];
  overallStatus: DataStatus;
  avgFreshnessSeconds: number;
  ingestionDelayMs: number;
}

export async function aggregateTokenSources(address: string): Promise<AggregatedTokenInputs> {
  const start = Date.now();
  const dex = await fetchDexScreenerToken(address);

  const [mevx, gmgn, padre, xSocial, tgSocial, redditSocial, twitchSocial] = await Promise.all([
    fetchMevXToken(address, dex),
    fetchGmgnToken(address, dex),
    fetchPadreToken(address, dex),
    fetchXSocial(address, dex.symbol, Boolean(dex.socials.x)),
    fetchTelegramSocial(address, dex.symbol, Boolean(dex.socials.telegram)),
    fetchRedditSocial(address, dex.symbol),
    fetchTwitchSocial(address, dex.symbol),
  ]);

  const marketFeeds = [dex, mevx, gmgn, padre];
  const socialFeeds = [xSocial, tgSocial, redditSocial, twitchSocial];
  const allMeta: DataIntegrityMeta[] = [
    ...marketFeeds.map((m) => m.meta),
    ...socialFeeds.map((s) => s.meta),
  ];

  // Detect disagreements across market providers (§5 Data Integrity)
  const conflicts: ProviderConflict[] = [];
  const volumes = marketFeeds.map((m) => m.volume_24h_usd);
  const maxVol = Math.max(...volumes);
  const minVol = Math.min(...volumes);
  if (maxVol > 0 && (maxVol - minVol) / maxVol > 0.12) {
    conflicts.push({
      field: 'volume_24h_usd',
      providers: marketFeeds.map((m) => ({
        provider: m.provider,
        value: Math.round(m.volume_24h_usd),
        timestamp: m.meta.source_timestamp,
        data_status: m.meta.data_status,
      })),
      severity: (maxVol - minVol) / maxVol > 0.25 ? 'HIGH' : 'MEDIUM',
      resolution_note: 'Prioritized primary REAL DexScreener volume; reduced analytical confidence.',
    });
  }

  const prices = marketFeeds.map((m) => m.price_usd).filter((p) => p > 0);
  if (prices.length >= 2) {
    const maxP = Math.max(...prices);
    const minP = Math.min(...prices);
    if ((maxP - minP) / maxP > 0.02) {
      conflicts.push({
        field: 'price_usd',
        providers: marketFeeds.map((m) => ({
          provider: m.provider,
          value: Number(m.price_usd.toPrecision(6)),
          timestamp: m.meta.source_timestamp,
          data_status: m.meta.data_status,
        })),
        severity: (maxP - minP) / maxP > 0.05 ? 'HIGH' : 'LOW',
        resolution_note: 'Price spread across venues detected; execution slippage buffer applied.',
      });
    }
  }

  const avgFreshnessSeconds = Math.round(
    allMeta.reduce((acc, m) => acc + m.freshness_seconds, 0) / allMeta.length
  );

  // Merge enriched telemetry onto primaryMarket while preserving original REAL status when DexScreener is live
  const primaryMarket: NormalizedMarketPayload = {
    ...dex,
    holder_count: gmgn.holder_count,
    top_10_pct: gmgn.top_10_pct,
    insider_pct: gmgn.insider_pct,
    dev_pct: gmgn.dev_pct,
    mint_revoked: gmgn.mint_revoked,
    freeze_revoked: gmgn.freeze_revoked,
    sniper_pct: mevx.sniper_pct,
    bundle_pct: mevx.bundle_pct,
    lp_burned_pct: mevx.lp_burned_pct,
  };

  const overallStatus: DataStatus = dex.meta.data_status === 'REAL' ? 'REAL' : 'MOCK';

  return {
    primaryMarket,
    marketFeeds,
    socialFeeds,
    conflicts,
    allMeta,
    overallStatus,
    avgFreshnessSeconds,
    ingestionDelayMs: Date.now() - start,
  };
}
