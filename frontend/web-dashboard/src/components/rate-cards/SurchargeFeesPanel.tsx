import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Tag, 
  UploadCloud, 
  Search, 
  Building2, 
  Filter, 
  X, 
  Download, 
  Layers, 
  FileSpreadsheet, 
  FileText, 
  ChevronDown, 
  DollarSign, 
  ArrowRight, 
  ChevronsLeft, 
  ChevronsRight, 
  ChevronLeft, 
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import KpiCard from '@/components/ui/KpiCard';
import { CheckBadge, CustomerBuilding } from '@/components/ui/kpi-icons';
import ConfirmModal from '@/components/ui/ConfirmModal';
import SurchargeRuleFormDialog from '@/components/rate-cards/SurchargeRuleFormDialog';
import ExcelImportDialog from '@/components/fleet/ExcelImportDialog';
import { SURCHARGE_COLUMNS } from '@/utils/importUtils';
import { surchargeRuleService, SurchargeRule } from '@/services/rateCardService';
import { customerService } from '@/services/customerService';
import { exportExcelTable, exportPDFTable } from '@/utils/exportUtils';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

function getChargeTypeBadgeStyle(type: string): string {
  const t = (type || '').toUpperCase();
  if (t.includes('DEMURRAGE') || t.includes('WAIT') || t.includes('DELAY')) {
    return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50';
  }
  if (t.includes('LABOR') || t.includes('LABOUR') || t.includes('HELPER') || t.includes('OFFLOAD') || t.includes('LOAD')) {
    return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50';
  }
  if (t.includes('STOP') || t.includes('EXTRA') || t.includes('MULTIPLE')) {
    return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900/50';
  }
  if (t.includes('TOLL') || t.includes('CUSTOM') || t.includes('BORDER') || t.includes('PORT')) {
    return 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-900/50';
  }
  if (t.includes('FUEL') || t.includes('SURCHARGE') || t.includes('OVERNIGHT')) {
    return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50';
  }
  return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
}

const SURCHARGE_EXPORT_HEADERS = [
  'Customer', 'Charge Type', 'Unit', 'Applies To Lane', 'Vehicle Type', 'Rate (SAR)', 'Status'
];

const surchargeRulesToExportRows = (rulesList: SurchargeRule[]) => rulesList.map((r) => [
  r.customer?.name || 'Customer',
  r.charge_type,
  r.unit || '—',
  r.rateCard ? `${r.rateCard.route_origin} → ${r.rateCard.route_destination}` : 'Every lane',
  r.vehicle_type || 'All Vehicles',
  Number(r.rate || 0),
  r.is_active ? 'Active' : 'Inactive'
]);

