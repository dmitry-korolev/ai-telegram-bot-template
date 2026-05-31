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
- Use `ctx.deps.agents.runAgent(task, input, context)` or `runAgentWithTools` for AI work.
- Tool execution belongs in the feature layer, where trusted runtime context is available.
- Provider-specific behavior belongs in `src/llm`.
- Agent definitions and prompts belong in `src/agents`.
- Persistent schema changes belong in `src/db/schema.ts` and must include a migration.
- Keep config in `src/config/env.ts`; do not read `process.env` throughout the codebase.
- Use `ctx.deps.logger`; do not use `console` in application code except process-level fatal startup handling.
- Never log bot tokens, API keys, full image payloads or raw provider credentials.

## Environment Rules

- `.env` is the shared base file.
- `ENV_FILE` selects the overlay, such as `.env.development` or `.env.production`.
- Runtime precedence is `.env` -> selected `ENV_FILE` -> exported process environment.
- Keep real secrets out of git; commit only `*.example` env files.
- Keep development and production bot tokens and allowed chat ids separate.

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

## Adding Tools or Vision

- Model side effects as tools, not structured-output fields.
- Tools must accept only minimal model-controlled arguments.
- Trusted identifiers like `chatId`, `messageId` and local history scope must come from runtime context.
- Return controlled tool results for invalid arguments and external API failures.
- Vision support is optional through `generateImageDescription`; enforce byte limits and never log base64 image data.

## Adding an LLM Provider

Prefer `config/llm-providers.json` for provider URLs, model routing, headers and provider options. Keep API keys in env and reference them with `apiKeyEnv`.

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

`LLM_PROVIDERS_JSON` remains a compatibility fallback when no `LLM_PROVIDERS_FILE` is configured.

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
- Project-specific networking such as `network_mode: "container:sing-box"` must stay optional via override files, not default template behavior.

## Docker Rules

- Polling is the default Telegram delivery mode.
- `/healthz` is for container health only; it is not a webhook endpoint.
- Keep runtime images production-focused: compiled JS, production dependencies, non-root user, runtime migrations and runtime config files.
