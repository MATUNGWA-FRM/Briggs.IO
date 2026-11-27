import React from 'react';
import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import type { TokenFullAnalysis } from '../shared/types';

interface ForensicsPanelProps {
  analysis: TokenFullAnalysis;
}

export const ForensicsPanel: React.FC<ForensicsPanelProps> = ({ analysis }) => {
  const { forensics, data_sources, conflicts, freshness } = analysis;

  return (
    <div className="space-y-5 text-xs">
      {/* Identity & Contract Forensics */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="p-3.5 rounded border border-[#1E2330] bg-[#0C0E14] space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold text-slate-100">Token Forensics</h3>
            <span className="font-mono text-[11px] text-slate-400">
              {forensics.chain.toUpperCase()} · {forensics.data_status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-y-2 gap-x-4 font-mono tabular-nums text-[11px]">
            <div>
              <span className="text-slate-400 font-sans block">Mint Address</span>
              <span className="text-slate-200 break-all">{forensics.address}</span>
            </div>
            <div>
              <span className="text-slate-400 font-sans block">Deployer / Creator</span>
              <span className="text-slate-200 break-all">{forensics.creator_deployer}</span>
            </div>
            <div>
              <span className="text-slate-400 font-sans block">Launch Platform</span>
              <span className="text-slate-100">{forensics.launch_platform}</span>
            </div>
            <div>
              <span className="text-slate-400 font-sans block">Migration Status</span>
              <span className="text-[#C4B5FD]">{forensics.migration_status}</span>
            </div>
            <div>
              <span className="text-slate-400 font-sans block">Initial Liquidity</span>
              <span className="text-slate-100">${forensics.initial_liquidity_usd.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-slate-400 font-sans block">Current Liquidity</span>
              <span className="text-slate-100">${Math.round(forensics.current_liquidity_usd).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-slate-400 font-sans block">FDV / Market Cap</span>
              <span className="text-slate-100">
                ${Math.round(forensics.fdv_usd).toLocaleString()} / ${Math.round(forensics.market_cap_usd).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-sans block">Token Age</span>
              <span className="text-slate-100">
                {forensics.age_minutes < 120 ? `${forensics.age_minutes} mins` : `${(forensics.age_minutes / 60).toFixed(1)} hrs`}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
            <div>
              <span className="text-slate-400 font-sans block">Mint Auth</span>
              <span className={forensics.contract_attributes.mint_authority_revoked ? 'text-emerald-400' : 'text-rose-400'}>
                {forensics.contract_attributes.mint_authority_revoked ? 'Revoked' : 'Active/Unverified'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-sans block">Freeze Auth</span>
              <span className={forensics.contract_attributes.freeze_authority_revoked ? 'text-emerald-400' : 'text-rose-400'}>
                {forensics.contract_attributes.freeze_authority_revoked ? 'Revoked' : 'Active/Unverified'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-sans block">Sell Restriction</span>
              <span className={forensics.contract_attributes.sell_restriction_detected ? 'text-rose-400' : 'text-emerald-400'}>
                {forensics.contract_attributes.sell_restriction_detected ? 'Detected' : 'None Observed'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-sans block">Transfer Fee</span>
              <span className="text-slate-200">{forensics.contract_attributes.transfer_fee_bps ?? 0} bps</span>
            </div>
          </div>
        </div>

        {/* Lifecycle Timeline (§8) */}
        <div className="p-3.5 rounded border border-[#1E2330] bg-[#0C0E14]">
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="font-display text-sm font-semibold text-slate-100">Lifecycle Reconstruction</h3>
            <span className="text-[11px] text-slate-400">Migration ≠ Safety</span>
          </div>
          <div className="space-y-2">
            {forensics.lifecycle_timeline.map((step) => (
              <div key={step.stage} className="flex items-start gap-2.5">
                <CheckCircle2
                  className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${step.completed ? 'text-[#9D7BFF]' : 'text-slate-600'}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-medium text-slate-200">{step.stage}</span>
                    <span className="font-mono text-[10px] text-slate-500 shrink-0">
                      {step.timestamp.slice(11, 19)} UTC · {step.data_status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">{step.summary}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Data Sources, Conflicts & Freshness (§5, §50) */}
      <div className="p-3.5 rounded border border-[#1E2330] bg-[#0C0E14] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-sm font-semibold text-slate-100">
            Data Sources, Integrity & Freshness
          </h3>
          <div className="flex items-center gap-3 font-mono text-[11px] text-slate-300 tabular-nums">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[#9D7BFF]" />
              Updated {freshness.updated_seconds_ago}s ago
            </span>
            <span>Ingest: {freshness.ingestion_delay_ms}ms</span>
            <span>Proc: {freshness.processing_delay_ms}ms</span>
            <span>Total: {freshness.total_analysis_latency_ms}ms</span>
          </div>
        </div>

        {conflicts.length > 0 && (
          <div className="p-2.5 rounded border border-amber-500/40 bg-amber-950/20 space-y-1">
            {conflicts.map((c, idx) => (
              <div key={idx} className="flex items-start gap-2 text-[11px] text-amber-200">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <span className="font-mono font-semibold">[{c.severity} CONFLICT: {c.field}]</span> {c.resolution_note}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-[11px] tabular-nums">
            <thead className="text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-1.5 pr-3">Provider</th>
                <th className="py-1.5 pr-3">Status</th>
                <th className="py-1.5 pr-3">Freshness</th>
                <th className="py-1.5 pr-3">Confidence</th>
                <th className="py-1.5">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {data_sources.map((src) => (
                <tr key={src.source}>
                  <td className="py-1.5 pr-3 text-slate-200 uppercase">{src.source}</td>
                  <td
                    className={`py-1.5 pr-3 font-semibold ${
                      src.data_status === 'REAL'
                        ? 'text-emerald-400'
                        : src.data_status === 'MOCK'
                        ? 'text-amber-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {src.data_status}
                  </td>
                  <td className="py-1.5 pr-3 text-slate-300">{src.freshness_seconds}s</td>
                  <td className="py-1.5 pr-3 text-slate-300">{Math.round(src.confidence * 100)}%</td>
                  <td className="py-1.5 text-slate-400 font-sans">{src.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
