import type { Logger } from "pino";
import pino from "pino";

import type { AppConfig } from "../config/env.js";

export type AppLogger = Logger;

export function createLogger(config: Pick<AppConfig, "logLevel" | "nodeEnv">): AppLogger {
  return pino({
    level: config.logLevel,
    transport:
      config.nodeEnv === "development"
        ? {
            target: "pino-pretty",
            options: {
              colorize: true,
              translateTime: "HH:MM:ss",
              ignore: "pid,hostname",
            },
          }
        : undefined,
  });
}
