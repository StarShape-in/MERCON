-- Migration: 20260823200000_rename_pricing_rule_to_quotation

-- 1. Rename tables
ALTER TABLE "PricingRule" RENAME TO "Quotation";
ALTER TABLE "PricingRuleStop" RENAME TO "QuotationStop";
ALTER TABLE "PricingRuleHistory" RENAME TO "QuotationHistory";

-- 2. Add source_label column to QuotationStop
ALTER TABLE "QuotationStop" ADD COLUMN IF NOT EXISTS "source_label" TEXT;

-- 3. Rename FK columns from pricingRuleId to quotationId
ALTER TABLE "QuotationStop" RENAME COLUMN "pricingRuleId" TO "quotationId";
ALTER TABLE "QuotationHistory" RENAME COLUMN "pricingRuleId" TO "quotationId";
ALTER TABLE "Trip" RENAME COLUMN "pricingRuleId" TO "quotationId";
ALTER TABLE "SurchargeRule" RENAME COLUMN "pricingRuleId" TO "quotationId";

-- 4. Update index names
ALTER INDEX IF EXISTS "PricingRuleStop_pricingRuleId_idx" RENAME TO "QuotationStop_quotationId_idx";
ALTER INDEX IF EXISTS "PricingRuleHistory_pricingRuleId_idx" RENAME TO "QuotationHistory_quotationId_idx";
ALTER INDEX IF EXISTS "SurchargeRule_customerId_pricingRuleId_idx" RENAME TO "SurchargeRule_customerId_quotationId_idx";

-- 5. Update default source value in QuotationHistory
ALTER TABLE "QuotationHistory" ALTER COLUMN "source" SET DEFAULT 'QUOTATION_MODULE';
