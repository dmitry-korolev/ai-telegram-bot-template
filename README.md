# AI Telegram Bot Template

Docker-ready TypeScript template for AI-powered Telegram bots built with grammY, SQLite, Drizzle and OpenAI-compatible model providers.

## Stack

- Node.js 20+
- TypeScript, ESM, strict mode
- grammY + `@grammyjs/runner`
- SQLite + Drizzle ORM
- OpenAI JS SDK with configurable `baseURL`
- Vitest
- Docker and Docker Compose

## Creating a New Bot From This Template

Use GitHub's **Use this template** button to create a fresh repository for your bot. Open the new repository in VS Code, reopen it in the dev container when prompted, then continue with Quick Start below.

After creating the new repository:

1. Rename the `name` field in `package.json`.
2. Copy `.env.example` to `.env` and copy the profile example you need, such as `.env.development.example` to `.env.development`.
3. Fill real secrets only in untracked env files.
4. Adjust agents, prompts and bot features for your project.
5. Run `npm install`, or let the dev container run its `postCreateCommand`.
6. Run `npm run db:migrate`.
7. Run `npm run typecheck`, `npm run lint`, `npm test` and `npm run build`.

Docker and Docker Compose checks normally run from the host. Inside the dev container, it is expected that the `docker` CLI may be unavailable.

## Quick Start

```bash
npm install
cp .env.example .env
cp .env.development.example .env.development
npm run db:migrate
npm run dev
```

Set at least these values in `.env.development`:

```env
BOT_TOKEN=123456:your-telegram-token
OPENAI_API_KEY=your-key
BOT_ADMINS=[]
BOT_ALLOWED_CHATS=[]
```

The template loads env values in this order:

```text
.env -> ENV_FILE overlay -> exported process environment
```

`ENV_FILE` defaults to `.env.development` in `.env.example`. Production compose sets it to `.env.production`.

## LLM Providers

Provider routing lives in `config/llm-providers.json`. API keys stay in env and are referenced by each provider's `apiKeyEnv`.

```json
{
  "openrouter": {
    "baseURL": "https://openrouter.ai/api/v1",
    "apiKeyEnv": "OPENROUTER_API_KEY",
    "headers": {
      "HTTP-Referer": "https://example.com"
    },
    "models": {
      "default": "openai/gpt-4.1-mini",
      "chat": "openai/gpt-4.1-mini",
      "tool": "openai/gpt-4.1"
    }
  }
}
```

Optional provider fields:

- `headersEnv`: env var containing JSON headers to merge at runtime.
- `apiKeyHeader`: custom header name for providers that do not use `Authorization`.
- `modelUriTemplate`: metadata for providers that need model-specific URL routing in a custom adapter.

`LLM_PROVIDERS_JSON` is still supported as a compatibility fallback when `LLM_PROVIDERS_FILE` is not set.

## Project Layout

```text
src/
  agents/      Lightweight task router, tool loop and agent registry.
  bot/         grammY bot setup, features, handlers, middleware, filters, tools, keyboards.
  config/      Typed environment parsing and safe config facts.
  db/          SQLite connection, Drizzle schema and migrations runner.
  llm/         OpenAI-compatible provider adapter, model selection and optional vision support.
  server/      Minimal health server.
  shared/      Logger, error serialization and common utilities.
config/        Runtime provider configuration files.
tests/         Vitest tests.
drizzle/       SQL migrations.
locales/       i18n-ready message files.
```

## Agents, Tools And Vision

Handlers must call the agent layer, not provider clients directly:

```ts
await ctx.deps.agents.runAgent("chat", { text }, { userId, chatId });
```

Use `runAgentWithTools` when a feature needs model-selected side effects. Tools execute in the feature layer and receive trusted runtime context separately from model-controlled arguments.

The template includes an example Telegram reaction tool. It uses trusted runtime `chatId` and `messageId`, validates supported emoji and returns controlled tool results.

Vision is optional through `llm.generateImageDescription`. It supports provider/model routing, inline image byte limits, MIME inference and non-fatal failure results.

## Adding a New Agent

Register the agent in `src/agents/registry.ts`:

```ts
registerAgent({
  task: "summary",
  modelTask: "summary",
  systemPrompt: "Summarize the provided text clearly.",
  temperature: 0.2,
});
```

Then call it from a handler or service through `runAgent` or `runAgentWithTools`.

## Database

The default database is local SQLite:

```env
DATABASE_URL=file:./data/bot.sqlite
```

Run migrations:

```bash
npm run db:migrate
```

Generate a new migration after editing `src/db/schema.ts`:

```bash
npm run db:generate
```

User and chat persistence is upsert-like so duplicate or reordered updates do not fail. If `BOT_ALLOWED_CHATS` is set, disallowed chats are ignored and not persisted.

## Tests and Checks

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Tests are designed to run without a real Telegram token or real LLM API key.

## Docker

Local Docker run:

```bash
docker compose up --build
```

Production-style run:

```bash
cp .env.production.example .env.production
docker compose -f compose.yml -f compose.prod.yml up --build -d
```

The bot uses Telegram long polling by default. The health server is only for container/platform checks:

```bash
curl http://localhost:3000/healthz
```

SQLite data is stored in the `bot-data` volume mounted at `/app/data`. Run `docker compose config` from the host shell when Docker CLI is available.

## Dev Container

The VS Code dev container uses `Dockerfile.dev` and `docker-compose.dev.yml`. It mounts the repository at `/workspace`, keeps dependencies in a Docker volume at `/workspace/node_modules`, and runs `npm ci` after creation.

If your environment needs to share networking with an existing `sing-box` container, use the optional override example from the host:

```bash
docker compose -f docker-compose.dev.yml -f docker-compose.sing-box.example.yml up -d
```

## Adding Bot Features

Add feature code under `src/bot/features` and register handlers from `registerFeatures`. Keep Telegram-specific code in `src/bot`; shared business logic should live outside handlers.

Recommended flow:

1. Add handler or middleware.
2. Add tests with mocked Telegram context.
3. If LLM is needed, call `ctx.deps.agents.runAgent` or `runAgentWithTools`.
4. Run typecheck, lint and tests.
