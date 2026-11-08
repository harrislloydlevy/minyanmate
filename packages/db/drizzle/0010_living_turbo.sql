ALTER TABLE `events` ADD `quorum_notified_at` integer;--> statement-breakpoint
ALTER TABLE `group_members` ADD `notify_quorum` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `group_members` ADD `notify_reminders` integer DEFAULT true NOT NULL;