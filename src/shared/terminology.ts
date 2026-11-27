import type { SocialMentionEvent, TokenFullAnalysis } from './types';

export interface TerminologyEntry {
  term: string;
  definition: string;
  analytical_caveat: string;
  source?: 'CORE' | 'AUTO_DETECTED' | 'CUSTOM';
  added_at?: string;
}

export const GLOSSARY_STORAGE_KEY = 'brigg_glossary_entries_v1';

export const BRIGG_TERMINOLOGY: TerminologyEntry[] = [
  {
    term: 'Alpha',
    definition: 'An analytical, structural, or timing edge derived from observable market, liquidity, wallet, and narrative data.',
    analytical_caveat: 'Never implies illegal insider information or guaranteed profit.',
    source: 'CORE',
  },
  {
    term: 'Degen',
    definition: 'A high-risk speculative market participant operating in short-duration, volatile token environments.',
    analytical_caveat: 'High degen participation increases both upside velocity and downside gap risk.',
    source: 'CORE',
  },
  {
    term: 'FUD',
    definition: 'Fear, uncertainty, and doubt circulating across social channels.',
    analytical_caveat: 'Brigg separates verifiable negative fundamentals (e.g., LP removal) from unsubstantiated social panic.',
    source: 'CORE',
  },
  {
    term: 'Pump and Dump',
    definition: 'A rapid price expansion followed by aggressive supply distribution from concentrated early holders or coordinated groups.',
    analytical_caveat: 'Identified probabilistically via volume/price divergence and wallet outflows.',
    source: 'CORE',
  },
  {
    term: 'Whale / Stealth Whale',
    definition: 'A large capital holder, or an entity splitting large positions across multiple ostensibly separate wallets.',
    analytical_caveat: 'Stealth whale linkage requires funding or timing evidence; never assumed without proof.',
    source: 'CORE',
  },
  {
    term: 'Weak Hands / Paper Hands',
    definition: 'Short-horizon holders with low drawdown tolerance who tend to exit rapidly on minor pullbacks.',
    analytical_caveat: 'High weak-hand turnover increases short-term volatility.',
    source: 'CORE',
  },
  {
    term: 'Rug Pull (Liquidity / Token Dump / Contract)',
    definition: 'Malicious or catastrophic value extraction via LP withdrawal (Liquidity Rug), concentrated supply dump (Token Dump Rug), or restrictive contract logic (Contract Rug).',
    analytical_caveat: 'Brigg never declares a token "100% safe" or "cannot rug".',
    source: 'CORE',
  },
  {
    term: 'Slippage',
    definition: 'Difference between expected execution price and actual realized price: (Expected Price - Executed Price) / Expected Price.',
    analytical_caveat: 'High opportunity can still fail execution if slippage erodes expected value.',
    source: 'CORE',
  },
  {
    term: 'DEX Paid vs DEX Unpaid',
    definition: 'Whether token visibility or profile enhancement on a DEX screener/aggregator has been paid for.',
    analytical_caveat: 'Paid does NOT automatically mean unsafe; organic does NOT automatically mean safe.',
    source: 'CORE',
  },
  {
    term: 'Migration',
    definition: 'Movement of token liquidity or trading from an initial launch curve (e.g., Pump.fun) to an established AMM (e.g., Raydium).',
    analytical_caveat: 'Migration must never automatically be interpreted as proof of safety.',
    source: 'CORE',
  },
  {
    term: 'Sniper',
    definition: 'Automated or ultra-fast buyer acquiring tokens in the initial blocks after deployment or liquidity addition.',
    analytical_caveat: 'A sniper is not automatically an insider.',
    source: 'CORE',
  },
  {
    term: 'Insider',
    definition: 'Wallet with verifiable funding, timing, or deployer links suggesting privileged pre-public access.',
    analytical_caveat: 'Early purchase timing alone does not prove insider status.',
    source: 'CORE',
  },
  {
    term: 'Bundler / Bundle',
    definition: 'Multiple wallets executing synchronized acquisitions via bundled transactions or shared initial funding.',
    analytical_caveat: 'Wallet clustering is probabilistic unless directly verifiable on-chain.',
    source: 'CORE',
  },
  {
    term: 'Wash Trading & Arbitrage Bot',
    definition: 'Self-directed or circular trading inflating reported volume (wash) vs. spread-equalizing automated bots (arbitrage).',
    analytical_caveat: 'High reported volume does not automatically mean organic demand.',
    source: 'CORE',
  },
  {
    term: 'Honeypot',
    definition: 'Token contract or pool configuration that permits buys while blocking, taxing excessively, or restricting sells.',
    analytical_caveat: 'Evaluated via contract authorities, sell counts, and transfer behavior.',
    source: 'CORE',
  },
];

