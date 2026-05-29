import type { Context } from "grammy";

import type { AgentRunner } from "../agents/index.js";
import type { AppConfig } from "../config/env.js";
import type { DatabaseClient } from "../db/client.js";
import type { AppLogger } from "../shared/logger.js";

export interface BotDependencies {
  agents: AgentRunner;
  config: AppConfig;
  db: DatabaseClient;
  logger: AppLogger;
}

export interface BotContext extends Context {
  deps: BotDependencies;
}
