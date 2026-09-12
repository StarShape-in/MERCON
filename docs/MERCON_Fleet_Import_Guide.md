# 🏢 MERCON Logistics — Drivers & Vehicles Bulk Excel Import Guide

This document provides a comprehensive guide for importing **Drivers** and **Vehicles (with Trailers)** into the MERCON Web Application. It contains instructions for company owners, fleet managers, and developers.

---

## 📂 Downloadable Templates Created

The following ready-to-use Excel (`.xlsx`) and CSV (`.csv`) files have been generated and stored in `docs/templates/` and `frontend/public/templates/`:

| File Name | Description | File Format |
|---|---|---|
| 📄 `MERCON_Master_Fleet_Import_Template.xlsx` | **All-in-One Workbook** containing Instructions, Drivers sheet, Vehicles sheet, and Reference values | `.xlsx` |
| 👨‍✈️ `MERCON_Drivers_Import_Template.xlsx` | **Drivers Only Template** pre-formatted with dropdowns and sample data | `.xlsx` |
| 🚛 `MERCON_Vehicles_Import_Template.xlsx` | **Vehicles & Trailers Template** pre-formatted with dropdowns and sample data | `.xlsx` |
| 📑 `MERCON_Drivers_Import_Template.csv` | Standard CSV import format for Drivers | `.csv` |
| 📑 `MERCON_Vehicles_Import_Template.csv` | Standard CSV import format for Vehicles | `.csv` |

---

## 👨‍✈️ 1. Drivers Data Template Structure

### Columns & Field Specifications

| Column Name | Required? | Field Type | Validation / Allowed Values | Description & Example |
|---|---|---|---|---|
| **Driver Ref / ID** | Optional | Text | Unique ID string | Internal identifier or legacy ID (e.g. `DRV-101`). Auto-generated if left empty. |
| **First Name \*** | **Required** | Text | String | Driver's legal first name (e.g. `Ahmed`). |
| **Last Name \*** | **Required** | Text | String | Driver's legal last name / family name (e.g. `Al-Mansoor`). |
| **Primary Phone \*** | **Required** | Text | Unique Phone String | Primary contact phone number (e.g. `+966 50 123 4567`). Must be unique in system. |
| **License Number \*** | **Required** | Text | String | Official driver's license number (e.g. `DL-98765432`). |
| **License Expiry Date \*** | **Required** | Date | `YYYY-MM-DD` | Expiry date of driving license (e.g. `2028-12-31`). |
| **Assigned Vehicle Plate** | Optional | Text | Registration Plate | License plate number of assigned vehicle (e.g. `8492-RKA`). |

*(Note: Imported drivers default automatically to `Available` status in MERCON).*

---

## 🚛 2. Vehicles & Trailers Data Template Structure

### Columns & Field Specifications

| Column Name | Required? | Field Type | Validation / Allowed Values | Description & Example |
|---|---|---|---|---|
| **Vehicle Ref / ID** | Optional | Text | Unique ID string | Internal vehicle code (e.g. `TRK-101`). Auto-generated if left empty. |
| **Plate Number \*** | **Required** | Text | Unique License Plate | Official vehicle registration plate (e.g. `8492-RKA` or `ABC-1234`). |
| **Asset Type \*** | **Required** | Dropdown | `Flatbed`, `Reefer`, `Box`, `Tanker` | Primary vehicle body/asset type. |
| **Capacity (KG) \*** | **Required** | Numeric | Positive Integer | Maximum weight payload capacity in Kilograms (e.g. `25000`). |
| **Current Odometer (KM)** | Optional | Numeric | Decimal / Float | Current odometer reading in KM (e.g. `45000.0`). |
| **ICCES Device ID** | Optional | Text | ICCES Device ID String | Unique ICCES GPS Device ID assigned to this truck (e.g. `06670881` or `351777090213198`). |
| **Assigned Driver Phone / Name** | Optional | Text | Phone or Name String | Phone number or name of assigned driver (e.g. `+966 50 123 4567` or `Ahmed Al-Mansoor`). |
| **Trailer Number** | Optional | Text | String | Linked trailer identifier (e.g. `TRL-402`). |
| **Trailer Capacity (KG)** | Optional | Numeric | Positive Integer | Linked trailer payload capacity in KG (e.g. `30000`). |

