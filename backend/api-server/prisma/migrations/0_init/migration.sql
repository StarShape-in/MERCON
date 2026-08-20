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
CREATE TYPE "DocType" AS ENUM ('DriverLicense', 'VehicleRegistration', 'Insurance', 'POD', 'CustomsClearance', 'Waybill', 'Contract', 'Invoice', 'Emergency', 'Passport');

-- CreateEnum
CREATE TYPE "DocStatus" AS ENUM ('PendingReview', 'Verified', 'Rejected', 'Expired');

-- CreateEnum
CREATE TYPE "DocOwnerType" AS ENUM ('Driver', 'Vehicle', 'Trip', 'Customer', 'Company', 'Other');

-- CreateEnum
CREATE TYPE "DocRequirement" AS ENUM ('MANDATORY', 'OPTIONAL', 'DISABLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('Pending', 'Approved', 'Paid', 'Rejected');

-- CreateEnum
CREATE TYPE "DelayReason" AS ENUM ('Traffic', 'VehicleBreakdown', 'CustomerNotReady', 'SlowLoadingUnloading', 'Weather', 'Documentation', 'RouteBlocked', 'Other');

-- CreateEnum
CREATE TYPE "ImportItemStatus" AS ENUM ('Pending', 'Analyzing', 'Ready', 'NeedsInput', 'Unrecognised', 'Confirmed', 'Skipped', 'Failed');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "password_hash" TEXT,
    "name" TEXT,
    "role" "Role" NOT NULL DEFAULT 'Operator',
    "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
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
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "contact_phone" TEXT NOT NULL,
    "whatsapp_number" TEXT,
    "whatsapp_group_link" TEXT,
    "whatsapp_group_name" TEXT,
    "credit_limit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "default_pickup_lat" DOUBLE PRECISION,
    "default_pickup_lng" DOUBLE PRECISION,
    "default_dropoff_lat" DOUBLE PRECISION,
    "default_dropoff_lng" DOUBLE PRECISION,
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
CREATE TABLE "CustomerSavedLocation" (
    "id" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "address" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID,
    "updated_by" UUID,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "CustomerSavedLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Driver" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "ref_id" TEXT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone_primary" TEXT,
    "status" "DriverStatus" NOT NULL DEFAULT 'Available',
    "license_number" TEXT NOT NULL,
    "license_expiry" TIMESTAMPTZ NOT NULL,
    "avatar_url" TEXT,
    "ai_risk_score" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "assignedVehicleId" UUID,
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
    "id" UUID NOT NULL,
    "ref_id" TEXT,
    "plate_number" TEXT NOT NULL,
    "asset_type" "AssetType" NOT NULL,
    "status" "AssetStatus" NOT NULL DEFAULT 'Available',
    "capacity_kg" INTEGER NOT NULL,
    "current_odometer" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "odometer_updated_at" TIMESTAMPTZ,
    "gps_device_id" TEXT,
    "last_lat" DOUBLE PRECISION,
    "last_lng" DOUBLE PRECISION,
    "trailer_number" TEXT,
    "trailer_type" "AssetType",
    "trailer_capacity_kg" INTEGER,
    "icces_device_id" TEXT,
    "last_speed_kph" DOUBLE PRECISION,
    "last_heading" DOUBLE PRECISION,
    "last_status" TEXT,
    "last_seen_at" TIMESTAMPTZ,
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
    "id" UUID NOT NULL,
    "ref_id" TEXT,
    "customerId" UUID NOT NULL,
    "driverId" UUID,
    "vehicleId" UUID,
    "rateCardId" UUID,
    "vehicle_type" TEXT,
    "rate_category" TEXT,
    "billing_type" TEXT,
    "status" "TripStatus" NOT NULL DEFAULT 'Draft',
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
    "waiting_labor_charges" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "additional_stop_charges" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "trip_charges" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "billing_amount" DOUBLE PRECISION,
    "carrier_name" TEXT,
    "is_post_trip_settled" BOOLEAN NOT NULL DEFAULT false,
    "is_third_party" BOOLEAN NOT NULL DEFAULT false,
    "thirdPartyProviderId" UUID,
    "third_party_driver_name" TEXT,
    "third_party_driver_phone" TEXT,
    "third_party_vehicle_plate" TEXT,
    "third_party_vehicle_type" TEXT,
    "third_party_cost" DOUBLE PRECISION DEFAULT 0.0,
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
CREATE TABLE "ThirdPartyProvider" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "contact_person" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "tax_id" TEXT,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "notes" TEXT,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_by" UUID,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMPTZ,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ThirdPartyProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripStop" (
    "id" UUID NOT NULL,
    "tripId" UUID NOT NULL,
    "stop_sequence" INTEGER NOT NULL,
    "stop_type" "StopType" NOT NULL,
    "location_lat" DOUBLE PRECISION NOT NULL,
    "location_lng" DOUBLE PRECISION NOT NULL,
    "location_name" TEXT,
    "location_address" TEXT,
    "locationId" UUID,
    "planned_arrival" TIMESTAMPTZ,
    "actual_arrival" TIMESTAMPTZ,
    "actual_departure" TIMESTAMPTZ,
    "delay_reason" "DelayReason",
    "delay_note" TEXT,
    "delay_logged_by" UUID,
    "delay_logged_at" TIMESTAMPTZ,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_by" UUID,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "TripStop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Folder" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "color" TEXT DEFAULT '#E8450F',
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_by" UUID,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMPTZ,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Folder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentType" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ownerType" "DocOwnerType" NOT NULL,
    "requirementStatus" "DocRequirement" NOT NULL DEFAULT 'OPTIONAL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "requiresIssueDate" BOOLEAN NOT NULL DEFAULT false,
    "requiresExpiryDate" BOOLEAN NOT NULL DEFAULT true,
    "allowsMultipleFiles" BOOLEAN NOT NULL DEFAULT false,
    "allowedFileTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_by" UUID,
    "updated_by" UUID,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" UUID NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "doc_type" "DocType" NOT NULL,
    "status" "DocStatus" NOT NULL DEFAULT 'PendingReview',
    "documentTypeId" UUID,
    "file_url" TEXT NOT NULL,
    "mime_type" TEXT,
    "checksum" TEXT,
    "folderId" UUID,
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
CREATE TABLE "DocumentFile" (
    "id" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "file_url" TEXT NOT NULL,
    "mime_type" TEXT,
    "label" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "created_by" UUID,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMPTZ,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "DocumentFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentImport" (
    "id" UUID NOT NULL,
    "created_by" UUID,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMPTZ,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "DocumentImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentImportItem" (
    "id" UUID NOT NULL,
    "importId" UUID NOT NULL,
    "original_filename" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "mime_type" TEXT,
    "status" "ImportItemStatus" NOT NULL DEFAULT 'Analyzing',
    "proposed_owner_type" TEXT,
    "proposed_owner_id" UUID,
    "proposed_document_type_id" UUID,
    "match_confidence" TEXT,
    "match_reason" TEXT,
    "detected_kind" TEXT,
    "document_number" TEXT,
    "issue_date" TIMESTAMPTZ,
    "expiry_date" TIMESTAMPTZ,
    "issuing_authority" TEXT,
    "ai_extracted_json" JSONB,
    "ocr_raw_text" TEXT,
    "duplicate_of_document_id" UUID,
    "error_message" TEXT,
    "createdDocumentId" UUID,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentImportItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceRecord" (
    "id" UUID NOT NULL,
    "ref_id" TEXT,
    "vehicleId" UUID NOT NULL,
    "workshop_name" TEXT NOT NULL,
    "workshop_contact" TEXT,
    "maintenance_type" TEXT NOT NULL,
    "start_date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_date" TIMESTAMPTZ,
    "service_date" TIMESTAMPTZ NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Completed',
    "work_done" TEXT,
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
CREATE TABLE "SavedWorkshop" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "contact_phone" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "created_by" UUID,
    "updated_by" UUID,
    "deletedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SavedWorkshop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedWorkDone" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT DEFAULT 'General',
    "created_by" UUID,
    "updated_by" UUID,
    "deletedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SavedWorkDone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" UUID NOT NULL,
    "ref_id" TEXT,
    "tripId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'Draft',
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "subtotal" DOUBLE PRECISION NOT NULL,
    "total_amount" DOUBLE PRECISION NOT NULL,
    "due_date" TIMESTAMPTZ NOT NULL,
    "zatca_ref" TEXT,
    "invoicing_note" TEXT,
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

-- CreateTable
CREATE TABLE "Expense" (
    "id" UUID NOT NULL,
    "ref_id" TEXT,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Paid',
    "driverId" UUID,
    "vehicleId" UUID,
    "payee" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "expense_date" TIMESTAMPTZ NOT NULL,
    "payment_method" TEXT,
    "description" TEXT,
    "bill_issued_date" TIMESTAMPTZ,
    "bill_paid_date" TIMESTAMPTZ,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_by" UUID,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMPTZ,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateCard" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "route_origin" TEXT NOT NULL,
    "route_destination" TEXT NOT NULL,
    "base_price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "default_trip_charge" DOUBLE PRECISION,
    "vehicle_type" TEXT,
    "rate_category" TEXT,
    "billing_type" TEXT,
    "via_location" TEXT,
    "originLocationId" UUID,
    "destinationLocationId" UUID,
    "customerId" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_by" UUID,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMPTZ,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "RateCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurchargeRule" (
    "id" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "rateCardId" UUID,
    "charge_type" TEXT NOT NULL,
    "unit" TEXT,
    "vehicle_type" TEXT,
    "rate" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_by" UUID,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMPTZ,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "SurchargeRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripCharge" (
    "id" UUID NOT NULL,
    "tripId" UUID NOT NULL,
    "surchargeRuleId" UUID,
    "charge_type" TEXT NOT NULL,
    "unit" TEXT,
    "rate" DOUBLE PRECISION NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "created_by" UUID,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TripCharge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "address" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_by" UUID,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMPTZ,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "appName" TEXT NOT NULL DEFAULT 'MERCON Operator Platform',
    "companyLegalName" TEXT NOT NULL DEFAULT 'MERCON Operations Ltd.',
    "logoUrl" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#E8450F',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Riyadh',
    "defaultCountryCode" TEXT NOT NULL DEFAULT 'SA',
    "defaultCountryDialCode" TEXT NOT NULL DEFAULT '+966',
    "enabledModules" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "updated_by" UUID,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "driverId" UUID,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "entity_type" TEXT,
    "entity_id" UUID,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportTemplate" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'trips',
    "customerId" UUID,
    "original_filename" TEXT NOT NULL,
    "file_data" BYTEA NOT NULL,
    "file_size" INTEGER NOT NULL,
    "layout" JSONB NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_by" UUID,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMPTZ,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ReportTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedReport" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "spec" JSONB NOT NULL,
    "visualization" TEXT NOT NULL DEFAULT 'table',
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "created_by" UUID,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMPTZ,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "SavedReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledReport" (
    "id" UUID NOT NULL,
    "savedReportId" UUID NOT NULL,
    "frequency" TEXT NOT NULL,
    "dayOfMonth" INTEGER,
    "time" TEXT NOT NULL,
    "recipients" TEXT[],
    "delivery" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "ScheduledReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "CustomerSavedLocation_customerId_idx" ON "CustomerSavedLocation"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_userId_key" ON "Driver"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_ref_id_key" ON "Driver"("ref_id");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_phone_primary_key" ON "Driver"("phone_primary");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_assignedVehicleId_key" ON "Driver"("assignedVehicleId");

-- CreateIndex
CREATE INDEX "Driver_status_deletedAt_idx" ON "Driver"("status", "deletedAt");

-- CreateIndex
CREATE INDEX "Driver_deletedAt_idx" ON "Driver"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_ref_id_key" ON "Vehicle"("ref_id");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_plate_number_key" ON "Vehicle"("plate_number");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_icces_device_id_key" ON "Vehicle"("icces_device_id");

-- CreateIndex
CREATE INDEX "Vehicle_status_deletedAt_idx" ON "Vehicle"("status", "deletedAt");

-- CreateIndex
CREATE INDEX "Vehicle_deletedAt_idx" ON "Vehicle"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Trip_ref_id_key" ON "Trip"("ref_id");

-- CreateIndex
CREATE INDEX "Trip_vehicleId_driverId_idx" ON "Trip"("vehicleId", "driverId");

-- CreateIndex
CREATE INDEX "Trip_thirdPartyProviderId_idx" ON "Trip"("thirdPartyProviderId");

-- CreateIndex
CREATE INDEX "Trip_status_idx" ON "Trip"("status");

-- CreateIndex
CREATE INDEX "Trip_customerId_idx" ON "Trip"("customerId");

-- CreateIndex
CREATE INDEX "Trip_createdAt_idx" ON "Trip"("createdAt");

-- CreateIndex
CREATE INDEX "Trip_planned_start_idx" ON "Trip"("planned_start");

-- CreateIndex
CREATE INDEX "Trip_deletedAt_idx" ON "Trip"("deletedAt");

-- CreateIndex
CREATE INDEX "Trip_status_deletedAt_idx" ON "Trip"("status", "deletedAt");

-- CreateIndex
CREATE INDEX "Trip_customerId_status_deletedAt_idx" ON "Trip"("customerId", "status", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ThirdPartyProvider_name_key" ON "ThirdPartyProvider"("name");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentType_code_key" ON "DocumentType"("code");

-- CreateIndex
CREATE INDEX "DocumentType_ownerType_isActive_idx" ON "DocumentType"("ownerType", "isActive");

-- CreateIndex
CREATE INDEX "Document_documentTypeId_idx" ON "Document"("documentTypeId");

-- CreateIndex
CREATE INDEX "DocumentFile_documentId_idx" ON "DocumentFile"("documentId");

-- CreateIndex
CREATE INDEX "DocumentImport_created_by_isActive_idx" ON "DocumentImport"("created_by", "isActive");

-- CreateIndex
CREATE INDEX "DocumentImportItem_importId_status_idx" ON "DocumentImportItem"("importId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceRecord_ref_id_key" ON "MaintenanceRecord"("ref_id");

-- CreateIndex
CREATE INDEX "MaintenanceRecord_vehicleId_status_idx" ON "MaintenanceRecord"("vehicleId", "status");

-- CreateIndex
CREATE INDEX "MaintenanceRecord_deletedAt_idx" ON "MaintenanceRecord"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SavedWorkshop_name_key" ON "SavedWorkshop"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SavedWorkDone_title_key" ON "SavedWorkDone"("title");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_ref_id_key" ON "Invoice"("ref_id");

-- CreateIndex
CREATE UNIQUE INDEX "Expense_ref_id_key" ON "Expense"("ref_id");

-- CreateIndex
CREATE INDEX "Expense_deletedAt_idx" ON "Expense"("deletedAt");

-- CreateIndex
CREATE INDEX "Expense_category_idx" ON "Expense"("category");

-- CreateIndex
CREATE INDEX "Expense_expense_date_idx" ON "Expense"("expense_date");

-- CreateIndex
CREATE INDEX "Expense_driverId_idx" ON "Expense"("driverId");

-- CreateIndex
CREATE INDEX "Expense_vehicleId_idx" ON "Expense"("vehicleId");

-- CreateIndex
CREATE INDEX "RateCard_customerId_originLocationId_destinationLocationId_idx" ON "RateCard"("customerId", "originLocationId", "destinationLocationId");

-- CreateIndex
CREATE INDEX "SurchargeRule_customerId_rateCardId_idx" ON "SurchargeRule"("customerId", "rateCardId");

-- CreateIndex
CREATE INDEX "SurchargeRule_deletedAt_idx" ON "SurchargeRule"("deletedAt");

-- CreateIndex
CREATE INDEX "TripCharge_tripId_idx" ON "TripCharge"("tripId");

-- CreateIndex
CREATE INDEX "TripCharge_surchargeRuleId_idx" ON "TripCharge"("surchargeRuleId");

-- CreateIndex
CREATE UNIQUE INDEX "Location_slug_key" ON "Location"("slug");

-- CreateIndex
CREATE INDEX "ReportTemplate_customerId_idx" ON "ReportTemplate"("customerId");

-- CreateIndex
CREATE INDEX "SavedReport_deletedAt_idx" ON "SavedReport"("deletedAt");

-- CreateIndex
CREATE INDEX "SavedReport_category_idx" ON "SavedReport"("category");

-- CreateIndex
CREATE INDEX "ScheduledReport_savedReportId_idx" ON "ScheduledReport"("savedReportId");

-- CreateIndex
CREATE INDEX "ScheduledReport_deletedAt_idx" ON "ScheduledReport"("deletedAt");

-- AddForeignKey
ALTER TABLE "CustomerSavedLocation" ADD CONSTRAINT "CustomerSavedLocation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Driver" ADD CONSTRAINT "Driver_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Driver" ADD CONSTRAINT "Driver_assignedVehicleId_fkey" FOREIGN KEY ("assignedVehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_rateCardId_fkey" FOREIGN KEY ("rateCardId") REFERENCES "RateCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_payment_approved_by_fkey" FOREIGN KEY ("payment_approved_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_thirdPartyProviderId_fkey" FOREIGN KEY ("thirdPartyProviderId") REFERENCES "ThirdPartyProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripStop" ADD CONSTRAINT "TripStop_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripStop" ADD CONSTRAINT "TripStop_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_documentTypeId_fkey" FOREIGN KEY ("documentTypeId") REFERENCES "DocumentType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentFile" ADD CONSTRAINT "DocumentFile_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentImportItem" ADD CONSTRAINT "DocumentImportItem_importId_fkey" FOREIGN KEY ("importId") REFERENCES "DocumentImport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentImportItem" ADD CONSTRAINT "DocumentImportItem_proposed_document_type_id_fkey" FOREIGN KEY ("proposed_document_type_id") REFERENCES "DocumentType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRecord" ADD CONSTRAINT "MaintenanceRecord_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateCard" ADD CONSTRAINT "RateCard_originLocationId_fkey" FOREIGN KEY ("originLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateCard" ADD CONSTRAINT "RateCard_destinationLocationId_fkey" FOREIGN KEY ("destinationLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateCard" ADD CONSTRAINT "RateCard_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurchargeRule" ADD CONSTRAINT "SurchargeRule_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurchargeRule" ADD CONSTRAINT "SurchargeRule_rateCardId_fkey" FOREIGN KEY ("rateCardId") REFERENCES "RateCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripCharge" ADD CONSTRAINT "TripCharge_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripCharge" ADD CONSTRAINT "TripCharge_surchargeRuleId_fkey" FOREIGN KEY ("surchargeRuleId") REFERENCES "SurchargeRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportTemplate" ADD CONSTRAINT "ReportTemplate_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledReport" ADD CONSTRAINT "ScheduledReport_savedReportId_fkey" FOREIGN KEY ("savedReportId") REFERENCES "SavedReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

