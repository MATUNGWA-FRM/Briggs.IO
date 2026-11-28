export interface TerminalGuideSection {
  id: string;
  number: string;
  title: string;
  category: 'DISCOVERY' | 'CHARTING' | 'SCORING' | 'EXECUTION_CONTEXT';
  diagramKey:
    | 'SCANNER'
    | 'HEADER'
    | 'STATUS'
    | 'CHART'
    | 'TIMEFRAMES'
    | 'INDICATORS'
    | 'OBJECTS'
    | 'ACTION_STATE'
    | 'LIVE_SIGNAL'
    | 'OPPORTUNITY'
    | 'RISK'
    | 'CONFIDENCE'
    | 'EXEC_QUALITY'
    | 'CALIBRATED_PROB'
    | 'REGIME'
    | 'WHY_OPP'
    | 'PUMP_DUMP'
    | 'FLOW'
    | 'LIQUIDITY'
    | 'WALLETS'
    | 'FULLSCREEN'
    | 'ALERTS';
  whatItIs: string;
  whatItMeans: string;
  howBriggCalculates: string;
  example: string;
  payAttentionTo: string;
}

export interface VideoTutorialLesson {
  id: string;
  title: string;
  durationSec: number;
  level: 'Beginner' | 'Intermediate';
  summary: string;
  steps: Array<{
    atSec: number;
    heading: string;
    caption: string;
    highlightArea: string;
  }>;
  writtenGuide: string[];
}

export interface MlGuideTopic {
  id: string;
  number: string;
  title: string;
  pipelineStep: 'DATA' | 'FEATURES' | 'MODEL' | 'VALIDATION' | 'OUTCOME' | 'GOVERNANCE';
  explainToMe: string;
  technicalDetail: string;
  formulaOrFlow: string;
  example: string;
}

