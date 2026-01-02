ALTER TABLE `users` ADD `firstName` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `lastName` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `dateOfBirth` date;--> statement-breakpoint
ALTER TABLE `users` ADD `taxNumber` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `street` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `houseNumber` varchar(16);--> statement-breakpoint
ALTER TABLE `users` ADD `postalCode` varchar(16);--> statement-breakpoint
ALTER TABLE `users` ADD `city` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `isCompany` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `users` ADD `companyName` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `companyRegisterNumber` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `companyTaxNumber` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `companyStreet` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `companyHouseNumber` varchar(16);--> statement-breakpoint
ALTER TABLE `users` ADD `companyPostalCode` varchar(16);--> statement-breakpoint
ALTER TABLE `users` ADD `companyCity` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `companyCountry` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `bankAccountHolder` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `bankIban` varchar(34);--> statement-breakpoint
ALTER TABLE `users` ADD `bankBic` varchar(11);--> statement-breakpoint
ALTER TABLE `users` ADD `bankName` varchar(128);