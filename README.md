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
2. Copy `.env.example` to `.env` and fill in real secrets.
3. Adjust agents, prompts and bot features for your project.
4. Run `npm install`, or let the dev container run its `postCreateCommand`.
5. Run `npm run db:migrate`.
6. Run `npm run typecheck`, `npm run lint`, `npm test` and `npm run build`.

Docker and Docker Compose checks normally run from the host. Inside the dev container, it is expected that the `docker` CLI may be unavailable.

## Quick Start

```bash
npm install
cp .env.example .env
npm run db:migrate
npm run dev
```

Set at least:

```env
BOT_TOKEN=123456:your-telegram-token
LLM_DEFAULT_PROVIDER=openai
OPENAI_API_KEY=your-key
LLM_PROVIDERS_JSON={"openai":{"baseURL":"https://api.openai.com/v1","apiKeyEnv":"OPENAI_API_KEY","models":{"default":"gpt-4.1-mini","chat":"gpt-4.1-mini","intent":"gpt-4.1-mini","summary":"gpt-4.1-mini","tool":"gpt-4.1"}}}
```

Any OpenAI-compatible provider can be used by changing `baseURL`, `apiKeyEnv` and model names.

## Project Layout

```text
src/
  agents/      Lightweight task router and agent registry.
  bot/         grammY bot setup, features, handlers, middleware, filters, keyboards.
  config/      Typed environment parsing.
  db/          SQLite connection, Drizzle schema and migrations runner.
  llm/         OpenAI-compatible provider adapter and model selection.
  server/      Minimal health server.
  shared/      Logger and common utilities.
tests/         Vitest tests.
drizzle/       SQL migrations.
locales/       i18n-ready message files.
```

## LLM Routing

Handlers must call the agent layer, not provider clients directly:

```ts
await ctx.deps.agents.runAgent("chat", { text }, { userId, chatId });
```

Tasks supported by the template:

- `chat`
- `intent`
- `summary`
- `tool`

Each provider can map those tasks to different models. If a task-specific model is missing, the router falls back to `models.default`.

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

Then call it from a handler or service through `runAgent`.

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
docker compose -f compose.yml -f compose.prod.yml up --build -d
```

The bot uses Telegram long polling by default. The health server is only for container/platform checks:

```bash
curl http://localhost:3000/healthz
```

SQLite data is stored in the `bot-data` volume mounted at `/app/data`.

## Dev Container

The VS Code dev container uses `Dockerfile.dev` and `docker-compose.dev.yml`. It routes network traffic through an existing container named `sing-box`:

```yaml
network_mode: "container:sing-box"
```

Start `sing-box` before opening the project in the dev container. The dev container mounts the repository at `/workspace`, keeps dependencies in a Docker volume at `/workspace/node_modules`, and runs `npm ci` after creation.

## Adding Bot Features

Add feature code under `src/bot/features` and register handlers from `registerFeatures`. Keep Telegram-specific code in `src/bot`; shared business logic should live outside handlers.

Recommended flow:

1. Add handler or middleware.
2. Add tests with mocked Telegram context.
3. If LLM is needed, call `ctx.deps.agents.runAgent`.
4. Run typecheck, lint and tests.
