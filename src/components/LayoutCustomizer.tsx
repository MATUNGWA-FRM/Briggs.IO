import React, { useEffect, useRef, useState } from 'react';
import { Check, LayoutTemplate, RotateCcw } from 'lucide-react';
import {
  LAYOUT_PRESETS,
  WORKSPACE_TABS_META,
  type LayoutPresetId,
  type WorkspaceLayoutState,
  type WorkspaceTabId,
} from '../shared/layoutConfig';

interface LayoutCustomizerProps {
  layout: WorkspaceLayoutState;
  onApplyPreset: (preset: Exclude<LayoutPresetId, 'CUSTOM'>) => void;
  onTogglePanel: (panel: 'showScanner' | 'showChart' | 'showLowerPanel' | 'showScorePanel') => void;
  onToggleTab: (tabId: WorkspaceTabId) => void;
  onResetLayout: () => void;
}

export const LayoutCustomizer: React.FC<LayoutCustomizerProps> = ({
  layout,
  onApplyPreset,
  onTogglePanel,
  onToggleTab,
  onResetLayout,
}) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const presetItems: Array<{ id: Exclude<LayoutPresetId, 'CUSTOM'>; label: string; hint: string }> = [
    { id: 'DEFAULT', label: 'Default', hint: 'Balanced 3-column terminal' },
    { id: 'CHART_FOCUS', label: 'Chart Focus', hint: 'Expanded live chart + tape' },
    { id: 'ANALYSIS_FOCUS', label: 'Analysis Focus', hint: 'Deep forensics & multi-tab view' },
  ];

  const panelItems: Array<{
    key: 'showScanner' | 'showChart' | 'showLowerPanel' | 'showScorePanel';
    label: string;
  }> = [
    { key: 'showScanner', label: 'Left Scanner (Trenches)' },
    { key: 'showChart', label: 'Center Price Chart' },
    { key: 'showLowerPanel', label: 'Lower Tabs Workspace' },
    { key: 'showScorePanel', label: 'Right Risk & Score Panel' },
  ];

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`px-2 py-1 text-xs font-medium rounded-sm border flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
          open
            ? 'bg-[#7C5CFF]/25 text-[#C4B5FD] border-[#7C5CFF]/50'
            : 'bg-[#12151E] text-slate-300 hover:text-white border-[#1E2330] hover:border-[#2C3448]'
        }`}
        aria-expanded={open}
        aria-label="Customize Layout"
      >
        <LayoutTemplate className="w-3.5 h-3.5 text-[#9D7BFF]" />
        <span className="hidden sm:inline">Layout</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-80 max-w-[92vw] rounded-sm border border-[#282F42] bg-[#0C0E14] shadow-2xl z-50 text-xs overflow-hidden">
          {/* Header */}
          <div className="px-3 py-2 border-b border-[#1E2330] bg-[#12151E] flex items-center justify-between">
            <span className="font-display font-semibold text-slate-100">Customize Workspace</span>
            <button
              type="button"
              onClick={() => {
                onResetLayout();
                setOpen(false);
              }}
              className="text-[11px] font-mono text-slate-300 hover:text-[#C4B5FD] inline-flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Reset Layout
            </button>
          </div>

          <div className="p-3 space-y-3.5 max-h-[75vh] overflow-y-auto">
            {/* Presets */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                Layout Presets
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {presetItems.map((p) => {
                  const active = layout.presetId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => onApplyPreset(p.id)}
                      title={p.hint}
                      className={`px-2 py-1.5 rounded-sm border text-[11px] font-medium transition-colors text-center ${
                        active
                          ? 'bg-[#7C5CFF]/25 text-[#C4B5FD] border-[#7C5CFF]/60'
                          : 'bg-[#07080C] text-slate-300 border-[#1E2330] hover:border-[#2C3448]'
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
              <div className="text-[10px] text-slate-500">
                {layout.presetId === 'CUSTOM'
                  ? 'Custom dimensions & tabs saved automatically'
                  : `Active preset: ${LAYOUT_PRESETS[layout.presetId].presetId.replace('_', ' ')}`}
              </div>
            </div>

            {/* Panel Visibility */}
            <div className="space-y-1.5 pt-2 border-t border-[#1E2330]">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                Panels (Show / Hide)
              </div>
              <div className="space-y-1">
                {panelItems.map((item) => {
                  const enabled = layout[item.key];
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => onTogglePanel(item.key)}
                      className="w-full px-2.5 py-1.5 rounded-sm border border-[#1E2330] bg-[#07080C] hover:border-[#2C3448] flex items-center justify-between text-left"
                    >
                      <span className={enabled ? 'text-slate-200' : 'text-slate-500'}>{item.label}</span>
                      <span
                        className={`w-4 h-4 rounded-sm border flex items-center justify-center ${
                          enabled
                            ? 'bg-[#7C5CFF]/25 border-[#7C5CFF] text-[#C4B5FD]'
                            : 'border-[#282F42] text-transparent'
                        }`}
                      >
                        <Check className="w-3 h-3" />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Modular Tabs Manager */}
            <div className="space-y-1.5 pt-2 border-t border-[#1E2330]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  Tabs & Widgets ({layout.openTabs.length}/{WORKSPACE_TABS_META.length})
                </span>
              </div>
              <div className="space-y-1">
                {WORKSPACE_TABS_META.map((tab) => {
                  const enabled = layout.openTabs.includes(tab.id);
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => onToggleTab(tab.id)}
                      className="w-full px-2.5 py-1.5 rounded-sm border border-[#1E2330] bg-[#07080C] hover:border-[#2C3448] flex items-center justify-between gap-2 text-left"
                    >
                      <div className="min-w-0">
                        <div className={`font-medium truncate ${enabled ? 'text-slate-200' : 'text-slate-500'}`}>
                          {tab.label}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">{tab.description}</div>
                      </div>
                      <span
                        className={`w-4 h-4 rounded-sm border flex items-center justify-center shrink-0 ${
                          enabled
                            ? 'bg-[#00E599]/20 border-[#00E599]/70 text-[#00E599]'
                            : 'border-[#282F42] text-transparent'
                        }`}
                      >
                        <Check className="w-3 h-3" />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
