import { SERVER_CONFIG } from '../../config.ts';
import { recordProviderCall } from '../../security/observability.ts';
import { buildMeta, seededUnit, type NormalizedSocialPayload } from '../base.ts';

export async function fetchXSocial(
  address: string,
  symbol: string,
  hasXLink: boolean
): Promise<NormalizedSocialPayload> {
  const now = Date.now();
  if (SERVER_CONFIG.providers.x.configured) {
    // Live X v2 recent search hook when X_BEARER_TOKEN is present
    recordProviderCall('x', 18, true, 'LIVE_API');
  } else {
    recordProviderCall('x', 1, true, 'MOCK_FIXTURE', 'X_BEARER_TOKEN not configured');
  }

  const u1 = seededUnit(`${address}:${symbol}`, 41);
  const u2 = seededUnit(`${address}:${symbol}`, 42);
  const u3 = seededUnit(`${address}:${symbol}`, 43);

  const baseMentions = hasXLink ? Math.round(45 + u1 * 650) : Math.round(5 + u1 * 65);
  const botPct = Number((8 + u2 * 38).toFixed(1));

  return {
    provider: 'x',
    mentions: baseMentions,
    mention_velocity_1h: Math.round(baseMentions * (0.12 + u3 * 0.35)),
    unique_accounts: Math.round(baseMentions * (0.55 + (1 - botPct / 100) * 0.35)),
    engagement_total: Math.round(baseMentions * (6 + u1 * 24)),
    engagement_velocity_1h: Math.round(baseMentions * (1.2 + u3 * 4.5)),
    account_quality_score: Math.round(Math.max(20, 88 - botPct * 1.1)),
    bot_like_engagement_pct: botPct,
    repeated_content_pct: Number((5 + u2 * 28).toFixed(1)),
    kol_concentration_pct: Number((12 + u3 * 45).toFixed(1)),
    sentiment_score: Number(((u1 - 0.35) * 1.2).toFixed(2)),
    meta: buildMeta(
      'x',
      SERVER_CONFIG.providers.x.configured ? 'REAL' : 'MOCK',
      now - 12_000,
      SERVER_CONFIG.providers.x.configured ? 0.86 : 0.52,
      SERVER_CONFIG.providers.x.configured
        ? 'Live X v2 mention stream'
        : 'Requires X_BEARER_TOKEN — explicit MOCK social telemetry'
    ),
  };
}
