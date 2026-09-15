# 🚚 MERCON Create Trip — System Architecture & Component Specification

This document is the **authoritative architecture specification** for the Create Trip feature (`/trips/new`) in MERCON. It defines component boundaries, data flow contracts, taxonomy normalization rules, and design guidelines to ensure system stability and prevent regressions.

---

## 🏗️ 1. Architecture Overview

Create Trip is the operational gateway of MERCON. It enforces the commercial logistics relationship:
```
Customer Account ──► Commercial Quotation Rate Line ──► Operational Trip Manifest ──► Dispatch Assignment
```

### Key Architectural Requirements
1. **Desktop-First & High-Density**: Designed for fast operational dispatching with minimal scrolling and progressive disclosure.
2. **Single Unified Workspace**: Operates inside a unified workspace (`TripStep1UnifiedWorkspace`), eliminating multi-step modal friction.
3. **Data Integrity & Exact Taxonomy**: All vehicle classes, line types, and billing types are governed strictly by `taxonomyRegistry.ts`. Fuzzy substring checks (`.includes('4')`) are strictly prohibited.

---

## 📂 2. Directory & Component Map

All Create Trip components reside under `frontend/web-dashboard/src/`:

```
src/
├── pages/trips/
│   └── CreateTripPage.tsx            # Main page route container (/trips/new)
├── hooks/
│   ├── useCreateTripForm.ts          # Core single-trip form orchestrator
│   └── useTripRateLookup.ts          # Dynamic commercial quotation lookup hook
├── utils/
│   └── taxonomyRegistry.ts           # Central strict taxonomy normalization engine
└── components/trips/wizard/
    ├── TripStep1UnifiedWorkspace.tsx # Top-level layout container
    ├── CustomerCardCarousel.tsx      # Standalone customer account swiper & card grid
    ├── CommercialSection.tsx         # Commercial rate card selection & search workspace
    ├── QuotationRateCard.tsx         # Reusable individual quotation rate card
    ├── QuotationCardCarousel.tsx     # Responsive grid/swiper container for quotation cards
    ├── DefineQuotationInlineForm.tsx # Inline form for creating missing quotation rate lines
    ├── ExecutionAssignmentSection.tsx# Driver, vehicle, and 3PL assignment section
    ├── RouteWorkspace.tsx            # Multi-stop route & location picker
    └── TripReviewConfirmModal.tsx    # Pre-submission confirmation dialog
```

---

## ⚡ 3. Component Specifications & Responsibilities

### 3.1 `CreateTripPage.tsx`
* **Route**: `/trips/new`
* **Responsibility**: Page lifecycle, layout context metadata, shortcut listener focus management, rendering `TripWizardHeader` and `TripStep1UnifiedWorkspace`.

### 3.2 `useCreateTripForm.ts`
* **Responsibility**: Form state management, customer selection, route stops state, vehicle/driver assignment, draft persistence (`localStorage`), and payload submission via `tripService.create()`.

### 3.3 `CommercialSection.tsx`
* **Responsibility**: 
  * Displays customer selector combobox and `<CustomerCardCarousel />` when no customer is selected.
  * Displays billing mode switcher (`Monthly Contract` vs `Extra / Spot Trip`) and `<QuotationCardCarousel />` when a customer account is active.
  * Toggles `<DefineQuotationInlineForm />` when an operator defines an ad-hoc quotation on the fly.

### 3.4 `<CustomerCardCarousel />`
* **Responsibility**: Renders customer account cards with initial logos, company names, and click-to-select handlers. Handles grid layout (`<= 3` items) or horizontal scroll swiper (`> 3` items).

### 3.5 `<QuotationRateCard />` & `<QuotationCardCarousel />`
* **Responsibility**: Renders quotation rate cards with quotation reference code (`QUO-1`), price badge (`SAR 12,900 /mo`), route lane (`Origin → Destination`), line type, vehicle class, and `Apply →` action.

---

## 🔒 4. Taxonomy & Normalization Engine (`taxonomyRegistry.ts`)

All string taxonomy fields must be normalized using strict word-boundary token matching before being processed by hooks or sent to the backend.

```typescript
import {
  normalizeVehicleClass,
  normalizeRateCategory,
  normalizeBillingType,
} from '@/utils/taxonomyRegistry';
```

### Evaluation Precedence Rules:
1. **`normalizeVehicleClass`**: Evaluates `40 FEET` / `CONTAINER` **first** before tonnage regex to prevent `"40 FEET"` from matching `"3-4 TON"`.
   * Canonical outputs: `'3-4 TON' | '5 TON' | '8 TON' | '10 TON' | '20 TON' | '40 FEET'`
2. **`normalizeRateCategory`**: Normalizes line types.
   * Canonical outputs: `'Single Trip' | 'Round Trip' | '10 Hours Duty' | '12 Hours Duty'`
3. **`normalizeBillingType`**: Enforces strict billing type equality.
   * Canonical outputs: `'Monthly' | 'Extra'`

---

## 🌐 5. Backend Integration & Contract

### Endpoint: `POST /api/trips`
* **Controller**: `createTrip` in `backend/api-server/src/controllers/tripController.ts`
* **Zod Schema**: `createTripBody` in `backend/api-server/src/schemas/index.ts`

### Status Business Invariants
* **Scheduled**: Default initial status for future trips with valid schedule.
* **Delayed**: Automatically assigned if `planned_start` timestamp is earlier than current server timestamp (`now`).
* **Dispatched**: Assigned when driver + vehicle are explicitly dispatched via `POST /api/trips/:id/dispatch`.

---

## 🛡️ 6. Engineering & Refactoring Guidelines for Developers

> [!CAUTION]
> **Developer Guardrails**:
> 1. **No Duplicated Card JSX**: Always use `<QuotationRateCard />` inside `<QuotationCardCarousel />`. Never write inline card mapping loops inside `CommercialSection.tsx`.
> 2. **No Fuzzy `.includes()` Normalization**: Always import normalizers from `taxonomyRegistry.ts`. Never write `.includes('3')` or `.includes('10')` substring checks inside hooks.
> 3. **Preserve Reusability**: Component props must remain decoupled from global window objects.
