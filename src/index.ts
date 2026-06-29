/**
 * Vaultrise backend entrypoint: public API + off-chain cron services.
 */
import cors from "cors";
import express from "express";
import { config } from "./config";
import { router } from "./routes";
import { startAlertBot } from "./services/alertBot";
import { startLiquidationBot } from "./services/liquidationBot";
import { startLpChecker } from "./services/lpChecker";
import { startTwapAggregator } from "./services/twapAggregator";
import { startTelegramCommandListener } from "./telegram";

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: config.corsOrigins.length ? config.corsOrigins : "*",
  })
);
app.use("/api", router);

app.get("/", (_req, res) => res.json({ name: "vaultrise-backend", cluster: config.cluster }));

app.listen(config.port, () => {
  console.log(`[vaultrise] API listening on :${config.port} (cluster=${config.cluster})`);
  console.log(`[vaultrise] program=${config.programId} deployed=${config.isDeployed}`);

  // Start off-chain services. Each degrades gracefully if keys/addresses are missing.
  startTwapAggregator();
  startLiquidationBot();
  startLpChecker();
  startAlertBot();
  startTelegramCommandListener();
});
