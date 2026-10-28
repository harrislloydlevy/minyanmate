CREATE TABLE `daily_attendance` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`attended` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `daily_attendance_user_date_uq` ON `daily_attendance` (`user_id`,`date`);--> statement-breakpoint
ALTER TABLE `users` ADD `invited_by_id` text REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `users` ADD `preferred_contact_method` text;