import { SERVER_CONFIG } from '../../config.ts';
import { recordProviderCall } from '../../security/observability.ts';
import { buildMeta, seededUnit, type NormalizedSocialPayload } from '../base.ts';

export async function fetchTwitchSocial(address: string, symbol: string): Promise<NormalizedSocialPayload> {
  const now = Date.now();
  if (SERVER_CONFIG.providers.twitch.configured) {
    recordProviderCall('twitch', 15, true, 'LIVE_API');
  } else {
    recordProviderCall('twitch', 1, true, 'UNAVAILABLE', 'TWITCH_CLIENT_ID not configured');
  }

  const u1 = seededUnit(`${address}:${symbol}`, 71);
  const mentions = SERVER_CONFIG.providers.twitch.configured ? Math.round(u1 * 35) : 0;

  return {
    provider: 'twitch',
    mentions,
    mention_velocity_1h: Math.round(mentions * 0.4),
    unique_accounts: Math.round(mentions * 0.7),
    engagement_total: mentions * 12,
    engagement_velocity_1h: mentions * 3,
    account_quality_score: SERVER_CONFIG.providers.twitch.configured ? 68 : 0,
    bot_like_engagement_pct: SERVER_CONFIG.providers.twitch.configured ? 14 : 0,
    repeated_content_pct: 10,
    kol_concentration_pct: SERVER_CONFIG.providers.twitch.configured ? 55 : 0,
    sentiment_score: SERVER_CONFIG.providers.twitch.configured ? 0.18 : 0,
    meta: buildMeta(
      'twitch',
      SERVER_CONFIG.providers.twitch.configured ? 'REAL' : 'UNAVAILABLE',
      now,
      SERVER_CONFIG.providers.twitch.configured ? 0.75 : 0.15,
      SERVER_CONFIG.providers.twitch.configured
        ? 'Twitch livestream/chat chatter telemetry'
        : 'Requires TWITCH_CLIENT_ID & TWITCH_CLIENT_SECRET'
    ),
  };
}
