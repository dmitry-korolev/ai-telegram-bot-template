import type { AgentTask, LlmProviderConfig } from "../config/env.js";

export interface ModelSelection {
  providerId: string;
  provider: LlmProviderConfig;
  model: string;
}

export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GenerateTextInput {
  task: AgentTask;
  messages: LlmMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface GenerateTextResult {
  text: string;
  providerId: string;
  model: string;
}

export interface LlmClient {
  generateText(input: GenerateTextInput): Promise<GenerateTextResult>;
}
