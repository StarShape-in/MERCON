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

  // Segmented Tab for Activity Ledger
  const [activeTab, setActiveTab] = useState<'dispatches' | 'quotations' | 'saved_places' | 'governance'>('dispatches');

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

  // Customer rate cards
  const { data: rateCardsResponse } = useQuery({
    queryKey: ['rate-cards', 'customer', id],
    queryFn: () => rateCardService.getAll({ customerId: id! }),
    enabled: !!id,
  });

  // Customer canonical locations
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
    await queryClient.invalidateQueries({ queryKey: ['locations', id] });
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="h-[100px] bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
            <div className="h-[100px] bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
            <div className="h-[100px] bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
            <div className="h-[100px] bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
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
          <Button onClick={() => navigate('/customers')} size="sm" className="mt-2 text-xs font-bold bg-[#FA634E] hover:bg-[#e0523d] text-white shadow-sm">
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Return to Customers Directory
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const customerRateCards = rateCardsResponse?.data || [];
  const customerTrips = customer.trips || [];
  const completedTripsCount = customerTrips.filter((t: any) => t.status === 'Completed' || t.status === 'Delivered').length;
  const totalTripsCount = customerTrips.length || 0;

  const onTimeTripsCount = customerTrips.filter((t: any) => !t.is_delayed && t.status !== 'Delayed').length;
  const onTimeRatio = totalTripsCount > 0 ? Math.round((onTimeTripsCount / totalTripsCount) * 100) : 100;

  const totalTripRevenue = customerTrips.reduce((acc: number, t: any) => {
    const rate = Number(t.financials?.agreed_rate ?? t.agreed_rate ?? t.billing_rate ?? 0);
    return acc + (isNaN(rate) ? 0 : rate);
  }, 0);

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
      title={customer.name}
      breadcrumb="Customers"
      actions={
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0 rounded-xl border-slate-200 dark:border-slate-800">
                <MoreVertical className="w-4 h-4 text-slate-600 dark:text-slate-400" />
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
            variant="outline"
            size="sm"
            onClick={() => navigate(`/customers/${customer.id}/edit`)}
            className="h-8 px-3 rounded-xl border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Edit Profile
          </Button>
        </div>
      }
    >
      <div className="p-4 max-w-[1600px] mx-auto w-full flex flex-col gap-4 bg-[#EEF1F6]/40 dark:bg-slate-950">
        
        {/* ── 1. CUSTOMER SUMMARY BANNER ── */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 shadow-2xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            {customer.logo_url ? (
              <div className="w-12 h-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-white p-1 shrink-0 overflow-hidden flex items-center justify-center">
                <img src={customer.logo_url} alt={customer.name} className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-xl bg-[#3E3C3D] text-white flex items-center justify-center font-black text-xl shrink-0 shadow-2xs">
                {customer.name?.[0]?.toUpperCase() || 'C'}
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-black text-[#3E3C3D] dark:text-white leading-tight truncate">
                  {customer.name}
                </h1>
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 border",
                  customer.isActive !== false
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800"
                    : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400"
                )}>
                  <span className={cn("w-1.5 h-1.5 rounded-full", customer.isActive !== false ? "bg-emerald-500" : "bg-slate-400")} />
                  {customer.isActive !== false ? 'Active' : 'Inactive'}
                </span>
                <span className="font-mono text-[10px] font-extrabold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  CUST-{customer.id.slice(0, 8).toUpperCase()}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                {(customer as any).tax_number && (
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">CR/VAT:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{(customer as any).tax_number}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText((customer as any).tax_number);
                        toast.success('CR / VAT Number copied');
                      }}
                      className="text-slate-400 hover:text-[#FA634E]"
                      title="Copy VAT/CR"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                )}
                {customer.driver_workflow === 'EXTERNAL_APP' && (
                  <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold">
                    External App Workflow
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Quick Contact & Action Pills */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {(customer.primary_contact_phone || customer.contact_phone || customer.phone) && (
              <a
                href={`tel:${customer.primary_contact_phone || customer.contact_phone || customer.phone}`}
                className="h-8 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-[#3E3C3D] hover:text-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all border border-slate-200/80 dark:border-slate-700"
              >
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                <span>{customer.primary_contact_phone || customer.contact_phone || customer.phone}</span>
              </a>
            )}

            {customer.whatsapp_group_link && (
              <a
                href={customer.whatsapp_group_link}
                target="_blank"
                rel="noopener noreferrer"
                className="h-8 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs"
              >
                <WhatsAppIcon className="w-3.5 h-3.5 fill-white" />
                <span>WhatsApp Group</span>
              </a>
            )}
          </div>
        </div>

        {/* ── 2. METRICS BAR (4 KPI Cards) ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* 1. Active Dispatches */}
          <div
            onClick={() => setActiveTab('dispatches')}
            className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between cursor-pointer hover:border-blue-400 transition-colors shadow-2xs"
          >
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Dispatches</span>
              <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{totalTripsCount}</div>
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">{completedTripsCount} Delivered</span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center shrink-0">
              <Truck className="w-4 h-4" />
            </div>
          </div>

          {/* 2. On-Time Rate */}
          <div
            onClick={() => setActiveTab('dispatches')}
            className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between cursor-pointer hover:border-emerald-400 transition-colors shadow-2xs"
          >
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">On-Time SLA</span>
              <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{onTimeRatio}%</div>
              <span className="text-[10px] font-bold text-slate-500">{onTimeTripsCount} / {totalTripsCount} On-Time</span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>

          {/* 3. Total Commercial Revenue */}
          <div
            onClick={() => setActiveTab('dispatches')}
            className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between cursor-pointer hover:border-rose-400 transition-colors shadow-2xs"
          >
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Revenue</span>
              <div className="text-lg font-black text-[#FA634E] dark:text-rose-400 mt-0.5 truncate max-w-[130px]">
                SAR {totalTripRevenue.toLocaleString('en-US', { minimumFractionDigits: 0 })}
              </div>
              <span className="text-[10px] font-bold text-slate-500">{completedTripsCount} Trips Billed</span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-[#FA634E] flex items-center justify-center shrink-0">
              <Banknote className="w-4 h-4" />
            </div>
          </div>

          {/* 4. Configured Lanes & Hubs */}
          <div
            onClick={() => setActiveTab('quotations')}
            className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between cursor-pointer hover:border-indigo-400 transition-colors shadow-2xs"
          >
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Lanes & Hubs</span>
              <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">{customerRateCards.length}</div>
              <span className="text-[10px] font-bold text-slate-500">{customerLocations.length} Saved Hubs</span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* ── 3. UNIFIED TABBED WORKSPACE ── */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 shadow-2xs space-y-4">
          
          {/* Navigation Tabs Bar */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700">
              
              <button
                type="button"
                onClick={() => setActiveTab('dispatches')}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  activeTab === 'dispatches'
                    ? "bg-white dark:bg-slate-900 text-[#FA634E] shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                )}
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Dispatches</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-mono font-bold bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {customerTrips.length}
                </Badge>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('quotations')}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  activeTab === 'quotations'
                    ? "bg-white dark:bg-slate-900 text-[#FA634E] shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                )}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Quotations & Rates</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-mono font-bold bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {customerRateCards.length}
                </Badge>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('saved_places')}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  activeTab === 'saved_places'
                    ? "bg-white dark:bg-slate-900 text-[#FA634E] shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                )}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Locations</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-mono font-bold bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {customerLocations.length}
                </Badge>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('governance')}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  activeTab === 'governance'
                    ? "bg-white dark:bg-slate-900 text-[#FA634E] shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                )}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Account Info</span>
              </button>

            </div>

            {/* Quick Context Action based on Active Tab */}
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

          {/* Tab 1: Dispatches Operational Ledger */}
          {activeTab === 'dispatches' && (
            <CustomerTripsTab
              customerId={id!}
              customerName={customer.name}
            />
          )}

          {/* Tab 2: Commercial Quotations & Rates */}
          {activeTab === 'quotations' && (
            <CustomerQuotationsTab
              customerId={id!}
              customerName={customer.name}
              onOpenAddQuotation={() => setIsAddQuotationOpen(true)}
              onOpenEditQuotation={(q) => setEditQuotationTarget(q)}
            />
          )}

          {/* Tab 3: Customer Locations */}
          {activeTab === 'saved_places' && (
            <div className="space-y-3">
              {customerLocations.length === 0 ? (
                <div className="p-8 text-center text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  <MapPin className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                  <p className="text-xs font-semibold">No saved operational hubs or locations for this customer yet.</p>
                  <Button
                    size="sm"
                    onClick={() => navigate(`/customers/${customer.id}/locations/create`)}
                    className="mt-3 text-xs bg-[#FA634E] hover:bg-[#e0523d] text-white font-bold"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add First Location
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {customerLocations.map((loc) => {
                    const prec = loc.coordinate_precision || (loc.lat != null ? 'APPROXIMATE' : 'UNKNOWN');
                    return (
                      <div
                        key={loc.id}
                        onClick={() => navigate(`/locations/${loc.id}`)}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 cursor-pointer hover:border-[#FA634E]/50 transition-colors"
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] font-black text-slate-900 bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                              {loc.code}
                            </span>
                            <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">{loc.name}</span>
                          </div>
                          {loc.address && (
                            <div className="text-[10px] text-slate-500 line-clamp-1">{loc.address}</div>
                          )}
                          <div>
                            {prec === 'EXACT' && (
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px] font-bold">
                                Exact Location
                              </Badge>
                            )}
                            {prec === 'APPROXIMATE' && (
                              <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[9px] font-bold">
                                Area Location
                              </Badge>
                            )}
                            {prec === 'UNKNOWN' && (
                              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[9px] font-bold">
                                Unpinned
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
            </div>
          )}

          {/* Tab 4: Account & Governance Details */}
          {activeTab === 'governance' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-3">
                <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Corporate Governance</h3>
                <div className="space-y-2">
                  <InfoRow label="Legal Name">{customer.name}</InfoRow>
                  <InfoRow label="CR / VAT No.">
                    <span className="font-mono font-bold">{(customer as any).tax_number || 'N/A'}</span>
                  </InfoRow>
                  <InfoRow label="Account Code">
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      CUST-{customer.id.slice(0, 8).toUpperCase()}
                    </span>
                  </InfoRow>
                  <InfoRow label="Roster Created">
                    {formatInDeploymentTz(customer.createdAt, tz, 'dd MMM yyyy')}
                  </InfoRow>
                  <InfoRow label="Driver App Workflow">
                    {customer.driver_workflow === 'EXTERNAL_APP' ? 'External App Screenshot AI' : 'Native CargoPod App'}
                  </InfoRow>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Primary Contact</h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => navigate(`/customers/${customer.id}/edit`)}
                    className="h-6 px-2 text-[10px] font-bold text-slate-600 hover:text-[#FA634E]"
                  >
                    Edit Contact
                  </Button>
                </div>
                <div className="space-y-2">
                  <InfoRow label="Contact Name">
                    {customer.primary_contact_person || customer.name}
                  </InfoRow>
                  <InfoRow label="Phone Number">
                    {customer.primary_contact_phone || customer.contact_phone || customer.phone || '—'}
                  </InfoRow>
                  <InfoRow label="Email Address">
                    {(customer as any).email || (customer as any).contact_email || '—'}
                  </InfoRow>
                  <InfoRow label="WhatsApp Operations">
                    {customer.whatsapp_group_link ? (
                      <a
                        href={customer.whatsapp_group_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
                      >
                        Open WhatsApp Link
                      </a>
                    ) : (
                      'Not Configured'
                    )}
                  </InfoRow>
                </div>
              </div>
            </div>
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
