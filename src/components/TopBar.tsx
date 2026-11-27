import React, { useEffect, useRef, useState } from 'react';
import { Bell, BrainCircuit, Search, Settings, ShieldAlert } from 'lucide-react';
import type { LayoutPresetId, WorkspaceLayoutState, WorkspaceTabId } from '../shared/layoutConfig';
import type { BriggMode, Horizon } from '../shared/types';
import { LayoutCustomizer } from './LayoutCustomizer';

interface TopBarProps {
  mode: BriggMode;
  onModeChange: (m: BriggMode) => void;
  horizon: Horizon;
  onHorizonChange: (h: Horizon) => void;
  activeView: 'TERMINAL' | 'MODEL_CENTER';
  onViewChange: (v: 'TERMINAL' | 'MODEL_CENTER') => void;
  onTokenSearch: (queryOrAddress: string) => void;
  unreadAlertsCount: number;
  onOpenAlerts: () => void;
  onOpenSettings: () => void;
  dataStatus: string;
  streaming: boolean;
  layout: WorkspaceLayoutState;
  onApplyPreset: (preset: Exclude<LayoutPresetId, 'CUSTOM'>) => void;
  onTogglePanel: (panel: 'showScanner' | 'showChart' | 'showLowerPanel' | 'showScorePanel') => void;
  onToggleTab: (tabId: WorkspaceTabId) => void;
  onResetLayout: () => void;
}

const HORIZONS: Horizon[] = ['4M', '15M', '1H', '4H', '24H'];

