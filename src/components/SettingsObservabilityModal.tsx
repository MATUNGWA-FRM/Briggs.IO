import React, { useEffect, useState } from 'react';
import { Bell, BookOpen, LayoutTemplate, Palette, RotateCcw, Server, SlidersHorizontal, X } from 'lucide-react';
import type { LayoutPresetId, WorkspaceLayoutState, WorkspaceTabId } from '../shared/layoutConfig';
import type { NotificationPrefs } from '../shared/notificationConfig';
import { BRIGG_TERMINOLOGY } from '../shared/terminology';
import {
  DEFAULT_TERMINAL_COLORS,
  isDefaultThemeColors,
  type TerminalThemeColors,
} from '../shared/themeConfig';
import type { BriggFilterPreset, SystemObservability } from '../shared/types';
import { LayoutSettingsPanel } from './LayoutCustomizer';
import { NotificationSettingsControls } from './NotificationSettingsControls';

type SettingsTabId = 'LAYOUT' | 'COLORS' | 'NOTIFICATIONS' | 'OBSERVABILITY' | 'FILTERS' | 'GLOSSARY';

interface SettingsObservabilityModalProps {
  open: boolean;
  onClose: () => void;
  layout: WorkspaceLayoutState;
  onApplyPreset: (preset: Exclude<LayoutPresetId, 'CUSTOM'>) => void;
  onTogglePanel: (panel: 'showScanner' | 'showChart' | 'showLowerPanel' | 'showScorePanel') => void;
  onToggleTab: (tabId: WorkspaceTabId) => void;
  onResetLayout: () => void;
  themeColors: TerminalThemeColors;
  onChangeThemeColors: (next: TerminalThemeColors) => void;
  onResetDefaultColors: () => void;
  notificationPrefs: NotificationPrefs;
  onChangeNotificationPrefs: (next: NotificationPrefs) => void;
  activeBuyBarCount: number;
  onClearAllBuyNotifications: () => void;
}

const COLOR_FIELDS: Array<{ key: keyof TerminalThemeColors; label: string; hint: string }> = [
  { key: 'bgCanvas', label: 'Canvas Background', hint: 'Main terminal backdrop (#07080C)' },
  { key: 'bgSurface', label: 'Panel Surface', hint: 'Cards, sidebars & headers (#0C0E14)' },
  { key: 'borderColor', label: 'Grid & Borders', hint: 'Dividers & pane borders (#1E2330)' },
  { key: 'accentColor', label: 'Primary Accent', hint: 'Active tabs & highlights (#7C5CFF)' },
  { key: 'bullColor', label: 'Pump / Bullish', hint: 'Buy pressure & positive delta (#00E599)' },
  { key: 'bearColor', label: 'Dump / Bearish', hint: 'Sell pressure & risk alerts (#FF4D6A)' },
];