export const TERMINAL_GUIDE_SECTIONS: TerminalGuideSection[] = [
  {
    id: 'scanner',
    number: '01',
    title: 'Scanner',
    category: 'DISCOVERY',
    diagramKey: 'SCANNER',
    whatItIs: 'The left-side live discovery feed ("Trenches · Scanner") showing qualifying Solana pairs.',
    whatItMeans: 'Tokens are automatically grouped into Shitcoins (<= 3 days old + ML verified) and Memecoins (> 1 month old + ML verified).',
    howBriggCalculates: 'Fetches live DexScreener pairs, computes Opportunity, Risk, Confidence, and removes stale/invalid pairs automatically.',
    example: 'In Shitcoin mode, newly launched <=3d tokens appear with Opp/Risk scores and age badges like "42m" or "18h".',
    payAttentionTo: 'Watch age, Liquidity (L), and whether stale pairs were recently replaced.',
  },
  {
    id: 'token-header',
    number: '02',
    title: 'Token Header',
    category: 'DISCOVERY',
    diagramKey: 'HEADER',
    whatItIs: 'The top strip above the chart displaying symbol, contract address (CA), DEX venue, Mint/Freeze safety, price, MC, Liquidity, and 24H volume.',
    whatItMeans: 'Gives an instant contract & market sanity check before you read candles.',
    howBriggCalculates: 'Combines live price ticks with on-chain authority flags (Mint revoked, Freeze revoked, LP status, Top 10%, Bundles).',
    example: 'BONK · raydium · Mint ✓ · Freeze ✓ · LP BURNED · $0.0000241 · MC $1.72B.',
    payAttentionTo: 'Never ignore active Mint/Freeze flags or sudden LP drops.',
  },
  {
    id: 'token-status',
    number: '03',
    title: 'Token Status',
    category: 'DISCOVERY',
    diagramKey: 'STATUS',
    whatItIs: 'The REAL / DERIVED / MOCK badge and LIVE / PAUSED stream state shown in the header and chart.',
    whatItMeans: 'Tells you honestly whether numbers come from live market APIs or offline fallback fixtures.',
    howBriggCalculates: 'Tracks provider response status, ingestion delay, and seconds since the last verified market update.',
    example: '[REAL] means DexScreener returned live data; [MOCK] indicates offline fallback data — never mistake fallback for live quotes.',
    payAttentionTo: 'Wait for [REAL] or [LIVE FLOW] before acting on short timeframes.',
  },
  {
    id: 'chart',
    number: '04',
    title: 'Chart',
    category: 'CHARTING',
    diagramKey: 'CHART',
    whatItIs: 'The central TradingView-style canvas supporting Candlestick, Line, and Area modes, with Token Price or Market Cap (MC) Y-axis.',
    whatItMeans: 'Visualizes historical price/MC action alongside real-time SSE ticks.',
    howBriggCalculates: 'Constructs aligned OHLCV candles from DexScreener telemetry and appends live orderflow ticks continuously.',
    example: 'Switch Price ↔ MC to judge psychological market-cap milestones (like $100K or $1M MC).',
    payAttentionTo: 'Large wicks with thin volume indicate low-liquidity spikes rather than real support.',
  },
  {
    id: 'timeframes',
    number: '05',
    title: 'Timeframes',
    category: 'CHARTING',
    diagramKey: 'TIMEFRAMES',
    whatItIs: 'Bar duration controls: 1S (1-second), 1M, 5M, 15M, 1H, 4H, 24H.',
    whatItMeans: 'Controls how much time each candle represents — 1S/1M for fast sniper entries, 1H/4H/24H for Memecoin structure.',
    howBriggCalculates: 'Aggregates candle buckets at the selected interval and adjusts the live stream cadence (1000ms on 1S).',
    example: 'Use 1S or 1M when scalping fresh <=3d Shitcoins; use 1H or 4H when checking >30d Memecoin trends.',
    payAttentionTo: 'Always verify the higher timeframe trend before trusting a 1S breakout.',
  },
  {
    id: 'indicators',
    number: '06',
    title: 'Indicators',
    category: 'CHARTING',
    diagramKey: 'INDICATORS',
    whatItIs: 'Technical overlays and momentum gauges: EMA 9, EMA 21, VWAP, Bollinger Bands (BB), RSI (14), MACD, and Volume.',
    whatItMeans: 'Measures trend direction, fair intraday value (VWAP), volatility bands, and overbought/oversold exhaustion.',
    howBriggCalculates: 'Computed server-side over the candle series and updated live as new price ticks stream in.',
    example: 'EMA9 crossing above EMA21 while price reclaims VWAP on rising volume confirms short-term momentum.',
    payAttentionTo: 'RSI > 75 warns buyers may be chasing late; watch for exhaustion wicks.',
  },
  {
    id: 'chart-objects',
    number: '07',
    title: 'Chart Objects',
    category: 'CHARTING',
    diagramKey: 'OBJECTS',
    whatItIs: 'The collapsible "Objects (N)" manager containing Measure %, H-Line, Trendline, Ray, Fib Retracement, and Buy/Sell/Alert pins.',
    whatItMeans: 'Lets you annotate levels and measure % price moves without cluttering the screen.',
    howBriggCalculates: 'Saves anchor coordinates (timestamp + canonical token price) per token so objects stay pinned even if you switch Price ↔ MC.',
    example: 'Click Measure % and select a swing low and swing high to see +42.5% move, dollar/MC delta, and bar count.',
    payAttentionTo: 'Use the Eye toggle inside Objects to hide annotations when reading raw candlesticks.',
  },
  {
    id: 'action-state',
    number: '08',
    title: 'Action State',
    category: 'SCORING',
    diagramKey: 'ACTION_STATE',
    whatItIs: 'Brigg’s primary ML analytical classification: HIGH-RISK OPPORTUNITY, WATCH, CONFIRMATION REQUIRED, WAIT, or NO-TRADE.',
    whatItMeans: 'Summarizes whether risk-adjusted setup conditions justify attention, caution, or standing aside completely.',
    howBriggCalculates: 'Combines Opportunity Score, Risk Score, Pre-Trade Checklist gates, Confidence %, and mandatory No-Trade triggers.',
    example: 'HIGH-RISK OPPORTUNITY means strong upside setup WITH real speculative risk — it is NOT an automatic BUY button.',
    payAttentionTo: 'Action State never turns into BUY/SELL; when NO-TRADE triggers, protect capital first.',
  },
  {
    id: 'live-signal',
    number: '09',
    title: 'Live Signal',
    category: 'SCORING',
    diagramKey: 'LIVE_SIGNAL',
    whatItIs: 'An optional real-time directional signal layer (BUY, HOLD, PARTIAL SELL, SELL) that users toggle ON/OFF in Settings.',
    whatItMeans: 'Live Signal is a separate, optional real-time directional layer evaluating current market conditions — NOT the same as Action State or Opportunity Score.',
    howBriggCalculates: 'Re-evaluates 5M buy/sell flow, EMA/VWAP trend, RSI, liquidity health, and volatility every time fresh market ticks arrive.',
    example: 'Action State can say HIGH-RISK OPPORTUNITY (77/100) while Live Signal shows HOLD (64%) if 5M buyers pause.',
    payAttentionTo: 'Read the timestamp ("Updated: HH:MM:SS") and "Why" feature bullets rather than following any badge blindly.',
  },
  {
    id: 'opportunity-score',
    number: '10',
    title: 'Opportunity Score',
    category: 'SCORING',
    diagramKey: 'OPPORTUNITY',
    whatItIs: 'A 0–100 composite score measuring how favorable the current setup looks across Brigg’s strategy and ML ensemble.',
    whatItMeans: 'Considers Momentum, Volume, Liquidity, Wallet distribution, Social velocity, Execution quality, and Market Regime.',
    howBriggCalculates: 'Blends deterministic Brigg rules (45%) with 8 ML sub-models (55%) at prediction timestamp T.',
    example: 'Opportunity 77/100 means strong structural alignment — NOT automatic BUY if Risk Score is 82 or Liquidity is thin.',
    payAttentionTo: 'Always read Opportunity Score side-by-side with Risk Score and Confidence.',
  },
  {
    id: 'risk-score',
    number: '11',
    title: 'Risk Score',
    category: 'SCORING',
    diagramKey: 'RISK',
    whatItIs: 'A 0–100 structural hazard score (higher = riskier). Brigg never declares any speculative coin 100% safe.',
    whatItMeans: 'Quantifies danger from top-10 whale concentration, snipers, bundles, dev holdings, unlocked LP, or wash trading.',
    howBriggCalculates: 'Weighted combination of Risk Engine factors (liquidity, holder, dev, contract, bot volume, social risk) and ML risk model.',
    example: 'Risk 29/100 (Green) = moderate structural health; Risk >= 70/100 (Red) = extreme downside / rug risk.',
    payAttentionTo: 'Check "Why Risk Is Elevated" right below the matrix before sizing any position.',
  },
  {
    id: 'confidence',
    number: '12',
    title: 'Confidence',
    category: 'SCORING',
    diagramKey: 'CONFIDENCE',
    whatItIs: 'A 0–100% reliability measure showing how complete, fresh, and consistent the underlying data is.',
    whatItMeans: 'Low confidence warns that sources disagree, feeds are stale, or sub-models conflict — NOT that the token is bad.',
    howBriggCalculates: 'Evaluates Liquidity Data Quality, Volume confidence, sub-model agreement, provider conflicts, and freshness lag.',
    example: 'Confidence 72% means live providers agree; Confidence < 38% automatically fires the No-Trade safety gate.',
    payAttentionTo: 'If Confidence drops during a fast move, reduce reliance on automated scores.',
  },
  {
    id: 'execution-quality',
    number: '13',
    title: 'Execution Quality',
    category: 'EXECUTION_CONTEXT',
    diagramKey: 'EXEC_QUALITY',
    whatItIs: 'A 0–100 tradability score reflecting expected price impact and pool exit capacity for your position size.',
    whatItMeans: 'High paper gains mean nothing if selling causes 25% slippage.',
    howBriggCalculates: 'Simulates AMM constant-product impact using (Expected Price - Executed Price) / Expected Price against pool depth.',
    example: 'Exec Quality 86/100 means a $1,500 order enters and exits smoothly; < 22/100 triggers No-Trade.',
    payAttentionTo: 'Test larger position sizes inside the Liquidity & Slippage tab.',
  },
  {
    id: 'calibrated-prob',
    number: '14',
    title: 'Calibrated Probability',
    category: 'SCORING',
    diagramKey: 'CALIBRATED_PROB',
    whatItIs: 'Platt-scaled historical win probability (shown only when validation gates pass and No-Trade is not triggered).',
    whatItMeans: 'An 80% calibrated probability aims to match ~80% historical follow-through under similar conditions.',
    howBriggCalculates: 'Applies Platt logistic scaling fitted during validated ML learning cycles; suppressed if No-Trade fires.',
    example: 'Calibrated Probability 68.4% (Platt-calibrated v1.3 validated).',
    payAttentionTo: 'Probability is statistical context across many setups, never a guarantee on one trade.',
  },
  {
    id: 'market-regime',
    number: '15',
    title: 'Market Regime',
    category: 'EXECUTION_CONTEXT',
    diagramKey: 'REGIME',
    whatItIs: 'The macro Solana meme/shitcoin environment state (e.g., Risk-On, Strong Meme Cycle, Low Liquidity, High Volatility).',
    whatItMeans: 'Identical token charts behave completely differently in a Risk-On bull tape versus a Low Liquidity chop tape.',
    howBriggCalculates: 'Aggregates breadth, SOL volatility, and 1H/24H momentum across the scanned Solana token universe.',
    example: 'In "Strong Meme Cycle", breakouts follow through more cleanly; in "Low Liquidity", take faster profits.',
    payAttentionTo: 'Adjust holding duration when Regime shifts to Risk-Off or Low Liquidity.',
  },
  {
    id: 'why-opp',
    number: '16',
    title: 'Why Opportunity Exists',
    category: 'SCORING',
    diagramKey: 'WHY_OPP',
    whatItIs: 'Human-readable bullet explanations on the right panel listing positive (+) and risk (-) drivers.',
    whatItMeans: 'Prevents "black box" blind trust by exposing exact features behind the score.',
    howBriggCalculates: 'Extracts top contributing signals from Volume, Liquidity, Holders, Social, and Risk engines.',
    example: '+ 1H volume accelerating +42% · + Buy/sell ratio 1.48x · - Top 10 concentration 31%.',
    payAttentionTo: 'Read Invalidation Conditions right below to know exactly what proves the thesis wrong.',
  },
  {
    id: 'pump-dump',
    number: '17',
    title: 'Pump/Dump Analysis',
    category: 'CHARTING',
    diagramKey: 'PUMP_DUMP',
    whatItIs: 'Probabilistic Pump Zone & Dump Zone cards below the chart plus SNIPER IN / PUMP OUT / DUMP EXIT bands.',
    whatItMeans: 'Estimates breakout target ranges and breakdown risk levels for fast shitcoin entries and exits.',
    howBriggCalculates: 'Combines ATR volatility, support/resistance bands, EMA crossovers, VWAP alignment, and sniper/bundle supply.',
    example: 'Probabilistic Pump Zone 64% est. ($0.000025–$0.000028) vs Dump Zone 36% est.',
    payAttentionTo: 'You can hide or show these overlays anytime under Chart Settings → AI Overlay.',
  },
  {
    id: 'buy-sell-flow',
    number: '18',
    title: 'Buy/Sell Flow',
    category: 'EXECUTION_CONTEXT',
    diagramKey: 'FLOW',
    whatItIs: 'The live 5M Buys vs Sells bar at the top of the right panel plus the Trades Tape.',
    whatItMeans: 'Shows real-time transaction pressure between buyers and sellers right now.',
    howBriggCalculates: 'Counts live 5M buy and sell transactions from DexScreener and live stream orderflow.',
    example: 'Buys 42 (68%) vs Sells 20 (32%) shows active short-term accumulation.',
    payAttentionTo: 'Watch for sudden flips from >65% buys to <45% buys near resistance.',
  },
  {
    id: 'liquidity',
    number: '19',
    title: 'Liquidity',
    category: 'EXECUTION_CONTEXT',
    diagramKey: 'LIQUIDITY',
    whatItIs: 'Pool USD reserves, LP lock/burn status, 1H liquidity change, and estimated exit capacity.',
    whatItMeans: 'Liquidity is the floor supporting price and enabling exits without catastrophic slippage.',
    howBriggCalculates: 'Compares pool USD depth against Market Cap, 24H volume, and simulated trade impact.',
    example: 'LP BURNED with $420K liquidity and $20K exit capacity vs unlocked $6K pool.',
    payAttentionTo: 'Tokens with liquidity dropping during pumps or <$8K total pool depth carry severe exit traps.',
  },
  {
    id: 'wallet-analysis',
    number: '20',
    title: 'Wallet Analysis',
    category: 'EXECUTION_CONTEXT',
    diagramKey: 'WALLETS',
    whatItIs: 'Holders intelligence, 2D/3D Bubble Maps, sniper%, insider exposure, and synchronized bundle clusters.',
    whatItMeans: 'Reveals if supply is organically distributed or quietly held by linked wallets ready to dump.',
    howBriggCalculates: 'Analyzes top wallet concentration, cluster links, early block entries, and dev holdings.',
    example: 'Red cluster links in the 2D/3D Bubble Map highlight wallets funded from the same source.',
    payAttentionTo: 'Combined bundle supply > 25% or Top 10 > 55% is a critical structural red flag.',
  },
  {
    id: 'fullscreen-chart',
    number: '21',
    title: 'Fullscreen Chart',
    category: 'CHARTING',
    diagramKey: 'FULLSCREEN',
    whatItIs: 'The "Expand Chart" button on the chart toolbar that expands the live chart across the full screen.',
    whatItMeans: 'Lets you inspect candles, indicators, AI markers, and drawing objects cleanly without browser zooming.',
    howBriggCalculates: 'Resizes the live chart instance in-place while keeping the exact same SSE tick stream and drawings active.',
    example: 'Click ⛶ Expand Chart to analyze 1S scalps full-screen, then click Exit Fullscreen (or press Esc) to return.',
    payAttentionTo: 'All live candles, tools, and AI Overlay toggles continue updating seamlessly in fullscreen.',
  },
  {
    id: 'alerts',
    number: '22',
    title: 'Alerts',
    category: 'DISCOVERY',
    diagramKey: 'ALERTS',
    whatItIs: 'Real-time 2.5s corner pop-up buy notifications, 2-minute Notification Bar history, and custom rule alerts.',
    whatItMeans: 'Notifies you of live buy surges, opportunity spikes, liquidity drops, or bundle triggers.',
    howBriggCalculates: 'Evaluates alert rules on every token analysis and streams new buy ticks into the timed Notification Bar.',
    example: 'Configure corner placement (Top/Bottom, Left/Right) or silence pop-ups inside Settings → Notifications.',
    payAttentionTo: 'Notifications stay in the Alerts drawer for 2 minutes unless you delete them manually.',
  },
];

