import type { Bot } from "grammy";

import { helpKeyboard } from "../keyboards/index.js";
import type { BotContext } from "../context.js";

export function registerCommandHandlers(bot: Bot<BotContext>): void {
  bot.command("start", async (ctx) => {
    await ctx.reply("Hi. Send me a message and I will route it through the default AI agent.");
  });

  bot.command("help", async (ctx) => {
    await ctx.reply("Available commands: /start, /help. Add new features under src/bot/features.", {
      reply_markup: helpKeyboard(),
    });
  });
}
