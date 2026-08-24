import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin, Plus, RotateCw, Edit2, Trash2, MoreVertical,
  AlertTriangle, Filter, Download, FileSpreadsheet, FileText,
  Building2, Navigation, Layers, ChevronDown, X, UploadCloud,
  LayoutGrid, List, Map as MapIcon, Copy, Check, ExternalLink,
  Search, ShieldCheck, CheckCircle2, Info, Eye, Maximize2, Sparkles,
  ArrowDown, ArrowUp, ArrowLeft, CheckSquare
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable, { BulkAction } from '@/components/ui/DataTable';
import ConfirmModal from '@/components/ui/ConfirmModal';
import LocationFormDialog from '@/components/locations/LocationFormDialog';
import ExcelImportDialog from '@/components/fleet/ExcelImportDialog';
import { LOCATION_COLUMNS } from '@/utils/importUtils';
import { locationService, Location } from '@/services/locationService';
import { customerService } from '@/services/customerService';
import { SAUDI_MAP_CONTAINER_PROPS } from '@/utils/saudiMapConfig';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { exportExcelTable, exportPDFTable } from '@/utils/exportUtils';
import ExportModal, { ExportColumn, ExportFilter } from '@/components/ui/ExportModal';
import { SortDropdown, SortOption } from '@/components/ui/SortDropdown';
import { matchesSearch } from '@/lib/search';
import { cn } from '@/lib/utils';
import { MAP_THEMES } from '@/components/maps/mapThemes';

import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card } from '@/components/ui/card';

const quotationUses = (l: Location) => l._count?.quotationStops ?? 0;
const tripUses = (l: Location) => l._count?.tripStops ?? 0;

const LOCATION_EXPORT_COLUMNS: ExportColumn<Location>[] = [
  { id: 'customer', label: 'Customer', accessor: (l) => l.customer?.name || '—' },
  { id: 'code', label: 'Code', accessor: (l) => l.code },
  { id: 'name', label: 'Location Name', accessor: (l) => l.name },
  { id: 'city', label: 'City', accessor: (l) => l.city || '—' },
  { id: 'address', label: 'Address', accessor: (l) => l.address || '—' },
  { id: 'pinned', label: 'Pin Status', accessor: (l) => (l.lat != null && l.lng != null ? 'PINNED' : 'UNPINNED') },
  { id: 'latitude', label: 'Latitude', accessor: (l) => (l.lat != null ? l.lat.toFixed(6) : '—') },
  { id: 'longitude', label: 'Longitude', accessor: (l) => (l.lng != null ? l.lng.toFixed(6) : '—') },
  { id: 'quotation_count', label: 'Quotation Stops', accessor: (l) => quotationUses(l) },
  { id: 'trip_count', label: 'Trip Stops', accessor: (l) => tripUses(l) },
  { id: 'status', label: 'Status', accessor: (l) => (l.is_active ? 'Active' : 'Inactive') },
];

const LOCATION_EXPORT_HEADERS = [
  'Customer', 'Code', 'Location Name', 'City', 'Address', 'Pin Status', 'Latitude', 'Longitude', 'Quotation Stops', 'Trip Stops', 'Status'
];

const locationsToExportRows = (locs: Location[]) => locs.map((l) => [
  l.customer?.name || '—',
  l.code,
  l.name,
  l.city || '—',
  l.address || '—',
  l.lat != null && l.lng != null ? 'PINNED' : 'UNPINNED',
  l.lat != null ? l.lat.toFixed(6) : '—',
  l.lng != null ? l.lng.toFixed(6) : '—',
  quotationUses(l),
  tripUses(l),
  l.is_active ? 'Active' : 'Inactive',
]);

