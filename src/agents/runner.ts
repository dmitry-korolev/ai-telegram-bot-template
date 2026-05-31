import type { AgentTask } from "../config/env.js";
import type { LlmClient, LlmMessage, LlmToolDefinition } from "../llm/types.js";
import { getAgent } from "./registry.js";
import type { AgentContext, AgentInput, AgentRunResult } from "./types.js";

export interface AgentToolResult {
  ok: boolean;
  content: string;
}

export interface AgentTool<RuntimeContext = unknown> {
  name: string;
  description?: string;
  parameters: Record<string, unknown>;
  execute: (args: unknown, context: RuntimeContext) => Promise<AgentToolResult>;
}

export interface RunAgentWithToolsOptions<RuntimeContext = unknown> {
  tools: AgentTool<RuntimeContext>[];
  runtimeContext: RuntimeContext;
  maxToolIterations?: number;
}

export interface AgentRunner {
  runAgent: (task: AgentTask, input: AgentInput, context?: AgentContext) => Promise<AgentRunResult>;
  runAgentWithTools: <RuntimeContext>(
    task: AgentTask,
    input: AgentInput,
    context: AgentContext | undefined,
    options: RunAgentWithToolsOptions<RuntimeContext>,
  ) => Promise<AgentRunResult>;
}

export function createAgentRunner(llm: LlmClient): AgentRunner {
  async function runAgent(task: AgentTask, input: AgentInput, context: AgentContext = {}): Promise<AgentRunResult> {
    const agent = getAgent(task);
    const messages = buildAgentMessages(agent.systemPrompt, input, context);

    return llm.generateText({
      task: agent.modelTask ?? agent.task,
      messages,
      temperature: agent.temperature,
      maxTokens: agent.maxTokens,
    });
  }

  return {
    runAgent,
    async runAgentWithTools(task, input, context = {}, options) {
      const agent = getAgent(task);
      const messages = buildAgentMessages(agent.systemPrompt, input, context);
      const toolDefinitions = options.tools.map((tool) => toLlmToolDefinition(tool));
      const toolsByName = new Map(options.tools.map((tool) => [tool.name, tool]));
      const maxIterations = options.maxToolIterations ?? 3;
      let lastResult: AgentRunResult | undefined;

      for (let iteration = 0; iteration <= maxIterations; iteration += 1) {
        const result = await llm.generateText({
          task: agent.modelTask ?? agent.task,
          messages,
          temperature: agent.temperature,
          maxTokens: agent.maxTokens,
          tools: toolDefinitions,
        });
        lastResult = result;

        if (!result.toolCalls?.length) {
          return result;
        }

        if (iteration === maxIterations) {
          return {
            ...result,
            text: result.text || "Tool iteration limit reached before a final response.",
          };
        }

        messages.push({ role: "assistant", content: result.text || null, toolCalls: result.toolCalls });
        for (const toolCall of result.toolCalls) {
          const tool = toolsByName.get(toolCall.name);
          const toolResult = tool
            ? await executeToolSafely(tool, toolCall.arguments, options.runtimeContext)
            : { ok: false, content: `Unknown tool: ${toolCall.name}` };

          messages.push({
            role: "tool",
            name: toolCall.name,
            toolCallId: toolCall.id,
            content: JSON.stringify(toolResult),
          });
        }
      }

      return lastResult ?? runAgent(task, input, context);
    },
  };
}

function buildAgentMessages(systemPrompt: string, input: AgentInput, context: AgentContext): LlmMessage[] {
  const contextLine = [
    context.userId ? `userId=${context.userId}` : undefined,
    context.chatId ? `chatId=${context.chatId}` : undefined,
    context.username ? `username=${context.username}` : undefined,
  ]
    .filter(Boolean)
    .join(", ");

  return [
    { role: "system", content: systemPrompt },
    ...(contextLine ? [{ role: "system" as const, content: `Telegram context: ${contextLine}` }] : []),
    { role: "user", content: input.text },
  ];
}

function toLlmToolDefinition<RuntimeContext>(tool: AgentTool<RuntimeContext>): LlmToolDefinition {
  return {
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  };
}

async function executeToolSafely<RuntimeContext>(
  tool: AgentTool<RuntimeContext>,
  rawArguments: string,
  context: RuntimeContext,
): Promise<AgentToolResult> {
  try {
    const args = rawArguments.trim() ? JSON.parse(rawArguments) : {};
    return await tool.execute(args, context);
  } catch (error) {
    return {
      ok: false,
      content: error instanceof Error ? error.message : String(error),
    };
  }
}
