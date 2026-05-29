import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import type { DatabaseClient } from "./client.js";

export function runMigrations(db: DatabaseClient): void {
  migrate(db, { migrationsFolder: "./drizzle" });
}
