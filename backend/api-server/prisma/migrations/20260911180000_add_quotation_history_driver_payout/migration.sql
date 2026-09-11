-- Migration: 20260911180000_add_quotation_history_driver_payout
-- Adds driver payout tracking columns to QuotationHistory.
-- This migration is strictly additive and non-destructive.

ALTER TABLE "QuotationHistory" ADD COLUMN IF NOT EXISTS "old_driver_payout" DECIMAL(12,2);
ALTER TABLE "QuotationHistory" ADD COLUMN IF NOT EXISTS "new_driver_payout" DECIMAL(12,2);
