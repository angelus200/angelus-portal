CREATE TABLE `consent_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`bondId` int NOT NULL,
	`consentType` enum('risk_disclosure','terms_conditions','subscription_agreement','kyc_confirmation','prospectus_acknowledgment') NOT NULL,
	`action` enum('accepted','rejected','revoked') NOT NULL,
	`ipAddress` varchar(45),
	`userAgent` text,
	`consentVersion` varchar(16),
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `consent_logs_id` PRIMARY KEY(`id`)
);
