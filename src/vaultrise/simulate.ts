/**
 * Borrow / liquidation simulator. Pure read-only computation that mirrors the
 * on-chain LTV / health-factor / fee math (see math.ts and the borrow
 * instruction) so the frontend and integrators can preview a position before
 * sending a transaction. Touches no state and signs nothing.
 */
import { getPoolMetrics, getTokens } from "./client";
import { BPS, LIQUIDATION_THRESHOLD_BPS, healthFactor } from "./math";

/** Extra LTV granted when 50 $VRISE is burned at open (20% -> 25%). */
export const VRISE_BOOST_LTV_BPS = 500;
/** Protocol fee charged at open (0.5%), waived with the $VRISE boost. */
export const PROTOCOL_FEE_BPS = 50;

export interface SimulateInput {
  mint: string;
  collateral: number;
  borrow: number;
  boost?: boolean;
}

export interface SimulateResult {
  mint: string;
  symbol: string;
  priceUsd: number;
  collateral: number;
  borrow: number;
  boost: boolean;
  collateralValueUsd: number;
  maxLtvBps: number;
  maxLtvPct: number;
  maxBorrowUsd: number;
  healthFactor: number | null; // null == no debt (infinite HF)
  liquidationThresholdBps: number;
  liquidationPriceUsd: number; // collateral price at which HF hits 1.0
  protocolFeeUsd: number;
  netReceivedUsd: number;
  borrowApr: number;
  withinMaxLtv: boolean;
  liquidatable: boolean;
  eligibleCollateral: boolean;
}

export async function simulate(input: SimulateInput): Promise<SimulateResult> {
  const tokens = await getTokens();
  const token = tokens.find((t) => t.mint === input.mint);
  if (!token) throw new Error(`unknown collateral mint: ${input.mint}`);

  const collateral = Math.max(0, input.collateral || 0);
  const borrow = Math.max(0, input.borrow || 0);
  const boost = Boolean(input.boost);

  const priceUsd = token.priceUsd;
  const collateralValueUsd = collateral * priceUsd;
  const maxLtvBps = token.maxLtvBps + (boost ? VRISE_BOOST_LTV_BPS : 0);
  const maxBorrowUsd = (collateralValueUsd * maxLtvBps) / BPS;
  const hf = healthFactor(collateralValueUsd, borrow);
  const liqThreshold = LIQUIDATION_THRESHOLD_BPS / BPS;
  const liquidationPriceUsd =
    collateral > 0 && borrow > 0 ? borrow / (collateral * liqThreshold) : 0;
  const protocolFeeUsd = boost ? 0 : (borrow * PROTOCOL_FEE_BPS) / BPS;

  const pool = await getPoolMetrics();

  return {
    mint: token.mint,
    symbol: token.symbol,
    priceUsd,
    collateral,
    borrow,
    boost,
    collateralValueUsd,
    maxLtvBps,
    maxLtvPct: maxLtvBps / 100,
    maxBorrowUsd,
    healthFactor: Number.isFinite(hf) ? hf : null,
    liquidationThresholdBps: LIQUIDATION_THRESHOLD_BPS,
    liquidationPriceUsd,
    protocolFeeUsd,
    netReceivedUsd: Math.max(0, borrow - protocolFeeUsd),
    borrowApr: pool.borrowApr,
    withinMaxLtv: borrow <= maxBorrowUsd + 1e-9,
    liquidatable: borrow > 0 && Number.isFinite(hf) && hf < 1,
    eligibleCollateral: token.eligible,
  };
}
