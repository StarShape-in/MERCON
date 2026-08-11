import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Wrench, Download, Plus, RotateCw, Filter, Search,
  Calendar, CheckCircle2, Clock, AlertTriangle, FileText, 
  DollarSign, Truck, Edit2, Trash2, ExternalLink, ShieldAlert,
  Building2, Gauge, Layers, ChevronDown, Eye,
  ChevronsUpDown, ArrowUp, LayoutGrid, List, Phone, Database
} from 'lucide-react';

import WorkshopField from '@/components/fleet/WorkshopField';
import ScheduleMaintenanceModal from '@/components/maintenance/ScheduleMaintenanceModal';
import DashboardLayout from '@/components/layout/DashboardLayout';
import KpiCard from '@/components/ui/KpiCard';
import { MaintenanceWrench, CheckBadge, MoneyBills, CalendarAlert } from '@/components/ui/kpi-icons';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

import { maintenanceService, MaintenanceRecord, CreateMaintenancePayload, MaintenanceType, MaintenanceStatus } from '@/services/maintenanceService';
import { vehicleService } from '@/services/vehicleService';
import { exportToCSV } from '@/utils/exportUtils';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { cn } from '@/lib/utils';
import ConfirmModal from '@/components/ui/ConfirmModal';
import DataTable, { Column } from '@/components/ui/DataTable';

/** `YYYY-MM-DD` for today — used as the `min` on scheduling date inputs. */
const TODAY_ISO = new Date().toISOString().split('T')[0];

