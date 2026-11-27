import { z } from 'zod';

const SOLANA_BASE58_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function isValidSolanaAddress(address: string): boolean {
  return SOLANA_BASE58_REGEX.test(address.trim());
}

export function sanitizeTextInput(input: string, maxLength = 240): string {
  return input
    .replace(/[<>]/g, '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLength);
}

export const TokenAddressParamSchema = z.object({
  address: z.string().trim().refine(isValidSolanaAddress, {
    message: 'Invalid Solana token address (must be Base58, 32-44 chars)',
  }),
});

export const ScannerQuerySchema = z.object({
  mode: z.enum(['SHITCOIN', 'MEMECOIN']).default('SHITCOIN'),
  horizon: z.enum(['4M', '15M', '1H', '4H', '24H']).default('15M'),
  preset: z
    .enum(['GENERAL', 'SOON_PAIR', 'MIGRATED_PAIR', 'SCALPING_15M', 'DEXSCREENER_MEME', 'AXIOM_STYLE', 'CUSTOM'])
    .default('GENERAL'),
  sortBy: z
    .enum(['opportunity', 'risk', 'confidence', 'volume', 'liquidity', 'age', 'social', 'holder_growth'])
    .default('opportunity'),
  q: z.string().max(64).optional(),
  minLiquidity: z.coerce.number().min(0).max(1e9).optional(),
  maxRisk: z.coerce.number().min(0).max(100).optional(),
  minOpportunity: z.coerce.number().min(0).max(100).optional(),
  hideNewPairs: z.enum(['true', 'false']).optional(),
  migratedOnly: z.enum(['true', 'false']).optional(),
});

export const TokenAnalysisQuerySchema = z.object({
  mode: z.enum(['SHITCOIN', 'MEMECOIN']).default('SHITCOIN'),
  horizon: z.enum(['4M', '15M', '1H', '4H', '24H']).default('15M'),
  timeframe: z.enum(['1M', '5M', '15M', '1H', '4H', '24H']).default('15M'),
  positionSizeUsd: z.coerce.number().min(50).max(500_000).default(1500),
});

export const OverrideInputSchema = z.object({
  token_address: z.string().trim().refine(isValidSolanaAddress, 'Invalid Solana address'),
  symbol: z.string().trim().min(1).max(24),
  model_state: z.enum(['WATCH', 'WAIT', 'CONFIRMATION REQUIRED', 'HIGH-RISK OPPORTUNITY', 'NO-TRADE', 'ANALYSIS ONLY']),
  user_decision: z.enum(['MANUAL_WATCH', 'MANUAL_SKIP', 'MANUAL_FLAG_RUG', 'OVERRIDE_NO_TRADE']),
  reason: z.string().trim().min(3).max(300),
});

export const BacktestRequestSchema = z.object({
  mode: z.enum(['SHITCOIN', 'MEMECOIN']).default('SHITCOIN'),
  horizon: z.enum(['4M', '15M', '1H', '4H', '24H']).default('15M'),
  position_size_usd: z.coerce.number().min(100).max(250_000).default(1500),
  min_opportunity_score: z.coerce.number().min(0).max(100).default(65),
  max_risk_score: z.coerce.number().min(0).max(100).default(75),
  slippage_bps: z.coerce.number().min(10).max(2500).default(120),
  priority_fee_usd: z.coerce.number().min(0).max(100).default(1.2),
  min_liquidity_usd: z.coerce.number().min(0).max(1e8).default(15_000),
});

export const AlertRuleInputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  condition_type: z.enum([
    'OPPORTUNITY_ABOVE',
    'RISK_BELOW',
    'VOLUME_ACCELERATION',
    'HOLDER_GROWTH',
    'SOCIAL_ACCELERATION',
    'LIQUIDITY_DECLINE',
    'INSIDER_SELLING',
    'BUNDLE_DETECTION',
    'SNIPER_INCREASE',
    'MARKET_REGIME_CHANGE',
    'SCANNER_ENTRY',
  ]),
  threshold: z.coerce.number().min(-1000).max(1e9),
  channel_dashboard: z.boolean().default(true),
  channel_telegram: z.boolean().default(false),
});
