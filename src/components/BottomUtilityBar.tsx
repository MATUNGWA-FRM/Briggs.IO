import React, { useState } from 'react';
import {
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Globe,
  MessageSquare,
  Network,
  Radio,
  Users,
  X,
} from 'lucide-react';
import type { BubbleMapNode, BubbleMapPayload } from '../server/graph/bubbleMapBuilder';
import type { WorkspaceTabId } from '../shared/layoutConfig';
import type { HolderIntelligence, SocialIntelligence, SocialMentionEvent } from '../shared/types';
import { BubbleMap2D } from './BubbleMap2D';
import { BubbleMap3D } from './BubbleMap3D';
import { HoldersIntelligencePanel } from './HoldersIntelligencePanel';
import { LiveSocialTracker } from './LiveSocialTracker';

export type BottomUtilityId =
  | 'HOLDERS'
  | 'SOCIAL_TRACKER'
  | 'LIVE_TWEETS'
  | 'REDDIT_POSTS'
  | 'BUBBLE_2D'
  | 'BUBBLE_3D';

interface BottomUtilityBarProps {
  symbol: string;
  holders: HolderIntelligence;
  bubbleMap: BubbleMapPayload;
  selectedWallet: BubbleMapNode | null;
  onSelectWallet: (w: BubbleMapNode | null) => void;
  social: SocialIntelligence;
  socialEvents: SocialMentionEvent[];
  socialStreaming: boolean;
  onToggleSocialStreaming: () => void;
  onRefreshSocial: () => void;
  socialLoading: boolean;
  streaming: boolean;
  onOpenWorkspaceTab: (tabId: WorkspaceTabId) => void;
}

