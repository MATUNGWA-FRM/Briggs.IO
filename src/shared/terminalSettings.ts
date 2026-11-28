export interface LiveSignalSettings {
  enabled: boolean;
  showOnActionPanel: boolean;
  showOnChart: boolean;
  showConfidence: boolean;
  showExplanation: boolean;
}

export interface SignalEngineThresholds {
  mlBuyMinProbPct: number;
  maxDumpRiskForBuyPct: number;
  earlyDumpThresholdPct: number;
  highDumpThresholdPct: number;
  confirmedDumpThresholdPct: number;
  sellConfirmationMinDumpPct: number;
  minBuyShare5mForBuyPct: number;
  maxVolatilityForBuyPct: number;
  requireBullishRegimeOrNeutral: boolean;
  sellConfirmRequiresVwapLoss: boolean;
}

export type IndicatorDisplayState = 'OFF' | 'COMPACT' | 'EXPANDED';

export interface ChartIndicatorStates {
  ema: IndicatorDisplayState;
  vwap: IndicatorDisplayState;
  bb: IndicatorDisplayState;
  rsi: IndicatorDisplayState;
  macd: IndicatorDisplayState;
  vol: IndicatorDisplayState;
  pd: IndicatorDisplayState;
}

export interface ScannerEngineConfig {
  discoveredPoolLimit: number;
  qualityCandidatesLimit: number;
  topOpportunitiesLimit: number;
  minLiquidityUsd: number;
  maxStaleSeconds: number;
}

export interface ChartAiOverlaySettings {
  liveSignal: boolean;
  aiExplanation: boolean;
  pumpDumpLabels: boolean;
  supportResistance: boolean;
  mlAnnotations: boolean;
  confidenceLabels: boolean;
}

export type MlViewMode = 'TECHNICAL' | 'EXPLAIN_TO_ME';

export const DEFAULT_LIVE_SIGNAL_SETTINGS: LiveSignalSettings = {
  enabled: true,
  showOnActionPanel: true,
  showOnChart: true,
  showConfidence: true,
  showExplanation: true,
};

export const DEFAULT_SIGNAL_ENGINE_THRESHOLDS: SignalEngineThresholds = {
  mlBuyMinProbPct: 60,
  maxDumpRiskForBuyPct: 52,
  earlyDumpThresholdPct: 38,
  highDumpThresholdPct: 64,
  confirmedDumpThresholdPct: 82,
  sellConfirmationMinDumpPct: 74,
  minBuyShare5mForBuyPct: 51,
  maxVolatilityForBuyPct: 12,
  requireBullishRegimeOrNeutral: true,
  sellConfirmRequiresVwapLoss: true,
};

export const DEFAULT_CHART_INDICATOR_STATES: ChartIndicatorStates = {
  ema: 'COMPACT',
  vwap: 'COMPACT',
  bb: 'OFF',
  rsi: 'COMPACT',
  macd: 'COMPACT',
  vol: 'COMPACT',
  pd: 'COMPACT',
};

export const DEFAULT_SCANNER_ENGINE_CONFIG: ScannerEngineConfig = {
  discoveredPoolLimit: 120,
  qualityCandidatesLimit: 24,
  topOpportunitiesLimit: 12,
  minLiquidityUsd: 2_500,
  maxStaleSeconds: 180,
};

export const DEFAULT_CHART_AI_OVERLAY_SETTINGS: ChartAiOverlaySettings = {
  liveSignal: true,
  aiExplanation: true,
  pumpDumpLabels: true,
  supportResistance: true,
  mlAnnotations: true,
  confidenceLabels: true,
};

const LIVE_SIGNAL_KEY = 'brigg_live_signal_settings_v2';
const SIGNAL_THRESHOLDS_KEY = 'brigg_signal_thresholds_v1';
const CHART_INDICATORS_KEY = 'brigg_chart_indicator_states_v1';
const SCANNER_CONFIG_KEY = 'brigg_scanner_engine_config_v1';
const AI_OVERLAY_KEY = 'brigg_chart_ai_overlay_v1';
const ML_VIEW_MODE_KEY = 'brigg_ml_view_mode_v1';

function clampInt(val: unknown, min: number, max: number, fallback: number): number {
  const n = Number(val);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function sanitizeIndicatorState(val: unknown, fallback: IndicatorDisplayState): IndicatorDisplayState {
  if (val === 'OFF' || val === 'COMPACT' || val === 'EXPANDED') return val;
  return fallback;
}

export function sanitizeLiveSignalSettings(raw: unknown): LiveSignalSettings {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_LIVE_SIGNAL_SETTINGS };
  const obj = raw as Record<string, unknown>;
  return {
    enabled: typeof obj.enabled === 'boolean' ? obj.enabled : DEFAULT_LIVE_SIGNAL_SETTINGS.enabled,
    showOnActionPanel:
      typeof obj.showOnActionPanel === 'boolean'
        ? obj.showOnActionPanel
        : DEFAULT_LIVE_SIGNAL_SETTINGS.showOnActionPanel,
    showOnChart:
      typeof obj.showOnChart === 'boolean' ? obj.showOnChart : DEFAULT_LIVE_SIGNAL_SETTINGS.showOnChart,
    showConfidence:
      typeof obj.showConfidence === 'boolean'
        ? obj.showConfidence
        : DEFAULT_LIVE_SIGNAL_SETTINGS.showConfidence,
    showExplanation:
      typeof obj.showExplanation === 'boolean'
        ? obj.showExplanation
        : DEFAULT_LIVE_SIGNAL_SETTINGS.showExplanation,
  };
}

