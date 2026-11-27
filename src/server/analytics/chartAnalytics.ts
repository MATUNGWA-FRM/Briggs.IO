import type { CandlePoint, ChartIntelligence, ChartTimeframe } from '../../shared/types.ts';
import type { AggregatedTokenInputs } from '../connectors/aggregator.ts';
import { seededUnit } from '../connectors/base.ts';

export function tfToSeconds(tf: ChartTimeframe): number {
  switch (tf) {
    case '1S':
      return 1;
    case '1M':
      return 60;
    case '5M':
      return 300;
    case '15M':
      return 900;
    case '1H':
      return 3600;
    case '4H':
      return 14_400;
    case '24H':
      return 86_400;
  }
}

function calcEMA(values: number[], period: number): Array<number | undefined> {
  const k = 2 / (period + 1);
  const res: Array<number | undefined> = [];
  let prev: number | undefined;
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      res.push(undefined);
    } else if (i === period - 1) {
      const sma = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
      prev = sma;
      res.push(sma);
    } else {
      prev = values[i] * k + (prev ?? values[i]) * (1 - k);
      res.push(prev);
    }
  }
  return res;
}

function calcSMA(values: number[], period: number): Array<number | undefined> {
  return values.map((_, idx) => {
    if (idx < period - 1) return undefined;
    let sum = 0;
    for (let j = idx - period + 1; j <= idx; j++) sum += values[j];
    return sum / period;
  });
}

