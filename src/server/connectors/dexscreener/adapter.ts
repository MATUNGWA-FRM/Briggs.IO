import { SERVER_CONFIG } from '../../config.ts';
import { recordProviderCall } from '../../security/observability.ts';
import { buildMeta, fetchJsonWithRetry, type NormalizedMarketPayload } from '../base.ts';

interface DexScreenerPair {
  chainId?: string;
  dexId?: string;
  pairAddress?: string;
  baseToken?: { address?: string; name?: string; symbol?: string };
  quoteToken?: { address?: string; name?: string; symbol?: string };
  priceUsd?: string;
  txns?: {
    m5?: { buys?: number; sells?: number };
    h1?: { buys?: number; sells?: number };
    h6?: { buys?: number; sells?: number };
    h24?: { buys?: number; sells?: number };
  };
  volume?: { m5?: number; h1?: number; h6?: number; h24?: number };
  priceChange?: { m5?: number; h1?: number; h6?: number; h24?: number };
  liquidity?: { usd?: number };
  fdv?: number;
  marketCap?: number;
  pairCreatedAt?: number;
  info?: {
    websites?: Array<{ url?: string }>;
    socials?: Array<{ type?: string; url?: string }>;
  };
  boosts?: { active?: number };
}

interface DexScreenerTokensResponse {
  pairs?: DexScreenerPair[];
}

interface DexScreenerBoostItem {
  chainId?: string;
  tokenAddress?: string;
  amount?: number;
  totalAmount?: number;
  description?: string;
}

const cache = new Map<string, { expiresAt: number; payload: NormalizedMarketPayload }>();
const searchCache = new Map<string, { expiresAt: number; tokens: NormalizedMarketPayload[] }>();

// Well-known real Solana tokens used as discovery seeds alongside live DexScreener boosted tokens
export const SOLANA_DISCOVERY_SEEDS = [
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // BONK
  'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm', // WIF
  '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr', // POPCAT
  'HeLp6NuQkmYB4pYWo2zYs22mESHXPQYzXbB8n4V98jwC', // ai16z
  'CzLSujWBLFsSjncfkh59rUFqvafWcY5tzedWJSuypump', // GOAT
  'ED5nyyWEzpPPiWimP8vYm7sD7TD3LAt3Q3gRTWHzPJBY', // MOODENG
  '9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump', // FARTCOIN
  'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', // JUP
];

function mapPairsToNormalized(
  tokenAddress: string,
  pairs: DexScreenerPair[],
  boostAmount = 0
): NormalizedMarketPayload | null {
  const solPairs = pairs
    .filter((p) => p.chainId === 'solana' && p.baseToken?.address)
    .sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));

  if (solPairs.length === 0) return null;
  const top = solPairs[0];
  const now = Date.now();

  const socials: NormalizedMarketPayload['socials'] = {};
  for (const s of top.info?.socials || []) {
    const t = (s.type || '').toLowerCase();
    if (t === 'twitter' || t === 'x') socials.x = s.url;
    else if (t === 'telegram') socials.telegram = s.url;
    else if (t === 'reddit') socials.reddit = s.url;
    else if (t === 'twitch') socials.twitch = s.url;
  }

  const activeBoosts = (top.boosts?.active || 0) + boostAmount;

  return {
    provider: 'dexscreener',
    address: top.baseToken?.address || tokenAddress,
    symbol: top.baseToken?.symbol || 'UNKNOWN',
    name: top.baseToken?.name || top.baseToken?.symbol || 'Unknown Solana Token',
    price_usd: Number(top.priceUsd || 0),
    market_cap_usd: Number(top.marketCap || top.fdv || 0),
    fdv_usd: Number(top.fdv || top.marketCap || 0),
    liquidity_usd: Number(top.liquidity?.usd || 0),
    volume_5m_usd: Number(top.volume?.m5 || 0),
    volume_1h_usd: Number(top.volume?.h1 || 0),
    volume_6h_usd: Number(top.volume?.h6 || 0),
    volume_24h_usd: Number(top.volume?.h24 || 0),
    buys_5m: Number(top.txns?.m5?.buys || 0),
    sells_5m: Number(top.txns?.m5?.sells || 0),
    buys_1h: Number(top.txns?.h1?.buys || 0),
    sells_1h: Number(top.txns?.h1?.sells || 0),
    buys_24h: Number(top.txns?.h24?.buys || 0),
    sells_24h: Number(top.txns?.h24?.sells || 0),
    price_change_5m: Number(top.priceChange?.m5 || 0),
    price_change_1h: Number(top.priceChange?.h1 || 0),
    price_change_6h: Number(top.priceChange?.h6 || 0),
    price_change_24h: Number(top.priceChange?.h24 || 0),
    pair_created_at_ms: Number(top.pairCreatedAt || now - 3600_000 * 6),
    dex: top.dexId || 'raydium',
    pair_address: top.pairAddress || `${tokenAddress.slice(0, 8)}pair`,
    quote_symbol: top.quoteToken?.symbol || 'SOL',
    pairs: solPairs.slice(0, 5).map((p) => ({
      pair_address: p.pairAddress || '',
      dex: p.dexId || 'unknown',
      quote_symbol: p.quoteToken?.symbol || 'SOL',
      liquidity_usd: Number(p.liquidity?.usd || 0),
      volume_24h_usd: Number(p.volume?.h24 || 0),
    })),
    website: top.info?.websites?.[0]?.url,
    socials,
    paid_boost_active: activeBoosts > 0,
    boost_amount: activeBoosts,
    meta: buildMeta('dexscreener', 'REAL', now, 0.92, 'Live DexScreener REST API snapshot'),
  };
}

