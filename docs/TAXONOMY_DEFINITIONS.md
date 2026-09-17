# MERCON Commercial & Operational Taxonomy Definitions

This document defines the canonical taxonomy fields used throughout MERCON across the database schema, backend API services, TypeScript DTOs, and frontend UI components (Quotations, Trips, Excel Importer, and Master Data Governance).

---

## 1. Field Mapping Reference Table

| Canonical Field Name | Database Column (`Quotation` / `Trip`) | UI Label | Primary Values / Options | Meaning & Operational Scope |
| :--- | :--- | :--- | :--- | :--- |
| **`operation_type`** | `Quotation.operation_type`<br>`Trip.operation_type`<br>`TripFinancials.quotation_operation_type` | **Operation Type / Billing Type** | `Monthly`<br>`Extra` | Defines the commercial billing commitment structure. `Monthly` represents dedicated contract fleet rates; `Extra` represents spot trips or on-demand extra duty. |
| **`pricing_basis`** | `Quotation.pricing_basis`<br>`TripFinancials.pricing_basis` | **Pricing Basis** | `FLAT`<br>`PER_TON`<br>`PER_KM`<br>`PER_HOUR`<br>`PER_DAY` | Defines how the monetary billing rate (`rate`) is calculated per unit of measure. |
| **`vehicle_class`** | `Quotation.vehicle_class`<br>`Trip.vehicle_class`<br>`TripFinancials.vehicle_class` | **Vehicle Class** | `3-4 TON`<br>`5 TON`<br>`8 TON`<br>`10 TON`<br>`20 TON`<br>`40 FEET` | Defines the standard vehicle payload capacity or equipment specification required for the route. |
| **`line_type`** | `Quotation.line_type`<br>`Trip.line_type`<br>`TripFinancials.line_type` | **Line Type / Duty Category** | `Single Trip`<br>`Round Trip`<br>`10 Hours Duty`<br>`12 Hours Duty` | Defines the movement shape or shift duration structure for the line item. |

---

## 2. Detailed Field Definitions & Rules

### 2.1 `operation_type` (Billing Type)
- **Definition**: The commercial contract agreement model between MERCON and the customer.
- **Database Column**: `operation_type` (String, nullable).
- **Backend/API Alignment**: Handled as `operation_type` in Prisma queries and returned alongside `billing_type` alias for backward compatibility.
- **Accepted Values**:
  - `Monthly` (Canonical Code: `MONTHLY`) — Dedicated monthly agreement rate card.
  - `Extra` (Canonical Code: `EXTRA`) — Spot trip, ad-hoc, or extra duty rate card.
- **UI Form Controls**: Presented as tab or select control titled **Billing / Operation Type**.

### 2.2 `pricing_basis` (Pricing Unit)
- **Definition**: The mathematical unit basis used to compute trip billing amounts.
- **Database Column**: `pricing_basis` (String, nullable).
- **Accepted Values**:
  - `FLAT` / `PER_TRIP` — Fixed amount per completed trip/route line.
  - `PER_TON` — Amount calculated per metric ton of cargo loaded.
  - `PER_KM` — Amount calculated per kilometer traveled.
  - `PER_HOUR` — Amount calculated per hour of duty.
  - `PER_DAY` — Amount calculated per day of vehicle deployment.
- **UI Form Controls**: Presented as a select control titled **Pricing Basis**.

### 2.3 `vehicle_class` (Vehicle Capacity)
- **Definition**: Tonnage rating or physical vehicle size required for execution.
- **Database Column**: `vehicle_class` (String, nullable).
- **Accepted Values**:
  - Standard options: `3-4 TON`, `5 TON`, `8 TON`, `10 TON`, `20 TON`, `40 FEET`.
  - Free-text custom escape hatch supported for non-standard customer equipment specifications.
- **UI Form Controls**: Presented via `TaxonomySelect` or combobox titled **Vehicle Class**.

### 2.4 `line_type` (Service Duty Category)
- **Definition**: Operational duty classification (formerly called `rate_category`).
- **Database Column**: `line_type` (String, nullable).
- **Accepted Values**:
  - `Single Trip` (`SINGLE_TRIP`) — One-way point-to-point trip.
  - `Round Trip` (`ROUND_TRIP`) — Two-way return trip.
  - `10 Hours Duty` (`10_HRS`) — Dedicated 10-hour shift allocation.
  - `12 Hours Duty` (`12_HRS`) — Dedicated 12-hour shift allocation.
- **UI Form Controls**: Presented via `TaxonomySelect` titled **Line Type**.

---

## 3. Implementation Rules Across Pages

1. **Quotation Ledger & Detail Pages**:
   - `QuotationListPage.tsx`, `QuotationRouteDrawer.tsx`, `CustomerQuotationsTab.tsx`.
   - Displays `operation_type` for billing type badges (`Monthly` vs `Extra`).
   - Displays `pricing_basis` for unit badges (`FLAT`, `PER_TON`, `PER_KM`).
   - Displays `vehicle_class` for vehicle capacity badges (`10 TON`, `20 TON`).
   - Displays `line_type` for duty badges (`Single Trip`, `Round Trip`).

2. **Quotation Create & Edit Forms**:
   - `AddQuotationPage.tsx`, `EditQuotationPage.tsx`, `RateCardFormDialog.tsx`.
   - Saves payload with explicit `operation_type`, `pricing_basis`, `vehicle_class`, and `line_type` properties.

3. **Trip Creation & Commercial Accelerator**:
   - `CommercialSection.tsx`, `QuotationRateCard.tsx`, `useTripRateLookup.ts`.
   - Matches rate cards against `rc.operation_type || rc.billing_type` using `normalizeBillingType()`.
