-- CreateSequence
CREATE SEQUENCE IF NOT EXISTS "Quotation_quotation_number_seq";

-- AlterTable
ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "quotation_number" INTEGER DEFAULT nextval('"Quotation_quotation_number_seq"');

-- Backfill existing records sequentially in order of creation date
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt" ASC) as rn
  FROM "Quotation"
)
UPDATE "Quotation" q
SET "quotation_number" = n.rn
FROM numbered n
WHERE q.id = n.id AND q."quotation_number" IS NULL;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Quotation_quotation_number_idx" ON "Quotation"("quotation_number");

-- Synchronize sequence with current maximum quotation_number to prevent duplicate numbers on INSERT
SELECT setval('"Quotation_quotation_number_seq"', COALESCE((SELECT MAX("quotation_number") FROM "Quotation"), 1));