// Offline/network-restricted deterministic fallback fixture (explicitly tagged MOCK, never REAL)
function buildFallbackFixture(address: string): NormalizedMarketPayload {
  const now = Date.now();
  const presets: Record<string, Partial<NormalizedMarketPayload>> = {
    DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263: {
      symbol: 'BONK',
      name: 'Bonk',
      price_usd: 0.0000241,
      market_cap_usd: 1_720_000_000,
      liquidity_usd: 18_400_000,
      volume_24h_usd: 42_500_000,
      volume_1h_usd: 2_310_000,
      volume_5m_usd: 195_000,
      buys_1h: 1420,
      sells_1h: 1180,
      price_change_5m: 1.4,
      price_change_1h: 4.8,
      price_change_24h: 11.2,
      pair_created_at_ms: now - 86_400_000 * 500,
      dex: 'raydium',
    },
    EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm: {
      symbol: '$WIF',
      name: 'dogwifhat',
      price_usd: 1.84,
      market_cap_usd: 1_830_000_000,
      liquidity_usd: 14_200_000,
      volume_24h_usd: 38_100_000,
      volume_1h_usd: 1_940_000,
      volume_5m_usd: 162_000,
      buys_1h: 980,
      sells_1h: 840,
      price_change_5m: 0.8,
      price_change_1h: 3.1,
      price_change_24h: -2.4,
      pair_created_at_ms: now - 86_400_000 * 320,
      dex: 'raydium',
    },
    '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr': {
      symbol: 'POPCAT',
      name: 'Popcat',
      price_usd: 0.72,
      market_cap_usd: 705_000_000,
      liquidity_usd: 8_900_000,
      volume_24h_usd: 19_600_000,
      volume_1h_usd: 1_120_000,
      volume_5m_usd: 89_000,
      buys_1h: 720,
      sells_1h: 590,
      price_change_5m: 2.1,
      price_change_1h: 6.4,
      price_change_24h: 14.5,
      pair_created_at_ms: now - 86_400_000 * 280,
      dex: 'raydium',
    },
    CzLSujWBLFsSjncfkh59rUFqvafWcY5tzedWJSuypump: {
      symbol: 'GOAT',
      name: 'Goatseus Maximus',
      price_usd: 0.34,
      market_cap_usd: 340_000_000,
      liquidity_usd: 5_200_000,
      volume_24h_usd: 14_800_000,
      volume_1h_usd: 820_000,
      volume_5m_usd: 74_000,
      buys_1h: 610,
      sells_1h: 515,
      price_change_5m: 1.9,
      price_change_1h: 7.2,
      price_change_24h: 18.4,
      pair_created_at_ms: now - 86_400_000 * 90,
      dex: 'raydium',
    },
    '9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump': {
      symbol: 'FARTCOIN',
      name: 'Fartcoin',
      price_usd: 0.89,
      market_cap_usd: 890_000_000,
      liquidity_usd: 9_600_000,
      volume_24h_usd: 31_400_000,
      volume_1h_usd: 2_140_000,
      volume_5m_usd: 210_000,
      buys_1h: 1310,
      sells_1h: 920,
      price_change_5m: 3.4,
      price_change_1h: 9.8,
      price_change_24h: 22.1,
      pair_created_at_ms: now - 86_400_000 * 75,
      dex: 'pumpswap',
    },
    ED5nyyWEzpPPiWimP8vYm7sD7TD3LAt3Q3gRTWHzPJBY: {
      symbol: 'MOODENG',
      name: 'Moo Deng',
      price_usd: 0.16,
      market_cap_usd: 158_000_000,
      liquidity_usd: 3_400_000,
      volume_24h_usd: 9_200_000,
      volume_1h_usd: 420_000,
      volume_5m_usd: 31_000,
      buys_1h: 340,
      sells_1h: 390,
      price_change_5m: -1.1,
      price_change_1h: -3.5,
      price_change_24h: -8.2,
      pair_created_at_ms: now - 86_400_000 * 110,
      dex: 'raydium',
    },
    HeLp6NuQkmYB4pYWo2zYs22mESHXPQYzXbB8n4V98jwC: {
      symbol: 'ai16z',
      name: 'ai16z',
      price_usd: 0.42,
      market_cap_usd: 460_000_000,
      liquidity_usd: 6_100_000,
      volume_24h_usd: 17_400_000,
      volume_1h_usd: 950_000,
      volume_5m_usd: 82_000,
      buys_1h: 580,
      sells_1h: 470,
      price_change_5m: 1.6,
      price_change_1h: 5.3,
      price_change_24h: 9.1,
      pair_created_at_ms: now - 86_400_000 * 80,
      dex: 'orca',
    },
    JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN: {
      symbol: 'JUP',
      name: 'Jupiter',
      price_usd: 0.81,
      market_cap_usd: 1_090_000_000,
      liquidity_usd: 22_000_000,
      volume_24h_usd: 48_000_000,
      volume_1h_usd: 2_600_000,
      volume_5m_usd: 185_000,
      buys_1h: 1120,
      sells_1h: 980,
      price_change_5m: 0.4,
      price_change_1h: 1.9,
      price_change_24h: 4.2,
      pair_created_at_ms: now - 86_400_000 * 350,
      dex: 'orca',
    },
  };

  const preset = presets[address];
  const sym = preset?.symbol || `TKN${address.slice(0, 4).toUpperCase()}`;
  const price = preset?.price_usd || 0.0042;
  const mc = preset?.market_cap_usd || 185_000;
  const liq = preset?.liquidity_usd || 24_500;
  const vol24 = preset?.volume_24h_usd || 142_000;

  return {
    provider: 'dexscreener',
    address,
    symbol: sym,
    name: preset?.name || `${sym} Solana Token`,
    price_usd: price,
    market_cap_usd: mc,
    fdv_usd: mc * 1.05,
    liquidity_usd: liq,
    volume_5m_usd: preset?.volume_5m_usd || 4_800,
    volume_1h_usd: preset?.volume_1h_usd || 32_000,
    volume_6h_usd: vol24 * 0.45,
    volume_24h_usd: vol24,
    buys_5m: 28,
    sells_5m: 19,
    buys_1h: preset?.buys_1h || 185,
    sells_1h: preset?.sells_1h || 132,
    buys_24h: (preset?.buys_1h || 185) * 9,
    sells_24h: (preset?.sells_1h || 132) * 8,
    price_change_5m: preset?.price_change_5m ?? 2.8,
    price_change_1h: preset?.price_change_1h ?? 11.4,
    price_change_6h: 18.2,
    price_change_24h: preset?.price_change_24h ?? 34.6,
    pair_created_at_ms: preset?.pair_created_at_ms || now - 45 * 60_000,
    dex: preset?.dex || (address.endsWith('pump') ? 'pumpfun' : 'raydium'),
    pair_address: `${address.slice(0, 10)}Pool`,
    quote_symbol: 'SOL',
    pairs: [
      {
        pair_address: `${address.slice(0, 10)}Pool`,
        dex: preset?.dex || 'raydium',
        quote_symbol: 'SOL',
        liquidity_usd: liq,
        volume_24h_usd: vol24,
      },
    ],
    socials: {
      x: `https://x.com/search?q=${encodeURIComponent(sym)}`,
    },
    paid_boost_active: false,
    boost_amount: 0,
    meta: buildMeta(
      'dexscreener',
      'MOCK',
      now,
      0.55,
      'DexScreener live API unreachable — explicitly tagged MOCK fallback fixture'
    ),
  };
}

