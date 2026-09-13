-- Safely drop legacy quotation snapshot columns from Trip (since they now live authoritatively in TripFinancials)
ALTER TABLE "Trip" DROP COLUMN IF EXISTS "quotation_line_type";
ALTER TABLE "Trip" DROP COLUMN IF EXISTS "quotation_billing_type";
ALTER TABLE "Trip" DROP COLUMN IF EXISTS "quotation_pricing_basis";
ALTER TABLE "Trip" DROP COLUMN IF EXISTS "quotation_vehicle_class";
ALTER TABLE "Trip" DROP COLUMN IF EXISTS "quotation_source_vehicle_label";
ALTER TABLE "Trip" DROP COLUMN IF EXISTS "applied_rate";
