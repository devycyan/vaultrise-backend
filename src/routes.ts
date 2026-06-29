/**
 * Public REST API. All responses are JSON and safe to call before the protocol
 * is deployed (they return empty/zero shapes).
 */
import { Router } from "express";
import { cacheGet, cacheSet } from "./cache";
import { config } from "./config";
import {
  getAllPositions,
  getBurnStats,
  getLenderPosition,
  getPoolMetrics,
  getTokens,
  getUserPositions,
} from "./vaultrise/client";
import { getLiquidationFeed } from "./store";
import { simulate } from "./vaultrise/simulate";

export const router = Router();

router.get("/health", (_req, res) => {
  res.json({ ok: true, cluster: config.cluster, deployed: config.isDeployed });
});

router.get("/pool", async (_req, res) => {
  const cached = await cacheGet("api:pool");
  if (cached) return res.json(cached);
  const m = await getPoolMetrics();
  await cacheSet("api:pool", m, 20);
  res.json(m);
});

router.get("/tokens/eligible", async (req, res) => {
  const all = await getTokens();
  const list = req.query.all === "1" ? all : all.filter((t) => t.eligible);
  res.json(list);
});

// Borrow/liquidation simulator: preview LTV, health factor, liquidation price
// and fees for a hypothetical position. Read-only.
//   GET /api/simulate?mint=<mint>&collateral=<amount>&borrow=<usdc>&boost=0|1
router.get("/simulate", async (req, res) => {
  const mint = String(req.query.mint || "");
  const collateral = Number(req.query.collateral ?? 0);
  const borrow = Number(req.query.borrow ?? 0);
  const boost = req.query.boost === "1" || req.query.boost === "true";
  if (!mint) return res.status(400).json({ error: "query param 'mint' is required" });
  if (!Number.isFinite(collateral) || collateral < 0)
    return res.status(400).json({ error: "'collateral' must be a non-negative number" });
  if (!Number.isFinite(borrow) || borrow < 0)
    return res.status(400).json({ error: "'borrow' must be a non-negative number" });
  try {
    res.json(await simulate({ mint, collateral, borrow, boost }));
  } catch (e: any) {
    res.status(404).json({ error: e.message || "simulation failed" });
  }
});

router.get("/liquidatable", async (_req, res) => {
  const positions = await getAllPositions();
  const liq = positions
    .filter((p) => p.debtUsd > 0 && p.healthFactor < 1.0)
    .map((p) => ({ ...p, potentialProfit: p.debtUsd * 0.05 }));
  res.json(liq);
});

router.get("/positions/:wallet", async (req, res) => {
  const wallet = req.params.wallet;
  const [borrower, lender] = await Promise.all([
    getUserPositions(wallet),
    getLenderPosition(wallet),
  ]);
  res.json({ borrower, lender });
});

router.get("/burn", async (_req, res) => {
  const stats = await getBurnStats();
  res.json({ ...stats, dailyRate: 0 });
});

router.get("/analytics", async (_req, res) => {
  const cached = await cacheGet("api:analytics");
  if (cached) return res.json(cached);

  const [metrics, positions, burn] = await Promise.all([
    getPoolMetrics(),
    getAllPositions(),
    getBurnStats(),
  ]);

  const byToken: Record<string, { symbol: string; collateralUsd: number; count: number }> = {};
  for (const p of positions) {
    const e = (byToken[p.symbol] ||= { symbol: p.symbol, collateralUsd: 0, count: 0 });
    e.collateralUsd += p.collateralValueUsd;
    e.count += 1;
  }
  const topCollateral = Object.values(byToken).sort((a, b) => b.collateralUsd - a.collateralUsd).slice(0, 10);

  const liquidationFeed = await getLiquidationFeed(20);
  const payload = {
    tvl: metrics.tvl,
    totalBorrowed: metrics.totalBorrowed,
    totalLoans: metrics.totalLoansOpened,
    totalLiquidations: metrics.totalLiquidations,
    insuranceFund: metrics.insuranceFund,
    activePositions: metrics.activePositions,
    vriseBurned: burn.totalBurned,
    topCollateral,
    liquidationFeed,
  };
  await cacheSet("api:analytics", payload, 20);
  res.json(payload);
});