export async function fetchDexScreenerToken(address: string): Promise<NormalizedMarketPayload> {
  const cached = cache.get(address);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.payload;
  }

  const url = `${SERVER_CONFIG.providers.dexscreener.baseUrl}/latest/dex/tokens/${encodeURIComponent(address)}`;
  const res = await fetchJsonWithRetry<DexScreenerTokensResponse>('dexscreener', url);

  if (res.data?.pairs && res.data.pairs.length > 0) {
    const normalized = mapPairsToNormalized(address, res.data.pairs);
    if (normalized) {
      cache.set(address, { expiresAt: Date.now() + SERVER_CONFIG.cacheTtlMs, payload: normalized });
      return normalized;
    }
  }

  recordProviderCall('dexscreener', res.latencyMs, false, 'MOCK_FIXTURE', res.error || 'No Solana pairs found');
  const fallback = buildFallbackFixture(address);
  cache.set(address, { expiresAt: Date.now() + 10_000, payload: fallback });
  return fallback;
}

const liveQuoteCache = new Map<string, { expiresAt: number; payload: NormalizedMarketPayload }>();

export async function fetchDexScreenerLiveQuote(address: string): Promise<NormalizedMarketPayload> {
  const cached = liveQuoteCache.get(address);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.payload;
  }

  const url = `${SERVER_CONFIG.providers.dexscreener.baseUrl}/latest/dex/tokens/${encodeURIComponent(address)}`;
  const res = await fetchJsonWithRetry<DexScreenerTokensResponse>('dexscreener', url);

  if (res.data?.pairs && res.data.pairs.length > 0) {
    const normalized = mapPairsToNormalized(address, res.data.pairs);
    if (normalized) {
      liveQuoteCache.set(address, { expiresAt: Date.now() + 3_000, payload: normalized });
      cache.set(address, { expiresAt: Date.now() + SERVER_CONFIG.cacheTtlMs, payload: normalized });
      return normalized;
    }
  }

  const fallback = cache.get(address)?.payload || buildFallbackFixture(address);
  liveQuoteCache.set(address, { expiresAt: Date.now() + 4_000, payload: fallback });
  return fallback;
}

