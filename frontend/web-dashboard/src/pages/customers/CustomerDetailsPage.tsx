import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft, Edit2, FileText, Building2, MapPin, Activity, AlertTriangle, Eye,
  Plus, RotateCw, ShieldCheck, CheckCircle2, Truck, Calendar,
  ChevronLeft, ChevronRight, TrendingUp, Sparkles, CreditCard, ArrowRight, Package, Layers, Phone, Mail,
  Trash2, UploadCloud, User, Download, ChevronDown, Car, UserCheck, Copy, PhoneCall,
  MoreVertical, Award, FolderOpen, Banknote, Gauge
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import DeletedBadge from '@/components/ui/DeletedBadge';
import { customerService } from '@/services/customerService';
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
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
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
  const [activeTab, setActiveTab] = useState<'quotations' | 'dispatches' | 'saved_places'>('quotations');

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
          <AlertTriangle className="w-8 h-8 text-rose-600 shrink-0" />
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

  const customerRateCards = rateCardsResponse?.data || [];
  const totalRatesPages = Math.ceil(customerRateCards.length / RATES_PER_PAGE) || 1;
  const paginatedRateCards = customerRateCards.slice((ratesPage - 1) * RATES_PER_PAGE, ratesPage * RATES_PER_PAGE);



  // Trips Overview Filter State (This Week vs Month vs All)
  const [tripsOverviewFilter, setTripsOverviewFilter] = useState<'week' | 'month' | 'all'>('all');

  // Trips data breakdown
  const customerTrips = customer.trips || [];
  const completedTripsCount = customerTrips.filter((t: any) => t.status === 'Completed' || t.status === 'Delivered').length;
  const inTransitTripsCount = customerTrips.filter((t: any) => ['InTransit', 'AtPickup', 'AtDelivery', 'Loading'].includes(t.status)).length;
  const dispatchedTripsCount = customerTrips.filter((t: any) => ['Dispatched', 'Scheduled', 'Draft'].includes(t.status)).length;
  const activeTripsCount = customerTrips.filter((t: any) => ['Dispatched', 'AtPickup', 'InTransit', 'AtDelivery'].includes(t.status)).length;
  
  const totalTripsCount = customerTrips.length || 0;
  const deliveredPct = totalTripsCount > 0 ? Math.round((completedTripsCount / totalTripsCount) * 100) : 0;
  const inTransitPct = totalTripsCount > 0 ? Math.round((inTransitTripsCount / totalTripsCount) * 100) : 0;
  const dispatchedPct = totalTripsCount > 0 ? Math.round((dispatchedTripsCount / totalTripsCount) * 100) : 0;

  // On-time trips calculation
  const onTimeTripsCount = customerTrips.filter((t: any) => !t.is_delayed && t.status !== 'Delayed').length;
  const onTimeRatio = totalTripsCount > 0 ? Math.round((onTimeTripsCount / totalTripsCount) * 100) : 95;

  // Commercial Revenue from Trips
  const totalTripRevenue = customerTrips.reduce((acc: number, t: any) => {
    const rate = Number(t.financials?.agreed_rate ?? t.agreed_rate ?? t.billing_rate ?? 0);
    return acc + (isNaN(rate) ? 0 : rate);
  }, 0);

  // Operational Contact Reps
  const primaryRep = {
    name: customer.primary_contact_person || getPrimaryContactPerson(customer.name),
    phone: customer.primary_contact_phone || customer.contact_phone || customer.phone || '+966 55 148 8497',
    email: `logistics@${customer.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
    role: 'Key Account & Logistics Manager',
    tag: 'Primary Rep'
  };

  const secondaryRep = {
    name: customer.secondary_contact_person || getSecondaryContactPerson(customer.name),
    phone: customer.secondary_contact_phone || getSecondaryContactPhone(customer.contact_phone || customer.id),
    role: 'Yard & Dispatch Escalations',
    tag: 'Dispatch Lead'
  };

  const handleExportLedger = async () => {
    if (!customerTrips || customerTrips.length === 0) return;
    
    const headers = [
      'S/L', 'DATE', 'JOB #', 'DRIVER NAME', 'VEHICLE NO:', 'VEHICLE TYPE',
      'MOBILE NUMBER', 'ASTOOL AL SHAHLA OR 3RD PARTY', 'SENDER/CUSTOMER',
      'RECEIVER', 'EXTRA CHARGES', 'BILLING RATE',
      'TOTAL AMOUNT', 'DRIVER CHARGE', 'BALANCE', 'COMPANY NAME'
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
      <div className="p-3.5 2xl:p-4 max-w-[1600px] mx-auto w-full min-h-[calc(100vh-76px)] flex flex-col overflow-y-auto bg-[#EEF1F6]/50 dark:bg-slate-950 gap-4">
        
        {/* ── COMPACT PAGE HEADER BAR ── */}
        <div className="flex items-center justify-between pb-1 shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/customers')}
              className="h-8 px-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 shadow-2xs hover:bg-slate-100 flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </Button>
            <div className="h-4 w-px bg-slate-300 dark:bg-slate-700" />
            <h1 className="text-base 2xl:text-lg font-black text-[#3E3C3D] dark:text-white tracking-tight">
              Customer Details
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-xl w-8 h-8 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:bg-slate-100">
                  <MoreVertical className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-xl z-50">
                <DropdownMenuItem onClick={refreshCustomer} disabled={isRefreshing} className="font-semibold cursor-pointer text-xs">
                  <RotateCw className={cn("w-3.5 h-3.5 mr-2", isRefreshing && "animate-spin text-[#FA634E]")} />
                  Refresh Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportLedger} disabled={customerTrips.length === 0} className="font-semibold cursor-pointer text-xs">
                  <Download className="w-3.5 h-3.5 mr-2 text-slate-500" />
                  Export Ledger (Excel)
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setIsDeleteModalOpen(true)} className="text-rose-600 font-semibold cursor-pointer text-xs">
                  <Trash2 className="w-3.5 h-3.5 mr-2" />
                  Delete Account
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              onClick={() => navigate(`/customers/${customer.id}/edit`)}
              className="bg-[#3E3C3D] hover:bg-slate-900 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" /> Edit Profile
            </Button>

            <Button
              onClick={() => navigate(`/trips/new?customerId=${id}`)}
              className="bg-[#FA634E] hover:bg-[#e0523d] text-white font-bold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> New Trip
            </Button>
          </div>
        </div>

        {/* ── 3-COLUMN BENTO SYSTEM ── */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 w-full">
          
          {/* ════════════════════════════════════════════════
              COLUMN 1 (LEFT): Profile & Corporate Governance
             ════════════════════════════════════════════════ */}
          <div className="col-span-12 xl:col-span-3 flex flex-col gap-4">
            
            {/* 1.1 CUSTOMER PROFILE HERO CARD */}
            <div className="rounded-[24px] bg-[#E8F0F8] dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 px-4 pt-4 pb-1.5 flex flex-col justify-between shadow-2xs relative overflow-hidden min-h-[250px] group">
              
              {/* Floating Status Badge */}
              <div className="absolute top-4 right-4 flex items-center justify-end z-10">
                <span className={cn(
                  "px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1.5 shadow-sm border",
                  customer.isActive !== false
                    ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/40"
                    : "bg-slate-100 text-slate-600 border-slate-200"
                )}>
                  <span className={cn("w-1.5 h-1.5 rounded-full", customer.isActive !== false ? "bg-emerald-500" : "bg-slate-400")} />
                  {customer.isActive !== false ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* Center Logo / Avatar Monogram */}
              <div className="w-full flex items-center justify-center pt-3 pb-2 z-0">
                {customer.logo_url ? (
                  <div className="w-32 h-32 rounded-full border-4 border-white shadow-xl bg-white dark:bg-slate-800 flex items-center justify-center overflow-hidden p-3">
                    <img
                      src={customer.logo_url}
                      alt={customer.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-32 h-32 rounded-full border-4 border-white shadow-xl bg-indigo-600 text-white flex items-center justify-center text-4xl font-black shadow-inner">
                    {customer.name?.[0]?.toUpperCase() || 'C'}
                  </div>
                )}
              </div>

              {/* Bottom White Info Box (Floating over card) */}
              <div className="relative z-10 bg-[#F8F9FA] dark:bg-slate-950 rounded-[20px] px-3.5 py-2.5 flex items-center justify-between shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-200/50 dark:border-slate-800 w-full mt-auto">
                <div className="min-w-0 pr-2 flex-1 flex flex-col justify-center">
                  <h2 className="text-xs 2xl:text-sm font-black text-slate-900 dark:text-white leading-tight break-words">
                    {customer.name}
                  </h2>
                  <p className="text-[10px] 2xl:text-[11px] font-mono font-bold text-slate-400 mt-0.5">
                    CUST - {customer.id.slice(0, 8).toUpperCase()}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 pl-1">
                  <a
                    href={`tel:${primaryRep.phone}`}
                    className="w-8 h-8 2xl:w-9 2xl:h-9 rounded-full bg-slate-200/70 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-slate-300 transition-colors"
                    title={`Call: ${primaryRep.phone}`}
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                  <a
                    href={`mailto:${primaryRep.email}`}
                    className="w-8 h-8 2xl:w-9 2xl:h-9 rounded-full bg-[#1A1A1A] dark:bg-slate-700 flex items-center justify-center text-white hover:bg-black transition-colors shadow-md"
                    title={`Email: ${primaryRep.email}`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                  </a>
                  {customer.whatsapp_group_link && (
                    <a
                      href={customer.whatsapp_group_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 2xl:w-9 2xl:h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 transition-colors shadow-md"
                      title="WhatsApp Operations Group"
                    >
                      <WhatsAppIcon className="w-4 h-4 fill-white" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* 1.2 CORPORATE PROFILE & GOVERNANCE */}
            <div className="rounded-[24px] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 2xl:p-5 flex flex-col justify-between shadow-[0_8px_30px_rgb(0,0,0,0.04)] gap-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-[#3E3C3D] text-white flex items-center justify-center shadow-2xs">
                    <Building2 className="w-3.5 h-3.5 text-[#FA634E]" />
                  </div>
                  <h3 className="text-xs font-black text-[#3E3C3D] dark:text-white uppercase tracking-wider">
                    Corporate Profile
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" /> Verified SLA
                </span>
              </div>

              <div className="space-y-2.5">
                <div className="p-2.5 rounded-xl bg-[#F8F9FA] dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Corporate Entity</span>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate block">
                    {customer.name}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-[#F8F9FA] dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">VAT / CR Registration</span>
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono text-xs font-extrabold text-slate-900 dark:text-slate-100">
                      {(customer as any).tax_number || '310492810400003'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText((customer as any).tax_number || '310492810400003');
                        toast.success('CR / VAT Number copied to clipboard');
                      }}
                      className="p-1 rounded text-slate-400 hover:text-[#FA634E] hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="Copy CR/VAT Number"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl bg-[#F8F9FA] dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Account Code</span>
                    <span className="font-mono text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 block">
                      {`CUST-${customer.id.slice(0, 8).toUpperCase()}`}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#F8F9FA] dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Member Since</span>
                    <span className="font-mono text-[11px] font-bold text-slate-800 dark:text-slate-200 block">
                      {formatInDeploymentTz(customer.createdAt, tz, 'dd MMM yyyy')}
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-[#F8F9FA] dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Default Driver Workflow</span>
                    <span className="text-xs font-black text-slate-900 dark:text-slate-100 mt-0.5 block">
                      {customer.driver_workflow === 'EXTERNAL_APP' ? 'External Customer App' : 'Native CargoPod App'}
                    </span>
                  </div>
                  <Badge className={cn(
                    "text-[10px] font-bold px-2 py-0.5 border",
                    customer.driver_workflow === 'EXTERNAL_APP'
                      ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300"
                      : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300"
                  )}>
                    {customer.driver_workflow === 'EXTERNAL_APP' ? 'Screenshot AI' : 'Standard'}
                  </Badge>
                </div>
              </div>

              {customer.whatsapp_group_link && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <a
                    href={customer.whatsapp_group_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-1.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/70 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <WhatsAppIcon className="w-3.5 h-3.5 fill-emerald-600" />
                    <span>Open WhatsApp Operations Group</span>
                  </a>
                </div>
              )}
            </div>

          </div>

          {/* ════════════════════════════════════════════════
              COLUMN 2 (MIDDLE): Commercial & Trips Overview + Rates
             ════════════════════════════════════════════════ */}
          <div className="col-span-12 xl:col-span-5 flex flex-col gap-4">
            
            {/* 2.1 TRIPS OVERVIEW */}
            <div className="rounded-[24px] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 2xl:p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-3">
              {/* Header Bar */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div
                  onClick={() => setActiveTab('dispatches')}
                  className="flex items-center gap-2.5 cursor-pointer group/title"
                  title="Click to view full trips ledger"
                >
                  <div className="w-8 h-8 rounded-xl bg-[#3E3C3D] dark:bg-slate-800 text-white flex items-center justify-center shadow-2xs group-hover/title:bg-[#FA634E] transition-colors">
                    <TrendingUp className="w-4 h-4 text-[#FA634E] group-hover/title:text-white" />
                  </div>
                  <div>
                    <h3 className="text-xs 2xl:text-sm font-black text-[#3E3C3D] dark:text-white uppercase tracking-wider leading-none group-hover/title:text-[#FA634E] flex items-center gap-1 transition-colors">
                      Trips Overview <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover/title:text-[#FA634E]" />
                    </h3>
                  </div>
                </div>
                
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200/60 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setTripsOverviewFilter('week')}
                    className={cn(
                      "px-2.5 py-1 text-[10px] font-black rounded-lg transition-all cursor-pointer",
                      tripsOverviewFilter === 'week'
                        ? "text-slate-900 dark:text-white bg-white dark:bg-slate-900 shadow-2xs"
                        : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    )}
                  >
                    This Week
                  </button>
                  <button
                    type="button"
                    onClick={() => setTripsOverviewFilter('month')}
                    className={cn(
                      "px-2.5 py-1 text-[10px] font-black rounded-lg transition-all cursor-pointer",
                      tripsOverviewFilter === 'month'
                        ? "text-slate-900 dark:text-white bg-white dark:bg-slate-900 shadow-2xs"
                        : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    )}
                  >
                    Month
                  </button>
                  <button
                    type="button"
                    onClick={() => setTripsOverviewFilter('all')}
                    className={cn(
                      "px-2.5 py-1 text-[10px] font-black rounded-lg transition-all cursor-pointer",
                      tripsOverviewFilter === 'all'
                        ? "text-slate-900 dark:text-white bg-white dark:bg-slate-900 shadow-2xs"
                        : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    )}
                  >
                    All Time
                  </button>
                </div>
              </div>

              {/* Status Pipeline Breakdown Strip */}
              <div className="bg-[#F8F9FA] dark:bg-slate-950 p-2.5 rounded-[16px] border border-slate-200/50 dark:border-slate-800/60 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-bold">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveTab('dispatches')}
                      className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      {completedTripsCount} Delivered ({deliveredPct}%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('dispatches')}
                      className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      {inTransitTripsCount} In Transit ({inTransitPct}%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('dispatches')}
                      className="flex items-center gap-1 text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                    >
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      {dispatchedTripsCount} Dispatched ({dispatchedPct}%)
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('dispatches')}
                    className="text-slate-400 font-semibold hover:text-slate-700 hover:underline cursor-pointer"
                  >
                    {totalTripsCount} Total Dispatches
                  </button>
                </div>

                {/* Multi-Segment Status Bar */}
                <div className="h-2 w-full bg-slate-200/70 dark:bg-slate-800 rounded-full overflow-hidden flex gap-0.5 p-0.5">
                  <div
                    className="h-full bg-emerald-500 rounded-full cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ width: `${Math.max(deliveredPct, totalTripsCount === 0 ? 0 : 5)}%` }}
                    title={`${deliveredPct}% Delivered`}
                    onClick={() => setActiveTab('dispatches')}
                  />
                  <div
                    className="h-full bg-blue-500 rounded-full cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ width: `${Math.max(inTransitPct, 0)}%` }}
                    title={`${inTransitPct}% In Transit`}
                    onClick={() => setActiveTab('dispatches')}
                  />
                  <div
                    className="h-full bg-amber-500 rounded-full cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ width: `${Math.max(dispatchedPct, 0)}%` }}
                    title={`${dispatchedPct}% Dispatched`}
                    onClick={() => setActiveTab('dispatches')}
                  />
                </div>
              </div>

              {/* 4 Bento Metric Cards */}
              <div className="grid grid-cols-4 gap-3">
                {/* 1. Total Dispatches (Blue Theme) */}
                <div className="p-3.5 rounded-[18px] bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 flex flex-col justify-between shadow-2xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-bold text-blue-900/70 dark:text-blue-300 uppercase tracking-wider">Dispatches</span>
                    <div className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <Truck className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl 2xl:text-3xl font-black text-blue-950 dark:text-white leading-none">{totalTripsCount}</div>
                    <div className="mt-2.5 pt-1.5 border-t border-blue-200/50 dark:border-blue-900/40 flex items-center">
                      <span className="text-[9px] font-bold text-blue-700 dark:text-blue-300 bg-blue-100/80 dark:bg-blue-900/50 px-2 py-0.5 rounded-full border border-blue-200/60 truncate">
                        {completedTripsCount} Delivered
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. On-Time / SLA (Emerald Green Theme) */}
                <div className="p-3.5 rounded-[18px] bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 flex flex-col justify-between shadow-2xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-bold text-emerald-900/70 dark:text-emerald-300 uppercase tracking-wider">On-Time</span>
                    <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl 2xl:text-3xl font-black text-emerald-700 dark:text-emerald-400 leading-none">{onTimeRatio}%</div>
                    <div className="mt-2.5 pt-1.5 border-t border-emerald-200/50 dark:border-emerald-900/40 flex items-center">
                      <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-900/50 px-2 py-0.5 rounded-full border border-emerald-200/60 truncate">
                        {onTimeTripsCount} / {totalTripsCount} On-Time
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Total Commercial Revenue (Coral Red Theme) */}
                <div className="p-3.5 rounded-[18px] bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 flex flex-col justify-between shadow-2xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-bold text-rose-900/70 dark:text-rose-300 uppercase tracking-wider">Revenue</span>
                    <div className="w-7 h-7 rounded-xl bg-[#FA634E] text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <Banknote className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div>
                    <div className="text-xs 2xl:text-sm font-black text-[#FA634E] dark:text-rose-400 leading-none truncate">
                      SAR {totalTripRevenue.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                    </div>
                    <div className="mt-2.5 pt-1.5 border-t border-rose-200/50 dark:border-rose-900/40 flex items-center">
                      <span className="text-[9px] font-bold text-[#FA634E] dark:text-rose-300 bg-rose-100/80 dark:bg-rose-900/50 px-2 py-0.5 rounded-full border border-rose-200/60 truncate">
                        {completedTripsCount} Completed Trips
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4. Configured Lanes (Indigo Theme) */}
                <div className="p-3.5 rounded-[18px] bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/40 flex flex-col justify-between shadow-2xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-bold text-indigo-900/70 dark:text-indigo-300 uppercase tracking-wider">Lanes</span>
                    <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <Gauge className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div>
                    <div className="text-xl 2xl:text-2xl font-black text-indigo-950 dark:text-white leading-none">
                      {customerRateCards.length}
                    </div>
                    <div className="mt-2.5 pt-1.5 border-t border-indigo-200/50 dark:border-indigo-900/40 flex items-center">
                      <span className="text-[9px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100/80 dark:bg-indigo-900/50 px-2 py-0.5 rounded-full border border-indigo-200/60 truncate">
                        {customerLocations.length} Saved Hubs
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2.2 NEGOTIATED LANE RATES CARD */}
            <div className="rounded-[24px] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 2xl:p-5 flex flex-col justify-between shadow-[0_8px_30px_rgb(0,0,0,0.04)] gap-3 min-h-[220px]">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-[#3E3C3D] text-white flex items-center justify-center shadow-2xs">
                    <Layers className="w-3.5 h-3.5 text-[#FA634E]" />
                  </div>
                  <div>
                    <h3 className="text-xs 2xl:text-sm font-black text-[#3E3C3D] dark:text-white uppercase tracking-wider leading-none">
                      Negotiated Rates
                    </h3>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant="secondary" className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                    {customerRateCards.length} Configured
                  </Badge>
                  <Button
                    size="sm"
                    onClick={() => navigate(`/quotations/new?customer_id=${id}&customer_name=${encodeURIComponent(customer?.name || '')}`)}
                    className="h-7 px-2.5 gap-1 text-[11px] font-bold bg-[#FA634E] hover:bg-[#e0523d] text-white shadow-2xs rounded-lg"
                  >
                    <Plus className="w-3 h-3" /> Add
                  </Button>
                </div>
              </div>

              {/* Configured Lanes List */}
              <div className="space-y-2 flex-1">
                {customerRateCards.length === 0 ? (
                  <p className="px-3 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-slate-500 text-xs text-center">
                    No lane rates negotiated for this customer account yet.
                  </p>
                ) : (
                  paginatedRateCards.map((rc) => (
                    <button
                      key={rc.id}
                      type="button"
                      onClick={() => setEditRateTarget(rc)}
                      className="w-full text-left p-2.5 rounded-xl bg-[#F8F9FA] dark:bg-slate-950 border border-slate-100 dark:border-slate-800 hover:border-[#FA634E]/50 transition-colors flex items-center justify-between gap-2 group cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0 font-bold text-slate-900 dark:text-slate-100 text-xs">
                        <span className="truncate">{rc.route_origin}</span>
                        <ArrowRight className="w-3 h-3 shrink-0 text-[#FA634E]" />
                        <span className="truncate">{rc.route_destination}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-xs font-black text-[#FA634E]">
                          {rc.currency || 'SAR'} {Number(rc.base_price || 0).toLocaleString()}
                        </span>
                        {!rc.is_active && (
                          <Badge variant="outline" className="text-[9px] font-bold uppercase text-slate-500 py-0 px-1">
                            Inactive
                          </Badge>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* Pagination & All Rates Link */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('quotations')}
                  className="text-[11px] font-bold text-[#FA634E] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>All Quotations & Rates</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
                {totalRatesPages > 1 && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={ratesPage === 1}
                      onClick={() => setRatesPage(p => Math.max(1, p - 1))}
                      className="h-6 w-6 p-0 text-xs rounded-lg"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </Button>
                    <span className="text-[10px] font-bold px-1 text-slate-600 dark:text-slate-300">
                      {ratesPage} / {totalRatesPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={ratesPage >= totalRatesPages}
                      onClick={() => setRatesPage(p => Math.min(totalRatesPages, p + 1))}
                      className="h-6 w-6 p-0 text-xs rounded-lg"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* ════════════════════════════════════════════════
              COLUMN 3 (RIGHT): Operational Efficiency & Contacts
             ════════════════════════════════════════════════ */}
          <div className="col-span-12 xl:col-span-4 flex flex-col gap-4">
            
            {/* 3.1 OPERATIONAL EFFICIENCY CARD */}
            <div className="rounded-[24px] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 2xl:p-5 shrink-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-3">
              {/* Header Row */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div
                  onClick={() => setActiveTab('dispatches')}
                  className="flex items-center gap-2 cursor-pointer group/title"
                  title="Click to view customer performance & dispatches"
                >
                  <Award className="w-4 h-4 text-[#FA634E]" />
                  <h3 className="text-xs font-black text-[#3E3C3D] dark:text-white uppercase tracking-wider group-hover/title:text-[#FA634E] flex items-center gap-1 transition-colors">
                    Operational Efficiency <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover/title:text-[#FA634E]" />
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/40 px-2 py-0.5 rounded-full">
                  Above Target
                </span>
              </div>

              {/* Score Row */}
              <div className="flex items-baseline justify-between">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl 2xl:text-4xl font-black text-[#3E3C3D] dark:text-white leading-none">{onTimeRatio}%</span>
                </div>
                <span className="text-[9px] font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-200/50">
                  Top Tier SLA
                </span>
              </div>

              {/* 2 Segment Progress Bar System */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 px-0.5">
                  <span className="text-emerald-600 dark:text-emerald-400">{onTimeRatio}% On-Time</span>
                  <span className="text-rose-500 dark:text-rose-400">{100 - onTimeRatio}% Delay</span>
                </div>
                
                <div className="h-7 w-full p-1 bg-slate-100 dark:bg-slate-800 rounded-xl flex gap-1 shadow-inner">
                  <div
                    className="h-full bg-emerald-500 text-white rounded-lg flex items-center justify-center text-[10px] font-black shadow-2xs transition-all"
                    style={{ width: `${onTimeRatio}%` }}
                  >
                    On-Time
                  </div>
                  <div
                    className="h-full bg-rose-500 text-white rounded-lg flex items-center justify-center text-[10px] font-black shadow-2xs transition-all"
                    style={{ width: `${100 - onTimeRatio}%` }}
                  >
                    Delay
                  </div>
                </div>
              </div>

              {/* 3 Metrics */}
              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                <div className="p-2 rounded-xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/60">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5 truncate">On-Time Trips</span>
                  <div className="text-xs 2xl:text-sm font-black text-emerald-600 dark:text-emerald-400">{onTimeTripsCount} Trips</div>
                </div>
                <div className="p-2 rounded-xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/60">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5 truncate">Delayed</span>
                  <div className="text-xs 2xl:text-sm font-black text-rose-500 dark:text-rose-400">{Math.max(0, totalTripsCount - onTimeTripsCount)} Trips</div>
                </div>
                <div className="p-2 rounded-xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/60">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5 truncate">In-Transit</span>
                  <div className="text-xs 2xl:text-sm font-black text-slate-900 dark:text-white">{inTransitTripsCount} Live</div>
                </div>
              </div>
            </div>

            {/* 3.2 OPERATIONAL CONTACT HUB (Compliance Documents Style Registry) */}
            <div className="rounded-[24px] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 2xl:p-5 flex flex-col gap-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)] min-h-0">
              {/* Header Row */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <div
                  onClick={() => navigate(`/customers/${customer.id}/edit`)}
                  className="flex items-center gap-2 cursor-pointer group/title"
                  title="Click to manage customer contacts"
                >
                  <div className="w-7 h-7 rounded-xl bg-[#3E3C3D] dark:bg-slate-800 text-white flex items-center justify-center shadow-2xs group-hover/title:bg-[#FA634E] transition-colors">
                    <FolderOpen className="w-3.5 h-3.5 text-[#FA634E] group-hover/title:text-white" />
                  </div>
                  <div>
                    <h3 className="text-xs 2xl:text-sm font-black text-[#3E3C3D] dark:text-white uppercase tracking-wider leading-none group-hover/title:text-[#FA634E] flex items-center gap-1 transition-colors">
                      Operational Contacts <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover/title:text-[#FA634E]" />
                    </h3>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/40 px-2.5 py-1 rounded-full shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 leading-none">
                    2 Active Reps
                  </span>
                </div>
              </div>

              {/* Status Strip */}
              <div className="bg-[#F8F9FA] dark:bg-slate-950 px-3 py-2 rounded-[14px] border border-slate-200/50 dark:border-slate-800/60 space-y-1.5 shrink-0 shadow-2xs">
                <div className="flex items-center justify-between text-[10px] font-bold">
                  <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    SLA Dedicated Support
                  </span>
                  <span className="text-slate-400 font-semibold">24/7 Dispatch Escalations</span>
                </div>
                <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 rounded-full shadow-2xs"></div>
              </div>

              {/* High-Density Contact Registry Container */}
              <div className="flex flex-col bg-[#F8F9FA] dark:bg-slate-950 rounded-[18px] border border-slate-200/60 dark:border-slate-800/80 divide-y divide-slate-200/60 dark:divide-slate-800/60 overflow-hidden shadow-2xs">
                
                {/* Rep 1: Primary Rep */}
                <div className="px-3.5 py-2.5 flex items-center justify-between hover:bg-slate-100/70 dark:hover:bg-slate-900/80 transition-colors group">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 shadow-2xs bg-blue-50/90 text-blue-600 border-blue-200/70 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-800/50 font-black text-xs">
                      {primaryRep.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-black text-[#3E3C3D] dark:text-white leading-tight truncate">
                          {primaryRep.name}
                        </h4>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                          Primary
                        </span>
                      </div>
                      <p className="text-[10px] font-semibold text-slate-400 truncate leading-none mt-0.5">
                        {primaryRep.role}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={`tel:${primaryRep.phone}`}
                      className="h-7 px-2.5 text-[10px] font-bold text-slate-700 dark:text-slate-200 bg-white hover:bg-[#3E3C3D] hover:text-white dark:bg-slate-800 dark:hover:bg-[#FA634E] border border-slate-200/90 dark:border-slate-700 rounded-lg flex items-center gap-1 transition-all shadow-2xs"
                      title={`Call ${primaryRep.phone}`}
                    >
                      <Phone className="w-3 h-3" />
                      <span>Call</span>
                    </a>
                  </div>
                </div>

                {/* Rep 2: Secondary Rep */}
                <div className="px-3.5 py-2.5 flex items-center justify-between hover:bg-slate-100/70 dark:hover:bg-slate-900/80 transition-colors group">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 shadow-2xs bg-emerald-50/90 text-emerald-600 border-emerald-200/70 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800/50 font-black text-xs">
                      {secondaryRep.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-black text-[#3E3C3D] dark:text-white leading-tight truncate">
                          {secondaryRep.name}
                        </h4>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          Lead
                        </span>
                      </div>
                      <p className="text-[10px] font-semibold text-slate-400 truncate leading-none mt-0.5">
                        {secondaryRep.role}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={`tel:${secondaryRep.phone}`}
                      className="h-7 px-2.5 text-[10px] font-bold text-slate-700 dark:text-slate-200 bg-white hover:bg-[#3E3C3D] hover:text-white dark:bg-slate-800 dark:hover:bg-[#FA634E] border border-slate-200/90 dark:border-slate-700 rounded-lg flex items-center gap-1 transition-all shadow-2xs"
                      title={`Call ${secondaryRep.phone}`}
                    >
                      <Phone className="w-3 h-3" />
                      <span>Call</span>
                    </a>
                  </div>
                </div>

              </div>

              {/* Bottom Edit Contacts Button */}
              <Button
                onClick={() => navigate(`/customers/${customer.id}/edit`)}
                variant="ghost"
                className="w-full h-8 mt-0.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-[#3E3C3D] hover:text-white dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl flex items-center justify-center gap-1.5 transition-all shrink-0 group"
              >
                <span>Edit Contacts & Escalations</span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
              </Button>
            </div>

          </div>

        </div>

        {/* ── 4. FULL-WIDTH TABBED ACTIVITY LEDGER (Quotations, Dispatches, Invoices, Locations) ── */}
        <div className="rounded-[24px] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 2xl:p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
          
          {/* Segmented Control Bar */}
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3 flex-wrap">
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-700 flex-wrap">
              
              <button
                type="button"
                onClick={() => setActiveTab('quotations')}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                  activeTab === 'quotations'
                    ? "bg-white dark:bg-slate-900 text-[#FA634E] shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                )}
              >
                <Layers className="w-3.5 h-3.5 text-[#FA634E]" />
                <span>Quotations</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-mono font-extrabold bg-rose-50 text-[#FA634E] dark:bg-rose-950/60">
                  {(rateCardsResponse?.data || []).filter((q: any) => q.is_active).length}
                </Badge>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('dispatches')}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                  activeTab === 'dispatches'
                    ? "bg-white dark:bg-slate-900 text-[#FA634E] shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                )}
              >
                <Truck className="w-3.5 h-3.5 text-[#FA634E]" />
                <span>Dispatches</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-mono font-extrabold bg-rose-50 text-[#FA634E] dark:bg-rose-950/60">
                  {customerTrips.length}
                </Badge>
              </button>


              <button
                type="button"
                onClick={() => setActiveTab('saved_places')}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                  activeTab === 'saved_places'
                    ? "bg-white dark:bg-slate-900 text-[#FA634E] shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                )}
              >
                <MapPin className="w-3.5 h-3.5 text-[#FA634E]" />
                <span>Locations</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-mono font-extrabold bg-rose-50 text-[#FA634E] dark:bg-rose-950/60">
                  {customerLocations.length}
                </Badge>
              </button>

            </div>

            {/* Contextual Quick Actions for Active Tab */}
            <div className="flex items-center gap-2">
              {activeTab === 'quotations' && (
                <Button
                  size="sm"
                  onClick={() => setIsAddQuotationOpen(true)}
                  className="h-8 gap-1.5 text-xs font-bold bg-[#FA634E] hover:bg-[#e0523d] text-white rounded-xl shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Quotation
                </Button>
              )}

              {activeTab === 'dispatches' && (
                <Button
                  size="sm"
                  onClick={() => navigate(`/trips/new?customerId=${id}`)}
                  className="h-8 gap-1.5 text-xs font-bold bg-[#FA634E] hover:bg-[#e0523d] text-white rounded-xl shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Dispatch Trip
                </Button>
              )}



              {activeTab === 'saved_places' && (
                <Button
                  size="sm"
                  onClick={() => navigate(`/customers/${customer.id}/locations/create`)}
                  className="h-8 gap-1.5 text-xs font-bold bg-[#FA634E] hover:bg-[#e0523d] text-white rounded-xl shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Location
                </Button>
              )}
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


          {/* Tab 4: Locations Card */}
          {activeTab === 'saved_places' && (
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#FA634E]" /> Customer Locations
                  </CardTitle>
                  <CardDescription className="text-[11px] mt-0.5">
                    Canonical operational hubs and pickup/dropoff points scoped to this customer.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    onClick={() => navigate(`/customers/${customer.id}/locations/create`)}
                    className="h-7 gap-1 text-xs font-bold bg-[#FA634E] hover:bg-[#e0523d] text-white rounded-lg"
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
                          className="w-full text-left p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1.5 flex items-center justify-between gap-2 cursor-pointer hover:border-[#FA634E]/50 transition-colors"
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
                              className="p-1.5 rounded-lg text-slate-400 hover:text-[#FA634E] hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
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
