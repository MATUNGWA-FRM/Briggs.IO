import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { BRIGG_TERMINOLOGY } from '../shared/terminology';
import type { BriggFilterPreset, SystemObservability } from '../shared/types';

interface SettingsObservabilityModalProps {
  open: boolean;
  onClose: () => void;
}

export const SettingsObservabilityModal: React.FC<SettingsObservabilityModalProps> = ({
  open,
  onClose,
}) => {
  const [tab, setTab] = useState<'OBSERVABILITY' | 'GLOSSARY' | 'FILTERS'>('OBSERVABILITY');
  const [obs, setObs] = useState<SystemObservability | null>(null);
  const [presets, setPresets] = useState<BriggFilterPreset[]>([]);

  useEffect(() => {
    if (!open) return;
    fetch('/api/observability').then((r) => r.json()).then(setObs).catch(() => {});
    fetch('/api/presets').then((r) => r.json()).then((d) => setPresets(d.presets || [])).catch(() => {});
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-4xl max-h-[85vh] bg-[#0E131D] border border-slate-800 rounded flex flex-col text-xs">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="font-display text-base font-bold text-slate-100">
              Brigg.AI System, Filters & Knowledge Layer
            </h2>
            <div className="flex items-center bg-[#111622] border border-slate-800 rounded p-0.5">
              <button
                type="button"
                onClick={() => setTab('OBSERVABILITY')}
                className={`px-2.5 py-1 rounded ${tab === 'OBSERVABILITY' ? 'bg-sky-500/20 text-sky-300' : 'text-slate-400'}`}
              >
                Observability
              </button>
              <button
                type="button"
                onClick={() => setTab('FILTERS')}
                className={`px-2.5 py-1 rounded ${tab === 'FILTERS' ? 'bg-sky-500/20 text-sky-300' : 'text-slate-400'}`}
              >
                Initial Heuristics
              </button>
              <button
                type="button"
                onClick={() => setTab('GLOSSARY')}
                className={`px-2.5 py-1 rounded ${tab === 'GLOSSARY' ? 'bg-sky-500/20 text-sky-300' : 'text-slate-400'}`}
              >
                Knowledge Glossary
              </button>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {tab === 'OBSERVABILITY' && obs && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono tabular-nums">
                <div className="p-3 rounded border border-slate-800 bg-[#111622]">
                  <div className="text-[10px] text-slate-400 font-sans">System Status</div>
                  <div className="text-sm font-bold text-emerald-400">{obs.status}</div>
                </div>
                <div className="p-3 rounded border border-slate-800 bg-[#111622]">
                  <div className="text-[10px] text-slate-400 font-sans">Database</div>
                  <div className="text-sm font-bold text-slate-100">{obs.database_status}</div>
                </div>
                <div className="p-3 rounded border border-slate-800 bg-[#111622]">
                  <div className="text-[10px] text-slate-400 font-sans">Prod ML Model</div>
                  <div className="text-sm font-bold text-sky-300">{obs.production_model_version}</div>
                </div>
                <div className="p-3 rounded border border-slate-800 bg-[#111622]">
                  <div className="text-[10px] text-slate-400 font-sans">Avg Proc Latency</div>
                  <div className="text-sm font-bold text-slate-100">{obs.pipeline_metrics.avg_processing_latency_ms} ms</div>
                </div>
              </div>

              <div className="p-3 rounded border border-slate-800 bg-[#111622]">
                <h3 className="font-display font-semibold text-slate-100 mb-2">Approved Data Providers Status</h3>
                <table className="w-full text-left font-mono text-[11px] tabular-nums">
                  <thead className="text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-1.5 pr-3">Provider</th>
                      <th className="py-1.5 pr-3">Category</th>
                      <th className="py-1.5 pr-3">Mode</th>
                      <th className="py-1.5 pr-3 text-right">Avg Latency</th>
                      <th className="py-1.5 text-right">Success Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {obs.providers.map((p) => (
                      <tr key={p.provider}>
                        <td className="py-1.5 pr-3 uppercase text-slate-200">{p.provider}</td>
                        <td className="py-1.5 pr-3 text-slate-400">{p.category}</td>
                        <td className={`py-1.5 pr-3 ${p.mode === 'LIVE_API' ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {p.mode}
                        </td>
                        <td className="py-1.5 pr-3 text-right text-slate-300">{p.last_latency_ms} ms</td>
                        <td className="py-1.5 text-right text-slate-300">{p.success_rate_pct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-3 rounded border border-slate-800 bg-[#111622]">
                <h3 className="font-display font-semibold text-slate-100 mb-2">Recent Security & ML Audit Logs</h3>
                <div className="space-y-1 font-mono text-[11px] max-h-44 overflow-y-auto">
                  {obs.recent_audit_logs.map((l) => (
                    <div key={l.id} className="text-slate-300 border-b border-slate-800/50 pb-1">
                      <span className="text-slate-500">{l.timestamp.slice(11, 19)}</span> ·{' '}
                      <span className="text-sky-300">{l.action}</span> · {l.detail}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'FILTERS' && (
            <div className="space-y-3">
              <p className="text-slate-400">
                Brigg Initial Filter Heuristics (§23). These thresholds are configurable starting priors, not permanent truths, and are evaluated against historical outcomes.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {presets.map((p) => (
                  <div key={p.id} className="p-3 rounded border border-slate-800 bg-[#111622] font-mono text-[11px] space-y-1">
                    <div className="font-display text-sm font-semibold text-slate-100">{p.label}</div>
                    <div className="text-slate-300">
                      MC: ${p.min_mc_usd.toLocaleString()} – ${p.max_mc_usd.toLocaleString()}
                    </div>
                    <div className="text-slate-300">
                      Liq Min: ${p.min_liquidity_usd.toLocaleString()} · Age: {p.min_age_minutes}m – {p.max_age_minutes}m
                    </div>
                    <div className="text-slate-400">
                      Top10 ≤ {p.max_top10_pct}% · Dev ≤ {p.max_dev_pct}% · Sniper ≤ {p.max_sniper_pct}% · Bundle ≤ {p.max_bundle_pct}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'GLOSSARY' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {BRIGG_TERMINOLOGY.map((entry) => (
                <div key={entry.term} className="p-3 rounded border border-slate-800 bg-[#111622] space-y-1">
                  <div className="font-display text-sm font-semibold text-sky-300">{entry.term}</div>
                  <p className="text-slate-200 leading-relaxed">{entry.definition}</p>
                  <p className="text-[11px] text-amber-300/90">Caveat: {entry.analytical_caveat}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
