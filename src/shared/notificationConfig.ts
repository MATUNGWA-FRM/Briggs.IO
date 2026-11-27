import type { LiveTradeEvent } from './types';

export const BUY_POPUP_TTL_MS = 5_000; // 5 seconds on-screen pop-up
export const BUY_NOTIFICATION_TTL_MS = 120_000; // 2 minutes in Notification Bar

export type NotificationPosition =
  | 'TOP_LEFT'
  | 'TOP_RIGHT'
  | 'BOTTOM_LEFT'
  | 'BOTTOM_RIGHT';

export interface NotificationPrefs {
  popupsEnabled: boolean;
  position: NotificationPosition;
}

export const NOTIFICATION_PREFS_STORAGE_KEY = 'brigg_notification_prefs_v1';

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  popupsEnabled: true,
  position: 'BOTTOM_RIGHT',
};

export const NOTIFICATION_POSITION_OPTIONS: Array<{
  id: NotificationPosition;
  label: string;
  shortLabel: string;
}> = [
  { id: 'TOP_LEFT', label: 'Top Left', shortLabel: 'Top · Left' },
  { id: 'TOP_RIGHT', label: 'Top Right', shortLabel: 'Top · Right' },
  { id: 'BOTTOM_LEFT', label: 'Bottom Left', shortLabel: 'Bottom · Left' },
  { id: 'BOTTOM_RIGHT', label: 'Bottom Right', shortLabel: 'Bottom · Right' },
];

const VALID_POSITIONS = new Set<NotificationPosition>([
  'TOP_LEFT',
  'TOP_RIGHT',
  'BOTTOM_LEFT',
  'BOTTOM_RIGHT',
]);

export function sanitizeNotificationPrefs(raw: unknown): NotificationPrefs {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_NOTIFICATION_PREFS };
  const obj = raw as Partial<NotificationPrefs>;
  return {
    popupsEnabled:
      typeof obj.popupsEnabled === 'boolean'
        ? obj.popupsEnabled
        : DEFAULT_NOTIFICATION_PREFS.popupsEnabled,
    position:
      obj.position && VALID_POSITIONS.has(obj.position)
        ? obj.position
        : DEFAULT_NOTIFICATION_PREFS.position,
  };
}

export function loadSavedNotificationPrefs(): NotificationPrefs {
  try {
    const raw = window.localStorage.getItem(NOTIFICATION_PREFS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_NOTIFICATION_PREFS };
    return sanitizeNotificationPrefs(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_NOTIFICATION_PREFS };
  }
}

export function saveNotificationPrefs(prefs: NotificationPrefs): void {
  try {
    window.localStorage.setItem(NOTIFICATION_PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore storage quota errors
  }
}

export interface BuyNotificationItem {
  id: string;
  address: string;
  symbol: string;
  price_usd: number;
  amount_usd: number;
  maker_short: string;
  source: LiveTradeEvent['source'];
  created_at_ms: number;
  popup_expires_at_ms: number;
  expires_at_ms: number;
  popup_dismissed?: boolean;
}

export function pruneExpiredBuyNotifications(
  items: BuyNotificationItem[],
  nowMs: number
): BuyNotificationItem[] {
  return items.filter((item) => item.expires_at_ms > nowMs);
}

export function getActivePopupNotifications(
  items: BuyNotificationItem[],
  nowMs: number
): BuyNotificationItem[] {
  return items.filter(
    (item) => !item.popup_dismissed && item.popup_expires_at_ms > nowMs && item.expires_at_ms > nowMs
  );
}

export function dismissPopupNotificationById(
  items: BuyNotificationItem[],
  id: string
): BuyNotificationItem[] {
  return items.map((item) => (item.id === id ? { ...item, popup_dismissed: true } : item));
}

export function removeBuyNotificationById(
  items: BuyNotificationItem[],
  id: string
): BuyNotificationItem[] {
  return items.filter((item) => item.id !== id);
}
