import { InlineKeyboard } from "grammy";

export function helpKeyboard(): InlineKeyboard {
  return new InlineKeyboard().url("grammY docs", "https://grammy.dev").url("OpenAI SDK", "https://github.com/openai/openai-node");
}
