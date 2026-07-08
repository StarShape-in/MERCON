# MERCON Logistics - Final Practical Database Schema

This document contains the definitive, production-ready backend schema tailored exactly to our logistics business operations. It focuses on performance, simplicity, and maintainability without unnecessary ERP bloat, while still retaining tier-1 audit capabilities (UUIDs, UTC, Soft Deletes).

## 1. Core Principles
* **Full Audit Trail:** Every single table tracks exactly *when* an action happened (`createdAt`, `updatedAt`, `deletedAt`) and *who* performed it (`created_by`, `updated_by`, `deleted_by`).
* **Single Branch:** Removed multi-branch/multi-tenant complexity.
* **Merged Trailers:** Trailer info is embedded inside the `Vehicle` table to eliminate slow SQL JOIN queries.
* **External Maintenance:** We do not manage internal mechanics or parts inventory. We only log external workshop receipts.
* **Driver Payments:** Trips have built-in fields for on-the-ground cash payments (loading/unloading).
* **Tax-Free Billing:** Invoices are straightforward `subtotal` + `extra_charges` = `total_amount`.

---

## 2. Table Explanations

| Table | Purpose & Details |
| :--- | :--- |
| **`User`** | Internal staff members. Roles are strictly limited to `Admin`, `Operator`, and `Driver`. |
| **`Customer`** | B2B clients who pay us to move their freight. They are the recipients of `Invoices`. |
| **`Driver`** | The human operators. Contains license info, phone numbers, and an AI risk score. |
| **`Vehicle`** | The master asset table. It now includes optional trailer attributes (`trailer_number`, `trailer_type`, `trailer_capacity_kg`), making dispatching a single-table lookup. |
| **`Trip`** | The core freight job linking Customer, Driver, and Vehicle. Now includes `extra_driver_payment` workflow for cash payouts. |
| **`TripStop`** | The granular routing engine (Stop 1: Pickup, Stop 2: Dropoff) tracking planned vs. actual arrivals. |
| **`Document`** | The centralized file vault. Uses `entity_type` + `entity_id` to attach photos, PODs, and licenses to *any* record in the system. |
| **`MaintenanceRecord`** | Replaces bloated ERP modules. Simply logs external workshop costs, dates, odometer readings, and receipt uploads. |
| **`Invoice`** | The billing engine. Generates a flat `total_amount` due from the Customer once a trip is complete. |

---

## 3. The Prisma Schema Code

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// -----------------------------------------
// ENUMS (Strict State Machines)
// -----------------------------------------
enum Role { 
  Admin
  Operator
  Driver 
}

enum DriverStatus { Available, OnTrip, OffDuty, Inactive }
enum AssetStatus { Available, OnTrip, Maintenance, Inactive }
enum AssetType { Flatbed, Reefer, Box, Tanker }
enum TripStatus { Draft, Dispatched, AtPickup, InTransit, AtDelivery, Completed, Invoiced, Cancelled }
enum StopType { Pickup, Dropoff, Rest, Refuel }
enum InvoiceStatus { Draft, Pending, Paid, Overdue, Cancelled }
enum DocType { DriverLicense, VehicleRegistration, Insurance, POD, CustomsClearance, Waybill, Contract, Invoice }
enum DocStatus { PendingReview, Verified, Rejected, Expired }
enum PaymentStatus { Pending, Approved, Paid, Rejected }

// -----------------------------------------
// 1. ORGANIZATION (Simplified)
// -----------------------------------------
model User {
  id           String    @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  email        String    @unique
  phone        String    @unique
  role         Role      @default(Operator)

  created_by   String?   @db.Uuid
  updated_by   String?   @db.Uuid
  deleted_by   String?   @db.Uuid
  createdAt    DateTime  @default(now()) @db.Timestamptz
  updatedAt    DateTime  @default(now()) @updatedAt @db.Timestamptz
  deletedAt    DateTime? @db.Timestamptz
  isActive     Boolean   @default(true)
  version      Int       @default(1)

  verifiedDocs Document[] @relation("VerifiedBy")
  approvedPayments Trip[] @relation("PaymentApprovedBy")
}

