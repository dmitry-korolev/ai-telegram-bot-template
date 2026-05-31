import { describe, expect, it, vi } from "vitest";

import { OpenAiCompatibleLlmClient } from "../../src/llm/openai-compatible.js";

function createMockClient(response: unknown) {
  const create = vi.fn().mockResolvedValue(response);
  const factory = vi.fn(() => ({
    chat: {
      completions: {
        create,
      },
    },
  }));

  return { create, factory };
}

describe("OpenAiCompatibleLlmClient", () => {
  it("builds requests with configured provider baseURL and model", async () => {
    const { create, factory } = createMockClient({ choices: [{ message: { content: "hello" } }] });

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
      apiKeyHeader: undefined,
      modelUriTemplate: undefined,
    });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      model: "chat-model",
      messages: [{ role: "user", content: "Hi" }],
    }));
    expect(result).toEqual({
      text: "hello",
      providerId: "compatible",
      model: "chat-model",
      toolCalls: undefined,
    });
  });

  it("merges static headers, env headers and custom api key header", async () => {
    const { factory } = createMockClient({ choices: [{ message: { content: "hello" } }] });

    const client = new OpenAiCompatibleLlmClient({
      env: {
        API_KEY: "secret",
        EXTRA_HEADERS: JSON.stringify({ "HTTP-Referer": "https://example.test" }),
      },
      config: {
        llmDefaultProvider: "compatible",
        llmProviders: {
          compatible: {
            baseURL: "https://llm.example.test/v1",
            apiKeyEnv: "API_KEY",
            apiKeyHeader: "X-Api-Key",
            headers: { "X-App": "template" },
            headersEnv: "EXTRA_HEADERS",
            modelUriTemplate: "/models/{model}:generate",
            models: { default: "fallback" },
          },
        },
      },
      clientFactory: factory,
    });

    await client.generateText({ task: "chat", messages: [{ role: "user", content: "Hi" }] });

    expect(factory).toHaveBeenCalledWith(expect.objectContaining({
      apiKeyHeader: "X-Api-Key",
      modelUriTemplate: "/models/{model}:generate",
      headers: {
        "X-App": "template",
        "HTTP-Referer": "https://example.test",
        "X-Api-Key": "secret",
      },
    }));
  });

  it("returns tool calls from assistant responses", async () => {
    const { create, factory } = createMockClient({
      choices: [{
        message: {
          content: null,
          tool_calls: [{ id: "call-1", function: { name: "lookup", arguments: JSON.stringify({ q: "x" }) } }],
        },
      }],
    });

    const client = new OpenAiCompatibleLlmClient({
      env: { API_KEY: "secret" },
      config: {
        llmDefaultProvider: "compatible",
        llmProviders: {
          compatible: {
            baseURL: "https://llm.example.test/v1",
            apiKeyEnv: "API_KEY",
            models: { default: "fallback" },
          },
        },
      },
      clientFactory: factory,
    });

    const result = await client.generateText({
      task: "tool",
      messages: [{ role: "user", content: "use tool" }],
      tools: [{ type: "function", function: { name: "lookup", parameters: { type: "object" } } }],
    });

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ tools: expect.any(Array) }));
    expect(result.toolCalls).toEqual([{ id: "call-1", name: "lookup", arguments: JSON.stringify({ q: "x" }) }]);
  });

  it("describes inline images and returns safe metadata", async () => {
    const { create, factory } = createMockClient({ choices: [{ message: { content: "a tiny png" } }] });
    const client = new OpenAiCompatibleLlmClient({
      env: { API_KEY: "secret" },
      config: {
        llmDefaultProvider: "compatible",
        visionMaxBytes: 100,
        llmProviders: {
          compatible: {
            baseURL: "https://llm.example.test/v1",
            apiKeyEnv: "API_KEY",
            models: { default: "fallback", vision: "vision-model" },
          },
        },
      },
      clientFactory: factory,
    });

    const result = await client.generateImageDescription({
      image: Uint8Array.from([0x89, 0x50, 0x4e, 0x47]),
    });

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ model: "vision-model" }));
    expect(result).toEqual(expect.objectContaining({
      text: "a tiny png",
      mimeType: "image/png",
      imageBytes: 4,
      providerId: "compatible",
      model: "vision-model",
    }));
  });

  it("treats oversized image descriptions as controlled failures", async () => {
    const { factory } = createMockClient({ choices: [] });
    const client = new OpenAiCompatibleLlmClient({
      env: { API_KEY: "secret" },
      config: {
        llmDefaultProvider: "compatible",
        visionMaxBytes: 2,
        llmProviders: {
          compatible: {
            baseURL: "https://llm.example.test/v1",
            apiKeyEnv: "API_KEY",
            models: { default: "fallback", vision: "vision-model" },
          },
        },
      },
      clientFactory: factory,
    });

    const result = await client.generateImageDescription({ image: Uint8Array.from([1, 2, 3]) });

    expect(result.text).toBe("");
    expect(result.error?.name).toBe("ImageTooLargeError");
    expect(factory).not.toHaveBeenCalled();
  });
});
