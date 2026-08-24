-- Make Location.customerId and Location.code NOT NULL
ALTER TABLE "Location" ALTER COLUMN "customerId" SET NOT NULL;
ALTER TABLE "Location" ALTER COLUMN "code" SET NOT NULL;

-- Drop CustomerSavedLocation table if exists
DROP TABLE IF EXISTS "CustomerSavedLocation";

-- Add unique constraints @@unique([customerId, code]) and @@unique([customerId, slug])
CREATE UNIQUE INDEX IF NOT EXISTS "Location_customerId_code_key" ON "Location"("customerId", "code");
CREATE UNIQUE INDEX IF NOT EXISTS "Location_customerId_slug_key" ON "Location"("customerId", "slug");
