import { describe, expect, it } from "vitest";

import { selectModel } from "../../src/llm/model-router.js";

const config = {
  llmDefaultProvider: "main",
  llmProviders: {
    main: {
      baseURL: "https://example.test/v1",
      apiKeyEnv: "API_KEY",
      models: {
        default: "fallback-model",
        chat: "chat-model",
      },
    },
  },
};

describe("selectModel", () => {
  it("selects task-specific model", () => {
    expect(selectModel(config, "chat").model).toBe("chat-model");
  });

  it("falls back to default model", () => {
    expect(selectModel(config, "summary").model).toBe("fallback-model");
  });
});
