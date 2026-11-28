import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Cpu,
  FileText,
  HelpCircle,
  Layers,
  Maximize2,
  Minimize2,
  Search,
  Sparkles,
} from 'lucide-react';
import { ML_GUIDE_TOPICS, type MlGuideTopic } from '../shared/guidesData';
import type { FeatureDefinition } from '../server/ml/features';
import type {
  DailyLearningSummary,
  MlLearningActivityEvent,
  ModelVersionRecord,
  PredictionRecord,
} from '../shared/types';

export type MlSideTab =
  | 'OVERVIEW'
  | 'EXPLAINABLE'
  | 'TECHNICAL'
  | 'GUIDE'
  | 'CONCEPTS'
  | 'REFERENCE';

interface MlSidePanelProps {
  activeTab: MlSideTab;
  onSelectTab: (tab: MlSideTab) => void;
  expanded: boolean;
  onToggleExpand: () => void;
  prodModel: ModelVersionRecord | undefined;
  versions: ModelVersionRecord[];
  features: FeatureDefinition[];
  recentPreds: PredictionRecord[];
  learningActivity: MlLearningActivityEvent[];
  dailySummary: DailyLearningSummary | null;
}

const SIDE_NAV_ITEMS: Array<{ id: MlSideTab; label: string; icon: React.ReactNode }> = [
  { id: 'OVERVIEW', label: 'Overview', icon: <Layers className="w-3.5 h-3.5 shrink-0" /> },
  { id: 'EXPLAINABLE', label: 'Explainable', icon: <Sparkles className="w-3.5 h-3.5 shrink-0" /> },
  { id: 'TECHNICAL', label: 'Technical', icon: <Cpu className="w-3.5 h-3.5 shrink-0" /> },
  { id: 'GUIDE', label: 'Help / Guide', icon: <HelpCircle className="w-3.5 h-3.5 shrink-0" /> },
  { id: 'CONCEPTS', label: 'ML Concepts', icon: <BookOpen className="w-3.5 h-3.5 shrink-0" /> },
  { id: 'REFERENCE', label: 'Docs / Reference', icon: <FileText className="w-3.5 h-3.5 shrink-0" /> },
];

const FEATURE_PLAIN_LABELS: Record<string, { label: string; desc: string }> = {
  liquidity_depth: {
    label: 'Liquidity Depth & Exit Buffer',
    desc: 'Checks whether enough pool liquidity exists to enter and exit without heavy price impact.',
  },
  liquidity_to_mc: {
    label: 'Liquidity vs Market Cap Balance',
    desc: 'Measures if pool backing matches the token valuation or looks artificially thin.',
  },
  organic_volume_ratio: {
    label: 'Organic Trading Activity',
    desc: 'Separates genuine trader participation from repetitive automated or wash activity.',
  },
  buy_sell_imbalance: {
    label: 'Buyer vs Seller Pressure',
    desc: 'Tracks whether real buy demand outweighs sell pressure across recent trading windows.',
  },
  holder_concentration: {
    label: 'Holder Spread & Whale Safety',
    desc: 'Evaluates how evenly supply is distributed so a few large wallets cannot easily dump.',
  },
  sniper_bundle_overhang: {
    label: 'Early Sniper & Bundle Overhang',
    desc: 'Watches how much supply remains held by coordinated launch buyers waiting to sell.',
  },
  momentum_stability: {
    label: 'Price & Volume Stability',
    desc: 'Measures steady upward structure versus erratic spike-and-collapse price swings.',
  },
  social_organicity: {
    label: 'Authentic Community Interest',
    desc: 'Estimates whether social discussion is growing naturally rather than purely boosted.',
  },
};

function toPlainFactor(rawKey: string): { label: string; desc: string } {
  const normalized = rawKey.toLowerCase().trim();
  if (FEATURE_PLAIN_LABELS[normalized]) {
    return FEATURE_PLAIN_LABELS[normalized];
  }
  const readable = rawKey
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase());
  return {
    label: readable,
    desc: 'Tracked market structure input contributing to the active model output.',
  };
}

