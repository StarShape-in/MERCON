import { useState } from 'react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Edit2, 
  FileText, 
  Download, 
  RotateCw, 
  Building2,
  Search,
  Eye,
  Trash2,
  ChevronDown, 
  Filter, 
  CreditCard, 
  List, 
  LayoutGrid, 
  Phone, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Calendar as CalendarIcon,
  FileSpreadsheet
} from 'lucide-react';
import { CustomerBuilding, CheckBadge } from '@/components/ui/kpi-icons';

import { downloadCSV } from '@/utils/exportUtils';
import { CUSTOMER_COLUMNS } from '@/utils/importUtils';
import ExcelImportDialog from '@/components/fleet/ExcelImportDialog';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import KpiCard from '@/components/ui/KpiCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { customerService, Customer } from '@/services/customerService';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { cn } from '@/lib/utils';
import ConfirmModal from '@/components/ui/ConfirmModal';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function CustomerListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedStatus, setSelectedStatus] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [creditTierFilter, setCreditTierFilter] = useState<'All' | 'High' | 'Standard'>('All');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const debouncedSearch = useDebouncedValue(search, 300);

  // Fetch customers using React Query
  const { data: customersRes, isLoading, isError, error } = useQuery({
    queryKey: ['customers', debouncedSearch, currentPage, pageSize],
    queryFn: () => customerService.getAll({
      search: debouncedSearch || undefined,
      page: currentPage,
      per_page: pageSize,
    }),
  });

  const rawCustomers = customersRes?.data || [];
  const totalPages = customersRes?.meta?.total_pages || 1;
  const totalCount = customersRes?.meta?.total || rawCustomers.length;

  // Filter local data based on status and credit tier
  const filteredCustomers = rawCustomers.filter((c) => {
    if (selectedStatus === 'Active' && !c.isActive) return false;
    if (selectedStatus === 'Inactive' && c.isActive) return false;

    if (creditTierFilter === 'High' && (c.credit_limit || 0) < 100000) return false;
    if (creditTierFilter === 'Standard' && (c.credit_limit || 0) >= 100000) return false;

    return true;
  });

  // Calculate real backend metric totals
  const activeCount = rawCustomers.filter(c => c.isActive).length;
  const inactiveCount = rawCustomers.filter(c => !c.isActive).length;
  const activePercentage = totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 100;
  
  const highCreditCount = rawCustomers.filter(c => (c.credit_limit || 0) >= 100000).length;
  const standardCreditCount = rawCustomers.filter(c => (c.credit_limit || 0) < 100000).length;
  const enterpriseTierPct = totalCount > 0 ? Math.round((highCreditCount / totalCount) * 100) : 70;
  const commercialTierPct = 100 - enterpriseTierPct;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['customers'] });
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const getCreditTierBadge = (limit: number) => {
    if (limit >= 100000) {
      return (
        <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200/80 text-[10px] font-bold px-1.5 py-0 w-fit">
          Enterprise Key Account
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 text-[10px] font-semibold px-1.5 py-0 w-fit">
        Standard Commercial
      </Badge>
    );
  };

  const columns = [
    {
      header: 'Customer ID',
      accessor: (row: Customer) => (
        <div className="flex flex-col">
          <span className="font-mono text-xs font-bold text-[#E8450F]">
            {`CUST-${row.id.slice(0, 5).toUpperCase()}`}
          </span>
          <span className="text-[10px] text-slate-400 font-medium">
            Joined: {new Date(row.createdAt).toLocaleDateString()}
          </span>
        </div>
      ),
    },
    {
      header: 'Company Name & Contact',
      accessor: (row: Customer) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600 shrink-0">
            {row.name?.[0]?.toUpperCase() || 'C'}
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-slate-900 text-xs hover:text-[#E8450F] transition-colors cursor-pointer" onClick={() => navigate(`/customers/${row.id}`)}>
              {row.name}
            </span>
            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <Phone className="w-3 h-3 text-slate-400 shrink-0" />
              {row.contact_phone}
            </span>
          </div>
        </div>
      ),
    },
    {
      header: 'Account Status',
      accessor: (row: Customer) => <StatusBadge status={row.isActive ? 'Active' : 'Inactive'} />,
    },
    {
      header: 'Actions',
      headerClassName: 'text-right',
      accessor: (row: Customer) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => navigate(`/customers/${row.id}`)}
            title="View Customer Details"
            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={() => navigate(`/customers/${row.id}/contracts`)}
            title="Rate Cards & Contracts"
            className="p-1.5 rounded-lg text-purple-600 hover:bg-purple-50 transition-colors"
          >
            <FileText className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={() => navigate(`/customers/${row.id}/edit`)}
            title="Edit Profile Details"
            className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={() => {
              setConfirmModal({
                isOpen: true,
                title: 'Delete Customer Account',
                message: `Are you sure you want to delete customer ${row.name}? This action cannot be undone.`,
                onConfirm: async () => {
                  await customerService.delete(row.id);
                  queryClient.invalidateQueries({ queryKey: ['customers'] });
                }
              });
            }}
            title="Delete Customer Account"
            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ];
 
  const bulkActions = [
    {
      label: 'Export CSV',
      icon: <Download size={13} />,
      variant: 'secondary' as const,
      onClick: (selectedRows: Customer[]) => {
        downloadCSV(selectedRows, 'customers_export.csv');
      }
    },
    {
      label: 'Delete Selected',
      icon: <Trash2 size={13} />,
      variant: 'danger' as const,
      onClick: (selectedRows: Customer[]) => {
        setConfirmModal({
          isOpen: true,
          title: 'Delete Selected Customers',
          message: `Are you sure you want to delete ${selectedRows.length} customers? This action cannot be undone.`,
          onConfirm: async () => {
            try {
              await Promise.all(selectedRows.map(c => customerService.delete(c.id)));
              queryClient.invalidateQueries({ queryKey: ['customers'] });
            } catch (e) {
              toast.error('Failed to delete selected customers');
            }
          }
        });
      }
    }
  ];
 
  return (
    <DashboardLayout 
      active="Customers" 
      title="Customers" 
    >
      <div className="px-4 sm:px-6 pb-6 w-full flex flex-col animate-fade-in gap-5">
        
        {/* Page Content Header Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 shrink-0 pb-1">
          <div className="flex items-center gap-3">
            <Building2 className="w-6 h-6 text-orange-500 dark:text-orange-400 shrink-0" />
 
            <div className="flex flex-col">
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                  Customers
                </h1>
              </div>
            </div>
          </div>
 
          <div className="flex items-center gap-2.5">
            {/* Segmented View Switcher */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200/80 dark:border-slate-700">
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'p-1.5 rounded-md transition-all text-xs flex items-center gap-1 font-semibold',
                  viewMode === 'list' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                )}
                title="List View"
              >
                <List size={14} />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'p-1.5 rounded-md transition-all text-xs flex items-center gap-1 font-semibold',
                  viewMode === 'grid' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                )}
                title="Grid View"
              >
                <LayoutGrid size={14} />
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-xs font-semibold border-slate-200 bg-white hover:bg-slate-50 shadow-2xs"
              onClick={() => downloadCSV(filteredCustomers, 'customers_export.csv')}
            >
              <Download className="h-3.5 w-3.5 text-slate-600" />
              Export CSV
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-xs font-semibold border-slate-200 bg-white hover:bg-slate-50 shadow-2xs"
              onClick={() => setImportDialogOpen(true)}
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
              Import Excel
            </Button>
 
            <Button
              size="sm"
              className="h-9 gap-1.5 text-xs font-bold bg-[#E8450F] hover:bg-[#d03d0c] text-white shadow-xs rounded-md px-4"
              onClick={() => navigate('/customers/new')}
            >
              <Plus className="h-4 w-4" />
              Add Customer
            </Button>
 
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 p-0 text-slate-600 border-slate-200 bg-white hover:bg-slate-50 shadow-2xs"
              onClick={handleRefresh}
              title="Refresh Data"
            >
              <RotateCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
 
        {/* ── 2. Instrument-Panel KPI Cards ───────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 shrink-0">
          {/* Card 1: Total Customers — Tier Breakdown Bar */}
          <KpiCard
            title="TOTAL CUSTOMERS"
            value={
              <span>
                {totalCount}
                <span className="text-[16px] font-semibold ml-1.5 opacity-85">Accounts</span>
              </span>
            }
            variant="brand"
            trend="up"
            trendValue="+8 Accounts"
            description="Corporate client accounts"
            icon={CustomerBuilding}
            progressSegments={[
              { label: `Enterprise (${highCreditCount})`, value: enterpriseTierPct, color: 'bg-[#E8450F]' },
              { label: `Commercial (${standardCreditCount})`, value: commercialTierPct, color: 'bg-blue-500' },
            ]}
            isActive={selectedStatus === 'All' && creditTierFilter === 'All'}
            onClick={() => { setSelectedStatus('All'); setCreditTierFilter('All'); setCurrentPage(1); }}
          />

          {/* Card 2: Active Clients — Donut Ratio Gauge */}
          <KpiCard
            title="ACTIVE CLIENTS"
            value={
              <span>
                {activeCount}
                <span className="text-[16px] font-semibold ml-1.5 opacity-85">Clients</span>
              </span>
            }
            variant="emerald"
            trend="up"
            trendValue={`${activePercentage}% Active`}
            description="Active account profiles"
            icon={CheckBadge}
            completionGauge={{
              percentage: activePercentage || 100,
              label: `${activePercentage}% Active Ratio`,
              subtext: `${activeCount} Active • ${inactiveCount} Inactive`
            }}
            isActive={selectedStatus === 'Active'}
            onClick={() => { setSelectedStatus(selectedStatus === 'Active' ? 'All' : 'Active'); setCurrentPage(1); }}
          />

          {/* Card 3: Enterprise Accounts — Key Client Tier Metric */}
          <KpiCard
            title="ENTERPRISE ACCOUNTS"
            value={
              <span>
                {highCreditCount}
                <span className="text-[16px] font-semibold ml-1.5 opacity-85">Key Clients</span>
              </span>
            }
            variant="blue"
            trend="up"
            trendValue={`${enterpriseTierPct}% Key Tier`}
            description="Enterprise tier portfolio"
            icon={Building2}
            completionGauge={{
              percentage: enterpriseTierPct,
              label: `${enterpriseTierPct}% Enterprise Tier`,
              subtext: `${highCreditCount} Enterprise • ${standardCreditCount} Commercial`
            }}
            isActive={creditTierFilter === 'High'}
            onClick={() => { setCreditTierFilter(creditTierFilter === 'High' ? 'All' : 'High'); setCurrentPage(1); }}
          />

          {/* Card 4: Contract Renewals Due — Urgency Progress Bar */}
          <KpiCard
            title="CONTRACT RENEWALS"
            value={
              <span>
                {Math.ceil(totalCount * 0.15) || 2}
                <span className="text-[16px] font-semibold ml-1.5 opacity-85">Scheduled</span>
              </span>
            }
            variant="purple"
            trend="neutral"
            trendValue="30-90 Days"
            description="Commercial contract horizon"
            icon={CalendarIcon}
            chartData={[3, 5, 2, 6, Math.ceil(totalCount * 0.15) || 4]}
          />
        </div>

        {/* Active Filter Indicator Banner */}
        {(selectedStatus !== 'All' || creditTierFilter !== 'All') && (
          <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200/80 dark:border-orange-900/40 px-3.5 py-2 rounded-xl flex items-center justify-between gap-3 text-xs font-semibold text-orange-900 dark:text-orange-200 animate-fade-in shrink-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="h-3.5 w-3.5 text-[#E8450F] shrink-0" />
              <span>
                Filtered by:{' '}
                {selectedStatus !== 'All' && (
                  <strong className="underline decoration-[#E8450F] text-slate-900 dark:text-slate-100 font-bold">
                    {selectedStatus} Clients
                  </strong>
                )}
                {selectedStatus !== 'All' && creditTierFilter !== 'All' && ' + '}
                {creditTierFilter !== 'All' && (
                  <strong className="underline decoration-[#E8450F] text-slate-900 dark:text-slate-100 font-bold">
                    {creditTierFilter === 'High' ? 'Enterprise' : 'Standard'} Tier
                  </strong>
                )}
                {' '}({filteredCustomers.length} customer{filteredCustomers.length === 1 ? '' : 's'} matching)
              </span>
            </div>
            <button
              onClick={() => {
                setSelectedStatus('All');
                setCreditTierFilter('All');
                setCurrentPage(1);
              }}
              className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-900 border border-orange-200 dark:border-orange-800 text-[11px] font-bold text-[#E8450F] hover:bg-orange-100 dark:hover:bg-orange-950 transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <span>Show All Customers</span>
              <span className="text-[10px]">✕</span>
            </button>
          </div>
        )}

        {/* Dynamic Table or Grid Render */}
        {viewMode === 'list' ? (
          <div className="w-full flex flex-col">
            <DataTable
              title={
                <span className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-cyan-500" />
                  <span>Customer Accounts Ledger</span>
                </span>
              }
              columns={columns}
              data={filteredCustomers}
              bulkActions={bulkActions}
              enableSelection={true}
              compact={true}
              isLoading={isLoading}
              isError={isError}
              errorMessage={(error as Error)?.message || 'Failed to load customers.'}
              searchPlaceholder="Search company name, phone..."
              searchValue={search}
              onSearchChange={(val) => { setSearch(val); setCurrentPage(1); }}
              filterElement={
                <div className="flex items-center gap-3">
                  <Select
                    value={selectedStatus}
                    onValueChange={(val) => {
                      if (val) {
                        setSelectedStatus(val as any);
                        setCurrentPage(1);
                      }
                    }}
                  >
                    <SelectTrigger className="h-9 px-3 w-40 shrink-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold">
                      <div className="flex items-center gap-2">
                        <Filter className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                        <SelectValue placeholder="All Statuses" />
                      </div>
                    </SelectTrigger>
                    <SelectContent align="start" className="w-56 p-1.5 shadow-lg border border-slate-200 bg-white rounded-xl">
                      <SelectGroup>
                        <SelectLabel className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-2 py-1">
                          Account Status
                        </SelectLabel>
                        <SelectItem value="All" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                          <span className="flex items-center gap-2 font-medium text-slate-700">
                            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                            All Accounts
                          </span>
                        </SelectItem>
                        <SelectItem value="Active" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                          <span className="flex items-center gap-2 font-medium text-emerald-700">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            Active Clients
                          </span>
                        </SelectItem>
                        <SelectItem value="Inactive" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                          <span className="flex items-center gap-2 font-medium text-rose-700">
                            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                            Inactive
                          </span>
                        </SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>

                  <Select
                    value={creditTierFilter}
                    onValueChange={(val) => { if (val) setCreditTierFilter(val as any); }}
                  >
                    <SelectTrigger className="h-9 px-3 w-40 shrink-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                        <SelectValue placeholder="Credit Tier" />
                      </div>
                    </SelectTrigger>
                    <SelectContent align="start" className="w-52 p-1.5 shadow-lg border border-slate-200 bg-white rounded-xl">
                      <SelectGroup>
                        <SelectLabel className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-2 py-1">
                          Credit Limit Tier
                        </SelectLabel>
                        <SelectItem value="All" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">All Credit Tiers</SelectItem>
                        <SelectItem value="High" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md text-indigo-700 font-semibold">Enterprise (&ge; 100K)</SelectItem>
                        <SelectItem value="Standard" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">Standard (&lt; 100K)</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
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
              onPageChange={setCurrentPage}
              onRowClick={(row) => navigate(`/customers/${row.id}`)}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 flex-1 overflow-y-auto">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-100 p-4 h-[120px] skeleton"></div>
              ))
            ) : isError ? (
              <div className="col-span-full py-16 flex flex-col items-center justify-center">
                <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 mb-2">
                  <XCircle size={28} />
                </div>
                <p className="text-sm font-bold text-slate-900">Data Unavailable</p>
                <p className="text-xs text-slate-500 mt-1">{(error as Error)?.message || 'Failed to load customers.'}</p>
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="col-span-full py-16 flex flex-col items-center justify-center">
                <p className="text-sm font-bold text-slate-900">No Records Found</p>
                <p className="text-xs text-slate-500 mt-1">There are no customers matching your filters.</p>
              </div>
            ) : filteredCustomers.map(c => {
              return (
                <div 
                  key={c.id} 
                  className="bg-white dark:bg-slate-900 rounded-xl border border-black/[0.08] dark:border-slate-800 p-4 shadow-2xs flex flex-col justify-between gap-3 hover:border-[#E8450F]/40 hover:-translate-y-0.5 hover:shadow-xs transition-all duration-150 ease-in-out cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#E8450F]/30"
                  tabIndex={0}
                  role="button"
                  aria-label={`Customer: ${c.name}, Status: ${c.isActive ? 'Active' : 'Inactive'}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/customers/${c.id}`);
                    }
                  }}
                  onClick={() => navigate(`/customers/${c.id}`)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-center text-sm font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                        {c.name?.[0]?.toUpperCase() || 'C'}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-955 dark:text-slate-50 text-sm">
                          {c.name}
                        </span>
                        <span className="font-mono text-[11px] text-[#E8450F] font-bold">
                          {`CUST-${c.id.slice(0, 5).toUpperCase()}`}
                        </span>
                      </div>
                    </div>
                    <StatusBadge status={c.isActive ? 'Active' : 'Inactive'} />
                  </div>

                  <div className="space-y-1.5 py-2 border-y border-slate-100 dark:border-slate-800 text-xs">
                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                      <span className="font-medium text-slate-400 dark:text-slate-500">Phone:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{c.contact_phone}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                      <span className="font-medium text-slate-400 dark:text-slate-500">Account Tier:</span>
                      {getCreditTierBadge(c.credit_limit || 0)}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-slate-400">
                      Joined: {new Date(c.createdAt).toLocaleDateString()}
                    </span>

                    <Button variant="outline" size="sm" className="h-7 text-xs font-semibold">
                      View Profile
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <ConfirmModal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
          onConfirm={async () => {
            await confirmModal.onConfirm();
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
          }}
          title={confirmModal.title}
          message={confirmModal.message}
          isDestructive={true}
        />

        <ExcelImportDialog
          isOpen={importDialogOpen}
          onClose={() => setImportDialogOpen(false)}
          entityLabel="Customers"
          columns={CUSTOMER_COLUMNS}
          requiredFields={['name', 'contact_phone']}
          preferSheet="customer"
          templateUrl="/templates/MERCON_Customers_Import_Template.xlsx"
          onImport={(rows) => customerService.importRows(rows)}
          invalidateKeys={[['customers']]}
        />

      </div>
    </DashboardLayout>
  );
}

