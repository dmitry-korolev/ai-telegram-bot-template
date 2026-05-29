import type { MiddlewareFn } from "grammy";

import { persistTelegramContext } from "../helpers/persist-telegram-context.js";
import type { BotContext } from "../context.js";

export const persistenceMiddleware: MiddlewareFn<BotContext> = async (ctx, next) => {
  await persistTelegramContext(ctx);
  await next();
};