export const TERMINAL_VIDEO_TUTORIALS: VideoTutorialLesson[] = [
  {
    id: 'vid_terminal_overview',
    title: 'How to use the Brigg Terminal',
    durationSec: 20,
    level: 'Beginner',
    summary: 'Walks through the 3-column workspace: Scanner (left), Live Chart & Tabs (center), and Intelligence Panel (right).',
    steps: [
      { atSec: 0, heading: '1. Pick Cohort (Shitcoin <=3d vs Memecoin >1mo)', caption: 'Use the top mode toggle to focus on newly launched <=3d Shitcoins or established >30d Memecoins.', highlightArea: 'TOP_BAR' },
      { atSec: 6, heading: '2. Scan & Select Pair', caption: 'Pick a token from the left Scanner or paste any Solana contract address in the search bar.', highlightArea: 'SCANNER' },
      { atSec: 12, heading: '3. Read Chart + Action State', caption: 'Inspect live candlesticks in the center and check Action State + Risk/Opportunity on the right.', highlightArea: 'CENTER_RIGHT' },
    ],
    writtenGuide: [
      'Start in Top Bar by picking Shitcoin (<=3 days) or Memecoin (>1 month).',
      'Click any row in the left Scanner to load its live chart, forensics, holders, and social feed.',
      'Check Action State and Risk Score on the right before looking at any directional timing signal.',
    ],
  },
  {
    id: 'vid_read_scanner',
    title: 'How to read the scanner',
    durationSec: 18,
    level: 'Beginner',
    summary: 'Explains MC, Liquidity, Age, Opp/Risk/Conf numbers, ML classification badges, and automatic stale-token replacement.',
    steps: [
      { atSec: 0, heading: '1. Age & Class Gate', caption: 'Every row shows exact age (18m, 4h, 320d) and ML class badge confirming Shitcoin or Memecoin.', highlightArea: 'SCANNER_ROW' },
      { atSec: 6, heading: '2. Opp / Risk / Confidence', caption: 'Compare Opportunity against Risk (red >=70) and Confidence % at the bottom of each row.', highlightArea: 'SCANNER_METRICS' },
      { atSec: 12, heading: '3. Lifecycle Auto-Replace', caption: 'When a feed goes stale or liquidity turns invalid, Brigg removes it and promotes the next qualifying token.', highlightArea: 'SCANNER_LIFECYCLE' },
    ],
    writtenGuide: [
      'Use Preset chips (Soon <60m, Migrated, 15M Scalp, Meme) to narrow candidates.',
      'Watch for NEW badges when auto-refresh discovers newly profiled Solana tokens.',
      'If a token disappears, check the lifecycle notice showing why it was replaced.',
    ],
  },
  {
    id: 'vid_read_chart',
    title: 'How to read the chart',
    durationSec: 18,
    level: 'Beginner',
    summary: 'Covers Candle/Line/Area modes, Price vs MC Y-axis, Measure %, Objects drawer, and ⛶ Expand Chart fullscreen.',
    steps: [
      { atSec: 0, heading: '1. Price vs Market Cap & Chart Type', caption: 'Switch Y-axis between Token Price and Market Cap, or toggle Candle, Line, and Area styles.', highlightArea: 'CHART_TOOLBAR' },
      { atSec: 6, heading: '2. Measure % & Drawing Objects', caption: 'Use Measure % to click two candles and read exact % move, bar count, and duration.', highlightArea: 'CHART_TOOLS' },
      { atSec: 12, heading: '3. Expand Fullscreen Live', caption: 'Press ⛶ Expand Chart to inspect candles full-screen without pausing real-time ticks.', highlightArea: 'CHART_FULLSCREEN' },
    ],
    writtenGuide: [
      'Click Measure % then pick two points on the chart to inspect exact percentage swings.',
      'Keep chart clean by collapsing the Objects (N) menu or toggling object visibility.',
      'Use Chart Settings → AI Overlay to declutter Pump/Dump, S/R, or Live Signal layers.',
    ],
  },
  {
    id: 'vid_indicators',
    title: 'How to use chart indicators',
    durationSec: 16,
    level: 'Intermediate',
    summary: 'Shows how EMA9, EMA21, VWAP, Bollinger Bands, RSI, and MACD work together on live candles.',
    steps: [
      { atSec: 0, heading: '1. Trend & Fair Value (EMA9 / EMA21 / VWAP)', caption: 'EMA9 > EMA21 above VWAP signals constructive short-term buyer control.', highlightArea: 'CHART_EMA' },
      { atSec: 8, heading: '2. Exhaustion & Momentum (RSI & MACD)', caption: 'RSI > 75 warns of stretched rallies; MACD histogram expansion confirms breakout follow-through.', highlightArea: 'CHART_OSCILLATORS' },
    ],
    writtenGuide: [
      'Toggle EMA9, EMA21, VWAP, BB, RSI, and MACD individually from the chart toolbar.',
      'Never rely on a single indicator — require volume confirmation alongside crossovers.',
    ],
  },
  {
    id: 'vid_action_state',
    title: 'How to understand Action State',
    durationSec: 16,
    level: 'Beginner',
    summary: 'Clarifies HIGH-RISK OPPORTUNITY, WATCH, CONFIRMATION REQUIRED, WAIT, and NO-TRADE.',
    steps: [
      { atSec: 0, heading: '1. Action State Is Risk-Adjusted Context', caption: 'Action State evaluates structural safety, liquidity, and evidence before recommending attention.', highlightArea: 'ACTION_CARD' },
      { atSec: 8, heading: '2. Why NO-TRADE Fires', caption: 'If liquidity drops below threshold, feeds go stale, or Top 10 whales dominate >55%, NO-TRADE protects you.', highlightArea: 'NO_TRADE_BOX' },
    ],
    writtenGuide: [
      'HIGH-RISK OPPORTUNITY means strong speculative potential WITH serious volatility/risk — NOT an order.',
      'NO-TRADE overrides high momentum whenever safety floors fail.',
    ],
  },
  {
    id: 'vid_live_signal',
    title: 'How Live Signal works',
    durationSec: 18,
    level: 'Beginner',
    summary: 'Explains the optional BUY / HOLD / PARTIAL SELL / SELL layer and how it differs from Action State.',
    steps: [
      { atSec: 0, heading: '1. Enable in Settings → Terminal → Live Signal', caption: 'Live Signal is OFF by default so your original Terminal stays unchanged until you opt in.', highlightArea: 'SETTINGS_LIVE_SIG' },
      { atSec: 6, heading: '2. Independent Real-Time Layer', caption: 'Evaluates live 5M orderflow, VWAP/EMA alignment, and volatility to emit BUY, HOLD, PARTIAL SELL, or SELL.', highlightArea: 'LIVE_SIG_CARD' },
      { atSec: 12, heading: '3. Timestamp & Chart Markers', caption: 'Updates on live market ticks with exact HH:MM:SS timestamps and optional chart pins.', highlightArea: 'LIVE_SIG_CHART' },
    ],
    writtenGuide: [
      'Action State can remain HIGH-RISK OPPORTUNITY while Live Signal shifts from BUY to HOLD or PARTIAL SELL.',
      'Check the "Why" bullets under Live Signal to inspect exact supporting (+) and opposing (-) drivers.',
    ],
  },
  {
    id: 'vid_opp_risk',
    title: 'How to understand Opportunity and Risk',
    durationSec: 16,
    level: 'Beginner',
    summary: 'Teaches why Opportunity 77/100 does NOT mean BUY automatically when Risk, Liquidity, or Confidence lag.',
    steps: [
      { atSec: 0, heading: '1. Opportunity Measures Setup Favorability', caption: 'Combines momentum, volume, liquidity, holders, social velocity, execution, and regime.', highlightArea: 'OPP_SCORE' },
      { atSec: 8, heading: '2. Risk & Confidence Balance It', caption: 'High Opportunity paired with high Risk Score means explosive upside with real downside hazards.', highlightArea: 'RISK_CONF' },
    ],
    writtenGuide: [
      'Always compare Opportunity Score vs Risk Score and Confidence % together.',
      'Review "Why Opportunity Exists" and "Why Risk Is Elevated" before forming a view.',
    ],
  },
  {
    id: 'vid_token_analysis',
    title: 'How Brigg analyzes a token',
    durationSec: 20,
    level: 'Intermediate',
    summary: 'Traces the full pipeline: Data Sources → Forensics & Holders → ML Features → Action State + Live Signal.',
    steps: [
      { atSec: 0, heading: '1. Live Market & On-Chain Aggregation', caption: 'Brigg ingests DexScreener market pairs, liquidity reserves, and holder/cluster telemetry.', highlightArea: 'PIPELINE_DATA' },
      { atSec: 7, heading: '2. T-Boundary Features & Ensemble ML', caption: 'Computes time-safe features (verified against temporal leakage) and classifies Shitcoin vs Memecoin.', highlightArea: 'PIPELINE_ML' },
      { atSec: 14, heading: '3. Explainable Terminal Output', caption: 'Renders chart zones, Action State, checklist gates, and optional Live Signal simultaneously.', highlightArea: 'PIPELINE_UI' },
    ],
    writtenGuide: [
      'Every score is backed by time-verified features computed at timestamp T.',
      'Visit ML Center → Help / Guide & Learning Activity to audit model versions and rollbacks.',
    ],
  },
];

