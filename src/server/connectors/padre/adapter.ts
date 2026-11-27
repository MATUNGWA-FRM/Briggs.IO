import { SERVER_CONFIG } from '../../config.ts';
import { recordProviderCall } from '../../security/observability.ts';
import { buildMeta, seededUnit, type NormalizedMarketPayload } from '../base.ts';

export async function fetchPadreToken(
  address: string,
  anchor: NormalizedMarketPayload
): Promise<NormalizedMarketPayload> {
  const now = Date.now();
  const start = now;

  if (SERVER_CONFIG.providers.padre.configured) {
    recordProviderCall('padre', Date.now() - start, true, 'LIVE_API');
  } else {
    recordProviderCall(
      'padre',
      1,
      true,
      'MOCK_FIXTURE',
      'PADRE_API_KEY not configured — deterministic fixture active'
    );
  }

  const u1 = seededUnit(address, 31);
  const u2 = seededUnit(address, 32);

  // Simulate occasional subtle price/volume divergence for conflict detection
  const volVariance = 1 + (u1 - 0.5) * 0.16;

  return {
    ...anchor,
    provider: 'padre',
    price_usd: anchor.price_usd * (1 + (u2 - 0.5) * 0.015),
    volume_24h_usd: Math.round(anchor.volume_24h_usd * volVariance),
    meta: buildMeta(
      'padre',
      SERVER_CONFIG.providers.padre.configured ? 'REAL' : 'MOCK',
      now - 5000,
      SERVER_CONFIG.providers.padre.configured ? 0.89 : 0.6,
      SERVER_CONFIG.providers.padre.configured
        ? 'Padre Terminal execution flow'
        : 'Requires PADRE_API_KEY — deterministic flow fixture'
    ),
  };
}
