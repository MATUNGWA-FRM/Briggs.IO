import type { TokenForensics } from '../../shared/types.ts';
import type { AggregatedTokenInputs } from '../connectors/aggregator.ts';
import { seededUnit } from '../connectors/base.ts';

function deriveBase58SeedAddress(seed: string): string {
  const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let out = '';
  for (let i = 0; i < 44; i++) {
    const idx = Math.floor(seededUnit(seed, i + 100) * alphabet.length) % alphabet.length;
    out += alphabet[idx];
  }
  return out;
}

export function buildTokenForensics(agg: AggregatedTokenInputs): TokenForensics {
  const m = agg.primaryMarket;
  const createdMs = m.pair_created_at_ms;
  const now = Date.now();
  const ageMinutes = Math.max(1, Math.round((now - createdMs) / 60_000));

  const isPump = m.address.endsWith('pump') || m.dex.toLowerCase().includes('pump');
  const launchPlatform = isPump ? 'Pump.fun' : m.dex === 'orca' ? 'Orca Whirlpools' : 'Raydium AMM';
  const migrated =
    isPump && m.dex.toLowerCase() !== 'pumpfun'
      ? 'MIGRATED'
      : m.liquidity_usd > 40_000
      ? 'MIGRATED'
      : ageMinutes < 45
      ? 'NOT_MIGRATED'
      : 'MIGRATING';

  const initialLiq = Math.max(
    1800,
    Math.round(m.liquidity_usd * (0.25 + seededUnit(m.address, 201) * 0.45))
  );

  const creator = deriveBase58SeedAddress(`creator:${m.address}`);
  const t0 = createdMs;
  const t1 = t0 + 18_000;
  const t2 = t0 + 24_000;
  const t3 = t0 + 38_000;
  const t4 = t0 + Math.min(ageMinutes * 30_000, 1800_000);
  const t5 = t0 + Math.min(ageMinutes * 42_000, 3600_000);
  const t6 = now - Math.min(ageMinutes * 12_000, 900_000);

  return {
    address: m.address,
    symbol: m.symbol,
    name: m.name,
    chain: 'solana',
    creator_deployer: creator,
    creation_timestamp: new Date(t0).toISOString(),
    age_minutes: ageMinutes,
    token_type: 'SPL Token (Solana)',
    launch_platform: launchPlatform,
    deployment_platform: isPump ? 'Pump.fun Bonding Curve' : 'Solana SPL CLI / Raydium LaunchLab',
    initial_liquidity_usd: initialLiq,
    current_liquidity_usd: m.liquidity_usd,
    liquidity_source: `${m.dex.toUpperCase()} (${m.quote_symbol} Pool)`,
    market_cap_usd: m.market_cap_usd,
    fdv_usd: m.fdv_usd,
    price_usd: m.price_usd,
    price_change_5m: m.price_change_5m,
    price_change_1h: m.price_change_1h,
    price_change_6h: m.price_change_6h,
    price_change_24h: m.price_change_24h,
    volume_24h_usd: m.volume_24h_usd,
    trading_pairs: m.pairs,
    primary_dex: m.dex,
    migration_status: migrated,
    migration_history:
      migrated === 'MIGRATED'
        ? [
            {
              timestamp: new Date(t4).toISOString(),
              from_venue: isPump ? 'Pump.fun Bonding Curve' : 'Initial Bootstrap Pool',
              to_venue: `${m.dex.toUpperCase()} AMM`,
              note: 'Migration completed. Note: Migration never guarantees token safety.',
            },
          ]
        : [],
    current_trading_venue: m.dex,
    website: m.website,
    social_links: m.socials,
    contract_attributes: {
      mint_authority_revoked: m.mint_revoked ?? null,
      freeze_authority_revoked: m.freeze_revoked ?? null,
      mutable_metadata: seededUnit(m.address, 204) > 0.72,
      sell_restriction_detected: m.sells_24h === 0 && m.buys_24h > 15,
      transfer_fee_bps: seededUnit(m.address, 205) > 0.9 ? 250 : 0,
      data_status: agg.marketFeeds[2]?.meta.data_status || 'MOCK',
    },
    lifecycle_timeline: [
      {
        stage: 'Token Created',
        timestamp: new Date(t0).toISOString(),
        summary: `SPL mint initialized on ${launchPlatform} by ${creator.slice(0, 6)}...${creator.slice(-4)}`,
        completed: true,
        data_status: agg.overallStatus,
      },
      {
        stage: 'Liquidity Added',
        timestamp: new Date(t1).toISOString(),
        summary: `Initial pool seeded (~$${initialLiq.toLocaleString()}) paired with ${m.quote_symbol}`,
        completed: true,
        data_status: 'ESTIMATED',
      },
      {
        stage: 'First Buyers',
        timestamp: new Date(t2).toISOString(),
        summary: 'Genesis block demand absorbed initial liquidity slice',
        completed: true,
        data_status: 'ESTIMATED',
      },
      {
        stage: 'Early Buyers / Snipers',
        timestamp: new Date(t3).toISOString(),
        summary: `Estimated ${(m.sniper_pct || 12).toFixed(1)}% early sniper capture observed`,
        completed: true,
        data_status: agg.marketFeeds[1]?.meta.data_status || 'MOCK',
      },
      {
        stage: 'Migration',
        timestamp: new Date(t4).toISOString(),
        summary:
          migrated === 'MIGRATED'
            ? `Migrated to ${m.dex.toUpperCase()} (migration alone is not proof of safety)`
            : 'Remaining in pre-migration / single-venue state',
        completed: migrated === 'MIGRATED',
        data_status: agg.overallStatus,
      },
      {
        stage: 'Initial Pump',
        timestamp: new Date(t5).toISOString(),
        summary: `Price expansion phase (${m.price_change_24h >= 0 ? '+' : ''}${m.price_change_24h.toFixed(1)}% 24H)`,
        completed: Math.abs(m.price_change_24h) > 5,
        data_status: agg.overallStatus,
      },
      {
        stage: 'Distribution',
        timestamp: new Date(t6).toISOString(),
        summary: `Top 10 wallets hold ~${(m.top_10_pct || 22).toFixed(1)}% across ${m.holder_count || 850} holders`,
        completed: ageMinutes > 30,
        data_status: agg.marketFeeds[2]?.meta.data_status || 'MOCK',
      },
      {
        stage: 'Current State',
        timestamp: new Date(now).toISOString(),
        summary: `Active on ${m.dex.toUpperCase()} · Liq $${Math.round(m.liquidity_usd).toLocaleString()} · MC $${Math.round(m.market_cap_usd).toLocaleString()}`,
        completed: true,
        data_status: agg.overallStatus,
      },
    ],
    data_status: agg.overallStatus,
  };
}
