import React from 'react';
import { ArrowUpRight, BellRing, Trash2, X } from 'lucide-react';
import {
  BUY_NOTIFICATION_TTL_MS,
  BUY_POPUP_TTL_MS,
  dismissPopupNotificationById,
  getActivePopupNotifications,
  pruneExpiredBuyNotifications,
  removeBuyNotificationById,
  type BuyNotificationItem,
  type NotificationPosition,
} from '../shared/notificationConfig';

export {
  BUY_NOTIFICATION_TTL_MS,
  BUY_POPUP_TTL_MS,
  dismissPopupNotificationById,
  getActivePopupNotifications,
  pruneExpiredBuyNotifications,
  removeBuyNotificationById,
  type BuyNotificationItem,
};

interface BuyNotificationStackProps {
  notifications: BuyNotificationItem[];
  nowMs: number;
  enabled: boolean;
  position: NotificationPosition;
  onDismissPopup: (id: string) => void;
  onDelete: (id: string) => void;
  onOpenNotificationBar: () => void;
  onSelectToken: (address: string) => void;
}

const POSITION_CLASSES: Record<NotificationPosition, string> = {
  TOP_LEFT: 'top-14 left-3',
  TOP_RIGHT: 'top-14 right-3',
  BOTTOM_LEFT: 'bottom-3 left-3',
  BOTTOM_RIGHT: 'bottom-3 right-3',
};

export const BuyNotificationStack: React.FC<BuyNotificationStackProps> = ({
  notifications,
  nowMs,
  enabled,
  position,
  onDismissPopup,
  onDelete,
  onOpenNotificationBar,
  onSelectToken,
}) => {
  if (!enabled) return null;

  // Pop-ups stay visible on screen for 5 seconds; after 5s they remain in the 2-minute Notification Bar
  const activePopups = getActivePopupNotifications(notifications, nowMs).slice(0, 3);
  if (activePopups.length === 0) return null;

  const isTop = position.startsWith('TOP');

  return (
    <div
      className={`fixed ${POSITION_CLASSES[position]} z-50 w-80 max-w-[calc(100vw-1.5rem)] flex ${
        isTop ? 'flex-col' : 'flex-col-reverse'
      } gap-2 pointer-events-none`}
      role="region"
      aria-label="Live Buy Pop-Up Notifications (5s)"
    >
      {activePopups.map((n) => {
        const remainingPopupMs = Math.max(0, n.popup_expires_at_ms - nowMs);
        const remainingSec = Math.max(1, Math.ceil(remainingPopupMs / 1000));
        const pct = Math.max(0, Math.min(100, (remainingPopupMs / BUY_POPUP_TTL_MS) * 100));
        const sourceLabel =
          n.source === 'LIVE_DEXSCREENER'
            ? 'LIVE QUOTE'
            : n.source === 'ESTIMATED_INTRABAR'
            ? 'INTRABAR EST'
            : 'MOCK';

        return (
          <div
            key={n.id}
            className="pointer-events-auto rounded-sm border border-[#00E599]/50 bg-[#0C0E14] shadow-2xl overflow-hidden text-xs"
            role="status"
          >
            <div className="p-2.5 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onSelectToken(n.address)}
                  className="inline-flex items-center gap-1.5 font-mono font-bold text-[#00E599] hover:underline text-left min-w-0 truncate"
                >
                  <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                  <span>NEW BUY · {n.symbol}</span>
                </button>

                <div className="flex items-center gap-1 shrink-0 font-mono text-[10px] tabular-nums">
                  <span className="text-[#00E599]" title="Screen pop-up duration (5s)">
                    {remainingSec}s
                  </span>
                  <button
                    type="button"
                    onClick={() => onDelete(n.id)}
                    className="p-0.5 rounded-sm text-slate-400 hover:text-[#FF4D6A] hover:bg-[#171B26] transition-colors"
                    title="Delete from screen & 2m notification bar"
                    aria-label="Delete buy notification"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDismissPopup(n.id)}
                    className="p-0.5 rounded-sm text-slate-400 hover:text-slate-100 hover:bg-[#171B26] transition-colors"
                    title="Hide pop-up (keeps in 2m notification bar)"
                    aria-label="Dismiss buy pop-up"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between font-mono text-[11px] tabular-nums">
                <span className="text-slate-100 font-semibold">
                  +${n.amount_usd.toLocaleString()} USD
                </span>
                <span className="text-slate-300">@ ${n.price_usd}</span>
              </div>

              <div className="flex items-center justify-between font-mono text-[10px] text-slate-400">
                <span>
                  {n.maker_short} · {sourceLabel}
                </span>
                <button
                  type="button"
                  onClick={onOpenNotificationBar}
                  className="inline-flex items-center gap-1 text-[#C4B5FD] hover:underline"
                  title="Open 2-minute Notification Bar"
                >
                  <BellRing className="w-2.5 h-2.5" />
                  <span>2m Bar</span>
                </button>
              </div>
            </div>

            {/* 5-Second On-Screen Pop-Up Countdown Bar */}
            <div className="h-0.5 w-full bg-[#1E2330]">
              <div
                className="h-full bg-[#00E599] transition-all duration-1000 linear"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
