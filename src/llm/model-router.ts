import type { AgentTask, AppConfig } from "../config/env.js";
import type { ModelSelection } from "./types.js";

export function selectModel(
  config: Pick<AppConfig, "llmDefaultProvider" | "llmProviders">,
  task: AgentTask,
  providerOverride?: string,
): ModelSelection {
  const providerId = providerOverride ?? config.llmDefaultProvider;
  const provider = config.llmProviders[providerId];

  if (!provider) {
    throw new Error(`Unknown LLM provider "${providerId}"`);
  }

  const model = provider.models[task] ?? provider.models.default;
  if (!model) {
    throw new Error(`Provider "${providerId}" does not define a model for "${task}" or default`);
  }

  return {
    providerId,
    provider,
    model,
  };
}
