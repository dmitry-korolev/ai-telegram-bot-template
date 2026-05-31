import type { MiddlewareFn } from "grammy";

import { isAllowedChat } from "../filters/allowed-chat.js";
import { persistTelegramContext } from "../helpers/persist-telegram-context.js";
import type { BotContext } from "../context.js";

export const persistenceMiddleware: MiddlewareFn<BotContext> = async (ctx, next) => {
  if (isAllowedChat(ctx)) {
    await persistTelegramContext(ctx);
  } else {
    ctx.deps.logger.info({ chatId: ctx.chat?.id }, "Skipping persistence for disallowed chat");
  }

  await next();
};
