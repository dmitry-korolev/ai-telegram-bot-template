import type { MiddlewareFn } from "grammy";

import type { BotContext, BotDependencies } from "../context.js";

export function dependenciesMiddleware(deps: BotDependencies): MiddlewareFn<BotContext> {
  return async (ctx, next) => {
    ctx.deps = deps;
    await next();
  };
}
