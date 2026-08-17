import { useState } from 'react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Download, UploadCloud,
  Edit2,
  Trash2,
  Search,
  AlertTriangle,
  User,
  Users,
  CheckCircle2,
  RotateCw,
  List,
  LayoutGrid,
  ShieldAlert,
  Phone,
  ChevronDown,
  Filter,
  Layers,
  CheckCircle,
  XCircle,
  X,
  Send,
  Calendar as CalendarIcon,
  Truck,
  MoreHorizontal,
} from 'lucide-react';
import { DriverBadge, CheckBadge, RouteLine, TruckMotion, RiskAlert } from '@/components/ui/kpi-icons';
import KpiCard from '@/components/ui/KpiCard';
import KpiModal from '@/components/ui/KpiModal';
import { DriverRosterKpi } from '@/components/ui/CustomKpiWidgets';

import { downloadCSV, exportExcelTable } from '@/utils/exportUtils';
import { DRIVER_COLUMNS } from '@/utils/importUtils';
import ExcelImportDialog from '@/components/fleet/ExcelImportDialog';
import { notificationService } from '@/services/notificationService';
import { driverService, Driver, DriverStatus } from '@/services/driverService';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { cn } from '@/lib/utils';

import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

import { getUpcomingScheduledDates } from '@/utils/scheduleUtils';

