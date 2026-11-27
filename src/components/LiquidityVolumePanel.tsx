import React from 'react';
import type { LiquidityIntelligence, SlippageExecutionEstimate, VolumeIntelligence } from '../shared/types';

interface LiquidityVolumePanelProps {
  liquidity: LiquidityIntelligence;
  volume: VolumeIntelligence;
  slippage: SlippageExecutionEstimate;
  positionSizeUsd: number;
  onPositionSizeChange: (size: number) => void;
}

export const LiquidityVolumePanel: React.FC<LiquidityVolumePanelProps> = ({
  liquidity,
  volume,
  slippage,
  positionSizeUsd,
  onPositionSizeChange,
}) => {
  return (
    <div className="space-y-5 text-xs">
      {/* Liquidity & Slippage Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="p-3.5 rounded border border-[#1E2330] bg-[#0C0E14] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold text-slate-100">Liquidity Intelligence</h3>
            <span className="font-mono text-[11px] text-slate-400">[{liquidity.data_status}]</span>
          </div>

          <div className="grid grid-cols-3 gap-2 font-mono tabular-nums">
            <div className="p-2 rounded bg-[#08090D] border border-[#1E2330]">
              <div className="text-[10px] text-slate-400 font-sans">Liquidity Risk</div>
              <div className={`text-base font-bold ${liquidity.liquidity_risk_score > 60 ? 'text-rose-400' : 'text-slate-100'}`}>
                {liquidity.liquidity_risk_score}/100
              </div>
            </div>
            <div className="p-2 rounded bg-[#08090D] border border-[#1E2330]">
              <div className="text-[10px] text-slate-400 font-sans">Execution Quality</div>
              <div className="text-base font-bold text-[#C4B5FD]">{liquidity.execution_quality_score}/100</div>
            </div>
            <div className="p-2 rounded bg-[#08090D] border border-[#1E2330]">
              <div className="text-[10px] text-slate-400 font-sans">Data Quality</div>
              <div className="text-base font-bold text-slate-100">{liquidity.data_quality_score}/100</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 font-mono text-[11px] tabular-nums">
            <div>
              <span className="text-slate-400 font-sans">Current / 1H Ago: </span>
              <span className="text-slate-200">
                ${Math.round(liquidity.current_liquidity_usd).toLocaleString()} / $
                {Math.round(liquidity.historical_liquidity_1h_ago_usd).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-sans">1H Trajectory: </span>
              <span className={liquidity.liquidity_growth_1h_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {liquidity.liquidity_growth_1h_pct >= 0 ? '+' : ''}
                {liquidity.liquidity_growth_1h_pct}%
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-sans">LP Status: </span>
              <span className="text-slate-200">{liquidity.lp_status}</span>
            </div>
            <div>
              <span className="text-slate-400 font-sans">Est. Exit Capacity: </span>
              <span className="text-slate-200">${liquidity.estimated_exit_capacity_usd.toLocaleString()}</span>
            </div>
          </div>

          <ul className="space-y-1 pt-2 border-t border-slate-800/80 text-[11px]">
            {liquidity.reasons.map((r, i) => (
              <li key={i} className="text-slate-300">
                <span className={`font-mono mr-1.5 ${r.direction === '+' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {r.direction}
                </span>
                {r.text}
              </li>
            ))}
          </ul>
        </div>

        {/* Slippage & Execution Simulator (§26) */}
        <div className="p-3.5 rounded border border-[#1E2330] bg-[#0C0E14] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold text-slate-100">Slippage & Execution Intelligence</h3>
            <span className="font-mono text-[11px] text-sky-400">Size: ${positionSizeUsd.toLocaleString()}</span>
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Simulate Position Size (USD)</label>
            <div className="flex items-center gap-2">
              {[500, 1500, 5000, 15000, 50000].map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => onPositionSizeChange(sz)}
                  className={`px-2 py-1 text-[11px] font-mono rounded-sm border ${
                    positionSizeUsd === sz
                      ? 'border-[#7C5CFF]/60 bg-[#7C5CFF]/20 text-[#C4B5FD]'
                      : 'border-[#1E2330] bg-[#08090D] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  ${sz >= 1000 ? `${sz / 1000}k` : sz}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 font-mono text-[11px] tabular-nums pt-1">
            <div>
              <span className="text-slate-400 font-sans block">Expected Spot Price</span>
              <span className="text-slate-100">${slippage.expected_price_usd}</span>
            </div>
            <div>
              <span className="text-slate-400 font-sans block">Est. Executed Price</span>
              <span className="text-slate-100">${slippage.estimated_executed_price_usd}</span>
            </div>
            <div>
              <span className="text-slate-400 font-sans block">Price Impact</span>
              <span className={slippage.price_impact_pct > 3 ? 'text-rose-400 font-semibold' : 'text-emerald-400'}>
                {slippage.price_impact_pct}%
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-sans block">Slippage (Signed)</span>
              <span className="text-amber-300">{slippage.slippage_pct}%</span>
            </div>
            <div>
              <span className="text-slate-400 font-sans block">Priority Fee Est.</span>
              <span className="text-slate-200">{slippage.priority_fee_sol} SOL</span>
            </div>
            <div>
              <span className="text-slate-400 font-sans block">Adjusted Exec Quality</span>
              <span className="text-[#C4B5FD] font-semibold">{slippage.execution_quality_score}/100</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
            {slippage.sign_convention_note}
          </p>
          {slippage.warning && (
            <p className="text-[11px] text-rose-300">{slippage.warning}</p>
          )}
        </div>
      </div>

      {/* Volume Intelligence (§10) */}
      <div className="p-3.5 rounded border border-[#1E2330] bg-[#0C0E14] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-display text-sm font-semibold text-slate-100">Volume Intelligence</h3>
            <p className="text-[11px] text-slate-400">{volume.price_volume_relationship}</p>
          </div>
          <div className="flex items-center gap-4 font-mono text-[11px] tabular-nums">
            <span>
              Organic Est: <strong className="text-emerald-400">{volume.estimated_organic_pct}%</strong>
            </span>
            <span>
              Automated Est: <strong className="text-amber-300">{volume.possible_automated_pct}%</strong>
            </span>
            <span>
              Wash Risk: <strong className={volume.anomalies.wash_trading_risk === 'HIGH' ? 'text-rose-400' : 'text-slate-200'}>{volume.anomalies.wash_trading_risk}</strong>
            </span>
            <span>
              Quality: <strong className="text-[#C4B5FD]">{volume.volume_quality_score}/100</strong>
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-[11px] tabular-nums">
            <thead className="text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-1.5 pr-3">Window</th>
                <th className="py-1.5 pr-3 text-right">Total Vol</th>
                <th className="py-1.5 pr-3 text-right">Buy Vol</th>
                <th className="py-1.5 pr-3 text-right">Sell Vol</th>
                <th className="py-1.5 pr-3 text-right">Buys / Sells</th>
                <th className="py-1.5 pr-3 text-right">B/S Ratio</th>
                <th className="py-1.5 text-right">Est. Traders</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {volume.windows.map((w) => (
                <tr key={w.timeframe}>
                  <td className="py-1.5 pr-3 text-slate-200 font-semibold">{w.timeframe}</td>
                  <td className="py-1.5 pr-3 text-right text-slate-100">${w.total_volume_usd.toLocaleString()}</td>
                  <td className="py-1.5 pr-3 text-right text-emerald-400">${w.buy_volume_usd.toLocaleString()}</td>
                  <td className="py-1.5 pr-3 text-right text-rose-400">${w.sell_volume_usd.toLocaleString()}</td>
                  <td className="py-1.5 pr-3 text-right text-slate-300">
                    {w.buy_count} / {w.sell_count}
                  </td>
                  <td className={`py-1.5 pr-3 text-right font-semibold ${w.buy_sell_ratio >= 1.1 ? 'text-emerald-400' : w.buy_sell_ratio < 0.85 ? 'text-rose-400' : 'text-slate-200'}`}>
                    {w.buy_sell_ratio.toFixed(2)}x
                  </td>
                  <td className="py-1.5 text-right text-slate-300">{w.unique_traders}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-slate-400">{volume.anomalies.evidence_note}</p>
      </div>
    </div>
  );
};
