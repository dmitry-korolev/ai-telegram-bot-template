import { describe, expect, it, vi } from "vitest";

import { handleTextMessage } from "../../src/bot/handlers/messages.js";

describe("handleTextMessage", () => {
  it("routes text messages through the agent layer", async () => {
    const insertValues = vi.fn().mockResolvedValue(undefined);
    const runAgent = vi.fn().mockResolvedValue({
      text: "agent reply",
      providerId: "test-provider",
      model: "test-model",
    });
    const ctx = {
      message: { text: "hello" },
      from: { id: 10, username: "alice" },
      chat: { id: 20 },
      deps: {
        agents: { runAgent },
        db: {
          insert: vi.fn(() => ({ values: insertValues })),
        },
      },
      replyWithChatAction: vi.fn().mockResolvedValue(undefined),
      reply: vi.fn().mockResolvedValue(undefined),
    };

    await handleTextMessage(ctx as any);

    expect(runAgent).toHaveBeenCalledWith("chat", { text: "hello" }, {
      userId: 10,
      chatId: 20,
      username: "alice",
    });
    expect(insertValues).toHaveBeenCalledWith(expect.objectContaining({
      task: "chat",
      input: "hello",
      output: "agent reply",
      provider: "test-provider",
      model: "test-model",
    }));
    expect(ctx.reply).toHaveBeenCalledWith("agent reply");
  });
});
