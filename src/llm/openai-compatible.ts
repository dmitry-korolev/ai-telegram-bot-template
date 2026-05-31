import OpenAI from "openai";
import type { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/chat/completions";

import type { AppConfig, LlmProviderConfig } from "../config/env.js";
import { serializeError } from "../shared/errors.js";
import { inferImageMimeType } from "./images.js";
import { selectModel } from "./model-router.js";
import type {
  GenerateImageDescriptionInput,
  GenerateImageDescriptionResult,
  GenerateTextInput,
  GenerateTextResult,
  LlmClient,
  LlmMessage,
} from "./types.js";

interface OpenAiLike {
  chat: {
    completions: {
      create: (input: {
        model: string;
        messages: ChatCompletionMessageParam[];
        temperature: number;
        max_tokens?: number;
        tools?: ChatCompletionTool[];
      }) => Promise<{
        choices: Array<{
          message: {
            content: string | null;
            tool_calls?: Array<{
              id: string;
              function: {
                name: string;
                arguments: string;
              };
            }>;
          };
        }>;
      }>;
    };
  };
}

interface ClientFactoryInput {
  apiKey: string;
  baseURL: string;
  headers?: Record<string, string>;
  apiKeyHeader?: string;
  modelUriTemplate?: string;
}

export interface OpenAiCompatibleClientOptions {
  config: Pick<AppConfig, "llmDefaultProvider" | "llmProviders"> & Partial<Pick<AppConfig, "visionMaxBytes">>;
  env?: NodeJS.ProcessEnv;
  clientFactory?: (provider: ClientFactoryInput) => OpenAiLike;
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
      messages: toOpenAiMessages(input.messages),
      temperature: input.temperature ?? 0.2,
      max_tokens: input.maxTokens,
      tools: input.tools as ChatCompletionTool[] | undefined,
    });

    const message = response.choices[0]?.message;
    const toolCalls = message?.tool_calls?.map((toolCall) => ({
      id: toolCall.id,
      name: toolCall.function.name,
      arguments: toolCall.function.arguments,
    }));

    return {
      text: message?.content ?? "",
      providerId: selection.providerId,
      model: selection.model,
      toolCalls: toolCalls?.length ? toolCalls : undefined,
    };
  }

  public async generateImageDescription(
    input: GenerateImageDescriptionInput,
  ): Promise<GenerateImageDescriptionResult> {
    const selection = selectModel(this.options.config, input.task ?? "vision");
    const imageBytes = input.image.byteLength;
    const maxBytes = input.maxBytes ?? this.options.config.visionMaxBytes ?? 4_194_304;
    const mimeType = input.mimeType ?? inferImageMimeType(input.image);
    const base64 = Buffer.from(input.image).toString("base64");
    const resultBase = {
      providerId: selection.providerId,
      model: selection.model,
      mimeType,
      imageBytes,
      base64Length: base64.length,
    };

    if (imageBytes > maxBytes) {
      return {
        ...resultBase,
        text: "",
        error: { name: "ImageTooLargeError", message: `Image is ${imageBytes} bytes, max is ${maxBytes}` },
      };
    }

    try {
      const client = this.clientFor(selection.providerId);
      const response = await client.chat.completions.create({
        model: selection.model,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: input.prompt ?? "Describe this image briefly and factually." },
              {
                type: "image_url",
                image_url: { url: `data:${mimeType};base64,${base64}` },
              },
            ],
          } as ChatCompletionMessageParam,
        ],
        temperature: 0.2,
      });

      return {
        ...resultBase,
        text: response.choices[0]?.message.content ?? "",
      };
    } catch (error) {
      return {
        ...resultBase,
        text: "",
        error: serializeError(error),
      };
    }
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

    const headers = this.headersFor(provider, apiKey);
    const factoryInput = {
      apiKey,
      baseURL: provider.baseURL,
      headers,
      apiKeyHeader: provider.apiKeyHeader,
      modelUriTemplate: provider.modelUriTemplate,
    };
    const client: OpenAiLike =
      this.options.clientFactory?.(factoryInput) ??
      (new OpenAI({
        apiKey,
        baseURL: provider.baseURL,
        defaultHeaders: headers,
      }) as unknown as OpenAiLike);
    this.clients.set(providerId, client);

    return client;
  }

  private headersFor(provider: LlmProviderConfig, apiKey: string): Record<string, string> | undefined {
    const headers = {
      ...(provider.headers ?? {}),
      ...this.headersFromEnv(provider),
    };

    if (provider.apiKeyHeader) {
      headers[provider.apiKeyHeader] = apiKey;
    }

    return Object.keys(headers).length ? headers : undefined;
  }

  private headersFromEnv(provider: LlmProviderConfig): Record<string, string> {
    if (!provider.headersEnv) {
      return {};
    }

    const raw = this.env[provider.headersEnv];
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error(`${provider.headersEnv} must be a JSON object`);
    }

    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).map(([key, value]) => [key, String(value)]),
    );
  }
}

function toOpenAiMessages(messages: LlmMessage[]): ChatCompletionMessageParam[] {
  return messages.map((message) => {
    if (message.role === "assistant") {
      return {
        role: "assistant",
        content: message.content ?? null,
        tool_calls: message.toolCalls?.map((toolCall) => ({
          id: toolCall.id,
          type: "function",
          function: {
            name: toolCall.name,
            arguments: toolCall.arguments,
          },
        })),
      } as ChatCompletionMessageParam;
    }

    if (message.role === "tool") {
      return {
        role: "tool",
        content: message.content,
        tool_call_id: message.toolCallId,
      } as ChatCompletionMessageParam;
    }

    return message as ChatCompletionMessageParam;
  });
}

export function createLlmClient(options: OpenAiCompatibleClientOptions): LlmClient {
  return new OpenAiCompatibleLlmClient(options);
}
