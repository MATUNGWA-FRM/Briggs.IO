import React, { useState } from 'react';
import { BookmarkPlus, PanelRightClose, ShieldAlert, ShieldCheck } from 'lucide-react';
import type { BriggScorePanelData, HumanOverrideRecord } from '../shared/types';

interface ScorePanelProps {
  panel: BriggScorePanelData;
  buys5m: number;
  sells5m: number;
  onRecordPrediction: () => Promise<void>;
  onSubmitOverride: (decision: HumanOverrideRecord['user_decision'], reason: string) => Promise<void>;
  recording: boolean;
  widthPx?: number;
  onCollapse?: () => void;
}

export const ScorePanel: React.FC<ScorePanelProps> = ({
  panel,
  buys5m,
  sells5m,
  onRecordPrediction,
  onSubmitOverride,
  recording,
  widthPx,
  onCollapse,
}) => {
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideDecision, setOverrideDecision] = useState<HumanOverrideRecord['user_decision']>('OVERRIDE_NO_TRADE');
  const [overrideReason, setOverrideReason] = useState('');
  const [submittingOverride, setSubmittingOverride] = useState(false);

  const totalTx = Math.max(1, buys5m + sells5m);
  const buyPct = Math.round((buys5m / totalTx) * 100);

  const actionColor =
    panel.action_state === 'NO-TRADE'
      ? 'border-[#FF4D6A]/50 bg-[#FF4D6A]/10 text-[#FF8599]'
      : panel.action_state === 'HIGH-RISK OPPORTUNITY'
      ? 'border-amber-500/50 bg-amber-500/10 text-amber-300'
      : panel.action_state === 'WATCH'
      ? 'border-[#00E599]/50 bg-[#00E599]/10 text-[#00E599]'
      : 'border-[#7C5CFF]/50 bg-[#7C5CFF]/15 text-[#C4B5FD]';

  const handleOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (overrideReason.trim().length < 3) return;
    setSubmittingOverride(true);
    try {
      await onSubmitOverride(overrideDecision, overrideReason.trim());
      setOverrideReason('');
      setOverrideOpen(false);
    } finally {
      setSubmittingOverride(false);
    }
  };

  return (
    <aside
      style={widthPx ? ({ '--score-w': `${widthPx}px` } as React.CSSProperties) : undefined}
      className="w-full lg:w-[var(--score-w,332px)] border-l border-[#1E2330] bg-[#0C0E14] flex flex-col shrink-0 lg:h-full overflow-y-auto"
    >
      {/* Padre-Style Live 5M Orderflow Pressure Strip */}
      <div className="px-3.5 py-2.5 border-b border-[#1E2330] bg-[#08090D] space-y-1.5">
        <div className="flex items-center justify-between font-mono text-[11px] tabular-nums gap-2">
          <span className="text-[#00E599] font-semibold">Buys {buys5m} ({buyPct}%)</span>
          <span className="text-slate-400 text-[10px]">5M FLOW</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[#FF4D6A] font-semibold">Sells {sells5m} ({100 - buyPct}%)</span>
            {onCollapse && (
              <button
                type="button"
                onClick={onCollapse}
                className="p-1 rounded-sm border border-[#1E2330] bg-[#12151E] hover:bg-[#1A1F2E] text-slate-400 hover:text-slate-200 transition-colors"
                title="Collapse risk & score panel"
                aria-label="Collapse risk and score panel"
              >
                <PanelRightClose className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
        <div className="h-1.5 w-full rounded-sm bg-[#1A1E2B] overflow-hidden flex">
          <div className="h-full bg-[#00E599] transition-all duration-300" style={{ width: `${buyPct}%` }} />
          <div className="h-full bg-[#FF4D6A] transition-all duration-300" style={{ width: `${100 - buyPct}%` }} />
        </div>
      </div>

      {/* Header & Action State */}
      <div className="p-3.5 border-b border-[#1E2330]">
        <div className="flex items-baseline justify-between gap-2">
          <div className="min-w-0">
            <h2 className="font-display text-sm font-bold text-slate-100 truncate">{panel.symbol} Intelligence</h2>
            <p className="text-[11px] font-mono text-slate-400">
              {panel.mode} · {panel.horizon} · {panel.model_outputs.model_version}
            </p>
          </div>
          <button
            type="button"
            onClick={onRecordPrediction}
            disabled={recording}
            className="px-2.5 py-1 text-[11px] font-medium bg-[#7C5CFF] hover:bg-[#6D4AFF] text-white rounded-sm flex items-center gap-1 transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
            title="Store timestamped prediction snapshot for future outcome evaluation"
          >
            <BookmarkPlus className="w-3 h-3" />
            {recording ? 'Saving...' : 'Log Snapshot'}
          </button>
        </div>

        <div className={`mt-2.5 px-3 py-2 rounded-sm border text-center ${actionColor}`}>
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-300">Action State</div>
          <div className="font-display text-sm font-bold tracking-wide mt-0.5">{panel.action_state}</div>
        </div>

        {panel.no_trade.triggered && (
          <div className="mt-2.5 p-2 rounded-sm border border-[#FF4D6A]/40 bg-[#FF4D6A]/10 text-xs">
            <div className="font-semibold text-[#FF8599] flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              <span>{panel.no_trade.headline}</span>
            </div>
            <ul className="mt-1 space-y-0.5 text-[11px] text-rose-200/90">
              {panel.no_trade.reasons.map((r, i) => (
                <li key={i}>• {r}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Primary Quantitative Matrix */}
      <div className="grid grid-cols-2 divide-x divide-y divide-[#1E2330] border-b border-[#1E2330] font-mono tabular-nums">
        <div className="p-2.5">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-sans">Opportunity</div>
          <div className="text-lg font-bold text-slate-100 mt-0.5">
            {panel.opportunity_score}
            <span className="text-xs text-slate-500 font-normal">/100</span>
          </div>
        </div>
        <div className="p-2.5">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-sans">Risk Score</div>
          <div
            className={`text-lg font-bold mt-0.5 ${
              panel.risk_score >= 70 ? 'text-[#FF4D6A]' : panel.risk_score >= 50 ? 'text-amber-400' : 'text-[#00E599]'
            }`}
          >
            {panel.risk_score}
            <span className="text-xs text-slate-500 font-normal">/100</span>
          </div>
        </div>
        <div className="p-2.5">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-sans">Confidence</div>
          <div className="text-sm font-semibold text-slate-100 mt-0.5">{panel.confidence_pct}%</div>
        </div>
        <div className="p-2.5">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-sans">Exec Quality</div>
          <div className="text-sm font-semibold text-slate-100 mt-0.5">{panel.execution_quality}/100</div>
        </div>
      </div>

      {/* Calibrated Probability & Market Regime */}
      <div className="px-3.5 py-2.5 border-b border-[#1E2330] space-y-1 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Calibrated Probability</span>
          <span className="font-mono tabular-nums text-slate-100 font-semibold">
            {panel.calibrated_probability !== null
              ? `${(panel.calibrated_probability * 100).toFixed(1)}%`
              : 'Not Displayed'}
          </span>
        </div>
        <div className="text-[10px] text-slate-500">{panel.calibration_status}</div>
        <div className="flex items-center justify-between pt-0.5">
          <span className="text-slate-400">Market Regime</span>
          <span className="font-mono text-[#C4B5FD] font-medium">{panel.market_regime}</span>
        </div>
      </div>

      {/* Explainability Breakdown */}
      <div className="p-3.5 space-y-3.5 text-xs">
        <div>
          <h3 className="font-display text-[11px] uppercase tracking-wider font-semibold text-slate-300 mb-1">
            Why Opportunity Exists
          </h3>
          <ul className="space-y-1 text-slate-300">
            {panel.explainability.why_opportunity_exists.map((item, idx) => (
              <li key={idx} className="leading-snug text-[11px]">
                <span className="font-mono text-[#00E599] mr-1.5">{item.direction}</span>
                {item.text}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-display text-[11px] uppercase tracking-wider font-semibold text-slate-300 mb-1">
            Why Risk Is Elevated
          </h3>
          <ul className="space-y-1 text-slate-300">
            {panel.explainability.why_risk_elevated.length > 0 ? (
              panel.explainability.why_risk_elevated.map((item, idx) => (
                <li key={idx} className="leading-snug text-[11px]">
                  <span className="font-mono text-[#FF4D6A] mr-1.5">{item.direction}</span>
                  {item.text}
                </li>
              ))
            ) : (
              <li className="text-slate-400 text-[11px]">No acute structural warnings above threshold.</li>
            )}
          </ul>
        </div>

        <div>
          <h3 className="font-display text-[11px] uppercase tracking-wider font-semibold text-slate-300 mb-1">
            Invalidation Conditions
          </h3>
          <ul className="space-y-1 text-slate-400 text-[11px]">
            {panel.explainability.invalidation_conditions.map((cond, idx) => (
              <li key={idx}>• {cond}</li>
            ))}
          </ul>
        </div>

        {panel.explainability.conflicting_evidence.length > 0 && (
          <div>
            <h3 className="font-display text-[11px] uppercase tracking-wider font-semibold text-amber-300 mb-1">
              Conflicting Evidence
            </h3>
            <ul className="space-y-1 text-slate-300 text-[11px]">
              {panel.explainability.conflicting_evidence.map((c, idx) => (
                <li key={idx}>• {c}</li>
              ))}
            </ul>
          </div>
        )}

        {/* ML Ensemble Sub-Scores */}
        <div className="pt-2 border-t border-[#1E2330]">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-slate-400 mb-1.5">
            <span>ML Sub-Models</span>
            <span className="font-mono">{panel.model_outputs.feature_version}</span>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[11px] tabular-nums">
            <div className="flex justify-between">
              <span className="text-slate-400">Momentum</span>
              <span className="text-slate-200">{panel.model_outputs.momentum_score}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Liquidity</span>
              <span className="text-slate-200">{panel.model_outputs.liquidity_score}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Volume</span>
              <span className="text-slate-200">{panel.model_outputs.volume_score}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Orderflow</span>
              <span className="text-slate-200">{panel.model_outputs.wallet_score}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Velocity</span>
              <span className="text-slate-200">{panel.model_outputs.social_model_score}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Anomaly</span>
              <span className="text-amber-300">{panel.model_outputs.anomaly_score}</span>
            </div>
          </div>
        </div>

        {/* Human Override */}
        <div className="pt-2 border-t border-[#1E2330]">
          <button
            type="button"
            onClick={() => setOverrideOpen((v) => !v)}
            className="w-full py-1.5 px-3 rounded-sm border border-[#282F42] bg-[#12151E] hover:bg-[#191E2C] text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#9D7BFF]" />
            Record Human Override
          </button>

          {overrideOpen && (
            <form onSubmit={handleOverrideSubmit} className="mt-2 space-y-2 p-2.5 rounded-sm border border-[#1E2330] bg-[#08090D]">
              <select
                value={overrideDecision}
                onChange={(e) => setOverrideDecision(e.target.value as HumanOverrideRecord['user_decision'])}
                className="w-full bg-[#12151E] border border-[#1E2330] rounded-sm px-2 py-1 text-xs text-slate-200"
              >
                <option value="OVERRIDE_NO_TRADE">Override to No-Trade</option>
                <option value="MANUAL_WATCH">Manual Watch</option>
                <option value="MANUAL_SKIP">Manual Skip</option>
                <option value="MANUAL_FLAG_RUG">Flag Suspected Rug</option>
              </select>
              <input
                type="text"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Reason (excluded from auto-training labels)..."
                className="w-full bg-[#12151E] border border-[#1E2330] rounded-sm px-2 py-1 text-xs text-slate-200"
              />
              <button
                type="submit"
                disabled={submittingOverride || overrideReason.trim().length < 3}
                className="w-full py-1 bg-[#7C5CFF] hover:bg-[#6D4AFF] text-white rounded-sm text-xs font-medium disabled:opacity-50"
              >
                {submittingOverride ? 'Logging...' : 'Save Override'}
              </button>
            </form>
          )}
        </div>
      </div>
    </aside>
  );
};
