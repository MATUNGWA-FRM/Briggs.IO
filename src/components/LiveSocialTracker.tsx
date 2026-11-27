import React, { useMemo, useState } from 'react';
import { ExternalLink, Pause, Play, Radio, RefreshCw, Search } from 'lucide-react';
import type { ApprovedSocialProvider, SocialIntelligence, SocialMentionEvent } from '../shared/types';

interface LiveSocialTrackerProps {
  symbol: string;
  events: SocialMentionEvent[];
  social: SocialIntelligence;
  streaming: boolean;
  onToggleStreaming: () => void;
  onRefresh: () => void;
  loading?: boolean;
}

const PLATFORM_LABELS: Record<ApprovedSocialProvider, string> = {
  x: 'X (Twitter)',
  telegram: 'Telegram',
  reddit: 'Reddit',
  twitch: 'Twitch',
};

const PLATFORM_COLORS: Record<ApprovedSocialProvider, string> = {
  x: 'text-sky-300 border-sky-500/40 bg-sky-500/10',
  telegram: 'text-cyan-300 border-cyan-500/40 bg-cyan-500/10',
  reddit: 'text-orange-300 border-orange-500/40 bg-orange-500/10',
  twitch: 'text-[#C4B5FD] border-[#7C5CFF]/50 bg-[#7C5CFF]/15',
};

