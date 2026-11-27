import type {
  HolderIntelligence,
  WalletClassification,
  WalletCluster,
  WalletEdge,
  WalletNode,
} from '../../shared/types.ts';
import type { AggregatedTokenInputs } from '../connectors/aggregator.ts';
import { seededUnit } from '../connectors/base.ts';

function fakeWalletAddress(seed: string): string {
  const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let addr = '';
  for (let i = 0; i < 44; i++) {
    addr += alphabet[Math.floor(seededUnit(seed, i + 500) * alphabet.length) % alphabet.length];
  }
  return addr;
}

export function analyzeHoldersAndWallets(agg: AggregatedTokenInputs): HolderIntelligence {
  const m = agg.primaryMarket;
  const holderCount = m.holder_count || 640;
  const top10Pct = m.top_10_pct ?? 24.0;
  const sniperPct = m.sniper_pct ?? 12.5;
  const insiderPct = m.insider_pct ?? 6.5;
  const bundlePct = m.bundle_pct ?? 9.2;
  const devPct = m.dev_pct ?? 2.4;

  const u1 = seededUnit(m.address, 601);
  const u2 = seededUnit(m.address, 602);
  const u3 = seededUnit(m.address, 603);

  const growth1h = Number(((m.buys_1h - m.sells_1h) * 0.08 + (u1 - 0.35) * 14).toFixed(1));
  const growth24h = Number((Math.max(-15, growth1h * 3.1 + 12)).toFixed(1));

  // Build deterministic, graph-connected wallet network for 2D/3D Bubble Maps & inspection
  const walletTemplates: Array<{
    classification: WalletClassification;
    supplyShare: number;
    clusterId?: string;
    fundingSource: string;
    behavior: WalletNode['behavior'];
    notes: string;
  }> = [
    {
      classification: 'LP',
      supplyShare: Number((Math.max(4, (m.liquidity_usd / Math.max(1, m.market_cap_usd)) * 50)).toFixed(2)),
      fundingSource: `${m.dex.toUpperCase()} Pool Program`,
      behavior: 'Holding',
      notes: 'Automated market maker liquidity pool reserve',
    },
    {
      classification: 'Dev/Team',
      supplyShare: devPct,
      clusterId: devPct > 3 ? 'CL-DEV-01' : undefined,
      fundingSource: 'Deployer Genesis Wallet',
      behavior: devPct > 4 ? 'Distributing' : 'Holding',
      notes: 'Deployer-linked treasury/team address',
    },
    {
      classification: 'Insider',
      supplyShare: Number((insiderPct * 0.55).toFixed(2)),
      clusterId: 'CL-INS-01',
      fundingSource: 'Shared CEX Hot-Wallet Hop #4',
      behavior: u2 > 0.5 ? 'Distributing' : 'Holding',
      notes: 'Probabilistic early funding correlation (never assumed without funding evidence)',
    },
    {
      classification: 'Insider',
      supplyShare: Number((insiderPct * 0.45).toFixed(2)),
      clusterId: 'CL-INS-01',
      fundingSource: 'Shared CEX Hot-Wallet Hop #4',
      behavior: 'Holding',
      notes: 'Secondary wallet sharing funding hop with primary early buyer',
    },
    {
      classification: 'Bundled',
      supplyShare: Number((bundlePct * 0.38).toFixed(2)),
      clusterId: 'CL-BND-02',
      fundingSource: 'Jito Bundle Relay 0xA1',
      behavior: 'Accumulating',
      notes: 'Acquired within same 2-second bundle window at launch',
    },
    {
      classification: 'Bundled',
      supplyShare: Number((bundlePct * 0.34).toFixed(2)),
      clusterId: 'CL-BND-02',
      fundingSource: 'Jito Bundle Relay 0xA1',
      behavior: 'Holding',
      notes: 'Synchronized acquisition timing with CL-BND-02 cluster',
    },
    {
      classification: 'Bundled',
      supplyShare: Number((bundlePct * 0.28).toFixed(2)),
      clusterId: 'CL-BND-02',
      fundingSource: 'Jito Bundle Relay 0xA1',
      behavior: 'Distributing',
      notes: 'Synchronized bundle participant showing partial profit-taking',
    },
    {
      classification: 'Sniper',
      supplyShare: Number((sniperPct * 0.42).toFixed(2)),
      fundingSource: 'Solana Priority Fee Bot',
      behavior: 'Distributing',
      notes: 'Block-0 sniper entry; early position does not imply insider status',
    },
    {
      classification: 'Sniper',
      supplyShare: Number((sniperPct * 0.31).toFixed(2)),
      fundingSource: 'Solana Priority Fee Bot',
      behavior: 'Holding',
      notes: 'Block-1 automated sniper entry',
    },
    {
      classification: 'Whale',
      supplyShare: Number((Math.max(1.2, top10Pct * 0.16)).toFixed(2)),
      fundingSource: 'Coinbase Prime Custody',
      behavior: 'Accumulating',
      notes: 'High-balance spot accumulator entering post-migration',
    },
    {
      classification: 'Stealth Whale',
      supplyShare: Number((Math.max(0.9, top10Pct * 0.11)).toFixed(2)),
      clusterId: 'CL-STL-03',
      fundingSource: 'Bridge Split Relay',
      behavior: 'Accumulating',
      notes: 'Large position split across linked intermediate wallets',
    },
    {
      classification: 'Bot',
      supplyShare: 0.85,
      fundingSource: 'MEV Arbitrage Desk',
      behavior: 'Holding',
      notes: 'High-frequency spread arbitrage participant',
    },
    {
      classification: 'Exchange/Known',
      supplyShare: 2.1,
      fundingSource: 'Known Aggregator Vault',
      behavior: 'Holding',
      notes: 'Router / CEX deposit custody wallet',
    },
    {
      classification: 'Burn',
      supplyShare: 0.45,
      fundingSource: '1nc1nerator11111111111111111111111111111111',
      behavior: 'Holding',
      notes: 'Irreversible burn address',
    },
    {
      classification: 'Normal',
      supplyShare: 1.15,
      fundingSource: 'Phantom Retail Wallet',
      behavior: 'Accumulating',
      notes: 'Organic spot holder with multi-day retention',
    },
    {
      classification: 'Normal',
      supplyShare: 0.92,
      fundingSource: 'Solflare Spot Wallet',
      behavior: 'Holding',
      notes: 'Independent retail holder',
    },
    {
      classification: 'Unknown',
      supplyShare: 1.04,
      fundingSource: 'Unindexed On-Chain Hop',
      behavior: 'Unknown',
      notes: 'Insufficient cross-token history to classify definitively',
    },
  ];

  const totalSupplyTokens = 1_000_000_000;
  const createdMs = m.pair_created_at_ms;
  const gmgnStatus = agg.marketFeeds[2]?.meta.data_status || 'MOCK';

  const wallets: WalletNode[] = walletTemplates.map((tpl, idx) => {
    const addr = fakeWalletAddress(`${m.address}:w:${idx}`);
    const balTokens = Math.round((tpl.supplyShare / 100) * totalSupplyTokens);
    const balUsd = Math.round((tpl.supplyShare / 100) * m.market_cap_usd);
    const delaySec =
      tpl.classification === 'Sniper'
        ? 2 + idx
        : tpl.classification === 'Bundled'
        ? 4
        : tpl.classification === 'Insider'
        ? 12 + idx * 3
        : 300 + idx * 180;
    const riskScore =
      tpl.classification === 'Insider' || tpl.classification === 'Bundled'
        ? 78
        : tpl.classification === 'Sniper'
        ? 64
        : tpl.classification === 'Dev/Team'
        ? 58
        : tpl.classification === 'Stealth Whale'
        ? 52
        : 18;

    return {
      id: `w_${idx}`,
      address: addr,
      short_address: `${addr.slice(0, 4)}...${addr.slice(-4)}`,
      balance_tokens: balTokens,
      balance_usd: balUsd,
      supply_pct: tpl.supplyShare,
      classification: tpl.classification,
      classification_confidence: tpl.classification === 'Unknown' ? 0.35 : 0.78,
      first_funding_timestamp: new Date(createdMs - 3600_000 * (idx + 1)).toISOString(),
      funding_source: tpl.fundingSource,
      first_purchase_timestamp: new Date(createdMs + delaySec * 1000).toISOString(),
      buy_count: 1 + (idx % 5),
      sell_count: tpl.behavior === 'Distributing' ? 2 + (idx % 4) : idx % 2,
      realized_pnl_usd: Math.round((u3 - 0.3) * balUsd * 0.4),
      behavior: tpl.behavior,
      risk_score: riskScore,
      cluster_id: tpl.clusterId,
      cross_token_launches: tpl.classification === 'Sniper' || tpl.classification === 'Bundled' ? 6 + idx : 1,
      notes: tpl.notes,
      data_status: gmgnStatus,
    };
  });

  // Construct relationship edges (transfer, funding, acquisition, detected_relationship)
  const edges: WalletEdge[] = [
    {
      id: 'e_1',
      source: wallets[1].id, // Dev -> Insider 1
      target: wallets[2].id,
      relationship: 'funding',
      confidence: 0.74,
      weight_usd: Math.max(1200, Math.round(wallets[2].balance_usd * 0.4)),
      timestamp: wallets[2].first_funding_timestamp,
      evidence: 'Indirect 2-hop SOL funding trace prior to pool creation',
    },
    {
      id: 'e_2',
      source: wallets[2].id, // Insider 1 <-> Insider 2
      target: wallets[3].id,
      relationship: 'detected_relationship',
      confidence: 0.81,
      weight_usd: Math.max(800, Math.round(wallets[3].balance_usd * 0.5)),
      timestamp: wallets[3].first_purchase_timestamp,
      evidence: 'Shared funding origin & correlated exit timing',
    },
    {
      id: 'e_3',
      source: wallets[4].id, // Bundle cluster
      target: wallets[5].id,
      relationship: 'acquisition',
      confidence: 0.89,
      weight_usd: Math.max(950, Math.round(wallets[5].balance_usd * 0.6)),
      timestamp: wallets[4].first_purchase_timestamp,
      evidence: 'Same-slot Jito bundle execution (<2s delta)',
    },
    {
      id: 'e_4',
      source: wallets[5].id,
      target: wallets[6].id,
      relationship: 'acquisition',
      confidence: 0.86,
      weight_usd: Math.max(700, Math.round(wallets[6].balance_usd * 0.55)),
      timestamp: wallets[6].first_purchase_timestamp,
      evidence: 'Same-slot Jito bundle execution (<2s delta)',
    },
    {
      id: 'e_5',
      source: wallets[4].id,
      target: wallets[6].id,
      relationship: 'transfer',
      confidence: 0.92,
      weight_usd: 1450,
      timestamp: new Date(createdMs + 420_000).toISOString(),
      evidence: 'Direct SPL token split transfer post-launch',
    },
    {
      id: 'e_6',
      source: wallets[9].id, // Whale -> Stealth Whale
      target: wallets[10].id,
      relationship: 'transfer',
      confidence: 0.68,
      weight_usd: Math.max(1500, Math.round(wallets[10].balance_usd * 0.35)),
      timestamp: new Date(createdMs + 1200_000).toISOString(),
      evidence: 'Intermediate bridge hop correlation (probabilistic)',
    },
    {
      id: 'e_7',
      source: wallets[0].id, // LP -> Sniper 1
      target: wallets[7].id,
      relationship: 'acquisition',
      confidence: 0.95,
      weight_usd: Math.max(500, Math.round(wallets[7].balance_usd)),
      timestamp: wallets[7].first_purchase_timestamp,
      evidence: 'Block-0 AMM swap execution against pool',
    },
    {
      id: 'e_8',
      source: wallets[0].id, // LP -> Sniper 2
      target: wallets[8].id,
      relationship: 'acquisition',
      confidence: 0.95,
      weight_usd: Math.max(400, Math.round(wallets[8].balance_usd)),
      timestamp: wallets[8].first_purchase_timestamp,
      evidence: 'Block-1 AMM swap execution against pool',
    },
  ];

  const clusters: WalletCluster[] = [
    {
      cluster_id: 'CL-BND-02',
      wallet_count: 3,
      wallet_addresses: [wallets[4].address, wallets[5].address, wallets[6].address],
      combined_supply_pct: Number((wallets[4].supply_pct + wallets[5].supply_pct + wallets[6].supply_pct).toFixed(2)),
      relationship_confidence: 0.87,
      funding_relationship: 'Jito Bundle Relay 0xA1 + intra-cluster SPL transfer',
      synchronized_window_sec: 2,
      evidence: 'Probabilistic bundle cluster identified via same-slot entry & post-launch split transfer',
    },
    {
      cluster_id: 'CL-INS-01',
      wallet_count: 2,
      wallet_addresses: [wallets[2].address, wallets[3].address],
      combined_supply_pct: Number((wallets[2].supply_pct + wallets[3].supply_pct).toFixed(2)),
      relationship_confidence: 0.76,
      funding_relationship: 'Shared CEX Hot-Wallet Hop #4',
      synchronized_window_sec: 14,
      evidence: 'Pre-launch SOL funding overlap (probabilistic linkage)',
    },
  ];

  const sniperBand: HolderIntelligence['sniper_analysis']['exposure_band'] =
    sniperPct > 25 ? 'HIGH (>25%)' : sniperPct >= 15 ? 'ELEVATED (15-25%)' : 'LOWER (<15%)';

  const insiderScore = Math.min(95, Math.round(insiderPct * 3.8 + devPct * 2.2));
  const insiderBehavior: HolderIntelligence['insider_analysis']['behavior'] =
    wallets[2].behavior === 'Distributing' ? 'Distributing' : 'Holding';

  const redFlags: HolderIntelligence['red_flags'] = [];
  if (top10Pct > 30) {
    redFlags.push({
      type: 'Concentrated Supply',
      severity: top10Pct > 45 ? 'HIGH' : 'MEDIUM',
      description: `Top 10 non-LP wallets hold ~${top10Pct.toFixed(1)}% of circulating supply`,
    });
  }
  if (bundlePct > 15) {
    redFlags.push({
      type: 'Connected Cluster',
      severity: bundlePct > 25 ? 'HIGH' : 'MEDIUM',
      description: `Bundle cluster CL-BND-02 controls ~${bundlePct.toFixed(1)}% across synchronized entries`,
    });
  }
  if (sniperPct > 20) {
    redFlags.push({
      type: 'Synchronized Behavior',
      severity: sniperPct > 28 ? 'HIGH' : 'MEDIUM',
      description: `Early sniper capture estimated at ${sniperPct.toFixed(1)}% (>15-25% elevated band)`,
    });
  }
  if (wallets[10].supply_pct > 2.5) {
    redFlags.push({
      type: 'Stealth Whale',
      severity: 'MEDIUM',
      description: 'Multi-hop bridge wallet pattern consistent with split whale accumulation',
    });
  }

  const distHealth = Math.max(
    12,
    Math.min(
      95,
      Math.round(85 - top10Pct * 0.9 - bundlePct * 0.8 - sniperPct * 0.45 + Math.min(18, holderCount / 150))
    )
  );

  return {
    holder_count: holderCount,
    holder_growth_1h_pct: growth1h,
    holder_growth_24h_pct: growth24h,
    top_10_concentration_pct: top10Pct,
    top_20_concentration_pct: Number(Math.min(92, top10Pct + 9.4).toFixed(1)),
    top_50_concentration_pct: Number(Math.min(97, top10Pct + 18.2).toFixed(1)),
    largest_wallet_pct: Math.max(...wallets.filter((w) => w.classification !== 'LP').map((w) => w.supply_pct)),
    sniper_analysis: {
      suspected_snipers: Math.max(3, Math.round(sniperPct * 0.9)),
      supply_pct: sniperPct,
      exposure_band: sniperBand,
      avg_entry_delay_sec: 3,
      exited_pct: Math.round(25 + u2 * 55),
      behavior: u2 > 0.55 ? 'Distributing' : 'Mixed',
      heuristic_note:
        'Initial heuristic (<15% lower, 15-25% elevated, >25% high). Sniper status alone does not prove insider coordination.',
    },
    insider_analysis: {
      exposure_score: insiderScore,
      suspected_wallets: 2,
      supply_pct: insiderPct,
      behavior: insiderBehavior,
      evidence: [
        'Pre-pool SOL funding hop correlation from shared origin',
        'Synchronized entry within 15 seconds of liquidity initialization',
      ],
    },
    bundle_analysis: {
      cluster_count: clusters.length,
      combined_supply_pct: bundlePct,
      clusters,
    },
    red_flags: redFlags,
    wallets,
    edges,
    distribution_health_score: distHealth,
    data_status: gmgnStatus,
  };
}
