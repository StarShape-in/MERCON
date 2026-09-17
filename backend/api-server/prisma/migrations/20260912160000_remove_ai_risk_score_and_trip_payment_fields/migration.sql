-- AlterTable "Driver"
ALTER TABLE "Driver" DROP COLUMN IF EXISTS "ai_risk_score";

-- AlterTable "Trip"
ALTER TABLE "Trip" DROP CONSTRAINT IF EXISTS "Trip_payment_approved_by_fkey";
ALTER TABLE "Trip" DROP COLUMN IF EXISTS "extra_driver_payment";
ALTER TABLE "Trip" DROP COLUMN IF EXISTS "payment_reason";
ALTER TABLE "Trip" DROP COLUMN IF EXISTS "payment_approved_by";
ALTER TABLE "Trip" DROP COLUMN IF EXISTS "payment_status";
ALTER TABLE "Trip" DROP COLUMN IF EXISTS "payment_date";

-- DropTable
DROP TABLE IF EXISTS "TripDriver";

-- DropEnum
DROP TYPE IF EXISTS "PaymentStatus";
