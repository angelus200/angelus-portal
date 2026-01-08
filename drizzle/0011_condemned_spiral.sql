ALTER TABLE `subscriptions` ADD `paymentStatus` enum('pending','processing','completed','failed','refunded') DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `stripePaymentIntentId` varchar(255);--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `stripeCustomerId` varchar(255);--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `paymentCompletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `paymentFailedAt` timestamp;