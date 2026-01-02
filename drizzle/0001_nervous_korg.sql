CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`userEmail` varchar(320),
	`action` varchar(128) NOT NULL,
	`entityType` varchar(64),
	`entityId` int,
	`details` json,
	`ipAddress` varchar(64),
	`userAgent` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bonds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`isin` varchar(32),
	`totalVolume` decimal(18,2) NOT NULL,
	`availableVolume` decimal(18,2) NOT NULL,
	`minSubscription` decimal(18,2) NOT NULL DEFAULT '100000',
	`interestRate` decimal(5,2) NOT NULL,
	`termMonths` int NOT NULL,
	`issueDate` timestamp,
	`maturityDate` timestamp,
	`subscriptionStartDate` timestamp,
	`subscriptionEndDate` timestamp,
	`status` enum('draft','active','closed','matured') NOT NULL DEFAULT 'draft',
	`riskCategory` enum('low','medium','high') NOT NULL DEFAULT 'high',
	`governingLaw` varchar(64) NOT NULL DEFAULT 'Swiss',
	`hasSubordination` boolean DEFAULT true,
	`hasInsolvencyReservation` boolean DEFAULT true,
	`prospectusUrl` text,
	`termsUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bonds_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contracts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` enum('subscription_agreement','risk_disclosure','terms','prospectus','other') NOT NULL,
	`fileUrl` text NOT NULL,
	`fileKey` varchar(512),
	`mimeType` varchar(128),
	`fileSize` int,
	`bondId` int,
	`userId` int,
	`version` int DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contracts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `news` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`excerpt` text,
	`status` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
	`publishedAt` timestamp,
	`authorId` int NOT NULL,
	`isPublic` boolean DEFAULT false,
	`targetInvestorTypes` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `news_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payment_schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subscriptionId` int NOT NULL,
	`dueDate` timestamp NOT NULL,
	`amount` decimal(18,2) NOT NULL,
	`currency` varchar(8) NOT NULL DEFAULT 'EUR',
	`type` enum('interest','principal','combined') NOT NULL,
	`status` enum('scheduled','pending','paid','overdue') NOT NULL DEFAULT 'scheduled',
	`paidAt` timestamp,
	`transactionId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payment_schedules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `risk_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`category` enum('conservative','moderate','risk_seeking') NOT NULL,
	`questionnaireAnswers` json,
	`riskWarningConfirmed` boolean DEFAULT false,
	`professionalInvestorConfirmed` boolean DEFAULT false,
	`selfResponsibilityConfirmed` boolean DEFAULT false,
	`liquidityWaiverConfirmed` boolean DEFAULT false,
	`consentTimestamp` timestamp,
	`consentIpAddress` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `risk_profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`bondId` int NOT NULL,
	`amount` decimal(18,2) NOT NULL,
	`currency` varchar(8) NOT NULL DEFAULT 'EUR',
	`status` enum('pending','confirmed','active','completed','cancelled') NOT NULL DEFAULT 'pending',
	`termsAccepted` boolean DEFAULT false,
	`riskWarningAccepted` boolean DEFAULT false,
	`consentTimestamp` timestamp,
	`consentIpAddress` varchar(64),
	`contractId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wallet_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`walletId` int NOT NULL,
	`userId` int NOT NULL,
	`type` enum('deposit','withdrawal','credit','debit','transfer') NOT NULL,
	`amount` decimal(24,8) NOT NULL,
	`currency` varchar(16) NOT NULL,
	`status` enum('pending','processing','completed','failed','cancelled') NOT NULL DEFAULT 'pending',
	`externalTxHash` varchar(128),
	`externalAddress` varchar(128),
	`bankReference` varchar(128),
	`description` text,
	`approvedBy` int,
	`approvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `wallet_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wallets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`currency` varchar(16) NOT NULL,
	`currencyType` enum('fiat','crypto') NOT NULL,
	`balance` decimal(24,8) NOT NULL DEFAULT '0',
	`availableBalance` decimal(24,8) NOT NULL DEFAULT '0',
	`depositAddress` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `wallets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(32);--> statement-breakpoint
ALTER TABLE `users` ADD `company` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `address` text;--> statement-breakpoint
ALTER TABLE `users` ADD `country` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `kycStatus` enum('pending','in_progress','verified','rejected') DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `kycVerifiedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `kycExternalId` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `investorType` enum('professional','entrepreneur','institutional');--> statement-breakpoint
ALTER TABLE `users` ADD `isAccredited` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `users` ADD `riskProfileId` int;