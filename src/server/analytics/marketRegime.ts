import type { MarketRegimeState, MarketRegimeType } from '../../shared/types.ts';
import type { NormalizedMarketPayload } from '../connectors/base.ts';

export function detectMarketRegime(universe: NormalizedMarketPayload[]): MarketRegimeState {
  if (universe.length === 0) {
    return {
      regime: 'Transition/Uncertain',
      confidence: 0.4,
      sol_24h_change_pct: 0,
      sol_volatility_pct: 4.5,
      meme_sector_momentum: 50,
      market_breadth_pct: 50,
      risk_appetite_score: 50,
      explanation: 'Insufficient market-wide tokens to classify regime with high confidence.',
      data_status: 'UNAVAILABLE',
    };
  }

  const advancers = universe.filter((t) => t.price_change_1h > 0).length;
  const breadthPct = Math.round((advancers / universe.length) * 100);
  const avg24h = universe.reduce((a, t) => a + t.price_change_24h, 0) / universe.length;
  const avg1h = universe.reduce((a, t) => a + t.price_change_1h, 0) / universe.length;
  const avgAbsVol =
    universe.reduce((a, t) => a + Math.abs(t.price_change_1h), 0) / universe.length;
  const avgLiq = universe.reduce((a, t) => a + t.liquidity_usd, 0) / universe.length;

  const memeMomentum = Math.max(10, Math.min(96, Math.round(50 + avg1h * 2.2 + (breadthPct - 50) * 0.4)));
  const riskAppetite = Math.max(10, Math.min(95, Math.round(45 + avg24h * 0.8 + (breadthPct - 50) * 0.5)));

  let regime: MarketRegimeType = 'Transition/Uncertain';
  if (avgAbsVol > 9.5) {
    regime = 'High Volatility';
  } else if (avgLiq < 25_000) {
    regime = 'Low Liquidity';
  } else if (memeMomentum >= 68 && breadthPct >= 60) {
    regime = 'Strong Meme Cycle';
  } else if (memeMomentum <= 36 && breadthPct <= 40) {
    regime = 'Weak Meme Cycle';
  } else if (riskAppetite >= 60) {
    regime = 'Risk-On';
  } else if (riskAppetite <= 38) {
    regime = 'Risk-Off';
  }

  const anyReal = universe.some((t) => t.meta.data_status === 'REAL');

  return {
    regime,
    confidence: anyReal ? 0.81 : 0.55,
    sol_24h_change_pct: Number((avg24h * 0.25).toFixed(2)),
    sol_volatility_pct: Number((avgAbsVol * 1.15).toFixed(2)),
    meme_sector_momentum: memeMomentum,
    market_breadth_pct: breadthPct,
    risk_appetite_score: riskAppetite,
    explanation: `Breadth ${breadthPct}% positive 1H across ${universe.length} tracked Solana tokens; average 1H dispersion ${avgAbsVol.toFixed(
      1
    )}%.`,
    data_status: anyReal ? 'DERIVED' : 'MOCK',
  };
}
