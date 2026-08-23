import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { 
  Plus, 
  Edit2, 
  FileText, 
  Download, 
  Trash2, 
  RotateCw, 
  Filter,
  Search,
  CheckSquare,
  ArrowLeft,
  ArrowRight,
  Building2,
  MapPin,
  LayoutGrid,
  List,
  AlertTriangle,
  FileSpreadsheet,
  ChevronDown,
  Layers,
  UploadCloud,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowDown,
  ArrowUp,
  Truck,
  Clock,
  User,
  DollarSign,
  Receipt,
  Calendar,
  CheckCircle2,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import KpiCard from '@/components/ui/KpiCard';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { CustomerBuilding, RouteLine, CheckBadge } from '@/components/ui/kpi-icons';
import { quotationService, Quotation, surchargeRuleService } from '@/services/quotationService';
import { customerService } from '@/services/customerService';
import QuotationFormDialog from '@/components/rate-cards/RateCardFormDialog';
import SurchargeFeesPanel from '@/components/rate-cards/SurchargeFeesPanel';
import ExcelImportDialog from '@/components/fleet/ExcelImportDialog';
import { RATE_CARD_COLUMNS } from '@/utils/importUtils';
import { exportExcelTable, exportPDFTable } from '@/utils/exportUtils';
import ExportModal, { ExportColumn, ExportFilter } from '@/components/ui/ExportModal';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

const QUOTATION_EXPORT_COLUMNS: ExportColumn<Quotation>[] = [
  { id: 'name', label: 'Quotation Name', accessor: (q) => q.name || 'Quotation' },
  { id: 'customer', label: 'Customer', accessor: (q) => q.customer?.name || 'Customer' },
  { id: 'vehicle_class', label: 'Vehicle Class', accessor: (q) => q.vehicle_class || '—' },
  { id: 'source_vehicle_label', label: 'Source Vehicle Label', accessor: (q) => q.source_vehicle_label || q.vehicle_type || '—' },
  { id: 'line_type', label: 'Line Type', accessor: (q) => q.line_type || q.rate_category || 'SINGLE_TRIP' },
  { id: 'billing_type', label: 'Billing Type', accessor: (q) => q.billing_type || 'EXTRA' },
  { id: 'pricing_basis', label: 'Pricing Basis', accessor: (q) => q.pricing_basis ? (q.pricing_basis === 'PER_TRIP' ? 'Per Trip' : 'Per Month') : 'Not specified' },
  { id: 'rate', label: 'Rate (SAR)', accessor: (q) => `SAR ${Number(q.rate || q.base_price || 0).toLocaleString()}` },
  { id: 'status', label: 'Status', accessor: (q) => (q.is_active ? 'Active' : 'Inactive') },
  { id: 'validity', label: 'Validity', accessor: (q) => q.valid_from ? `${q.valid_from.substring(0, 10)} to ${q.valid_to ? q.valid_to.substring(0, 10) : 'Ongoing'}` : 'Ongoing' },
];

function getLineTypeBadge(lineType?: string | null) {
  const lt = (lineType || '').toUpperCase();
  if (lt.includes('ROUND')) {
    return <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold text-[10px]">Round Trip</Badge>;
  }
  if (lt.includes('10')) {
    return <Badge className="bg-cyan-50 text-cyan-700 border-cyan-200 font-semibold text-[10px]">10 Hrs Duty</Badge>;
  }
  if (lt.includes('12')) {
    return <Badge className="bg-purple-50 text-purple-700 border-purple-200 font-semibold text-[10px]">12 Hrs Duty</Badge>;
  }
  return <Badge className="bg-slate-100 text-slate-700 border-slate-200 font-semibold text-[10px]">Single Trip</Badge>;
}

function getBillingTypeBadge(billingType?: string | null) {
  const bt = (billingType || '').toUpperCase();
  if (bt.includes('MONTHLY')) {
    return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold text-[10px]">Monthly</Badge>;
  }
  return <Badge className="bg-amber-50 text-amber-700 border-amber-200 font-semibold text-[10px]">Extra</Badge>;
}

function getPricingBasisBadge(pricingBasis?: string | null) {
  if (!pricingBasis) {
    return <span className="text-xs text-slate-400 font-medium">Not specified</span>;
  }
  if (pricingBasis === 'PER_TRIP') {
    return <Badge className="bg-blue-50 text-blue-700 border-blue-200 font-medium text-[10px]">Per Trip</Badge>;
  }
  if (pricingBasis === 'PER_MONTH') {
    return <Badge className="bg-purple-50 text-purple-700 border-purple-200 font-medium text-[10px]">Per Month</Badge>;
  }
  return <span className="text-xs text-slate-400 font-medium">{pricingBasis}</span>;
}

export default function QuotationListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [customerFilter, setCustomerFilter] = useState('ALL');
  const [billingTypeFilter, setBillingTypeFilter] = useState('ALL');
  const [lineTypeFilter, setLineTypeFilter] = useState('ALL');
  const [pricingBasisFilter, setPricingBasisFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [page, setPage] = useState(1);
  const perPage = 15;

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // 1. Fetch Quotations list
  const { data: quotationsRes, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['quotations', page, search, customerFilter, billingTypeFilter, lineTypeFilter, pricingBasisFilter, statusFilter],
    queryFn: () =>
      quotationService.getAll({
        page,
        per_page: perPage,
        ...(search ? { search } : {}),
        ...(customerFilter !== 'ALL' ? { customerId: customerFilter } : {}),
        ...(billingTypeFilter !== 'ALL' ? { billing_type: billingTypeFilter } : {}),
        ...(lineTypeFilter !== 'ALL' ? { line_type: lineTypeFilter } : {}),
        ...(pricingBasisFilter !== 'ALL' ? { pricing_basis: pricingBasisFilter } : {}),
        ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
      }),
    placeholderData: keepPreviousData,
  });

  const quotations = quotationsRes?.data || [];
  const meta = quotationsRes?.meta || { total: quotations.length, total_pages: 1 };

  // 2. Fetch Customers list for filter
  const { data: customersRes } = useQuery({
    queryKey: ['customers-lookup'],
    queryFn: () => customerService.getAll({ per_page: 100, mode: 'lookup' }),
  });
  const customers = customersRes?.data || [];

  // Compute KPI metrics
  const activeCount = quotations.filter((q) => q.is_active).length;
  const monthlyCount = quotations.filter((q) => (q.billing_type || '').toUpperCase() === 'MONTHLY').length;
  const uniqueCustomersCount = new Set(quotations.map((q) => q.customerId)).size;

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

  return (
    <DashboardLayout active="Quotations" title="Commercial Quotations">
      <div className="space-y-6 pb-12">
        {/* Top Bar / Header Layout */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              <span>🏢 MERCON Logistics</span>
              <span>•</span>
              <span>Commercial Pricing</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Commercial Quotations
              </h1>
              <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold">
                Quotations Module
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsImportModalOpen(true)}
              className="h-9 gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200"
            >
              <UploadCloud className="h-4 w-4 text-slate-500" />
              <span>Import</span>
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setSelectedQuotation(null);
                setIsFormOpen(true);
              }}
              className="h-9 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm px-4"
            >
              <Plus className="h-4 w-4" />
              <span>+ New Quotation</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => refetch()}
              title="Refresh Data"
              className="h-9 w-9 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <RotateCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* Instrument-Panel KPI Cards (4 Column Grid) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Total Quotations"
            value={meta.total}
            subtitle="Registered commercial rates"
            trend="neutral"
            icon={<Receipt className="h-5 w-5 text-indigo-600" />}
          />
          <KpiCard
            title="Active Quotations"
            value={activeCount}
            subtitle="Currently billable for trips"
            trend="up"
            icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
          />
          <KpiCard
            title="Customers Billed"
            value={uniqueCustomersCount}
            subtitle="Customers with active quotes"
            trend="neutral"
            icon={<Building2 className="h-5 w-5 text-blue-600" />}
          />
          <KpiCard
            title="Monthly Rules"
            value={monthlyCount}
            subtitle="Monthly fleet agreements"
            trend="up"
            icon={<Calendar className="h-5 w-5 text-purple-600" />}
          />
        </div>

        {/* Toolbar & Control Bar */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search ID, customer, lane, vehicle class..."
                className="pl-9 h-9 text-xs bg-slate-50/50 dark:bg-slate-800/50 border-slate-200"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Customer Filter */}
              <Select value={customerFilter} onValueChange={setCustomerFilter}>
                <SelectTrigger className="h-9 text-xs min-w-[140px] bg-slate-50/50 dark:bg-slate-800/50 border-slate-200">
                  <SelectValue placeholder="Customer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Customers</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Line Type Filter */}
              <Select value={lineTypeFilter} onValueChange={setLineTypeFilter}>
                <SelectTrigger className="h-9 text-xs min-w-[130px] bg-slate-50/50 dark:bg-slate-800/50 border-slate-200">
                  <SelectValue placeholder="Line Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Line Types</SelectItem>
                  <SelectItem value="SINGLE_TRIP">Single Trip</SelectItem>
                  <SelectItem value="ROUND_TRIP">Round Trip</SelectItem>
                  <SelectItem value="10_HRS">10 Hrs Duty</SelectItem>
                  <SelectItem value="12_HRS">12 Hrs Duty</SelectItem>
                </SelectContent>
              </Select>

              {/* Billing Type Filter */}
              <Select value={billingTypeFilter} onValueChange={setBillingTypeFilter}>
                <SelectTrigger className="h-9 text-xs min-w-[130px] bg-slate-50/50 dark:bg-slate-800/50 border-slate-200">
                  <SelectValue placeholder="Billing Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Billing</SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                  <SelectItem value="EXTRA">Extra</SelectItem>
                </SelectContent>
              </Select>

              {/* Pricing Basis Filter */}
              <Select value={pricingBasisFilter} onValueChange={setPricingBasisFilter}>
                <SelectTrigger className="h-9 text-xs min-w-[140px] bg-slate-50/50 dark:bg-slate-800/50 border-slate-200">
                  <SelectValue placeholder="Pricing Basis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Basis</SelectItem>
                  <SelectItem value="PER_TRIP">Per Trip</SelectItem>
                  <SelectItem value="PER_MONTH">Per Month</SelectItem>
                  <SelectItem value="NULL">Not specified</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Data Table Ledger & Empty States */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          {/* Ledger Header Bar */}
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">🥞</span>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Commercial Quotation Ledger
              </h2>
            </div>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
              {meta.total} quotations
            </span>
          </div>

          {isLoading ? (
            <div className="py-20 text-center text-xs text-slate-400">
              Loading commercial quotations...
            </div>
          ) : quotations.length === 0 ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-xl">
                📄
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                No Quotations Found
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No commercial quotation rules match your current filter criteria.
              </p>
              <Button
                size="sm"
                onClick={() => {
                  setSelectedQuotation(null);
                  setIsFormOpen(true);
                }}
                className="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 rounded-xl"
              >
                + Create First Quotation
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Route / Lane</th>
                    <th className="py-3 px-4">Vehicle</th>
                    <th className="py-3 px-4">Line Type</th>
                    <th className="py-3 px-4">Billing</th>
                    <th className="py-3 px-4">Basis</th>
                    <th className="py-3 px-4 text-right">Commercial Rate</th>
                    <th className="py-3 px-4">Validity</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {quotations.map((q) => {
                    const stops = q.stops || [];
                    const pickup = stops.find((s) => s.stop_type === 'Pickup') || stops[0];
                    const dropoff = [...stops].reverse().find((s) => s.stop_type === 'Dropoff') || stops[stops.length - 1];

                    const originName = pickup?.source_label || pickup?.location?.name || q.route_origin || 'Origin';
                    const destName = dropoff?.source_label || dropoff?.location?.name || q.route_destination || 'Destination';

                    return (
                      <tr key={q.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                          {q.customer?.name || 'Customer'}
                        </td>
                        <td className="py-3 px-4 font-medium">
                          <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                            <span>{originName}</span>
                            <span className="text-slate-400">→</span>
                            <span>{destName}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {q.source_vehicle_label || q.vehicle_class || 'Standard'}
                          </span>
                          {q.vehicle_class && q.source_vehicle_label && q.vehicle_class !== q.source_vehicle_label && (
                            <span className="block text-[10px] text-slate-400">({q.vehicle_class})</span>
                          )}
                        </td>
                        <td className="py-3 px-4">{getLineTypeBadge(q.line_type || q.rate_category)}</td>
                        <td className="py-3 px-4">{getBillingTypeBadge(q.billing_type)}</td>
                        <td className="py-3 px-4">{getPricingBasisBadge(q.pricing_basis)}</td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-slate-100">
                          {q.currency || 'SAR'} {Number(q.rate ?? q.base_price ?? 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[11px]">
                          {q.valid_from ? (
                            <span>
                              {q.valid_from.substring(0, 10)} {q.valid_to ? `→ ${q.valid_to.substring(0, 10)}` : '(Ongoing)'}
                            </span>
                          ) : (
                            <span className="text-slate-400">Ongoing</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {q.is_active ? (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">Active</Badge>
                          ) : (
                            <Badge className="bg-slate-100 text-slate-500 border-slate-200 text-[10px]">Inactive</Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => navigate(`/quotations/${q.id}`)}
                              title="View Quotation Details"
                              className="h-7 w-7 text-slate-500 hover:text-indigo-600"
                            >
                              <FileText className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedQuotation(q);
                                setIsFormOpen(true);
                              }}
                              title="Edit Quotation"
                              className="h-7 w-7 text-slate-500 hover:text-blue-600"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedQuotation(q);
                                setIsDeleteModalOpen(true);
                              }}
                              title="Delete Quotation"
                              className="h-7 w-7 text-slate-500 hover:text-rose-600"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          {meta.total_pages > 1 && (
            <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <span>
                Page {page} of {meta.total_pages}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="h-8 text-xs"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= meta.total_pages}
                  onClick={() => setPage((p) => p + 1)}
                  className="h-8 text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quotation Creation & Editing Modal */}
      <QuotationFormDialog
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedQuotation(null);
        }}
        quotation={selectedQuotation}
      />

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Commercial Quotation"
        message="Are you sure you want to delete this quotation? Historical trips billed with this quotation will retain their commercial snapshot."
        confirmLabel="Delete Quotation"
        isDestructive
      />

      {/* Excel Import Modal */}
      <ExcelImportDialog
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        entityLabel="Quotations"
        columns={RATE_CARD_COLUMNS}
        requiredFields={['rate']}
        preferSheet="Quotations"
        templateUrl="/templates/Quotations_Template.xlsx"
        onImport={(rows) => quotationService.importRows(rows as any)}
        invalidateKeys={[['quotations']]}
      />
    </DashboardLayout>
  );
}

export const RateCardListPage = QuotationListPage;
