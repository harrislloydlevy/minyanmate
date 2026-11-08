ALTER TABLE `messages` ADD `delivery_mode` text DEFAULT 'auto' NOT NULL;--> statement-breakpoint
ALTER TABLE `messages` ADD `requested_at` integer;--> statement-breakpoint
ALTER TABLE `messages` ADD `sent_channel` text;--> statement-breakpoint
ALTER TABLE `messages` ADD `sent_recipient` text;--> statement-breakpoint
ALTER TABLE `messages` ADD `sent_body` text;--> statement-breakpoint
ALTER TABLE `messages` ADD `technique` text;--> statement-breakpoint
ALTER TABLE `messages` ADD `sent_by` text;