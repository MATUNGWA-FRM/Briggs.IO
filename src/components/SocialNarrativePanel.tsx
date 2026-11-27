import React from 'react';
import type { RiskEngineResult, SocialIntelligence, SocialMentionEvent } from '../shared/types';
import { LiveSocialTracker } from './LiveSocialTracker';

interface SocialNarrativePanelProps {
  social: SocialIntelligence;
  risk: RiskEngineResult;
  symbol?: string;
  socialEvents?: SocialMentionEvent[];
  socialStreaming?: boolean;
  onToggleSocialStreaming?: () => void;
  onRefreshSocial?: () => void;
  socialLoading?: boolean;
}

export const SocialNarrativePanel: React.FC<SocialNarrativePanelProps> = ({
  social,
  risk,
  symbol = 'TOKEN',
  socialEvents = [],
  socialStreaming = true,
  onToggleSocialStreaming = () => undefined,
  onRefreshSocial = () => undefined,
  socialLoading = false,
}) => {
  return (
    <div className="space-y-4 text-xs">
      {/* Social & Narrative Summary + Risk Engine Breakdown */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3.5">
        <div className="p-3.5 rounded-sm border border-[#1E2330] bg-[#0C0E14] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold text-slate-100">
              Social & Narrative Intelligence
            </h3>
            <span className="font-mono text-[11px] text-slate-400">[{social.data_status}]</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono tabular-nums">
            <div className="p-2 rounded-sm bg-[#08090D] border border-[#1E2330]">
              <div className="text-[10px] text-slate-400 font-sans">Social Momentum</div>
              <div className="text-base font-bold text-slate-100">{social.social_momentum_score}/100</div>
            </div>
            <div className="p-2 rounded-sm bg-[#08090D] border border-[#1E2330]">
              <div className="text-[10px] text-slate-400 font-sans">Narrative Strength</div>
              <div className="text-base font-bold text-[#C4B5FD]">{social.narrative_strength_score}/100</div>
            </div>
            <div className="p-2 rounded-sm bg-[#08090D] border border-[#1E2330]">
              <div className="text-[10px] text-slate-400 font-sans">Organicity Est.</div>
              <div className="text-base font-bold text-[#00E599]">{social.social_organicity_estimate_pct}%</div>
            </div>
            <div className="p-2 rounded-sm bg-[#08090D] border border-[#1E2330]">
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
              <span className="font-mono text-[#C4B5FD] font-semibold">{social.narrative.stage}</span>
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

          <p className="text-[11px] text-slate-400 pt-2 border-t border-[#1E2330]">
            {social.paid_vs_organic.note}
          </p>
        </div>

        {/* Dedicated Risk Engine Breakdown */}
        <div className="p-3.5 rounded-sm border border-[#1E2330] bg-[#0C0E14] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold text-slate-100">
              Rug / Honeypot / Scam Risk Engine
            </h3>
            <span className={`font-mono text-xs font-bold tabular-nums ${risk.overall_risk >= 70 ? 'text-[#FF4D6A]' : 'text-amber-300'}`}>
              Overall: {risk.overall_risk}/100
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 font-mono text-[11px] tabular-nums">
            <div className="p-2 rounded-sm bg-[#08090D] border border-[#1E2330]">
              <div className="text-[10px] text-slate-400 font-sans">Liquidity Risk</div>
              <div className="text-slate-100 font-semibold">{risk.liquidity_risk}/100</div>
            </div>
            <div className="p-2 rounded-sm bg-[#08090D] border border-[#1E2330]">
              <div className="text-[10px] text-slate-400 font-sans">Holder Risk</div>
              <div className="text-slate-100 font-semibold">{risk.holder_risk}/100</div>
            </div>
            <div className="p-2 rounded-sm bg-[#08090D] border border-[#1E2330]">
              <div className="text-[10px] text-slate-400 font-sans">Dev Risk</div>
              <div className="text-slate-100 font-semibold">{risk.dev_risk}/100</div>
            </div>
            <div className="p-2 rounded-sm bg-[#08090D] border border-[#1E2330]">
              <div className="text-[10px] text-slate-400 font-sans">Contract Risk</div>
              <div className="text-slate-100 font-semibold">{risk.contract_risk}/100</div>
            </div>
            <div className="p-2 rounded-sm bg-[#08090D] border border-[#1E2330]">
              <div className="text-[10px] text-slate-400 font-sans">Bot/Vol Risk</div>
              <div className="text-slate-100 font-semibold">{risk.bot_volume_risk}/100</div>
            </div>
            <div className="p-2 rounded-sm bg-[#08090D] border border-[#1E2330]">
              <div className="text-[10px] text-slate-400 font-sans">Social Risk</div>
              <div className="text-slate-100 font-semibold">{risk.social_risk}/100</div>
            </div>
          </div>

          {risk.rug_indicators.length > 0 && (
            <ul className="space-y-1 text-[11px] text-[#FF8599]">
              {risk.rug_indicators.map((ind, i) => (
                <li key={i}>• {ind}</li>
              ))}
            </ul>
          )}

          <p className="text-[11px] text-slate-400 pt-2 border-t border-[#1E2330]">
            {risk.safety_disclaimer}
          </p>
        </div>
      </div>

      {/* Approved Social Channels Table */}
      <div className="p-3.5 rounded-sm border border-[#1E2330] bg-[#0C0E14]">
        <h3 className="font-display text-sm font-semibold text-slate-100 mb-2">
          Approved Social Channels (X · Telegram · Reddit · Twitch)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-[11px] tabular-nums">
            <thead className="text-slate-400 border-b border-[#1E2330]">
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
            <tbody className="divide-y divide-[#1E2330]/70">
              {social.platforms.map((p) => (
                <tr key={p.platform} className="hover:bg-[#121622] transition-colors">
                  <td className="py-1.5 pr-3 uppercase text-slate-200 font-semibold">{p.platform}</td>
                  <td
                    className={`py-1.5 pr-3 ${
                      p.data_status === 'REAL'
                        ? 'text-[#00E599]'
                        : p.data_status === 'MOCK'
                        ? 'text-amber-400'
                        : 'text-slate-500'
                    }`}
                  >
                    {p.data_status}
                  </td>
                  <td className="py-1.5 pr-3 text-right text-slate-100">{p.mentions}</td>
                  <td className="py-1.5 pr-3 text-right text-slate-200">+{p.mention_velocity_1h}/h</td>
                  <td className="py-1.5 pr-3 text-right text-slate-300">{p.unique_accounts}</td>
                  <td className="py-1.5 pr-3 text-right text-slate-300">{p.bot_like_engagement_pct}%</td>
                  <td className="py-1.5 pr-3 text-right text-slate-300">{p.kol_concentration_pct}%</td>
                  <td className={`py-1.5 text-right ${p.sentiment_score >= 0 ? 'text-[#00E599]' : 'text-[#FF4D6A]'}`}>
                    {p.sentiment_score.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Live Social Media Stream */}
      <LiveSocialTracker
        symbol={symbol}
        events={socialEvents}
        social={social}
        streaming={socialStreaming}
        onToggleStreaming={onToggleSocialStreaming}
        onRefresh={onRefreshSocial}
        loading={socialLoading}
      />
    </div>
  );
};