export const BottomUtilityBar: React.FC<BottomUtilityBarProps> = ({
  symbol,
  holders,
  bubbleMap,
  selectedWallet,
  onSelectWallet,
  social,
  socialEvents,
  socialStreaming,
  onToggleSocialStreaming,
  onRefreshSocial,
  socialLoading,
  streaming,
  onOpenWorkspaceTab,
}) => {
  const [activeUtility, setActiveUtility] = useState<BottomUtilityId | null>(null);

  const tweetCount = socialEvents.filter((e) => e.platform === 'x').length;
  const redditCount = socialEvents.filter((e) => e.platform === 'reddit').length;

  const toggleUtility = (id: BottomUtilityId) => {
    setActiveUtility((prev) => (prev === id ? null : id));
  };

  const tabForUtility = (id: BottomUtilityId): WorkspaceTabId => {
    if (id === 'HOLDERS') return 'HOLDERS';
    if (id === 'BUBBLE_2D') return 'BUBBLE_2D';
    if (id === 'BUBBLE_3D') return 'BUBBLE_3D';
    return 'SOCIAL_TRACKER';
  };

  const utilityTitle = (id: BottomUtilityId): string => {
    switch (id) {
      case 'HOLDERS':
        return `${symbol} · Holders & Bubble Map (${holders.holder_count.toLocaleString()} holders)`;
      case 'SOCIAL_TRACKER':
        return `${symbol} · Live Social Media Tracker`;
      case 'LIVE_TWEETS':
        return `${symbol} · Live Tweets (X)`;
      case 'REDDIT_POSTS':
        return `${symbol} · Coin-Related Reddit Posts`;
      case 'BUBBLE_2D':
        return `${symbol} · 2D Holder Relationship Map`;
      case 'BUBBLE_3D':
        return `${symbol} · 3D Holder Topology`;
    }
  };

  return (
    <div className="shrink-0 relative z-30">
      {/* Expandable Bottom Utility Drawer */}
      {activeUtility && (
        <div className="border-t border-[#7C5CFF]/50 bg-[#08090D] shadow-2xl flex flex-col max-h-[44vh]">
          <div className="px-3 py-1.5 border-b border-[#1E2330] bg-[#0C0E14] flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-[#00E599] shrink-0" />
              <span className="font-display text-xs font-semibold text-slate-100 truncate">
                {utilityTitle(activeUtility)}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  onOpenWorkspaceTab(tabForUtility(activeUtility));
                  setActiveUtility(null);
                }}
                className="px-2 py-0.5 rounded-sm border border-[#1E2330] bg-[#12151E] hover:border-[#7C5CFF]/60 text-[10px] font-mono text-[#C4B5FD] inline-flex items-center gap-1"
                title="Open in main workspace tab"
              >
                <span>Open Tab</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => setActiveUtility(null)}
                className="p-1 rounded-sm text-slate-400 hover:text-white hover:bg-[#171B26]"
                aria-label="Close utility drawer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3.5">
            {activeUtility === 'HOLDERS' && (
              <HoldersIntelligencePanel
                holders={holders}
                bubbleMap={bubbleMap}
                selectedWallet={selectedWallet}
                onSelectWallet={onSelectWallet}
              />
            )}

            {activeUtility === 'SOCIAL_TRACKER' && (
              <LiveSocialTracker
                symbol={symbol}
                events={socialEvents}
                social={social}
                streaming={streaming && socialStreaming}
                onToggleStreaming={onToggleSocialStreaming}
                onRefresh={onRefreshSocial}
                loading={socialLoading}
                initialPlatformFilter="ALL"
              />
            )}

            {activeUtility === 'LIVE_TWEETS' && (
              <LiveSocialTracker
                symbol={symbol}
                events={socialEvents}
                social={social}
                streaming={streaming && socialStreaming}
                onToggleStreaming={onToggleSocialStreaming}
                onRefresh={onRefreshSocial}
                loading={socialLoading}
                initialPlatformFilter="x"
              />
            )}

            {activeUtility === 'REDDIT_POSTS' && (
              <LiveSocialTracker
                symbol={symbol}
                events={socialEvents}
                social={social}
                streaming={streaming && socialStreaming}
                onToggleStreaming={onToggleSocialStreaming}
                onRefresh={onRefreshSocial}
                loading={socialLoading}
                initialPlatformFilter="reddit"
              />
            )}

            {activeUtility === 'BUBBLE_2D' && (
              <BubbleMap2D
                graph={bubbleMap}
                selectedWallet={selectedWallet}
                onSelectWallet={onSelectWallet}
              />
            )}

            {activeUtility === 'BUBBLE_3D' && (
              <BubbleMap3D
                graph={bubbleMap}
                selectedWallet={selectedWallet}
                onSelectWallet={onSelectWallet}
              />
            )}
          </div>
        </div>
      )}

      {/* Bottom Utility / Quick-Action Bar */}
      <footer className="h-8 px-2.5 border-t border-[#1E2330] bg-[#0C0E14] flex items-center justify-between gap-2 text-[11px] font-mono overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] text-slate-400 pr-1.5 border-r border-[#1E2330] shrink-0">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                streaming ? 'bg-[#00E599] animate-pulse' : 'bg-slate-500'
              }`}
            />
            <span className="text-slate-200 font-semibold">{symbol}</span>
          </span>

          <button
            type="button"
            onClick={() => toggleUtility('HOLDERS')}
            className={`px-2 py-0.5 rounded-sm border inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors ${
              activeUtility === 'HOLDERS'
                ? 'border-[#7C5CFF] bg-[#7C5CFF]/20 text-[#C4B5FD]'
                : 'border-[#1E2330] bg-[#08090D] text-slate-300 hover:border-[#2C3448] hover:text-white'
            }`}
          >
            <Users className="w-3 h-3 text-[#C4B5FD]" />
            <span>Holders</span>
            <span className="text-[10px] text-slate-400 tabular-nums">
              {holders.holder_count.toLocaleString()} · Top10 {holders.top_10_concentration_pct}%
            </span>
            {activeUtility === 'HOLDERS' ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronUp className="w-3 h-3 text-slate-500" />
            )}
          </button>

          <button
            type="button"
            onClick={() => toggleUtility('SOCIAL_TRACKER')}
            className={`px-2 py-0.5 rounded-sm border inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors ${
              activeUtility === 'SOCIAL_TRACKER'
                ? 'border-[#7C5CFF] bg-[#7C5CFF]/20 text-[#C4B5FD]'
                : 'border-[#1E2330] bg-[#08090D] text-slate-300 hover:border-[#2C3448] hover:text-white'
            }`}
          >
            <Radio className={`w-3 h-3 ${socialStreaming ? 'text-[#00E599]' : 'text-slate-500'}`} />
            <span>Social Tracker</span>
            <span className="text-[10px] text-[#00E599] tabular-nums">({socialEvents.length})</span>
          </button>

          <button
            type="button"
            onClick={() => toggleUtility('LIVE_TWEETS')}
            className={`px-2 py-0.5 rounded-sm border inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors ${
              activeUtility === 'LIVE_TWEETS'
                ? 'border-sky-500/70 bg-sky-500/15 text-sky-200'
                : 'border-[#1E2330] bg-[#08090D] text-slate-300 hover:border-sky-500/40 hover:text-white'
            }`}
          >
            <Globe className="w-3 h-3 text-sky-400" />
            <span>Live Tweets</span>
            <span className="text-[10px] text-sky-300 tabular-nums">({tweetCount})</span>
          </button>

          <button
            type="button"
            onClick={() => toggleUtility('REDDIT_POSTS')}
            className={`px-2 py-0.5 rounded-sm border inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors ${
              activeUtility === 'REDDIT_POSTS'
                ? 'border-orange-500/70 bg-orange-500/15 text-orange-200'
                : 'border-[#1E2330] bg-[#08090D] text-slate-300 hover:border-orange-500/40 hover:text-white'
            }`}
          >
            <MessageSquare className="w-3 h-3 text-orange-400" />
            <span>Reddit Posts</span>
            <span className="text-[10px] text-orange-300 tabular-nums">({redditCount})</span>
          </button>

          <button
            type="button"
            onClick={() => toggleUtility('BUBBLE_2D')}
            className={`hidden md:inline-flex px-2 py-0.5 rounded-sm border items-center gap-1 whitespace-nowrap shrink-0 transition-colors ${
              activeUtility === 'BUBBLE_2D'
                ? 'border-[#7C5CFF] bg-[#7C5CFF]/20 text-[#C4B5FD]'
                : 'border-[#1E2330] bg-[#08090D] text-slate-400 hover:text-slate-200'
            }`}
          >
            <Network className="w-3 h-3" />
            <span>2D Map</span>
          </button>

          <button
            type="button"
            onClick={() => toggleUtility('BUBBLE_3D')}
            className={`hidden md:inline-flex px-2 py-0.5 rounded-sm border items-center gap-1 whitespace-nowrap shrink-0 transition-colors ${
              activeUtility === 'BUBBLE_3D'
                ? 'border-[#7C5CFF] bg-[#7C5CFF]/20 text-[#C4B5FD]'
                : 'border-[#1E2330] bg-[#08090D] text-slate-400 hover:text-slate-200'
            }`}
          >
            <Network className="w-3 h-3" />
            <span>3D Map</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
