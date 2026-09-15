-- CreateTable
CREATE TABLE "VehicleCompatibilityRule" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "serviceVehicleClassId" TEXT NOT NULL,
    "serviceVehicleClassCode" TEXT NOT NULL,
    "preferredVehicleClassCodes" TEXT[],
    "allowedVehicleClassCodes" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleCompatibilityRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VehicleCompatibilityRule_serviceVehicleClassCode_key" ON "VehicleCompatibilityRule"("serviceVehicleClassCode");

-- CreateIndex
CREATE INDEX "VehicleCompatibilityRule_serviceVehicleClassCode_idx" ON "VehicleCompatibilityRule"("serviceVehicleClassCode");
