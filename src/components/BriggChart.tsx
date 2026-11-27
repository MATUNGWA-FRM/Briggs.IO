import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  ChevronDown,
  Crosshair,
  Eye,
  EyeOff,
  LocateFixed,
  Minimize2,
  Minus,
  MousePointer,
  Pause,
  Pencil,
  Percent,
  Play,
  Ruler,
  SkipForward,
  Trash2,
  TrendingUp,
  Undo2,
  X,
  Zap,
} from 'lucide-react';
import {
  computeMeasureMetrics,
  computeSupplyScale,
  formatChartValue,
  type ChartYAxisMode,
} from '../shared/chartHelpers';
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
  marketCapUsd?: number;
  spotPriceUsd?: number;
  heightPx?: number;
  onCollapse?: () => void;
}

const TIMEFRAMES: ChartTimeframe[] = ['1S', '1M', '5M', '15M', '1H', '4H', '24H'];

export type DrawingTool =
  | 'CURSOR'
  | 'MEASURE'
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
  | { id: 'string' extends never ? never : string; type: 'fib'; p1: ChartAnchor; p2: ChartAnchor }
  | { id: string; type: 'measure'; p1: ChartAnchor; p2: ChartAnchor }
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

interface MeasureBoxRender {
  id: string;
  isPreview?: boolean;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  pctChange: number;
  valueDelta: number;
  barsCount: number;
  durationLabel: string;
}

interface ZoneBandRender {
  type: 'PUMP_ZONE' | 'DUMP_ZONE';
  top: number;
  height: number;
  probabilityPct: number;
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
  marketCapUsd,
  spotPriceUsd,
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
  const objectsMenuRef = useRef<HTMLDivElement | null>(null);

