import React, { useEffect, useState } from 'react';
import { jsPDF } from 'jspdf';
import { Download, Play, RotateCcw, ShieldAlert } from 'lucide-react';
import type { BacktestRequest, BacktestResult, ModelVersionRecord, PredictionRecord } from '../shared/types';
import type { FeatureDefinition } from '../server/ml/features';

export const ModelUpdateCenter: React.FC = () => {
  const [versions, setVersions] = useState<ModelVersionRecord[]>([]);
  const [features, setFeatures] = useState<FeatureDefinition[]>([]);
  const [recentPreds, setRecentPreds] = useState<PredictionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [trainingBusy, setTrainingBusy] = useState(false);
  const [learningBanner, setLearningBanner] = useState<string | null>(null);

  // Backtest state
  const [btConfig, setBtConfig] = useState<BacktestRequest>({
    mode: 'SHITCOIN',
    horizon: '15M',
    position_size_usd: 1500,
    min_opportunity_score: 65,
    max_risk_score: 75,
    slippage_bps: 120,
    priority_fee_usd: 1.2,
    min_liquidity_usd: 15000,
  });
  const [btResult, setBtResult] = useState<BacktestResult | null>(null);
  const [btBusy, setBtBusy] = useState(false);

  const fetchMlState = async () => {
    setLoading(true);
    try {
      const resp = await fetch('/api/ml/versions');
      const data = await resp.json();
      setVersions(data.versions || []);
      setFeatures(data.feature_registry || []);
      setRecentPreds(data.recent_predictions || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMlState();
    runBacktest();
  }, []);

  const prodModel = versions.find((v) => v.is_production) || versions[0];

  const handleLearnCycle = async (simulateDegradation: boolean) => {
    setTrainingBusy(true);
    setLearningBanner(null);
    try {
      const resp = await fetch('/api/ml/learn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ simulate_degradation: simulateDegradation }),
      });
      const data = await resp.json();
      setVersions(data.versions || []);
      setLearningBanner(
        `Candidate ${data.candidate?.version}: ${data.candidate?.decision} — ${data.candidate?.reason_for_change}`
      );
    } finally {
      setTrainingBusy(false);
    }
  };

  const handleRollback = async (version: string) => {
    const resp = await fetch('/api/ml/rollback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version }),
    });
    const data = await resp.json();
    if (data.versions) {
      setVersions(data.versions);
      setLearningBanner(`Production model rolled back to ${version}.`);
    }
  };

  const runBacktest = async () => {
    setBtBusy(true);
    try {
      const resp = await fetch('/api/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(btConfig),
      });
      const data = await resp.json();
      setBtResult(data);
    } finally {
      setBtBusy(false);
    }
  };

  const exportReport = (format: 'json' | 'csv' | 'pdf') => {
    if (!prodModel) return;
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `brigg-model-update-${dateStr}.${format}`;

    if (format === 'json') {
      const payload = {
        generated_at: new Date().toISOString(),
        production_model: prodModel,
        all_versions: versions,
        backtest_snapshot: btResult,
        feature_definitions: features,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    if (format === 'csv') {
      const headers = [
        'version',
        'decision',
        'is_production',
        'training_date',
        'feature_version',
        'training_samples',
        'precision',
        'recall',
        'f1',
        'roc_auc',
        'brier_score',
        'false_positive_rate',
        'win_rate_pct',
        'max_drawdown_pct',
        'profit_factor',
      ];
      const rows = versions.map((v) => [
        v.version,
        v.decision,
        v.is_production,
        v.training_date,
        v.feature_version,
        v.training_samples,
        v.metrics.precision,
        v.metrics.recall,
        v.metrics.f1,
        v.metrics.roc_auc,
        v.metrics.brier_score,
        v.metrics.false_positive_rate,
        v.metrics.win_rate_pct,
        v.metrics.max_drawdown_pct,
        v.metrics.profit_factor,
      ]);
      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    // PDF export via jsPDF (§43)
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Brigg.AI — Model Update & Audit Report', 14, 18);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toISOString()}`, 14, 25);
    doc.text(`Production Model: ${prodModel.version} (${prodModel.model_type})`, 14, 32);
    doc.text(`Feature Version: ${prodModel.feature_version} · Samples: ${prodModel.training_samples}`, 14, 38);
    doc.text(
      `ROC-AUC: ${prodModel.metrics.roc_auc} | Precision: ${prodModel.metrics.precision} | Brier: ${prodModel.metrics.brier_score} | FPR: ${prodModel.metrics.false_positive_rate}`,
      14,
      46
    );
    doc.text(
      `Win Rate: ${prodModel.metrics.win_rate_pct}% | Max Drawdown: ${prodModel.metrics.max_drawdown_pct}% | Profit Factor: ${prodModel.metrics.profit_factor}`,
      14,
      53
    );
    doc.text('Changes:', 14, 63);
    prodModel.changes.forEach((c, idx) => {
      doc.text(`- ${c}`, 16, 70 + idx * 6);
    });
    doc.text('Version Audit Log:', 14, 96);
    versions.slice(0, 6).forEach((v, idx) => {
      doc.text(
        `${v.version} [${v.decision}] AUC ${v.metrics.roc_auc} | Brier ${v.metrics.brier_score} | DD ${v.metrics.max_drawdown_pct}%`,
        16,
        103 + idx * 6
      );
    });
    doc.save(filename);
  };

  if (loading && !prodModel) {
    return <div className="p-6 text-sm text-slate-400">Loading Brigg ML Model Update Center...</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto p-5 bg-[#0B0E14] space-y-5 text-xs">
      {/* Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h1 className="font-display text-lg font-bold text-slate-100">
            Brigg Model Update Center & Backtesting Lab
          </h1>
          <p className="text-slate-400 mt-0.5">
            Continuous learning pipeline with strict T-boundary temporal leakage prevention, validation gates, and one-click rollback.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={trainingBusy}
            onClick={() => handleLearnCycle(false)}
            className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded font-medium flex items-center gap-1.5 disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" />
            {trainingBusy ? 'Training...' : 'Run Daily Learning Cycle'}
          </button>
          <button
            type="button"
            disabled={trainingBusy}
            onClick={() => handleLearnCycle(true)}
            className="px-3 py-1.5 bg-[#111622] hover:bg-slate-800 border border-slate-700 text-amber-300 rounded font-medium flex items-center gap-1.5 disabled:opacity-50"
            title="Test validation gate auto-rejection on degraded candidate"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Test Auto-Reject Gate
          </button>

          <button
            type="button"
            onClick={() => exportReport('json')}
            className="px-2.5 py-1.5 bg-[#111622] hover:bg-slate-800 border border-slate-800 text-slate-200 rounded flex items-center gap-1 font-mono"
          >
            <Download className="w-3.5 h-3.5" /> JSON
          </button>
          <button
            type="button"
            onClick={() => exportReport('csv')}
            className="px-2.5 py-1.5 bg-[#111622] hover:bg-slate-800 border border-slate-800 text-slate-200 rounded flex items-center gap-1 font-mono"
          >
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
          <button
            type="button"
            onClick={() => exportReport('pdf')}
            className="px-2.5 py-1.5 bg-[#111622] hover:bg-slate-800 border border-slate-800 text-slate-200 rounded flex items-center gap-1 font-mono"
          >
            <Download className="w-3.5 h-3.5" /> PDF
          </button>
        </div>
      </div>

      {learningBanner && (
        <div className="p-3 rounded border border-sky-500/40 bg-sky-950/20 text-sky-200 font-mono text-xs">
          {learningBanner}
        </div>
      )}

      {/* Production Model Summary (§43) */}
      {prodModel && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="p-4 rounded border border-slate-800 bg-[#111622] space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold text-slate-100">
                Production Model: {prodModel.version}
              </h2>
              <span className="font-mono text-emerald-400 font-semibold">{prodModel.decision}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 font-mono text-[11px] tabular-nums">
              <div>
                <span className="text-slate-400 font-sans block">Last Trained</span>
                <span className="text-slate-200">{prodModel.training_date.slice(0, 10)}</span>
              </div>
              <div>
                <span className="text-slate-400 font-sans block">Feature Version</span>
                <span className="text-sky-300">{prodModel.feature_version}</span>
              </div>
              <div>
                <span className="text-slate-400 font-sans block">Training Samples</span>
                <span className="text-slate-200">{prodModel.training_samples.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-400 font-sans block">New Observations</span>
                <span className="text-slate-200">+{prodModel.new_observations}</span>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-800">
              <div className="text-[11px] text-slate-400 mb-1">Major Changes & Audit Reason</div>
              <ul className="space-y-1 text-[11px] text-slate-300">
                {prodModel.changes.map((c, i) => (
                  <li key={i}>• {c}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="p-4 rounded border border-slate-800 bg-[#111622] space-y-2">
            <h2 className="font-display text-sm font-semibold text-slate-100">
              Out-of-Time Validation Metrics (§39)
            </h2>
            <div className="grid grid-cols-3 gap-2 font-mono text-[11px] tabular-nums">
              <div className="p-2 rounded bg-[#0B0E14] border border-slate-800/80">
                <div className="text-[10px] text-slate-400 font-sans">ROC-AUC</div>
                <div className="text-sm font-bold text-slate-100">{prodModel.metrics.roc_auc}</div>
              </div>
              <div className="p-2 rounded bg-[#0B0E14] border border-slate-800/80">
                <div className="text-[10px] text-slate-400 font-sans">PR-AUC</div>
                <div className="text-sm font-bold text-slate-100">{prodModel.metrics.pr_auc}</div>
              </div>
              <div className="p-2 rounded bg-[#0B0E14] border border-slate-800/80">
                <div className="text-[10px] text-slate-400 font-sans">F1 / Prec</div>
                <div className="text-sm font-bold text-slate-100">
                  {prodModel.metrics.f1} / {prodModel.metrics.precision}
                </div>
              </div>
              <div className="p-2 rounded bg-[#0B0E14] border border-slate-800/80">
                <div className="text-[10px] text-slate-400 font-sans">Brier Score</div>
                <div className="text-sm font-bold text-emerald-400">{prodModel.metrics.brier_score}</div>
              </div>
              <div className="p-2 rounded bg-[#0B0E14] border border-slate-800/80">
                <div className="text-[10px] text-slate-400 font-sans">False Pos Rate</div>
                <div className="text-sm font-bold text-amber-300">{prodModel.metrics.false_positive_rate}</div>
              </div>
              <div className="p-2 rounded bg-[#0B0E14] border border-slate-800/80">
                <div className="text-[10px] text-slate-400 font-sans">Sharpe / PF</div>
                <div className="text-sm font-bold text-sky-300">
                  {prodModel.metrics.sharpe_ratio} / {prodModel.metrics.profit_factor}
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded border border-slate-800 bg-[#111622] space-y-2">
            <h2 className="font-display text-sm font-semibold text-slate-100">Feature Importance</h2>
            <div className="space-y-1.5 font-mono text-[11px]">
              {prodModel.feature_importance.map((fi) => (
                <div key={fi.feature} className="space-y-0.5">
                  <div className="flex justify-between text-slate-300">
                    <span>{fi.feature}</span>
                    <span className="tabular-nums">{(fi.importance * 100).toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 bg-[#0B0E14] rounded overflow-hidden">
                    <div
                      className="h-full bg-sky-500"
                      style={{ width: `${Math.min(100, fi.importance * 300)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Model Version History & Rollback (§38, §44) */}
      <div className="p-4 rounded border border-slate-800 bg-[#111622] space-y-3">
        <h2 className="font-display text-sm font-semibold text-slate-100">
          Model Version Audit Log & Rollback
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-[11px] tabular-nums">
            <thead className="text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-1.5 pr-3">Version</th>
                <th className="py-1.5 pr-3">Status</th>
                <th className="py-1.5 pr-3">Date</th>
                <th className="py-1.5 pr-3 text-right">ROC-AUC</th>
                <th className="py-1.5 pr-3 text-right">Brier</th>
                <th className="py-1.5 pr-3 text-right">FPR</th>
                <th className="py-1.5 pr-3 text-right">Max DD</th>
                <th className="py-1.5 pr-3">Reason for Change / Decision</th>
                <th className="py-1.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {versions.map((v) => (
                <tr key={v.version} className={v.is_production ? 'bg-sky-950/15' : ''}>
                  <td className="py-2 pr-3 font-bold text-slate-100">
                    {v.version} {v.is_production ? '(PROD)' : ''}
                  </td>
                  <td
                    className={`py-2 pr-3 font-semibold ${
                      v.decision === 'PROMOTED'
                        ? 'text-emerald-400'
                        : v.decision === 'REJECTED'
                        ? 'text-rose-400'
                        : 'text-amber-300'
                    }`}
                  >
                    {v.decision}
                  </td>
                  <td className="py-2 pr-3 text-slate-400">{v.training_date.slice(0, 10)}</td>
                  <td className="py-2 pr-3 text-right text-slate-200">{v.metrics.roc_auc}</td>
                  <td className="py-2 pr-3 text-right text-slate-200">{v.metrics.brier_score}</td>
                  <td className="py-2 pr-3 text-right text-slate-200">{v.metrics.false_positive_rate}</td>
                  <td className="py-2 pr-3 text-right text-slate-200">{v.metrics.max_drawdown_pct}%</td>
                  <td className="py-2 pr-3 font-sans text-slate-300 max-w-md">{v.reason_for_change}</td>
                  <td className="py-2 text-right">
                    {!v.is_production && v.decision !== 'REJECTED' && (
                      <button
                        type="button"
                        onClick={() => handleRollback(v.version)}
                        className="px-2 py-0.5 rounded border border-slate-700 hover:bg-slate-800 text-slate-200 inline-flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" /> Rollback
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Backtesting Lab (§40) */}
      <div className="p-4 rounded border border-slate-800 bg-[#111622] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-sm font-semibold text-slate-100">
              Backtesting Simulator [BACKTEST]
            </h2>
            <p className="text-[11px] text-amber-300/90">
              {btResult?.disclaimer || 'BACKTEST ONLY — simulates liquidity filters, slippage, and priority fees.'}
            </p>
          </div>
          <button
            type="button"
            onClick={runBacktest}
            disabled={btBusy}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded font-medium"
          >
            {btBusy ? 'Simulating...' : 'Run Backtest'}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 font-mono text-[11px]">
          <div>
            <label className="block text-slate-400 font-sans mb-1">Mode</label>
            <select
              value={btConfig.mode}
              onChange={(e) => setBtConfig({ ...btConfig, mode: e.target.value as BacktestRequest['mode'] })}
              className="w-full bg-[#0B0E14] border border-slate-800 rounded px-2 py-1 text-slate-200"
            >
              <option value="SHITCOIN">SHITCOIN</option>
              <option value="MEMECOIN">MEMECOIN</option>
            </select>
          </div>
          <div>
            <label className="block text-slate-400 font-sans mb-1">Min Opp Score</label>
            <input
              type="number"
              value={btConfig.min_opportunity_score}
              onChange={(e) => setBtConfig({ ...btConfig, min_opportunity_score: Number(e.target.value) })}
              className="w-full bg-[#0B0E14] border border-slate-800 rounded px-2 py-1 text-slate-200"
            />
          </div>
          <div>
            <label className="block text-slate-400 font-sans mb-1">Max Risk Score</label>
            <input
              type="number"
              value={btConfig.max_risk_score}
              onChange={(e) => setBtConfig({ ...btConfig, max_risk_score: Number(e.target.value) })}
              className="w-full bg-[#0B0E14] border border-slate-800 rounded px-2 py-1 text-slate-200"
            />
          </div>
          <div>
            <label className="block text-slate-400 font-sans mb-1">Position Size ($)</label>
            <input
              type="number"
              value={btConfig.position_size_usd}
              onChange={(e) => setBtConfig({ ...btConfig, position_size_usd: Number(e.target.value) })}
              className="w-full bg-[#0B0E14] border border-slate-800 rounded px-2 py-1 text-slate-200"
            />
          </div>
          <div>
            <label className="block text-slate-400 font-sans mb-1">Slippage (bps)</label>
            <input
              type="number"
              value={btConfig.slippage_bps}
              onChange={(e) => setBtConfig({ ...btConfig, slippage_bps: Number(e.target.value) })}
              className="w-full bg-[#0B0E14] border border-slate-800 rounded px-2 py-1 text-slate-200"
            />
          </div>
          <div>
            <label className="block text-slate-400 font-sans mb-1">Priority Fee ($)</label>
            <input
              type="number"
              step="0.1"
              value={btConfig.priority_fee_usd}
              onChange={(e) => setBtConfig({ ...btConfig, priority_fee_usd: Number(e.target.value) })}
              className="w-full bg-[#0B0E14] border border-slate-800 rounded px-2 py-1 text-slate-200"
            />
          </div>
        </div>

        {btResult && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 font-mono text-[11px] tabular-nums">
              <div className="p-2 rounded bg-[#0B0E14] border border-slate-800">
                <div className="text-[10px] text-slate-400 font-sans">Trades</div>
                <div className="text-sm font-bold text-slate-100">{btResult.trades_count}</div>
              </div>
              <div className="p-2 rounded bg-[#0B0E14] border border-slate-800">
                <div className="text-[10px] text-slate-400 font-sans">Win Rate</div>
                <div className="text-sm font-bold text-emerald-400">{btResult.win_rate_pct}%</div>
              </div>
              <div className="p-2 rounded bg-[#0B0E14] border border-slate-800">
                <div className="text-[10px] text-slate-400 font-sans">Expectancy</div>
                <div className="text-sm font-bold text-slate-100">{btResult.expectancy_pct}%</div>
              </div>
              <div className="p-2 rounded bg-[#0B0E14] border border-slate-800">
                <div className="text-[10px] text-slate-400 font-sans">Max Drawdown</div>
                <div className="text-sm font-bold text-rose-400">{btResult.max_drawdown_pct}%</div>
              </div>
              <div className="p-2 rounded bg-[#0B0E14] border border-slate-800">
                <div className="text-[10px] text-slate-400 font-sans">Profit Factor</div>
                <div className="text-sm font-bold text-sky-300">{btResult.profit_factor}</div>
              </div>
              <div className="p-2 rounded bg-[#0B0E14] border border-slate-800">
                <div className="text-[10px] text-slate-400 font-sans">Sharpe</div>
                <div className="text-sm font-bold text-slate-100">{btResult.sharpe_ratio}</div>
              </div>
              <div className="p-2 rounded bg-[#0B0E14] border border-slate-800">
                <div className="text-[10px] text-slate-400 font-sans">Missed Opp.</div>
                <div className="text-sm font-bold text-amber-300">{btResult.missed_opportunities}</div>
              </div>
              <div className="p-2 rounded bg-[#0B0E14] border border-slate-800">
                <div className="text-[10px] text-slate-400 font-sans">False Pos.</div>
                <div className="text-sm font-bold text-rose-300">{btResult.false_positives}</div>
              </div>
            </div>

            {btResult.trades.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-[11px] tabular-nums">
                  <thead className="text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-1 pr-3">Symbol</th>
                      <th className="py-1 pr-3 text-right">Opp / Risk</th>
                      <th className="py-1 pr-3 text-right">Gross %</th>
                      <th className="py-1 pr-3 text-right">Slippage Cost %</th>
                      <th className="py-1 pr-3 text-right">Net %</th>
                      <th className="py-1 text-right">Outcome</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {btResult.trades.map((tr, i) => (
                      <tr key={i}>
                        <td className="py-1 pr-3 text-slate-200">{tr.symbol}</td>
                        <td className="py-1 pr-3 text-right text-slate-300">
                          {tr.opportunity_score} / {tr.risk_score}
                        </td>
                        <td className="py-1 pr-3 text-right text-slate-300">{tr.gross_return_pct}%</td>
                        <td className="py-1 pr-3 text-right text-amber-300">-{tr.slippage_cost_pct}%</td>
                        <td className={`py-1 pr-3 text-right font-semibold ${tr.net_return_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {tr.net_return_pct}%
                        </td>
                        <td className={`py-1 text-right ${tr.outcome === 'WIN' ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {tr.outcome}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Global Prediction & Outcome Ledger */}
      <div className="p-4 rounded border border-slate-800 bg-[#111622] space-y-2">
        <h2 className="font-display text-sm font-semibold text-slate-100">
          Global Prediction-Time Feature & Outcome Ledger ({recentPreds.length} records)
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-[11px] tabular-nums">
            <thead className="text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-1 pr-3">Time (UTC)</th>
                <th className="py-1 pr-3">Token</th>
                <th className="py-1 pr-3">Mode / Hor</th>
                <th className="py-1 pr-3">Action State</th>
                <th className="py-1 pr-3 text-right">Opp / Risk</th>
                <th className="py-1 pr-3">Model</th>
                <th className="py-1 text-right">Actual Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {recentPreds.slice(0, 12).map((p) => (
                <tr key={p.id}>
                  <td className="py-1.5 pr-3 text-slate-400">{p.prediction_timestamp.replace('T', ' ').slice(0, 19)}</td>
                  <td className="py-1.5 pr-3 text-slate-100 font-semibold">{p.symbol}</td>
                  <td className="py-1.5 pr-3 text-slate-300">
                    {p.mode}/{p.horizon}
                  </td>
                  <td className="py-1.5 pr-3 text-sky-300">{p.action_state}</td>
                  <td className="py-1.5 pr-3 text-right text-slate-200">
                    {p.opportunity_score} / {p.risk_score}
                  </td>
                  <td className="py-1.5 pr-3 text-slate-400">{p.model_version}</td>
                  <td className="py-1.5 text-right">
                    {p.outcome ? (
                      <span className={p.outcome.return_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {p.outcome.actual_outcome} ({p.outcome.return_pct >= 0 ? '+' : ''}
                        {p.outcome.return_pct}%)
                      </span>
                    ) : (
                      <span className="text-slate-500">PENDING</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