export default function MaintenanceListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // "Service History" on the Vehicles page links here as ?vehicle=<plate>; the list search
  // already matches on plate number, so it lands pre-filtered to that vehicle.
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('vehicle') ?? '');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, typeFilter, pageSize]);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<MaintenanceRecord | null>(null);
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

  // Queries
  const { data: maintenanceRes, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['maintenance', debouncedSearch, statusFilter, typeFilter, page, pageSize],
    queryFn: () => maintenanceService.getAll({
      search: debouncedSearch || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      maintenance_type: typeFilter !== 'all' ? typeFilter : undefined,
      page,
      per_page: pageSize,
    }),
    // Keep previous data visible while the new search query is loading so the DataTable
    // is never unmounted mid-search (which caused focus loss and the "full page reload" UX bug).
    placeholderData: (prev) => prev,
  });

  const { data: vehiclesRes } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => vehicleService.getAll({ per_page: 100 }),
  });

  const records = maintenanceRes?.data || [];
  const kpis = maintenanceRes?.kpis || {
    total_cost: 0,
    active_count: 0,
    scheduled_count: 0,
    completed_count: 0,
    renewal_cost: 0,
  };

  const vehicles = vehiclesRes?.data || [];

  // Writing a service order can move its vehicle in or out of the workshop, so the
  // vehicle caches have to be dropped alongside the maintenance ones.
  const invalidateMaintenanceAndVehicles = () => {
    queryClient.invalidateQueries({ queryKey: ['maintenance'] });
    queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    queryClient.invalidateQueries({ queryKey: ['vehicle'] });
    // A workshop typed for the first time becomes a saved suggestion.
    queryClient.invalidateQueries({ queryKey: ['workshops'] });
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => maintenanceService.delete(id),
    onSuccess: () => {
      invalidateMaintenanceAndVehicles();
      setRecordToDelete(null);
    },
  });

  const handleOpenCreateModal = () => {
    setEditingRecord(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (rec: MaintenanceRecord) => {
    setEditingRecord(rec);
    setIsModalOpen(true);
  };

  const handleExport = () => {
    const exportData = records.map(r => ({
      ID: r.id,
      Vehicle: r.vehicle?.plate_number || 'N/A',
      Ref_ID: r.vehicle?.ref_id || 'N/A',
      Maintenance_Type: r.maintenance_type,
      Status: r.status,
      Start_Date: r.start_date ? new Date(r.start_date).toLocaleDateString() : '',
      End_Date: r.end_date ? new Date(r.end_date).toLocaleDateString() : '',
      Cost_SAR: r.cost,
      Workshop: r.workshop_name,
      Contact: r.workshop_contact || '',
      Odometer_km: r.odometer_reading,
      Work_Done: r.work_done || '',
      Invoice_No: r.invoice_number || '',
      Remarks: r.remarks || '',
    }));
    exportToCSV(exportData, `vehicle_maintenance_report_${new Date().toISOString().split('T')[0]}`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'In_Progress':
      case 'In Progress':
        return (
          <Badge className="bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400 border-none rounded-full px-2.5 py-0.5 font-medium text-[11px] flex items-center gap-1.5 shadow-none shrink-0 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0"></span>
            In Progress
          </Badge>
        );
      case 'Scheduled':
        return (
          <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 border-none rounded-full px-2.5 py-0.5 font-medium text-[11px] flex items-center gap-1.5 shadow-none shrink-0 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
            Scheduled
          </Badge>
        );
      case 'Completed':
        return (
          <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border-none rounded-full px-2.5 py-0.5 font-medium text-[11px] flex items-center gap-1.5 shadow-none shrink-0 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
            Completed
          </Badge>
        );
      case 'Cancelled':
        return (
          <Badge className="bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 border-none rounded-full px-2.5 py-0.5 font-medium text-[11px] flex items-center gap-1.5 shadow-none shrink-0 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
            Cancelled
          </Badge>
        );
      default:
        return (
          <Badge className="bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-400 border-none rounded-full px-2.5 py-0.5 font-medium text-[11px] shadow-none w-fit">
            {status}
          </Badge>
        );
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'Renewal':
        return (
          <Badge className="bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400 border-none rounded-full px-2.5 py-0.5 font-medium text-[11px] shadow-none w-fit">
            Renewal
          </Badge>
        );
      case 'Repair':
        return (
          <Badge className="bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 border-none rounded-full px-2.5 py-0.5 font-medium text-[11px] shadow-none w-fit">
            Repair
          </Badge>
        );
      case 'Inspection':
        return (
          <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400 border-none rounded-full px-2.5 py-0.5 font-medium text-[11px] shadow-none w-fit">
            Inspection
          </Badge>
        );
      case 'Emergency':
        return (
          <Badge className="bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border-none rounded-full px-2.5 py-0.5 font-medium text-[11px] shadow-none w-fit">
            Emergency
          </Badge>
        );
      default:
        return (
          <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800/40 dark:text-slate-400 border-none rounded-full px-2.5 py-0.5 font-medium text-[11px] shadow-none w-fit">
            Routine Service
          </Badge>
        );
    }
  };

  const bulkActions = [
    {
      label: 'Export CSV',
      icon: <Download size={13} />,
      variant: 'secondary' as const,
      onClick: (selectedRows: MaintenanceRecord[]) => {
        const exportData = selectedRows.map(r => ({
          Order_No: r.ref_id || '',
          Vehicle: r.vehicle?.plate_number || 'N/A',
          Ref_ID: r.vehicle?.ref_id || 'N/A',
          Maintenance_Type: r.maintenance_type,
          Status: r.status,
          Start_Date: r.start_date ? new Date(r.start_date).toLocaleDateString() : '',
          End_Date: r.end_date ? new Date(r.end_date).toLocaleDateString() : '',
          Cost_SAR: r.cost,
          Workshop: r.workshop_name,
          Contact: r.workshop_contact || '',
          Odometer_km: r.odometer_reading,
          Work_Done: r.work_done || '',
          Invoice_No: r.invoice_number || '',
          Remarks: r.remarks || '',
        }));
        exportToCSV(exportData, `maintenance_export_${new Date().toISOString().split('T')[0]}.csv`);
      }
    },
    {
      label: 'Delete Selected',
      icon: <Trash2 size={13} />,
      variant: 'danger' as const,
      onClick: (selectedRows: MaintenanceRecord[]) => {
        setConfirmModal({
          isOpen: true,
          title: 'Delete Selected Maintenance Records',
          message: `Are you sure you want to delete ${selectedRows.length} maintenance records? This action cannot be undone.`,
          onConfirm: async () => {
            try {
              await Promise.all(selectedRows.map(r => maintenanceService.delete(r.id)));
              invalidateMaintenanceAndVehicles();
            } catch (e) {
              toast.error('Failed to delete selected maintenance records');
            }
          }
        });
      }
    }
  ];

  const totalMaintenanceCount = kpis.active_count + kpis.scheduled_count + kpis.completed_count;

  return (
    <DashboardLayout active="Vehicles" title="Vehicle Maintenance">
      <div className="px-4 sm:px-6 pb-6 w-full flex flex-col animate-fade-in gap-5">

        {/* ── Page Content Header Row ─────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-4 shrink-0 pb-1">
          <div className="flex items-center gap-3">
            <Wrench className="w-6 h-6 text-orange-500 dark:text-orange-400 shrink-0" />

            <div className="flex flex-col">
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                  Vehicle Maintenance
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
              onClick={handleExport}
              className="h-9 gap-1.5 text-xs font-semibold border-slate-200 bg-white hover:bg-slate-50 shadow-2xs text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300"
            >
              <Download className="h-3.5 w-3.5 text-slate-600" />
              Export CSV
            </Button>

            <Button
              size="sm"
              onClick={handleOpenCreateModal}
              className="h-9 gap-1.5 text-xs font-bold bg-[#E8450F] hover:bg-[#d03d0c] text-white shadow-xs rounded-md px-4"
            >
              <Plus className="h-4 w-4" />
              Schedule Maintenance
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="h-9 w-9 p-0 text-slate-600 border-slate-200 bg-white hover:bg-slate-50 shadow-2xs dark:bg-slate-900 dark:border-slate-800"
              title="Refresh Data"
            >
              <RotateCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* ── 2. Instrument-Panel KPI Cards ───────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 shrink-0">
          
          <KpiCard
            title="TOTAL MAINTENANCE EXPENSE"
            value={
              <span>
                <span className="text-[16px] font-semibold mr-1.5 opacity-85">SAR</span>
                {kpis.total_cost.toLocaleString()}
              </span>
            }
            variant="brand"
            description={`${totalMaintenanceCount || records.length} total service records`}
            icon={MoneyBills}
            progressSegments={[
              { label: `Active (${kpis.active_count})`, value: kpis.active_count > 0 ? 50 : 0, color: 'bg-[#E8450F]' },
              { label: `Completed (${kpis.completed_count})`, value: kpis.completed_count > 0 ? 50 : 100, color: 'bg-emerald-500' },
            ]}
            isActive={statusFilter === 'all'}
            onClick={() => {
              setStatusFilter('all');
              setPage(1);
            }}
          />

          <KpiCard
            title="IN-PROGRESS SERVICE"
            value={
              <span>
                {kpis.active_count}
                <span className="text-[16px] font-semibold ml-1.5 opacity-85">Vehicles</span>
              </span>
            }
            variant="amber"
            trend={kpis.active_count > 0 ? 'down' : 'neutral'}
            trendValue={kpis.active_count > 0 ? 'In Shop' : 'All Clear'}
            description="Currently in workshop repair"
            icon={MaintenanceWrench}
            completionGauge={{
              percentage: totalMaintenanceCount > 0 ? Math.round((kpis.active_count / totalMaintenanceCount) * 100) : 0,
              label: `${kpis.active_count} In Repair`,
              subtext: 'Workshop Occupancy'
            }}
            isActive={statusFilter === 'In_Progress'}
            onClick={() => {
              setStatusFilter(statusFilter === 'In_Progress' ? 'all' : 'In_Progress');
              setPage(1);
            }}
          />

          <KpiCard
            title="RENEWALS & SCHEDULED"
            value={
              <span>
                {kpis.scheduled_count}
                <span className="text-[16px] font-semibold ml-1.5 opacity-85">Scheduled</span>
              </span>
            }
            variant="purple"
            trend="neutral"
            trendValue="Upcoming"
            description={`Renewal SAR ${kpis.renewal_cost.toLocaleString()}`}
            icon={CalendarAlert}
            chartData={[2, 3, 5, 4, kpis.scheduled_count || 6]}
            isActive={statusFilter === 'Scheduled'}
            onClick={() => {
              setStatusFilter(statusFilter === 'Scheduled' ? 'all' : 'Scheduled');
              setPage(1);
            }}
          />

          <KpiCard
            title="COMPLETED REPAIRS"
            value={
              <span>
                {kpis.completed_count}
                <span className="text-[16px] font-semibold ml-1.5 opacity-85">Records</span>
              </span>
            }
            variant="emerald"
            trend="up"
            trendValue="Verified"
            description="Fully serviced & verified"
            icon={CheckBadge}
            completionGauge={{
              percentage: totalMaintenanceCount > 0 ? Math.round((kpis.completed_count / totalMaintenanceCount) * 100) : 100,
              label: `${kpis.completed_count} Resolved`,
              subtext: 'Serviced Clear'
            }}
            isActive={statusFilter === 'Completed'}
            onClick={() => {
              setStatusFilter(statusFilter === 'Completed' ? 'all' : 'Completed');
              setPage(1);
            }}
          />

        </div>

        {/* ── 3. Data Table Ledger & Empty States ─────────────────────────── */}
        {viewMode === 'list' ? (
              <div className="w-full flex flex-col">
                <DataTable
                  title={
                    <span className="flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-amber-500" />
                      <span>Maintenance Ledger</span>
                    </span>
                  }
                  columns={[
                    {
                      header: 'Order #',
                      accessor: (r: MaintenanceRecord) => (
                        <span className="font-mono font-extrabold text-slate-900 dark:text-slate-100">
                          {r.ref_id || '—'}
                        </span>
                      ),
                    },
                    {
                      header: 'Vehicle / Ref',
                      accessor: (r: MaintenanceRecord) => (
                        <div>
                          <div className="font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                            <Truck className="w-3.5 h-3.5 text-indigo-500" />
                            {r.vehicle?.plate_number || 'TRK-UNKNOWN'}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                            {r.vehicle?.ref_id || 'Ref N/A'} • {r.odometer_reading ? `${r.odometer_reading.toLocaleString()} km` : '0 km'}
                          </div>
                        </div>
                      ),
                    },
                    {
                      header: 'Type',
                      accessor: (r: MaintenanceRecord) => getTypeBadge(r.maintenance_type),
                    },
                    {
                      header: 'Start Date',
                      accessor: (r: MaintenanceRecord) => (
                        <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                          {r.start_date ? new Date(r.start_date).toLocaleDateString() : r.service_date ? new Date(r.service_date).toLocaleDateString() : 'N/A'}
                        </span>
                      ),
                    },
                    {
                      header: 'End Date',
                      accessor: (r: MaintenanceRecord) => (
                        <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                          {r.end_date ? new Date(r.end_date).toLocaleDateString() : '—'}
                        </span>
                      ),
                    },
                    {
                      header: 'Expense (SAR)',
                      accessor: (r: MaintenanceRecord) => (
                        <span className="font-mono font-extrabold text-rose-600 dark:text-rose-400 text-xs">
                          SAR {(r.cost || 0).toLocaleString()}
                        </span>
                      ),
                    },
                    {
                      header: 'Workshop / Contact',
                      accessor: (r: MaintenanceRecord) => (
                        <div>
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {r.workshop_name}
                          </div>
                          {r.workshop_contact && (
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {r.workshop_contact}
                            </div>
                          )}
                        </div>
                      ),
                    },
                    {
                      header: 'Work Done / Details',
                      accessor: (r: MaintenanceRecord) => (
                        <div className="max-w-[220px]">
                          <p className="text-slate-700 dark:text-slate-300 truncate font-medium" title={r.work_done || r.remarks || ''}>
                            {r.work_done || r.remarks || 'Standard Service Maintenance'}
                          </p>
                          {r.invoice_number && (
                            <span className="text-[9px] font-mono text-slate-400 block mt-0.5">
                              Inv: {r.invoice_number}
                            </span>
                          )}
                        </div>
                      ),
                    },
                    {
                      header: 'Status',
                      accessor: (r: MaintenanceRecord) => getStatusBadge(r.status),
                    },
                    {
                      header: 'Actions',
                      headerClassName: 'text-right',
                      className: 'text-right',
                      accessor: (r: MaintenanceRecord) => (
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => navigate(`/maintenance/${r.id}`)}
                            title="View Details"
                            className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(r)}
                            title="Edit Log"
                            className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setRecordToDelete(r)}
                            title="Delete Record"
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ),
                    },
                  ]}
                  data={records}
                  enableSelection={true}
                  bulkActions={bulkActions}
                  compact={true}
                  searchPlaceholder="Search vehicle plate, workshop, invoice, or work done..."
                  searchValue={search}
                  onSearchChange={setSearch}
                  isLoading={isFetching}
                  emptyTitle="No Maintenance Records Found"
                  emptyMessage="There are no service, repair, or renewal logs matching your search or filter criteria."
                  actionsElement={
                    !isFetching && records.length === 0 && (statusFilter !== 'all' || typeFilter !== 'all' || search) ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setStatusFilter('all');
                          setTypeFilter('all');
                          setSearch('');
                        }}
                        className="text-xs font-semibold h-9"
                      >
                        Clear Filters
                      </Button>
                    ) : !isFetching && records.length === 0 ? (
                      <Button size="sm" onClick={handleOpenCreateModal} className="text-xs font-bold bg-[#E8450F] text-white h-9">
                        + Schedule First Service
                      </Button>
                    ) : undefined
                  }
                  filterElement={
                    <div className="flex items-center gap-3">
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="h-9 text-xs w-[140px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Statuses</SelectItem>
                          <SelectItem value="In_Progress">In Progress</SelectItem>
                          <SelectItem value="Scheduled">Scheduled</SelectItem>
                          <SelectItem value="Completed">Completed</SelectItem>
                          <SelectItem value="Cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="h-9 text-xs w-[160px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                          <SelectValue placeholder="Maintenance Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          <SelectItem value="Routine">Routine Service</SelectItem>
                          <SelectItem value="Repair">Repair</SelectItem>
                          <SelectItem value="Inspection">Inspection</SelectItem>
                          <SelectItem value="Renewal">Renewal / Istimara</SelectItem>
                          <SelectItem value="Emergency">Emergency</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  }
                  pageSize={pageSize}
                  onPageSizeChange={setPageSize}
                  currentPage={page}
                  totalPages={maintenanceRes?.meta?.total_pages || 1}
                  totalRecords={maintenanceRes?.meta?.total || records.length}
                  onPageChange={setPage}
                  onRowClick={(row) => navigate(`/maintenance/${row.id}`)}
                />
              </div>
            ) : (
              /* Grid View */
              <div className="flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs overflow-hidden">
                <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {records.map((r) => (
                  <Card key={r.id} className="border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-4 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="font-mono text-[10px] font-extrabold text-slate-400">{r.ref_id || '—'}</div>
                        <div className="font-extrabold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <Truck className="w-4 h-4 text-indigo-500" />
                          {r.vehicle?.plate_number || 'TRK-UNKNOWN'}
                        </div>
                      </div>
                      {getStatusBadge(r.status)}
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                      <div>{getTypeBadge(r.maintenance_type)}</div>
                      <div className="font-mono font-extrabold text-rose-600 dark:text-rose-400">
                        SAR {(r.cost || 0).toLocaleString()}
                      </div>
                    </div>

                    <div className="text-xs space-y-1 text-slate-600 dark:text-slate-300">
                      <p><strong>Workshop:</strong> {r.workshop_name}</p>
                      <p><strong>Start:</strong> {r.start_date ? new Date(r.start_date).toLocaleDateString() : 'N/A'}</p>
                      <p><strong>End:</strong> {r.end_date ? new Date(r.end_date).toLocaleDateString() : '—'}</p>
                      <p className="line-clamp-2"><strong>Work Done:</strong> {r.work_done || r.remarks || 'N/A'}</p>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                      <Button size="sm" variant="outline" onClick={() => handleOpenEditModal(r)} className="h-7 text-xs">
                        Edit
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setRecordToDelete(r)} className="h-7 text-xs text-rose-600">
                        Delete
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

      </div>

      {/* ── 5. Create / Edit Maintenance Modal ─────────────────────────── */}
      <ScheduleMaintenanceModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        editingRecord={editingRecord}
        onSuccess={() => refetch()}
      />

      {/* ── 6. Delete Confirmation Modal ───────────────────────────────── */}
      <Dialog open={!!recordToDelete} onOpenChange={(open) => !open && setRecordToDelete(null)}>
        <DialogContent className="max-w-md rounded-2xl p-0 overflow-hidden border-slate-200 dark:border-slate-800">
          <DialogHeader className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-rose-50/50 dark:bg-rose-950/20">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <DialogTitle className="text-base font-extrabold">Delete Maintenance Record</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500 mt-1">
              Are you sure you want to delete this maintenance record for vehicle <strong className="text-slate-900 dark:text-slate-100">{recordToDelete?.vehicle?.plate_number}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setRecordToDelete(null)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={deleteMutation.isPending}
              onClick={() => recordToDelete && deleteMutation.mutate(recordToDelete.id)}
              className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold px-4"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Confirm Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

    </DashboardLayout>
  );
}
