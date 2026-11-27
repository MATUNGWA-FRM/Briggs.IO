import React, { useState } from 'react';
import { ArrowUpRight, BellRing, Check, Plus, Trash2, X } from 'lucide-react';
import {
  BUY_NOTIFICATION_TTL_MS,
  type BuyNotificationItem,
  type NotificationPrefs,
} from '../shared/notificationConfig';
import type { AlertEvent, AlertRule } from '../shared/types';
import { NotificationSettingsControls } from './NotificationSettingsControls';

interface AlertsDrawerProps {
  open: boolean;
  onClose: () => void;
  rules: AlertRule[];
  events: AlertEvent[];
  buyNotifications: BuyNotificationItem[];
  nowMs: number;
  notificationPrefs: NotificationPrefs;
  onChangeNotificationPrefs: (next: NotificationPrefs) => void;
  onDeleteBuyNotification: (id: string) => void;
  onClearAllBuyNotifications: () => void;
  onSelectToken: (address: string) => void;
  onCreateRule: (input: {
    name: string;
    condition_type: AlertRule['condition_type'];
    threshold: number;
    channel_dashboard: boolean;
    channel_telegram: boolean;
  }) => Promise<void>;
  onAcknowledge: (id: string) => Promise<void>;
}

function formatRemainingTime(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export const AlertsDrawer: React.FC<AlertsDrawerProps> = ({
  open,
  onClose,
  rules,
  events,
  buyNotifications,
  nowMs,
  notificationPrefs,
  onChangeNotificationPrefs,
  onDeleteBuyNotification,
  onClearAllBuyNotifications,
  onSelectToken,
  onCreateRule,
  onAcknowledge,
}) => {
  const [name, setName] = useState('');
  const [conditionType, setConditionType] = useState<AlertRule['condition_type']>('OPPORTUNITY_ABOVE');
  const [threshold, setThreshold] = useState(75);
  const [telegram, setTelegram] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await onCreateRule({
      name: name.trim(),
      condition_type: conditionType,
      threshold,
      channel_dashboard: true,
      channel_telegram: telegram,
    });
    setName('');
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60">
      <div className="w-full max-w-md bg-[#0C0E14] border-l border-[#1E2330] h-full flex flex-col text-xs">
        <div className="p-4 border-b border-[#1E2330] flex items-center justify-between">
          <div>
            <h2 className="font-display text-sm font-bold text-slate-100">
              Notification Bar & Alert Center
            </h2>
            <p className="text-[11px] text-slate-400">
              2.5s on-screen pop-up · 2m notification bar retention · No autonomous trading
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Notification Bar & Screen Pop-Up Position Settings */}
          <NotificationSettingsControls
            prefs={notificationPrefs}
            onChangePrefs={onChangeNotificationPrefs}
            activeBarCount={buyNotifications.length}
            onClearAll={onClearAllBuyNotifications}
            compact
          />

          {/* 2-Minute Live Buy Notification Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-semibold text-slate-200 inline-flex items-center gap-1.5">
                <BellRing className="w-3.5 h-3.5 text-[#00E599]" />
                <span>Live Buy Notification Bar (2m · {buyNotifications.length})</span>
              </h3>
              {buyNotifications.length > 0 && (
                <button
                  type="button"
                  onClick={onClearAllBuyNotifications}
                  className="font-mono text-[10px] text-slate-400 hover:text-[#FF4D6A]"
                >
                  Clear all
                </button>
              )}
            </div>

            {buyNotifications.length === 0 ? (
              <div className="p-3 rounded-sm border border-[#1E2330] bg-[#08090D] text-slate-400">
                Listening for live BUY trades. New notifications pop on screen for 2.5s (unless hidden) and stay here for 2 minutes.
              </div>
            ) : (
              <div className="space-y-1.5">
                {buyNotifications.map((n) => {
                  const remainingMs = Math.max(0, n.expires_at_ms - nowMs);
                  const pct = Math.max(
                    0,
                    Math.min(100, (remainingMs / BUY_NOTIFICATION_TTL_MS) * 100)
                  );
                  const sourceLabel =
                    n.source === 'LIVE_DEXSCREENER'
                      ? 'LIVE QUOTE'
                      : n.source === 'ESTIMATED_INTRABAR'
                      ? 'INTRABAR EST'
                      : 'MOCK';

                  return (
                    <div
                      key={n.id}
                      className="rounded-sm border border-[#00E599]/35 bg-[#08090D] overflow-hidden"
                    >
                      <div className="p-2.5 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              onSelectToken(n.address);
                              onClose();
                            }}
                            className="inline-flex items-center gap-1 font-mono font-bold text-[#00E599] hover:underline truncate"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                            <span>NEW BUY · {n.symbol}</span>
                          </button>
                          <div className="flex items-center gap-1.5 font-mono text-[10px] tabular-nums shrink-0">
                            <span className="text-slate-300" title="Remaining in 2m notification bar">
                              {formatRemainingTime(remainingMs)}
                            </span>
                            <button
                              type="button"
                              onClick={() => onDeleteBuyNotification(n.id)}
                              className="p-0.5 rounded-sm text-slate-400 hover:text-[#FF4D6A] hover:bg-[#171B26]"
                              title="Delete notification"
                              aria-label="Delete buy notification"
                            >
                              <Trash2 className="w-3 h-3" />
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
                          <span>Maker {n.maker_short}</span>
                          <span>
                            {new Date(n.created_at_ms).toISOString().slice(11, 19)} UTC · {sourceLabel}
                          </span>
                        </div>
                      </div>
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
            )}
          </div>

          {/* Create Alert Rule */}
          <form onSubmit={handleSubmit} className="p-3 rounded-sm border border-[#1E2330] bg-[#08090D] space-y-2.5">
            <h3 className="font-display font-semibold text-slate-200">New Alert Rule</h3>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Rule name (e.g. Breakout Opportunity >= 78)"
              className="w-full bg-[#0C0E14] border border-[#1E2330] rounded-sm px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-[#7C5CFF]"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={conditionType}
                onChange={(e) => setConditionType(e.target.value as AlertRule['condition_type'])}
                className="bg-[#0C0E14] border border-[#1E2330] rounded-sm px-2 py-1.5 text-slate-200"
              >
                <option value="OPPORTUNITY_ABOVE">Opportunity Above</option>
                <option value="RISK_BELOW">Risk Below</option>
                <option value="VOLUME_ACCELERATION">Volume Acceleration %</option>
                <option value="HOLDER_GROWTH">Holder Growth %</option>
                <option value="SOCIAL_ACCELERATION">Social Acceleration</option>
                <option value="LIQUIDITY_DECLINE">Liquidity Decline %</option>
                <option value="INSIDER_SELLING">Insider Selling</option>
                <option value="BUNDLE_DETECTION">Bundle Detection %</option>
                <option value="SNIPER_INCREASE">Sniper Increase %</option>
                <option value="MARKET_REGIME_CHANGE">Market Regime Change</option>
                <option value="SCANNER_ENTRY">Token Entering Scanner</option>
              </select>
              <input
                type="number"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="bg-[#0C0E14] border border-[#1E2330] rounded-sm px-2 py-1.5 font-mono text-slate-200"
              />
            </div>
            <label className="flex items-center gap-2 text-slate-300">
              <input
                type="checkbox"
                checked={telegram}
                onChange={(e) => setTelegram(e.target.checked)}
                className="rounded border-slate-700"
              />
              Also dispatch to Telegram (when TELEGRAM_BOT_TOKEN configured)
            </label>
            <button
              type="submit"
              className="w-full py-1.5 bg-[#7C5CFF] hover:bg-[#6D4AFF] text-white rounded-sm font-medium flex items-center justify-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add Alert Rule
            </button>
          </form>

          {/* Active Rules */}
          <div className="space-y-2">
            <h3 className="font-display font-semibold text-slate-200">Configured Rules ({rules.length})</h3>
            {rules.map((r) => (
              <div key={r.id} className="p-2.5 rounded-sm border border-[#1E2330] bg-[#08090D] flex items-center justify-between">
                <div>
                  <div className="text-slate-200 font-medium">{r.name}</div>
                  <div className="font-mono text-[10px] text-slate-400">
                    {r.condition_type} ({r.threshold}) · Dashboard{r.channel_telegram ? ' + Telegram' : ''}
                  </div>
                </div>
                <span className="font-mono text-[10px] text-[#00E599]">{r.enabled ? 'ACTIVE' : 'PAUSED'}</span>
              </div>
            ))}
          </div>

          {/* Alert Events */}
          <div className="space-y-2">
            <h3 className="font-display font-semibold text-slate-200">Triggered Alert Feed ({events.length})</h3>
            {events.length === 0 ? (
              <p className="text-slate-400">No alerts triggered yet for scanned tokens.</p>
            ) : (
              events.map((ev) => (
                <div
                  key={ev.id}
                  className={`p-2.5 rounded-sm border ${
                    ev.acknowledged ? 'border-[#1E2330]/60 bg-[#08090D] opacity-70' : 'border-[#282F42] bg-[#12151E]'
                  }`}
                >
                  <div className="flex items-center justify-between font-mono">
                    <span className={ev.severity === 'HIGH_PRIORITY' ? 'text-[#FF4D6A] font-semibold' : 'text-[#C4B5FD] font-semibold'}>
                      {ev.symbol} · {ev.title}
                    </span>
                    {!ev.acknowledged && (
                      <button
                        type="button"
                        onClick={() => onAcknowledge(ev.id)}
                        className="text-slate-400 hover:text-[#00E599] flex items-center gap-0.5 text-[10px]"
                      >
                        <Check className="w-3 h-3" /> Ack
                      </button>
                    )}
                  </div>
                  <p className="text-slate-300 mt-1">{ev.detail}</p>
                  <div className="text-[10px] font-mono text-slate-500 mt-1">
                    {ev.timestamp.replace('T', ' ').slice(0, 19)} UTC · {ev.delivered_channels.join(', ')}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
