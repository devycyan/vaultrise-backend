/**
 * Backend configuration. Addresses come from explicit env vars when set,
 * otherwise from the contract's deployment file (../contract/deployments/<cluster>.json).
 * The protocol may not be deployed yet — callers handle missing addresses.
 */
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import idl from "./vaultrise/idl/vaultrise.json";

dotenv.config();

export interface PoolInfo {
  authority: string;
  baseVault: string;
  quoteVault: string;
  baseMint: string;
  quoteMint: string;
  baseDecimals: number;
  quoteDecimals: number;
}

export interface TokenInfo {
  symbol: string;
  mint: string;
  decimals: number;
  price: number;
  pool: PoolInfo;
}

export interface Deployment {
  cluster?: string;
  programId?: string;
  usdcMint?: string;
  vriseMint?: string;
  feeRecipient?: string;
  oracleUpdater?: string;
  tokens?: TokenInfo[];
}

const CLUSTER = process.env.CLUSTER || "devnet";

function loadDeployment(): Deployment {
  const p = path.resolve(__dirname, "..", "..", "contract", "deployments", `${CLUSTER}.json`);
  try {
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {
    /* ignore */
  }
  return {};
}

const deployment = loadDeployment();

export const config = {
  port: Number(process.env.PORT || 4000),
  cluster: CLUSTER,
  rpcUrl: process.env.RPC_URL || "https://api.devnet.solana.com",
  programId: process.env.PROGRAM_ID || deployment.programId || (idl as any).address,
  usdcMint: process.env.USDC_MINT || deployment.usdcMint || "",
  vriseMint: process.env.VRISE_MINT || deployment.vriseMint || "",
  pumpswapProgramId:
    process.env.PUMPSWAP_PROGRAM_ID || "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA",
  tokens: deployment.tokens || [],
  adminKeypair: process.env.ADMIN_KEYPAIR || "../wallets/admin.json",
  oracleUpdaterKeypair: process.env.ORACLE_UPDATER_KEYPAIR || "../wallets/oracle-updater.json",
  liquidatorKeypair: process.env.LIQUIDATOR_KEYPAIR || "../wallets/liquidator.json",
  twapIntervalSec: Number(process.env.TWAP_INTERVAL_SECONDS || 300),
  // Set TWAP_ENABLED=false to stop the oracle aggregator (e.g. when testing
  // liquidations with a manually-set price you don't want overwritten).
  twapEnabled: process.env.TWAP_ENABLED !== "false",
  liquidationIntervalSec: Number(process.env.LIQUIDATION_INTERVAL_SECONDS || 300),
  lpCheckIntervalSec: Number(process.env.LP_CHECK_INTERVAL_SECONDS || 600),
  // Minimum PumpSwap LP (USD) for a token to be borrow-eligible. Lower for testing.
  minLpUsd: Number(process.env.MIN_LP_USD || 50_000),
  // LP (USD) below which the TWAP aggregator stops pushing a price (unhedgeable).
  // Must be <= minLpUsd, or eligible tokens would have no fresh oracle price.
  twapMinLpUsd: Number(process.env.TWAP_MIN_LP_USD || 10_000),
  redisUrl: process.env.REDIS_URL || "",
  // PostgreSQL connection string (Prisma). Empty => in-memory fallback storage.
  databaseUrl: process.env.DATABASE_URL || "",
  jupiterApiUrl: process.env.JUPITER_API_URL || "https://api.jup.ag/swap/v2",
  jupiterApiKey: process.env.JUPITER_API_KEY || "",
  corsOrigins: (process.env.CORS_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean),
  isDeployed: Boolean(deployment.programId || process.env.PROGRAM_ID),
};

export const deploymentTokens = deployment.tokens || [];
