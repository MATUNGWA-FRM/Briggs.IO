export type ChartYAxisMode = 'PRICE' | 'MC';

export function computeSupplyScale(spotPriceUsd?: number, marketCapUsd?: number): number {
  if (
    typeof spotPriceUsd === 'number' &&
    typeof marketCapUsd === 'number' &&
    Number.isFinite(spotPriceUsd) &&
    Number.isFinite(marketCapUsd) &&
    spotPriceUsd > 0 &&
    marketCapUsd > 0
  ) {
    return marketCapUsd / spotPriceUsd;
  }
  return 1;
}

export function formatChartValue(value: number, mode: ChartYAxisMode): string {
  if (!Number.isFinite(value)) return '$0';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (mode === 'MC') {
    if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(2)}B`;
    if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
    if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
    return `${sign}$${Math.round(abs).toLocaleString()}`;
  }
  if (abs === 0) return '$0.00';
  if (abs < 0.0001) return `${sign}$${abs.toFixed(8)}`;
  if (abs < 0.01) return `${sign}$${abs.toFixed(6)}`;
  if (abs < 1) return `${sign}$${abs.toFixed(4)}`;
  if (abs < 1000) return `${sign}$${abs.toFixed(3)}`;
  return `${sign}$${abs.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function formatDurationCompact(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  if (s < 60) return `${s}s`;
  const mins = Math.floor(s / 60);
  const remS = s % 60;
  if (mins < 60) return remS > 0 ? `${mins}m ${remS}s` : `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remM = mins % 60;
  if (hrs < 24) return remM > 0 ? `${hrs}h ${remM}m` : `${hrs}h`;
  const days = Math.floor(hrs / 24);
  const remH = hrs % 24;
  return remH > 0 ? `${days}d ${remH}h` : `${days}d`;
}

export interface MeasureMetrics {
  pctChange: number;
  valueDelta: number;
  barsCount: number;
  durationSec: number;
  durationLabel: string;
}

export function computeMeasureMetrics(
  p1: { time: number; price: number },
  p2: { time: number; price: number },
  tfSec: number,
  yScale = 1
): MeasureMetrics {
  const v1 = p1.price * yScale;
  const v2 = p2.price * yScale;
  const pctChange = v1 > 0 ? ((v2 - v1) / v1) * 100 : 0;
  const valueDelta = v2 - v1;
  const durationSec = Math.abs(p2.time - p1.time);
  const barsCount = Math.max(1, Math.round(durationSec / Math.max(1, tfSec)));
  return {
    pctChange,
    valueDelta,
    barsCount,
    durationSec,
    durationLabel: formatDurationCompact(durationSec),
  };
}
