import { createAgentRunner } from "./agents/index.js";
import type { AppConfig } from "./config/env.js";
import { createDatabase } from "./db/client.js";
import { createLlmClient } from "./llm/openai-compatible.js";
import { createLogger } from "./shared/logger.js";
import { createBot } from "./bot/index.js";

export function createApp(config: AppConfig) {
  const logger = createLogger(config);
  const database = createDatabase(config.databaseUrl);
  const llm = createLlmClient({ config });
  const agents = createAgentRunner(llm);
  const bot = createBot(config.botToken, {
    agents,
    config,
    db: database.db,
    logger,
  });

  return {
    agents,
    bot,
    database,
    logger,
  };
}
