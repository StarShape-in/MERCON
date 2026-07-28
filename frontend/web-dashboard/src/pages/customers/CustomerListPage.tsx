import { useState } from 'react';
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
  Calendar as CalendarIcon
} from 'lucide-react';
import { CustomerBuilding, CheckBadge, MoneyBills } from '@/components/ui/kpi-icons';

import { downloadCSV } from '@/utils/exportUtils';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import KpiCard from '@/components/ui/KpiCard';
import { customerService, Customer } from '@/services/customerService';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

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
  const [selectedStatus, setSelectedStatus] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [creditTierFilter, setCreditTierFilter] = useState<'All' | 'High' | 'Standard'>('All');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const debouncedSearch = useDebouncedValue(search, 300);

  // Fetch customers using React Query
  const { data: customersRes, isLoading } = useQuery({
    queryKey: ['customers', debouncedSearch, currentPage],
    queryFn: () => customerService.getAll({
      search: debouncedSearch || undefined,
      page: currentPage,
      per_page: 15,
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
  
  const totalCreditLimit = rawCustomers.reduce((acc, c) => acc + (c.credit_limit || 0), 0);
  const highCreditCount = rawCustomers.filter(c => (c.credit_limit || 0) >= 100000).length;
  const standardCreditCount = rawCustomers.filter(c => (c.credit_limit || 0) < 100000).length;
  const enterpriseTierPct = totalCount > 0 ? Math.round((highCreditCount / totalCount) * 100) : 70;
  const commercialTierPct = 100 - enterpriseTierPct;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['customers'] });
    setTimeout(() => setIsRefreshing(false), 500);
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
      header: 'Credit Limit Exposure',
      accessor: (row: Customer) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-xs font-bold text-slate-800">
            SAR {(row.credit_limit || 0).toLocaleString()}
          </span>
          {(row.credit_limit || 0) >= 100000 ? (
            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[9px] font-bold py-0 px-1.5 w-fit">
              Enterprise Key Account
            </Badge>
          ) : (
            <span className="text-[10px] text-slate-500 font-medium">Standard Commercial</span>
          )}
        </div>
      ),
    },
    {
      header: 'Account Status',
      accessor: (row: Customer) => (
        row.isActive ? (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold py-0.5 px-2 gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Active Client
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold py-0.5 px-2 gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            Inactive
          </Badge>
        )
      ),
    },
    {
      header: 'Actions',
      accessor: (row: Customer) => (
        <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-7 px-2.5 text-[11px] font-semibold border-slate-200 text-slate-700 bg-white hover:bg-slate-50 hover:text-slate-900 shadow-2xs gap-1.5 rounded-lg"
              >
                <span>Actions</span>
                <ChevronDown className="h-3 w-3 text-slate-400 shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 p-1.5 shadow-lg rounded-xl border border-slate-200 bg-white">
              <DropdownMenuLabel className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-2 py-1">
                Commercial Operations
              </DropdownMenuLabel>
              
              <DropdownMenuItem className="cursor-pointer text-xs font-medium py-2 px-2.5 rounded-lg hover:bg-slate-100" onClick={() => navigate(`/customers/${row.id}`)}>
                <Eye className="mr-2 h-3.5 w-3.5 text-blue-600 shrink-0" />
                View Customer Details
              </DropdownMenuItem>

              <DropdownMenuItem className="cursor-pointer text-xs font-medium py-2 px-2.5 rounded-lg hover:bg-purple-50" onClick={() => navigate(`/customers/${row.id}/contracts`)}>
                <FileText className="mr-2 h-3.5 w-3.5 text-purple-600 shrink-0" />
                Rate Cards & Contracts
              </DropdownMenuItem>

              <DropdownMenuItem className="cursor-pointer text-xs font-medium py-2 px-2.5 rounded-lg hover:bg-slate-100" onClick={() => navigate(`/customers/${row.id}/edit`)}>
                <Edit2 className="mr-2 h-3.5 w-3.5 text-amber-600 shrink-0" />
                Edit Profile Details
              </DropdownMenuItem>

              <DropdownMenuSeparator className="my-1 border-slate-100" />

              <DropdownMenuItem
                className="cursor-pointer text-xs font-semibold py-2 px-2.5 rounded-lg text-rose-600 focus:text-rose-600 focus:bg-rose-50"
                onClick={async () => {
                  if (confirm(`Delete customer ${row.name}?`)) {
                    await customerService.delete(row.id);
                    queryClient.invalidateQueries({ queryKey: ['customers'] });
                  }
                }}
              >
                <Trash2 className="mr-2 h-3.5 w-3.5 text-rose-600 shrink-0" />
                Delete Customer Account
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout 
      active="Customers" 
      title="Customers" 
    >
      <div className="px-6 pb-6 h-full flex flex-col animate-fade-in gap-5">
        
        {/* Page Content Header Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 shrink-0 pb-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 shadow-2xs">
              <Building2 className="w-5 h-5 text-indigo-600" />
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                  Customers
                </h1>
                <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-200/80 text-[10px] font-bold tracking-wide uppercase px-2 py-0.5">
                  Commercial Module
                </Badge>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Scope: Manage corporate client accounts, credit exposure, and rate cards
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
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

        {/* 4-Card Instrument Panel KPI Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
          {/* Card 1: Total Customers — Tier Breakdown Bar */}
          <KpiCard
            title="TOTAL CUSTOMERS"
            value={totalCount}
            variant="brand"
            trend="up"
            trendValue="+8 Accounts"
            description="→ Total corporate client ledger"
            icon={CustomerBuilding}
            progressSegments={[
              { label: `Enterprise (${highCreditCount})`, value: enterpriseTierPct, color: 'bg-[#E8450F]' },
              { label: `Commercial (${standardCreditCount})`, value: commercialTierPct, color: 'bg-blue-500' },
            ]}
          />

          {/* Card 2: Active Clients — Donut Ratio Gauge */}
          <KpiCard
            title="ACTIVE CLIENTS"
            value={activeCount}
            variant="emerald"
            trend="up"
            trendValue={`${activePercentage}% Active`}
            description="↑ Accounts in good standing"
            icon={CheckBadge}
            completionGauge={{
              percentage: activePercentage || 100,
              label: `${activePercentage}% Active Ratio`,
              subtext: `${activeCount} Active • ${inactiveCount} Inactive`
            }}
          />

          {/* Card 3: Total Credit Exposure — Volume Sparkline */}
          <KpiCard
            title="TOTAL CREDIT EXPOSURE"
            value={`SAR ${(totalCreditLimit / 1000).toFixed(0)}K`}
            variant="blue"
            trend="up"
            trendValue="Approved"
            description="→ Approved credit facility"
            icon={MoneyBills}
            chartData={[320, 380, 410, 490, 560, 620, Math.round(totalCreditLimit / 1000) || 750]}
          />

          {/* Card 4: Contract Renewals Due — Urgency Progress Bar */}
          <KpiCard
            title="CONTRACT RENEWALS"
            value={Math.ceil(totalCount * 0.15) || 2}
            variant="amber"
            trend="neutral"
            trendValue="30-90 Days"
            description="→ Commercial contract horizon"
            icon={CalendarIcon}
            progressSegments={[
              { label: '1 Expiring (<30d)', value: 25, color: 'bg-rose-500' },
              { label: '2 Warning (90d)', value: 35, color: 'bg-amber-500' },
              { label: 'Active Contracts', value: 40, color: 'bg-slate-300' },
            ]}
          />
        </div>

        {/* Filter & Control Bar */}
        <div className="bg-white rounded-xl border border-black/[0.08] p-2.5 shadow-2xs shrink-0">
          <div className="flex items-center justify-between gap-3 overflow-x-auto">
            
            {/* Search Input & Inline Dropdown Controls (Strictly Horizontal) */}
            <div className="flex items-center gap-2.5 shrink-0">
              
              {/* Search Input */}
              <div className="relative w-64 shrink-0">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search company name, phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-xs border-slate-200 rounded-lg focus-visible:ring-slate-400 bg-white"
                />
              </div>

              {/* Status Filter Dropdown */}
              <Select
                value={selectedStatus}
                onValueChange={(val) => {
                  if (val) {
                    setSelectedStatus(val as any);
                    setCurrentPage(1);
                  }
                }}
              >
                <SelectTrigger className="h-9 px-3 w-44 shrink-0 border-slate-200 bg-white rounded-lg text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors shadow-2xs">
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

              {/* Credit Tier Filter Dropdown */}
              <Select
                value={creditTierFilter}
                onValueChange={(val) => { if (val) setCreditTierFilter(val as any); }}
              >
                <SelectTrigger className="h-9 px-3 w-44 shrink-0 border-slate-200 bg-white rounded-lg text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors shadow-2xs">
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

            {/* View Mode Switcher Pill */}
            <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200/60 dark:border-slate-700/60 shrink-0 ml-auto">
              <button
                onClick={() => setViewMode('list')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  viewMode === 'list' 
                    ? 'bg-white text-slate-900 shadow-2xs' 
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <List size={13} />
                <span>List</span>
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  viewMode === 'grid' 
                    ? 'bg-white text-slate-900 shadow-2xs' 
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <LayoutGrid size={13} />
                <span>Grid</span>
              </button>
            </div>

          </div>
        </div>

        {/* Dynamic Table or Grid Render */}
        {viewMode === 'list' ? (
          <div className="flex-1 min-h-0 bg-white rounded-lg border border-black/[0.08] shadow-2xs overflow-hidden">
            <DataTable
              columns={columns}
              data={filteredCustomers}
              isLoading={isLoading}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              onRowClick={(row) => navigate(`/customers/${row.id}`)}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 flex-1 overflow-y-auto">
            {filteredCustomers.map(c => {
              return (
                <div 
                  key={c.id} 
                  className="bg-white rounded-xl border border-black/[0.08] p-4 shadow-2xs flex flex-col justify-between gap-3 hover:border-indigo-200 transition-all cursor-pointer"
                  onClick={() => navigate(`/customers/${c.id}`)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600 shrink-0">
                        {c.name?.[0]?.toUpperCase() || 'C'}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 text-sm">
                          {c.name}
                        </span>
                        <span className="font-mono text-[11px] text-[#E8450F] font-bold">
                          {`CUST-${c.id.slice(0, 5).toUpperCase()}`}
                        </span>
                      </div>
                    </div>
                    {c.isActive ? (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold">
                        Inactive
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-1.5 py-2 border-y border-slate-100 text-xs">
                    <div className="flex justify-between items-center text-slate-600">
                      <span className="font-medium text-slate-400">Phone:</span>
                      <span className="font-semibold text-slate-800">{c.contact_phone}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span className="font-medium text-slate-400">Credit Limit:</span>
                      <span className="font-mono font-bold text-slate-800">SAR {(c.credit_limit || 0).toLocaleString()}</span>
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

      </div>
    </DashboardLayout>
  );
}
