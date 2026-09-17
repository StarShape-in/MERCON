-- Rename billing_type to operation_type in Quotation
ALTER TABLE "Quotation" RENAME COLUMN "billing_type" TO "operation_type";

-- Rename billing_type to operation_type in Trip
ALTER TABLE "Trip" RENAME COLUMN "billing_type" TO "operation_type";

-- Rename quotation_billing_type to quotation_operation_type in TripFinancials
ALTER TABLE "TripFinancials" RENAME COLUMN "quotation_billing_type" TO "quotation_operation_type";
