import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
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
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileSpreadsheet,
  FileText,
  ArrowDown,
  ArrowUp,
} from 'lucide-react';
import { DriverBadge, CheckBadge, RouteLine, TruckMotion, RiskAlert } from '@/components/ui/kpi-icons';
import KpiCard from '@/components/ui/KpiCard';
import KpiModal from '@/components/ui/KpiModal';
import { DriverRosterKpi } from '@/components/ui/CustomKpiWidgets';

import { downloadCSV, exportExcelTable, exportPDFTable, downloadCSVTable } from '@/utils/exportUtils';
import ExportModal, { ExportColumn, ExportFilter } from '@/components/ui/ExportModal';
import { SortDropdown, SortOption } from '@/components/ui/SortDropdown';
import { DRIVER_COLUMNS } from '@/utils/importUtils';
import ExcelImportDialog from '@/components/fleet/ExcelImportDialog';
import PhoneDisplay from '@/components/ui/PhoneDisplay';
import { notificationService } from '@/services/notificationService';
import { driverService, Driver, DriverStatus } from '@/services/driverService';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { cn } from '@/lib/utils';
import { useDeploymentTimezone, formatInDeploymentTz } from '@/lib/datetime';

import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import ConfirmModal from '@/components/ui/ConfirmModal';
import DriverAvatar from '@/components/ui/DriverAvatar';
import { WhatsAppIcon } from '@/components/ui/whatsapp-icon';
import DriverPreviewModal from '@/components/drivers/DriverPreviewModal';
import CreateDriverModal from '@/components/drivers/CreateDriverModal';
import EditDriverModal from '@/components/drivers/EditDriverModal';
import { useDriverTableColumns } from './hooks/useDriverTableColumns';
import { DriverFilterToolbar, DriverSortOption } from './components/DriverFilterToolbar';
import { DriverGridView } from './components/DriverGridView';
import { DriverWhatsAppModal } from './components/DriverWhatsAppModal';
import { DriverMotComplianceModal } from './components/DriverMotComplianceModal';
import { DriverKpiComplianceModal } from './components/DriverKpiComplianceModal';


import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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

const DRIVER_EXPORT_COLUMNS: ExportColumn<Driver>[] = [
  { id: 'ref_id', label: 'Driver ID', accessor: (d) => d.ref_id || `DRV-${d.id.slice(0, 5).toUpperCase()}` },
  { id: 'name', label: 'Driver Name', accessor: (d) => `${d.first_name} ${d.last_name}` },
  { id: 'phone', label: 'Primary Phone', accessor: (d) => d.phone_primary || 'N/A' },
  { id: 'status', label: 'Duty Status', accessor: (d) => d.status },
  { id: 'license_number', label: 'License Number', accessor: (d) => d.license_number || 'N/A' },
  { id: 'license_expiry', label: 'License Expiry Date', accessor: (d) => d.license_expiry ? formatInDeploymentTz(d.license_expiry, 'Asia/Riyadh', 'dd/MM/yyyy') : 'N/A' },
  { id: 'assigned_vehicle', label: 'Assigned Vehicle', accessor: (d) => d.assignedVehicle?.plate_number || d.trips?.[0]?.vehicle?.plate_number || 'None' },
];

const DRIVER_EXPORT_FILTERS: ExportFilter<Driver>[] = [
  {
    id: 'status',
    label: 'Duty Status',
    options: [
      { label: 'All Statuses', value: 'All' },
      { label: 'Available', value: 'Available' },
      { label: 'On Trip', value: 'OnTrip' },
      { label: 'Off Duty', value: 'OffDuty' },
      { label: 'Suspended', value: 'Suspended' },
    ],
    filterFn: (d, val) => d.status === val,
  },
  {
    id: 'license_status',
    label: 'License Status',
    options: [
      { label: 'All Licenses', value: 'All' },
      { label: 'Valid Only', value: 'Valid' },
      { label: 'Expired Only', value: 'Expired' },
    ],
    filterFn: (d, val) => {
      const isExpired = new Date(d.license_expiry) < new Date();
      return val === 'Expired' ? isExpired : !isExpired;
    },
  },
];

