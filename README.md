# Vaultrise Backend

Off-chain services for Vaultrise: a public REST API plus three cron services
(TWAP oracle aggregator, liquidation bot, LP-concentration monitor). Reads the
deployed program via the synced Anchor IDL. Every part degrades gracefully — the
API returns empty/zero shapes before the protocol is deployed, and optional
integrations (Redis, Jupiter) are skipped when unset.

## Run

```bash
npm install
cp ../.env.example .env   # fill in the backend section (or copy from contract setup output)
npm run dev               # tsx watch
# or: npm run build && npm start
```

Configuration resolves addresses from env vars, falling back to
`../contract/deployments/<cluster>.json` written by the contract's `setup:devnet`.

## API

| Method | Path | Description |
|---|---|---|
| GET  | `/api/health` | Service + deployment status |
| GET  | `/api/pool` | APY, TVL, utilization, available liquidity, insurance fund |
| GET  | `/api/tokens/eligible` | Eligible collateral tokens (`?all=1` for all) with TWAP price, LP, max LTV |
| GET  | `/api/positions/:wallet` | A wallet's borrow positions + lender position |
| GET  | `/api/liquidatable` | Positions with HF < 1.0 and potential profit |
| GET  | `/api/analytics` | TVL, loans, liquidations, insurance, `$VRISE` burned, top collateral, liquidation feed |
| GET  | `/api/burn` | `$VRISE` burn totals and supply |

## Cron services

- **TWAP aggregator** — reads each token's PumpSwap pool reserves (mock pools on
  devnet), keeps a 30-min rolling average, pushes the price on-chain via the
  oracle-updater key. Deviation guard clamps inflated spot prices.
- **Liquidation bot** — liquidates positions with HF < 1.0; sells seized
  collateral via Jupiter on mainnet (simulated on devnet).
- **LP checker** — flags tokens whose top-3 holders exceed 60% (enforced on
  mainnet; reported only on devnet so the mock demo isn't blocked).

All on-chain writes use repo-local keypairs from `../wallets/` (never `~/.config/solana`).

## Deploy

Designed for Railway / Fly.io (a single web service that also runs the cron
loops). Set the env vars from `.env.example` and point `RPC_URL` at a Helius (or
similar) endpoint for production.