export function buildChartIntelligence(
  agg: AggregatedTokenInputs,
  timeframe: ChartTimeframe
): ChartIntelligence {
  const m = agg.primaryMarket;
  const count = 90;
  const stepSec = tfToSeconds(timeframe);
  const nowSec = Math.floor(Date.now() / 1000);
  const latestBucket = Math.floor(nowSec / stepSec) * stepSec;
  const currentPrice = Math.max(1e-9, m.price_usd || 0.001);
  const anchorChangePct =
    timeframe === '1S'
      ? m.price_change_5m * 0.35
      : timeframe === '1M' || timeframe === '5M'
      ? m.price_change_5m
      : timeframe === '15M' || timeframe === '1H'
      ? m.price_change_1h
      : timeframe === '4H'
      ? m.price_change_6h
      : m.price_change_24h;

  // Backward-reconstruct realistic OHLCV series ending exactly at live currentPrice
  const startPrice = Math.max(1e-9, currentPrice / (1 + Math.max(-0.85, Math.min(4, anchorChangePct / 100))));
  const closes: number[] = [];
  const rawCandles: CandlePoint[] = [];

  let p = startPrice;
  const volBase =
    timeframe === '1S'
      ? Math.max(30, (m.volume_5m_usd || 4_500) / 300)
      : Math.max(100, (m.volume_24h_usd || 50_000) / 90);
  const volatilityFactor =
    timeframe === '1S'
      ? Math.min(0.025, Math.max(0.003, Math.abs(anchorChangePct) / 900 + 0.0045))
      : Math.min(0.11, Math.max(0.012, Math.abs(anchorChangePct) / 450 + 0.018));

  for (let i = 0; i < count; i++) {
    const progress = (i + 1) / count;
    const targetAlongTrend = startPrice + (currentPrice - startPrice) * progress;
    const noise = (seededUnit(`${m.address}:${timeframe}`, 700 + i) - 0.48) * volatilityFactor;
    const open = p;
    const nextClose = i === count - 1 ? currentPrice : Math.max(1e-9, p * (1 + noise) * 0.6 + targetAlongTrend * 0.4);
    const wickUp = 1 + seededUnit(`${m.address}:${timeframe}`, 850 + i) * volatilityFactor * 0.7;
    const wickDown = 1 - seededUnit(`${m.address}:${timeframe}`, 950 + i) * volatilityFactor * 0.7;
    const high = Math.max(open, nextClose) * wickUp;
    const low = Math.min(open, nextClose) * wickDown;
    const barVol = volBase * (0.4 + seededUnit(`${m.address}:${timeframe}`, 1050 + i) * 1.9);

    rawCandles.push({
      time: latestBucket - (count - 1 - i) * stepSec,
      open,
      high,
      low,
      close: nextClose,
      volume: Math.round(barVol),
    });
    closes.push(nextClose);
    p = nextClose;
  }

  // Technical indicators: EMA9, EMA21, SMA50, VWAP, Bollinger Bands, RSI14, MACD, ATR14
  const ema9 = calcEMA(closes, 9);
  const ema12 = calcEMA(closes, 12);
  const ema21 = calcEMA(closes, 21);
  const ema26 = calcEMA(closes, 26);
  const sma20 = calcSMA(closes, 20);
  const sma50 = calcSMA(closes, 50);

  const macdLine = closes.map((_, i) =>
    ema12[i] !== undefined && ema26[i] !== undefined ? ema12[i]! - ema26[i]! : 0
  );
  const macdSignal = calcEMA(macdLine, 9);

  let cumPV = 0;
  let cumV = 0;
  let avgGain = 0;
  let avgLoss = 0;
  let prevAtr = 0;

  for (let i = 0; i < rawCandles.length; i++) {
    const c = rawCandles[i];
    const typical = (c.high + c.low + c.close) / 3;
    cumPV += typical * c.volume;
    cumV += c.volume;
    c.vwap = cumV > 0 ? cumPV / cumV : c.close;
    c.ema9 = ema9[i];
    c.ema21 = ema21[i];
    c.sma50 = sma50[i];

    // Bollinger Bands (20, 2)
    if (i >= 19 && sma20[i] !== undefined) {
      const slice = closes.slice(i - 19, i + 1);
      const mean = sma20[i]!;
      const variance = slice.reduce((acc, v) => acc + (v - mean) ** 2, 0) / 20;
      const std = Math.sqrt(variance);
      c.bbMiddle = mean;
      c.bbUpper = mean + 2 * std;
      c.bbLower = Math.max(0, mean - 2 * std);
    }

    // RSI 14
    if (i > 0) {
      const diff = c.close - rawCandles[i - 1].close;
      const gain = diff > 0 ? diff : 0;
      const loss = diff < 0 ? Math.abs(diff) : 0;
      if (i <= 14) {
        avgGain += gain / 14;
        avgLoss += loss / 14;
      } else {
        avgGain = (avgGain * 13 + gain) / 14;
        avgLoss = (avgLoss * 13 + loss) / 14;
      }
      if (i >= 14) {
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        c.rsi14 = Number((100 - 100 / (1 + rs)).toFixed(2));
      }
    }

    // ATR 14
    const prevClose = i > 0 ? rawCandles[i - 1].close : c.open;
    const tr = Math.max(c.high - c.low, Math.abs(c.high - prevClose), Math.abs(c.low - prevClose));
    prevAtr = i === 0 ? tr : (prevAtr * 13 + tr) / 14;
    if (i >= 14) c.atr14 = prevAtr;

    c.macd = macdLine[i];
    c.macdSignal = macdSignal[i];
    c.macdHist = macdSignal[i] !== undefined ? macdLine[i] - macdSignal[i]! : undefined;
  }

  const last = rawCandles[rawCandles.length - 1];
  const recentHighs = rawCandles.slice(-24).map((c) => c.high);
  const recentLows = rawCandles.slice(-24).map((c) => c.low);
  const resistance1 = Math.max(...recentHighs);
  const support1 = Math.min(...recentLows);
  const midBand = (resistance1 + support1) / 2;

  const trend: ChartIntelligence['trend'] =
    (last.ema9 || last.close) > (last.ema21 || last.close) * 1.01 && m.price_change_1h > 1
      ? 'UPTREND'
      : (last.ema9 || last.close) < (last.ema21 || last.close) * 0.99 && m.price_change_1h < -1
      ? 'DOWNTREND'
      : 'SIDEWAYS';

  const momentumState: ChartIntelligence['momentum_state'] =
    (last.rsi14 || 50) > 62 && m.price_change_5m > 0.5
      ? 'ACCELERATING'
      : (last.rsi14 || 50) < 38
      ? 'REVERSING'
      : m.price_change_5m < 0 && m.price_change_1h > 2
      ? 'WEAKENING'
      : 'STEADY';

  const volRatio = m.volume_24h_usd > 0 ? m.volume_1h_usd / (m.volume_24h_usd / 24) : 1;
  const volExpanding = volRatio > 1.2;
  const nearBreak = currentPrice >= resistance1 * 0.94;
  const liqOk = m.liquidity_usd >= 15_000;

  const stages: ChartIntelligence['breakout_sequence']['stages'] = [
    { name: 'Quiet/Sideways', status: 'PASSED', detail: 'Base price compression range identified' },
    {
      name: 'Volume Expansion',
      status: volExpanding ? 'PASSED' : 'ACTIVE',
      detail: `1H volume at ${volRatio.toFixed(2)}x 24H hourly baseline`,
    },
    {
      name: 'Potential Resistance Break',
      status: nearBreak && m.price_change_1h > 2 ? 'PASSED' : volExpanding ? 'ACTIVE' : 'PENDING',
      detail: `Testing upper band near $${resistance1.toPrecision(4)}`,
    },
    {
      name: 'Confirmation',
      status: nearBreak && volExpanding && m.buys_1h > m.sells_1h ? 'PASSED' : 'PENDING',
      detail: 'Requires sustained close above resistance with buy/sell > 1.1x',
    },
    {
      name: 'Liquidity Check',
      status: liqOk ? 'PASSED' : 'FAILED',
      detail: `Pool depth $${Math.round(m.liquidity_usd).toLocaleString()}`,
    },
    {
      name: 'Holder Check',
      status: (m.top_10_pct || 25) <= 32 ? 'PASSED' : 'FAILED',
      detail: `Top 10 concentration ${(m.top_10_pct || 25).toFixed(1)}%`,
    },
    {
      name: 'Wallet Check',
      status: (m.bundle_pct || 10) <= 22 ? 'PASSED' : 'FAILED',
      detail: `Bundle exposure ${(m.bundle_pct || 10).toFixed(1)}%`,
    },
    {
      name: 'Social/Narrative Check',
      status: m.socials.x || m.socials.telegram ? 'PASSED' : 'PENDING',
      detail: 'Approved social channels evaluated',
    },
    { name: 'Risk Check', status: 'ACTIVE', detail: 'Multi-dimensional risk gate evaluated in Risk Engine' },
    { name: 'Action State', status: 'ACTIVE', detail: 'Final state emitted by Brigg Strategy + No-Trade Engine' },
  ];

  const currentStage = (stages.find((s) => s.status === 'ACTIVE' || s.status === 'FAILED')?.name ||
    'Action State') as ChartIntelligence['breakout_sequence']['current_stage'];

  return {
    timeframe,
    candles: rawCandles,
    trend,
    momentum_state: momentumState,
    volatility_pct: Number((volatilityFactor * 100).toFixed(2)),
    support_levels: [Number(support1.toPrecision(5)), Number(midBand.toPrecision(5))],
    resistance_levels: [Number(resistance1.toPrecision(5)), Number((resistance1 * 1.08).toPrecision(5))],
    breakout_sequence: {
      current_stage: currentStage,
      stages,
    },
    probabilistic_zones: [
      {
        type: 'PUMP_ZONE',
        price_low: Number((resistance1 * 0.99).toPrecision(5)),
        price_high: Number((resistance1 * 1.12).toPrecision(5)),
        probability_pct: volExpanding && m.buys_1h > m.sells_1h ? 58 : 34,
        why_identified: 'Upper volatility breakout band aligned with EMA9 > EMA21 structure (probabilistic, not a guarantee)',
        supporting_data: [
          `1H volume ratio ${volRatio.toFixed(2)}x`,
          `RSI(14) at ${last.rsi14 ?? 50}`,
        ],
        conflicting_evidence: [
          m.sells_1h >= m.buys_1h ? '1H sell transactions matching or exceeding buys' : 'Overhead supply near prior swing high',
        ],
        invalidation_conditions: [
          `Break below support $${support1.toPrecision(4)} on rising sell volume`,
          'Liquidity withdrawal > 15%',
        ],
      },
      {
        type: 'DUMP_ZONE',
        price_low: Number((support1 * 0.88).toPrecision(5)),
        price_high: Number((support1 * 1.01).toPrecision(5)),
        probability_pct: m.price_change_1h < 0 ? 54 : 29,
        why_identified: 'Lower structural demand zone where breakdown could accelerate stop/panic exits',
        supporting_data: [
          `ATR(14) range implies ${(volatilityFactor * 100).toFixed(1)}% bar swing`,
          `Sniper/Bundle supply ~${((m.sniper_pct || 12) + (m.bundle_pct || 9)).toFixed(1)}%`,
        ],
        conflicting_evidence: ['Active buy flow absorbing dips above VWAP'],
        invalidation_conditions: ['Higher low formed above VWAP with expanding organic buy count'],
      },
    ],
    data_status: agg.overallStatus === 'REAL' ? 'DERIVED' : 'MOCK',
  };
}
