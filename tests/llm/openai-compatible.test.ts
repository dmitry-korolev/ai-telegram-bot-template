import { describe, expect, it, vi } from "vitest";

import { OpenAiCompatibleLlmClient } from "../../src/llm/openai-compatible.js";

describe("OpenAiCompatibleLlmClient", () => {
  it("builds requests with configured provider baseURL and model", async () => {
    const create = vi.fn().mockResolvedValue({
      choices: [{ message: { content: "hello" } }],
    });
    const factory = vi.fn(() => ({
      chat: {
        completions: {
          create,
        },
      },
    }));

    const client = new OpenAiCompatibleLlmClient({
      env: { API_KEY: "secret" },
      config: {
        llmDefaultProvider: "compatible",
        llmProviders: {
          compatible: {
            baseURL: "https://llm.example.test/v1",
            apiKeyEnv: "API_KEY",
            models: {
              default: "fallback",
              chat: "chat-model",
            },
          },
        },
      },
      clientFactory: factory,
    });

    const result = await client.generateText({
      task: "chat",
      messages: [{ role: "user", content: "Hi" }],
    });

    expect(factory).toHaveBeenCalledWith({
      apiKey: "secret",
      baseURL: "https://llm.example.test/v1",
      headers: undefined,
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "chat-model",
        messages: [{ role: "user", content: "Hi" }],
      }),
    );
    expect(result).toEqual({
      text: "hello",
      providerId: "compatible",
      model: "chat-model",
    });
  });
});
