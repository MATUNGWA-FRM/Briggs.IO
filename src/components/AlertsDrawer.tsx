import React, { useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import type { AlertEvent, AlertRule } from '../shared/types';

interface AlertsDrawerProps {
  open: boolean;
  onClose: () => void;
  rules: AlertRule[];
  events: AlertEvent[];
  onCreateRule: (input: {
    name: string;
    condition_type: AlertRule['condition_type'];
    threshold: number;
    channel_dashboard: boolean;
    channel_telegram: boolean;
  }) => Promise<void>;
  onAcknowledge: (id: string) => Promise<void>;
}

export const AlertsDrawer: React.FC<AlertsDrawerProps> = ({
  open,
  onClose,
  rules,
  events,
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
      <div className="w-full max-w-md bg-[#0E131D] border-l border-slate-800 h-full flex flex-col text-xs">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="font-display text-sm font-bold text-slate-100">Brigg Alert Center</h2>
            <p className="text-[11px] text-slate-400">Dashboard & Telegram channels · No autonomous trading</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Create Alert Rule */}
          <form onSubmit={handleSubmit} className="p-3 rounded border border-slate-800 bg-[#111622] space-y-2.5">
            <h3 className="font-display font-semibold text-slate-200">New Alert Rule</h3>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Rule name (e.g. Breakout Opportunity >= 78)"
              className="w-full bg-[#0B0E14] border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={conditionType}
                onChange={(e) => setConditionType(e.target.value as AlertRule['condition_type'])}
                className="bg-[#0B0E14] border border-slate-800 rounded px-2 py-1.5 text-slate-200"
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
                className="bg-[#0B0E14] border border-slate-800 rounded px-2 py-1.5 font-mono text-slate-200"
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
              className="w-full py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded font-medium flex items-center justify-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add Alert Rule
            </button>
          </form>

          {/* Active Rules */}
          <div className="space-y-2">
            <h3 className="font-display font-semibold text-slate-200">Configured Rules ({rules.length})</h3>
            {rules.map((r) => (
              <div key={r.id} className="p-2.5 rounded border border-slate-800 bg-[#111622] flex items-center justify-between">
                <div>
                  <div className="text-slate-200 font-medium">{r.name}</div>
                  <div className="font-mono text-[10px] text-slate-400">
                    {r.condition_type} ({r.threshold}) · Dashboard{r.channel_telegram ? ' + Telegram' : ''}
                  </div>
                </div>
                <span className="font-mono text-[10px] text-emerald-400">{r.enabled ? 'ACTIVE' : 'PAUSED'}</span>
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
                  className={`p-2.5 rounded border ${
                    ev.acknowledged ? 'border-slate-800/60 bg-[#0B0E14] opacity-70' : 'border-slate-700 bg-[#111622]'
                  }`}
                >
                  <div className="flex items-center justify-between font-mono">
                    <span className={ev.severity === 'HIGH_PRIORITY' ? 'text-rose-400 font-semibold' : 'text-sky-300 font-semibold'}>
                      {ev.symbol} · {ev.title}
                    </span>
                    {!ev.acknowledged && (
                      <button
                        type="button"
                        onClick={() => onAcknowledge(ev.id)}
                        className="text-slate-400 hover:text-emerald-400 flex items-center gap-0.5 text-[10px]"
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
