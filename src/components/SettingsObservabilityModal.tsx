import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  Bell,
  BookOpen,
  BrainCircuit,
  Check,
  HelpCircle,
  LayoutTemplate,
  Palette,
  Plus,
  Radar,
  Radio,
  RefreshCw,
  RotateCcw,
  Search,
  Server,
  ShieldAlert,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import type { LayoutPresetId, WorkspaceLayoutState, WorkspaceTabId } from '../shared/layoutConfig';
import type { NotificationPrefs } from '../shared/notificationConfig';
import {
  DEFAULT_CHART_INDICATOR_STATES,
  DEFAULT_SCANNER_ENGINE_CONFIG,
  DEFAULT_SIGNAL_ENGINE_THRESHOLDS,
  type ChartIndicatorStates,
  type IndicatorDisplayState,
  type LiveSignalSettings,
  type ScannerEngineConfig,
  type SignalEngineThresholds,
} from '../shared/terminalSettings';
import type { TerminologyEntry } from '../shared/terminology';
import {
  APP_THEME_PRESETS,
  DEFAULT_TERMINAL_COLORS,
  findMatchingThemePresetId,
  isDefaultThemeColors,
  type TerminalThemeColors,
} from '../shared/themeConfig';
import type {
  BriggFilterPreset,
  LiveSignalState,
  ScannerFunnelStats,
  SystemObservability,
} from '../shared/types';
import { LayoutSettingsPanel } from './LayoutCustomizer';
import { NotificationSettingsControls } from './NotificationSettingsControls';
import { TerminalGuidePanel } from './TerminalGuidePanel';

type SettingsTabId =
  | 'SIGNAL_ENGINE'
  | 'INDICATORS'
  | 'SCANNER'
  | 'DIAGNOSTIC'
  | 'ML'
  | 'MANUAL'
  | 'ADVANCED';

type ManualSubTab = 'GUIDE' | 'GLOSSARY';
type AdvancedSubTab = 'LAYOUT' | 'COLORS' | 'NOTIFICATIONS' | 'OBSERVABILITY' | 'FILTERS';

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
  liveSignalSettings: LiveSignalSettings;
  onChangeLiveSignalSettings: (next: LiveSignalSettings) => void;
  signalThresholds: SignalEngineThresholds;
  onChangeSignalThresholds: (next: SignalEngineThresholds) => void;
  indicatorStates: ChartIndicatorStates;
  onChangeIndicatorStates: (next: ChartIndicatorStates) => void;
  scannerConfig: ScannerEngineConfig;
  onChangeScannerConfig: (next: ScannerEngineConfig) => void;
  scannerFunnel?: ScannerFunnelStats;
  diagnosticSignal?: LiveSignalState | null;
  activeSymbol?: string;
  mlModelVersion?: string;
  onOpenMlCenter?: () => void;
}

const COLOR_FIELDS: Array<{ key: keyof TerminalThemeColors; label: string; hint: string }> = [
  { key: 'bgCanvas', label: 'Canvas Background', hint: 'Main terminal backdrop (#07080C)' },
  { key: 'bgSurface', label: 'Panel Surface', hint: 'Cards, sidebars & headers (#0C0E14)' },
  { key: 'borderColor', label: 'Grid & Borders', hint: 'Dividers & pane borders (#1E2330)' },
  { key: 'accentColor', label: 'Primary Accent', hint: 'Active tabs & highlights (#7C5CFF)' },
  { key: 'bullColor', label: 'Pump / Bullish', hint: 'Buy pressure & positive delta (#00E599)' },
  { key: 'bearColor', label: 'Dump / Bearish', hint: 'Sell pressure & risk alerts (#FF4D6A)' },
];

