import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  ExternalLink,
  Maximize2,
  Minimize2,
  PanelLeftOpen,
  PanelRightOpen,
  Plus,
  ShieldCheck,
  ShieldX,
  X,
} from 'lucide-react';
import { AlertsDrawer } from './components/AlertsDrawer';
import { AnalysisOverviewPanel } from './components/AnalysisOverviewPanel';
import { BottomUtilityBar } from './components/BottomUtilityBar';
import { BriggChart } from './components/BriggChart';
import { BubbleMap2D } from './components/BubbleMap2D';
import { BubbleMap3D } from './components/BubbleMap3D';
import {
  BUY_NOTIFICATION_TTL_MS,
  BUY_POPUP_TTL_MS,
  BuyNotificationStack,
  dismissPopupNotificationById,
  pruneExpiredBuyNotifications,
  removeBuyNotificationById,
  type BuyNotificationItem,
} from './components/BuyNotificationStack';
import { ChecklistAndPredictionsPanel } from './components/ChecklistAndPredictionsPanel';
import { ForensicsPanel } from './components/ForensicsPanel';
import { HoldersIntelligencePanel } from './components/HoldersIntelligencePanel';
import { LiquidityVolumePanel } from './components/LiquidityVolumePanel';
import { LiveSocialTracker } from './components/LiveSocialTracker';
import { LiveTradesTape } from './components/LiveTradesTape';
import { ModelUpdateCenter } from './components/ModelUpdateCenter';
import { ScorePanel } from './components/ScorePanel';
import { SettingsObservabilityModal } from './components/SettingsObservabilityModal';
import { SocialNarrativePanel } from './components/SocialNarrativePanel';
import { TokenScanner } from './components/TokenScanner';
import { TopBar } from './components/TopBar';
import type { BubbleMapNode, BubbleMapPayload } from './server/graph/bubbleMapBuilder';
import {
  clampNumber,
  LAYOUT_PRESETS,
  loadSavedLayout,
  resetSavedLayout,
  saveLayout,
  WORKSPACE_TABS_META,
  type LayoutPresetId,
  type WorkspaceLayoutState,
  type WorkspaceTabId,
} from './shared/layoutConfig';
import {
  loadSavedNotificationPrefs,
  saveNotificationPrefs,
  type NotificationPrefs,
} from './shared/notificationConfig';
import {
  applyThemeCssVars,
  loadSavedThemeColors,
  resetDefaultThemeColors,
  saveThemeColors,
  type TerminalThemeColors,
} from './shared/themeConfig';
import {
  addCustomGlossaryTerm,
  extractGlossaryTermsFromContext,
  loadSavedGlossaryEntries,
  mergeGlossaryEntries,
  removeGlossaryTerm,
  saveGlossaryEntries,
  type TerminologyEntry,
} from './shared/terminology';
import type {
  AlertEvent,
  AlertRule,
  BriggFilterPreset,
  BriggMode,
  ChartTimeframe,
  Horizon,
  HumanOverrideRecord,
  LiveMarketTick,
  LiveTradeEvent,
  MarketRegimeState,
  ScannerTokenSummary,
  SocialMentionEvent,
  TokenFullAnalysis,
} from './shared/types';

interface TokenAnalysisResponse extends TokenFullAnalysis {
  bubble_map: BubbleMapPayload;
}

const DEFAULT_TOKEN = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'; // BONK on Solana

function formatCompactUsd(val: number): string {
  if (val >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(2)}B`;
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(1)}K`;
  return `$${Math.round(val).toLocaleString()}`;
}

