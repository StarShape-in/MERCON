import { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { authStore } from '@/store/authStore';
import FullPageSpinner from '@/components/ui/FullPageSpinner';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import RequireRole from '@/components/auth/RequireRole';
import RequireSuperAdmin from '@/components/auth/RequireSuperAdmin';
import RequireModule from '@/components/auth/RequireModule';
import AppShell from '@/components/layout/AppShell';
import { useApplyBranding } from '@/hooks/useBranding';
import { lazyWithRetry } from '@/utils/lazyWithRetry';

/* ─── Auth pages (eager — small, always needed) ──────────────────────────── */
import LoginPage         from '@/pages/auth/LoginPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';

/* ─── Protected pages (lazy with automatic chunk retry) ──────────────────── */
const DashboardPage           = lazyWithRetry(() => import('@/pages/dashboard/DashboardPage'));
const NotificationsPage       = lazyWithRetry(() => import('@/pages/notifications/NotificationsPage'));

// Trips
const TripListPage            = lazyWithRetry(() => import('@/pages/trips/TripListPage'));
const MonthlyTripsPage        = lazyWithRetry(() => import('@/pages/trips/MonthlyTripsPage'));
const CreateMonthlyTripPage   = lazyWithRetry(() => import('@/pages/trips/CreateMonthlyTripPage'));
const TripDetailsPage         = lazyWithRetry(() => import('@/pages/trips/TripDetailsPage'));
const CreateTripPage          = lazyWithRetry(() => import('@/pages/trips/CreateTripPage'));
const EditTripPage            = lazyWithRetry(() => import('@/pages/trips/EditTripPage'));
const TripTrackingPage        = lazyWithRetry(() => import('@/pages/trips/TripTrackingPage'));
const TripCompletionPage      = lazyWithRetry(() => import('@/pages/trips/TripCompletionPage'));
const ThirdPartyListPage      = lazyWithRetry(() => import('@/pages/third-party/ThirdPartyListPage'));
const ThirdPartyDetailsPage   = lazyWithRetry(() => import('@/pages/third-party/ThirdPartyDetailsPage'));

// Drivers
const DriverListPage          = lazyWithRetry(() => import('@/pages/drivers/DriverListPage'));
const DriverDetailsPage       = lazyWithRetry(() => import('@/pages/drivers/DriverDetailsPage'));
const AddDriverPage           = lazyWithRetry(() => import('@/pages/drivers/AddDriverPage'));
const EditDriverPage          = lazyWithRetry(() => import('@/pages/drivers/EditDriverPage'));
const DriverDocumentsPage     = lazyWithRetry(() => import('@/pages/drivers/DriverDocumentsPage'));

// Vehicles
const VehicleListPage         = lazyWithRetry(() => import('@/pages/vehicles/VehicleListPage'));
const VehicleDetailsPage      = lazyWithRetry(() => import('@/pages/vehicles/VehicleDetailsPage'));
const AddVehiclePage          = lazyWithRetry(() => import('@/pages/vehicles/AddVehiclePage'));
const EditVehiclePage         = lazyWithRetry(() => import('@/pages/vehicles/EditVehiclePage'));
const VehicleDocumentsPage    = lazyWithRetry(() => import('@/pages/vehicles/VehicleDocumentsPage'));
const VehicleFinancialsPage   = lazyWithRetry(() => import('@/pages/vehicles/VehicleFinancialsPage'));
const VehicleSingleFinancialsPage = lazyWithRetry(() => import('@/pages/vehicles/VehicleSingleFinancialsPage'));
const MaintenanceListPage     = lazyWithRetry(() => import('@/pages/maintenance/MaintenanceListPage'));
const MaintenanceDetailsPage  = lazyWithRetry(() => import('@/pages/maintenance/MaintenanceDetailsPage'));
const AddMaintenancePage      = lazyWithRetry(() => import('@/pages/maintenance/AddMaintenancePage'));

// Customers
const CustomerListPage        = lazyWithRetry(() => import('@/pages/customers/CustomerListPage'));
const CustomerDetailsPage     = lazyWithRetry(() => import('@/pages/customers/CustomerDetailsPage'));
const AddCustomerPage         = lazyWithRetry(() => import('@/pages/customers/AddCustomerPage'));
const EditCustomerPage        = lazyWithRetry(() => import('@/pages/customers/EditCustomerPage'));
const CustomerContractsPage   = lazyWithRetry(() => import('@/pages/customers/CustomerContractsPage'));

const LocationListPage        = lazyWithRetry(() => import('@/pages/locations/LocationListPage'));
const AddLocationPage         = lazyWithRetry(() => import('@/pages/locations/AddLocationPage'));
const RateCardListPage        = lazyWithRetry(() => import('@/pages/rate-cards/RateCardListPage'));
const AddRateCardPage         = lazyWithRetry(() => import('@/pages/rate-cards/AddRateCardPage'));
const RateCardDetailsPage     = lazyWithRetry(() => import('@/pages/rate-cards/RateCardDetailsPage'));
const EditRateCardPage        = lazyWithRetry(() => import('@/pages/rate-cards/EditRateCardPage'));
const RateCardDocsPage        = lazyWithRetry(() => import('@/pages/rate-cards/RateCardDocsPage'));

// Invoices
const InvoiceListPage         = lazyWithRetry(() => import('@/pages/invoices/InvoiceListPage'));
const InvoiceDetailsPage      = lazyWithRetry(() => import('@/pages/invoices/InvoiceDetailsPage'));
const InvoicePrintTemplate    = lazyWithRetry(() => import('@/pages/invoices/InvoicePrintTemplate'));
const PaymentStatusPage       = lazyWithRetry(() => import('@/pages/invoices/PaymentStatusPage'));

// Expenses
const ExpenseListPage         = lazyWithRetry(() => import('@/pages/expenses/ExpenseListPage'));
const ExpenseDetailsPage      = lazyWithRetry(() => import('@/pages/expenses/ExpenseDetailsPage'));

// Documents
const DocumentsCenterPage     = lazyWithRetry(() => import('@/pages/documents/DocumentsCenterPage'));
const OwnerFolderPage         = lazyWithRetry(() => import('@/pages/documents/OwnerFolderPage'));
const DocumentDetailPage      = lazyWithRetry(() => import('@/pages/documents/DocumentDetailPage'));
const AprodacDocumentsPage    = lazyWithRetry(() => import('@/pages/documents/AprodacDocumentsPage'));

// Reports
const ReportsDashboardPage        = lazyWithRetry(() => import('@/pages/reports/ReportsDashboardPage'));
const FleetPerformancePage        = lazyWithRetry(() => import('@/pages/reports/FleetPerformancePage'));
const RevenueReportsPage          = lazyWithRetry(() => import('@/pages/reports/RevenueReportsPage'));
const CustomReportPage            = lazyWithRetry(() => import('@/pages/reports/CustomReportPage'));
const CompanyReportsGeneratorPage = lazyWithRetry(() => import('@/pages/reports/CompanyReportsGeneratorPage'));
const DelayReportPage             = lazyWithRetry(() => import('@/pages/reports/DelayReportPage'));

// Smart Report Builder
const ReportBuilderLandingPage   = lazyWithRetry(() => import('@/pages/report-builder/ReportBuilderLandingPage'));
const QuickReportPage            = lazyWithRetry(() => import('@/pages/report-builder/QuickReportPage'));
const AdvancedBuilderPage        = lazyWithRetry(() => import('@/pages/report-builder/AdvancedBuilderPage'));

// Settings & Governance
const OperatorProfilePage     = lazyWithRetry(() => import('@/pages/settings/OperatorProfilePage'));
const SettingsPage            = lazyWithRetry(() => import('@/pages/settings/SettingsPage'));
const UserManagementPage      = lazyWithRetry(() => import('@/pages/settings/UserManagementPage'));
const DocumentTypeAdminPage   = lazyWithRetry(() => import('@/pages/settings/DocumentTypeAdminPage'));
const RecycleBinPage          = lazyWithRetry(() => import('@/pages/recycle-bin/RecycleBinPage'));

/* ─── Protected Route wrapper ────────────────────────────────────────────── */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!authStore.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

/* ─── App Router ─────────────────────────────────────────────────────────── */
export default function AppRouter() {
  useApplyBranding();

  // useTransitions={false} — React Router wraps its internal location state
  // update in React.startTransition by default. Under React 19 that update
  // could get stuck: the transition lanes were left pending and expired with
  // finishedWork already built but never committed, so window.location moved on
  // while the router's own location stayed behind and <Outlet> kept rendering
  // the previous page until a full reload. Plain (non-transition) state updates
  // commit normally, so the router opts out of transitions.
  return (
    <BrowserRouter useTransitions={false}>
      <ErrorBoundary>
        <Routes>
          {/* ── Auth (public) — full-page spinner while chunk loads ─── */}
          <Route
            path="/login"
            element={
              <Suspense fallback={<FullPageSpinner />}>
                <LoginPage />
              </Suspense>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <Suspense fallback={<FullPageSpinner />}>
                <ForgotPasswordPage />
              </Suspense>
            }
          />

          {/* ── Protected layout route ────────────────────────────────
              AppShell renders the sidebar + header ONCE and keeps them
              mounted. <Outlet> renders the active child page. Each page
              still calls DashboardLayout to push its title/active to
              context; DashboardLayout detects the shell and renders only
              its children rather than a duplicate sidebar/header.       */}
          <Route
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route path="/"            element={<DashboardPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />

            {/* Trips */}
            <Route path="/trips"                    element={<TripListPage />} />
            <Route path="/trips/kanban"             element={<Navigate to="/trips?view=kanban" replace />} />
            <Route path="/trips/new"                element={<CreateTripPage />} />
            {/* Literal path before /trips/:id, which would otherwise match it. */}
            <Route path="/trips/monthly"            element={<MonthlyTripsPage />} />
            <Route path="/trips/monthly/new"        element={<CreateMonthlyTripPage />} />
            <Route path="/trips/:id"                element={<TripDetailsPage />} />
            <Route path="/trips/:id/edit"           element={<EditTripPage />} />
            <Route path="/trips/:id/track"          element={<TripTrackingPage />} />
            <Route path="/trips/:id/completion"     element={<TripCompletionPage />} />

            {/* Third Party */}
            <Route path="/third-party"              element={<ThirdPartyListPage />} />
            <Route path="/third-party/:id"          element={<ThirdPartyDetailsPage />} />
            <Route path="/drivers"                  element={<DriverListPage />} />
            <Route path="/drivers/new"              element={<AddDriverPage />} />
            <Route path="/drivers/:id"              element={<DriverDetailsPage />} />
            <Route path="/drivers/:id/edit"         element={<EditDriverPage />} />
            <Route path="/drivers/:id/documents"    element={<DriverDocumentsPage />} />

            {/* Vehicles */}
            <Route path="/vehicles"                 element={<VehicleListPage />} />
            <Route path="/vehicles/financials"      element={<VehicleFinancialsPage />} />
            <Route path="/vehicles/new"             element={<AddVehiclePage />} />
            <Route path="/vehicles/:id"             element={<VehicleDetailsPage />} />
            <Route path="/vehicles/:id/edit"        element={<EditVehiclePage />} />
            <Route path="/vehicles/:id/documents"   element={<VehicleDocumentsPage />} />
            <Route path="/vehicles/:id/financials"  element={<VehicleSingleFinancialsPage />} />
            <Route path="/maintenance"              element={<RequireModule moduleKey="maintenance"><MaintenanceListPage /></RequireModule>} />
            <Route path="/maintenance/new"          element={<AddMaintenancePage />} />
            <Route path="/maintenance/:id"          element={<MaintenanceDetailsPage />} />

            {/* Customers */}
            <Route path="/customers"                element={<CustomerListPage />} />
            <Route path="/customers/new"            element={<AddCustomerPage />} />
            <Route path="/customers/:id"            element={<CustomerDetailsPage />} />
            <Route path="/customers/:id/edit"       element={<EditCustomerPage />} />
            <Route path="/customers/:id/contracts"  element={<CustomerContractsPage />} />

            {/* Locations */}
            <Route path="/locations"                element={<LocationListPage />} />
            <Route path="/locations/new"            element={<AddLocationPage />} />

            {/* Rate Cards */}
            <Route path="/rate-cards"               element={<RateCardListPage />} />
            <Route path="/rate-cards/new"           element={<AddRateCardPage />} />
            <Route path="/rate-cards/:id"           element={<RateCardDetailsPage />} />
            <Route path="/rate-cards/:id/edit"      element={<EditRateCardPage />} />
            <Route path="/rate-cards/:id/documents" element={<RateCardDocsPage />} />

            {/* Invoices */}
            <Route path="/invoices"                 element={<RequireModule moduleKey="invoices"><InvoiceListPage /></RequireModule>} />
            <Route path="/invoices/new"             element={<Navigate to="/invoices?action=mark" replace />} />
            <Route path="/invoices/:id"             element={<InvoiceDetailsPage />} />
            <Route path="/invoices/:id/print"       element={<InvoicePrintTemplate />} />
            <Route path="/invoices/:id/payment"     element={<PaymentStatusPage />} />

            {/* Expenses */}
            <Route path="/expenses"                 element={<RequireModule moduleKey="expenses"><ExpenseListPage /></RequireModule>} />
            <Route path="/expenses/:id"             element={<RequireModule moduleKey="expenses"><ExpenseDetailsPage /></RequireModule>} />

            {/* Documents */}
            <Route path="/documents"                element={<RequireModule moduleKey="documents"><DocumentsCenterPage /></RequireModule>} />
            <Route path="/documents/expiry"         element={<Navigate to="/documents" replace />} />
            <Route path="/documents/doc/:docId"     element={<RequireModule moduleKey="documents"><DocumentDetailPage /></RequireModule>} />
            <Route path="/docs/:docId"              element={<RequireModule moduleKey="documents"><DocumentDetailPage /></RequireModule>} />
            <Route path="/documents/details/:docId" element={<RequireModule moduleKey="documents"><DocumentDetailPage /></RequireModule>} />
            <Route path="/documents/:ownerType/:ownerId" element={<RequireModule moduleKey="documents"><OwnerFolderPage /></RequireModule>} />
            <Route path="/aprodac-documents"        element={<AprodacDocumentsPage />} />
            <Route path="/aprodac"                  element={<Navigate to="/aprodac-documents" replace />} />

            {/* Custom Report Builder */}
            <Route path="/custom-report"            element={<CustomReportPage />} />
            <Route path="/reports/custom"          element={<CustomReportPage />} />

            {/* Reports (Legacy -> Redirect to Company Reports) */}
            <Route path="/reports/*"                element={<Navigate to="/company-reports" replace />} />
            <Route path="/reports"                  element={<Navigate to="/company-reports" replace />} />

            {/* Custom Company Reports Generator */}
            <Route path="/company-reports"          element={<RequireModule moduleKey="company-reports"><CompanyReportsGeneratorPage /></RequireModule>} />

            {/* Smart Report Builder */}
            <Route path="/report-builder"          element={<ReportBuilderLandingPage />} />
            <Route path="/report-builder/quick"    element={<QuickReportPage />} />
            <Route path="/report-builder/advanced" element={<AdvancedBuilderPage />} />

            {/* Settings & Governance */}
            <Route path="/settings"                 element={<SettingsPage />} />
            <Route path="/settings/profile"         element={<Navigate to="/settings" replace />} />
            <Route path="/settings/users"           element={<RequireRole roles={['Admin']}><UserManagementPage /></RequireRole>} />
            <Route path="/settings/document-types"  element={<RequireRole roles={['Admin']}><DocumentTypeAdminPage /></RequireRole>} />
            <Route path="/recycle-bin"              element={<RequireModule moduleKey="recycle-bin"><RecycleBinPage /></RequireModule>} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
