-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "avatar_url" TEXT,
ADD COLUMN     "company_name" TEXT,
ADD COLUMN     "logo_url" TEXT,
ADD COLUMN     "payment_terms" TEXT,
ADD COLUMN     "primary_contact_person" TEXT,
ADD COLUMN     "primary_contact_phone" TEXT,
ADD COLUMN     "secondary_contact_person" TEXT,
ADD COLUMN     "secondary_contact_phone" TEXT,
ADD COLUMN     "tax_number" TEXT;

-- AlterTable
ALTER TABLE "Location" ADD COLUMN     "codes" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE INDEX "Customer_deletedAt_idx" ON "Customer"("deletedAt");

-- CreateIndex
CREATE INDEX "ThirdPartyProvider_deletedAt_idx" ON "ThirdPartyProvider"("deletedAt");

-- CreateIndex
CREATE INDEX "TripStop_tripId_idx" ON "TripStop"("tripId");

-- CreateIndex
CREATE INDEX "Folder_deletedAt_idx" ON "Folder"("deletedAt");

-- CreateIndex
CREATE INDEX "Document_entity_type_entity_id_deletedAt_idx" ON "Document"("entity_type", "entity_id", "deletedAt");

-- CreateIndex
CREATE INDEX "Document_deletedAt_createdAt_idx" ON "Document"("deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "Document_deletedAt_expiry_date_idx" ON "Document"("deletedAt", "expiry_date");

-- CreateIndex
CREATE INDEX "Document_folderId_idx" ON "Document"("folderId");

-- CreateIndex
CREATE INDEX "Invoice_deletedAt_status_idx" ON "Invoice"("deletedAt", "status");

-- CreateIndex
CREATE INDEX "Invoice_customerId_idx" ON "Invoice"("customerId");

-- CreateIndex
CREATE INDEX "Invoice_tripId_idx" ON "Invoice"("tripId");

-- CreateIndex
CREATE INDEX "RateCard_deletedAt_idx" ON "RateCard"("deletedAt");

-- CreateIndex
CREATE INDEX "Location_deletedAt_idx" ON "Location"("deletedAt");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_driverId_createdAt_idx" ON "Notification"("driverId", "createdAt");

