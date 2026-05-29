import type { Bot } from "grammy";

import { interactions } from "../../db/schema.js";
import type { BotContext } from "../context.js";

export function registerMessageHandlers(bot: Bot<BotContext>): void {
  bot.on("message:text", async (ctx) => {
    await handleTextMessage(ctx);
  });
}

export async function handleTextMessage(ctx: BotContext): Promise<void> {
  const text = ctx.message?.text;
  if (!text || text.startsWith("/")) {
    return;
  }

  await ctx.replyWithChatAction("typing");
  const result = await ctx.deps.agents.runAgent(
    "chat",
    { text },
    {
      userId: ctx.from?.id,
      chatId: ctx.chat?.id,
      username: ctx.from?.username,
    },
  );

  await ctx.deps.db.insert(interactions).values({
    userId: null,
    chatId: null,
    task: "chat",
    input: text,
    output: result.text,
    model: result.model,
    provider: result.providerId,
    createdAt: new Date().toISOString(),
  });

  await ctx.reply(result.text || "I do not have a response yet.");
}
