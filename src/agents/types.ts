import type { AgentTask } from "../config/env.js";

export interface AgentInput {
  text: string;
}

export interface AgentContext {
  userId?: number;
  chatId?: number;
  username?: string;
}

export interface AgentDefinition {
  task: AgentTask;
  systemPrompt: string;
  modelTask?: AgentTask;
  temperature?: number;
  maxTokens?: number;
}

export interface AgentRunResult {
  text: string;
  providerId: string;
  model: string;
}
