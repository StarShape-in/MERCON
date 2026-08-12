import { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Plus, Download, RotateCw, Filter, MoreVertical, Receipt, X, 
  Building2, CheckCircle2, Clock, FileText, Check, Search, 
  LayoutGrid, List, ExternalLink, ShieldCheck, Tag
} from 'lucide-react';
import { InvoiceDoc, ClockIcon, RiskAlert, CheckBadge, RevenueChart } from '@/components/ui/kpi-icons';

import { downloadCSV } from '@/utils/exportUtils';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import KpiCard from '@/components/ui/KpiCard';
import { invoiceService, Invoice, InvoiceStatus } from '@/services/invoiceService';
import { tripService, Trip } from '@/services/tripService';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

export default function InvoiceListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Mark Trip Invoiced Modal State
  const [showMarkModal, setShowMarkModal] = useState(false);
  const [selectedTripForModal, setSelectedTripForModal] = useState<Trip | null>(null);
  const [zatcaRefInput, setZatcaRefInput] = useState('');
  const [modalStatusInput, setModalStatusInput] = useState<InvoiceStatus>('Paid');
  const [isSavingMark, setIsSavingMark] = useState(false);

  const debouncedSearch = useDebouncedValue(search, 300);

  // Check URL query params for mark action modal opening
  useEffect(() => {
    if (searchParams.get('action') === 'mark' || searchParams.get('mark') === 'true') {
      setShowMarkModal(true);
    }
  }, [searchParams]);

  // Fetch invoices using React Query
  const { data: invoicesRes, isLoading: isLoadingInvoices, isError, error } = useQuery({
    queryKey: ['invoices', selectedStatus, debouncedSearch, currentPage, pageSize],
    queryFn: () => invoiceService.getAll({
      status: selectedStatus === 'All' ? undefined : (selectedStatus as InvoiceStatus),
      search: debouncedSearch || undefined,
      page: currentPage,
      per_page: pageSize,
    }),
  });

  // Fetch overall invoice summary for KPI cards
  const { data: kpiInvoicesRes } = useQuery({
    queryKey: ['invoices', 'kpi-summary'],
    queryFn: () => invoiceService.getAll({ per_page: 1000 }),
  });

  // Fetch completed trips that can be invoiced
  const { data: tripsRes } = useQuery({
    queryKey: ['trips', 'all-for-invoicing'],
    queryFn: () => tripService.getAll({ per_page: 100 }),
  });

  const invoices = invoicesRes?.data || [];
  const totalPages = invoicesRes?.meta?.total_pages || 1;
  const kpiInvoices = kpiInvoicesRes?.data || [];
  const totalCount = kpiInvoicesRes?.meta?.total || (kpiInvoices.length > 0 ? kpiInvoices.length : invoices.length);
  const allTrips = Array.isArray(tripsRes) ? tripsRes : (tripsRes as any)?.data || [];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['invoices'] }),
      queryClient.invalidateQueries({ queryKey: ['trips'] }),
    ]);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleExportCSV = () => {
    downloadCSV(invoices, `trip_invoices_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  // Open modal to mark trip invoiced
  const handleOpenMarkModal = (trip?: Trip) => {
    setSelectedTripForModal(trip || null);
    setZatcaRefInput(trip?.ref_id ? `ZATCA-${trip.ref_id}` : '');
    setModalStatusInput('Paid');
    setShowMarkModal(true);
  };

  // Submit Mark Invoiced action
  const handleSaveInvoicing = async () => {
    if (!selectedTripForModal && allTrips.length === 0) {
      toast.error('No trips available to mark as invoiced.');
      return;
    }

    const tripToProcess = selectedTripForModal || allTrips[0];
    if (!tripToProcess) {
      toast.error('Please select a trip.');
      return;
    }

    setIsSavingMark(true);
    try {
      // 1. Create or update invoice record
      await invoiceService.create({
        trip_id: tripToProcess.id,
        customer_id: tripToProcess.customerId || (tripToProcess as any).customer?.id || '',
        subtotal: tripToProcess.billing_amount || 0,
        total_amount: tripToProcess.billing_amount || 0,
        due_date: new Date().toISOString(),
      });

      // 2. Update trip status to Invoiced
      await tripService.updateStatus(tripToProcess.id, 'Invoiced');

      toast.success(`Trip ${tripToProcess.ref_id || 'record'} successfully marked as Invoiced!`);
      setShowMarkModal(false);
      setSelectedTripForModal(null);
      setZatcaRefInput('');
      
      // Clean query params if any
      if (searchParams.has('action') || searchParams.has('mark')) {
        setSearchParams({});
      }

      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || 'Failed to mark trip as invoiced.');
    } finally {
      setIsSavingMark(false);
    }
  };

  // KPI Computations
  const paidCount = kpiInvoices.filter(i => i.status === 'Paid').length;
  const pendingCount = kpiInvoices.filter(i => i.status === 'Pending').length;
  const overdueCount = kpiInvoices.filter(i => i.status === 'Overdue').length;

  const totalCollectedAmount = kpiInvoices.filter(i => i.status === 'Paid').reduce((acc, i) => acc + (Number(i.total_amount) || 0), 0);
  const invoicedCoveragePct = totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 100;

  const getStatusBadge = (status: InvoiceStatus | string) => {
    switch (status) {
      case 'Paid': 
      case 'Invoiced':
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold uppercase text-[10px] tracking-wider px-2 py-0.5">Invoiced / Paid</Badge>;
      case 'Pending': 
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 font-bold uppercase text-[10px] tracking-wider px-2 py-0.5">Pending Invoicing</Badge>;
      case 'Overdue': 
        return <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 font-bold uppercase text-[10px] tracking-wider px-2 py-0.5">Overdue</Badge>;
      case 'Cancelled': 
        return <Badge variant="outline" className="bg-slate-100 text-slate-500 border-slate-200 font-bold uppercase text-[10px] tracking-wider px-2 py-0.5">Cancelled</Badge>;
      default: 
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-bold uppercase text-[10px] tracking-wider px-2 py-0.5">Draft</Badge>;
    }
  };

  const columns = [
    {
      header: 'Trip Ref ID',
      className: 'whitespace-nowrap',
      accessor: (row: Invoice) => (
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-[#E8450F]">
            {row.trip?.ref_id || row.ref_id || row.id.split('-')[0].toUpperCase()}
          </span>
          {row.ref_id && (
            <Badge variant="outline" className="text-[9px] bg-slate-50 text-slate-600 font-mono px-1 py-0 border-slate-200">
              Ext #{row.ref_id}
            </Badge>
          )}
        </div>
      ),
    },
    {
      header: 'Customer',
      className: 'whitespace-nowrap max-w-[140px]',
      accessor: (row: Invoice) => (
        <div className="flex flex-col max-w-[140px]">
          <span className="font-semibold text-xs text-[#111] dark:text-slate-100 leading-snug truncate" title={row.customer?.name || 'Standard Account'}>
            {row.customer?.name || 'Standard Account'}
          </span>
          <span className="text-[10px] text-slate-400 font-mono truncate">
            Billed Customer
          </span>
        </div>
      ),
    },
    {
      header: 'Billing Amount',
      className: 'whitespace-nowrap',
      accessor: (row: Invoice) => (
        <span className="font-bold text-xs text-[#111] dark:text-slate-200 font-mono tabular-nums">
          {row.currency || 'SAR'} {Number(row.total_amount || row.subtotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      header: 'Invoicing Date',
      className: 'whitespace-nowrap',
      accessor: (row: Invoice) => (
        <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">
          {row.createdAt ? new Date(row.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : new Date(row.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      ),
    },
    {
      header: 'Invoicing Status',
      className: 'whitespace-nowrap',
      accessor: (row: Invoice) => getStatusBadge(row.status),
    },
    {
      header: 'Actions',
      className: 'whitespace-nowrap text-right',
      headerClassName: 'text-right',
      accessor: (row: Invoice) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 rounded-md"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 shadow-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-1.5">
              <DropdownMenuLabel className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-2 py-1">
                Invoicing Ledger Actions
              </DropdownMenuLabel>
              
              <DropdownMenuItem 
                onClick={() => {
                  if (row.status !== 'Paid') {
                    invoiceService.updateStatus(row.id, 'Paid').then(() => {
                      toast.success('Marked invoice as Paid / Invoiced');
                      queryClient.invalidateQueries({ queryKey: ['invoices'] });
                    });
                  } else {
                    toast.info('Invoice is already marked as Paid.');
                  }
                }}
                className="cursor-pointer text-xs font-semibold py-1.5 px-2 rounded-md text-emerald-600 focus:bg-emerald-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-2 text-emerald-600" /> Confirm Invoiced / Paid
              </DropdownMenuItem>

              {row.trip?.id && (
                <DropdownMenuItem 
                  onClick={() => navigate(`/trips/${row.trip?.id}`)}
                  className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md"
                >
                  <ExternalLink className="w-3.5 h-3.5 mr-2 text-indigo-600" /> View Linked Trip
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator className="my-1 bg-slate-100 dark:bg-slate-800" />

              <DropdownMenuItem 
                onClick={() => {
                  if (confirm('Remove invoicing status log for this trip?')) {
                    invoiceService.bulkDelete([row.id]).then(() => {
                      toast.success('Invoicing status log removed.');
                      queryClient.invalidateQueries({ queryKey: ['invoices'] });
                    });
                  }
                }}
                className="cursor-pointer text-xs font-semibold py-1.5 px-2 rounded-md text-rose-600 focus:bg-rose-50"
              >
                <X className="w-3.5 h-3.5 mr-2 text-rose-600" /> Delete Invoicing Record
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  const bulkActions = [
    {
      label: 'Mark Invoiced',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
      onClick: async (selectedRows: Invoice[]) => {
        if (!confirm(`Mark ${selectedRows.length} trips as Invoiced / Paid?`)) return;
        try {
          await invoiceService.bulkUpdateStatus(selectedRows.map(r => r.id), 'Paid');
          toast.success(`Marked ${selectedRows.length} trips as Invoiced!`);
          queryClient.invalidateQueries({ queryKey: ['invoices'] });
        } catch (e) { toast.error('Failed to update invoicing status'); }
      }
    },
    {
      label: 'Export CSV',
      icon: <Download className="w-3.5 h-3.5" />,
      variant: 'secondary' as const,
      onClick: (selectedRows: Invoice[]) => {
        downloadCSV(selectedRows, 'trip_invoices_export.csv');
      }
    },
  ];

  return (
    <DashboardLayout active="Invoices" title="Trip Invoicing">
      <div className="px-4 sm:px-6 pb-6 h-full flex flex-col animate-fade-in gap-5 max-w-[1400px] mx-auto w-full">
        
        {/* MERCON Dashboard Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 shrink-0 pb-1 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-3">
            {/* Page Title & Soft Pastel Category Badge */}
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                Trip Invoicing & Settlement
              </h1>
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold text-xs px-2.5 py-0.5">
                Finance & Billing Module
              </Badge>
            </div>
          </div>

          {/* Top Bar Actions Group */}
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-xs font-semibold border-slate-200 bg-white hover:bg-slate-50 shadow-2xs rounded-lg"
              onClick={handleExportCSV}
            >
              <Download className="h-3.5 w-3.5 text-slate-600" />
              Export CSV
            </Button>

            <Button
              size="sm"
              className="h-9 gap-1.5 text-xs font-bold bg-[#E8450F] hover:bg-[#d03d0c] text-white shadow-xs rounded-lg px-4"
              onClick={() => handleOpenMarkModal()}
            >
              <Plus className="h-4 w-4" />
              Mark Trip Invoiced
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 p-0 text-slate-600 border-slate-200 bg-white hover:bg-slate-50 shadow-2xs rounded-lg"
              onClick={handleRefresh}
              title="Refresh Data"
            >
              <RotateCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* 4-Card Instrument Panel KPI Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 shrink-0">
          
          {/* Card 1: Total Trips */}
          <KpiCard
            title="TOTAL TRIPS RECORDED"
            value={
              <span>
                {totalCount}
                <span className="text-[14px] font-semibold ml-1.5 opacity-85">Trips</span>
              </span>
            }
            variant="blue"
            description="Overall fleet billing log"
            icon={InvoiceDoc}
            semiCircleGauge={{
              segments: [
                { label: "Paid", count: paidCount, color: "#16A34A" },
                { label: "Pending", count: pendingCount, color: "#D97706" },
                { label: "Overdue", count: overdueCount, color: "#DC2626" },
              ]
            }}
            isActive={selectedStatus === 'All'}
            onClick={() => { setSelectedStatus('All'); setCurrentPage(1); }}
          />

          {/* Card 2: Total Settled Revenue */}
          <KpiCard
            title="INVOICED & SETTLED"
            value={
              <span>
                <span className="text-[14px] font-semibold mr-1.5 opacity-85">SAR</span>
                {totalCollectedAmount.toLocaleString()}
              </span>
            }
            variant="emerald"
            description="Settled trip revenue"
            icon={RevenueChart}
            chartData={[15000, 24000, 21000, 32000, 38000, totalCollectedAmount > 0 ? totalCollectedAmount : 48000]}
            isActive={selectedStatus === 'Paid'}
            onClick={() => { setSelectedStatus('Paid'); setCurrentPage(1); }}
          />

          {/* Card 3: Pending Invoicing */}
          <KpiCard
            title="PENDING INVOICING"
            value={
              <span>
                {pendingCount}
                <span className="text-[14px] font-semibold ml-1.5 opacity-85">Pending</span>
              </span>
            }
            variant="amber"
            description="Trips awaiting invoice log"
            icon={ClockIcon}
            pipelineStages={[
              { name: "Pending", count: pendingCount, color: "bg-amber-500" },
              { name: "Overdue", count: overdueCount, color: "bg-rose-500" },
            ]}
            isActive={selectedStatus === 'Pending'}
            onClick={() => { setSelectedStatus('Pending'); setCurrentPage(1); }}
          />

          {/* Card 4: Invoicing Coverage Rate */}
          <KpiCard
            title="INVOICING COVERAGE"
            value={
              <span>
                {invoicedCoveragePct}%
                <span className="text-[14px] font-semibold ml-1.5 opacity-85">Billed</span>
              </span>
            }
            variant="purple"
            description="Completion ratio"
            icon={CheckBadge}
            livePulseTrack={{
              statusText: `${paidCount} of ${totalCount} Trips Invoiced`,
              subText: `${pendingCount} remaining`,
            }}
            onClick={() => { setSelectedStatus('All'); setCurrentPage(1); }}
          />
        </div>

        {/* Active Filter Indicator Banner */}
        {selectedStatus !== 'All' && (
          <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/40 px-3.5 py-2 rounded-xl flex items-center justify-between gap-3 text-xs font-semibold text-emerald-900 dark:text-emerald-200 animate-fade-in shrink-0">
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>
                Filtered by status: <strong className="underline decoration-emerald-500 font-bold">{selectedStatus}</strong> ({invoices.length} trip{invoices.length === 1 ? '' : 's'} matching)
              </span>
            </div>
            <button
              onClick={() => {
                setSelectedStatus('All');
                setCurrentPage(1);
              }}
              className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
            >
              <span>Show All Invoices</span>
              <X className="w-3 h-3 shrink-0" />
            </button>
          </div>
        )}

        {/* Content Workspace: Trip Invoicing Ledger Data Table */}
        <div className="flex-1 min-h-0 flex flex-col">
          <DataTable
            title={
              <span className="flex items-center gap-2 font-extrabold">
                <Receipt className="w-4 h-4 text-emerald-600" />
                <span>🥞 Trip Invoicing Ledger</span>
              </span>
            }
            columns={columns}
            data={invoices}
            bulkActions={bulkActions}
            enableSelection={true}
            compact={true}
            isLoading={isLoadingInvoices}
            isError={isError}
            errorMessage={(error as Error)?.message || 'Failed to load trip invoicing records.'}
            searchPlaceholder="Search trip ref ID, customer..."
            searchValue={search}
            onSearchChange={(val) => { setSearch(val); setCurrentPage(1); }}
            filterElement={
              <div className="flex items-center gap-2">
                <Select
                  value={selectedStatus}
                  onValueChange={(val: any) => { setSelectedStatus(val); setCurrentPage(1); }}
                >
                  <SelectTrigger className="h-9 px-3 w-48 shrink-0 border-slate-200 bg-white rounded-lg text-xs font-semibold text-slate-800 shadow-2xs focus-visible:ring-indigo-500">
                    <div className="flex items-center gap-2">
                      <Filter className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <SelectValue placeholder="Invoicing Status" />
                    </div>
                  </SelectTrigger>
                  <SelectContent align="start" className="w-48 p-1.5 shadow-lg border border-slate-200 bg-white rounded-xl">
                    <SelectGroup>
                      <SelectLabel className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-2 py-1">
                        Status Filter
                      </SelectLabel>
                      <SelectItem value="All" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">All Statuses</SelectItem>
                      <SelectItem value="Paid" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md text-emerald-700">Invoiced / Paid</SelectItem>
                      <SelectItem value="Pending" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md text-amber-700">Pending Invoicing</SelectItem>
                      <SelectItem value="Overdue" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md text-rose-700">Overdue Only</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>

                {/* View Switcher: Segmented Control */}
                <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1 rounded-md text-xs font-medium transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs' : 'text-slate-500 hover:text-slate-900'}`}
                    title="List View"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1 rounded-md text-xs font-medium transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs' : 'text-slate-500 hover:text-slate-900'}`}
                    title="Grid View"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            }
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
            totalRecords={totalCount}
            onPageChange={(page) => setCurrentPage(page)}
          />
        </div>

        {/* Mark Trip Invoiced Shadcn Modal */}
        <Dialog open={showMarkModal} onOpenChange={setShowMarkModal}>
          <DialogContent className="max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl">
            <DialogHeader>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center mb-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
              </div>
              <DialogTitle className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                Mark Trip as Invoiced
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Confirm invoice completion status for completed fleet trips.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-2 text-xs">
              
              {/* Trip Selection */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Select Trip <span className="text-rose-500">*</span>
                </Label>
                <Select 
                  value={selectedTripForModal?.id || (allTrips[0]?.id || '')} 
                  onValueChange={(val) => {
                    const found = allTrips.find((t: any) => t.id === val);
                    setSelectedTripForModal(found || null);
                    if (found?.ref_id) setZatcaRefInput(`INV-${found.ref_id}`);
                  }}
                >
                  <SelectTrigger className="h-9 text-xs border-slate-200 bg-white">
                    <SelectValue placeholder="Select completed trip..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-48">
                    {allTrips.map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.ref_id || 'TRIP'} — {t.customer?.name || 'Customer'} (SAR {Number(t.billing_amount || 0).toLocaleString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* External Invoice Ref # */}
              <div className="space-y-1.5">
                <Label htmlFor="zatcaRef" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Invoice / External Ref # (Optional)
                </Label>
                <Input
                  id="zatcaRef"
                  type="text"
                  placeholder="e.g. INV-2026-092"
                  value={zatcaRefInput}
                  onChange={(e) => setZatcaRefInput(e.target.value)}
                  className="h-9 text-xs font-mono font-semibold border-slate-200"
                />
                <p className="text-[10px] text-slate-500">
                  Optional invoice number or tax serial generated by your primary accounting software.
                </p>
              </div>

              {/* Invoicing Status */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Invoicing Status
                </Label>
                <Select 
                  value={modalStatusInput} 
                  onValueChange={(val: any) => setModalStatusInput(val)}
                >
                  <SelectTrigger className="h-9 text-xs border-slate-200 bg-white">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Paid">Invoiced / Paid (Completed)</SelectItem>
                    <SelectItem value="Pending">Pending Invoicing</SelectItem>
                    <SelectItem value="Draft">Draft Status</SelectItem>
                  </SelectContent>
                </Select>
              </div>

            </div>

            <DialogFooter className="mt-4 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs font-semibold border-slate-200"
                onClick={() => setShowMarkModal(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="text-xs font-bold bg-[#E8450F] hover:bg-[#d03d0c] text-white px-4"
                onClick={handleSaveInvoicing}
                disabled={isSavingMark}
              >
                {isSavingMark ? 'Saving...' : 'Save Invoicing Record'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </DashboardLayout>
  );
}
