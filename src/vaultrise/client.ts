/**
 * Read layer over the on-chain program. Every accessor degrades gracefully:
 * if the protocol is not deployed/initialized yet, it returns empty/zero values
 * so the API (and the frontend mockup) still render.
 */
import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { config, TokenInfo } from "../config";
import { loadTokens } from "../registry";
import { connection, pdas, readProgram } from "../solana";
import { borrowApr, healthFactor, lenderApy, utilization } from "./math";

const WAD = new BN("1000000000000000000");

async function tokenBalance(pubkey: PublicKey): Promise<number> {
  try {
    const r = await connection.getTokenAccountBalance(pubkey);
    return Number(r.value.amount);
  } catch {
    return 0;
  }
}

async function tokenSupply(mint: PublicKey): Promise<number> {
  try {
    const r = await connection.getTokenSupply(mint);
    return Number(r.value.amount);
  } catch {
    return 0;
  }
}

export async function getConfig(): Promise<any | null> {
  try {
    return await readProgram.account.protocolConfig.fetch(pdas.config());
  } catch {
    return null;
  }
}

export async function getReserve(): Promise<any | null> {
  try {
    return await readProgram.account.reservePool.fetch(pdas.reserve());
  } catch {
    return null;
  }
}

/** Current total outstanding debt in USDC base units. */
function currentDebtBase(reserve: any): number {
  if (!reserve) return 0;
  const scaled: BN = reserve.totalDebtScaled;
  const index: BN = reserve.cumulativeBorrowIndex;
  return Number(scaled.mul(index).div(WAD).toString());
}

export interface PoolMetrics {
  tvl: number;
  totalBorrowed: number;
  available: number;
  utilization: number;
  borrowApr: number;
  lenderApy: number;
  insuranceFund: number;
  gusdcSupply: number;
  exchangeRate: number;
  activePositions: number;
  totalLoansOpened: number;
  totalLiquidations: number;
  deployed: boolean;
}

export async function getPoolMetrics(): Promise<PoolMetrics> {
  const empty: PoolMetrics = {
    tvl: 0, totalBorrowed: 0, available: 0, utilization: 0, borrowApr: 0.12,
    lenderApy: 0, insuranceFund: 0, gusdcSupply: 0, exchangeRate: 1,
    activePositions: 0, totalLoansOpened: 0, totalLiquidations: 0, deployed: false,
  };
  const reserve = await getReserve();
  if (!reserve) return empty;

  const cash = await tokenBalance(pdas.usdcVault());
  const debt = currentDebtBase(reserve);
  const insurance = await tokenBalance(pdas.insuranceVault());
  const gusdc = await tokenSupply(pdas.gusdcMint());
  const util = utilization(debt, cash);
  const totalAssets = cash + debt;
  const positions = await getAllPositions();
  const active = positions.filter((p) => p.principalUsd > 0).length;

  return {
    tvl: totalAssets / 1e6,
    totalBorrowed: debt / 1e6,
    available: cash / 1e6,
    utilization: util,
    borrowApr: borrowApr(util),
    lenderApy: lenderApy(util),
    insuranceFund: insurance / 1e6,
    gusdcSupply: gusdc / 1e6,
    exchangeRate: gusdc > 0 ? totalAssets / gusdc : 1,
    activePositions: active,
    totalLoansOpened: Number(reserve.totalLoansOpened ?? 0),
    totalLiquidations: Number(reserve.totalLiquidations ?? 0),
    deployed: true,
  };
}

export interface EligibleToken {
  symbol: string;
  mint: string;
  decimals: number;
  priceUsd: number;
  lpUsd: number;
  maxLtvBps: number;
  enabled: boolean;
  lpBlocked: boolean;
  eligible: boolean;
  priceTimestamp: number;
}

export async function getTokens(): Promise<EligibleToken[]> {
  const out: EligibleToken[] = [];
  const tokens = await loadTokens();
  for (const t of tokens) {
    const mint = new PublicKey(t.mint);
    let priceUsd = t.price;
    let priceTs = 0;
    let maxLtvBps = 2000;
    let enabled = true;
    let lpBlocked = false;
    try {
      const oracle: any = await readProgram.account.oraclePrice.fetch(pdas.oracle(mint));
      priceUsd = Number(oracle.price) / 1e6;
      priceTs = Number(oracle.timestamp);
    } catch {
      /* use deployment default price */
    }
    try {
      const tc: any = await readProgram.account.tokenConfig.fetch(pdas.tokenConfig(mint));
      maxLtvBps = tc.maxLtvBps;
      enabled = tc.enabled;
      lpBlocked = tc.lpBlocked;
    } catch {
      /* defaults */
    }
    const quoteReserve = await tokenBalance(new PublicKey(t.pool.quoteVault));
    const lpUsd = (quoteReserve / 1e6) * 2;
    out.push({
      symbol: t.symbol,
      mint: t.mint,
      decimals: t.decimals,
      priceUsd,
      lpUsd,
      maxLtvBps,
      enabled,
      lpBlocked,
      eligible: enabled && !lpBlocked && lpUsd >= config.minLpUsd,
      priceTimestamp: priceTs,
    });
  }
  return out;
}

