import type { HolderIntelligence, WalletEdge, WalletNode } from '../../shared/types.ts';

export interface BubbleMapNode extends WalletNode {
  x2d: number;
  y2d: number;
  x3d: number;
  y3d: number;
  z3d: number;
  radius: number;
  radius_usd: number;
  color: string;
}

export interface BubbleMapPayload {
  nodes: BubbleMapNode[];
  edges: WalletEdge[];
  clusters: HolderIntelligence['bundle_analysis']['clusters'];
}

export const WALLET_CLASSIFICATION_COLORS: Record<WalletNode['classification'], string> = {
  LP: '#38BDF8',
  'Dev/Team': '#A855F7',
  Insider: '#F43F5E',
  Bundled: '#F97316',
  Sniper: '#F59E0B',
  Whale: '#10B981',
  'Stealth Whale': '#14B8A6',
  Bot: '#6366F1',
  'Exchange/Known': '#64748B',
  Burn: '#475569',
  Normal: '#22C55E',
  Unknown: '#94A3B8',
};

export const EDGE_RELATIONSHIP_COLORS: Record<WalletEdge['relationship'], string> = {
  funding: '#F43F5E',
  transfer: '#F59E0B',
  acquisition: '#38BDF8',
  detected_relationship: '#A855F7',
};

export function walletColorByClassification(classification: WalletNode['classification']): string {
  return WALLET_CLASSIFICATION_COLORS[classification] ?? '#94A3B8';
}

export function buildBubbleMapPayload(holders: HolderIntelligence): BubbleMapPayload {
  const wallets = holders.wallets || [];
  const maxUsd = Math.max(1, ...wallets.map((w) => Math.max(0, w.balance_usd || 0)));

  // Group non-LP wallets by cluster_id so cluster members stay visually grouped in 2D and 3D
  const clusterGroups = new Map<string, WalletNode[]>();
  const standaloneWallets: WalletNode[] = [];

  for (const w of wallets) {
    if (w.classification === 'LP') continue;
    if (w.cluster_id) {
      const arr = clusterGroups.get(w.cluster_id) || [];
      arr.push(w);
      clusterGroups.set(w.cluster_id, arr);
    } else {
      standaloneWallets.push(w);
    }
  }

  const clusterIds = Array.from(clusterGroups.keys());
  const posMap = new Map<string, { x2d: number; y2d: number; x3d: number; y3d: number; z3d: number }>();

  // Place LP at origin
  for (const w of wallets) {
    if (w.classification === 'LP') {
      posMap.set(w.id, { x2d: 0, y2d: 0, x3d: 0, y3d: 0, z3d: 0 });
    }
  }

  // Place each cluster in a dedicated inner sector (2D) & directional lobe (3D)
  clusterIds.forEach((cid, cIdx) => {
    const members = clusterGroups.get(cid) || [];
    const sectorAngle = (cIdx / Math.max(1, clusterIds.length)) * Math.PI * 2 + 0.35;
    const anchor2dX = Math.cos(sectorAngle) * 145;
    const anchor2dY = Math.sin(sectorAngle) * 145;

    const phi = Math.acos(1 - (2 * (cIdx + 0.5)) / Math.max(1, clusterIds.length));
    const theta = Math.PI * (1 + Math.sqrt(5)) * cIdx;
    const anchor3dX = 6.8 * Math.sin(phi) * Math.cos(theta);
    const anchor3dY = 5.4 * Math.cos(phi);
    const anchor3dZ = 6.8 * Math.sin(phi) * Math.sin(theta);

    members.forEach((m, mIdx) => {
      const localAngle = (mIdx / Math.max(1, members.length)) * Math.PI * 2;
      const spread2d = members.length === 1 ? 0 : 48;
      const spread3d = members.length === 1 ? 0 : 2.3;

      posMap.set(m.id, {
        x2d: Math.round(anchor2dX + Math.cos(localAngle) * spread2d),
        y2d: Math.round(anchor2dY + Math.sin(localAngle) * spread2d),
        x3d: Number((anchor3dX + Math.cos(localAngle) * spread3d).toFixed(2)),
        y3d: Number((anchor3dY + Math.sin(localAngle * 0.8) * (spread3d * 0.7)).toFixed(2)),
        z3d: Number((anchor3dZ + Math.sin(localAngle) * spread3d).toFixed(2)),
      });
    });
  });

  // Place standalone wallets cleanly on the outer ring / outer sphere
  const standaloneCount = standaloneWallets.length;
  standaloneWallets.forEach((w, idx) => {
    const angle = (idx / Math.max(1, standaloneCount)) * Math.PI * 2;
    const ringRadius = w.classification === 'Sniper' ? 205 : 255;
    const x2d = Math.round(Math.cos(angle) * ringRadius);
    const y2d = Math.round(Math.sin(angle) * ringRadius);

    const phi = Math.acos(1 - (2 * (idx + 0.5)) / Math.max(1, standaloneCount));
    const theta = Math.PI * (1 + Math.sqrt(5)) * (idx + 3);
    const r3 = w.classification === 'Sniper' ? 9.2 : 11.4;
    const x3d = Number((r3 * Math.sin(phi) * Math.cos(theta)).toFixed(2));
    const y3d = Number((r3 * Math.cos(phi)).toFixed(2));
    const z3d = Number((r3 * Math.sin(phi) * Math.sin(theta)).toFixed(2));

    posMap.set(w.id, { x2d, y2d, x3d, y3d, z3d });
  });

  const nodes: BubbleMapNode[] = wallets.map((w) => {
    const pos = posMap.get(w.id) || { x2d: 0, y2d: 0, x3d: 0, y3d: 0, z3d: 0 };
    const safeSupply = Number.isFinite(w.supply_pct) ? Math.max(0.2, w.supply_pct) : 0.2;
    const safeUsd = Number.isFinite(w.balance_usd) ? Math.max(0, w.balance_usd) : 0;

    const radius = Number(Math.max(0.55, Math.min(2.4, 0.48 + Math.sqrt(safeSupply) * 0.45)).toFixed(2));
    const usdRatio = Math.sqrt(safeUsd / maxUsd);
    const radius_usd = Number(Math.max(0.55, Math.min(2.4, 0.55 + usdRatio * 1.75)).toFixed(2));

    return {
      ...w,
      x2d: pos.x2d,
      y2d: pos.y2d,
      x3d: pos.x3d,
      y3d: pos.y3d,
      z3d: pos.z3d,
      radius,
      radius_usd,
      color: walletColorByClassification(w.classification),
    };
  });

  return {
    nodes,
    edges: holders.edges || [],
    clusters: holders.bundle_analysis?.clusters || [],
  };
}
