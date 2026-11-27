import type {
  HolderIntelligence,
  LiquidityIntelligence,
  ReasonItem,
  RiskEngineResult,
  SocialIntelligence,
  TokenForensics,
  VolumeIntelligence,
} from '../../shared/types.ts';

export function evaluateRiskEngine(params: {
  forensics: TokenForensics;
  liquidity: LiquidityIntelligence;
  volume: VolumeIntelligence;
  holders: HolderIntelligence;
  social: SocialIntelligence;
}): RiskEngineResult {
  const { forensics, liquidity, volume, holders, social } = params;

  const liquidityRisk = liquidity.liquidity_risk_score;

  const holderRisk = Math.min(
    98,
    Math.max(
      8,
      Math.round(
        holders.top_10_concentration_pct * 1.15 +
          holders.sniper_analysis.supply_pct * 0.65 +
          holders.bundle_analysis.combined_supply_pct * 0.9
      )
    )
  );

  const devHoldings = holders.wallets.find((w) => w.classification === 'Dev/Team')?.supply_pct || 0;
  const devRisk = Math.min(
    98,
    Math.max(
      5,
      Math.round(devHoldings * 5.2 + holders.insider_analysis.exposure_score * 0.52)
    )
  );

  let contractRisk = 15;
  const honeypotFlags: string[] = [];
  if (forensics.contract_attributes.mint_authority_revoked === false) {
    contractRisk += 35;
    honeypotFlags.push('Mint authority active (supply inflation possible)');
  }
  if (forensics.contract_attributes.freeze_authority_revoked === false) {
    contractRisk += 30;
    honeypotFlags.push('Freeze authority active (wallet transfers can be frozen)');
  }
  if (forensics.contract_attributes.sell_restriction_detected) {
    contractRisk += 40;
    honeypotFlags.push('Zero sells vs active buys — possible honeypot sell restriction');
  }
  if ((forensics.contract_attributes.transfer_fee_bps || 0) > 100) {
    contractRisk += 18;
    honeypotFlags.push(`Transfer tax detected (${forensics.contract_attributes.transfer_fee_bps} bps)`);
  }
  contractRisk = Math.min(98, contractRisk);

  const botVolumeRisk = Math.min(96, volume.anomalies.bot_activity_score);
  const socialRisk = social.social_risk_score;

  const overallRisk = Math.min(
    99,
    Math.max(
      12,
      Math.round(
        liquidityRisk * 0.25 +
          holderRisk * 0.22 +
          devRisk * 0.16 +
          contractRisk * 0.16 +
          botVolumeRisk * 0.12 +
          socialRisk * 0.09
      )
    )
  );

  const rugIndicators: string[] = [];
  if (liquidity.lp_status === 'UNLOCKED' || liquidity.lp_status === 'PARTIAL') {
    rugIndicators.push(`Liquidity Rug Risk: LP status ${liquidity.lp_status}`);
  }
  if (holders.top_10_concentration_pct > 30 || holders.bundle_analysis.combined_supply_pct > 18) {
    rugIndicators.push('Token Dump Rug Risk: Concentrated top-10 or bundled cluster supply');
  }
  if (honeypotFlags.length > 0) {
    rugIndicators.push(`Contract Rug Risk: ${honeypotFlags[0]}`);
  }

  const reasons: ReasonItem[] = [
    {
      direction: liquidityRisk > 55 ? '-' : '+',
      category: 'Liquidity Risk',
      text: `Liquidity Risk ${liquidityRisk}/100 (LP ${liquidity.lp_status}, depth $${Math.round(
        liquidity.current_liquidity_usd
      ).toLocaleString()})`,
    },
    {
      direction: holderRisk > 55 ? '-' : '+',
      category: 'Holder Risk',
      text: `Holder Risk ${holderRisk}/100 (Top 10: ${holders.top_10_concentration_pct.toFixed(
        1
      )}%, Bundles: ${holders.bundle_analysis.combined_supply_pct.toFixed(1)}%)`,
    },
    {
      direction: devRisk > 50 ? '-' : '+',
      category: 'Dev & Insider Risk',
      text: `Dev Risk ${devRisk}/100 (Insider score ${holders.insider_analysis.exposure_score}/100, Dev ${devHoldings.toFixed(
        1
      )}%)`,
    },
    {
      direction: contractRisk > 40 ? '-' : '+',
      category: 'Contract Risk',
      text: `Contract Risk ${contractRisk}/100 (${
        honeypotFlags.length > 0 ? honeypotFlags.join('; ') : 'No active mint/freeze/honeypot flags detected'
      })`,
    },
  ];

  return {
    liquidity_risk: liquidityRisk,
    holder_risk: holderRisk,
    dev_risk: devRisk,
    contract_risk: contractRisk,
    bot_volume_risk: botVolumeRisk,
    social_risk: socialRisk,
    overall_risk: overallRisk,
    honeypot_flags: honeypotFlags,
    rug_indicators: rugIndicators,
    reasons,
    safety_disclaimer:
      'Risk scores are probabilistic estimates, never guarantees. Brigg never declares any token "100% safe" or "cannot rug".',
  };
}
