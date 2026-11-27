import React, { useEffect, useMemo, useRef, useState } from 'react';
import cytoscape, { type Core } from 'cytoscape';
import { Expand, Eye, EyeOff, LocateFixed, Search, ZoomIn, ZoomOut } from 'lucide-react';
import {
  EDGE_RELATIONSHIP_COLORS,
  WALLET_CLASSIFICATION_COLORS,
  type BubbleMapNode,
  type BubbleMapPayload,
} from '../server/graph/bubbleMapBuilder';
import type { WalletEdge } from '../shared/types';
import { BubbleLegend, WalletInspectorCard } from './WalletInspectorCard';

interface BubbleMap2DProps {
  graph: BubbleMapPayload;
  selectedWallet: BubbleMapNode | null;
  onSelectWallet: (w: BubbleMapNode | null) => void;
  heightClassName?: string;
}

const ALL_ROLES = ['ALL', ...Object.keys(WALLET_CLASSIFICATION_COLORS)] as const;
const RELATIONSHIP_FILTERS: Array<'ALL' | WalletEdge['relationship']> = [
  'ALL',
  'funding',
  'transfer',
  'acquisition',
  'detected_relationship',
];

export const BubbleMap2D: React.FC<BubbleMap2DProps> = ({
  graph,
  selectedWallet,
  onSelectWallet,
  heightClassName = 'h-[400px]',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cyRef = useRef<Core | null>(null);

  const onSelectWalletRef = useRef(onSelectWallet);
  onSelectWalletRef.current = onSelectWallet;

  const nodesRef = useRef(graph.nodes);
  nodesRef.current = graph.nodes;

  const edgesRef = useRef(graph.edges);
  edgesRef.current = graph.edges;

  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [relationshipFilter, setRelationshipFilter] = useState<'ALL' | WalletEdge['relationship']>('ALL');
  const [sizeMetric, setSizeMetric] = useState<'supply' | 'usd'>('supply');
  const [layoutMode, setLayoutMode] = useState<'preset' | 'cose'>('preset');
  const [searchTerm, setSearchTerm] = useState('');
  const [showEdges, setShowEdges] = useState(true);
  const [expandedCluster, setExpandedCluster] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<WalletEdge | null>(null);

  const filteredNodes = useMemo(() => {
    return graph.nodes.filter((n) => {
      if (roleFilter !== 'ALL' && n.classification !== roleFilter) return false;
      if (expandedCluster && n.cluster_id !== expandedCluster && n.classification !== 'LP') return false;
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        return (
          n.address.toLowerCase().includes(q) ||
          n.short_address.toLowerCase().includes(q) ||
          n.classification.toLowerCase().includes(q) ||
          (n.cluster_id || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [graph.nodes, roleFilter, expandedCluster, searchTerm]);

  const filteredEdges = useMemo(() => {
    if (!showEdges) return [];
    const visibleIds = new Set(filteredNodes.map((n) => n.id));
    return graph.edges.filter((e) => {
      if (!visibleIds.has(e.source) || !visibleIds.has(e.target)) return false;
      if (relationshipFilter !== 'ALL' && e.relationship !== relationshipFilter) return false;
      return true;
    });
  }, [graph.edges, filteredNodes, showEdges, relationshipFilter]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const elements = [
      ...filteredNodes.map((n) => {
        const radiusVal = sizeMetric === 'usd' ? n.radius_usd : n.radius;
        const sizePx = Math.max(24, Math.min(76, Math.round(radiusVal * 26)));
        return {
          data: {
            id: n.id,
            label: `${n.classification}\n${n.supply_pct.toFixed(1)}%`,
            color: n.color,
            size: sizePx,
            clusterRing: n.cluster_id ? '#F59E0B' : '#0B0E14',
            borderWidth: n.cluster_id ? 2.5 : 2,
          },
          position: { x: n.x2d * 1.45, y: n.y2d * 1.45 },
        };
      }),
      ...filteredEdges.map((e) => ({
        data: {
          id: e.id,
          source: e.source,
          target: e.target,
          label: e.relationship === 'detected_relationship' ? 'linked' : e.relationship,
          lineColor: EDGE_RELATIONSHIP_COLORS[e.relationship] || '#A855F7',
        },
      })),
    ];

    const cy = cytoscape({
      container: el,
      elements,
      minZoom: 0.25,
      maxZoom: 3.5,
      wheelSensitivity: 0.2,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': 'data(color)',
            'border-width': 'data(borderWidth)',
            'border-color': 'data(clusterRing)',
            label: 'data(label)',
            color: '#E2E8F0',
            'font-size': 9,
            'font-family': 'JetBrains Mono, monospace',
            'text-valign': 'bottom',
            'text-margin-y': 5,
            'text-wrap': 'wrap',
            'text-background-color': '#0B0E14',
            'text-background-opacity': 0.72,
            'text-background-padding': '2px',
            width: 'data(size)',
            height: 'data(size)',
          },
        },
        {
          selector: 'node:selected',
          style: {
            'border-width': 4,
            'border-color': '#F8FAFC',
            'overlay-color': '#38BDF8',
            'overlay-opacity': 0.18,
          },
        },
        {
          selector: 'edge',
          style: {
            width: 1.75,
            'line-color': 'data(lineColor)',
            'target-arrow-color': 'data(lineColor)',
            'target-arrow-shape': 'triangle',
            'arrow-scale': 0.85,
            'curve-style': 'bezier',
            opacity: 0.78,
            label: 'data(label)',
            'font-size': 8,
            'font-family': 'JetBrains Mono, monospace',
            color: '#CBD5E1',
            'text-rotation': 'autorotate',
            'text-background-color': '#0B0E14',
            'text-background-opacity': 0.75,
            'text-background-padding': '1px',
          },
        },
        {
          selector: 'edge:selected',
          style: {
            width: 3,
            opacity: 1,
          },
        },
      ],
      layout:
        layoutMode === 'cose'
          ? {
              name: 'cose',
              animate: false,
              randomize: false,
              padding: 32,
              nodeRepulsion: () => 5200,
              idealEdgeLength: () => 95,
            }
          : {
              name: 'preset',
              fit: true,
              padding: 32,
            },
    });

    cy.on('tap', 'node', (evt) => {
      const id = evt.target.id();
      const found = nodesRef.current.find((n) => n.id === id) || null;
      setSelectedEdge(null);
      onSelectWalletRef.current(found);
    });

    cy.on('tap', 'edge', (evt) => {
      const id = evt.target.id();
      const edge = edgesRef.current.find((e) => e.id === id) || null;
      onSelectWalletRef.current(null);
      setSelectedEdge(edge);
    });

    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        setSelectedEdge(null);
        onSelectWalletRef.current(null);
      }
    });

    cyRef.current = cy;

    const rafId = requestAnimationFrame(() => {
      cy.resize();
      cy.fit(undefined, 28);
    });

    const resizeObs = new ResizeObserver(() => {
      if (!cyRef.current) return;
      cyRef.current.resize();
      cyRef.current.fit(undefined, 28);
    });
    resizeObs.observe(el);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObs.disconnect();
      cy.destroy();
      cyRef.current = null;
    };
  }, [filteredNodes, filteredEdges, sizeMetric, layoutMode]);

  // Sync external selectedWallet changes into Cytoscape selection
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.elements(':selected').unselect();
    if (selectedWallet) {
      const node = cy.getElementById(selectedWallet.id);
      if (node && node.length > 0) {
        node.select();
      }
    }
  }, [selectedWallet, filteredNodes]);

  const handleZoom = (factor: number) => {
    const cy = cyRef.current;
    if (!cy) return;
    const nextZoom = Math.max(0.25, Math.min(3.5, cy.zoom() * factor));
    cy.zoom({
      level: nextZoom,
      renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 },
    });
  };

  return (
    <div className="space-y-2.5">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search wallet or cluster..."
              className="bg-[#0C0E14] border border-[#1E2330] rounded pl-7 pr-2 py-1 text-xs text-slate-200 font-mono w-44 focus:outline-none focus:border-sky-500"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-[#0C0E14] border border-[#1E2330] rounded px-2 py-1 text-xs text-slate-200"
            aria-label="Filter by wallet classification"
          >
            {ALL_ROLES.map((r) => (
              <option key={r} value={r}>
                {r === 'ALL' ? 'All Roles' : r}
              </option>
            ))}
          </select>

          <select
            value={relationshipFilter}
            onChange={(e) => setRelationshipFilter(e.target.value as 'ALL' | WalletEdge['relationship'])}
            className="bg-[#0C0E14] border border-[#1E2330] rounded px-2 py-1 text-xs text-slate-200"
            aria-label="Filter by relationship type"
          >
            {RELATIONSHIP_FILTERS.map((rel) => (
              <option key={rel} value={rel}>
                {rel === 'ALL' ? 'All Links' : rel}
              </option>
            ))}
          </select>

          <select
            value={expandedCluster || ''}
            onChange={(e) => setExpandedCluster(e.target.value || null)}
            className="bg-[#0C0E14] border border-[#1E2330] rounded px-2 py-1 text-xs text-slate-200 font-mono"
            aria-label="Expand wallet cluster"
          >
            <option value="">All Clusters ({graph.clusters.length})</option>
            {graph.clusters.map((c) => (
              <option key={c.cluster_id} value={c.cluster_id}>
                Cluster {c.cluster_id} ({c.wallet_count}w · {c.combined_supply_pct}%)
              </option>
            ))}
          </select>

          <select
            value={sizeMetric}
            onChange={(e) => setSizeMetric(e.target.value as 'supply' | 'usd')}
            className="bg-[#0C0E14] border border-[#1E2330] rounded px-2 py-1 text-xs text-slate-200"
            aria-label="Bubble size metric"
          >
            <option value="supply">Size: Supply %</option>
            <option value="usd">Size: USD Value</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setLayoutMode((m) => (m === 'preset' ? 'cose' : 'preset'))}
            className="px-2.5 py-1 text-xs border border-[#1E2330] bg-[#0C0E14] hover:bg-slate-800 text-slate-300 rounded whitespace-nowrap shrink-0"
          >
            {layoutMode === 'preset' ? 'Cluster Map' : 'Force Layout'}
          </button>

          <button
            type="button"
            onClick={() => setShowEdges((v) => !v)}
            className="px-2.5 py-1 text-xs border border-[#1E2330] bg-[#0C0E14] hover:bg-slate-800 text-slate-300 rounded inline-flex items-center gap-1 whitespace-nowrap shrink-0"
          >
            {showEdges ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            {showEdges ? 'Hide Links' : 'Show Links'}
          </button>

          <button
            type="button"
            onClick={() => handleZoom(1.25)}
            className="p-1.5 border border-[#1E2330] bg-[#0C0E14] hover:bg-slate-800 text-slate-300 rounded shrink-0"
            title="Zoom in"
            aria-label="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => handleZoom(0.8)}
            className="p-1.5 border border-[#1E2330] bg-[#0C0E14] hover:bg-slate-800 text-slate-300 rounded shrink-0"
            title="Zoom out"
            aria-label="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => cyRef.current?.fit(undefined, 28)}
            className="px-2.5 py-1 text-xs border border-[#1E2330] bg-[#0C0E14] hover:bg-slate-800 text-slate-300 rounded inline-flex items-center gap-1 whitespace-nowrap shrink-0"
          >
            <LocateFixed className="w-3.5 h-3.5" />
            Fit
          </button>

          {expandedCluster && (
            <button
              type="button"
              onClick={() => setExpandedCluster(null)}
              className="px-2.5 py-1 text-xs border border-sky-500/40 bg-sky-500/10 text-sky-300 rounded inline-flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              <Expand className="w-3.5 h-3.5" />
              All Clusters
            </button>
          )}
        </div>
      </div>

      {/* Cytoscape 2D Viewport */}
      <div className={`relative ${heightClassName} w-full rounded border border-[#1E2330] bg-[#08090D] overflow-hidden`}>
        <div ref={containerRef} className="w-full h-full" />
        {filteredNodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400 pointer-events-none">
            No wallets match the active filters.
          </div>
        )}
        <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-[#111622]/95 border border-slate-800 text-[10px] font-mono text-slate-300 pointer-events-none tabular-nums">
          2D Cytoscape · {filteredNodes.length} wallets · {filteredEdges.length} links · Click bubble or link to inspect
        </div>
      </div>

      <BubbleLegend
        visibleNodes={graph.nodes}
        activeRole={roleFilter}
        onSelectRole={setRoleFilter}
      />

      <WalletInspectorCard
        graph={graph}
        selectedWallet={selectedWallet}
        selectedEdge={selectedEdge}
        onSelectWallet={onSelectWallet}
        onClearEdge={() => setSelectedEdge(null)}
      />
    </div>
  );
};
