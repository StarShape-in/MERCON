import { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Edit2, FileText, FileSpreadsheet, Trash2, CheckCircle, XCircle, Send, Download, UploadCloud, Wrench,
  RotateCw, Truck, Eye, Search, Filter, LayoutGrid, List, AlertTriangle, ShieldCheck,
  Gauge,Calendar, CheckCircle2, Clock, MoreVertical, Map, Navigation, X, ChevronDown, Layers,
  ArrowDown, ArrowUp, Building2, MapPin, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight
} from 'lucide-react';
import { FleetTruck, CheckBadge, MaintenanceWrench } from '@/components/ui/kpi-icons';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MAP_THEMES } from '@/components/maps/mapThemes';
import MapThemeSelector from '@/components/maps/MapThemeSelector';
import { SAUDI_MAP_CONTAINER_PROPS } from '@/utils/saudiMapConfig';

import { downloadCSV, exportExcelTable, exportPDFTable } from '@/utils/exportUtils';
import { VEHICLE_COLUMNS } from '@/utils/importUtils';
import ExcelImportDialog from '@/components/fleet/ExcelImportDialog';
import ExportModal, { ExportColumn, ExportFilter } from '@/components/ui/ExportModal';
import { SortDropdown, SortOption } from '@/components/ui/SortDropdown';

const VEHICLE_EXPORT_COLUMNS: ExportColumn<Vehicle>[] = [
  { id: 'ref_id', label: 'Vehicle ID', accessor: (v) => v.ref_id || `TRK-${v.id.slice(0, 5).toUpperCase()}` },
  { id: 'plate_number', label: 'Plate Number', accessor: (v) => v.plate_number },
  { id: 'asset_type', label: 'Vehicle Type', accessor: (v) => v.asset_type },
  { id: 'status', label: 'Duty Status', accessor: (v) => v.status },
  { id: 'capacity_kg', label: 'Payload Capacity', accessor: (v) => v.capacity_kg ? `${v.capacity_kg / 1000} TON` : '—' },
  { id: 'current_odometer', label: 'Odometer (KM)', accessor: (v) => v.current_odometer ? `${v.current_odometer.toLocaleString()} km` : '0' },
  { id: 'assigned_driver', label: 'Assigned Driver', accessor: (v) => {
    const activeTrip = v.trips?.[0];
    const driver = v.assignedDriver || activeTrip?.driver;
    return driver ? `${driver.first_name} ${driver.last_name}` : 'Unassigned';
  }},
  { id: 'gps_device_id', label: 'GPS Device ID', accessor: (v) => v.gps_device_id || '—' },
  { id: 'icces_device_id', label: 'ICCES Device ID', accessor: (v) => v.icces_device_id || '—' },
  { id: 'trailer_number', label: 'Trailer Number', accessor: (v) => v.trailer_number || '—' },
];

const VEHICLE_EXPORT_FILTERS: ExportFilter<Vehicle>[] = [
  {
    id: 'status',
    label: 'Duty Status',
    options: [
      { label: 'All Statuses', value: 'All' },
      { label: 'Available', value: 'Available' },
      { label: 'On Trip', value: 'OnTrip' },
      { label: 'Maintenance', value: 'Maintenance' },
      { label: 'Out of Service', value: 'OutOfService' },
    ],
    filterFn: (row, val) => row.status === val,
  },
  {
    id: 'asset_type',
    label: 'Vehicle Type',
    options: [
      { label: 'All Types', value: 'All' },
      { label: '10 TON', value: '10 TON' },
      { label: '20 TON', value: '20 TON' },
      { label: '28 TON', value: '28 TON' },
      { label: 'Flatbed', value: 'Flatbed' },
      { label: 'Box Truck', value: 'Box Truck' },
      { label: 'Reefer', value: 'Reefer' },
      { label: 'Curtainsider', value: 'Curtainsider' },
      { label: 'Tanker', value: 'Tanker' },
    ],
    filterFn: (row, val) => (row.asset_type || '').toLowerCase().includes(val.toLowerCase()),
  },
];
import { notificationService } from '@/services/notificationService';
import { maintenanceService } from '@/services/maintenanceService';
import SendToWorkshopDialog from '@/components/fleet/SendToWorkshopDialog';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import DeletedBadge from '@/components/ui/DeletedBadge';
import { vehicleService, Vehicle, AssetStatus } from '@/services/vehicleService';
import { reverseGeocode } from '@/services/addressSearch';
import { getUpcomingScheduledDates } from '@/utils/scheduleUtils';
import ConfirmModal from '@/components/ui/ConfirmModal';
import BatchVehicleDocModal from '@/components/ui/BatchVehicleDocModal';
import { useDeploymentTimezone, formatInDeploymentTz } from '@/lib/datetime';

import KpiCard from '@/components/ui/KpiCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator,
  DropdownMenuLabel 
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

/** Origin → destination for an active trip, from its stops — same pickup/dropoff pattern used on the monthly board. */
function tripRoute(trip: any): { origin: string | null; destination: string | null } {
  const stops: any[] = trip?.stops || [];
  const pickup = stops.find((s) => s.stop_type === 'Pickup') ?? stops[0] ?? null;
  const dropoff = [...stops].reverse().find((s) => s.stop_type === 'Dropoff') ?? null;
  return {
    origin: pickup?.location_name || pickup?.location_address || null,
    destination: dropoff?.location_name || dropoff?.location_address || null,
  };
}

