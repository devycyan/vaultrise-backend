/**
 * Off-chain mirror of the on-chain financial math, for analytics and the
 * liquidation bot. Uses floating point for display values only — all actual
 * state transitions happen on-chain.
 */
export const BPS = 10_000;
export const LIQUIDATION_THRESHOLD_BPS = 2800;
export const SECONDS_PER_YEAR = 31_536_000;
export const WAD = 1e18;

export const UTIL_TIER1_BPS = 5000;
export const UTIL_TIER2_BPS = 8000;
export const APR_TIER1_BPS = 1200;
export const APR_TIER2_BPS = 2800;
export const APR_TIER3_BPS = 6500;

/** Borrow APR (as a fraction, e.g. 0.12) for a given utilization fraction. */
export function borrowApr(utilization: number): number {
  const utilBps = utilization * BPS;
  if (utilBps <= UTIL_TIER1_BPS) return APR_TIER1_BPS / BPS;
  if (utilBps <= UTIL_TIER2_BPS) return APR_TIER2_BPS / BPS;
  return APR_TIER3_BPS / BPS;
}

/** Lender APY ≈ borrow APR × utilization (MVP: lenders receive all interest). */
export function lenderApy(utilization: number): number {
  return borrowApr(utilization) * utilization;
}

/** Health factor (1.0 == liquidation point). < 1.0 is liquidatable. */
export function healthFactor(collateralValueUsd: number, debtUsd: number): number {
  if (debtUsd <= 0) return Infinity;
  return (collateralValueUsd * (LIQUIDATION_THRESHOLD_BPS / BPS)) / debtUsd;
}

export function utilization(totalDebt: number, cash: number): number {
  const total = totalDebt + cash;
  return total > 0 ? totalDebt / total : 0;
}

/** Spot price (USDC per whole token, 6dp scaled by 1e6) from pool reserves. */
export function priceFromReserves(
  baseReserve: number,
  quoteReserve: number,
  baseDecimals: number
): number {
  if (baseReserve <= 0) return 0;
  // price_1e6 = quoteReserve * 10^baseDecimals / baseReserve
  return Math.floor((quoteReserve * 10 ** baseDecimals) / baseReserve);
}
