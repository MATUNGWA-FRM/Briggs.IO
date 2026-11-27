import React from 'react';
import { Check, RotateCcw } from 'lucide-react';
import {
  LAYOUT_PRESETS,
  WORKSPACE_TABS_META,
  type LayoutPresetId,
  type WorkspaceLayoutState,
  type WorkspaceTabId,
} from '../shared/layoutConfig';

export interface LayoutSettingsPanelProps {
  layout: WorkspaceLayoutState;
  onApplyPreset: (preset: Exclude<LayoutPresetId, 'CUSTOM'>) => void;
  onTogglePanel: (panel: 'showScanner' | 'showChart' | 'showLowerPanel' | 'showScorePanel') => void;
  onToggleTab: (tabId: WorkspaceTabId) => void;
  onResetLayout: () => void;
}

export const LayoutSettingsPanel: React.FC<LayoutSettingsPanelProps> = ({
  layout,
  onApplyPreset,
  onTogglePanel,
  onToggleTab,
  onResetLayout,
}) => {
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
    <div className="space-y-4 text-xs">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-semibold text-slate-100">Workspace Layout</h3>
          <p className="text-[11px] text-slate-400">
            Presets, panel visibility, and modular workspace tabs (saved automatically)
          </p>
        </div>
        <button
          type="button"
          onClick={onResetLayout}
          className="px-2.5 py-1 rounded-sm border border-[#1E2330] bg-[#12151E] hover:border-[#7C5CFF]/50 text-[11px] font-mono text-slate-300 hover:text-[#C4B5FD] inline-flex items-center gap-1"
        >
          <RotateCcw className="w-3 h-3" />
          Reset Layout
        </button>
      </div>

      {/* Presets */}
      <div className="p-3 rounded-sm border border-[#1E2330] bg-[#08090D] space-y-2">
        <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
          Layout Presets
        </div>
        <div className="grid grid-cols-3 gap-2">
          {presetItems.map((p) => {
            const active = layout.presetId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onApplyPreset(p.id)}
                title={p.hint}
                className={`px-2.5 py-2 rounded-sm border text-[11px] font-medium transition-colors text-left ${
                  active
                    ? 'bg-[#7C5CFF]/25 text-[#C4B5FD] border-[#7C5CFF]/60'
                    : 'bg-[#0C0E14] text-slate-300 border-[#1E2330] hover:border-[#2C3448]'
                }`}
              >
                <div>{p.label}</div>
                <div className="text-[10px] text-slate-400 mt-0.5 truncate">{p.hint}</div>
              </button>
            );
          })}
        </div>
        <div className="text-[10px] font-mono text-slate-500">
          {layout.presetId === 'CUSTOM'
            ? 'Custom dimensions & tabs saved automatically'
            : `Active preset: ${LAYOUT_PRESETS[layout.presetId].presetId.replace('_', ' ')}`}
        </div>
      </div>

      {/* Panel Visibility */}
      <div className="p-3 rounded-sm border border-[#1E2330] bg-[#08090D] space-y-2">
        <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
          Panels (Show / Hide)
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {panelItems.map((item) => {
            const enabled = layout[item.key];
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onTogglePanel(item.key)}
                className="px-2.5 py-2 rounded-sm border border-[#1E2330] bg-[#0C0E14] hover:border-[#2C3448] flex items-center justify-between text-left"
              >
                <span className={enabled ? 'text-slate-200' : 'text-slate-500'}>{item.label}</span>
                <span
                  className={`w-4 h-4 rounded-sm border flex items-center justify-center shrink-0 ${
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
      <div className="p-3 rounded-sm border border-[#1E2330] bg-[#08090D] space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
            Tabs & Widgets ({layout.openTabs.length}/{WORKSPACE_TABS_META.length})
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {WORKSPACE_TABS_META.map((tab) => {
            const enabled = layout.openTabs.includes(tab.id);
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onToggleTab(tab.id)}
                className="px-2.5 py-2 rounded-sm border border-[#1E2330] bg-[#0C0E14] hover:border-[#2C3448] flex items-center justify-between gap-2 text-left"
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
  );
};
