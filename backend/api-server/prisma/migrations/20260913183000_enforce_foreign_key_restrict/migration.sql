-- Migration to enforce ON DELETE RESTRICT foreign key constraints

ALTER TABLE "Trip" DROP CONSTRAINT IF EXISTS "Trip_quotationId_fkey";
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TripStop" DROP CONSTRAINT IF EXISTS "TripStop_locationId_fkey";
ALTER TABLE "TripStop" ADD CONSTRAINT "TripStop_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "QuotationStop" DROP CONSTRAINT IF EXISTS "QuotationStop_locationId_fkey";
ALTER TABLE "QuotationStop" ADD CONSTRAINT "QuotationStop_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
