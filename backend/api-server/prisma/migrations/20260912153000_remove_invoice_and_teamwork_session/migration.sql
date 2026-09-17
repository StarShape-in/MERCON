-- Drop Invoice table and InvoiceStatus enum
DROP TABLE IF EXISTS "Invoice" CASCADE;
DROP TYPE IF EXISTS "InvoiceStatus" CASCADE;

-- Drop obsolete TeamWorkSession table
DROP TABLE IF EXISTS "TeamWorkSession" CASCADE;

-- Make Document.doc_type optional
ALTER TABLE "Document" ALTER COLUMN "doc_type" DROP NOT NULL;
