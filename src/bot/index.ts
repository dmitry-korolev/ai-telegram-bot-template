import { Bot } from "grammy";

import { registerFeatures } from "./features/index.js";
import { dependenciesMiddleware } from "./middlewares/dependencies.js";
import { persistenceMiddleware } from "./middlewares/persistence.js";
import type { BotContext, BotDependencies } from "./context.js";

export function createBot(token: string, deps: BotDependencies): Bot<BotContext> {
  const bot = new Bot<BotContext>(token);

  bot.use(dependenciesMiddleware(deps));
  bot.use(persistenceMiddleware);
  registerFeatures(bot);

  bot.catch((error) => {
    const ctx = error.ctx;
    ctx.deps.logger.error({ error: error.error, updateId: ctx.update.update_id }, "Bot update failed");
    void ctx.reply("Sorry, something went wrong. Please try again later.").catch((replyError: unknown) => {
      ctx.deps.logger.error({ error: replyError }, "Failed to send error reply");
    });
  });

  return bot;
}
