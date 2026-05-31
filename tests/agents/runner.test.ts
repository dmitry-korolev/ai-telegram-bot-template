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

  it("executes tool calls and sends tool results back to the LLM", async () => {
    const generateText = vi.fn()
      .mockResolvedValueOnce({
        text: "",
        providerId: "test",
        model: "model",
        toolCalls: [{ id: "call-1", name: "lookup", arguments: JSON.stringify({ query: "hello" }) }],
      })
      .mockResolvedValueOnce({ text: "final", providerId: "test", model: "model" });
    const llm: LlmClient = { generateText };
    const toolExecute = vi.fn().mockResolvedValue({ ok: true, content: "tool answer" });

    const runner = createAgentRunner(llm);
    const result = await runner.runAgentWithTools("chat", { text: "Hello" }, undefined, {
      runtimeContext: { chatId: 1 },
      tools: [{
        name: "lookup",
        parameters: { type: "object" },
        execute: toolExecute,
      }],
    });

    expect(result.text).toBe("final");
    expect(toolExecute).toHaveBeenCalledWith({ query: "hello" }, { chatId: 1 });
    expect(generateText).toHaveBeenLastCalledWith(expect.objectContaining({
      messages: expect.arrayContaining([
        expect.objectContaining({ role: "assistant", toolCalls: expect.any(Array) }),
        expect.objectContaining({ role: "tool", toolCallId: "call-1" }),
      ]),
    }));
  });

  it("returns a controlled response when the tool loop limit is reached", async () => {
    const llm: LlmClient = {
      generateText: vi.fn().mockResolvedValue({
        text: "",
        providerId: "test",
        model: "model",
        toolCalls: [{ id: "call-1", name: "lookup", arguments: "{}" }],
      }),
    };

    const runner = createAgentRunner(llm);
    const result = await runner.runAgentWithTools("chat", { text: "Hello" }, undefined, {
      runtimeContext: {},
      maxToolIterations: 1,
      tools: [{ name: "lookup", parameters: { type: "object" }, execute: vi.fn().mockResolvedValue({ ok: true, content: "x" }) }],
    });

    expect(result.text).toBe("Tool iteration limit reached before a final response.");
  });
});
