import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Download,
  Upload,
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
  AlertTriangle,
  RotateCw,
  Calendar as CalendarIcon,
  Building2,
  FileText,
  FileSpreadsheet,
  ChevronDown,
  X,
  MoreHorizontal
} from 'lucide-react';
import { TruckMotion, CheckBadge, RouteLine, ClockIcon } from '@/components/ui/kpi-icons';

import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { exportExcelTable, exportPDFTable, parseCSVFile } from '@/utils/exportUtils';
import { tripService, Trip, TripStatus, BulkImportTripRow, BulkImportResult } from '@/services/tripService';
import { driverService } from '@/services/driverService';
import { vehicleService } from '@/services/vehicleService';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { TripDateFilterPicker, DateFilterType } from '@/components/trips/TripDateFilterPicker';

import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import Btn from '@/components/ui/Btn';
import KpiCard from '@/components/ui/KpiCard';
import ConfirmModal from '@/components/ui/ConfirmModal';
import CreateTripModal from '@/components/trips/CreateTripModal';

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';

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

const TRIP_EXPORT_HEADERS = [
  'Job / Ref ID', 'Status', 'Customer', 'Pickup Location', 'Dropoff Location', 'Driver', 'Vehicle',
  'Rate Card', 'Planned Start', 'Actual Start', 'Planned End', 'Actual End',
  'Trip Charges (SAR)', 'Billing Amount (SAR)', 'Carrier / Provider',
];

const formatExportDate = (value: string | null) => (value ? new Date(value).toISOString().slice(0, 10) : '');

const getPickupInfo = (trip: Trip) => {
  const pickup = trip.stops?.find((s) => s.stop_type === 'Pickup') || trip.stops?.[0];
  if (!pickup) return { name: '—', address: null };
  const name = pickup.location_name || pickup.location?.name || pickup.location_address || pickup.location?.address || (pickup.location_lat ? `${pickup.location_lat.toFixed(3)}, ${pickup.location_lng.toFixed(3)}` : '—');
  const address = (pickup.location_name && (pickup.location_address || pickup.location?.address)) ? (pickup.location_address || pickup.location?.address) : null;
  return { name, address };
};

const getDropoffInfo = (trip: Trip) => {
  const dropoff = trip.stops?.find((s) => s.stop_type === 'Dropoff') || (trip.stops && trip.stops.length > 1 ? trip.stops[trip.stops.length - 1] : undefined);
  if (!dropoff) return { name: '—', address: null };
  const name = dropoff.location_name || dropoff.location?.name || dropoff.location_address || dropoff.location?.address || (dropoff.location_lat ? `${dropoff.location_lat.toFixed(3)}, ${dropoff.location_lng.toFixed(3)}` : '—');
  const address = (dropoff.location_name && (dropoff.location_address || dropoff.location?.address)) ? (dropoff.location_address || dropoff.location?.address) : null;
  return { name, address };
};

/** A raw `Trip` carries ~25 fields (nested driver/vehicle/customer objects,
 *  stops/invoices arrays, internal audit fields) — dumping it straight into
 *  a CSV/PDF export produces an unreadably wide, cluttered table. This picks
 *  just the columns an operator actually wants to see in an export. */
const tripsToExportRows = (trips: Trip[]) => trips.map(t => {
  const pickup = getPickupInfo(t);
  const dropoff = getDropoffInfo(t);
  return [
    t.ref_id,
    t.status,
    t.customer?.name || 'Unassigned',
    pickup.name !== '—' ? (pickup.address ? `${pickup.name} (${pickup.address})` : pickup.name) : '—',
    dropoff.name !== '—' ? (dropoff.address ? `${dropoff.name} (${dropoff.address})` : dropoff.name) : '—',
    t.driver ? `${t.driver.first_name} ${t.driver.last_name}` : 'Unassigned',
    t.vehicle?.plate_number || 'Unassigned',
    t.rateCard?.name || 'Manual Rate',
    formatExportDate(t.planned_start),
    formatExportDate(t.actual_start),
    formatExportDate(t.planned_end),
    formatExportDate(t.actual_end),
    Number(t.trip_charges || 0),
    Number(t.billing_amount || t.rateCard?.base_price || 0),
    t.carrier_name || 'MERCON LOGISTICS',
  ];
});


const IMPORT_FIELD_ALIASES: Partial<Record<keyof BulkImportTripRow, string[]>> = {
  customer_name: ['customer_name', 'customer', 'client', 'client_name'],
  driver_name: ['driver_name', 'driver'],
  vehicle_plate: ['vehicle_plate', 'vehicle', 'plate_number', 'plate'],
  planned_start: ['planned_start', 'planned_start_date', 'start_date', 'planned_date'],
};

function pickImportField(row: Record<string, string>, field: keyof BulkImportTripRow): string {
  const aliases = IMPORT_FIELD_ALIASES[field] || [];
  for (const alias of aliases) {
    if (row[alias]) return row[alias];
  }
  return '';
}

