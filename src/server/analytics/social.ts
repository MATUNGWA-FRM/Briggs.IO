import type { NarrativeStage, ReasonItem, SocialIntelligence, SocialPlatformMetrics } from '../../shared/types.ts';
import type { AggregatedTokenInputs } from '../connectors/aggregator.ts';

function inferNarrativeTheme(name: string, symbol: string): string {
  const s = `${name} ${symbol}`.toLowerCase();
  if (s.includes('ai') || s.includes('agent') || s.includes('gpt') || s.includes('goat')) {
    return 'AI & Autonomous Agents';
  }
  if (
    s.includes('dog') ||
    s.includes('wif') ||
    s.includes('bonk') ||
    s.includes('cat') ||
    s.includes('pop') ||
    s.includes('pepe') ||
    s.includes('moo') ||
    s.includes('hippo')
  ) {
    return 'Animal / Mascot Internet Culture';
  }
  if (s.includes('trump') || s.includes('pol') || s.includes('usa')) {
    return 'Permitted Cultural / Political Satire';
  }
  return 'Internet Culture & Viral Memetics';
}

export function analyzeSocialAndNarrative(agg: AggregatedTokenInputs): SocialIntelligence {
  const m = agg.primaryMarket;
  const platforms: SocialPlatformMetrics[] = agg.socialFeeds.map((f) => ({
    platform: f.provider,
    mentions: f.mentions,
    mention_velocity_1h: f.mention_velocity_1h,
    unique_accounts: f.unique_accounts,
    engagement_total: f.engagement_total,
    engagement_velocity_1h: f.engagement_velocity_1h,
    account_quality_score: f.account_quality_score,
    bot_like_engagement_pct: f.bot_like_engagement_pct,
    repeated_content_pct: f.repeated_content_pct,
    kol_concentration_pct: f.kol_concentration_pct,
    sentiment_score: f.sentiment_score,
    data_status: f.meta.data_status,
    note: f.meta.notes,
  }));

  const activePlatforms = platforms.filter((p) => p.data_status !== 'UNAVAILABLE');
  const totalMentions = activePlatforms.reduce((a, p) => a + p.mentions, 0);
  const totalVel = activePlatforms.reduce((a, p) => a + p.mention_velocity_1h, 0);
  const avgBotPct =
    activePlatforms.length > 0
      ? activePlatforms.reduce((a, p) => a + p.bot_like_engagement_pct, 0) / activePlatforms.length
      : 35;
  const avgKolPct =
    activePlatforms.length > 0
      ? activePlatforms.reduce((a, p) => a + p.kol_concentration_pct, 0) / activePlatforms.length
      : 40;

  const organicityPct = Math.max(10, Math.min(95, Math.round(100 - avgBotPct * 0.9 - avgKolPct * 0.25)));
  const socialMomentum = Math.min(
    96,
    Math.max(12, Math.round(Math.log10(Math.max(10, totalMentions)) * 22 + Math.min(35, totalVel * 0.35)))
  );

  const virality = Math.min(95, Math.round(socialMomentum * 0.75 + (m.price_change_1h > 5 ? 18 : 6)));
  const controversy = Math.min(90, Math.round(20 + Math.abs(m.price_change_24h) * 0.6));
  const novelty = m.pair_created_at_ms > Date.now() - 86_400_000 * 3 ? 74 : 46;
  const narrativeStrength = Math.round(virality * 0.5 + novelty * 0.25 + organicityPct * 0.25);
  const communityActivity = Math.min(95, Math.round((activePlatforms.length / 4) * 40 + totalMentions * 0.08));
  const socialRisk = Math.min(
    95,
    Math.max(12, Math.round(avgBotPct * 0.9 + avgKolPct * 0.45 + (activePlatforms.length <= 1 ? 22 : 0)))
  );

  const accelPct = totalMentions > 0 ? Number(((totalVel / Math.max(1, totalMentions)) * 100).toFixed(1)) : 0;
  let stage: NarrativeStage = 'Growing';
  if (m.price_change_24h > 45 && accelPct < 15) stage = 'Overextended';
  else if (m.price_change_24h < -15 && accelPct < 12) stage = 'Declining';
  else if (novelty > 65 && accelPct > 22) stage = 'Emerging';
  else if (totalMentions > 300) stage = 'Mature';

  const paidBoost = m.paid_boost_active;
  const paidClass: SocialIntelligence['paid_vs_organic']['classification'] = paidBoost
    ? organicityPct > 55
      ? 'MIXED_PROMOTED'
      : 'PAID_BOOST_DETECTED'
    : totalMentions > 20
    ? 'ORGANIC_DOMINANT'
    : 'INSUFFICIENT_DATA';

  const reasons: ReasonItem[] = [];
  if (socialMomentum > 60) {
    reasons.push({
      direction: '+',
      category: 'Social Velocity',
      text: `Cross-platform mention velocity elevated (${totalVel}/hr across approved channels)`,
    });
  } else {
    reasons.push({
      direction: '-',
      category: 'Social Velocity',
      text: `Muted social velocity (${totalVel}/hr across X/Telegram/Reddit/Twitch)`,
    });
  }

  if (organicityPct < 55) {
    reasons.push({
      direction: '-',
      category: 'Organicity',
      text: `Elevated bot-like/KOL-concentrated activity (~${organicityPct}% estimated organic)`,
    });
  } else {
    reasons.push({
      direction: '+',
      category: 'Organicity',
      text: `Estimated ~${organicityPct}% organic community discussion`,
    });
  }

  if (paidBoost) {
    reasons.push({
      direction: '?',
      category: 'Paid vs Organic',
      text: `Paid DEX boost detected (${m.boost_amount} boosts). Paid visibility does not automatically imply scam.`,
    });
  }

  const anyReal = platforms.some((p) => p.data_status === 'REAL');

  return {
    platforms,
    social_momentum_score: socialMomentum,
    narrative_strength_score: narrativeStrength,
    social_organicity_estimate_pct: organicityPct,
    community_activity_score: communityActivity,
    social_risk_score: socialRisk,
    narrative: {
      primary_theme: inferNarrativeTheme(m.name, m.symbol),
      stage,
      virality_score: virality,
      controversy_score: controversy,
      novelty_score: novelty,
      social_acceleration_pct: accelPct,
      price_extension_note:
        stage === 'Overextended'
          ? 'Attention and price have expanded sharply; do not confuse viral hype with sustainable demand.'
          : 'Monitor whether social acceleration translates into net unique holder growth.',
    },
    paid_vs_organic: {
      classification: paidClass,
      paid_boost_detected: paidBoost,
      organic_discovery_pct: organicityPct,
      note: 'Paid promotion ≠ Unsafe; Organic visibility ≠ Safe. Evaluated as contextual ML features only.',
    },
    reasons,
    data_status: anyReal ? 'ESTIMATED' : 'MOCK',
  };
}
