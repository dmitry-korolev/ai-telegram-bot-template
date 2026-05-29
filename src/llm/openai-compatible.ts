import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

import type { AppConfig } from "../config/env.js";
import { selectModel } from "./model-router.js";
import type { GenerateTextInput, GenerateTextResult, LlmClient } from "./types.js";

interface OpenAiLike {
  chat: {
    completions: {
      create: (input: {
        model: string;
        messages: ChatCompletionMessageParam[];
        temperature: number;
        max_tokens?: number;
      }) => Promise<{
        choices: Array<{
          message: {
            content: string | null;
          };
        }>;
      }>;
    };
  };
}

export interface OpenAiCompatibleClientOptions {
  config: Pick<AppConfig, "llmDefaultProvider" | "llmProviders">;
  env?: NodeJS.ProcessEnv;
  clientFactory?: (provider: { apiKey: string; baseURL: string; headers?: Record<string, string> }) => OpenAiLike;
}

export class OpenAiCompatibleLlmClient implements LlmClient {
  private readonly clients = new Map<string, OpenAiLike>();
  private readonly env: NodeJS.ProcessEnv;

  public constructor(private readonly options: OpenAiCompatibleClientOptions) {
    this.env = options.env ?? process.env;
  }

  public async generateText(input: GenerateTextInput): Promise<GenerateTextResult> {
    const selection = selectModel(this.options.config, input.task);
    const client = this.clientFor(selection.providerId);
    const response = await client.chat.completions.create({
      model: selection.model,
      messages: input.messages as ChatCompletionMessageParam[],
      temperature: input.temperature ?? 0.2,
      max_tokens: input.maxTokens,
    });

    return {
      text: response.choices[0]?.message.content ?? "",
      providerId: selection.providerId,
      model: selection.model,
    };
  }

  private clientFor(providerId: string): OpenAiLike {
    const existing = this.clients.get(providerId);
    if (existing) {
      return existing;
    }

    const provider = this.options.config.llmProviders[providerId];
    if (!provider) {
      throw new Error(`Unknown LLM provider "${providerId}"`);
    }

    const apiKey = this.env[provider.apiKeyEnv];
    if (!apiKey) {
      throw new Error(`Missing API key env variable "${provider.apiKeyEnv}" for provider "${providerId}"`);
    }

    const client =
      this.options.clientFactory?.({ apiKey, baseURL: provider.baseURL, headers: provider.headers }) ??
      new OpenAI({
        apiKey,
        baseURL: provider.baseURL,
        defaultHeaders: provider.headers,
      });
    this.clients.set(providerId, client);

    return client;
  }
}

export function createLlmClient(options: OpenAiCompatibleClientOptions): LlmClient {
  return new OpenAiCompatibleLlmClient(options);
}