export function loadLiveSignalSettings(): LiveSignalSettings {
  try {
    const raw = window.localStorage.getItem(LIVE_SIGNAL_KEY);
    if (!raw) return { ...DEFAULT_LIVE_SIGNAL_SETTINGS };
    return sanitizeLiveSignalSettings(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_LIVE_SIGNAL_SETTINGS };
  }
}

export function saveLiveSignalSettings(next: LiveSignalSettings): void {
  try {
    window.localStorage.setItem(LIVE_SIGNAL_KEY, JSON.stringify(next));
  } catch {
    // ignore storage quota errors
  }
}

export function sanitizeSignalEngineThresholds(raw: unknown): SignalEngineThresholds {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_SIGNAL_ENGINE_THRESHOLDS };
  const obj = raw as Record<string, unknown>;
  return {
    mlBuyMinProbPct: clampInt(obj.mlBuyMinProbPct, 45, 90, DEFAULT_SIGNAL_ENGINE_THRESHOLDS.mlBuyMinProbPct),
    maxDumpRiskForBuyPct: clampInt(
      obj.maxDumpRiskForBuyPct,
      25,
      85,
      DEFAULT_SIGNAL_ENGINE_THRESHOLDS.maxDumpRiskForBuyPct
    ),
    earlyDumpThresholdPct: clampInt(
      obj.earlyDumpThresholdPct,
      20,
      60,
      DEFAULT_SIGNAL_ENGINE_THRESHOLDS.earlyDumpThresholdPct
    ),
    highDumpThresholdPct: clampInt(
      obj.highDumpThresholdPct,
      45,
      85,
      DEFAULT_SIGNAL_ENGINE_THRESHOLDS.highDumpThresholdPct
    ),
    confirmedDumpThresholdPct: clampInt(
      obj.confirmedDumpThresholdPct,
      65,
      98,
      DEFAULT_SIGNAL_ENGINE_THRESHOLDS.confirmedDumpThresholdPct
    ),
    sellConfirmationMinDumpPct: clampInt(
      obj.sellConfirmationMinDumpPct,
      55,
      95,
      DEFAULT_SIGNAL_ENGINE_THRESHOLDS.sellConfirmationMinDumpPct
    ),
    minBuyShare5mForBuyPct: clampInt(
      obj.minBuyShare5mForBuyPct,
      40,
      80,
      DEFAULT_SIGNAL_ENGINE_THRESHOLDS.minBuyShare5mForBuyPct
    ),
    maxVolatilityForBuyPct: clampInt(
      obj.maxVolatilityForBuyPct,
      4,
      30,
      DEFAULT_SIGNAL_ENGINE_THRESHOLDS.maxVolatilityForBuyPct
    ),
    requireBullishRegimeOrNeutral:
      typeof obj.requireBullishRegimeOrNeutral === 'boolean'
        ? obj.requireBullishRegimeOrNeutral
        : DEFAULT_SIGNAL_ENGINE_THRESHOLDS.requireBullishRegimeOrNeutral,
    sellConfirmRequiresVwapLoss:
      typeof obj.sellConfirmRequiresVwapLoss === 'boolean'
        ? obj.sellConfirmRequiresVwapLoss
        : DEFAULT_SIGNAL_ENGINE_THRESHOLDS.sellConfirmRequiresVwapLoss,
  };
}

export function loadSignalEngineThresholds(): SignalEngineThresholds {
  try {
    const raw = window.localStorage.getItem(SIGNAL_THRESHOLDS_KEY);
    if (!raw) return { ...DEFAULT_SIGNAL_ENGINE_THRESHOLDS };
    return sanitizeSignalEngineThresholds(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_SIGNAL_ENGINE_THRESHOLDS };
  }
}

