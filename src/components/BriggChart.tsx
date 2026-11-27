import React, { useEffect, useRef, useState } from 'react';
import {
  CandlestickSeries,
  ColorType,
  createChart,
  createSeriesMarkers,
  HistogramSeries,
  LineSeries,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type SeriesMarker,
  type Time,
} from 'lightweight-charts';
import {
  ArrowUpRight,
  Bookmark,
  Eye,
  EyeOff,
  LocateFixed,
  Minimize2,
  Minus,
  MousePointer,
  Pause,
  Play,
  Percent,
  SkipForward,
  TrendingUp,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
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

const TIMEFRAMES: ChartTimeframe[] = ['1S', '1M', '5M', '15M', '1H', '4H', '24H'];

export type DrawingTool =
  | 'CURSOR'
  | 'HLINE'
  | 'TRENDLINE'
  | 'RAY'
  | 'FIB'
  | 'MARKER_BUY'
  | 'MARKER_SELL'
  | 'MARKER_ALERT';

export interface ChartAnchor {
  time: number;
  price: number;
}

export type ChartDrawingObject =
  | { id: string; type: 'hline'; price: number; label: string; color: string }
  | { id: string; type: 'trendline'; p1: ChartAnchor; p2: ChartAnchor; color: string }
  | { id: string; type: 'ray'; p1: ChartAnchor; p2: ChartAnchor; color: string }
  | { id: string; type: 'fib'; p1: ChartAnchor; p2: ChartAnchor }
  | { id: string; type: 'marker'; time: number; price: number; kind: 'BUY' | 'SELL' | 'ALERT'; text: string };

const FIB_RATIOS: Array<{ ratio: number; label: string; color: string }> = [
  { ratio: 0, label: '0.0%', color: '#94A3B8' },
  { ratio: 0.236, label: '23.6%', color: '#38BDF8' },
  { ratio: 0.382, label: '38.2%', color: '#00E599' },
  { ratio: 0.5, label: '50.0%', color: '#F59E0B' },
  { ratio: 0.618, label: '61.8%', color: '#7C5CFF' },
  { ratio: 0.786, label: '78.6%', color: '#C084FC' },
  { ratio: 1, label: '100%', color: '#94A3B8' },
];

function tfSeconds(tf: ChartTimeframe): number {
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

function loadSavedDrawings(address: string): ChartDrawingObject[] {
  try {
    const raw = window.localStorage.getItem(`brigg_chart_objects_v1:${address}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ChartDrawingObject[]) : [];
  } catch {
    return [];
  }
}

function saveDrawings(address: string, objs: ChartDrawingObject[]): void {
  try {
    window.localStorage.setItem(`brigg_chart_objects_v1:${address}`, JSON.stringify(objs));
  } catch {
    // ignore storage errors
  }
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

  // Refs for TradingView-style user objects managed cleanly without rebuilding chart
  const userPriceLinesRef = useRef<IPriceLine[]>([]);
  const userLineSeriesRef = useRef<ISeriesApi<'Line'>[]>([]);
  const markerPluginRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);

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

  const [activeTool, setActiveTool] = useState<DrawingTool>('CURSOR');
  const [pendingAnchor, setPendingAnchor] = useState<ChartAnchor | null>(null);
  const [showObjects, setShowObjects] = useState(true);
  const [drawings, setDrawings] = useState<ChartDrawingObject[]>(() => loadSavedDrawings(address));

  const activeToolRef = useRef<DrawingTool>(activeTool);
  activeToolRef.current = activeTool;
  const pendingAnchorRef = useRef<ChartAnchor | null>(pendingAnchor);
  pendingAnchorRef.current = pendingAnchor;
  const timeframeRef = useRef<ChartTimeframe>(timeframe);
  timeframeRef.current = timeframe;

  // Load saved objects when switching token address
  useEffect(() => {
    setDrawings(loadSavedDrawings(address));
    setPendingAnchor(null);
    setActiveTool('CURSOR');
  }, [address]);

  // Persist drawings per token
  useEffect(() => {
    saveDrawings(address, drawings);
  }, [address, drawings]);

  // Escape cancels pending 2-point anchor
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPendingAnchor(null);
        setActiveTool('CURSOR');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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

  // Build / rebuild chart ONLY when token, timeframe, base series, or indicator toggles change
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
        secondsVisible: timeframe === '1S' || timeframe === '1M' || timeframe === '5M',
        rightOffset: 8,
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
    markerPluginRef.current = createSeriesMarkers(candleSeries, []);

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

    // TradingView-style Click-to-Draw Objects Handler
    instance.subscribeClick((param) => {
      const tool = activeToolRef.current;
      if (tool === 'CURSOR' || !param.point) return;

      const clickedPrice = candleSeries.coordinateToPrice(param.point.y);
      if (clickedPrice === null || !Number.isFinite(clickedPrice) || clickedPrice <= 0) return;

      const fallbackTime = activeBarRef.current?.time || Math.floor(Date.now() / 1000);
      const clickedTime =
        typeof param.time === 'number'
          ? param.time
          : param.time
          ? Number(param.time)
          : fallbackTime;

      const id = `obj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

      if (tool === 'HLINE') {
        setDrawings((prev) => [
          ...prev,
          {
            id,
            type: 'hline',
            price: clickedPrice,
            label: `LVL $${clickedPrice.toPrecision(4)}`,
            color: '#38BDF8',
          },
        ]);
        setShowObjects(true);
        setActiveTool('CURSOR');
        return;
      }

      if (tool === 'MARKER_BUY' || tool === 'MARKER_SELL' || tool === 'MARKER_ALERT') {
        const kind = tool === 'MARKER_BUY' ? 'BUY' : tool === 'MARKER_SELL' ? 'SELL' : 'ALERT';
        setDrawings((prev) => [
          ...prev,
          {
            id,
            type: 'marker',
            time: clickedTime,
            price: clickedPrice,
            kind,
            text: kind === 'BUY' ? 'ENTRY' : kind === 'SELL' ? 'EXIT' : 'ALERT',
          },
        ]);
        setShowObjects(true);
        setActiveTool('CURSOR');
        return;
      }

      // 2-Point Drawings: TRENDLINE, RAY, FIB
      const anchor = pendingAnchorRef.current;
      if (!anchor) {
        setPendingAnchor({ time: clickedTime, price: clickedPrice });
        return;
      }

      const p1 = anchor;
      const p2 = { time: clickedTime, price: clickedPrice };
      if (tool === 'TRENDLINE') {
        setDrawings((prev) => [...prev, { id, type: 'trendline', p1, p2, color: '#F59E0B' }]);
      } else if (tool === 'RAY') {
        setDrawings((prev) => [...prev, { id, type: 'ray', p1, p2, color: '#C084FC' }]);
      } else if (tool === 'FIB') {
        setDrawings((prev) => [...prev, { id, type: 'fib', p1, p2 }]);
      }
      setShowObjects(true);
      setPendingAnchor(null);
      setActiveTool('CURSOR');
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
      userPriceLinesRef.current = [];
      userLineSeriesRef.current = [];
      markerPluginRef.current = null;
      instance.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volSeriesRef.current = null;
      ema9SeriesRef.current = null;
      ema21SeriesRef.current = null;
      vwapSeriesRef.current = null;
    };
  }, [seriesKey, showEma9, showEma21, showVwap, showBb]);

  // Render/Sync TradingView-style user drawing objects onto the live chart without destroying state
  useEffect(() => {
    const instance = chartRef.current;
    const candleSeries = candleSeriesRef.current;
    const markersApi = markerPluginRef.current;
    if (!instance || !candleSeries) return;

    // Clear previous user price lines & drawing line series
    for (const pl of userPriceLinesRef.current) {
      try {
        candleSeries.removePriceLine(pl);
      } catch {
        // ignore already removed
      }
    }
    userPriceLinesRef.current = [];

    for (const ls of userLineSeriesRef.current) {
      try {
        instance.removeSeries(ls);
      } catch {
        // ignore already removed
      }
    }
    userLineSeriesRef.current = [];

    if (!showObjects) {
      markersApi?.setMarkers([]);
      return;
    }

    const stepSec = tfSeconds(timeframe);
    const markers: SeriesMarker<Time>[] = [];

    for (const obj of drawings) {
      if (obj.type === 'hline') {
        const pl = candleSeries.createPriceLine({
          price: obj.price,
          color: obj.color,
          lineWidth: 2,
          lineStyle: 0,
          axisLabelVisible: true,
          title: obj.label,
        });
        userPriceLinesRef.current.push(pl);
      } else if (obj.type === 'fib') {
        const high = Math.max(obj.p1.price, obj.p2.price);
        const low = Math.min(obj.p1.price, obj.p2.price);
        const span = high - low;
        for (const f of FIB_RATIOS) {
          const levelPrice = high - span * f.ratio;
          const pl = candleSeries.createPriceLine({
            price: levelPrice,
            color: f.color,
            lineWidth: 1,
            lineStyle: f.ratio === 0 || f.ratio === 1 ? 0 : 2,
            axisLabelVisible: true,
            title: `FIB ${f.label}`,
          });
          userPriceLinesRef.current.push(pl);
        }
      } else if (obj.type === 'trendline' || obj.type === 'ray') {
        let a = obj.p1;
        let b = obj.p2;
        if (b.time < a.time) {
          a = obj.p2;
          b = obj.p1;
        }
        const t1 = a.time;
        const t2 = b.time === t1 ? t1 + stepSec : b.time;
        const p2Price = b.price;

        const points: Array<{ time: Time; value: number }> = [
          { time: t1 as Time, value: a.price },
          { time: t2 as Time, value: p2Price },
        ];

        if (obj.type === 'ray') {
          const dt = Math.max(stepSec, t2 - t1);
          const slope = (p2Price - a.price) / dt;
          const extDt = Math.max(stepSec * 12, dt * 2);
          const t3 = t2 + extDt;
          const p3 = Math.max(1e-9, p2Price + slope * extDt);
          points.push({ time: t3 as Time, value: p3 });
        }

        const ls = instance.addSeries(LineSeries, {
          color: obj.color,
          lineWidth: 2,
          lineStyle: obj.type === 'ray' ? 2 : 0,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        ls.setData(points);
        userLineSeriesRef.current.push(ls);
      } else if (obj.type === 'marker') {
        markers.push({
          time: obj.time as Time,
          position: obj.kind === 'BUY' ? 'belowBar' : 'aboveBar',
          color: obj.kind === 'BUY' ? '#00E599' : obj.kind === 'SELL' ? '#FF4D6A' : '#F59E0B',
          shape: obj.kind === 'BUY' ? 'arrowUp' : obj.kind === 'SELL' ? 'arrowDown' : 'circle',
          text: obj.text,
          size: 1,
        });
      }
    }

    markers.sort((m1, m2) => Number(m1.time) - Number(m2.time));
    markersApi?.setMarkers(markers);
  }, [drawings, showObjects, seriesKey, showEma9, showEma21, showVwap, showBb, timeframe]);

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

  const drawingTools: Array<{ id: DrawingTool; label: string; icon: React.ReactNode; hint: string }> = [
    { id: 'CURSOR', label: 'Cursor', icon: <MousePointer className="w-3 h-3" />, hint: 'Inspect candles (Esc)' },
    { id: 'HLINE', label: 'H-Line', icon: <Minus className="w-3 h-3" />, hint: 'Click chart to place horizontal level' },
    { id: 'TRENDLINE', label: 'Trend', icon: <TrendingUp className="w-3 h-3" />, hint: 'Click 2 points to draw trendline' },
    { id: 'RAY', label: 'Ray', icon: <ArrowUpRight className="w-3 h-3" />, hint: 'Click 2 points to project extended ray' },
    { id: 'FIB', label: 'Fib', icon: <Percent className="w-3 h-3" />, hint: 'Click swing high/low for Fibonacci levels' },
    { id: 'MARKER_BUY', label: 'Buy Pin', icon: <Bookmark className="w-3 h-3 text-[#00E599]" />, hint: 'Click candle to place Entry marker' },
    { id: 'MARKER_SELL', label: 'Sell Pin', icon: <Bookmark className="w-3 h-3 text-[#FF4D6A]" />, hint: 'Click candle to place Exit marker' },
    { id: 'MARKER_ALERT', label: 'Alert Pin', icon: <Bookmark className="w-3 h-3 text-amber-400" />, hint: 'Click candle to place Alert pin' },
  ];

  const handleSelectTool = (tool: DrawingTool) => {
    setPendingAnchor(null);
    setActiveTool(tool);
  };

  return (
    <section className="border-b border-[#1E2330] bg-[#08090D]">
      {/* Padre-Style Chart Toolbar (Timeframes + Indicators + Live Telemetry) */}
      <div className="px-3 py-1.5 border-b border-[#1E2330] bg-[#0C0E14] flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-[#07080C] border border-[#1E2330] rounded-sm p-0.5">
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

      {/* TradingView-Style Drawing Objects Bar */}
      <div className="px-3 py-1 border-b border-[#1E2330] bg-[#0A0C11] flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 mr-1">Objects:</span>
          {drawingTools.map((t) => {
            const active = activeTool === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleSelectTool(t.id)}
                title={t.hint}
                className={`px-2 py-0.5 rounded-sm border inline-flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors ${
                  active
                    ? 'border-[#7C5CFF] bg-[#7C5CFF]/25 text-[#C4B5FD]'
                    : 'border-[#1E2330] bg-[#12151E] text-slate-400 hover:text-slate-200'
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {activeTool !== 'CURSOR' && (
            <span className="text-[10px] text-[#C4B5FD] mr-1">
              {pendingAnchor
                ? 'Click 2nd point to complete'
                : activeTool === 'TRENDLINE' || activeTool === 'RAY' || activeTool === 'FIB'
                ? 'Click 1st anchor on chart'
                : 'Click chart to place object'}
            </span>
          )}

          <button
            type="button"
            onClick={() => setShowObjects((v) => !v)}
            className={`px-2 py-0.5 rounded-sm border inline-flex items-center gap-1 whitespace-nowrap shrink-0 ${
              showObjects
                ? 'border-[#1E2330] bg-[#12151E] text-slate-300'
                : 'border-amber-500/40 bg-amber-500/10 text-amber-300'
            }`}
            title="Show or hide drawn chart objects"
          >
            {showObjects ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            <span>({drawings.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setDrawings((prev) => prev.slice(0, -1))}
            disabled={drawings.length === 0}
            className="p-1 rounded-sm border border-[#1E2330] bg-[#12151E] hover:bg-[#1B202E] text-slate-300 disabled:opacity-40"
            title="Undo last object"
            aria-label="Undo last object"
          >
            <Undo2 className="w-3 h-3" />
          </button>

          <button
            type="button"
            onClick={() => {
              setDrawings([]);
              setPendingAnchor(null);
            }}
            disabled={drawings.length === 0}
            className="p-1 rounded-sm border border-[#1E2330] bg-[#12151E] hover:bg-[#FF4D6A]/20 text-slate-300 hover:text-[#FF8599] disabled:opacity-40"
            title="Clear all objects on this token"
            aria-label="Clear all objects"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* TradingView Lightweight Charts Canvas with Padre OHLCV Overlay */}
      <div
        style={{ height: `${heightPx}px` }}
        className={`relative w-full bg-[#08090D] ${activeTool !== 'CURSOR' ? 'cursor-crosshair' : ''}`}
      >
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

        {/* Compact Active Drawing Objects Strip */}
        {drawings.length > 0 && (
          <div className="absolute bottom-2 left-3 right-16 flex flex-wrap items-center gap-1 pointer-events-none">
            {drawings.map((obj) => (
              <span
                key={obj.id}
                className="pointer-events-auto inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm border border-[#1E2330] bg-[#0C0E14]/90 text-[10px] font-mono text-slate-300"
              >
                <span>
                  {obj.type === 'hline'
                    ? `H-Line $${obj.price.toPrecision(4)}`
                    : obj.type === 'fib'
                    ? `Fib $${Math.min(obj.p1.price, obj.p2.price).toPrecision(3)}–$${Math.max(obj.p1.price, obj.p2.price).toPrecision(3)}`
                    : obj.type === 'marker'
                    ? `${obj.kind} Pin`
                    : obj.type === 'ray'
                    ? 'Ray'
                    : 'Trend'}
                </span>
                <button
                  type="button"
                  onClick={() => setDrawings((prev) => prev.filter((x) => x.id !== obj.id))}
                  className="text-slate-500 hover:text-[#FF4D6A]"
                  title="Remove object"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
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
