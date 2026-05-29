import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable(
  "users",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    telegramId: integer("telegram_id").notNull(),
    username: text("username"),
    firstName: text("first_name"),
    lastName: text("last_name"),
    languageCode: text("language_code"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => ({
    telegramIdIdx: uniqueIndex("users_telegram_id_idx").on(table.telegramId),
  }),
);

export const chats = sqliteTable(
  "chats",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    telegramId: integer("telegram_id").notNull(),
    type: text("type").notNull(),
    title: text("title"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => ({
    telegramIdIdx: uniqueIndex("chats_telegram_id_idx").on(table.telegramId),
  }),
);

export const sessions = sqliteTable("sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => users.id),
  chatId: integer("chat_id").references(() => chats.id),
  state: text("state").notNull().default("{}"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const interactions = sqliteTable("interactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => users.id),
  chatId: integer("chat_id").references(() => chats.id),
  task: text("task").notNull(),
  input: text("input").notNull(),
  output: text("output"),
  model: text("model"),
  provider: text("provider"),
  createdAt: text("created_at").notNull(),
});
