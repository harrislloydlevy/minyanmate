ALTER TABLE `events` ADD `min_players` integer;--> statement-breakpoint
ALTER TABLE `events` ADD `max_players` integer;--> statement-breakpoint
ALTER TABLE `guests` ADD `waitlisted_at` integer;--> statement-breakpoint
ALTER TABLE `minyans` ADD `min_players` integer;--> statement-breakpoint
ALTER TABLE `minyans` ADD `max_players` integer;--> statement-breakpoint
ALTER TABLE `rsvps` ADD `waitlisted_at` integer;