export default function DriverListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedStatus, setSelectedStatus] = useState<DriverStatus | 'All'>('All');
  const [licenseFilter, setLicenseFilter] = useState<'All' | 'Valid' | 'Expired'>('All');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  
  // WhatsApp share dialog state
  const [whatsappDriver, setWhatsappDriver] = useState<Driver | null>(null);
  const [whatsappMessageText, setWhatsappMessageText] = useState('');
  const [whatsappCustomPhone, setWhatsappCustomPhone] = useState('');
  const [showMotModal, setShowMotModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
    isDestructive?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Origin-aware KPI modal state
  const [originRect, setOriginRect] = useState<DOMRect | null>(null);
  const [activeKpiModal, setActiveKpiModal] = useState<'total' | 'available' | 'onTrip' | 'expired' | null>(null);

  const openKpiModal = (e: React.MouseEvent<HTMLDivElement>, modalType: 'total' | 'available' | 'onTrip' | 'expired') => {
    setOriginRect(e.currentTarget.getBoundingClientRect());
    setActiveKpiModal(modalType);
  };

  const debouncedSearch = useDebouncedValue(search, 300);

  // Fetch drivers using React Query
  const { data: driversRes, isLoading, isError, error } = useQuery({
    queryKey: ['drivers', selectedStatus, debouncedSearch, currentPage, pageSize],
    queryFn: () => driverService.getAll({
      status: selectedStatus === 'All' ? undefined : selectedStatus,
      search: debouncedSearch || undefined,
      page: currentPage,
      per_page: pageSize,
    }),
  });

  // Fetch overall driver summary for KPI cards (100% independent of status/search page filters)
  const { data: kpiDriversRes } = useQuery({
    queryKey: ['drivers', 'kpi-summary'],
    queryFn: () => driverService.getAll({ per_page: 1000 }),
  });

  const drivers = driversRes?.data || [];
  const totalPages = driversRes?.meta?.total_pages || 1;

  // Filter local data based on License filter
  const filteredDrivers = drivers.filter(d => {
    if (licenseFilter === 'Expired' && new Date(d.license_expiry) >= new Date()) return false;
    if (licenseFilter === 'Valid' && new Date(d.license_expiry) < new Date()) return false;
    return true;
  });

  // Calculate driver counts and dynamic progress segments from real backend data (sourced from overall fleet data)
  const kpiDrivers = kpiDriversRes?.data || [];
  const totalCount = kpiDriversRes?.meta?.total || (kpiDrivers.length > 0 ? kpiDrivers.length : (driversRes?.meta?.total || drivers.length));

  const sourceForKpis = kpiDrivers.length > 0 ? kpiDrivers : drivers;

  const availableCount = sourceForKpis.filter(d => d.status === 'Available').length;
  const onTripCount = sourceForKpis.filter(d => d.status === 'OnTrip').length;

  const expiredLicenseCount = sourceForKpis.filter(d => new Date(d.license_expiry) < new Date()).length;
  const clearDriversCount = sourceForKpis.filter(d => new Date(d.license_expiry) >= new Date()).length;

  const totalDriversCount = totalCount || 1;
  const expiredSegPct = Math.round((expiredLicenseCount / totalDriversCount) * 100);
  const clearSegPct = Math.max(0, 100 - expiredSegPct);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['drivers'] });
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const openWhatsappShare = (driver: Driver) => {
    setWhatsappDriver(driver);
    const text = `🚚 *MERCON LOGISTICS - Driver Profile*\n` +
                 `• *Name:* ${driver.first_name} ${driver.last_name}\n` +
                 `• *Status:* ${driver.status}\n` +
                 `• *Phone:* ${driver.phone_primary || 'N/A'}\n` +
                 `• *License No:* ${driver.license_number || 'N/A'}\n` +
                 `• *Profile:* ${window.location.origin}/drivers/${driver.id}`;
    setWhatsappMessageText(text);
    setWhatsappCustomPhone(driver.phone_primary || '');
  };

  const handleWhatsappSend = () => {
    const cleanPhone = whatsappCustomPhone.trim().replace(/\+/g, '').replace(/\D/g, '');
    const baseUrl = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}`
      : `https://api.whatsapp.com/send`;
    const shareUrl = `${baseUrl}?text=${encodeURIComponent(whatsappMessageText)}`;
    window.open(shareUrl, '_blank');
    setWhatsappDriver(null);
  };

  const handleExportExcel = async (rowsToExport: Driver[]) => {
    const headers = [
      'Driver ID',
      'Driver Name',
      'Primary Phone',
      'Duty Status',
      'License Number',
      'License Expiry',
      'AI Safety Risk Score',
      'Assigned Vehicle'
    ];

    const dataRows = rowsToExport.map(row => {
      const activeTrip = row.trips?.[0];
      const assignedVehicle = row.assignedVehicle?.plate_number || activeTrip?.vehicle?.plate_number || 'None';
      
      return [
        row.ref_id || `DRV-${row.id.slice(0, 5).toUpperCase()}`,
        `${row.first_name} ${row.last_name}`,
        row.phone_primary || 'N/A',
        row.status,
        row.license_number,
        new Date(row.license_expiry).toLocaleDateString('en-GB'),
        row.ai_risk_score,
        assignedVehicle
      ];
    });

    await exportExcelTable('MERCON Driver Roster', headers, dataRows, `drivers_roster_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const columns = [
    {
      header: 'Driver ID',
      accessor: (row: Driver) => (
        <div className="flex flex-col">
          <span className="font-mono text-xs font-bold text-brand">
            {row.ref_id || `DRV-${row.id.slice(0, 5).toUpperCase()}`}
          </span>
          <span className="text-[10px] text-slate-400 font-medium">
            Reg: {new Date(row.createdAt).toLocaleDateString()}
          </span>
        </div>
      ),
    },
    {
      header: 'Driver Name & Phone',
      accessor: (row: Driver) => {
        const initials = `${row.first_name?.[0] || ''}${row.last_name?.[0] || ''}`.toUpperCase() || 'DR';
        return (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600 shrink-0">
              {initials}
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-slate-900 text-xs hover:text-brand transition-colors cursor-pointer" onClick={() => navigate(`/drivers/${row.id}`)}>
                {row.first_name} {row.last_name}
              </span>
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                {row.phone_primary}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Assigned Vehicle',
      accessor: (row: Driver) => {
        const activeTrip = row.trips?.[0];
        const vehicle = row.assignedVehicle || activeTrip?.vehicle;

        if (!vehicle) {
          return (
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium italic">
              Unassigned
            </span>
          );
        }

        return (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 shrink-0">
              <Truck size={14} />
            </div>
            <div className="flex flex-col">
              <span 
                className="font-bold text-xs text-slate-800 dark:text-slate-200 hover:text-brand transition-colors cursor-pointer"
                onClick={() => navigate(`/vehicles/${vehicle.id}`)}
              >
                {vehicle.plate_number}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {vehicle.ref_id || vehicle.asset_type || 'Vehicle'}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      header: 'License Details',
      accessor: (row: Driver) => {
        const isExpired = new Date(row.license_expiry) < new Date();
        return (
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-xs font-semibold text-slate-700">
              {row.license_number || 'N/A'}
            </span>
            <div className="flex items-center gap-1">
              {isExpired ? (
                <Badge variant="outline" className="bg-rose-50 text-rose-600 border-rose-200 text-[10px] font-bold py-0 px-1.5 gap-1">
                  <AlertTriangle className="w-2.5 h-2.5 text-rose-500" />
                  Expired ({new Date(row.license_expiry).toLocaleDateString()})
                </Badge>
              ) : (
                <span className="text-[10px] text-slate-500">
                  Exp: {new Date(row.license_expiry).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      header: 'Duty Status',
      accessor: (row: Driver) => <StatusBadge status={row.status} />,
    },
    {
      header: 'Scheduled Days',
      accessor: (row: Driver) => {
        const scheduledDates = getUpcomingScheduledDates(row.trips);
        if (scheduledDates.length === 0) {
          return <span className="text-xs text-slate-400 font-medium italic">None</span>;
        }
        return (
          <div className="flex items-center gap-1 flex-wrap max-w-[200px]">
            {scheduledDates.slice(0, 3).map((item, idx) => (
              <Badge
                key={idx}
                variant="outline"
                className="bg-indigo-50/80 text-indigo-700 border-indigo-200/80 text-[10px] font-semibold py-0.5 px-1.5 gap-1 shrink-0"
                title={`Trip ${item.tripRef || ''}`}
              >
                <CalendarIcon className="w-2.5 h-2.5 text-indigo-500" />
                {item.formattedDate}
              </Badge>
            ))}
            {scheduledDates.length > 3 && (
              <Badge variant="outline" className="bg-slate-100 text-slate-600 text-[10px] font-medium py-0.5 px-1">
                +{scheduledDates.length - 3}
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      header: 'Actions',
      headerClassName: 'text-right',
      accessor: (row: Driver) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => openWhatsappShare(row)}
            title="Share to WhatsApp"
            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.793 1.451 5.48.002 9.938-4.453 9.942-9.94.002-2.659-1.031-5.158-2.908-7.037C16.597 1.749 14.103.719 11.45.719 5.968.719 1.513 5.174 1.509 10.662c-.001 1.761.472 3.479 1.371 5.011L1.872 21.05l5.52-1.446c1.502.82 3.18 1.25 4.887 1.25h.008z" />
            </svg>
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 transition-colors focus:outline-none cursor-pointer"
                title="Driver Actions"
                aria-label="Driver Actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 p-1.5 shadow-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl">
              <DropdownMenuItem
                onClick={() => navigate(`/drivers/${row.id}/edit`)}
                className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md"
              >
                <Edit2 className="mr-2 h-3.5 w-3.5 text-amber-600" />
                Edit Driver Profile
              </DropdownMenuItem>

              <DropdownMenuSeparator className="my-1 border-slate-100 dark:border-slate-800" />

              <DropdownMenuItem
                onClick={async () => {
                  const driverName = `${row.first_name} ${row.last_name}`;
                  let message = `Are you sure you want to delete driver ${driverName}?`;
                  try {
                    const usage = await driverService.getUsage(row.id);
                    const parts: string[] = [];
                    if (usage.totalTrips > 0) parts.push(`${usage.totalTrips} trip${usage.totalTrips === 1 ? '' : 's'}${usage.activeTrips > 0 ? ` (${usage.activeTrips} active)` : ''}`);
                    if (usage.expenses > 0) parts.push(`${usage.expenses} expense${usage.expenses === 1 ? '' : 's'}`);
                    message = parts.length > 0
                      ? `${driverName} has ${parts.join(' and ')} linked to them. Deleting archives the record — history will keep showing them, marked as Deleted.`
                      : `${driverName} has no linked trips or records. This will archive the record.`;
                  } catch {
                    // Usage lookup failed — fall back to the generic prompt below rather than blocking the delete flow.
                  }
                  setConfirmModal({
                    isOpen: true,
                    title: 'Delete Driver Record',
                    message,
                    isDestructive: true,
                    onConfirm: async () => {
                      try {
                        await driverService.bulkDelete([row.id]);
                        toast.success(`Driver ${driverName} deleted successfully`);
                        queryClient.invalidateQueries({ queryKey: ['drivers'] });
                      } catch (err: any) {
                        toast.error(err?.response?.data?.error?.message || 'Failed to delete driver');
                      }
                    }
                  });
                }}
                className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Delete Driver
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  const bulkActions = [
    {
      label: 'Edit Selected Driver',
      icon: <Edit2 size={13} />,
      variant: 'primary' as const,
      onClick: (selectedRows: Driver[]) => {
        if (selectedRows.length > 0) {
          navigate(`/drivers/${selectedRows[0].id}/edit`);
        }
      }
    },
    {
      label: 'Mark Available',
      icon: <CheckCircle size={13} />,
      variant: 'success' as const,
      onClick: (selectedRows: Driver[]) => {
        setConfirmModal({
          isOpen: true,
          title: 'Mark Drivers as Available',
          message: `Are you sure you want to mark ${selectedRows.length} drivers as Available?`,
          isDestructive: false,
          onConfirm: async () => {
            try {
              await driverService.bulkUpdateStatus(selectedRows.map(r => r.id), 'Available');
              queryClient.invalidateQueries({ queryKey: ['drivers'] });
            } catch (e) { toast.error('Failed to update status'); }
          }
        });
      }
    },
    {
      label: 'Mark Off-Duty',
      icon: <XCircle size={13} />,
      variant: 'warning' as const,
      onClick: (selectedRows: Driver[]) => {
        setConfirmModal({
          isOpen: true,
          title: 'Mark Drivers as Off-Duty',
          message: `Are you sure you want to mark ${selectedRows.length} drivers as Off Duty?`,
          isDestructive: false,
          onConfirm: async () => {
            try {
              await driverService.bulkUpdateStatus(selectedRows.map(r => r.id), 'OffDuty');
              queryClient.invalidateQueries({ queryKey: ['drivers'] });
            } catch (e) { toast.error('Failed to update status'); }
          }
        });
      }
    },
    {
      label: 'Log Communication',
      icon: <Send size={13} />,
      variant: 'info' as const,
      onClick: async (selectedRows: Driver[]) => {
        const msg = prompt('Enter message content to log for selected drivers (NOTE: SMS dispatch pending real provider integration):');
        if (!msg) return;
        try {
          await notificationService.sendBulkCommunication({
            entity_type: 'Driver',
            ids: selectedRows.map(r => r.id),
            method: 'sms',
            subject: 'Dashboard Operational Notification',
            message: msg
          });
          toast.success('Messages logged successfully.');
        } catch (e) { toast.error('Failed to log messages'); }
      }
    },
    {
      label: 'Export Excel',
      icon: <Download size={13} />,
      variant: 'success' as const,
      onClick: (selectedRows: Driver[]) => {
        handleExportExcel(selectedRows);
      }
    },
    {
      label: 'Delete Selected',
      icon: <Trash2 size={13} />,
      variant: 'danger' as const,
      onClick: (selectedRows: Driver[]) => {
        setConfirmModal({
          isOpen: true,
          title: 'Delete Selected Drivers',
          message: `Delete ${selectedRows.length} driver records? Any with an active trip will be skipped — the rest will be archived, and history will keep showing them marked as Deleted.`,
          isDestructive: true,
          onConfirm: async () => {
            try {
              const res = await driverService.bulkDelete(selectedRows.map(r => r.id));
              toast.success(res?.message || 'Drivers deleted');
              queryClient.invalidateQueries({ queryKey: ['drivers'] });
            } catch (e: any) { toast.error(e?.response?.data?.error?.message || 'Failed to delete drivers'); }
          }
        });
      }
    }
  ];

  return (
    <DashboardLayout 
      active="Drivers" 
      title="Drivers" 
    >
      <div className="px-4 sm:px-6 pb-6 w-full flex flex-col animate-fade-in gap-5">
        
        {/* Page Content Header Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 shrink-0 pb-1">
          <div className="flex items-center gap-3">
            <User className="w-6 h-6 text-orange-500 dark:text-orange-400 shrink-0" />

            <div className="flex flex-col">
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                  Drivers
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
              onClick={() => handleExportExcel(filteredDrivers)}
            >
              <Download className="h-3.5 w-3.5 text-slate-600" />
              Export Excel
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-xs font-semibold border-slate-200 bg-white hover:bg-slate-50 shadow-2xs"
              onClick={() => setIsImportOpen(true)}
            >
              <UploadCloud className="h-3.5 w-3.5 text-emerald-600" />
              Import Excel
            </Button>

            <Button
              size="sm"
              className="h-9 gap-1.5 text-xs font-bold bg-brand hover:bg-brand-hover text-white shadow-xs rounded-md px-4"
              onClick={() => navigate('/drivers/new')}
            >
              <Plus className="h-4 w-4" />
              Add Driver
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
          <KpiCard
            title="TOTAL REGISTERED DRIVERS"
            value={
              <span>
                {totalCount}
                <span className="text-[16px] font-semibold ml-1.5 opacity-85">Drivers</span>
              </span>
            }
            variant="slate"
            description="Total driver profiles"
            icon={DriverBadge}
            semiCircleGauge={{
              segments: [
                { label: "Available", count: availableCount, color: "#16A34A" },
                { label: "On Trip", count: onTripCount, color: "#2563EB" },
              ]
            }}
            onClick={() => {
              setSelectedStatus('All');
              setCurrentPage(1);
            }}
          />

          <KpiCard
            title="AVAILABLE NOW"
            value={
              <span>
                {availableCount}
                <span className="text-[16px] font-semibold ml-1.5 opacity-85">Ready</span>
              </span>
            }
            variant="emerald"
            trend="up"
            trendValue="Available"
            description="Available for dispatch"
            icon={CheckBadge}
            completionGauge={{
              percentage: Math.round((availableCount / (totalCount || 1)) * 100) || 75,
              label: `${Math.round((availableCount / (totalCount || 1)) * 100)}% Available`,
              subtext: `${availableCount} Ready • ${onTripCount} Dispatched`
            }}
            isActive={selectedStatus === 'Available'}
            onClick={() => {
              setSelectedStatus(selectedStatus === 'Available' ? 'All' : 'Available');
              setCurrentPage(1);
            }}
          />

          <KpiCard
            title="ACTIVE ON ROAD"
            value={
              <span>
                {onTripCount}
                <span className="text-[16px] font-semibold ml-1.5 opacity-85">Dispatched</span>
              </span>
            }
            variant="blue"
            trend="neutral"
            trendValue="Dispatched"
            description="Active en-route drivers"
            icon={TruckMotion}
            chartData={[4, 6, 8, 7, 10, 9, onTripCount || 12]}
            isActive={selectedStatus === 'OnTrip'}
            onClick={() => {
              setSelectedStatus(selectedStatus === 'OnTrip' ? 'All' : 'OnTrip');
              setCurrentPage(1);
            }}
          />

          <KpiCard
            title="EXPIRED LICENSES"
            value={
              <span>
                {expiredLicenseCount}
                <span className="text-[16px] font-semibold ml-1.5 opacity-85">Permits</span>
              </span>
            }
            variant="amber"
            trend={expiredLicenseCount > 0 ? "down" : "neutral"}
            trendValue={expiredLicenseCount > 0 ? "Renewal Required" : "All Valid"}
            description="Permits requiring renewal"
            icon={RiskAlert}
            progressSegments={[
              { label: `Expired (${expiredLicenseCount})`, value: Math.max(expiredLicenseCount > 0 ? 10 : 0, expiredSegPct), color: 'bg-amber-500' },
              { label: `Valid (${clearDriversCount})`, value: Math.max(10, clearSegPct), color: 'bg-emerald-500' },
            ]}
            isActive={activeKpiModal === 'expired'}
            onClick={(e) => {
              openKpiModal(e, 'expired');
            }}
          />
        </div>

        {/* Dynamic Table or Grid Render */}
        {viewMode === 'list' ? (
          <div className="w-full flex flex-col">
            <DataTable
              title={
                <span className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-500" />
                  <span>Driver Roster Ledger</span>
                </span>
              }
              data={filteredDrivers}
              columns={columns}
              sortAccessor={(row: Driver) => row.createdAt}
              enableSelection={true}
              compact={true}
              isLoading={isLoading}
              isError={isError}
              errorMessage={(error as Error)?.message || 'Failed to load drivers.'}
              searchPlaceholder="Search driver ID, name, phone..."
              searchValue={search}
              onSearchChange={(val) => { setSearch(val); setCurrentPage(1); }}
              filterElement={
                <div className="flex items-center gap-3">
                  <Select
                    value={selectedStatus}
                    onValueChange={(val) => {
                      if (val) {
                        setSelectedStatus(val as DriverStatus | 'All');
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
                          Filter Duty Status
                        </SelectLabel>
                        <SelectItem value="All" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                          <span className="flex items-center gap-2 font-medium text-slate-700">
                            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                            All Statuses
                          </span>
                        </SelectItem>
                      </SelectGroup>
                      <SelectSeparator className="my-1 border-slate-100" />
                      <SelectGroup>
                        <SelectItem value="Available" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                          <span className="flex items-center gap-2 font-medium text-emerald-700">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            Available
                          </span>
                        </SelectItem>
                        <SelectItem value="OnTrip" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                          <span className="flex items-center gap-2 font-medium text-blue-700">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            On Trip
                          </span>
                        </SelectItem>
                        <SelectItem value="OffDuty" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                          <span className="flex items-center gap-2 font-medium text-slate-700">
                            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                            Off Duty
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
                    value={licenseFilter}
                    onValueChange={(val) => { if (val) setLicenseFilter(val as any); }}
                  >
                    <SelectTrigger className="h-9 px-3 w-40 shrink-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                        <SelectValue placeholder="License Expiry" />
                      </div>
                    </SelectTrigger>
                    <SelectContent align="start" className="w-48 p-1.5 shadow-lg border border-slate-200 bg-white rounded-xl">
                      <SelectGroup>
                        <SelectLabel className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-2 py-1">
                          License Status
                        </SelectLabel>
                        <SelectItem value="All" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">All Licenses</SelectItem>
                        <SelectItem value="Valid" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">Valid Licenses</SelectItem>
                        <SelectItem value="Expired" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md text-rose-600">Expired Licenses</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              }
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
              onRowClick={(row) => navigate(`/drivers/${row.id}`)}
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
                  <X size={28} />
                </div>
                <p className="text-sm font-bold text-slate-900">Data Unavailable</p>
                <p className="text-xs text-slate-500 mt-1">{(error as Error)?.message || 'Failed to load drivers.'}</p>
              </div>
            ) : filteredDrivers.length === 0 ? (
              <div className="col-span-full py-16 flex flex-col items-center justify-center">
                <p className="text-sm font-bold text-slate-900">No Records Found</p>
                <p className="text-xs text-slate-500 mt-1">There are no drivers matching your current filters.</p>
              </div>
            ) : filteredDrivers.map(d => {
              const initials = `${d.first_name?.[0] || ''}${d.last_name?.[0] || ''}`.toUpperCase() || 'DR';
              const isExpired = new Date(d.license_expiry) < new Date();
              return (
                <div 
                  key={d.id} 
                  className="bg-white dark:bg-slate-900 rounded-xl border border-black/[0.08] dark:border-slate-800 p-4 shadow-2xs flex flex-col justify-between gap-3 hover:border-brand/40 hover:-translate-y-0.5 hover:shadow-xs transition-all duration-150 ease-in-out cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
                  tabIndex={0}
                  role="button"
                  aria-label={`Driver: ${d.first_name} ${d.last_name}, status: ${d.status}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/drivers/${d.id}`);
                    }
                  }}
                  onClick={() => navigate(`/drivers/${d.id}`)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-center text-sm font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                        {initials}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-950 dark:text-slate-50 text-sm">
                          {d.first_name} {d.last_name}
                        </span>
                        <span className="font-mono text-[11px] text-brand font-bold">
                          {d.ref_id || `DRV-${d.id.slice(0, 5).toUpperCase()}`}
                        </span>
                      </div>
                    </div>
                    <StatusBadge status={d.status} />
                  </div>

                  <div className="space-y-1.5 py-2 border-y border-slate-100 dark:border-slate-800 text-xs">
                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                      <span className="font-medium text-slate-400 dark:text-slate-500">Phone:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{d.phone_primary}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                      <span className="font-medium text-slate-400 dark:text-slate-500">Vehicle:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {d.assignedVehicle?.plate_number || d.trips?.[0]?.vehicle?.plate_number || 'Unassigned'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                      <span className="font-medium text-slate-400 dark:text-slate-500">License:</span>
                      <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{d.license_number || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                      <span className="font-medium text-slate-400 dark:text-slate-500">Expiry:</span>
                      <span className={`font-medium ${isExpired ? 'text-rose-600 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>
                        {new Date(d.license_expiry).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end pt-1">
                    <Button variant="outline" size="sm" className="h-7 text-xs font-semibold">
                      View Profile
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* WhatsApp Share Dialog */}
        <Dialog open={!!whatsappDriver} onOpenChange={(open) => !open && setWhatsappDriver(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold flex items-center gap-2">
                <svg className="h-4 w-4 text-emerald-600 fill-current" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.793 1.451 5.48.002 9.938-4.453 9.942-9.94.002-2.659-1.031-5.158-2.908-7.037C16.597 1.749 14.103.719 11.45.719 5.968.719 1.513 5.174 1.509 10.662c-.001 1.761.472 3.479 1.371 5.011L1.872 21.05l5.52-1.446c1.502.82 3.18 1.25 4.887 1.25h.008z" />
                </svg>
                Share to WhatsApp
              </DialogTitle>
              <DialogDescription className="text-xs">
                Send <span className="font-bold text-brand">{whatsappDriver?.first_name} {whatsappDriver?.last_name}</span>'s profile directly via WhatsApp web or mobile app.
              </DialogDescription>
            </DialogHeader>

            <div className="py-2 space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Recipient Phone Number (Optional)
                </label>
                <Input
                  placeholder="e.g. 966512345678 (Leave blank to select chat inside WhatsApp)"
                  value={whatsappCustomPhone}
                  onChange={(e) => setWhatsappCustomPhone(e.target.value)}
                  className="h-9 text-xs border-slate-200 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Message Preview:
                </label>
                <textarea
                  value={whatsappMessageText}
                  onChange={(e) => setWhatsappMessageText(e.target.value)}
                  className="w-full h-36 p-3 rounded-xl border border-slate-200 text-xs font-medium font-sans leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-slate-50/50 resize-none"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setWhatsappDriver(null)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
                onClick={handleWhatsappSend}
              >
                <svg className="w-3.5 h-3.5 text-white fill-current" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.793 1.451 5.48.002 9.938-4.453 9.942-9.94.002-2.659-1.031-5.158-2.908-7.037C16.597 1.749 14.103.719 11.45.719 5.968.719 1.513 5.174 1.509 10.662c-.001 1.761.472 3.479 1.371 5.011L1.872 21.05l5.52-1.446c1.502.82 3.18 1.25 4.887 1.25h.008z" />
                </svg>
                Open WhatsApp
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MOT Compliance Verification Modal */}
        <Dialog open={showMotModal} onOpenChange={setShowMotModal}>
          <DialogContent className="max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
            <DialogHeader>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center mb-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <DialogTitle className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                Saudi MOT & MOMRAH Compliance Status
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Ministry of Transport commercial heavy driver license verification ledger.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 my-4 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60">
                <div>
                  <div className="font-bold text-emerald-900 dark:text-emerald-300">Verified MOT Licenses</div>
                  <div className="text-[10px] text-emerald-700 dark:text-emerald-400">Active commercial heavy transport</div>
                </div>
                <Badge className="bg-emerald-600 text-white font-mono font-bold text-xs">{clearDriversCount}</Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60">
                <div>
                  <div className="font-bold text-amber-900 dark:text-amber-300">Pending Renewal / Expired</div>
                  <div className="text-[10px] text-amber-700 dark:text-amber-400">Action required with Ministry portal</div>
                </div>
                <Badge className="bg-amber-600 text-white font-mono font-bold text-xs">{expiredLicenseCount}</Badge>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs font-bold border-slate-200"
                onClick={() => setShowMotModal(false)}
              >
                Close Verification Summary
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>



        {/* Origin-Animated KPI Modal 4: Saudi MOT & MOMRAH Compliance Status */}
        <KpiModal
          isOpen={activeKpiModal === 'expired'}
          onClose={() => setActiveKpiModal(null)}
          originRect={originRect}
          title="Saudi MOT & MOMRAH Compliance Status"
          subtitle="Ministry of Transport commercial heavy driver license verification ledger."
          badge={
            <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold">
              {expiredLicenseCount} Requiring Action
            </Badge>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60">
                <div>
                  <div className="font-bold text-emerald-900 dark:text-emerald-300">Verified MOT Licenses</div>
                  <div className="text-[10px] text-emerald-700 dark:text-emerald-400">Active commercial heavy transport</div>
                </div>
                <Badge className="bg-emerald-600 text-white font-mono font-bold text-xs">{clearDriversCount}</Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60">
                <div>
                  <div className="font-bold text-amber-900 dark:text-amber-300">Pending Renewal / Expired</div>
                  <div className="text-[10px] text-amber-700 dark:text-amber-400">Action required with Ministry portal</div>
                </div>
                <Badge className="bg-amber-600 text-white font-mono font-bold text-xs">{expiredLicenseCount}</Badge>
              </div>
            </div>

            {expiredLicenseCount > 0 && (
              <div className="space-y-2">
                <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">Expired License Drivers</div>
                <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                  {drivers.filter(d => new Date(d.license_expiry) < new Date()).map(d => (
                    <div key={d.id} className="flex items-center justify-between p-2 bg-rose-50/50 dark:bg-rose-950/20 rounded-lg border border-rose-200/60 text-xs">
                      <div>
                        <span className="font-bold text-rose-900 dark:text-rose-300">{d.first_name} {d.last_name}</span>
                        <span className="text-[10px] text-rose-700 dark:text-rose-400 font-mono block">Lic: {d.license_number || 'KSA-DL'} • Expired: {new Date(d.license_expiry).toLocaleDateString()}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-[10px] font-bold text-rose-700 border-rose-300 bg-white"
                        onClick={() => {
                          setActiveKpiModal(null);
                          navigate(`/drivers/${d.id}/documents`);
                        }}
                      >
                        Renew Docs
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                className="text-xs font-semibold text-amber-800 border-amber-200 bg-amber-50"
                onClick={() => {
                  setLicenseFilter('Expired');
                  setActiveKpiModal(null);
                }}
              >
                Filter Expired in Table
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-xs font-semibold text-slate-500"
                onClick={() => setActiveKpiModal(null)}
              >
                Close Summary
              </Button>
            </div>
          </div>
        </KpiModal>

        <ConfirmModal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
          onConfirm={async () => {
            await confirmModal.onConfirm();
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
          }}
          title={confirmModal.title}
          message={confirmModal.message}
          isDestructive={confirmModal.isDestructive}
        />

        <ExcelImportDialog
          isOpen={isImportOpen}
          onClose={() => setIsImportOpen(false)}
          entityLabel="Drivers"
          columns={DRIVER_COLUMNS}
          requiredFields={['first_name', 'last_name', 'phone_primary', 'license_number', 'license_expiry']}
          preferSheet="driver"
          templateUrl="/templates/MERCON_Drivers_Import_Template.xlsx"
          onImport={(rows: any[]) => driverService.importRows(rows)}
          invalidateKeys={[['drivers'], ['drivers-select']]}
        />

      </div>
    </DashboardLayout>
  );
}
