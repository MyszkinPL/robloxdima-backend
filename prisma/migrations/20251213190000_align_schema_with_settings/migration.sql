-- Align existing database schema with current Prisma schema
-- This migration is written to be safe for already partially-updated DBs

-- Users: add missing columns
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "isBanned" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "bybitUid" TEXT;

-- Orders: add missing columns
ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'gamepass';

-- Payments: add missing columns
ALTER TABLE "payments"
  ADD COLUMN IF NOT EXISTS "method" TEXT NOT NULL DEFAULT 'cryptobot',
  ADD COLUMN IF NOT EXISTS "providerData" TEXT;

-- Settings: add missing columns
ALTER TABLE "settings"
  ADD COLUMN IF NOT EXISTS "cryptoBotTestnet" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "cryptoBotAllowedAssets" TEXT,
  ADD COLUMN IF NOT EXISTS "cryptoBotFiatCurrency" TEXT NOT NULL DEFAULT 'RUB',
  ADD COLUMN IF NOT EXISTS "bybitApiKey" TEXT,
  ADD COLUMN IF NOT EXISTS "bybitApiSecret" TEXT,
  ADD COLUMN IF NOT EXISTS "bybitTestnet" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "bybitStoreUid" TEXT,
  ADD COLUMN IF NOT EXISTS "faq" TEXT,
  ADD COLUMN IF NOT EXISTS "supportLink" TEXT;

-- Logs: create table if it does not exist yet
CREATE TABLE IF NOT EXISTS "logs" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "details" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "logs_pkey" PRIMARY KEY ("id")
);

-- Logs FK and indexes (safe if already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'logs_userId_fkey'
  ) THEN
    ALTER TABLE "logs"
      ADD CONSTRAINT "logs_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS "logs_userId_idx" ON "logs"("userId");
CREATE INDEX IF NOT EXISTS "logs_action_idx" ON "logs"("action");

