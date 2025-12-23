CREATE TABLE IF NOT EXISTS `allowances` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `chain_id` integer NOT NULL,
  `owner` text NOT NULL,
  `token` text NOT NULL,
  `spender` text NOT NULL,
  `amount` text NOT NULL,
  `expiration` integer NOT NULL,
  `updated_at` integer NOT NULL,
  `last_seen` integer NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS `allowances_chain_id_owner_token_spender_unique` ON `allowances` (`chain_id`, `owner`, `token`, `spender`);

CREATE TABLE IF NOT EXISTS `scan_cursors` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `chain_id` integer NOT NULL,
  `owner` text NOT NULL,
  `last_scanned_block` integer NOT NULL,
  `last_scanned_at` integer NOT NULL
);

CREATE TABLE IF NOT EXISTS `receipts` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `owner` text NOT NULL,
  `chain_id` integer NOT NULL,
  `revoked` integer NOT NULL,
  `limited` integer NOT NULL,
  `panicked` integer NOT NULL,
  `created_at` integer NOT NULL,
  `summary` text NOT NULL
);