model Customer {
  id           String    @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  name         String
  contact_phone String
  credit_limit Float     @default(0)

  created_by   String?   @db.Uuid
  updated_by   String?   @db.Uuid
  deleted_by   String?   @db.Uuid
  createdAt    DateTime  @default(now()) @db.Timestamptz
  updatedAt    DateTime  @default(now()) @updatedAt @db.Timestamptz
  deletedAt    DateTime? @db.Timestamptz
  isActive     Boolean   @default(true)
  version      Int       @default(1)

  trips        Trip[]
  invoices     Invoice[]
}

// -----------------------------------------
// 2. FLEET MANAGEMENT (Merged Vehicle/Trailer)
// -----------------------------------------
model Driver {
  id             String    @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  ref_id         String?   @unique 
  first_name     String
  last_name      String
  phone_primary  String    @unique
  status         DriverStatus @default(Available)
  license_number String
  license_expiry DateTime  @db.Timestamptz
  ai_risk_score  Float     @default(0.0)

  created_by   String?   @db.Uuid
  updated_by   String?   @db.Uuid
  deleted_by   String?   @db.Uuid
  createdAt    DateTime  @default(now()) @db.Timestamptz
  updatedAt    DateTime  @default(now()) @updatedAt @db.Timestamptz
  deletedAt    DateTime? @db.Timestamptz
  isActive     Boolean   @default(true)
  version      Int       @default(1)

  trips        Trip[]
}

model Vehicle {
  id                  String    @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  ref_id              String?   @unique 
  plate_number        String    @unique
  asset_type          AssetType
  status              AssetStatus @default(Available)
  capacity_kg         Int
  current_odometer    Float     @default(0.0)
  gps_device_id       String?

  // Trailer Information Merged
  trailer_number      String?
  trailer_type        AssetType?
  trailer_capacity_kg Int?

  created_by   String?   @db.Uuid
  updated_by   String?   @db.Uuid
  deleted_by   String?   @db.Uuid
  createdAt    DateTime  @default(now()) @db.Timestamptz
  updatedAt    DateTime  @default(now()) @updatedAt @db.Timestamptz
  deletedAt    DateTime? @db.Timestamptz
  isActive     Boolean   @default(true)
  version      Int       @default(1)

  trips               Trip[]
  maintenanceRecords  MaintenanceRecord[]
}

// -----------------------------------------
// 3. LOGISTICS ENGINE (Trips & Payments)
// -----------------------------------------
model Trip {
  id               String    @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  ref_id           String?   @unique 
  customerId       String    @db.Uuid
  customer         Customer  @relation(fields: [customerId], references: [id])
  driverId         String?   @db.Uuid
  driver           Driver?   @relation(fields: [driverId], references: [id])
  vehicleId        String?   @db.Uuid
  vehicle          Vehicle?  @relation(fields: [vehicleId], references: [id])
  
  status           TripStatus @default(Draft)
  cargo_type       String
  hazmat_flag      Boolean   @default(false)
  planned_distance Float?
  
  planned_start    DateTime? @db.Timestamptz
  actual_start     DateTime? @db.Timestamptz
  planned_end      DateTime? @db.Timestamptz
  actual_end       DateTime? @db.Timestamptz

  // Extra Driver Payment Workflow
  extra_driver_payment Float?
  payment_reason       String?
  payment_approved_by  String?   @db.Uuid
  payment_approver     User?     @relation("PaymentApprovedBy", fields: [payment_approved_by], references: [id])
  payment_status       PaymentStatus?
  payment_date         DateTime? @db.Timestamptz

  created_by   String?   @db.Uuid
  updated_by   String?   @db.Uuid
  deleted_by   String?   @db.Uuid
  createdAt    DateTime  @default(now()) @db.Timestamptz
  updatedAt    DateTime  @default(now()) @updatedAt @db.Timestamptz
  deletedAt    DateTime? @db.Timestamptz
  isActive     Boolean   @default(true)
  version      Int       @default(1)

  stops        TripStop[]
  invoices     Invoice[]
}

