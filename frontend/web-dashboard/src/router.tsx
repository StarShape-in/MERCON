import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { authStore } from '@/store/authStore';
import FullPageSpinner from '@/components/ui/FullPageSpinner';
import RequireRole from '@/components/auth/RequireRole';
import AppShell from '@/components/layout/AppShell';

/* ─── Auth pages (eager — small, always needed) ──────────────────────────── */
import LoginPage         from '@/pages/auth/LoginPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';

/* ─── Protected pages (lazy) ────────────────────────────────────────────── */
const DashboardPage           = lazy(() => import('@/pages/dashboard/DashboardPage'));
const NotificationsPage       = lazy(() => import('@/pages/notifications/NotificationsPage'));

// Trips
const TripListPage            = lazy(() => import('@/pages/trips/TripListPage'));
const TripDetailsPage         = lazy(() => import('@/pages/trips/TripDetailsPage'));
const CreateTripPage          = lazy(() => import('@/pages/trips/CreateTripPage'));
const EditTripPage            = lazy(() => import('@/pages/trips/EditTripPage'));
const TripTrackingPage        = lazy(() => import('@/pages/trips/TripTrackingPage'));
const TripCompletionPage      = lazy(() => import('@/pages/trips/TripCompletionPage'));

// Drivers
const DriverListPage          = lazy(() => import('@/pages/drivers/DriverListPage'));
const DriverDetailsPage       = lazy(() => import('@/pages/drivers/DriverDetailsPage'));
const AddDriverPage           = lazy(() => import('@/pages/drivers/AddDriverPage'));
const EditDriverPage          = lazy(() => import('@/pages/drivers/EditDriverPage'));
const DriverDocumentsPage     = lazy(() => import('@/pages/drivers/DriverDocumentsPage'));

// Vehicles
const VehicleListPage         = lazy(() => import('@/pages/vehicles/VehicleListPage'));
const VehicleDetailsPage      = lazy(() => import('@/pages/vehicles/VehicleDetailsPage'));
const AddVehiclePage          = lazy(() => import('@/pages/vehicles/AddVehiclePage'));
const EditVehiclePage         = lazy(() => import('@/pages/vehicles/EditVehiclePage'));
const VehicleDocumentsPage    = lazy(() => import('@/pages/vehicles/VehicleDocumentsPage'));
const VehicleFinancialsPage   = lazy(() => import('@/pages/vehicles/VehicleFinancialsPage'));
const MaintenanceListPage     = lazy(() => import('@/pages/maintenance/MaintenanceListPage'));
const MaintenanceDetailsPage  = lazy(() => import('@/pages/maintenance/MaintenanceDetailsPage'));

// Customers
const CustomerListPage        = lazy(() => import('@/pages/customers/CustomerListPage'));
const CustomerDetailsPage     = lazy(() => import('@/pages/customers/CustomerDetailsPage'));
const AddCustomerPage         = lazy(() => import('@/pages/customers/AddCustomerPage'));
const EditCustomerPage        = lazy(() => import('@/pages/customers/EditCustomerPage'));
const CustomerContractsPage   = lazy(() => import('@/pages/customers/CustomerContractsPage'));

const LocationListPage        = lazy(() => import('@/pages/locations/LocationListPage'));
const RateCardListPage        = lazy(() => import('@/pages/rate-cards/RateCardListPage'));
const RateCardDetailsPage     = lazy(() => import('@/pages/rate-cards/RateCardDetailsPage'));
const EditRateCardPage        = lazy(() => import('@/pages/rate-cards/EditRateCardPage'));
const RateCardDocsPage        = lazy(() => import('@/pages/rate-cards/RateCardDocsPage'));

// Invoices
const InvoiceListPage         = lazy(() => import('@/pages/invoices/InvoiceListPage'));
const InvoiceDetailsPage      = lazy(() => import('@/pages/invoices/InvoiceDetailsPage'));
const InvoicePrintTemplate    = lazy(() => import('@/pages/invoices/InvoicePrintTemplate'));
const CreateInvoicePage       = lazy(() => import('@/pages/invoices/CreateInvoicePage'));
const PaymentStatusPage       = lazy(() => import('@/pages/invoices/PaymentStatusPage'));

// Documents
const DocumentsCenterPage     = lazy(() => import('@/pages/documents/DocumentsCenterPage'));

