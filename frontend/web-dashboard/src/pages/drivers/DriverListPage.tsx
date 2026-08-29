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

type DriverSortOption = 'latest' | 'oldest' | 'name_asc' | 'name_desc' | 'license_asc' | 'status';

const DRIVER_SORT_OPTIONS: SortOption<DriverSortOption>[] = [
  { value: 'latest', label: 'Newest Added', icon: <ArrowDown className="w-3.5 h-3.5 text-blue-600" /> },
  { value: 'oldest', label: 'Oldest Added', icon: <ArrowUp className="w-3.5 h-3.5 text-amber-600" /> },
  { value: 'name_asc', label: 'Driver Name (A → Z)', icon: <User className="w-3.5 h-3.5 text-purple-600" /> },
  { value: 'name_desc', label: 'Driver Name (Z → A)', icon: <User className="w-3.5 h-3.5 text-purple-600" /> },
  { value: 'license_asc', label: 'License Expiry (Soonest)', icon: <CalendarIcon className="w-3.5 h-3.5 text-rose-500" /> },
  { value: 'status', label: 'Duty Status', icon: <Filter className="w-3.5 h-3.5 text-slate-500" /> },
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

  // Fetch drivers using React Query
  const { data: driversRes, isLoading, isError, error } = useQuery({
    queryKey: ['drivers', selectedStatus, debouncedSearch, currentPage, pageSize],
    queryFn: () => driverService.getAll({
      status: selectedStatus === 'All' ? undefined : selectedStatus,
      search: debouncedSearch || undefined,
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

  // Filter local data based on License filter and Sort
  const filteredDrivers = useMemo(() => {
    return drivers
      .filter(d => {
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
  }, [drivers, licenseFilter, sortOrder]);

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

    await exportExcelTable('MERCON Driver Roster', headers, dataRows, `drivers_roster_${new Date().toISOString().slice(0, 10)}.xlsx`);
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

    exportPDFTable('MERCON Driver Roster', headers, dataRows, `drivers_roster_${new Date().toISOString().slice(0, 10)}.pdf`);
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

  const columns = [
    {
      header: 'Driver ID',
      accessor: (row: Driver) => (
        <div className="flex flex-col">
          <span className="font-mono text-xs font-bold text-brand">
            {row.ref_id || `DRV-${row.id.slice(0, 5).toUpperCase()}`}
          </span>
          <span className="text-[10px] text-slate-400 font-medium">
            Reg: {formatInDeploymentTz(row.createdAt, tz, 'MM/dd/yyyy')}
          </span>
        </div>
      ),
    },
    {
      header: 'Driver Name & Phone',
      accessor: (row: Driver) => {
        return (
          <div className="flex items-center gap-3">
            <DriverAvatar
              src={row.avatar_url}
              firstName={row.first_name}
              lastName={row.last_name}
              size="sm"
              status={row.status}
              showStatusDot
              previewable
              onPreview={() => setPreviewDriver(row)}
            />
            <div className="flex flex-col">
              <span className="font-bold text-slate-900 text-xs hover:text-brand transition-colors cursor-pointer" onClick={() => navigate(`/drivers/${row.id}`)}>
                {row.first_name} {row.last_name}
              </span>
              <PhoneDisplay phone={row.phone_primary} variant="compact" />
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
            <Truck className="w-4 h-4 text-slate-600 shrink-0" />
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
      header: 'Capacity',
      accessor: (row: Driver) => {
        const activeTrip = row.trips?.[0];
        const vehicle = row.assignedVehicle || activeTrip?.vehicle;

        if (!vehicle?.capacity_kg) {
          return <span className="text-xs text-slate-300 dark:text-slate-600">—</span>;
        }

        return (
          <Badge className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-900/50 text-xs font-extrabold font-mono py-1 px-2.5 gap-1">
            <Truck className="w-3 h-3" />
            {(vehicle.capacity_kg / 1000).toLocaleString()} Ton
          </Badge>
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
                  Expired ({formatInDeploymentTz(row.license_expiry, tz, 'MM/dd/yyyy')})
                </Badge>
              ) : (
                <span className="text-[10px] text-slate-500">
                  Exp: {formatInDeploymentTz(row.license_expiry, tz, 'MM/dd/yyyy')}
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
      header: 'Total Trip Charge',
      accessor: (row: Driver) => (
        <span
          className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400"
          title="Lifetime driver payout across every trip on record — not what customers were billed"
        >
          {row.total_trip_charges ? `SAR ${Number(row.total_trip_charges).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
        </span>
      ),
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
            <WhatsAppIcon className="w-3.5 h-3.5" />
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

  const inlineSearchInput = (
    <div className="relative w-full sm:w-60 md:w-72 shrink-0">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
      <Input
        placeholder="Search driver ID, name, phone..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setCurrentPage(1);
        }}
        className="pl-9 h-9 text-xs bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 font-semibold"
      />
      {search && (
        <button
          onClick={() => {
            setSearch('');
            setCurrentPage(1);
          }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );

  const statusLicenseFilters = (
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
              <span className="flex items-center gap-2 font-medium text-slate-700 font-semibold">
                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                All Statuses
              </span>
            </SelectItem>
          </SelectGroup>
          <SelectSeparator className="my-1 border-slate-100" />
          <SelectGroup>
            <SelectItem value="Available" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
              <span className="flex items-center gap-2 font-medium text-emerald-700 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Available
              </span>
            </SelectItem>
            <SelectItem value="OnTrip" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
              <span className="flex items-center gap-2 font-medium text-blue-700 font-semibold">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                On Trip
              </span>
            </SelectItem>
            <SelectItem value="OffDuty" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
              <span className="flex items-center gap-2 font-medium text-slate-700 font-semibold">
                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                Off Duty
              </span>
            </SelectItem>
            <SelectItem value="Inactive" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
              <span className="flex items-center gap-2 font-medium text-rose-700 font-semibold">
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
            <SelectItem value="Expired" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md text-rose-600 font-semibold">Expired Licenses</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>

      <SortDropdown
        value={sortOrder}
        onChange={setSortOrder}
        options={DRIVER_SORT_OPTIONS}
      />
    </div>
  );

  // Grid-view pagination summary (mirrors DataTable's footer math for the list view)
  const gridPageSizeOptions = [10, 25, 50, 100];
  const gridFromIndex = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const gridToIndex = totalCount === 0 ? 0 : gridFromIndex + filteredDrivers.length - 1;

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
          {/* Card 1: Total Registered Drivers */}
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
            description="Total roster in database"
            icon={DriverBadge}
            isActive={selectedStatus === 'All' && activeKpiModal !== 'expired'}
            onClick={() => {
              setSelectedStatus('All');
              setActiveKpiModal(null);
              setCurrentPage(1);
            }}
            customFooter={
              <div className="relative h-9 mt-4 -mx-5 overflow-hidden rounded-b-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border-t border-emerald-200/60 dark:border-emerald-900/40 flex items-center justify-between px-4 text-[10px] font-bold text-emerald-900 dark:text-emerald-300">
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span>Roster Breakdown</span>
                </span>
                <div className="flex items-center gap-1.5 text-[9px] font-mono font-extrabold">
                  <span className="text-emerald-700 dark:text-emerald-400">{availableCount} Ready</span>
                  <span className="text-slate-300 dark:text-slate-700">·</span>
                  <span className="text-teal-700 dark:text-teal-400">{onTripCount} En-route</span>
                </div>
              </div>
            }
          />

          {/* Card 2: Dispatch Ready / Standby */}
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
            description="Ready for operational trip"
            icon={CheckBadge}
            isActive={selectedStatus === 'Available'}
            onClick={() => {
              setSelectedStatus(selectedStatus === 'Available' ? 'All' : 'Available');
              setCurrentPage(1);
            }}
            customFooter={
              <div className="relative h-9 mt-4 -mx-5 overflow-hidden rounded-b-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border-t border-emerald-200/60 dark:border-emerald-900/40 flex items-center justify-between px-4 text-[10px] font-bold text-emerald-900 dark:text-emerald-300">
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Standby Capacity</span>
                </span>
                <span className="font-mono font-extrabold px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200">
                  {totalCount > 0 ? Math.round((availableCount / totalCount) * 100) : 100}% Pool
                </span>
              </div>
            }
          />

          {/* Card 3: Active On Road */}
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
            description="Currently dispatched on active trips"
            icon={TruckMotion}
            isActive={selectedStatus === 'OnTrip'}
            onClick={() => {
              setSelectedStatus(selectedStatus === 'OnTrip' ? 'All' : 'OnTrip');
              setCurrentPage(1);
            }}
            customFooter={
              <div className="relative h-9 mt-4 -mx-5 overflow-hidden rounded-b-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border-t border-emerald-200/60 dark:border-emerald-900/40 flex items-center justify-between px-4 text-[10px] font-bold text-emerald-900 dark:text-emerald-300">
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                  <span>En-Route Operations</span>
                </span>
                <span className="font-mono font-extrabold text-emerald-700 dark:text-emerald-400">⚡ Live Dispatch</span>
              </div>
            }
          />

          {/* Card 4: Compliance Audit */}
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
            trendValue={expiredLicenseCount > 0 ? `${expiredLicenseCount} Permits Expired` : '100% Valid'}
            description="MOT & MOMRAH compliance status"
            icon={RiskAlert}
            isActive={activeKpiModal === 'expired'}
            onClick={(e) => {
              openKpiModal(e, 'expired');
            }}
            customFooter={
              <div className={cn(
                "relative h-9 mt-4 -mx-5 overflow-hidden rounded-b-2xl flex items-center justify-between px-4 text-[10px] font-bold border-t",
                expiredLicenseCount > 0
                  ? "bg-amber-50/60 dark:bg-amber-950/30 border-amber-200/60 dark:border-amber-900/40 text-amber-900 dark:text-amber-300"
                  : "bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200/60 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-300"
              )}>
                <span className="flex items-center gap-1.5">
                  <span className={cn("h-1.5 w-1.5 rounded-full", expiredLicenseCount > 0 ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500')} />
                  <span>MOT Verification</span>
                </span>
                <span className={cn("font-mono font-extrabold px-1.5 py-0.5 rounded-md", expiredLicenseCount > 0 ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200' : 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200')}>
                  {expiredLicenseCount > 0 ? `${expiredLicenseCount} Need Action` : '100% Valid'}
                </span>
              </div>
            }
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
              filterElement={statusLicenseFilters}
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
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col w-full animate-fade-in">
            {/* Toolbar: matches the list view's search bar & filters, placed above the grid */}
            <div className="shrink-0 p-3 sm:p-4 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 flex flex-col gap-3">
              <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3 w-full">
                <div className="flex items-center gap-2.5 sm:gap-3 flex-1 flex-wrap min-w-0">
                  <div className="flex items-center gap-2 shrink-0">
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                      <Users className="w-4 h-4 text-emerald-500" />
                      <span>Driver Roster Ledger</span>
                    </h3>
                    <Badge variant="outline" className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 text-[11px] font-mono font-bold px-2 py-0.5">
                      {totalCount} {totalCount === 1 ? 'record' : 'records'}
                    </Badge>
                  </div>

                  <div className="relative w-full sm:w-72 lg:w-88 shrink-0">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="text"
                      placeholder="Search driver ID, name, phone..."
                      value={search}
                      onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                      className="w-full pl-8.5 pr-8 h-9 text-xs bg-white dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-700 focus-visible:ring-brand/20 focus-visible:border-brand rounded-md font-medium"
                      aria-label="Search Drivers"
                    />
                    {search && (
                      <button
                        onClick={() => setSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                        aria-label="Clear search"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex w-full xl:w-auto items-center flex-wrap gap-2 sm:shrink-0 xl:ml-auto rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-950/30 p-1.5">
                  {statusLicenseFilters}
                </div>
              </div>
            </div>

            {/* Grid Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 p-4 sm:p-5">
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
                      <DriverAvatar
                        src={d.avatar_url}
                        firstName={d.first_name}
                        lastName={d.last_name}
                        size="md"
                        previewable
                        onPreview={() => setPreviewDriver(d)}
                      />
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
                        {(d.assignedVehicle || d.trips?.[0]?.vehicle)?.plate_number || 'Unassigned'}
                      </span>
                    </div>
                    {(() => {
                      const vehicle = d.assignedVehicle || d.trips?.[0]?.vehicle;
                      if (!vehicle?.capacity_kg) return null;
                      return (
                        <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                          <span className="font-medium text-slate-400 dark:text-slate-500">Capacity:</span>
                          <Badge className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-900/50 text-[10px] font-extrabold font-mono py-0.5 px-2 gap-1">
                            <Truck className="w-2.5 h-2.5" />
                            {(vehicle.capacity_kg / 1000).toLocaleString()} Ton
                          </Badge>
                        </div>
                      );
                    })()}
                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                      <span className="font-medium text-slate-400 dark:text-slate-500">License:</span>
                      <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{d.license_number || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                      <span className="font-medium text-slate-400 dark:text-slate-500">Expiry:</span>
                      <span className={`font-medium ${isExpired ? 'text-rose-600 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>
                        {formatInDeploymentTz(d.license_expiry, tz, 'MM/dd/yyyy')}
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

            {/* Pagination Footer — mirrors the list view's pagination */}
            <div className="shrink-0 p-3 sm:p-4 sm:px-5 border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/60 dark:bg-slate-900/60 text-xs font-semibold text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">
                    <span className="hidden sm:inline">Rows per page:</span>
                    <span className="sm:hidden">Rows:</span>
                  </span>
                  <select
                    value={pageSize}
                    onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                    className="h-8 px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand/20 cursor-pointer shadow-xs"
                    aria-label="Rows per page"
                  >
                    {gridPageSizeOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <span className="text-slate-500 dark:text-slate-400 font-medium border-l border-slate-200 dark:border-slate-700 pl-4 hidden sm:inline">
                  Showing <span className="font-extrabold text-slate-900 dark:text-slate-100">{gridFromIndex}</span> to <span className="font-extrabold text-slate-900 dark:text-slate-100">{gridToIndex}</span> of <span className="font-extrabold text-slate-900 dark:text-slate-100">{totalCount}</span> entries
                </span>
              </div>

              <div className="flex items-center gap-1.5 ml-auto" role="navigation" aria-label="Pagination Navigation">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1 || isLoading}
                  aria-label="First page"
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                >
                  <ChevronsLeft size={14} />
                </button>

                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1 || isLoading}
                  aria-label="Previous page"
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                >
                  <ChevronLeft size={14} />
                </button>

                <div className="flex items-center gap-1 px-2" aria-live="polite">
                  <span className="px-2.5 py-1 text-xs font-extrabold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 shadow-2xs">
                    {currentPage}
                  </span>
                  <span className="text-slate-400 text-xs font-medium">/</span>
                  <span className="text-slate-600 dark:text-slate-400 text-xs font-bold">{totalPages}</span>
                </div>

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages || isLoading}
                  aria-label="Next page"
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                >
                  <ChevronRight size={14} />
                </button>

                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage >= totalPages || isLoading}
                  aria-label="Last page"
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                >
                  <ChevronsRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* WhatsApp Share Dialog */}
        <Dialog open={!!whatsappDriver} onOpenChange={(open) => !open && setWhatsappDriver(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold flex items-center gap-2">
                <WhatsAppIcon className="h-4 w-4 text-emerald-600" />
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
                <WhatsAppIcon className="w-3.5 h-3.5 text-white" />
                Open WhatsApp
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MOT Compliance Verification Modal */}
        <Dialog open={showMotModal} onOpenChange={setShowMotModal}>
          <DialogContent className="max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
            <DialogHeader>
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
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
                  {(rosterRes?.data || drivers).filter((d: Driver) => d.license_expiry && new Date(d.license_expiry) < new Date()).map((d: Driver) => (
                    <div key={d.id} className="flex items-center justify-between p-2 bg-rose-50/50 dark:bg-rose-950/20 rounded-lg border border-rose-200/60 text-xs">
                      <div>
                        <span className="font-bold text-rose-900 dark:text-rose-300">{d.first_name} {d.last_name}</span>
                        <span className="text-[10px] text-rose-700 dark:text-rose-400 font-mono block">Lic: {d.license_number || 'KSA-DL'} • Expired: {formatInDeploymentTz(d.license_expiry, tz, 'MM/dd/yyyy')}</span>
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

        {/* ── Export Settings Modal ────────────────────────────────────── */}
        <ExportModal
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
          title="Export Drivers Roster"
          fileNamePrefix="drivers_roster"
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