export interface PositionView {
  borrower: string;
  mint: string;
  symbol: string;
  collateralAmount: number;
  collateralValueUsd: number;
  debtUsd: number;
  principalUsd: number;
  healthFactor: number;
  ltv: number;
  priceUsd: number;
  openedAt: number;
  shieldExpiry: number;
}

async function priceMap(): Promise<Record<string, number>> {
  const tokens = await getTokens();
  const m: Record<string, number> = {};
  tokens.forEach((t) => (m[t.mint] = t.priceUsd));
  return m;
}

function toView(
  p: any,
  reserve: any,
  prices: Record<string, number>,
  metaMap: Map<string, TokenInfo>
): PositionView {
  const mint = p.collateralMint.toBase58();
  const meta = metaMap.get(mint);
  const decimals = meta?.decimals ?? 6;
  const price = prices[mint] ?? meta?.price ?? 0;
  const collateral = Number(p.collateralAmount) / 10 ** decimals;
  const collateralValue = collateral * price;
  const index: BN = reserve?.cumulativeBorrowIndex ?? WAD;
  const debtBase = Number((p.debtScaled as BN).mul(index).div(WAD).toString());
  const debtUsd = debtBase / 1e6;
  const principalUsd = Number(p.principal) / 1e6;
  return {
    borrower: p.borrower.toBase58(),
    mint,
    symbol: meta?.symbol ?? "TOKEN",
    collateralAmount: collateral,
    collateralValueUsd: collateralValue,
    debtUsd,
    principalUsd,
    healthFactor: healthFactor(collateralValue, debtUsd),
    ltv: collateralValue > 0 ? debtUsd / collateralValue : 0,
    priceUsd: price,
    openedAt: Number(p.openedAt),
    shieldExpiry: Number(p.shieldExpiry),
  };
}

export async function getAllPositions(): Promise<PositionView[]> {
  try {
    const reserve = await getReserve();
    const prices = await priceMap();
    const metaMap = new Map((await loadTokens()).map((t) => [t.mint, t]));
    const all = await readProgram.account.userPosition.all();
    return all
      .map((a: any) => toView(a.account, reserve, prices, metaMap))
      .filter((p: PositionView) => p.principalUsd > 0 || p.collateralAmount > 0);
  } catch {
    return [];
  }
}

export async function getUserPositions(wallet: string): Promise<PositionView[]> {
  try {
    const owner = new PublicKey(wallet);
    const reserve = await getReserve();
    const prices = await priceMap();
    const metaMap = new Map((await loadTokens()).map((t) => [t.mint, t]));
    const all = await readProgram.account.userPosition.all([
      { memcmp: { offset: 8, bytes: owner.toBase58() } },
    ]);
    return all
      .map((a: any) => toView(a.account, reserve, prices, metaMap))
      .filter((p: PositionView) => p.principalUsd > 0 || p.collateralAmount > 0);
  } catch {
    return [];
  }
}

export interface LenderView {
  gusdc: number;
  usdcValue: number;
}

export async function getLenderPosition(wallet: string): Promise<LenderView> {
  try {
    const owner = new PublicKey(wallet);
    const { getAssociatedTokenAddressSync } = await import("@solana/spl-token");
    const gusdcAta = getAssociatedTokenAddressSync(pdas.gusdcMint(), owner, true);
    const gusdc = await tokenBalance(gusdcAta);
    const metrics = await getPoolMetrics();
    return { gusdc: gusdc / 1e6, usdcValue: (gusdc / 1e6) * metrics.exchangeRate };
  } catch {
    return { gusdc: 0, usdcValue: 0 };
  }
}

export async function getBurnStats(): Promise<{
  totalBurned: number;
  circulatingSupply: number;
  totalSupply: number;
}> {
  const cfg = await getConfig();
  const totalBurned = cfg ? Number(cfg.totalVriseBurned) / 1e6 : 0;
  let supply = 0;
  if (config.vriseMint) supply = (await tokenSupply(new PublicKey(config.vriseMint))) / 1e6;
  return {
    totalBurned,
    circulatingSupply: supply,
    totalSupply: 1_000_000_000,
  };
}
