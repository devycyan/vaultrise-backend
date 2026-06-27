/**
 * Read layer over the on-chain program. Every accessor degrades gracefully:
 * if the protocol is not deployed/initialized yet, it returns empty/zero values
 * so the API (and the frontend mockup) still render.
 */
import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { cacheGet, cacheSet } from "../cache";
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
  // Cached for 30s. getTokens() fans out across every API endpoint and the
  // liquidation bot, so without this each request would hit the RPC ~3x per
  // token; the cache makes concurrent callers share a single refresh.
  const cached = await cacheGet<EligibleToken[]>("tokens:list");
  if (cached) return cached;

  const tokens = await loadTokens();
  if (!tokens.length) return [];

  // Batch every on-chain read: one getMultipleAccounts for all oracles, one for
  // all token configs, one for all quote vaults — instead of 3 calls per token.
  let oracles: (any | null)[] = [];
  let tcs: (any | null)[] = [];
  let quoteInfos: ({ data: Buffer } | null)[] = [];
  try {
    [oracles, tcs, quoteInfos] = await Promise.all([
      readProgram.account.oraclePrice.fetchMultiple(tokens.map((t) => pdas.oracle(new PublicKey(t.mint)))),
      readProgram.account.tokenConfig.fetchMultiple(tokens.map((t) => pdas.tokenConfig(new PublicKey(t.mint)))),
      connection.getMultipleAccountsInfo(tokens.map((t) => new PublicKey(t.pool.quoteVault))),
    ]);
  } catch {
    /* RPC hiccup — fall back to deployment defaults per token below */
  }

  const out: EligibleToken[] = tokens.map((t, i) => {
    const oracle = oracles[i];
    const tc = tcs[i];
    const info = quoteInfos[i];
    const priceUsd = oracle ? Number(oracle.price) / 1e6 : t.price;
    const priceTimestamp = oracle ? Number(oracle.timestamp) : 0;
    const maxLtvBps = tc ? Number(tc.maxLtvBps) : 2000;
    const enabled = tc ? Boolean(tc.enabled) : true;
    const lpBlocked = tc ? Boolean(tc.lpBlocked) : false;
    // SPL token-account amount is a u64 LE at byte offset 64.
    const quoteRaw = info && info.data.length >= 72 ? Number(info.data.readBigUInt64LE(64)) : 0;
    const lpUsd = (quoteRaw / 1e6) * 2;
    return {
      symbol: t.symbol,
      mint: t.mint,
      decimals: t.decimals,
      priceUsd,
      lpUsd,
      maxLtvBps,
      enabled,
      lpBlocked,
      eligible: enabled && !lpBlocked && lpUsd >= config.minLpUsd,
      priceTimestamp,
    };
  });

  await cacheSet("tokens:list", out, 30);
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
  // Cached for 15s — called by the pool/analytics endpoints, the positions
  // endpoint and the liquidation bot; the plain view array is JSON-safe.
  const cached = await cacheGet<PositionView[]>("positions:all");
  if (cached) return cached;
  try {
    const reserve = await getReserve();
    const prices = await priceMap();
    const metaMap = new Map((await loadTokens()).map((t) => [t.mint, t]));
    const all = await readProgram.account.userPosition.all();
    const views = all
      .map((a: any) => toView(a.account, reserve, prices, metaMap))
      .filter((p: PositionView) => p.principalUsd > 0 || p.collateralAmount > 0);
    await cacheSet("positions:all", views, 15);
    return views;
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
