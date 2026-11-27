import React from 'react';
import type { RiskEngineResult, SocialIntelligence } from '../shared/types';

interface SocialNarrativePanelProps {
  social: SocialIntelligence;
  risk: RiskEngineResult;
}

export const SocialNarrativePanel: React.FC<SocialNarrativePanelProps> = ({ social, risk }) => {
  return (
    <div className="space-y-5 text-xs">
      {/* Social & Narrative Summary */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="p-3.5 rounded border border-slate-800 bg-[#111622] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold text-slate-100">
              Social & Narrative Intelligence
            </h3>
            <span className="font-mono text-[11px] text-slate-400">[{social.data_status}]</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono tabular-nums">
            <div className="p-2 rounded bg-[#0B0E14] border border-slate-800/80">
              <div className="text-[10px] text-slate-400 font-sans">Social Momentum</div>
              <div className="text-base font-bold text-slate-100">{social.social_momentum_score}/100</div>
            </div>
            <div className="p-2 rounded bg-[#0B0E14] border border-slate-800/80">
              <div className="text-[10px] text-slate-400 font-sans">Narrative Strength</div>
              <div className="text-base font-bold text-sky-300">{social.narrative_strength_score}/100</div>
            </div>
            <div className="p-2 rounded bg-[#0B0E14] border border-slate-800/80">
              <div className="text-[10px] text-slate-400 font-sans">Organicity Est.</div>
              <div className="text-base font-bold text-emerald-400">{social.social_organicity_estimate_pct}%</div>
            </div>
            <div className="p-2 rounded bg-[#0B0E14] border border-slate-800/80">
              <div className="text-[10px] text-slate-400 font-sans">Social Risk</div>
              <div className="text-base font-bold text-amber-300">{social.social_risk_score}/100</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
            <div>
              <span className="text-slate-400">Theme: </span>
              <span className="text-slate-100 font-medium">{social.narrative.primary_theme}</span>
            </div>
            <div>
              <span className="text-slate-400">Narrative Stage: </span>
              <span className="font-mono text-sky-300 font-semibold">{social.narrative.stage}</span>
            </div>
            <div>
              <span className="text-slate-400">Virality / Controversy: </span>
              <span className="font-mono text-slate-200 tabular-nums">
                {social.narrative.virality_score} / {social.narrative.controversy_score}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Paid vs Organic: </span>
              <span className="font-mono text-slate-200">{social.paid_vs_organic.classification}</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
            {social.paid_vs_organic.note}
          </p>
        </div>

        {/* Dedicated Risk Engine Breakdown (§22) */}
        <div className="p-3.5 rounded border border-slate-800 bg-[#111622] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold text-slate-100">
              Rug / Honeypot / Scam Risk Engine
            </h3>
            <span className={`font-mono text-xs font-bold tabular-nums ${risk.overall_risk >= 70 ? 'text-rose-400' : 'text-amber-300'}`}>
              Overall: {risk.overall_risk}/100
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 font-mono text-[11px] tabular-nums">
            <div className="p-2 rounded bg-[#0B0E14] border border-slate-800/80">
              <div className="text-[10px] text-slate-400 font-sans">Liquidity Risk</div>
              <div className="text-slate-100 font-semibold">{risk.liquidity_risk}/100</div>
            </div>
            <div className="p-2 rounded bg-[#0B0E14] border border-slate-800/80">
              <div className="text-[10px] text-slate-400 font-sans">Holder Risk</div>
              <div className="text-slate-100 font-semibold">{risk.holder_risk}/100</div>
            </div>
            <div className="p-2 rounded bg-[#0B0E14] border border-slate-800/80">
              <div className="text-[10px] text-slate-400 font-sans">Dev Risk</div>
              <div className="text-slate-100 font-semibold">{risk.dev_risk}/100</div>
            </div>
            <div className="p-2 rounded bg-[#0B0E14] border border-slate-800/80">
              <div className="text-[10px] text-slate-400 font-sans">Contract Risk</div>
              <div className="text-slate-100 font-semibold">{risk.contract_risk}/100</div>
            </div>
            <div className="p-2 rounded bg-[#0B0E14] border border-slate-800/80">
              <div className="text-[10px] text-slate-400 font-sans">Bot/Vol Risk</div>
              <div className="text-slate-100 font-semibold">{risk.bot_volume_risk}/100</div>
            </div>
            <div className="p-2 rounded bg-[#0B0E14] border border-slate-800/80">
              <div className="text-[10px] text-slate-400 font-sans">Social Risk</div>
              <div className="text-slate-100 font-semibold">{risk.social_risk}/100</div>
            </div>
          </div>

          {risk.rug_indicators.length > 0 && (
            <ul className="space-y-1 text-[11px] text-rose-300">
              {risk.rug_indicators.map((ind, i) => (
                <li key={i}>• {ind}</li>
              ))}
            </ul>
          )}

          <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
            {risk.safety_disclaimer}
          </p>
        </div>
      </div>

      {/* Approved Social Channels Table */}
      <div className="p-3.5 rounded border border-slate-800 bg-[#111622]">
        <h3 className="font-display text-sm font-semibold text-slate-100 mb-2">
          Approved Social Channels (X · Telegram · Reddit · Twitch)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-[11px] tabular-nums">
            <thead className="text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-1.5 pr-3">Platform</th>
                <th className="py-1.5 pr-3">Status</th>
                <th className="py-1.5 pr-3 text-right">Mentions</th>
                <th className="py-1.5 pr-3 text-right">1H Velocity</th>
                <th className="py-1.5 pr-3 text-right">Unique Accts</th>
                <th className="py-1.5 pr-3 text-right">Bot-Like %</th>
                <th className="py-1.5 pr-3 text-right">KOL Conc %</th>
                <th className="py-1.5 text-right">Sentiment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {social.platforms.map((p) => (
                <tr key={p.platform}>
                  <td className="py-1.5 pr-3 uppercase text-slate-200 font-semibold">{p.platform}</td>
                  <td className={`py-1.5 pr-3 ${p.data_status === 'REAL' ? 'text-emerald-400' : p.data_status === 'MOCK' ? 'text-amber-400' : 'text-slate-500'}`}>
                    {p.data_status}
                  </td>
                  <td className="py-1.5 pr-3 text-right text-slate-100">{p.mentions}</td>
                  <td className="py-1.5 pr-3 text-right text-slate-200">+{p.mention_velocity_1h}/h</td>
                  <td className="py-1.5 pr-3 text-right text-slate-300">{p.unique_accounts}</td>
                  <td className="py-1.5 pr-3 text-right text-slate-300">{p.bot_like_engagement_pct}%</td>
                  <td className="py-1.5 pr-3 text-right text-slate-300">{p.kol_concentration_pct}%</td>
                  <td className={`py-1.5 text-right ${p.sentiment_score >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {p.sentiment_score.toFixed(2)}
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