export default function DriverListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const tz = useDeploymentTimezone();

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedStatus, setSelectedStatus] = useState<DriverStatus | 'All'>('All');
  const [licenseFilter, setLicenseFilter] = useState<'All' | 'Valid' | 'Expired'>('All');
  const [sortOrder, setSortOrder] = useState<DriverSortOption>('latest');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  
  // Export configurations dialog state
  const [selectedDriversForExport, setSelectedDriversForExport] = useState<Driver[]>([]);
  const [isExportOpen, setIsExportOpen] = useState(false);

  
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
  const [previewDriver, setPreviewDriver] = useState<Driver | null>(null);
  const [editDriver, setEditDriver] = useState<Driver | null>(null);
  const [isCreateDriverOpen, setIsCreateDriverOpen] = useState(false);

  const openKpiModal = (e: React.MouseEvent<HTMLDivElement>, modalType: 'total' | 'available' | 'onTrip' | 'expired') => {
    setOriginRect(e.currentTarget.getBoundingClientRect());
    setActiveKpiModal(modalType);
  };

  const debouncedSearch = useDebouncedValue(search, 300);

  // Fetch drivers using React Query with server-side filtering and sorting
  const { data: driversRes, isLoading, isError, error } = useQuery({
    queryKey: ['drivers', selectedStatus, debouncedSearch, licenseFilter, sortOrder, currentPage, pageSize],
    queryFn: () => driverService.getAll({
      status: selectedStatus === 'All' ? undefined : selectedStatus,
      search: debouncedSearch || undefined,
      license_status: licenseFilter,
      sort_by: sortOrder,
      page: currentPage,
      per_page: pageSize,
    }),
    // Keep the previous page's rows on screen while a new search/page loads,
    // instead of tearing the table down to a skeleton on every keystroke pause.
    placeholderData: keepPreviousData,
  });

  // KPI cards only ever needed counts, so they ask for counts. This used to
  // fetch 1000 drivers in the full roster shape (each with all their in-progress
  // trips) on every mount, and the first search typed into the bar queued behind
  // that request — which is what made searching feel frozen the first time.
  const { data: driverStats } = useQuery({
    queryKey: ['drivers', 'stats'],
    queryFn: () => driverService.getStats(),
  });

  // The whole roster IS still needed — but only by the export sheet and the
  // expired-licence drill-down, so it is fetched when one of those opens, in
  // the lightweight `lookup` shape rather than the trip-laden one.
  const needsFullRoster = isExportOpen || activeKpiModal !== null;
  const { data: rosterRes } = useQuery({
    queryKey: ['drivers', 'roster-lookup'],
    queryFn: () => driverService.getAll({ per_page: 1000, mode: 'lookup' }),
    enabled: needsFullRoster,
  });

  const drivers: Driver[] = driversRes?.data || [];
  const totalDrivers = driversRes?.meta?.total ?? drivers.length;
  const totalPages = driversRes?.meta?.total_pages || Math.ceil(totalDrivers / pageSize) || 1;

  // Driver dataset comes pre-filtered and pre-sorted from PostgreSQL across the entire fleet
  const filteredDrivers = drivers;

  // Filter the full roster for export purposes to bypass pagination
  // while preserving active search, status, and sort filters
  const customExportFilteredDrivers = useMemo(() => {
    if (!rosterRes?.data) return [];
    
    return rosterRes.data
      .filter(d => {
        if (debouncedSearch) {
          const q = debouncedSearch.toLowerCase();
          const matches = `${d.first_name || ''} ${d.last_name || ''}`.toLowerCase().includes(q) ||
                          d.ref_id?.toLowerCase().includes(q) ||
                          d.phone_primary?.toLowerCase().includes(q) ||
                          d.license_number?.toLowerCase().includes(q);
          if (!matches) return false;
        }
        if (selectedStatus !== 'All' && d.status !== selectedStatus) return false;
        if (licenseFilter === 'Expired' && new Date(d.license_expiry) >= new Date()) return false;
        if (licenseFilter === 'Valid' && new Date(d.license_expiry) < new Date()) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortOrder === 'name_asc') {
          const nameA = `${a.first_name || ''} ${a.last_name || ''}`.trim();
          const nameB = `${b.first_name || ''} ${b.last_name || ''}`.trim();
          return nameA.localeCompare(nameB);
        }
        if (sortOrder === 'name_desc') {
          const nameA = `${a.first_name || ''} ${a.last_name || ''}`.trim();
          const nameB = `${b.first_name || ''} ${b.last_name || ''}`.trim();
          return nameB.localeCompare(nameA);
        }
        if (sortOrder === 'license_asc') {
          const dA = new Date(a.license_expiry || '9999-12-31').getTime();
          const dB = new Date(b.license_expiry || '9999-12-31').getTime();
          return dA - dB;
        }
        if (sortOrder === 'status') {
          return (a.status || '').localeCompare(b.status || '');
        }
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return sortOrder === 'oldest' ? dateA - dateB : dateB - dateA;
      });
  }, [rosterRes?.data, debouncedSearch, selectedStatus, licenseFilter, sortOrder]);

  // Driver counts come from /drivers/stats, which counts across the whole
  // roster in the database — independent of the status/search page filters.
  // The current page is only a fallback for the first paint before stats land.
  const totalCount = driverStats?.total ?? (driversRes?.meta?.total || drivers.length);

  const availableCount = driverStats?.available ?? drivers.filter(d => d.status === 'Available').length;
  const onTripCount = driverStats?.on_trip ?? drivers.filter(d => d.status === 'OnTrip').length;

  const expiredLicenseCount = driverStats?.expired_licenses ?? drivers.filter(d => new Date(d.license_expiry) < new Date()).length;
  const clearDriversCount = Math.max(0, totalCount - expiredLicenseCount);





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
    const text = `*MERCON LOGISTICS - Driver Profile*\n` +
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



  const handleQuickExport = async (format: 'xlsx' | 'pdf' | 'csv') => {
    const toastId = toast.loading('Preparing export...');
    try {
      const res = await driverService.getAll({
        status: selectedStatus === 'All' ? undefined : selectedStatus,
        search: debouncedSearch || undefined,
        per_page: 1000,
        mode: 'lookup'
      });
      let exportData = res.data || [];
      
      exportData = exportData.filter(d => {
        if (licenseFilter === 'Expired' && new Date(d.license_expiry) >= new Date()) return false;
        if (licenseFilter === 'Valid' && new Date(d.license_expiry) < new Date()) return false;
        return true;
      }).sort((a, b) => {
        if (sortOrder === 'name_asc') {
          const nameA = `${a.first_name || ''} ${a.last_name || ''}`.trim();
          const nameB = `${b.first_name || ''} ${b.last_name || ''}`.trim();
          return nameA.localeCompare(nameB);
        }
        if (sortOrder === 'name_desc') {
          const nameA = `${a.first_name || ''} ${a.last_name || ''}`.trim();
          const nameB = `${b.first_name || ''} ${b.last_name || ''}`.trim();
          return nameB.localeCompare(nameA);
        }
        if (sortOrder === 'license_asc') {
          const dA = new Date(a.license_expiry || '9999-12-31').getTime();
          const dB = new Date(b.license_expiry || '9999-12-31').getTime();
          return dA - dB;
        }
        if (sortOrder === 'status') {
          return (a.status || '').localeCompare(b.status || '');
        }
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return sortOrder === 'oldest' ? dateA - dateB : dateB - dateA;
      });
      
      toast.dismiss(toastId);
      if (format === 'xlsx') await handleExportExcel(exportData);
      else if (format === 'pdf') handleExportPDF(exportData);
      else handleExportCSV(exportData);
    } catch (err) {
      toast.dismiss(toastId);
      toast.error('Failed to generate export');
    }
  };

  const handleExportExcel = async (rowsToExport: Driver[]) => {
    const headers = [
      'Driver ID',
      'Driver Name',
      'Primary Phone',
      'Duty Status',
      'License Number',
      'License Expiry Date',
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
        assignedVehicle
      ];
    });

    await exportExcelTable('MERCON Drivers', headers, dataRows, `drivers_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleExportPDF = (rowsToExport: Driver[]) => {
    const headers = [
      'Driver ID',
      'Driver Name',
      'Phone',
      'Status',
      'License No.',
      'License Expiry Date',
      'Vehicle'
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
        assignedVehicle
      ];
    });

    exportPDFTable('MERCON Drivers', headers, dataRows, `drivers_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const handleExportCSV = (rowsToExport: Driver[]) => {
    const data = rowsToExport.map(row => {
      const activeTrip = row.trips?.[0];
      const assignedVehicle = row.assignedVehicle?.plate_number || activeTrip?.vehicle?.plate_number || 'None';
      return {
        driver_id: row.ref_id || `DRV-${row.id.slice(0, 5).toUpperCase()}`,
        name: `${row.first_name} ${row.last_name}`,
        phone: row.phone_primary || '',
        status: row.status,
        license_number: row.license_number,
        license_expiry_date: new Date(row.license_expiry).toLocaleDateString('en-GB'),
        assigned_vehicle: assignedVehicle,
      };
    });
    downloadCSV(data, `drivers_roster_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const columns = useDriverTableColumns({
    tz,
    onPreviewDriver: setPreviewDriver,
    onWhatsappShare: openWhatsappShare,
    setConfirmModal,
  });


  const filterToolbar = (
    <DriverFilterToolbar
      selectedStatus={selectedStatus}
      onStatusChange={(status) => {
        setSelectedStatus(status);
        setCurrentPage(1);
      }}
      licenseFilter={licenseFilter}
      onLicenseFilterChange={(filter) => {
        setLicenseFilter(filter);
        setCurrentPage(1);
      }}
      sortOrder={sortOrder}
      onSortOrderChange={(sort) => {
        setSortOrder(sort);
        setCurrentPage(1);
      }}
    />
  );

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
      label: 'Export Documents',
      icon: <Download size={13} />,
      variant: 'success' as const,
      onClick: (selectedRows: Driver[]) => {
        setSelectedDriversForExport(selectedRows);
        setIsExportOpen(true);
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
            <User className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />

            <div className="flex flex-col">
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                  Drivers
                </h1>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">


            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5 text-xs font-semibold border-slate-200 bg-white hover:bg-slate-50 shadow-2xs dark:bg-slate-900 dark:border-slate-800"
                >
                  <Download className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
                  Export / Import
                  <ChevronDown className="h-3 w-3 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-1.5 shadow-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl">
                <DropdownMenuLabel className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-2 py-1">
                  Export Data
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => handleQuickExport('xlsx')}
                  className="cursor-pointer text-xs font-semibold py-1.5 px-2 rounded-md"
                >
                  <FileSpreadsheet className="mr-2 h-3.5 w-3.5 text-emerald-600" />
                  Export Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleQuickExport('pdf')}
                  className="cursor-pointer text-xs font-semibold py-1.5 px-2 rounded-md"
                >
                  <FileText className="mr-2 h-3.5 w-3.5 text-rose-600" />
                  Export PDF (.pdf)
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => {
                    setSelectedDriversForExport([]);
                    setIsExportOpen(true);
                  }}
                  className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md text-brand hover:bg-orange-50 dark:hover:bg-orange-950/40"
                >
                  <Filter className="mr-2 h-3.5 w-3.5 text-brand" />
                  Custom Export Settings...
                </DropdownMenuItem>

                <DropdownMenuSeparator className="my-1 border-slate-100 dark:border-slate-800" />

                <DropdownMenuLabel className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-2 py-1">
                  Import Data
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => setIsImportOpen(true)}
                  className="cursor-pointer text-xs font-semibold py-1.5 px-2 rounded-md text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                >
                  <UploadCloud className="mr-2 h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  Import from Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              size="sm"
              className="h-9 gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs rounded-md px-4"
              onClick={() => navigate('/drivers/new')}
            >
              <Plus className="h-4 w-4" />
              Add Driver
            </Button>
          </div>
        </div>

        {/* ── 2. Instrument-Panel KPI Cards ───────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 shrink-0">
          {/* Card 1: Total Registered Drivers (Monthly Roster Trend Sparkline) */}
          <KpiCard
            title="TOTAL REGISTERED DRIVERS"
            className="kpi-tint-drivers"
            value={
              <span>
                {totalCount}
                <span className="text-[16px] font-semibold ml-1.5 opacity-85">Drivers</span>
              </span>
            }
            variant="emerald"
            trend="up"
            trendValue={`${Math.round((availableCount / (totalCount || 1)) * 100)}% Standby`}
            icon={DriverBadge}
            isActive={selectedStatus === 'All' && activeKpiModal !== 'expired'}
            onClick={() => {
              setSelectedStatus('All');
              setActiveKpiModal(null);
              setCurrentPage(1);
            }}
            chartData={[20, 22, 24, 25, 27, 28, totalCount || 30]}
          />

          {/* Card 2: Dispatch Ready (Standby Capacity Gauge Progress Meter) */}
          <KpiCard
            title="DISPATCH READY"
            className="kpi-tint-drivers"
            value={
              <span>
                {availableCount}
                <span className="text-[16px] font-semibold ml-1.5 opacity-85">Ready</span>
              </span>
            }
            variant="emerald"
            trend="up"
            trendValue={`${availableCount} Available`}
            icon={CheckBadge}
            isActive={selectedStatus === 'Available'}
            onClick={() => {
              setSelectedStatus(selectedStatus === 'Available' ? 'All' : 'Available');
              setCurrentPage(1);
            }}
            completionGauge={{
              percentage: Math.round((availableCount / (totalCount || 1)) * 100),
              label: 'Standby Capacity Pool',
              subtext: `${availableCount} Available`
            }}
          />

          {/* Card 3: Active On Road (Live GPS Dispatch Pulse Track) */}
          <KpiCard
            title="ACTIVE ON ROAD"
            className="kpi-tint-drivers"
            value={
              <span>
                {onTripCount}
                <span className="text-[16px] font-semibold ml-1.5 opacity-85">En Route</span>
              </span>
            }
            variant="emerald"
            trend={onTripCount > 0 ? 'up' : 'neutral'}
            trendValue={`${onTripCount} Dispatched`}
            icon={TruckMotion}
            isActive={selectedStatus === 'OnTrip'}
            onClick={() => {
              setSelectedStatus(selectedStatus === 'OnTrip' ? 'All' : 'OnTrip');
              setCurrentPage(1);
            }}
            livePulseTrack={{
              statusText: `${onTripCount} Drivers Active On-Route`,
              subText: 'GPS Telemetry'
            }}
          />

          {/* Card 4: Compliance Audit (MOT License Verification Audit Track) */}
          <KpiCard
            title="COMPLIANCE AUDIT"
            className="kpi-tint-drivers"
            value={
              <span>
                {expiredLicenseCount}
                <span className="text-[16px] font-semibold ml-1.5 opacity-85">Expired</span>
              </span>
            }
            variant={expiredLicenseCount > 0 ? 'rose' : 'emerald'}
            trend={expiredLicenseCount > 0 ? 'down' : 'up'}
            trendValue={expiredLicenseCount > 0 ? `${expiredLicenseCount} Need Action` : '100% Valid'}
            icon={RiskAlert}
            isActive={activeKpiModal === 'expired'}
            onClick={(e) => {
              openKpiModal(e, 'expired');
            }}
            livePulseTrack={{
              statusText: expiredLicenseCount > 0 ? `${expiredLicenseCount} MOT Licenses Expired` : '100% MOT Licenses Valid',
              subText: expiredLicenseCount > 0 ? 'Action Required' : 'Verified'
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
                  <span>Driver Ledger</span>
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
              filterElement={filterToolbar}
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
          <DriverGridView
            drivers={filteredDrivers}
            isLoading={isLoading}
            isError={isError}
            errorMessage={(error as Error)?.message}
            totalCount={totalCount}
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            onPageChange={(page) => setCurrentPage(page)}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
            tz={tz}
            onPreviewDriver={setPreviewDriver}
            search={search}
            onSearchChange={(val) => {
              setSearch(val);
              setCurrentPage(1);
            }}
            filterToolbar={filterToolbar}
          />
        )}

        {/* WhatsApp Share Dialog */}
        <DriverWhatsAppModal
          driver={whatsappDriver}
          isOpen={!!whatsappDriver}
          onClose={() => setWhatsappDriver(null)}
          messageText={whatsappMessageText}
          onMessageTextChange={setWhatsappMessageText}
          customPhone={whatsappCustomPhone}
          onCustomPhoneChange={setWhatsappCustomPhone}
          onSend={handleWhatsappSend}
        />

        {/* MOT Compliance Verification Modal */}
        <DriverMotComplianceModal
          isOpen={showMotModal}
          onClose={() => setShowMotModal(false)}
          clearDriversCount={clearDriversCount}
          expiredLicenseCount={expiredLicenseCount}
        />

        {/* Origin-Animated KPI Modal 4: Saudi MOT & MOMRAH Compliance Status */}
        <DriverKpiComplianceModal
          isOpen={activeKpiModal === 'expired'}
          onClose={() => setActiveKpiModal(null)}
          originRect={originRect}
          clearDriversCount={clearDriversCount}
          expiredLicenseCount={expiredLicenseCount}
          expiredDrivers={(rosterRes?.data || drivers).filter(
            (d: Driver) => d.license_expiry && new Date(d.license_expiry) < new Date()
          )}
          tz={tz}
          onFilterExpiredInTable={() => {
            setLicenseFilter('Expired');
            setActiveKpiModal(null);
          }}
          onRenewDocs={(driverId) => {
            setActiveKpiModal(null);
            navigate(`/drivers/${driverId}/documents`);
          }}
        />

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

        {/* ── Export Settings Modal ────────────────────────────────────── */}
        <ExportModal
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
          title="Export Drivers"
          fileNamePrefix="drivers"
          sheetName="Drivers"
          filteredData={customExportFilteredDrivers}
          allData={rosterRes?.data || []}
          selectedData={selectedDriversForExport}
          totalCount={totalCount}
          columns={DRIVER_EXPORT_COLUMNS}
          filters={DRIVER_EXPORT_FILTERS}
          formats={['xlsx', 'csv']}
        />

        {/* ── Driver Preview & Quick-Add Modals ────────────────────────── */}
        <DriverPreviewModal
          driver={previewDriver}
          isOpen={!!previewDriver}
          onClose={() => setPreviewDriver(null)}
          onEdit={(d) => setEditDriver(d)}
        />

        <EditDriverModal
          driver={editDriver}
          isOpen={!!editDriver}
          onClose={() => setEditDriver(null)}
        />

        <CreateDriverModal
          isOpen={isCreateDriverOpen}
          onClose={() => setIsCreateDriverOpen(false)}
        />

      </div>
    </DashboardLayout>
  );
}