// Expandable lexicon automatically promoted into Glossary when encountered in live feeds, chart signals, or token analysis
const DYNAMIC_LEXICON: Array<{
  keywords: string[];
  entry: Omit<TerminologyEntry, 'source' | 'added_at'>;
}> = [
  {
    keywords: ['vwap'],
    entry: {
      term: 'VWAP (Volume-Weighted Average Price)',
      definition: 'Average execution price weighted by traded volume across a session or rolling window.',
      analytical_caveat: 'Holding above VWAP signals buyer control; losing VWAP often accelerates mean reversion.',
    },
  },
  {
    keywords: ['sniper in', 'pump out', 'dump stop', 'sniper entry'],
    entry: {
      term: 'Sniper In / Pump Out',
      definition: 'Short-horizon entry trigger near structural support and target take-profit band at projected upper momentum resistance.',
      analytical_caveat: 'Probabilistic reference zones only; always validate against live LP depth and dump stop.',
    },
  },
  {
    keywords: ['pump zone', 'dump zone', 'probabilistic pump', 'probabilistic dump'],
    entry: {
      term: 'Probabilistic Pump & Dump Zones',
      definition: 'Volatility-adjusted upper expansion and lower distribution price/MCap bands computed from live orderflow and breakout stage.',
      analytical_caveat: 'Percentages reflect model confidence, not guaranteed price paths.',
    },
  },
  {
    keywords: ['breakout', 'volume breakout'],
    entry: {
      term: 'Volume Breakout Sequence',
      definition: 'Multi-stage expansion progression from base compression through buy-pressure surge and trend continuation.',
      analytical_caveat: 'Breakouts without organic buyer breadth frequently fail as bull traps.',
    },
  },
  {
    keywords: ['euphoria', 'rotation', 'thin_liquidity', 'bot_dominated', 'high_volatility'],
    entry: {
      term: 'Market Regime',
      definition: 'Macro speculative environment classification (e.g., Euphoria, High Volatility, Thin Liquidity, Bot Dominated, Rotation).',
      analytical_caveat: 'Position sizing and risk thresholds should tighten during Thin Liquidity or Bot Dominated regimes.',
    },
  },
  {
    keywords: ['mcap', 'market cap', 'fdv'],
    entry: {
      term: 'MCap / FDV (Market Cap & Fully Diluted Valuation)',
      definition: 'Circulating or total token supply multiplied by spot price USD; toggleable directly on the Brigg chart Y-axis.',
      analytical_caveat: 'High MCap on shallow LP creates exaggerated paper valuations that cannot absorb large exits.',
    },
  },
  {
    keywords: ['mint authority', 'freeze authority', 'revoked'],
    entry: {
      term: 'Mint & Freeze Authority',
      definition: 'On-chain Solana SPL permissions allowing a creator to mint unlimited new supply or freeze holder token transfers.',
      analytical_caveat: 'Active mint or freeze authority is a critical structural risk factor.',
    },
  },
  {
    keywords: ['lp', 'liquidity', 'burned', 'locked'],
    entry: {
      term: 'LP Burned / Locked',
      definition: 'Whether liquidity pool LP tokens have been permanently burned or time-locked so the deployer cannot pull pool reserves.',
      analytical_caveat: 'Even with burned LP, concentrated token holders can still dump supply into the pool.',
    },
  },
  {
    keywords: ['ct', 'crypto twitter', 'kol'],
    entry: {
      term: 'CT & KOL Concentration',
      definition: 'Crypto Twitter narrative velocity and share of mentions driven by Key Opinion Leaders vs. broad organic accounts.',
      analytical_caveat: 'High KOL concentration can trigger coordinated hype spikes followed by exit liquidity dumps.',
    },
  },
  {
    keywords: ['cto', 'community takeover'],
    entry: {
      term: 'CTO (Community Takeover)',
      definition: 'When the original deployer exits or abandons a coin and active holders organize socials and liquidity momentum independently.',
      analytical_caveat: 'Verify deployer wallet balance is genuinely zeroed and no hidden bundle clusters remain.',
    },
  },
  {
    keywords: ['jeet', 'ape', 'moonbag', 'exit liquidity'],
    entry: {
      term: 'Jeet / Moonbag / Exit Liquidity',
      definition: 'Trench slang: Jeet (impatient panic seller), Moonbag (risk-free residual position after taking initial principal), Exit Liquidity (late buyers absorbing early whale sells).',
      analytical_caveat: 'Check 5M buy/sell flow and top-10 concentration before entering rapid spikes.',
    },
  },
  {
    keywords: ['no-trade', 'high-risk opportunity', 'watch'],
    entry: {
      term: 'Brigg Action State',
      definition: 'Discrete decision gate synthesized from Opportunity, Risk, Confidence, and Execution Quality (Watch, High-Risk Opportunity, or No-Trade).',
      analytical_caveat: 'No-Trade gates override high opportunity scores whenever critical contract or rug triggers fire.',
    },
  },
];