export const LiveSocialTracker: React.FC<LiveSocialTrackerProps> = ({
  symbol,
  events,
  social,
  streaming,
  onToggleStreaming,
  onRefresh,
  loading = false,
}) => {
  const [platformFilter, setPlatformFilter] = useState<'ALL' | ApprovedSocialProvider>('ALL');
  const [sentimentFilter, setSentimentFilter] = useState<'ALL' | SocialMentionEvent['sentiment']>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return events.filter((ev) => {
      if (platformFilter !== 'ALL' && ev.platform !== platformFilter) return false;
      if (sentimentFilter !== 'ALL' && ev.sentiment !== sentimentFilter) return false;
      if (q) {
        return (
          ev.text.toLowerCase().includes(q) ||
          ev.author.toLowerCase().includes(q) ||
          ev.channel.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [events, platformFilter, sentimentFilter, searchQuery]);

  return (
    <div className="space-y-3 text-xs">
      {/* Top Bar: Social Momentum & Approved Platform Statuses */}
      <div className="p-3 rounded-sm border border-[#1E2330] bg-[#0C0E14] space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Radio className={`w-4 h-4 ${streaming ? 'text-[#00E599]' : 'text-slate-500'}`} />
            <div>
              <h3 className="font-display text-sm font-semibold text-slate-100">
                {symbol} Live Social Media Tracker
              </h3>
              <p className="text-[11px] text-slate-400 font-mono tabular-nums">
                Approved sources only (X · Telegram · Reddit · Twitch) · {events.length} tracked mentions · Organicity{' '}
                <strong className="text-[#00E599]">{social.social_organicity_estimate_pct}%</strong>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={onToggleStreaming}
              className={`px-2.5 py-1 rounded-sm border font-mono text-[11px] inline-flex items-center gap-1 whitespace-nowrap shrink-0 ${
                streaming
                  ? 'border-[#00E599]/40 bg-[#00E599]/10 text-[#00E599]'
                  : 'border-[#1E2330] bg-[#12151E] text-slate-400'
              }`}
            >
              {streaming ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              {streaming ? 'LIVE FEED' : 'PAUSED'}
            </button>

            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="px-2.5 py-1 rounded-sm border border-[#1E2330] bg-[#12151E] hover:bg-[#191E2B] text-slate-200 font-mono text-[11px] inline-flex items-center gap-1 disabled:opacity-50 whitespace-nowrap shrink-0"
              title="Fetch latest social mentions"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Approved Social Provider Snapshot Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 font-mono tabular-nums">
          {social.platforms.map((p) => {
            const active = platformFilter === p.platform;
            return (
              <button
                key={p.platform}
                type="button"
                onClick={() => setPlatformFilter(active ? 'ALL' : p.platform)}
                className={`p-2 rounded-sm border text-left transition-colors ${
                  active
                    ? 'border-[#7C5CFF] bg-[#7C5CFF]/15'
                    : 'border-[#1E2330] bg-[#08090D] hover:border-[#2C3448]'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-semibold text-slate-200 uppercase text-[11px]">
                    {PLATFORM_LABELS[p.platform]}
                  </span>
                  <span
                    className={`text-[10px] ${
                      p.data_status === 'REAL'
                        ? 'text-[#00E599]'
                        : p.data_status === 'MOCK'
                        ? 'text-amber-400'
                        : 'text-slate-500'
                    }`}
                  >
                    {p.data_status}
                  </span>
                </div>
                <div className="mt-1 flex items-baseline justify-between text-[11px]">
                  <span className="text-slate-100 font-bold">{p.mentions} mentions</span>
                  <span className="text-[#C4B5FD]">+{p.mention_velocity_1h}/h</span>
                </div>
                <div className="mt-0.5 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Bot {p.bot_like_engagement_pct}%</span>
                  <span className={p.sentiment_score >= 0 ? 'text-[#00E599]' : 'text-[#FF4D6A]'}>
                    Sent {p.sentiment_score >= 0 ? '+' : ''}
                    {p.sentiment_score.toFixed(2)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-sm border border-[#1E2330] bg-[#0C0E14]">
        <div className="flex flex-wrap items-center gap-1">
          {(['ALL', 'x', 'telegram', 'reddit', 'twitch'] as const).map((plat) => (
            <button
              key={plat}
              type="button"
              onClick={() => setPlatformFilter(plat)}
              className={`px-2 py-0.5 rounded-sm border text-[11px] font-mono uppercase whitespace-nowrap shrink-0 transition-colors ${
                platformFilter === plat
                  ? 'border-[#7C5CFF]/60 bg-[#7C5CFF]/20 text-[#C4B5FD]'
                  : 'border-[#1E2330] bg-[#08090D] text-slate-400 hover:text-slate-200'
              }`}
            >
              {plat === 'ALL' ? 'All Sources' : plat}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center bg-[#08090D] border border-[#1E2330] rounded-sm p-0.5">
            {(['ALL', 'BULLISH', 'NEUTRAL', 'BEARISH'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSentimentFilter(s)}
                className={`px-2 py-0.5 text-[10px] font-mono rounded-sm whitespace-nowrap shrink-0 ${
                  sentimentFilter === s
                    ? 'bg-[#1D2230] text-slate-100 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter mentions..."
              className="bg-[#08090D] border border-[#1E2330] rounded-sm pl-6 pr-2 py-1 text-[11px] font-mono text-slate-200 w-40 focus:outline-none focus:border-[#7C5CFF]"
            />
          </div>
        </div>
      </div>

      {/* Live Mention Stream */}
      <div className="rounded-sm border border-[#1E2330] bg-[#0C0E14] divide-y divide-[#1E2330]/80 max-h-[380px] overflow-y-auto">
        {filteredEvents.length === 0 ? (
          <div className="p-6 text-center text-slate-500 font-mono text-[11px]">
            No social mentions match the active filter.
          </div>
        ) : (
          filteredEvents.map((ev) => {
            const sentCls =
              ev.sentiment === 'BULLISH'
                ? 'text-[#00E599]'
                : ev.sentiment === 'BEARISH'
                ? 'text-[#FF4D6A]'
                : 'text-slate-300';
            return (
              <div key={ev.id} className="p-3 hover:bg-[#121622] transition-colors space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px]">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`px-1.5 py-0.5 rounded-sm border text-[10px] uppercase font-semibold shrink-0 ${
                        PLATFORM_COLORS[ev.platform]
                      }`}
                    >
                      {ev.platform}
                    </span>
                    <span className="text-slate-100 font-semibold truncate">{ev.author}</span>
                    <span className="text-slate-500 truncate">· {ev.channel}</span>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0 tabular-nums text-[10px]">
                    <span className={sentCls}>{ev.sentiment}</span>
                    <span
                      className={
                        ev.organicity === 'AUTOMATED_RISK' ? 'text-amber-400' : 'text-slate-400'
                      }
                    >
                      {ev.organicity === 'AUTOMATED_RISK' ? 'BOT/COORD RISK' : 'ORGANIC'}
                    </span>
                    <span
                      className={
                        ev.data_status === 'REAL'
                          ? 'text-[#00E599]'
                          : ev.data_status === 'MOCK'
                          ? 'text-amber-400'
                          : 'text-slate-500'
                      }
                    >
                      [{ev.data_status}]
                    </span>
                    <span className="text-slate-500">
                      {new Date(ev.timestamp_ms).toISOString().slice(11, 19)} UTC
                    </span>
                  </div>
                </div>

                <p className="text-slate-200 text-xs leading-relaxed">{ev.text}</p>

                <div className="flex items-center justify-between font-mono text-[10px] text-slate-400 tabular-nums">
                  <span>Engagement score: {ev.engagement}</span>
                  {ev.url && (
                    <a
                      href={ev.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[#C4B5FD] hover:underline"
                    >
                      Open Thread <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
