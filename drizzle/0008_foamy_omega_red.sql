CREATE TABLE `bond_contract_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bondId` int NOT NULL,
	`templateId` int NOT NULL,
	`isRequired` boolean NOT NULL DEFAULT true,
	`displayOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bond_contract_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contract_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` enum('subscription_agreement','risk_disclosure','terms_conditions','prospectus','other') NOT NULL,
	`content` text NOT NULL,
	`version` varchar(32) NOT NULL DEFAULT '1.0',
	`description` text,
	`validFrom` timestamp NOT NULL DEFAULT (now()),
	`validUntil` timestamp,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdBy` int NOT NULL,
	`updatedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contract_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `bonds` ADD `bondNumber` varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE `bonds` ADD `cancellationNoticeMonths` int DEFAULT 3;--> statement-breakpoint
ALTER TABLE `bonds` ADD `cancellationNoticeDay` int DEFAULT 31;--> statement-breakpoint
ALTER TABLE `bonds` ADD `nextCancellationDate` timestamp;--> statement-breakpoint
ALTER TABLE `bonds` ADD `startDate` timestamp;--> statement-breakpoint
ALTER TABLE `bonds` ADD `endDate` timestamp;--> statement-breakpoint
ALTER TABLE `bonds` ADD `couponPaymentFrequency` enum('monthly','quarterly','semi-annual','annual') DEFAULT 'annual';--> statement-breakpoint
ALTER TABLE `bonds` ADD `couponPaymentDates` json;--> statement-breakpoint
ALTER TABLE `bonds` ADD `maxSubscription` decimal(18,2);--> statement-breakpoint
ALTER TABLE `bonds` ADD `currency` varchar(3) DEFAULT 'EUR' NOT NULL;--> statement-breakpoint
ALTER TABLE `bonds` ADD `issuer` varchar(255);--> statement-breakpoint
ALTER TABLE `bonds` ADD `sector` varchar(128);--> statement-breakpoint
ALTER TABLE `bonds` ADD `country` varchar(64);--> statement-breakpoint
ALTER TABLE `bonds` ADD CONSTRAINT `bonds_bondNumber_unique` UNIQUE(`bondNumber`);