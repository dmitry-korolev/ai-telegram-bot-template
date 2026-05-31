import { describe, expect, it, vi } from "vitest";

import { createTelegramReactionTool } from "../../src/bot/tools/reactions.js";

describe("createTelegramReactionTool", () => {
  it("uses trusted runtime chat and message ids", async () => {
    const setMessageReaction = vi.fn().mockResolvedValue(undefined);
    const tool = createTelegramReactionTool();

    const result = await tool.execute({ emoji: "nice" }, {
      chatId: 10,
      messageId: 20,
      aliases: { nice: "👍" },
      api: { setMessageReaction },
    });

    expect(result).toEqual({ ok: true, content: "Reaction set: 👍" });
    expect(setMessageReaction).toHaveBeenCalledWith(10, 20, [{ type: "emoji", emoji: "👍" }]);
  });

  it("returns controlled failures for unsupported emoji", async () => {
    const tool = createTelegramReactionTool();

    await expect(tool.execute({ emoji: "not-an-emoji" }, {
      chatId: 10,
      messageId: 20,
      api: { setMessageReaction: vi.fn() },
    })).resolves.toEqual({ ok: false, content: "Unsupported Telegram reaction emoji: not-an-emoji" });
  });
});
