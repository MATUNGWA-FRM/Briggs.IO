import React from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import type { LiveTradeEvent } from '../shared/types';

interface LiveTradesTapeProps {
  trades: LiveTradeEvent[];
  symbol: string;
  buys5m: number;
  sells5m: number;
  streaming: boolean;
}

export const LiveTradesTape: React.FC<LiveTradesTapeProps> = ({
  trades,
  symbol,
  buys5m,
  sells5m,
  streaming,
}) => {
  const totalTx = Math.max(1, buys5m + sells5m);
  const buyPct = Math.round((buys5m / totalTx) * 100);

  return (
    <div className="space-y-3 text-xs">
      {/* Live 5M Orderflow Summary Bar */}
      <div className="p-3 rounded border border-[#1E2330] bg-[#0C0E14] flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold text-slate-200 uppercase tracking-wider">
            {symbol} Live Execution Tape
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            {streaming ? 'Streaming 1.5s market ticks' : 'Stream paused'} · {trades.length} recent events
          </div>
        </div>

        <div className="flex-1 max-w-md space-y-1">
          <div className="flex items-center justify-between font-mono text-[11px] tabular-nums">
            <span className="text-[#00E599]">Buys: {buys5m} ({buyPct}%)</span>
            <span className="text-[#FF4D6A]">Sells: {sells5m} ({100 - buyPct}%)</span>
          </div>
          <div className="h-1.5 w-full rounded-sm bg-[#1A1E2B] overflow-hidden flex">
            <div className="h-full bg-[#00E599] transition-all duration-300" style={{ width: `${buyPct}%` }} />
            <div className="h-full bg-[#FF4D6A] transition-all duration-300" style={{ width: `${100 - buyPct}%` }} />
          </div>
        </div>
      </div>

      {/* Padre-Style Tape Table */}
      <div className="rounded border border-[#1E2330] bg-[#0C0E14] overflow-hidden">
        <div className="overflow-x-auto max-h-[340px] overflow-y-auto">
          <table className="w-full text-left font-mono text-[11px] tabular-nums">
            <thead className="sticky top-0 bg-[#12151E] text-slate-400 border-b border-[#1E2330]">
              <tr>
                <th className="py-2 px-3">Time (UTC)</th>
                <th className="py-2 px-3">Type</th>
                <th className="py-2 px-3 text-right">Price USD</th>
                <th className="py-2 px-3 text-right">Total USD</th>
                <th className="py-2 px-3">Maker</th>
                <th className="py-2 px-3 text-right">Feed Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E2330]/70">
              {trades.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500">
                    Waiting for incoming market ticks...
                  </td>
                </tr>
              ) : (
                trades.map((tr) => {
                  const isBuy = tr.side === 'BUY';
                  return (
                    <tr key={tr.id} className="hover:bg-[#141824] transition-colors">
                      <td className="py-1.5 px-3 text-slate-400">
                        {new Date(tr.timestamp_ms).toISOString().slice(11, 19)}
                      </td>
                      <td className="py-1.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 font-semibold ${
                            isBuy ? 'text-[#00E599]' : 'text-[#FF4D6A]'
                          }`}
                        >
                          {isBuy ? (
                            <ArrowUpRight className="w-3 h-3" />
                          ) : (
                            <ArrowDownRight className="w-3 h-3" />
                          )}
                          {tr.side}
                        </span>
                      </td>
                      <td className={`py-1.5 px-3 text-right ${isBuy ? 'text-[#00E599]' : 'text-[#FF4D6A]'}`}>
                        ${tr.price_usd}
                      </td>
                      <td className="py-1.5 px-3 text-right text-slate-200 font-medium">
                        ${tr.amount_usd.toLocaleString()}
                      </td>
                      <td className="py-1.5 px-3 text-slate-400">{tr.maker_short}</td>
                      <td className="py-1.5 px-3 text-right text-[10px] text-slate-400">
                        {tr.source === 'LIVE_DEXSCREENER'
                          ? 'LIVE QUOTE'
                          : tr.source === 'ESTIMATED_INTRABAR'
                          ? 'INTRABAR EST'
                          : 'MOCK'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