*(Note: Imported vehicles default automatically to `Available` status in MERCON).*

---

## ⚙️ 3. Developer & Backend API Import Schema Mapping

When processing the Excel file via backend parser (Node.g. `xlsx` or `exceljs`), map columns to Prisma database models as follows:

### Driver Model Mapping
```json
{
  "ref_id": "Driver Ref / ID or auto-generated",
  "first_name": "First Name *",
  "last_name": "Last Name *",
  "phone_primary": "Primary Phone *",
  "license_number": "License Number *",
  "license_expiry": "License Expiry Date * (ISO-8601 DateTime)",
  "status": "Status (Enum: Available | OnTrip | OffDuty | Inactive)"
}
```

### Vehicle Model Mapping
```json
{
  "ref_id": "Vehicle Ref / ID or auto-generated",
  "plate_number": "Plate Number *",
  "asset_type": "Asset Type * (Enum: Flatbed | Reefer | Box | Tanker)",
  "capacity_kg": "Capacity (KG) * (Integer)",
  "status": "Status (Enum: Available | OnTrip | Maintenance | Inactive)",
  "current_odometer": "Current Odometer (KM) (Float)",
  "icces_device_id": "ICCES Device ID",
  "trailer_number": "Trailer Number",
  "trailer_type": "Trailer Type (Enum: Flatbed | Reefer | Box | Tanker)",
  "trailer_capacity_kg": "Trailer Capacity (KG) (Integer)"
}
```

---

## 💡 Instructions to Give to the Client Company Owner

1. **Download the File**: Share the Driver & Vehicle templates (also downloadable in-app from the Drivers and Vehicles pages).
2. **Review Sample Data**: The rows below the header contain sample entries to illustrate expected formatting. These can be edited or overwritten.
3. **Use Dropdowns**: For fields like *Asset Type* and *Status*, select values directly from the dropdown arrow in Excel.
4. **Mandatory Fields**: Ensure all columns marked with an asterisk (`*`) are completed.
5. **Return File**: Return the completed `.xlsx` file, or upload it directly.

---

## ⬆️ 4. Importing (in the dashboard)

**Drivers** → `/drivers` → **Import Excel**. **Vehicles** → `/vehicles` → **Import Excel**.

The workbook is parsed **in the browser** and previewed — row count, any required
columns that couldn't be found, and any headers that will be ignored — before a
single record is written. Rows are then posted as JSON to
`POST /drivers/import` / `POST /vehicles/import`, the same contract
`/trips/bulk-import` uses.

### Matching and re-imports
| | Matched on | Effect of re-importing |
|---|---|---|
| Drivers | `Primary Phone` | Existing driver is **updated**, never duplicated |
| Vehicles | `Plate Number` | Existing vehicle is **updated**, never duplicated |

Fix a mistake in the sheet and upload the same file again — that is the intended
workflow. **Status is never written by an import**, so a re-upload cannot flip a
driver or truck that is currently out on a job back to Available.

### Assignments run in a second pass
The drivers sheet points at vehicles by plate, and the vehicles sheet points at
drivers by phone/name — so whichever file you import first, half its references
point at records that don't exist yet. Each import therefore creates the records
first, then resolves the links. A reference that still can't be found is reported
as a **warning on that row**, not a failure: the driver or truck is imported, only
the assignment is skipped. Import the other file, re-upload this one, and the
links resolve.

Driver phone matching ignores formatting (`+966 50 123 4567`, `+966501234567` and
`0501234567` all match) and ignores a trailing parenthetical such as
`+966 50 123 4567 (Ahmed)`.

### Column headers
Headers are matched loosely — case, `*`, and bracketed units like `(KG)` are
ignored, and several spellings are accepted per field. The header row is located
by content rather than by position, so the banner rows above the table don't
matter. A column the importer doesn't recognise is listed in the preview as
*"will be ignored"* rather than silently dropped.

> **Note:** `Trailer Type` appears in the API mapping above but has no column in
> the current vehicles template. It is optional, so its absence doesn't block an
> import.
