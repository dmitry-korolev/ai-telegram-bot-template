import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

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
});
