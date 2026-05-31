import type { BotContext } from "../context.js";

export function isAllowedChat(ctx: BotContext): boolean {
  const allowedChats = ctx.deps.config.botAllowedChats;
  if (allowedChats.length === 0) {
    return true;
  }

  return Boolean(ctx.chat && allowedChats.includes(ctx.chat.id));
}
