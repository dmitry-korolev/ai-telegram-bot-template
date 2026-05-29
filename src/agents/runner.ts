import type { LlmClient } from "../llm/types.js";
import { getAgent } from "./registry.js";
import type { AgentContext, AgentInput, AgentRunResult } from "./types.js";
import type { AgentTask } from "../config/env.js";

export interface AgentRunner {
  runAgent: (task: AgentTask, input: AgentInput, context?: AgentContext) => Promise<AgentRunResult>;
}

export function createAgentRunner(llm: LlmClient): AgentRunner {
  return {
    async runAgent(task, input, context = {}) {
      const agent = getAgent(task);
      const contextLine = [
        context.userId ? `userId=${context.userId}` : undefined,
        context.chatId ? `chatId=${context.chatId}` : undefined,
        context.username ? `username=${context.username}` : undefined,
      ]
        .filter(Boolean)
        .join(", ");

      const messages = [
        { role: "system" as const, content: agent.systemPrompt },
        ...(contextLine ? [{ role: "system" as const, content: `Telegram context: ${contextLine}` }] : []),
        { role: "user" as const, content: input.text },
      ];

      return llm.generateText({
        task: agent.modelTask ?? agent.task,
        messages,
        temperature: agent.temperature,
        maxTokens: agent.maxTokens,
      });
    },
  };
}
