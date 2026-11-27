export interface TerminalThemeColors {
  bgCanvas: string;
  bgSurface: string;
  borderColor: string;
  accentColor: string;
  bullColor: string;
  bearColor: string;
}

export interface AppThemePreset {
  id: string;
  name: string;
  description: string;
  colors: TerminalThemeColors;
}

export const THEME_COLORS_STORAGE_KEY = 'brigg_terminal_theme_colors_v1';

export const DEFAULT_TERMINAL_COLORS: TerminalThemeColors = {
  bgCanvas: '#07080C',
  bgSurface: '#0C0E14',
  borderColor: '#1E2330',
  accentColor: '#7C5CFF',
  bullColor: '#00E599',
  bearColor: '#FF4D6A',
};

export const APP_THEME_PRESETS: AppThemePreset[] = [
  {
    id: 'PADRE_OBSIDIAN',
    name: 'Padre Obsidian (Default)',
    description: 'Original dark obsidian terminal palette',
    colors: { ...DEFAULT_TERMINAL_COLORS },
  },
  {
    id: 'EMERALD_TRENCH',
    name: 'Emerald Trench',
    description: 'Deep forest obsidian with matrix green accent',
    colors: {
      bgCanvas: '#050B0A',
      bgSurface: '#0A1412',
      borderColor: '#18302B',
      accentColor: '#10B981',
      bullColor: '#00F5A0',
      bearColor: '#FF5C77',
    },
  },
  {
    id: 'MIDNIGHT_COBALT',
    name: 'Midnight Cobalt',
    description: 'Navy slate panels with electric cyan highlight',
    colors: {
      bgCanvas: '#060913',
      bgSurface: '#0B1120',
      borderColor: '#1E293B',
      accentColor: '#38BDF8',
      bullColor: '#22C55E',
      bearColor: '#F43F5E',
    },
  },
  {
    id: 'CARBON_TERMINAL',
    name: 'Carbon Terminal',
    description: 'Neutral matte carbon with violet pulse',
    colors: {
      bgCanvas: '#09090B',
      bgSurface: '#111115',
      borderColor: '#27272A',
      accentColor: '#A855F7',
      bullColor: '#34D399',
      bearColor: '#FB7185',
    },
  },
  {
    id: 'SOLAR_AMBER',
    name: 'Solar Amber',
    description: 'Warm tungsten dark shell with gold highlights',
    colors: {
      bgCanvas: '#0C0906',
      bgSurface: '#14100B',
      borderColor: '#2E2419',
      accentColor: '#F59E0B',
      bullColor: '#10B981',
      bearColor: '#EF4444',
    },
  },
  {
    id: 'CRIMSON_QUANT',
    name: 'Crimson Quant',
    description: 'High-contrast magenta & quant emerald',
    colors: {
      bgCanvas: '#0B0609',
      bgSurface: '#140B10',
      borderColor: '#2F1B25',
      accentColor: '#EC4899',
      bullColor: '#00E599',
      bearColor: '#FF3B5C',
    },
  },
];

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

function validHex(value: unknown, fallback: string): string {
  if (typeof value === 'string' && HEX_COLOR_RE.test(value.trim())) {
    return value.trim().toUpperCase();
  }
  return fallback;
}

export function sanitizeThemeColors(raw: unknown): TerminalThemeColors {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_TERMINAL_COLORS };
  }
  const obj = raw as Partial<TerminalThemeColors>;
  return {
    bgCanvas: validHex(obj.bgCanvas, DEFAULT_TERMINAL_COLORS.bgCanvas),
    bgSurface: validHex(obj.bgSurface, DEFAULT_TERMINAL_COLORS.bgSurface),
    borderColor: validHex(obj.borderColor, DEFAULT_TERMINAL_COLORS.borderColor),
    accentColor: validHex(obj.accentColor, DEFAULT_TERMINAL_COLORS.accentColor),
    bullColor: validHex(obj.bullColor, DEFAULT_TERMINAL_COLORS.bullColor),
    bearColor: validHex(obj.bearColor, DEFAULT_TERMINAL_COLORS.bearColor),
  };
}

export function colorsEqual(a: TerminalThemeColors, b: TerminalThemeColors): boolean {
  return (
    a.bgCanvas.toUpperCase() === b.bgCanvas.toUpperCase() &&
    a.bgSurface.toUpperCase() === b.bgSurface.toUpperCase() &&
    a.borderColor.toUpperCase() === b.borderColor.toUpperCase() &&
    a.accentColor.toUpperCase() === b.accentColor.toUpperCase() &&
    a.bullColor.toUpperCase() === b.bullColor.toUpperCase() &&
    a.bearColor.toUpperCase() === b.bearColor.toUpperCase()
  );
}

export function isDefaultThemeColors(colors: TerminalThemeColors): boolean {
  return colorsEqual(colors, DEFAULT_TERMINAL_COLORS);
}

export function findMatchingThemePresetId(colors: TerminalThemeColors): string | null {
  const match = APP_THEME_PRESETS.find((preset) => colorsEqual(colors, preset.colors));
  return match ? match.id : null;
}

export function loadSavedThemeColors(): TerminalThemeColors {
  try {
    const raw = window.localStorage.getItem(THEME_COLORS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_TERMINAL_COLORS };
    return sanitizeThemeColors(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_TERMINAL_COLORS };
  }
}

export function saveThemeColors(colors: TerminalThemeColors): void {
  try {
    window.localStorage.setItem(THEME_COLORS_STORAGE_KEY, JSON.stringify(colors));
  } catch {
    // ignore storage quota errors
  }
}

export function resetDefaultThemeColors(): TerminalThemeColors {
  try {
    window.localStorage.removeItem(THEME_COLORS_STORAGE_KEY);
  } catch {
    // ignore storage errors
  }
  return { ...DEFAULT_TERMINAL_COLORS };
}

export function applyThemeCssVars(colors: TerminalThemeColors): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.setProperty('--brigg-bg', colors.bgCanvas);
  root.style.setProperty('--brigg-surface', colors.bgSurface);
  root.style.setProperty('--brigg-border', colors.borderColor);
  root.style.setProperty('--brigg-accent', colors.accentColor);
  root.style.setProperty('--brigg-bull', colors.bullColor);
  root.style.setProperty('--brigg-bear', colors.bearColor);

  if (isDefaultThemeColors(colors)) {
    delete root.dataset.briggCustomTheme;
  } else {
    root.dataset.briggCustomTheme = 'true';
  }
}
