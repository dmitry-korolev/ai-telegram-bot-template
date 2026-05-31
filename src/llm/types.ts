import type { AgentTask, LlmProviderConfig, ModelTask } from "../config/env.js";
import type { SerializedError } from "../shared/errors.js";

export interface ModelSelection {
  providerId: string;
  provider: LlmProviderConfig;
  model: string;
}

export interface LlmToolCall {
  id: string;
  name: string;
  arguments: string;
}

export type LlmMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content?: string | null; toolCalls?: LlmToolCall[] }
  | { role: "tool"; content: string; toolCallId: string; name: string };

export interface LlmToolDefinition {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters: Record<string, unknown>;
  };
}

export interface GenerateTextInput {
  task: ModelTask;
  messages: LlmMessage[];
  temperature?: number;
  maxTokens?: number;
  tools?: LlmToolDefinition[];
}

export interface GenerateTextResult {
  text: string;
  providerId: string;
  model: string;
  toolCalls?: LlmToolCall[];
}

export interface GenerateImageDescriptionInput {
  task?: ModelTask;
  image: Uint8Array;
  mimeType?: string;
  prompt?: string;
  maxBytes?: number;
}

export interface GenerateImageDescriptionResult {
  text: string;
  providerId: string;
  model: string;
  mimeType: string;
  imageBytes: number;
  base64Length: number;
  error?: SerializedError;
}

export interface LlmClient {
  generateText(input: GenerateTextInput): Promise<GenerateTextResult>;
  generateImageDescription?(input: GenerateImageDescriptionInput): Promise<GenerateImageDescriptionResult>;
}

export type { AgentTask };
