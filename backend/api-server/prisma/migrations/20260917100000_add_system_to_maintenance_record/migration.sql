-- AlterTable
ALTER TABLE "MaintenanceRecord" ADD COLUMN IF NOT EXISTS "system" TEXT DEFAULT 'others';
