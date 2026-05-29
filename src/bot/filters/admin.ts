import type { BotContext } from "../context.js";

export function isAdmin(ctx: BotContext): boolean {
  return Boolean(ctx.from && ctx.deps.config.botAdmins.includes(ctx.from.id));
}
