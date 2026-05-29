import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import { loadProcessEnv } from "../config/env.js";
import { createDatabase } from "./client.js";

const env = loadProcessEnv();
const { db, sqlite } = createDatabase(env.DATABASE_URL ?? "file:./data/bot.sqlite");

migrate(db, { migrationsFolder: "./drizzle" });
sqlite.close();
