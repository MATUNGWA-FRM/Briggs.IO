import type {
  BriggFilterPreset,
  BriggMode,
  RemovedScannerTokenNotice,
  ScannerTokenSummary,
} from '../../shared/types.ts';

export const DEFAULT_SCANNER_MAX_STALE_SECONDS = 180;
export const DEFAULT_SCANNER_SLOT_CAPACITY = 10;

export interface LifecycleValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Validates whether a token satisfies active scanner & data integrity criteria.
 * Does NOT remove a token merely for brief low activity; requires genuine
 * invalid market fields, stale critical data exceeding threshold, invalid liquidity,
 * or failing explicit scanner criteria.
 */
export function validateScannerTokenLifecycle(params: {
  token: ScannerTokenSummary;
  preset: BriggFilterPreset;
  mode: BriggMode;
  maxStaleSeconds?: number;
  minLiquidityOverride?: number;
  maxRiskOverride?: number;
  minOpportunityOverride?: number;
  hideNewPairs?: boolean;
  migratedOnly?: boolean;
}): LifecycleValidationResult {
  const {
    token,
    preset,
    mode,
    maxStaleSeconds = DEFAULT_SCANNER_MAX_STALE_SECONDS,
    minLiquidityOverride,
    maxRiskOverride,
    minOpportunityOverride,
    hideNewPairs,
    migratedOnly,
  } = params;

  if (!token.address || !token.symbol) {
    return { valid: false, reason: 'Required token identifier disappeared from feed' };
  }

  if (!Number.isFinite(token.price_usd) || token.price_usd <= 0) {
    return { valid: false, reason: 'Pair price quote became invalid (<= $0)' };
  }

  if (!Number.isFinite(token.liquidity_usd) || token.liquidity_usd < 1_500) {
    return { valid: false, reason: `Liquidity invalid ($${Math.round(token.liquidity_usd || 0)})` };
  }

  if (token.data_status === 'UNAVAILABLE') {
    return { valid: false, reason: 'Token unavailable from active market data source' };
  }

  if (token.freshness_seconds > maxStaleSeconds) {
    return {
      valid: false,
      reason: `Feed stale (${token.freshness_seconds}s > ${maxStaleSeconds}s threshold)`,
    };
  }

  const effMinLiq = minLiquidityOverride ?? (preset.id !== 'GENERAL' ? preset.min_liquidity_usd : 2_500);
  if (token.liquidity_usd < effMinLiq) {
    return {
      valid: false,
      reason: `Liquidity $${Math.round(token.liquidity_usd).toLocaleString()} below $${effMinLiq.toLocaleString()} criterion`,
    };
  }

  if (maxRiskOverride !== undefined && token.risk_score > maxRiskOverride) {
    return {
      valid: false,
      reason: `Risk ${token.risk_score}/100 exceeded ceiling ${maxRiskOverride}`,
    };
  }

  if (minOpportunityOverride !== undefined && token.opportunity_score < minOpportunityOverride) {
    return {
      valid: false,
      reason: `Opportunity ${token.opportunity_score} dropped below ${minOpportunityOverride}`,
    };
  }

  if (hideNewPairs && token.age_minutes < 15) {
    return { valid: false, reason: 'Excluded by Hide New Pairs (<15m) filter' };
  }

  if (migratedOnly && token.migration_status !== 'MIGRATED') {
    return { valid: false, reason: 'Pool not migrated to target DEX' };
  }

  if (token.classification.classified_mode !== mode) {
    return {
      valid: false,
      reason: `ML classified as ${token.classification.classified_mode} (outside ${mode} scanner cohort)`,
    };
  }

  return { valid: true };
}

/**
 * Partitions scanned tokens into valid active slots (capped to slotCapacity)
 * and removed tokens, annotating removals with replacement symbols when new
 * qualifying tokens enter open slots.
 */
export function reconcileScannerSlots(params: {
  candidates: ScannerTokenSummary[];
  preset: BriggFilterPreset;
  mode: BriggMode;
  slotCapacity?: number;
  maxStaleSeconds?: number;
  minLiquidityOverride?: number;
  maxRiskOverride?: number;
  minOpportunityOverride?: number;
  hideNewPairs?: boolean;
  migratedOnly?: boolean;
  previousActiveAddresses?: Set<string>;
}): {
  active: ScannerTokenSummary[];
  removed: RemovedScannerTokenNotice[];
  entered: ScannerTokenSummary[];
} {
  const {
    candidates,
    preset,
    mode,
    slotCapacity = DEFAULT_SCANNER_SLOT_CAPACITY,
    previousActiveAddresses,
  } = params;

  const validPool: ScannerTokenSummary[] = [];
  const invalidList: RemovedScannerTokenNotice[] = [];

  for (const token of candidates) {
    const check = validateScannerTokenLifecycle({
      token,
      preset,
      mode,
      maxStaleSeconds: params.maxStaleSeconds,
      minLiquidityOverride: params.minLiquidityOverride,
      maxRiskOverride: params.maxRiskOverride,
      minOpportunityOverride: params.minOpportunityOverride,
      hideNewPairs: params.hideNewPairs,
      migratedOnly: params.migratedOnly,
    });

    if (check.valid) {
      validPool.push(token);
    } else if (
      // Only report explicit removal when it failed stale/invalid rules or previously tracked active
      check.reason &&
      (!check.reason.includes('ML classified') || previousActiveAddresses?.has(token.address))
    ) {
      invalidList.push({
        address: token.address,
        symbol: token.symbol,
        reason: check.reason,
      });
    }
  }

  const active = validPool.slice(0, slotCapacity);
  const entered = previousActiveAddresses
    ? active.filter((t) => !previousActiveAddresses.has(t.address))
    : [];

  // Pair removed tokens with replacement symbols when replacements entered
  const removed = invalidList.map((rem, idx) => ({
    ...rem,
    replaced_by_symbol: entered[idx]?.symbol ?? active[active.length - 1]?.symbol,
  }));

  return { active, removed, entered };
}