function downloadImportTemplate() {
  const headers = ['Customer Name', 'Driver Name', 'Vehicle Plate', 'Planned Start'];
  const example = ['Acme Trading Co.', 'John Doe', 'ABC-1234', '2026-08-15'];
  const csv = '﻿' + [headers.join(','), example.join(',')].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'trips_import_template.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

type TripStatusFilter = TripStatus | 'All' | 'Completed,Invoiced';

const STATUS_TABS: { label: string; value: TripStatusFilter }[] = [
  { label: 'All Operations', value: 'All' },
  { label: 'Scheduled / Drafts', value: 'Draft' },
  { label: 'Dispatched', value: 'Dispatched' },
  { label: 'At Pickup', value: 'AtPickup' },
  { label: 'In Transit', value: 'InTransit' },
  { label: 'At Delivery', value: 'AtDelivery' },
  { label: 'Delivered & Completed (All)', value: 'Completed,Invoiced' },
  { label: 'Delivered (Uninvoiced)', value: 'Completed' },
  { label: 'Completed (Invoiced)', value: 'Invoiced' },
  { label: 'Cancelled', value: 'Cancelled' },
];

export default function TripListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const [isCreateTripOpen, setIsCreateTripOpen] = useState(searchParams.get('new') === 'true');

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setIsCreateTripOpen(true);
    }
  }, [searchParams]);

  const handleCloseCreateTrip = () => {
    setIsCreateTripOpen(false);
    if (searchParams.get('new') === 'true') {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('new');
      setSearchParams(nextParams, { replace: true });
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedStatus, setSelectedStatus] = useState<TripStatusFilter>('All');
  const [dateFilter, setDateFilter] = useState<DateFilterType>('All');
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 300);

  // Status Change Dialog state
  const [statusDialogTrip, setStatusDialogTrip] = useState<Trip | null>(null);
  const [newStatus, setNewStatus] = useState<TripStatus>('Dispatched');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Export menu state — the dropdown is the primary UI; the small dialog below
  // only handles date-range picking, which doesn't fit a dropdown item.
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'excel' | 'pdf'>('excel');
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportStatusGroup, setExportStatusGroup] = useState<ExportStatusGroup>('All');
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const { data: exportDriversRes } = useQuery({
    queryKey: ['drivers-for-export'],
    queryFn: () => driverService.getAll({ per_page: 500 }),
    enabled: exportMenuOpen,
  });
  const { data: exportVehiclesRes } = useQuery({
    queryKey: ['vehicles-for-export'],
    queryFn: () => vehicleService.getAll({ per_page: 500 }),
    enabled: exportMenuOpen,
  });
  const exportDrivers = exportDriversRes?.data || [];
  const exportVehicles = exportVehiclesRes?.data || [];

  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectionResetKey, setSelectionResetKey] = useState(0);
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
  const [importFileName, setImportFileName] = useState('');
  const [importRows, setImportRows] = useState<BulkImportTripRow[]>([]);
  const [importParseError, setImportParseError] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null);

  // WhatsApp Share Dialog state
  const [whatsappDialogOpen, setWhatsappDialogOpen] = useState(false);
  const [whatsappSelectedTrips, setWhatsappSelectedTrips] = useState<Trip[]>([]);
  const [whatsappRecipientType, setWhatsappRecipientType] = useState<'driver' | 'customer' | 'custom'>('custom');
  const [whatsappCustomPhone, setWhatsappCustomPhone] = useState('');
  const [whatsappMessageText, setWhatsappMessageText] = useState('');

  const startDateStr = dateFilter === 'Custom' && customDateRange?.from
    ? format(customDateRange.from, 'yyyy-MM-dd')
    : undefined;
  const endDateStr = dateFilter === 'Custom' && customDateRange?.to
    ? format(customDateRange.to, 'yyyy-MM-dd')
    : (dateFilter === 'Custom' && customDateRange?.from ? format(customDateRange.from, 'yyyy-MM-dd') : undefined);

  // Fetch trips using React Query
  const { data: tripsRes, isLoading, isError, error } = useQuery({
    queryKey: ['trips', selectedStatus, dateFilter, startDateStr, endDateStr, debouncedSearch],
    queryFn: () => tripService.getAll({
      status: selectedStatus === 'All' ? undefined : (selectedStatus as any),
      date_filter: dateFilter === 'All' || dateFilter === 'Custom' ? undefined : dateFilter,
      start_date: startDateStr,
      end_date: endDateStr,
      search: debouncedSearch || undefined,
      per_page: 1000,
    }),
  });

  // Fetch overall fleet totals for KPI cards (100% independent of page filters/search)
  const { data: allTripsRes } = useQuery({
    queryKey: ['trips-kpi-summary'],
    queryFn: () => tripService.getAll({ per_page: 1000 }),
  });

  const rawTrips = tripsRes?.data || [];
  const trips = rawTrips;

  // Fixed fleet-wide totals for KPI cards (do NOT change when table is filtered or searched)
  const kpiTrips = allTripsRes?.data || [];
  const totalCount = allTripsRes?.meta?.total || kpiTrips.length;

  const inTransitTrips = kpiTrips.filter(t => t.status === 'InTransit');
  const inTransitCount = inTransitTrips.length;

  const deliveredPendingInvoiceTrips = kpiTrips.filter(t => t.status === 'Completed');
  const deliveredPendingInvoiceCount = deliveredPendingInvoiceTrips.length;

  const invoicedTrips = kpiTrips.filter(t => t.status === 'Invoiced');
  const invoicedCount = invoicedTrips.length;

  const completedTrips = kpiTrips.filter(t => t.status === 'Completed' || t.status === 'Invoiced');
  const completedCount = completedTrips.length;
  const completedPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const draftTrips = kpiTrips.filter(t => t.status === 'Draft');
  const dispatchQueueCount = draftTrips.length;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['trips'] }),
      queryClient.invalidateQueries({ queryKey: ['trips-kpi-summary'] }),
    ]);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleUpdateStatus = async () => {
    if (!statusDialogTrip) return;
    try {
      setIsUpdatingStatus(true);
      await tripService.updateStatus(statusDialogTrip.id, newStatus);
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['trips-kpi-summary'] });
      setSelectionResetKey(k => k + 1);
      setStatusDialogTrip(null);
      toast.success('Trip status updated successfully');
    } catch (e) {
      toast.error('Failed to update trip status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const runExport = async (
    format: 'excel' | 'pdf',
    opts: { statusGroup: ExportStatusGroup; driverId?: string; vehicleId?: string; startDate?: string; endDate?: string }
  ) => {
    try {
      setIsExporting(true);
      const res = await tripService.getAll({
        driver_id: opts.driverId,
        vehicle_id: opts.vehicleId,
        start_date: opts.startDate || undefined,
        end_date: opts.endDate || undefined,
        per_page: 2000,
      });
      const matched = (res.data || []).filter(t => matchesExportStatusGroup(t.status, opts.statusGroup));

      if (!matched.length) {
        toast.warning('No trips match the selected export filters.');
        return;
      }

      const groupLabel = EXPORT_STATUS_GROUPS.find(g => g.value === opts.statusGroup)?.label || 'All Trips';
      const groupSlug = groupLabel.replace(/[\s/]+/g, '_');
      const datePart = new Date().toISOString().slice(0, 10);
      const baseName = `trips_export_${groupSlug}_${datePart}`;

      const exportRows = tripsToExportRows(matched);
      const title = `Trips Export — ${groupLabel}`;
      if (format === 'excel') {
        await exportExcelTable(title, TRIP_EXPORT_HEADERS, exportRows, `${baseName}.xlsx`);
      } else {
        exportPDFTable(title, TRIP_EXPORT_HEADERS, exportRows, `${baseName}.pdf`);
      }
      setExportDialogOpen(false);
    } catch (e) {
      toast.error('Failed to generate export.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDateRangeExport = () => runExport(exportFormat, {
    statusGroup: exportStatusGroup,
    startDate: exportStartDate,
    endDate: exportEndDate,
  });

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setImportResult(null);
    setImportParseError('');
    setImportRows([]);
    setImportFileName(file.name);

    try {
      const rawRows = await parseCSVFile(file);
      const normalized: BulkImportTripRow[] = rawRows
        .map(row => ({
          customer_name: pickImportField(row, 'customer_name'),
          driver_name: pickImportField(row, 'driver_name') || undefined,
          vehicle_plate: pickImportField(row, 'vehicle_plate') || undefined,
          planned_start: pickImportField(row, 'planned_start') || undefined,
        }))
        .filter(row => row.customer_name);

      if (!normalized.length) {
        setImportParseError('No valid rows found. Make sure the CSV has a "Customer Name" column and at least one data row.');
        return;
      }
      setImportRows(normalized);
    } catch (err) {
      setImportParseError('Could not read that file. Make sure it\'s a valid CSV.');
    }
  };

  const handleConfirmImport = async () => {
    if (!importRows.length) return;
    try {
      setIsImporting(true);
      const result = await tripService.bulkImport(importRows);
      setImportResult(result);
      if (result.imported > 0) {
        queryClient.invalidateQueries({ queryKey: ['trips'] });
        queryClient.invalidateQueries({ queryKey: ['trips-kpi-summary'] });
      }
    } catch (e) {
      toast.error('Failed to import trips.');
    } finally {
      setIsImporting(false);
    }
  };

  const resetImportDialog = () => {
    setImportDialogOpen(false);
    setImportFileName('');
    setImportRows([]);
    setImportParseError('');
    setImportResult(null);
  };

  const openWhatsappShare = (selectedRows: Trip[]) => {
    setWhatsappSelectedTrips(selectedRows);
    if (selectedRows.length === 0) return;

    if (selectedRows.length === 1) {
      const trip = selectedRows[0];
      const customerName = trip.customer?.name || 'Unassigned';
      const driverName = trip.driver ? `${trip.driver.first_name} ${trip.driver.last_name}` : 'Unassigned';
      const plate = trip.vehicle?.plate_number || 'Unassigned';
      const text = `🚚 *MERCON LOGISTICS - Trip Manifest*\n` +
                   `• *Trip Ref:* ${trip.ref_id || 'Draft'}\n` +
                   `• *Status:* ${trip.status}\n` +
                   `• *Customer:* ${customerName}\n` +
                   `• *Driver:* ${driverName}\n` +
                   `• *Vehicle:* ${plate}\n` +
                   (trip.planned_start ? `• *Planned Start:* ${new Date(trip.planned_start).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}\n` : '') +
                   `• *Tracking:* ${window.location.origin}/trips/${trip.id}/track`;

      setWhatsappMessageText(text);

      if (trip.driver?.phone_primary) {
        setWhatsappRecipientType('driver');
      } else if (trip.customer?.contact_phone) {
        setWhatsappRecipientType('customer');
      } else {
        setWhatsappRecipientType('custom');
        setWhatsappCustomPhone('');
      }
    } else {
      let text = `🚚 *MERCON LOGISTICS - Manifest Summary*\n`;
      selectedRows.forEach((t) => {
        const cust = t.customer?.name || 'Unassigned';
        const drv = t.driver ? `${t.driver.first_name} ${t.driver.last_name}` : 'Unassigned';
        const plate = t.vehicle?.plate_number || 'Unassigned';
        text += `\n*${t.ref_id || 'Draft'}* - ${cust}\n` +
                `  • Driver: ${drv}\n` +
                `  • Vehicle: ${plate}\n` +
                `  • Status: ${t.status}\n`;
      });
      setWhatsappMessageText(text);
      setWhatsappRecipientType('custom');
      setWhatsappCustomPhone('');
    }

    setWhatsappDialogOpen(true);
  };

  const handleWhatsappSend = () => {
    let phone = '';
    if (whatsappSelectedTrips.length === 1) {
      const trip = whatsappSelectedTrips[0];
      if (whatsappRecipientType === 'driver') {
        phone = trip.driver?.phone_primary || '';
      } else if (whatsappRecipientType === 'customer') {
        phone = trip.customer?.contact_phone || '';
      } else {
        phone = whatsappCustomPhone;
      }
    } else {
      phone = whatsappCustomPhone;
    }

    const cleanPhone = phone.trim().replace(/\+/g, '').replace(/\D/g, '');
    const baseUrl = cleanPhone 
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}` 
      : `https://api.whatsapp.com/send`;
    
    const shareUrl = `${baseUrl}?text=${encodeURIComponent(whatsappMessageText)}`;
    window.open(shareUrl, '_blank');
    setWhatsappDialogOpen(false);
  };

  const getDriverInitials = (driver?: { first_name?: string; last_name?: string } | null) => {
    if (!driver) return '—';
    const f = driver.first_name?.[0] || '';
    const l = driver.last_name?.[0] || '';
    return (f + l).toUpperCase() || 'DR';
  };

  const columns = [
    {
      header: 'Trip ID',
      className: 'w-[90px] shrink-0',
      accessor: (row: Trip) => (
        <div className="flex items-center gap-1">
          <span className="font-mono text-xs font-bold text-brand truncate">
            {row.ref_id || 'Draft'}
          </span>
        </div>
      ),
    },
    {
      header: 'Customer',
      className: 'max-w-[130px] truncate',
      accessor: (row: Trip) => (
        <div className="flex flex-col max-w-[130px] truncate">
          <span className="font-semibold text-xs text-slate-900 dark:text-slate-100 leading-tight truncate" title={row.customer?.name}>
            {row.customer?.name || '—'}
          </span>
        </div>
      ),
    },
    {
      header: 'Route',
      className: 'max-w-[155px] truncate',
      accessor: (row: Trip) => {
        const pickup = getPickupInfo(row);
        const dropoff = getDropoffInfo(row);
        return (
          <div className="flex flex-col gap-0 py-0.5 max-w-[155px] truncate" title={`From: ${pickup.name}\nTo: ${dropoff.name}`}>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                {pickup.name}
              </span>
            </div>
            <div className="ml-[2.5px] w-0 h-2 border-l border-dotted border-slate-400 dark:border-slate-500 my-0.5" />
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-brand shrink-0" />
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                {dropoff.name}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Driver',
      className: 'max-w-[165px]',
      accessor: (row: Trip) => (
        <div className="flex items-center gap-1.5 max-w-[165px]">
          <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[9px] flex items-center justify-center shrink-0">
            {row.driver ? `${row.driver.first_name[0]}${row.driver.last_name ? row.driver.last_name[0] : ''}` : 'U'}
          </div>
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate" title={row.driver ? `${row.driver.first_name} ${row.driver.last_name}` : 'Unassigned'}>
            {row.driver ? `${row.driver.first_name} ${row.driver.last_name}` : 'Unassigned'}
          </span>
        </div>
      ),
    },
    {
      header: 'Vehicle',
      className: 'w-[95px] shrink-0',
      accessor: (row: Trip) => (
        <div className="flex items-center gap-1">
          <Truck size={12} className="text-slate-400 shrink-0" />
          {row.vehicle?.plate_number ? (
            <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300 font-bold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded truncate">
              {row.vehicle.plate_number}
            </span>
          ) : (
            <span className="text-xs text-slate-400 italic">Unassigned</span>
          )}
        </div>
      ),
    },
    {
      header: 'Rate (SAR)',
      className: 'w-[100px] shrink-0',
      accessor: (row: Trip) => {
        const price = row.billing_amount ?? row.trip_charges ?? row.rateCard?.base_price;
        return (
          <div className="flex items-center font-mono text-xs">
            <span className="font-extrabold text-slate-900 dark:text-slate-200">
              {price !== undefined && price !== null && price > 0
                ? `SAR ${Number(price).toLocaleString('en-US')}`
                : '—'}
            </span>
          </div>
        );
      },
    },
    {
      header: 'Status',
      className: 'w-[105px] shrink-0',
      accessor: (row: Trip) => (
        <StatusBadge status={row.status} />
      ),
    },
    {
      header: 'Planned Start',
      className: 'w-[95px] shrink-0',
      accessor: (row: Trip) => (
        <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
          {row.planned_start ? new Date(row.planned_start).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'}
        </span>
      ),
    },
    {
      header: 'Actions',
      className: 'w-[95px] text-right shrink-0',
      headerClassName: 'text-right',
      accessor: (row: Trip) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => openWhatsappShare([row])}
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
                title="Trip Actions"
                aria-label="Trip Actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 p-1.5 shadow-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl">
              {row.status === 'InTransit' && (
                <DropdownMenuItem
                  onClick={() => navigate(`/trips/${row.id}/track`)}
                  className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md text-brand hover:bg-orange-50 dark:hover:bg-orange-950/40"
                >
                  <Navigation className="mr-2 h-3.5 w-3.5" />
                  Live GPS Track
                </DropdownMenuItem>
              )}

              <DropdownMenuItem
                onClick={() => {
                  setStatusDialogTrip(row);
                  setNewStatus(row.status);
                }}
                className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md"
              >
                <RefreshCw className="mr-2 h-3.5 w-3.5 text-emerald-600" />
                Quick Status Change
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => navigate(`/trips/${row.id}/edit`)}
                className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md"
              >
                <Edit2 className="mr-2 h-3.5 w-3.5 text-amber-600" />
                Edit Trip Manifest
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => openWhatsappShare([row])}
                className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md"
              >
                <svg className="mr-2 h-3.5 w-3.5 text-emerald-600 fill-current" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.793 1.451 5.48.002 9.938-4.453 9.942-9.94.002-2.659-1.031-5.158-2.908-7.037C16.597 1.749 14.103.719 11.45.719 5.968.719 1.513 5.174 1.509 10.662c-.001 1.761.472 3.479 1.371 5.011L1.872 21.05l5.52-1.446c1.502.82 3.18 1.25 4.887 1.25h.008z" />
                </svg>
                Share to WhatsApp
              </DropdownMenuItem>

              <DropdownMenuSeparator className="my-1 border-slate-100 dark:border-slate-800" />

              <DropdownMenuItem
                onClick={() => {
                  setConfirmModal({
                    isOpen: true,
                    title: 'Delete Trip Draft',
                    message: `Are you sure you want to delete trip ${row.ref_id || 'Draft'}? This action cannot be undone.`,
                    onConfirm: async () => {
                      try {
                        await tripService.bulkDelete([row.id]);
                        queryClient.invalidateQueries({ queryKey: ['trips'] });
                        queryClient.invalidateQueries({ queryKey: ['trips-kpi-summary'] });
                        setSelectionResetKey(k => k + 1);
                        toast.success('Trip deleted successfully');
                      } catch (e) {
                        toast.error('Failed to delete trip');
                      }
                    }
                  });
                }}
                className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
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
      label: 'Share to WhatsApp',
      icon: (
        <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 fill-current" viewBox="0 0 24 24">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.793 1.451 5.48.002 9.938-4.453 9.942-9.94.002-2.659-1.031-5.158-2.908-7.037C16.597 1.749 14.103.719 11.45.719 5.968.719 1.513 5.174 1.509 10.662c-.001 1.761.472 3.479 1.371 5.011L1.872 21.05l5.52-1.446c1.502.82 3.18 1.25 4.887 1.25h.008z" />
        </svg>
      ),
      variant: 'success' as const,
      onClick: (selectedRows: Trip[]) => {
        openWhatsappShare(selectedRows);
      }
    },
    {
      label: 'Export Selected Excel',
      icon: <FileSpreadsheet size={13} className="text-emerald-600 dark:text-emerald-400" />,
      variant: 'success' as const,
      onClick: (selectedRows: Trip[]) => {
        exportExcelTable('Trips Export', TRIP_EXPORT_HEADERS, tripsToExportRows(selectedRows), 'trips_export.xlsx');
      }
    },
    {
      label: 'Export Selected PDF',
      icon: <FileText size={13} className="text-rose-600 dark:text-rose-400" />,
      variant: 'warning' as const,
      onClick: (selectedRows: Trip[]) => {
        exportPDFTable('Trips Export', TRIP_EXPORT_HEADERS, tripsToExportRows(selectedRows), 'trips_export.pdf');
      }
    },
    {
      label: 'Delete Selected',
      icon: <Trash2 size={13} />,
      variant: 'danger' as const,
      onClick: (selectedRows: Trip[], clearSelection?: () => void) => {
        setConfirmModal({
          isOpen: true,
          title: 'Delete Selected Trips',
          message: `Are you sure you want to delete ${selectedRows.length} selected trip${selectedRows.length > 1 ? 's' : ''}? This action cannot be undone.`,
          onConfirm: async () => {
            try {
              await tripService.bulkDelete(selectedRows.map(r => r.id));
              queryClient.invalidateQueries({ queryKey: ['trips'] });
              queryClient.invalidateQueries({ queryKey: ['trips-kpi-summary'] });
              clearSelection?.();
              setSelectionResetKey(k => k + 1);
              toast.success(`Successfully deleted ${selectedRows.length} trip${selectedRows.length > 1 ? 's' : ''}`);
            } catch (e) {
              toast.error('Failed to delete trips');
            }
          }
        });
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
              className="h-9 gap-1.5 text-xs font-semibold border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 shadow-2xs rounded-lg transition-colors"
              onClick={() => setImportDialogOpen(true)}
            >
              <Upload className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
              Import
            </Button>

            <DropdownMenu open={exportMenuOpen} onOpenChange={setExportMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5 text-xs font-semibold border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 shadow-2xs rounded-lg transition-colors"
                >
                  <Download className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                  Export
                  <ChevronDown className="h-3 w-3 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 p-1.5 shadow-lg border border-slate-200 bg-white rounded-xl">
                {/* Format toggle — applies to every option below */}
                <div className="flex items-center gap-1 p-1 mb-1 rounded-lg bg-slate-100">
                  <button
                    onClick={(e) => { e.preventDefault(); setExportFormat('excel'); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 h-7 rounded-md text-[11px] font-bold transition-colors ${exportFormat === 'excel' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                    Excel
                  </button>
                  <button
                    onClick={(e) => { e.preventDefault(); setExportFormat('pdf'); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 h-7 rounded-md text-[11px] font-bold transition-colors ${exportFormat === 'pdf' ? 'bg-white text-rose-700 shadow-2xs' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <FileText className="h-3.5 w-3.5 text-rose-600" />
                    PDF
                  </button>
                </div>

                <DropdownMenuItem
                  onClick={() => runExport(exportFormat, { statusGroup: 'All' })}
                  className="cursor-pointer text-xs font-semibold py-1.5 px-2 rounded-md"
                >
                  {exportFormat === 'excel'
                    ? <FileSpreadsheet className="mr-2 h-3.5 w-3.5 text-emerald-600" />
                    : <FileText className="mr-2 h-3.5 w-3.5 text-rose-600" />}
                  All Trips
                </DropdownMenuItem>

                <DropdownMenuSeparator className="my-1 border-slate-100" />
                <DropdownMenuLabel className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-2 py-1">
                  By Status
                </DropdownMenuLabel>
                {EXPORT_STATUS_GROUPS.filter(g => g.value !== 'All').map(g => (
                  <DropdownMenuItem
                    key={g.value}
                    onClick={() => runExport(exportFormat, { statusGroup: g.value })}
                    className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md"
                  >
                    {exportFormat === 'excel'
                      ? <FileSpreadsheet className="mr-2 h-3.5 w-3.5 text-emerald-600" />
                      : <FileText className="mr-2 h-3.5 w-3.5 text-rose-600" />}
                    {g.label}
                  </DropdownMenuItem>
                ))}

                <DropdownMenuSeparator className="my-1 border-slate-100" />
                <DropdownMenuLabel className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-2 py-1">
                  By Driver / Vehicle / Date
                </DropdownMenuLabel>

                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                    <User className="mr-2 h-3.5 w-3.5 text-slate-400" />
                    A Specific Driver
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent className="w-56 max-h-72 overflow-y-auto p-1.5 shadow-lg border border-slate-200 bg-white rounded-xl">
                      {exportDrivers.length === 0 ? (
                        <div className="px-2.5 py-2 text-[11px] text-slate-400">No drivers found</div>
                      ) : (
                        exportDrivers.map(d => (
                          <DropdownMenuItem
                            key={d.id}
                            onClick={() => runExport(exportFormat, { statusGroup: 'All', driverId: d.id })}
                            className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md"
                          >
                            {d.first_name} {d.last_name}
                          </DropdownMenuItem>
                        ))
                      )}
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>

                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                    <Truck className="mr-2 h-3.5 w-3.5 text-slate-400" />
                    A Specific Vehicle
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent className="w-56 max-h-72 overflow-y-auto p-1.5 shadow-lg border border-slate-200 bg-white rounded-xl">
                      {exportVehicles.length === 0 ? (
                        <div className="px-2.5 py-2 text-[11px] text-slate-400">No vehicles found</div>
                      ) : (
                        exportVehicles.map(v => (
                          <DropdownMenuItem
                            key={v.id}
                            onClick={() => runExport(exportFormat, { statusGroup: 'All', vehicleId: v.id })}
                            className="cursor-pointer text-xs font-mono font-semibold py-1.5 px-2 rounded-md"
                          >
                            {v.plate_number}
                          </DropdownMenuItem>
                        ))
                      )}
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>

                <DropdownMenuItem
                  onClick={() => { setExportMenuOpen(false); setExportDialogOpen(true); }}
                  className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md"
                >
                  <CalendarIcon className="mr-2 h-3.5 w-3.5 text-slate-400" />
                  A Date Range...
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              size="sm"
              className="h-9 gap-1.5 text-xs font-bold bg-brand hover:bg-brand-hover text-white shadow-xs rounded-md px-4"
              onClick={() => setIsCreateTripOpen(true)}
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
        
        {/* ── 2. Instrument-Panel KPI Cards ───────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 shrink-0">
          <KpiCard
            title="TOTAL TRIPS"
            value={
              <span>
                {totalCount}
                <span className="text-[16px] font-semibold ml-1.5 opacity-85">Trips</span>
              </span>
            }
            variant="slate"
            description="All fleet operations"
            icon={TruckMotion}
            semiCircleGauge={{
              segments: [
                { label: "Completed", count: completedCount, color: "#16A34A" },
                { label: "In Transit", count: inTransitCount, color: "#2563EB" },
                { label: "Queue", count: dispatchQueueCount, color: "#D97706" },
              ]
            }}
            onClick={() => {
              setSelectedStatus('All');
              setCurrentPage(1);
            }}
          />
          <KpiCard
            title="IN TRANSIT"
            value={
              <span>
                {inTransitCount}
                <span className="text-[16px] font-semibold ml-1.5 opacity-85">On Road</span>
              </span>
            }
            variant="blue"
            description="Trucks on the road now"
            icon={RouteLine}
            livePulseTrack={{
              statusText: "Live tracking",
              subText: "GPS",
            }}
            isActive={selectedStatus === 'InTransit'}
            onClick={() => {
              setSelectedStatus('InTransit');
              setCurrentPage(1);
            }}
          />
          <KpiCard
            title="DELIVERED & COMPLETED"
            value={
              <span>
                {completedCount}
                <span className="text-[16px] font-semibold ml-1.5 opacity-85">Trips</span>
              </span>
            }
            variant="emerald"
            description={`Delivered: ${deliveredPendingInvoiceCount} | Invoiced: ${invoicedCount}`}
            icon={CheckBadge}
            semiCircleGauge={{
              segments: [
                { label: "Delivered (Uninvoiced)", count: deliveredPendingInvoiceCount, color: "#34D399" },
                { label: "Completed (Invoiced)", count: invoicedCount, color: "#059669" },
              ]
            }}
            isActive={selectedStatus === 'Completed,Invoiced' || selectedStatus === 'Completed' || selectedStatus === 'Invoiced'}
            onClick={() => {
              setSelectedStatus('Completed,Invoiced');
              setCurrentPage(1);
            }}
          />
          <KpiCard
            title="SCHEDULED TRIPS"
            value={
              <span>
                {draftTrips.length}
                <span className="text-[16px] font-semibold ml-1.5 opacity-85">Scheduled</span>
              </span>
            }
            variant="amber"
            description="Upcoming & planned trips"
            icon={ClockIcon}
            pipelineStages={[
              { name: "Draft", count: draftTrips.length, color: "bg-amber-500" },
              { name: "Dispatched", count: kpiTrips.filter(t => t.status === 'Dispatched').length, color: "bg-blue-500" },
            ]}
            isActive={selectedStatus === 'Draft'}
            onClick={() => {
              setSelectedStatus('Draft');
              setCurrentPage(1);
            }}
          />
        </div>

        {/* Active Filter Indicator Banner */}
        {selectedStatus !== 'All' && (
          <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200/80 dark:border-orange-900/40 px-3.5 py-2 rounded-xl flex items-center justify-between gap-3 text-xs font-semibold text-orange-900 dark:text-orange-200 animate-fade-in shrink-0">
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-brand shrink-0" />
              <span>
                Filtered by status: <strong className="underline decoration-brand text-slate-900 dark:text-slate-100 font-bold">{STATUS_TABS.find(t => t.value === selectedStatus)?.label || selectedStatus}</strong> ({trips.length} trip{trips.length === 1 ? '' : 's'} matching)
              </span>
            </div>
            <button
              onClick={() => {
                setSelectedStatus('All');
                setCurrentPage(1);
              }}
              className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-900 border border-orange-200 dark:border-orange-800 text-[11px] font-bold text-brand hover:bg-orange-100 dark:hover:bg-orange-950 transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
            >
              <span>Show All Operations</span>
              <X className="w-3 h-3 shrink-0" />
            </button>
          </div>
        )}
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
            selectionResetKey={selectionResetKey}
            compact={true}
            isLoading={isLoading}
            isError={isError}
            errorMessage={(error as Error)?.message || 'Failed to load trips.'}
            searchPlaceholder="Search trip ID, customer, driver..."
            searchValue={search}
            onSearchChange={setSearch}
            filterElement={
              <div className="flex items-center gap-2.5">
                <Select
                  value={selectedStatus}
                  onValueChange={(val) => {
                    if (val) {
                      setSelectedStatus(val as TripStatusFilter);
                      setCurrentPage(1);
                    }
                  }}
                >
                  <SelectTrigger className="h-9 px-3 w-auto min-w-[200px] whitespace-nowrap shrink-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold">
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <Filter className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                      <SelectValue placeholder="All Operations" className="whitespace-nowrap" />
                    </div>
                  </SelectTrigger>
                  <SelectContent align="start" className="w-64 p-1.5 shadow-lg border border-slate-200 bg-white rounded-xl">
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
                        <span className="flex items-center gap-2 font-medium text-brand">
                          <span className="w-2 h-2 rounded-full bg-brand"></span>
                          In Transit
                        </span>
                      </SelectItem>
                      <SelectItem value="AtDelivery" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                        <span className="flex items-center gap-2 font-medium text-indigo-700">
                          <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                          At Delivery
                        </span>
                      </SelectItem>
                      <SelectItem value="Completed,Invoiced" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                        <span className="flex items-center gap-2 font-semibold text-emerald-700">
                          <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                          Delivered & Completed (All)
                        </span>
                      </SelectItem>
                      <SelectItem value="Completed" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                        <span className="flex items-center gap-2 font-medium text-emerald-600 pl-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          Delivered (Uninvoiced)
                        </span>
                      </SelectItem>
                      <SelectItem value="Invoiced" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                        <span className="flex items-center gap-2 font-medium text-teal-700 pl-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-600"></span>
                          Completed (Invoiced)
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

                <TripDateFilterPicker
                  dateFilter={dateFilter}
                  setDateFilter={setDateFilter}
                  customDateRange={customDateRange}
                  setCustomDateRange={setCustomDateRange}
                  onFilterChange={() => setCurrentPage(1)}
                />
              </div>
            }
            bulkActions={bulkActions}
            pageSize={pageSize}
            onPageSizeChange={(size) => setPageSize(size)}
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
                <SelectTrigger className="w-full text-xs font-semibold border-slate-200 rounded-lg">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="w-full p-1.5 shadow-lg border border-slate-200 bg-white rounded-xl">
                  {(() => {
                    const currentStatus = statusDialogTrip?.status as TripStatus;
                    
                    const ALLOWED_TRANSITIONS: Record<TripStatus, TripStatus[]> = {
                      Draft: ['Dispatched', 'Cancelled'] as TripStatus[],
                      Dispatched: ['AtPickup', 'Draft', 'Cancelled'] as TripStatus[],
                      AtPickup: ['InTransit', 'Cancelled'] as TripStatus[],
                      InTransit: ['AtDelivery', 'Cancelled'] as TripStatus[],
                      AtDelivery: ['Completed', 'Cancelled'] as TripStatus[],
                      Completed: ['Invoiced'] as TripStatus[],
                      Invoiced: [] as TripStatus[],
                      Cancelled: ['Draft'] as TripStatus[],
                    };

                    const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
                    const isValid = (status: string) => status === currentStatus || allowed.includes(status as TripStatus);

                    return (
                      <>
                        <SelectItem value="Draft" disabled={!isValid('Draft')} className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">Scheduled (Draft)</SelectItem>
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

        {/* Date Range Export Dialog — the one filter that doesn't fit a dropdown item */}
        <Dialog open={exportDialogOpen} onOpenChange={(open) => !open && setExportDialogOpen(false)}>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-brand" />
                Export by Date Range
              </DialogTitle>
              <DialogDescription className="text-xs">
                Pick a status and a date window, then export as {exportFormat.toUpperCase()}.
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

              <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 w-fit">
                <button
                  onClick={() => setExportFormat('excel')}
                  className={`flex items-center gap-1.5 h-7 px-3 rounded-md text-[11px] font-bold transition-colors ${exportFormat === 'excel' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                  Excel
                </button>
                <button
                  onClick={() => setExportFormat('pdf')}
                  className={`flex items-center gap-1.5 h-7 px-3 rounded-md text-[11px] font-bold transition-colors ${exportFormat === 'pdf' ? 'bg-white text-rose-700 shadow-2xs' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <FileText className="h-3.5 w-3.5 text-rose-600" />
                  PDF
                </button>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setExportDialogOpen(false)}
                disabled={isExporting}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className={`text-xs font-bold gap-1.5 ${exportFormat === 'excel' ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'}`}
                onClick={handleDateRangeExport}
                disabled={isExporting}
              >
                {exportFormat === 'excel' ? <FileSpreadsheet className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
                {isExporting ? 'Exporting...' : `Export ${exportFormat.toUpperCase()}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* CSV Import Dialog */}
        {/* WhatsApp Share Dialog */}
        <Dialog open={whatsappDialogOpen} onOpenChange={(open) => !open && setWhatsappDialogOpen(false)}>
          <DialogContent className="sm:max-w-[460px] rounded-2xl p-6">
            <DialogHeader>
              <DialogTitle className="text-base font-extrabold flex items-center gap-2 text-emerald-600">
                <svg className="w-5 h-5 text-emerald-500 fill-current" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.793 1.451 5.48.002 9.938-4.453 9.942-9.94.002-2.659-1.031-5.158-2.908-7.037C16.597 1.749 14.103.719 11.45.719 5.968.719 1.513 5.174 1.509 10.662c-.001 1.761.472 3.479 1.371 5.011L1.872 21.05l5.52-1.446c1.502.82 3.18 1.25 4.887 1.25h.008z" />
                </svg>
                Share to WhatsApp
              </DialogTitle>
              <DialogDescription className="text-xs">
                Send trip manifest details directly via WhatsApp web or mobile app.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              {whatsappSelectedTrips.length === 1 ? (
                <div className="space-y-3">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Select Recipient:
                  </span>
                  
                  <div className="grid grid-cols-1 gap-2">
                    {/* Driver option */}
                    <label className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-colors ${whatsappRecipientType === 'driver' ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20' : 'border-slate-100 hover:bg-slate-50'}`}>
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="recipientType"
                          value="driver"
                          checked={whatsappRecipientType === 'driver'}
                          onChange={() => setWhatsappRecipientType('driver')}
                          disabled={!whatsappSelectedTrips[0]?.driver?.phone_primary}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-bold text-slate-800">
                            Driver
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            {whatsappSelectedTrips[0]?.driver 
                              ? `${whatsappSelectedTrips[0].driver.first_name} ${whatsappSelectedTrips[0].driver.last_name}`
                              : 'Unassigned'}
                          </span>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-slate-600 font-bold bg-white dark:bg-slate-900 border border-slate-200/60 px-2 py-0.5 rounded-md">
                        {whatsappSelectedTrips[0]?.driver?.phone_primary || 'No phone number'}
                      </span>
                    </label>

                    {/* Customer option */}
                    <label className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-colors ${whatsappRecipientType === 'customer' ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20' : 'border-slate-100 hover:bg-slate-50'}`}>
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="recipientType"
                          value="customer"
                          checked={whatsappRecipientType === 'customer'}
                          onChange={() => setWhatsappRecipientType('customer')}
                          disabled={!whatsappSelectedTrips[0]?.customer?.contact_phone}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-bold text-slate-800">
                            Customer
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            {whatsappSelectedTrips[0]?.customer?.name || 'Unassigned'}
                          </span>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-slate-600 font-bold bg-white dark:bg-slate-900 border border-slate-200/60 px-2 py-0.5 rounded-md">
                        {whatsappSelectedTrips[0]?.customer?.contact_phone || 'No phone number'}
                      </span>
                    </label>

                    {/* Custom number option */}
                    <label className={`flex flex-col gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition-colors ${whatsappRecipientType === 'custom' ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20' : 'border-slate-100 hover:bg-slate-50'}`}>
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="recipientType"
                          value="custom"
                          checked={whatsappRecipientType === 'custom'}
                          onChange={() => setWhatsappRecipientType('custom')}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="text-xs font-bold text-slate-800">
                          Custom Phone Number
                        </span>
                      </div>
                      
                      {whatsappRecipientType === 'custom' && (
                        <div className="pl-6 animate-slide-down">
                          <Input
                            placeholder="e.g. 966512345678"
                            value={whatsappCustomPhone}
                            onChange={(e) => setWhatsappCustomPhone(e.target.value)}
                            className="h-8 text-xs border-slate-200 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500"
                          />
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Recipient Phone Number (Optional)
                  </label>
                  <Input
                    placeholder="e.g. 966512345678 (Leave blank to select chat inside WhatsApp)"
                    value={whatsappCustomPhone}
                    onChange={(e) => setWhatsappCustomPhone(e.target.value)}
                    className="h-9 text-xs border-slate-200 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500"
                  />
                  <p className="text-[10px] text-slate-400">
                    Note: Sharing multiple trips constructs a manifest summary text.
                  </p>
                </div>
              )}

              {/* Message text preview */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Message Preview:
                </label>
                <textarea
                  value={whatsappMessageText}
                  onChange={(e) => setWhatsappMessageText(e.target.value)}
                  className="w-full h-40 p-3 rounded-xl border border-slate-200 text-xs font-medium font-sans leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-slate-50/50 resize-none"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-9 rounded-lg"
                onClick={() => setWhatsappDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="text-xs font-bold h-9 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-1.5 px-4"
                onClick={handleWhatsappSend}
              >
                <svg className="w-4 h-4 text-white fill-current" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.793 1.451 5.48.002 9.938-4.453 9.942-9.94.002-2.659-1.031-5.158-2.908-7.037C16.597 1.749 14.103.719 11.45.719 5.968.719 1.513 5.174 1.509 10.662c-.001 1.761.472 3.479 1.371 5.011L1.872 21.05l5.52-1.446c1.502.82 3.18 1.25 4.887 1.25h.008z" />
                </svg>
                Open WhatsApp
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={importDialogOpen} onOpenChange={(open) => !open && resetImportDialog()}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold flex items-center gap-2">
                <Upload className="h-4 w-4 text-brand" />
                Import Trips from CSV
              </DialogTitle>
              <DialogDescription className="text-xs">
                Bulk-create Draft trips from a spreadsheet. Route stops aren't imported — add them per trip afterward.
              </DialogDescription>
            </DialogHeader>

            <div className="py-2 space-y-3.5">
              {!importResult && (
                <>
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <div className="text-[11px] text-slate-600 leading-snug">
                      Columns: <span className="font-mono font-semibold">Customer Name</span> (required),{' '}
                      <span className="font-mono font-semibold">Driver Name</span>,{' '}
                      <span className="font-mono font-semibold">Vehicle Plate</span>,{' '}
                      <span className="font-mono font-semibold">Planned Start</span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-9 gap-1.5 text-xs font-semibold border-slate-200"
                    onClick={downloadImportTemplate}
                  >
                    <Download className="h-3.5 w-3.5 text-slate-600" />
                    Download CSV Template
                  </Button>

                  <label className="flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-slate-200 rounded-lg py-6 cursor-pointer hover:border-brand/40 hover:bg-orange-50/30 transition-colors">
                    <Upload className="h-5 w-5 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-700">
                      {importFileName || 'Click to choose a CSV file'}
                    </span>
                    <span className="text-[10px] text-slate-400">.csv up to 500 rows</span>
                    <input type="file" accept=".csv" className="hidden" onChange={handleImportFileChange} />
                  </label>

                  {importParseError && (
                    <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      {importParseError}
                    </div>
                  )}

                  {importRows.length > 0 && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-700 font-semibold">
                      {importRows.length} trip{importRows.length > 1 ? 's' : ''} ready to import from "{importFileName}".
                    </div>
                  )}
                </>
              )}

              {importResult && (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-center">
                      <div className="text-lg font-extrabold text-emerald-700">{importResult.imported}</div>
                      <div className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide">Imported</div>
                    </div>
                    <div className="flex-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-center">
                      <div className="text-lg font-extrabold text-rose-700">{importResult.failed}</div>
                      <div className="text-[10px] font-semibold text-rose-600 uppercase tracking-wide">Failed</div>
                    </div>
                  </div>

                  {importResult.failed > 0 && (
                    <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
                      {importResult.results.filter(r => !r.success).map(r => (
                        <div key={r.row} className="px-3 py-1.5 text-[11px] text-slate-600">
                          <span className="font-mono font-bold text-rose-600">Row {r.row}:</span> {r.error}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter>
              {importResult ? (
                <Button
                  size="sm"
                  className="text-xs font-bold bg-brand hover:bg-brand/90 text-white"
                  onClick={resetImportDialog}
                >
                  Done
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={resetImportDialog}
                    disabled={isImporting}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="text-xs font-bold bg-brand hover:bg-brand/90 text-white"
                    onClick={handleConfirmImport}
                    disabled={isImporting || !importRows.length}
                  >
                    {isImporting ? 'Importing...' : `Import ${importRows.length || ''} Trip${importRows.length === 1 ? '' : 's'}`}
                  </Button>
                </>
              )}
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

        <CreateTripModal
          isOpen={isCreateTripOpen}
          onClose={handleCloseCreateTrip}
        />

      </div>
    </DashboardLayout>
  );
}

