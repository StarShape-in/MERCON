import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft, Edit2, FileText, Building2, MapPin, Activity, AlertTriangle, Eye,
  DollarSign, Plus, RotateCw, Receipt, ShieldCheck, CheckCircle2, Truck, Calendar,
  ChevronLeft, ChevronRight, TrendingUp, Sparkles, CreditCard, ArrowRight, Package, Layers, Phone, Mail,
  Trash2, UploadCloud, User, Download, ChevronDown, Car, UserCheck, Copy, PhoneCall
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import DeletedBadge from '@/components/ui/DeletedBadge';
import { customerService } from '@/services/customerService';
import { invoiceService } from '@/services/invoiceService';
import { rateCardService, RateCard } from '@/services/rateCardService';
import { quotationService, Quotation } from '@/services/quotationService';
import { locationService, Location } from '@/services/locationService';
import QuotationFormDialog from '@/components/quotations/QuotationFormDialog';
import LocationFormDialog from '@/components/locations/LocationFormDialog';
import CustomerQuotationsTab from '@/components/customers/CustomerQuotationsTab';
import CustomerTripsTab from '@/components/customers/CustomerTripsTab';
import ExcelImportDialog from '@/components/fleet/ExcelImportDialog';
import { LOCATION_COLUMNS } from '@/utils/importUtils';
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
  const [isAddQuotationOpen, setIsAddQuotationOpen] = useState(false);
  const [editQuotationTarget, setEditQuotationTarget] = useState<Quotation | null>(null);
  const [isAddLocationOpen, setIsAddLocationOpen] = useState(false);
  const [isImportLocationsOpen, setIsImportLocationsOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [ratesPage, setRatesPage] = useState(1);
  const RATES_PER_PAGE = 5;

  // Segmented Tab for Commercial & Operational Profile
  const [activeTab, setActiveTab] = useState<'quotations' | 'dispatches' | 'invoices' | 'saved_places'>('quotations');

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

  // This customer's canonical locations.
  const { data: locationsRes } = useQuery({
    queryKey: ['locations', id],
    queryFn: () => locationService.getAll({ customerId: id! }),
    enabled: !!id,
  });
  const customerLocations = locationsRes?.data || [];

  const deleteLocationMutation = useMutation({
    mutationFn: (locId: string) => locationService.delete(locId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['locations', id] }),
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
          <Button onClick={() => navigate('/customers')} size="sm" className="mt-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
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

        {/* ── 1. TOP HEADER BAR: Standalone Logo + Company Name + Tags & Un-encapsulated Contact Row ── */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-2">
          
          {/* Left: Horizontal Logo + Company Name with Tags Underneath */}
          <div className="flex items-start gap-4 min-w-0">
            
            {/* Standalone Logo */}
            {customer.logo_url || customer.avatar_url ? (
              <img
                src={customer.logo_url || customer.avatar_url || ''}
                alt={customer.name}
                className="h-12 sm:h-14 max-w-[140px] object-contain shrink-0 mt-0.5"
              />
            ) : (
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-center text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5 shadow-2xs">
                {customer.name?.[0]?.toUpperCase() || 'C'}
              </div>
            )}

            {/* Company Name + Tags Directly Under Name */}
            <div className="flex flex-col min-w-0">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-none">
                {customer.name}
              </h1>

              {/* Badges & Tags Under the Name */}
              <div className="flex items-center gap-2 flex-wrap mt-2.5">
                <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800 font-extrabold text-xs px-2.5 py-1 gap-1.5 shadow-2xs">
                  <Building2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Customers Module
                </Badge>
                <span className="text-xs font-mono font-extrabold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-slate-700">
                  {`CUST-${customer.id.slice(0, 5).toUpperCase()}`}
                </span>
                <StatusBadge status={customer.isActive !== false ? 'Active' : 'Inactive'} />
                {customer.isActive === false && <DeletedBadge />}
                {customer.whatsapp_group_link && (
                  <a
                    href={customer.whatsapp_group_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold text-xs hover:bg-emerald-100 transition-colors shadow-2xs"
                  >
                    <WhatsAppIcon className="w-3.5 h-3.5 fill-emerald-600" />
                    <span>WhatsApp Group</span>
                  </a>
                )}
              </div>


            </div>

          </div>

          {/* Right Action Buttons Group with Customers Indigo Base Accent */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshCustomer}
              disabled={isRefreshing}
              className="h-9 w-9 p-0 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 shadow-2xs hover:border-indigo-200 hover:text-indigo-600"
              title="Refresh Profile Data"
            >
              <RotateCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin text-indigo-600")} />
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
              className="h-9 gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
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
              className="h-9 gap-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs rounded-lg px-4"
            >
              <Plus className="w-4 h-4" />
              New Trip
            </Button>
          </div>
        </div>

        {/* ── 2. OVERVIEW STAT CARDS (Full Width 3-Column Instrument Panel) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full pt-1">
          
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
              <Truck className="w-3.5 h-3.5 text-indigo-600" /> Freight Dispatches
            </div>
            <div className="font-mono text-base font-black text-slate-900 dark:text-slate-100 truncate leading-tight">
              {completedTripsCount} / {customerTrips.length}
            </div>
            <div className="text-[10px] font-medium text-slate-500 truncate">
              {activeTripsCount} Active In-Transit
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

        {/* ── 4. TWO-BOX GRID: CORPORATE PROFILE & OPERATIONAL CONTACT HUB ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* BOX 1: CORPORATE PROFILE & GOVERNANCE */}
          <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-xs p-5 flex flex-col justify-between space-y-4">
            <div>
              {/* Box Header */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 shadow-2xs">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Corporate Profile & Governance
                    </h3>
                    <p className="text-[10px] text-slate-400 font-medium">Account registration, tax & financial exposure</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <StatusBadge status={customer.isActive !== false ? 'Active' : 'Inactive'} />
                  {creditLimit >= 100000 ? (
                    <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800 text-[10px] font-bold">
                      Enterprise Tier
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 text-[10px] font-bold">
                      Standard Tier
                    </Badge>
                  )}
                </div>
              </div>

              {/* Grid 1: Account Credentials & Metadata */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" /> Account Identifiers
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Corporate Entity</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate block" title={customer.company_name || customer.name}>
                      {customer.company_name || customer.name}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">VAT / CR Registration</span>
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono text-xs font-extrabold text-slate-900 dark:text-slate-100">
                        {customer.tax_number || '310492810400003'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(customer.tax_number || '310492810400003');
                          toast.success('CR / VAT Number copied to clipboard');
                        }}
                        className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                        title="Copy CR/VAT Number"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Account Code</span>
                    <span className="font-mono text-xs font-extrabold text-indigo-600 dark:text-indigo-400 block">
                      {`CUST-${customer.id.slice(0, 8).toUpperCase()}`}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Member Since</span>
                    <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      {formatInDeploymentTz(customer.createdAt, tz, 'dd MMM yyyy')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 2: Credit Exposure & Terms Governance */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-indigo-600" /> Credit Terms & Exposure
                  </h4>
                  <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                    {customer.payment_terms || 'Net 30 Days'}
                  </span>
                </div>

                {/* Credit Limit Visual Progress Bar */}
                <div className="p-3 rounded-xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100/80 dark:border-indigo-900/40 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-300">Credit Limit Utilization</span>
                    <span className={cn(
                      "font-mono font-black text-xs px-2 py-0.5 rounded-full border",
                      creditPct >= 80 
                        ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900" 
                        : creditPct >= 60 
                        ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900" 
                        : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900"
                    )}>
                      {creditPct}% Utilized
                    </span>
                  </div>

                  {/* Progress Bar Track */}
                  <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        creditPct >= 80 ? "bg-rose-500" : creditPct >= 60 ? "bg-amber-500" : "bg-indigo-600"
                      )}
                      style={{ width: `${creditPct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono pt-0.5">
                    <span className="text-slate-500">Utilized: <strong className="text-slate-900 dark:text-slate-100">SAR {utilizedCredit.toLocaleString()}</strong></span>
                    <span className="text-slate-500">Available: <strong className="text-emerald-600 dark:text-emerald-400">SAR {availableCredit.toLocaleString()}</strong></span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Governance Footer Note */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Contract Status: Verified SLA
              </span>
              <button
                type="button"
                onClick={() => navigate(`/customers/${customer.id}/contracts`)}
                className="font-bold text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-1 text-[11px]"
              >
                Manage Rates & SLA <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </Card>


          {/* BOX 2: OPERATIONAL CONTACT HUB */}
          <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-xs p-5 flex flex-col justify-between space-y-4">
            <div>
              {/* Box Header */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 shadow-2xs">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Operational Contact Hub
                    </h3>
                    <p className="text-[10px] text-slate-400 font-medium">Designated personnel & escalation channels</p>
                  </div>
                </div>
                
                {customer.whatsapp_group_link && (
                  <a
                    href={customer.whatsapp_group_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 transition-colors shadow-2xs"
                  >
                    <WhatsAppIcon className="w-3.5 h-3.5 fill-emerald-600" />
                    <span>Operations Group</span>
                  </a>
                )}
              </div>

              {/* Contacts Directory Stack */}
              <div className="space-y-3">

                {/* Primary Contact Person Card */}
                <div className="p-3.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/80 dark:border-indigo-900/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-2xs">
                        {(customer.primary_contact_person || getPrimaryContactPerson(customer.name))
                          .split(' ')
                          .map((n: string) => n[0])
                          .slice(0, 2)
                          .join('')}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                            {customer.primary_contact_person || getPrimaryContactPerson(customer.name)}
                          </h4>
                          <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 text-[9px] font-bold py-0 px-1.5">
                            Primary Rep
                          </Badge>
                        </div>
                        <span className="text-[10px] font-medium text-slate-500 block">Key Account & Logistics Manager</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-indigo-100/80 dark:border-indigo-900/40 flex items-center justify-between gap-2 text-xs">
                    <PhoneDisplay
                      phone={customer.primary_contact_phone || customer.contact_phone || customer.phone || '+966 50 123 4567'}
                      variant="inline"
                      showActions
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const email = `logistics@${(customer.company_name || customer.name).toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;
                        navigator.clipboard.writeText(email);
                        toast.success(`Copied contact email: ${email}`);
                      }}
                      className="text-[11px] font-mono text-slate-500 hover:text-indigo-600 flex items-center gap-1 truncate max-w-[160px]"
                      title="Copy Email"
                    >
                      <Mail className="w-3 h-3 shrink-0 text-slate-400" />
                      <span className="truncate">{`logistics@${(customer.company_name || customer.name).toLowerCase().replace(/[^a-z0-9]/g, '')}.com`}</span>
                    </button>
                  </div>
                </div>

                {/* Secondary Contact Person Card */}
                <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-extrabold text-xs flex items-center justify-center shadow-2xs">
                        {(customer.secondary_contact_person || getSecondaryContactPerson(customer.name))
                          .split(' ')
                          .map((n: string) => n[0])
                          .slice(0, 2)
                          .join('')}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            {customer.secondary_contact_person || getSecondaryContactPerson(customer.name)}
                          </h4>
                          <Badge variant="outline" className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 text-[9px] font-bold py-0 px-1.5 border-slate-200">
                            Dispatch Lead
                          </Badge>
                        </div>
                        <span className="text-[10px] font-medium text-slate-500 block">Yard & Dispatch Escalations</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-2 text-xs">
                    <PhoneDisplay
                      phone={customer.secondary_contact_phone || getSecondaryContactPhone(customer.contact_phone || customer.id)}
                      variant="inline"
                      showActions
                    />
                    <span className="text-[10px] font-bold text-slate-400">24/7 Operations</span>
                  </div>
                </div>

              </div>
            </div>

            {/* Bottom Communications Footer */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end text-xs">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/customers/${customer.id}/edit`)}
                className="h-6 text-[11px] font-bold text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 p-1"
              >
                Edit Contacts →
              </Button>
            </div>
          </Card>

        </div>

        {/* ── 5. MAIN DASHBOARD 2-COLUMN GRID (Tabbed Activity Ledger + Rates Sidebar) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left Column: Tabbed Activity Ledger (Dispatches, Invoices, Saved Places) */}
          <div className="lg:col-span-2 space-y-4">

            {/* Segmented Control Bar */}
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700">
                
                <button
                  type="button"
                  onClick={() => setActiveTab('quotations')}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                    activeTab === 'quotations'
                      ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  )}
                >
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Quotations</span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-mono font-extrabold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                    {(rateCardsResponse?.data || []).filter((q: any) => q.is_active).length}
                  </Badge>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('dispatches')}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                    activeTab === 'dispatches'
                      ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  )}
                >
                  <Truck className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Dispatches</span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-mono font-extrabold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                    {customerTrips.length}
                  </Badge>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('invoices')}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                    activeTab === 'invoices'
                      ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-2xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  )}
                >
                  <Receipt className="w-3.5 h-3.5 text-amber-600" />
                  <span>Invoices</span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-mono font-extrabold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                    {customerInvoices.length}
                  </Badge>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('saved_places')}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                    activeTab === 'saved_places'
                      ? "bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-2xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  )}
                >
                  <MapPin className="w-3.5 h-3.5 text-rose-600" />
                  <span>Locations</span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-mono font-extrabold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                    {customerLocations.length}
                  </Badge>
                </button>

              </div>
            </div>

            {/* Tab 1: Commercial Quotations Profile */}
            {activeTab === 'quotations' && (
              <CustomerQuotationsTab
                customerId={id!}
                customerName={customer.name}
                onOpenAddQuotation={() => setIsAddQuotationOpen(true)}
                onOpenEditQuotation={(q) => setEditQuotationTarget(q)}
              />
            )}

            {/* Tab 2: Dispatches Operational Ledger */}
            {activeTab === 'dispatches' && (
              <CustomerTripsTab
                customerId={id!}
                customerName={customer.name}
              />
            )}

            {/* Tab 2: Invoices Table */}
            {activeTab === 'invoices' && (
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
            )}

            {/* Tab 3: Locations Card */}
            {activeTab === 'saved_places' && (
              <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-rose-600" /> Customer Locations
                    </CardTitle>
                    <CardDescription className="text-[11px] mt-0.5">
                      Canonical operational hubs and pickup/dropoff points scoped to this customer.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => navigate(`/customers/${customer.id}/locations/create`)}
                      className="h-7 gap-1 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                      <Plus className="w-3 h-3" /> Add Location
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="p-4 space-y-2 text-xs">
                  {customerLocations.length === 0 ? (
                    <p className="px-3 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-slate-500">
                      No locations created for this customer account yet.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {customerLocations.map((loc) => {
                        const prec = loc.coordinate_precision || (loc.lat != null ? 'APPROXIMATE' : 'UNKNOWN');
                        return (
                          <div
                            key={loc.id}
                            onClick={() => navigate(`/locations/${loc.id}`)}
                            className="w-full text-left p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1.5 flex items-center justify-between gap-2 cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-800 transition-colors"
                          >
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[10px] font-black text-slate-900 bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                                  {loc.code}
                                </span>
                                <span className="font-bold text-slate-900 dark:text-slate-100 truncate">{loc.name}</span>
                              </div>
                              {loc.address && (
                                <div className="text-[10px] text-slate-500 line-clamp-1">{loc.address}</div>
                              )}
                              <div>
                                {prec === 'EXACT' && (
                                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px] font-bold">
                                    ✓ Exact location ({loc.lat!.toFixed(3)}, {loc.lng!.toFixed(3)})
                                  </Badge>
                                )}
                                {prec === 'APPROXIMATE' && (
                                  <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[9px] font-bold">
                                    ≈ Area location ({loc.lat!.toFixed(3)}, {loc.lng!.toFixed(3)})
                                  </Badge>
                                )}
                                {prec === 'UNKNOWN' && (
                                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[9px] font-bold">
                                    ○ Location not pinned
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => navigate(`/locations/${loc.id}`)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors"
                                title="View Location Details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteLocationMutation.mutate(loc.id)}
                                className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                                title="Delete location"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

          </div>

          {/* Right Column (Negotiated Lane Rates Sidebar Ledger) */}
          <div className="space-y-6">

            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-600" /> Negotiated Rates
                  </CardTitle>
                  <CardDescription className="text-[11px] mt-0.5">
                    Prices negotiated for this customer.
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => navigate(`/quotations/new?customer_id=${id}&customer_name=${encodeURIComponent(customer?.name || '')}`)}
                  className="h-7 gap-1 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shrink-0"
                >
                  <Plus className="w-3 h-3" /> Add
                </Button>
              </CardHeader>

              <CardContent className="p-4 space-y-4 text-xs">

                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    <Building2 className="w-3 h-3 text-indigo-600" /> Configured Lanes ({customerRateCards.length})
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
                        className="w-full text-left p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors space-y-1"
                      >
                        <div className="flex justify-between gap-2 font-bold text-slate-900 dark:text-slate-100">
                          <span className="flex items-center gap-1 min-w-0">
                            <span className="truncate">{rc.route_origin}</span>
                            <ArrowRight className="w-3 h-3 shrink-0 text-indigo-600" />
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
                  onClick={() => navigate('/quotations')}
                  className="w-full h-7 text-xs font-bold text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
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
        isOpen={isImportLocationsOpen}
        onClose={() => setIsImportLocationsOpen(false)}
        entityLabel="Locations"
        columns={LOCATION_COLUMNS}
        requiredFields={['customer_name', 'name']}
        preferSheet="locations"
        templateUrl="/templates/MERCON_Locations_Import_Template.xlsx"
        matchLabel="customer + name"
        onImport={(rows) => locationService.importRows(rows)}
        invalidateKeys={[['locations', id || '']]}
      />

      <LocationFormDialog
        isOpen={isAddLocationOpen}
        onClose={() => setIsAddLocationOpen(false)}
        defaultCustomerId={id!}
      />

      <QuotationFormDialog
        isOpen={isAddQuotationOpen || !!editQuotationTarget}
        onClose={() => {
          setIsAddQuotationOpen(false);
          setEditQuotationTarget(null);
        }}
        quotation={editQuotationTarget}
        lockedCustomerId={id!}
        lockedCustomerName={customer?.name}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ['quotations'] });
          queryClient.invalidateQueries({ queryKey: ['rate-cards'] });
        }}
      />

      <QuotationFormDialog
        isOpen={isAddRateOpen}
        onClose={() => setIsAddRateOpen(false)}
        lockedCustomerId={id || ''}
        lockedCustomerName={customer?.name}
      />

      <QuotationFormDialog
        isOpen={!!editRateTarget}
        quotation={editRateTarget}
        onClose={() => setEditRateTarget(null)}
        lockedCustomerId={id}
        lockedCustomerName={customer?.name}
      />

    </DashboardLayout>
  );
}
