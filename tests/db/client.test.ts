import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { persistTelegramContext } from "../../src/bot/helpers/persist-telegram-context.js";
import { createDatabase } from "../../src/db/client.js";
import { runMigrations } from "../../src/db/migrations.js";

let tempDir: string | undefined;

afterEach(() => {
  if (tempDir) {
    rmSync(tempDir, { recursive: true, force: true });
    tempDir = undefined;
  }
});

describe("createDatabase", () => {
  it("initializes a temporary SQLite database", () => {
    tempDir = mkdtempSync(join(tmpdir(), "bot-template-"));
    const database = createDatabase(`file:${join(tempDir, "test.sqlite")}`);

    runMigrations(database.db);
    const usersTable = database.sqlite
      .prepare("select name from sqlite_master where type = 'table' and name = 'users'")
      .get();

    database.sqlite.close();
    expect(usersTable).toEqual({ name: "users" });
  });

  it("upserts duplicate Telegram users and chats", async () => {
    tempDir = mkdtempSync(join(tmpdir(), "bot-template-"));
    const database = createDatabase(`file:${join(tempDir, "test.sqlite")}`);
    runMigrations(database.db);

    const ctx = {
      deps: { db: database.db },
      from: { id: 123, username: "alice", first_name: "Alice" },
      chat: { id: 456, type: "private" },
    };

    await persistTelegramContext(ctx as any);
    ctx.from.username = "alice2";
    await persistTelegramContext(ctx as any);

    const userCount = database.sqlite.prepare("select count(*) as count from users").get();
    const chatCount = database.sqlite.prepare("select count(*) as count from chats").get();
    const user = database.sqlite.prepare("select username from users where telegram_id = 123").get();

    database.sqlite.close();
    expect(userCount).toEqual({ count: 1 });
    expect(chatCount).toEqual({ count: 1 });
    expect(user).toEqual({ username: "alice2" });
  });
});
