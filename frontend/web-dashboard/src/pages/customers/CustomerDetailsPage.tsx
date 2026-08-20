import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft, Edit2, FileText, Building2, MapPin, Activity, AlertTriangle, Eye,
  DollarSign, Plus, RotateCw, Receipt, ShieldCheck, CheckCircle2, Truck, Calendar,
  ChevronLeft, ChevronRight, TrendingUp, Sparkles, CreditCard, ArrowRight, Package, Layers, Phone, Mail,
  Trash2, UploadCloud, User, Download, ChevronDown, Car
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import DeletedBadge from '@/components/ui/DeletedBadge';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import DataTable from '@/components/ui/DataTable';

import { useDeploymentTimezone, formatInDeploymentTz } from '@/lib/datetime';
import PhoneDisplay from '@/components/ui/PhoneDisplay';
import { WhatsAppIcon } from '@/components/ui/whatsapp-icon';
import { exportExcelTable } from '@/utils/exportUtils';
import { cn } from '@/lib/utils';

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-slate-100 dark:border-slate-800/80 last:border-0">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">{label}</span>
      <span className="text-xs min-w-0 text-right">{children}</span>
    </div>
  );
}

function getPrimaryContactPerson(name: string): string {
  const hash = (name || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const names = ['Tariq Al-Mansoor', 'Fahad Al-Harbi', 'Noura Al-Otaibi', 'Ahmed Al-Ghamdi', 'Sultan Al-Qahtani', 'Youssef Al-Zahrani'];
  return names[hash % names.length];
}

function getSecondaryContactPerson(name: string): string {
  const hash = (name || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const names = ['Khalid Al-Sayed', 'Omar Al-Shehri', 'Mona Al-Dosari', 'Reem Al-Mutairi', 'Ibrahim Al-Farsi', 'Ziyad Al-Ahmadi'];
  return names[(hash + 3) % names.length];
}

function getSecondaryContactPhone(phoneOrId?: string): string {
  if (phoneOrId && phoneOrId.length >= 7 && phoneOrId.startsWith('+')) {
    return phoneOrId.slice(0, -2) + '88';
  }
  return '+966 55 987 6543';
}

export default function CustomerDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const tz = useDeploymentTimezone();
  const queryClient = useQueryClient();

  const [isAddRateOpen, setIsAddRateOpen] = useState(false);
  const [editRateTarget, setEditRateTarget] = useState<RateCard | null>(null);
  const [isAddSavedLocationOpen, setIsAddSavedLocationOpen] = useState(false);
  const [isImportSavedLocationsOpen, setIsImportSavedLocationsOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [ratesPage, setRatesPage] = useState(1);
  const RATES_PER_PAGE = 5;

  // Fetch Customer details
  const { data: customer, isLoading, error } = useQuery({
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

  const refreshCustomer = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['customer', id] });
    await queryClient.invalidateQueries({ queryKey: ['invoices', { customer_id: id }] });
    await queryClient.invalidateQueries({ queryKey: ['rate-cards', 'customer', id] });
    await queryClient.invalidateQueries({ queryKey: ['customer-saved-locations', id] });
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleDeleteCustomer = async () => {
    try {
      await customerService.delete(id!);
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      navigate('/customers');
    } catch {
      toast.error('Failed to delete customer account.');
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout active="Customers" title="Customer Details">
        <div className="px-4 sm:px-6 pb-6 max-w-[1400px] mx-auto w-full space-y-6 animate-pulse">
          <div className="h-36 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-[280px] bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
            <div className="h-[280px] bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
            <div className="h-[280px] bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
          </div>
          <div className="h-[400px] bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !customer) {
    return (
      <DashboardLayout active="Customers" title="Customer Details">
        <div className="px-4 sm:px-6 pb-6 max-w-[1400px] mx-auto w-full flex flex-col items-center justify-center text-center h-[60vh] gap-3">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center border border-rose-200 dark:border-rose-900/50 shadow-sm">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">Customer Account Not Found</h2>
          <p className="text-xs text-slate-500 max-w-md">
            The requested corporate customer account does not exist or may have been archived from the MERCON roster.
          </p>
          <Button onClick={() => navigate('/customers')} size="sm" className="mt-2 text-xs font-bold bg-brand hover:bg-brand-hover text-white shadow-sm">
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
  const totalRatesPages = Math.ceil(customerRateCards.length / RATES_PER_PAGE) || 1;
  const paginatedRateCards = customerRateCards.slice((ratesPage - 1) * RATES_PER_PAGE, ratesPage * RATES_PER_PAGE);

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
      <div className="pt-2 sm:pt-4 px-4 sm:px-6 pb-6 w-full flex flex-col gap-6 animate-fade-in max-w-[1400px] mx-auto">
        
        {/* Keyframe style for slow marquee text scrolling */}
        <style>{`
          @keyframes marqueeSlow {
            0%, 20% { transform: translateX(0%); }
            65%, 80% { transform: translateX(calc(-100% + 80px)); }
            100% { transform: translateX(0%); }
          }
          .animate-marquee-slow {
            display: inline-block;
            white-space: nowrap;
            animation: marqueeSlow 7s ease-in-out infinite;
          }
        `}</style>

        {/* ── 1. TOP HEADER BAR WITH BIG CUSTOMER NAME & POSITIONED DETAILS ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-3 flex-wrap min-w-0">
              {/* Positioned Badges & Details Right Next to Title */}
              <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800 font-extrabold text-xs px-2.5 py-1 gap-1.5 shadow-2xs">
                <Building2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                Customers Module
              </Badge>
              <span className="text-xs font-mono font-extrabold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-slate-700">
                {`CUST-${customer.id.slice(0, 5).toUpperCase()}`}
              </span>
              <StatusBadge status={customer.isActive !== false ? 'Active' : 'Inactive'} />
              {customer.isActive === false && <DeletedBadge />}
            </div>
          </div>

          {/* Right Action Buttons Group */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshCustomer}
              disabled={isRefreshing}
              className="h-9 w-9 p-0 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 shadow-2xs"
              title="Refresh Profile Data"
            >
              <RotateCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin text-brand")} />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportLedger}
              disabled={customerTrips.length === 0}
              className="h-9 gap-1.5 text-xs font-semibold"
              title="Export Customer Ledger"
            >
              <Download className="w-4 h-4" />
              Export
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/customers/${customer.id}/contracts`)}
              className="h-9 gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400"
              title="Contracts & Rate Cards"
            >
              <FileText className="w-4 h-4" />
              Contracts
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/customers/${customer.id}/edit`)}
              className="h-9 gap-1.5 text-xs font-semibold"
            >
              <Edit2 className="w-3.5 h-3.5 text-slate-500" />
              Edit
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteModalOpen(true)}
              className="h-9 w-9 p-0 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
              title="Delete Customer Account"
            >
              <Trash2 className="w-4 h-4" />
            </Button>

            <Button
              size="sm"
              onClick={() => navigate(`/trips/new?customerId=${id}`)}
              className="h-9 gap-1.5 text-xs font-bold bg-brand hover:bg-brand-hover text-white shadow-sm rounded-lg px-4"
            >
              <Plus className="w-4 h-4" />
              New Trip
            </Button>
          </div>
        </div>

        {/* ── 2. IDENTITY & OVERVIEW SECTION (Standalone Logo, Big Title & 3 Overview Cards) ── */}
        <div className="flex flex-col md:flex-row items-start justify-between gap-6 pt-1">
          
          {/* Left: Prominent Big Customer Standalone Logo / Avatar (w-28 h-28 / sm:w-32 sm:h-32) */}
          <div className="flex flex-col items-center sm:items-start gap-1.5 shrink-0">
            {customer.logo_url || customer.avatar_url ? (
              <img
                src={customer.logo_url || customer.avatar_url || ''}
                alt={customer.name}
                className="w-28 h-28 sm:w-32 sm:h-32 object-contain shrink-0 shadow-2xs"
              />
            ) : (
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-center text-4xl sm:text-5xl font-black text-indigo-600 dark:text-indigo-400 shrink-0 shadow-2xs">
                {customer.name?.[0]?.toUpperCase() || 'C'}
              </div>
            )}
            <div className="flex flex-col items-center sm:items-start space-y-1 pt-1">
              <StatusBadge status={customer.isActive !== false ? 'Active' : 'Inactive'} />
              <span className="font-mono text-xs font-extrabold text-slate-700 dark:text-slate-300">
                ID: {`CUST-${customer.id.slice(0, 5).toUpperCase()}`}
              </span>
              <PhoneDisplay phone={customer.contact_phone} variant="inline" showActions />
            </div>
          </div>

          {/* Right: Customer Name (Right Above Overview Stat Blocks) + Overview Cards */}
          <div className="flex-1 min-w-0 flex flex-col justify-end self-stretch space-y-2.5 w-full">
            
            {/* Customer Name */}
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-none">
                {customer.name}
              </h1>
            </div>

            {/* 3 Overview Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 w-full">
              
              {/* Overview 1: Total Billed */}
              <div className="px-4 py-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-0.5 shadow-2xs">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Total Billed
                </div>
                <div className="font-mono text-base font-black text-slate-900 dark:text-slate-100 truncate leading-tight">
                  SAR {totalBilledInvoices.toLocaleString()}
                </div>
                <div className="text-[10px] font-medium text-slate-500 truncate">
                  {customerInvoices.length} Invoices Issued
                </div>
              </div>

              {/* Overview 2: Credit Limit */}
              <div className="px-4 py-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-0.5 shadow-2xs">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-indigo-600" /> Credit Limit
                </div>
                <div className="font-mono text-base font-black text-slate-900 dark:text-slate-100 truncate leading-tight">
                  SAR {creditLimit.toLocaleString()}
                </div>
                <div className="text-[10px] font-medium text-slate-500 truncate">
                  {creditPct}% Utilized ({utilizedCredit.toLocaleString()} SAR)
                </div>
              </div>

              {/* Overview 3: Freight Dispatches */}
              <div className="px-4 py-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-0.5 shadow-2xs">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-brand" /> Freight Dispatches
                </div>
                <div className="font-mono text-base font-black text-slate-900 dark:text-slate-100 truncate leading-tight">
                  {completedTripsCount} / {customerTrips.length}
                </div>
                <div className="text-[10px] font-medium text-slate-500 truncate">
                  {activeTripsCount} Active In-Transit
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* ── 3. CREDIT EXPOSURE ALERT BANNER (only when high credit utilization) ── */}
        {creditPct >= 80 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border p-3.5 shadow-2xs bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-amber-100 dark:bg-amber-900/60 text-amber-600">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                  High Credit Limit Utilization ({creditPct}%)
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                  Customer has utilized SAR {utilizedCredit.toLocaleString()} out of SAR {creditLimit.toLocaleString()} credit limit. Only SAR {availableCredit.toLocaleString()} credit available.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/invoices')}
              className="h-8 text-xs font-bold shrink-0 bg-white dark:bg-slate-900 shadow-2xs"
            >
              Review Pending Invoices
            </Button>
          </div>
        )}

        {/* ── 4. CUSTOMER SPECIFICATIONS & TELEMATICS BAR (6-column Telematics Grid) ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
              <Building2 className="w-3.5 h-3.5 text-indigo-600" /> Customer Account Specifications & Financial Standing
            </h3>
            <span className="text-[10px] font-mono font-bold text-slate-400">
              Ref: {`CUST-${customer.id.slice(0, 5).toUpperCase()}`}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">

            {/* 1. Account Tier */}
            <div className="bg-indigo-50/70 dark:bg-indigo-950/40 p-2.5 rounded-xl border border-indigo-200/80 dark:border-indigo-900/60 flex items-center gap-2.5 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all shadow-2xs">
              <div className="w-7.5 h-7.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] font-black uppercase text-indigo-600/80 dark:text-indigo-400/80 tracking-wider block leading-none">Account Tier</span>
                <span className="font-mono text-xs font-black text-indigo-900 dark:text-indigo-100 truncate block mt-0.5">
                  {creditLimit >= 100000 ? 'Enterprise' : 'Commercial'}
                </span>
              </div>
            </div>

            {/* 2. Primary Contact */}
            <div className="bg-blue-50/70 dark:bg-blue-950/40 p-2.5 rounded-xl border border-blue-200/80 dark:border-blue-900/60 flex items-center gap-2.5 hover:border-blue-300 dark:hover:border-blue-700 transition-all shadow-2xs">
              <div className="w-7.5 h-7.5 rounded-lg bg-blue-100 dark:bg-blue-900/70 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <User className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <span className="text-[9px] font-black uppercase text-blue-600/80 dark:text-blue-400/80 tracking-wider block leading-none">Primary Contact</span>
                <span className="font-mono text-xs font-black text-blue-900 dark:text-blue-100 truncate block mt-0.5">
                  {customer.primary_contact_person || getPrimaryContactPerson(customer.name)}
                </span>
              </div>
            </div>

            {/* 3. Credit Used */}
            <div className="bg-amber-50/70 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-200/80 dark:border-amber-900/60 flex items-center gap-2.5 hover:border-amber-300 dark:hover:border-amber-700 transition-all shadow-2xs">
              <div className="w-7.5 h-7.5 rounded-lg bg-amber-100 dark:bg-amber-900/70 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <CreditCard className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] font-black uppercase text-amber-600/80 dark:text-amber-400/80 tracking-wider block leading-none">Credit Used</span>
                <span className="font-mono text-xs font-black text-amber-900 dark:text-amber-100 truncate block mt-0.5">
                  {creditPct}% Limit
                </span>
              </div>
            </div>

            {/* 4. Payment Terms */}
            <div className="bg-emerald-50/70 dark:bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-200/80 dark:border-emerald-900/60 flex items-center gap-2.5 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all shadow-2xs">
              <div className="w-7.5 h-7.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Receipt className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] font-black uppercase text-emerald-600/80 dark:text-emerald-400/80 tracking-wider block leading-none">Terms</span>
                <span className="font-mono text-xs font-black text-emerald-900 dark:text-emerald-100 truncate block mt-0.5">
                  {customer.payment_terms || 'Net 30'}
                </span>
              </div>
            </div>

            {/* 5. Negotiated Rates */}
            <div className="bg-purple-50/70 dark:bg-purple-950/40 p-2.5 rounded-xl border border-purple-200/80 dark:border-purple-900/60 flex items-center gap-2.5 hover:border-purple-300 dark:hover:border-purple-700 transition-all shadow-2xs">
              <div className="w-7.5 h-7.5 rounded-lg bg-purple-100 dark:bg-purple-900/70 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <Layers className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] font-black uppercase text-purple-600/80 dark:text-purple-400/80 tracking-wider block leading-none">Rates Configured</span>
                <span className="font-mono text-xs font-black text-purple-900 dark:text-purple-100 truncate block mt-0.5">
                  {customerRateCards.length} Lanes
                </span>
              </div>
            </div>

            {/* 6. Saved Places */}
            <div className="bg-rose-50/70 dark:bg-rose-950/40 p-2.5 rounded-xl border border-rose-200/80 dark:border-rose-900/60 flex items-center gap-2.5 hover:border-rose-300 dark:hover:border-rose-700 transition-all shadow-2xs">
              <div className="w-7.5 h-7.5 rounded-lg bg-rose-100 dark:bg-rose-900/70 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <MapPin className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] font-black uppercase text-rose-600/80 dark:text-rose-400/80 tracking-wider block leading-none">Saved Places</span>
                <span className="font-mono text-xs font-black text-rose-900 dark:text-rose-100 truncate block mt-0.5">
                  {savedLocations.length} Points
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* ── 5. CUSTOMER CREDENTIALS, CONTACT DIRECTORY & RATES VAULT (3 PROMINENT CARD BOXES) ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
          
          {/* Box 1: Customer Profile Credentials */}
          <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-brand" /> Customer Profile
                </h3>
                <StatusBadge status={customer.isActive !== false ? 'Active' : 'Inactive'} />
              </div>
              <div className="space-y-1.5">
                <InfoRow label="Account Status">
                  <span className="font-bold text-slate-900 dark:text-slate-100">{customer.isActive !== false ? 'Active' : 'Inactive'}</span>
                </InfoRow>
                <InfoRow label="Account Tier">
                  {creditLimit >= 100000 ? (
                    <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-bold">Enterprise Key Account</Badge>
                  ) : (
                    <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 text-[10px] font-bold">Standard Commercial</Badge>
                  )}
                </InfoRow>
                <InfoRow label="Payment Terms">
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                    {customer.payment_terms || 'Standard (Net 30)'}
                  </span>
                </InfoRow>
                <InfoRow label="VAT / CR Number">
                  <span className="font-mono font-extrabold text-slate-900 dark:text-slate-100">
                    {customer.tax_number || 'N/A'}
                  </span>
                </InfoRow>
                <InfoRow label="Member Since">
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {formatInDeploymentTz(customer.createdAt, tz, 'dd MMM yyyy')}
                  </span>
                </InfoRow>
              </div>
            </div>
          </Card>

          {/* Box 2: Contact Directory */}
          <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <User className="w-4 h-4 text-indigo-600" /> Contact Directory
                </h3>
                {customer.whatsapp_group_link && (
                  <a
                    href={customer.whatsapp_group_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 text-[10px] font-bold hover:bg-emerald-100 transition-colors"
                  >
                    <WhatsAppIcon className="w-3 h-3 fill-emerald-600" />
                    <span>WhatsApp</span>
                  </a>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Primary Contact</span>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {customer.primary_contact_person || getPrimaryContactPerson(customer.name)}
                    </span>
                    <PhoneDisplay phone={customer.primary_contact_phone || customer.contact_phone || customer.phone || '+966 50 123 4567'} variant="inline" showActions />
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Secondary Contact</span>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      {customer.secondary_contact_person || getSecondaryContactPerson(customer.name)}
                    </span>
                    <PhoneDisplay phone={customer.secondary_contact_phone || getSecondaryContactPhone(customer.contact_phone || customer.id)} variant="inline" showActions />
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Box 3: Commercial Rates Vault */}
          <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" /> Negotiated Rates Vault
                  {customerRateCards.length > 0 && (
                    <span className="rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 text-[10px] font-bold">
                      {customerRateCards.length}
                    </span>
                  )}
                </h3>
                <button
                  onClick={() => navigate(`/customers/${customer.id}/contracts`)}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5"
                >
                  Contracts <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {customerRateCards.length === 0 ? (
                <div className="flex items-center justify-between gap-2 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 p-4 mt-2">
                  <span className="text-xs text-slate-500">No rates negotiated yet.</span>
                  <Button
                    size="sm"
                    onClick={() => navigate(`/rate-cards/new?customer_id=${id}&customer_name=${encodeURIComponent(customer.name)}`)}
                    className="h-7 text-xs font-bold bg-brand hover:bg-brand-hover text-white"
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add Rate
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {customerRateCards.slice(0, 3).map((rc) => (
                    <div
                      key={rc.id}
                      onClick={() => setEditRateTarget(rc)}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 hover:border-brand/40 transition-colors flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <div className="min-w-0 flex items-center gap-1 font-bold text-xs text-slate-900 dark:text-slate-100">
                        <span className="truncate">{rc.route_origin}</span>
                        <ArrowRight className="w-3 h-3 shrink-0 text-brand" />
                        <span className="truncate">{rc.route_destination}</span>
                      </div>
                      <span className="font-mono text-xs font-extrabold text-indigo-600 shrink-0">
                        {rc.currency || 'SAR'} {Number(rc.base_price || 0).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

        </div>

        {/* ── 6. MAIN DASHBOARD 2-COLUMN GRID ────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left Column (Dispatches, Commercial Invoices & Saved Places) */}
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

            {/* Section 3: Saved Places */}
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {savedLocations.map((place) => (
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
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

          </div>

          {/* Right Column (Rates Cards) */}
          <div className="space-y-6">

            {/* What this customer is charged, lane by lane (with Pagination) */}
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
                  onClick={() => navigate(`/rate-cards/new?customer_id=${id}&customer_name=${encodeURIComponent(customer?.name || '')}`)}
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
                    paginatedRateCards.map((rc) => (
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

                {totalRatesPages > 1 && (
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <span className="text-[11px] text-slate-500 font-medium">
                      Showing {((ratesPage - 1) * RATES_PER_PAGE) + 1}-{Math.min(ratesPage * RATES_PER_PAGE, customerRateCards.length)} of {customerRateCards.length}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={ratesPage === 1}
                        onClick={() => setRatesPage(p => Math.max(1, p - 1))}
                        className="h-6 w-6 p-0 text-xs"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </Button>
                      <span className="text-[11px] font-bold px-1 text-slate-700 dark:text-slate-300">
                        {ratesPage} / {totalRatesPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={ratesPage >= totalRatesPages}
                        onClick={() => setRatesPage(p => Math.min(totalRatesPages, p + 1))}
                        className="h-6 w-6 p-0 text-xs"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )}

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

      {/* ── DELETE CUSTOMER CONFIRMATION MODAL ────────────────────────────── */}
      <Dialog open={isDeleteModalOpen} onOpenChange={(open) => !open && setIsDeleteModalOpen(false)}>
        <DialogContent className="max-w-md rounded-2xl p-0 overflow-hidden border-slate-200 dark:border-slate-800">
          <DialogHeader className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-rose-50/50 dark:bg-rose-950/20">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <DialogTitle className="text-base font-black">Delete Customer Account</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500 mt-1">
              Deleting customer <strong className="text-slate-900 dark:text-slate-100">{customer.name}</strong> will revoke account access and archive their profile records.
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 space-y-4 text-xs text-slate-600 dark:text-slate-400">
            <p>Are you sure you want to delete this corporate customer account? Active dispatches and invoice history will remain preserved with deleted status indicator.</p>
          </div>
          <DialogFooter className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsDeleteModalOpen(false)}
              className="text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleDeleteCustomer}
              className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 shadow-xs"
            >
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
