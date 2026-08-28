import { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { 
  Plus, 
  Edit2, 
  FileText, 
  Download, 
  Trash2, 
  RotateCw, 
  Filter,
  Search,
  Building2,
  MapPin,
  X,
  Truck,
  Receipt,
  Calendar,
  CheckCircle2,
  Zap,
  MoreHorizontal,
  Copy,
  Power,
  UploadCloud,
  ArrowRight,
  Tag,
  CreditCard,
  Route as RouteIcon,
  ChevronDown,
  ChevronRight,
  FileSpreadsheet,
  Eye,
  ArrowDown,
  ArrowUp,
  List,
  Sparkles,
  ChevronLeft,
  SlidersHorizontal,
  Settings2,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { quotationService, Quotation } from '@/services/quotationService';
import { customerService } from '@/services/customerService';
import QuotationFormDialog from '@/components/quotations/RateCardFormDialog';
import SurchargeFeesPanel from '@/components/quotations/SurchargeFeesPanel';
import ExcelImportDialog from '@/components/fleet/ExcelImportDialog';
import { QuotationRouteDrawer } from './QuotationRouteDrawer';
import { RATE_CARD_COLUMNS } from '@/utils/importUtils';
import ExportModal, { ExportColumn } from '@/components/ui/ExportModal';
import { exportExcelTable, exportPDFTable } from '@/utils/exportUtils';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const QUOTATION_EXPORT_COLUMNS: ExportColumn<Quotation>[] = [
  { id: 'name', label: 'Quotation Name', accessor: (q) => q.name || 'Quotation' },
  { id: 'customer', label: 'Customer', accessor: (q) => q.customer?.name || 'Customer' },
  { id: 'vehicle_class', label: 'Vehicle Class', accessor: (q) => q.vehicle_class || '—' },
  { id: 'source_vehicle_label', label: 'Source Vehicle Label', accessor: (q) => q.source_vehicle_label || q.vehicle_type || '—' },
  { id: 'line_type', label: 'Line Type', accessor: (q) => q.line_type || q.rate_category || 'Single Trip' },
  { id: 'billing_type', label: 'Operation Type', accessor: (q) => q.billing_type || 'EXTRA' },
  { id: 'rate', label: 'Billing Rate (SAR)', accessor: (q) => `SAR ${Number(q.rate || q.base_price || 0).toLocaleString()}` },
  { id: 'driver_payout', label: 'Driver Charge (SAR)', accessor: (q) => q.driver_payout != null ? `SAR ${Number(q.driver_payout).toLocaleString()}` : '—' },
  { id: 'status', label: 'Status', accessor: (q) => (q.is_active ? 'Active' : 'Inactive') },
  { id: 'validity', label: 'Validity', accessor: (q) => q.valid_from ? `${q.valid_from.substring(0, 10)} to ${q.valid_to ? q.valid_to.substring(0, 10) : 'Ongoing'}` : 'Ongoing' },
];

function CompanyLogo({ name, logoUrl, className = "w-8 h-8" }: { name: string; logoUrl?: string | null; className?: string }) {
  const [hasError, setHasError] = useState(false);

  if (logoUrl && !hasError) {
    return (
      <img
        src={logoUrl}
        alt={name}
        onError={() => setHasError(true)}
        className={cn("rounded-lg object-contain p-0.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0 shadow-2xs", className)}
      />
    );
  }

  const initials = name ? name.substring(0, 2).toUpperCase() : 'CU';

  return (
    <div className={cn("rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-slate-700", className)}>
      <span>{initials}</span>
    </div>
  );
}

function getVehicleClassBadge(vehicleClass?: string | null) {
  return (
    <Badge variant="outline" className="font-semibold text-[11px] text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 px-2 py-0.5 whitespace-nowrap shrink-0">
      {vehicleClass || 'Standard'}
    </Badge>
  );
}

function getLineTypeBadge(lineType?: string | null) {
  const lt = (lineType || 'Single Trip').toUpperCase();
  let label = 'Single Trip';
  if (lt.includes('ROUND')) label = 'Round Trip';
  else if (lt.includes('10')) label = '10 Hours Shift';
  else if (lt.includes('12')) label = '12 Hours Shift';

  return (
    <Badge variant="secondary" className="font-medium text-[11px] text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 px-2 py-0.5 whitespace-nowrap shrink-0">
      {label}
    </Badge>
  );
}

function getOperationTypeBadge(billingType?: string | null) {
  const bt = (billingType || '').toUpperCase();
  if (bt.includes('MONTHLY')) {
    return (
      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 font-semibold text-[11px] px-2 py-0.5 whitespace-nowrap shrink-0">
        Monthly
      </Badge>
    );
  }
  return (
    <Badge className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 font-semibold text-[11px] px-2 py-0.5 whitespace-nowrap shrink-0">
      Extra
    </Badge>
  );
}

function RouteStopsCell({ quotation, onOpenDrawer }: { quotation: Quotation; onOpenDrawer: (q: Quotation) => void }) {
  const stops = quotation.stops || [];

  // Determine stop names in exact sequence
  const stopNames = useMemo(() => {
    if (stops.length > 0) {
      return stops.map((s: any) => s.source_label || s.location?.name || s.name || 'Location');
    }
    const origin = quotation.route_origin || 'Origin';
    const dest = quotation.route_destination || 'Destination';
    return [origin, dest];
  }, [stops, quotation]);

  const firstStop = stopNames[0] || 'Origin';
  const lastStop = stopNames[stopNames.length - 1] || 'Destination';
  const intermediateStops = stopNames.slice(1, -1);
  const totalStops = Math.max(stopNames.length, 2);

  // Line 2 subtitle generation
  let viaText = 'Direct';
  if (intermediateStops.length > 0) {
    if (intermediateStops.length <= 2) {
      viaText = `via ${intermediateStops.join(', ')}`;
    } else {
      viaText = `via ${intermediateStops[0]}, ${intermediateStops[1]}...`;
    }
  }

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onOpenDrawer(quotation);
      }}
      className="text-left group cursor-pointer p-1.5 -m-1.5 rounded-lg hover:bg-slate-100/70 dark:hover:bg-slate-800/50 transition-all min-w-[210px] max-w-xs block border border-transparent hover:border-slate-200/60 dark:hover:border-slate-700/60"
      title="Click to inspect route timeline & commercial details"
    >
      {/* Primary Line: First Stop → Last Stop */}
      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-[#FA634E] transition-colors truncate">
        <span className="truncate">{firstStop}</span>
        <ArrowRight className="h-3 w-3 text-slate-400 group-hover:text-[#FA634E] shrink-0 transition-colors" />
        <span className="truncate">{lastStop}</span>
      </div>

      {/* Secondary Subtitle: via Intermediate Stops · N stops → */}
      <div className="text-[11px] text-slate-500 font-normal flex items-center justify-between gap-1 mt-0.5 truncate">
        <div className="flex items-center gap-1 truncate min-w-0">
          <span className="truncate">{viaText}</span>
          <span className="text-slate-300 dark:text-slate-700">·</span>
          <span className="font-mono font-semibold text-slate-600 dark:text-slate-400 shrink-0 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">
            {totalStops} {totalStops === 1 ? 'stop' : 'stops'}
          </span>
        </div>

        {/* Subtle arrow affordance indicating clickable drawer interaction */}
        <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-[#FA634E] group-hover:translate-x-0.5 transition-all shrink-0 ml-0.5 opacity-60 group-hover:opacity-100" />
      </div>
    </div>
  );
}

function SurchargesCell({ quotation }: { quotation: Quotation }) {
  const rules = ((quotation as any).surchargeRules || (quotation as any).surcharge_rules || []) as any[];
  if (!rules || rules.length === 0) {
    return <span className="text-slate-400 text-xs">—</span>;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-6 px-2 text-[11px] font-medium border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md gap-1 cursor-pointer"
        >
          <Tag className="w-3 h-3 text-[#FA634E]" />
          <span>{rules.length} {rules.length === 1 ? 'rule' : 'rules'}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-3 shadow-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg space-y-2">
        <div className="text-xs font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-1.5">
          Surcharge Rules
        </div>
        <div className="space-y-1.5 text-xs">
          {rules.map((rule: any, idx: number) => {
            const feeType = rule.fee_name || rule.fee_type || rule.name || 'Additional Fee';
            const amount = rule.amount != null ? `SAR ${Number(rule.amount).toLocaleString()}` : rule.rate != null ? `SAR ${Number(rule.rate).toLocaleString()}` : '—';
            const unit = rule.unit ? `/ ${rule.unit}` : '';
            return (
              <div key={idx} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <span className="font-medium text-slate-800 dark:text-slate-200">{feeType}</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">{amount} {unit}</span>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ValidityStatusCell({ quotation }: { quotation: Quotation }) {
  const now = new Date();
  const validFrom = quotation.valid_from ? new Date(quotation.valid_from) : null;
  const validTo = quotation.valid_to ? new Date(quotation.valid_to) : null;

  const isExpired = validTo ? validTo < now : false;
  const isFuture = validFrom ? validFrom > now : false;

  let statusBadge = <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 font-medium text-[10px] px-2 py-0.5">Active</Badge>;
  if (!quotation.is_active) {
    statusBadge = <Badge variant="outline" className="text-slate-400 text-[10px] px-2 py-0.5">Inactive</Badge>;
  } else if (isExpired) {
    statusBadge = <Badge className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 font-medium text-[10px] px-2 py-0.5">Expired</Badge>;
  } else if (isFuture) {
    statusBadge = <Badge className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 font-medium text-[10px] px-2 py-0.5">Future</Badge>;
  }

  const fromStr = quotation.valid_from ? new Date(quotation.valid_from).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : null;
  const toStr = quotation.valid_to ? new Date(quotation.valid_to).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Ongoing';

  const dateText = fromStr ? `${fromStr} → ${toStr}` : 'Ongoing';

  return (
    <div className="space-y-0.5">
      <div>{statusBadge}</div>
      <div className="text-[10px] text-slate-500 font-mono whitespace-nowrap">{dateText}</div>
    </div>
  );
}

export default function QuotationListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'quotations' | 'surcharges'>('quotations');

  // Customer Navigator Search (Left panel)
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Global Route Workspace Filters (Right panel toolbar)
  const [search, setSearch] = useState('');
  const [billingTypeFilter, setBillingTypeFilter] = useState('ALL');
  const [vehicleClassFilter, setVehicleClassFilter] = useState('ALL');
  const [lineTypeFilter, setLineTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Route Workspace Pagination
  const [workspacePage, setWorkspacePage] = useState(1);
  const [workspacePerPage, setWorkspacePerPage] = useState(20);

  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Right-side Route Details Drawer State
  const [drawerQuotation, setDrawerQuotation] = useState<Quotation | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleOpenDrawer = (q: Quotation) => {
    setDrawerQuotation(q);
    setIsDrawerOpen(true);
  };

  // Fetch Quotations list
  const { data: quotationsRes, isLoading, refetch } = useQuery({
    queryKey: ['quotations', search, billingTypeFilter, lineTypeFilter, vehicleClassFilter, statusFilter],
    queryFn: () =>
      quotationService.getAll({
        per_page: 500, // Fetch all commercial routes for customer workspace grouping
        ...(search ? { search } : {}),
        ...(billingTypeFilter !== 'ALL' ? { billing_type: billingTypeFilter } : {}),
        ...(lineTypeFilter !== 'ALL' ? { line_type: lineTypeFilter } : {}),
        ...(vehicleClassFilter !== 'ALL' ? { vehicle_class: vehicleClassFilter } : {}),
        ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
      }),
    placeholderData: keepPreviousData,
    enabled: activeTab === 'quotations',
  });

  const rawQuotations = quotationsRes?.data || [];

  // Fetch Customers lookup for left panel list
  const { data: customersRes } = useQuery({
    queryKey: ['customers-select'],
    queryFn: () => customerService.getAll({ per_page: 200, mode: 'lookup' }),
  });
  const sortedCustomers = customersRes?.data || [];

  // Group Quotations by Customer Company (Populating from sortedCustomers + rawQuotations)
  const companyGroups = useMemo(() => {
    const map = new Map<string, { id: string; name: string; logoUrl?: string | null; quotations: Quotation[]; monthlyCount: number; extraCount: number }>();

    // 1. Populate all customer master records
    sortedCustomers.forEach((cust) => {
      map.set(cust.id, {
        id: cust.id,
        name: cust.name,
        logoUrl: (cust as any).logo_url || (cust as any).avatar_url || null,
        quotations: [],
        monthlyCount: 0,
        extraCount: 0,
      });
    });

    // 2. Attach commercial quotation routes
    rawQuotations.forEach((q) => {
      const custId = q.customerId || 'unassigned';
      const custName = q.customer?.name || 'Unassigned / General Customer';
      const logoUrl = (q.customer as any)?.logo_url || (q.customer as any)?.avatar_url || null;

      if (!map.has(custId)) {
        map.set(custId, { id: custId, name: custName, logoUrl, quotations: [], monthlyCount: 0, extraCount: 0 });
      }
      const entry = map.get(custId)!;
      entry.quotations.push(q);
      if ((q.billing_type || '').toUpperCase() === 'MONTHLY') {
        entry.monthlyCount++;
      } else {
        entry.extraCount++;
      }
    });

    const groups = Array.from(map.values());
    return groups.sort((a, b) => a.name.localeCompare(b.name));
  }, [rawQuotations, sortedCustomers]);

  // Auto-select first customer
  useEffect(() => {
    if (companyGroups.length > 0) {
      if (!selectedCustomerId || !companyGroups.some((g) => g.id === selectedCustomerId)) {
        setSelectedCustomerId(companyGroups[0].id);
      }
    }
  }, [companyGroups, selectedCustomerId]);

  // Filtered customer navigator list for left panel search
  const navCustomerGroups = useMemo(() => {
    if (!customerSearchTerm.trim()) return companyGroups;
    const term = customerSearchTerm.toLowerCase();
    return companyGroups.filter((g) => g.name.toLowerCase().includes(term));
  }, [companyGroups, customerSearchTerm]);

  // Active selected customer group
  const selectedGroup = useMemo(() => {
    if (!selectedCustomerId) return companyGroups[0] || null;
    return companyGroups.find((g) => g.id === selectedCustomerId) || companyGroups[0] || null;
  }, [companyGroups, selectedCustomerId]);

  // Filtered route ledger for selected customer
  const filteredWorkspaceRoutes = useMemo(() => {
    if (!selectedGroup) return [];

    return selectedGroup.quotations.filter((q) => {
      // Route search filter
      if (search.trim()) {
        const term = search.toLowerCase();
        const stopsText = (q.stops || []).map((s: any) => s.source_label || s.location?.name || '').join(' ').toLowerCase();
        const matchRoute = (q.route_origin || '').toLowerCase().includes(term) || (q.route_destination || '').toLowerCase().includes(term) || stopsText.includes(term);
        const matchVehicle = (q.vehicle_class || '').toLowerCase().includes(term);
        const matchRef = (q.agreement_ref || '').toLowerCase().includes(term);
        const matchName = (q.name || '').toLowerCase().includes(term);
        if (!matchRoute && !matchVehicle && !matchRef && !matchName) return false;
      }

      // Operation Type Filter
      if (billingTypeFilter !== 'ALL') {
        if ((q.billing_type || '').toUpperCase() !== billingTypeFilter) return false;
      }

      // Vehicle Class Filter
      if (vehicleClassFilter !== 'ALL') {
        if ((q.vehicle_class || '').toUpperCase() !== vehicleClassFilter.toUpperCase()) return false;
      }

      // Line Type Filter
      if (lineTypeFilter !== 'ALL') {
        if ((q.line_type || q.rate_category || '').toUpperCase() !== lineTypeFilter.toUpperCase()) return false;
      }

      // Status Filter
      if (statusFilter !== 'ALL') {
        const now = new Date();
        const isValidFromFuture = q.valid_from ? new Date(q.valid_from) > now : false;
        const isExpired = q.valid_to ? new Date(q.valid_to) < now : false;

        if (statusFilter === 'ACTIVE' && (!q.is_active || isExpired || isValidFromFuture)) return false;
        if (statusFilter === 'INACTIVE' && q.is_active) return false;
        if (statusFilter === 'EXPIRED' && !isExpired) return false;
        if (statusFilter === 'FUTURE' && !isValidFromFuture) return false;
      }

      return true;
    });
  }, [selectedGroup, search, billingTypeFilter, vehicleClassFilter, lineTypeFilter, statusFilter]);

  // Paginated workspace routes
  const paginatedWorkspaceRoutes = useMemo(() => {
    const start = (workspacePage - 1) * workspacePerPage;
    return filteredWorkspaceRoutes.slice(start, start + workspacePerPage);
  }, [filteredWorkspaceRoutes, workspacePage, workspacePerPage]);

  const totalWorkspacePages = Math.ceil(filteredWorkspaceRoutes.length / workspacePerPage) || 1;

  // Reset workspace page on selection / filter change
  useEffect(() => {
    setWorkspacePage(1);
  }, [selectedCustomerId, search, billingTypeFilter, vehicleClassFilter, lineTypeFilter, statusFilter]);

  const handleDelete = async () => {
    if (!selectedQuotation) return;
    try {
      await quotationService.delete(selectedQuotation.id);
      toast.success('Quotation deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      setIsDeleteModalOpen(false);
      setSelectedQuotation(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete quotation');
    }
  };

  const handleToggleActive = async (q: Quotation) => {
    try {
      await quotationService.update(q.id, { is_active: !q.is_active });
      toast.success(`Quotation ${q.is_active ? 'deactivated' : 'activated'} successfully`);
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to update quotation status');
    }
  };

  const clearFilters = () => {
    setSearch('');
    setBillingTypeFilter('ALL');
    setVehicleClassFilter('ALL');
    setLineTypeFilter('ALL');
    setStatusFilter('ALL');
    setWorkspacePage(1);
  };

  const isFiltersActive =
    search !== '' ||
    billingTypeFilter !== 'ALL' ||
    vehicleClassFilter !== 'ALL' ||
    lineTypeFilter !== 'ALL' ||
    statusFilter !== 'ALL';

  const handleQuickExport = async (format: 'xlsx' | 'pdf') => {
    const toastId = toast.loading('Preparing export…');
    try {
      const dataToExport = selectedGroup ? selectedGroup.quotations : rawQuotations;
      const headers = ['Customer', 'Vehicle Class', 'Source Vehicle', 'Line Type', 'Operation Type', 'Billing Rate (SAR)', 'Driver Charge (SAR)', 'Status'];
      const rows = dataToExport.map((q) => [
        q.customer?.name || 'Customer',
        q.vehicle_class || 'Standard',
        q.source_vehicle_label || q.vehicle_type || '—',
        q.line_type || q.rate_category || 'Single Trip',
        q.billing_type || 'EXTRA',
        `SAR ${Number(q.rate ?? q.base_price ?? 0).toLocaleString()}`,
        q.driver_payout != null ? `SAR ${Number(q.driver_payout).toLocaleString()}` : '—',
        q.is_active ? 'Active' : 'Inactive',
      ]);
      toast.dismiss(toastId);
      if (format === 'xlsx') await exportExcelTable('MERCON Commercial Quotations', headers, rows, `quotations_${new Date().toISOString().slice(0, 10)}.xlsx`);
      else exportPDFTable('MERCON Commercial Quotations', headers, rows, `quotations_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch {
      toast.dismiss(toastId);
      toast.error('Failed to generate export');
    }
  };

  return (
    <DashboardLayout active="Quotations" title="Quotations Workspace">
      <div className="px-4 sm:px-6 pb-10 w-full flex flex-col animate-fade-in gap-4">
        
        {/* 1. Page Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 shrink-0 pb-4 border-b border-slate-200 dark:border-slate-800/80">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Commercial Quotations
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Manage agreed commercial routes and pricing for customers.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* View Mode Toggle (Routes vs Surcharge Rules) */}
            <Button
              size="sm"
              variant={activeTab === 'surcharges' ? 'default' : 'outline'}
              className={cn(
                "h-9 gap-1.5 text-xs font-medium border-slate-200 dark:border-slate-800 rounded-lg px-3.5 cursor-pointer transition-all",
                activeTab === 'surcharges' ? "bg-slate-900 text-white" : "bg-white hover:bg-slate-50 text-slate-700"
              )}
              onClick={() => setActiveTab((prev) => (prev === 'surcharges' ? 'quotations' : 'surcharges'))}
            >
              <Settings2 className="h-4 w-4 text-amber-500" />
              <span>{activeTab === 'surcharges' ? 'View Commercial Routes' : 'Surcharge Rules'}</span>
            </Button>

            {/* AI Import Action */}
            <Button
              size="sm"
              variant="outline"
              className="h-9 gap-1.5 text-xs font-medium border-slate-200 dark:border-slate-800 bg-white hover:bg-slate-50 dark:bg-slate-900 rounded-lg px-3.5 cursor-pointer transition-all"
              onClick={() => navigate('/quotations/import')}
            >
              <Sparkles className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              <span>AI Import</span>
            </Button>

            {/* + New Commercial Route Action (MERCON Orange) */}
            <Button
              size="sm"
              className="h-9 gap-1.5 text-xs font-semibold bg-[#FA634E] hover:bg-[#DF4834] text-white shadow-xs rounded-lg px-4 cursor-pointer transition-all border-0"
              onClick={() => navigate('/quotations/new')}
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>New Commercial Route</span>
            </Button>
          </div>
        </div>

        {activeTab === 'surcharges' ? (
          <SurchargeFeesPanel />
        ) : (
          /* 2. TWO-PANEL WORKSPACE (COMPANY VIEW ONLY) */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            
            {/* LEFT PANEL: CUSTOMER NAVIGATOR */}
            <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden flex flex-col max-h-[calc(100vh-170px)] min-h-[540px]">
              <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2 shrink-0">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    CUSTOMERS ({navCustomerGroups.length})
                  </h2>
                </div>
                {/* Left Panel Customer Search Input */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    placeholder="Search customers..."
                    value={customerSearchTerm}
                    onChange={(e) => setCustomerSearchTerm(e.target.value)}
                    className="h-8 text-xs bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 pl-8 rounded-lg"
                  />
                </div>
              </div>

              {/* Scrollable Customer List */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-1.5 space-y-0.5">
                {isLoading ? (
                  <div className="py-8 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                    <RotateCw className="w-4 h-4 animate-spin text-slate-400" />
                    <span>Loading customers...</span>
                  </div>
                ) : navCustomerGroups.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No customers found
                  </div>
                ) : (
                  navCustomerGroups.map((group) => {
                    const isSelected = selectedCustomerId === group.id;

                    return (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() => setSelectedCustomerId(group.id)}
                        className={cn(
                          "w-full text-left p-2.5 rounded-lg transition-all flex items-center justify-between gap-2.5 cursor-pointer group border-l-3",
                          isSelected
                            ? "bg-[#FA634E]/10 dark:bg-[#FA634E]/15 border-[#FA634E] text-[#FA634E] font-semibold"
                            : "border-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <CompanyLogo
                            name={group.name}
                            logoUrl={group.logoUrl || (sortedCustomers.find((c) => c.id === group.id) as any)?.logo_url || (sortedCustomers.find((c) => c.id === group.id) as any)?.avatar_url}
                            className="w-7 h-7"
                          />
                          <div className="min-w-0">
                            <div className={cn("text-xs truncate font-semibold", isSelected ? "text-[#FA634E]" : "text-slate-900 dark:text-slate-100")}>
                              {group.name}
                            </div>
                            <div className="text-[10px] text-slate-400 font-normal truncate mt-0.5">
                              {group.quotations.length} {group.quotations.length === 1 ? 'route' : 'routes'} · {group.monthlyCount} Monthly · {group.extraCount} Extra
                            </div>
                          </div>
                        </div>
                        <ChevronRight className={cn("w-3.5 h-3.5 shrink-0 transition-transform", isSelected ? "text-[#FA634E]" : "text-slate-300 group-hover:text-slate-500")} />
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* RIGHT PANEL: SELECTED CUSTOMER ROUTE WORKSPACE */}
            <div className="lg:col-span-9 space-y-3">
              {selectedGroup ? (
                <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden flex flex-col min-h-[540px]">
                  
                  {/* Selected Customer Workspace Header */}
                  <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <CompanyLogo
                          name={selectedGroup.name}
                          logoUrl={selectedGroup.logoUrl || (sortedCustomers.find((c) => c.id === selectedGroup.id) as any)?.logo_url || (sortedCustomers.find((c) => c.id === selectedGroup.id) as any)?.avatar_url}
                          className="w-9 h-9"
                        />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                              {selectedGroup.name}
                            </h2>
                            <Badge variant="secondary" className="text-xs font-semibold">
                              {selectedGroup.quotations.length} {selectedGroup.quotations.length === 1 ? 'Route' : 'Routes'}
                            </Badge>
                            <div className="flex items-center gap-1">
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-medium px-2">
                                {selectedGroup.monthlyCount} Monthly
                              </Badge>
                              <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-medium px-2">
                                {selectedGroup.extraCount} Extra
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right Header Actions (More Dropdown) */}
                      <div className="flex items-center gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon" className="h-8.5 w-8.5 rounded-lg border-slate-200 dark:border-slate-700 cursor-pointer">
                              <MoreHorizontal className="h-4 w-4 text-slate-600" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52 p-1.5 shadow-xl border border-slate-200 bg-white rounded-lg z-[9999]">
                            <DropdownMenuLabel className="text-[10px] font-semibold text-slate-400 px-2 py-1">Customer Workspace</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleQuickExport('xlsx')} className="cursor-pointer text-xs py-1.5 px-2">
                              <FileSpreadsheet className="mr-2 h-3.5 w-3.5 text-emerald-600" /> Export Excel
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleQuickExport('pdf')} className="cursor-pointer text-xs py-1.5 px-2">
                              <FileText className="mr-2 h-3.5 w-3.5 text-rose-600" /> Export PDF
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="my-1" />
                            <DropdownMenuItem onClick={() => setActiveTab('surcharges')} className="cursor-pointer text-xs py-1.5 px-2">
                              <Settings2 className="mr-2 h-3.5 w-3.5 text-amber-500" /> Surcharge Rules Setup
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/customers/${selectedGroup.id}`)} className="cursor-pointer text-xs py-1.5 px-2">
                              <Building2 className="mr-2 h-3.5 w-3.5 text-slate-500" /> Customer Details
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Integrated Filter Bar inside Workspace */}
                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      <div className="relative flex-1 min-w-[200px] max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <Input
                          placeholder="Search route, vehicle class..."
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          className="h-8 text-xs bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 pl-9 rounded-lg"
                        />
                      </div>

                      {/* Operation Type Filter */}
                      <Select value={billingTypeFilter} onValueChange={(val) => { setBillingTypeFilter(val); setWorkspacePage(1); }}>
                        <SelectTrigger className="h-8 px-3 w-auto min-w-[140px] whitespace-nowrap shrink-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium rounded-lg">
                          <div className="flex items-center gap-2 whitespace-nowrap">
                            <Receipt className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                            <SelectValue placeholder="All Operations" />
                          </div>
                        </SelectTrigger>
                        <SelectContent align="start" className="w-44 p-1.5 shadow-lg border border-slate-200 bg-white rounded-lg z-[9999]">
                          <SelectGroup>
                            <SelectLabel className="text-[10px] font-semibold tracking-wider uppercase text-slate-400 px-2 py-1">Operation Type</SelectLabel>
                            <SelectItem value="ALL" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">All Operations</SelectItem>
                            <SelectItem value="MONTHLY" className="cursor-pointer text-xs font-semibold py-1.5 px-2 rounded-md text-emerald-600">Monthly</SelectItem>
                            <SelectItem value="EXTRA" className="cursor-pointer text-xs font-semibold py-1.5 px-2 rounded-md text-blue-600">Extra</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>

                      {/* Vehicle Class Filter */}
                      <Select value={vehicleClassFilter} onValueChange={(val) => { setVehicleClassFilter(val); setWorkspacePage(1); }}>
                        <SelectTrigger className="h-8 px-3 w-auto min-w-[130px] whitespace-nowrap shrink-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium rounded-lg">
                          <div className="flex items-center gap-2 whitespace-nowrap">
                            <Truck className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                            <SelectValue placeholder="All Vehicles" />
                          </div>
                        </SelectTrigger>
                        <SelectContent align="start" className="w-44 p-1.5 shadow-lg border border-slate-200 bg-white rounded-lg z-[9999]">
                          <SelectGroup>
                            <SelectLabel className="text-[10px] font-semibold tracking-wider uppercase text-slate-400 px-2 py-1">Vehicle Class</SelectLabel>
                            <SelectItem value="ALL" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">All Vehicles</SelectItem>
                            <SelectItem value="3 TON" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">3 TON</SelectItem>
                            <SelectItem value="5 TON" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">5 TON</SelectItem>
                            <SelectItem value="10 TON" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">10 TON</SelectItem>
                            <SelectItem value="20/24 TON" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">20/24 TON</SelectItem>
                            <SelectItem value="40 FEET" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">40 FEET</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>

                      {/* More Filters Dropdown */}
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                              "h-8 px-3 text-xs font-medium border-slate-200 dark:border-slate-800 bg-white rounded-lg gap-1.5 shrink-0 cursor-pointer",
                              (lineTypeFilter !== 'ALL' || statusFilter !== 'ALL') && "border-[#FA634E] text-[#FA634E]"
                            )}
                          >
                            <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
                            <span>More Filters</span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-64 p-3 shadow-xl border border-slate-200 bg-white rounded-lg space-y-3 z-[9999]">
                          <div className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-1.5">
                            Additional Filters
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-slate-500">Line Type</label>
                            <Select value={lineTypeFilter} onValueChange={(val) => setLineTypeFilter(val)}>
                              <SelectTrigger className="h-8 text-xs border-slate-200 bg-slate-50 rounded-lg">
                                <SelectValue placeholder="All Line Types" />
                              </SelectTrigger>
                              <SelectContent align="start" className="w-56 p-1 bg-white rounded-lg">
                                <SelectItem value="ALL" className="text-xs">All Line Types</SelectItem>
                                <SelectItem value="SINGLE_TRIP" className="text-xs">Single Trip</SelectItem>
                                <SelectItem value="ROUND_TRIP" className="text-xs">Round Trip</SelectItem>
                                <SelectItem value="10_HRS" className="text-xs">10 Hours Shift</SelectItem>
                                <SelectItem value="12_HRS" className="text-xs">12 Hours Shift</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-slate-500">Quotation Status</label>
                            <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val)}>
                              <SelectTrigger className="h-8 text-xs border-slate-200 bg-slate-50 rounded-lg">
                                <SelectValue placeholder="All Statuses" />
                              </SelectTrigger>
                              <SelectContent align="start" className="w-56 p-1 bg-white rounded-lg">
                                <SelectItem value="ALL" className="text-xs">All Statuses</SelectItem>
                                <SelectItem value="ACTIVE" className="text-xs">Active</SelectItem>
                                <SelectItem value="EXPIRED" className="text-xs">Expired</SelectItem>
                                <SelectItem value="FUTURE" className="text-xs">Future</SelectItem>
                                <SelectItem value="INACTIVE" className="text-xs">Inactive</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </PopoverContent>
                      </Popover>

                      {isFiltersActive && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearFilters}
                          className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg px-2.5 shrink-0 font-medium"
                        >
                          <X className="h-3.5 w-3.5 mr-1" />
                          <span>Clear</span>
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Dense Route Ledger Table */}
                  <div className="flex-1 overflow-x-auto">
                    {filteredWorkspaceRoutes.length === 0 ? (
                      /* Empty State */
                      <div className="p-12 text-center flex flex-col items-center justify-center gap-2 max-w-md mx-auto">
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
                          <RouteIcon className="w-5 h-5" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">No Commercial Routes Yet</h3>
                        <p className="text-xs text-slate-400">
                          {isFiltersActive ? 'No routes match your current active filters.' : 'This customer does not have any agreed commercial routes.'}
                        </p>
                        {isFiltersActive ? (
                          <Button variant="outline" size="sm" onClick={clearFilters} className="mt-2 h-8 text-xs font-semibold rounded-lg">
                            Clear Filters
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => navigate(`/quotations/new?customer_id=${selectedGroup.id}`)}
                            className="mt-2 h-8 px-3 text-xs font-semibold bg-[#FA634E] hover:bg-[#DF4834] text-white rounded-lg border-0"
                          >
                            <Plus size={13} className="mr-1" /> Add Commercial Route
                          </Button>
                        )}
                      </div>
                    ) : (
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/50 dark:bg-slate-800/20">
                            <th className="py-2.5 px-3.5 w-10">#</th>
                            <th className="py-2.5 px-3.5">Route / Stops</th>
                            <th className="py-2.5 px-3.5">Vehicle Class</th>
                            <th className="py-2.5 px-3.5">Operation Type</th>
                            <th className="py-2.5 px-3.5">Line Type</th>
                            <th className="py-2.5 px-3.5">Billing Rate</th>
                            <th className="py-2.5 px-3.5">Driver Charge</th>
                            <th className="py-2.5 px-3.5">Validity</th>
                            <th className="py-2.5 px-3.5">Surcharges</th>
                            <th className="py-2.5 px-3.5 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
                          {paginatedWorkspaceRoutes.map((row, idx) => {
                            const rowNumber = (workspacePage - 1) * workspacePerPage + idx + 1;
                            const driverChargeText = row.driver_payout != null && !isNaN(Number(row.driver_payout))
                              ? `SAR ${Number(row.driver_payout).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                              : '—';

                            return (
                              <tr
                                key={row.id}
                                onClick={() => handleOpenDrawer(row)}
                                className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                              >
                                <td className="py-3 px-3.5 font-mono text-slate-400 text-[11px]">
                                  {rowNumber}
                                </td>

                                <td className="py-3 px-3.5">
                                  <RouteStopsCell quotation={row} onOpenDrawer={handleOpenDrawer} />
                                </td>

                                <td className="py-3 px-3.5">
                                  {getVehicleClassBadge(row.vehicle_class)}
                                </td>

                                <td className="py-3 px-3.5">
                                  {getOperationTypeBadge(row.billing_type)}
                                </td>

                                <td className="py-3 px-3.5">
                                  {getLineTypeBadge(row.line_type || row.rate_category)}
                                </td>

                                <td className="py-3 px-3.5 font-mono font-bold text-slate-900 dark:text-slate-100 text-xs whitespace-nowrap">
                                  SAR {Number(row.rate ?? row.base_price ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </td>

                                <td className="py-3 px-3.5 font-mono text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">
                                  {driverChargeText}
                                </td>

                                <td className="py-3 px-3.5">
                                  <ValidityStatusCell quotation={row} />
                                </td>

                                <td className="py-3 px-3.5" onClick={(e) => e.stopPropagation()}>
                                  <SurchargesCell quotation={row} />
                                </td>

                                <td className="py-3 px-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => navigate(`/quotations/${row.id}/edit`)}
                                      className="h-7 px-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-blue-600 rounded-md border border-slate-200/80 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                                    >
                                      Edit
                                    </Button>

                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 rounded-md cursor-pointer">
                                          <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="w-48 p-1.5 shadow-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg z-[9999]">
                                        <DropdownMenuItem onClick={() => handleOpenDrawer(row)} className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                                          <Eye className="h-3.5 w-3.5 mr-2 text-slate-500" />
                                          <span>Inspect Route Details</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => navigate(`/quotations/${row.id}/edit`)} className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                                          <Edit2 className="h-3.5 w-3.5 mr-2 text-blue-600" />
                                          <span>Edit Commercial Line</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => navigate(`/quotations/new?customer_id=${row.customerId}&origin_id=${row.originLocationId || ''}&dest_id=${row.destinationLocationId || ''}`)} className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                                          <Copy className="h-3.5 w-3.5 mr-2 text-slate-500" />
                                          <span>Duplicate Route</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleToggleActive(row)} className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                                          <Power className="h-3.5 w-3.5 mr-2 text-emerald-600" />
                                          <span>{row.is_active ? 'Deactivate' : 'Activate'}</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator className="my-1 border-slate-100 dark:border-slate-800" />
                                        <DropdownMenuItem
                                          onSelect={(e) => e.preventDefault()}
                                          onClick={() => { setSelectedQuotation(row); setIsDeleteModalOpen(true); }}
                                          className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                        >
                                          <Trash2 className="h-3.5 w-3.5 mr-2" />
                                          <span>Delete Route</span>
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Pagination Footer */}
                  {filteredWorkspaceRoutes.length > 0 && (
                    <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 flex items-center justify-between text-xs text-slate-500">
                      <div>
                        Showing <span className="font-semibold text-slate-900 dark:text-slate-100">{(workspacePage - 1) * workspacePerPage + 1}–{Math.min(workspacePage * workspacePerPage, filteredWorkspaceRoutes.length)}</span> of <span className="font-semibold text-slate-900 dark:text-slate-100">{filteredWorkspaceRoutes.length}</span> routes
                      </div>

                      <div className="flex items-center gap-2">
                        <Select value={String(workspacePerPage)} onValueChange={(val) => setWorkspacePerPage(Number(val))}>
                          <SelectTrigger className="h-7 text-xs border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent align="end" className="w-24 bg-white p-1">
                            <SelectItem value="10" className="text-xs">10 / page</SelectItem>
                            <SelectItem value="20" className="text-xs">20 / page</SelectItem>
                            <SelectItem value="50" className="text-xs">50 / page</SelectItem>
                          </SelectContent>
                        </Select>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            disabled={workspacePage <= 1}
                            onClick={() => setWorkspacePage((p) => p - 1)}
                            className="h-7 w-7 rounded-lg border-slate-200 dark:border-slate-700"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </Button>

                          <span className="px-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {workspacePage} / {totalWorkspacePages}
                          </span>

                          <Button
                            variant="outline"
                            size="icon"
                            disabled={workspacePage >= totalWorkspacePages}
                            onClick={() => setWorkspacePage((p) => p + 1)}
                            className="h-7 w-7 rounded-lg border-slate-200 dark:border-slate-700"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-400">
                  Select a customer from the left list to view their commercial routes.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Commercial Route"
        message="Are you sure you want to delete this commercial route quotation? Historical trips billed with this quotation will retain their commercial snapshot."
        confirmLabel="Delete Route"
        isDestructive
      />

      {/* Excel Import Modal */}
      <ExcelImportDialog
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        entityLabel="Quotations"
        columns={RATE_CARD_COLUMNS}
        requiredFields={['price']}
        preferSheet="Quotations"
        templateUrl="/templates/MERCON_RateCards_Import_Template.xlsx"
        onImport={(rows) => quotationService.importRows(rows as any)}
        invalidateKeys={[['quotations']]}
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        filteredData={selectedGroup ? selectedGroup.quotations : rawQuotations}
        allData={rawQuotations}
        columns={QUOTATION_EXPORT_COLUMNS}
        fileNamePrefix="Mercon_Commercial_Quotations"
        title="Export Commercial Quotations"
      />

      {/* Right-Side Route Details Inspection Drawer */}
      <QuotationRouteDrawer
        quotation={drawerQuotation}
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        customerName={selectedGroup?.name}
      />
    </DashboardLayout>
  );
}

export const RateCardListPage = QuotationListPage;
