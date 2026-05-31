import type { Bot } from "grammy";

import { interactions } from "../../db/schema.js";
import { isAllowedChat } from "../filters/allowed-chat.js";
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

  if (!isAllowedChat(ctx)) {
    ctx.deps.logger.info({ chatId: ctx.chat?.id }, "Ignoring message from disallowed chat");
    return;
  }

  ctx.deps.logger.info({ chatId: ctx.chat?.id, userId: ctx.from?.id }, "Routing text message to chat agent");
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
  ctx.deps.logger.info(
    { providerId: result.providerId, model: result.model, hasText: result.text.length > 0 },
    "Chat agent completed",
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
