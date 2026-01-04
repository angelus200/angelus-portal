CREATE TABLE `consents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`bondId` int NOT NULL,
	`consentType` enum('risk_disclosure','terms_conditions','subscription_agreement','kyc_confirmation','prospectus_acknowledgment') NOT NULL,
	`accepted` boolean NOT NULL DEFAULT false,
	`acceptedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `consents_id` PRIMARY KEY(`id`)
);
