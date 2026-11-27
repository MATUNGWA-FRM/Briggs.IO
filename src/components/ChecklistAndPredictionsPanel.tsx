import React from 'react';
import { CheckCircle2, RefreshCw, XCircle } from 'lucide-react';
import type { HumanOverrideRecord, PreTradeChecklist, PredictionRecord } from '../shared/types';

interface ChecklistAndPredictionsPanelProps {
  checklist: PreTradeChecklist;
  predictions: PredictionRecord[];
  overrides: HumanOverrideRecord[];
  onEvaluateOutcome: (predictionId: string) => Promise<void>;
}

export const ChecklistAndPredictionsPanel: React.FC<ChecklistAndPredictionsPanelProps> = ({
  checklist,
  predictions,
  overrides,
  onEvaluateOutcome,
}) => {
  return (
    <div className="space-y-5 text-xs">
      {/* 10-Point Automated Pre-Trade Checklist (§24) */}
      <div className="p-3.5 rounded border border-slate-800 bg-[#111622] space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-semibold text-slate-100">
            Automated Pre-Trade Checklist
          </h3>
          <span className="font-mono text-xs tabular-nums text-sky-300 font-semibold">
            {checklist.passed_count}/{checklist.total_count} checks passed
            {checklist.critical_failure ? ' · Critical Gate Failed' : ''}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {checklist.items.map((item) => (
            <div
              key={item.id}
              className="p-2 rounded border border-slate-800/80 bg-[#0B0E14] flex items-start gap-2"
            >
              {item.passed ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-rose-400 mt-0.5 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium text-slate-200">{item.label}</span>
                  <span className="font-mono text-[10px] text-slate-400 tabular-nums">{item.observed_value}</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {item.explanation} (Target: {item.threshold})
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Historical Brigg Predictions & Actual Outcomes (§41, §42) */}
      <div className="p-3.5 rounded border border-slate-800 bg-[#111622] space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-sm font-semibold text-slate-100">
              Historical Brigg Predictions & Outcomes
            </h3>
            <p className="text-[11px] text-slate-400">
              Displays both wins and false positives transparently for model accountability.
            </p>
          </div>
        </div>

        {predictions.length === 0 ? (
          <p className="text-slate-400 text-[11px]">
            No prior Brigg predictions logged for this token yet. Use "Log Prediction" in the Score Panel to create a timestamped snapshot.
          </p>
        ) : (
          <div className="space-y-2">
            {predictions.map((p) => (
              <div key={p.id} className="p-2.5 rounded border border-slate-800 bg-[#0B0E14] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="font-semibold text-slate-100">{p.action_state}</span>
                    <span className="text-slate-500">·</span>
                    <span className="text-slate-300">{p.mode}/{p.horizon}</span>
                    <span className="text-slate-500">·</span>
                    <span className="text-slate-300">Opp {p.opportunity_score} / Risk {p.risk_score}</span>
                    <span className="text-slate-500">·</span>
                    <span className="text-sky-400">{p.model_version}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    At {p.prediction_timestamp.replace('T', ' ').slice(0, 19)} UTC · Entry ${p.entry_price_usd}
                  </div>
                  {p.outcome && (
                    <div className="text-[11px] text-slate-300">
                      Outcome:{' '}
                      <strong className={p.outcome.return_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {p.outcome.return_pct >= 0 ? '+' : ''}
                        {p.outcome.return_pct}% ({p.outcome.actual_outcome})
                      </strong>{' '}
                      — {p.outcome.quality_note}
                    </div>
                  )}
                </div>

                {!p.outcome && (
                  <button
                    type="button"
                    onClick={() => onEvaluateOutcome(p.id)}
                    className="px-2.5 py-1 text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded flex items-center gap-1 shrink-0 self-start sm:self-center"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Evaluate Outcome
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Human Overrides (§45) */}
      {overrides.length > 0 && (
        <div className="p-3.5 rounded border border-slate-800 bg-[#111622] space-y-2">
          <h3 className="font-display text-sm font-semibold text-slate-100">
            Human Override Log (Excluded from Auto-Training Labels)
          </h3>
          <div className="space-y-1.5">
            {overrides.map((o) => (
              <div key={o.id} className="text-[11px] font-mono text-slate-300 flex items-center justify-between border-b border-slate-800/60 pb-1">
                <span>
                  {o.symbol}: Model {o.model_state} → <strong>{o.user_decision}</strong> ({o.reason})
                </span>
                <span className="text-slate-500">{o.timestamp.slice(0, 19)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
