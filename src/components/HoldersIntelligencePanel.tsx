import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { BubbleMapNode, BubbleMapPayload } from '../server/graph/bubbleMapBuilder';
import type { HolderIntelligence } from '../shared/types';
import { BubbleMap2D } from './BubbleMap2D';
import { BubbleMap3D } from './BubbleMap3D';

interface HoldersIntelligencePanelProps {
  holders: HolderIntelligence;
  bubbleMap: BubbleMapPayload;
  selectedWallet: BubbleMapNode | null;
  onSelectWallet: (w: BubbleMapNode | null) => void;
}

export const HoldersIntelligencePanel: React.FC<HoldersIntelligencePanelProps> = ({
  holders,
  bubbleMap,
  selectedWallet,
  onSelectWallet,
}) => {
  const [graphMode, setGraphMode] = useState<'2D' | '3D'>('2D');

  const handleSelectWalletById = (walletId: string) => {
    const node = bubbleMap.nodes.find((n) => n.id === walletId) || null;
    onSelectWallet(node);
  };

  const handleSelectCluster = (clusterId: string) => {
    const member = bubbleMap.nodes.find((n) => n.cluster_id === clusterId) || null;
    onSelectWallet(member);
  };

  return (
    <div className="space-y-5 text-xs">
      {/* Summary Cards: Holders, Snipers, Insiders, Bundles */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="p-3 rounded border border-[#1E2330] bg-[#0C0E14]">
          <div className="text-[11px] text-slate-400">Holder Concentration</div>
          <div className="font-mono text-lg font-bold text-slate-100 mt-0.5 tabular-nums">
            {holders.holder_count.toLocaleString()} holders
          </div>
          <div className="font-mono text-[11px] text-slate-300 mt-1 tabular-nums">
            Top 10: {holders.top_10_concentration_pct}% · Top 20: {holders.top_20_concentration_pct}%
          </div>
          <div className="text-[11px] text-emerald-400 font-mono mt-0.5 tabular-nums">
            1H Growth: {holders.holder_growth_1h_pct >= 0 ? '+' : ''}
            {holders.holder_growth_1h_pct}%
          </div>
        </div>

        <div className="p-3 rounded border border-[#1E2330] bg-[#0C0E14]">
          <div className="text-[11px] text-slate-400">Sniper Analysis</div>
          <div className="font-mono text-lg font-bold text-amber-300 mt-0.5 tabular-nums">
            {holders.sniper_analysis.supply_pct}% supply
          </div>
          <div className="font-mono text-[11px] text-slate-300 mt-1">
            {holders.sniper_analysis.exposure_band} · {holders.sniper_analysis.suspected_snipers} snipers
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {holders.sniper_analysis.exited_pct}% exited · Sniper ≠ Insider
          </div>
        </div>

        <div className="p-3 rounded border border-[#1E2330] bg-[#0C0E14]">
          <div className="text-[11px] text-slate-400">Insider Exposure</div>
          <div className="font-mono text-lg font-bold text-rose-400 mt-0.5 tabular-nums">
            {holders.insider_analysis.exposure_score}/100
          </div>
          <div className="font-mono text-[11px] text-slate-300 mt-1">
            Behavior: {holders.insider_analysis.behavior} ({holders.insider_analysis.supply_pct}% supply)
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 truncate">
            {holders.insider_analysis.evidence[0]}
          </div>
        </div>

        <div className="p-3 rounded border border-[#1E2330] bg-[#0C0E14]">
          <div className="text-[11px] text-slate-400">Bundle Clusters</div>
          <div className="font-mono text-lg font-bold text-orange-400 mt-0.5 tabular-nums">
            {holders.bundle_analysis.combined_supply_pct}% supply
          </div>
          <div className="font-mono text-[11px] text-slate-300 mt-1">
            {holders.bundle_analysis.cluster_count} probabilistic clusters
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Distribution Health: {holders.distribution_health_score}/100
          </div>
        </div>
      </div>

      {/* Interactive Holder Relationship Bubble Graph */}
      <div className="p-3.5 rounded border border-[#1E2330] bg-[#0C0E14] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-display text-sm font-semibold text-slate-100">
              Holder Bubble Map & Wallet Relationship Graph
            </h3>
            <p className="text-[11px] text-slate-400">
              Bubbles sized by holdings / % supply · Click any wallet bubble or row below to inspect relationships
            </p>
          </div>
          <div className="inline-flex items-center rounded-sm border border-[#1E2330] bg-[#08090D] p-0.5">
            <button
              type="button"
              onClick={() => setGraphMode('2D')}
              className={`px-2.5 py-1 text-[11px] font-mono rounded-sm whitespace-nowrap shrink-0 transition-colors ${
                graphMode === '2D' ? 'bg-[#7C5CFF]/25 text-[#C4B5FD]' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              2D (Cytoscape)
            </button>
            <button
              type="button"
              onClick={() => setGraphMode('3D')}
              className={`px-2.5 py-1 text-[11px] font-mono rounded-sm whitespace-nowrap shrink-0 transition-colors ${
                graphMode === '3D' ? 'bg-[#7C5CFF]/25 text-[#C4B5FD]' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              3D (Three.js)
            </button>
          </div>
        </div>

        {graphMode === '2D' ? (
          <BubbleMap2D
            graph={bubbleMap}
            selectedWallet={selectedWallet}
            onSelectWallet={onSelectWallet}
            heightClassName="h-[360px]"
          />
        ) : (
          <BubbleMap3D
            graph={bubbleMap}
            selectedWallet={selectedWallet}
            onSelectWallet={onSelectWallet}
            heightClassName="h-[360px]"
          />
        )}
      </div>

      {/* Red-Flag Engine & Clusters */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="p-3.5 rounded border border-[#1E2330] bg-[#0C0E14] space-y-2">
          <h3 className="font-display text-sm font-semibold text-slate-100">Distribution & Red-Flag Engine</h3>
          {holders.red_flags.length === 0 ? (
            <p className="text-slate-400 text-[11px]">No acute distribution red flags triggered at current thresholds.</p>
          ) : (
            <div className="space-y-2">
              {holders.red_flags.map((rf, i) => (
                <div key={i} className="flex items-start gap-2 text-[11px]">
                  <AlertTriangle
                    className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                      rf.severity === 'HIGH' ? 'text-rose-400' : 'text-amber-400'
                    }`}
                  />
                  <div>
                    <span className="font-semibold text-slate-200">{rf.type} ({rf.severity}): </span>
                    <span className="text-slate-300">{rf.description}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-3.5 rounded border border-[#1E2330] bg-[#0C0E14] space-y-2">
          <h3 className="font-display text-sm font-semibold text-slate-100">Detected Bundle & Insider Clusters</h3>
          <div className="space-y-2">
            {holders.bundle_analysis.clusters.map((cl) => (
              <button
                key={cl.cluster_id}
                type="button"
                onClick={() => handleSelectCluster(cl.cluster_id)}
                className="w-full text-left p-2 rounded border border-slate-800 bg-[#08090D] hover:border-sky-500/40 transition-colors text-[11px]"
              >
                <div className="flex items-center justify-between font-mono">
                  <span className="text-[#C4B5FD] font-semibold">{cl.cluster_id}</span>
                  <span className="text-slate-200 tabular-nums">
                    {cl.wallet_count} wallets · {cl.combined_supply_pct}% · Conf {Math.round(cl.relationship_confidence * 100)}%
                  </span>
                </div>
                <div className="text-slate-400 mt-0.5">{cl.funding_relationship}</div>
                <div className="text-slate-500 text-[10px] mt-0.5">{cl.evidence}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Classified Wallet Ledger */}
      <div className="p-3.5 rounded border border-[#1E2330] bg-[#0C0E14]">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-display text-sm font-semibold text-slate-100">Classified Wallet Intelligence</h3>
          <span className="font-mono text-[11px] text-slate-400">Source Status: {holders.data_status}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-[11px] tabular-nums">
            <thead className="text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-1.5 pr-3">Wallet</th>
                <th className="py-1.5 pr-3">Classification</th>
                <th className="py-1.5 pr-3 text-right">Supply %</th>
                <th className="py-1.5 pr-3 text-right">Value USD</th>
                <th className="py-1.5 pr-3">Behavior</th>
                <th className="py-1.5 pr-3">Funding Source</th>
                <th className="py-1.5 text-right">Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {holders.wallets.map((w) => {
                const isActive = selectedWallet?.id === w.id;
                return (
                  <tr
                    key={w.id}
                    onClick={() => handleSelectWalletById(w.id)}
                    className={`cursor-pointer transition-colors ${
                      isActive ? 'bg-[#7C5CFF]/15' : 'hover:bg-[#141824]'
                    }`}
                  >
                    <td className="py-1.5 pr-3 text-slate-200">{w.short_address}</td>
                    <td className="py-1.5 pr-3 text-[#C4B5FD]">{w.classification}</td>
                    <td className="py-1.5 pr-3 text-right text-slate-100">{w.supply_pct.toFixed(2)}%</td>
                    <td className="py-1.5 pr-3 text-right text-slate-300">${w.balance_usd.toLocaleString()}</td>
                    <td className="py-1.5 pr-3 text-slate-300">{w.behavior}</td>
                    <td className="py-1.5 pr-3 text-slate-400 font-sans truncate max-w-[180px]">{w.funding_source}</td>
                    <td className={`py-1.5 text-right font-semibold ${w.risk_score >= 70 ? 'text-rose-400' : 'text-slate-300'}`}>
                      {w.risk_score}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
