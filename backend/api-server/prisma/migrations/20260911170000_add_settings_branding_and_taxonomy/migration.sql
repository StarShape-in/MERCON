-- Migration: 20260911170000_add_settings_branding_and_taxonomy
-- Adds branding colors, taxonomy register configuration, and maintenance mode fields to Settings.
-- This migration is strictly additive and non-destructive.

ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "themeColors" JSONB;
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "taxonomyConfig" JSONB;
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "maintenanceMode" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "maintenanceBanner" TEXT;
