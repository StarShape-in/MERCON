# MERCON — External App Screenshot AI Handoff

## 1. Purpose

The **External App Screenshot AI** feature enables MERCON to process operational milestone screenshots from drivers who use third-party or customer-provided logistics applications instead of the native MERCON Driver App.

This document serves as the complete technical handoff for developers continuing the feature rollout on the `dev` branch.

---

## 2. Business Workflow

In logistics operations, certain subcontracted carriers, third-party fleets, or customer-mandated workflows require drivers to use external driver applications (e.g. customer TMS, DHL, iMile, Shiptrack, etc.).

Rather than requiring custom API integrations for every external logistics app, drivers or dispatchers capture screenshots of operational milestones within their external apps and upload them to MERCON.

MERCON uses Gemini Vision AI to read the screenshot, extracts the operational milestone, validates the evidence deterministically against MERCON's trip lifecycle state machine, and automatically updates trip status and stop timestamps.

---

## 3. Native vs External Workflow

### Native Workflow (MERCON Driver App)
```text
Company
   │
   ▼
MERCON Driver App
   │
   ▼
Driver completes workflow actions (Arrive, Load, Depart, Deliver)
   │
   ▼
Structured MERCON Mobile APIs
   │
   ▼
Trip status & stop timestamps updated directly
```

### External Workflow (External App Screenshot AI)
```text
Company's External Driver Application
   │
   ▼
Driver / Dispatcher captures screenshot
   │
   ▼
Upload screenshot to MERCON (Mobile App or Web Dashboard)
   │
   ▼
Gemini Vision AI Analysis (ocrService.ts)
   │
   ▼
Strict Zod Schema Validation (externalScreenshotSchema.ts)
   │
   ▼
Deterministic Server-Side Business & Lifecycle Validation (tripLifecycle.ts)
   │
   ▼
Document / Audit Record Created (prisma.document)
   │
   ▼
Trip Status & Stop Timestamps Updated (via Atomic DB Transaction)
```

---

## 4. Architecture

Both Mobile Driver App and Web Dashboard entry points route into **one single shared backend processing service** (`processExternalScreenshot`):

```text
Mobile Driver App
       │
       ▼
POST /api/mobile/trips/:id/external-screenshot  (Mobile Auth + Driver Assignment Lock)
       │
       ├─────────────────────────────────────────┐
                                                 │
Web Dashboard                                    ▼
       │                             processExternalScreenshot()
       ▼                                         │
POST /api/trips/:id/external-screenshot ─────────┘
(JWT Auth + Admin/Operator RBAC)                 │
                                                 ▼
                                  Image Compression (imageCompressor.ts)
                                                 │
                                                 ▼
                                    Gemini Vision AI Analysis (ocrService.ts)
                                                 │
                                                 ▼
                                     Strict Zod Schema Validation (externalScreenshotSchema.ts)
                                                 │
                                                 ▼
                                   Deterministic Business Validation (tripLifecycle.ts)
                                                 │
                                                 ▼
                                   Atomic DB Transaction & Document Row
```

---

## 5. Phase 1 — Shared Processing Engine

The core operational logic was extracted from the mobile controller into a dedicated shared backend service to ensure 100% behavioral equivalence across entry points:

