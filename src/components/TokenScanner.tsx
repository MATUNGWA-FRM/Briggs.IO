import React from 'react';
import { AlertTriangle, PanelLeftClose, RefreshCw } from 'lucide-react';
import type { BriggFilterPreset, MarketRegimeState, ScannerTokenSummary } from '../shared/types';

interface TokenScannerProps {
  tokens: ScannerTokenSummary[];
  selectedAddress: string;
  onSelectToken: (address: string) => void;
  preset: BriggFilterPreset['id'];
  onPresetChange: (p: BriggFilterPreset['id']) => void;
  sortBy: string;
  onSortChange: (s: string) => void;
  loading: boolean;
  onRefresh: () => void;
  regime?: MarketRegimeState;
  widthPx?: number;
  onCollapse?: () => void;
}

const PRESET_TABS: Array<{ id: BriggFilterPreset['id']; label: string }> = [
  { id: 'GENERAL', label: 'All' },
  { id: 'SOON_PAIR', label: 'Soon <60m' },
  { id: 'MIGRATED_PAIR', label: 'Migrated' },
  { id: 'SCALPING_15M', label: '15M Scalp' },
  { id: 'DEXSCREENER_MEME', label: 'Meme' },
  { id: 'AXIOM_STYLE', label: 'Axiom' },
];

const AVATAR_PALETTE = [
  'bg-[#7C5CFF]/25 text-[#C4B5FD] border-[#7C5CFF]/40',
  'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  'bg-amber-500/20 text-amber-300 border-amber-500/40',
  'bg-rose-500/20 text-rose-300 border-rose-500/40',
];

function avatarClassForSymbol(symbol: string): string {
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) hash = (hash * 31 + symbol.charCodeAt(i)) | 0;
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

function formatCompactUsd(val: number): string {
  if (val >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(2)}B`;
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(1)}K`;
  return `$${val.toFixed(0)}`;
}

function formatAge(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
  return `${Math.round(minutes / 1440)}d`;
}

export const TokenScanner: React.FC<TokenScannerProps> = ({
  tokens,
  selectedAddress,
  onSelectToken,
  preset,
  onPresetChange,
  sortBy,
  onSortChange,
  loading,
  onRefresh,
  regime,
  widthPx,
  onCollapse,
}) => {
  return (
    <aside
      style={widthPx ? ({ '--panel-w': `${widthPx}px` } as React.CSSProperties) : undefined}
      className="w-full lg:w-[var(--panel-w,310px)] border-r border-[#1E2330] bg-[#0C0E14] flex flex-col shrink-0 lg:h-full max-h-[340px] lg:max-h-none overflow-hidden"
    >
      {/* Padre-Style Trenches Header */}
      <div className="p-2.5 border-b border-[#1E2330] space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="font-display text-xs font-bold uppercase tracking-wider text-slate-200">
              Trenches · Scanner
            </h2>
            <p className="text-[11px] text-slate-400 font-mono tabular-nums truncate">
              {tokens.length} pairs · {regime ? regime.regime : 'Solana'}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className="bg-[#07080C] border border-[#1E2330] rounded-sm px-1.5 py-1 text-[11px] font-mono text-slate-300 focus:outline-none focus:border-[#7C5CFF]"
              aria-label="Sort scanner tokens"
            >
              <option value="opportunity">Opp Score</option>
              <option value="risk">Low Risk</option>
              <option value="confidence">Confidence</option>
              <option value="volume">24H Vol</option>
              <option value="liquidity">Liquidity</option>
              <option value="social">Social</option>
              <option value="holder_growth">Holders</option>
              <option value="age">Youngest</option>
            </select>
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="p-1.5 rounded-sm border border-[#1E2330] bg-[#07080C] hover:bg-[#171B26] text-slate-300 transition-colors disabled:opacity-50"
              title="Refresh scanner universe"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            {onCollapse && (
              <button
                type="button"
                onClick={onCollapse}
                className="p-1.5 rounded-sm border border-[#1E2330] bg-[#07080C] hover:bg-[#171B26] text-slate-400 hover:text-slate-200 transition-colors"
                title="Collapse scanner panel"
                aria-label="Collapse scanner panel"
              >
                <PanelLeftClose className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Preset Strip */}
        <div className="flex flex-wrap items-center gap-1">
          {PRESET_TABS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onPresetChange(p.id)}
              className={`px-2 py-0.5 text-[10px] font-mono rounded-sm border transition-colors whitespace-nowrap shrink-0 ${
                preset === p.id
                  ? 'bg-[#7C5CFF]/25 text-[#C4B5FD] border-[#7C5CFF]/50'
                  : 'bg-[#07080C] text-slate-400 border-[#1E2330] hover:text-slate-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Dense Padre Trenches Pair List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#1E2330]/70">
        {loading && tokens.length === 0 ? (
          <div className="p-3 space-y-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-14 bg-[#12151E] rounded-sm animate-pulse" />
            ))}
          </div>
        ) : (
          tokens.map((t) => {
            const isSelected = t.address === selectedAddress;
            const actionColor =
              t.action_state === 'NO-TRADE'
                ? 'text-[#FF4D6A]'
                : t.action_state === 'HIGH-RISK OPPORTUNITY'
                ? 'text-amber-400'
                : t.action_state === 'WATCH'
                ? 'text-[#00E599]'
                : 'text-[#C4B5FD]';

            return (
              <button
                key={t.address}
                type="button"
                onClick={() => onSelectToken(t.address)}
                className={`w-full text-left px-2.5 py-2 transition-colors hover:bg-[#141824] ${
                  isSelected ? 'bg-[#171B2A]' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-7 h-7 rounded-sm border text-[10px] font-mono font-bold flex items-center justify-center shrink-0 ${avatarClassForSymbol(
                        t.symbol
                      )}`}
                    >
                      {t.symbol.replace('$', '').slice(0, 3)}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-display font-semibold text-xs text-slate-100 truncate">
                          {t.symbol}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 shrink-0">
                          {formatAge(t.age_minutes)} · {t.data_status}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 tabular-nums truncate">
                        MC {formatCompactUsd(t.market_cap_usd)} · L {formatCompactUsd(t.liquidity_usd)}
                      </div>
                    </div>
                  </div>

                  <div className="text-right font-mono tabular-nums shrink-0">
                    <div className={`text-xs font-semibold ${t.price_change_1h >= 0 ? 'text-[#00E599]' : 'text-[#FF4D6A]'}`}>
                      {t.price_change_1h >= 0 ? '+' : ''}
                      {t.price_change_1h.toFixed(1)}%
                    </div>
                    <div className="text-[10px] text-slate-400">V {formatCompactUsd(t.volume_24h_usd)}</div>
                  </div>
                </div>

                {/* Brigg Quantitative Line */}
                <div className="mt-1.5 flex items-center justify-between text-[10px] font-mono tabular-nums text-slate-400">
                  <span>
                    Opp <strong className="text-slate-200">{t.opportunity_score}</strong>
                    <span className="text-slate-600 mx-1">/</span>
                    Risk{' '}
                    <strong className={t.risk_score >= 70 ? 'text-[#FF4D6A]' : 'text-slate-200'}>
                      {t.risk_score}
                    </strong>
                    <span className="text-slate-600 mx-1">/</span>
                    {t.confidence_pct}%
                  </span>
                  <span className="inline-flex items-center gap-1">
                    {t.has_source_conflict && <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />}
                    <span className={`font-semibold ${actionColor}`}>{t.action_state}</span>
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
};
