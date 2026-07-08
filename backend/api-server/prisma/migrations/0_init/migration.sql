-- CreateEnum
CREATE TYPE "Role" AS ENUM ('Admin', 'Operator', 'Driver');

-- CreateEnum
CREATE TYPE "DriverStatus" AS ENUM ('Available', 'OnTrip', 'OffDuty', 'Inactive');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('Available', 'OnTrip', 'Maintenance', 'Inactive');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('Flatbed', 'Reefer', 'Box', 'Tanker');

-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('Draft', 'Dispatched', 'AtPickup', 'InTransit', 'AtDelivery', 'Completed', 'Invoiced', 'Cancelled');

-- CreateEnum
CREATE TYPE "StopType" AS ENUM ('Pickup', 'Dropoff', 'Rest', 'Refuel');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('Draft', 'Pending', 'Paid', 'Overdue', 'Cancelled');

-- CreateEnum
CREATE TYPE "DocType" AS ENUM ('DriverLicense', 'VehicleRegistration', 'Insurance', 'POD', 'CustomsClearance', 'Waybill', 'Contract', 'Invoice');

-- CreateEnum
CREATE TYPE "DocStatus" AS ENUM ('PendingReview', 'Verified', 'Rejected', 'Expired');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('Pending', 'Approved', 'Paid', 'Rejected');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'Operator',
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_by" UUID,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMPTZ,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL,
    "contact_phone" TEXT NOT NULL,
    "credit_limit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_by" UUID,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMPTZ,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Driver" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "ref_id" TEXT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone_primary" TEXT NOT NULL,
    "status" "DriverStatus" NOT NULL DEFAULT 'Available',
    "license_number" TEXT NOT NULL,
    "license_expiry" TIMESTAMPTZ NOT NULL,
    "ai_risk_score" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_by" UUID,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMPTZ,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Driver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "ref_id" TEXT,
    "plate_number" TEXT NOT NULL,
    "asset_type" "AssetType" NOT NULL,
    "status" "AssetStatus" NOT NULL DEFAULT 'Available',
    "capacity_kg" INTEGER NOT NULL,
    "current_odometer" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "gps_device_id" TEXT,
    "trailer_number" TEXT,
    "trailer_type" "AssetType",
    "trailer_capacity_kg" INTEGER,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_by" UUID,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMPTZ,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trip" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "ref_id" TEXT,
    "customerId" UUID NOT NULL,
    "driverId" UUID,
    "vehicleId" UUID,
    "status" "TripStatus" NOT NULL DEFAULT 'Draft',
    "cargo_type" TEXT NOT NULL,
    "hazmat_flag" BOOLEAN NOT NULL DEFAULT false,
    "planned_distance" DOUBLE PRECISION,
    "planned_start" TIMESTAMPTZ,
    "actual_start" TIMESTAMPTZ,
    "planned_end" TIMESTAMPTZ,
    "actual_end" TIMESTAMPTZ,
    "extra_driver_payment" DOUBLE PRECISION,
    "payment_reason" TEXT,
    "payment_approved_by" UUID,
    "payment_status" "PaymentStatus",
    "payment_date" TIMESTAMPTZ,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_by" UUID,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMPTZ,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripStop" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "tripId" UUID NOT NULL,
    "stop_sequence" INTEGER NOT NULL,
    "stop_type" "StopType" NOT NULL,
    "location_lat" DOUBLE PRECISION NOT NULL,
    "location_lng" DOUBLE PRECISION NOT NULL,
    "planned_arrival" TIMESTAMPTZ,
    "actual_arrival" TIMESTAMPTZ,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_by" UUID,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "TripStop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "doc_type" "DocType" NOT NULL,
    "status" "DocStatus" NOT NULL DEFAULT 'PendingReview',
    "file_url" TEXT NOT NULL,
    "mime_type" TEXT,
    "checksum" TEXT,
    "issue_date" TIMESTAMPTZ,
    "expiry_date" TIMESTAMPTZ,
    "ocr_raw_text" TEXT,
    "ai_extracted_json" JSONB,
    "is_confidential" BOOLEAN NOT NULL DEFAULT false,
    "verified_by" UUID,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_by" UUID,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMPTZ,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceRecord" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "vehicleId" UUID NOT NULL,
    "workshop_name" TEXT NOT NULL,
    "workshop_contact" TEXT,
    "maintenance_type" TEXT NOT NULL,
    "service_date" TIMESTAMPTZ NOT NULL,
    "odometer_reading" DOUBLE PRECISION NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "invoice_number" TEXT,
    "invoice_url" TEXT,
    "next_service_due" TIMESTAMPTZ,
    "remarks" TEXT,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_by" UUID,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMPTZ,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "MaintenanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "ref_id" TEXT,
    "tripId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'Draft',
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "subtotal" DOUBLE PRECISION NOT NULL,
    "total_amount" DOUBLE PRECISION NOT NULL,
    "due_date" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_by" UUID,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMPTZ,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_ref_id_key" ON "Driver"("ref_id");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_phone_primary_key" ON "Driver"("phone_primary");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_ref_id_key" ON "Vehicle"("ref_id");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_plate_number_key" ON "Vehicle"("plate_number");

-- CreateIndex
CREATE UNIQUE INDEX "Trip_ref_id_key" ON "Trip"("ref_id");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_ref_id_key" ON "Invoice"("ref_id");

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_payment_approved_by_fkey" FOREIGN KEY ("payment_approved_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripStop" ADD CONSTRAINT "TripStop_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRecord" ADD CONSTRAINT "MaintenanceRecord_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

