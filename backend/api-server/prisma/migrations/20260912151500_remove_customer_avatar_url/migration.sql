-- Migrate existing avatar_url values to logo_url if logo_url is null
UPDATE "Customer" SET "logo_url" = "avatar_url" WHERE "logo_url" IS NULL AND "avatar_url" IS NOT NULL;

-- Drop obsolete avatar_url column from Customer table
ALTER TABLE "Customer" DROP COLUMN IF EXISTS "avatar_url";