export default function SurchargeFeesPanel() {
  const queryClient = useQueryClient();
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [chargeTypeFilter, setChargeTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [search, setSearch] = useState('');
  
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SurchargeRule | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SurchargeRule | null>(null);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'excel' | 'pdf'>('excel');
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  const debouncedSearch = useDebouncedValue(search, 300);

  const { data: customersRes } = useQuery({
    queryKey: ['customers-select'],
    queryFn: () => customerService.getAll({ per_page: 100 }),
  });
  const customers = customersRes?.data || [];

  const { data: allRules = [], isLoading } = useQuery({
    queryKey: ['surcharge-rules', 'all'],
    queryFn: () => surchargeRuleService.list(undefined),
  });

  // Extract unique charge types for filter dropdown
  const chargeTypeOptions = useMemo(() => {
    const set = new Set<string>();
    allRules.forEach((r) => {
      if (r.charge_type) set.add(r.charge_type);
    });
    return Array.from(set).sort();
  }, [allRules]);

  // Client-side filtered list for comprehensive search & multi-filtering
  const filteredRules = useMemo(() => {
    return allRules.filter((r) => {
      // Customer filter
      if (customerFilter !== 'all' && r.customerId !== customerFilter) return false;

      // Charge type filter
      if (chargeTypeFilter !== 'all' && r.charge_type !== chargeTypeFilter) return false;

      // Status filter
      if (statusFilter === 'active' && !r.is_active) return false;
      if (statusFilter === 'inactive' && r.is_active) return false;

      // Text search
      if (debouncedSearch.trim()) {
        const q = debouncedSearch.toLowerCase().trim();
        const custName = (r.customer?.name || '').toLowerCase();
        const type = (r.charge_type || '').toLowerCase();
        const unit = (r.unit || '').toLowerCase();
        const vehicle = (r.vehicle_type || '').toLowerCase();
        const route = r.rateCard ? `${r.rateCard.route_origin} ${r.rateCard.route_destination}`.toLowerCase() : 'every lane';
        
        return custName.includes(q) || type.includes(q) || unit.includes(q) || vehicle.includes(q) || route.includes(q);
      }

      return true;
    });
  }, [allRules, customerFilter, chargeTypeFilter, statusFilter, debouncedSearch]);

  // Pagination calculation
  const totalCount = filteredRules.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const paginatedRules = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRules.slice(start, start + pageSize);
  }, [filteredRules, currentPage, pageSize]);

  // Clean KPIs calculation
  const kpis = useMemo(() => {
    const total = allRules.length;
    const activeCount = allRules.filter(r => r.is_active).length;
    const activePct = total > 0 ? Math.round((activeCount / total) * 100) : 0;

    const uniqueCusts = new Set(allRules.map(r => r.customerId).filter(Boolean)).size;

    return {
      total,
      activeCount,
      activePct,
      uniqueCusts,
    };
  }, [allRules]);

  // Bulk Selection Handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(paginatedRules.map((r) => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    }
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => surchargeRuleService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surcharge-rules'] });
      setDeleteTarget(null);
      toast.success('Surcharge fee deleted');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to delete surcharge fee');
    }
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => surchargeRuleService.delete(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surcharge-rules'] });
      setSelectedIds([]);
      setBulkDeleteConfirmOpen(false);
      toast.success(`Deleted ${selectedIds.length} surcharge fees`);
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to delete selected surcharge fees');
    }
  });

  const handleExport = async (format: 'excel' | 'pdf') => {
    try {
      if (!filteredRules.length) {
        toast.warning('No surcharge fees available for export.');
        return;
      }
      toast.info(`Preparing ${format.toUpperCase()} export...`);
      const rows = surchargeRulesToExportRows(filteredRules);
      const title = 'Surcharge Fees Schedule';
      const dateStr = new Date().toISOString().slice(0, 10);

      if (format === 'excel') {
        await exportExcelTable(title, SURCHARGE_EXPORT_HEADERS, rows, `surcharge_fees_${dateStr}.xlsx`);
        toast.success('Excel export generated successfully');
      } else {
        exportPDFTable(title, SURCHARGE_EXPORT_HEADERS, rows, `surcharge_fees_${dateStr}.pdf`);
        toast.success('PDF export generated successfully');
      }
    } catch (err: any) {
      toast.error(`Export failed: ${err?.message || 'Error creating export'}`);
    }
  };

  const isAllPageSelected = paginatedRules.length > 0 && paginatedRules.every((r) => selectedIds.includes(r.id));
  const hasActiveFilters = customerFilter !== 'all' || chargeTypeFilter !== 'all' || statusFilter !== 'all' || search.trim() !== '';

  const fromIndex = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const toIndex = totalCount === 0 ? 0 : Math.min(fromIndex + paginatedRules.length - 1, totalCount);

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      
      {/* ── Focused 2-Card Instrument Panel KPI Section ──────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 shrink-0">
        
        {/* Card 1: Active Surcharge Rules */}
        <KpiCard
          title="ACTIVE SURCHARGES"
          value={
            <span>
              {kpis.activeCount}
              <span className="text-[16px] font-semibold ml-1.5 opacity-85">Active</span>
            </span>
          }
          variant="brand"
          description={`${kpis.total} standing fee rules configured`}
          icon={CheckBadge}
          completionGauge={{
            percentage: kpis.activePct,
            label: "Active rule ratio",
            subtext: `${kpis.activeCount} Active • ${kpis.total - kpis.activeCount} Inactive`
          }}
          isActive={statusFilter === 'active'}
          onClick={() => setStatusFilter(prev => prev === 'active' ? 'all' : 'active')}
        />

        {/* Card 2: Customers Covered */}
        <KpiCard
          title="CUSTOMERS SCHEDULED"
          value={
            <span>
              {kpis.uniqueCusts}
              <span className="text-[16px] font-semibold ml-1.5 opacity-85">Customers</span>
            </span>
          }
          variant="amber"
          description="Customers with standing fee schedules"
          icon={CustomerBuilding}
        />
      </div>

      {/* ── Toolbar & Control Bar ────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 shadow-2xs flex flex-col gap-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          {/* Left Toolbar: Search and Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
            
            {/* Search Input */}
            <div className="relative w-full sm:w-64 lg:w-72 shrink-0">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                placeholder="Search customer, charge type, unit..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                className="w-full pl-8.5 pr-8 h-9 text-xs bg-white dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-700 focus-visible:ring-brand/20 focus-visible:border-brand rounded-lg font-medium"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Customer Filter Dropdown */}
            <Select value={customerFilter} onValueChange={(v) => { setCustomerFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="h-9 px-3 w-[190px] shrink-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold">
                <div className="flex items-center gap-2 truncate">
                  <Building2 className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                  <SelectValue placeholder="All Customers" />
                </div>
              </SelectTrigger>
              <SelectContent align="start" className="w-56 max-h-[300px]">
                <SelectGroup>
                  <SelectLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">Customer</SelectLabel>
                  <SelectItem value="all" className="text-xs font-medium">All Customers</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs font-medium">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            {/* Charge Type Filter Dropdown */}
            <Select value={chargeTypeFilter} onValueChange={(v) => { setChargeTypeFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="h-9 px-3 w-[180px] shrink-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold">
                <div className="flex items-center gap-2 truncate">
                  <Tag className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <SelectValue placeholder="All Charge Types" />
                </div>
              </SelectTrigger>
              <SelectContent align="start" className="w-52 max-h-[300px]">
                <SelectGroup>
                  <SelectLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">Charge Type</SelectLabel>
                  <SelectItem value="all" className="text-xs font-medium">All Charge Types</SelectItem>
                  {chargeTypeOptions.map((type) => (
                    <SelectItem key={type} value={type} className="text-xs font-medium">
                      {type}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            {/* Status Filter Dropdown */}
            <Select value={statusFilter} onValueChange={(v: any) => { setStatusFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="h-9 px-3 w-[140px] shrink-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold">
                <div className="flex items-center gap-2 truncate">
                  <Filter className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <SelectValue placeholder="All Status" />
                </div>
              </SelectTrigger>
              <SelectContent align="start" className="w-40">
                <SelectItem value="all" className="text-xs font-medium">All Statuses</SelectItem>
                <SelectItem value="active" className="text-xs font-medium">Active Only</SelectItem>
                <SelectItem value="inactive" className="text-xs font-medium">Inactive Only</SelectItem>
              </SelectContent>
            </Select>

          </div>

          {/* Right Toolbar: Export, Import & Primary Add Button */}
          <div className="flex items-center gap-2 shrink-0">
            
            {/* Export Dropdown */}
            <DropdownMenu open={exportMenuOpen} onOpenChange={setExportMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5 text-xs font-semibold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 shadow-2xs hover:bg-slate-50"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" /> Export
                  <ChevronDown className="h-3 w-3 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 p-1.5 shadow-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl">
                <DropdownMenuLabel className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-2 py-1">
                  Export Schedule
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => handleExport('excel')}
                  className="cursor-pointer text-xs font-semibold py-1.5 px-2 rounded-md"
                >
                  <FileSpreadsheet className="mr-2 h-3.5 w-3.5 text-emerald-600" />
                  Export as Excel
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleExport('pdf')}
                  className="cursor-pointer text-xs font-semibold py-1.5 px-2 rounded-md"
                >
                  <FileText className="mr-2 h-3.5 w-3.5 text-rose-600" />
                  Export as PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Import Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setImportDialogOpen(true)}
              className="h-9 gap-1.5 text-xs font-bold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 shadow-2xs hover:bg-slate-50"
            >
              <UploadCloud className="w-3.5 h-3.5 text-slate-500" />
              <span>Import</span>
            </Button>

            {/* Primary Add Button */}
            <Button
              size="sm"
              onClick={() => setIsAddOpen(true)}
              className="h-9 gap-1.5 text-xs bg-brand hover:bg-brand-hover text-white font-bold shadow-xs rounded-lg px-4"
            >
              <Plus className="w-4 h-4" /> Add Surcharge Fee
            </Button>
          </div>

        </div>

        {/* Active Filters Pill Banner */}
        {hasActiveFilters && (
          <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200/80 dark:border-orange-900/40 px-3.5 py-1.5 rounded-lg flex items-center justify-between gap-3 text-xs font-semibold text-orange-900 dark:text-orange-200">
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="h-3.5 w-3.5 text-brand shrink-0" />
              <span>
                Filtered by:{' '}
                {search && <span className="mr-2">Search: <strong className="underline text-slate-900 dark:text-slate-100">{search}</strong></span>}
                {customerFilter !== 'all' && (
                  <span className="mr-2">Customer: <strong className="underline text-slate-900 dark:text-slate-100">{customers.find(c => c.id === customerFilter)?.name}</strong></span>
                )}
                {chargeTypeFilter !== 'all' && (
                  <span className="mr-2">Type: <strong className="underline text-slate-900 dark:text-slate-100">{chargeTypeFilter}</strong></span>
                )}
                {statusFilter !== 'all' && (
                  <span className="mr-2">Status: <strong className="underline text-slate-900 dark:text-slate-100">{statusFilter}</strong></span>
                )}
                ({totalCount} rule{totalCount === 1 ? '' : 's'} matching)
              </span>
            </div>
            <button
              onClick={() => {
                setSearch('');
                setCustomerFilter('all');
                setChargeTypeFilter('all');
                setStatusFilter('all');
                setCurrentPage(1);
              }}
              className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-orange-200 dark:border-orange-800 text-[11px] font-bold text-brand hover:bg-orange-100 flex items-center gap-1 shrink-0"
            >
              <span>Clear Filters</span>
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* ── Data Table Ledger & Empty States ─────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col w-full">
        
        {/* Ledger Header Bar */}
        <div className="shrink-0 p-3.5 sm:px-4 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h3 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-500" />
              <span>Surcharge Fee Ledger</span>
            </h3>
            <Badge variant="outline" className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 text-[11px] font-mono font-bold px-2 py-0.5">
              {totalCount} {totalCount === 1 ? 'fee rule' : 'fee rules'}
            </Badge>
          </div>

          {/* Bulk Selection Bar */}
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 animate-fade-in">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                {selectedIds.length} selected
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setBulkDeleteConfirmOpen(true)}
                className="h-7 text-xs font-bold gap-1 px-2.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Selected
              </Button>
            </div>
          )}
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50/90 dark:bg-slate-900/80 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllPageSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-slate-300 text-brand focus:ring-brand/30 cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Charge Type</th>
                <th className="px-4 py-3">Applies To</th>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3 text-right">Rate</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
              {isLoading && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400 font-medium">
                    Loading surcharge fee rules...
                  </td>
                </tr>
              )}
              
              {!isLoading && paginatedRules.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center mb-1">
                        <Tag size={22} />
                      </div>
                      <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100">No Surcharge Fees Found</p>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {hasActiveFilters
                          ? 'No surcharge fees match your selected filters. Try resetting search criteria.'
                          : 'No standing surcharge fees configured yet. Add standing rates for waiting time, additional stops, or labor.'}
                      </p>
                      {!hasActiveFilters && (
                        <Button
                          size="sm"
                          onClick={() => setIsAddOpen(true)}
                          className="mt-2 h-8 text-xs font-bold bg-brand hover:bg-brand-hover text-white gap-1.5 px-3.5"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add First Surcharge Fee
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              )}

              {paginatedRules.map((rule) => {
                const isSelected = selectedIds.includes(rule.id);
                return (
                  <tr
                    key={rule.id}
                    className={`transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${
                      isSelected ? 'bg-orange-50/50 dark:bg-orange-950/20' : ''
                    }`}
                  >
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handleSelectOne(rule.id, e.target.checked)}
                        className="rounded border-slate-300 text-brand focus:ring-brand/30 cursor-pointer"
                      />
                    </td>
                    
                    {/* Customer */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
                        <Building2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span>{rule.customer?.name || '—'}</span>
                      </div>
                    </td>

                    {/* Charge Type */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${getChargeTypeBadgeStyle(rule.charge_type)}`}
                        >
                          {rule.charge_type}
                        </Badge>
                        {rule.unit && (
                          <span className="text-[11px] text-slate-400 font-medium">({rule.unit})</span>
                        )}
                      </div>
                    </td>

                    {/* Applies To */}
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {rule.rateCard ? (
                        <div className="flex items-center gap-1 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200/60 dark:border-slate-700 w-fit">
                          <span>{rule.rateCard.route_origin}</span>
                          <ArrowRight className="w-3 h-3 text-brand" />
                          <span>{rule.rateCard.route_destination}</span>
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-[10px] font-semibold bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
                          Every lane
                        </Badge>
                      )}
                    </td>

                    {/* Vehicle */}
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {rule.vehicle_type ? (
                        <Badge variant="outline" className="text-[10px] font-bold uppercase bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300">
                          {rule.vehicle_type}
                        </Badge>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">All Vehicles</span>
                      )}
                    </td>

                    {/* Rate */}
                    <td className="px-4 py-3 text-right">
                      <div className="font-mono text-xs font-extrabold text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200/60 dark:border-slate-700 inline-block">
                        {rule.currency || 'SAR'} {Number(rule.rate).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 text-center">
                      <Badge className={rule.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}>
                        {rule.is_active ? '● Active' : '● Inactive'}
                      </Badge>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditTarget(rule)}
                          title="Edit Surcharge Fee"
                          className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(rule)}
                          title="Delete Surcharge Fee"
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalCount > 0 && (
          <div className="p-3.5 sm:px-5 border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/60 dark:bg-slate-900/60 text-xs font-semibold text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                  className="h-8 px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand/20 cursor-pointer shadow-2xs"
                >
                  {[10, 25, 50, 100].map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <span className="text-slate-500 dark:text-slate-400 font-medium border-l border-slate-200 dark:border-slate-700 pl-4">
                Showing <span className="font-extrabold text-slate-900 dark:text-slate-100">{fromIndex}</span> to <span className="font-extrabold text-slate-900 dark:text-slate-100">{toIndex}</span> of <span className="font-extrabold text-slate-900 dark:text-slate-100">{totalCount}</span> entries
              </span>
            </div>

            <div className="flex items-center gap-1.5 ml-auto">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs"
              >
                <ChevronsLeft size={14} />
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs"
              >
                <ChevronLeft size={14} />
              </button>
              
              <span className="px-3 py-1 text-xs font-bold text-slate-700 dark:text-slate-300">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs"
              >
                <ChevronRight size={14} />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs"
              >
                <ChevronsRight size={14} />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* ── Dialog Modals ────────────────────────────────────────────── */}
      <ExcelImportDialog
        isOpen={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        entityLabel="Surcharge Fees"
        columns={SURCHARGE_COLUMNS}
        requiredFields={['customer_name', 'charge_type', 'rate']}
        preferSheet="surcharge"
        templateUrl="/templates/MERCON_SurchargeFees_Import_Template.xlsx"
        matchLabel="customer + lane + charge type + vehicle type"
        onImport={(rows) => surchargeRuleService.importRows(rows)}
        invalidateKeys={[['surcharge-rules']]}
      />

      <SurchargeRuleFormDialog isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} />
      <SurchargeRuleFormDialog
        isOpen={!!editTarget}
        rule={editTarget}
        onClose={() => setEditTarget(null)}
      />

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Delete Surcharge Fee"
        message={`Are you sure you want to remove "${deleteTarget?.charge_type}" for ${deleteTarget?.customer?.name || 'this customer'}? Trips that already used it will maintain their frozen historical billing amount.`}
        isDestructive
        isLoading={deleteMutation.isPending}
      />

      <ConfirmModal
        isOpen={bulkDeleteConfirmOpen}
        onClose={() => setBulkDeleteConfirmOpen(false)}
        onConfirm={() => bulkDeleteMutation.mutate(selectedIds)}
        title="Delete Selected Surcharge Fees"
        message={`Are you sure you want to delete ${selectedIds.length} selected surcharge fee rules? This action cannot be undone.`}
        isDestructive
        isLoading={bulkDeleteMutation.isPending}
      />
    </div>
  );
}

