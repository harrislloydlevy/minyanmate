ALTER TABLE `messages` ADD `channel` text DEFAULT 'whatsapp' NOT NULL;--> statement-breakpoint
ALTER TABLE `messages` ADD `recipient` text;--> statement-breakpoint
ALTER TABLE `messages` ADD `recipient_name` text;--> statement-breakpoint
ALTER TABLE `messages` ADD `subject` text;--> statement-breakpoint
ALTER TABLE `messages` ADD `body` text;--> statement-breakpoint
ALTER TABLE `messages` ADD `batch_id` text;--> statement-breakpoint
ALTER TABLE `messages` ADD `provider` text;--> statement-breakpoint
ALTER TABLE `messages` ADD `provider_message_id` text;--> statement-breakpoint
ALTER TABLE `messages` ADD `attempts` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `messages` ADD `max_attempts` integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE `messages` ADD `updated_at` integer;--> statement-breakpoint
CREATE INDEX `messages_status_created_idx` ON `messages` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `messages_batch_idx` ON `messages` (`batch_id`);