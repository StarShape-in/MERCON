-- Safely migrate existing avatar_url values to logo_url if avatar_url column exists
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Customer' AND column_name='avatar_url') THEN
    UPDATE "Customer" SET "logo_url" = "avatar_url" WHERE "logo_url" IS NULL AND "avatar_url" IS NOT NULL;
    ALTER TABLE "Customer" DROP COLUMN "avatar_url";
  END IF;
END $$;
