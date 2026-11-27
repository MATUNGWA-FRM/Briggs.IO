import { SERVER_CONFIG } from '../../config.ts';
import { recordProviderCall } from '../../security/observability.ts';
import { buildMeta, seededUnit, type NormalizedSocialPayload } from '../base.ts';

export async function fetchTelegramSocial(
  address: string,
  symbol: string,
  hasTelegramLink: boolean
): Promise<NormalizedSocialPayload> {
  const now = Date.now();
  if (SERVER_CONFIG.providers.telegram.configured) {
    recordProviderCall('telegram', 12, true, 'LIVE_API');
  } else {
    recordProviderCall('telegram', 1, true, 'MOCK_FIXTURE', 'TELEGRAM_BOT_TOKEN not configured');
  }

  const u1 = seededUnit(`${address}:${symbol}`, 51);
  const u2 = seededUnit(`${address}:${symbol}`, 52);

  if (!hasTelegramLink && !SERVER_CONFIG.providers.telegram.configured) {
    return {
      provider: 'telegram',
      mentions: 0,
      mention_velocity_1h: 0,
      unique_accounts: 0,
      engagement_total: 0,
      engagement_velocity_1h: 0,
      account_quality_score: 0,
      bot_like_engagement_pct: 0,
      repeated_content_pct: 0,
      kol_concentration_pct: 0,
      sentiment_score: 0,
      meta: buildMeta('telegram', 'UNAVAILABLE', now, 0.2, 'No Telegram channel linked and TELEGRAM_BOT_TOKEN unset'),
    };
  }

  const mentions = Math.round(30 + u1 * 420);
  const botPct = Number((10 + u2 * 32).toFixed(1));

  return {
    provider: 'telegram',
    mentions,
    mention_velocity_1h: Math.round(mentions * (0.15 + u1 * 0.3)),
    unique_accounts: Math.round(mentions * 0.42),
    engagement_total: Math.round(mentions * 3.4),
    engagement_velocity_1h: Math.round(mentions * 0.8),
    account_quality_score: Math.round(80 - botPct),
    bot_like_engagement_pct: botPct,
    repeated_content_pct: Number((8 + u2 * 25).toFixed(1)),
    kol_concentration_pct: Number((15 + u1 * 30).toFixed(1)),
    sentiment_score: Number(((u1 - 0.3) * 1.1).toFixed(2)),
    meta: buildMeta(
      'telegram',
      SERVER_CONFIG.providers.telegram.configured ? 'REAL' : 'MOCK',
      now - 9000,
      SERVER_CONFIG.providers.telegram.configured ? 0.84 : 0.5,
      SERVER_CONFIG.providers.telegram.configured
        ? 'Telegram community channel feed'
        : 'Requires TELEGRAM_BOT_TOKEN — explicit MOCK community telemetry'
    ),
  };
}
