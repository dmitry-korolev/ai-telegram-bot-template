import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { loadConfig } from "../../src/config/env.js";

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
  it("loads valid environment", () => {
    const config = loadConfig({
      BOT_TOKEN: "token",
      BOT_ALLOWED_UPDATES: "[\"message\"]",
      BOT_ADMINS: "[1,2]",
      LLM_DEFAULT_PROVIDER: "test",
      LLM_PROVIDERS_JSON: providers,
    });

    expect(config.botToken).toBe("token");
    expect(config.botAllowedUpdates).toEqual(["message"]);
    expect(config.botAdmins).toEqual([1, 2]);
    expect(config.llmProviders.test?.models.chat).toBe("chat-model");
  });

  it("loads .env for process environment without overriding exported variables", () => {
    const previousCwd = process.cwd();
    const envKeys = ["BOT_TOKEN", "LLM_DEFAULT_PROVIDER", "LLM_PROVIDERS_JSON"] as const;
    const previousEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
    const tempDir = mkdtempSync(join(tmpdir(), "bot-template-env-"));

    try {
      for (const key of envKeys) {
        delete process.env[key];
      }
      process.env.BOT_TOKEN = "from-process";
      process.chdir(tempDir);
      writeFileSync(
        ".env",
        `BOT_TOKEN=from-file\nLLM_DEFAULT_PROVIDER=test\nLLM_PROVIDERS_JSON=${providers}\n`,
      );

      const config = loadConfig();

      expect(config.botToken).toBe("from-process");
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

  it("rejects missing bot token", () => {
    expect(() =>
      loadConfig({
        LLM_DEFAULT_PROVIDER: "test",
        LLM_PROVIDERS_JSON: providers,
      }),
    ).toThrow("BOT_TOKEN is required");
  });
});
