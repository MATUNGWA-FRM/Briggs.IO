import React, { useMemo, useState } from 'react';
import { ArrowRight, Search } from 'lucide-react';
import { ML_GUIDE_TOPICS, type MlGuideTopic } from '../shared/guidesData';
import type { MlViewMode } from '../shared/terminalSettings';

interface MlGuidePanelProps {
  viewMode: MlViewMode;
}

const PIPELINE_STAGES: Array<{
  id: MlGuideTopic['pipelineStep'];
  label: string;
  simpleDesc: string;
}> = [
  { id: 'DATA', label: '1. Market Data & Observations', simpleDesc: 'Live snapshots recorded at time T' },
  { id: 'FEATURES', label: '2. Features', simpleDesc: 'Measurable clues & ratios' },
  { id: 'MODEL', label: '3. Brigg Model & Calibration', simpleDesc: '8-factor ensemble + Platt scaling' },
  { id: 'VALIDATION', label: '4. Validation Gate', simpleDesc: 'Unseen out-of-time tests' },
  { id: 'OUTCOME', label: '5. Outcome & Learning', simpleDesc: 'Compare forecast vs real move' },
  { id: 'GOVERNANCE', label: '6. Versioning & Rollback', simpleDesc: 'Promoted / Rejected / Rollback' },
];

export const MlGuidePanel: React.FC<MlGuidePanelProps> = ({ viewMode }) => {
  const [query, setQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<'ALL' | MlGuideTopic['pipelineStep']>('ALL');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ML_GUIDE_TOPICS.filter((t) => {
      if (stageFilter !== 'ALL' && t.pipelineStep !== stageFilter) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        t.explainToMe.toLowerCase().includes(q) ||
        t.technicalDetail.toLowerCase().includes(q) ||
        t.number.includes(q)
      );
    });
  }, [query, stageFilter]);

  return (
    <div className="space-y-4">
      {/* Visual 7-Stage Pipeline Flow Diagram */}
      <div className="p-4 rounded border border-slate-800 bg-[#111622] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-sm font-semibold text-slate-100">
              How Brigg&apos;s Machine Learning Pipeline Works
            </h2>
            <p className="text-[11px] text-slate-400">
              {viewMode === 'EXPLAIN_TO_ME'
                ? 'Click any stage below to filter beginner-friendly explanations of how Brigg learns without cheating.'
                : 'Closed-loop supervised pipeline with strict T-boundary temporal leakage guards and OOT validation gates.'}
            </p>
          </div>
          {stageFilter !== 'ALL' && (
            <button
              type="button"
              onClick={() => setStageFilter('ALL')}
              className="px-2 py-1 rounded border border-slate-700 text-[11px] font-mono text-sky-300 hover:bg-slate-800"
            >
              Show All 22 Topics
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          {[
            'Market Data',
            'Features',
            'Model',
            'Prediction',
            'Validation',
            'Outcome',
            'Learning',
          ].map((node, idx, arr) => (
            <React.Fragment key={node}>
              <span className="px-2.5 py-1 rounded border border-sky-500/40 bg-sky-950/30 font-mono text-sky-200">
                {node}
              </span>
              {idx < arr.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
            </React.Fragment>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1">
          {PIPELINE_STAGES.map((st) => {
            const active = stageFilter === st.id;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => setStageFilter(active ? 'ALL' : st.id)}
                className={`p-2 rounded border text-left transition-colors ${
                  active
                    ? 'border-sky-500 bg-sky-500/15 text-slate-100'
                    : 'border-slate-800 bg-[#0B0E14] text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="font-mono text-[10px] font-semibold text-sky-300 truncate">{st.label}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{st.simpleDesc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search all 22 ML concepts (e.g. ROC-AUC, Brier Score, Temporal Leakage, Rollback)..."
          className="w-full bg-[#111622] border border-slate-800 rounded pl-9 pr-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-sky-500"
        />
      </div>

      {/* 22 ML Concept Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map((topic) => (
          <div key={topic.id} className="p-3.5 rounded border border-slate-800 bg-[#111622] space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display text-sm font-semibold text-slate-100">
                <span className="font-mono text-sky-400 mr-1.5">{topic.number}.</span>
                {topic.title}
              </h3>
              <span className="text-[10px] font-mono text-slate-400">{topic.pipelineStep}</span>
            </div>

            <p className="text-slate-200 leading-relaxed">
              {viewMode === 'EXPLAIN_TO_ME' ? topic.explainToMe : topic.technicalDetail}
            </p>

            {viewMode === 'TECHNICAL' && (
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Plain view: {topic.explainToMe}
              </p>
            )}

            <div className="p-2 rounded bg-[#0B0E14] border border-slate-800/80 font-mono text-[10px] text-sky-300">
              {topic.formulaOrFlow}
            </div>

            <div className="text-[11px] text-slate-400">
              <span className="text-emerald-400 font-mono mr-1">Example:</span>
              {topic.example}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
