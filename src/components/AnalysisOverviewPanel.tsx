import React from 'react';
import { AlertTriangle, ArrowUpRight, CheckCircle2, ShieldAlert } from 'lucide-react';
import type { WorkspaceTabId } from '../shared/layoutConfig';
import type { TokenFullAnalysis } from '../shared/types';

interface AnalysisOverviewPanelProps {
  analysis: TokenFullAnalysis;
  onOpenTab: (tab: WorkspaceTabId) => void;
}

export const AnalysisOverviewPanel: React.FC<AnalysisOverviewPanelProps> = ({
  analysis,
  onOpenTab,
}) => {
  const { forensics, liquidity, volume, holders, risk, slippage, checklist, score_panel } = analysis;
  const passedCount = checklist.items.filter((i) => i.passed).length;
  const warnCount = checklist.items.filter((i) => !i.passed && i.severity === 'STANDARD').length;
  const failCount = checklist.items.filter((i) => !i.passed && i.severity === 'CRITICAL').length;

  return (
    <div className="space-y-4 text-xs">
      {/* Executive 4-Card Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="p-3 rounded-sm border border-[#1E2330] bg-[#0C0E14]">
          <div className="text-[11px] text-slate-400">Model Signal & Regime</div>
          <div className="font-display text-base font-bold text-slate-100 mt-0.5">
            {score_panel.action_state}
          </div>
          <div className="font-mono text-[11px] text-slate-300 mt-1 tabular-nums">
            Opp {score_panel.opportunity_score}/100 · Conf {score_panel.confidence_pct}%
          </div>
          <div className="font-mono text-[10px] text-[#C4B5FD] mt-0.5">
            Regime: {score_panel.market_regime}
          </div>
        </div>

        <div className="p-3 rounded-sm border border-[#1E2330] bg-[#0C0E14]">
          <div className="text-[11px] text-slate-400">Risk & Contract Gate</div>
          <div
            className={`font-mono text-base font-bold mt-0.5 tabular-nums ${
              risk.overall_risk >= 70
                ? 'text-[#FF4D6A]'
                : risk.overall_risk >= 50
                ? 'text-amber-400'
                : 'text-[#00E599]'
            }`}
          >
            {risk.overall_risk}/100 Risk
          </div>
          <div className="font-mono text-[11px] text-slate-300 mt-1 tabular-nums">
            Mint {forensics.contract_attributes.mint_authority_revoked ? 'Revoked' : 'Active'} · Freeze{' '}
            {forensics.contract_attributes.freeze_authority_revoked ? 'Revoked' : 'Active'}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 truncate">
            {risk.rug_indicators[0] || 'Standard speculative risk profile'}
          </div>
        </div>

        <div className="p-3 rounded-sm border border-[#1E2330] bg-[#0C0E14]">
          <div className="text-[11px] text-slate-400">Liquidity & Execution</div>
          <div className="font-mono text-base font-bold text-slate-100 mt-0.5 tabular-nums">
            ${Math.round(liquidity.current_liquidity_usd).toLocaleString()}
          </div>
          <div className="font-mono text-[11px] text-slate-300 mt-1 tabular-nums">
            LP {liquidity.lp_status} · Exit Cap ${Math.round(liquidity.estimated_exit_capacity_usd).toLocaleString()}
          </div>
          <div className="font-mono text-[10px] text-slate-400 mt-0.5 tabular-nums">
            Impact {slippage.price_impact_pct}% · Organic Vol {volume.estimated_organic_pct}%
          </div>
        </div>

        <div className="p-3 rounded-sm border border-[#1E2330] bg-[#0C0E14]">
          <div className="text-[11px] text-slate-400">Holders & Clusters</div>
          <div className="font-mono text-base font-bold text-slate-100 mt-0.5 tabular-nums">
            {holders.holder_count.toLocaleString()} holders
          </div>
          <div className="font-mono text-[11px] text-slate-300 mt-1 tabular-nums">
            Top 10: {holders.top_10_concentration_pct}% · Bundles: {holders.bundle_analysis.combined_supply_pct}%
          </div>
          <div className="font-mono text-[10px] text-amber-300 mt-0.5 tabular-nums">
            Snipers: {holders.sniper_analysis.supply_pct}% ({holders.sniper_analysis.exposure_band})
          </div>
        </div>
      </div>

      {/* Checklist Summary + Quick Deep-Dive Links */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <div className="p-3.5 rounded-sm border border-[#1E2330] bg-[#0C0E14] space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold text-slate-100">Pre-Trade Gate Summary</h3>
            <span className="font-mono text-[11px] tabular-nums text-slate-300">
              <span className="text-[#00E599]">{passedCount} PASS</span> ·{' '}
              <span className="text-amber-400">{warnCount} WARN</span> ·{' '}
              <span className="text-[#FF4D6A]">{failCount} FAIL</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {checklist.items.slice(0, 6).map((item) => {
              const statusLabel = item.passed ? 'PASS' : item.severity === 'CRITICAL' ? 'FAIL' : 'WARN';
              return (
                <div
                  key={item.id}
                  className="px-2.5 py-1.5 rounded-sm border border-[#1E2330] bg-[#08090D] flex items-center justify-between gap-2"
                  title={item.explanation}
                >
                  <span className="text-slate-300 truncate">{item.label}</span>
                  <span
                    className={`font-mono text-[10px] font-semibold shrink-0 inline-flex items-center gap-1 ${
                      item.passed
                        ? 'text-[#00E599]'
                        : item.severity === 'STANDARD'
                        ? 'text-amber-400'
                        : 'text-[#FF4D6A]'
                    }`}
                  >
                    {item.passed ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : item.severity === 'STANDARD' ? (
                      <AlertTriangle className="w-3 h-3" />
                    ) : (
                      <ShieldAlert className="w-3 h-3" />
                    )}
                    {statusLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-3.5 rounded-sm border border-[#1E2330] bg-[#0C0E14] space-y-2.5">
          <h3 className="font-display text-sm font-semibold text-slate-100">Open Specialized Modules</h3>
          <p className="text-[11px] text-slate-400">
            Jump directly to any detailed intelligence module or pin it to your active tab bar.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ['HOLDERS', 'Holders & Bubble Map'],
                ['SOCIAL_TRACKER', 'Live Social Tracker'],
                ['LIQUIDITY_VOLUME', 'Liquidity & Slippage'],
                ['FORENSICS', 'Forensics & Sources'],
              ] as Array<[WorkspaceTabId, string]>
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => onOpenTab(id)}
                className="px-2.5 py-2 rounded-sm border border-[#1E2330] bg-[#08090D] hover:border-[#7C5CFF]/50 text-left text-slate-200 flex items-center justify-between gap-1 transition-colors"
              >
                <span className="truncate">{label}</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-[#9D7BFF] shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