const INDICATOR_GROUPS: Array<{
  key: keyof ChartIndicatorStates;
  group: string;
  label: string;
  desc: string;
}> = [
  { key: 'ema', group: 'Trend', label: 'EMA (9 / 21)', desc: 'Fast trend alignment ribbons on price chart' },
  { key: 'vwap', group: 'Trend', label: 'VWAP', desc: 'Volume-weighted session equilibrium anchor' },
  { key: 'bb', group: 'Volatility', label: 'Bollinger Bands', desc: 'Volatility envelope around 20-bar mean' },
  { key: 'rsi', group: 'Momentum', label: 'RSI (14)', desc: 'Compact telemetry strip or expanded oscillator sub-pane' },
  { key: 'macd', group: 'Momentum', label: 'MACD (12/26/9)', desc: 'Compact delta readout or expanded histogram sub-pane' },
  { key: 'vol', group: 'Volume', label: 'Volume', desc: 'Directional candle volume histogram overlay' },
  { key: 'pd', group: 'Flow / Event', label: 'Pump / Dump & Sniper', desc: 'Entry/target/stop zones and live flow strip' },
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
  liveSignalSettings,
  onChangeLiveSignalSettings,
  signalThresholds,
  onChangeSignalThresholds,
  indicatorStates,
  onChangeIndicatorStates,
  scannerConfig,
  onChangeScannerConfig,
  scannerFunnel,
  diagnosticSignal,
  activeSymbol,
  mlModelVersion,
  onOpenMlCenter,
}) => {
  const [tab, setTab] = useState<SettingsTabId>('SIGNAL_ENGINE');
  const [manualSubTab, setManualSubTab] = useState<ManualSubTab>('GUIDE');
  const [advSubTab, setAdvSubTab] = useState<AdvancedSubTab>('COLORS');
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
    { id: 'SIGNAL_ENGINE', label: 'Signal Engine', icon: <Radio className="w-3.5 h-3.5" /> },
    { id: 'INDICATORS', label: 'Indicators', icon: <BarChart3 className="w-3.5 h-3.5" /> },
    { id: 'SCANNER', label: 'Scanner', icon: <Radar className="w-3.5 h-3.5" /> },
    { id: 'DIAGNOSTIC', label: 'Diagnostic', icon: <Activity className="w-3.5 h-3.5" /> },
    { id: 'ML', label: 'ML', icon: <BrainCircuit className="w-3.5 h-3.5" /> },
    { id: 'MANUAL', label: 'Manual', icon: <HelpCircle className="w-3.5 h-3.5" /> },
    { id: 'ADVANCED', label: 'Advanced', icon: <SlidersHorizontal className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/65">
      <div className="w-full max-w-3xl h-full bg-[#0C0E14] border-l border-[#1E2330] flex flex-col text-xs shadow-2xl">
        {/* Settings Modal Header */}
        <div className="px-4 py-3 border-b border-[#1E2330] bg-[#08090D] flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-sm font-bold text-slate-100">
              Brigg.AI Settings &amp; Diagnostic Console
            </h2>
            <p className="text-[11px] text-slate-400">
              Signal risk gates, 3-state chart indicators, discovery scanner pool, internal diagnostics, manual &amp; themes
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Clean 7-Section Settings Navigation */}
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
          {/* 1. SIGNAL ENGINE TAB */}
          {tab === 'SIGNAL_ENGINE' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-sm border border-[#1E2330] bg-[#08090D] space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display font-semibold text-slate-100">
                      Live Signal &amp; Decision Pipeline
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                      Enforces Market Data → Feature Extraction → ML Prediction → Risk/Regime Validation → Signal Decision → Live Action. ML BUY probabilities are automatically blocked whenever Pre-Dump or Risk gates fail.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onChangeLiveSignalSettings({
                        ...liveSignalSettings,
                        enabled: !liveSignalSettings.enabled,
                      })
                    }
                    className={`px-3 py-1 rounded-sm border font-mono text-[11px] font-semibold shrink-0 transition-colors ${
                      liveSignalSettings.enabled
                        ? 'border-[#00E599]/60 bg-[#00E599]/15 text-[#00E599]'
                        : 'border-[#1E2330] bg-[#12151E] text-slate-400'
                    }`}
                  >
                    {liveSignalSettings.enabled ? 'ON' : 'OFF'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-[#1E2330]">
                  {(
                    [
                      {
                        key: 'showOnActionPanel',
                        label: 'Show Signal on Action Panel',
                        hint: 'Display Live Decision, Pre-Dump Risk, and Entry/Stop/Target context',
                      },
                      {
                        key: 'showOnChart',
                        label: 'Show Signal on Chart',
                        hint: 'Display compact signal strip & markers on chart',
                      },
                      {
                        key: 'showConfidence',
                        label: 'Show Signal Confidence',
                        hint: 'Display calibrated directional confidence %',
                      },
                      {
                        key: 'showExplanation',
                        label: 'Show Signal Explanation',
                        hint: 'Display synchronized Why factors',
                      },
                    ] as const
                  ).map((item) => {
                    const checked = liveSignalSettings[item.key];
                    return (
                      <button
                        key={item.key}
                        type="button"
                        disabled={!liveSignalSettings.enabled}
                        onClick={() =>
                          onChangeLiveSignalSettings({
                            ...liveSignalSettings,
                            [item.key]: !checked,
                          })
                        }
                        className={`p-2.5 rounded-sm border text-left transition-colors disabled:opacity-45 ${
                          checked && liveSignalSettings.enabled
                            ? 'border-[#7C5CFF]/50 bg-[#7C5CFF]/10'
                            : 'border-[#1E2330] bg-[#0C0E14]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-slate-100">{item.label}</span>
                          <span className={`font-mono text-[10px] font-semibold ${checked ? 'text-[#00E599]' : 'text-slate-500'}`}>
                            {checked ? 'ON' : 'OFF'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{item.hint}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Risk Gate & Pre-Dump Threshold Controls */}
              <div className="p-3.5 rounded-sm border border-[#1E2330] bg-[#08090D] space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="font-display font-semibold text-slate-100">
                      Risk Validation &amp; Pre-Dump Thresholds
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Configure BUY risk gates, Pre-Dump severity levels, and SELL confirmation gating.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onChangeSignalThresholds({ ...DEFAULT_SIGNAL_ENGINE_THRESHOLDS })}
                    className="px-2.5 py-1 rounded-sm border border-[#1E2330] bg-[#12151E] hover:border-[#7C5CFF]/60 text-[11px] font-mono text-slate-200 inline-flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 font-mono text-[11px]">
                  {(
                    [
                      { key: 'mlBuyMinProbPct', label: 'Min ML BUY Prob (%)', min: 45, max: 90 },
                      { key: 'maxDumpRiskForBuyPct', label: 'Max Dump Risk for BUY (%)', min: 25, max: 85 },
                      { key: 'earlyDumpThresholdPct', label: 'Early Dump Risk (%)', min: 20, max: 60 },
                      { key: 'highDumpThresholdPct', label: 'High Dump Risk (%)', min: 45, max: 85 },
                      { key: 'confirmedDumpThresholdPct', label: 'Confirmed Dump (%)', min: 65, max: 98 },
                      { key: 'sellConfirmationMinDumpPct', label: 'Sell Confirm Min Dump (%)', min: 55, max: 95 },
                      { key: 'minBuyShare5mForBuyPct', label: 'Min 5M Buy Share (%)', min: 40, max: 80 },
                      { key: 'maxVolatilityForBuyPct', label: 'Max Volatility Cap (%)', min: 4, max: 30 },
                    ] as const
                  ).map((field) => (
                    <div key={field.key} className="p-2 rounded-sm border border-[#1E2330] bg-[#0C0E14] flex items-center justify-between gap-2">
                      <label className="text-slate-300 font-sans text-[11px]">{field.label}</label>
                      <input
                        type="number"
                        min={field.min}
                        max={field.max}
                        value={signalThresholds[field.key]}
                        onChange={(e) =>
                          onChangeSignalThresholds({
                            ...signalThresholds,
                            [field.key]: Math.max(field.min, Math.min(field.max, Number(e.target.value) || field.min)),
                          })
                        }
                        className="w-20 bg-[#08090D] border border-[#1E2330] rounded-sm px-2 py-1 text-right text-slate-100 tabular-nums"
                      />
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      onChangeSignalThresholds({
                        ...signalThresholds,
                        requireBullishRegimeOrNeutral: !signalThresholds.requireBullishRegimeOrNeutral,
                      })
                    }
                    className="p-2 rounded-sm border border-[#1E2330] bg-[#0C0E14] flex items-center justify-between text-left"
                  >
                    <span className="text-slate-200">Block BUY in Bearish Regime</span>
                    <span className={`font-mono text-[10px] font-semibold ${signalThresholds.requireBullishRegimeOrNeutral ? 'text-[#00E599]' : 'text-slate-500'}`}>
                      {signalThresholds.requireBullishRegimeOrNeutral ? 'ON' : 'OFF'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onChangeSignalThresholds({
                        ...signalThresholds,
                        sellConfirmRequiresVwapLoss: !signalThresholds.sellConfirmRequiresVwapLoss,
                      })
                    }
                    className="p-2 rounded-sm border border-[#1E2330] bg-[#0C0E14] flex items-center justify-between text-left"
                  >
                    <span className="text-slate-200">SELL Requires VWAP/Support Break</span>
                    <span className={`font-mono text-[10px] font-semibold ${signalThresholds.sellConfirmRequiresVwapLoss ? 'text-[#00E599]' : 'text-slate-500'}`}>
                      {signalThresholds.sellConfirmRequiresVwapLoss ? 'ON' : 'OFF'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 2. INDICATORS TAB (3-State Control: OFF / COMPACT / EXPANDED) */}
          {tab === 'INDICATORS' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-sm border border-[#1E2330] bg-[#08090D] space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="font-display font-semibold text-slate-100">
                      Condensed Chart Indicators (OFF · COMPACT · EXPANDED)
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Default state is COMPACT so price action dominates chart height. Expand individual oscillators only when needed.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onChangeIndicatorStates({ ...DEFAULT_CHART_INDICATOR_STATES })}
                    className="px-2.5 py-1 rounded-sm border border-[#1E2330] bg-[#12151E] hover:border-[#7C5CFF]/60 text-[11px] font-mono text-slate-200 inline-flex items-center gap-1 shrink-0"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Default Compact
                  </button>
                </div>

                <div className="space-y-2">
                  {INDICATOR_GROUPS.map((item) => {
                    const current = indicatorStates[item.key];
                    return (
                      <div
                        key={item.key}
                        className="p-2.5 rounded-sm border border-[#1E2330] bg-[#0C0E14] flex flex-wrap items-center justify-between gap-2"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] uppercase text-[#C4B5FD]">{item.group}</span>
                            <span className="font-medium text-slate-100">{item.label}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{item.desc}</div>
                        </div>

                        <div className="flex items-center bg-[#07080C] border border-[#1E2330] rounded-sm p-0.5 font-mono text-[10px]">
                          {(['OFF', 'COMPACT', 'EXPANDED'] as IndicatorDisplayState[]).map((mode) => (
                            <button
                              key={mode}
                              type="button"
                              onClick={() =>
                                onChangeIndicatorStates({
                                  ...indicatorStates,
                                  [item.key]: mode,
                                })
                              }
                              className={`px-2 py-1 rounded-sm transition-colors ${
                                current === mode
                                  ? mode === 'OFF'
                                    ? 'bg-slate-700/50 text-slate-200 font-semibold'
                                    : mode === 'EXPANDED'
                                    ? 'bg-[#7C5CFF]/30 text-[#C4B5FD] font-semibold'
                                    : 'bg-[#00E599]/20 text-[#00E599] font-semibold'
                                  : 'text-slate-500 hover:text-slate-300'
                              }`}
                            >
                              {mode}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 3. SCANNER TAB (Discovery Pipeline Pool Configuration & Funnel Stats) */}
          {tab === 'SCANNER' && (
            <div className="space-y-4">
              {scannerFunnel && (
                <div className="p-3.5 rounded-sm border border-[#1E2330] bg-[#08090D] space-y-2">
                  <div className="font-display font-semibold text-slate-100">
                    Live Discovery Funnel ({scannerFunnel.sources_used.join(' · ')})
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono tabular-nums text-[11px]">
                    <div className="p-2 rounded-sm border border-[#1E2330] bg-[#0C0E14]">
                      <div className="text-[10px] text-slate-400 font-sans">Discovered</div>
                      <div className="text-sm font-bold text-slate-100">{scannerFunnel.discovered_count}</div>
                    </div>
                    <div className="p-2 rounded-sm border border-[#1E2330] bg-[#0C0E14]">
                      <div className="text-[10px] text-slate-400 font-sans">Valid</div>
                      <div className="text-sm font-bold text-sky-300">{scannerFunnel.valid_count}</div>
                    </div>
                    <div className="p-2 rounded-sm border border-[#1E2330] bg-[#0C0E14]">
                      <div className="text-[10px] text-slate-400 font-sans">Pass Filters</div>
                      <div className="text-sm font-bold text-[#C4B5FD]">{scannerFunnel.passed_filters_count}</div>
                    </div>
                    <div className="p-2 rounded-sm border border-[#1E2330] bg-[#0C0E14]">
                      <div className="text-[10px] text-slate-400 font-sans">Quality Analyzed</div>
                      <div className="text-sm font-bold text-amber-300">{scannerFunnel.quality_candidates_count}</div>
                    </div>
                    <div className="p-2 rounded-sm border border-[#1E2330] bg-[#0C0E14]">
                      <div className="text-[10px] text-slate-400 font-sans">Top Ranked UI</div>
                      <div className="text-sm font-bold text-[#00E599]">{scannerFunnel.top_displayed_count}</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-3.5 rounded-sm border border-[#1E2330] bg-[#08090D] space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="font-display font-semibold text-slate-100">
                      Multi-Token Discovery Funnel Limits
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Pipeline: DISCOVER → VALIDATE → FILTER → SCORE → RANK → ANALYZE across DexScreener, GMGN, MevX, Padre.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onChangeScannerConfig({ ...DEFAULT_SCANNER_ENGINE_CONFIG })}
                    className="px-2.5 py-1 rounded-sm border border-[#1E2330] bg-[#12151E] hover:border-[#7C5CFF]/60 text-[11px] font-mono text-slate-200 inline-flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 font-mono text-[11px]">
                  {(
                    [
                      { key: 'discoveredPoolLimit', label: 'Max Discovered Pool', min: 20, max: 200 },
                      { key: 'qualityCandidatesLimit', label: 'Deep Quality Candidates', min: 10, max: 60 },
                      { key: 'topOpportunitiesLimit', label: 'Top Ranked Displayed', min: 5, max: 30 },
                      { key: 'minLiquidityUsd', label: 'Min Liquidity Floor ($)', min: 500, max: 500_000 },
                      { key: 'maxStaleSeconds', label: 'Max Source Staleness (s)', min: 30, max: 600 },
                    ] as const
                  ).map((field) => (
                    <div key={field.key} className="p-2 rounded-sm border border-[#1E2330] bg-[#0C0E14] flex items-center justify-between gap-2">
                      <label className="text-slate-300 font-sans text-[11px]">{field.label}</label>
                      <input
                        type="number"
                        min={field.min}
                        max={field.max}
                        value={scannerConfig[field.key]}
                        onChange={(e) =>
                          onChangeScannerConfig({
                            ...scannerConfig,
                            [field.key]: Math.max(field.min, Math.min(field.max, Number(e.target.value) || field.min)),
                          })
                        }
                        className="w-24 bg-[#08090D] border border-[#1E2330] rounded-sm px-2 py-1 text-right text-slate-100 tabular-nums"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 4. INTERNAL DIAGNOSTIC MODE TAB */}
          {tab === 'DIAGNOSTIC' && (
            <div className="space-y-4">
              {!diagnosticSignal ? (
                <div className="p-4 rounded-sm border border-[#1E2330] bg-[#08090D] text-slate-400">
                  Select a token in the terminal to inspect its synchronized internal decision flow.
                </div>
              ) : (() => {
                const flow = diagnosticSignal.decision_flow;
                const snap = flow.snapshot_values;
                return (
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-sm border border-[#1E2330] bg-[#08090D] space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h3 className="font-display font-semibold text-slate-100">
                            Signal Engine Diagnostic · {activeSymbol || 'Active Pair'}
                          </h3>
                          <p className="text-[10px] font-mono text-slate-400">
                            Snapshot {new Date(flow.snapshot_timestamp_ms).toLocaleTimeString()} · Regime: {flow.market_regime}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-sm border font-mono text-[11px] font-bold ${
                            flow.final_signal === 'BUY'
                              ? 'border-[#00E599]/50 bg-[#00E599]/15 text-[#00E599]'
                              : flow.final_signal === 'SELL' || flow.final_signal === 'DUMP RISK'
                              ? 'border-[#FF4D6A]/50 bg-[#FF4D6A]/15 text-[#FF8599]'
                              : 'border-amber-500/50 bg-amber-500/15 text-amber-300'
                          }`}
                        >
                          FINAL: {flow.final_signal} [{flow.decision_status}]
                        </span>
                      </div>

                      {flow.blocked_or_changed_reason && (
                        <div className="p-2.5 rounded-sm border border-amber-500/40 bg-amber-500/10 text-amber-200 font-mono text-[11px] flex items-start gap-2">
                          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                          <div>
                            <div className="text-[10px] uppercase tracking-wider text-amber-300 font-semibold">
                              Reason Signal Was Blocked / Changed
                            </div>
                            <div>{flow.blocked_or_changed_reason}</div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ML Prediction vs Pre-Dump Risk Summary */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-[11px] tabular-nums">
                      <div className="p-3 rounded-sm border border-[#1E2330] bg-[#08090D] space-y-1">
                        <div className="text-[10px] uppercase tracking-wider text-slate-400 font-sans">
                          1. ML Inference Prediction
                        </div>
                        <div className="text-sm font-bold text-slate-100">
                          {flow.ml_prediction.direction} ({flow.ml_prediction.buy_probability_pct}% BUY /{' '}
                          {flow.ml_prediction.sell_probability_pct}% SELL)
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Model Confidence: {flow.ml_prediction.confidence_pct}%
                        </div>
                      </div>

                      <div className="p-3 rounded-sm border border-[#1E2330] bg-[#08090D] space-y-1">
                        <div className="text-[10px] uppercase tracking-wider text-slate-400 font-sans">
                          2. Pre-Dump Risk Assessment
                        </div>
                        <div
                          className={`text-sm font-bold ${
                            flow.dump_risk.level === 'NORMAL'
                              ? 'text-[#00E599]'
                              : flow.dump_risk.level === 'EARLY DUMP RISK'
                              ? 'text-amber-300'
                              : 'text-[#FF4D6A]'
                          }`}
                        >
                          {flow.dump_risk.level} ({flow.dump_risk.risk_pct}%)
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {flow.dump_risk.sequence_count} correlated risk factors active
                        </div>
                      </div>
                    </div>

                    {/* Synchronized Snapshot Telemetry */}
                    <div className="p-3 rounded-sm border border-[#1E2330] bg-[#08090D] grid grid-cols-3 sm:grid-cols-5 gap-2 font-mono text-[10px] tabular-nums">
                      <div>
                        <span className="text-slate-500 block">5M Δ</span>
                        <span className={snap.price_change_5m >= 0 ? 'text-[#00E599]' : 'text-[#FF4D6A]'}>
                          {snap.price_change_5m >= 0 ? '+' : ''}
                          {snap.price_change_5m.toFixed(2)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">1H Δ</span>
                        <span className={snap.price_change_1h >= 0 ? 'text-[#00E599]' : 'text-[#FF4D6A]'}>
                          {snap.price_change_1h >= 0 ? '+' : ''}
                          {snap.price_change_1h.toFixed(2)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">5M Buy Share</span>
                        <span className="text-slate-200">{snap.buy_share_5m_pct}%</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">RSI(14)</span>
                        <span className="text-slate-200">{snap.rsi14.toFixed(1)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Liquidity</span>
                        <span className="text-slate-200">${Math.round(snap.liquidity_usd).toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Risk Gates Breakdown */}
                    <div className="p-3 rounded-sm border border-[#1E2330] bg-[#08090D] space-y-2">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                        Risk &amp; Market-Regime Validation Gates
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 font-mono text-[10px]">
                        {flow.risk_gates.map((g) => (
                          <div
                            key={g.id}
                            className={`px-2.5 py-1.5 rounded-sm border flex items-center justify-between gap-2 ${
                              g.passed
                                ? 'border-[#00E599]/35 bg-[#00E599]/5 text-slate-200'
                                : 'border-[#FF4D6A]/45 bg-[#FF4D6A]/10 text-rose-200'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="font-semibold truncate">{g.label}</div>
                              <div className="text-slate-400 truncate">{g.detail}</div>
                            </div>
                            <span className={`font-bold shrink-0 ${g.passed ? 'text-[#00E599]' : 'text-[#FF4D6A]'}`}>
                              {g.passed ? 'PASS' : 'BLOCK'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Bullish vs Bearish Synced Factors */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                      <div className="p-3 rounded-sm border border-[#1E2330] bg-[#08090D] space-y-1">
                        <div className="font-mono text-[10px] uppercase tracking-wider text-[#00E599]">
                          Bullish Factors ({flow.bullish_factors.length})
                        </div>
                        {flow.bullish_factors.length === 0 ? (
                          <div className="text-slate-500">No bullish factors confirmed in current snapshot.</div>
                        ) : (
                          flow.bullish_factors.map((f, i) => (
                            <div key={i} className="text-slate-200">
                              + {f}
                            </div>
                          ))
                        )}
                      </div>

                      <div className="p-3 rounded-sm border border-[#1E2330] bg-[#08090D] space-y-1">
                        <div className="font-mono text-[10px] uppercase tracking-wider text-[#FF4D6A]">
                          Bearish / Dump Factors ({flow.bearish_factors.length})
                        </div>
                        {flow.bearish_factors.length === 0 ? (
                          <div className="text-slate-500">No acute bearish pressure detected.</div>
                        ) : (
                          flow.bearish_factors.map((f, i) => (
                            <div key={i} className="text-slate-200">
                              - {f}
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-500 font-mono">
                      {flow.dump_risk.disclaimer}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* 5. ML TAB */}
          {tab === 'ML' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-sm border border-[#1E2330] bg-[#08090D] space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="font-display font-semibold text-slate-100">
                      ML Inference vs Training Governance
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Active Production Model: <span className="font-mono text-[#C4B5FD]">{mlModelVersion || 'v1.0'}</span>
                    </p>
                  </div>
                  {onOpenMlCenter && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenMlCenter();
                      }}
                      className="px-3 py-1.5 rounded-sm border border-[#7C5CFF]/50 bg-[#7C5CFF]/20 hover:bg-[#7C5CFF]/30 text-[#C4B5FD] font-mono text-[11px]"
                    >
                      Open ML Center
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
                  <div className="p-2.5 rounded-sm border border-[#1E2330] bg-[#0C0E14]">
                    <div className="font-mono text-[10px] font-bold text-[#00E599]">MODEL INFERENCE</div>
                    <p className="text-slate-300 mt-0.5">
                      Frozen calibrated production weights evaluate live snapshots deterministically; predictions pass through Risk &amp; Pre-Dump gates before action.
                    </p>
                  </div>
                  <div className="p-2.5 rounded-sm border border-[#1E2330] bg-[#0C0E14]">
                    <div className="font-mono text-[10px] font-bold text-sky-300">MODEL TRAINING &amp; CALIBRATION</div>
                    <p className="text-slate-300 mt-0.5">
                      Runs offline on verified T-bounded SQLite historical snapshots and out-of-time Platt scaling in ML Center.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 6. MANUAL TAB (Terminal Guide + Auto-Updating Glossary) */}
          {tab === 'MANUAL' && (
            <div className="space-y-4">
              <div className="flex items-center gap-1.5 border-b border-[#1E2330] pb-2">
                <button
                  type="button"
                  onClick={() => setManualSubTab('GUIDE')}
                  className={`px-3 py-1 rounded-sm border font-mono text-[11px] inline-flex items-center gap-1.5 ${
                    manualSubTab === 'GUIDE'
                      ? 'border-[#7C5CFF]/60 bg-[#7C5CFF]/20 text-[#C4B5FD]'
                      : 'border-[#1E2330] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  Terminal Guide (22)
                </button>
                <button
                  type="button"
                  onClick={() => setManualSubTab('GLOSSARY')}
                  className={`px-3 py-1 rounded-sm border font-mono text-[11px] inline-flex items-center gap-1.5 ${
                    manualSubTab === 'GLOSSARY'
                      ? 'border-[#7C5CFF]/60 bg-[#7C5CFF]/20 text-[#C4B5FD]'
                      : 'border-[#1E2330] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Glossary ({glossaryEntries.length})
                </button>
              </div>

              {manualSubTab === 'GUIDE' ? (
                <TerminalGuidePanel />
              ) : (
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
          )}

          {/* 7. ADVANCED TAB (Layout, App Themes & Colors, Notifications, Observability, Heuristics) */}
          {tab === 'ADVANCED' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-1 border-b border-[#1E2330] pb-2">
                {(
                  [
                    { id: 'COLORS', label: 'Themes & Colors', icon: <Palette className="w-3.5 h-3.5" /> },
                    { id: 'LAYOUT', label: 'Layout', icon: <LayoutTemplate className="w-3.5 h-3.5" /> },
                    { id: 'NOTIFICATIONS', label: 'Notifications', icon: <Bell className="w-3.5 h-3.5" /> },
                    { id: 'OBSERVABILITY', label: 'Observability', icon: <Server className="w-3.5 h-3.5" /> },
                    { id: 'FILTERS', label: 'Heuristics', icon: <SlidersHorizontal className="w-3.5 h-3.5" /> },
                  ] as const
                ).map((sub) => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setAdvSubTab(sub.id)}
                    className={`px-2.5 py-1 rounded-sm border font-mono text-[11px] inline-flex items-center gap-1.5 ${
                      advSubTab === sub.id
                        ? 'border-[#7C5CFF]/60 bg-[#7C5CFF]/20 text-[#C4B5FD]'
                        : 'border-[#1E2330] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {sub.icon}
                    {sub.label}
                  </button>
                ))}
              </div>

              {advSubTab === 'LAYOUT' && (
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
                        {isDefaultColors ? 'Using default Brigg.AI dark terminal colors' : 'Custom terminal colors active'}
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

              {advSubTab === 'COLORS' && (
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

              {advSubTab === 'NOTIFICATIONS' && (
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

              {advSubTab === 'OBSERVABILITY' && obs && (
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
                    <h3 className="font-display font-semibold text-slate-100 mb-2">Recent Security &amp; ML Audit Logs</h3>
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

              {advSubTab === 'FILTERS' && (
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
