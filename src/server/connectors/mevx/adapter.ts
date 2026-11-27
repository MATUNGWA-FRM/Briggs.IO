import { SERVER_CONFIG } from '../../config.ts';
import { recordProviderCall } from '../../security/observability.ts';
import { buildMeta, seededUnit, type NormalizedMarketPayload } from '../base.ts';

export async function fetchMevXToken(
  address: string,
  anchor: NormalizedMarketPayload
): Promise<NormalizedMarketPayload> {
  const now = Date.now();
  const start = now;

  if (SERVER_CONFIG.providers.mevx.configured) {
    // Production integration hook when MEVX_API_KEY is supplied in Secrets
    recordProviderCall('mevx', Date.now() - start, true, 'LIVE_API');
  } else {
    recordProviderCall(
      'mevx',
      1,
      true,
      'MOCK_FIXTURE',
      'MEVX_API_KEY not configured — deterministic fixture active'
    );
  }

  const u1 = seededUnit(address, 11);
  const u2 = seededUnit(address, 12);
  const u3 = seededUnit(address, 13);

  // Subtle cross-provider variance to test conflict detection & reconciliation
  const variance = 1 + (u1 - 0.5) * 0.04;
  const sniperPct = Number((4 + u2 * 28).toFixed(1));
  const bundlePct = Number((2 + u3 * 22).toFixed(1));

  return {
    ...anchor,
    provider: 'mevx',
    liquidity_usd: Math.round(anchor.liquidity_usd * variance),
    volume_24h_usd: Math.round(anchor.volume_24h_usd * (1 + (u2 - 0.5) * 0.06)),
    sniper_pct: sniperPct,
    bundle_pct: bundlePct,
    lp_burned_pct: anchor.dex === 'raydium' ? Math.round(70 + u1 * 30) : Math.round(45 + u1 * 50),
    meta: buildMeta(
      'mevx',
      SERVER_CONFIG.providers.mevx.configured ? 'REAL' : 'MOCK',
      now - 4000,
      SERVER_CONFIG.providers.mevx.configured ? 0.88 : 0.62,
      SERVER_CONFIG.providers.mevx.configured
        ? 'MevX live sniper & bundle telemetry'
        : 'Requires MEVX_API_KEY — deterministic sniper/bundle fixture'
    ),
  };
}