export function saveSignalEngineThresholds(next: SignalEngineThresholds): void {
  try {
    window.localStorage.setItem(SIGNAL_THRESHOLDS_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export function sanitizeChartIndicatorStates(raw: unknown): ChartIndicatorStates {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_CHART_INDICATOR_STATES };
  const obj = raw as Record<string, unknown>;
  return {
    ema: sanitizeIndicatorState(obj.ema, DEFAULT_CHART_INDICATOR_STATES.ema),
    vwap: sanitizeIndicatorState(obj.vwap, DEFAULT_CHART_INDICATOR_STATES.vwap),
    bb: sanitizeIndicatorState(obj.bb, DEFAULT_CHART_INDICATOR_STATES.bb),
    rsi: sanitizeIndicatorState(obj.rsi, DEFAULT_CHART_INDICATOR_STATES.rsi),
    macd: sanitizeIndicatorState(obj.macd, DEFAULT_CHART_INDICATOR_STATES.macd),
    vol: sanitizeIndicatorState(obj.vol, DEFAULT_CHART_INDICATOR_STATES.vol),
    pd: sanitizeIndicatorState(obj.pd, DEFAULT_CHART_INDICATOR_STATES.pd),
  };
}

export function loadChartIndicatorStates(): ChartIndicatorStates {
  try {
    const raw = window.localStorage.getItem(CHART_INDICATORS_KEY);
    if (!raw) return { ...DEFAULT_CHART_INDICATOR_STATES };
    return sanitizeChartIndicatorStates(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_CHART_INDICATOR_STATES };
  }
}

export function saveChartIndicatorStates(next: ChartIndicatorStates): void {
  try {
    window.localStorage.setItem(CHART_INDICATORS_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export function sanitizeScannerEngineConfig(raw: unknown): ScannerEngineConfig {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_SCANNER_ENGINE_CONFIG };
  const obj = raw as Record<string, unknown>;
  return {
    discoveredPoolLimit: clampInt(
      obj.discoveredPoolLimit,
      20,
      500,
      DEFAULT_SCANNER_ENGINE_CONFIG.discoveredPoolLimit
    ),
    qualityCandidatesLimit: clampInt(
      obj.qualityCandidatesLimit,
      10,
      60,
      DEFAULT_SCANNER_ENGINE_CONFIG.qualityCandidatesLimit
    ),
    topOpportunitiesLimit: clampInt(
      obj.topOpportunitiesLimit,
      5,
      30,
      DEFAULT_SCANNER_ENGINE_CONFIG.topOpportunitiesLimit
    ),
    minLiquidityUsd: clampInt(
      obj.minLiquidityUsd,
      500,
      500_000,
      DEFAULT_SCANNER_ENGINE_CONFIG.minLiquidityUsd
    ),
    maxStaleSeconds: clampInt(
      obj.maxStaleSeconds,
      30,
      600,
      DEFAULT_SCANNER_ENGINE_CONFIG.maxStaleSeconds
    ),
  };
}

export function loadScannerEngineConfig(): ScannerEngineConfig {
  try {
    const raw = window.localStorage.getItem(SCANNER_CONFIG_KEY);
    if (!raw) return { ...DEFAULT_SCANNER_ENGINE_CONFIG };
    return sanitizeScannerEngineConfig(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_SCANNER_ENGINE_CONFIG };
  }
}

export function saveScannerEngineConfig(next: ScannerEngineConfig): void {
  try {
    window.localStorage.setItem(SCANNER_CONFIG_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export function sanitizeChartAiOverlaySettings(raw: unknown): ChartAiOverlaySettings {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_CHART_AI_OVERLAY_SETTINGS };
  const obj = raw as Record<string, unknown>;
  return {
    liveSignal: typeof obj.liveSignal === 'boolean' ? obj.liveSignal : true,
    aiExplanation: typeof obj.aiExplanation === 'boolean' ? obj.aiExplanation : true,
    pumpDumpLabels: typeof obj.pumpDumpLabels === 'boolean' ? obj.pumpDumpLabels : true,
    supportResistance: typeof obj.supportResistance === 'boolean' ? obj.supportResistance : true,
    mlAnnotations: typeof obj.mlAnnotations === 'boolean' ? obj.mlAnnotations : true,
    confidenceLabels: typeof obj.confidenceLabels === 'boolean' ? obj.confidenceLabels : true,
  };
}

export function loadChartAiOverlaySettings(): ChartAiOverlaySettings {
  try {
    const raw = window.localStorage.getItem(AI_OVERLAY_KEY);
    if (!raw) return { ...DEFAULT_CHART_AI_OVERLAY_SETTINGS };
    return sanitizeChartAiOverlaySettings(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_CHART_AI_OVERLAY_SETTINGS };
  }
}

export function saveChartAiOverlaySettings(next: ChartAiOverlaySettings): void {
  try {
    window.localStorage.setItem(AI_OVERLAY_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export function loadMlViewMode(): MlViewMode {
  try {
    const raw = window.localStorage.getItem(ML_VIEW_MODE_KEY);
    return raw === 'EXPLAIN_TO_ME' ? 'EXPLAIN_TO_ME' : 'TECHNICAL';
  } catch {
    return 'TECHNICAL';
  }
}

export function saveMlViewMode(mode: MlViewMode): void {
  try {
    window.localStorage.setItem(ML_VIEW_MODE_KEY, mode);
  } catch {
    // ignore
  }
}