export default function App() {
  const [mode, setMode] = useState<BriggMode>('SHITCOIN');
  const [horizon, setHorizon] = useState<Horizon>('15M');
  const [timeframe, setTimeframe] = useState<ChartTimeframe>('15M');
  const [activeView, setActiveView] = useState<'TERMINAL' | 'MODEL_CENTER'>('TERMINAL');

  const [layout, setLayout] = useState<WorkspaceLayoutState>(() => loadSavedLayout());
  const [addTabOpen, setAddTabOpen] = useState(false);
  const addTabWrapRef = useRef<HTMLDivElement | null>(null);
  const [resizingAxis, setResizingAxis] = useState<'left' | 'right' | 'chart' | null>(null);
  const dragStateRef = useRef<{
    axis: 'left' | 'right' | 'chart';
    startX: number;
    startY: number;
    startVal: number;
  } | null>(null);

  const [preset, setPreset] = useState<BriggFilterPreset['id']>('GENERAL');
  const [sortBy, setSortBy] = useState('opportunity');
  const [scannerTokens, setScannerTokens] = useState<ScannerTokenSummary[]>([]);
  const [scannerLoading, setScannerLoading] = useState(true);
  const [autoRefreshSec, setAutoRefreshSec] = useState<0 | 15 | 30 | 60>(30);
  const [countdownSec, setCountdownSec] = useState<number>(30);
  const [newAddresses, setNewAddresses] = useState<Set<string>>(() => new Set());
  const seenAddressesRef = useRef<Set<string>>(new Set());
  const [regime, setRegime] = useState<MarketRegimeState | undefined>(undefined);

  const [selectedAddress, setSelectedAddress] = useState<string>(DEFAULT_TOKEN);
  const [positionSizeUsd, setPositionSizeUsd] = useState<number>(1500);
  const [analysis, setAnalysis] = useState<TokenAnalysisResponse | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(true);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const [streaming, setStreaming] = useState(true);
  const [liveTick, setLiveTick] = useState<LiveMarketTick | null>(null);
  const [recentTrades, setRecentTrades] = useState<LiveTradeEvent[]>([]);
  const [socialFeed, setSocialFeed] = useState<SocialMentionEvent[]>([]);
  const [socialStreaming, setSocialStreaming] = useState(true);
  const [socialLoading, setSocialLoading] = useState(false);
  const [pricePulse, setPricePulse] = useState<'UP' | 'DOWN' | 'FLAT'>('FLAT');
  const prevPriceRef = useRef<number>(0);

  const [copiedCa, setCopiedCa] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<BubbleMapNode | null>(null);
  const [recordingPred, setRecordingPred] = useState(false);

  const [alertsOpen, setAlertsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [alertEvents, setAlertEvents] = useState<AlertEvent[]>([]);
  const [buyNotifications, setBuyNotifications] = useState<BuyNotificationItem[]>([]);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs>(() =>
    loadSavedNotificationPrefs()
  );
  const [themeColors, setThemeColors] = useState<TerminalThemeColors>(() => loadSavedThemeColors());
  const [glossaryEntries, setGlossaryEntries] = useState<TerminologyEntry[]>(() =>
    loadSavedGlossaryEntries()
  );
  const [lastGlossaryAddedCount, setLastGlossaryAddedCount] = useState<number>(0);
  const [toastNowMs, setToastNowMs] = useState<number>(() => Date.now());
  const lastBuyToastMsRef = useRef<number>(0);

  // Persist layout, theme colors, glossary & notification preferences to localStorage
  useEffect(() => {
    saveLayout(layout);
  }, [layout]);

  useEffect(() => {
    applyThemeCssVars(themeColors);
    saveThemeColors(themeColors);
  }, [themeColors]);

  useEffect(() => {
    saveGlossaryEntries(glossaryEntries);
  }, [glossaryEntries]);

  useEffect(() => {
    saveNotificationPrefs(notificationPrefs);
  }, [notificationPrefs]);

  // Auto-update Glossary whenever new trading/slang words appear in live analysis or social feeds
  const syncGlossaryFromContext = useCallback(() => {
    const detected = extractGlossaryTermsFromContext({
      analysis,
      socialEvents: socialFeed,
    });
    if (detected.length === 0) return;
    setGlossaryEntries((prev) => {
      const { entries, addedCount } = mergeGlossaryEntries(prev, detected);
      if (addedCount > 0) {
        setLastGlossaryAddedCount(addedCount);
      }
      return entries;
    });
  }, [analysis, socialFeed]);

  useEffect(() => {
    syncGlossaryFromContext();
  }, [syncGlossaryFromContext]);

  // 250ms tick while 2.5s pop-up is active (1s thereafter) for 2-minute notification bar
  useEffect(() => {
    if (buyNotifications.length === 0) return;
    const nowInit = Date.now();
    const hasActivePopup =
      notificationPrefs.popupsEnabled &&
      buyNotifications.some((n) => !n.popup_dismissed && n.popup_expires_at_ms > nowInit);
    const intervalMs = hasActivePopup ? 250 : 1000;
    const timer = setInterval(() => {
      const now = Date.now();
      setToastNowMs(now);
      setBuyNotifications((prev) => pruneExpiredBuyNotifications(prev, now));
    }, intervalMs);
    return () => clearInterval(timer);
  }, [buyNotifications, notificationPrefs.popupsEnabled]);

  // Close inline "+ Add Tab" dropdown on outside click
  useEffect(() => {
    if (!addTabOpen) return;
    const onDown = (e: MouseEvent) => {
      if (addTabWrapRef.current && !addTabWrapRef.current.contains(e.target as Node)) {
        setAddTabOpen(false);
      }
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [addTabOpen]);

  // Global pointer drag listeners for panel splitters
  useEffect(() => {
    if (!resizingAxis) return;
    const onMove = (e: PointerEvent) => {
      const ds = dragStateRef.current;
      if (!ds) return;
      if (ds.axis === 'left') {
        const nextW = clampNumber(ds.startVal + (e.clientX - ds.startX), 230, 460, 308);
        setLayout((prev) => ({ ...prev, presetId: 'CUSTOM', leftWidth: nextW }));
      } else if (ds.axis === 'right') {
        const nextW = clampNumber(ds.startVal - (e.clientX - ds.startX), 250, 480, 332);
        setLayout((prev) => ({ ...prev, presetId: 'CUSTOM', rightWidth: nextW }));
      } else if (ds.axis === 'chart') {
        const nextH = clampNumber(ds.startVal + (e.clientY - ds.startY), 200, 580, 335);
        setLayout((prev) => ({ ...prev, presetId: 'CUSTOM', chartHeight: nextH }));
      }
    };
    const onUp = () => {
      dragStateRef.current = null;
      setResizingAxis(null);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [resizingAxis]);

  const startResize = (axis: 'left' | 'right' | 'chart', e: React.PointerEvent) => {
    e.preventDefault();
    const startVal =
      axis === 'left' ? layout.leftWidth : axis === 'right' ? layout.rightWidth : layout.chartHeight;
    dragStateRef.current = {
      axis,
      startX: e.clientX,
      startY: e.clientY,
      startVal,
    };
    setResizingAxis(axis);
  };

  const handleApplyPreset = (presetId: Exclude<LayoutPresetId, 'CUSTOM'>) => {
    const p = LAYOUT_PRESETS[presetId];
    setLayout({ ...p, openTabs: [...p.openTabs] });
  };

  const handleTogglePanel = (panel: 'showScanner' | 'showChart' | 'showLowerPanel' | 'showScorePanel') => {
    setLayout((prev) => ({
      ...prev,
      presetId: 'CUSTOM',
      [panel]: !prev[panel],
    }));
  };

  const handleToggleTab = (tabId: WorkspaceTabId) => {
    setLayout((prev) => {
      const exists = prev.openTabs.includes(tabId);
      if (exists) {
        const nextTabs = prev.openTabs.filter((t) => t !== tabId);
        const nextActive =
          prev.activeTab === tabId ? nextTabs[0] || tabId : prev.activeTab;
        return {
          ...prev,
          presetId: 'CUSTOM',
          openTabs: nextTabs,
          activeTab: nextActive,
        };
      }
      return {
        ...prev,
        presetId: 'CUSTOM',
        showLowerPanel: true,
        openTabs: [...prev.openTabs, tabId],
        activeTab: tabId,
      };
    });
  };

  const handleOpenTab = (tabId: WorkspaceTabId) => {
    setLayout((prev) => ({
      ...prev,
      presetId: 'CUSTOM',
      showLowerPanel: true,
      openTabs: prev.openTabs.includes(tabId) ? prev.openTabs : [...prev.openTabs, tabId],
      activeTab: tabId,
    }));
  };

  const handleRemoveTab = (tabId: WorkspaceTabId) => {
    setLayout((prev) => {
      const nextTabs = prev.openTabs.filter((t) => t !== tabId);
      const nextActive = prev.activeTab === tabId ? nextTabs[0] || tabId : prev.activeTab;
      return {
        ...prev,
        presetId: 'CUSTOM',
        openTabs: nextTabs,
        activeTab: nextActive,
      };
    });
  };

  const handleResetLayout = () => {
    setLayout(resetSavedLayout());
  };

  const handleResetDefaultColors = () => {
    const defaults = resetDefaultThemeColors();
    setThemeColors(defaults);
    applyThemeCssVars(defaults);
  };

  const loadAlerts = useCallback(async () => {
    try {
      const resp = await fetch('/api/alerts');
      const data = await resp.json();
      setAlertRules(data.rules || []);
      setAlertEvents(data.events || []);
    } catch {
      // ignore transient alert load error
    }
  }, []);

  const loadScanner = useCallback(
    async (searchQuery?: string, forceRefresh = false) => {
      setScannerLoading(true);
      try {
        const params = new URLSearchParams({
          mode,
          horizon,
          preset,
          sortBy,
        });
        if (searchQuery) params.set('q', searchQuery);
        if (forceRefresh) params.set('refresh', 'true');
        const resp = await fetch(`/api/scanner?${params.toString()}`);
        const data = await resp.json();
        if (Array.isArray(data.tokens)) {
          const incoming = data.tokens as ScannerTokenSummary[];
          if (seenAddressesRef.current.size > 0) {
            const newlyDiscovered = new Set<string>();
            for (const tok of incoming) {
              if (!seenAddressesRef.current.has(tok.address)) {
                newlyDiscovered.add(tok.address);
              }
            }
            if (newlyDiscovered.size > 0) {
              setNewAddresses(newlyDiscovered);
            }
          }
          for (const tok of incoming) {
            seenAddressesRef.current.add(tok.address);
          }

          setScannerTokens(incoming);
          setRegime(data.regime);
          if (searchQuery && incoming.length > 0) {
            setSelectedAddress(incoming[0].address);
          }
        }
      } catch (err) {
        setErrorBanner(`Scanner unavailable: ${String(err)}`);
      } finally {
        setScannerLoading(false);
        if (autoRefreshSec > 0) {
          setCountdownSec(autoRefreshSec);
        }
      }
    },
    [mode, horizon, preset, sortBy, autoRefreshSec]
  );

  const loadSocialFeed = useCallback(async (targetAddress = selectedAddress) => {
    setSocialLoading(true);
    try {
      const resp = await fetch(`/api/social/${encodeURIComponent(targetAddress)}`);
      const data = await resp.json();
      if (Array.isArray(data.events)) {
        setSocialFeed(data.events);
      }
    } catch {
      // ignore transient social feed fetch errors
    } finally {
      setSocialLoading(false);
    }
  }, [selectedAddress]);

  const loadTokenAnalysis = useCallback(async () => {
    setAnalysisLoading(true);
    setErrorBanner(null);
    setLiveTick(null);
    setRecentTrades([]);
    setSocialFeed([]);
    prevPriceRef.current = 0;
    try {
      const params = new URLSearchParams({
        mode,
        horizon,
        timeframe,
        positionSizeUsd: String(positionSizeUsd),
      });
      const resp = await fetch(`/api/token/${encodeURIComponent(selectedAddress)}?${params.toString()}`);
      const data = await resp.json();
      if (!resp.ok) {
        setErrorBanner(data.error || 'Failed to analyze token address');
        return;
      }
      setAnalysis(data);
      prevPriceRef.current = data.forensics?.price_usd || 0;
      setSelectedWallet(null);
      loadAlerts();
      loadSocialFeed(selectedAddress);
    } catch (err) {
      setErrorBanner(`Analysis error: ${String(err)}`);
    } finally {
      setAnalysisLoading(false);
    }
  }, [selectedAddress, mode, horizon, timeframe, positionSizeUsd, loadAlerts, loadSocialFeed]);

  useEffect(() => {
    loadScanner();
  }, [loadScanner]);

  // Automatic scanner countdown & reload for newly listed Solana pairs
  useEffect(() => {
    if (autoRefreshSec <= 0 || activeView !== 'TERMINAL') {
      setCountdownSec(autoRefreshSec);
      return;
    }
    setCountdownSec(autoRefreshSec);
    const timer = setInterval(() => {
      setCountdownSec((prev) => {
        if (prev <= 1) {
          void loadScanner(undefined, true);
          return autoRefreshSec;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [autoRefreshSec, activeView, loadScanner]);

  useEffect(() => {
    loadTokenAnalysis();
  }, [loadTokenAnalysis]);

  // Real-Time SSE Candle, Orderflow & Social Tracker Stream (/api/stream/:address)
  useEffect(() => {
    if (!streaming || !selectedAddress || activeView !== 'TERMINAL') return;

    const url = `/api/stream/${encodeURIComponent(selectedAddress)}?timeframe=${encodeURIComponent(timeframe)}`;
    const es = new EventSource(url);

    const onTick = (evt: MessageEvent) => {
      try {
        const tick = JSON.parse(evt.data) as LiveMarketTick;
        setLiveTick(tick);

        if (prevPriceRef.current > 0) {
          if (tick.price_usd > prevPriceRef.current) setPricePulse('UP');
          else if (tick.price_usd < prevPriceRef.current) setPricePulse('DOWN');
        }
        prevPriceRef.current = tick.price_usd;

        if (tick.trade) {
          setRecentTrades((prev) => [tick.trade!, ...prev].slice(0, 45));
          if (tick.trade.side === 'BUY') {
            const now = Date.now();
            if (now - lastBuyToastMsRef.current >= 3000) {
              lastBuyToastMsRef.current = now;
              setToastNowMs(now);
              const nextNotice: BuyNotificationItem = {
                id: `buy_toast_${tick.trade.id}`,
                address: tick.address,
                symbol: tick.symbol,
                price_usd: tick.trade.price_usd,
                amount_usd: tick.trade.amount_usd,
                maker_short: tick.trade.maker_short,
                source: tick.trade.source,
                created_at_ms: now,
                popup_expires_at_ms: now + BUY_POPUP_TTL_MS,
                expires_at_ms: now + BUY_NOTIFICATION_TTL_MS,
                popup_dismissed: !notificationPrefs.popupsEnabled,
              };
              setBuyNotifications((prev) =>
                [nextNotice, ...pruneExpiredBuyNotifications(prev, now)].slice(0, 20)
              );
            }
          }
        }
        if (tick.social_event && socialStreaming) {
          setSocialFeed((prev) => [tick.social_event!, ...prev].slice(0, 40));
        }
      } catch {
        // ignore malformed tick packet
      }
    };

    es.addEventListener('tick', onTick);

    return () => {
      es.removeEventListener('tick', onTick);
      es.close();
    };
  }, [selectedAddress, timeframe, streaming, activeView, socialStreaming, notificationPrefs.popupsEnabled]);

  const handleTokenSearch = (queryOrAddress: string) => {
    const clean = queryOrAddress.trim();
    if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(clean)) {
      setSelectedAddress(clean);
      setActiveView('TERMINAL');
    } else {
      loadScanner(clean);
      setActiveView('TERMINAL');
    }
  };

  const handleRecordPrediction = async () => {
    if (!analysis) return;
    setRecordingPred(true);
    try {
      const resp = await fetch('/api/predictions/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: analysis.forensics.address,
          mode,
          horizon,
        }),
      });
      const data = await resp.json();
      if (data.predictions) {
        setAnalysis((prev) => (prev ? { ...prev, historical_predictions: data.predictions } : prev));
        handleOpenTab('CHECKLIST_PREDICTIONS');
      }
    } finally {
      setRecordingPred(false);
    }
  };

  const handleEvaluateOutcome = async (predictionId: string) => {
    const resp = await fetch(`/api/predictions/${encodeURIComponent(predictionId)}/evaluate`, {
      method: 'POST',
    });
    const data = await resp.json();
    if (data.predictions) {
      setAnalysis((prev) => (prev ? { ...prev, historical_predictions: data.predictions } : prev));
    }
  };

  const handleSubmitOverride = async (
    userDecision: HumanOverrideRecord['user_decision'],
    reason: string
  ) => {
    if (!analysis) return;
    const resp = await fetch('/api/overrides', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token_address: analysis.forensics.address,
        symbol: analysis.forensics.symbol,
        model_state: analysis.score_panel.action_state,
        user_decision: userDecision,
        reason,
      }),
    });
    const data = await resp.json();
    if (data.overrides) {
      setAnalysis((prev) => (prev ? { ...prev, human_overrides: data.overrides } : prev));
    }
  };

  const handleCopyCa = () => {
    if (!analysis) return;
    navigator.clipboard?.writeText(analysis.forensics.address).catch(() => undefined);
    setCopiedCa(true);
    setTimeout(() => setCopiedCa(false), 1500);
  };

  const unreadAlertsCount = alertEvents.filter((e) => !e.acknowledged).length;

  const activeTick = liveTick && analysis && liveTick.address === analysis.forensics.address ? liveTick : null;
  const win5m = analysis?.volume.windows.find((w) => w.timeframe === '5M');
  const livePrice = activeTick ? activeTick.price_usd : analysis?.forensics.price_usd ?? 0;
  const liveChange1h = activeTick ? activeTick.price_change_1h : analysis?.forensics.price_change_1h ?? 0;
  const liveLiq = activeTick ? activeTick.liquidity_usd : analysis?.liquidity.current_liquidity_usd ?? 0;
  const liveMc = activeTick ? activeTick.market_cap_usd : analysis?.forensics.market_cap_usd ?? 0;
  const liveVol24 = activeTick ? activeTick.volume_24h_usd : analysis?.volume.reported_volume_24h_usd ?? 0;
  const liveBuys5m = activeTick ? activeTick.buys_5m : win5m?.buy_count ?? 24;
  const liveSells5m = activeTick ? activeTick.sells_5m : win5m?.sell_count ?? 18;

  const hiddenTabs = WORKSPACE_TABS_META.filter((t) => !layout.openTabs.includes(t.id));
  const anyPanelHidden =
    !layout.showScanner || !layout.showChart || !layout.showLowerPanel || !layout.showScorePanel;

  return (
    <div
      className={`h-screen w-screen flex flex-col bg-[#07080C] text-slate-100 overflow-hidden ${
        resizingAxis ? 'select-none' : ''
      }`}
    >
      <TopBar
        mode={mode}
        onModeChange={setMode}
        horizon={horizon}
        onHorizonChange={setHorizon}
        activeView={activeView}
        onViewChange={setActiveView}
        onTokenSearch={handleTokenSearch}
        unreadAlertsCount={unreadAlertsCount}
        activeBuyBarCount={buyNotifications.length}
        onOpenAlerts={() => setAlertsOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        dataStatus={analysis?.forensics.data_status || 'LOADING'}
        streaming={streaming}
      />

      {activeView === 'MODEL_CENTER' ? (
        <ModelUpdateCenter />
      ) : (
        <main className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
          {/* Left: Resizable & Collapsible Padre Trenches / Market Scanner */}
          {layout.showScanner && (
            <>
              <TokenScanner
                tokens={scannerTokens}
                selectedAddress={selectedAddress}
                onSelectToken={(addr) => setSelectedAddress(addr)}
                preset={preset}
                onPresetChange={setPreset}
                sortBy={sortBy}
                onSortChange={setSortBy}
                loading={scannerLoading}
                onRefresh={() => loadScanner(undefined, true)}
                autoRefreshSec={autoRefreshSec}
                onAutoRefreshChange={setAutoRefreshSec}
                countdownSec={countdownSec}
                newAddresses={newAddresses}
                regime={regime}
                widthPx={layout.leftWidth}
                onCollapse={() => handleTogglePanel('showScanner')}
              />

              {/* Left Column Drag Handle */}
              <div
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize scanner column"
                onPointerDown={(e) => startResize('left', e)}
                className={`hidden lg:flex w-1.5 shrink-0 cursor-col-resize items-center justify-center border-r border-[#1E2330] transition-colors ${
                  resizingAxis === 'left' ? 'bg-[#7C5CFF]/60' : 'bg-[#090B10] hover:bg-[#7C5CFF]/40'
                }`}
                title="Drag to resize scanner width"
              >
                <span className="w-0.5 h-8 rounded-full bg-slate-700" />
              </div>
            </>
          )}

          {/* Center: Padre Token Header + Resizable Chart + Modular Tabbed Workspace */}
          <div className="flex-1 flex flex-col min-w-0 lg:overflow-y-auto bg-[#08090D]">
            {errorBanner && (
              <div className="m-3 px-3 py-2 rounded-sm border border-[#FF4D6A]/40 bg-[#FF4D6A]/10 text-xs text-rose-200">
                {errorBanner}
              </div>
            )}

            {/* Quick Panel Restore Strip when any panel is hidden */}
            {anyPanelHidden && (
              <div className="px-3 py-1 border-b border-[#1E2330] bg-[#090B10] flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
                <span className="text-slate-500 mr-1">Collapsed:</span>
                {!layout.showScanner && (
                  <button
                    type="button"
                    onClick={() => handleTogglePanel('showScanner')}
                    className="px-2 py-0.5 rounded-sm border border-[#1E2330] bg-[#12151E] hover:border-[#7C5CFF]/50 text-slate-300 inline-flex items-center gap-1"
                  >
                    <PanelLeftOpen className="w-3 h-3 text-[#9D7BFF]" />
                    Show Scanner
                  </button>
                )}
                {!layout.showChart && (
                  <button
                    type="button"
                    onClick={() => handleTogglePanel('showChart')}
                    className="px-2 py-0.5 rounded-sm border border-[#1E2330] bg-[#12151E] hover:border-[#7C5CFF]/50 text-slate-300 inline-flex items-center gap-1"
                  >
                    <Maximize2 className="w-3 h-3 text-[#9D7BFF]" />
                    Show Chart
                  </button>
                )}
                {!layout.showLowerPanel && (
                  <button
                    type="button"
                    onClick={() => handleTogglePanel('showLowerPanel')}
                    className="px-2 py-0.5 rounded-sm border border-[#1E2330] bg-[#12151E] hover:border-[#7C5CFF]/50 text-slate-300 inline-flex items-center gap-1"
                  >
                    <Maximize2 className="w-3 h-3 text-[#9D7BFF]" />
                    Show Analysis Tabs
                  </button>
                )}
                {!layout.showScorePanel && (
                  <button
                    type="button"
                    onClick={() => handleTogglePanel('showScorePanel')}
                    className="px-2 py-0.5 rounded-sm border border-[#1E2330] bg-[#12151E] hover:border-[#7C5CFF]/50 text-slate-300 inline-flex items-center gap-1"
                  >
                    <PanelRightOpen className="w-3 h-3 text-[#9D7BFF]" />
                    Show Risk Panel
                  </button>
                )}
              </div>
            )}

            {analysisLoading && !analysis ? (
              <div className="p-6 space-y-4">
                <div className="h-72 bg-[#12151E] rounded-sm animate-pulse" />
                <div className="h-48 bg-[#12151E] rounded-sm animate-pulse" />
              </div>
            ) : analysis ? (
              <>
                {/* Padre-Style Token Header Strip */}
                <div className="px-3 py-2 border-b border-[#1E2330] bg-[#0C0E14] flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-8 h-8 rounded-sm border border-[#7C5CFF]/50 bg-[#7C5CFF]/20 text-[#C4B5FD] font-mono font-bold text-xs flex items-center justify-center shrink-0">
                      {analysis.forensics.symbol.replace('$', '').slice(0, 3)}
                    </span>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h1 className="font-display text-sm font-bold text-slate-100">
                          {analysis.forensics.symbol}
                        </h1>
                        <span className="text-xs text-slate-400 truncate max-w-[140px]">
                          {analysis.forensics.name}
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyCa}
                          className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-400 hover:text-slate-200"
                          title={analysis.forensics.address}
                        >
                          <span>
                            {analysis.forensics.address.slice(0, 4)}...{analysis.forensics.address.slice(-4)}
                          </span>
                          {copiedCa ? (
                            <Check className="w-3 h-3 text-[#00E599]" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                        {analysis.forensics.social_links.x && (
                          <a
                            href={analysis.forensics.social_links.x}
                            target="_blank"
                            rel="noreferrer"
                            className="text-slate-400 hover:text-[#C4B5FD]"
                            title="X / Twitter"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>

                      {/* Quick Padre Audit Micro-Strip */}
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10px] font-mono text-slate-400 mt-0.5 tabular-nums">
                        <span className="uppercase text-[#C4B5FD]">{analysis.forensics.primary_dex}</span>
                        <span className="inline-flex items-center gap-0.5">
                          {analysis.forensics.contract_attributes.mint_authority_revoked ? (
                            <ShieldCheck className="w-3 h-3 text-[#00E599]" />
                          ) : (
                            <ShieldX className="w-3 h-3 text-[#FF4D6A]" />
                          )}
                          Mint
                        </span>
                        <span className="inline-flex items-center gap-0.5">
                          {analysis.forensics.contract_attributes.freeze_authority_revoked ? (
                            <ShieldCheck className="w-3 h-3 text-[#00E599]" />
                          ) : (
                            <ShieldX className="w-3 h-3 text-[#FF4D6A]" />
                          )}
                          Freeze
                        </span>
                        <span>LP {analysis.liquidity.lp_status}</span>
                        <span>Top10 {analysis.holders.top_10_concentration_pct}%</span>
                        <span>Bundle {analysis.holders.bundle_analysis.combined_supply_pct}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Live Price & Telemetry Strip */}
                  <div className="flex flex-wrap items-center gap-3.5 font-mono text-xs tabular-nums">
                    <span
                      key={liveTick?.timestamp_ms || 'init'}
                      className={`px-1.5 py-0.5 rounded-sm font-bold text-slate-100 ${
                        pricePulse === 'UP'
                          ? 'flash-up text-[#00E599]'
                          : pricePulse === 'DOWN'
                          ? 'flash-down text-[#FF4D6A]'
                          : ''
                      }`}
                    >
                      ${livePrice}
                    </span>

                    <span
                      className={`inline-flex items-center gap-1 font-semibold ${
                        liveChange1h >= 0 ? 'text-[#00E599]' : 'text-[#FF4D6A]'
                      }`}
                    >
                      {liveChange1h >= 0 ? (
                        <ArrowUp className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      )}
                      1H {liveChange1h >= 0 ? '+' : ''}
                      {liveChange1h.toFixed(1)}%
                    </span>

                    <span className="text-slate-400">
                      MC <strong className="text-slate-200">{formatCompactUsd(liveMc)}</strong>
                    </span>
                    <span className="text-slate-400">
                      Liq <strong className="text-slate-200">{formatCompactUsd(liveLiq)}</strong>
                    </span>
                    <span className="text-slate-400 hidden sm:inline">
                      Vol <strong className="text-slate-200">{formatCompactUsd(liveVol24)}</strong>
                    </span>
                  </div>
                </div>

                {/* Resizable & Collapsible Live Moving Candlestick Chart Engine */}
                {layout.showChart && (
                  <>
                    <BriggChart
                      chart={analysis.chart}
                      symbol={analysis.forensics.symbol}
                      address={analysis.forensics.address}
                      timeframe={timeframe}
                      onTimeframeChange={setTimeframe}
                      liveTick={liveTick}
                      streaming={streaming}
                      onToggleStreaming={() => setStreaming((s) => !s)}
                      marketCapUsd={analysis.forensics.market_cap_usd}
                      spotPriceUsd={analysis.forensics.price_usd}
                      heightPx={layout.chartHeight}
                      onCollapse={() => handleTogglePanel('showChart')}
                    />

                    {/* Horizontal Drag Handle between Chart & Lower Workspace */}
                    {layout.showLowerPanel && (
                      <div
                        role="separator"
                        aria-orientation="horizontal"
                        aria-label="Resize chart height"
                        onPointerDown={(e) => startResize('chart', e)}
                        className={`hidden lg:flex h-1.5 w-full shrink-0 cursor-row-resize items-center justify-center border-b border-[#1E2330] transition-colors ${
                          resizingAxis === 'chart'
                            ? 'bg-[#7C5CFF]/60'
                            : 'bg-[#090B10] hover:bg-[#7C5CFF]/40'
                        }`}
                        title="Drag to resize chart height"
                      >
                        <span className="h-0.5 w-12 rounded-full bg-slate-700" />
                      </div>
                    )}
                  </>
                )}

                {/* Modular, Add/Remove/Toggleable Bottom Intelligence Dock */}
                {layout.showLowerPanel && (
                  <div className="flex flex-col flex-1 min-h-0">
                    <div className="border-b border-[#1E2330] bg-[#0C0E14] px-3 py-1 flex items-center justify-between gap-2 shrink-0">
                      <div className="flex items-center gap-1 overflow-x-auto min-w-0">
                        {layout.openTabs.map((id) => {
                          const meta = WORKSPACE_TABS_META.find((t) => t.id === id);
                          if (!meta) return null;
                          const isActive = layout.activeTab === id;
                          return (
                            <div
                              key={id}
                              className={`inline-flex items-center rounded-sm border text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                                isActive
                                  ? 'bg-[#7C5CFF]/20 text-[#C4B5FD] border-[#7C5CFF]/50'
                                  : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-[#141824]'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  setLayout((prev) => ({ ...prev, activeTab: id }))
                                }
                                className="px-2.5 py-1.5 text-left whitespace-nowrap"
                              >
                                {meta.label}
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveTab(id);
                                }}
                                className="pr-1.5 pl-0.5 py-1.5 text-slate-500 hover:text-slate-100"
                                title={`Hide ${meta.label} tab`}
                                aria-label={`Hide ${meta.label} tab`}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        })}

                        {/* Inline + Add / Toggle Tab Control */}
                        <div ref={addTabWrapRef} className="relative shrink-0">
                          <button
                            type="button"
                            onClick={() => setAddTabOpen((v) => !v)}
                            className="px-2 py-1.5 text-xs font-mono text-slate-300 hover:text-white bg-[#12151E] border border-[#1E2330] hover:border-[#7C5CFF]/50 rounded-sm inline-flex items-center gap-1 whitespace-nowrap"
                            title="Add or toggle workspace tabs"
                          >
                            <Plus className="w-3 h-3 text-[#9D7BFF]" />
                            <span>Tab</span>
                          </button>

                          {addTabOpen && (
                            <div className="absolute left-0 mt-1 w-64 rounded-sm border border-[#282F42] bg-[#0C0E14] shadow-2xl z-40 p-1.5 space-y-0.5 text-xs">
                              <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-400">
                                Toggle Tabs & Widgets
                              </div>
                              {WORKSPACE_TABS_META.map((tab) => {
                                const enabled = layout.openTabs.includes(tab.id);
                                return (
                                  <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => handleToggleTab(tab.id)}
                                    className="w-full px-2 py-1.5 rounded-sm hover:bg-[#171B26] flex items-center justify-between gap-2 text-left"
                                  >
                                    <span className={enabled ? 'text-slate-100' : 'text-slate-400'}>
                                      {tab.label}
                                    </span>
                                    <span className="font-mono text-[10px]">
                                      {enabled ? (
                                        <span className="text-[#00E599]">ON</span>
                                      ) : (
                                        <span className="text-slate-500">+ ADD</span>
                                      )}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleTogglePanel('showLowerPanel')}
                        className="p-1 rounded-sm border border-[#1E2330] bg-[#12151E] hover:bg-[#1B202E] text-slate-400 hover:text-slate-200 shrink-0"
                        title="Collapse lower analysis area"
                        aria-label="Collapse lower analysis area"
                      >
                        <Minimize2 className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="p-3.5">
                      {layout.openTabs.length === 0 ? (
                        <div className="p-8 rounded-sm border border-dashed border-[#282F42] bg-[#0C0E14] text-center space-y-2.5 text-xs">
                          <div className="text-slate-300 font-medium">All workspace tabs are hidden.</div>
                          <div className="flex flex-wrap items-center justify-center gap-2">
                            {hiddenTabs.slice(0, 4).map((t) => (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => handleOpenTab(t.id)}
                                className="px-2.5 py-1 rounded-sm border border-[#1E2330] bg-[#12151E] hover:border-[#7C5CFF]/60 text-slate-200 inline-flex items-center gap-1"
                              >
                                <Plus className="w-3 h-3 text-[#9D7BFF]" />
                                {t.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <>
                          {layout.activeTab === 'GRAPH' && (
                            <BriggChart
                              chart={analysis.chart}
                              symbol={analysis.forensics.symbol}
                              address={analysis.forensics.address}
                              timeframe={timeframe}
                              onTimeframeChange={setTimeframe}
                              liveTick={liveTick}
                              streaming={streaming}
                              onToggleStreaming={() => setStreaming((s) => !s)}
                              marketCapUsd={analysis.forensics.market_cap_usd}
                              spotPriceUsd={analysis.forensics.price_usd}
                              heightPx={360}
                            />
                          )}
                          {layout.activeTab === 'ANALYSIS' && (
                            <AnalysisOverviewPanel
                              analysis={analysis}
                              onOpenTab={handleOpenTab}
                            />
                          )}
                          {layout.activeTab === 'HOLDERS' && (
                            <HoldersIntelligencePanel
                              holders={analysis.holders}
                              bubbleMap={analysis.bubble_map}
                              selectedWallet={selectedWallet}
                              onSelectWallet={setSelectedWallet}
                            />
                          )}
                          {layout.activeTab === 'TRADES' && (
                            <LiveTradesTape
                              trades={recentTrades}
                              symbol={analysis.forensics.symbol}
                              buys5m={liveBuys5m}
                              sells5m={liveSells5m}
                              streaming={streaming}
                            />
                          )}
                          {layout.activeTab === 'SOCIAL_TRACKER' && (
                            <LiveSocialTracker
                              symbol={analysis.forensics.symbol}
                              events={socialFeed}
                              social={analysis.social}
                              streaming={streaming && socialStreaming}
                              onToggleStreaming={() => setSocialStreaming((v) => !v)}
                              onRefresh={() => loadSocialFeed(analysis.forensics.address)}
                              loading={socialLoading}
                            />
                          )}
                          {layout.activeTab === 'BUBBLE_2D' && (
                            <BubbleMap2D
                              graph={analysis.bubble_map}
                              selectedWallet={selectedWallet}
                              onSelectWallet={setSelectedWallet}
                            />
                          )}
                          {layout.activeTab === 'BUBBLE_3D' && (
                            <BubbleMap3D
                              graph={analysis.bubble_map}
                              selectedWallet={selectedWallet}
                              onSelectWallet={setSelectedWallet}
                            />
                          )}
                          {layout.activeTab === 'FORENSICS' && <ForensicsPanel analysis={analysis} />}
                          {layout.activeTab === 'LIQUIDITY_VOLUME' && (
                            <LiquidityVolumePanel
                              liquidity={analysis.liquidity}
                              volume={analysis.volume}
                              slippage={analysis.slippage}
                              positionSizeUsd={positionSizeUsd}
                              onPositionSizeChange={setPositionSizeUsd}
                            />
                          )}
                          {layout.activeTab === 'SOCIAL_RISK' && (
                            <SocialNarrativePanel
                              social={analysis.social}
                              risk={analysis.risk}
                              symbol={analysis.forensics.symbol}
                              socialEvents={socialFeed}
                              socialStreaming={streaming && socialStreaming}
                              onToggleSocialStreaming={() => setSocialStreaming((v) => !v)}
                              onRefreshSocial={() => loadSocialFeed(analysis.forensics.address)}
                              socialLoading={socialLoading}
                            />
                          )}
                          {layout.activeTab === 'CHECKLIST_PREDICTIONS' && (
                            <ChecklistAndPredictionsPanel
                              checklist={analysis.checklist}
                              predictions={analysis.historical_predictions}
                              overrides={analysis.human_overrides}
                              onEvaluateOutcome={handleEvaluateOutcome}
                            />
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>

          {/* Right: Resizable & Collapsible Padre Execution & Brigg Intelligence Sidebar */}
          {analysis && layout.showScorePanel && (
            <>
              {/* Right Column Drag Handle */}
              <div
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize risk and opportunity panel"
                onPointerDown={(e) => startResize('right', e)}
                className={`hidden lg:flex w-1.5 shrink-0 cursor-col-resize items-center justify-center border-l border-[#1E2330] transition-colors ${
                  resizingAxis === 'right' ? 'bg-[#7C5CFF]/60' : 'bg-[#090B10] hover:bg-[#7C5CFF]/40'
                }`}
                title="Drag to resize risk/opportunity panel width"
              >
                <span className="w-0.5 h-8 rounded-full bg-slate-700" />
              </div>

              <ScorePanel
                panel={analysis.score_panel}
                buys5m={liveBuys5m}
                sells5m={liveSells5m}
                onRecordPrediction={handleRecordPrediction}
                onSubmitOverride={handleSubmitOverride}
                recording={recordingPred}
                widthPx={layout.rightWidth}
                onCollapse={() => handleTogglePanel('showScorePanel')}
              />
            </>
          )}
        </main>
      )}

      <AlertsDrawer
        open={alertsOpen}
        onClose={() => setAlertsOpen(false)}
        rules={alertRules}
        events={alertEvents}
        buyNotifications={buyNotifications}
        nowMs={toastNowMs}
        notificationPrefs={notificationPrefs}
        onChangeNotificationPrefs={setNotificationPrefs}
        onDeleteBuyNotification={(id) =>
          setBuyNotifications((prev) => removeBuyNotificationById(prev, id))
        }
        onClearAllBuyNotifications={() => setBuyNotifications([])}
        onSelectToken={(addr) => {
          setSelectedAddress(addr);
          setActiveView('TERMINAL');
        }}
        onCreateRule={async (input) => {
          await fetch('/api/alerts/rules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
          });
          await loadAlerts();
        }}
        onAcknowledge={async (id) => {
          await fetch(`/api/alerts/${encodeURIComponent(id)}/ack`, { method: 'POST' });
          await loadAlerts();
        }}
      />

      <SettingsObservabilityModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        layout={layout}
        onApplyPreset={handleApplyPreset}
        onTogglePanel={handleTogglePanel}
        onToggleTab={handleToggleTab}
        onResetLayout={handleResetLayout}
        themeColors={themeColors}
        onChangeThemeColors={setThemeColors}
        onResetDefaultColors={handleResetDefaultColors}
        glossaryEntries={glossaryEntries}
        lastGlossaryAddedCount={lastGlossaryAddedCount}
        onAddGlossaryTerm={(input) => {
          setGlossaryEntries((prev) => addCustomGlossaryTerm(prev, input));
          setLastGlossaryAddedCount(1);
        }}
        onRemoveGlossaryTerm={(term) =>
          setGlossaryEntries((prev) => removeGlossaryTerm(prev, term))
        }
        onSyncGlossary={syncGlossaryFromContext}
        notificationPrefs={notificationPrefs}
        onChangeNotificationPrefs={setNotificationPrefs}
        activeBuyBarCount={buyNotifications.length}
        onClearAllBuyNotifications={() => setBuyNotifications([])}
      />

      <BuyNotificationStack
        notifications={buyNotifications}
        nowMs={toastNowMs}
        enabled={notificationPrefs.popupsEnabled}
        position={notificationPrefs.position}
        onDismissPopup={(id) =>
          setBuyNotifications((prev) => dismissPopupNotificationById(prev, id))
        }
        onHideAllPopups={() =>
          setNotificationPrefs((prev) => ({ ...prev, popupsEnabled: false }))
        }
        onDelete={(id) => setBuyNotifications((prev) => removeBuyNotificationById(prev, id))}
        onOpenNotificationBar={() => setAlertsOpen(true)}
        onSelectToken={(addr) => {
          setSelectedAddress(addr);
          setActiveView('TERMINAL');
        }}
      />
      {activeView === 'TERMINAL' && analysis && (
        <BottomUtilityBar
          symbol={analysis.forensics.symbol}
          holders={analysis.holders}
          bubbleMap={analysis.bubble_map}
          selectedWallet={selectedWallet}
          onSelectWallet={setSelectedWallet}
          social={analysis.social}
          socialEvents={socialFeed}
          socialStreaming={socialStreaming}
          onToggleSocialStreaming={() => setSocialStreaming((v) => !v)}
          onRefreshSocial={() => loadSocialFeed(analysis.forensics.address)}
          socialLoading={socialLoading}
          streaming={streaming}
          onOpenWorkspaceTab={handleOpenTab}
        />
      )}
    </div>
  );
}
