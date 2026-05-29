FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM deps AS build
COPY tsconfig.json eslint.config.js drizzle.config.ts ./
COPY src ./src
COPY tests ./tests
COPY drizzle ./drizzle
RUN npm run build

FROM node:20-bookworm-slim AS prod-deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN groupadd --system bot && useradd --system --gid bot --home /app bot
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY drizzle ./drizzle
COPY package.json ./
RUN mkdir -p /app/data && chown -R bot:bot /app
USER bot
EXPOSE 3000
CMD ["node", "dist/main.js"]