// Custom icon builder for the vehicles on the map (renders high-definition 3D Google Maps style navigation trucks)
function createVehicleMapIcon(plateNumber: string, status: string, isDarkTheme: boolean) {
  let imgFilter = '';
  let glowColor = 'rgba(100, 116, 139, 0.4)';
  let borderColor = '#94A3B8';

  // Apply status-specific CSS filters and colors to the 3D orange truck asset
  if (status === 'Available') {
    imgFilter = 'hue-rotate(200deg) saturate(1.2) brightness(0.95) drop-shadow(0 4px 6px rgba(0,0,0,0.25))';
    glowColor = 'rgba(59, 130, 246, 0.65)';
    borderColor = '#3B82F6';
  } else if (status === 'OnTrip') {
    imgFilter = 'hue-rotate(100deg) saturate(1.3) brightness(0.95) drop-shadow(0 4px 6px rgba(0,0,0,0.25))';
    glowColor = 'rgba(16, 185, 129, 0.65)';
    borderColor = '#10B981';
  } else if (status === 'Maintenance') {
    imgFilter = 'hue-rotate(335deg) saturate(2) brightness(0.85) drop-shadow(0 4px 6px rgba(0,0,0,0.25))';
    glowColor = 'rgba(220, 38, 38, 0.65)';
    borderColor = '#DC2626';
  } else {
    imgFilter = 'grayscale(100%) opacity(70%) drop-shadow(0 4px 6px rgba(0,0,0,0.2))';
    glowColor = 'rgba(148, 163, 184, 0.3)';
    borderColor = '#64748B';
  }

  const bgPod = isDarkTheme ? '#0F1017' : '#FFFFFF';
  const textPlate = isDarkTheme ? '#FFFFFF' : '#1E293B';

  const svgHtml = `
    <div style="position: relative; width: 56px; height: 56px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
      <!-- Bouncing Service Warning Popup Badge for Maintenance status -->
      ${status === 'Maintenance' ? `
        <div class="absolute animate-bounce" style="top: -12px; left: 50%; transform: translateX(-50%); z-index: 10; background-color: #DC2626; color: white; font-family: system-ui, sans-serif; font-size: 7px; font-weight: 900; padding: 1.5px 4.5px; border-radius: 3.5px; box-shadow: 0 2px 5px rgba(0,0,0,0.3); display: flex; align-items: center; gap: 1.5px; white-space: nowrap;">
          <svg xmlns="http://www.w3.org/2000/svg" width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <span>MAINTENANCE</span>
          <div style="position: absolute; bottom: -3px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 2.5px solid transparent; border-right: 2.5px solid transparent; border-top: 3.5px solid #DC2626;"></div>
        </div>
      ` : ''}

      <!-- Pulsing Aura (flashing radar ring below the 3D vehicle) -->
      ${(status === 'Available' || status === 'OnTrip') ? `<div class="animate-ping" style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background-color: ${glowColor}; opacity: 0.35; z-index: 1;"></div>` : ''}
      
      <!-- 3D Google Maps style container truck image -->
      <div style="position: relative; z-index: 2; transform: translateY(-2px); width: 44px; height: 44px;">
        <img 
          src="/truck_3d_orange_transparent.png" 
          alt="3D Truck Marker" 
          style="width: 100%; height: 100%; object-fit: contain; filter: ${imgFilter};" 
        />
      </div>

      <!-- Plate number tag -->
      <div style="position: absolute; bottom: 0px; background: ${bgPod}; color: ${textPlate}; font-family: monospace; font-size: 8px; font-weight: 800; padding: 1px 5px; border-radius: 4px; white-space: nowrap; border: 1.5px solid ${borderColor}; box-shadow: 0 2px 6px rgba(0,0,0,0.25); z-index: 3;">
        ${plateNumber}
      </div>
    </div>
  `;

  return L.divIcon({
    html: svgHtml,
    className: '',
    iconSize: [56, 56],
    iconAnchor: [28, 28],
  });
}

type VehicleSortOption = 'latest' | 'oldest' | 'plate_asc' | 'plate_desc' | 'odometer_desc' | 'odometer_asc' | 'capacity_desc' | 'status';

const VEHICLE_SORT_OPTIONS: SortOption<VehicleSortOption>[] = [
  { value: 'latest', label: 'Newest Added', icon: <ArrowDown className="w-3.5 h-3.5 text-blue-600" /> },
  { value: 'oldest', label: 'Oldest Added', icon: <ArrowUp className="w-3.5 h-3.5 text-amber-600" /> },
  { value: 'plate_asc', label: 'Plate Number (A → Z)', icon: <Truck className="w-3.5 h-3.5 text-purple-600" /> },
  { value: 'plate_desc', label: 'Plate Number (Z → A)', icon: <Truck className="w-3.5 h-3.5 text-purple-600" /> },
  { value: 'odometer_desc', label: 'Odometer (High → Low)', icon: <Gauge className="w-3.5 h-3.5 text-emerald-600" /> },
  { value: 'odometer_asc', label: 'Odometer (Low → High)', icon: <Gauge className="w-3.5 h-3.5 text-emerald-600" /> },
  { value: 'capacity_desc', label: 'Capacity (Largest First)', icon: <Layers className="w-3.5 h-3.5 text-indigo-500" /> },
  { value: 'status', label: 'Duty Status', icon: <Filter className="w-3.5 h-3.5 text-slate-500" /> },
];

export default function VehicleListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const tz = useDeploymentTimezone();

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedStatus, setSelectedStatus] = useState<AssetStatus | 'All'>('All');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<VehicleSortOption>('latest');
  const [locationSortDir, setLocationSortDir] = useState<'asc' | 'desc' | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'map'>('list');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isBatchTruckDocsOpen, setIsBatchTruckDocsOpen] = useState(false);
  const [mapThemeId, setMapThemeId] = useState<string>('voyager');
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

  // Vehicles selected for the "send to workshop" dialog (one row, or a bulk selection).
  const [workshopVehicles, setWorkshopVehicles] = useState<Vehicle[]>([]);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [selectedVehiclesForExport, setSelectedVehiclesForExport] = useState<Vehicle[]>([]);

  // Odometer quick-update popover — which row is open, and the value being typed.
  const [odometerEditId, setOdometerEditId] = useState<string | null>(null);
  const [odometerDraft, setOdometerDraft] = useState('');
  // Same update, reachable any time (not gated by the 15-day-stale icon) from
  // the row's ⋮ menu — the fix path for a mistyped reading.
  const [odometerDialogTarget, setOdometerDialogTarget] = useState<Vehicle | null>(null);

  const updateOdometerMutation = useMutation({
    mutationFn: ({ id, value }: { id: string; value: number }) =>
      vehicleService.update(id, { current_odometer: value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setOdometerEditId(null);
      setOdometerDialogTarget(null);
      toast.success('Odometer reading updated.');
    },
    onError: () => {
      toast.error('Failed to update odometer reading.');
    },
  });

  const debouncedSearch = useDebouncedValue(search, 300);

  const refreshFleet = () => {
    queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    queryClient.invalidateQueries({ queryKey: ['maintenance'] });
    // A workshop typed for the first time becomes a saved suggestion.
    queryClient.invalidateQueries({ queryKey: ['workshops'] });
  };

  /**
   * A vehicle enters the workshop by opening a service order, never by writing its status
   * directly — that is what left the Maintenance page empty for vehicles the fleet showed
   * as "Maintenance", with no order to later mark completed.
   */
  const sendToWorkshop = (vehicles: Vehicle[]) => setWorkshopVehicles(vehicles);

  const handleMaintenanceClick = async (e: React.MouseEvent, vehicle: Vehicle) => {
    e.stopPropagation();
    try {
      const res = await maintenanceService.getAll({ vehicle_id: vehicle.id, per_page: 1 });
      if (res.data && res.data.length > 0) {
        navigate(`/maintenance/${res.data[0].id}`);
      } else {
        navigate(`/maintenance?vehicle=${encodeURIComponent(vehicle.plate_number)}`);
      }
    } catch {
      navigate(`/maintenance?vehicle=${encodeURIComponent(vehicle.plate_number)}`);
    }
  };

  /** Closes the vehicles' open service orders, which releases them back to Available. */
  const returnToService = async (vehicles: Vehicle[]) => {
    try {
      const results = await Promise.all(
        vehicles.map((v) => maintenanceService.returnVehicleToService(v.id)),
      );
      const closed = results.reduce((sum, r) => sum + (r?.closed_orders ?? 0), 0);
      toast.success(
        vehicles.length === 1
          ? `${vehicles[0].plate_number} is back in service${closed ? ` — ${closed} service order(s) closed` : ''}`
          : `${vehicles.length} vehicles back in service${closed ? ` — ${closed} service order(s) closed` : ''}`,
      );
      refreshFleet();
    } catch {
      toast.error('Failed to return the vehicle to service');
    }
  };

  // Fetch vehicles using React Query. Only Map has no pagination controls of
  // its own (it plots the whole fleet on the map), so it fetches everything
  // (per_page: 1000) — List and Grid both page server-side the same way.
  const { data: vehiclesRes, isLoading, isError, error } = useQuery({
    queryKey: ['vehicles', selectedStatus, debouncedSearch, currentPage, pageSize, viewMode],
    queryFn: () => vehicleService.getAll({
      status: selectedStatus === 'All' ? undefined : selectedStatus,
      search: debouncedSearch || undefined,
      page: viewMode === 'map' ? 1 : currentPage,
      per_page: viewMode === 'map' ? 1000 : pageSize,
    }),
  });

  // Fetch overall fleet totals for KPI cards (100% independent of status/search page filters)
  const { data: kpiVehiclesRes } = useQuery({
    queryKey: ['vehicles', 'kpi-summary'],
    queryFn: () => vehicleService.getAll({ per_page: 1000 }),
  });

  const rawVehicles = vehiclesRes?.data || [];
  const totalPages = vehiclesRes?.meta?.total_pages || 1;

  // Filter vehicles client-side by asset type if selected
  const vehicles = useMemo(() => {
    let filtered = selectedType === 'All' ? rawVehicles : rawVehicles.filter(v => v.asset_type.toLowerCase().includes(selectedType.toLowerCase()));

    if (locationSortDir) {
      return [...filtered].sort((a, b) => {
        const aHas = typeof a.last_lat === 'number' && typeof a.last_lng === 'number';
        const bHas = typeof b.last_lat === 'number' && typeof b.last_lng === 'number';
        // Vehicles reporting a GPS fix always sort ahead of ones with none,
        // regardless of direction — "no signal" has no meaningful position.
        if (aHas !== bHas) return aHas ? -1 : 1;
        if (!aHas || !bHas) return 0;
        const cmp = a.last_lat! - b.last_lat! || a.last_lng! - b.last_lng!;
        return locationSortDir === 'asc' ? cmp : -cmp;
      });
    }

    return [...filtered].sort((a, b) => {
      if (sortOrder === 'plate_asc') return (a.plate_number || '').localeCompare(b.plate_number || '');
      if (sortOrder === 'plate_desc') return (b.plate_number || '').localeCompare(a.plate_number || '');
      if (sortOrder === 'odometer_desc') return (Number(b.current_odometer) || 0) - (Number(a.current_odometer) || 0);
      if (sortOrder === 'odometer_asc') return (Number(a.current_odometer) || 0) - (Number(b.current_odometer) || 0);
      if (sortOrder === 'capacity_desc') return (Number(b.capacity_kg) || 0) - (Number(a.capacity_kg) || 0);
      if (sortOrder === 'status') return (a.status || '').localeCompare(b.status || '');
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return sortOrder === 'oldest' ? dateA - dateB : dateB - dateA;
    });
  }, [rawVehicles, selectedType, sortOrder, locationSortDir]);

  // Place names for the "Current Location" column — resolved lazily, one at
  // a time, because Nominatim's free reverse endpoint caps out at ~1 req/s.
  // Only runs for the Available filter, since that's the only time this
  // column is on screen at all. Keyed the same way as reverseGeocode's own
  // cache so repeat coordinates (several trucks idle at one depot) resolve
  // once.
  const [placeNames, setPlaceNames] = useState<Record<string, string | null>>({});

  useEffect(() => {
    if (selectedStatus !== 'Available') return;

    const targets = vehicles.filter(
      (v) => typeof v.last_lat === 'number' && typeof v.last_lng === 'number'
        && Number.isFinite(v.last_lat) && Number.isFinite(v.last_lng)
    );
    const uniqueKeys = new globalThis.Map<string, { lat: number; lng: number }>();
    for (const v of targets) {
      const key = `${v.last_lat!.toFixed(4)},${v.last_lng!.toFixed(4)}`;
      if (!(key in placeNames) && !uniqueKeys.has(key)) {
        uniqueKeys.set(key, { lat: v.last_lat!, lng: v.last_lng! });
      }
    }
    if (uniqueKeys.size === 0) return;

    let cancelled = false;
    (async () => {
      for (const [key, { lat, lng }] of uniqueKeys) {
        if (cancelled) return;
        const name = await reverseGeocode(lat, lng);
        if (cancelled) return;
        setPlaceNames((prev) => ({ ...prev, [key]: name }));
        await new Promise((r) => setTimeout(r, 1100)); // stay under Nominatim's ~1 req/s cap
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStatus, vehicles]);

  // Saudi Arabia Hubs for vehicles awaiting initial GPS telematics fix
  const DEFAULT_SAUDI_HUBS = useMemo(() => [
    { lat: 24.7136, lng: 46.6753 }, // Riyadh Depot
    { lat: 21.5433, lng: 39.1728 }, // Jeddah Port
    { lat: 26.4207, lng: 50.0888 }, // Dammam Hub
    { lat: 18.3000, lng: 42.7333 }, // Khamis Sorting Center
    { lat: 27.0046, lng: 49.6596 }, // Jubail Hub
    { lat: 24.4672, lng: 39.6111 }, // Madinah Terminal
  ], []);

  /**
   * Resolves vehicle coordinates for map rendering.
   * Uses real GPS telematics if present, active trip stop coords, or deterministic hub fallback.
   */
  const mapVehiclesWithCoords = useMemo(() => {
    return vehicles.map((v) => {
      if (
        typeof v.last_lat === 'number' &&
        typeof v.last_lng === 'number' &&
        Number.isFinite(v.last_lat) &&
        Number.isFinite(v.last_lng) &&
        (v.last_lat !== 0 || v.last_lng !== 0)
      ) {
        return { vehicle: v, coords: { lat: v.last_lat, lng: v.last_lng, isEstimated: false } };
      }

      const activeStop = v.trips?.[0]?.stops?.[0];
      if (
        activeStop &&
        typeof activeStop.location_lat === 'number' &&
        typeof activeStop.location_lng === 'number' &&
        Number.isFinite(activeStop.location_lat) &&
        Number.isFinite(activeStop.location_lng) &&
        (activeStop.location_lat !== 0 || activeStop.location_lng !== 0)
      ) {
        return { vehicle: v, coords: { lat: activeStop.location_lat, lng: activeStop.location_lng, isEstimated: false } };
      }

      let hash = 0;
      const str = v.id || v.plate_number || 'mercon';
      for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
      }
      const hub = DEFAULT_SAUDI_HUBS[Math.abs(hash) % DEFAULT_SAUDI_HUBS.length];
      const latJitter = (((Math.abs(hash * 13) % 80) - 40) / 1000);
      const lngJitter = (((Math.abs(hash * 37) % 80) - 40) / 1000);

      return {
        vehicle: v,
        coords: {
          lat: hub.lat + latJitter,
          lng: hub.lng + lngJitter,
          isEstimated: true,
        },
      };
    });
  }, [vehicles, DEFAULT_SAUDI_HUBS]);

  // Telematics calculations for KPI cards (sourced from overall fleet data so KPI numbers stay fixed when filtering)
  const kpiVehicles = kpiVehiclesRes?.data || [];
  const totalCount = kpiVehiclesRes?.meta?.total || (kpiVehicles.length > 0 ? kpiVehicles.length : (vehiclesRes?.meta?.total || rawVehicles.length));
  const availableCount = kpiVehicles.length > 0
    ? kpiVehicles.filter(v => v.status === 'Available').length
    : rawVehicles.filter(v => v.status === 'Available').length;
  const onTripCount = kpiVehicles.length > 0
    ? kpiVehicles.filter(v => v.status === 'OnTrip').length
    : rawVehicles.filter(v => v.status === 'OnTrip').length;
  const maintenanceCount = kpiVehicles.length > 0
    ? kpiVehicles.filter(v => v.status === 'Maintenance').length
    : rawVehicles.filter(v => v.status === 'Maintenance').length;
  const activeCount = availableCount + onTripCount;
  const activePct = totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 100;

  const vehicleFilters = (
    <div className="flex items-center gap-3">
      {/* Status Dropdown using shadcn Select */}
      <Select
        value={selectedStatus}
        onValueChange={(val) => {
          setSelectedStatus(val as AssetStatus | 'All');
          setCurrentPage(1);
        }}
      >
        <SelectTrigger className="h-9 w-36 text-xs font-semibold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus-visible:ring-brand/20">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="All" className="text-xs font-semibold">All Statuses</SelectItem>
          <SelectItem value="Available" className="text-xs font-semibold">Available</SelectItem>
          <SelectItem value="OnTrip" className="text-xs font-semibold">On Trip</SelectItem>
          <SelectItem value="Maintenance" className="text-xs font-semibold">Maintenance</SelectItem>
          <SelectItem value="Inactive" className="text-xs font-semibold">Inactive</SelectItem>
        </SelectContent>
      </Select>

      <SortDropdown
        value={sortOrder}
        onChange={setSortOrder}
        options={VEHICLE_SORT_OPTIONS}
      />
    </div>
  );

  const gridPageSizeOptions = [10, 25, 50, 100];
  const gridFromIndex = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const gridToIndex = totalCount === 0 ? 0 : gridFromIndex + vehicles.length - 1;

  const handleExportExcel = async (rowsToExport: Vehicle[]) => {
    const headers = [
      'Vehicle ID',
      'Plate Number',
      'Vehicle Type',
      'Status',
      'Capacity (KG)',
      'Current Odometer (KM)',
      'GPS Device ID',
      'Trailer Number',
      'Assigned Driver'
    ];

    const dataRows = rowsToExport.map(row => {
      const activeTrip = row.trips?.[0];
      const driver = row.assignedDriver || activeTrip?.driver;
      const assignedDriver = driver 
        ? `${driver.first_name} ${driver.last_name}`
        : 'None';
      
      return [
        row.ref_id || `VEH-${row.id.slice(0, 5).toUpperCase()}`,
        row.plate_number,
        row.asset_type,
        row.status,
        row.capacity_kg,
        row.current_odometer,
        row.gps_device_id || 'N/A',
        row.trailer_number || 'N/A',
        assignedDriver
      ];
    });

    await exportExcelTable('MERCON Fleet Inventory', headers, dataRows, `fleet_inventory_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleExportPDF = (rowsToExport: Vehicle[]) => {
    const headers = [
      'Vehicle ID',
      'Plate Number',
      'Type',
      'Status',
      'Capacity (KG)',
      'Odometer (KM)',
      'GPS ID',
      'Assigned Driver'
    ];

    const dataRows = rowsToExport.map(row => {
      const activeTrip = row.trips?.[0];
      const driver = row.assignedDriver || activeTrip?.driver;
      const assignedDriver = driver 
        ? `${driver.first_name} ${driver.last_name}`
        : 'None';
      
      return [
        row.ref_id || `VEH-${row.id.slice(0, 5).toUpperCase()}`,
        row.plate_number,
        row.asset_type,
        row.status,
        String(row.capacity_kg ?? '-'),
        String(row.current_odometer ?? '-'),
        row.gps_device_id || 'N/A',
        assignedDriver
      ];
    });

    exportPDFTable('MERCON Fleet Inventory', headers, dataRows, `fleet_inventory_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const handleExportCSV = (rowsToExport: Vehicle[]) => {
    const data = rowsToExport.map(row => {
      const activeTrip = row.trips?.[0];
      const driver = row.assignedDriver || activeTrip?.driver;
      const assignedDriver = driver 
        ? `${driver.first_name} ${driver.last_name}`
        : 'None';
      return {
        vehicle_id: row.ref_id || `VEH-${row.id.slice(0, 5).toUpperCase()}`,
        plate_number: row.plate_number,
        vehicle_type: row.asset_type,
        status: row.status,
        capacity_kg: row.capacity_kg,
        current_odometer: row.current_odometer,
        gps_device_id: row.gps_device_id || '',
        trailer_number: row.trailer_number || '',
        assigned_driver: assignedDriver,
      };
    });
    downloadCSV(data, `fleet_inventory_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  // Table columns
  const columns = [
    {
      header: 'Vehicle ID',
      accessor: (row: Vehicle) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-xs font-extrabold text-brand block">
            {row.ref_id || `VEH-${row.id.slice(0, 6).toUpperCase()}`}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">ID: {row.id.slice(0, 6)}</span>
          {row.status === 'Maintenance' && (
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[9px] font-bold px-1.5 py-0 h-4 w-fit flex items-center gap-0.5 mt-0.5">
              <Wrench size={9} className="text-red-500" />
              IN SHOP
            </Badge>
          )}
        </div>
      ),
    },
    {
      header: 'Plate & Spec',
      accessor: (row: Vehicle) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 shrink-0">
            <Truck size={15} />
          </div>
          <div className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <span>{row.plate_number}</span>
            <Badge variant="outline" className="text-[9px] font-mono font-bold px-1.5 py-0 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              KSA
            </Badge>
          </div>
        </div>
      ),
    },
    {
      header: 'Assigned Driver',
      className: 'w-[140px] max-w-[150px]',
      headerClassName: 'w-[140px] max-w-[150px]',
      accessor: (row: Vehicle) => {
        const activeTrip = row.trips?.[0];
        const driver = row.assignedDriver || activeTrip?.driver;

        if (!driver) {
          return (
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium italic">
              Unassigned
            </span>
          );
        }

        const driverName = `${driver.first_name || ''} ${driver.last_name || ''}`.trim() || 'Assigned Driver';
        const initials = `${driver.first_name?.[0] || ''}${driver.last_name?.[0] || ''}`.toUpperCase() || 'DR';

        return (
          <div className="flex items-center gap-1.5 min-w-0 max-w-[130px]">
            <div className="w-6 h-6 rounded-full bg-indigo-50 border border-indigo-100 dark:bg-indigo-950/40 dark:border-indigo-800 flex items-center justify-center text-[9px] font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
              {initials}
            </div>
            <div className="flex flex-col min-w-0">
              <span 
                className="font-bold text-xs text-slate-800 dark:text-slate-200 hover:text-brand transition-colors cursor-pointer truncate"
                onClick={() => navigate(`/drivers/${driver.id}`)}
                title={driverName}
              >
                {driverName}
              </span>
              {driver.phone_primary && (
                <span className="text-[10px] text-slate-400 font-mono truncate" title={driver.phone_primary}>
                  {driver.phone_primary}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      header: 'Assigned Company',
      className: 'w-[150px] max-w-[160px]',
      headerClassName: 'w-[150px] max-w-[160px]',
      accessor: (row: Vehicle) => {
        const activeTrip = row.trips?.[0];
        const companyName = activeTrip?.customer?.name;
        if (!companyName) {
          return <span className="text-xs text-slate-400 dark:text-slate-500 font-medium italic">—</span>;
        }
        return (
          <div className="flex items-center gap-1.5 min-w-0 max-w-[145px]">
            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate" title={companyName}>
              {companyName}
            </span>
          </div>
        );
      },
    },
    {
      header: 'Trip Location',
      className: 'w-[170px] max-w-[180px]',
      headerClassName: 'w-[170px] max-w-[180px]',
      accessor: (row: Vehicle) => {
        const activeTrip = row.trips?.[0];
        if (!activeTrip) {
          return <span className="text-xs text-slate-400 dark:text-slate-500 font-medium italic">—</span>;
        }
        const { origin, destination } = tripRoute(activeTrip);
        if (!origin && !destination) {
          return <span className="text-xs text-slate-400 dark:text-slate-500 font-medium italic">Not set</span>;
        }
        return (
          <div className="flex items-center gap-1.5 min-w-0 max-w-[165px]" title={`${origin || '—'} → ${destination || '—'}`}>
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-xs text-slate-700 dark:text-slate-300 truncate">
              {origin || '—'} <span className="text-slate-400">→</span> {destination || '—'}
            </span>
          </div>
        );
      },
    },
    // Current Location only makes sense for vehicles actually free to look
    // up right now — spliced in below only when filtered to "Available".
    ...(selectedStatus === 'Available' ? [{
      header: (
        <button
          type="button"
          onClick={() =>
            setLocationSortDir((prev) => (prev === null ? 'desc' : prev === 'desc' ? 'asc' : null))
          }
          className="inline-flex items-center gap-1 hover:text-brand transition-colors cursor-pointer"
          title="Sort by current location"
        >
          Current Location
          {locationSortDir === 'desc' ? (
            <ArrowDown className="w-3 h-3 text-brand" />
          ) : locationSortDir === 'asc' ? (
            <ArrowUp className="w-3 h-3 text-brand" />
          ) : (
            <ArrowDown className="w-3 h-3 text-slate-300" />
          )}
        </button>
      ),
      className: 'w-[170px] max-w-[180px]',
      headerClassName: 'w-[170px] max-w-[180px]',
      accessor: (row: Vehicle) => {
        const hasFix = typeof row.last_lat === 'number' && typeof row.last_lng === 'number'
          && Number.isFinite(row.last_lat) && Number.isFinite(row.last_lng);
        if (!hasFix) {
          return <span className="text-xs text-slate-400 dark:text-slate-500 font-medium italic">No GPS signal</span>;
        }
        const coords = `${row.last_lat!.toFixed(4)}, ${row.last_lng!.toFixed(4)}`;
        const key = `${row.last_lat!.toFixed(4)},${row.last_lng!.toFixed(4)}`;
        const resolved = placeNames[key];
        // Undefined = not looked up yet, null = lookup failed — coordinates
        // are the honest fallback for both rather than a blank cell.
        const placeLabel = resolved ?? coords;
        const lastSeen = row.last_seen_at ? formatInDeploymentTz(row.last_seen_at, tz, 'MM/dd/yyyy, hh:mm a') : null;
        return (
          <div className="flex items-center gap-1.5 min-w-0 max-w-[165px]" title={lastSeen ? `${placeLabel} · Last reported ${lastSeen}` : placeLabel}>
            <Navigation className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{placeLabel}</span>
              {lastSeen && (
                <span className="text-[10px] text-slate-400 flex items-center gap-1 truncate">
                  <Clock className="w-2.5 h-2.5 shrink-0" /> {lastSeen}
                </span>
              )}
            </div>
          </div>
        );
      },
    }] : []),
    {
      header: 'Payload Capacity',
      accessor: (row: Vehicle) => {
        const tons = Math.round((row.capacity_kg || 24000) / 1000);
        const label = `${tons} TON`;
        const color = tons <= 3
          ? 'bg-amber-50 text-amber-700 border-amber-200'
          : tons <= 5
          ? 'bg-blue-50 text-blue-700 border-blue-200'
          : tons <= 10
          ? 'bg-cyan-50 text-cyan-700 border-cyan-200'
          : 'bg-emerald-50 text-emerald-700 border-emerald-200';
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase ${color}`}>
            {label}
          </span>
        );
      },
    },
    {
      header: 'Odometer Mileage',
      accessor: (row: Vehicle) => {
        const mileagePct = Math.min(100, Math.round(((row.current_odometer || 0) / 300000) * 100));
        const mileageColor = mileagePct > 80 ? 'bg-rose-500' : mileagePct > 50 ? 'bg-amber-500' : 'bg-indigo-500';
        const daysSinceUpdate = row.odometer_updated_at
          ? Math.floor((Date.now() - new Date(row.odometer_updated_at).getTime()) / 86_400_000)
          : Infinity;
        const isStale = daysSinceUpdate >= 15;
        const isEditing = odometerEditId === row.id;

        return (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <div className="space-y-1">
              <span className="text-xs text-slate-700 dark:text-slate-300 font-mono font-bold block">
                {(row.current_odometer || 0).toLocaleString()} km
              </span>
              <div className="w-20 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full transition-all duration-300", mileageColor)} style={{ width: `${mileagePct}%` }} />
              </div>
            </div>

            {isStale && (
              <Popover
                open={isEditing}
                onOpenChange={(open) => {
                  if (open) {
                    setOdometerEditId(row.id);
                    setOdometerDraft(row.current_odometer ? String(row.current_odometer) : '');
                  } else {
                    setOdometerEditId(null);
                  }
                }}
              >
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    title={
                      row.odometer_updated_at
                        ? `Odometer reading is ${daysSinceUpdate} days old — click to update`
                        : 'Odometer reading has never been recorded — click to update'
                    }
                    className="shrink-0 w-6 h-6 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-600 flex items-center justify-center hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-56 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl z-[9999]">
                  <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Update odometer reading
                  </p>
                  <Input
                    type="number"
                    min={0}
                    value={odometerDraft}
                    onChange={(e) => setOdometerDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return;
                      e.preventDefault();
                      // Otherwise this bubbles to the table row's own Enter
                      // handler, which treats it as "open this vehicle" and
                      // navigates away.
                      e.stopPropagation();
                      const value = Number(odometerDraft);
                      if (!odometerDraft || !Number.isFinite(value) || value < 0) return;
                      updateOdometerMutation.mutate({ id: row.id, value });
                    }}
                    placeholder="Odometer (km)"
                    className="h-8 text-xs mb-2"
                    autoFocus
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={!odometerDraft || updateOdometerMutation.isPending}
                    onClick={() => {
                      const value = Number(odometerDraft);
                      if (!Number.isFinite(value) || value < 0) return;
                      updateOdometerMutation.mutate({ id: row.id, value });
                    }}
                    className="h-8 w-full text-xs font-bold bg-brand hover:bg-[#d03c0b] text-white"
                  >
                    {updateOdometerMutation.isPending ? 'Saving...' : 'Save'}
                  </Button>
                </PopoverContent>
              </Popover>
            )}
          </div>
        );
      },
    },
    {
      header: 'Status',
      className: 'w-[180px]',
      headerClassName: 'w-[180px]',
      accessor: (row: Vehicle) => {
        const isMaintenance = row.status === 'Maintenance';
        const maint = row.active_maintenance;
        const fmtDate = (d: string) => formatInDeploymentTz(d, tz, 'dd MMM');
        const dateRange = maint
          ? maint.end_date
            ? `${fmtDate(maint.start_date)} → ${fmtDate(maint.end_date)}`
            : `From ${fmtDate(maint.start_date)}`
          : null;
        return (
          <div onClick={(e) => e.stopPropagation()}>
            {isMaintenance ? (
              <button
                type="button"
                onClick={(e) => handleMaintenanceClick(e, row)}
                className="group flex flex-col items-start gap-0.5 focus:outline-none rounded-lg transition-all hover:bg-amber-50 dark:hover:bg-amber-950/30 px-1 py-0.5 cursor-pointer"
                title="Click to view maintenance details"
              >
                <StatusBadge status={row.status} />
                {dateRange && (
                  <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 ml-0.5 flex items-center gap-0.5">
                    <Calendar className="w-2.5 h-2.5" />
                    {dateRange}
                  </span>
                )}
              </button>
            ) : (
              <div className="flex flex-col items-start gap-0.5">
                <StatusBadge status={row.status} />
                {maint && maint.status === 'Scheduled' && (
                  <span className="text-[10px] font-semibold text-amber-500 dark:text-amber-400 ml-0.5 flex items-center gap-0.5" title={`Scheduled maintenance: ${maint.workshop_name}`}>
                    <Wrench className="w-2.5 h-2.5" />
                    Maint. {fmtDate(maint.start_date)}
                  </span>
                )}
              </div>
            )}
          </div>
        );
      },
    },
    {
      header: 'Scheduled Days',
      accessor: (row: Vehicle) => {
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
                <Calendar className="w-2.5 h-2.5 text-indigo-500" />
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
      accessor: (row: Vehicle) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>


          {/* Workshop toggle — one click, deliberately outside the ⋮ menu since it is the
              action operators reach for most on this page. */}
          {row.status === 'Maintenance' ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => handleMaintenanceClick(e, row)}
              className="h-8 px-2 gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 text-[11px] font-bold"
              title="Click to view maintenance details"
            >
              <Wrench size={14} />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => sendToWorkshop([row])}
              className="h-8 px-2 gap-1 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-[11px] font-bold"
              title="Open a service order and move this vehicle into Maintenance"
            >
              <Wrench size={14} />
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900">
                <MoreVertical size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="text-[10px] font-bold uppercase text-slate-400">Asset Options</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => navigate(`/vehicles/${row.id}`)} className="text-xs font-semibold">
                <Eye size={13} className="mr-2 text-indigo-500" /> View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`/vehicles/${row.id}/edit`)} className="text-xs font-semibold">
                <Edit2 size={13} className="mr-2 text-slate-500" /> Edit Vehicle
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`/vehicles/${row.id}/documents`)} className="text-xs font-semibold">
                <FileText size={13} className="mr-2 text-slate-500" /> Documents Vault
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setOdometerDialogTarget(row);
                  setOdometerDraft((row.current_odometer ?? 0).toString());
                }}
                className="text-xs font-semibold"
              >
                <Gauge size={13} className="mr-2 text-indigo-500" /> Update Odometer
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[10px] font-bold uppercase text-slate-400">Status Control</DropdownMenuLabel>
              {row.status === 'Maintenance' ? (
                <DropdownMenuItem
                  onClick={(e) => handleMaintenanceClick(e as unknown as React.MouseEvent, row)}
                  className="text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-950/30 hover:bg-red-100/80"
                >
                  <Wrench size={13} className="mr-2 text-red-500" /> In Maintenance
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={() => sendToWorkshop([row])}
                  className="text-xs font-semibold text-amber-600 dark:text-amber-400"
                >
                  <Wrench size={13} className="mr-2 text-amber-500" /> Send to Workshop
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => navigate(`/maintenance?vehicle=${encodeURIComponent(row.plate_number)}`)}
                className="text-xs font-semibold"
              >
                <FileText size={13} className="mr-2 text-slate-500" /> Service History
              </DropdownMenuItem>
              {row.status !== 'Inactive' && (
                <DropdownMenuItem 
                  onClick={async () => {
                    try {
                      await vehicleService.bulkUpdateStatus([row.id], 'Inactive');
                      toast.success(`Vehicle ${row.plate_number} marked Inactive`);
                      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
                    } catch {
                      toast.error('Failed to update status');
                    }
                  }} 
                  className="text-xs font-semibold text-rose-600 dark:text-rose-400"
                >
                  <XCircle size={13} className="mr-2 text-rose-500" /> Mark Inactive
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={async () => {
                  let message = `Are you sure you want to delete vehicle ${row.plate_number}?`;
                  try {
                    const usage = await vehicleService.getUsage(row.id);
                    const parts: string[] = [];
                    if (usage.totalTrips > 0) parts.push(`${usage.totalTrips} trip${usage.totalTrips === 1 ? '' : 's'}${usage.activeTrips > 0 ? ` (${usage.activeTrips} active)` : ''}`);
                    if (usage.maintenanceRecords > 0) parts.push(`${usage.maintenanceRecords} maintenance record${usage.maintenanceRecords === 1 ? '' : 's'}`);
                    if (usage.expenses > 0) parts.push(`${usage.expenses} expense${usage.expenses === 1 ? '' : 's'}`);
                    message = parts.length > 0
                      ? `${row.plate_number} has ${parts.join(' and ')} linked to it. Deleting archives it — history will keep showing it, marked as Deleted.`
                      : `${row.plate_number} has no linked trips or records. This will archive it.`;
                  } catch {
                    // Usage lookup failed — fall back to the generic prompt below rather than blocking the delete flow.
                  }
                  setConfirmModal({
                    isOpen: true,
                    title: 'Delete Vehicle Record',
                    message,
                    isDestructive: true,
                    onConfirm: async () => {
                      try {
                        await vehicleService.bulkDelete([row.id]);
                        toast.success(`Vehicle ${row.plate_number} deleted successfully`);
                        queryClient.invalidateQueries({ queryKey: ['vehicles'] });
                      } catch (err: any) {
                        toast.error(err?.response?.data?.error?.message || 'Failed to delete vehicle');
                      }
                    }
                  });
                }}
                className="text-xs font-semibold text-rose-600 dark:text-rose-400 cursor-pointer"
              >
                <Trash2 size={13} className="mr-2 text-rose-500" /> Delete Vehicle
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  // Bulk Actions
  const bulkActions = [
    {
      label: 'Edit Selected Vehicle',
      icon: <Edit2 size={13} />,
      variant: 'primary' as const,
      onClick: (selectedRows: Vehicle[]) => {
        if (selectedRows.length > 0) {
          navigate(`/vehicles/${selectedRows[0].id}/edit`);
        }
      }
    },

    {
      label: 'Send to Workshop',
      icon: <Wrench size={13} />,
      variant: 'secondary' as const,
      onClick: (selectedRows: Vehicle[]) => sendToWorkshop(selectedRows),
    },
    {
      label: 'Mark Inactive',
      icon: <XCircle size={13} />,
      variant: 'secondary' as const,
      onClick: (selectedRows: Vehicle[]) => {
        setConfirmModal({
          isOpen: true,
          title: 'Mark Vehicles as Inactive',
          message: `Are you sure you want to mark ${selectedRows.length} vehicles as Inactive?`,
          isDestructive: false,
          onConfirm: async () => {
            try {
              await vehicleService.bulkUpdateStatus(selectedRows.map(r => r.id), 'Inactive');
              queryClient.invalidateQueries({ queryKey: ['vehicles'] });
            } catch (e) { toast.error('Failed to update status'); }
          }
        });
      }
    },
    {
      label: 'Send SMS',
      icon: <Send size={13} />,
      variant: 'secondary' as const,
      onClick: async (selectedRows: Vehicle[]) => {
        const msg = prompt('Enter dispatch SMS message to drivers of selected vehicles:');
        if (!msg) return;
        try {
          await notificationService.sendBulkCommunication({
            entity_type: 'Vehicle',
            ids: selectedRows.map(r => r.id),
            method: 'sms',
            subject: 'Vehicle Alert',
            message: msg
          });
          toast.success('Dispatch SMS queued successfully.');
        } catch (e) { toast.error('Failed to send messages'); }
      }
    },
    {
      label: 'Export Documents',
      icon: <Download size={13} />,
      variant: 'secondary' as const,
      onClick: (selectedRows: Vehicle[]) => {
        setSelectedVehiclesForExport(selectedRows);
        setIsExportOpen(true);
      }
    },
    {
      label: 'Delete',
      icon: <Trash2 size={13} />,
      variant: 'danger' as const,
      onClick: (selectedRows: Vehicle[]) => {
        setConfirmModal({
          isOpen: true,
          title: 'Delete Selected Vehicles',
          message: `Delete ${selectedRows.length} vehicles? Any with an active trip will be skipped — the rest will be archived, and history will keep showing them marked as Deleted.`,
          isDestructive: true,
          onConfirm: async () => {
            try {
              const res = await vehicleService.bulkDelete(selectedRows.map(r => r.id));
              toast.success(res?.message || 'Vehicles deleted');
              queryClient.invalidateQueries({ queryKey: ['vehicles'] });
            } catch (e: any) { toast.error(e?.response?.data?.error?.message || 'Failed to delete vehicles'); }
          }
        });
      }
    }
  ];

  return (
    <DashboardLayout active="Vehicles" title="Vehicles">
      <div className="px-4 sm:px-6 pb-6 w-full flex flex-col animate-fade-in gap-5">
        
        {/* ── Page Content Header ─────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-4 shrink-0 pb-1">
          <div className="flex items-center gap-3">
            <Truck className="w-6 h-6 text-blue-600 dark:text-blue-400 shrink-0" />

            <div className="flex flex-col">
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                  Vehicles
                </h1>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {viewMode === 'map' && (
              <MapThemeSelector
                currentThemeId={mapThemeId}
                onThemeChange={(newTheme) => setMapThemeId(newTheme)}
              />
            )}
            {/* View Mode Switcher */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200/80 dark:border-slate-700">
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'p-1.5 rounded-md transition-all text-xs flex items-center gap-1 font-semibold',
                  viewMode === 'list'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                )}
                title="List View"
              >
                <List size={14} />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'p-1.5 rounded-md transition-all text-xs flex items-center gap-1 font-semibold',
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                )}
                title="Grid View"
              >
                <LayoutGrid size={14} />
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={cn(
                  'p-1.5 rounded-md transition-all text-xs flex items-center gap-1 font-semibold',
                  viewMode === 'map'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                )}
                title="Telemetry Radar Map"
              >
                <Map size={14} />
              </button>
            </div>

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
              <DropdownMenuContent align="end" className="w-60 p-1.5 shadow-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl">
                <DropdownMenuLabel className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-2 py-1">
                  Export Data
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => handleExportExcel(vehicles)}
                  className="cursor-pointer text-xs font-semibold py-1.5 px-2 rounded-md"
                >
                  <FileSpreadsheet className="mr-2 h-3.5 w-3.5 text-emerald-600" />
                  Export Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleExportPDF(vehicles)}
                  className="cursor-pointer text-xs font-semibold py-1.5 px-2 rounded-md"
                >
                  <FileText className="mr-2 h-3.5 w-3.5 text-rose-600" />
                  Export PDF (.pdf)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleExportCSV(vehicles)}
                  className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md text-slate-600 dark:text-slate-300"
                >
                  <Download className="mr-2 h-3.5 w-3.5 text-slate-400" />
                  Export CSV (.csv)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedVehiclesForExport([]);
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
                <DropdownMenuItem
                  onClick={() => setIsBatchTruckDocsOpen(true)}
                  className="cursor-pointer text-xs font-semibold py-1.5 px-2 rounded-md text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                >
                  <Truck className="mr-2 h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                  Batch Import Trucks Docs
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              size="sm"
              className="h-9 gap-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs rounded-lg px-4"
              onClick={() => navigate('/vehicles/new')}
            >
              <Plus className="h-4 w-4" />
              Add Vehicle
            </Button>
          </div>
        </div>

        {/* ── 4 Telematics Instrument Panel Cards ───────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 shrink-0">
          
          {/* Card 1: Total Fleet Assets */}
          <KpiCard
            title="TOTAL FLEET ASSETS"
            className="kpi-tint-vehicles"
            value={
              <span>
                {totalCount}
                <span className="text-[16px] font-semibold ml-1.5 opacity-85">Vehicles</span>
              </span>
            }
            variant="blue"
            trend="up"
            trendValue={`${activePct}% Active`}
            description="Total assets in database"
            icon={FleetTruck}
            isActive={selectedStatus === 'All'}
            onClick={() => { setSelectedStatus('All'); setViewMode('list'); setCurrentPage(1); }}
            customFooter={
              <div className="relative h-9 mt-4 -mx-5 overflow-hidden rounded-b-2xl bg-slate-50/70 dark:bg-slate-900/40 border-t border-slate-200/60 dark:border-slate-800/60">
                <style>{`
                  @keyframes routeDashBrand {
                    to {
                      stroke-dashoffset: -12;
                    }
                  }
                `}</style>
                {/* Grid lines for map look */}
                <svg className="absolute inset-0 h-full w-full opacity-[0.06]" stroke="currentColor" fill="none">
                  <pattern id="card-map-grid-brand" width="12" height="12" patternUnits="userSpaceOnUse">
                    <path d="M 12 0 L 0 0 0 12" strokeWidth="0.5" />
                  </pattern>
                  <rect width="100%" height="100%" fill="url(#card-map-grid-brand)" />
                </svg>
                
                {/* Intersecting Fleet Route Network */}
                <svg className="absolute inset-0 h-full w-full opacity-[0.3]" viewBox="0 0 280 48" preserveAspectRatio="none">
                  <path d="M 60 -5 C 65 15, 55 35, 60 55" fill="none" stroke="#FDBA74" strokeWidth="1.5" />
                  <path d="M 140 -5 C 135 15, 145 35, 138 55" fill="none" stroke="#FDBA74" strokeWidth="1.5" />
                  <path d="M 210 -5 C 220 15, 205 35, 215 55" fill="none" stroke="#FDBA74" strokeWidth="1.5" />
                </svg>

                {/* Route line */}
                <svg className="absolute inset-0 h-full w-full" viewBox="0 0 280 48" preserveAspectRatio="none">
                  {/* Base grey road */}
                  <path 
                    d="M -10 24 C 70 10, 150 38, 290 24" 
                    fill="none" 
                    stroke="#D1D5DB" 
                    strokeWidth="3.5" 
                    strokeLinecap="round"
                  />
                  {/* Orange brand route progress */}
                  <path 
                    d="M -10 24 C 70 10, 150 38, 290 24" 
                    fill="none" 
                    stroke="var(--color-brand)" 
                    strokeWidth="3" 
                    strokeDasharray="6,6"
                    strokeLinecap="round"
                    style={{ animation: 'routeDashBrand 4s linear infinite' }}
                  />
                </svg>

                {/* Start Pin */}
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center">
                  <div className="h-2 w-2 rounded-full bg-orange-500 ring-4 ring-orange-500/20" />
                </div>

                {/* Truck 1: Pulsing Active Orange Truck (Available) */}
                <div 
                  className="absolute"
                  style={{
                    left: '28%',
                    top: '35%',
                    transform: 'translate(-50%, -50%) scale(0.55)',
                    zIndex: 10
                  }}
                >
                  <div className="relative flex items-center justify-center">
                    <div className="absolute h-8 w-8 rounded-full bg-orange-500/25 animate-ping" />
                    <img 
                      src="/truck_3d_orange_transparent.png" 
                      alt="Active Truck 1" 
                      className="h-9 w-9 object-contain"
                    />
                  </div>
                </div>

                {/* Truck 2: Pulsing Active Green Truck (On Trip) */}
                <div 
                  className="absolute"
                  style={{
                    left: '72%',
                    top: '60%',
                    transform: 'translate(-50%, -50%) scale(0.55)',
                    zIndex: 10
                  }}
                >
                  <div className="relative flex items-center justify-center">
                    <div className="absolute h-8 w-8 rounded-full bg-emerald-500/25 animate-ping" />
                    <img 
                      src="/truck_3d_orange_transparent.png" 
                      alt="Active Truck 2" 
                      className="h-9 w-9 object-contain"
                      style={{ filter: 'hue-rotate(100deg) saturate(1.3) brightness(0.95)' }}
                    />
                  </div>
                </div>
              </div>
            }
          />

          {/* Card 2: Dispatch Ready */}
          <KpiCard
            title="DISPATCH READY"
            className="kpi-tint-vehicles"
            value={
              <span>
                {availableCount}
                <span className="text-[16px] font-semibold ml-1.5 opacity-85">Ready</span>
              </span>
            }
            variant="blue"
            trend="up"
            trendValue={`${availableCount} Available`}
            description="Ready for operational trip"
            icon={CheckBadge}
            isActive={selectedStatus === 'Available'}
            onClick={() => { setSelectedStatus('Available'); setViewMode('list'); setCurrentPage(1); }}
            customFooter={
              <div className="relative h-9 mt-4 -mx-5 overflow-hidden rounded-b-2xl bg-[#F0F6FF] dark:bg-[#1E3A8A]/10 border-t border-blue-500/10">
                <style>{`
                  @keyframes routeDashBlue {
                    to {
                      stroke-dashoffset: -12;
                    }
                  }
                `}</style>
                {/* Grid lines for map look */}
                <svg className="absolute inset-0 h-full w-full opacity-[0.06]" stroke="currentColor" fill="none">
                  <pattern id="card-map-grid-blue" width="12" height="12" patternUnits="userSpaceOnUse">
                    <path d="M 12 0 L 0 0 0 12" strokeWidth="0.5" />
                  </pattern>
                  <rect width="100%" height="100%" fill="url(#card-map-grid-blue)" />
                </svg>
                
                {/* Stylized Intersecting Street Map Network */}
                <svg className="absolute inset-0 h-full w-full opacity-[0.3]" viewBox="0 0 280 48" preserveAspectRatio="none">
                  <path d="M 60 -5 C 65 15, 55 35, 60 55" fill="none" stroke="#93C5FD" strokeWidth="1.5" />
                  <path d="M 140 -5 C 135 15, 145 35, 138 55" fill="none" stroke="#93C5FD" strokeWidth="1.5" />
                  <path d="M 210 -5 C 220 15, 205 35, 215 55" fill="none" stroke="#93C5FD" strokeWidth="1.5" />
                </svg>

                {/* Route line */}
                <svg className="absolute inset-0 h-full w-full" viewBox="0 0 280 48" preserveAspectRatio="none">
                  {/* Base grey road */}
                  <path 
                    d="M -10 24 C 70 10, 150 38, 290 24" 
                    fill="none" 
                    stroke="#D1D5DB" 
                    strokeWidth="3.5" 
                    strokeLinecap="round"
                  />
                  {/* Blue active route progress */}
                  <path 
                    d="M -10 24 C 70 10, 150 38, 290 24" 
                    fill="none" 
                    stroke="#3B82F6" 
                    strokeWidth="3" 
                    strokeDasharray="6,6"
                    strokeLinecap="round"
                    style={{ animation: 'routeDashBlue 4s linear infinite' }}
                  />
                </svg>

                {/* Origin Pin */}
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center">
                  <div className="h-2 w-2 rounded-full bg-blue-500 ring-4 ring-blue-500/20" />
                </div>
                
                {/* The 3D Truck sitting in the middle of the route */}
                <div 
                  className="absolute"
                  style={{
                    left: '52%',
                    top: '50%',
                    transform: 'translate(-50%, -50%) scale(0.68)',
                    zIndex: 10
                  }}
                >
                  <div className="relative flex items-center justify-center">
                    {/* Pulsing glow under the truck */}
                    <div className="absolute h-8 w-8 rounded-full bg-blue-500/30 animate-ping" />
                    <img 
                      src="/truck_3d_orange_transparent.png" 
                      alt="Mini Map Truck" 
                      className="h-9 w-9 object-contain"
                      style={{ filter: 'hue-rotate(200deg) saturate(1.2) brightness(0.95)' }}
                    />
                  </div>
                </div>
              </div>
            }
          />

          {/* Card 3: Maintenance Bay */}
          <KpiCard
            title="MAINTENANCE BAY"
            className="kpi-tint-vehicles"
            value={
              <span>
                {maintenanceCount}
                <span className="text-[16px] font-semibold ml-1.5 opacity-85">In Shop</span>
              </span>
            }
            variant="rose"
            trend={maintenanceCount > 3 ? 'up' : 'down'}
            trendValue={maintenanceCount > 0 ? 'Service Active' : 'All Clear'}
            description="Active servicing units"
            icon={MaintenanceWrench}
            isActive={selectedStatus === 'Maintenance'}
            onClick={() => { setSelectedStatus('Maintenance'); setViewMode('list'); setCurrentPage(1); }}
            customFooter={
              <div className="relative h-9 mt-4 -mx-5 overflow-hidden rounded-b-2xl bg-[#FFF5F5] dark:bg-[#DC2626]/10 border-t border-red-500/10">
                <style>{`
                  @keyframes routeDashRed {
                    to {
                      stroke-dashoffset: -12;
                    }
                  }
                `}</style>
                {/* Grid lines for map look */}
                <svg className="absolute inset-0 h-full w-full opacity-[0.06]" stroke="currentColor" fill="none">
                  <pattern id="card-map-grid-red" width="12" height="12" patternUnits="userSpaceOnUse">
                    <path d="M 12 0 L 0 0 0 12" strokeWidth="0.5" />
                  </pattern>
                  <rect width="100%" height="100%" fill="url(#card-map-grid-red)" />
                </svg>
                
                {/* Stylized Intersecting Street Map Network */}
                <svg className="absolute inset-0 h-full w-full opacity-[0.3]" viewBox="0 0 280 48" preserveAspectRatio="none">
                  <path d="M 45 -5 C 50 15, 40 35, 45 55" fill="none" stroke="#FECACA" strokeWidth="1.5" />
                  <path d="M 115 -5 C 110 15, 120 35, 113 55" fill="none" stroke="#FECACA" strokeWidth="1.5" />
                  <path d="M 180 -5 C 190 15, 175 35, 185 55" fill="none" stroke="#FECACA" strokeWidth="1.5" />
                </svg>

                {/* Route line */}
                <svg className="absolute inset-0 h-full w-full" viewBox="0 0 280 48" preserveAspectRatio="none">
                  {/* Base grey road */}
                  <path 
                    d="M -10 24 C 70 10, 150 38, 290 24" 
                    fill="none" 
                    stroke="#D1D5DB" 
                    strokeWidth="3.5" 
                    strokeLinecap="round"
                  />
                  {/* Red active route progress */}
                  <path 
                    d="M -10 24 C 70 10, 150 38, 290 24" 
                    fill="none" 
                    stroke="#DC2626" 
                    strokeWidth="3" 
                    strokeDasharray="6,6"
                    strokeLinecap="round"
                    style={{ animation: 'routeDashRed 4s linear infinite' }}
                  />
                </svg>

                {/* Bay Entry Pin */}
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center">
                  <div className="h-2 w-2 rounded-full bg-red-500 ring-4 ring-red-500/20" />
                </div>
                
                {/* The 3D Truck sitting in the middle of the route */}
                <div 
                  className="absolute"
                  style={{
                    left: '52%',
                    top: '50%',
                    transform: 'translate(-50%, -50%) scale(0.68)',
                    zIndex: 10
                  }}
                >
                  <div className="relative flex items-center justify-center">
                    {/* Bouncing Warning Popup Badge */}
                    <div 
                      className="absolute bottom-[18px] bg-red-600 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded-md shadow-md flex items-center gap-1 animate-bounce"
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                      <span>MAINTENANCE</span>
                      {/* Arrow */}
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-t-[4px] border-t-red-600" />
                    </div>

                    {/* Glow ring */}
                    <div className="absolute h-8 w-8 rounded-full bg-red-500/20" />
                    
                    {/* Desaturated red truck to indicate servicing status */}
                    <img 
                      src="/truck_3d_orange_transparent.png" 
                      alt="Servicing Truck" 
                      className="h-9 w-9 object-contain"
                      style={{ filter: 'hue-rotate(335deg) saturate(0.8) brightness(0.9)' }}
                    />
                  </div>
                </div>
              </div>
            }
          />

          {/* Card 4: Active On Trips */}
          <KpiCard
            title="ACTIVE ON TRIPS"
            className="kpi-tint-vehicles"
            value={
              <span>
                {onTripCount}
                <span className="text-[16px] font-semibold ml-1.5 opacity-85">En Route</span>
              </span>
            }
            variant="emerald"
            trend={onTripCount > 0 ? 'up' : 'neutral'}
            trendValue={`${onTripCount} En Route`}
            description="Currently dispatched on active trips"
            icon={Truck}
            isActive={selectedStatus === 'OnTrip'}
            onClick={() => { setSelectedStatus('OnTrip'); setViewMode('list'); setCurrentPage(1); }}
            customFooter={
              <div className="relative h-9 mt-4 -mx-5 overflow-hidden rounded-b-2xl bg-[#E8F5E9] dark:bg-[#1B5E20]/15 border-t border-emerald-500/10">
                <style>{`
                  @keyframes routeDash {
                    to {
                      stroke-dashoffset: -12;
                    }
                  }
                `}</style>
                {/* Grid lines for map look */}
                <svg className="absolute inset-0 h-full w-full opacity-[0.08]" stroke="currentColor" fill="none">
                  <pattern id="card-map-grid" width="12" height="12" patternUnits="userSpaceOnUse">
                    <path d="M 12 0 L 0 0 0 12" strokeWidth="0.5" />
                  </pattern>
                  <rect width="100%" height="100%" fill="url(#card-map-grid)" />
                </svg>
                
                {/* Stylized Intersecting Street Map Network */}
                <svg className="absolute inset-0 h-full w-full opacity-[0.4]" viewBox="0 0 280 48" preserveAspectRatio="none">
                  <path d="M 60 -5 C 65 15, 55 35, 60 55" fill="none" stroke="#A7F3D0" strokeWidth="1.5" />
                  <path d="M 140 -5 C 135 15, 145 35, 138 55" fill="none" stroke="#A7F3D0" strokeWidth="1.5" />
                  <path d="M 210 -5 C 220 15, 205 35, 215 55" fill="none" stroke="#A7F3D0" strokeWidth="1.5" />
                </svg>

                {/* Route line */}
                <svg className="absolute inset-0 h-full w-full" viewBox="0 0 280 48" preserveAspectRatio="none">
                  {/* Base grey road */}
                  <path 
                    d="M -10 24 C 70 10, 150 38, 290 24" 
                    fill="none" 
                    stroke="#D1D5DB" 
                    strokeWidth="3.5" 
                    strokeLinecap="round"
                  />
                  {/* Green active route progress */}
                  <path 
                    d="M -10 24 C 70 10, 150 38, 290 24" 
                    fill="none" 
                    stroke="#10B981" 
                    strokeWidth="3" 
                    strokeDasharray="6,6"
                    strokeLinecap="round"
                    style={{ animation: 'routeDash 4s linear infinite' }}
                  />
                </svg>

                {/* Start Pin */}
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
                </div>
                
                {/* The 3D Truck sitting in the middle of the route */}
                <div 
                  className="absolute"
                  style={{
                    left: '52%',
                    top: '50%',
                    transform: 'translate(-50%, -50%) scale(0.68)',
                    zIndex: 10
                  }}
                >
                  <div className="relative flex items-center justify-center">
                    {/* Glow ring */}
                    <div className="absolute h-8 w-8 rounded-full bg-emerald-500/20 animate-ping" />
                    
                    {/* Green tinted truck to indicate active status */}
                    <img 
                      src="/truck_3d_orange_transparent.png" 
                      alt="En Route Truck" 
                      className="h-9 w-9 object-contain"
                      style={{ filter: 'hue-rotate(100deg) saturate(1.3) brightness(0.95)' }}
                    />
                  </div>
                </div>
              </div>
            }
          />
        </div>

        {/* ── View Content (List vs Grid vs Map) ───────────────────────────── */}
        {viewMode === 'list' && (
          <div className="w-full flex flex-col">
            <DataTable
              title={
                <span className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-blue-500" />
                  <span>Fleet Vehicle Ledger</span>
                </span>
              }
              columns={columns}
              data={vehicles}
              sortAccessor={(row: Vehicle) => row.createdAt}
              bulkActions={bulkActions}
              enableSelection={true}
              compact={true}
              isLoading={isLoading}
              isError={isError}
              errorMessage={(error as Error)?.message || 'Failed to load fleet vehicles.'}
              searchPlaceholder="Search by plate number, ref ID, or asset type..."
              searchValue={search}
              onSearchChange={(val) => {
                setSearch(val);
                setCurrentPage(1);
              }}
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
              totalRecords={totalCount}
              onPageChange={setCurrentPage}
              onRowClick={(row) => navigate(`/vehicles/${row.id}`)}
              filterElement={vehicleFilters}
            />
          </div>
        )}

        {viewMode === 'grid' && (
          /* GRID VIEW MODE */
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col w-full animate-fade-in">
            {/* Toolbar: matches the list view's search bar & filters, placed above the grid */}
            <div className="shrink-0 p-3 sm:p-4 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 flex flex-col gap-3">
              <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3 w-full">
                <div className="flex items-center gap-2.5 sm:gap-3 flex-1 flex-wrap min-w-0">
                  <div className="flex items-center gap-2 shrink-0">
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                      <Truck className="w-4 h-4 text-blue-500" />
                      <span>Fleet Vehicle Ledger</span>
                    </h3>
                    <Badge variant="outline" className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 text-[11px] font-mono font-bold px-2 py-0.5">
                      {totalCount} {totalCount === 1 ? 'record' : 'records'}
                    </Badge>
                  </div>

                  <div className="relative w-full sm:w-72 lg:w-88 shrink-0">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="text"
                      placeholder="Search by plate number, ref ID, or asset type..."
                      value={search}
                      onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                      className="w-full pl-8.5 pr-8 h-9 text-xs bg-white dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-700 focus-visible:ring-brand/20 focus-visible:border-brand rounded-md font-medium"
                      aria-label="Search Vehicles"
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
                  {vehicleFilters}
                </div>
              </div>
            </div>

            {/* Grid Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 p-4 sm:p-5">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 h-[200px] skeleton"></div>
              ))
            ) : isError ? (
              <div className="col-span-full py-16 flex flex-col items-center justify-center">
                <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 mb-2">
                  <XCircle size={28} />
                </div>
                <p className="text-sm font-bold text-slate-900">Data Unavailable</p>
                <p className="text-xs text-slate-500 mt-1">{(error as Error)?.message || 'Failed to load vehicles.'}</p>
              </div>
            ) : vehicles.length === 0 ? (
              <div className="col-span-full py-16 flex flex-col items-center justify-center">
                <p className="text-sm font-bold text-slate-900">No Records Found</p>
                <p className="text-xs text-slate-500 mt-1">There are no vehicles matching your filters.</p>
              </div>
            ) : vehicles.map((v) => (
              <Card
                key={v.id}
                className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs hover:shadow-xs hover:border-brand/45 hover:-translate-y-0.5 transition-all duration-150 ease-in-out bg-white dark:bg-slate-900 flex flex-col justify-between outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
                tabIndex={0}
                role="button"
                aria-label={`Vehicle plate ${v.plate_number}, type ${v.asset_type}, status ${v.status}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(`/vehicles/${v.id}`);
                  }
                }}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Truck className="w-5 h-5 text-orange-500 dark:text-orange-400 shrink-0" />
                    {v.status === 'Maintenance' ? (
                      <button
                        type="button"
                        onClick={(e) => handleMaintenanceClick(e, v)}
                        className="cursor-pointer transition-transform hover:scale-105"
                        title="Click to view maintenance details"
                      >
                        <StatusBadge status={v.status} />
                      </button>
                    ) : (
                      <StatusBadge status={v.status} />
                    )}
                  </div>

                  <div>
                    <h4 
                      onClick={() => navigate(`/vehicles/${v.id}`)}
                      className="font-extrabold text-sm text-slate-950 dark:text-slate-50 hover:text-brand cursor-pointer truncate"
                    >
                      {v.plate_number}
                    </h4>
                    <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                      {v.ref_id || `VEH-${v.id.slice(0, 6).toUpperCase()}`}{v.asset_type ? ` • ${v.asset_type}` : ''}
                    </p>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1.5 text-[11px]">
                    <div className="flex justify-between text-slate-500">
                      <span>Assigned Driver:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        {v.assignedDriver ? `${v.assignedDriver.first_name} ${v.assignedDriver.last_name}` : (v.trips?.[0]?.driver ? `${v.trips[0].driver.first_name} ${v.trips[0].driver.last_name}` : 'Unassigned')}
                        {v.assignedDriver?.deletedAt && <DeletedBadge />}
                      </span>
                    </div>
                    {v.capacity_kg ? (
                      <div className="flex justify-between items-center text-slate-500">
                        <span>Payload Capacity:</span>
                        {(() => {
                          const tons = Math.round(v.capacity_kg / 1000);
                          const color = tons <= 3
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : tons <= 5
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : tons <= 10
                            ? 'bg-cyan-50 text-cyan-700 border-cyan-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200';
                          return (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase ${color}`}>
                              {tons} TON
                            </span>
                          );
                        })()}
                      </div>
                    ) : null}
                    <div className="flex justify-between text-slate-500">
                      <span>Odometer:</span>
                      <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{(v.current_odometer ?? 0).toLocaleString()} km</span>
                    </div>
                  </div>
                </CardContent>

                <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/vehicles/${v.id}`)}
                    className="h-7 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-brand gap-1"
                  >
                    <Eye size={13} /> Details
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/vehicles/${v.id}/edit`)}
                    className="h-7 text-xs font-semibold border-slate-200 dark:border-slate-700"
                  >
                    <Edit2 size={13} className="mr-1" /> Edit
                  </Button>
                </div>
              </Card>
            ))}
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

        {viewMode === 'map' && (
          /* MAP VIEW MODE */
          <div className="h-[550px] rounded-[24px] overflow-hidden border border-slate-200 dark:border-slate-800 relative shadow-md" style={{ background: MAP_THEMES[mapThemeId]?.previewColor || '#F4F5F7' }}>
            <MapContainer
              center={SAUDI_MAP_CONTAINER_PROPS.center}
              zoom={SAUDI_MAP_CONTAINER_PROPS.zoom}
              minZoom={SAUDI_MAP_CONTAINER_PROPS.minZoom}
              maxZoom={SAUDI_MAP_CONTAINER_PROPS.maxZoom}
              maxBounds={SAUDI_MAP_CONTAINER_PROPS.maxBounds}
              maxBoundsViscosity={SAUDI_MAP_CONTAINER_PROPS.maxBoundsViscosity}
              scrollWheelZoom={true}
              style={{ height: '100%', width: '100%', zIndex: 0 }}
            >
              <TileLayer
                key={mapThemeId}
                attribution={MAP_THEMES[mapThemeId]?.attribution || MAP_THEMES.voyager.attribution}
                url={MAP_THEMES[mapThemeId]?.url || MAP_THEMES.voyager.url}
              />

              {mapVehiclesWithCoords.map(({ vehicle: v, coords }) => {
                return (
                  <Marker
                    key={v.id}
                    position={[coords.lat, coords.lng]}
                    icon={createVehicleMapIcon(v.plate_number, v.status, MAP_THEMES[mapThemeId]?.isDark || false)}
                  >
                    <Popup maxWidth={320}>
                      <div className="p-2 space-y-3 font-sans">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-2">
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{v.ref_id || 'VEH-UNIT'}</span>
                            <p className="text-base font-black leading-tight mt-0.5">{v.plate_number}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge className={cn(
                              "font-bold text-[10px] uppercase border px-2 py-0.5",
                              v.status === 'Available' && "bg-emerald-50 text-emerald-700 border-emerald-200",
                              v.status === 'OnTrip' && "bg-blue-50 text-blue-700 border-blue-200",
                              v.status === 'Maintenance' && "bg-red-50 text-red-700 border-red-200",
                              v.status === 'Inactive' && "bg-slate-100 text-slate-700 border-slate-200"
                            )}>
                              {v.status}
                            </Badge>
                            {coords.isEstimated && (
                              <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200">
                                Hub Standby
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-slate-50 dark:bg-white/5 p-2 rounded-lg border border-slate-100 dark:border-white/5">
                            <p className="text-[9px] text-slate-400 font-bold uppercase">Asset Type</p>
                            <p className="font-bold truncate">{v.asset_type}</p>
                          </div>
                          <div className="bg-slate-50 dark:bg-white/5 p-2 rounded-lg border border-slate-100 dark:border-white/5">
                            <p className="text-[9px] text-slate-400 font-bold uppercase">Odometer</p>
                            <p className="font-bold text-slate-700 dark:text-slate-200">
                              {(v.current_odometer || 0).toLocaleString()} km
                            </p>
                          </div>
                        </div>

                        {v.trailer_number && (
                          <div className="text-xs bg-slate-50 dark:bg-white/5 p-2.5 rounded-lg border border-slate-100 dark:border-white/5">
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Trailer Info</p>
                            <p className="font-semibold mt-0.5">No: {v.trailer_number} ({v.trailer_type || 'Flatbed'})</p>
                          </div>
                        )}

                        <div className="pt-1 flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/vehicles/${v.id}`)}
                            className="flex-1 h-8 text-xs font-bold gap-1"
                          >
                            <Eye size={12} />
                            <span>Details</span>
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => navigate(`/vehicles/${v.id}/edit`)}
                            className="flex-1 h-8 bg-brand hover:bg-[#D94800] text-white text-xs font-bold gap-1 border-0"
                          >
                            <Edit2 size={12} />
                            <span>Edit Vehicle</span>
                          </Button>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>

            {/* Floating Info Overlay HUD */}
            <div className={`absolute top-3 left-3 z-[400] px-3 py-1.5 rounded-xl shadow-md border text-xs flex items-center gap-2 font-mono font-bold ${
              MAP_THEMES[mapThemeId]?.isDark 
                ? 'bg-[#090A0F]/85 backdrop-blur-xl border-white/10 text-white' 
                : 'bg-white/90 backdrop-blur-xl border-black/[0.08] text-[#111]'
            }`}>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{mapVehiclesWithCoords.length} VEHICLES DISPLAYED ({selectedStatus === 'All' ? 'ALL FLEET' : selectedStatus.toUpperCase()})</span>
            </div>

            {mapVehiclesWithCoords.length === 0 && (
              <div className="absolute inset-0 z-[400] flex items-center justify-center pointer-events-none">
                <div className={`px-4 py-3 rounded-xl shadow-lg border text-center max-w-xs ${
                  MAP_THEMES[mapThemeId]?.isDark
                    ? 'bg-[#090A0F]/90 backdrop-blur-xl border-white/10 text-white'
                    : 'bg-white/95 backdrop-blur-xl border-black/[0.08] text-[#111]'
                }`}>
                  <Navigation size={18} className="mx-auto mb-1.5 text-brand" />
                  <p className="text-xs font-bold">No Vehicles Found</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    No vehicles match the selected filter.
                  </p>
                </div>
              </div>
            )}

            {/* Floating Close Map Button */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setViewMode('list')}
              className={`absolute top-3 right-3 z-[400] h-8 px-3 rounded-xl shadow-md border text-xs font-bold gap-1.5 transition-all active:scale-95 ${
                MAP_THEMES[mapThemeId]?.isDark 
                  ? 'bg-[#090A0F]/85 hover:bg-[#090A0F] text-white border-white/10 hover:text-white' 
                  : 'bg-white/90 hover:bg-white text-[#111] border-black/[0.08] hover:text-[#111]'
              }`}
            >
              <X size={14} />
              <span>Close Map</span>
            </Button>
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
          isDestructive={confirmModal.isDestructive}
        />

        <ExcelImportDialog
          isOpen={isImportOpen}
          onClose={() => setIsImportOpen(false)}
          entityLabel="Vehicles"
          columns={VEHICLE_COLUMNS}
          requiredFields={['plate_number', 'asset_type', 'capacity_kg']}
          preferSheet="vehicle"
          templateUrl="/templates/MERCON_Vehicles_Import_Template.xlsx"
          onImport={(rows) => vehicleService.importRows(rows)}
          invalidateKeys={[['vehicles'], ['vehicles-select']]}
        />

        <BatchVehicleDocModal
          isOpen={isBatchTruckDocsOpen}
          onClose={() => setIsBatchTruckDocsOpen(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['vehicles'] });
            queryClient.invalidateQueries({ queryKey: ['documents'] });
          }}
        />

        <SendToWorkshopDialog
          open={workshopVehicles.length > 0}
          onOpenChange={(open) => !open && setWorkshopVehicles([])}
          vehicles={workshopVehicles}
          onSuccess={() => {
            toast.success(
              workshopVehicles.length === 1
                ? `Service order opened for ${workshopVehicles[0].plate_number}`
                : `Service orders opened for ${workshopVehicles.length} vehicles`,
            );
            refreshFleet();
          }}
        />

        {/* Update Odometer — reachable from a row's ⋮ menu any time, not just
            when the 15-day-stale icon is showing. */}
        <Dialog open={!!odometerDialogTarget} onOpenChange={(open) => !open && setOdometerDialogTarget(null)}>
          <DialogContent className="sm:max-w-[360px]">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold flex items-center gap-2">
                <Gauge className="w-4 h-4 text-[#E8450F]" />
                Update Odometer
              </DialogTitle>
              <DialogDescription className="text-xs">
                New reading for <span className="font-bold text-[#E8450F]">{odometerDialogTarget?.plate_number}</span>.
              </DialogDescription>
            </DialogHeader>

            <Input
              type="number"
              min={0}
              value={odometerDraft}
              onChange={(e) => setOdometerDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return;
                e.preventDefault();
                const value = Number(odometerDraft);
                if (!odometerDraft || !Number.isFinite(value) || value < 0 || !odometerDialogTarget) return;
                updateOdometerMutation.mutate({ id: odometerDialogTarget.id, value });
              }}
              placeholder="Odometer (km)"
              className="h-9 text-xs"
              autoFocus
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setOdometerDialogTarget(null)}
                disabled={updateOdometerMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={!odometerDraft || updateOdometerMutation.isPending}
                onClick={() => {
                  const value = Number(odometerDraft);
                  if (!Number.isFinite(value) || value < 0 || !odometerDialogTarget) return;
                  updateOdometerMutation.mutate({ id: odometerDialogTarget.id, value });
                }}
                className="text-xs font-bold bg-[#E8450F] hover:bg-[#d03c0b] text-white"
              >
                {updateOdometerMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Universal Export Modal ─────────────────────────────────── */}
        <ExportModal
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
          title="Export Vehicles Roster"
          description="Choose your export preferences, filters, and columns."
          fileNamePrefix="vehicles_roster"
          sheetName="Vehicles"
          subtitle="MERCON Logistics Fleet Vehicles Ledger"
          filteredData={vehicles}
          allData={kpiVehiclesRes?.data || []}
          selectedData={selectedVehiclesForExport}
          totalCount={totalCount}
          columns={VEHICLE_EXPORT_COLUMNS}
          filters={VEHICLE_EXPORT_FILTERS}
          rowDateAccessor={(v) => v.createdAt}
        />

      </div>
    </DashboardLayout>
  );
}
