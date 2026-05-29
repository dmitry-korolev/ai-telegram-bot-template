import type { AgentTask } from "../config/env.js";
import type { AgentDefinition } from "./types.js";

const registry = new Map<AgentTask, AgentDefinition>();

export function registerAgent(definition: AgentDefinition): void {
  registry.set(definition.task, definition);
}

export function getAgent(task: AgentTask): AgentDefinition {
  const definition = registry.get(task);
  if (!definition) {
    throw new Error(`Agent "${task}" is not registered`);
  }

  return definition;
}

export function clearAgentsForTests(): void {
  registry.clear();
}

registerAgent({
  task: "chat",
  modelTask: "chat",
  systemPrompt:
    "You are a concise, practical Telegram bot assistant. Answer in the user's language when possible.",
  temperature: 0.4,
});

registerAgent({
  task: "intent",
  modelTask: "intent",
  systemPrompt: "Classify the user's intent. Return a short machine-readable label.",
  temperature: 0,
  maxTokens: 64,
});

registerAgent({
  task: "summary",
  modelTask: "summary",
  systemPrompt: "Summarize the provided conversation or text clearly and briefly.",
  temperature: 0.2,
});

registerAgent({
  task: "tool",
  modelTask: "tool",
  systemPrompt: "Decide which tool should be used and produce concise arguments for it.",
  temperature: 0,
});