// Reports
const ReportsDashboardPage    = lazy(() => import('@/pages/reports/ReportsDashboardPage'));
const FleetPerformancePage    = lazy(() => import('@/pages/reports/FleetPerformancePage'));
const RevenueReportsPage      = lazy(() => import('@/pages/reports/RevenueReportsPage'));
const DriverPerformancePage   = lazy(() => import('@/pages/reports/DriverPerformancePage'));
const CustomReportPage        = lazy(() => import('@/pages/reports/CustomReportPage'));
const DelayReportPage         = lazy(() => import('@/pages/reports/DelayReportPage'));

// Settings & Governance
const OperatorProfilePage     = lazy(() => import('@/pages/settings/OperatorProfilePage'));
const SettingsPage            = lazy(() => import('@/pages/settings/SettingsPage'));
const UserManagementPage      = lazy(() => import('@/pages/settings/UserManagementPage'));
const RecycleBinPage          = lazy(() => import('@/pages/recycle-bin/RecycleBinPage'));

/* ─── Protected Route wrapper ────────────────────────────────────────────── */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!authStore.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

/* ─── App Router ─────────────────────────────────────────────────────────── */
export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Auth (public) — full-page spinner while chunk loads ─── */}
        <Route path="/login"           element={<Suspense fallback={<FullPageSpinner />}><LoginPage /></Suspense>} />
        <Route path="/forgot-password" element={<Suspense fallback={<FullPageSpinner />}><ForgotPasswordPage /></Suspense>} />

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
          <Route path="/trips/new"                element={<Navigate to="/trips?new=true" replace />} />
          <Route path="/trips/:id"                element={<TripDetailsPage />} />
          <Route path="/trips/:id/edit"           element={<EditTripPage />} />
          <Route path="/trips/:id/track"          element={<TripTrackingPage />} />
          <Route path="/trips/:id/completion"     element={<TripCompletionPage />} />

          {/* Drivers */}
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
          <Route path="/vehicles/:id/financials"  element={<VehicleFinancialsPage />} />
          <Route path="/maintenance"              element={<MaintenanceListPage />} />
          <Route path="/maintenance/:id"          element={<MaintenanceDetailsPage />} />

          {/* Customers */}
          <Route path="/customers"                element={<CustomerListPage />} />
          <Route path="/customers/new"            element={<AddCustomerPage />} />
          <Route path="/customers/:id"            element={<CustomerDetailsPage />} />
          <Route path="/customers/:id/edit"       element={<EditCustomerPage />} />
          <Route path="/customers/:id/contracts"  element={<CustomerContractsPage />} />

          {/* Locations */}
          <Route path="/locations"                element={<LocationListPage />} />

          {/* Rate Cards */}
          <Route path="/rate-cards"               element={<RateCardListPage />} />
          <Route path="/rate-cards/:id"           element={<RateCardDetailsPage />} />
          <Route path="/rate-cards/:id/edit"      element={<EditRateCardPage />} />
          <Route path="/rate-cards/:id/documents" element={<RateCardDocsPage />} />

          {/* Invoices */}
          <Route path="/invoices"                 element={<InvoiceListPage />} />
          <Route path="/invoices/new"             element={<Navigate to="/invoices?action=mark" replace />} />
          <Route path="/invoices/:id"             element={<InvoiceDetailsPage />} />
          <Route path="/invoices/:id/print"       element={<InvoicePrintTemplate />} />
          <Route path="/invoices/:id/payment"     element={<PaymentStatusPage />} />

          {/* Documents */}
          <Route path="/documents"                element={<DocumentsCenterPage />} />
          <Route path="/documents/expiry"         element={<Navigate to="/documents" replace />} />

          {/* Reports */}
          <Route path="/reports"                  element={<ReportsDashboardPage />} />
          <Route path="/reports/custom"           element={<CustomReportPage />} />
          <Route path="/reports/fleet"            element={<FleetPerformancePage />} />
          <Route path="/reports/revenue"          element={<RevenueReportsPage />} />
          <Route path="/reports/drivers"          element={<DriverPerformancePage />} />
          <Route path="/reports/delays"           element={<DelayReportPage />} />

          {/* Settings & Governance */}
          <Route path="/settings"                 element={<SettingsPage />} />
          <Route path="/settings/profile"         element={<OperatorProfilePage />} />
          <Route path="/settings/users"           element={<RequireRole roles={['Admin']}><UserManagementPage /></RequireRole>} />
          <Route path="/recycle-bin"              element={<RecycleBinPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