export async function searchDexScreenerTokens(query: string): Promise<NormalizedMarketPayload[]> {
  const clean = query.trim();
  if (!clean) return [];
  const key = clean.toLowerCase();
  const cached = searchCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.tokens;

  const url = `${SERVER_CONFIG.providers.dexscreener.baseUrl}/latest/dex/search?q=${encodeURIComponent(clean)}`;
  const res = await fetchJsonWithRetry<DexScreenerTokensResponse>('dexscreener', url);

  if (res.data?.pairs) {
    const byToken = new Map<string, DexScreenerPair[]>();
    for (const pair of res.data.pairs) {
      if (pair.chainId !== 'solana' || !pair.baseToken?.address) continue;
      const addr = pair.baseToken.address;
      const list = byToken.get(addr) || [];
      list.push(pair);
      byToken.set(addr, list);
    }
    const results: NormalizedMarketPayload[] = [];
    for (const [addr, pairs] of byToken.entries()) {
      const mapped = mapPairsToNormalized(addr, pairs);
      if (mapped) results.push(mapped);
    }
    if (results.length > 0) {
      const sliced = results.slice(0, 16);
      searchCache.set(key, { expiresAt: Date.now() + SERVER_CONFIG.cacheTtlMs, tokens: sliced });
      return sliced;
    }
  }

  return [];
}

export async function fetchDexScreenerScannerUniverse(): Promise<NormalizedMarketPayload[]> {
  const cached = searchCache.get('__universe__');
  if (cached && cached.expiresAt > Date.now()) {
    return cached.tokens;
  }

  const boostMap = new Map<string, number>();
  const boostRes = await fetchJsonWithRetry<DexScreenerBoostItem[]>(
    'dexscreener',
    `${SERVER_CONFIG.providers.dexscreener.baseUrl}/token-boosts/top/v1`
  );

  const candidateAddresses = new Set<string>(SOLANA_DISCOVERY_SEEDS);
  if (Array.isArray(boostRes.data)) {
    for (const item of boostRes.data) {
      if (item.chainId === 'solana' && item.tokenAddress) {
        candidateAddresses.add(item.tokenAddress);
        boostMap.set(item.tokenAddress, Number(item.totalAmount || item.amount || 10));
        if (candidateAddresses.size >= 16) break;
      }
    }
  }

  const addrList = Array.from(candidateAddresses).slice(0, 16);
  // DexScreener supports comma-separated token addresses (up to 30)
  const batchUrl = `${SERVER_CONFIG.providers.dexscreener.baseUrl}/latest/dex/tokens/${addrList.join(',')}`;
  const batchRes = await fetchJsonWithRetry<DexScreenerTokensResponse>('dexscreener', batchUrl);

  const results: NormalizedMarketPayload[] = [];
  if (batchRes.data?.pairs && batchRes.data.pairs.length > 0) {
    const grouped = new Map<string, DexScreenerPair[]>();
    for (const p of batchRes.data.pairs) {
      if (p.chainId !== 'solana' || !p.baseToken?.address) continue;
      const addr = p.baseToken.address;
      const arr = grouped.get(addr) || [];
      arr.push(p);
      grouped.set(addr, arr);
    }
    for (const addr of addrList) {
      const pairs = grouped.get(addr);
      if (pairs && pairs.length > 0) {
        const mapped = mapPairsToNormalized(addr, pairs, boostMap.get(addr) || 0);
        if (mapped) results.push(mapped);
      }
    }
  }

  if (results.length === 0) {
    for (const addr of SOLANA_DISCOVERY_SEEDS) {
      results.push(buildFallbackFixture(addr));
    }
  }

  searchCache.set('__universe__', { expiresAt: Date.now() + SERVER_CONFIG.cacheTtlMs, tokens: results });
  return results;
}
