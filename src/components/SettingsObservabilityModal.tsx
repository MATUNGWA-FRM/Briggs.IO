import React, { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  BookOpen,
  Check,
  LayoutTemplate,
  Palette,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Server,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import type { LayoutPresetId, WorkspaceLayoutState, WorkspaceTabId } from '../shared/layoutConfig';
import type { NotificationPrefs } from '../shared/notificationConfig';
import type { TerminologyEntry } from '../shared/terminology';
import {
  APP_THEME_PRESETS,
  DEFAULT_TERMINAL_COLORS,
  findMatchingThemePresetId,
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
  glossaryEntries: TerminologyEntry[];
  lastGlossaryAddedCount: number;
  onAddGlossaryTerm: (input: { term: string; definition: string; analytical_caveat?: string }) => void;
  onRemoveGlossaryTerm: (term: string) => void;
  onSyncGlossary: () => void;
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
  glossaryEntries,
  lastGlossaryAddedCount,
  onAddGlossaryTerm,
  onRemoveGlossaryTerm,
  onSyncGlossary,
  notificationPrefs,
  onChangeNotificationPrefs,
  activeBuyBarCount,
  onClearAllBuyNotifications,
}) => {
  const [tab, setTab] = useState<SettingsTabId>('LAYOUT');
  const [obs, setObs] = useState<SystemObservability | null>(null);
  const [presets, setPresets] = useState<BriggFilterPreset[]>([]);
  const [glossaryQuery, setGlossaryQuery] = useState('');
  const [addWordOpen, setAddWordOpen] = useState(false);
  const [newTerm, setNewTerm] = useState('');
  const [newDef, setNewDef] = useState('');
  const [newCaveat, setNewCaveat] = useState('');

  useEffect(() => {
    if (!open) return;
    fetch('/api/observability').then((r) => r.json()).then(setObs).catch(() => {});
    fetch('/api/presets').then((r) => r.json()).then((d) => setPresets(d.presets || [])).catch(() => {});
  }, [open]);

  const filteredGlossary = useMemo(() => {
    const q = glossaryQuery.trim().toLowerCase();
    if (!q) return glossaryEntries;
    return glossaryEntries.filter(
      (entry) =>
        entry.term.toLowerCase().includes(q) ||
        entry.definition.toLowerCase().includes(q) ||
        entry.analytical_caveat.toLowerCase().includes(q)
    );
  }, [glossaryEntries, glossaryQuery]);

  if (!open) return null;

  const isDefaultColors = isDefaultThemeColors(themeColors);
  const activePresetId = findMatchingThemePresetId(themeColors);

  const handleAddGlossarySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTerm.trim() || !newDef.trim()) return;
    onAddGlossaryTerm({
      term: newTerm,
      definition: newDef,
      analytical_caveat: newCaveat,
    });
    setNewTerm('');
    setNewDef('');
    setNewCaveat('');
    setAddWordOpen(false);
  };

  const tabs: Array<{ id: SettingsTabId; label: string; icon: React.ReactNode }> = [
    { id: 'LAYOUT', label: 'Layout', icon: <LayoutTemplate className="w-3.5 h-3.5" /> },
    { id: 'COLORS', label: 'Themes & Colors', icon: <Palette className="w-3.5 h-3.5" /> },
    { id: 'NOTIFICATIONS', label: 'Notifications', icon: <Bell className="w-3.5 h-3.5" /> },
    { id: 'OBSERVABILITY', label: 'Observability', icon: <Server className="w-3.5 h-3.5" /> },
    { id: 'FILTERS', label: 'Heuristics', icon: <SlidersHorizontal className="w-3.5 h-3.5" /> },
    { id: 'GLOSSARY', label: `Glossary (${glossaryEntries.length})`, icon: <BookOpen className="w-3.5 h-3.5" /> },
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
                  <h3 className="font-display font-semibold text-slate-100">App Themes &amp; Terminal Colors</h3>
                  <p className="text-[11px] text-slate-400">
                    Pick a curated app theme or fine-tune individual terminal colors.
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

              {/* App Themes Grid */}
              <div className="p-3 rounded-sm border border-[#1E2330] bg-[#08090D] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    App Themes ({APP_THEME_PRESETS.length})
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {activePresetId ? 'Preset Active' : 'Custom Palette'}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {APP_THEME_PRESETS.map((preset) => {
                    const active = activePresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => onChangeThemeColors({ ...preset.colors })}
                        className={`p-2.5 rounded-sm border text-left transition-colors ${
                          active
                            ? 'border-[#7C5CFF] bg-[#7C5CFF]/15'
                            : 'border-[#1E2330] bg-[#0C0E14] hover:border-[#2C3448]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-display font-semibold text-slate-100 truncate">
                            {preset.name}
                          </span>
                          {active && <Check className="w-3.5 h-3.5 text-[#00E599] shrink-0" />}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate mt-0.5">{preset.description}</div>
                        <div className="flex items-center gap-1.5 mt-2">
                          {[
                            preset.colors.bgCanvas,
                            preset.colors.bgSurface,
                            preset.colors.borderColor,
                            preset.colors.accentColor,
                            preset.colors.bullColor,
                            preset.colors.bearColor,
                          ].map((hex, i) => (
                            <span
                              key={i}
                              className="w-4 h-3 rounded-sm border border-white/15"
                              style={{ backgroundColor: hex }}
                              title={hex}
                            />
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Fine-Grain Color Pickers */}
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
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-display font-semibold text-slate-100">
                    Auto-Updating Trading Glossary
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Automatically adds newly encountered terms from live coin streams, signals &amp; social posts
                    {lastGlossaryAddedCount > 0 && (
                      <span className="ml-1.5 text-[#00E599] font-mono">
                        (+{lastGlossaryAddedCount} newly synced)
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={onSyncGlossary}
                    className="px-2.5 py-1 rounded-sm border border-[#1E2330] bg-[#12151E] hover:border-[#7C5CFF]/60 text-[11px] font-mono text-slate-200 inline-flex items-center gap-1"
                    title="Scan current coin and feed for new terms"
                  >
                    <RefreshCw className="w-3 h-3 text-[#00E599]" />
                    Sync New Words
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddWordOpen((v) => !v)}
                    className="px-2.5 py-1 rounded-sm border border-[#7C5CFF]/60 bg-[#7C5CFF]/20 hover:bg-[#7C5CFF]/30 text-[11px] font-mono text-[#C4B5FD] inline-flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Add Word
                  </button>
                </div>
              </div>

              {addWordOpen && (
                <form
                  onSubmit={handleAddGlossarySubmit}
                  className="p-3 rounded-sm border border-[#7C5CFF]/50 bg-[#08090D] space-y-2"
                >
                  <div className="font-mono text-[10px] uppercase tracking-wider text-[#C4B5FD]">
                    Add New Word to Glossary
                  </div>
                  <input
                    type="text"
                    value={newTerm}
                    onChange={(e) => setNewTerm(e.target.value)}
                    placeholder="Word or acronym (e.g., Liquidity Sweep, Jeet, CTO)..."
                    className="w-full bg-[#0C0E14] border border-[#1E2330] rounded-sm px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-[#7C5CFF]"
                    required
                  />
                  <textarea
                    value={newDef}
                    onChange={(e) => setNewDef(e.target.value)}
                    placeholder="Clear definition..."
                    rows={2}
                    className="w-full bg-[#0C0E14] border border-[#1E2330] rounded-sm px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-[#7C5CFF]"
                    required
                  />
                  <input
                    type="text"
                    value={newCaveat}
                    onChange={(e) => setNewCaveat(e.target.value)}
                    placeholder="Analytical caveat (optional)..."
                    className="w-full bg-[#0C0E14] border border-[#1E2330] rounded-sm px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-[#7C5CFF]"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setAddWordOpen(false)}
                      className="px-2.5 py-1 rounded-sm border border-[#1E2330] text-slate-400 hover:text-slate-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 rounded-sm bg-[#7C5CFF] hover:bg-[#6D4AFF] text-white font-semibold"
                    >
                      Save Word
                    </button>
                  </div>
                </form>
              )}

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={glossaryQuery}
                  onChange={(e) => setGlossaryQuery(e.target.value)}
                  placeholder="Search glossary words or definitions..."
                  className="w-full bg-[#08090D] border border-[#1E2330] rounded-sm pl-8 pr-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-[#7C5CFF]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredGlossary.map((entry) => (
                  <div key={entry.term} className="p-3 rounded-sm border border-[#1E2330] bg-[#08090D] space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-display text-sm font-semibold text-[#C4B5FD]">{entry.term}</div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {entry.source === 'AUTO_DETECTED' && (
                          <span className="px-1.5 py-0.5 rounded-sm border border-[#00E599]/40 bg-[#00E599]/10 text-[9px] font-mono text-[#00E599]">
                            AUTO
                          </span>
                        )}
                        {entry.source === 'CUSTOM' && (
                          <span className="px-1.5 py-0.5 rounded-sm border border-[#7C5CFF]/40 bg-[#7C5CFF]/15 text-[9px] font-mono text-[#C4B5FD]">
                            CUSTOM
                          </span>
                        )}
                        {entry.source && entry.source !== 'CORE' && (
                          <button
                            type="button"
                            onClick={() => onRemoveGlossaryTerm(entry.term)}
                            className="text-slate-500 hover:text-[#FF4D6A]"
                            title="Remove term"
                            aria-label={`Remove ${entry.term}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-slate-200 leading-relaxed">{entry.definition}</p>
                    <p className="text-[11px] text-amber-300/90">Caveat: {entry.analytical_caveat}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
