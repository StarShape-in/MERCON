import { prisma } from '../src/db';

async function main() {
  console.log('Running TripFinancials migration step-by-step...');
  
  // 1. CreateTable
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "TripFinancials" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "tripId" UUID NOT NULL,
        "quotationId" UUID,
        "applied_rate" DECIMAL(12,2),
        "quotation_line_type" TEXT,
        "quotation_billing_type" TEXT,
        "quotation_pricing_basis" TEXT,
        "quotation_vehicle_class" TEXT,
        "quotation_source_vehicle_label" TEXT,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "TripFinancials_pkey" PRIMARY KEY ("id")
    );
  `);
  console.log('Step 1: CreateTable done');

  // 2. CreateIndexes
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "TripFinancials_tripId_key" ON "TripFinancials"("tripId");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "TripFinancials_quotationId_idx" ON "TripFinancials"("quotationId");`);
  console.log('Step 2: CreateIndexes done');

  // 3. AddForeignKey tripId
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TripFinancials_tripId_fkey') THEN
            ALTER TABLE "TripFinancials" ADD CONSTRAINT "TripFinancials_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
    END $$;
  `);
  console.log('Step 3: AddForeignKey tripId done');

  // 4. AddForeignKey quotationId
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TripFinancials_quotationId_fkey') THEN
            ALTER TABLE "TripFinancials" ADD CONSTRAINT "TripFinancials_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
    END $$;
  `);
  console.log('Step 4: AddForeignKey quotationId done');

  // 5. Backfill existing trips
  const backfilled = await prisma.$executeRawUnsafe(`
    INSERT INTO "TripFinancials" ("id", "tripId", "quotationId", "applied_rate", "quotation_line_type", "quotation_billing_type", "quotation_pricing_basis", "quotation_vehicle_class", "quotation_source_vehicle_label", "createdAt", "updatedAt")
    SELECT
        gen_random_uuid(),
        t."id",
        t."quotationId",
        t."applied_rate",
        t."quotation_line_type",
        t."quotation_billing_type",
        t."quotation_pricing_basis",
        t."quotation_vehicle_class",
        t."quotation_source_vehicle_label",
        t."createdAt",
        t."updatedAt"
    FROM "Trip" t
    WHERE NOT EXISTS (
        SELECT 1 FROM "TripFinancials" tf WHERE tf."tripId" = t."id"
    );
  `);
  console.log(`Step 5: Backfill completed! (${backfilled} rows inserted)`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
