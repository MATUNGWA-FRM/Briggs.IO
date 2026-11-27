export type WorkspaceTabId =
  | 'GRAPH'
  | 'ANALYSIS'
  | 'HOLDERS'
  | 'TRADES'
  | 'BUBBLE_2D'
  | 'BUBBLE_3D'
  | 'FORENSICS'
  | 'LIQUIDITY_VOLUME'
  | 'SOCIAL_RISK'
  | 'CHECKLIST_PREDICTIONS';

export type LayoutPresetId = 'DEFAULT' | 'CHART_FOCUS' | 'ANALYSIS_FOCUS' | 'CUSTOM';

export interface WorkspaceTabMeta {
  id: WorkspaceTabId;
  label: string;
  description: string;
}

export const WORKSPACE_TABS_META: WorkspaceTabMeta[] = [
  { id: 'GRAPH', label: 'Graph', description: 'Live candlestick chart & breakout zones' },
  { id: 'ANALYSIS', label: 'Analysis', description: 'Unified risk, liquidity, regime & thesis summary' },
  { id: 'HOLDERS', label: 'Holders · Bubble Map', description: 'Snipers, bundles & interactive 2D/3D bubble map' },
  { id: 'TRADES', label: 'Live Trades Tape', description: 'Real-time BUY/SELL orderflow tape' },
  { id: 'BUBBLE_2D', label: '2D Bubble Map', description: 'Full-width Cytoscape wallet relationship graph' },
  { id: 'BUBBLE_3D', label: '3D Bubble Map', description: 'Full-width Three.js 3D wallet topology' },
  { id: 'FORENSICS', label: 'Forensics & Sources', description: 'Contract checks, lifecycle & provider integrity' },
  { id: 'LIQUIDITY_VOLUME', label: 'Liquidity & Volume', description: 'LP depth, slippage & wash-volume detection' },
  { id: 'SOCIAL_RISK', label: 'Social & Risk Engine', description: 'X/TG/Reddit/Twitch sentiment & rug gates' },
  { id: 'CHECKLIST_PREDICTIONS', label: 'Checklist & Predictions', description: 'Automated rules, logged snapshots & overrides' },
];

export interface WorkspaceLayoutState {
  presetId: LayoutPresetId;
  showScanner: boolean;
  showChart: boolean;
  showLowerPanel: boolean;
  showScorePanel: boolean;
  leftWidth: number;
  rightWidth: number;
  chartHeight: number;
  openTabs: WorkspaceTabId[];
  activeTab: WorkspaceTabId;
}

export const LAYOUT_STORAGE_KEY = 'brigg_terminal_layout_v1';

export const LAYOUT_PRESETS: Record<Exclude<LayoutPresetId, 'CUSTOM'>, WorkspaceLayoutState> = {
  DEFAULT: {
    presetId: 'DEFAULT',
    showScanner: true,
    showChart: true,
    showLowerPanel: true,
    showScorePanel: true,
    leftWidth: 308,
    rightWidth: 332,
    chartHeight: 335,
    openTabs: [
      'HOLDERS',
      'TRADES',
      'BUBBLE_2D',
      'BUBBLE_3D',
      'FORENSICS',
      'LIQUIDITY_VOLUME',
      'SOCIAL_RISK',
      'CHECKLIST_PREDICTIONS',
    ],
    activeTab: 'HOLDERS',
  },
  CHART_FOCUS: {
    presetId: 'CHART_FOCUS',
    showScanner: false,
    showChart: true,
    showLowerPanel: true,
    showScorePanel: true,
    leftWidth: 280,
    rightWidth: 300,
    chartHeight: 455,
    openTabs: ['TRADES', 'GRAPH', 'HOLDERS', 'LIQUIDITY_VOLUME'],
    activeTab: 'TRADES',
  },
  ANALYSIS_FOCUS: {
    presetId: 'ANALYSIS_FOCUS',
    showScanner: true,
    showChart: false,
    showLowerPanel: true,
    showScorePanel: true,
    leftWidth: 288,
    rightWidth: 364,
    chartHeight: 260,
    openTabs: [
      'ANALYSIS',
      'GRAPH',
      'HOLDERS',
      'FORENSICS',
      'LIQUIDITY_VOLUME',
      'SOCIAL_RISK',
      'CHECKLIST_PREDICTIONS',
    ],
    activeTab: 'ANALYSIS',
  },
};

const VALID_TAB_IDS = new Set<WorkspaceTabId>(WORKSPACE_TABS_META.map((t) => t.id));

export function clampNumber(val: number, min: number, max: number, fallback: number): number {
  if (typeof val !== 'number' || !Number.isFinite(val)) return fallback;
  return Math.max(min, Math.min(max, Math.round(val)));
}

export function sanitizeLayoutState(raw: unknown): WorkspaceLayoutState {
  const def = LAYOUT_PRESETS.DEFAULT;
  if (!raw || typeof raw !== 'object') return def;
  const obj = raw as Partial<WorkspaceLayoutState>;

  const openTabsRaw = Array.isArray(obj.openTabs)
    ? obj.openTabs.filter((id): id is WorkspaceTabId => VALID_TAB_IDS.has(id as WorkspaceTabId))
    : def.openTabs;
  const openTabs = openTabsRaw.length > 0 ? Array.from(new Set(openTabsRaw)) : def.openTabs;

  const activeTab =
    obj.activeTab && openTabs.includes(obj.activeTab) ? obj.activeTab : openTabs[0];

  const presetId: LayoutPresetId =
    obj.presetId === 'DEFAULT' ||
    obj.presetId === 'CHART_FOCUS' ||
    obj.presetId === 'ANALYSIS_FOCUS' ||
    obj.presetId === 'CUSTOM'
      ? obj.presetId
      : 'CUSTOM';

  return {
    presetId,
    showScanner: typeof obj.showScanner === 'boolean' ? obj.showScanner : def.showScanner,
    showChart: typeof obj.showChart === 'boolean' ? obj.showChart : def.showChart,
    showLowerPanel: typeof obj.showLowerPanel === 'boolean' ? obj.showLowerPanel : def.showLowerPanel,
    showScorePanel: typeof obj.showScorePanel === 'boolean' ? obj.showScorePanel : def.showScorePanel,
    leftWidth: clampNumber(Number(obj.leftWidth), 230, 460, def.leftWidth),
    rightWidth: clampNumber(Number(obj.rightWidth), 250, 480, def.rightWidth),
    chartHeight: clampNumber(Number(obj.chartHeight), 200, 580, def.chartHeight),
    openTabs,
    activeTab,
  };
}

export function loadSavedLayout(): WorkspaceLayoutState {
  try {
    const raw = window.localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (!raw) return LAYOUT_PRESETS.DEFAULT;
    return sanitizeLayoutState(JSON.parse(raw));
  } catch {
    return LAYOUT_PRESETS.DEFAULT;
  }
}

export function saveLayout(state: WorkspaceLayoutState): void {
  try {
    window.localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage quota errors
  }
}

export function resetSavedLayout(): WorkspaceLayoutState {
  try {
    window.localStorage.removeItem(LAYOUT_STORAGE_KEY);
  } catch {
    // ignore storage errors
  }
  return { ...LAYOUT_PRESETS.DEFAULT, openTabs: [...LAYOUT_PRESETS.DEFAULT.openTabs] };
}
