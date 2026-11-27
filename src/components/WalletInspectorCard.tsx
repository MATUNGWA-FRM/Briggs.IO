import React, { useState } from 'react';
import { ArrowRight, Check, Copy, X } from 'lucide-react';
import {
  EDGE_RELATIONSHIP_COLORS,
  WALLET_CLASSIFICATION_COLORS,
  type BubbleMapNode,
  type BubbleMapPayload,
} from '../server/graph/bubbleMapBuilder';
import type { WalletEdge } from '../shared/types';

interface BubbleLegendProps {
  visibleNodes: BubbleMapNode[];
  onSelectRole?: (role: string) => void;
  activeRole?: string;
}

export const BubbleLegend: React.FC<BubbleLegendProps> = ({
  visibleNodes,
  onSelectRole,
  activeRole,
}) => {
  const presentRoles = Array.from(new Set(visibleNodes.map((n) => n.classification)));
  const rolesToDisplay =
    presentRoles.length > 0
      ? presentRoles
      : (Object.keys(WALLET_CLASSIFICATION_COLORS) as Array<keyof typeof WALLET_CLASSIFICATION_COLORS>);

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 px-3 py-2 rounded border border-slate-800/90 bg-[#0E131D] text-[11px]">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-slate-400 font-medium">Wallet Roles:</span>
        {rolesToDisplay.map((role) => {
          const color = WALLET_CLASSIFICATION_COLORS[role];
          const isSelected = activeRole === role;
          return (
            <button
              key={role}
              type="button"
              onClick={() => onSelectRole?.(isSelected ? 'ALL' : role)}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors ${
                isSelected ? 'text-sky-300 font-semibold underline underline-offset-4' : 'text-slate-300 hover:text-white'
              }`}
              title={`Filter by ${role}`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: color }}
              />
              <span>{role}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px]">
        <span className="text-slate-400 font-sans text-[11px]">Links:</span>
        {(Object.keys(EDGE_RELATIONSHIP_COLORS) as Array<WalletEdge['relationship']>).map((rel) => (
          <span key={rel} className="inline-flex items-center gap-1 text-slate-300 whitespace-nowrap shrink-0">
            <span
              className="w-3 h-0.5 inline-block shrink-0"
              style={{ backgroundColor: EDGE_RELATIONSHIP_COLORS[rel] }}
            />
            <span>{rel}</span>
          </span>
        ))}
      </div>
    </div>
  );
};

interface WalletInspectorCardProps {
  graph: BubbleMapPayload;
  selectedWallet: BubbleMapNode | null;
  selectedEdge?: WalletEdge | null;
  onSelectWallet: (w: BubbleMapNode | null) => void;
  onClearEdge?: () => void;
}

export const WalletInspectorCard: React.FC<WalletInspectorCardProps> = ({
  graph,
  selectedWallet,
  selectedEdge,
  onSelectWallet,
  onClearEdge,
}) => {
  const [copied, setCopied] = useState(false);

  if (selectedEdge && !selectedWallet) {
    const srcNode = graph.nodes.find((n) => n.id === selectedEdge.source);
    const tgtNode = graph.nodes.find((n) => n.id === selectedEdge.target);
    return (
      <div className="p-3 rounded border border-slate-800 bg-[#111622] text-xs space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-mono">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: EDGE_RELATIONSHIP_COLORS[selectedEdge.relationship] }}
            />
            <span className="font-semibold text-slate-100 uppercase">{selectedEdge.relationship} Relationship</span>
            <span className="text-slate-400 tabular-nums">
              · Confidence {Math.round(selectedEdge.confidence * 100)}% · ${selectedEdge.weight_usd.toLocaleString()}
            </span>
          </div>
          {onClearEdge && (
            <button
              type="button"
              onClick={onClearEdge}
              className="text-slate-400 hover:text-slate-200 p-0.5"
              title="Close edge inspection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-slate-300">
          {srcNode && (
            <button
              type="button"
              onClick={() => onSelectWallet(srcNode)}
              className="text-sky-300 hover:underline"
            >
              {srcNode.classification} ({srcNode.short_address})
            </button>
          )}
          <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
          {tgtNode && (
            <button
              type="button"
              onClick={() => onSelectWallet(tgtNode)}
              className="text-sky-300 hover:underline"
            >
              {tgtNode.classification} ({tgtNode.short_address})
            </button>
          )}
          <span className="text-slate-500">· {selectedEdge.timestamp.slice(0, 19).replace('T', ' ')} UTC</span>
        </div>
        <div className="text-[11px] text-slate-400">{selectedEdge.evidence}</div>
      </div>
    );
  }

  if (!selectedWallet) return null;

  const connectedEdges = graph.edges.filter(
    (e) => e.source === selectedWallet.id || e.target === selectedWallet.id
  );

  const handleCopy = () => {
    navigator.clipboard?.writeText(selectedWallet.address).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="p-3.5 rounded border border-slate-800 bg-[#111622] text-xs space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: selectedWallet.color }}
          />
          <span className="font-semibold text-slate-100">{selectedWallet.classification}</span>
          <span className="font-mono text-[11px] text-slate-400 tabular-nums">
            ({Math.round(selectedWallet.classification_confidence * 100)}% conf)
          </span>
          <span className="font-mono text-slate-300 truncate max-w-[260px]" title={selectedWallet.address}>
            {selectedWallet.address}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className="text-slate-400 hover:text-sky-300 p-0.5 shrink-0"
            title="Copy wallet address"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        <button
          type="button"
          onClick={() => onSelectWallet(null)}
          className="text-slate-400 hover:text-slate-200 p-0.5 shrink-0"
          title="Clear selection"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono">
        <div>
          <div className="text-[11px] text-slate-400 font-sans">Holdings & % Supply</div>
          <div className="text-slate-100 tabular-nums mt-0.5">
            {selectedWallet.supply_pct.toFixed(2)}% · ${selectedWallet.balance_usd.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 tabular-nums">
            {selectedWallet.balance_tokens.toLocaleString()} tokens
          </div>
        </div>

        <div>
          <div className="text-[11px] text-slate-400 font-sans">Funding Origin & First Fund</div>
          <div className="text-slate-200 truncate mt-0.5" title={selectedWallet.funding_source}>
            {selectedWallet.funding_source}
          </div>
          <div className="text-[10px] text-slate-400 tabular-nums">
            {selectedWallet.first_funding_timestamp.slice(0, 19).replace('T', ' ')} UTC
          </div>
        </div>

        <div>
          <div className="text-[11px] text-slate-400 font-sans">First Entry & Trade History</div>
          <div className="text-slate-200 tabular-nums mt-0.5">
            {selectedWallet.buy_count}B / {selectedWallet.sell_count}S · PnL{' '}
            <span className={selectedWallet.realized_pnl_usd >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {selectedWallet.realized_pnl_usd >= 0 ? '+' : '-'}$
              {Math.abs(selectedWallet.realized_pnl_usd).toLocaleString()}
            </span>
          </div>
          <div className="text-[10px] text-slate-400 tabular-nums">
            First buy: {selectedWallet.first_purchase_timestamp.slice(11, 19)} UTC · {selectedWallet.behavior}
          </div>
        </div>

        <div>
          <div className="text-[11px] text-slate-400 font-sans">Risk, Launches & Cluster</div>
          <div className="text-slate-100 tabular-nums mt-0.5">
            Risk{' '}
            <span className={selectedWallet.risk_score >= 70 ? 'text-rose-400' : 'text-slate-200'}>
              {selectedWallet.risk_score}/100
            </span>{' '}
            · {selectedWallet.cross_token_launches} launches
          </div>
          <div className="text-[10px] text-slate-400 truncate" title={selectedWallet.notes}>
            {selectedWallet.cluster_id ? `Cluster ${selectedWallet.cluster_id} · ` : ''}
            {selectedWallet.notes}
          </div>
        </div>
      </div>

      {connectedEdges.length > 0 && (
        <div className="pt-2 border-t border-slate-800/70 space-y-1">
          <div className="text-[11px] text-slate-400">
            Connected Relationships ({connectedEdges.length}) — click neighbor to focus
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
            {connectedEdges.map((edge) => {
              const otherId = edge.source === selectedWallet.id ? edge.target : edge.source;
              const otherNode = graph.nodes.find((n) => n.id === otherId);
              const direction = edge.source === selectedWallet.id ? 'Outgoing' : 'Incoming';
              return (
                <button
                  key={edge.id}
                  type="button"
                  onClick={() => otherNode && onSelectWallet(otherNode)}
                  className="text-left px-2.5 py-1.5 rounded border border-slate-800 bg-[#0B0E14] hover:border-sky-500/40 transition-colors flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="font-mono text-[11px] text-slate-200 flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: EDGE_RELATIONSHIP_COLORS[edge.relationship] }}
                      />
                      <span className="uppercase">{edge.relationship}</span>
                      <span className="text-slate-500">({direction})</span>
                      {otherNode && (
                        <span className="text-sky-300 truncate">
                          {otherNode.classification} {otherNode.short_address}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">{edge.evidence}</div>
                  </div>
                  <span className="font-mono text-[10px] text-slate-300 tabular-nums shrink-0">
                    {Math.round(edge.confidence * 100)}%
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
