import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Pause, Play, RotateCcw, Search, Video } from 'lucide-react';
import {
  TERMINAL_GUIDE_SECTIONS,
  TERMINAL_VIDEO_TUTORIALS,
  type TerminalGuideSection,
  type VideoTutorialLesson,
} from '../shared/guidesData';

function renderSectionDiagram(key: TerminalGuideSection['diagramKey']): React.ReactNode {
  switch (key) {
    case 'SCANNER':
      return (
        <svg viewBox="0 0 320 110" className="w-full h-28 bg-[#07080C] rounded-sm border border-[#1E2330]">
          <rect x="8" y="8" width="96" height="94" rx="3" fill="#0C0E14" stroke="#7C5CFF" strokeWidth="1.2" />
          <text x="15" y="21" fill="#C4B5FD" fontSize="8" fontFamily="monospace" fontWeight="700">TRENCHES</text>
          <rect x="13" y="27" width="86" height="19" rx="2" fill="#171B2A" />
          <text x="17" y="38" fill="#E2E8F0" fontSize="7.5" fontFamily="monospace">NEWP · 38m · SHIT</text>
          <text x="17" y="44" fill="#00E599" fontSize="6.5" fontFamily="monospace">Opp 78 / Risk 54</text>
          <rect x="13" y="50" width="86" height="19" rx="2" fill="#12151E" />
          <text x="17" y="61" fill="#E2E8F0" fontSize="7.5" fontFamily="monospace">BONK · 380d · MEME</text>
          <text x="17" y="67" fill="#38BDF8" fontSize="6.5" fontFamily="monospace">Opp 74 / Risk 28</text>
          <rect x="13" y="73" width="86" height="19" rx="2" fill="#12151E" stroke="#FF4D6A" strokeDasharray="2 2" />
          <text x="17" y="85" fill="#FF8599" fontSize="6.5" fontFamily="monospace">Stale slot replaced</text>
          <text x="120" y="34" fill="#94A3B8" fontSize="8" fontFamily="monospace">ML Cohort Classifier:</text>
          <text x="120" y="48" fill="#00E599" fontSize="8" fontFamily="monospace">• Shitcoin &lt;= 3 days</text>
          <text x="120" y="62" fill="#38BDF8" fontSize="8" fontFamily="monospace">• Memecoin &gt; 1 month</text>
          <text x="120" y="78" fill="#CBD5E1" fontSize="7.5" fontFamily="monospace">Auto-cleans dead/stale pairs</text>
        </svg>
      );
    case 'ACTION_STATE':
      return (
        <svg viewBox="0 0 320 110" className="w-full h-28 bg-[#07080C] rounded-sm border border-[#1E2330]">
          <rect x="14" y="14" width="142" height="36" rx="3" fill="rgba(245,158,11,0.12)" stroke="#F59E0B" />
          <text x="85" y="27" textAnchor="middle" fill="#94A3B8" fontSize="7" fontFamily="monospace">ACTION STATE</text>
          <text x="85" y="42" textAnchor="middle" fill="#FCD34D" fontSize="9.5" fontFamily="monospace" fontWeight="700">HIGH-RISK OPPORTUNITY</text>
          <rect x="166" y="14" width="140" height="36" rx="3" fill="rgba(255,77,106,0.12)" stroke="#FF4D6A" />
          <text x="236" y="27" textAnchor="middle" fill="#94A3B8" fontSize="7" fontFamily="monospace">SAFETY GATE</text>
          <text x="236" y="42" textAnchor="middle" fill="#FF8599" fontSize="9.5" fontFamily="monospace" fontWeight="700">NO-TRADE OVERRIDE</text>
          <text x="16" y="72" fill="#CBD5E1" fontSize="8" fontFamily="monospace">NOT a raw Buy/Sell order — reflects setup</text>
          <text x="16" y="85" fill="#94A3B8" fontSize="8" fontFamily="monospace">quality vs structural liquidity/bundle risk.</text>
        </svg>
      );
    case 'LIVE_SIGNAL':
      return (
        <svg viewBox="0 0 320 110" className="w-full h-28 bg-[#07080C] rounded-sm border border-[#1E2330]">
          <rect x="12" y="12" width="136" height="86" rx="3" fill="#0C0E14" stroke="#00E599" />
          <text x="20" y="26" fill="#94A3B8" fontSize="7.5" fontFamily="monospace">OPTIONAL LIVE SIGNAL</text>
          <text x="20" y="43" fill="#00E599" fontSize="13" fontFamily="monospace" fontWeight="700">BUY · 71%</text>
          <text x="20" y="56" fill="#C4B5FD" fontSize="7" fontFamily="monospace">Updated: 14:22:08</text>
          <text x="20" y="71" fill="#CBD5E1" fontSize="6.8" fontFamily="monospace">+ Buy flow 63% 5M</text>
          <text x="20" y="82" fill="#CBD5E1" fontSize="6.8" fontFamily="monospace">+ Above VWAP &amp; EMA9</text>
          <text x="162" y="28" fill="#F59E0B" fontSize="8" fontFamily="monospace" fontWeight="700">Default: OFF in Settings</text>
          <text x="162" y="45" fill="#CBD5E1" fontSize="7.5" fontFamily="monospace">BUY | HOLD | PARTIAL SELL | SELL</text>
          <text x="162" y="61" fill="#94A3B8" fontSize="7.5" fontFamily="monospace">Reacts to real live market ticks</text>
          <text x="162" y="75" fill="#94A3B8" fontSize="7.5" fontFamily="monospace">Separate from ML Action State</text>
        </svg>
      );
    case 'PUMP_DUMP':
      return (
        <svg viewBox="0 0 320 110" className="w-full h-28 bg-[#07080C] rounded-sm border border-[#1E2330]">
          <rect x="10" y="10" width="300" height="26" fill="rgba(0,229,153,0.12)" stroke="#00E599" strokeDasharray="3 3" />
          <text x="18" y="26" fill="#00E599" fontSize="8" fontFamily="monospace" fontWeight="700">PUMP ZONE · 68% est. (Sniper Target)</text>
          <line x1="10" y1="54" x2="310" y2="54" stroke="#22D3EE" strokeDasharray="3 2" />
          <text x="18" y="50" fill="#22D3EE" fontSize="7.5" fontFamily="monospace">SNIPER IN · Entry Zone</text>
          <rect x="10" y="72" width="300" height="26" fill="rgba(255,77,106,0.12)" stroke="#FF4D6A" strokeDasharray="3 3" />
          <text x="18" y="88" fill="#FF4D6A" fontSize="8" fontFamily="monospace" fontWeight="700">DUMP ZONE · 32% est. (Invalidation Stop)</text>
        </svg>
      );
    case 'FULLSCREEN':
      return (
        <svg viewBox="0 0 320 110" className="w-full h-28 bg-[#07080C] rounded-sm border border-[#1E2330]">
          <rect x="12" y="12" width="296" height="86" rx="3" fill="#0C0E14" stroke="#7C5CFF" strokeWidth="1.5" />
          <path d="M22 28 V20 H30 M290 20 H298 V28 M22 82 V90 H30 M298 82 V90 H290" stroke="#00E599" strokeWidth="2" fill="none" />
          <polyline points="30,72 80,62 125,68 175,44 225,49 282,28" fill="none" stroke="#00E599" strokeWidth="2" />
          <text x="160" y="80" textAnchor="middle" fill="#C4B5FD" fontSize="8.5" fontFamily="monospace" fontWeight="700">
            ⛶ FULLSCREEN LIVE CHART · SAME SSE STREAM &amp; OBJECTS
          </text>
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 320 110" className="w-full h-28 bg-[#07080C] rounded-sm border border-[#1E2330]">
          <rect x="10" y="10" width="190" height="90" rx="2" fill="#0C0E14" stroke="#1E2330" />
          <line x1="20" y1="35" x2="190" y2="35" stroke="#FF4D6A" strokeDasharray="3 3" strokeWidth="1" />
          <line x1="20" y1="80" x2="190" y2="80" stroke="#00E599" strokeDasharray="3 3" strokeWidth="1" />
          <polyline points="24,74 54,66 84,70 114,50 144,56 178,38" fill="none" stroke="#22D3EE" strokeWidth="1.8" />
          <polyline points="24,78 70,68 125,58 178,46" fill="none" stroke="#9D7BFF" strokeWidth="1.2" strokeDasharray="2 2" />
          <rect x="208" y="10" width="102" height="90" rx="2" fill="#0C0E14" stroke="#1E2330" />
          <text x="216" y="28" fill="#C4B5FD" fontSize="8" fontFamily="monospace" fontWeight="700">{key}</text>
          <text x="216" y="44" fill="#00E599" fontSize="7.5" fontFamily="monospace">Bullish / Support</text>
          <text x="216" y="58" fill="#FF4D6A" fontSize="7.5" fontFamily="monospace">Risk / Resistance</text>
          <text x="216" y="74" fill="#94A3B8" fontSize="7" fontFamily="monospace">Live Telemetry</text>
        </svg>
      );
  }
}

export const TerminalGuidePanel: React.FC = () => {
  const [subMode, setSubMode] = useState<'GUIDE' | 'VIDEOS'>('GUIDE');
  const [query, setQuery] = useState('');
  const [catFilter, setCatFilter] = useState<'ALL' | TerminalGuideSection['category']>('ALL');
  const [selectedId, setSelectedId] = useState<string>(TERMINAL_GUIDE_SECTIONS[0].id);

  // Interactive video tutorial player state
  const [selectedVideoId, setSelectedVideoId] = useState<string>(TERMINAL_VIDEO_TUTORIALS[0].id);
  const [playing, setPlaying] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);

  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TERMINAL_GUIDE_SECTIONS.filter((sec) => {
      if (catFilter !== 'ALL' && sec.category !== catFilter) return false;
      if (!q) return true;
      return (
        sec.title.toLowerCase().includes(q) ||
        sec.whatItIs.toLowerCase().includes(q) ||
        sec.whatItMeans.toLowerCase().includes(q) ||
        sec.number.includes(q)
      );
    });
  }, [query, catFilter]);

  const activeSection =
    filteredSections.find((s) => s.id === selectedId) ||
    filteredSections[0] ||
    TERMINAL_GUIDE_SECTIONS[0];

  const activeVideo: VideoTutorialLesson =
    TERMINAL_VIDEO_TUTORIALS.find((v) => v.id === selectedVideoId) || TERMINAL_VIDEO_TUTORIALS[0];

  useEffect(() => {
    setElapsedSec(0);
    setPlaying(false);
  }, [selectedVideoId]);

  useEffect(() => {
    if (!playing || subMode !== 'VIDEOS') return;
    const timer = setInterval(() => {
      setElapsedSec((prev) => {
        if (prev + 1 >= activeVideo.durationSec) {
          setPlaying(false);
          return activeVideo.durationSec;
        }
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [playing, subMode, activeVideo.durationSec]);

  const currentStepIdx = useMemo(() => {
    let idx = 0;
    for (let i = 0; i < activeVideo.steps.length; i++) {
      if (elapsedSec >= activeVideo.steps[i].atSec) idx = i;
    }
    return idx;
  }, [activeVideo.steps, elapsedSec]);

  const currentStep = activeVideo.steps[currentStepIdx] || activeVideo.steps[0];

  return (
    <div className="space-y-3">
      {/* Sub-navigation: 22 Illustrated Sections vs 8 Interactive Video Tutorials */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#1E2330]">
        <div>
          <h3 className="font-display font-semibold text-slate-100">
            Terminal Guide &amp; Video Walkthroughs
          </h3>
          <p className="text-[11px] text-slate-400">
            Plain-language reference explaining every number, chart tool, Action State, and Live Signal.
          </p>
        </div>

        <div className="flex items-center bg-[#07080C] border border-[#1E2330] rounded-sm p-0.5 font-mono text-[11px]">
          <button
            type="button"
            onClick={() => setSubMode('GUIDE')}
            className={`px-2.5 py-1 rounded-sm inline-flex items-center gap-1.5 ${
              subMode === 'GUIDE'
                ? 'bg-[#7C5CFF]/25 text-[#C4B5FD] font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3 h-3" />
            <span>Guide ({TERMINAL_GUIDE_SECTIONS.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSubMode('VIDEOS')}
            className={`px-2.5 py-1 rounded-sm inline-flex items-center gap-1.5 ${
              subMode === 'VIDEOS'
                ? 'bg-[#00E599]/20 text-[#00E599] font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Video className="w-3 h-3" />
            <span>Video Tutorials ({TERMINAL_VIDEO_TUTORIALS.length})</span>
          </button>
        </div>
      </div>

      {subMode === 'GUIDE' ? (
        <div className="space-y-3">
          {/* Search + Category Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search any panel or concept (e.g. Action State, Live Signal, Liquidity)..."
                className="w-full bg-[#08090D] border border-[#1E2330] rounded-sm pl-8 pr-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-[#7C5CFF]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1 font-mono text-[10px]">
              {(['ALL', 'DISCOVERY', 'CHARTING', 'SCORING', 'EXECUTION_CONTEXT'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCatFilter(cat)}
                  className={`px-2 py-1 rounded-sm border ${
                    catFilter === cat
                      ? 'border-[#7C5CFF]/60 bg-[#7C5CFF]/20 text-[#C4B5FD]'
                      : 'border-[#1E2330] bg-[#08090D] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cat === 'EXECUTION_CONTEXT' ? 'CONTEXT' : cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* 22-Topic Directory */}
            <div className="md:col-span-4 border border-[#1E2330] bg-[#08090D] rounded-sm max-h-[420px] overflow-y-auto divide-y divide-[#1E2330]/60">
              {filteredSections.map((sec) => {
                const active = sec.id === activeSection.id;
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => setSelectedId(sec.id)}
                    className={`w-full text-left px-2.5 py-2 text-[11px] flex items-center justify-between gap-2 transition-colors ${
                      active ? 'bg-[#7C5CFF]/20 text-[#C4B5FD] font-semibold' : 'text-slate-300 hover:bg-[#12151E]'
                    }`}
                  >
                    <span className="truncate">
                      <span className="font-mono text-slate-500 mr-1.5">{sec.number}.</span>
                      {sec.title}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Illustrated Explanation Card */}
            <div className="md:col-span-8 p-3.5 border border-[#1E2330] bg-[#08090D] rounded-sm space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-display text-sm font-bold text-slate-100">
                  {activeSection.number}. {activeSection.title}
                </h4>
                <span className="text-[10px] font-mono text-[#C4B5FD]">{activeSection.category}</span>
              </div>

              {renderSectionDiagram(activeSection.diagramKey)}

              <div className="space-y-2 text-[11px] leading-relaxed">
                <div className="p-2 rounded-sm bg-[#0C0E14] border border-[#1E2330]">
                  <span className="font-mono text-[10px] uppercase text-[#C4B5FD] block">What it is</span>
                  <span className="text-slate-200">{activeSection.whatItIs}</span>
                </div>
                <div className="p-2 rounded-sm bg-[#0C0E14] border border-[#1E2330]">
                  <span className="font-mono text-[10px] uppercase text-[#00E599] block">What it means</span>
                  <span className="text-slate-200">{activeSection.whatItMeans}</span>
                </div>
                <div className="p-2 rounded-sm bg-[#0C0E14] border border-[#1E2330]">
                  <span className="font-mono text-[10px] uppercase text-cyan-300 block">How Brigg calculates it</span>
                  <span className="text-slate-300">{activeSection.howBriggCalculates}</span>
                </div>
                <div className="p-2 rounded-sm bg-[#0C0E14] border border-[#1E2330]">
                  <span className="font-mono text-[10px] uppercase text-slate-400 block">Example</span>
                  <span className="font-mono text-slate-200">{activeSection.example}</span>
                </div>
                <div className="p-2 rounded-sm bg-amber-500/10 border border-amber-500/30">
                  <span className="font-mono text-[10px] uppercase text-amber-300 block">What to pay attention to</span>
                  <span className="text-amber-100">{activeSection.payAttentionTo}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Interactive Step-by-Step Video Tutorials + Written Guides */
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-4 border border-[#1E2330] bg-[#08090D] rounded-sm divide-y divide-[#1E2330]/60 max-h-[430px] overflow-y-auto">
            {TERMINAL_VIDEO_TUTORIALS.map((vid, idx) => {
              const active = vid.id === activeVideo.id;
              return (
                <button
                  key={vid.id}
                  type="button"
                  onClick={() => setSelectedVideoId(vid.id)}
                  className={`w-full text-left px-2.5 py-2.5 space-y-0.5 transition-colors ${
                    active ? 'bg-[#7C5CFF]/20 text-[#C4B5FD]' : 'text-slate-300 hover:bg-[#12151E]'
                  }`}
                >
                  <div className="font-medium text-[11px] flex items-center justify-between gap-2">
                    <span className="truncate">
                      {idx + 1}. {vid.title}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400 shrink-0">{vid.durationSec}s</span>
                  </div>
                  <div className="text-[10px] text-slate-500">{vid.level}</div>
                </button>
              );
            })}
          </div>

          <div className="md:col-span-8 p-3.5 border border-[#1E2330] bg-[#08090D] rounded-sm space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="font-display text-sm font-bold text-slate-100">{activeVideo.title}</h4>
                <p className="text-[11px] text-slate-400">{activeVideo.summary}</p>
              </div>
              <span className="font-mono text-[10px] text-[#00E599] shrink-0">
                {elapsedSec}s / {activeVideo.durationSec}s
              </span>
            </div>

            {/* Interactive Animated Walkthrough Stage */}
            <div className="p-3 rounded-sm border border-[#7C5CFF]/40 bg-[#0C0E14] space-y-2.5">
              <div className="flex items-center justify-between text-[10px] font-mono text-[#C4B5FD]">
                <span>SPOTLIGHT · {currentStep.highlightArea}</span>
                <span>
                  Step {currentStepIdx + 1} / {activeVideo.steps.length}
                </span>
              </div>

              <div className="p-3 rounded-sm bg-[#07080C] border border-[#1E2330] min-h-[78px] flex flex-col justify-center">
                <div className="font-display text-xs font-bold text-[#00E599]">{currentStep.heading}</div>
                <p className="text-[11px] text-slate-200 mt-1 leading-relaxed">{currentStep.caption}</p>
              </div>

              {/* Scrubber & Playback Controls */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (elapsedSec >= activeVideo.durationSec) setElapsedSec(0);
                    setPlaying((p) => !p);
                  }}
                  className="px-2.5 py-1 rounded-sm bg-[#7C5CFF] hover:bg-[#6D4AFF] text-white font-mono text-[11px] inline-flex items-center gap-1"
                >
                  {playing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  <span>{playing ? 'Pause' : 'Play'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setElapsedSec(0);
                    setPlaying(true);
                  }}
                  className="p-1.5 rounded-sm border border-[#1E2330] bg-[#12151E] text-slate-300 hover:text-white"
                  title="Restart tutorial"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
                <input
                  type="range"
                  min={0}
                  max={activeVideo.durationSec}
                  value={elapsedSec}
                  onChange={(e) => {
                    setPlaying(false);
                    setElapsedSec(Number(e.target.value));
                  }}
                  aria-label="Tutorial timeline scrubber"
                  className="flex-1 accent-[#7C5CFF] cursor-pointer"
                />
              </div>

              {/* Clickable Step Markers */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                {activeVideo.steps.map((st, idx) => (
                  <button
                    key={st.heading}
                    type="button"
                    onClick={() => {
                      setElapsedSec(st.atSec);
                      setPlaying(false);
                    }}
                    className={`p-1.5 rounded-sm border text-left text-[10px] transition-colors ${
                      idx === currentStepIdx
                        ? 'border-[#00E599]/60 bg-[#00E599]/10 text-[#00E599]'
                        : 'border-[#1E2330] bg-[#07080C] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-mono">{st.atSec}s</div>
                    <div className="truncate font-medium">{st.heading}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Written Guide Alongside Video */}
            <div className="p-2.5 rounded-sm border border-[#1E2330] bg-[#0C0E14] space-y-1">
              <div className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
                Written Key Takeaways
              </div>
              <ul className="space-y-1 text-[11px] text-slate-300">
                {activeVideo.writtenGuide.map((line, i) => (
                  <li key={i}>• {line}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