  const userPriceLinesRef = useRef<IPriceLine[]>([]);
  const signalPriceLinesRef = useRef<IPriceLine[]>([]);
  const userLineSeriesRef = useRef<ISeriesApi<'Line'>[]>([]);
  const markerPluginRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);

  const activeBarRef = useRef<BarState | null>(null);
  const ema9ValRef = useRef<number>(0);
  const ema21ValRef = useRef<number>(0);
  const cumPVRef = useRef<number>(0);
  const cumVRef = useRef<number>(0);
  const lastProcessedTickMsRef = useRef<number>(0);

  const [yAxisMode, setYAxisMode] = useState<ChartYAxisMode>('PRICE');
  const supplyScale = computeSupplyScale(spotPriceUsd, marketCapUsd);
  const canUseMc = supplyScale > 0 && typeof marketCapUsd === 'number' && marketCapUsd > 0;
  const activeYMode: ChartYAxisMode = yAxisMode === 'MC' && canUseMc ? 'MC' : 'PRICE';
  const yScale = activeYMode === 'MC' ? supplyScale : 1;

  const yScaleRef = useRef<number>(yScale);
  yScaleRef.current = yScale;
  const activeYModeRef = useRef<ChartYAxisMode>(activeYMode);
  activeYModeRef.current = activeYMode;

  const [showEma9, setShowEma9] = useState(true);
  const [showEma21, setShowEma21] = useState(true);
  const [showVwap, setShowVwap] = useState(true);
  const [showBb, setShowBb] = useState(false);
  const [showSignals, setShowSignals] = useState(true);

  const [activeTool, setActiveTool] = useState<DrawingTool>('CURSOR');
  const [pendingAnchor, setPendingAnchor] = useState<ChartAnchor | null>(null);
  const [hoverAnchor, setHoverAnchor] = useState<ChartAnchor | null>(null);
  const [showObjects, setShowObjects] = useState(true);
  const [objectsMenuOpen, setObjectsMenuOpen] = useState(false);
  const [drawings, setDrawings] = useState<ChartDrawingObject[]>(() => loadSavedDrawings(address));
  const [measureBoxes, setMeasureBoxes] = useState<MeasureBoxRender[]>([]);
  const [zoneBands, setZoneBands] = useState<ZoneBandRender[]>([]);

  const activeToolRef = useRef<DrawingTool>(activeTool);
  activeToolRef.current = activeTool;
  const pendingAnchorRef = useRef<ChartAnchor | null>(pendingAnchor);
  pendingAnchorRef.current = pendingAnchor;
  const hoverAnchorRef = useRef<ChartAnchor | null>(hoverAnchor);
  hoverAnchorRef.current = hoverAnchor;
  const drawingsRef = useRef<ChartDrawingObject[]>(drawings);
  drawingsRef.current = drawings;
  const showObjectsRef = useRef<boolean>(showObjects);
  showObjectsRef.current = showObjects;
  const showSignalsRef = useRef<boolean>(showSignals);
  showSignalsRef.current = showSignals;
  const timeframeRef = useRef<ChartTimeframe>(timeframe);
  timeframeRef.current = timeframe;

  // Load saved objects when switching token address
  useEffect(() => {
    setDrawings(loadSavedDrawings(address));
    setPendingAnchor(null);
    setHoverAnchor(null);
    setActiveTool('CURSOR');
  }, [address]);

  // Persist drawings per token
  useEffect(() => {
    saveDrawings(address, drawings);
  }, [address, drawings]);

  // Close collapsible Objects panel on outside click
  useEffect(() => {
    if (!objectsMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (objectsMenuRef.current && !objectsMenuRef.current.contains(e.target as Node)) {
        setObjectsMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [objectsMenuOpen]);

  // Escape cancels pending 2-point anchor or closes Objects menu
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPendingAnchor(null);
        setHoverAnchor(null);
        setActiveTool('CURSOR');
        setObjectsMenuOpen(false);
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
          open: lastInitial.open * yScale,
          high: lastInitial.high * yScale,
          low: lastInitial.low * yScale,
          close: lastInitial.close * yScale,
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

  // Compute SVG screen coordinates for Measure Rule boxes
  const recomputeMeasureOverlay = useCallback(() => {
    const instance = chartRef.current;
    const candleSeries = candleSeriesRef.current;
    const container = containerRef.current;
    if (!instance || !candleSeries || !container) {
      setMeasureBoxes([]);
      return;
    }

    const scale = yScaleRef.current;
    const stepSec = tfSeconds(timeframeRef.current);
    const ts = instance.timeScale();

    const toCoordX = (targetTime: number): number | null => {
      const direct = ts.timeToCoordinate(targetTime as Time);
      if (direct !== null && Number.isFinite(direct)) return Number(direct);

      const first = chart.candles[0];
      const last = activeBarRef.current || chart.candles[chart.candles.length - 1];
      if (!first || !last) return null;
      const xFirst = ts.timeToCoordinate(first.time as Time);
      const xLast = ts.timeToCoordinate(last.time as Time);
      if (xFirst === null || xLast === null || last.time === first.time) return null;
      const ratio = (targetTime - first.time) / (last.time - first.time);
      return Number(xFirst) + ratio * (Number(xLast) - Number(xFirst));
    };

    const candidates: Array<{ id: string; p1: ChartAnchor; p2: ChartAnchor; isPreview?: boolean }> = [];
    if (showObjectsRef.current) {
      for (const d of drawingsRef.current) {
        if (d.type === 'measure') {
          candidates.push({ id: d.id, p1: d.p1, p2: d.p2 });
        }
      }
    }
    if (activeToolRef.current === 'MEASURE' && pendingAnchorRef.current && hoverAnchorRef.current) {
      candidates.push({
        id: 'measure_preview',
        p1: pendingAnchorRef.current,
        p2: hoverAnchorRef.current,
        isPreview: true,
      });
    }

    const nextBoxes: MeasureBoxRender[] = [];
    for (const c of candidates) {
      const x1 = toCoordX(c.p1.time);
      const x2 = toCoordX(c.p2.time);
      const y1 = candleSeries.priceToCoordinate(c.p1.price * scale);
      const y2 = candleSeries.priceToCoordinate(c.p2.price * scale);
      if (
        x1 === null ||
        x2 === null ||
        y1 === null ||
        y2 === null ||
        !Number.isFinite(x1) ||
        !Number.isFinite(x2) ||
        !Number.isFinite(y1) ||
        !Number.isFinite(y2)
      ) {
        continue;
      }
      const metrics = computeMeasureMetrics(c.p1, c.p2, stepSec, scale);
      nextBoxes.push({
        id: c.id,
        isPreview: c.isPreview,
        x1,
        y1: Number(y1),
        x2,
        y2: Number(y2),
        pctChange: metrics.pctChange,
        valueDelta: metrics.valueDelta,
        barsCount: metrics.barsCount,
        durationLabel: metrics.durationLabel,
      });
    }

    setMeasureBoxes(nextBoxes);

    // Compute Pump & Dump Probabilistic Zone bands on graph
    const nextZones: ZoneBandRender[] = [];
    if (showSignalsRef.current) {
      for (const z of chart.probabilistic_zones) {
        if (z.type !== 'PUMP_ZONE' && z.type !== 'DUMP_ZONE') continue;
        const yHigh = candleSeries.priceToCoordinate(z.price_high * scale);
        const yLow = candleSeries.priceToCoordinate(z.price_low * scale);
        if (yHigh === null || yLow === null || !Number.isFinite(yHigh) || !Number.isFinite(yLow)) {
          continue;
        }
        const top = Math.min(Number(yHigh), Number(yLow));
        const bandH = Math.max(8, Math.abs(Number(yLow) - Number(yHigh)));
        nextZones.push({
          type: z.type,
          top,
          height: bandH,
          probabilityPct: z.probability_pct,
        });
      }
    }
    setZoneBands(nextZones);
  }, [chart.candles, chart.probabilistic_zones]);

  const seriesKey = `${address}:${timeframe}:${activeYMode}:${chart.candles[0]?.time || 0}:${chart.candles.length}`;

  // Build / rebuild chart ONLY when token, timeframe, yAxisMode, base series, or indicator toggles change
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const scale = yScaleRef.current;
    const mode = activeYModeRef.current;
    const latest = chart.candles[chart.candles.length - 1];

    const instance = createChart(el, {
      layout: {
        background: { type: ColorType.Solid, color: '#08090D' },
        textColor: '#8B93A7',
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: 11,
      },
      localization: {
        priceFormatter: (p: number) => formatChartValue(p, mode),
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

    const sampleVal = (latest?.close ?? 0.001) * scale;
    const precision =
      mode === 'MC'
        ? 0
        : sampleVal < 0.0001
        ? 8
        : sampleVal < 0.01
        ? 7
        : sampleVal < 1
        ? 5
        : 4;
    const minMove =
      mode === 'MC' ? 1 : Number((1 / Math.pow(10, precision)).toFixed(precision));

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
        open: c.open * scale,
        high: c.high * scale,
        low: c.low * scale,
        close: c.close * scale,
      }))
    );

    if (chart.support_levels[0]) {
      candleSeries.createPriceLine({
        price: chart.support_levels[0] * scale,
        color: 'rgba(0, 229, 153, 0.45)',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: 'SUP',
      });
    }
    if (chart.resistance_levels[0]) {
      candleSeries.createPriceLine({
        price: chart.resistance_levels[0] * scale,
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
          .map((c) => ({ time: c.time as Time, value: c.ema9! * scale }))
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
          .map((c) => ({ time: c.time as Time, value: c.ema21! * scale }))
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
          .map((c) => ({ time: c.time as Time, value: c.vwap! * scale }))
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
        chart.candles
          .filter((c) => c.bbUpper !== undefined)
          .map((c) => ({ time: c.time as Time, value: c.bbUpper! * scale }))
      );
      lower.setData(
        chart.candles
          .filter((c) => c.bbLower !== undefined)
          .map((c) => ({ time: c.time as Time, value: c.bbLower! * scale }))
      );
    }

    // Seed active live bar & indicator accumulators from final candle
    if (latest) {
      const initialBar: BarState = {
        time: latest.time,
        open: latest.open * scale,
        high: latest.high * scale,
        low: latest.low * scale,
        close: latest.close * scale,
        volume: latest.volume,
      };
      activeBarRef.current = initialBar;
      ema9ValRef.current = (latest.ema9 ?? latest.close) * scale;
      ema21ValRef.current = (latest.ema21 ?? latest.close) * scale;
      const totalV = chart.candles.reduce((acc, c) => acc + c.volume, 0);
      cumVRef.current = Math.max(1, totalV);
      cumPVRef.current = (latest.vwap ?? latest.close) * scale * cumVRef.current;
      setHudBar(initialBar);
    }

    const resolveTimeAtPoint = (paramTime: unknown, pointX?: number): number => {
      if (typeof paramTime === 'number') return paramTime;
      if (paramTime) return Number(paramTime);
      if (typeof pointX === 'number') {
        const mapped = instance.timeScale().coordinateToTime(pointX);
        if (typeof mapped === 'number') return mapped;
      }
      return activeBarRef.current?.time || Math.floor(Date.now() / 1000);
    };

    instance.subscribeCrosshairMove((param) => {
      if (
        activeToolRef.current === 'MEASURE' &&
        pendingAnchorRef.current &&
        param.point
      ) {
        const hoverY = candleSeries.coordinateToPrice(param.point.y);
        if (hoverY !== null && Number.isFinite(hoverY) && hoverY > 0) {
          const hoverCanonical = Number(hoverY) / yScaleRef.current;
          const hoverT = resolveTimeAtPoint(param.time, param.point.x);
          setHoverAnchor({ time: hoverT, price: hoverCanonical });
        }
      }

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

    // TradingView-style Click-to-Draw Objects & Measure Rule Handler
    instance.subscribeClick((param) => {
      const tool = activeToolRef.current;
      if (tool === 'CURSOR' || !param.point) return;

      const clickedCoordPrice = candleSeries.coordinateToPrice(param.point.y);
      if (clickedCoordPrice === null || !Number.isFinite(clickedCoordPrice) || clickedCoordPrice <= 0) {
        return;
      }
      // Convert display coordinate price back to canonical Token USD price
      const canonicalPrice = Number(clickedCoordPrice) / yScaleRef.current;
      const clickedTime = resolveTimeAtPoint(param.time, param.point.x);
      const id = `obj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

      if (tool === 'HLINE') {
        setDrawings((prev) => [
          ...prev,
          {
            id,
            type: 'hline',
            price: canonicalPrice,
            label: `LVL ${formatChartValue(canonicalPrice, 'PRICE')}`,
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
            price: canonicalPrice,
            kind,
            text: kind === 'BUY' ? 'ENTRY' : kind === 'SELL' ? 'EXIT' : 'ALERT',
          },
        ]);
        setShowObjects(true);
        setActiveTool('CURSOR');
        return;
      }

      // 2-Point Drawings: MEASURE, TRENDLINE, RAY, FIB
      const anchor = pendingAnchorRef.current;
      if (!anchor) {
        setPendingAnchor({ time: clickedTime, price: canonicalPrice });
        setHoverAnchor({ time: clickedTime, price: canonicalPrice });
        return;
      }

      const p1 = anchor;
      const p2 = { time: clickedTime, price: canonicalPrice };
      if (tool === 'MEASURE') {
        setDrawings((prev) => [...prev, { id, type: 'measure', p1, p2 }]);
      } else if (tool === 'TRENDLINE') {
        setDrawings((prev) => [...prev, { id, type: 'trendline', p1, p2, color: '#F59E0B' }]);
      } else if (tool === 'RAY') {
        setDrawings((prev) => [...prev, { id, type: 'ray', p1, p2, color: '#C084FC' }]);
      } else if (tool === 'FIB') {
        setDrawings((prev) => [...prev, { id, type: 'fib', p1, p2 }]);
      }
      setShowObjects(true);
      setPendingAnchor(null);
      setHoverAnchor(null);
      setActiveTool('CURSOR');
    });

    instance.timeScale().fitContent();

    const onVisibleChange = () => {
      recomputeMeasureOverlay();
    };
    instance.timeScale().subscribeVisibleTimeRangeChange(onVisibleChange);

    const observer = new ResizeObserver(() => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight || heightPx,
        });
        recomputeMeasureOverlay();
      }
    });
    observer.observe(el);

    return () => {
      instance.timeScale().unsubscribeVisibleTimeRangeChange(onVisibleChange);
      observer.disconnect();
      userPriceLinesRef.current = [];
      signalPriceLinesRef.current = [];
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
  }, [seriesKey, showEma9, showEma21, showVwap, showBb, recomputeMeasureOverlay]);

  // Render/Sync TradingView-style user drawing objects + Brigg Pump/Dump & Sniper Entry/Out signals
  useEffect(() => {
    const instance = chartRef.current;
    const candleSeries = candleSeriesRef.current;
    const markersApi = markerPluginRef.current;
    if (!instance || !candleSeries) return;

    for (const pl of userPriceLinesRef.current) {
      try {
        candleSeries.removePriceLine(pl);
      } catch {
        // ignore already removed
      }
    }
    userPriceLinesRef.current = [];

    for (const pl of signalPriceLinesRef.current) {
      try {
        candleSeries.removePriceLine(pl);
      } catch {
        // ignore already removed
      }
    }
    signalPriceLinesRef.current = [];

    for (const ls of userLineSeriesRef.current) {
      try {
        instance.removeSeries(ls);
      } catch {
        // ignore already removed
      }
    }
    userLineSeriesRef.current = [];

    const scale = yScaleRef.current;
    const mode = activeYModeRef.current;
    const stepSec = tfSeconds(timeframe);
    const markers: SeriesMarker<Time>[] = [];

    // 1. Brigg On-Graph Pump/Dump & Sniper Entry/Out Indications
    if (showSignals && chart.pump_dump_outlook) {
      const out = chart.pump_dump_outlook;
      const entryPl = candleSeries.createPriceLine({
        price: out.sniper_entry_price * scale,
        color: '#22D3EE',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: 'SNIPER IN',
      });
      const exitPl = candleSeries.createPriceLine({
        price: out.sniper_exit_price * scale,
        color: '#00E599',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: 'PUMP OUT',
      });
      const dumpPl = candleSeries.createPriceLine({
        price: out.dump_invalidation_price * scale,
        color: '#FF4D6A',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: 'DUMP EXIT',
      });
      signalPriceLinesRef.current.push(entryPl, exitPl, dumpPl);

      for (const sig of chart.sniper_signals || []) {
        const isBull = sig.kind === 'PUMP_ENTRY' || sig.kind === 'SNIPER_IN';
        markers.push({
          time: sig.time as Time,
          position: isBull ? 'belowBar' : 'aboveBar',
          color: isBull ? '#00E599' : '#FF4D6A',
          shape: isBull ? 'arrowUp' : 'arrowDown',
          text: sig.label,
          size: 1,
        });
      }
    }

    // 2. User-Drawn Objects (when Objects visibility is ON)
    if (showObjects) {
      for (const obj of drawings) {
        if (obj.type === 'hline') {
          const displayPrice = obj.price * scale;
          const pl = candleSeries.createPriceLine({
            price: displayPrice,
            color: obj.color,
            lineWidth: 2,
            lineStyle: 0,
            axisLabelVisible: true,
            title: `LVL ${formatChartValue(displayPrice, mode)}`,
          });
          userPriceLinesRef.current.push(pl);
        } else if (obj.type === 'fib') {
          const high = Math.max(obj.p1.price, obj.p2.price) * scale;
          const low = Math.min(obj.p1.price, obj.p2.price) * scale;
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
          const p1Val = a.price * scale;
          const p2Val = b.price * scale;

          const points: Array<{ time: Time; value: number }> = [
            { time: t1 as Time, value: p1Val },
            { time: t2 as Time, value: p2Val },
          ];

          if (obj.type === 'ray') {
            const dt = Math.max(stepSec, t2 - t1);
            const slope = (p2Val - p1Val) / dt;
            const extDt = Math.max(stepSec * 12, dt * 2);
            const t3 = t2 + extDt;
            const p3 = Math.max(1e-9, p2Val + slope * extDt);
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
    }

    markers.sort((m1, m2) => Number(m1.time) - Number(m2.time));
    markersApi?.setMarkers(markers);
    recomputeMeasureOverlay();
  }, [drawings, showObjects, showSignals, chart.sniper_signals, chart.pump_dump_outlook, seriesKey, showEma9, showEma21, showVwap, showBb, timeframe, recomputeMeasureOverlay]);

  // Keep Measure Box SVG updated during live mouse hover or pending anchor
  useEffect(() => {
    recomputeMeasureOverlay();
  }, [hoverAnchor, pendingAnchor, activeTool, recomputeMeasureOverlay]);

  // Dynamically resize chart height smoothly during splitter drag
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({ height: heightPx });
      recomputeMeasureOverlay();
    }
  }, [heightPx, recomputeMeasureOverlay]);

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
    const displayPrice = liveTick.price_usd * yScaleRef.current;
    let updatedBar: BarState;

    if (nextTime > prevBar.time) {
      const openPrice = prevBar.close;
      updatedBar = {
        time: nextTime,
        open: openPrice,
        high: Math.max(openPrice, displayPrice),
        low: Math.min(openPrice, displayPrice),
        close: displayPrice,
        volume: Math.max(10, liveTick.bar_volume_delta),
      };
    } else {
      updatedBar = {
        time: prevBar.time,
        open: prevBar.open,
        high: Math.max(prevBar.high, displayPrice),
        low: Math.min(prevBar.low, displayPrice),
        close: displayPrice,
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
      const nextEma9 = displayPrice * (2 / 10) + ema9ValRef.current * (8 / 10);
      ema9ValRef.current = nextEma9;
      ema9SeriesRef.current.update({ time: updatedBar.time as Time, value: nextEma9 });
    }
    if (ema21SeriesRef.current) {
      const nextEma21 = displayPrice * (2 / 22) + ema21ValRef.current * (20 / 22);
      ema21ValRef.current = nextEma21;
      ema21SeriesRef.current.update({ time: updatedBar.time as Time, value: nextEma21 });
    }
    if (vwapSeriesRef.current) {
      cumPVRef.current += displayPrice * Math.max(10, liveTick.bar_volume_delta);
      cumVRef.current += Math.max(10, liveTick.bar_volume_delta);
      const nextVwap = cumPVRef.current / cumVRef.current;
      vwapSeriesRef.current.update({ time: updatedBar.time as Time, value: nextVwap });
    }

    if (!hoveringCrosshair) {
      setHudBar({ ...updatedBar });
    }
    recomputeMeasureOverlay();
  }, [liveTick, streaming, address, timeframe, hoveringCrosshair, recomputeMeasureOverlay]);

  const barDeltaPct = hudBar && hudBar.open > 0 ? ((hudBar.close - hudBar.open) / hudBar.open) * 100 : 0;

  const drawingTools: Array<{ id: DrawingTool; label: string; icon: React.ReactNode; hint: string }> = [
    { id: 'CURSOR', label: 'Cursor', icon: <MousePointer className="w-3 h-3" />, hint: 'Inspect candles (Esc)' },
    { id: 'MEASURE', label: 'Measure %', icon: <Ruler className="w-3 h-3 text-[#00E599]" />, hint: 'Click 2 points to measure % change & bars' },
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
    setHoverAnchor(null);
    setActiveTool(tool);
    if (tool !== 'CURSOR') {
      setShowObjects(true);
      setObjectsMenuOpen(false);
    }
  };

  const formatObjSummary = (obj: ChartDrawingObject): string => {
    if (obj.type === 'measure') {
      const m = computeMeasureMetrics(obj.p1, obj.p2, tfSeconds(timeframe), yScale);
      return `Measure ${m.pctChange >= 0 ? '+' : ''}${m.pctChange.toFixed(2)}%`;
    }
    if (obj.type === 'hline') return `H-Line ${formatChartValue(obj.price * yScale, activeYMode)}`;
    if (obj.type === 'fib') {
      const lo = formatChartValue(Math.min(obj.p1.price, obj.p2.price) * yScale, activeYMode);
      const hi = formatChartValue(Math.max(obj.p1.price, obj.p2.price) * yScale, activeYMode);
      return `Fib ${lo}–${hi}`;
    }
    if (obj.type === 'marker') return `${obj.kind} Pin`;
    if (obj.type === 'ray') return 'Ray';
    return 'Trend';
  };

  return (
    <section className="border-b border-[#1E2330] bg-[#08090D]">
      {/* Compact Padre-Style Chart Toolbar (Timeframes + Y-Axis Price/MC + Indicators + Collapsible Objects) */}
      <div className="px-3 py-1.5 border-b border-[#1E2330] bg-[#0C0E14] flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Timeframes */}
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

          {/* Y-Axis Scale Toggle: Token Value (Price) vs Market Cap (MC) */}
          <div
            className="flex items-center bg-[#07080C] border border-[#1E2330] rounded-sm p-0.5 font-mono text-[11px]"
            role="group"
            aria-label="Y-Axis Unit"
            title="Switch Y-axis between Token Price and Market Cap"
          >
            <button
              type="button"
              onClick={() => setYAxisMode('PRICE')}
              className={`px-2 py-0.5 rounded-sm transition-colors whitespace-nowrap ${
                activeYMode === 'PRICE'
                  ? 'bg-[#1D2230] text-slate-100 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Price
            </button>
            <button
              type="button"
              onClick={() => canUseMc && setYAxisMode('MC')}
              disabled={!canUseMc}
              className={`px-2 py-0.5 rounded-sm transition-colors whitespace-nowrap disabled:opacity-40 ${
                activeYMode === 'MC'
                  ? 'bg-[#7C5CFF]/25 text-[#C4B5FD] font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              MC
            </button>
          </div>

          {/* Technical Overlay Toggles */}
          <div className="flex items-center gap-1 text-[11px] font-mono">
            <button
              type="button"
              onClick={() => setShowEma9((v) => !v)}
              className={`px-1.5 py-0.5 rounded-sm border whitespace-nowrap shrink-0 ${
                showEma9 ? 'border-cyan-500/40 text-cyan-300 bg-cyan-500/10' : 'border-[#1E2330] text-slate-500'
              }`}
            >
              EMA9
            </button>
            <button
              type="button"
              onClick={() => setShowEma21((v) => !v)}
              className={`px-1.5 py-0.5 rounded-sm border whitespace-nowrap shrink-0 ${
                showEma21 ? 'border-amber-500/40 text-amber-300 bg-amber-500/10' : 'border-[#1E2330] text-slate-500'
              }`}
            >
              EMA21
            </button>
            <button
              type="button"
              onClick={() => setShowVwap((v) => !v)}
              className={`px-1.5 py-0.5 rounded-sm border whitespace-nowrap shrink-0 ${
                showVwap ? 'border-[#7C5CFF]/50 text-[#C4B5FD] bg-[#7C5CFF]/15' : 'border-[#1E2330] text-slate-500'
              }`}
            >
              VWAP
            </button>
            <button
              type="button"
              onClick={() => setShowBb((v) => !v)}
              className={`px-1.5 py-0.5 rounded-sm border whitespace-nowrap shrink-0 ${
                showBb ? 'border-slate-500 text-slate-200 bg-slate-700/40' : 'border-[#1E2330] text-slate-500'
              }`}
            >
              BB
            </button>
            <button
              type="button"
              onClick={() => setShowSignals((v) => !v)}
              title="Toggle on-graph Pump/Dump zones and Sniper Entry/Out signals"
              className={`px-1.5 py-0.5 rounded-sm border inline-flex items-center gap-1 whitespace-nowrap shrink-0 ${
                showSignals
                  ? 'border-[#00E599]/50 text-[#00E599] bg-[#00E599]/10'
                  : 'border-[#1E2330] text-slate-500'
              }`}
            >
              <Crosshair className="w-3 h-3" />
              <span>Pump/Dump</span>
            </button>
          </div>

          {/* 1-Click Measure (%) Rule Shortcut + Collapsible Objects Drawer */}
          <button
            type="button"
            onClick={() => handleSelectTool(activeTool === 'MEASURE' ? 'CURSOR' : 'MEASURE')}
            title="Measure percentage move & bars between 2 points"
            className={`px-2 py-0.5 rounded-sm border font-mono text-[11px] inline-flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors ${
              activeTool === 'MEASURE'
                ? 'border-[#00E599] bg-[#00E599]/20 text-[#00E599]'
                : 'border-[#1E2330] bg-[#12151E] text-slate-300 hover:border-[#2C3448]'
            }`}
          >
            <Ruler className="w-3 h-3 text-[#00E599]" />
            <span>Measure %</span>
          </button>

          {/* Compressed / Collapsible Objects Section */}
          <div ref={objectsMenuRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setObjectsMenuOpen((v) => !v)}
              className={`px-2 py-0.5 rounded-sm border font-mono text-[11px] inline-flex items-center gap-1 whitespace-nowrap transition-colors ${
                objectsMenuOpen || activeTool !== 'CURSOR'
                  ? 'border-[#7C5CFF] bg-[#7C5CFF]/20 text-[#C4B5FD]'
                  : 'border-[#1E2330] bg-[#12151E] text-slate-300 hover:border-[#2C3448]'
              }`}
              aria-expanded={objectsMenuOpen}
              title="Open collapsed chart drawing objects & list"
            >
              <Pencil className="w-3 h-3" />
              <span>Objects ({drawings.length})</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {objectsMenuOpen && (
              <div className="absolute left-0 mt-1.5 w-72 rounded-sm border border-[#282F42] bg-[#0C0E14] shadow-2xl z-40 p-2.5 space-y-2.5 text-[11px] font-mono">
                <div className="flex items-center justify-between border-b border-[#1E2330] pb-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400">
                    Drawing Objects & Ruler
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowObjects((v) => !v)}
                      className={`px-1.5 py-0.5 rounded-sm border inline-flex items-center gap-1 ${
                        showObjects
                          ? 'border-[#1E2330] bg-[#12151E] text-slate-300'
                          : 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                      }`}
                      title="Show or hide drawn objects on chart"
                    >
                      {showObjects ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      <span>{showObjects ? 'Shown' : 'Hidden'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDrawings((prev) => prev.slice(0, -1))}
                      disabled={drawings.length === 0}
                      className="p-1 rounded-sm border border-[#1E2330] bg-[#12151E] hover:bg-[#1B202E] text-slate-300 disabled:opacity-40"
                      title="Undo last object"
                    >
                      <Undo2 className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDrawings([]);
                        setPendingAnchor(null);
                        setHoverAnchor(null);
                      }}
                      disabled={drawings.length === 0}
                      className="p-1 rounded-sm border border-[#1E2330] bg-[#12151E] hover:bg-[#FF4D6A]/20 text-slate-300 hover:text-[#FF8599] disabled:opacity-40"
                      title="Clear all objects"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1">
                  {drawingTools.map((t) => {
                    const active = activeTool === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleSelectTool(t.id)}
                        title={t.hint}
                        className={`px-1.5 py-1.5 rounded-sm border inline-flex items-center gap-1 truncate transition-colors ${
                          active
                            ? 'border-[#7C5CFF] bg-[#7C5CFF]/25 text-[#C4B5FD]'
                            : 'border-[#1E2330] bg-[#08090D] text-slate-300 hover:border-[#2C3448]'
                        }`}
                      >
                        {t.icon}
                        <span className="truncate">{t.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Placed Objects List inside collapsible drawer (keeps graph pad clean) */}
                <div className="pt-1.5 border-t border-[#1E2330] space-y-1 max-h-36 overflow-y-auto">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">
                    Placed Objects ({drawings.length})
                  </div>
                  {drawings.length === 0 ? (
                    <div className="text-[10px] text-slate-500">
                      No objects placed yet. Select a tool above and click the chart.
                    </div>
                  ) : (
                    drawings.map((obj) => (
                      <div
                        key={obj.id}
                        className="px-2 py-1 rounded-sm border border-[#1E2330] bg-[#08090D] flex items-center justify-between gap-2 text-[10px]"
                      >
                        <span className="text-slate-200 truncate">{formatObjSummary(obj)}</span>
                        <button
                          type="button"
                          onClick={() => setDrawings((prev) => prev.filter((x) => x.id !== obj.id))}
                          className="text-slate-500 hover:text-[#FF4D6A] shrink-0"
                          title="Delete object"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Live Telemetry & Stream Controls */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono tabular-nums text-slate-400">
          <span>
            RSI <strong className="text-slate-200">{lastInitial?.rsi14?.toFixed(1) ?? '—'}</strong>
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

      {/* TradingView Lightweight Charts Canvas + Measure Rule SVG Overlay */}
      <div
        style={{ height: `${heightPx}px` }}
        className={`relative w-full bg-[#08090D] ${activeTool !== 'CURSOR' ? 'cursor-crosshair' : ''}`}
      >
        <div ref={containerRef} className="w-full h-full" />

        {/* Pump/Dump Probabilistic Zone Bands & Measure Rule (%) SVG Overlay */}
        {(measureBoxes.length > 0 || zoneBands.length > 0) && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none z-20"
            aria-hidden="true"
          >
            {/* Shaded On-Graph Pump & Dump Indication Bands */}
            {zoneBands.map((z) => {
              const isPump = z.type === 'PUMP_ZONE';
              const stroke = isPump ? 'rgba(0, 229, 153, 0.55)' : 'rgba(255, 77, 106, 0.55)';
              const fill = isPump ? 'rgba(0, 229, 153, 0.08)' : 'rgba(255, 77, 106, 0.08)';
              const textFill = isPump ? '#00E599' : '#FF4D6A';
              const label = isPump
                ? `PUMP ZONE · ${z.probabilityPct}%`
                : `DUMP ZONE · ${z.probabilityPct}%`;
              return (
                <g key={z.type}>
                  <rect
                    x={0}
                    y={z.top}
                    width="100%"
                    height={z.height}
                    fill={fill}
                  />
                  <line
                    x1={0}
                    y1={z.top}
                    x2="100%"
                    y2={z.top}
                    stroke={stroke}
                    strokeWidth={1}
                    strokeDasharray="4 4"
                  />
                  <line
                    x1={0}
                    y1={z.top + z.height}
                    x2="100%"
                    y2={z.top + z.height}
                    stroke={stroke}
                    strokeWidth={1}
                    strokeDasharray="4 4"
                  />
                  <text
                    x={12}
                    y={z.top + 12}
                    fill={textFill}
                    fontSize={9.5}
                    fontWeight={700}
                    fontFamily="JetBrains Mono, monospace"
                    opacity={0.9}
                  >
                    {label}
                  </text>
                </g>
              );
            })}

            {measureBoxes.map((box) => {
              const isPos = box.pctChange >= 0;
              const stroke = isPos ? '#00E599' : '#FF4D6A';
              const fill = isPos ? 'rgba(0, 229, 153, 0.14)' : 'rgba(255, 77, 106, 0.14)';
              const left = Math.min(box.x1, box.x2);
              const top = Math.min(box.y1, box.y2);
              const width = Math.max(2, Math.abs(box.x2 - box.x1));
              const height = Math.max(2, Math.abs(box.y2 - box.y1));
              const midX = left + width / 2;
              const midY = top + height / 2;
              const labelY = Math.max(22, Math.min(heightPx - 36, top > 44 ? top - 8 : top + height + 8));
              const deltaSign = box.valueDelta >= 0 ? '+' : '';
              const pctText = `${box.pctChange >= 0 ? '+' : ''}${box.pctChange.toFixed(2)}% (${deltaSign}${formatChartValue(
                box.valueDelta,
                activeYMode
              )})`;
              const subText = `${box.barsCount} bars · ${box.durationLabel}`;
              const boxW = Math.max(150, Math.max(pctText.length, subText.length) * 6.5 + 16);
              const clampedLabelX = Math.max(boxW / 2 + 8, midX);

              return (
                <g key={box.id} opacity={box.isPreview ? 0.9 : 1}>
                  <rect
                    x={left}
                    y={top}
                    width={width}
                    height={height}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={1}
                    strokeDasharray="4 3"
                  />
                  {/* Cross axes inside TradingView Measure box */}
                  <line
                    x1={left}
                    y1={midY}
                    x2={left + width}
                    y2={midY}
                    stroke={stroke}
                    strokeWidth={1}
                    strokeOpacity={0.45}
                  />
                  <line
                    x1={midX}
                    y1={top}
                    x2={midX}
                    y2={top + height}
                    stroke={stroke}
                    strokeWidth={1}
                    strokeOpacity={0.45}
                  />
                  {/* Anchor vector */}
                  <line
                    x1={box.x1}
                    y1={box.y1}
                    x2={box.x2}
                    y2={box.y2}
                    stroke={stroke}
                    strokeWidth={1.5}
                    strokeDasharray="3 2"
                  />
                  <circle cx={box.x1} cy={box.y1} r={3.5} fill={stroke} />
                  <circle cx={box.x2} cy={box.y2} r={3.5} fill={stroke} />

                  {/* Measure readout badge */}
                  <g transform={`translate(${clampedLabelX}, ${labelY})`}>
                    <rect
                      x={-boxW / 2}
                      y={-18}
                      width={boxW}
                      height={32}
                      rx={3}
                      fill="#0C0E14"
                      stroke={stroke}
                      strokeWidth={1}
                    />
                    <text
                      x={0}
                      y={-4}
                      textAnchor="middle"
                      fill={stroke}
                      fontSize={10.5}
                      fontWeight={700}
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {pctText}
                    </text>
                    <text
                      x={0}
                      y={9}
                      textAnchor="middle"
                      fill="#CBD5E1"
                      fontSize={9.5}
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {subText}
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>
        )}

        {/* Padre OHLCV Overlay */}
        {hudBar && (
          <div className="absolute top-2 left-3 pointer-events-none flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] font-mono tabular-nums bg-[#08090D]/80 px-2 py-0.5 rounded-sm border border-[#1E2330]/80">
            <span className="font-semibold text-slate-200">
              {symbol}/SOL · {timeframe} · {activeYMode === 'MC' ? 'MCap' : 'Price'}
            </span>
            <span className="text-slate-400">
              O <span className="text-slate-200">{formatChartValue(hudBar.open, activeYMode)}</span>
            </span>
            <span className="text-slate-400">
              H <span className="text-slate-200">{formatChartValue(hudBar.high, activeYMode)}</span>
            </span>
            <span className="text-slate-400">
              L <span className="text-slate-200">{formatChartValue(hudBar.low, activeYMode)}</span>
            </span>
            <span className="text-slate-400">
              C{' '}
              <span className={barDeltaPct >= 0 ? 'text-[#00E599]' : 'text-[#FF4D6A]'}>
                {formatChartValue(hudBar.close, activeYMode)} ({barDeltaPct >= 0 ? '+' : ''}
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

        {/* Minimal Active-Tool Instruction Pill (only shown while drawing/measuring) */}
        {activeTool !== 'CURSOR' && (
          <div className="absolute top-2 right-16 z-30 flex items-center gap-2 px-2 py-0.5 rounded-sm border border-[#7C5CFF]/60 bg-[#0C0E14]/95 text-[10px] font-mono text-[#C4B5FD]">
            <span>
              {activeTool === 'MEASURE'
                ? pendingAnchor
                  ? 'Measure: Click 2nd point · Esc cancel'
                  : 'Measure: Click 1st point · Esc cancel'
                : pendingAnchor
                ? 'Click 2nd anchor · Esc cancel'
                : activeTool === 'TRENDLINE' || activeTool === 'RAY' || activeTool === 'FIB'
                ? 'Click 1st anchor · Esc cancel'
                : 'Click chart to place · Esc cancel'}
            </span>
            <button
              type="button"
              onClick={() => handleSelectTool('CURSOR')}
              className="text-slate-400 hover:text-white"
              title="Cancel tool"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
        {/* On-Graph Shitcoin Pump / Dump & Sniper Entry/Out Indication Strip */}
        {showSignals && chart.pump_dump_outlook && (
          <div className="absolute bottom-2 left-3 z-20 pointer-events-none flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10px] font-mono tabular-nums bg-[#0C0E14]/90 px-2.5 py-1 rounded-sm border border-[#1E2330]">
            <span
              className={`font-bold ${
                chart.pump_dump_outlook.bias === 'PUMP_LIKELY'
                  ? 'text-[#00E599]'
                  : chart.pump_dump_outlook.bias === 'DUMP_RISK'
                  ? 'text-[#FF4D6A]'
                  : 'text-amber-300'
              }`}
            >
              {chart.pump_dump_outlook.bias === 'PUMP_LIKELY'
                ? `PUMP LIKELY (${chart.pump_dump_outlook.pump_probability_pct}%)`
                : chart.pump_dump_outlook.bias === 'DUMP_RISK'
                ? `DUMP RISK (${chart.pump_dump_outlook.dump_probability_pct}%)`
                : `CHOP (${chart.pump_dump_outlook.pump_probability_pct}%P/${chart.pump_dump_outlook.dump_probability_pct}%D)`}
            </span>
            <span className="text-cyan-300">
              Sniper In <strong>{formatChartValue(chart.pump_dump_outlook.sniper_entry_price * yScale, activeYMode)}</strong>
            </span>
            <span className="text-[#00E599]">
              Pump Out <strong>{formatChartValue(chart.pump_dump_outlook.sniper_exit_price * yScale, activeYMode)}</strong>
            </span>
            <span className="text-[#FF4D6A]">
              Dump Stop <strong>{formatChartValue(chart.pump_dump_outlook.dump_invalidation_price * yScale, activeYMode)}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Volume Breakout Sequence & Probabilistic Pump/Dump Zones */}
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
          {chart.pump_dump_outlook && (
            <div className="mt-1.5 text-[10px] font-mono text-slate-300 truncate" title={chart.pump_dump_outlook.headline}>
              {chart.pump_dump_outlook.headline}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {chart.probabilistic_zones.map((z) => {
            const isPump = z.type === 'PUMP_ZONE';
            return (
              <div
                key={z.type}
                className={`px-2.5 py-1.5 rounded-sm border bg-[#08090D] text-[11px] ${
                  isPump ? 'pump-energy-card' : 'dump-energy-card'
                }`}
              >
                <div className="relative z-10 flex items-center justify-between font-mono gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 font-semibold ${
                      isPump ? 'text-[#00E599]' : 'text-[#FF4D6A]'
                    }`}
                  >
                    <Zap
                      className={`w-3.5 h-3.5 shrink-0 lightning-flicker ${
                        isPump ? 'text-[#00E599]' : 'text-[#FF4D6A]'
                      }`}
                      aria-hidden="true"
                    />
                    <span>{isPump ? 'Probabilistic Pump Zone' : 'Probabilistic Dump Zone'}</span>
                  </span>
                  <span className="text-slate-100 font-semibold tabular-nums">
                    {z.probability_pct}% est.
                  </span>
                </div>
                <div className="relative z-10 font-mono text-[10px] text-slate-300 tabular-nums mt-0.5">
                  Range: {formatChartValue(z.price_low * yScale, activeYMode)} –{' '}
                  {formatChartValue(z.price_high * yScale, activeYMode)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
