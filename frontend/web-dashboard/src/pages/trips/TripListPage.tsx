import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Download, 
  Eye, 
  Edit2, 
  Trash2, 
  Navigation, 
  Search, 
  AlertTriangle, 
  MoreVertical, 
  RefreshCw, 
  Truck, 
  User, 
  MapPin, 
  Layers,
  Filter,
  CheckCircle2,
  RotateCw,
  List,
  LayoutGrid,
  Calendar as CalendarIcon,
  Building2,
  FileText,
  ChevronDown
} from 'lucide-react';
import { TruckMotion, CheckBadge, RouteLine, ClockIcon } from '@/components/ui/kpi-icons';

import { downloadCSV } from '@/utils/exportUtils';
import { tripService, Trip, TripStatus } from '@/services/tripService';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import Btn from '@/components/ui/Btn';
import KpiCard from '@/components/ui/KpiCard';

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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

const STATUS_TABS: { label: string; value: TripStatus | 'All' }[] = [
  { label: 'All Operations', value: 'All' },
  { label: 'Drafts', value: 'Draft' },
  { label: 'Dispatched', value: 'Dispatched' },
  { label: 'At Pickup', value: 'AtPickup' },
  { label: 'In Transit', value: 'InTransit' },
  { label: 'At Delivery', value: 'AtDelivery' },
  { label: 'Completed', value: 'Completed' },
  { label: 'Cancelled', value: 'Cancelled' },
];

