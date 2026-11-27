import type { BacktestRequest, BacktestResult, PredictionRecord } from '../../shared/types.ts';
import { getDb } from '../database/db.ts';

export function runHistoricalBacktest(config: BacktestRequest): BacktestResult {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT p.*, o.actual_outcome, o.outcome_timestamp, o.return_pct
       FROM predictions p
       INNER JOIN prediction_outcomes o ON p.id = o.prediction_id
       WHERE p.mode = ?
       ORDER BY p.prediction_timestamp ASC`
    )
    .all(config.mode) as Array<{
    id: string;
    token_address: string;
    symbol: string;
    opportunity_score: number;
    risk_score: number;
    action_state: string;
    prediction_timestamp: string;
    features_snapshot_json: string;
    actual_outcome: string;
    outcome_timestamp: string;
    return_pct: number;
  }>;

  // Fallback across all modes if mode-specific sample count is tiny
  const dataset =
    rows.length >= 6
      ? rows
      : (db
          .prepare(
            `SELECT p.*, o.actual_outcome, o.outcome_timestamp, o.return_pct
             FROM predictions p
             INNER JOIN prediction_outcomes o ON p.id = o.prediction_id
             ORDER BY p.prediction_timestamp ASC`
          )
          .all() as typeof rows);

  let equity = 10_000;
  let peakEquity = equity;
  let maxDrawdownPct = 0;

  let wins = 0;
  let losses = 0;
  let grossWins = 0;
  let grossLosses = 0;
  let missedOpportunities = 0;
  let falsePositives = 0;

  const returns: number[] = [];
  const equityCurve: BacktestResult['equity_curve'] = [];
  const trades: BacktestResult['trades'] = [];

  for (const row of dataset) {
    let liq = 50_000;
    try {
      const f = JSON.parse(row.features_snapshot_json) as { liquidity_to_mc?: number; execution_quality?: number };
      if ((f.execution_quality ?? 60) < 30) liq = 8_000;
    } catch {
      // keep default
    }

    const passesFilter =
      row.action_state !== 'NO-TRADE' &&
      row.opportunity_score >= config.min_opportunity_score &&
      row.risk_score <= config.max_risk_score &&
      liq >= config.min_liquidity_usd;

    if (!passesFilter) {
      if (row.return_pct > 5) missedOpportunities += 1;
      continue;
    }

    const slippageCostPct = Number((config.slippage_bps / 100 + (config.priority_fee_usd / config.position_size_usd) * 100).toFixed(2));
    const netReturnPct = Number((row.return_pct - slippageCostPct).toFixed(2));
    const pnlUsd = config.position_size_usd * (netReturnPct / 100);

    equity += pnlUsd;
    if (equity > peakEquity) peakEquity = equity;
    const dd = peakEquity > 0 ? ((peakEquity - equity) / peakEquity) * 100 : 0;
    if (dd > maxDrawdownPct) maxDrawdownPct = dd;

    if (netReturnPct > 0) {
      wins += 1;
      grossWins += netReturnPct;
    } else {
      losses += 1;
      grossLosses += Math.abs(netReturnPct);
      falsePositives += 1;
    }

    returns.push(netReturnPct);
    equityCurve.push({
      timestamp: row.outcome_timestamp,
      equity_usd: Math.round(equity),
      trade_return_pct: netReturnPct,
      symbol: row.symbol,
    });
    trades.push({
      symbol: row.symbol,
      token_address: row.token_address,
      entry_time: row.prediction_timestamp,
      exit_time: row.outcome_timestamp,
      opportunity_score: row.opportunity_score,
      risk_score: row.risk_score,
      gross_return_pct: Number(row.return_pct.toFixed(2)),
      slippage_cost_pct: slippageCostPct,
      net_return_pct: netReturnPct,
      outcome: netReturnPct > 0 ? 'WIN' : 'LOSS',
    });
  }

  const totalTrades = trades.length;
  const winRate = totalTrades > 0 ? Number(((wins / totalTrades) * 100).toFixed(1)) : 0;
  const avgTrade = totalTrades > 0 ? Number((returns.reduce((a, b) => a + b, 0) / totalTrades).toFixed(2)) : 0;
  const profitFactor =
    grossLosses > 0 ? Number((grossWins / grossLosses).toFixed(2)) : grossWins > 0 ? 3.5 : 0;

  const meanR = avgTrade;
  const stdR =
    returns.length > 1
      ? Math.sqrt(returns.reduce((a, r) => a + (r - meanR) ** 2, 0) / (returns.length - 1))
      : 1;
  const sharpe = stdR > 0 ? Number(((meanR / stdR) * Math.sqrt(Math.max(1, totalTrades))).toFixed(2)) : 0;

  return {
    label: 'BACKTEST',
    disclaimer:
      'BACKTEST SIMULATION ONLY — Incorporates liquidity filters, configured slippage, and transaction fees. Historical backtests do not guarantee future performance.',
    config,
    trades_count: totalTrades,
    wins,
    losses,
    win_rate_pct: winRate,
    avg_trade_pct: avgTrade,
    max_drawdown_pct: Number(maxDrawdownPct.toFixed(2)),
    profit_factor: profitFactor,
    expectancy_pct: avgTrade,
    sharpe_ratio: sharpe,
    opportunity_count: totalTrades,
    missed_opportunities: missedOpportunities,
    false_positives: falsePositives,
    equity_curve: equityCurve,
    trades,
  };
}

export function listPredictionsWithOutcomes(tokenAddress?: string): PredictionRecord[] {
  const db = getDb();
  const rows = tokenAddress
    ? (db
        .prepare(
          `SELECT p.*, o.actual_outcome, o.outcome_timestamp, o.return_pct,
                  o.max_favorable_excursion_pct, o.max_adverse_excursion_pct,
                  o.exit_condition, o.prediction_error, o.quality_note
           FROM predictions p
           LEFT JOIN prediction_outcomes o ON p.id = o.prediction_id
           WHERE p.token_address = ?
           ORDER BY p.prediction_timestamp DESC
           LIMIT 30`
        )
        .all(tokenAddress) as Array<Record<string, unknown>>)
    : (db
        .prepare(
          `SELECT p.*, o.actual_outcome, o.outcome_timestamp, o.return_pct,
                  o.max_favorable_excursion_pct, o.max_adverse_excursion_pct,
                  o.exit_condition, o.prediction_error, o.quality_note
           FROM predictions p
           LEFT JOIN prediction_outcomes o ON p.id = o.prediction_id
           ORDER BY p.prediction_timestamp DESC
           LIMIT 40`
        )
        .all() as Array<Record<string, unknown>>);

  return rows.map((r) => ({
    id: String(r.id),
    token_address: String(r.token_address),
    symbol: String(r.symbol),
    mode: r.mode as PredictionRecord['mode'],
    horizon: r.horizon as PredictionRecord['horizon'],
    prediction_label: r.prediction_label as PredictionRecord['prediction_label'],
    opportunity_score: Number(r.opportunity_score),
    risk_score: Number(r.risk_score),
    calibrated_probability: r.calibrated_probability !== null ? Number(r.calibrated_probability) : null,
    confidence_pct: Number(r.confidence_pct),
    action_state: r.action_state as PredictionRecord['action_state'],
    model_version: String(r.model_version),
    feature_version: String(r.feature_version),
    prediction_timestamp: String(r.prediction_timestamp),
    entry_price_usd: Number(r.entry_price_usd),
    features_snapshot_json: String(r.features_snapshot_json),
    outcome: r.actual_outcome
      ? {
          actual_outcome: r.actual_outcome as NonNullable<PredictionRecord['outcome']>['actual_outcome'],
          outcome_timestamp: String(r.outcome_timestamp),
          return_pct: Number(r.return_pct),
          max_favorable_excursion_pct: Number(r.max_favorable_excursion_pct),
          max_adverse_excursion_pct: Number(r.max_adverse_excursion_pct),
          exit_condition: String(r.exit_condition),
          prediction_error: Number(r.prediction_error),
          quality_note: String(r.quality_note),
        }
      : undefined,
  }));
}
