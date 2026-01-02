CREATE TABLE `investor_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`investorId` int NOT NULL,
	`authorId` int NOT NULL,
	`authorName` varchar(255),
	`title` varchar(255),
	`content` text NOT NULL,
	`category` enum('general','kyc','compliance','payment','communication','other') DEFAULT 'general',
	`priority` enum('low','normal','high','urgent') DEFAULT 'normal',
	`isPrivate` boolean DEFAULT true,
	`isPinned` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `investor_notes_id` PRIMARY KEY(`id`)
);
