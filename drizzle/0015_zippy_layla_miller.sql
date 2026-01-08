CREATE TABLE `legacy_customer_invitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`legacy_customer_id` int NOT NULL,
	`token` varchar(255) NOT NULL,
	`token_hash` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`status` enum('pending','accepted','expired','cancelled') DEFAULT 'pending',
	`sent_at` timestamp DEFAULT (now()),
	`expires_at` timestamp NOT NULL,
	`accepted_at` timestamp,
	`used_at` timestamp,
	`sent_by_admin_id` int,
	`resend_count` int DEFAULT 0,
	`last_resend_at` timestamp,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `legacy_customer_invitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `legacy_customer_invitations_token_unique` UNIQUE(`token`),
	CONSTRAINT `legacy_customer_invitations_token_hash_unique` UNIQUE(`token_hash`),
	CONSTRAINT `idx_token` UNIQUE(`token`),
	CONSTRAINT `idx_token_hash` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE INDEX `idx_legacy_customer_id` ON `legacy_customer_invitations` (`legacy_customer_id`);--> statement-breakpoint
CREATE INDEX `idx_email` ON `legacy_customer_invitations` (`email`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `legacy_customer_invitations` (`status`);--> statement-breakpoint
CREATE INDEX `idx_expires_at` ON `legacy_customer_invitations` (`expires_at`);--> statement-breakpoint
CREATE INDEX `idx_status_expires` ON `legacy_customer_invitations` (`status`,`expires_at`);