import process from "node:process";
import { run, type RunnerHandle } from "@grammyjs/runner";

import { createApp } from "./app.js";
import { loadConfig, safeConfigFacts } from "./config/env.js";
import { runMigrations } from "./db/migrations.js";
import { startHealthServer, type HealthServerHandle } from "./server/health.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const app = createApp(config);
  app.logger.info(safeConfigFacts(config), "Configuration loaded");
  const handles: {
    runner?: RunnerHandle;
    health?: HealthServerHandle;
  } = {};

  const shutdown = createShutdownHandler(async () => {
    app.logger.info("Shutdown started");
    await handles.runner?.stop();
    await handles.health?.stop();
    app.database.sqlite.close();
    app.logger.info("Shutdown complete");
  });

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);

  runMigrations(app.database.db);
  await app.bot.init();
  await app.bot.api.deleteWebhook();

  handles.health = await startHealthServer({
    host: config.healthHost,
    port: config.healthPort,
    logger: app.logger,
  });

  handles.runner = run(app.bot, {
    runner: {
      fetch: {
        allowed_updates: config.botAllowedUpdates,
      },
    },
  });

  app.logger.info({ username: app.bot.botInfo.username }, "Bot is running in polling mode");
}

function createShutdownHandler(cleanup: () => Promise<void>): () => void {
  let isShuttingDown = false;

  return () => {
    if (isShuttingDown) {
      return;
    }

    isShuttingDown = true;
    cleanup().catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    });
  };
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