function createCustomLocationPin(isSelected: boolean, isActive: boolean, isPinned: boolean, isDarkTheme: boolean) {
  let pinColor = 'var(--color-brand)';
  let glowColor = 'rgba(232, 69, 15, 0.45)';

  if (!isActive) {
    pinColor = '#64748B';
    glowColor = 'rgba(100, 116, 139, 0.3)';
  } else if (!isPinned) {
    pinColor = '#D97706';
    glowColor = 'rgba(217, 119, 6, 0.45)';
  }

  const borderCol = isSelected ? 'var(--color-brand)' : (isDarkTheme ? '#1F2937' : '#FFFFFF');
  const size = isSelected ? 44 : 36;
  const outerSize = isSelected ? 52 : 44;

  const html = `
    <div style="position: relative; width: ${outerSize}px; height: ${outerSize}px; display: flex; align-items: center; justify-content: center;">
      ${isSelected ? `<div class="animate-ping" style="position: absolute; width: ${outerSize}px; height: ${outerSize}px; border-radius: 50%; background-color: ${glowColor}; opacity: 0.75;"></div>` : ''}
      <div style="
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        background: ${pinColor};
        border: 3px solid ${borderCol};
        box-shadow: 0 4px 14px ${glowColor};
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        transition: all 0.2s ease-in-out;
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-location-pin-wrapper',
    iconSize: [outerSize, outerSize],
    iconAnchor: [outerSize / 2, outerSize / 2],
    popupAnchor: [0, -outerSize / 2],
  });
}

function MapBoundsController({
  locations,
  selectedMapCenter,
  fitTrigger,
}: {
  locations: Location[];
  selectedMapCenter: [number, number] | null;
  fitTrigger: number;
}) {
  const map = useMap();

  useEffect(() => {
    const safeInvalidate = () => {
      try {
        if (map && (map as any)._container) {
          map.invalidateSize();
        }
      } catch {}
    };

    safeInvalidate();
    const t1 = setTimeout(safeInvalidate, 50);
    const t2 = setTimeout(safeInvalidate, 150);
    const t3 = setTimeout(safeInvalidate, 350);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [map]);

  useEffect(() => {
    if (selectedMapCenter) {
      const timer = setTimeout(() => {
        try {
          map.flyTo(selectedMapCenter, 14, { animate: true, duration: 1.0 });
          map.invalidateSize();
        } catch (err) {
          console.error('Failed to center map:', err);
        }
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [selectedMapCenter, map]);

  useEffect(() => {
    if (selectedMapCenter && fitTrigger === 0) return;

    const timer = setTimeout(() => {
      try {
        const mapped = locations.filter((l) => l.lat != null && l.lng != null);
        map.invalidateSize();
        if (mapped.length === 1) {
          map.flyTo([mapped[0].lat!, mapped[0].lng!], 13, { animate: true, duration: 0.8 });
        } else if (mapped.length > 1) {
          const bounds = L.latLngBounds(mapped.map((l) => [l.lat!, l.lng!]));
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
        } else {
          map.setView([24.7136, 46.6753], 6);
        }
      } catch (err) {
        console.error('Failed to fit map bounds:', err);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [locations, fitTrigger, map, selectedMapCenter]);

  return null;
}

type LocationSortOption = 'latest' | 'oldest' | 'code_asc' | 'name_asc' | 'customer_asc' | 'status';

const LOCATION_SORT_OPTIONS: SortOption<LocationSortOption>[] = [
  { value: 'latest', label: 'Newest Added', icon: <ArrowDown className="w-3.5 h-3.5 text-blue-600" /> },
  { value: 'oldest', label: 'Oldest Added', icon: <ArrowUp className="w-3.5 h-3.5 text-amber-600" /> },
  { value: 'code_asc', label: 'Code (A → Z)', icon: <Building2 className="w-3.5 h-3.5 text-indigo-600" /> },
  { value: 'name_asc', label: 'Location Name (A → Z)', icon: <MapPin className="w-3.5 h-3.5 text-purple-600" /> },
  { value: 'customer_asc', label: 'Customer Name (A → Z)', icon: <Building2 className="w-3.5 h-3.5 text-emerald-600" /> },
  { value: 'status', label: 'Status', icon: <Filter className="w-3.5 h-3.5 text-slate-500" /> },
];

export default function LocationListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [searchParams, setSearchParams] = useSearchParams();
  const viewMode = (searchParams.get('view') as 'list' | 'map') || 'list';
  const setViewMode = (mode: 'list' | 'map') => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('view', mode);
      return next;
    });
  };

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'pinned' | 'unpinned' | 'active' | 'inactive' | 'exact' | 'approximate' | 'unknown'>('all');
  const [sortOrder, setSortOrder] = useState<LocationSortOption>('code_asc');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [selectedLocationsForExport, setSelectedLocationsForExport] = useState<Location[]>([]);
  const [editTarget, setEditTarget] = useState<Location | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Location | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectionResetKey, setSelectionResetKey] = useState(0);

  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [selectedMapCenter, setSelectedMapCenter] = useState<[number, number] | null>(null);
  const [fitTrigger, setFitTrigger] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: customersRes } = useQuery({
    queryKey: ['customers-all'],
    queryFn: () => customerService.getAll(),
  });
  const customers = customersRes?.data || [];

  const { data: response, isLoading } = useQuery({
    queryKey: ['locations', selectedCustomerId],
    queryFn: () => locationService.getAll({
      customerId: selectedCustomerId !== 'all' ? selectedCustomerId : undefined,
    }),
  });

  const locations = response?.data || [];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['locations'] });
    setSelectionResetKey((prev) => prev + 1);
    setFitTrigger((prev) => prev + 1);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const filteredData = useMemo(() => {
    return locations
      .filter((l) => {
        const matchesCustomer = selectedCustomerId === 'all' || l.customerId === selectedCustomerId;
        const matchesTerm = matchesSearch(search, [l.name, l.code, l.city, l.address, l.customer?.name]);

        let matchesFilter = true;
        if (filter === 'exact') matchesFilter = l.coordinate_precision === 'EXACT';
        else if (filter === 'approximate') matchesFilter = l.coordinate_precision === 'APPROXIMATE';
        else if (filter === 'unknown') matchesFilter = l.coordinate_precision === 'UNKNOWN';
        else if (filter === 'active') matchesFilter = l.is_active === true;
        else if (filter === 'inactive') matchesFilter = l.is_active === false;

        return matchesCustomer && matchesTerm && matchesFilter;
      })
      .sort((a, b) => {
        if (sortOrder === 'code_asc') return (a.code || '').localeCompare(b.code || '');
        if (sortOrder === 'name_asc') return (a.name || '').localeCompare(b.name || '');
        if (sortOrder === 'customer_asc') return (a.customer?.name || '').localeCompare(b.customer?.name || '');
        if (sortOrder === 'status') return (b.is_active ? 1 : 0) - (a.is_active ? 1 : 0);
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return sortOrder === 'oldest' ? dateA - dateB : dateB - dateA;
      });
  }, [locations, selectedCustomerId, search, filter, sortOrder]);

  const kpiStats = useMemo(() => {
    const total = locations.length;
    const exact = locations.filter((l) => l.coordinate_precision === 'EXACT').length;
    const approximate = locations.filter((l) => l.coordinate_precision === 'APPROXIMATE').length;
    const unknown = locations.filter((l) => l.coordinate_precision === 'UNKNOWN' || (!l.lat && !l.lng)).length;
    const active = locations.filter((l) => l.is_active).length;
    return { total, exact, approximate, unknown, active };
  }, [locations]);

  const handleCopyCoords = (loc: Location, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (loc.lat != null && loc.lng != null) {
      navigator.clipboard.writeText(`${loc.lat.toFixed(6)}, ${loc.lng.toFixed(6)}`);
      setCopiedId(loc.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleFocusOnMap = (loc: Location, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (loc.lat != null && loc.lng != null) {
      setSelectedLocationId(loc.id);
      setSelectedMapCenter([loc.lat, loc.lng]);
      setViewMode('map');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await locationService.delete(deleteTarget.id);
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      setSelectionResetKey((prev) => prev + 1);
      setDeleteTarget(null);
    } catch (e: any) {
      setDeleteError(
        e.response?.data?.error?.message || 'Could not delete this location.'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const columns = [
    {
      header: 'Customer',
      className: 'w-[15%] min-w-[120px]',
      accessor: (row: Location) => (
        <Badge variant="outline" className="bg-indigo-50/80 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 font-bold text-xs">
          {row.customer?.name || '—'}
        </Badge>
      ),
    },
    {
      header: 'Code',
      className: 'w-[100px] whitespace-nowrap',
      accessor: (row: Location) => (
        <span className="font-mono text-xs font-black text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
          {row.code}
        </span>
      ),
    },
    {
      header: 'Location Name',
      className: 'w-[22%] min-w-[150px]',
      accessor: (row: Location) => (
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-orange-50 dark:bg-orange-950/40 border border-orange-200/60 dark:border-orange-900/50 flex items-center justify-center shrink-0">
            <MapPin className="w-3.5 h-3.5 text-brand" />
          </div>
          <span className="font-extrabold text-xs text-slate-900 dark:text-slate-100 truncate" title={row.name}>
            {row.name}
          </span>
        </div>
      ),
    },
    {
      header: 'City',
      className: 'w-[12%] min-w-[100px]',
      accessor: (row: Location) => (
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
          {row.city || '—'}
        </span>
      ),
    },
    {
      header: 'Address',
      className: 'w-[22%] min-w-[160px]',
      accessor: (row: Location) => (
        <span className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1" title={row.address || ''}>
          {row.address || '—'}
        </span>
      ),
    },
    {
      header: 'Precision / Map Pin',
      className: 'w-[18%] min-w-[150px]',
      accessor: (row: Location) => {
        const prec = row.coordinate_precision || (row.lat != null ? 'APPROXIMATE' : 'UNKNOWN');
        return (
          <div className="flex flex-col gap-1">
            {prec === 'EXACT' && (
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold text-[10px] w-fit flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-600" />
                <span>✓ Exact location ({row.lat!.toFixed(3)}, {row.lng!.toFixed(3)})</span>
              </Badge>
            )}
            {prec === 'APPROXIMATE' && (
              <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 font-bold text-[10px] w-fit flex items-center gap-1">
                <span>≈ Area location ({row.lat!.toFixed(3)}, {row.lng!.toFixed(3)})</span>
              </Badge>
            )}
            {prec === 'UNKNOWN' && (
              <Badge variant="outline" className="bg-amber-50/80 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 font-bold text-[10px] w-fit flex items-center gap-1">
                <span>○ Location not pinned</span>
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      header: 'Usage',
      className: 'w-[14%] min-w-[130px]',
      accessor: (row: Location) => (
        <div className="text-[11px] font-mono text-slate-500 flex flex-col gap-0.5">
          <span>{quotationUses(row)} Quotations</span>
          <span>{tripUses(row)} Trip Stops</span>
        </div>
      ),
    },
    {
      header: 'Status',
      className: 'w-[90px]',
      accessor: (row: Location) => (
        <Badge variant={row.is_active ? 'default' : 'outline'} className={cn(
          "text-[10px] font-bold",
          row.is_active ? "bg-emerald-600 text-white" : "text-slate-400 border-slate-300"
        )}>
          {row.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      headerClassName: 'text-right',
      className: 'text-right whitespace-nowrap',
      accessor: (row: Location) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/locations/${row.id}`)}
            className="h-7 w-7 p-0 text-slate-500 hover:text-indigo-600"
            title="View location details"
          >
            <Eye size={13} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditTarget(row)}
            className="h-7 w-7 p-0 text-slate-500 hover:text-brand"
            title="Edit location"
          >
            <Edit2 size={13} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteTarget(row)}
            className="h-7 w-7 p-0 text-slate-500 hover:text-rose-600"
            title="Delete location"
          >
            <Trash2 size={13} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout active="Locations" title="Locations Ledger">
      <div className="space-y-6">

        {/* ── 1. HEADER ROW ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/quotations')}
              className="h-8 gap-1 text-xs font-bold border-slate-200 dark:border-slate-800"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                  Locations Master Directory
                </h1>
                <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 font-bold text-[10px]">
                  Customer Operations Module
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Canonical customer-scoped operational hubs, depots, and pickup/dropoff points.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedLocationsForExport(filteredData);
                setIsExportOpen(true);
              }}
              className="h-8 gap-1 text-xs font-bold border-slate-200 dark:border-slate-800"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </Button>
            <Button
              size="sm"
              onClick={() => navigate('/locations/create')}
              className="h-8 gap-1.5 text-xs font-extrabold bg-brand hover:bg-brand-hover text-white shadow-xs"
            >
              <Plus className="w-4 h-4" /> Add Location
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
              title="Refresh Locations"
            >
              <RotateCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* ── 2. KPI INSTRUMENT PANEL ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="p-4 border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs space-y-1">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Locations</div>
            <div className="text-2xl font-black font-mono text-slate-900 dark:text-slate-100">{kpiStats.total}</div>
            <div className="text-[11px] font-medium text-slate-500">{kpiStats.active} Active Hubs</div>
          </Card>

          <Card className="p-4 border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs space-y-1">
            <div className="text-[10px] font-black uppercase tracking-wider text-emerald-600">✓ Exact Facilities</div>
            <div className="text-2xl font-black font-mono text-emerald-600">{kpiStats.exact}</div>
            <div className="text-[11px] font-medium text-slate-500">Confirmed dock/building pins</div>
          </Card>

          <Card className="p-4 border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs space-y-1">
            <div className="text-[10px] font-black uppercase tracking-wider text-indigo-600">≈ Area Hubs</div>
            <div className="text-2xl font-black font-mono text-indigo-600">{kpiStats.approximate}</div>
            <div className="text-[11px] font-medium text-slate-500">Navigable general area pins</div>
          </Card>

          <Card className="p-4 border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs space-y-1">
            <div className="text-[10px] font-black uppercase tracking-wider text-amber-600">○ Not Pinned</div>
            <div className="text-2xl font-black font-mono text-amber-600">{kpiStats.unknown}</div>
            <div className="text-[11px] font-medium text-slate-500">Operational without GPS</div>
          </Card>
        </div>

        {/* ── 3. TOOLBAR & CONTROL BAR ── */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-50/80 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
          
          <div className="flex flex-1 items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search location name, code, city, address..."
                className="pl-9 h-9 text-xs bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Customer Filter Dropdown */}
            <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
              <SelectTrigger className="h-9 w-44 text-xs font-bold bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-1.5 truncate">
                  <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <SelectValue placeholder="All Customers" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs font-bold">All Customers</SelectItem>
                <SelectSeparator />
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs font-semibold">
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Precision Filter Dropdown */}
            <Select value={filter} onValueChange={(val: any) => setFilter(val)}>
              <SelectTrigger className="h-9 w-44 text-xs font-bold bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-1.5 truncate">
                  <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <SelectValue placeholder="Precision" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs font-semibold">All Precisions</SelectItem>
                <SelectItem value="exact" className="text-xs font-semibold">✓ Exact Only</SelectItem>
                <SelectItem value="approximate" className="text-xs font-semibold">≈ Area Only</SelectItem>
                <SelectItem value="unknown" className="text-xs font-semibold">○ Not Pinned Only</SelectItem>
                <SelectItem value="active" className="text-xs font-semibold">Active Only</SelectItem>
                <SelectItem value="inactive" className="text-xs font-semibold">Inactive Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={cn(
                  "px-3 py-1 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5",
                  viewMode === 'list'
                    ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                )}
              >
                <List className="w-3.5 h-3.5" /> List
              </button>
              <button
                type="button"
                onClick={() => setViewMode('map')}
                className={cn(
                  "px-3 py-1 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5",
                  viewMode === 'map'
                    ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                )}
              >
                <MapIcon className="w-3.5 h-3.5" /> Map View
              </button>
            </div>
          </div>

        </div>

        {/* ── 4. DATA TABLE LEDGER OR MAP VIEW ── */}
        {viewMode === 'list' ? (
          <DataTable
            title={
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-brand" />
                <span>Customer Locations Ledger</span>
              </span>
            }
            columns={columns}
            data={filteredData}
            isLoading={isLoading}
            onRowClick={(row) => navigate(`/locations/${row.id}`)}
            emptyTitle="No Locations Found"
            emptyMessage="No customer locations match the selected customer and status filters."
          />
        ) : (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden h-[600px] relative shadow-lg">
            <MapContainer
              className="h-full w-full"
              {...SAUDI_MAP_CONTAINER_PROPS}
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                attribution="&copy; OpenStreetMap &copy; CARTO"
              />
              <MapBoundsController
                locations={filteredData}
                selectedMapCenter={selectedMapCenter}
                fitTrigger={fitTrigger}
              />
              {filteredData
                .filter((l) => l.lat != null && l.lng != null)
                .map((loc) => (
                  <Marker
                    key={loc.id}
                    position={[loc.lat!, loc.lng!]}
                    icon={createCustomLocationPin(loc.id === selectedLocationId, loc.is_active, loc.lat != null, false)}
                    eventHandlers={{
                      click: () => setSelectedLocationId(loc.id),
                    }}
                  >
                    <Popup>
                      <div className="p-2 space-y-1">
                        <div className="font-extrabold text-xs text-slate-900">{loc.name}</div>
                        <div className="text-[10px] text-slate-500">{loc.customer?.name} ({loc.code})</div>
                        {loc.address && <div className="text-[10px] text-slate-600 line-clamp-2">{loc.address}</div>}
                      </div>
                    </Popup>
                  </Marker>
                ))}
            </MapContainer>
          </div>
        )}

      </div>

      {/* Dialogs */}
      <LocationFormDialog
        isOpen={isAddOpen || !!editTarget}
        onClose={() => {
          setIsAddOpen(false);
          setEditTarget(null);
        }}
        location={editTarget}
        defaultCustomerId={selectedCustomerId !== 'all' ? selectedCustomerId : undefined}
      />

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Customer Location?"
        message={`Are you sure you want to delete "${deleteTarget?.name}" (${deleteTarget?.code})?`}
        confirmLabel="Delete Location"
        isLoading={isDeleting}
      />

      {isExportOpen && (
        <ExportModal
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
          filteredData={selectedLocationsForExport}
          columns={LOCATION_EXPORT_COLUMNS}
          fileNamePrefix="customer_locations_registry"
          title="Export Customer Locations"
        />
      )}

    </DashboardLayout>
  );
}
