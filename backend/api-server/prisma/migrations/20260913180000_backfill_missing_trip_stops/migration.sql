-- 1. Link quotationId for TRP-0005 and TRP-0006 if not already linked
UPDATE "Trip"
SET "quotationId" = 'd9fe6fe9-b034-4a6c-90c6-8bca1cfe69ea'
WHERE "id" IN ('52c7a80c-5de8-4213-9742-8cb01dcc8647', 'ba246e46-63ca-492d-9752-3bf773d5ce1b')
  AND "quotationId" IS NULL;

-- 2. Upsert TripFinancials snapshot for TRP-0005 and TRP-0006 conditionally
DO $$ 
BEGIN 
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'TripFinancials' AND column_name = 'quotation_billing_type'
  ) THEN
    INSERT INTO "TripFinancials" (
      "id", "tripId", "quotationId", "applied_rate", "quotation_line_type", "quotation_billing_type", "createdAt", "updatedAt"
    )
    SELECT gen_random_uuid(), t."id", q."id", q."rate", q."line_type", q."billing_type", NOW(), NOW()
    FROM "Trip" t
    JOIN "Quotation" q ON q."id" = 'd9fe6fe9-b034-4a6c-90c6-8bca1cfe69ea'
    WHERE t."id" IN ('52c7a80c-5de8-4213-9742-8cb01dcc8647', 'ba246e46-63ca-492d-9752-3bf773d5ce1b')
    ON CONFLICT ("tripId") DO NOTHING;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'TripFinancials' AND column_name = 'quotation_operation_type'
  ) THEN
    INSERT INTO "TripFinancials" (
      "id", "tripId", "quotationId", "applied_rate", "quotation_line_type", "quotation_operation_type", "createdAt", "updatedAt"
    )
    SELECT gen_random_uuid(), t."id", q."id", q."rate", q."line_type", q."billing_type", NOW(), NOW()
    FROM "Trip" t
    JOIN "Quotation" q ON q."id" = 'd9fe6fe9-b034-4a6c-90c6-8bca1cfe69ea'
    WHERE t."id" IN ('52c7a80c-5de8-4213-9742-8cb01dcc8647', 'ba246e46-63ca-492d-9752-3bf773d5ce1b')
    ON CONFLICT ("tripId") DO NOTHING;
  END IF;
END $$;

-- 3. Backfill TripStop records for TRP-0005 and TRP-0006 from QuotationStop
INSERT INTO "TripStop" (
  "id",
  "tripId",
  "stop_sequence",
  "leg_index",
  "stop_type",
  "locationId",
  "location_name",
  "createdAt",
  "updatedAt"
)
SELECT 
  gen_random_uuid(),
  t."id" AS "tripId",
  qs."sequence" AS "stop_sequence",
  qs."leg_index" AS "leg_index",
  qs."stop_type" AS "stop_type",
  qs."locationId" AS "locationId",
  COALESCE(l."name", qs."source_label", 'Stop') AS "location_name",
  NOW(),
  NOW()
FROM "Trip" t
JOIN "QuotationStop" qs ON qs."quotationId" = t."quotationId"
LEFT JOIN "Location" l ON l."id" = qs."locationId"
WHERE t."id" IN ('52c7a80c-5de8-4213-9742-8cb01dcc8647', 'ba246e46-63ca-492d-9752-3bf773d5ce1b')
  AND NOT EXISTS (
    SELECT 1 FROM "TripStop" ts WHERE ts."tripId" = t."id"
  );
