-- Crypto Cold Wallet System
-- Feature 1: Company cold wallet addresses
CREATE TABLE `company_wallets` (
  `id` int AUTO_INCREMENT NOT NULL,
  `coin` varchar(16) NOT NULL,
  `network` varchar(64) NOT NULL,
  `address` varchar(255) NOT NULL,
  `label` varchar(128),
  `isActive` boolean NOT NULL DEFAULT true,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `company_wallets_id` PRIMARY KEY (`id`)
);

-- Feature 5: Track payment method (EUR or Crypto) for payment schedules
ALTER TABLE `payment_schedules`
  ADD COLUMN `paymentMethod` varchar(32) NULL,
  ADD COLUMN `cryptoTxHash` varchar(128) NULL,
  ADD COLUMN `cryptoCoin` varchar(16) NULL;
