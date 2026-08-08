import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Download,
  Edit2,
  Trash2,
  Navigation,
  Search,
  RefreshCw,
  Truck,
  User,
  MapPin,
  Layers,
  Filter,
  CheckCircle2,
  RotateCw,
  Calendar as CalendarIcon,
  Building2,
  FileText
} from 'lucide-react';
import { TruckMotion, CheckBadge, RouteLine, ClockIcon } from '@/components/ui/kpi-icons';

import { downloadCSV, downloadPDF } from '@/utils/exportUtils';
import { tripService, Trip, TripStatus } from '@/services/tripService';
import { driverService } from '@/services/driverService';
import { vehicleService } from '@/services/vehicleService';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import Btn from '@/components/ui/Btn';
import KpiCard from '@/components/ui/KpiCard';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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

type ExportStatusGroup = 'All' | 'Completed' | 'InTransit' | 'NotCompleted';

const EXPORT_STATUS_GROUPS: { label: string; value: ExportStatusGroup }[] = [
  { label: 'All Trips', value: 'All' },
  { label: 'Completed / Delivered Only', value: 'Completed' },
  { label: 'In Transit Right Now', value: 'InTransit' },
  { label: 'Not Completed', value: 'NotCompleted' },
];

const matchesExportStatusGroup = (status: TripStatus, group: ExportStatusGroup) => {
  if (group === 'All') return true;
  if (group === 'Completed') return status === 'Completed' || status === 'AtDelivery' || status === 'Invoiced';
  if (group === 'InTransit') return status === 'InTransit';
  if (group === 'NotCompleted') return status !== 'Completed' && status !== 'AtDelivery' && status !== 'Invoiced';
  return true;
};

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
  const [pageSize, setPageSize] = useState(10);
  const [selectedStatus, setSelectedStatus] = useState<TripStatus | 'All'>('All');
  const [dateFilter, setDateFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 300);

  // Status Change Dialog state
  const [statusDialogTrip, setStatusDialogTrip] = useState<Trip | null>(null);
  const [newStatus, setNewStatus] = useState<TripStatus>('Dispatched');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Export Dialog state
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportDriverId, setExportDriverId] = useState('All');
  const [exportVehicleId, setExportVehicleId] = useState('All');
  const [exportStatusGroup, setExportStatusGroup] = useState<ExportStatusGroup>('All');
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const { data: exportDriversRes } = useQuery({
    queryKey: ['drivers-for-export'],
    queryFn: () => driverService.getAll({ per_page: 500 }),
    enabled: exportDialogOpen,
  });
  const { data: exportVehiclesRes } = useQuery({
    queryKey: ['vehicles-for-export'],
    queryFn: () => vehicleService.getAll({ per_page: 500 }),
    enabled: exportDialogOpen,
  });
  const exportDrivers = exportDriversRes?.data || [];
  const exportVehicles = exportVehiclesRes?.data || [];

  // Fetch trips using React Query
  const { data: tripsRes, isLoading, isError, error } = useQuery({
    queryKey: ['trips', selectedStatus, dateFilter, debouncedSearch, currentPage, pageSize],
    queryFn: () => tripService.getAll({
      status: selectedStatus === 'All' ? undefined : selectedStatus,
      date_filter: dateFilter === 'All' ? undefined : dateFilter,
      search: debouncedSearch || undefined,
      page: currentPage,
      per_page: pageSize,
    }),
  });

  // Fetch overall trips for KPI calculation (unfiltered by status)
  const { data: allTripsRes } = useQuery({
    queryKey: ['trips-kpis', dateFilter, debouncedSearch],
    queryFn: () => tripService.getAll({
      date_filter: dateFilter === 'All' ? undefined : dateFilter,
      search: debouncedSearch || undefined,
      per_page: 500,
    }),
  });

  const rawTrips = tripsRes?.data || [];
  const totalPages = tripsRes?.meta?.total_pages || 1;
  const trips = rawTrips;

  // Calculate totals for KPIs from real backend response data
  const kpiTrips = allTripsRes?.data || rawTrips;
  const totalCount = allTripsRes?.meta?.total || kpiTrips.length;

  const activeInTransit = kpiTrips.filter(t => t.status === 'InTransit' || t.status === 'AtPickup' || t.status === 'Dispatched');
  const inTransitCount = activeInTransit.length;
  const stoppedCount = activeInTransit.filter(t => t.status === 'AtPickup').length;
  const onScheduleCount = activeInTransit.length - stoppedCount;
  const delayedCount = 0;

  const completedTrips = kpiTrips.filter(t => t.status === 'Completed' || t.status === 'Invoiced' || t.status === 'AtDelivery');
  const completedCount = completedTrips.length;
  const completedPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const draftTrips = kpiTrips.filter(t => t.status === 'Draft');
  const draftCount = draftTrips.length;
  const stageDraftCount = kpiTrips.filter(t => t.status === 'Draft' && !t.driver).length;
  const stageAssignedCount = kpiTrips.filter(t => t.driver && (t.status === 'Draft' || t.status === 'Dispatched')).length;
  const stageReadyCount = kpiTrips.filter(t => t.status === 'Dispatched' || t.status === 'AtPickup').length;

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

  const handleExport = async (format: 'csv' | 'pdf') => {
    try {
      setIsExporting(true);
      const res = await tripService.getAll({
        driver_id: exportDriverId === 'All' ? undefined : exportDriverId,
        vehicle_id: exportVehicleId === 'All' ? undefined : exportVehicleId,
        start_date: exportStartDate || undefined,
        end_date: exportEndDate || undefined,
        per_page: 2000,
      });
      const matched = (res.data || []).filter(t => matchesExportStatusGroup(t.status, exportStatusGroup));

      if (!matched.length) {
        alert('No trips match the selected export filters.');
        return;
      }

      const groupLabel = EXPORT_STATUS_GROUPS.find(g => g.value === exportStatusGroup)?.label.replace(/[\s/]+/g, '_') || 'Trips';
      const datePart = new Date().toISOString().slice(0, 10);
      const baseName = `trips_export_${groupLabel}_${datePart}`;

      if (format === 'csv') {
        downloadCSV(matched, `${baseName}.csv`);
      } else {
        downloadPDF(matched, `Trips Export — ${EXPORT_STATUS_GROUPS.find(g => g.value === exportStatusGroup)?.label}`);
      }
      setExportDialogOpen(false);
    } catch (e) {
      alert('Failed to generate export.');
    } finally {
      setIsExporting(false);
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
            {row.driver ? (
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                {`${row.driver.first_name} ${row.driver.last_name}`}
              </span>
            ) : (
              <span className="text-xs text-slate-400 dark:text-slate-500 italic">
                Unassigned
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
          {row.vehicle?.plate_number ? (
            <span className="font-mono text-xs text-slate-700 dark:text-slate-300 font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
              {row.vehicle.plate_number}
            </span>
          ) : (
            <span className="text-xs text-slate-400 dark:text-slate-500 italic">
              Unassigned
            </span>
          )}
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
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {row.status === 'InTransit' && (
            <button
              onClick={() => navigate(`/trips/${row.id}/track`)}
              title="Live GPS Track"
              className="p-1.5 rounded-lg text-[#E8450F] hover:bg-orange-50 transition-colors"
            >
              <Navigation className="h-3.5 w-3.5" />
            </button>
          )}

          <button
            onClick={() => {
              setStatusDialogTrip(row);
              setNewStatus(row.status);
            }}
            title="Quick Status Update"
            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={() => navigate(`/trips/${row.id}/edit`)}
            title="Edit Trip Manifest (Update status, driver, or vehicle)"
            className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={async () => {
              if (confirm(`Delete trip ${row.ref_id || 'Draft'}?`)) {
                await tripService.bulkDelete([row.id]);
                queryClient.invalidateQueries({ queryKey: ['trips'] });
              }
            }}
            title="Delete Trip Draft"
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
      label: 'Edit Selected Manifest',
      icon: <Edit2 size={13} />,
      variant: 'primary' as const,
      onClick: (selectedRows: Trip[]) => {
        if (selectedRows.length === 1) {
          navigate(`/trips/${selectedRows[0].id}/edit`);
        } else if (selectedRows.length > 1) {
          setStatusDialogTrip(selectedRows[0]);
          setNewStatus(selectedRows[0].status);
        }
      }
    },
    {
      label: 'Export Selected CSV',
      icon: <Download size={13} />,
      variant: 'secondary' as const,
      onClick: (selectedRows: Trip[]) => {
        downloadCSV(selectedRows, 'trips_export.csv');
      }
    },
    {
      label: 'Export Selected PDF',
      icon: <FileText size={13} />,
      variant: 'secondary' as const,
      onClick: (selectedRows: Trip[]) => {
        downloadPDF(selectedRows, 'Trips Export');
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
      <div className="px-4 sm:px-6 pb-6 w-full flex flex-col animate-fade-in gap-5">
        
        {/* Page Content Header Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 shrink-0 pb-1">
          <div className="flex items-center gap-3">
            {/* Page Icon Container */}
            <Truck className="w-6 h-6 text-orange-500 dark:text-orange-400 shrink-0" />

            <div className="flex flex-col">
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                  Trips
                </h1>
              </div>
            </div>
          </div>

          {/* Page-Level Action Buttons */}
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-xs font-semibold border-slate-200 bg-white hover:bg-slate-50 shadow-2xs"
              onClick={() => setExportDialogOpen(true)}
            >
              <Download className="h-3.5 w-3.5 text-slate-600" />
              Export
            </Button>

            <Button
              size="sm"
              className="h-9 gap-1.5 text-xs font-bold bg-[#E8450F] hover:bg-[#d03d0c] text-white shadow-xs rounded-md px-4"
              onClick={() => navigate('/trips/new')}
            >
              <Plus className="h-4 w-4" />
              New Trip
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 shrink-0">
          <KpiCard
            title="TOTAL TRIPS"
            value={totalCount}
            variant="brand"
            trend="up"
            trendValue="+12%"
            description="Active logged site operations"
            icon={TruckMotion}
            chartData={[10, 14, 18, 15, 22, 28, totalCount || 35]}
            isActive={selectedStatus === 'All'}
            onClick={() => {
              setSelectedStatus('All');
              setCurrentPage(1);
            }}
          />
          <KpiCard
            title="IN TRANSIT"
            value={inTransitCount}
            variant="blue"
            trend="neutral"
            trendValue="En-Route"
            description="Live on-road active trips"
            icon={RouteLine}
            isActive={selectedStatus === 'InTransit' || selectedStatus === 'AtPickup'}
            routeHealthBreakdown={{
              onSchedule: onScheduleCount,
              delayed: delayedCount,
              stopped: stoppedCount,
              total: inTransitCount,
            } as any}
            onClick={() => {
              setSelectedStatus(selectedStatus === 'InTransit' ? 'All' : 'InTransit');
              setCurrentPage(1);
            }}
            onHealthClick={(healthType) => {
              if (healthType === 'stopped') {
                setSelectedStatus('AtPickup');
              } else {
                setSelectedStatus('InTransit');
              }
              setCurrentPage(1);
            }}
          />
          <KpiCard
            title="DELIVERED & COMPLETED"
            value={completedCount}
            variant="emerald"
            trend="up"
            trendValue={`${completedPercentage}% On-Time`}
            description="POD verified & delivered"
            icon={CheckBadge}
            isActive={selectedStatus === 'Completed' || selectedStatus === 'AtDelivery'}
            completionGauge={{
              percentage: completedPercentage || 100,
              label: `${completedPercentage}% POD Verified`,
              subtext: `${completedCount} Delivered Receipts`
            }}
            onClick={() => {
              setSelectedStatus(selectedStatus === 'Completed' ? 'All' : 'Completed');
              setCurrentPage(1);
            }}
          />
          <KpiCard
            title="DISPATCH QUEUE"
            value={draftCount}
            variant="amber"
            trend="neutral"
            trendValue="Pending Stage"
            description="Stage workflow queue"
            icon={ClockIcon}
            isActive={selectedStatus === 'Draft' || selectedStatus === 'Dispatched'}
            pipelineStages={[
              { name: "Draft", count: stageDraftCount, color: "bg-amber-500" },
              { name: "Assigned", count: stageAssignedCount, color: "bg-blue-500" },
              { name: "Ready", count: stageReadyCount, color: "bg-emerald-500" },
            ]}
            onClick={() => {
              setSelectedStatus(selectedStatus === 'Draft' ? 'All' : 'Draft');
              setCurrentPage(1);
            }}
            onStageClick={(stageName) => {
              if (stageName === 'Assigned') {
                setSelectedStatus('Dispatched');
              } else if (stageName === 'Ready') {
                setSelectedStatus('AtPickup');
              } else {
                setSelectedStatus('Draft');
              }
              setCurrentPage(1);
            }}
          />
        </div>
        {/* Filter & Control Bar */}
        <div className="bg-white rounded-xl border border-black/[0.08] p-2.5 shadow-2xs shrink-0">
          <div className="flex items-center justify-between gap-3 overflow-x-auto">
            
            {/* Search Input (Left Side) */}
            <div className="relative w-64 sm:w-72 shrink-0">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search trip ID, customer, driver..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs border-slate-200 rounded-lg focus-visible:ring-[#E8450F]/20 focus-visible:border-[#E8450F] bg-white font-medium"
              />
            </div>

            {/* Filter Dropdowns (Right Side, Opposite Search) */}
            <div className="flex items-center gap-2.5 shrink-0 ml-auto">
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

              {/* Date Range Dropdown */}
              <Select
                value={dateFilter}
                onValueChange={(val) => {
                  if (val) {
                    setDateFilter(val);
                    setCurrentPage(1);
                  }
                }}
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
          </div>
        </div>

        <div className="w-full flex flex-col">
          <DataTable
            title={
              <span className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-500" />
                <span>Trip Ledger</span>
              </span>
            }
            data={trips}
            columns={columns}
            enableSelection={true}
            compact={true}
            isLoading={isLoading}
            isError={isError}
            errorMessage={(error as Error)?.message || 'Failed to load trips.'}
            bulkActions={bulkActions}
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
            totalRecords={totalCount}
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
                  {(() => {
                    const currentStatus = statusDialogTrip?.status as TripStatus;
                    
                    const ALLOWED_TRANSITIONS: Record<TripStatus, TripStatus[]> = {
                      Draft: ['Dispatched', 'Cancelled'] as TripStatus[],
                      Dispatched: ['AtPickup', 'Cancelled'] as TripStatus[],
                      AtPickup: ['InTransit', 'Cancelled'] as TripStatus[],
                      InTransit: ['AtDelivery', 'Cancelled'] as TripStatus[],
                      AtDelivery: ['Completed', 'Cancelled'] as TripStatus[],
                      Completed: ['Invoiced'] as TripStatus[],
                      Invoiced: [] as TripStatus[],
                      Cancelled: [] as TripStatus[],
                    };

                    const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
                    const isValid = (status: string) => status === currentStatus || allowed.includes(status as TripStatus);

                    return (
                      <>
                        <SelectItem value="Draft" disabled={!isValid('Draft')} className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">Draft</SelectItem>
                        <SelectItem value="Dispatched" disabled={!isValid('Dispatched')} className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">Dispatched</SelectItem>
                        <SelectItem value="AtPickup" disabled={!isValid('AtPickup')} className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">At Pickup</SelectItem>
                        <SelectItem value="InTransit" disabled={!isValid('InTransit')} className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">In Transit</SelectItem>
                        <SelectItem value="AtDelivery" disabled={!isValid('AtDelivery')} className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">At Delivery</SelectItem>
                        <SelectItem value="Completed" disabled={!isValid('Completed')} className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">Completed</SelectItem>
                        <SelectItem value="Cancelled" disabled={!isValid('Cancelled')} className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">Cancelled</SelectItem>
                      </>
                    );
                  })()}
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

        {/* Custom Export Dialog */}
        <Dialog open={exportDialogOpen} onOpenChange={(open) => !open && setExportDialogOpen(false)}>
          <DialogContent className="sm:max-w-[460px]">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold flex items-center gap-2">
                <Download className="h-4 w-4 text-[#E8450F]" />
                Export Trips
              </DialogTitle>
              <DialogDescription className="text-xs">
                Filter the trips you want, then export as CSV or PDF.
              </DialogDescription>
            </DialogHeader>

            <div className="py-2 space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Status</label>
                <Select value={exportStatusGroup} onValueChange={(val) => val && setExportStatusGroup(val as ExportStatusGroup)}>
                  <SelectTrigger className="w-full h-9 text-xs font-semibold border-slate-200 rounded-lg">
                    <SelectValue placeholder="All Trips" />
                  </SelectTrigger>
                  <SelectContent className="w-full p-1.5 shadow-lg border border-slate-200 bg-white rounded-xl">
                    {EXPORT_STATUS_GROUPS.map(g => (
                      <SelectItem key={g.value} value={g.value} className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                        {g.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Driver</label>
                  <Select value={exportDriverId} onValueChange={(val) => val && setExportDriverId(val)}>
                    <SelectTrigger className="w-full h-9 text-xs font-semibold border-slate-200 rounded-lg">
                      <SelectValue placeholder="All Drivers" />
                    </SelectTrigger>
                    <SelectContent className="w-full p-1.5 shadow-lg border border-slate-200 bg-white rounded-xl max-h-64">
                      <SelectItem value="All" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">All Drivers</SelectItem>
                      {exportDrivers.map(d => (
                        <SelectItem key={d.id} value={d.id} className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                          {d.first_name} {d.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Vehicle</label>
                  <Select value={exportVehicleId} onValueChange={(val) => val && setExportVehicleId(val)}>
                    <SelectTrigger className="w-full h-9 text-xs font-semibold border-slate-200 rounded-lg">
                      <SelectValue placeholder="All Vehicles" />
                    </SelectTrigger>
                    <SelectContent className="w-full p-1.5 shadow-lg border border-slate-200 bg-white rounded-xl max-h-64">
                      <SelectItem value="All" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">All Vehicles</SelectItem>
                      {exportVehicles.map(v => (
                        <SelectItem key={v.id} value={v.id} className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                          {v.plate_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">From Date</label>
                  <Input
                    type="date"
                    value={exportStartDate}
                    onChange={(e) => setExportStartDate(e.target.value)}
                    className="h-9 text-xs border-slate-200 rounded-lg"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">To Date</label>
                  <Input
                    type="date"
                    value={exportEndDate}
                    onChange={(e) => setExportEndDate(e.target.value)}
                    className="h-9 text-xs border-slate-200 rounded-lg"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs w-full sm:w-auto"
                onClick={() => setExportDialogOpen(false)}
                disabled={isExporting}
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs font-semibold gap-1.5 w-full sm:w-auto"
                onClick={() => handleExport('pdf')}
                disabled={isExporting}
              >
                <FileText className="h-3.5 w-3.5" />
                {isExporting ? 'Exporting...' : 'Export PDF'}
              </Button>
              <Button
                size="sm"
                className="text-xs font-bold bg-brand hover:bg-brand/90 text-white gap-1.5 w-full sm:w-auto"
                onClick={() => handleExport('csv')}
                disabled={isExporting}
              >
                <Download className="h-3.5 w-3.5" />
                {isExporting ? 'Exporting...' : 'Export CSV'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </DashboardLayout>
  );
}
