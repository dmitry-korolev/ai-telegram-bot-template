# Agent Development Guide

This repository is a template for agentic Telegram bot development. Keep changes small, typed and easy to verify.

## Commands

Run before handing off meaningful changes from inside the VS Code devcontainer:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Also run this when Docker CLI is available, usually from the host rather than from inside the devcontainer:

```bash
docker compose config
```

If Docker CLI is not available in the devcontainer, do not treat that as a project failure. Note it in the handoff and rely on the npm checks above.

For database changes:

```bash
npm run db:generate
npm run db:migrate
```

## Architecture Rules

- Telegram handlers live under `src/bot`.
- Handlers must not instantiate OpenAI clients or call providers directly.
- Use `ctx.deps.agents.runAgent(task, input, context)` for AI work.
- Provider-specific behavior belongs in `src/llm`.
- Agent definitions and prompts belong in `src/agents`.
- Persistent schema changes belong in `src/db/schema.ts` and must include a migration.
- Keep config in `src/config/env.ts`; do not read `process.env` throughout the codebase.
- Use `ctx.deps.logger`; do not use `console` in application code except process-level fatal startup handling.

## Adding a Handler

1. Put Telegram-specific code under `src/bot/handlers` or a feature folder.
2. Register it through `src/bot/features/index.ts`.
3. Persist only useful durable state; avoid storing secrets or raw provider credentials.
4. Add a Vitest test with mocked dependencies.

## Adding an Agent

1. Register it in `src/agents/registry.ts`.
2. Assign the right `modelTask` so model selection stays config-driven.
3. Keep prompts concise and task-specific.
4. Add or update tests for message construction and routing.

## Adding an LLM Provider

Do not add provider-specific code unless the provider is not OpenAI-compatible. Prefer env configuration:

```json
{
  "openrouter": {
    "baseURL": "https://openrouter.ai/api/v1",
    "apiKeyEnv": "OPENROUTER_API_KEY",
    "models": {
      "default": "openai/gpt-4.1-mini",
      "chat": "openai/gpt-4.1-mini",
      "tool": "openai/gpt-4.1"
    }
  }
}
```

## Testing Rules

- Tests must not require a real Telegram token.
- Tests must not call real LLM APIs.
- Mock the LLM layer through the `LlmClient` interface.
- Prefer direct handler tests with mocked `BotContext` for behavior.
- Use temporary SQLite files for DB tests.

## Devcontainer Rules

- The target development model is VS Code attached to the repository devcontainer. Assume day-to-day commands run inside `/workspace` in that container.
- The devcontainer is started by Docker Compose from the host; nested Docker is not required inside the devcontainer.
- Do not expect `docker` or `docker compose` to be available inside the devcontainer unless the user has explicitly mounted the host Docker socket or installed the CLI.
- `docker compose config`, image builds and compose up/down checks should normally be run from the host shell. If an agent cannot access host Docker, report that limitation instead of working around it.
- The devcontainer uses `network_mode: "container:sing-box"`; network-dependent commands may depend on that external container being started by the user.

## Docker Rules

- Polling is the default Telegram delivery mode.
- `/healthz` is for container health only; it is not a webhook endpoint.
- Keep runtime images production-focused: compiled JS, production dependencies, non-root user.
