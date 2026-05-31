import { existsSync, readFileSync } from "node:fs";
import type { Update } from "grammy/types";

export type LogLevel = "fatal" | "error" | "warn" | "info" | "debug" | "trace" | "silent";
export type AgentTask = "chat" | "intent" | "summary" | "tool";
export type ModelTask = AgentTask | "vision";
export type BotAllowedUpdate = Exclude<keyof Update, "update_id">;

export interface LlmProviderConfig {
  baseURL: string;
  apiKeyEnv: string;
  apiKeyHeader?: string;
  headers?: Record<string, string>;
  headersEnv?: string;
  modelUriTemplate?: string;
  models: Partial<Record<ModelTask | "default", string>>;
}

export interface AppConfig {
  nodeEnv: "development" | "test" | "production";
  isProduction: boolean;
  envProfile: string;
  envFile?: string;
  botToken: string;
  botAllowedUpdates: BotAllowedUpdate[];
  botAdmins: number[];
  botAllowedChats: number[];
  databaseUrl: string;
  healthHost: string;
  healthPort: number;
  logLevel: LogLevel;
  llmDefaultProvider: string;
  llmProvidersFile?: string;
  llmProviders: Record<string, LlmProviderConfig>;
  visionMaxBytes: number;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const source = env === process.env ? loadProcessEnv() : env;
  const nodeEnv = parseNodeEnv(source.NODE_ENV);
  const llmProvidersFile = source.LLM_PROVIDERS_FILE?.trim() || undefined;
  const llmProviders = loadLlmProviders(source, llmProvidersFile);
  const llmDefaultProvider = required(source.LLM_DEFAULT_PROVIDER, "LLM_DEFAULT_PROVIDER");

  if (!llmProviders[llmDefaultProvider]) {
    throw new Error(`LLM_DEFAULT_PROVIDER "${llmDefaultProvider}" is not present in configured LLM providers`);
  }

  return {
    nodeEnv,
    isProduction: nodeEnv === "production",
    envProfile: source.ENV_PROFILE ?? nodeEnv,
    envFile: source.ENV_FILE,
    botToken: required(source.BOT_TOKEN, "BOT_TOKEN"),
    botAllowedUpdates: parseJsonArray<BotAllowedUpdate>(source.BOT_ALLOWED_UPDATES, "BOT_ALLOWED_UPDATES", []),
    botAdmins: parseJsonArray<number>(source.BOT_ADMINS, "BOT_ADMINS", []),
    botAllowedChats: parseJsonArray<number>(source.BOT_ALLOWED_CHATS, "BOT_ALLOWED_CHATS", []),
    databaseUrl: source.DATABASE_URL ?? "file:./data/bot.sqlite",
    healthHost: source.HEALTH_HOST ?? "0.0.0.0",
    healthPort: parsePort(source.HEALTH_PORT ?? "3000"),
    logLevel: parseLogLevel(source.LOG_LEVEL ?? "info"),
    llmDefaultProvider,
    llmProvidersFile,
    llmProviders,
    visionMaxBytes: parsePositiveInteger(source.VISION_MAX_BYTES ?? "4194304", "VISION_MAX_BYTES"),
  };
}

export function loadProcessEnv(): NodeJS.ProcessEnv {
  const base = readDotEnvFile(".env", false);
  const envFile = process.env.ENV_FILE ?? base.ENV_FILE;
  const overlay = envFile ? readDotEnvFile(envFile, true) : {};

  return {
    ...base,
    ...overlay,
    ...process.env,
  };
}

export function safeConfigFacts(config: AppConfig): Record<string, unknown> {
  return {
    nodeEnv: config.nodeEnv,
    envProfile: config.envProfile,
    envFile: config.envFile,
    providerIds: Object.keys(config.llmProviders),
    llmDefaultProvider: config.llmDefaultProvider,
    allowedChatCount: config.botAllowedChats.length,
    adminCount: config.botAdmins.length,
    healthHost: config.healthHost,
    healthPort: config.healthPort,
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
    throw new Error("HEALTH_PORT must be an integer between 1 and 65535");
  }

  return port;
}

function parsePositiveInteger(value: string, name: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer`);
  }

  return parsed;
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

function loadLlmProviders(
  env: NodeJS.ProcessEnv,
  filePath: string | undefined,
): Record<string, LlmProviderConfig> {
  if (filePath) {
    return parseLlmProviders(readJsonFile(filePath, "LLM_PROVIDERS_FILE"));
  }

  return parseLlmProviders(required(env.LLM_PROVIDERS_JSON, "LLM_PROVIDERS_JSON"));
}

function parseLlmProviders(value: string): Record<string, LlmProviderConfig> {
  const parsed = JSON.parse(value) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("LLM providers config must be an object");
  }

  for (const [providerId, provider] of Object.entries(parsed)) {
    if (!provider || typeof provider !== "object" || Array.isArray(provider)) {
      throw new Error(`LLM provider "${providerId}" must be an object`);
    }

    const candidate = provider as Partial<LlmProviderConfig>;
    if (!candidate.baseURL || !candidate.apiKeyEnv || !candidate.models?.default) {
      throw new Error(`LLM provider "${providerId}" requires baseURL, apiKeyEnv and models.default`);
    }

    if (candidate.headers && typeof candidate.headers !== "object") {
      throw new Error(`LLM provider "${providerId}" headers must be an object`);
    }
  }

  return parsed as Record<string, LlmProviderConfig>;
}

function readJsonFile(path: string, name: string): string {
  try {
    return readFileSync(path, "utf8");
  } catch (error) {
    throw new Error(`${name} could not be read from ${path}: ${(error as Error).message}`);
  }
}

function readDotEnvFile(path: string, requiredFile: boolean): Record<string, string> {
  if (!existsSync(path)) {
    if (requiredFile) {
      throw new Error(`ENV_FILE could not be read from ${path}`);
    }

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