model TripStop {
  id               String    @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  tripId           String    @db.Uuid
  trip             Trip      @relation(fields: [tripId], references: [id])
  stop_sequence    Int
  stop_type        StopType
  location_lat     Float
  location_lng     Float
  planned_arrival  DateTime? @db.Timestamptz
  actual_arrival   DateTime? @db.Timestamptz

  created_by   String?   @db.Uuid
  updated_by   String?   @db.Uuid
  deleted_by   String?   @db.Uuid
  createdAt    DateTime  @default(now()) @db.Timestamptz
  updatedAt    DateTime  @default(now()) @updatedAt @db.Timestamptz
  deletedAt    DateTime? @db.Timestamptz
}

// -----------------------------------------
// 4. ENTERPRISE DMS (Document Management)
// -----------------------------------------
model Document {
  id                 String    @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  entity_type        String    // "Driver", "Vehicle", "Trip", "MaintenanceRecord"
  entity_id          String    @db.Uuid
  doc_type           DocType
  status             DocStatus @default(PendingReview)
  
  file_url           String
  mime_type          String?
  checksum           String?   

  issue_date         DateTime? @db.Timestamptz
  expiry_date        DateTime? @db.Timestamptz
  
  ocr_raw_text       String?   @db.Text
  ai_extracted_json  Json?     @db.JsonB
  is_confidential    Boolean   @default(false)

  verified_by        String?   @db.Uuid
  verifier           User?     @relation("VerifiedBy", fields: [verified_by], references: [id])

  created_by   String?   @db.Uuid
  updated_by   String?   @db.Uuid
  deleted_by   String?   @db.Uuid
  createdAt    DateTime  @default(now()) @db.Timestamptz
  updatedAt    DateTime  @default(now()) @updatedAt @db.Timestamptz
  deletedAt    DateTime? @db.Timestamptz
  isActive     Boolean   @default(true)
  version      Int       @default(1)
}

// -----------------------------------------
// 5. MAINTENANCE (External Workflow)
// -----------------------------------------
model MaintenanceRecord {
  id               String    @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  vehicleId        String    @db.Uuid
  vehicle          Vehicle   @relation(fields: [vehicleId], references: [id])
  
  workshop_name    String
  workshop_contact String?
  maintenance_type String    
  
  service_date     DateTime  @db.Timestamptz
  odometer_reading Float
  cost             Float     @default(0.0)
  
  invoice_number   String?
  invoice_url      String?   
  next_service_due DateTime? @db.Timestamptz
  remarks          String?   @db.Text

  created_by   String?   @db.Uuid
  updated_by   String?   @db.Uuid
  deleted_by   String?   @db.Uuid
  createdAt    DateTime  @default(now()) @db.Timestamptz
  updatedAt    DateTime  @default(now()) @updatedAt @db.Timestamptz
  deletedAt    DateTime? @db.Timestamptz
  isActive     Boolean   @default(true)
  version      Int       @default(1)
}

// -----------------------------------------
// 6. FINANCIALS (Simplified Tax-Free)
// -----------------------------------------
model Invoice {
  id               String    @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  ref_id           String?   @unique
  tripId           String    @db.Uuid
  trip             Trip      @relation(fields: [tripId], references: [id])
  customerId       String    @db.Uuid
  customer         Customer  @relation(fields: [customerId], references: [id])
  status           InvoiceStatus @default(Draft)
  
  currency         String    @default("SAR")
  subtotal         Float
  total_amount     Float     
  
  due_date         DateTime  @db.Timestamptz

  created_by   String?   @db.Uuid
  updated_by   String?   @db.Uuid
  deleted_by   String?   @db.Uuid
  createdAt    DateTime  @default(now()) @db.Timestamptz
  updatedAt    DateTime  @default(now()) @updatedAt @db.Timestamptz
  deletedAt    DateTime? @db.Timestamptz
  isActive     Boolean   @default(true)
  version      Int       @default(1)
}

```
