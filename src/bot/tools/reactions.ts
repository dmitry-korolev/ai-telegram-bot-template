import type { AgentTool, AgentToolResult } from "../../agents/index.js";

const telegramReactionEmoji = new Set([
  "👍", "👎", "❤", "🔥", "🥰", "👏", "😁", "🤔", "🤯", "😱", "🤬", "😢", "🎉", "🤩", "🤮", "💩", "🙏", "👌", "🕊", "🤡", "🥱", "🥴", "😍", "🐳", "❤‍🔥", "🌚", "🌭", "💯", "🤣", "⚡", "🍌", "🏆", "💔", "🤨", "😐", "🍓", "🍾", "💋", "🖕", "😈", "😴", "😭", "🤓", "👻", "👨‍💻", "👀", "🎃", "🙈", "😇", "😨", "🤝", "✍", "🤗", "🫡", "🎅", "🎄", "☃", "💅", "🤪", "🗿", "🆒", "💘", "🙉", "🦄", "😘", "💊", "🙊", "😎", "👾", "🤷‍♂", "🤷", "🤷‍♀", "😡",
]);

export interface TelegramReactionRuntimeContext {
  chatId: number;
  messageId: number;
  aliases?: Record<string, string>;
  api: {
    setMessageReaction: (chatId: number, messageId: number, reaction: Array<{ type: "emoji"; emoji: string }>) => Promise<unknown>;
  };
}

export function createTelegramReactionTool(): AgentTool<TelegramReactionRuntimeContext> {
  return {
    name: "set_telegram_reaction",
    description: "Set one Telegram reaction on the current message.",
    parameters: {
      type: "object",
      properties: {
        emoji: { type: "string", description: "Telegram-supported reaction emoji or configured alias." },
      },
      required: ["emoji"],
      additionalProperties: false,
    },
    async execute(args, context) {
      const emoji = normalizeEmoji(args, context.aliases);
      if (!emoji.ok) {
        return emoji;
      }

      if (!telegramReactionEmoji.has(emoji.content)) {
        return { ok: false, content: `Unsupported Telegram reaction emoji: ${emoji.content}` };
      }

      try {
        await context.api.setMessageReaction(context.chatId, context.messageId, [
          { type: "emoji", emoji: emoji.content },
        ]);
        return { ok: true, content: `Reaction set: ${emoji.content}` };
      } catch (error) {
        return { ok: false, content: error instanceof Error ? error.message : String(error) };
      }
    },
  };
}

function normalizeEmoji(args: unknown, aliases: Record<string, string> | undefined): AgentToolResult {
  if (!args || typeof args !== "object" || Array.isArray(args)) {
    return { ok: false, content: "Tool arguments must be an object" };
  }

  const rawEmoji = (args as { emoji?: unknown }).emoji;
  if (typeof rawEmoji !== "string" || rawEmoji.trim() === "") {
    return { ok: false, content: "emoji must be a non-empty string" };
  }

  const emoji = aliases?.[rawEmoji] ?? rawEmoji;
  return { ok: true, content: emoji };
}
