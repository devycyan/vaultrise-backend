/**
 * Telegram alert bot — liquidations (per-user).
 *
 * Subscribes to the program's on-chain logs and, for every liquidation, DMs the
 * affected wallets (borrower / liquidator) that subscribed via
 * POST /api/alerts/subscribe. Degrades gracefully: without TELEGRAM_BOT_TOKEN it
 * logs instead of sending, and without a deployed program it stays idle.
 */
import { config } from "../config";
import { anchor, connection, programId, readProgram } from "../solana";
import { getSubscription } from "../store";
import { sendTelegram, telegramConfigured } from "../telegram";
import { getTokens } from "../vaultrise/client";

// mint -> { symbol, decimals }, refreshed periodically for nicer messages.
let tokenMeta: Record<string, { symbol: string; decimals: number }> = {};
async function refreshTokenMeta(): Promise<void> {
  try {
    const tokens = await getTokens();
    const next: Record<string, { symbol: string; decimals: number }> = {};
    tokens.forEach((t) => (next[t.mint] = { symbol: t.symbol, decimals: t.decimals }));
    tokenMeta = next;
  } catch {
    /* keep previous map */
  }
}

// Anchor decodes event fields under the IDL names; read defensively (snake/camel).
function field(obj: any, snake: string): any {
  const camel = snake.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
  return obj?.[snake] ?? obj?.[camel];
}
function num(x: any): number {
  if (x == null) return 0;
  return typeof x === "object" && x.toString ? Number(x.toString()) : Number(x);
}
function mintStr(pk: any): string {
  return pk?.toBase58 ? pk.toBase58() : String(pk ?? "");
}
function short(pk: any): string {
  const s = mintStr(pk);
  return s.length > 10 ? `${s.slice(0, 4)}…${s.slice(-4)}` : s;
}
function symbolOf(mint: string): string {
  return tokenMeta[mint]?.symbol || short(mint);
}
function tokenAmount(mint: string, raw: number): number {
  return raw / 10 ** (tokenMeta[mint]?.decimals ?? 6);
}

export function formatLiquidation(d: any): string {
  const mint = mintStr(field(d, "collateral_mint"));
  const debt = num(field(d, "debt_repaid")) / 1e6;
  const seized = tokenAmount(mint, num(field(d, "collateral_seized")));
  const bonusBps = num(field(d, "liquidator_bonus_bps"));
  const insurance = num(field(d, "insurance_amount")) / 1e6;
  return [
    "🔴 <b>Liquidation</b>",
    `Borrower: <code>${short(field(d, "borrower"))}</code>`,
    `Liquidator: <code>${short(field(d, "liquidator"))}</code>`,
    `Debt repaid: <b>$${debt.toFixed(2)}</b>`,
    `Seized: <b>${seized.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${symbolOf(mint)}</b>`,
    `Bonus: ${(bonusBps / 100).toFixed(1)}% · Insurance: $${insurance.toFixed(2)}`,
  ].join("\n");
}

// DM each subscribed wallet involved in an event (deduped by wallet).
async function notify(d: any, walletFields: string[], msg: string): Promise<void> {
  const seen = new Set<string>();
  for (const f of walletFields) {
    const wallet = mintStr(field(d, f));
    if (!wallet || seen.has(wallet)) continue;
    seen.add(wallet);
    try {
      const tgId = await getSubscription(wallet);
      if (tgId) await sendTelegram(tgId, msg);
    } catch (e: any) {
      console.error("[alertBot] notify failed:", e.message);
    }
  }
}

export function startAlertBot(): void {
  if (!config.isDeployed) {
    console.log("[alertBot] protocol not deployed — liquidation alerts off");
    return;
  }
  void refreshTokenMeta();
  setInterval(refreshTokenMeta, 5 * 60 * 1000);

  const parser = new anchor.EventParser(programId, readProgram.coder);
  console.log(
    `[alertBot] watching ${programId.toBase58()} for liquidations (telegram ${
      telegramConfigured() ? "enabled" : "disabled — logging only"
    })`
  );
  connection.onLogs(
    programId,
    (logs) => {
      if (logs.err) return;
      try {
        for (const ev of parser.parseLogs(logs.logs)) {
          if (ev.name === "LiquidateEvent" || ev.name === "liquidateEvent") {
            void notify(ev.data, ["borrower", "liquidator"], formatLiquidation(ev.data));
          }
        }
      } catch (e: any) {
        console.error("[alertBot] log parse error:", e.message);
      }
    },
    "confirmed"
  );
}
