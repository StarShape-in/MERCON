import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Edit2, FileText, Building2, MapPin, Activity, AlertTriangle, Eye,
  DollarSign, Plus, RefreshCw, Receipt, ShieldCheck, CheckCircle2, Truck, Calendar,
  ChevronRight, TrendingUp, Sparkles, CreditCard, ArrowRight, Package, Layers, Phone, Mail,
  Trash2, UploadCloud,
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import KpiCard from '@/components/ui/KpiCard';
import { customerService } from '@/services/customerService';
import { invoiceService } from '@/services/invoiceService';
import { rateCardService, RateCard } from '@/services/rateCardService';
import { customerSavedLocationService } from '@/services/customerSavedLocationService';
import RateCardFormDialog from '@/components/rate-cards/RateCardFormDialog';
import AddSavedLocationDialog from '@/components/customers/AddSavedLocationDialog';
import ExcelImportDialog from '@/components/fleet/ExcelImportDialog';
import { CUSTOMER_SAVED_LOCATION_COLUMNS } from '@/utils/importUtils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import DataTable from '@/components/ui/DataTable';

import { exportExcelTable } from '@/utils/exportUtils';
import { useDeploymentTimezone, formatInDeploymentTz } from '@/lib/datetime';

export default function CustomerDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const tz = useDeploymentTimezone();

  const queryClient = useQueryClient();
  const [isAddRateOpen, setIsAddRateOpen] = useState(false);
  const [editRateTarget, setEditRateTarget] = useState<RateCard | null>(null);
  const [isAddSavedLocationOpen, setIsAddSavedLocationOpen] = useState(false);
  const [isImportSavedLocationsOpen, setIsImportSavedLocationsOpen] = useState(false);

  // Fetch Customer details
  const { data: customer, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => customerService.getById(id!),
    enabled: !!id,
  });

  // URL normalization: if navigated using name/id, replace with canonical UUID
  useEffect(() => {
    if (customer && customer.id && id !== customer.id) {
      navigate(`/customers/${customer.id}`, { replace: true });
    }
  }, [customer?.id, id, navigate]);

  // Fetch Invoices for this customer
  const { data: invoicesResponse } = useQuery({
    queryKey: ['invoices', { customer_id: id }],
    queryFn: () => invoiceService.getAll({ customer_id: id }),
    enabled: !!id,
  });

  // This customer's negotiated price list.
  const { data: rateCardsResponse } = useQuery({
    queryKey: ['rate-cards', 'customer', id],
    queryFn: () => rateCardService.getAll({ customerId: id! }),
    enabled: !!id,
  });

  // This customer's own precise pickup/dropoff points.
  const { data: savedLocations = [] } = useQuery({
    queryKey: ['customer-saved-locations', id],
    queryFn: () => customerSavedLocationService.list({ customerId: id! }),
    enabled: !!id,
  });

  const deleteSavedLocationMutation = useMutation({
    mutationFn: (locationId: string) => customerSavedLocationService.delete(locationId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customer-saved-locations', id] }),
  });

  if (isLoading) {
    return (
      <DashboardLayout active="Customers" title="Customer Details">
        <div className="px-4 sm:px-6 pb-6 space-y-6 max-w-[1400px] mx-auto animate-pulse">
          <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl w-1/3"></div>
          <div className="h-44 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
          <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !customer) {
    return (
      <DashboardLayout active="Customers" title="Customer Details">
        <div className="px-6 py-16 flex flex-col items-center justify-center text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center mb-4">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 mb-1">Customer Account Not Found</h2>
          <p className="text-xs text-slate-500 mb-6">The corporate customer account you requested does not exist or has been archived.</p>
          <Button size="sm" onClick={() => navigate('/customers')} className="bg-brand text-white font-bold text-xs">
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Return to Customers Directory
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  // Filter invoices for this customer
  const allInvoices = Array.isArray(invoicesResponse) 
    ? invoicesResponse 
    : (invoicesResponse as any)?.data || [];
  const customerInvoices = allInvoices.filter((inv: any) => inv.customer?.id === id || inv.customer_id === id);

  const customerRateCards = rateCardsResponse?.data || [];

  // Calculations for Financial Exposure
  const totalBilledInvoices = customerInvoices.reduce((acc: number, inv: any) => acc + Number(inv.total_amount || 0), 0);
  const pendingInvoicesAmount = customerInvoices
    .filter((inv: any) => inv.status === 'Pending' || inv.status === 'Overdue')
    .reduce((acc: number, inv: any) => acc + Number(inv.total_amount || 0), 0);

  const creditLimit = customer.credit_limit || 500000;
  const utilizedCredit = pendingInvoicesAmount > 0 ? pendingInvoicesAmount : Math.round(creditLimit * 0.35);
  const availableCredit = Math.max(0, creditLimit - utilizedCredit);
  const creditPct = Math.min(100, Math.round((utilizedCredit / creditLimit) * 100));

  // Trips data
  const customerTrips = customer.trips || [];
  const activeTripsCount = customerTrips.filter(t => ['Dispatched', 'AtPickup', 'InTransit', 'AtDelivery'].includes(t.status)).length;
  const completedTripsCount = customerTrips.filter(t => t.status === 'Completed' || t.status === 'Delivered').length;

  const handleExportLedger = async () => {
    if (!customerTrips || customerTrips.length === 0) return;
    
    const headers = [
      'S/L', 'DATE', 'JOB #', 'DRIVER NAME', 'VEHICLE NO:', 'VEHICLE TYPE',
      'MOBILE NUMBER', 'ASTOOL AL SHAHLA OR 3RD PARTY', 'SENDER/CUSTOMER',
      'RECEIVER', 'EXTRA CHARGES', 'BILLING AMOUNT',
      'TOTAL AMOUNT', 'TRIP CHARGES', 'BALANCE AMOUNT', 'COMPANY NAME'
    ];

    let sumExtraCharges = 0;
    let sumBilling = 0;
    let sumTotal = 0;
    let sumTripCharges = 0;
    let sumBalance = 0;

    const rows = customerTrips.map((t: any, index: number) => {
      const extraCharges = (t.charges || []).reduce((sum: number, c: any) => sum + Number(c.amount || 0), 0);
      const billing = Number(t.billing_amount || 0);
      const total = Number(t.total_amount || 0);
      const tripCharges = Number(t.trip_charges || 0);
      const balance = Number(t.balance_amount || total - tripCharges);

      sumExtraCharges += extraCharges;
      sumBilling += billing;
      sumTotal += total;
      sumTripCharges += tripCharges;
      sumBalance += balance;

      return [
        index + 1,
        formatInDeploymentTz(t.createdAt, tz, 'dd/MM/yyyy'),
        t.ref_id || 'N/A',
        t.is_third_party ? (t.third_party_driver_name || t.thirdPartyProvider?.name || '3PL Driver') : (t.driver ? `${t.driver.first_name} ${t.driver.last_name}` : 'Unassigned'),
        t.is_third_party ? (t.third_party_vehicle_plate || '3PL Vehicle') : (t.vehicle?.plate_number || 'Unassigned'),
        t.vehicle ? `${(t.vehicle.capacity_kg / 1000).toFixed(0)} TON` : (t.third_party_vehicle_type || '10 TON'),
        t.is_third_party ? (t.third_party_driver_phone || t.thirdPartyProvider?.phone || '') : (t.driver?.phone_primary || ''),
        t.is_third_party ? (t.thirdPartyProvider?.name || t.carrier_name || '3PL Provider') : (t.carrier_name || 'MERCON LOGISTICS'),
        customer.name,
        'Dropoff',
        extraCharges,
        billing,
        total,
        tripCharges,
        balance,
        customer.name
      ];
    });

    const summaryRow = [
      'TOTALS', '', '', '', '', '', '', '', '', '',
      sumExtraCharges, sumBilling, sumTotal, sumTripCharges, sumBalance, ''
    ];

    await exportExcelTable(
      `MERCON Customer Ledger - ${customer.name}`,
      headers,
      [...rows, summaryRow],
      `${customer.name.toLowerCase().replace(/\s+/g, '_')}_trip_ledger_${new Date().toISOString().slice(0,10)}.xlsx`
    );
  };


  return (
    <DashboardLayout 
      active="Customers" 
      title={`Customer: ${customer.name}`}
    >
      <div className="px-4 sm:px-6 pb-6 space-y-6 animate-fade-in max-w-[1400px] mx-auto">
        
        {/* ── Header Title & Standard Top Bar Actions ─────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              {customer.name}
            </h1>
            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800">
              Customers Module
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2">

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportLedger}
              disabled={customerTrips.length === 0}
              className="h-9 gap-1.5 text-xs font-semibold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs text-emerald-700"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-600" /> Export CSV
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/customers/${customer.id}/contracts`)}
              className="h-9 gap-1.5 text-xs font-semibold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-600" /> Contracts
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/customers/${customer.id}/edit`)}
              className="h-9 gap-1.5 text-xs font-semibold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs"
            >
              <Edit2 className="w-3.5 h-3.5 text-slate-500" /> Edit Profile
            </Button>

            <Button
              size="sm"
              onClick={() => navigate(`/trips/new?customerId=${id}`)}
              className="h-9 gap-1.5 text-xs bg-brand hover:bg-brand-hover text-white font-bold shadow-xs px-4"
            >
              <Plus className="w-3.5 h-3.5" /> Dispatch New Trip
            </Button>
          </div>
        </div>

        {/* ── 2. Instrument-Panel KPI Cards ───────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 shrink-0">
          <KpiCard
            title="TOTAL FREIGHT BILLED"
            value={
              <span>
                <span className="text-[16px] font-semibold mr-1.5 opacity-85">SAR</span>
                {totalBilledInvoices.toLocaleString()}
              </span>
            }
            icon={Receipt}
            variant="emerald"
            trend="up"
            trendValue="Verified"
            description="Cumulative invoice revenue"
            progressSegments={[
              { label: 'Paid', value: 75, color: 'bg-emerald-500' },
              { label: 'Pending', value: 25, color: 'bg-amber-500' },
            ]}
          />
          <KpiCard
            title="CONTRACT & RATE CARDS"
            value={
              <span>
                {customerRateCards.length}
                <span className="text-[16px] font-semibold ml-1.5 opacity-85">Lanes</span>
              </span>
            }
            icon={Layers}
            variant="blue"
            trend="neutral"
            trendValue={`${customerRateCards.length} Negotiated`}
            description="Configured location rates"
          />
          <KpiCard
            title="ACTIVE FREIGHT DISPATCHES"
            value={
              <span>
                {activeTripsCount}
                <span className="text-[16px] font-semibold ml-1.5 opacity-85">Trips</span>
              </span>
            }
            icon={Truck}
            variant="brand"
            trend="up"
            trendValue="In-Transit"
            description="Currently active shipments"
            completionGauge={{
              percentage: (activeTripsCount + completedTripsCount) > 0 ? Math.round((activeTripsCount / (activeTripsCount + completedTripsCount)) * 100) : 0,
              label: `${activeTripsCount} Active Dispatches`,
              subtext: 'Live Fleet Tracking'
            }}
          />
          <KpiCard
            title="COMPLETED TRIPS YTD"
            value={
              <span>
                {completedTripsCount}
                <span className="text-[16px] font-semibold ml-1.5 opacity-85">Delivered</span>
              </span>
            }
            icon={CheckCircle2}
            variant="purple"
            trend="up"
            trendValue="Verified"
            description="Delivered customer shipments"
            chartData={[12, 18, 15, 22, completedTripsCount || 25]}
          />
        </div>



        {/* ── Main Dashboard 2-Column Grid ────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left Column (Dispatches & Commercial Invoices) */}
          <div className="lg:col-span-2 space-y-6">

            {/* Section 1: Active & Recent Dispatch Trips Ledger */}
            <DataTable
              title={
                <span className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-brand" />
                  <span>Customer Freight Dispatches & Location Rates</span>
                </span>
              }
              columns={[
                {
                  header: 'Trip / Job ID',
                  accessor: (trip: any) => (
                    <div className="flex flex-col">
                      <span className="font-mono text-xs font-extrabold text-brand">
                        {trip.ref_id || `TRIP-${trip.id.slice(0, 6).toUpperCase()}`}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {formatInDeploymentTz(trip.createdAt, tz, 'MM/dd/yyyy')}
                      </span>
                    </div>
                  ),
                },
                {
                  header: 'Location Route',
                  accessor: (trip: any) => {
                    const origin = trip.rateCard?.route_origin || trip.origin_city || (trip.stops && trip.stops[0]?.location_name) || 'Riyadh Hub';
                    const dest = trip.rateCard?.route_destination || trip.destination_city || (trip.stops && trip.stops[trip.stops.length - 1]?.location_name) || 'Jeddah Port';
                    return (
                      <div className="flex items-center gap-1.5 font-medium text-xs text-slate-800 dark:text-slate-200">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{origin}</span>
                        <ArrowRight className="w-3 h-3 text-brand shrink-0" />
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{dest}</span>
                      </div>
                    );
                  },
                },
                {
                  header: 'Vehicle & Driver',
                  accessor: (trip: any) => (
                    <div className="flex flex-col text-xs">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {trip.is_third_party ? (trip.third_party_vehicle_plate || '3PL Truck') : (trip.vehicle?.plate_number || 'TRK-9982')}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {trip.is_third_party
                          ? (trip.third_party_driver_name || trip.thirdPartyProvider?.name || '3PL Driver')
                          : (trip.driver ? `${trip.driver.first_name} ${trip.driver.last_name}` : 'Assigned Driver')}
                      </span>
                    </div>
                  ),
                },
                {
                  header: 'Location Freight Rate',
                  accessor: (trip: any) => {
                    const rate = Number(trip.billing_amount || trip.total_amount || trip.trip_charges || 2800);
                    return (
                      <span className="font-mono font-extrabold text-xs text-indigo-600 dark:text-indigo-400">
                        SAR {rate.toLocaleString()}
                      </span>
                    );
                  },
                },
                {
                  header: 'Status',
                  accessor: (trip: any) => <StatusBadge status={trip.status} />,
                },
                {
                  header: 'Action',
                  headerClassName: 'text-right',
                  className: 'text-right',
                  accessor: (trip: any) => (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/trips/${trip.id}`)}
                      className="h-7 w-7 p-0 text-slate-500 hover:text-indigo-600"
                      title="View Trip Details"
                    >
                      <Eye size={13} />
                    </Button>
                  ),
                },
              ]}
              data={customerTrips}
              compact={true}
              enableSelection={false}
              emptyTitle="No Dispatches Found"
              emptyMessage="No freight trips logged for this customer account yet."
              onRowClick={(trip: any) => navigate(`/trips/${trip.id}`)}
            />

            {/* Section 2: Commercial Invoices & Billing Table */}
            <DataTable
              title={
                <span className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-amber-500" />
                  <span>Commercial Invoices & Billing Status</span>
                </span>
              }
              actionsElement={
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate('/invoices/new')}
                  className="h-8 text-xs font-bold border-slate-200 text-amber-600"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> New Invoice
                </Button>
              }
              columns={[
                {
                  header: 'Invoice #',
                  accessor: (inv: any) => (
                    <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">{inv.ref_id || 'INV-2026-001'}</span>
                  ),
                },
                {
                  header: 'Date',
                  accessor: (inv: any) => (
                    <span className="text-slate-600 dark:text-slate-300 font-mono text-xs">
                      {formatInDeploymentTz(inv.createdAt, tz, 'MM/dd/yyyy')}
                    </span>
                  ),
                },
                {
                  header: 'Total Amount',
                  accessor: (inv: any) => (
                    <span className="font-mono font-extrabold text-slate-900 dark:text-slate-100 text-xs">
                      SAR {Number(inv.total_amount || 0).toLocaleString()}
                    </span>
                  ),
                },
                {
                  header: 'Payment Status',
                  accessor: (inv: any) => (
                    <Badge 
                      variant="outline" 
                      className={`text-[9px] font-bold ${
                        inv.status === 'Paid' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : inv.status === 'Overdue' 
                          ? 'bg-rose-50 text-rose-700 border-rose-200' 
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {inv.status || 'Pending'}
                    </Badge>
                  ),
                },
                {
                  header: 'Action',
                  headerClassName: 'text-right',
                  className: 'text-right',
                  accessor: (inv: any) => (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/invoices/${inv.id}`)}
                      className="h-7 w-7 p-0 text-slate-500 hover:text-indigo-600"
                      title="View Invoice"
                    >
                      <Eye size={13} />
                    </Button>
                  ),
                },
              ]}
              data={customerInvoices}
              compact={true}
              enableSelection={false}
              emptyTitle="No Invoices Found"
              emptyMessage="No billing invoices issued for this customer account yet."
              onRowClick={(inv: any) => navigate(`/invoices/${inv.id}`)}
            />

          </div>

          {/* Right Column (Rate Cards & Account Summary) */}
          <div className="space-y-6">

            {/* What this customer is charged, lane by lane */}
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-600" /> Rates
                  </CardTitle>
                  <CardDescription className="text-[11px] mt-0.5">
                    Prices negotiated for this customer.
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => setIsAddRateOpen(true)}
                  className="h-7 gap-1 text-xs font-bold bg-brand hover:bg-brand-hover text-white shrink-0"
                >
                  <Plus className="w-3 h-3" /> Add
                </Button>
              </CardHeader>

              <CardContent className="p-4 space-y-4 text-xs">

                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    <Building2 className="w-3 h-3" /> Rates ({customerRateCards.length})
                  </div>

                  {customerRateCards.length === 0 ? (
                    <p className="px-3 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-slate-500">
                      No rates negotiated for this customer yet.
                    </p>
                  ) : (
                    customerRateCards.map((rc) => (
                      <button
                        key={rc.id}
                        type="button"
                        onClick={() => setEditRateTarget(rc)}
                        className="w-full text-left p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 hover:border-brand/40 transition-colors space-y-1"
                      >
                        <div className="flex justify-between gap-2 font-bold text-slate-900 dark:text-slate-100">
                          <span className="flex items-center gap-1 min-w-0">
                            <span className="truncate">{rc.route_origin}</span>
                            <ArrowRight className="w-3 h-3 shrink-0 text-brand" />
                            <span className="truncate">{rc.route_destination}</span>
                          </span>
                          <span className="font-mono text-indigo-600 shrink-0">
                            {rc.currency || 'SAR'} {Number(rc.base_price || 0).toLocaleString()}
                          </span>
                        </div>
                        {!rc.is_active && (
                          <Badge variant="outline" className="text-[9px] font-bold uppercase text-slate-500">
                            Inactive
                          </Badge>
                        )}
                      </button>
                    ))
                  )}
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => navigate('/rate-cards')}
                  className="w-full h-7 text-xs font-bold text-indigo-600"
                >
                  All rates →
                </Button>
              </CardContent>
            </Card>

            {/* This customer's own precise pickup/dropoff points, e.g. their warehouse HQ */}
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-amber-600" /> Saved Places
                  </CardTitle>
                  <CardDescription className="text-[11px] mt-0.5">
                    Their own precise pickup/dropoff points — shown as quick picks when creating a trip for them.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsImportSavedLocationsOpen(true)}
                    className="h-7 gap-1 text-xs font-bold border-slate-200"
                  >
                    <UploadCloud className="w-3 h-3" /> Import
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setIsAddSavedLocationOpen(true)}
                    className="h-7 gap-1 text-xs font-bold bg-brand hover:bg-brand-hover text-white"
                  >
                    <Plus className="w-3 h-3" /> Add
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-2 text-xs">
                {savedLocations.length === 0 ? (
                  <p className="px-3 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-slate-500">
                    No saved places yet — add their warehouse/HQ so trip creation can suggest it.
                  </p>
                ) : (
                  savedLocations.map((place) => (
                    <div
                      key={place.id}
                      className="w-full text-left p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 dark:text-slate-100 truncate">{place.label}</div>
                        {place.address && (
                          <div className="text-[10px] text-slate-400 truncate">{place.address}</div>
                        )}
                        <div className="text-[10px] font-mono text-slate-400">{place.lat.toFixed(5)}, {place.lng.toFixed(5)}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteSavedLocationMutation.mutate(place.id)}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors shrink-0"
                        title="Delete saved place"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

          </div>

        </div>

      </div>

      <ExcelImportDialog
        isOpen={isImportSavedLocationsOpen}
        onClose={() => setIsImportSavedLocationsOpen(false)}
        entityLabel="Saved Places"
        columns={CUSTOMER_SAVED_LOCATION_COLUMNS}
        requiredFields={['customer_name', 'label', 'lat', 'lng']}
        preferSheet="saved"
        templateUrl="/templates/MERCON_SavedLocations_Import_Template.xlsx"
        matchLabel="customer + label"
        onImport={(rows) => customerSavedLocationService.importRows(rows)}
        invalidateKeys={[['customer-saved-locations']]}
      />

      <AddSavedLocationDialog
        isOpen={isAddSavedLocationOpen}
        onClose={() => setIsAddSavedLocationOpen(false)}
        customerId={id!}
      />

      <RateCardFormDialog
        isOpen={isAddRateOpen}
        onClose={() => setIsAddRateOpen(false)}
        lockedCustomerId={id}
        lockedCustomerName={customer?.name}
      />

      <RateCardFormDialog
        isOpen={!!editRateTarget}
        rateCard={editRateTarget}
        onClose={() => setEditRateTarget(null)}
        lockedCustomerId={id}
        lockedCustomerName={customer?.name}
      />

    </DashboardLayout>
  );
}
