import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { loadConfig, safeConfigFacts } from "../../src/config/env.js";

const providers = JSON.stringify({
  test: {
    baseURL: "https://example.test/v1",
    apiKeyEnv: "TEST_API_KEY",
    models: {
      default: "default-model",
      chat: "chat-model",
    },
  },
});

describe("loadConfig", () => {
  it("loads valid environment from compatibility JSON", () => {
    const config = loadConfig({
      BOT_TOKEN: "token",
      BOT_ALLOWED_UPDATES: '["message"]',
      BOT_ADMINS: "[1,2]",
      BOT_ALLOWED_CHATS: "[10,20]",
      LLM_DEFAULT_PROVIDER: "test",
      LLM_PROVIDERS_JSON: providers,
    });

    expect(config.botToken).toBe("token");
    expect(config.botAllowedUpdates).toEqual(["message"]);
    expect(config.botAdmins).toEqual([1, 2]);
    expect(config.botAllowedChats).toEqual([10, 20]);
    expect(config.llmProviders.test?.models.chat).toBe("chat-model");
  });

  it("loads provider config from file", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "bot-template-provider-"));

    try {
      const providersPath = join(tempDir, "providers.json");
      writeFileSync(providersPath, providers);

      const config = loadConfig({
        BOT_TOKEN: "token",
        LLM_DEFAULT_PROVIDER: "test",
        LLM_PROVIDERS_FILE: providersPath,
      });

      expect(config.llmProvidersFile).toBe(providersPath);
      expect(config.llmProviders.test?.baseURL).toBe("https://example.test/v1");
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("loads .env, selected ENV_FILE, then process environment", () => {
    const previousCwd = process.cwd();
    const envKeys = ["BOT_TOKEN", "LLM_DEFAULT_PROVIDER", "LLM_PROVIDERS_JSON", "ENV_FILE"] as const;
    const previousEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
    const tempDir = mkdtempSync(join(tmpdir(), "bot-template-env-"));

    try {
      for (const key of envKeys) {
        delete process.env[key];
      }
      process.env.BOT_TOKEN = "from-process";
      process.chdir(tempDir);
      writeFileSync(".env", "BOT_TOKEN=from-base\nENV_FILE=.env.development\nLLM_DEFAULT_PROVIDER=test\n");
      writeFileSync(".env.development", `BOT_TOKEN=from-overlay\nLLM_PROVIDERS_JSON=${providers}\n`);

      const config = loadConfig();

      expect(config.botToken).toBe("from-process");
      expect(config.envFile).toBe(".env.development");
      expect(config.llmDefaultProvider).toBe("test");
    } finally {
      process.chdir(previousCwd);
      rmSync(tempDir, { recursive: true, force: true });
      for (const key of envKeys) {
        const previousValue = previousEnv[key];
        if (previousValue === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = previousValue;
        }
      }
    }
  });

  it("rejects missing selected ENV_FILE", () => {
    const previousCwd = process.cwd();
    const previousEnvFile = process.env.ENV_FILE;
    const tempDir = mkdtempSync(join(tmpdir(), "bot-template-missing-env-"));

    try {
      process.chdir(tempDir);
      process.env.ENV_FILE = ".env.missing";

      expect(() => loadConfig()).toThrow("ENV_FILE could not be read from .env.missing");
    } finally {
      process.chdir(previousCwd);
      rmSync(tempDir, { recursive: true, force: true });
      if (previousEnvFile === undefined) {
        delete process.env.ENV_FILE;
      } else {
        process.env.ENV_FILE = previousEnvFile;
      }
    }
  });

  it("exposes safe config facts without secrets", () => {
    const config = loadConfig({
      BOT_TOKEN: "secret-token",
      BOT_ADMINS: "[1]",
      BOT_ALLOWED_CHATS: "[2,3]",
      LLM_DEFAULT_PROVIDER: "test",
      LLM_PROVIDERS_JSON: providers,
    });

    expect(safeConfigFacts(config)).toEqual(expect.objectContaining({
      providerIds: ["test"],
      allowedChatCount: 2,
      adminCount: 1,
    }));
    expect(JSON.stringify(safeConfigFacts(config))).not.toContain("secret-token");
  });

  it("rejects missing bot token", () => {
    expect(() =>
      loadConfig({
        LLM_DEFAULT_PROVIDER: "test",
        LLM_PROVIDERS_JSON: providers,
      }),
    ).toThrow("BOT_TOKEN is required");
  });
});
