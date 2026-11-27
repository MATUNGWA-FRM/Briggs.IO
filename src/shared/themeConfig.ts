export interface TerminalThemeColors {
  bgCanvas: string;
  bgSurface: string;
  borderColor: string;
  accentColor: string;
  bullColor: string;
  bearColor: string;
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

export function isDefaultThemeColors(colors: TerminalThemeColors): boolean {
  return (
    colors.bgCanvas.toUpperCase() === DEFAULT_TERMINAL_COLORS.bgCanvas &&
    colors.bgSurface.toUpperCase() === DEFAULT_TERMINAL_COLORS.bgSurface &&
    colors.borderColor.toUpperCase() === DEFAULT_TERMINAL_COLORS.borderColor &&
    colors.accentColor.toUpperCase() === DEFAULT_TERMINAL_COLORS.accentColor &&
    colors.bullColor.toUpperCase() === DEFAULT_TERMINAL_COLORS.bullColor &&
    colors.bearColor.toUpperCase() === DEFAULT_TERMINAL_COLORS.bearColor
  );
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