### Core Files
- [`backend/api-server/src/services/externalScreenshotService.ts`](file:///c:/Users/alanr/Downloads/MERCON-main/mercon-repo/backend/api-server/src/services/externalScreenshotService.ts): The single shared service exporting `processExternalScreenshot()`.
- [`backend/api-server/src/schemas/externalScreenshotSchema.ts`](file:///c:/Users/alanr/Downloads/MERCON-main/mercon-repo/backend/api-server/src/schemas/externalScreenshotSchema.ts): Strict Zod schema validation contract (`validateExternalScreenshotExtraction`).
- [`backend/api-server/src/services/ocrService.ts`](file:///c:/Users/alanr/Downloads/MERCON-main/mercon-repo/backend/api-server/src/services/ocrService.ts): Vision AI prompt and API call logic (`analyzeExternalScreenshotWithAI`).
- [`backend/api-server/src/controllers/mobileTripController.ts`](file:///c:/Users/alanr/Downloads/MERCON-main/mercon-repo/backend/api-server/src/controllers/mobileTripController.ts): Thin mobile controller handler delegating to `processExternalScreenshot()`.
- [`backend/api-server/src/services/driverWorkflow.test.ts`](file:///c:/Users/alanr/Downloads/MERCON-main/mercon-repo/backend/api-server/src/services/driverWorkflow.test.ts): Complete unit test suite for workflow state rules and extraction validation.

### Processing Owned by Shared Service
1. Image compression (`compressUploadedImage`).
2. Gemini Vision AI analysis with trip validation context.
3. Raw AI output Zod schema validation.
4. Gemini API error detection.
5. Wrong-trip detection (`is_wrong_trip`).
6. State machine transition guards (`isValidTransition`).
7. Atomic database transaction (`stampStopTransition`, `stampWorkflowTransition`, `completeTripAndInvoice`).
8. Document creation (`entity_type: 'Trip'`, `status: Verified / PendingReview`).
9. Delay notification dispatch (`notifyOperatorsOfDelay`).

---

## 6. Phase 2 — Web API

The Web API endpoint exposes external screenshot processing to web operators:

- **Path**: `POST /api/trips/:id/external-screenshot`
- **File**: [`backend/api-server/src/controllers/tripController.ts`](file:///c:/Users/alanr/Downloads/MERCON-main/mercon-repo/backend/api-server/src/controllers/tripController.ts)
- **Routes File**: [`backend/api-server/src/routes/tripRoutes.ts`](file:///c:/Users/alanr/Downloads/MERCON-main/mercon-repo/backend/api-server/src/routes/tripRoutes.ts)

### Security & Middlewares
- **`authenticateJWT`**: Validates JWT bearer token.
- **`authorizeRoles('Admin', 'Operator')`**: Restricts access to authorized web operators (includes `SuperAdmin`).
- **`upload.single('file')`**: Handles multipart image uploads.

### Mobile vs Web Entry Point Differences

| Property | Mobile Endpoint (`POST /api/mobile/trips/:id/...`) | Web Endpoint (`POST /api/trips/:id/...`) |
| :--- | :--- | :--- |
| **Authentication** | Driver JWT token (`req.user?.driver_id`) | User JWT token (`req.user?.id`) |
| **Authorization** | `authorizeRoles('Driver')` | `authorizeRoles('Admin', 'Operator')` |
| **Driver Lock** | Enforces `trip.driverId === driverId` | Passes `driverId: null` (Operator RBAC allows processing any trip) |
| **Shared Service** | `processExternalScreenshot()` | `processExternalScreenshot()` |

---

## 7. Phase 3 — Web UI

The Web UI provides a rich, responsive interface for uploading and inspecting external app screenshots directly within the Trip Details page:

### Core Files
- [`frontend/web-dashboard/src/components/trips/ExternalScreenshotCard.tsx`](file:///c:/Users/alanr/Downloads/MERCON-main/mercon-repo/frontend/web-dashboard/src/components/trips/ExternalScreenshotCard.tsx): Integrated UI card component.
- [`frontend/web-dashboard/src/pages/trips/TripDetailsPage.tsx`](file:///c:/Users/alanr/Downloads/MERCON-main/mercon-repo/frontend/web-dashboard/src/pages/trips/TripDetailsPage.tsx): Main Trip Details page hosting the card.
- [`frontend/web-dashboard/src/services/tripService.ts`](file:///c:/Users/alanr/Downloads/MERCON-main/mercon-repo/frontend/web-dashboard/src/services/tripService.ts): Axios API client integration (`uploadExternalScreenshot`).

### Key UI Features
- **Workflow Badge**: Indicates `External App Active` when `trip.driver_workflow === 'EXTERNAL_APP'`.
- **Image Selection & Preview**: Drop zone, file picker (`PNG`, `JPG`, `WebP`, `HEIC`), live preview thumbnail, file clear button.
- **Auto-Apply Checkbox**: Toggle controlling whether valid milestones update trip status automatically (`auto_apply=true`) or stage for review (`auto_apply=false`).
- **Processing State**: Disables form inputs during upload; displays pulsing loader (*"Analyzing screenshot with Gemini Vision AI..."*) to prevent duplicate submissions.
- **Result Panels**:
  - **Applied Success**: Emerald banner displaying detected event, target status, timestamp, reference, and AI confidence percentage.
  - **Review Required**: Amber banner displaying staged `PendingReview` alert and backend validation reason.
  - **Wrong Trip / Error**: Red alert displaying reference mismatch errors.
- **React Query Integration**: Automatically invalidates `['trip', id]`, `['documents', 'Trip', id]`, and `['trips']` upon upload completion.

---

## 8. Gemini Extraction Contract

Raw Gemini Vision AI output is treated as **untrusted user input** and is parsed through strict Zod schema validation (`validateExternalScreenshotExtraction`):

```ts
export interface ExternalScreenshotExtractionResult {
  schema_valid: boolean;
  detected_event_type: ExternalScreenshotEventType | null;
  event_timestamp: string | null;
  external_reference: string | null;
  stop_location_name: string | null;
  is_wrong_trip: boolean;
  confidence: number;
  notes: string | null;
  detected_text: string | null;
  validation_error?: string | null;
}
```

If Gemini returns malformed output or confidence outside `0.0–1.0`, `schema_valid` is set to `false`, preventing malformed data from masquerading as legitimate extractions.

---

## 9. Trip Lifecycle Mapping

Operational events extracted from screenshots map to MERCON trip statuses and workflow states as follows:

| Extracted AI Event | Target Trip Status (`TripStatus`) | Target Workflow State (`driver_workflow_state`) | Side Effects |
| :--- | :--- | :--- | :--- |
| `ARRIVED_AT_PICKUP` | `Loading` | `ARRIVED_AT_PICKUP` | Pickup arrival timestamp recorded |
| `LOADING_COMPLETED` | `Loading` | `LOADING_COMPLETED` | **Pickup departure timestamp recorded; Trip remains in `Loading` state (does NOT complete trip)** |
| `DEPARTED_PICKUP` | `InTransit` | `IN_TRANSIT` | Trip actual_start recorded |
| `ARRIVED_AT_DELIVERY` | `InTransit` | `ARRIVED_AT_DELIVERY` | Delivery arrival timestamp recorded |
| `DELIVERY_COMPLETED` | `Completed` | `COMPLETED` | Dropoff arrival/departure stamped, invoice generated, driver & vehicle status set to `Available` |
| `DELAYED` | `Delayed` | `DELAYED` | Operator delay alert notification sent |

---

## 10. Security & Authorization

1. **Authentication**: All endpoints require a valid JWT token (`authenticateJWT`).
2. **Web RBAC**: Only `Admin`, `Operator`, or `SuperAdmin` roles can invoke the web endpoint.
3. **Mobile Driver Lock**: Mobile endpoint verifies `trip.driverId === req.user.driver_id`.
4. **Server-Controlled Identity**: Client payload cannot supply untrusted `driverId`, `customerId`, `vehicleId`, or `status` values.
5. **Workflow Protection**: Rejects trips that are not configured for `EXTERNAL_APP` workflow.
6. **Wrong-Trip Protection**: Screenshots containing order/waybill numbers matching a different trip are rejected (`is_wrong_trip: true`).
7. **State Machine Enforcement**: Transitions must pass `isValidTransition(currentStatus, targetStatus)`.
8. **Server-Side API Key**: `GEMINI_API_KEY` resides strictly in backend server environment settings and is never exposed to the frontend browser client.

---

## 11. Auto-Apply vs Review Mode

### Review Mode (`auto_apply=false`)
- Gemini Vision AI extraction and Zod schema validation execute normally.
- Server-side business validation runs.
- **Trip status and stop timestamps are NOT mutated**.
- Document record is saved with status `PendingReview`.
- Extracted AI JSON is retained for manual operator inspection.

### Auto-Apply Mode (`auto_apply=true`)
- All 10 deterministic server-side validation checks must pass.
- **If ALL checks pass**: Atomic database transaction updates trip status, stop timestamps, workflow state, and marks Document as `Verified`.
- **If ANY check fails**: Trip is **NOT** mutated; Document is saved as `PendingReview` (or `FAILED`) with explicit validation reason.

---

## 12. Document / Audit Behavior

Every uploaded screenshot creates a record in the `Document` table:
- `entity_type`: `'Trip'`
- `entity_id`: `trip.id`
- `doc_type`: `DocType.Emergency` (if `DELAYED`), else `DocType.POD`
- `status`: `'Verified'` (if applied), else `'PendingReview'`
- `ai_extracted_json`: Full extraction payload including `detected_event_type`, `confidence`, `validation_reason`, `is_wrong_trip`, and timestamps.

---

## 13. Tests Completed

- **Web External Screenshot API Suite** (`webTripScreenshot.test.ts`): **5 / 5 PASSED**
- **Zod Schema Extraction Suite** (`driverWorkflow.test.ts`): **17 / 17 PASSED**
- **Lifecycle Transition Guards Suite** (`driverWorkflow.test.ts`): **7 / 7 PASSED**
- **Total Unit Tests Passed**: **29 / 29 PASSED (100%)**

*(Note: 6 DB integration test cases were unable to execute during local testing solely because local PostgreSQL daemon on `localhost:5432` was offline in the test environment).*

---

## 14. Current Verification Status

**`IMPLEMENTATION COMPLETE / END-TO-END VERIFICATION PENDING`**

- **Source Code**: Phase 1, Phase 2, and Phase 3 code implementations are 100% complete and typechecked (`0` TypeScript errors).
- **End-to-End Verification**: Pending execution in an environment with an active PostgreSQL database and `GEMINI_API_KEY` environment variable.

---

## 15. Known Limitations & Future Work

- **Checksum / Image Deduplication**: Not implemented yet (planned for future phase).
- **Web Review Card Approval Mutation**: Manual "Confirm Staged Document" button on Web UI is planned for a subsequent approval workflow phase.

---

## 16. Exact Next Steps for Developer

1. **Environment Setup**:
   - Merge PR to `dev` or run Docker Compose locally with `GEMINI_API_KEY` configured.
2. **Review Mode Test**:
   - Open a trip, uncheck auto-apply (`auto_apply=false`), and upload a screenshot.
   - Verify: Document created as `PendingReview`, AI data extracted, Trip status unchanged.
3. **Auto-Apply Test**:
   - Upload a valid milestone screenshot with auto-apply enabled (`auto_apply=true`).
   - Verify: Trip status updates, stop timestamps stamped, Document status set to `Verified`.
4. **Validation Guard Test**:
   - Upload an out-of-sequence screenshot (e.g. `Delivery Completed` on a `Draft` trip).
   - Verify: Backend rejects transition, trip unchanged, diagnostic reason displayed in UI.
5. **Mobile Regression Check**:
   - Perform a mobile screenshot upload from driver app.
   - Verify: Driver assignment lock enforced, shared service handles upload correctly.

---

## 17. Important Files Summary

```text
backend/api-server/src/
  ├── services/externalScreenshotService.ts  # Single shared processing service
  ├── schemas/externalScreenshotSchema.ts    # Strict Zod extraction schema
  ├── services/ocrService.ts                 # Gemini Vision AI prompt & client
  ├── controllers/mobileTripController.ts    # Mobile driver endpoint handler
  ├── controllers/tripController.ts          # Web operator endpoint handler
  ├── routes/tripRoutes.ts                   # Web API route registration
  └── controllers/webTripScreenshot.test.ts  # Web endpoint unit tests

frontend/web-dashboard/src/
  ├── components/trips/ExternalScreenshotCard.tsx # Integrated Web UI component
  ├── pages/trips/TripDetailsPage.tsx             # Mounted Trip Details page
  └── services/tripService.ts                     # Axios API client method
```

---

## 18. Developer Handoff Notes & Current Git State

### Current Repository Git State
- **Current Branch**: `alan`
- **Modified Files**:
  - `backend/api-server/src/controllers/mobileTripController.ts`
  - `backend/api-server/src/controllers/tripController.ts`
  - `backend/api-server/src/routes/tripRoutes.ts`
  - `backend/api-server/src/services/driverWorkflow.test.ts`
  - `backend/api-server/src/services/ocrService.ts`
  - `frontend/web-dashboard/src/pages/trips/TripDetailsPage.tsx`
  - `frontend/web-dashboard/src/services/tripService.ts`
- **Untracked Files**:
  - `backend/api-server/src/controllers/webTripScreenshot.test.ts`
  - `backend/api-server/src/schemas/externalScreenshotSchema.ts`
  - `backend/api-server/src/services/externalScreenshotService.ts`
  - `frontend/web-dashboard/src/components/trips/ExternalScreenshotCard.tsx`
  - `docs/EXTERNAL_SCREENSHOT_AI_HANDOFF.md`
- **Documentation File**: `docs/EXTERNAL_SCREENSHOT_AI_HANDOFF.md` is the **only** new documentation file added.