export const ML_GUIDE_TOPICS: MlGuideTopic[] = [
  {
    id: 'ml_model',
    number: '01',
    title: 'What is the Brigg Model?',
    pipelineStep: 'MODEL',
    explainToMe: 'Brigg is not one single guesser — it is a team of specialized mini-models (momentum, liquidity, volume, wallets, risk, social, anomaly) whose votes are combined cleanly.',
    technicalDetail: 'Parameterized multi-factor ensemble combining 8 domain sub-models weighted by learned importance weights and Platt probability calibration.',
    formulaOrFlow: 'Sub-Models (8) → Learned Weights → Opportunity / Risk + Calibrated Prob',
    example: 'Momentum weight 0.21 + Liquidity weight 0.18 + Volume weight 0.17 + Wallet weight 0.14...',
  },
  {
    id: 'ml_feature',
    number: '02',
    title: 'What is a Feature?',
    pipelineStep: 'FEATURES',
    explainToMe: 'A feature is one specific measurable clue about a coin right now — like how fast 5-minute price moved or what % of supply early snipers hold.',
    technicalDetail: 'Deterministic numeric input vector x(T) engineered strictly from data observed at or before prediction time T (tracked by feature_version).',
    formulaOrFlow: 'Raw Pair + Holders → Normalized Feature Vector (f_v2.1)',
    example: 'buy_sell_imbalance = (Buys - Sells) / (Buys + Sells) over 1H.',
  },
  {
    id: 'ml_training_data',
    number: '03',
    title: 'What is Training Data?',
    pipelineStep: 'DATA',
    explainToMe: 'Training data is the historical logbook of past token snapshots paired with what actually happened afterward, so Brigg can learn which clues worked.',
    technicalDetail: 'Verified (features_snapshot_json, prediction_timestamp, return_pct) records excluding human overrides from automated labeling.',
    formulaOrFlow: 'Past Prediction Snapshots + Verified Outcomes (Overrides Excluded)',
    example: '540 historical verified snapshots used to fit v1.3 weights.',
  },
  {
    id: 'ml_observation',
    number: '04',
    title: 'What is an Observation?',
    pipelineStep: 'DATA',
    explainToMe: 'One recorded snapshot of a token at a specific moment in time — what the market looked like when Brigg made an evaluation.',
    technicalDetail: 'Single timestamped feature snapshot + prediction outcome row stored in SQLite predictions/prediction_outcomes tables.',
    formulaOrFlow: '1 Timestamped Token Snapshot = 1 Observation',
    example: 'BONK recorded at 11:42:08 UTC with Opp 74, Risk 28, Entry $0.0000241.',
  },
  {
    id: 'ml_validation',
    number: '05',
    title: 'What is Validation?',
    pipelineStep: 'VALIDATION',
    explainToMe: 'An exam given to a newly trained candidate model on unseen data before allowing it anywhere near the live terminal.',
    technicalDetail: 'Automated evaluation comparing candidate metrics (ROC-AUC, Brier score, FPR, Max Drawdown) against current production thresholds.',
    formulaOrFlow: 'Candidate Model → Validation Gate → Pass (Promote) or Fail (Reject)',
    example: 'If candidate drawdown worsens vs production, Brigg rejects it automatically.',
  },
  {
    id: 'ml_oot',
    number: '06',
    title: 'What is Out-of-Time Validation?',
    pipelineStep: 'VALIDATION',
    explainToMe: 'Testing the model strictly on newer days it has never seen before — just like real trading, where you never know tomorrow’s prices in advance.',
    technicalDetail: 'Chronological train/holdout split (e.g., 45-day rolling train window tested on a strictly subsequent 7-day out-of-time window).',
    formulaOrFlow: '[Train: Past 45d] → [Gap] → [Test: Next 7d Unseen]',
    example: 'Prevents the model from memorizing random past spikes.',
  },
  {
    id: 'ml_leakage',
    number: '07',
    title: 'What is Temporal Leakage?',
    pipelineStep: 'GOVERNANCE',
    explainToMe: 'Cheating by accidentally letting future price outcomes sneak into past predictions. Brigg blocks this with an automatic timestamp lock.',
    technicalDetail: 'Enforced by assertNoTemporalLeakage(): rejects any feature vector containing forbidden outcome fields or timestamps exceeding prediction time T.',
    formulaOrFlow: 'Guarantee: feature_timestamp <= prediction_timestamp <= outcome_timestamp',
    example: 'Any record with prediction_timestamp > outcome_timestamp is excluded from training.',
  },
  {
    id: 'ml_calibration',
    number: '08',
    title: 'What is Calibration?',
    pipelineStep: 'MODEL',
    explainToMe: 'Making sure that when Brigg says "70% probability", things really work out roughly 7 times out of 10 in real life — not 3 times out of 10.',
    technicalDetail: 'Platt logistic regression scaling mapping raw ensemble scores into calibrated probabilities; suppressed if validation gate is unmet or NO-TRADE fires.',
    formulaOrFlow: 'Raw Score → Platt Sigmoid (a, b) → Calibrated Probability %',
    example: 'v1.3 calibrated with platt_a=-2.15, platt_b=0.92.',
  },
  {
    id: 'ml_confidence',
    number: '09',
    title: 'What is Confidence?',
    pipelineStep: 'MODEL',
    explainToMe: 'How complete, fresh, and consistent Brigg’s clues are right now. Low confidence means "data is noisy or incomplete", not "the price will fall".',
    technicalDetail: 'Derived from liquidity data quality score (45%), volume confidence (25%), and inverse sub-model disagreement (30%), penalized by conflicts and lag.',
    formulaOrFlow: 'Data Quality + Freshness + Sub-Model Agreement → Confidence %',
    example: 'Confidence < 38% triggers NO-TRADE automatically.',
  },
  {
    id: 'ml_precision',
    number: '10',
    title: 'What is Precision?',
    pipelineStep: 'VALIDATION',
    explainToMe: 'Out of all setups Brigg flagged as good opportunities, what fraction actually turned out positive?',
    technicalDetail: 'TP / (TP + FP). Higher precision means fewer false-alarm setups.',
    formulaOrFlow: 'Correct Positives ÷ All Flagged Opportunities',
    example: 'Precision 0.74 means 74% of flagged positives succeeded in holdout validation.',
  },
  {
    id: 'ml_recall',
    number: '11',
    title: 'What is Recall?',
    pipelineStep: 'VALIDATION',
    explainToMe: 'Out of all real winning setups that happened in the market, how many did Brigg manage to catch?',
    technicalDetail: 'TP / (TP + FN). Balances missing good runners against being overly selective.',
    formulaOrFlow: 'Caught Positives ÷ All Actual Market Winners',
    example: 'Recall 0.68 means Brigg caught 68% of qualifying positive movers.',
  },
  {
    id: 'ml_f1',
    number: '12',
    title: 'What is F1 Score?',
    pipelineStep: 'VALIDATION',
    explainToMe: 'A single balanced grade combining Precision (avoiding bad calls) and Recall (catching real movers).',
    technicalDetail: 'Harmonic mean: 2 * (Precision * Recall) / (Precision + Recall).',
    formulaOrFlow: 'Balanced Precision ↔ Recall Grade (0.00 to 1.00)',
    example: 'F1 = 0.71 indicates strong balance without reckless over-flagging.',
  },
  {
    id: 'ml_roc_auc',
    number: '13',
    title: 'What is ROC-AUC?',
    pipelineStep: 'VALIDATION',
    explainToMe: 'How reliably the model ranks stronger coins higher than weaker coins (0.50 = coin flip, 1.00 = perfect).',
    technicalDetail: 'Area under the Receiver Operating Characteristic curve across all classification thresholds.',
    formulaOrFlow: '0.50 (Random) → 0.78 (Strong Ranking) → 1.00 (Ideal)',
    example: 'Candidates must beat or match production ROC-AUC to pass promotion.',
  },
  {
    id: 'ml_pr_auc',
    number: '14',
    title: 'What is PR-AUC?',
    pipelineStep: 'VALIDATION',
    explainToMe: 'Especially useful for rare breakouts: measures how well Brigg finds real winners even when most new tokens fail.',
    technicalDetail: 'Precision-Recall Area Under Curve — sensitive to imbalanced speculative token datasets.',
    formulaOrFlow: 'Area under Precision vs Recall curve',
    example: 'PR-AUC 0.75 shows selective quality even in noisy shitcoin launches.',
  },
  {
    id: 'ml_brier',
    number: '15',
    title: 'What is Brier Score?',
    pipelineStep: 'VALIDATION',
    explainToMe: 'Checks how honest the probability percentages are (lower is better; 0.00 means exact predictions).',
    technicalDetail: 'Mean squared error between calibrated predicted probabilities and binary realized outcomes: mean((p - y)^2).',
    formulaOrFlow: 'Lower Brier = Better Probability Calibration',
    example: 'Candidate Brier <= Production Brier is required by the validation gate.',
  },
  {
    id: 'ml_fpr',
    number: '16',
    title: 'What is False Positive Rate?',
    pipelineStep: 'VALIDATION',
    explainToMe: 'How often Brigg mistakenly flags a losing or trap coin as an opportunity (lower is safer).',
    technicalDetail: 'FP / (FP + TN). Critical capital-preservation metric during choppy shitcoin markets.',
    formulaOrFlow: 'False Alarms ÷ All Bad/Flat Tokens',
    example: 'FPR 0.14 means 14% false alarm rate; degraded candidates with higher FPR are rejected.',
  },
  {
    id: 'ml_drawdown',
    number: '17',
    title: 'What is Drawdown?',
    pipelineStep: 'OUTCOME',
    explainToMe: 'The largest peak-to-trough drop experienced during backtesting after realistic slippage and priority fees.',
    technicalDetail: 'Maximum percentage equity decline from prior peak across chronological simulated trades.',
    formulaOrFlow: '(Equity Peak - Subsequent Trough) ÷ Equity Peak',
    example: 'Max Drawdown 11.4% means worst losing streak dropped simulated equity by 11.4%.',
  },
  {
    id: 'ml_version',
    number: '18',
    title: 'What is a Model Version?',
    pipelineStep: 'GOVERNANCE',
    explainToMe: 'A labeled snapshot (like v1.3 or v1.4) freezing the exact weights, calibration settings, and validation scorecard.',
    technicalDetail: 'Immutable row in model_versions tracking dataset_version, feature_version, hyperparameters, metrics, and decision.',
    formulaOrFlow: 'v1.3 (Production) → Train Candidate v1.4 → Audit Trail Preserved',
    example: 'Model v1.3 remains saved even after v1.4 is evaluated.',
  },
  {
    id: 'ml_promoted',
    number: '19',
    title: 'What does Promoted mean?',
    pipelineStep: 'GOVERNANCE',
    explainToMe: 'The candidate model beat or matched the live model on every safety and accuracy test, so Brigg safely upgraded it to Production.',
    technicalDetail: 'Decision emitted only when candidate ROC-AUC >= prod, Brier <= prod, FPR <= prod, and Max Drawdown <= prod.',
    formulaOrFlow: 'All 4 Validation Checks Passed → PROMOTED → Active Production',
    example: 'v1.4 PROMOTED after improving ROC-AUC and lowering Brier error.',
  },
  {
    id: 'ml_rejected',
    number: '20',
    title: 'What does Rejected mean?',
    pipelineStep: 'GOVERNANCE',
    explainToMe: 'The test model performed worse or took too much drawdown risk during validation, so Brigg automatically blocked it from going live.',
    technicalDetail: 'Auto-rejection safeguards production stability whenever out-of-time validation metrics regress.',
    formulaOrFlow: 'Any Validation Metric Regresses → REJECTED → Production Unchanged',
    example: 'Click "Test Auto-Reject Gate" to verify Brigg blocks degraded weights automatically.',
  },
  {
    id: 'ml_rollback',
    number: '21',
    title: 'How does Rollback work?',
    pipelineStep: 'GOVERNANCE',
    explainToMe: 'A 1-click safety switch that instantly restores an earlier trusted model version to Production if needed.',
    technicalDetail: 'Marks the current version ROLLED BACK, activates the selected prior model_versions row, resets active weights, and writes an audit_logs entry.',
    formulaOrFlow: 'Click Rollback → Restore Previous Weights → Log Operator Audit',
    example: 'Rollback from v1.4 back to v1.3 takes effect on the very next token analysis.',
  },
  {
    id: 'ml_how_learns',
    number: '22',
    title: 'How does Brigg Learn?',
    pipelineStep: 'OUTCOME',
    explainToMe: 'Brigg records timestamped predictions, waits for real market outcomes, checks for data leaks, fits updated weights & calibration, backtests with fees, and promotes ONLY if validation passes.',
    technicalDetail: 'Closed-loop supervised recalibration: Observation -> Outcome Evaluation -> Leakage Guard -> Gradient Platt Calibration -> OOT Backtest -> Validation Gate.',
    formulaOrFlow: 'Market Data → Features → Model → Prediction → Validation → Outcome → Learning',
    example: 'Human overrides are logged separately and excluded from automatic labels to keep training clean.',
  },
];
