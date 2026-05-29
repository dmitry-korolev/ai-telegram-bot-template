import { existsSync, readFileSync } from "node:fs";
import type { Update } from "grammy/types";

export type LogLevel = "fatal" | "error" | "warn" | "info" | "debug" | "trace" | "silent";
export type AgentTask = "chat" | "intent" | "summary" | "tool";
export type BotAllowedUpdate = Exclude<keyof Update, "update_id">;

export interface LlmProviderConfig {
  baseURL: string;
  apiKeyEnv: string;
  headers?: Record<string, string>;
  models: Partial<Record<AgentTask | "default", string>>;
}

export interface AppConfig {
  nodeEnv: "development" | "test" | "production";
  isProduction: boolean;
  botToken: string;
  botAllowedUpdates: BotAllowedUpdate[];
  botAdmins: number[];
  databaseUrl: string;
  healthHost: string;
  healthPort: number;
  logLevel: LogLevel;
  llmDefaultProvider: string;
  llmProviders: Record<string, LlmProviderConfig>;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const source = env === process.env ? loadProcessEnv() : env;
  const nodeEnv = parseNodeEnv(source.NODE_ENV);
  const botToken = required(source.BOT_TOKEN, "BOT_TOKEN");
  const llmDefaultProvider = required(source.LLM_DEFAULT_PROVIDER, "LLM_DEFAULT_PROVIDER");
  const llmProviders = parseLlmProviders(required(source.LLM_PROVIDERS_JSON, "LLM_PROVIDERS_JSON"));

  if (!llmProviders[llmDefaultProvider]) {
    throw new Error(`LLM_DEFAULT_PROVIDER "${llmDefaultProvider}" is not present in LLM_PROVIDERS_JSON`);
  }

  return {
    nodeEnv,
    isProduction: nodeEnv === "production",
    botToken,
    botAllowedUpdates: parseJsonArray<BotAllowedUpdate>(source.BOT_ALLOWED_UPDATES, "BOT_ALLOWED_UPDATES", []),
    botAdmins: parseJsonArray<number>(source.BOT_ADMINS, "BOT_ADMINS", []),
    databaseUrl: source.DATABASE_URL ?? "file:./data/bot.sqlite",
    healthHost: source.HEALTH_HOST ?? "0.0.0.0",
    healthPort: parsePort(source.HEALTH_PORT ?? "3000"),
    logLevel: parseLogLevel(source.LOG_LEVEL ?? "info"),
    llmDefaultProvider,
    llmProviders,
  };
}

export function loadProcessEnv(): NodeJS.ProcessEnv {
  return {
    ...readDotEnvFile(".env"),
    ...process.env,
  };
}

function required(value: string | undefined, name: string): string {
  if (!value || value.trim() === "") {
    throw new Error(`${name} is required`);
  }

  return value;
}

function parseNodeEnv(value: string | undefined): AppConfig["nodeEnv"] {
  if (value === "production" || value === "test" || value === "development") {
    return value;
  }

  return "development";
}

function parsePort(value: string): number {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`HEALTH_PORT must be an integer between 1 and 65535`);
  }

  return port;
}

function parseLogLevel(value: string): LogLevel {
  const levels: LogLevel[] = ["fatal", "error", "warn", "info", "debug", "trace", "silent"];
  if (!levels.includes(value as LogLevel)) {
    throw new Error(`LOG_LEVEL must be one of: ${levels.join(", ")}`);
  }

  return value as LogLevel;
}

function parseJsonArray<T>(value: string | undefined, name: string, fallback: T[]): T[] {
  if (!value || value.trim() === "") {
    return fallback;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      throw new Error("not an array");
    }

    return parsed as T[];
  } catch (error) {
    throw new Error(`${name} must be a JSON array: ${(error as Error).message}`);
  }
}

function parseLlmProviders(value: string): Record<string, LlmProviderConfig> {
  const parsed = JSON.parse(value) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("LLM_PROVIDERS_JSON must be an object");
  }

  for (const [providerId, provider] of Object.entries(parsed)) {
    if (!provider || typeof provider !== "object" || Array.isArray(provider)) {
      throw new Error(`LLM provider "${providerId}" must be an object`);
    }

    const candidate = provider as Partial<LlmProviderConfig>;
    if (!candidate.baseURL || !candidate.apiKeyEnv || !candidate.models?.default) {
      throw new Error(`LLM provider "${providerId}" requires baseURL, apiKeyEnv and models.default`);
    }
  }

  return parsed as Record<string, LlmProviderConfig>;
}

function readDotEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) {
    return {};
  }

  const values: Record<string, string> = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    values[key] = stripOptionalQuotes(rawValue);
  }

  return values;
}

function stripOptionalQuotes(value: string): string {
  if (
    (value.startsWith("\"") && value.endsWith("\"")) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}