export default function TripListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState<TripStatus | 'All'>('All');
  const [hazmatFilter, setHazmatFilter] = useState<'All' | 'Hazmat' | 'Standard'>('All');
  const [dateFilter, setDateFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'calendar'>('list');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 300);

  // Status Change Dialog state
  const [statusDialogTrip, setStatusDialogTrip] = useState<Trip | null>(null);
  const [newStatus, setNewStatus] = useState<TripStatus>('Dispatched');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Fetch trips using React Query
  const { data: tripsRes, isLoading } = useQuery({
    queryKey: ['trips', selectedStatus, debouncedSearch, currentPage],
    queryFn: () => tripService.getAll({
      status: selectedStatus === 'All' ? undefined : selectedStatus,
      search: debouncedSearch || undefined,
      page: currentPage,
      per_page: 10,
    }),
  });

  const rawTrips = tripsRes?.data || [];
  const totalPages = tripsRes?.meta?.total_pages || 1;

  // Local hazmat filtering if applied
  const trips = rawTrips.filter((t) => {
    if (hazmatFilter === 'Hazmat') return t.hazmat_flag === true;
    if (hazmatFilter === 'Standard') return !t.hazmat_flag;
    return true;
  });

  // Calculate totals for KPIs
  const totalCount = tripsRes?.meta?.total || rawTrips.length;
  const inTransitCount = rawTrips.filter(t => t.status === 'InTransit').length;
  const completedCount = rawTrips.filter(t => t.status === 'Completed').length;
  const draftCount = rawTrips.filter(t => t.status === 'Draft' || t.status === 'Dispatched').length;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['trips'] });
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleUpdateStatus = async () => {
    if (!statusDialogTrip) return;
    try {
      setIsUpdatingStatus(true);
      await tripService.updateStatus(statusDialogTrip.id, newStatus);
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      setStatusDialogTrip(null);
    } catch (e) {
      alert('Failed to update trip status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const columns = [
    {
      header: 'Trip Ref ID',
      accessor: (row: Trip) => (
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-xs font-bold text-[#E8450F]">
              {row.ref_id || 'Draft'}
            </span>
            {row.hazmat_flag && (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px] px-1.5 py-0 h-4 font-semibold flex items-center gap-0.5">
                <AlertTriangle size={10} className="shrink-0" />
                HAZMAT
              </Badge>
            )}
          </div>
          <span className="text-[11px] text-muted-foreground font-medium">
            {row.cargo_type || 'Standard Cargo'}
          </span>
        </div>
      ),
    },
    {
      header: 'Customer',
      accessor: (row: Trip) => (
        <div className="flex flex-col min-w-[140px]">
          <span className="font-semibold text-xs text-[#111] leading-snug">
            {row.customer?.name || '—'}
          </span>
          {row.customer?.contact_phone && (
            <span className="text-[10px] text-muted-foreground font-mono">
              {row.customer.contact_phone}
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Driver',
      accessor: (row: Trip) => (
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
            <User size={12} className="text-slate-500" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-[#222] truncate">
              {row.driver ? `${row.driver.first_name} ${row.driver.last_name}` : 'Unassigned'}
            </span>
            {row.driver?.ai_risk_score != null && (
              <span className="text-[10px] font-bold text-emerald-600">
                Risk: {row.driver.ai_risk_score.toFixed(1)}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Vehicle',
      accessor: (row: Trip) => (
        <div className="flex items-center gap-1.5">
          <Truck size={13} className="text-slate-400 shrink-0" />
          <span className="font-mono text-xs text-slate-700 dark:text-slate-300 font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
            {row.vehicle?.plate_number || 'Unassigned'}
          </span>
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: (row: Trip) => (
        <div className="flex items-center gap-2">
          <StatusBadge status={row.status} />
          <button
            onClick={(e) => {
              e.stopPropagation();
              setStatusDialogTrip(row);
              setNewStatus(row.status);
            }}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
            title="Quick Status Change"
          >
            <RefreshCw size={11} />
          </button>
        </div>
      ),
    },
    {
      header: 'Planned Start',
      accessor: (row: Trip) => (
        <span className="text-xs text-muted-foreground font-medium">
          {row.planned_start ? new Date(row.planned_start).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
        </span>
      ),
    },
    {
      header: 'Actions',
      accessor: (row: Trip) => (
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
                Trip Operations
              </DropdownMenuLabel>
              
              <DropdownMenuItem className="cursor-pointer text-xs font-medium py-2 px-2.5 rounded-lg hover:bg-slate-100" onClick={() => navigate(`/trips/${row.id}`)}>
                <Eye className="mr-2 h-3.5 w-3.5 text-blue-600 shrink-0" />
                View Full Details
              </DropdownMenuItem>

              {row.status === 'InTransit' && (
                <DropdownMenuItem className="cursor-pointer text-xs font-medium py-2 px-2.5 rounded-lg hover:bg-orange-50" onClick={() => navigate(`/trips/${row.id}/track`)}>
                  <Navigation className="mr-2 h-3.5 w-3.5 text-[#E8450F] shrink-0" />
                  Live GPS Track
                </DropdownMenuItem>
              )}

              <DropdownMenuItem className="cursor-pointer text-xs font-medium py-2 px-2.5 rounded-lg hover:bg-emerald-50" onClick={() => {
                setStatusDialogTrip(row);
                setNewStatus(row.status);
              }}>
                <RefreshCw className="mr-2 h-3.5 w-3.5 text-emerald-600 shrink-0" />
                Quick Status Update
              </DropdownMenuItem>

              <DropdownMenuItem className="cursor-pointer text-xs font-medium py-2 px-2.5 rounded-lg hover:bg-slate-100" onClick={() => navigate(`/trips/${row.id}/edit`)}>
                <Edit2 className="mr-2 h-3.5 w-3.5 text-amber-600 shrink-0" />
                Edit Trip Manifest
              </DropdownMenuItem>

              <DropdownMenuSeparator className="my-1 border-slate-100" />

              <DropdownMenuItem
                className="cursor-pointer text-xs font-semibold py-2 px-2.5 rounded-lg text-rose-600 focus:text-rose-600 focus:bg-rose-50"
                onClick={async () => {
                  if (confirm(`Delete trip ${row.ref_id || 'Draft'}?`)) {
                    await tripService.bulkDelete([row.id]);
                    queryClient.invalidateQueries({ queryKey: ['trips'] });
                  }
                }}
              >
                <Trash2 className="mr-2 h-3.5 w-3.5 text-rose-600 shrink-0" />
                Delete Trip Draft
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  const bulkActions = [
    {
      label: 'Export Selected CSV',
      icon: <Download size={13} />,
      variant: 'secondary' as const,
      onClick: (selectedRows: Trip[]) => {
        downloadCSV(selectedRows, 'trips_export.csv');
      }
    },
    {
      label: 'Delete Selected',
      icon: <Trash2 size={13} />,
      variant: 'danger' as const,
      onClick: async (selectedRows: Trip[]) => {
        if (!confirm(`Are you sure you want to delete ${selectedRows.length} selected trips?`)) return;
        try {
          await tripService.bulkDelete(selectedRows.map(r => r.id));
          queryClient.invalidateQueries({ queryKey: ['trips'] });
        } catch (e) { alert('Failed to delete trips'); }
      }
    }
  ];

  return (
    <DashboardLayout 
      active="Trips" 
      title="Trips" 
    >
      <div className="px-6 pb-6 h-full flex flex-col animate-fade-in gap-5">
        
        {/* Page Content Header Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 shrink-0 pb-1">
          <div className="flex items-center gap-3">
            {/* Page Icon Container */}
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 shadow-2xs">
              <Truck className="w-5 h-5 text-indigo-600" />
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                  Trips
                </h1>
                <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-200/80 text-[10px] font-bold tracking-wide uppercase px-2 py-0.5">
                  Operations Module
                </Badge>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Scope: MERCON Fleet Logistics & Shipping Manifests
              </p>
            </div>
          </div>

          {/* Page-Level Action Buttons */}
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-xs font-semibold border-slate-200 bg-white hover:bg-slate-50 shadow-2xs"
              onClick={() => downloadCSV(trips, 'all_trips_export.csv')}
            >
              <Download className="h-3.5 w-3.5 text-slate-600" />
              Export CSV
            </Button>

            <Button
              size="sm"
              className="h-9 gap-1.5 text-xs font-bold bg-[#E8450F] hover:bg-[#d03d0c] text-white shadow-xs rounded-md px-4"
              onClick={() => navigate('/trips/new')}
            >
              <Plus className="h-4 w-4" />
              New Trip Draft
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
        
        {/* Instrument Panel KPI Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
          <KpiCard
            title="TOTAL TRIPS"
            value={totalCount}
            variant="brand"
            trend="up"
            trendValue="+12%"
            description="→ Active logged site operations"
            icon={TruckMotion}
            chartData={[10, 14, 18, 15, 22, 28, totalCount || 35]}
          />
          <KpiCard
            title="IN TRANSIT"
            value={inTransitCount}
            variant="blue"
            trend="neutral"
            trendValue="Active"
            description="→ Live on-road cargo routes"
            icon={RouteLine}
            chartData={[2, 3, 4, 3, 5, 4, inTransitCount || 6]}
          />
          <KpiCard
            title="DELIVERED & COMPLETED"
            value={completedCount}
            variant="emerald"
            trend="up"
            trendValue="92.4% On-Time"
            description="↑ POD verified & delivered"
            icon={CheckBadge}
            progressSegments={[
              { label: '88% On-Time', value: 88, color: 'bg-emerald-500' },
              { label: '8% Delay', value: 8, color: 'bg-amber-500' },
              { label: '4% Exception', value: 4, color: 'bg-slate-300' },
            ]}
          />
          <KpiCard
            title="DISPATCH QUEUE"
            value={draftCount}
            variant="amber"
            trend="neutral"
            trendValue="Pending Stage"
            description="→ Pending driver & route prep"
            icon={ClockIcon}
            progressSegments={[
              { label: 'Pending Driver', value: 50, color: 'bg-amber-500' },
              { label: 'Ready Dispatch', value: 35, color: 'bg-blue-500' },
              { label: 'Unassigned', value: 15, color: 'bg-rose-500' },
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
                  placeholder="Search trip ID, customer, driver..."
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
                    setSelectedStatus(val as TripStatus | 'All');
                    setCurrentPage(1);
                  }
                }}
              >
                <SelectTrigger className="h-9 px-3 w-44 shrink-0 border-slate-200 bg-white rounded-lg text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors shadow-2xs">
                  <div className="flex items-center gap-2">
                    <Filter className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                    <SelectValue placeholder="All Operations" />
                  </div>
                </SelectTrigger>
                <SelectContent align="start" className="w-56 p-1.5 shadow-lg border border-slate-200 bg-white rounded-xl">
                  <SelectGroup>
                    <SelectLabel className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-2 py-1">
                      Filter Status
                    </SelectLabel>
                    <SelectItem value="All" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                      <span className="flex items-center gap-2 font-medium text-slate-700">
                        <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                        All Operations
                      </span>
                    </SelectItem>
                  </SelectGroup>
                  <SelectSeparator className="my-1 border-slate-100" />
                  <SelectGroup>
                    <SelectItem value="Draft" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                      <span className="flex items-center gap-2 font-medium text-amber-700">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        Drafts
                      </span>
                    </SelectItem>
                    <SelectItem value="Dispatched" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                      <span className="flex items-center gap-2 font-medium text-blue-700">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        Dispatched
                      </span>
                    </SelectItem>
                    <SelectItem value="AtPickup" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                      <span className="flex items-center gap-2 font-medium text-purple-700">
                        <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                        At Pickup
                      </span>
                    </SelectItem>
                    <SelectItem value="InTransit" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                      <span className="flex items-center gap-2 font-medium text-[#E8450F]">
                        <span className="w-2 h-2 rounded-full bg-[#E8450F]"></span>
                        In Transit
                      </span>
                    </SelectItem>
                    <SelectItem value="AtDelivery" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                      <span className="flex items-center gap-2 font-medium text-indigo-700">
                        <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                        At Delivery
                      </span>
                    </SelectItem>
                    <SelectItem value="Completed" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                      <span className="flex items-center gap-2 font-medium text-emerald-700">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        Completed
                      </span>
                    </SelectItem>
                    <SelectItem value="Cancelled" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                      <span className="flex items-center gap-2 font-medium text-rose-700">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        Cancelled
                      </span>
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>

              {/* Cargo / Hazmat Filter Dropdown */}
              <Select
                value={hazmatFilter}
                onValueChange={(val) => { if (val) setHazmatFilter(val as any); }}
              >
                <SelectTrigger className="h-9 px-3 w-40 shrink-0 border-slate-200 bg-white rounded-lg text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors shadow-2xs">
                  <div className="flex items-center gap-2">
                    <Layers className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                    <SelectValue placeholder="All Cargo" />
                  </div>
                </SelectTrigger>
                <SelectContent align="start" className="w-48 p-1.5 shadow-lg border border-slate-200 bg-white rounded-xl">
                  <SelectGroup>
                    <SelectLabel className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-2 py-1">
                      Cargo Classification
                    </SelectLabel>
                    <SelectItem value="All" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">All Cargo Types</SelectItem>
                    <SelectItem value="Standard" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">Standard Freight</SelectItem>
                    <SelectItem value="Hazmat" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                      <span className="flex items-center gap-2 font-semibold text-rose-600">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        HAZMAT Only
                      </span>
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>

              {/* Date Range Dropdown */}
              <Select
                value={dateFilter}
                onValueChange={(val) => { if (val) setDateFilter(val); }}
              >
                <SelectTrigger className="h-9 px-3 w-36 shrink-0 border-slate-200 bg-white rounded-lg text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors shadow-2xs">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                    <SelectValue placeholder="All Dates" />
                  </div>
                </SelectTrigger>
                <SelectContent align="start" className="w-44 p-1.5 shadow-lg border border-slate-200 bg-white rounded-xl">
                  <SelectGroup>
                    <SelectLabel className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-2 py-1">
                      Date Horizon
                    </SelectLabel>
                    <SelectItem value="All" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">All Dates</SelectItem>
                    <SelectItem value="Today" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">Today</SelectItem>
                    <SelectItem value="ThisWeek" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">This Week</SelectItem>
                    <SelectItem value="ThisMonth" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">This Month</SelectItem>
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

        <div className="flex-1 min-h-0 bg-white rounded-lg border border-black/[0.08] shadow-2xs overflow-hidden">
          <DataTable
            data={trips}
            columns={columns}
            isLoading={isLoading}
            bulkActions={bulkActions}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(page) => setCurrentPage(page)}
            onRowClick={(row) => navigate(`/trips/${row.id}`)}
          />
        </div>

        {/* Quick Status Update Modal (Dialog) */}
        <Dialog open={!!statusDialogTrip} onOpenChange={(open) => !open && setStatusDialogTrip(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-[#E8450F]" />
                Update Trip Status
              </DialogTitle>
              <DialogDescription className="text-xs">
                Update operational status for trip <span className="font-mono font-bold text-[#E8450F]">{statusDialogTrip?.ref_id || 'Draft'}</span>.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-3">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Select New Status:
              </label>
              <Select value={newStatus} onValueChange={(val) => { if (val) setNewStatus(val as any); }}>
                <SelectTrigger className="w-full text-xs font-semibold border-slate-200 rounded-lg">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="w-full p-1.5 shadow-lg border border-slate-200 bg-white rounded-xl">
                  <SelectItem value="Draft" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">Draft</SelectItem>
                  <SelectItem value="Dispatched" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">Dispatched</SelectItem>
                  <SelectItem value="AtPickup" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">At Pickup</SelectItem>
                  <SelectItem value="InTransit" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">In Transit</SelectItem>
                  <SelectItem value="AtDelivery" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">At Delivery</SelectItem>
                  <SelectItem value="Completed" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">Completed</SelectItem>
                  <SelectItem value="Cancelled" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setStatusDialogTrip(null)}
                disabled={isUpdatingStatus}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="text-xs font-bold bg-brand hover:bg-brand/90 text-white"
                onClick={handleUpdateStatus}
                disabled={isUpdatingStatus}
              >
                {isUpdatingStatus ? 'Saving...' : 'Update Status'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </DashboardLayout>
  );
}
