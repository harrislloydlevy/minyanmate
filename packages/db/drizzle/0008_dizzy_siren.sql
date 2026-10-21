ALTER TABLE `minyans` ADD `group_id` text REFERENCES groups(id) ON DELETE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX `minyans_group_uq` ON `minyans` (`group_id`);--> statement-breakpoint
UPDATE `minyans`
SET `group_id` = (
  SELECT `groups`.`id`
  FROM `groups`
  WHERE `groups`.`owner_id` = `minyans`.`owner_id`
    AND NOT EXISTS (
      SELECT 1 FROM `minyans` AS `linked`
      WHERE `linked`.`group_id` = `groups`.`id`
    )
  LIMIT 1
)
WHERE `group_id` IS NULL
  AND (
    SELECT COUNT(*) FROM `groups`
    WHERE `groups`.`owner_id` = `minyans`.`owner_id`
  ) = 1;--> statement-breakpoint
UPDATE `events`
SET `group_id` = (
  SELECT `minyans`.`group_id` FROM `minyans`
  WHERE `minyans`.`id` = `events`.`minyan_id`
)
WHERE `minyan_id` IS NOT NULL
  AND `group_id` IS NULL
  AND EXISTS (
    SELECT 1 FROM `minyans`
    WHERE `minyans`.`id` = `events`.`minyan_id`
      AND `minyans`.`group_id` IS NOT NULL
  );
