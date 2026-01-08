CREATE TABLE `legacy_customer_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`legacy_customer_id` int NOT NULL,
	`document_type` enum('contract','projection','interest_calculation','payment_confirmation','tax_certificate','bank_statement','other') NOT NULL,
	`file_name` varchar(255) NOT NULL,
	`file_path` varchar(500) NOT NULL,
	`file_size` int,
	`file_type` varchar(50),
	`document_date` date,
	`description` text,
	`uploaded_by` int,
	`uploaded_at` timestamp DEFAULT (now()),
	`is_processed` boolean DEFAULT false,
	`extracted_data` json,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `legacy_customer_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `legacy_customer_interest_calculations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`legacy_customer_id` int NOT NULL,
	`calculation_year` int NOT NULL,
	`calculation_month` int,
	`period_start_date` date NOT NULL,
	`period_end_date` date NOT NULL,
	`annual_interest` decimal(15,2),
	`monthly_installment` decimal(15,2),
	`capital_gains_tax_amount` decimal(15,2),
	`solidarity_surcharge_amount` decimal(15,2),
	`church_tax_amount` decimal(15,2),
	`total_tax_withheld` decimal(15,2),
	`net_interest` decimal(15,2),
	`payment_date` date,
	`status` enum('pending','paid','failed','cancelled') DEFAULT 'pending',
	`payment_confirmation_date` timestamp,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `legacy_customer_interest_calculations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `legacy_customer_payment_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`legacy_customer_id` int NOT NULL,
	`interest_calculation_id` int,
	`payment_type` enum('initial_investment','interest_payment','refund','adjustment') NOT NULL,
	`payment_date` date NOT NULL,
	`amount` decimal(15,2) NOT NULL,
	`transaction_reference` varchar(255),
	`bank_transaction_id` varchar(255),
	`status` enum('pending','confirmed','failed','cancelled') DEFAULT 'pending',
	`confirmation_date` timestamp,
	`notes` text,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `legacy_customer_payment_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `legacy_customers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contract_number` varchar(20) NOT NULL,
	`user_id` int,
	`first_name` varchar(100) NOT NULL,
	`last_name` varchar(100) NOT NULL,
	`birth_date` date,
	`email` varchar(255),
	`phone` varchar(20),
	`street` varchar(255),
	`house_number` varchar(10),
	`postal_code` varchar(10),
	`city` varchar(100),
	`country` varchar(100) DEFAULT 'Deutschland',
	`iban` varchar(34),
	`bic` varchar(11),
	`account_holder` varchar(255),
	`bond_id` int,
	`bond_number` varchar(50),
	`contract_date` date,
	`value_date` date,
	`investment_amount` decimal(15,2),
	`share_count` int,
	`share_value` decimal(15,2),
	`annual_interest_rate` decimal(5,2),
	`interest_payment_frequency` enum('monthly','quarterly','annual') DEFAULT 'monthly',
	`annual_interest_date` date,
	`monthly_payment_day` int,
	`maturity_date` date,
	`term_months` int,
	`capital_gains_tax` decimal(5,2) DEFAULT '25.00',
	`solidarity_surcharge` decimal(5,2) DEFAULT '5.50',
	`church_tax` decimal(5,2) DEFAULT '0.00',
	`status` enum('pending','active','completed','cancelled') DEFAULT 'pending',
	`import_date` timestamp DEFAULT (now()),
	`activation_date` timestamp,
	`notes` text,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `legacy_customers_id` PRIMARY KEY(`id`),
	CONSTRAINT `legacy_customers_contract_number_unique` UNIQUE(`contract_number`),
	CONSTRAINT `legacy_customers_user_id_unique` UNIQUE(`user_id`),
	CONSTRAINT `legacy_customers_email_unique` UNIQUE(`email`),
	CONSTRAINT `idx_contract_number` UNIQUE(`contract_number`),
	CONSTRAINT `idx_email` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE INDEX `idx_legacy_customer_id` ON `legacy_customer_documents` (`legacy_customer_id`);--> statement-breakpoint
CREATE INDEX `idx_document_type` ON `legacy_customer_documents` (`document_type`);--> statement-breakpoint
CREATE INDEX `idx_uploaded_at` ON `legacy_customer_documents` (`uploaded_at`);--> statement-breakpoint
CREATE INDEX `idx_legacy_customer_id` ON `legacy_customer_interest_calculations` (`legacy_customer_id`);--> statement-breakpoint
CREATE INDEX `idx_payment_date` ON `legacy_customer_interest_calculations` (`payment_date`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `legacy_customer_interest_calculations` (`status`);--> statement-breakpoint
CREATE INDEX `idx_calculation_year_month` ON `legacy_customer_interest_calculations` (`calculation_year`,`calculation_month`);--> statement-breakpoint
CREATE INDEX `idx_legacy_customer_id` ON `legacy_customer_payment_history` (`legacy_customer_id`);--> statement-breakpoint
CREATE INDEX `idx_payment_date` ON `legacy_customer_payment_history` (`payment_date`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `legacy_customer_payment_history` (`status`);--> statement-breakpoint
CREATE INDEX `idx_interest_calculation_id` ON `legacy_customer_payment_history` (`interest_calculation_id`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `legacy_customers` (`status`);--> statement-breakpoint
CREATE INDEX `idx_user_id` ON `legacy_customers` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_bond_id` ON `legacy_customers` (`bond_id`);--> statement-breakpoint
CREATE INDEX `idx_status_activation` ON `legacy_customers` (`status`,`activation_date`);