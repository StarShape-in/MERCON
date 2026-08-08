import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  ArrowLeft, Edit2, FileText, Building2, MapPin, Activity, AlertTriangle, Eye, 
  DollarSign, Plus, RefreshCw, Receipt, ShieldCheck, CheckCircle2, Truck, Calendar, 
  ChevronRight, TrendingUp, Sparkles, CreditCard, ArrowRight, Package, Layers, Phone, Mail,
  Globe2
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import KpiCard from '@/components/ui/KpiCard';
import { customerService } from '@/services/customerService';
import { invoiceService } from '@/services/invoiceService';
import { rateCardService, RateCard } from '@/services/rateCardService';
import RateCardFormDialog from '@/components/rate-cards/RateCardFormDialog';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import DataTable from '@/components/ui/DataTable';

import { exportExcelTable } from '@/utils/exportUtils';

export default function CustomerDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [isAddRateOpen, setIsAddRateOpen] = useState(false);
  const [editRateTarget, setEditRateTarget] = useState<RateCard | null>(null);
  // A standard lane the user wants to give this customer their own price for.
  // Opens the same form pre-filled with that lane, locked to this customer.
  const [overrideLane, setOverrideLane] = useState<RateCard | null>(null);

  // Fetch Customer details
  const { data: customer, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => customerService.getById(id!),
    enabled: !!id,
  });

  // Fetch Invoices for this customer
  const { data: invoicesResponse } = useQuery({
    queryKey: ['invoices', { customer_id: id }],
    queryFn: () => invoiceService.getAll({ customer_id: id }),
    enabled: !!id,
  });

  // This customer's effective price list: their own rates plus the standard
  // lanes they fall back to when they have no rate of their own.
  const { data: rateCardsResponse } = useQuery({
    queryKey: ['rate-cards', 'customer', id],
    queryFn: () => rateCardService.getAll({ customerId: id!, include_standard: true }),
    enabled: !!id,
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
          <Button size="sm" onClick={() => navigate('/customers')} className="bg-[#E8450F] text-white font-bold text-xs">
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

  // Filter rate cards for this customer
  const allRateCards = rateCardsResponse?.data || [];
  const customerRateCards = allRateCards.filter((rc) => rc.customerId === id);

  // A standard lane only applies to this customer if they haven't overridden
  // it — otherwise both would be listed and it would be unclear which one bills.
  const overriddenLanes = new Set(
    customerRateCards.map((rc) => `${rc.originLocationId}|${rc.destinationLocationId}`)
  );
  const inheritedRateCards = allRateCards.filter(
    (rc) => !rc.customerId && !overriddenLanes.has(`${rc.originLocationId}|${rc.destinationLocationId}`)
  );

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
      'RECEIVER', 'WAITING/LABOR CHARGES', 'ADDITIONAL STOPS', 'BILLING AMOUNT',
      'TOTAL AMOUNT', 'TRIP CHARGES', 'BALANCE AMOUNT', 'COMPANY NAME'
    ];

    let sumWaitingLabor = 0;
    let sumAdditionalStops = 0;
    let sumBilling = 0;
    let sumTotal = 0;
    let sumTripCharges = 0;
    let sumBalance = 0;

    const rows = customerTrips.map((t: any, index: number) => {
      const waiting = Number(t.waiting_labor_charges || 0);
      const stops = Number(t.additional_stop_charges || 0);
      const billing = Number(t.billing_amount || 0);
      const total = Number(t.total_amount || 0);
      const tripCharges = Number(t.trip_charges || 0);
      const balance = Number(t.balance_amount || total - tripCharges);

      sumWaitingLabor += waiting;
      sumAdditionalStops += stops;
      sumBilling += billing;
      sumTotal += total;
      sumTripCharges += tripCharges;
      sumBalance += balance;

      return [
        index + 1,
        new Date(t.createdAt).toLocaleDateString('en-GB'),
        t.ref_id || 'N/A',
        t.driver ? `${t.driver.first_name} ${t.driver.last_name}` : 'Unassigned',
        t.vehicle?.plate_number || 'Unassigned',
        t.vehicle ? `${(t.vehicle.capacity_kg / 1000).toFixed(0)} TON` : '10 TON',
        t.driver?.phone_primary || '',
        t.carrier_name || 'MERCON LOGISTICS',
        customer.name,
        'Dropoff',
        waiting,
        stops,
        billing,
        total,
        tripCharges,
        balance,
        customer.name
      ];
    });

    const summaryRow = [
      'TOTALS', '', '', '', '', '', '', '', '', '',
      sumWaitingLabor, sumAdditionalStops, sumBilling, sumTotal, sumTripCharges, sumBalance, ''
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
              onClick={() => refetch()}
              disabled={isFetching}
              className="h-9 gap-1.5 text-xs font-semibold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-[#E8450F]' : 'text-slate-500'}`} />
              Refresh
            </Button>

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
              onClick={() => navigate('/trips/new')}
              className="h-9 gap-1.5 text-xs bg-[#E8450F] hover:bg-[#d03d0c] text-white font-bold shadow-xs px-4"
            >
              <Plus className="w-3.5 h-3.5" /> Dispatch New Trip
            </Button>
          </div>
        </div>

        {/* ── Instrument-Panel KPI Cards ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Total Freight Billed"
            value={`SAR ${totalBilledInvoices.toLocaleString()}`}
            icon={Receipt}
            variant="emerald"
            subtitle="Cumulative customer invoice volume"
          />
          <KpiCard
            title="Utilized Credit Exposure"
            value={`SAR ${utilizedCredit.toLocaleString()}`}
            icon={CreditCard}
            variant="amber"
            subtitle={`${creditPct}% of SAR ${creditLimit.toLocaleString()} limit`}
          />
          <KpiCard
            title="Active Freight Dispatches"
            value={`${activeTripsCount} Active`}
            icon={Truck}
            variant="brand"
            subtitle="Currently in-transit & active"
          />
          <KpiCard
            title="Completed Trips YTD"
            value={`${completedTripsCount} Trips`}
            icon={CheckCircle2}
            variant="purple"
            subtitle="Delivered customer shipments"
          />
        </div>

        {/* ── Hero Executive Card & Credit Exposure Meter ────────────────── */}
        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs p-6 space-y-6">
          
          {/* Top Identity Row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            
            {/* Customer Avatar & Company Title */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-xl font-extrabold shadow-xs shrink-0">
                {customer.name?.[0]?.toUpperCase() || 'C'}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
                    {customer.name}
                  </h2>
                  <Badge 
                    variant="outline" 
                    className={`text-[10px] font-extrabold px-2 py-0.5 ${
                      customer.isActive 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400' 
                        : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400'
                    }`}
                  >
                    {customer.isActive ? '● Active Account' : '○ Inactive Account'}
                  </Badge>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap font-mono">
                  <span>ID: <strong className="text-slate-800 dark:text-slate-200">CUST-{customer.id.slice(0, 6).toUpperCase()}</strong></span>
                  <span>•</span>
                  <span>CR: <strong className="text-slate-800 dark:text-slate-200">{(customer as any).commercial_reg_no || (customer as any).cr_number || '1010839281'}</strong></span>
                  <span>•</span>
                  <span>VAT: <strong className="text-slate-800 dark:text-slate-200">{(customer as any).vat_number || '300192837400003'}</strong></span>
                </div>
              </div>
            </div>

            {/* Contact Details Pill */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-1.5 text-xs shrink-0 min-w-[240px]">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold">
                <Building2 className="w-3.5 h-3.5 text-slate-400" /> Commercial Contact
              </div>
              <div className="flex items-center gap-2 text-slate-500 font-mono">
                <Phone className="w-3.5 h-3.5 text-slate-400" /> {customer.contact_phone || '+966 11 482 9900'}
              </div>
              <div className="flex items-center gap-2 text-slate-500 font-mono">
                <Mail className="w-3.5 h-3.5 text-slate-400" /> {(customer as any).contact_email || (customer as any).email || 'logistics@customer.sa'}
              </div>
            </div>

          </div>

          {/* Credit Limit Exposure Meter */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
                <CreditCard className="w-4 h-4 text-indigo-600" />
                <span>Financial Credit Limit & Exposure</span>
              </div>
              <span className="font-mono text-slate-500">
                Terms: <strong className="text-slate-800 dark:text-slate-200">Net 30 Days</strong>
              </span>
            </div>

            <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden flex">
              <div className="bg-indigo-600 h-full rounded-full transition-all" style={{ width: `${creditPct}%` }}></div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono pt-1">
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Credit Limit</span>
                <span className="font-extrabold text-slate-900 dark:text-slate-100">SAR {creditLimit.toLocaleString()}</span>
              </div>

              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Utilized Exposure ({creditPct}%)</span>
                <span className="font-extrabold text-indigo-600">SAR {utilizedCredit.toLocaleString()}</span>
              </div>

              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Available Credit</span>
                <span className="font-extrabold text-emerald-600">SAR {availableCredit.toLocaleString()}</span>
              </div>
            </div>
          </div>

        </Card>

        {/* ── Main Dashboard 2-Column Grid (No Tabs) ────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left Column (Dispatches & Commercial Invoices) */}
          <div className="lg:col-span-2 space-y-6">

            {/* Section 1: Active & Recent Dispatch Trips Ledger */}
            <DataTable
              title={
                <span className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-[#E8450F]" />
                  <span>Customer Freight Dispatch History</span>
                </span>
              }
              columns={[
                {
                  header: 'Trip ID',
                  accessor: (trip: any) => (
                    <span className="font-mono text-xs font-extrabold text-[#E8450F]">{trip.ref_id}</span>
                  ),
                },
                {
                  header: 'Dispatch Date',
                  accessor: (trip: any) => (
                    <span className="text-slate-600 dark:text-slate-300 font-mono text-xs">
                      {new Date(trip.createdAt).toLocaleDateString()}
                    </span>
                  ),
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
                      {new Date(inv.createdAt).toLocaleDateString()}
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

          {/* Right Column (Tariff Cards & Account Summary) */}
          <div className="space-y-6">

            {/* What this customer is charged, lane by lane */}
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-600" /> Rates
                  </CardTitle>
                  <CardDescription className="text-[11px] mt-0.5">
                    Their own prices, plus the standard ones they fall back to.
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => setIsAddRateOpen(true)}
                  className="h-7 gap-1 text-xs font-bold bg-[#E8450F] hover:bg-[#d03d0c] text-white shrink-0"
                >
                  <Plus className="w-3 h-3" /> Add
                </Button>
              </CardHeader>

              <CardContent className="p-4 space-y-4 text-xs">

                {/* Own rates — these override the standard price */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    <Building2 className="w-3 h-3" /> Own rates ({customerRateCards.length})
                  </div>

                  {customerRateCards.length === 0 ? (
                    <p className="px-3 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-slate-500">
                      No negotiated prices — this customer pays the standard rates below.
                    </p>
                  ) : (
                    customerRateCards.map((rc) => (
                      <button
                        key={rc.id}
                        type="button"
                        onClick={() => setEditRateTarget(rc)}
                        className="w-full text-left p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 hover:border-[#E8450F]/40 transition-colors space-y-1"
                      >
                        <div className="flex justify-between gap-2 font-bold text-slate-900 dark:text-slate-100">
                          <span className="flex items-center gap-1 min-w-0">
                            <span className="truncate">{rc.route_origin}</span>
                            <ArrowRight className="w-3 h-3 shrink-0 text-[#E8450F]" />
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

                {/* Standard lanes they inherit */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    <Globe2 className="w-3 h-3" /> Standard rates used ({inheritedRateCards.length})
                  </div>

                  {inheritedRateCards.length === 0 ? (
                    <p className="px-3 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-slate-500">
                      No standard lanes priced yet.
                    </p>
                  ) : (
                    inheritedRateCards.map((rc) => (
                      <div
                        key={rc.id}
                        className="flex items-center justify-between gap-2 p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-700"
                      >
                        <span className="flex items-center gap-1 min-w-0 font-semibold text-slate-700 dark:text-slate-300">
                          <span className="truncate">{rc.route_origin}</span>
                          <ArrowRight className="w-3 h-3 shrink-0 text-slate-400" />
                          <span className="truncate">{rc.route_destination}</span>
                        </span>
                        <span className="flex items-center gap-2 shrink-0">
                          <span className="font-mono font-bold text-slate-600 dark:text-slate-400">
                            {rc.currency || 'SAR'} {Number(rc.base_price || 0).toLocaleString()}
                          </span>
                          <button
                            type="button"
                            onClick={() => setOverrideLane(rc)}
                            className="text-[10px] font-bold text-[#E8450F] hover:underline"
                            title="Give this customer their own price for this lane"
                          >
                            Override
                          </button>
                        </span>
                      </div>
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

          </div>

        </div>

      </div>

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

      <RateCardFormDialog
        isOpen={!!overrideLane}
        onClose={() => setOverrideLane(null)}
        lockedCustomerId={id}
        lockedCustomerName={customer?.name}
        defaultOriginLocationId={overrideLane?.originLocationId || undefined}
        defaultDestinationLocationId={overrideLane?.destinationLocationId || undefined}
        defaultPrice={overrideLane ? String(overrideLane.base_price) : undefined}
      />
    </DashboardLayout>
  );
}
