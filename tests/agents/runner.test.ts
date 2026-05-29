import { describe, expect, it, vi } from "vitest";

import { createAgentRunner } from "../../src/agents/index.js";
import type { LlmClient } from "../../src/llm/types.js";

describe("createAgentRunner", () => {
  it("constructs messages and delegates to LLM layer", async () => {
    const llm: LlmClient = {
      generateText: vi.fn().mockResolvedValue({
        text: "answer",
        providerId: "test",
        model: "model",
      }),
    };

    const runner = createAgentRunner(llm);
    await runner.runAgent("chat", { text: "Hello" }, { userId: 1, chatId: 2, username: "alice" });

    expect(llm.generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        task: "chat",
        messages: expect.arrayContaining([
          expect.objectContaining({ role: "system" }),
          { role: "system", content: "Telegram context: userId=1, chatId=2, username=alice" },
          { role: "user", content: "Hello" },
        ]),
      }),
    );
  });
});
