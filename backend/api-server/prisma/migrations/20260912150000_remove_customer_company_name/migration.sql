-- Drop obsolete company_name column from Customer table
ALTER TABLE "Customer" DROP COLUMN IF EXISTS "company_name";
