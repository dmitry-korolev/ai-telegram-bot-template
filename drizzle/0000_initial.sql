CREATE TABLE `chats` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `telegram_id` integer NOT NULL,
  `type` text NOT NULL,
  `title` text,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `chats_telegram_id_idx` ON `chats` (`telegram_id`);
--> statement-breakpoint
CREATE TABLE `users` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `telegram_id` integer NOT NULL,
  `username` text,
  `first_name` text,
  `last_name` text,
  `language_code` text,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_telegram_id_idx` ON `users` (`telegram_id`);
--> statement-breakpoint
CREATE TABLE `sessions` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `user_id` integer,
  `chat_id` integer,
  `state` text DEFAULT '{}' NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`chat_id`) REFERENCES `chats`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `interactions` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `user_id` integer,
  `chat_id` integer,
  `task` text NOT NULL,
  `input` text NOT NULL,
  `output` text,
  `model` text,
  `provider` text,
  `created_at` text NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`chat_id`) REFERENCES `chats`(`id`) ON UPDATE no action ON DELETE no action
);
