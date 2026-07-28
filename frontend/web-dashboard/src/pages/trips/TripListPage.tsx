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
  CheckCircle2
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
  SelectItem,
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
  const [search, setSearch] = useState('');
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
              <Button variant="ghost" className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900 hover:bg-slate-100">
                <span className="sr-only">Open menu</span>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Trip Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => navigate(`/trips/${row.id}`)}>
                <Eye className="mr-2 h-3.5 w-3.5 text-blue-600" />
                View Details
              </DropdownMenuItem>

              {row.status === 'InTransit' && (
                <DropdownMenuItem onClick={() => navigate(`/trips/${row.id}/track`)}>
                  <Navigation className="mr-2 h-3.5 w-3.5 text-brand" />
                  Live Track Map
                </DropdownMenuItem>
              )}

              <DropdownMenuItem onClick={() => {
                setStatusDialogTrip(row);
                setNewStatus(row.status);
              }}>
                <RefreshCw className="mr-2 h-3.5 w-3.5 text-emerald-600" />
                Quick Update Status
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => navigate(`/trips/${row.id}/edit`)}>
                <Edit2 className="mr-2 h-3.5 w-3.5 text-amber-600" />
                Edit Trip
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                className="text-rose-600 focus:text-rose-600 focus:bg-rose-50"
                onClick={async () => {
                  if (confirm(`Delete trip ${row.ref_id || 'Draft'}?`)) {
                    await tripService.bulkDelete([row.id]);
                    queryClient.invalidateQueries({ queryKey: ['trips'] });
                  }
                }}
              >
                <Trash2 className="mr-2 h-3.5 w-3.5 text-rose-600" />
                Delete Trip
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
      pageTitle="Trip Management & Dispatch" 
      pageSub="Monitor active shipping operations, drivers, and cargo movement"
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 text-xs font-semibold"
            onClick={() => downloadCSV(trips, 'all_trips_export.csv')}
          >
            <Download className="h-3.5 w-3.5 text-slate-600" />
            Export CSV
          </Button>

          <Button
            size="sm"
            className="h-9 gap-1.5 text-xs font-bold bg-[#E8450F] hover:bg-[#d03d0c] text-white shadow-sm"
            onClick={() => navigate('/trips/new')}
          >
            <Plus className="h-4 w-4" />
            New Trip
          </Button>
        </div>
      }
    >
      <div className="px-6 pb-6 h-full flex flex-col animate-fade-in gap-5">
        
        {/* Instrument Panel KPI Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
          <KpiCard
            title="Total Trips"
            value={totalCount}
            variant="brand"
            trend="up"
            trendValue="+12%"
            description="Total logged operations"
            icon={TruckMotion}
            chartData={[10, 14, 18, 15, 22, 28, totalCount || 35]}
          />
          <KpiCard
            title="In Transit"
            value={inTransitCount}
            variant="blue"
            trend="neutral"
            trendValue="Active"
            description="On the road now"
            icon={RouteLine}
            chartData={[2, 3, 4, 3, 5, 4, inTransitCount || 6]}
          />
          <KpiCard
            title="Completed"
            value={completedCount}
            variant="emerald"
            trend="up"
            trendValue="Delivered"
            description="Completed shipments"
            icon={CheckBadge}
            chartData={[8, 12, 14, 13, 19, 24, completedCount || 30]}
          />
          <KpiCard
            title="Dispatch Queue"
            value={draftCount}
            variant="amber"
            trend="neutral"
            trendValue="Pending"
            description="Drafts & assigned"
            icon={ClockIcon}
            chartData={[4, 5, 3, 6, 4, 5, draftCount || 7]}
          />
        </div>

        {/* Filter & Control Bar */}
        <div className="bg-white rounded-lg border border-black/[0.07] p-4 shadow-2xs space-y-3 shrink-0">
          
          {/* Quick Status Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 hide-scrollbar border-b border-slate-100 dark:border-slate-800">
            {STATUS_TABS.map((tab) => {
              const isActive = selectedStatus === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => {
                    setSelectedStatus(tab.value);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
                    isActive 
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs' 
                      : 'text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Search Input & Dropdown Select Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search trip ID, customer, cargo, driver..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs border-slate-200 focus-visible:ring-slate-400"
              />
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <Filter className="h-3.5 w-3.5" />
                <span>Filters:</span>
              </div>

              <Select
                value={hazmatFilter}
                onValueChange={(val) => { if (val) setHazmatFilter(val as any); }}
              >
                <SelectTrigger className="h-9 w-[150px] text-xs">
                  <SelectValue placeholder="Cargo Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Cargo</SelectItem>
                  <SelectItem value="Standard">Standard Cargo</SelectItem>
                  <SelectItem value="Hazmat">HAZMAT Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="flex-1 min-h-0 flex flex-col">
          <DataTable
            columns={columns}
            data={trips}
            bulkActions={bulkActions}
            isLoading={isLoading}
            searchPlaceholder="Search..."
            searchValue={search}
            onSearchChange={setSearch}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            onRowClick={(row) => navigate(`/trips/${row.id}`)}
          />
        </div>

        {/* Quick Status Update Modal (Dialog) */}
        <Dialog open={!!statusDialogTrip} onOpenChange={(open) => !open && setStatusDialogTrip(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-brand" />
                Update Trip Status
              </DialogTitle>
              <DialogDescription className="text-xs">
                Update operational status for trip <span className="font-mono font-bold text-brand">{statusDialogTrip?.ref_id || 'Draft'}</span>.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-3">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Select New Status:
              </label>
              <Select value={newStatus} onValueChange={(val) => { if (val) setNewStatus(val as any); }}>
                <SelectTrigger className="w-full text-xs">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Dispatched">Dispatched</SelectItem>
                  <SelectItem value="AtPickup">At Pickup</SelectItem>
                  <SelectItem value="InTransit">In Transit</SelectItem>
                  <SelectItem value="AtDelivery">At Delivery</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
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
