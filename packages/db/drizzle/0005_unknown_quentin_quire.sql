ALTER TABLE `events` ADD `group_id` text REFERENCES groups(id);--> statement-breakpoint
CREATE INDEX `events_group_idx` ON `events` (`group_id`);