function safeParseSnapshot(jsonStr: string | undefined): Record<string, number> {
  if (!jsonStr) return {};
  try {
    const parsed = JSON.parse(jsonStr);
    if (parsed && typeof parsed === 'object') return parsed as Record<string, number>;
    return {};
  } catch {
    return {};
  }
}

export const MlSidePanel: React.FC<MlSidePanelProps> = ({
  activeTab,
  onSelectTab,
  expanded,
  onToggleExpand,
  prodModel,
  versions,
  features,
  recentPreds,
  learningActivity,
  dailySummary,
}) => {
  const [conceptQuery, setConceptQuery] = useState('');
  const [guideStage, setGuideStage] = useState<'ALL' | MlGuideTopic['pipelineStep']>('ALL');
  const [openConceptId, setOpenConceptId] = useState<string | null>(ML_GUIDE_TOPICS[0]?.id ?? null);
  const [openTechSection, setOpenTechSection] = useState<string>('ARCHITECTURE');

  const filteredTopics = useMemo(() => {
    const q = conceptQuery.trim().toLowerCase();
    return ML_GUIDE_TOPICS.filter((t) => {
      if (activeTab === 'GUIDE' && guideStage !== 'ALL' && t.pipelineStep !== guideStage) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        t.explainToMe.toLowerCase().includes(q) ||
        t.technicalDetail.toLowerCase().includes(q) ||
        t.number.includes(q)
      );
    });
  }, [activeTab, conceptQuery, guideStage]);

  const latestPred = recentPreds[0];
  const prevPred = recentPreds[1];
  const latestSnap = useMemo(() => safeParseSnapshot(latestPred?.features_snapshot_json), [latestPred]);
  const prevSnap = useMemo(() => safeParseSnapshot(prevPred?.features_snapshot_json), [prevPred]);

  const confidenceDelta =
    latestPred && prevPred ? latestPred.confidence_pct - prevPred.confidence_pct : 0;

  return (
    <aside
      aria-label="ML Reference and Explanations Side Layout"
      className={`flex flex-col border border-slate-800 bg-[#0E121B] rounded shrink-0 transition-all duration-150 ${
        expanded ? 'w-full xl:w-[560px] 2xl:w-[620px]' : 'w-full xl:w-[370px] 2xl:w-[410px]'
      }`}
    >
      {/* Side Layout Header + Vertical/Grid Navigation */}
      <div className="p-3 border-b border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-xs font-semibold text-slate-100">
              ML Context &amp; Documentation
            </h2>
            <p className="text-[11px] text-slate-400">
              Explanations, engineering specs &amp; reference
            </p>
          </div>
          <button
            type="button"
            onClick={onToggleExpand}
            className="p-1.5 rounded border border-slate-800 hover:border-slate-700 hover:bg-slate-800/60 text-slate-300 transition-colors"
            title={expanded ? 'Compact Side Layout' : 'Expand Side Layout'}
            aria-label={expanded ? 'Compact Side Layout' : 'Expand Side Layout'}
          >
            {expanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>

        <nav
          aria-label="ML Side Navigation"
          className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-2 gap-1"
        >
          {SIDE_NAV_ITEMS.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`px-2.5 py-1.5 rounded text-left text-[11px] font-medium inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors border ${
                  active
                    ? 'bg-sky-500/15 border-sky-500/50 text-sky-200'
                    : 'bg-[#111622] border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                {item.icon}
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Side Content Area */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3 text-xs">
        {activeTab === 'OVERVIEW' && (
          <div className="space-y-3">
            <div>
              <h3 className="font-display text-sm font-semibold text-slate-100">
                ML System Overview
              </h3>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Brigg separates live prediction inference from offline daily training so live trading weights remain stable until a candidate passes out-of-time safety gates.
              </p>
            </div>

            <div className="divide-y divide-slate-800/80 border border-slate-800 rounded bg-[#111622]">
              <div className="p-2.5">
                <div className="text-[11px] font-semibold text-emerald-400">1. Model Inference</div>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                  Frozen validated production weights ({prodModel?.version || 'v1.0'}) score incoming tokens in real time without self-mutating mid-stream.
                </p>
              </div>
              <div className="p-2.5">
                <div className="text-[11px] font-semibold text-sky-300">2. Model Training</div>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                  Runs offline on verified, timestamp-locked outcomes. Human manual overrides are excluded from automatic labels.
                </p>
              </div>
              <div className="p-2.5">
                <div className="text-[11px] font-semibold text-violet-300">3. Historical Data</div>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                  Point-in-time SQLite feature snapshots captured strictly at prediction time T prevent lookahead leakage.
                </p>
              </div>
              <div className="p-2.5">
                <div className="text-[11px] font-semibold text-amber-300">4. Backtesting</div>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                  Simulated replay factoring liquidity minimums, slippage (bps), and Solana priority fees ([BACKTEST ONLY]).
                </p>
              </div>
              <div className="p-2.5">
                <div className="text-[11px] font-semibold text-cyan-300">5. Calibration</div>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                  Platt scaling and Brier error tracking verify predicted probabilities match realized market frequencies.
                </p>
              </div>
            </div>

            {dailySummary && (
              <div className="p-3 rounded border border-slate-800 bg-[#111622] space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-slate-200">Active Learning Summary</span>
                  <span className="font-mono text-slate-400 tabular-nums">{dailySummary.date_label}</span>
                </div>
                <ul className="space-y-1 text-[11px] text-slate-400 leading-snug">
                  {dailySummary.main_learning.slice(0, 3).map((item, idx) => (
                    <li key={idx}>· {item.explain_to_me}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {activeTab === 'EXPLAINABLE' && (
          <div className="space-y-3">
            <div>
              <h3 className="font-display text-sm font-semibold text-slate-100">
                Why did Brigg give this prediction?
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                Plain-language explanation of the latest observation, what drove confidence, and what risks matter most.
              </p>
            </div>

            {latestPred ? (
              <div className="p-3 rounded border border-slate-800 bg-[#111622] space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-semibold text-slate-100">
                      {latestPred.symbol} · {latestPred.mode === 'SHITCOIN' ? 'New Launch (<=3d)' : 'Established Memecoin'}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Observed {latestPred.prediction_timestamp.replace('T', ' ').slice(0, 16)} UTC
                    </div>
                  </div>
                  <div className="text-right font-mono tabular-nums">
                    <div className="text-xs font-semibold text-sky-300">{latestPred.action_state}</div>
                    <div className="text-[11px] text-slate-400">Confidence {latestPred.confidence_pct}%</div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-200">
                    Confidence &amp; What Changed
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {latestPred.confidence_pct >= 70
                      ? 'Brigg has high data agreement right now: liquidity, volume, and holder signals point in the same direction.'
                      : latestPred.confidence_pct >= 50
                      ? 'Signals are moderately aligned, so Brigg recommends watching closely for stronger buyer confirmation before acting.'
                      : 'Market signals conflict or liquidity is thin, so Brigg lowered confidence to avoid false alarms.'}
                  </p>
                  {prevPred && (
                    <p className="text-[11px] text-slate-400 leading-snug">
                      {confidenceDelta > 0
                        ? `Confidence rose +${confidenceDelta}% compared to ${prevPred.symbol} (${prevPred.confidence_pct}%), reflecting cleaner orderflow and fresher market data.`
                        : confidenceDelta < 0
                        ? `Confidence fell ${confidenceDelta}% compared to ${prevPred.symbol} (${prevPred.confidence_pct}%) due to higher volatility, thinner liquidity, or mixed buyer/seller flow.`
                        : `Confidence held steady at ${latestPred.confidence_pct}% vs the prior ${prevPred.symbol} observation.`}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-800 space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-200">
                    Market Conditions Detected
                  </div>
                  <ul className="space-y-1 text-[11px] text-slate-300">
                    <li>
                      · Opportunity vs Risk balance: {latestPred.opportunity_score}/100 reward potential against {latestPred.risk_score}/100 downside risk.
                    </li>
                    {typeof latestSnap.liquidity_usd === 'number' && (
                      <li>
                        · Available pool liquidity around ${Math.round(latestSnap.liquidity_usd).toLocaleString()}
                        {latestSnap.liquidity_usd < 15_000 ? ' (thin — exits can slip fast).' : ' (sufficient depth for normal sizing).'}
                      </li>
                    )}
                    {typeof latestSnap.sniper_pct === 'number' && (
                      <li>
                        · Early launch buyer share estimated near {Math.round(latestSnap.sniper_pct)}%
                        {latestSnap.sniper_pct >= 20 ? ' (elevated selling overhang risk).' : ' (contained supply overhang).'}
                      </li>
                    )}
                    {typeof prevSnap.liquidity_usd === 'number' && typeof latestSnap.liquidity_usd === 'number' && (
                      <li>
                        · Compared to prior snapshot: pool depth is{' '}
                        {latestSnap.liquidity_usd >= prevSnap.liquidity_usd ? 'stronger' : 'shallower'} than the previous tracked token.
                      </li>
                    )}
                  </ul>
                </div>

                <div className="pt-2 border-t border-slate-800 space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-200">
                    Risk Factors to Watch
                  </div>
                  <p className="text-[11px] text-amber-300/90 leading-snug">
                    {latestPred.risk_score >= 65
                      ? 'High risk detected: concentrated supply, rapid sell pressure, or weak exit depth can trigger a fast drop even if short-term hype looks strong.'
                      : 'Moderate crypto volatility applies: always confirm buyer flow stays positive and avoid entering if liquidity starts shrinking.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded border border-slate-800 bg-[#111622] text-[11px] text-slate-400">
                No tracked observations yet. Analyze a token or run a learning cycle to generate plain-language prediction explanations.
              </div>
            )}

            {/* Strongest Contributing Factors in plain language */}
            {prodModel && (
              <div className="p-3 rounded border border-slate-800 bg-[#111622] space-y-2">
                <div className="text-[11px] font-semibold text-slate-200">
                  Strongest Factors Guiding Brigg ({prodModel.version})
                </div>
                <div className="space-y-2">
                  {prodModel.feature_importance.slice(0, 5).map((fi) => {
                    const plain = toPlainFactor(fi.feature);
                    return (
                      <div key={fi.feature} className="space-y-0.5">
                        <div className="flex items-center justify-between gap-2 text-[11px]">
                          <span className="font-medium text-slate-200">{plain.label}</span>
                          <span className="font-mono text-sky-300 tabular-nums">
                            {(fi.importance * 100).toFixed(0)}% weight
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-snug">{plain.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {learningActivity.length > 0 && (
              <div className="p-3 rounded border border-slate-800 bg-[#111622] space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-200">
                  Recent Model Confidence Updates
                </div>
                <div className="space-y-1.5">
                  {learningActivity.slice(0, 3).map((ev) => (
                    <div key={ev.id} className="text-[11px] border-t border-slate-800/70 pt-1.5 first:border-0 first:pt-0">
                      <div className="font-medium text-slate-200">{ev.simple_title}</div>
                      <div className="text-slate-400 leading-snug">{ev.simple_detail}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'TECHNICAL' && (
          <div className="space-y-2.5">
            <div>
              <h3 className="font-display text-sm font-semibold text-slate-100">
                Technical ML Specifications
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Architecture, feature engineering, calibration, OOT validation, and leakage constraints.
              </p>
            </div>

            {[
              {
                id: 'ARCHITECTURE',
                title: 'Model Architecture & Version',
                content: prodModel ? (
                  <div className="space-y-2 font-mono text-[11px] tabular-nums">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-slate-400 font-sans block">Model Type</span>
                        <span className="text-slate-200">{prodModel.model_type}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-sans block">Active Version</span>
                        <span className="text-emerald-400">{prodModel.version} ({prodModel.decision})</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-sans block">Dataset / Feature</span>
                        <span className="text-sky-300">{prodModel.dataset_version} · {prodModel.feature_version}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-sans block">Train / Val Windows</span>
                        <span className="text-slate-200">{prodModel.training_period} / {prodModel.validation_period}</span>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-800">
                      <div className="text-slate-400 font-sans mb-1">Hyperparameters</div>
                      <div className="grid grid-cols-2 gap-1 text-[10px]">
                        {Object.entries(prodModel.hyperparameters || {}).map(([k, v]) => (
                          <div key={k} className="flex justify-between gap-2 bg-[#0B0E14] px-2 py-1 rounded border border-slate-800/80">
                            <span className="text-slate-400 truncate">{k}</span>
                            <span className="text-slate-200">{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-400">No production model loaded.</div>
                ),
              },
              {
                id: 'VALIDATION',
                title: 'Validation, Calibration & Statistical Metrics',
                content: prodModel ? (
                  <div className="space-y-2 text-[11px]">
                    <div className="grid grid-cols-2 gap-1.5 font-mono tabular-nums">
                      <div className="p-1.5 rounded bg-[#0B0E14] border border-slate-800">
                        <span className="text-slate-400 font-sans block text-[10px]">ROC-AUC / PR-AUC</span>
                        <span className="text-slate-100">{prodModel.metrics.roc_auc} / {prodModel.metrics.pr_auc}</span>
                      </div>
                      <div className="p-1.5 rounded bg-[#0B0E14] border border-slate-800">
                        <span className="text-slate-400 font-sans block text-[10px]">Precision / Recall / F1</span>
                        <span className="text-slate-100">{prodModel.metrics.precision} / {prodModel.metrics.recall} / {prodModel.metrics.f1}</span>
                      </div>
                      <div className="p-1.5 rounded bg-[#0B0E14] border border-slate-800">
                        <span className="text-slate-400 font-sans block text-[10px]">Brier / Cal Error</span>
                        <span className="text-emerald-400">{prodModel.metrics.brier_score} / {prodModel.metrics.calibration_error}</span>
                      </div>
                      <div className="p-1.5 rounded bg-[#0B0E14] border border-slate-800">
                        <span className="text-slate-400 font-sans block text-[10px]">FPR / Sharpe / PF</span>
                        <span className="text-sky-300">{prodModel.metrics.false_positive_rate} / {prodModel.metrics.sharpe_ratio} / {prodModel.metrics.profit_factor}</span>
                      </div>
                    </div>
                    <p className="text-slate-400 leading-snug">
                      Promotion gate enforces candidate ROC-AUC &gt;= prod, Brier &lt;= prod, FPR &lt;= prod, and Max Drawdown &lt;= prod on strictly chronological out-of-time holdout data. Platt logistic scaling calibrates probabilities post-ensemble.
                    </p>
                  </div>
                ) : null,
              },
              {
                id: 'FEATURES',
                title: `Feature Engineering Registry (${features.length})`,
                content: (
                  <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                    {features.length === 0 ? (
                      <div className="text-[11px] text-slate-400">Feature registry unavailable.</div>
                    ) : (
                      features.map((f) => (
                        <div key={f.name} className="p-2 rounded bg-[#0B0E14] border border-slate-800/80 space-y-0.5">
                          <div className="flex items-center justify-between gap-2 font-mono text-[10px]">
                            <span className="text-sky-300 font-semibold">{f.name}</span>
                            <span className="text-slate-400">{f.source}</span>
                          </div>
                          <div className="text-[11px] text-slate-300 leading-snug">{f.definition}</div>
                          <div className="text-[10px] text-slate-500 leading-snug">Fallback: {f.missing_behavior}</div>
                        </div>
                      ))
                    )}
                  </div>
                ),
              },
              {
                id: 'PIPELINE_CONSTRAINTS',
                title: 'Data Pipeline, Backtesting & Rollback Constraints',
                content: (
                  <ul className="space-y-1.5 text-[11px] text-slate-300 leading-snug">
                    <li>
                      · <strong className="text-slate-100">Temporal Leakage Guard:</strong> <code className="font-mono text-sky-300">assertNoTemporalLeakage()</code> enforces <code className="font-mono">feature_ts &lt;= prediction_ts &lt;= outcome_ts</code> and rejects any record containing post-T return keys.
                    </li>
                    <li>
                      · <strong className="text-slate-100">Backtesting Methodology:</strong> Replay simulates fixed position sizing, minimum liquidity screening, configurable slippage (bps), and Solana priority fees. Never treated as guaranteed live yield.
                    </li>
                    <li>
                      · <strong className="text-slate-100">Override Isolation:</strong> Operator manual overrides set <code className="font-mono text-amber-300">excluded_from_auto_labels = true</code> so discretionary calls do not contaminate supervised targets.
                    </li>
                    <li>
                      · <strong className="text-slate-100">Versioning / Rollback:</strong> Every version ({versions.length} stored in SQLite) retains immutable metrics and weights; rollback atomically switches <code className="font-mono">is_production</code> and writes an audit entry.
                    </li>
                  </ul>
                ),
              },
            ].map((sec) => {
              const isOpen = openTechSection === sec.id;
              return (
                <div key={sec.id} className="border border-slate-800 rounded bg-[#111622] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpenTechSection(isOpen ? '' : sec.id)}
                    className="w-full px-3 py-2 flex items-center justify-between gap-2 text-left text-xs font-semibold text-slate-100 hover:bg-slate-800/40 transition-colors"
                  >
                    <span>{sec.title}</span>
                    {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                  </button>
                  {isOpen && <div className="px-3 pb-3 pt-1 border-t border-slate-800/80">{sec.content}</div>}
                </div>
              );
            })}
          </div>
        )}

        {(activeTab === 'GUIDE' || activeTab === 'CONCEPTS') && (
          <div className="space-y-3">
            <div>
              <h3 className="font-display text-sm font-semibold text-slate-100">
                {activeTab === 'GUIDE' ? 'Interactive ML Help & Guide' : 'ML Concepts Glossary'}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {activeTab === 'GUIDE'
                  ? 'Filter by pipeline stage to understand how Brigg collects, scores, validates, and updates safely.'
                  : 'Compact reference for all 22 ML metrics, validation terms, and safeguards.'}
              </p>
            </div>

            {activeTab === 'GUIDE' && (
              <div className="flex flex-wrap gap-1">
                {(['ALL', 'DATA', 'FEATURES', 'MODEL', 'VALIDATION', 'OUTCOME', 'GOVERNANCE'] as const).map(
                  (st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setGuideStage(st)}
                      className={`px-2 py-1 rounded font-mono text-[10px] border whitespace-nowrap shrink-0 transition-colors ${
                        guideStage === st
                          ? 'bg-sky-500/20 border-sky-500/50 text-sky-200 font-semibold'
                          : 'bg-[#111622] border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {st}
                    </button>
                  )
                )}
              </div>
            )}

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={conceptQuery}
                onChange={(e) => setConceptQuery(e.target.value)}
                placeholder="Search concepts (ROC-AUC, Brier, Leakage...)"
                className="w-full bg-[#111622] border border-slate-800 rounded pl-8 pr-2.5 py-1.5 text-[11px] font-mono text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="space-y-1.5">
              {filteredTopics.map((topic) => {
                const isOpen = openConceptId === topic.id;
                return (
                  <div key={topic.id} className="border border-slate-800 rounded bg-[#111622]">
                    <button
                      type="button"
                      onClick={() => setOpenConceptId(isOpen ? null : topic.id)}
                      className="w-full px-2.5 py-2 flex items-center justify-between gap-2 text-left hover:bg-slate-800/40 transition-colors"
                    >
                      <span className="text-[11px] font-medium text-slate-100 truncate">
                        <span className="font-mono text-sky-400 mr-1.5">{topic.number}.</span>
                        {topic.title}
                      </span>
                      <span className="font-mono text-[10px] text-slate-500 shrink-0">
                        {topic.pipelineStep}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="px-2.5 pb-2.5 pt-1.5 border-t border-slate-800/80 space-y-1.5 text-[11px]">
                        <p className="text-slate-200 leading-relaxed">{topic.explainToMe}</p>
                        <p className="text-slate-400 leading-snug">{topic.technicalDetail}</p>
                        <div className="p-1.5 rounded bg-[#0B0E14] border border-slate-800 font-mono text-[10px] text-sky-300">
                          {topic.formulaOrFlow}
                        </div>
                        <div className="text-slate-400">
                          <span className="text-emerald-400 font-mono mr-1">Example:</span>
                          {topic.example}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {filteredTopics.length === 0 && (
                <div className="p-3 text-[11px] text-slate-400 border border-slate-800 rounded bg-[#111622]">
                  No concepts match &ldquo;{conceptQuery}&rdquo;.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'REFERENCE' && (
          <div className="space-y-3 text-[11px]">
            <div>
              <h3 className="font-display text-sm font-semibold text-slate-100">
                Documentation &amp; Reference
              </h3>
              <p className="text-slate-400 mt-0.5">
                Operational endpoints, export formats, and safety invariants for Brigg.AI ML Center.
              </p>
            </div>

            <div className="p-3 rounded border border-slate-800 bg-[#111622] space-y-2">
              <div className="font-semibold text-slate-200">Operational Endpoints</div>
              <div className="space-y-1 font-mono text-[10px] text-slate-300">
                <div>GET /api/ml/versions — Versions, features, recent predictions &amp; SQLite events</div>
                <div>POST /api/ml/learn — Trigger daily learning cycle (with optional degradation test)</div>
                <div>POST /api/ml/rollback — Restore a validated historical model version</div>
                <div>POST /api/backtest — Simulate strategy with slippage bps &amp; priority fees</div>
              </div>
            </div>

            <div className="p-3 rounded border border-slate-800 bg-[#111622] space-y-1.5">
              <div className="font-semibold text-slate-200">Auto-Reject Gate Criteria</div>
              <p className="text-slate-400 leading-snug">
                Candidate models are automatically rejected unless all four out-of-time checks hold against active Production:
              </p>
              <ul className="font-mono text-[10px] text-slate-300 space-y-0.5">
                <li>· Candidate ROC-AUC &gt;= Production ROC-AUC</li>
                <li>· Candidate Brier Score &lt;= Production Brier Score</li>
                <li>· Candidate False Positive Rate &lt;= Production FPR</li>
                <li>· Candidate Max Drawdown &lt;= Production Max Drawdown</li>
              </ul>
            </div>

            <div className="p-3 rounded border border-slate-800 bg-[#111622] space-y-1.5">
              <div className="font-semibold text-slate-200">Export Schemas</div>
              <ul className="text-slate-400 space-y-1 leading-snug">
                <li>· <strong className="text-slate-200">JSON Data</strong>: Full production snapshot, version history, backtest output, and feature registry.</li>
                <li>· <strong className="text-slate-200">CSV Data</strong>: Tabular audit export of every model version metric row.</li>
                <li>· <strong className="text-slate-200">PDF Report</strong>: Formatted executive &amp; statistical audit summary via jsPDF.</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