function normalizeTermKey(term: string): string {
  return term.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function mergeGlossaryEntries(
  existing: TerminologyEntry[],
  incoming: TerminologyEntry[]
): { entries: TerminologyEntry[]; addedCount: number } {
  const seen = new Set(existing.map((e) => normalizeTermKey(e.term)));
  const additions: TerminologyEntry[] = [];
  for (const item of incoming) {
    const key = normalizeTermKey(item.term);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    additions.push(item);
  }
  if (additions.length === 0) {
    return { entries: existing, addedCount: 0 };
  }
  return {
    entries: [...additions, ...existing],
    addedCount: additions.length,
  };
}

export function loadSavedGlossaryEntries(): TerminologyEntry[] {
  try {
    const raw = window.localStorage.getItem(GLOSSARY_STORAGE_KEY);
    if (!raw) return [...BRIGG_TERMINOLOGY];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...BRIGG_TERMINOLOGY];
    const valid = parsed.filter(
      (item): item is TerminologyEntry =>
        Boolean(item) &&
        typeof item.term === 'string' &&
        item.term.trim().length > 0 &&
        typeof item.definition === 'string' &&
        item.definition.trim().length > 0
    );
    // Ensure all core terms remain present while keeping custom/auto-detected entries
    const merged = mergeGlossaryEntries(BRIGG_TERMINOLOGY, valid);
    return merged.entries;
  } catch {
    return [...BRIGG_TERMINOLOGY];
  }
}

export function saveGlossaryEntries(entries: TerminologyEntry[]): void {
  try {
    window.localStorage.setItem(GLOSSARY_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // ignore storage quota errors
  }
}

export function addCustomGlossaryTerm(
  current: TerminologyEntry[],
  input: { term: string; definition: string; analytical_caveat?: string }
): TerminologyEntry[] {
  const term = input.term.trim();
  const definition = input.definition.trim();
  if (!term || !definition) return current;
  const entry: TerminologyEntry = {
    term,
    definition,
    analytical_caveat:
      input.analytical_caveat?.trim() || 'User-defined trading terminal term.',
    source: 'CUSTOM',
    added_at: new Date().toISOString(),
  };
  const key = normalizeTermKey(term);
  const filtered = current.filter((e) => normalizeTermKey(e.term) !== key);
  return [entry, ...filtered];
}

export function removeGlossaryTerm(
  current: TerminologyEntry[],
  term: string
): TerminologyEntry[] {
  const key = normalizeTermKey(term);
  return current.filter((e) => e.source === 'CORE' || normalizeTermKey(e.term) !== key);
}

export function extractGlossaryTermsFromContext(params: {
  analysis: TokenFullAnalysis | null;
  socialEvents: SocialMentionEvent[];
}): TerminologyEntry[] {
  const corpusParts: string[] = [];

  if (params.analysis) {
    corpusParts.push(
      params.analysis.score_panel.action_state,
      params.analysis.score_panel.market_regime,
      params.analysis.chart.breakout_sequence.current_stage,
      params.analysis.chart.pump_dump_outlook?.headline || '',
      params.analysis.liquidity.lp_status,
      ...params.analysis.risk.rug_indicators,
      ...params.analysis.checklist.items.map((i) => `${i.label} ${i.explanation}`)
    );
  }

  for (const ev of params.socialEvents.slice(0, 20)) {
    corpusParts.push(ev.text, ev.channel);
  }

  const corpus = corpusParts.join(' ').toLowerCase();
  if (!corpus.trim()) return [];

  const nowIso = new Date().toISOString();
  const matched: TerminologyEntry[] = [];

  for (const rule of DYNAMIC_LEXICON) {
    if (rule.keywords.some((kw) => corpus.includes(kw))) {
      matched.push({
        ...rule.entry,
        source: 'AUTO_DETECTED',
        added_at: nowIso,
      });
    }
  }

  return matched;
}
