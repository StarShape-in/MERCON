-- CreateEnum
CREATE TYPE "DriverWorkflow" AS ENUM ('NATIVE', 'EXTERNAL_APP');

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN "driver_workflow" "DriverWorkflow" NOT NULL DEFAULT 'NATIVE';

-- AlterTable
ALTER TABLE "Trip" ADD COLUMN "driver_workflow" "DriverWorkflow" NOT NULL DEFAULT 'NATIVE';
