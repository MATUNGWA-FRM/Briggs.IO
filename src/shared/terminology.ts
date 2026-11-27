export interface TerminologyEntry {
  term: string;
  definition: string;
  analytical_caveat: string;
}

export const BRIGG_TERMINOLOGY: TerminologyEntry[] = [
  {
    term: 'Alpha',
    definition: 'An analytical, structural, or timing edge derived from observable market, liquidity, wallet, and narrative data.',
    analytical_caveat: 'Never implies illegal insider information or guaranteed profit.',
  },
  {
    term: 'Degen',
    definition: 'A high-risk speculative market participant operating in short-duration, volatile token environments.',
    analytical_caveat: 'High degen participation increases both upside velocity and downside gap risk.',
  },
  {
    term: 'FUD',
    definition: 'Fear, uncertainty, and doubt circulating across social channels.',
    analytical_caveat: 'Brigg separates verifiable negative fundamentals (e.g., LP removal) from unsubstantiated social panic.',
  },
  {
    term: 'Pump and Dump',
    definition: 'A rapid price expansion followed by aggressive supply distribution from concentrated early holders or coordinated groups.',
    analytical_caveat: 'Identified probabilistically via volume/price divergence and wallet outflows.',
  },
  {
    term: 'Whale / Stealth Whale',
    definition: 'A large capital holder, or an entity splitting large positions across multiple ostensibly separate wallets.',
    analytical_caveat: 'Stealth whale linkage requires funding or timing evidence; never assumed without proof.',
  },
  {
    term: 'Weak Hands / Paper Hands',
    definition: 'Short-horizon holders with low drawdown tolerance who tend to exit rapidly on minor pullbacks.',
    analytical_caveat: 'High weak-hand turnover increases short-term volatility.',
  },
  {
    term: 'Rug Pull (Liquidity / Token Dump / Contract)',
    definition: 'Malicious or catastrophic value extraction via LP withdrawal (Liquidity Rug), concentrated supply dump (Token Dump Rug), or restrictive contract logic (Contract Rug).',
    analytical_caveat: 'Brigg never declares a token "100% safe" or "cannot rug".',
  },
  {
    term: 'Slippage',
    definition: 'Difference between expected execution price and actual realized price: (Expected Price - Executed Price) / Expected Price.',
    analytical_caveat: 'High opportunity can still fail execution if slippage erodes expected value.',
  },
  {
    term: 'DEX Paid vs DEX Unpaid',
    definition: 'Whether token visibility or profile enhancement on a DEX screener/aggregator has been paid for.',
    analytical_caveat: 'Paid does NOT automatically mean unsafe; organic does NOT automatically mean safe.',
  },
  {
    term: 'Migration',
    definition: 'Movement of token liquidity or trading from an initial launch curve (e.g., Pump.fun) to an established AMM (e.g., Raydium).',
    analytical_caveat: 'Migration must never automatically be interpreted as proof of safety.',
  },
  {
    term: 'Sniper',
    definition: 'Automated or ultra-fast buyer acquiring tokens in the initial blocks after deployment or liquidity addition.',
    analytical_caveat: 'A sniper is not automatically an insider.',
  },
  {
    term: 'Insider',
    definition: 'Wallet with verifiable funding, timing, or deployer links suggesting privileged pre-public access.',
    analytical_caveat: 'Early purchase timing alone does not prove insider status.',
  },
  {
    term: 'Bundler / Bundle',
    definition: 'Multiple wallets executing synchronized acquisitions via bundled transactions or shared initial funding.',
    analytical_caveat: 'Wallet clustering is probabilistic unless directly verifiable on-chain.',
  },
  {
    term: 'Wash Trading & Arbitrage Bot',
    definition: 'Self-directed or circular trading inflating reported volume (wash) vs. spread-equalizing automated bots (arbitrage).',
    analytical_caveat: 'High reported volume does not automatically mean organic demand.',
  },
  {
    term: 'Honeypot',
    definition: 'Token contract or pool configuration that permits buys while blocking, taxing excessively, or restricting sells.',
    analytical_caveat: 'Evaluated via contract authorities, sell counts, and transfer behavior.',
  },
];
