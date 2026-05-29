import type { Bot } from "grammy";

import { registerCommandHandlers } from "../handlers/commands.js";
import { registerMessageHandlers } from "../handlers/messages.js";
import type { BotContext } from "../context.js";

export function registerFeatures(bot: Bot<BotContext>): void {
  registerCommandHandlers(bot);
  registerMessageHandlers(bot);
}
