ALTER TABLE `subscriptions` ADD `paymentStatus` enum('pending','paid','failed','cancelled') DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `stripePaymentIntentId` varchar(255);--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `stripeCustomerId` varchar(255);