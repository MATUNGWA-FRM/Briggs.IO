import React, { useEffect, useRef, useState } from 'react';
import {
  CandlestickSeries,
  ColorType,
  createChart,
  HistogramSeries,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from 'lightweight-charts';
import { LocateFixed, Minimize2, Pause, Play, SkipForward } from 'lucide-react';
import type { ChartIntelligence, ChartTimeframe, LiveMarketTick } from '../shared/types';

interface BriggChartProps {
  chart: ChartIntelligence;
  symbol: string;
  address: string;
  timeframe: ChartTimeframe;
  onTimeframeChange: (tf: ChartTimeframe) => void;
  liveTick: LiveMarketTick | null;
  streaming: boolean;
  onToggleStreaming: () => void;
  heightPx?: number;
  onCollapse?: () => void;
}

const TIMEFRAMES: ChartTimeframe[] = ['1M', '5M', '15M', '1H', '4H', '24H'];

function tfSeconds(tf: ChartTimeframe): number {
  switch (tf) {
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

function formatCountdown(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const rem = s % 60;
  if (hrs > 0) {
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

interface BarState {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export const BriggChart: React.FC<BriggChartProps> = ({
  chart,
  symbol,
  address,
  timeframe,
  onTimeframeChange,
  liveTick,
  streaming,
  onToggleStreaming,
  heightPx = 335,
  onCollapse,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const ema9SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const ema21SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const vwapSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  const activeBarRef = useRef<BarState | null>(null);
  const ema9ValRef = useRef<number>(0);
  const ema21ValRef = useRef<number>(0);
  const cumPVRef = useRef<number>(0);
  const cumVRef = useRef<number>(0);
  const lastProcessedTickMsRef = useRef<number>(0);

  const [showEma9, setShowEma9] = useState(true);
  const [showEma21, setShowEma21] = useState(true);
  const [showVwap, setShowVwap] = useState(true);
  const [showBb, setShowBb] = useState(false);

  const lastInitial = chart.candles[chart.candles.length - 1];
  const [hudBar, setHudBar] = useState<BarState | null>(
    lastInitial
      ? {
          time: lastInitial.time,
          open: lastInitial.open,
          high: lastInitial.high,
          low: lastInitial.low,
          close: lastInitial.close,
          volume: lastInitial.volume,
        }
      : null
  );
  const [hoveringCrosshair, setHoveringCrosshair] = useState(false);
  const [barRemainingSec, setBarRemainingSec] = useState<number>(() => {
    const step = tfSeconds(timeframe);
    const nowSec = Math.floor(Date.now() / 1000);
    return step - (nowSec % step);
  });

  // Live 1-second candle bar countdown
  useEffect(() => {
    const step = tfSeconds(timeframe);
    const updateCountdown = () => {
      const nowSec = Math.floor(Date.now() / 1000);
      setBarRemainingSec(step - (nowSec % step));
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [timeframe]);

  const seriesKey = `${address}:${timeframe}:${chart.candles[0]?.time || 0}:${chart.candles.length}`;

  // Build / rebuild chart ONLY when token, timeframe, base series, or overlay toggles change
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const latest = chart.candles[chart.candles.length - 1];
    const instance = createChart(el, {
      layout: {
        background: { type: ColorType.Solid, color: '#08090D' },
        textColor: '#8B93A7',
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.035)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.035)' },
      },
      width: el.clientWidth || 640,
      height: heightPx,
      crosshair: {
        vertLine: { color: 'rgba(124, 92, 255, 0.45)', labelBackgroundColor: '#1E2330' },
        horzLine: { color: 'rgba(124, 92, 255, 0.45)', labelBackgroundColor: '#1E2330' },
      },
      rightPriceScale: {
        borderColor: '#1E2330',
        scaleMargins: { top: 0.1, bottom: 0.22 },
      },
      timeScale: {
        borderColor: '#1E2330',
        timeVisible: true,
        secondsVisible: timeframe === '1M' || timeframe === '5M',
        rightOffset: 6,
      },
    });
    chartRef.current = instance;

    const priceVal = latest?.close ?? 0.001;
    const precision = priceVal < 0.0001 ? 8 : priceVal < 0.01 ? 7 : priceVal < 1 ? 5 : 4;
    const minMove = Number((1 / Math.pow(10, precision)).toFixed(precision));

    const candleSeries = instance.addSeries(CandlestickSeries, {
      upColor: '#00E599',
      downColor: '#FF4D6A',
      borderVisible: false,
      wickUpColor: '#00E599',
      wickDownColor: '#FF4D6A',
      priceFormat: {
        type: 'price',
        precision,
        minMove,
      },
    });
    candleSeriesRef.current = candleSeries;

    candleSeries.setData(
      chart.candles.map((c) => ({
        time: c.time as Time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
    );

    if (chart.support_levels[0]) {
      candleSeries.createPriceLine({
        price: chart.support_levels[0],
        color: 'rgba(0, 229, 153, 0.45)',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: 'SUP',
      });
    }
    if (chart.resistance_levels[0]) {
      candleSeries.createPriceLine({
        price: chart.resistance_levels[0],
        color: 'rgba(255, 77, 106, 0.45)',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: 'RES',
      });
    }

    const volSeries = instance.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'vol',
    });
    volSeriesRef.current = volSeries;
    instance.priceScale('vol').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });
    volSeries.setData(
      chart.candles.map((c) => ({
        time: c.time as Time,
        value: c.volume,
        color: c.close >= c.open ? 'rgba(0, 229, 153, 0.28)' : 'rgba(255, 77, 106, 0.28)',
      }))
    );

    if (showEma9) {
      const s = instance.addSeries(LineSeries, {
        color: '#22D3EE',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      s.setData(
        chart.candles
          .filter((c) => c.ema9 !== undefined)
          .map((c) => ({ time: c.time as Time, value: c.ema9! }))
      );
      ema9SeriesRef.current = s;
    } else {
      ema9SeriesRef.current = null;
    }

    if (showEma21) {
      const s = instance.addSeries(LineSeries, {
        color: '#F59E0B',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      s.setData(
        chart.candles
          .filter((c) => c.ema21 !== undefined)
          .map((c) => ({ time: c.time as Time, value: c.ema21! }))
      );
      ema21SeriesRef.current = s;
    } else {
      ema21SeriesRef.current = null;
    }

    if (showVwap) {
      const s = instance.addSeries(LineSeries, {
        color: '#9D7BFF',
        lineWidth: 1,
        lineStyle: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      s.setData(
        chart.candles
          .filter((c) => c.vwap !== undefined)
          .map((c) => ({ time: c.time as Time, value: c.vwap! }))
      );
      vwapSeriesRef.current = s;
    } else {
      vwapSeriesRef.current = null;
    }

    if (showBb) {
      const upper = instance.addSeries(LineSeries, {
        color: 'rgba(148, 163, 184, 0.4)',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      const lower = instance.addSeries(LineSeries, {
        color: 'rgba(148, 163, 184, 0.4)',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      upper.setData(
        chart.candles.filter((c) => c.bbUpper !== undefined).map((c) => ({ time: c.time as Time, value: c.bbUpper! }))
      );
      lower.setData(
        chart.candles.filter((c) => c.bbLower !== undefined).map((c) => ({ time: c.time as Time, value: c.bbLower! }))
      );
    }

    // Seed active live bar & indicator accumulators from final candle
    if (latest) {
      const initialBar: BarState = {
        time: latest.time,
        open: latest.open,
        high: latest.high,
        low: latest.low,
        close: latest.close,
        volume: latest.volume,
      };
      activeBarRef.current = initialBar;
      ema9ValRef.current = latest.ema9 ?? latest.close;
      ema21ValRef.current = latest.ema21 ?? latest.close;
      const totalV = chart.candles.reduce((acc, c) => acc + c.volume, 0);
      cumVRef.current = Math.max(1, totalV);
      cumPVRef.current = (latest.vwap ?? latest.close) * cumVRef.current;
      setHudBar(initialBar);
    }

    instance.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData) {
        setHoveringCrosshair(false);
        if (activeBarRef.current) setHudBar({ ...activeBarRef.current });
        return;
      }
      const cData = param.seriesData.get(candleSeries) as
        | { open: number; high: number; low: number; close: number }
        | undefined;
      const vData = param.seriesData.get(volSeries) as { value: number } | undefined;
      if (cData) {
        setHoveringCrosshair(true);
        setHudBar({
          time: Number(param.time),
          open: cData.open,
          high: cData.high,
          low: cData.low,
          close: cData.close,
          volume: vData?.value ?? 0,
        });
      }
    });

    instance.timeScale().fitContent();

    const observer = new ResizeObserver(() => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight || heightPx,
        });
      }
    });
    observer.observe(el);

    return () => {
      observer.disconnect();
      instance.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volSeriesRef.current = null;
      ema9SeriesRef.current = null;
      ema21SeriesRef.current = null;
      vwapSeriesRef.current = null;
    };
  }, [seriesKey, showEma9, showEma21, showVwap, showBb]);

  // Dynamically resize chart height smoothly during splitter drag
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({ height: heightPx });
    }
  }, [heightPx]);

  // Apply real-time incremental candle, volume, and indicator updates WITHOUT recreating the chart
  useEffect(() => {
    if (!liveTick || !streaming) return;
    if (liveTick.address !== address || liveTick.timeframe !== timeframe) return;
    if (liveTick.timestamp_ms <= lastProcessedTickMsRef.current) return;
    lastProcessedTickMsRef.current = liveTick.timestamp_ms;

    const candleSeries = candleSeriesRef.current;
    const volSeries = volSeriesRef.current;
    const prevBar = activeBarRef.current;
    if (!candleSeries || !volSeries || !prevBar) return;

    const nextTime = Math.max(prevBar.time, liveTick.candle_time);
    const price = liveTick.price_usd;
    let updatedBar: BarState;

    if (nextTime > prevBar.time) {
      const openPrice = prevBar.close;
      updatedBar = {
        time: nextTime,
        open: openPrice,
        high: Math.max(openPrice, price),
        low: Math.min(openPrice, price),
        close: price,
        volume: Math.max(10, liveTick.bar_volume_delta),
      };
    } else {
      updatedBar = {
        time: prevBar.time,
        open: prevBar.open,
        high: Math.max(prevBar.high, price),
        low: Math.min(prevBar.low, price),
        close: price,
        volume: prevBar.volume + Math.max(10, liveTick.bar_volume_delta),
      };
    }

    activeBarRef.current = updatedBar;
    candleSeries.update({
      time: updatedBar.time as Time,
      open: updatedBar.open,
      high: updatedBar.high,
      low: updatedBar.low,
      close: updatedBar.close,
    });

    volSeries.update({
      time: updatedBar.time as Time,
      value: updatedBar.volume,
      color: updatedBar.close >= updatedBar.open ? 'rgba(0, 229, 153, 0.3)' : 'rgba(255, 77, 106, 0.3)',
    });

    if (ema9SeriesRef.current) {
      const nextEma9 = price * (2 / 10) + ema9ValRef.current * (8 / 10);
      ema9ValRef.current = nextEma9;
      ema9SeriesRef.current.update({ time: updatedBar.time as Time, value: nextEma9 });
    }
    if (ema21SeriesRef.current) {
      const nextEma21 = price * (2 / 22) + ema21ValRef.current * (20 / 22);
      ema21ValRef.current = nextEma21;
      ema21SeriesRef.current.update({ time: updatedBar.time as Time, value: nextEma21 });
    }
    if (vwapSeriesRef.current) {
      cumPVRef.current += price * Math.max(10, liveTick.bar_volume_delta);
      cumVRef.current += Math.max(10, liveTick.bar_volume_delta);
      const nextVwap = cumPVRef.current / cumVRef.current;
      vwapSeriesRef.current.update({ time: updatedBar.time as Time, value: nextVwap });
    }

    if (!hoveringCrosshair) {
      setHudBar({ ...updatedBar });
    }
  }, [liveTick, streaming, address, timeframe, hoveringCrosshair]);

  const barDeltaPct = hudBar && hudBar.open > 0 ? ((hudBar.close - hudBar.open) / hudBar.open) * 100 : 0;

  return (
    <section className="border-b border-[#1E2330] bg-[#08090D]">
      {/* Padre-Style Chart Toolbar */}
      <div className="px-3 py-1.5 border-b border-[#1E2330] bg-[#0C0E14] flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-[#07080C] border border-[#1E2330] rounded p-0.5">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => onTimeframeChange(tf)}
                className={`px-2 py-0.5 text-[11px] font-mono rounded-sm transition-colors whitespace-nowrap shrink-0 ${
                  timeframe === tf
                    ? 'bg-[#7C5CFF]/25 text-[#C4B5FD] font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 text-[11px] font-mono">
            <button
              type="button"
              onClick={() => setShowEma9((v) => !v)}
              className={`px-2 py-0.5 rounded-sm border whitespace-nowrap shrink-0 ${
                showEma9 ? 'border-cyan-500/40 text-cyan-300 bg-cyan-500/10' : 'border-[#1E2330] text-slate-500'
              }`}
            >
              EMA9
            </button>
            <button
              type="button"
              onClick={() => setShowEma21((v) => !v)}
              className={`px-2 py-0.5 rounded-sm border whitespace-nowrap shrink-0 ${
                showEma21 ? 'border-amber-500/40 text-amber-300 bg-amber-500/10' : 'border-[#1E2330] text-slate-500'
              }`}
            >
              EMA21
            </button>
            <button
              type="button"
              onClick={() => setShowVwap((v) => !v)}
              className={`px-2 py-0.5 rounded-sm border whitespace-nowrap shrink-0 ${
                showVwap ? 'border-[#7C5CFF]/50 text-[#C4B5FD] bg-[#7C5CFF]/15' : 'border-[#1E2330] text-slate-500'
              }`}
            >
              VWAP
            </button>
            <button
              type="button"
              onClick={() => setShowBb((v) => !v)}
              className={`px-2 py-0.5 rounded-sm border whitespace-nowrap shrink-0 ${
                showBb ? 'border-slate-500 text-slate-200 bg-slate-700/40' : 'border-[#1E2330] text-slate-500'
              }`}
            >
              BB(20)
            </button>
          </div>
        </div>

        {/* Live Telemetry & Stream Controls */}
        <div className="flex flex-wrap items-center gap-2.5 text-[11px] font-mono tabular-nums text-slate-400">
          <span>
            RSI <strong className="text-slate-200">{lastInitial?.rsi14?.toFixed(1) ?? '—'}</strong>
          </span>
          <span>
            MACD{' '}
            <strong className={(lastInitial?.macdHist ?? 0) >= 0 ? 'text-[#00E599]' : 'text-[#FF4D6A]'}>
              {lastInitial?.macdHist !== undefined ? lastInitial.macdHist.toExponential(1) : '—'}
            </strong>
          </span>
          <span className="text-slate-300" title="Time remaining in active candle">
            Close <strong className="text-[#C4B5FD]">{formatCountdown(barRemainingSec)}</strong>
          </span>

          <button
            type="button"
            onClick={onToggleStreaming}
            className={`px-2 py-0.5 rounded-sm border inline-flex items-center gap-1 whitespace-nowrap shrink-0 ${
              streaming
                ? 'border-[#00E599]/40 bg-[#00E599]/10 text-[#00E599]'
                : 'border-[#1E2330] bg-[#12151E] text-slate-400'
            }`}
            title="Toggle real-time tick updates"
          >
            {streaming ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            {streaming ? 'LIVE' : 'PAUSED'}
          </button>

          <button
            type="button"
            onClick={() => chartRef.current?.timeScale().fitContent()}
            className="p-1 rounded-sm border border-[#1E2330] bg-[#12151E] hover:bg-[#1B202E] text-slate-300"
            title="Fit chart"
            aria-label="Fit chart"
          >
            <LocateFixed className="w-3 h-3" />
          </button>

          <button
            type="button"
            onClick={() => chartRef.current?.timeScale().scrollToRealTime()}
            className="p-1 rounded-sm border border-[#1E2330] bg-[#12151E] hover:bg-[#1B202E] text-slate-300"
            title="Jump to real-time bar"
            aria-label="Jump to real-time bar"
          >
            <SkipForward className="w-3 h-3" />
          </button>

          {onCollapse && (
            <button
              type="button"
              onClick={onCollapse}
              className="p-1 rounded-sm border border-[#1E2330] bg-[#12151E] hover:bg-[#1B202E] text-slate-400 hover:text-slate-200"
              title="Collapse chart pane"
              aria-label="Collapse chart pane"
            >
              <Minimize2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* TradingView Lightweight Charts Canvas with Padre OHLCV Overlay */}
      <div style={{ height: `${heightPx}px` }} className="relative w-full bg-[#08090D]">
        <div ref={containerRef} className="w-full h-full" />

        {hudBar && (
          <div className="absolute top-2 left-3 pointer-events-none flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] font-mono tabular-nums bg-[#08090D]/80 px-2 py-0.5 rounded-sm border border-[#1E2330]/80">
            <span className="font-semibold text-slate-200">
              {symbol}/SOL · {timeframe}
            </span>
            <span className="text-slate-400">
              O <span className="text-slate-200">${hudBar.open.toPrecision(5)}</span>
            </span>
            <span className="text-slate-400">
              H <span className="text-slate-200">${hudBar.high.toPrecision(5)}</span>
            </span>
            <span className="text-slate-400">
              L <span className="text-slate-200">${hudBar.low.toPrecision(5)}</span>
            </span>
            <span className="text-slate-400">
              C{' '}
              <span className={barDeltaPct >= 0 ? 'text-[#00E599]' : 'text-[#FF4D6A]'}>
                ${hudBar.close.toPrecision(5)} ({barDeltaPct >= 0 ? '+' : ''}
                {barDeltaPct.toFixed(2)}%)
              </span>
            </span>
            <span className="text-slate-400">
              Vol <span className="text-slate-200">${Math.round(hudBar.volume).toLocaleString()}</span>
            </span>
            {liveTick && (
              <span className="text-[10px] text-slate-400">
                [{liveTick.tick_source === 'LIVE_DEXSCREENER' ? 'REAL' : liveTick.tick_source === 'MOCK' ? 'MOCK' : 'LIVE FLOW'}]
              </span>
            )}
          </div>
        )}
      </div>

      {/* Volume Breakout Sequence & Probabilistic Zones */}
      <div className="px-3 py-2 border-t border-[#1E2330] bg-[#0C0E14] grid grid-cols-1 xl:grid-cols-2 gap-2.5">
        <div>
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="font-medium text-slate-300">Volume Breakout Sequence</span>
            <span className="font-mono text-[#C4B5FD]">{chart.breakout_sequence.current_stage}</span>
          </div>
          <div className="grid grid-cols-5 gap-1">
            {chart.breakout_sequence.stages.slice(0, 5).map((st, idx) => {
              const cls =
                st.status === 'PASSED'
                  ? 'border-[#00E599]/40 text-[#00E599] bg-[#00E599]/10'
                  : st.status === 'FAILED'
                  ? 'border-[#FF4D6A]/40 text-[#FF4D6A] bg-[#FF4D6A]/10'
                  : st.status === 'ACTIVE'
                  ? 'border-[#7C5CFF]/50 text-[#C4B5FD] bg-[#7C5CFF]/15'
                  : 'border-[#1E2330] text-slate-500 bg-[#08090D]';
              return (
                <div
                  key={st.name}
                  className={`px-1.5 py-1 rounded-sm border text-[10px] truncate ${cls}`}
                  title={`${st.name}: ${st.detail}`}
                >
                  {idx + 1}. {st.name}
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {chart.probabilistic_zones.map((z) => (
            <div key={z.type} className="px-2.5 py-1.5 rounded-sm border border-[#1E2330] bg-[#08090D] text-[11px]">
              <div className="flex items-center justify-between font-mono">
                <span className={z.type === 'PUMP_ZONE' ? 'text-[#00E599] font-semibold' : 'text-[#FF4D6A] font-semibold'}>
                  {z.type === 'PUMP_ZONE' ? 'Probabilistic Pump Zone' : 'Probabilistic Dump Zone'}
                </span>
                <span className="text-slate-200 tabular-nums">{z.probability_pct}% est.</span>
              </div>
              <div className="font-mono text-[10px] text-slate-400 tabular-nums mt-0.5">
                Range: ${z.price_low} – ${z.price_high}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