export const TopBar: React.FC<TopBarProps> = ({
  mode,
  onModeChange,
  horizon,
  onHorizonChange,
  activeView,
  onViewChange,
  onTokenSearch,
  unreadAlertsCount,
  onOpenAlerts,
  onOpenSettings,
  dataStatus,
  streaming,
  layout,
  onApplyPreset,
  onTogglePanel,
  onToggleTab,
  onResetLayout,
}) => {
  const [searchInput, setSearchInput] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      onTokenSearch(searchInput.trim());
    }
  };

  return (
    <header className="h-12 border-b border-[#1E2330] bg-[#0C0E14] px-3 flex items-center justify-between gap-3 shrink-0">
      {/* Brand Zone — Padre Terminal Styling */}
      <div className="flex items-center gap-4 shrink-0">
        <button
          type="button"
          onClick={() => onViewChange('TERMINAL')}
          className="flex items-center gap-2 text-left whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#7C5CFF] rounded"
        >
          <span className="w-6 h-6 rounded bg-[#7C5CFF]/20 border border-[#7C5CFF]/60 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-[#C4B5FD]" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M4 17L10 11L14 15L20 7" />
              <path d="M15 7H20V12" />
            </svg>
          </span>
          <span className="font-display text-sm font-bold tracking-tight text-slate-100">
            Brigg<span className="text-[#9D7BFF]">.AI</span>
          </span>
        </button>

        <nav className="hidden md:flex items-center gap-1 text-xs font-medium">
          <button
            type="button"
            onClick={() => onViewChange('TERMINAL')}
            className={`whitespace-nowrap shrink-0 px-2.5 py-1.5 rounded-sm transition-colors ${
              activeView === 'TERMINAL'
                ? 'bg-[#171B26] text-slate-100 border border-[#282F42]'
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            Terminal
          </button>
          <button
            type="button"
            onClick={() => onViewChange('MODEL_CENTER')}
            className={`whitespace-nowrap shrink-0 px-2.5 py-1.5 rounded-sm flex items-center gap-1.5 transition-colors ${
              activeView === 'MODEL_CENTER'
                ? 'bg-[#171B26] text-slate-100 border border-[#282F42]'
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <BrainCircuit className="w-3.5 h-3.5 text-[#9D7BFF]" />
            ML Center
          </button>
        </nav>
      </div>

      {/* Controls: Search, Chain, Mode, Horizon */}
      <div className="flex items-center gap-2 flex-1 justify-center max-w-4xl min-w-0">
        <form onSubmit={handleSubmit} className="relative flex-1 max-w-md min-w-[160px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search token or paste Solana CA... (/)"
            className="w-full bg-[#07080C] border border-[#1E2330] rounded-sm pl-8 pr-16 py-1 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#7C5CFF] font-mono"
          />
          <button
            type="submit"
            className="absolute right-1 top-1/2 -translate-y-1/2 px-2 py-0.5 text-[10px] font-mono font-semibold bg-[#171B26] hover:bg-[#23293A] text-[#C4B5FD] border border-[#282F42] rounded-sm transition-colors"
          >
            GO
          </button>
        </form>

        <div className="hidden lg:flex items-center text-[11px] font-mono text-slate-400 px-2 py-1 border border-[#1E2330] rounded-sm bg-[#07080C] whitespace-nowrap shrink-0">
          SOL
        </div>

        <div className="flex items-center bg-[#07080C] border border-[#1E2330] rounded-sm p-0.5 shrink-0" role="group" aria-label="Analytical Mode">
          <button
            type="button"
            onClick={() => onModeChange('SHITCOIN')}
            className={`px-2 py-0.5 text-[11px] font-medium rounded-sm transition-colors whitespace-nowrap shrink-0 ${
              mode === 'SHITCOIN'
                ? 'bg-[#7C5CFF]/25 text-[#C4B5FD] border border-[#7C5CFF]/50'
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            Shitcoin
          </button>
          <button
            type="button"
            onClick={() => onModeChange('MEMECOIN')}
            className={`px-2 py-0.5 text-[11px] font-medium rounded-sm transition-colors whitespace-nowrap shrink-0 ${
              mode === 'MEMECOIN'
                ? 'bg-[#7C5CFF]/25 text-[#C4B5FD] border border-[#7C5CFF]/50'
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            Memecoin
          </button>
        </div>

        <div className="hidden xl:flex items-center bg-[#07080C] border border-[#1E2330] rounded-sm p-0.5 shrink-0" role="group" aria-label="Prediction Horizon">
          {HORIZONS.map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => onHorizonChange(h)}
              className={`px-1.5 py-0.5 text-[11px] font-mono rounded-sm transition-colors whitespace-nowrap shrink-0 ${
                horizon === h
                  ? 'bg-[#1D2230] text-slate-100 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {h}
            </button>
          ))}
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span
          className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-mono text-slate-300 px-2 py-1 border border-[#1E2330] rounded-sm bg-[#07080C] whitespace-nowrap"
          title="Analysis only — V1 never executes autonomous trades or holds keys"
        >
          <ShieldAlert className="w-3 h-3 text-amber-400" />
          <span className={streaming ? 'text-[#00E599]' : 'text-slate-400'}>
            {streaming ? 'LIVE' : 'PAUSED'}
          </span>
          <span className="text-slate-500">·</span>
          <span>{dataStatus}</span>
        </span>

        {activeView === 'TERMINAL' && (
          <LayoutCustomizer
            layout={layout}
            onApplyPreset={onApplyPreset}
            onTogglePanel={onTogglePanel}
            onToggleTab={onToggleTab}
            onResetLayout={onResetLayout}
          />
        )}

        <button
          type="button"
          onClick={onOpenAlerts}
          className="relative px-2 py-1 text-xs font-medium text-slate-300 hover:text-white bg-[#12151E] border border-[#1E2330] hover:border-[#2C3448] rounded-sm flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
          aria-label="Open Alerts"
        >
          <Bell className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Alerts</span>
          {unreadAlertsCount > 0 && (
            <span className="font-mono text-[11px] text-amber-400 tabular-nums">({unreadAlertsCount})</span>
          )}
        </button>

        <button
          type="button"
          onClick={onOpenSettings}
          className="px-2 py-1 text-xs font-medium text-slate-300 hover:text-white bg-[#12151E] border border-[#1E2330] hover:border-[#2C3448] rounded-sm flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
          aria-label="Settings and Knowledge Layer"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
