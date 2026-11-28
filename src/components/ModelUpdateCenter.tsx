import React, { useEffect, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';
import {
  Activity,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Download,
  PanelRightClose,
  PanelRightOpen,
  Play,
  RotateCcw,
  ShieldAlert,
  SlidersHorizontal,
} from 'lucide-react';
import { loadMlViewMode, saveMlViewMode } from '../shared/terminalSettings';
import type {
  BacktestRequest,
  BacktestResult,
  DailyLearningSummary,
  MlLearningActivityEvent,
  ModelVersionRecord,
  PredictionRecord,
} from '../shared/types';
import type { FeatureDefinition } from '../server/ml/features';
import { MlSidePanel, type MlSideTab } from './MlSidePanel';

type PipelineNodeId =
  | 'MARKET_DATA'
  | 'FEATURES'
  | 'MODEL'
  | 'PREDICTION'
  | 'VALIDATION'
  | 'OUTCOME'
  | 'LEARNING';

const PIPELINE_NODES: Array<{ id: PipelineNodeId; label: string }> = [
  { id: 'MARKET_DATA', label: 'Market Data' },
  { id: 'FEATURES', label: 'Features' },
  { id: 'MODEL', label: 'Model' },
  { id: 'PREDICTION', label: 'Prediction' },
  { id: 'VALIDATION', label: 'Validation' },
  { id: 'OUTCOME', label: 'Outcome' },
  { id: 'LEARNING', label: 'Learning' },
];

export const ModelUpdateCenter: React.FC = () => {
  const [versions, setVersions] = useState<ModelVersionRecord[]>([]);
  const [features, setFeatures] = useState<FeatureDefinition[]>([]);
  const [recentPreds, setRecentPreds] = useState<PredictionRecord[]>([]);
  const [learningActivity, setLearningActivity] = useState<MlLearningActivityEvent[]>([]);
  const [dailySummary, setDailySummary] = useState<DailyLearningSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [trainingBusy, setTrainingBusy] = useState(false);
  const [learningBanner, setLearningBanner] = useState<string | null>(null);

  // Side Layout state
  const [sideOpen, setSideOpen] = useState(true);
  const [sideExpanded, setSideExpanded] = useState(false);
  const [sideTab, setSideTab] = useState<MlSideTab>(() =>
    loadMlViewMode() === 'EXPLAIN_TO_ME' ? 'EXPLAINABLE' : 'OVERVIEW'
  );

  // Compact Pipeline interactive selection (collapsed by default)
  const [activePipelineNode, setActivePipelineNode] = useState<PipelineNodeId | null>(null);

  // Collapsible Dashboard sections (keep main view scannable without scrolling through giant cards)
  const [showValidationDetails, setShowValidationDetails] = useState(true);
  const [showVersioning, setShowVersioning] = useState(true);
  const [showOutcomeLearning, setShowOutcomeLearning] = useState(false);
  const [outcomeSubTab, setOutcomeSubTab] = useState<'CYCLE' | 'LEDGER'>('CYCLE');
  const [showBacktest, setShowBacktest] = useState(false);

  // Export Actions menu
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);

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
      setLearningActivity(data.learning_activity || []);
      setDailySummary(data.daily_learning_summary || null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMlState();
    runBacktest();
  }, []);

  useEffect(() => {
    if (sideTab === 'EXPLAINABLE') saveMlViewMode('EXPLAIN_TO_ME');
    else if (sideTab === 'TECHNICAL') saveMlViewMode('TECHNICAL');
  }, [sideTab]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
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
      if (data.learning_activity) setLearningActivity(data.learning_activity);
      if (data.daily_learning_summary) setDailySummary(data.daily_learning_summary);
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
      if (data.learning_activity) setLearningActivity(data.learning_activity);
      if (data.daily_learning_summary) setDailySummary(data.daily_learning_summary);
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
    setExportMenuOpen(false);
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
    return <div className="p-6 text-sm text-slate-400">Loading Brigg ML Center...</div>;
  }

  const pipelineDetail: Record<
    PipelineNodeId,
    { title: string; role: string; summary: string; liveStat: string }
  > = {
    MARKET_DATA: {
      title: '1. Market Data Ingestion',
      role: 'Historical & Live Telemetry',
      summary:
        'Captures point-in-time price, liquidity, volume, holder concentration, and sniper/bundle snapshots at prediction timestamp T.',
      liveStat: `${dailySummary?.new_observations ?? recentPreds.length} observations recorded (${dailySummary?.date_label ?? 'live'})`,
    },
    FEATURES: {
      title: '2. Feature Extraction',
      role: 'Strict T-Boundary Guards',
      summary:
        'Computes deterministic ratios and momentum features strictly using data available <= T; blocks any future outcome leakage.',
      liveStat: `${features.length} registered features · ${prodModel?.feature_version ?? 'f1.0'}`,
    },
    MODEL: {
      title: '3. Model Inference & Calibration',
      role: 'Frozen Production Weights',
      summary:
        'Runs the active ensemble on live terminal tokens using frozen validated weights and out-of-time Platt probability scaling.',
      liveStat: `${prodModel?.version ?? 'v1.0'} (${prodModel?.model_type ?? 'Ensemble'}) · Brier ${prodModel?.metrics.brier_score ?? '—'}`,
    },
    PREDICTION: {
      title: '4. Prediction Logging',
      role: 'Immutable Audit Trail',
      summary:
        'Logs each forecast, confidence %, action state, and exact feature snapshot vector to SQLite before market outcomes unfold.',
      liveStat: `${recentPreds.length} tracked predictions logged`,
    },
    VALIDATION: {
      title: '5. Validation Gate',
      role: 'Out-of-Time Safety Check',
      summary:
        'Compares candidate models against Production on unseen chronological holdouts. Auto-rejects any regression in AUC, Brier, FPR, or drawdown.',
      liveStat: `ROC-AUC ${prodModel?.metrics.roc_auc ?? '—'} · FPR ${prodModel?.metrics.false_positive_rate ?? '—'} · DD ${prodModel?.metrics.max_drawdown_pct ?? '—'}%`,
    },
    OUTCOME: {
      title: '6. Outcome Verification',
      role: 'Realized Move Reconciliation',
      summary:
        'Matches prior predictions against actual realized returns and adverse excursions; operator overrides stay excluded from auto-labels.',
      liveStat: `${dailySummary?.verified_outcomes ?? 0} verified outcomes · ${dailySummary?.rejected_observations ?? 0} excluded`,
    },
    LEARNING: {
      title: '7. Offline Learning Cycle',
      role: 'Controlled Model Promotion',
      summary:
        'Retrains and recalibrates candidate weights offline on clean T-bounded labels, promoting only versions that pass every validation gate.',
      liveStat: `${dailySummary?.candidate_models ?? versions.length} versions audited · Active: ${prodModel?.version ?? 'v1.0'}`,
    },
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#0B0E14] text-xs">
      <div className="p-4 lg:p-5 space-y-4">
        {/* Clean Header: Brand/Operational Context on Left, Separated Actions/Tools on Right */}
        <header className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-800">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-lg font-bold text-slate-100 whitespace-nowrap">
                Brigg.AI ML Center
              </h1>
              {prodModel && (
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400 tabular-nums">
                  <span aria-hidden="true">·</span>
                  <span className="text-slate-200 font-semibold">{prodModel.version}</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-emerald-400 font-semibold">{prodModel.decision}</span>
                  <span aria-hidden="true">·</span>
                  <span>{prodModel.feature_version}</span>
                </div>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Operational ML dashboard separating live frozen inference, offline validation, calibration, and versioning governance.
            </p>
          </div>

          {/* Separated Actions / Tools Area (distinct from side navigation) */}
          <div
            className="flex flex-wrap items-center gap-2 shrink-0"
            role="toolbar"
            aria-label="ML Actions and Tools"
          >
            <button
              type="button"
              disabled={trainingBusy}
              onClick={() => handleLearnCycle(false)}
              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded font-medium inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 disabled:opacity-50 transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              {trainingBusy ? 'Running Cycle...' : 'Run Learning Cycle'}
            </button>

            <button
              type="button"
              disabled={trainingBusy}
              onClick={() => handleLearnCycle(true)}
              className="px-3 py-1.5 bg-[#111622] hover:bg-slate-800 border border-slate-700 text-amber-300 rounded font-medium inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 disabled:opacity-50 transition-colors"
              title="Simulate degraded candidate metrics to verify the auto-reject safety gate"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              Test Auto-Reject Gate
            </button>

            {/* Consolidated Export Menu (Data & Report) */}
            <div className="relative" ref={exportMenuRef}>
              <button
                type="button"
                onClick={() => setExportMenuOpen((v) => !v)}
                aria-expanded={exportMenuOpen}
                aria-haspopup="menu"
                className="px-3 py-1.5 bg-[#111622] hover:bg-slate-800 border border-slate-700 text-slate-200 rounded font-medium inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Export
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>
              {exportMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-1.5 w-48 rounded border border-slate-700 bg-[#111622] shadow-xl py-1 z-30"
                >
                  <div className="px-3 py-1 text-[10px] font-mono text-slate-400 border-b border-slate-800">
                    Export Data &amp; Reports
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => exportReport('json')}
                    className="w-full px-3 py-1.5 text-left text-[11px] text-slate-200 hover:bg-slate-800/80 flex items-center justify-between"
                  >
                    <span>Export Data (JSON)</span>
                    <span className="font-mono text-[10px] text-slate-400">.json</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => exportReport('csv')}
                    className="w-full px-3 py-1.5 text-left text-[11px] text-slate-200 hover:bg-slate-800/80 flex items-center justify-between"
                  >
                    <span>Export Data (CSV)</span>
                    <span className="font-mono text-[10px] text-slate-400">.csv</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => exportReport('pdf')}
                    className="w-full px-3 py-1.5 text-left text-[11px] text-slate-200 hover:bg-slate-800/80 flex items-center justify-between"
                  >
                    <span>Export Report (PDF)</span>
                    <span className="font-mono text-[10px] text-slate-400">.pdf</span>
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSideOpen((v) => !v)}
              className="px-2.5 py-1.5 bg-[#111622] hover:bg-slate-800 border border-slate-800 text-slate-300 rounded inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
              title={sideOpen ? 'Hide Side Layout' : 'Open Side Layout'}
            >
              {sideOpen ? (
                <PanelRightClose className="w-3.5 h-3.5 text-sky-300" />
              ) : (
                <PanelRightOpen className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span className="hidden sm:inline">{sideOpen ? 'Hide Context' : 'Context & Docs'}</span>
            </button>
          </div>
        </header>

        {learningBanner && (
          <div className="px-3 py-2 rounded border border-sky-500/40 bg-sky-950/20 text-sky-200 font-mono text-[11px] flex items-center justify-between gap-2">
            <span>{learningBanner}</span>
            <button
              type="button"
              onClick={() => setLearningBanner(null)}
              className="text-[10px] text-slate-400 hover:text-slate-200 shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Two-Zone Layout: Main ML Dashboard (left/primary) + Side Layout (right/secondary) */}
        <div className="flex flex-col xl:flex-row items-start gap-4">
          {/* MAIN DASHBOARD */}
          <div className="flex-1 min-w-0 w-full space-y-4">
            {/* 1. Core Operational Status Grid (6 crisp single-level KPIs) */}
            <section aria-label="ML Operational Status" className="grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-6 gap-2.5">
              <div className="p-3 rounded border border-slate-800 bg-[#111622]">
                <div className="text-[11px] text-slate-400">Model Status</div>
                <div className="mt-1 font-mono text-sm font-bold text-emerald-400 tabular-nums">
                  {prodModel?.decision ?? 'ACTIVE'}
                </div>
                <div className="mt-0.5 text-[10px] text-slate-400 truncate">
                  Frozen Live Inference
                </div>
              </div>

              <div className="p-3 rounded border border-slate-800 bg-[#111622]">
                <div className="text-[11px] text-slate-400">Current Version</div>
                <div className="mt-1 font-mono text-sm font-bold text-slate-100 tabular-nums">
                  {prodModel?.version ?? '—'}
                </div>
                <div className="mt-0.5 text-[10px] text-slate-400 font-mono tabular-nums truncate">
                  {prodModel ? `${prodModel.training_samples.toLocaleString()} samples · ${prodModel.feature_version}` : '—'}
                </div>
              </div>

              <div className="p-3 rounded border border-slate-800 bg-[#111622]">
                <div className="text-[11px] text-slate-400">Learning Status</div>
                <div className="mt-1 font-mono text-sm font-bold text-sky-300 tabular-nums">
                  {dailySummary ? `${dailySummary.verified_outcomes} Verified` : 'Ready'}
                </div>
                <div className="mt-0.5 text-[10px] text-slate-400 font-mono tabular-nums truncate">
                  {dailySummary
                    ? `${dailySummary.new_observations} obs · ${dailySummary.rejected_observations} excl`
                    : 'SQLite Cycle'}
                </div>
              </div>

              <div className="p-3 rounded border border-slate-800 bg-[#111622]">
                <div className="text-[11px] text-slate-400">Validation (OOT)</div>
                <div className="mt-1 font-mono text-sm font-bold text-slate-100 tabular-nums">
                  AUC {prodModel?.metrics.roc_auc ?? '—'}
                </div>
                <div className="mt-0.5 text-[10px] text-slate-400 font-mono tabular-nums truncate">
                  PR {prodModel?.metrics.pr_auc ?? '—'} · FPR {prodModel?.metrics.false_positive_rate ?? '—'}
                </div>
              </div>

              <div className="p-3 rounded border border-slate-800 bg-[#111622]">
                <div className="text-[11px] text-slate-400">Backtesting [SIM]</div>
                <div className="mt-1 font-mono text-sm font-bold text-slate-100 tabular-nums">
                  {btResult ? `${btResult.win_rate_pct}% WR` : prodModel ? `${prodModel.metrics.win_rate_pct}% WR` : '—'}
                </div>
                <div className="mt-0.5 text-[10px] text-slate-400 font-mono tabular-nums truncate">
                  PF {btResult?.profit_factor ?? prodModel?.metrics.profit_factor ?? '—'} · DD -{btResult?.max_drawdown_pct ?? prodModel?.metrics.max_drawdown_pct ?? '—'}%
                </div>
              </div>

              <div className="p-3 rounded border border-slate-800 bg-[#111622]">
                <div className="text-[11px] text-slate-400">Calibration</div>
                <div className="mt-1 font-mono text-sm font-bold text-cyan-300 tabular-nums">
                  Brier {prodModel?.metrics.brier_score ?? '—'}
                </div>
                <div className="mt-0.5 text-[10px] text-slate-400 font-mono tabular-nums truncate">
                  Err {prodModel?.metrics.calibration_error ?? '—'} · Platt Scaled
                </div>
              </div>
            </section>

            {/* 2. Compact Interactive 7-Stage ML Pipeline */}
            <section
              aria-label="ML Pipeline"
              className="p-3.5 rounded border border-slate-800 bg-[#111622] space-y-2.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-xs font-semibold text-slate-100">
                    ML Pipeline
                  </h2>
                  <span className="text-[11px] text-slate-400">
                    · Click any stage to inspect live stage metrics
                  </span>
                </div>
                {activePipelineNode && (
                  <button
                    type="button"
                    onClick={() => setActivePipelineNode(null)}
                    className="text-[11px] font-mono text-slate-400 hover:text-slate-200"
                  >
                    Collapse Stage
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {PIPELINE_NODES.map((node, idx) => {
                  const selected = activePipelineNode === node.id;
                  return (
                    <React.Fragment key={node.id}>
                      <button
                        type="button"
                        onClick={() =>
                          setActivePipelineNode(selected ? null : node.id)
                        }
                        aria-expanded={selected}
                        className={`px-2.5 py-1.5 rounded font-mono text-[11px] border whitespace-nowrap shrink-0 transition-colors ${
                          selected
                            ? 'bg-sky-500/20 border-sky-500 text-sky-200 font-semibold'
                            : 'bg-[#0B0E14] border-slate-800 text-slate-300 hover:border-slate-600 hover:text-slate-100'
                        }`}
                      >
                        {node.label}
                      </button>
                      {idx < PIPELINE_NODES.length - 1 && (
                        <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" aria-hidden="true" />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              {activePipelineNode && (
                <div className="p-3 rounded border border-slate-800 bg-[#0B0E14] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-xs font-semibold text-sky-300">
                        {pipelineDetail[activePipelineNode].title}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        · {pipelineDetail[activePipelineNode].role}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed max-w-2xl">
                      {pipelineDetail[activePipelineNode].summary}
                    </p>
                  </div>
                  <div className="font-mono text-[11px] text-emerald-400 tabular-nums shrink-0 sm:text-right">
                    {pipelineDetail[activePipelineNode].liveStat}
                  </div>
                </div>
              )}
            </section>

            {/* 3. Validation, Calibration & Feature Weights (Collapsible) */}
            {prodModel && (
              <section className="rounded border border-slate-800 bg-[#111622] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowValidationDetails((v) => !v)}
                  aria-expanded={showValidationDetails}
                  className="w-full px-3.5 py-2.5 flex items-center justify-between gap-2 text-left hover:bg-slate-800/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {showValidationDetails ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                    <span className="font-display text-xs font-semibold text-slate-100">
                      Validation, Calibration &amp; Feature Importance
                    </span>
                    <span className="text-[11px] font-mono text-slate-400 tabular-nums hidden sm:inline">
                      · ROC-AUC {prodModel.metrics.roc_auc} · Brier {prodModel.metrics.brier_score} · Trained {prodModel.training_date.slice(0, 10)}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 shrink-0">
                    {showValidationDetails ? 'Hide' : 'Expand'}
                  </span>
                </button>

                {showValidationDetails && (
                  <div className="p-3.5 pt-2 border-t border-slate-800 grid grid-cols-1 lg:grid-cols-12 gap-4">
                    {/* Left: Validation & Calibration Scorecard */}
                    <div className="lg:col-span-7 space-y-2.5">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px] tabular-nums">
                        <div className="p-2 rounded bg-[#0B0E14] border border-slate-800/80">
                          <div className="text-[10px] text-slate-400 font-sans">ROC-AUC</div>
                          <div className="text-sm font-bold text-slate-100">{prodModel.metrics.roc_auc}</div>
                        </div>
                        <div className="p-2 rounded bg-[#0B0E14] border border-slate-800/80">
                          <div className="text-[10px] text-slate-400 font-sans">PR-AUC</div>
                          <div className="text-sm font-bold text-slate-100">{prodModel.metrics.pr_auc}</div>
                        </div>
                        <div className="p-2 rounded bg-[#0B0E14] border border-slate-800/80">
                          <div className="text-[10px] text-slate-400 font-sans">F1 / Precision</div>
                          <div className="text-sm font-bold text-slate-100">
                            {prodModel.metrics.f1} / {prodModel.metrics.precision}
                          </div>
                        </div>
                        <div className="p-2 rounded bg-[#0B0E14] border border-slate-800/80">
                          <div className="text-[10px] text-slate-400 font-sans">Recall</div>
                          <div className="text-sm font-bold text-slate-100">{prodModel.metrics.recall}</div>
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
                        <div className="p-2 rounded bg-[#0B0E14] border border-slate-800/80">
                          <div className="text-[10px] text-slate-400 font-sans">New Obs</div>
                          <div className="text-sm font-bold text-slate-200">+{prodModel.new_observations}</div>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-300 space-y-1 pt-1">
                        <div className="text-slate-400 font-medium">Production Audit Notes</div>
                        {prodModel.changes.slice(0, 3).map((c, i) => (
                          <div key={i} className="text-slate-300">· {c}</div>
                        ))}
                      </div>
                    </div>

                    {/* Right: Top Feature Weights */}
                    <div className="lg:col-span-5 space-y-2">
                      <div className="text-[11px] font-medium text-slate-300">
                        Top Feature Weights ({prodModel.version})
                      </div>
                      <div className="space-y-1.5 font-mono text-[11px]">
                        {prodModel.feature_importance.slice(0, 6).map((fi) => (
                          <div key={fi.feature} className="space-y-0.5">
                            <div className="flex justify-between text-slate-300">
                              <span className="truncate">{fi.feature}</span>
                              <span className="tabular-nums shrink-0">{(fi.importance * 100).toFixed(1)}%</span>
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
              </section>
            )}

            {/* 4. Versioning & Rollback (Collapsible) */}
            <section className="rounded border border-slate-800 bg-[#111622] overflow-hidden">
              <button
                type="button"
                onClick={() => setShowVersioning((v) => !v)}
                aria-expanded={showVersioning}
                className="w-full px-3.5 py-2.5 flex items-center justify-between gap-2 text-left hover:bg-slate-800/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {showVersioning ? (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  )}
                  <span className="font-display text-xs font-semibold text-slate-100">
                    Versioning &amp; Rollback
                  </span>
                  <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                    · {versions.length} versions audited
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 shrink-0">
                  {showVersioning ? 'Hide' : 'Expand'}
                </span>
              </button>

              {showVersioning && (
                <div className="px-3.5 pb-3.5 pt-2 border-t border-slate-800 overflow-x-auto">
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
                        <th className="py-1.5 pr-3">Decision Note</th>
                        <th className="py-1.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {versions.map((v) => (
                        <tr key={v.version} className={v.is_production ? 'bg-sky-950/15' : 'hover:bg-slate-800/25'}>
                          <td className="py-2 pr-3 font-bold text-slate-100 whitespace-nowrap">
                            {v.version} {v.is_production ? '(PROD)' : ''}
                          </td>
                          <td
                            className={`py-2 pr-3 font-semibold whitespace-nowrap ${
                              v.decision === 'PROMOTED'
                                ? 'text-emerald-400'
                                : v.decision === 'REJECTED'
                                ? 'text-rose-400'
                                : 'text-amber-300'
                            }`}
                          >
                            {v.decision}
                          </td>
                          <td className="py-2 pr-3 text-slate-400 whitespace-nowrap">{v.training_date.slice(0, 10)}</td>
                          <td className="py-2 pr-3 text-right text-slate-200">{v.metrics.roc_auc}</td>
                          <td className="py-2 pr-3 text-right text-slate-200">{v.metrics.brier_score}</td>
                          <td className="py-2 pr-3 text-right text-slate-200">{v.metrics.false_positive_rate}</td>
                          <td className="py-2 pr-3 text-right text-slate-200">{v.metrics.max_drawdown_pct}%</td>
                          <td className="py-2 pr-3 font-sans text-slate-300 max-w-sm truncate" title={v.reason_for_change}>
                            {v.reason_for_change}
                          </td>
                          <td className="py-2 text-right whitespace-nowrap">
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
              )}
            </section>

            {/* 5. Outcome & Learning (Collapsible with Compact Sub-views) */}
            <section className="rounded border border-slate-800 bg-[#111622] overflow-hidden">
              <button
                type="button"
                onClick={() => setShowOutcomeLearning((v) => !v)}
                aria-expanded={showOutcomeLearning}
                className="w-full px-3.5 py-2.5 flex items-center justify-between gap-2 text-left hover:bg-slate-800/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {showOutcomeLearning ? (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  )}
                  <span className="font-display text-xs font-semibold text-slate-100">
                    Outcome &amp; Learning Cycle Status
                  </span>
                  <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                    · {learningActivity.length} SQLite events · {recentPreds.length} logged predictions
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 shrink-0">
                  {showOutcomeLearning ? 'Hide' : 'Expand'}
                </span>
              </button>

              {showOutcomeLearning && (
                <div className="p-3.5 pt-2.5 border-t border-slate-800 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1 p-0.5 rounded bg-[#0B0E14] border border-slate-800">
                      <button
                        type="button"
                        onClick={() => setOutcomeSubTab('CYCLE')}
                        className={`px-2.5 py-1 rounded text-[11px] font-medium whitespace-nowrap transition-colors ${
                          outcomeSubTab === 'CYCLE'
                            ? 'bg-sky-600/25 text-sky-200'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Learning Cycle Events
                      </button>
                      <button
                        type="button"
                        onClick={() => setOutcomeSubTab('LEDGER')}
                        className={`px-2.5 py-1 rounded text-[11px] font-medium whitespace-nowrap transition-colors ${
                          outcomeSubTab === 'LEDGER'
                            ? 'bg-sky-600/25 text-sky-200'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Prediction &amp; Outcome Ledger ({recentPreds.length})
                      </button>
                    </div>
                    {dailySummary && (
                      <div className="font-mono text-[11px] text-slate-400 tabular-nums">
                        {dailySummary.new_observations} obs · {dailySummary.verified_outcomes} verified · {dailySummary.rejected_observations} excl
                      </div>
                    )}
                  </div>

                  {outcomeSubTab === 'CYCLE' ? (
                    <div className="max-h-56 overflow-y-auto divide-y divide-slate-800/70">
                      {learningActivity.length === 0 ? (
                        <div className="py-4 text-slate-400">No recorded learning events yet.</div>
                      ) : (
                        learningActivity.map((ev) => (
                          <div key={ev.id} className="py-2 flex items-start justify-between gap-3">
                            <div className="space-y-0.5 min-w-0">
                              <div className="font-medium text-slate-100 inline-flex items-center gap-1.5">
                                <Activity className="w-3 h-3 text-sky-400 shrink-0" />
                                <span>{ev.technical_title}</span>
                              </div>
                              <div className="text-[11px] text-slate-400 leading-snug">{ev.technical_detail}</div>
                            </div>
                            <span className="font-mono text-[10px] text-slate-500 tabular-nums shrink-0">
                              {ev.timestamp.replace('T', ' ').slice(0, 19)}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  ) : (
                    <div className="overflow-x-auto max-h-60 overflow-y-auto">
                      <table className="w-full text-left font-mono text-[11px] tabular-nums">
                        <thead className="text-slate-400 border-b border-slate-800">
                          <tr>
                            <th className="py-1 pr-3">Time (UTC)</th>
                            <th className="py-1 pr-3">Token</th>
                            <th className="py-1 pr-3">Mode / Hor</th>
                            <th className="py-1 pr-3">Action</th>
                            <th className="py-1 pr-3 text-right">Opp / Risk</th>
                            <th className="py-1 pr-3">Model</th>
                            <th className="py-1 text-right">Outcome</th>
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
                  )}
                </div>
              )}
            </section>

            {/* 6. Backtesting Simulator [BACKTEST] (Collapsible) */}
            <section className="rounded border border-slate-800 bg-[#111622] overflow-hidden">
              <button
                type="button"
                onClick={() => setShowBacktest((v) => !v)}
                aria-expanded={showBacktest}
                className="w-full px-3.5 py-2.5 flex items-center justify-between gap-2 text-left hover:bg-slate-800/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {showBacktest ? (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  )}
                  <span className="font-display text-xs font-semibold text-slate-100">
                    Backtesting Simulator [BACKTEST]
                  </span>
                  {btResult && (
                    <span className="text-[11px] font-mono text-slate-400 tabular-nums hidden sm:inline">
                      · {btResult.trades_count} trades · {btResult.win_rate_pct}% WR · PF {btResult.profit_factor}
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-400 shrink-0">
                  {showBacktest ? 'Hide' : 'Configure & Run'}
                </span>
              </button>

              {showBacktest && (
                <div className="p-3.5 pt-2.5 border-t border-slate-800 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] text-amber-300/90">
                      {btResult?.disclaimer || 'BACKTEST ONLY — simulates liquidity filters, slippage, and priority fees.'}
                    </p>
                    <button
                      type="button"
                      onClick={runBacktest}
                      disabled={btBusy}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded font-medium inline-flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <SlidersHorizontal className="w-3 h-3" />
                      {btBusy ? 'Simulating...' : 'Run Backtest'}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 font-mono text-[11px]">
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
                      <label className="block text-slate-400 font-sans mb-1">Position ($)</label>
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
                    <div className="space-y-2.5">
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
                        <div className="overflow-x-auto max-h-56 overflow-y-auto">
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
              )}
            </section>
          </div>

          {/* SIDE LAYOUT: Secondary Information (Overview, Explainable, Technical, Help/Guide, ML Concepts, Docs/Reference) */}
          {sideOpen && (
            <MlSidePanel
              activeTab={sideTab}
              onSelectTab={setSideTab}
              expanded={sideExpanded}
              onToggleExpand={() => setSideExpanded((v) => !v)}
              prodModel={prodModel}
              versions={versions}
              features={features}
              recentPreds={recentPreds}
              learningActivity={learningActivity}
              dailySummary={dailySummary}
            />
          )}
        </div>
      </div>
    </div>
  );
};
