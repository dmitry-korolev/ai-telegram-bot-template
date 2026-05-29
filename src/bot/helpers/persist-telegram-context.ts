import { eq } from "drizzle-orm";
import type { Chat, User } from "grammy/types";

import { chats, users } from "../../db/schema.js";
import type { BotContext } from "../context.js";

export async function persistTelegramContext(ctx: BotContext): Promise<void> {
  const now = new Date().toISOString();

  if (ctx.from) {
    await upsertUser(ctx, ctx.from, now);
  }

  if (ctx.chat) {
    await upsertChat(ctx, ctx.chat, now);
  }
}

async function upsertUser(ctx: BotContext, user: User, now: string): Promise<void> {
  const existing = await ctx.deps.db.query.users.findFirst({
    where: eq(users.telegramId, user.id),
  });

  const values = {
    telegramId: user.id,
    username: user.username ?? null,
    firstName: user.first_name ?? null,
    lastName: user.last_name ?? null,
    languageCode: user.language_code ?? null,
    updatedAt: now,
  };

  if (existing) {
    await ctx.deps.db.update(users).set(values).where(eq(users.id, existing.id));
    return;
  }

  await ctx.deps.db.insert(users).values({ ...values, createdAt: now });
}

async function upsertChat(ctx: BotContext, chat: Chat, now: string): Promise<void> {
  const existing = await ctx.deps.db.query.chats.findFirst({
    where: eq(chats.telegramId, chat.id),
  });

  const values = {
    telegramId: chat.id,
    type: chat.type,
    title: "title" in chat ? (chat.title ?? null) : null,
    updatedAt: now,
  };

  if (existing) {
    await ctx.deps.db.update(chats).set(values).where(eq(chats.id, existing.id));
    return;
  }

  await ctx.deps.db.insert(chats).values({ ...values, createdAt: now });
}