export const SettingsObservabilityModal: React.FC<SettingsObservabilityModalProps> = ({
  open,
  onClose,
  layout,
  onApplyPreset,
  onTogglePanel,
  onToggleTab,
  onResetLayout,
  themeColors,
  onChangeThemeColors,
  onResetDefaultColors,
  notificationPrefs,
  onChangeNotificationPrefs,
  activeBuyBarCount,
  onClearAllBuyNotifications,
}) => {
  const [tab, setTab] = useState<SettingsTabId>('LAYOUT');
  const [obs, setObs] = useState<SystemObservability | null>(null);
  const [presets, setPresets] = useState<BriggFilterPreset[]>([]);

  useEffect(() => {
    if (!open) return;
    fetch('/api/observability').then((r) => r.json()).then(setObs).catch(() => {});
    fetch('/api/presets').then((r) => r.json()).then((d) => setPresets(d.presets || [])).catch(() => {});
  }, [open]);

  if (!open) return null;

  const isDefaultColors = isDefaultThemeColors(themeColors);

  const tabs: Array<{ id: SettingsTabId; label: string; icon: React.ReactNode }> = [
    { id: 'LAYOUT', label: 'Layout', icon: <LayoutTemplate className="w-3.5 h-3.5" /> },
    { id: 'COLORS', label: 'Colors', icon: <Palette className="w-3.5 h-3.5" /> },
    { id: 'NOTIFICATIONS', label: 'Notifications', icon: <Bell className="w-3.5 h-3.5" /> },
    { id: 'OBSERVABILITY', label: 'Observability', icon: <Server className="w-3.5 h-3.5" /> },
    { id: 'FILTERS', label: 'Heuristics', icon: <SlidersHorizontal className="w-3.5 h-3.5" /> },
    { id: 'GLOSSARY', label: 'Glossary', icon: <BookOpen className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/65">
      <div className="w-full max-w-2xl h-full bg-[#0C0E14] border-l border-[#1E2330] flex flex-col text-xs shadow-2xl">
        {/* Unified Settings Bar Header */}
        <div className="px-4 py-3 border-b border-[#1E2330] bg-[#08090D] flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-sm font-bold text-slate-100">
              Brigg.AI Settings Bar
            </h2>
            <p className="text-[11px] text-slate-400">
              Workspace layout, terminal colors, notifications, heuristics & telemetry
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Horizontal Settings Section Switcher */}
        <div className="px-4 py-2 border-b border-[#1E2330] bg-[#0C0E14] flex items-center gap-1 overflow-x-auto shrink-0">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-2.5 py-1.5 rounded-sm border inline-flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                tab === t.id
                  ? 'bg-[#7C5CFF]/20 text-[#C4B5FD] border-[#7C5CFF]/50'
                  : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-[#141824]'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {tab === 'LAYOUT' && (
            <div className="space-y-4">
              <LayoutSettingsPanel
                layout={layout}
                onApplyPreset={onApplyPreset}
                onTogglePanel={onTogglePanel}
                onToggleTab={onToggleTab}
                onResetLayout={onResetLayout}
              />

              <div className="p-3 rounded-sm border border-[#1E2330] bg-[#08090D] flex items-center justify-between gap-3">
                <div>
                  <div className="font-display font-semibold text-slate-100">Terminal Color Theme</div>
                  <div className="text-[11px] text-slate-400">
                    {isDefaultColors
                      ? 'Using default Brigg.AI dark terminal colors'
                      : 'Custom terminal colors active'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onResetDefaultColors}
                  className="px-2.5 py-1 rounded-sm border border-[#1E2330] bg-[#12151E] hover:border-[#7C5CFF]/50 text-[11px] font-mono text-slate-200 hover:text-[#C4B5FD] inline-flex items-center gap-1.5 shrink-0"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset Default Colors
                </button>
              </div>
            </div>
          )}

          {tab === 'COLORS' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-display font-semibold text-slate-100">Terminal Colors</h3>
                  <p className="text-[11px] text-slate-400">
                    Customize canvas, panel, border, accent, and signal colors or revert to the default dark palette.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onResetDefaultColors}
                  className="px-3 py-1.5 rounded-sm border border-[#7C5CFF]/50 bg-[#7C5CFF]/15 hover:bg-[#7C5CFF]/25 text-[11px] font-mono font-semibold text-[#C4B5FD] inline-flex items-center gap-1.5 shrink-0 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset Default Colors
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {COLOR_FIELDS.map((field) => {
                  const currentVal = themeColors[field.key];
                  const defaultVal = DEFAULT_TERMINAL_COLORS[field.key];
                  return (
                    <div
                      key={field.key}
                      className="p-3 rounded-sm border border-[#1E2330] bg-[#08090D] flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-slate-100 truncate">{field.label}</div>
                        <div className="text-[10px] text-slate-400 truncate">{field.hint}</div>
                        <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                          Current: <span className="text-slate-300">{currentVal}</span> · Default: {defaultVal}
                        </div>
                      </div>
                      <input
                        type="color"
                        value={currentVal}
                        onChange={(e) =>
                          onChangeThemeColors({
                            ...themeColors,
                            [field.key]: e.target.value.toUpperCase(),
                          })
                        }
                        aria-label={field.label}
                        className="w-9 h-9 rounded-sm border border-[#1E2330] bg-transparent cursor-pointer shrink-0"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'NOTIFICATIONS' && (
            <div className="space-y-4">
              <NotificationSettingsControls
                prefs={notificationPrefs}
                onChangePrefs={onChangeNotificationPrefs}
                activeBarCount={activeBuyBarCount}
                onClearAll={onClearAllBuyNotifications}
              />

              <div className="p-3 rounded-sm border border-[#1E2330] bg-[#08090D] space-y-1.5 text-[11px] text-slate-300">
                <div className="font-display font-semibold text-slate-100">Timing Rules</div>
                <p className="text-slate-400">
                  • On-screen pop-up card displays for <span className="font-mono text-[#00E599]">2.5 seconds</span> at your selected corner (or can be hidden anytime).
                </p>
                <p className="text-slate-400">
                  • Every incoming buy notification remains inside the <span className="font-mono text-[#C4B5FD]">Notification Bar</span> for <span className="font-mono text-[#C4B5FD]">2 minutes</span> unless manually deleted.
                </p>
              </div>
            </div>
          )}

          {tab === 'OBSERVABILITY' && obs && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono tabular-nums">
                <div className="p-3 rounded-sm border border-[#1E2330] bg-[#08090D]">
                  <div className="text-[10px] text-slate-400 font-sans">System Status</div>
                  <div className="text-sm font-bold text-[#00E599]">{obs.status}</div>
                </div>
                <div className="p-3 rounded-sm border border-[#1E2330] bg-[#08090D]">
                  <div className="text-[10px] text-slate-400 font-sans">Database</div>
                  <div className="text-sm font-bold text-slate-100">{obs.database_status}</div>
                </div>
                <div className="p-3 rounded-sm border border-[#1E2330] bg-[#08090D]">
                  <div className="text-[10px] text-slate-400 font-sans">Prod ML Model</div>
                  <div className="text-sm font-bold text-[#C4B5FD]">{obs.production_model_version}</div>
                </div>
                <div className="p-3 rounded-sm border border-[#1E2330] bg-[#08090D]">
                  <div className="text-[10px] text-slate-400 font-sans">Avg Proc Latency</div>
                  <div className="text-sm font-bold text-slate-100">{obs.pipeline_metrics.avg_processing_latency_ms} ms</div>
                </div>
              </div>

              <div className="p-3 rounded-sm border border-[#1E2330] bg-[#08090D]">
                <h3 className="font-display font-semibold text-slate-100 mb-2">Approved Data Providers Status</h3>
                <table className="w-full text-left font-mono text-[11px] tabular-nums">
                  <thead className="text-slate-400 border-b border-[#1E2330]">
                    <tr>
                      <th className="py-1.5 pr-3">Provider</th>
                      <th className="py-1.5 pr-3">Category</th>
                      <th className="py-1.5 pr-3">Mode</th>
                      <th className="py-1.5 pr-3 text-right">Avg Latency</th>
                      <th className="py-1.5 text-right">Success Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E2330]/60">
                    {obs.providers.map((p) => (
                      <tr key={p.provider}>
                        <td className="py-1.5 pr-3 uppercase text-slate-200">{p.provider}</td>
                        <td className="py-1.5 pr-3 text-slate-400">{p.category}</td>
                        <td className={`py-1.5 pr-3 ${p.mode === 'LIVE_API' ? 'text-[#00E599]' : 'text-amber-400'}`}>
                          {p.mode}
                        </td>
                        <td className="py-1.5 pr-3 text-right text-slate-300">{p.last_latency_ms} ms</td>
                        <td className="py-1.5 text-right text-slate-300">{p.success_rate_pct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-3 rounded-sm border border-[#1E2330] bg-[#08090D]">
                <h3 className="font-display font-semibold text-slate-100 mb-2">Recent Security & ML Audit Logs</h3>
                <div className="space-y-1 font-mono text-[11px] max-h-44 overflow-y-auto">
                  {obs.recent_audit_logs.map((l) => (
                    <div key={l.id} className="text-slate-300 border-b border-[#1E2330]/50 pb-1">
                      <span className="text-slate-500">{l.timestamp.slice(11, 19)}</span> ·{' '}
                      <span className="text-[#C4B5FD]">{l.action}</span> · {l.detail}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'FILTERS' && (
            <div className="space-y-3">
              <p className="text-slate-400">
                Brigg Initial Filter Heuristics (§23). These thresholds are configurable starting priors, not permanent truths, and are evaluated against historical outcomes.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {presets.map((p) => (
                  <div key={p.id} className="p-3 rounded-sm border border-[#1E2330] bg-[#08090D] font-mono text-[11px] space-y-1">
                    <div className="font-display text-sm font-semibold text-slate-100">{p.label}</div>
                    <div className="text-slate-300">
                      MC: ${p.min_mc_usd.toLocaleString()} – ${p.max_mc_usd.toLocaleString()}
                    </div>
                    <div className="text-slate-300">
                      Liq Min: ${p.min_liquidity_usd.toLocaleString()} · Age: {p.min_age_minutes}m – {p.max_age_minutes}m
                    </div>
                    <div className="text-slate-400">
                      Top10 ≤ {p.max_top10_pct}% · Dev ≤ {p.max_dev_pct}% · Sniper ≤ {p.max_sniper_pct}% · Bundle ≤ {p.max_bundle_pct}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'GLOSSARY' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {BRIGG_TERMINOLOGY.map((entry) => (
                <div key={entry.term} className="p-3 rounded-sm border border-[#1E2330] bg-[#08090D] space-y-1">
                  <div className="font-display text-sm font-semibold text-[#C4B5FD]">{entry.term}</div>
                  <p className="text-slate-200 leading-relaxed">{entry.definition}</p>
                  <p className="text-[11px] text-amber-300/90">Caveat: {entry.analytical_caveat}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
