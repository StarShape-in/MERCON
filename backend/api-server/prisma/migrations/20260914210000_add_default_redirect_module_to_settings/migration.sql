-- AlterTable
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "defaultRedirectModule" TEXT DEFAULT 'quotations';
