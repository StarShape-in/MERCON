import { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin, Plus, RotateCw, Edit2, Trash2, MoreVertical,
  AlertTriangle, Filter, Download, FileSpreadsheet, FileText,
  Building2, Navigation, Layers, ChevronDown, X, UploadCloud,
  LayoutGrid, List, Map as MapIcon, Copy, Check, ExternalLink,
  Search, ShieldCheck, CheckCircle2, Info, Eye, Maximize2, Sparkles
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable, { BulkAction } from '@/components/ui/DataTable';
import ConfirmModal from '@/components/ui/ConfirmModal';
import LocationFormDialog from '@/components/locations/LocationFormDialog';
import ExcelImportDialog from '@/components/fleet/ExcelImportDialog';
import { LOCATION_COLUMNS, CUSTOMER_SAVED_LOCATION_COLUMNS } from '@/utils/importUtils';
import { locationService, Location } from '@/services/locationService';
import { customerSavedLocationService, CustomerSavedLocation } from '@/services/customerSavedLocationService';
import { customerService } from '@/services/customerService';
import AddSavedLocationDialog from '@/components/customers/AddSavedLocationDialog';
import { SAUDI_MAP_CONTAINER_PROPS } from '@/utils/saudiMapConfig';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { exportExcelTable, exportPDFTable } from '@/utils/exportUtils';
import ExportModal, { ExportColumn, ExportFilter } from '@/components/ui/ExportModal';
import { matchesSearch } from '@/lib/search';
import { MAP_THEMES } from '@/components/maps/mapThemes';
import MapThemeSelector from '@/components/maps/MapThemeSelector';
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card } from '@/components/ui/card';

/** Rate cards quoting this place, on either end of a lane. */
const rateCardUses = (l: Location) =>
  (l._count?.originRateCards ?? 0) + (l._count?.destinationRateCards ?? 0);

const tripUses = (l: Location) => l._count?.tripStops ?? 0;

const LOCATION_EXPORT_COLUMNS: ExportColumn<Location>[] = [
  { id: 'ref_id', label: 'Location ID', accessor: (l) => `LOC-${l.id.slice(0, 6).toUpperCase()}` },
  { id: 'name', label: 'Location Name', accessor: (l) => l.name },
  { id: 'address', label: 'Address', accessor: (l) => l.address || '—' },
  { id: 'status', label: 'Status', accessor: (l) => (l.is_active ? 'Active' : 'Inactive') },
  { id: 'latitude', label: 'Latitude', accessor: (l) => (l.lat != null ? l.lat.toFixed(6) : '—') },
  { id: 'longitude', label: 'Longitude', accessor: (l) => (l.lng != null ? l.lng.toFixed(6) : '—') },
  { id: 'rate_card_count', label: 'Rate Cards Count', accessor: (l) => rateCardUses(l) },
  { id: 'trip_stops_count', label: 'Trip Stops Count', accessor: (l) => tripUses(l) },
];

const LOCATION_EXPORT_FILTERS: ExportFilter<Location>[] = [
  {
    id: 'status',
    label: 'Status',
    options: [
      { label: 'All Statuses', value: 'All' },
      { label: 'Active', value: 'Active' },
      { label: 'Inactive', value: 'Inactive' },
    ],
    filterFn: (l, val) => (val === 'Active' ? l.is_active : !l.is_active),
  },
];

const LOCATION_EXPORT_HEADERS = [
  'Ref ID', 'Location Name', 'Address', 'Latitude', 'Longitude', 'Status', 'Rate Cards Count', 'Trip Stops Count'
];

const locationsToExportRows = (locs: Location[]) => locs.map((l) => [
  `LOC-${l.id.slice(0, 6).toUpperCase()}`,
  l.name,
  l.address || 'No Address Provided',
  l.lat != null ? l.lat.toFixed(6) : '',
  l.lng != null ? l.lng.toFixed(6) : '',
  l.is_active ? 'Active' : 'Inactive',
  rateCardUses(l),
  tripUses(l),
]);

/** Custom Marker Icon Generator for Leaflet Map */
function createCustomLocationPin(isSelected: boolean, isActive: boolean, isPriced: boolean, isDarkTheme: boolean) {
  let pinColor = 'var(--color-brand)'; // Default brand color
  let glowColor = 'rgba(232, 69, 15, 0.45)';

  if (!isActive) {
    pinColor = '#64748B'; // Slate for inactive
    glowColor = 'rgba(100, 116, 139, 0.3)';
  } else if (isPriced) {
    pinColor = '#4F46E5'; // Indigo for priced
    glowColor = 'rgba(79, 70, 229, 0.45)';
  }

  const borderCol = isSelected ? 'var(--color-brand)' : (isDarkTheme ? '#1F2937' : '#FFFFFF');
  const size = isSelected ? 42 : 34;
  const outerSize = isSelected ? 50 : 42;

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

/** Helper component to manage Leaflet invalidation, auto-bounds, and fly-to */
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

  // ResizeObserver & timer invalidations guarantee Leaflet sizes properly in all environments (production & dev)
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
    const t4 = setTimeout(safeInvalidate, 650);

    let ro: ResizeObserver | null = null;
    try {
      const container = map.getContainer();
      if (typeof ResizeObserver !== 'undefined' && container) {
        ro = new ResizeObserver(safeInvalidate);
        ro.observe(container);
      }
    } catch {}

    const onResize = safeInvalidate;
    window.addEventListener('resize', onResize);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      if (ro) ro.disconnect();
      window.removeEventListener('resize', onResize);
    };
  }, [map]);

  // Handle fly-to when a location is explicitly selected
  useEffect(() => {
    if (selectedMapCenter) {
      map.flyTo(selectedMapCenter, 14, { animate: true, duration: 1.0 });
    }
  }, [selectedMapCenter, map]);

  // Auto-fit bounds on initial load, or when locations/fitTrigger changes (if no specific pin selected)
  useEffect(() => {
    if (selectedMapCenter && fitTrigger === 0) return;

    const mapped = locations.filter((l) => l.lat != null && l.lng != null);
    if (mapped.length === 1) {
      map.flyTo([mapped[0].lat!, mapped[0].lng!], 13, { animate: true, duration: 0.8 });
    } else if (mapped.length > 1) {
      const bounds = L.latLngBounds(mapped.map((l) => [l.lat!, l.lng!]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    } else {
      map.setView([24.7136, 46.6753], 6);
    }
  }, [locations, fitTrigger, map]);

  return null;
}

export default function LocationListPage() {
  const queryClient = useQueryClient();

  const [viewMode, setViewMode] = useState<'list' | 'map' | 'saved'>('list');
  const [savedPlacesCustomerFilter, setSavedPlacesCustomerFilter] = useState<string>('all');
  const [isAddSavedPlaceOpen, setIsAddSavedPlaceOpen] = useState(false);
  const [isImportSavedPlacesOpen, setIsImportSavedPlacesOpen] = useState(false);
  const [deleteSavedPlaceTarget, setDeleteSavedPlaceTarget] = useState<CustomerSavedLocation | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'priced' | 'unused' | 'incomplete' | 'active' | 'inactive'>('all');
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
  const [pageSize, setPageSize] = useState(25);

  const [bulkDeleteTargets, setBulkDeleteTargets] = useState<Location[] | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Map state
  const [mapThemeId, setMapThemeId] = useState<string>('voyager');
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [selectedMapCenter, setSelectedMapCenter] = useState<[number, number] | null>(null);
  const [fitTrigger, setFitTrigger] = useState(0);

  // Copy feedback state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: response, isLoading, isError, error } = useQuery({
    queryKey: ['locations'],
    queryFn: () => locationService.getAll(),
  });

  const locations = response?.data || [];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['locations'] });
    setSelectionResetKey((prev) => prev + 1);
    setFitTrigger((prev) => prev + 1);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleFitAllPins = () => {
    setSelectedLocationId(null);
    setSelectedMapCenter(null);
    setFitTrigger((prev) => prev + 1);
  };

  const filteredData = useMemo(() => {
    return locations.filter((l) => {
      const refId = `loc-${l.id.slice(0, 6)}`;
      const matchesTerm = matchesSearch(search, [l.name, l.address, refId]);

      let matchesFilter = true;
      if (filter === 'priced') matchesFilter = rateCardUses(l) > 0;
      else if (filter === 'unused') matchesFilter = rateCardUses(l) === 0 && tripUses(l) === 0;
      else if (filter === 'incomplete') matchesFilter = !l.address || l.lat == null;
      else if (filter === 'active') matchesFilter = l.is_active === true;
      else if (filter === 'inactive') matchesFilter = l.is_active === false;

      return matchesTerm && matchesFilter;
    });
  }, [locations, search, filter]);

  const kpiStats = useMemo(() => {
    const total = locations.length;
    const unused = locations.filter((l) => rateCardUses(l) === 0 && tripUses(l) === 0).length;
    const noAddress = locations.filter((l) => !l.address || l.lat == null).length;
    const priced = locations.filter((l) => rateCardUses(l) > 0).length;
    const active = locations.filter((l) => l.is_active).length;
    return { total, unused, noAddress, priced, active };
  }, [locations]);

  // Center calculation for map (default to first mapped location or Riyadh)
  const defaultCenter = useMemo<[number, number]>(() => {
    const firstWithCoords = filteredData.find((l) => l.lat != null && l.lng != null);
    if (firstWithCoords && firstWithCoords.lat != null && firstWithCoords.lng != null) {
      return [firstWithCoords.lat, firstWithCoords.lng];
    }
    return [24.7136, 46.6753]; // Riyadh fallback
  }, [filteredData]);

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

  const handleBulkDelete = async () => {
    if (!bulkDeleteTargets || bulkDeleteTargets.length === 0) return;
    setIsBulkDeleting(true);

    for (const target of bulkDeleteTargets) {
      try {
        await locationService.delete(target.id);
      } catch {
        // Silently skip locked locations
      }
    }

    queryClient.invalidateQueries({ queryKey: ['locations'] });
    setSelectionResetKey((prev) => prev + 1);
    setIsBulkDeleting(false);
    setBulkDeleteTargets(null);
  };

  const handleExportLocations = (dataToExport: Location[], filename = 'mercon_locations_registry') => {
    const rows = locationsToExportRows(dataToExport);
    exportExcelTable(filename, LOCATION_EXPORT_HEADERS, rows, 'Locations');
  };

  const handleExportPDFLocations = (dataToExport: Location[], filename = 'mercon_locations_registry') => {
    const rows = locationsToExportRows(dataToExport);
    exportPDFTable('MERCON Logistics - Locations Registry', LOCATION_EXPORT_HEADERS, rows, filename);
  };

  const bulkActions: BulkAction<Location>[] = [
    {
      label: 'Export Documents',
      icon: <Download className="w-3.5 h-3.5" />,
      variant: 'secondary',
      onClick: (selectedRows) => {
        setSelectedLocationsForExport(selectedRows);
        setIsExportOpen(true);
      },
    },
    {
      label: 'Delete Selected',
      icon: <Trash2 className="w-3.5 h-3.5" />,
      variant: 'danger',
      onClick: (selectedRows) => setBulkDeleteTargets(selectedRows),
    },
  ];

  const columns = [
    {
      header: 'Location Ref ID',
      className: 'w-[130px] whitespace-nowrap',
      accessor: (row: Location) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-xs font-bold text-brand">
            LOC-{row.id.slice(0, 6).toUpperCase()}
          </span>
        </div>
      ),
    },
    {
      header: 'Location Name',
      className: 'w-[22%] min-w-[160px]',
      accessor: (row: Location) => (
        <div className="flex items-center gap-2.5 min-w-0 max-w-full">
          <div className="w-7 h-7 rounded-lg bg-orange-50 dark:bg-orange-950/40 border border-orange-200/60 dark:border-orange-900/50 flex items-center justify-center shrink-0">
            <MapPin className="w-3.5 h-3.5 text-brand" />
          </div>
          <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
            <span className="font-extrabold text-xs text-slate-900 dark:text-slate-100 truncate block min-w-0 flex-1" title={row.name}>
              {row.name}
            </span>
            {!row.is_active && (
              <Badge variant="outline" className="text-[9px] font-extrabold uppercase text-slate-500 bg-slate-100 dark:bg-slate-800 shrink-0">
                Inactive
              </Badge>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Street Address',
      className: 'w-[32%] min-w-[180px]',
      accessor: (row: Location) => (
        <div className="flex items-center gap-2 min-w-0 max-w-full overflow-hidden">
          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          {row.address ? (
            <span className="text-xs text-slate-700 dark:text-slate-300 font-medium truncate block min-w-0 flex-1" title={row.address}>
              {row.address}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200/60 dark:border-amber-900/40 shrink-0">
              <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
              No address provided
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Coordinates',
      className: 'w-[170px] whitespace-nowrap',
      accessor: (row: Location) =>
        row.lat != null && row.lng != null ? (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={(e) => handleFocusOnMap(row, e)}
              className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-100 hover:bg-orange-50 hover:text-brand hover:border-orange-300 dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200/80 dark:border-slate-700 transition-colors cursor-pointer"
              title="Click to view on interactive map"
            >
              <Navigation className="w-3 h-3 text-indigo-500 shrink-0" />
              <span>{row.lat.toFixed(4)}, {row.lng.toFixed(4)}</span>
            </button>
            <button
              type="button"
              onClick={(e) => handleCopyCoords(row, e)}
              className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="Copy coordinates"
            >
              {copiedId === row.id ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        ) : (
          <span className="text-xs italic text-slate-400 font-medium">Unmapped coordinates</span>
        ),
    },
    {
      header: 'Usage & Activity',
      className: 'w-[180px] whitespace-nowrap',
      accessor: (row: Location) => {
        const rates = rateCardUses(row);
        const trips = tripUses(row);
        if (rates === 0 && trips === 0) {
          return (
            <Badge variant="outline" className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 border-slate-200 dark:border-slate-700 text-[10px] font-semibold">
              Unlinked (0 uses)
            </Badge>
          );
        }
        return (
          <div className="flex items-center gap-1.5">
            {rates > 0 && (
              <Badge className="bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800 font-bold text-[11px] px-2 py-0.5">
                {rates} Rate Card{rates === 1 ? '' : 's'}
              </Badge>
            )}
            {trips > 0 && (
              <Badge className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800 font-bold text-[11px] px-2 py-0.5">
                {trips} Trip Stop{trips === 1 ? '' : 's'}
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      header: 'Status',
      className: 'w-[100px] whitespace-nowrap',
      accessor: (row: Location) => (
        row.is_active ? (
          <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800 font-bold text-xs px-2.5 py-0.5 flex items-center gap-1.5 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Active
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 font-bold text-xs px-2.5 py-0.5 flex items-center gap-1.5 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            Inactive
          </Badge>
        )
      ),
    },
    {
      header: 'Actions',
      className: 'w-[90px] whitespace-nowrap text-right',
      headerClassName: 'text-right',
      accessor: (row: Location) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {row.lat != null && row.lng != null && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => handleFocusOnMap(row, e)}
              className="h-8 w-8 p-0 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
              title="View on Interactive Map"
            >
              <MapIcon className="w-3.5 h-3.5" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditTarget(row)}
            className="h-8 w-8 p-0 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
            title="Edit location"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-xl p-1.5 shadow-lg border border-slate-200 bg-white">
              <DropdownMenuLabel className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-2 py-1">
                Location Options
              </DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => setEditTarget(row)}
                className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md"
              >
                <Edit2 className="w-3.5 h-3.5 mr-2 text-indigo-600" /> Edit / Rename
              </DropdownMenuItem>
              {row.lat != null && row.lng != null && (
                <DropdownMenuItem
                  onClick={(e) => handleFocusOnMap(row, e)}
                  className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md"
                >
                  <MapIcon className="w-3.5 h-3.5 mr-2 text-emerald-600" /> Center Map Pin
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator className="my-1" />
              <DropdownMenuItem
                onClick={() => { setDeleteError(null); setDeleteTarget(row); }}
                className="cursor-pointer text-xs font-semibold py-1.5 px-2 rounded-md text-rose-600 focus:bg-rose-50"
              >
                <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete Location
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  const currentTheme = MAP_THEMES[mapThemeId] || MAP_THEMES.voyager;

  return (
    <DashboardLayout active="Locations" title="Locations">
      <div className="px-4 sm:px-6 pb-6 h-full flex flex-col animate-fade-in gap-4 max-w-[1400px] mx-auto w-full">

        {/* 1. Top Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 shrink-0 pb-1 border-b border-slate-200/70 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200/60 dark:border-orange-900/50">
              <MapPin className="w-6 h-6 text-brand shrink-0" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              Locations
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-xs font-bold border-slate-200 bg-white text-slate-700 shadow-2xs hover:bg-slate-50"
              onClick={() => {
                setSelectedLocationsForExport([]);
                setIsExportOpen(true);
              }}
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export Documents</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setImportDialogOpen(true)}
              className="h-9 gap-1.5 text-xs font-bold border-slate-200 bg-white text-slate-700 shadow-2xs hover:bg-slate-50"
            >
              <UploadCloud className="w-3.5 h-3.5 text-slate-500" />
              <span>Import</span>
            </Button>
            <Button
              size="sm"
              onClick={() => setIsAddOpen(true)}
              className="h-9 gap-1.5 text-xs bg-brand hover:bg-brand-hover text-white font-bold shadow-xs rounded-lg px-4"
            >
              <Plus className="w-4 h-4" /> Add Location
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-9 w-9 p-0 text-slate-600 border-slate-200 bg-white hover:bg-slate-50 shadow-2xs rounded-lg"
              title="Refresh Locations Data"
            >
              <RotateCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* 2. Control Toolbar (Search, Filter, View Switcher) */}
        <div className="flex flex-wrap items-center justify-between gap-3 shrink-0 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs relative z-10">
          
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search location name, address, ref ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Dropdown */}
            <Select value={filter} onValueChange={(val: any) => setFilter(val)}>
              <SelectTrigger className="h-9 px-3 w-auto min-w-[190px] whitespace-nowrap shrink-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold">
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <Filter className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                  <SelectValue placeholder="All Locations" />
                </div>
              </SelectTrigger>
              <SelectContent align="start" className="w-64 p-1.5 shadow-lg border border-slate-200 bg-white rounded-xl">
                <SelectGroup>
                  <SelectLabel className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-2 py-1">
                    Filter View
                  </SelectLabel>
                  <SelectItem value="all" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                    <span className="flex items-center gap-2 font-medium text-slate-700">
                      <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                      All Locations ({locations.length})
                    </span>
                  </SelectItem>
                  <SelectItem value="priced" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                    <span className="flex items-center gap-2 font-medium text-indigo-700">
                      <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                      Priced Locations Only ({kpiStats.priced})
                    </span>
                  </SelectItem>
                  <SelectItem value="unused" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                    <span className="flex items-center gap-2 font-medium text-blue-700">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      Unlinked Only ({kpiStats.unused})
                    </span>
                  </SelectItem>
                  <SelectItem value="incomplete" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                    <span className="flex items-center gap-2 font-medium text-amber-700">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      Missing Address / Coords ({kpiStats.noAddress})
                    </span>
                  </SelectItem>
                </SelectGroup>
                <SelectSeparator className="my-1 border-slate-100" />
                <SelectGroup>
                  <SelectLabel className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-2 py-1">
                    Status Filter
                  </SelectLabel>
                  <SelectItem value="active" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                    <span className="flex items-center gap-2 font-semibold text-emerald-700">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      Active Locations ({kpiStats.active})
                    </span>
                  </SelectItem>
                  <SelectItem value="inactive" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                    <span className="flex items-center gap-2 font-medium text-slate-600">
                      <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                      Inactive Locations ({locations.length - kpiStats.active})
                    </span>
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {/* Right Area: Map Theme Selector (if map mode) + Segmented View Switcher */}
          <div className="flex items-center gap-2">
            {viewMode === 'map' && (
              <MapThemeSelector
                currentThemeId={mapThemeId}
                onThemeChange={(id: string) => setMapThemeId(id)}
              />
            )}

            {/* View Mode Switcher */}
            <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-lg flex items-center gap-1 border border-slate-200/80 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>List</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('map')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'map'
                    ? 'bg-brand text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <MapIcon className="w-3.5 h-3.5" />
                <span>Map</span>
              </button>
            </div>
          </div>

        </div>

        {/* 3. Active Filter Banner */}
        {filter !== 'all' && (
          <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200/80 dark:border-orange-900/40 px-3.5 py-2 rounded-xl flex items-center justify-between gap-3 text-xs font-semibold text-orange-900 dark:text-orange-200 animate-fade-in shrink-0">
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-brand shrink-0" />
              <span>
                Filtered view: <strong className="underline decoration-brand font-bold text-slate-900 dark:text-slate-100">
                  {filter === 'priced' ? 'Priced Locations Only' :
                   filter === 'unused' ? 'Unlinked Locations Only' :
                   filter === 'incomplete' ? 'Missing Address or Coords' :
                   filter === 'active' ? 'Active Locations Only' : 'Inactive Locations Only'}
                </strong> ({filteredData.length} location{filteredData.length === 1 ? '' : 's'})
              </span>
            </div>
            <button
              onClick={() => setFilter('all')}
              className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-900 border border-orange-200 dark:border-orange-800 text-[11px] font-bold text-brand hover:bg-orange-100 dark:hover:bg-orange-950 transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
            >
              <span>Show All Locations</span>
              <X className="w-3 h-3 shrink-0" />
            </button>
          </div>
        )}

        {/* 4. Missing Address Warning Banner */}
        {kpiStats.noAddress > 0 && filter === 'all' && viewMode !== 'map' && (
          <div className="shrink-0 flex items-center justify-between gap-2.5 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-2.5">
            <div className="flex items-center gap-2.5 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
              <div>
                <span className="font-bold text-amber-900 dark:text-amber-200">
                  {kpiStats.noAddress} location{kpiStats.noAddress === 1 ? ' has' : 's have'} incomplete address details.
                </span>
                <span className="text-amber-800/80 dark:text-amber-300/80 ml-1">
                  Trip stops linked to these places will lack navigation details.
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFilter('incomplete')}
              className="text-[11px] font-bold text-amber-800 dark:text-amber-300 underline hover:text-amber-950 cursor-pointer shrink-0"
            >
              Review Incomplete ({kpiStats.noAddress})
            </button>
          </div>
        )}

        {/* 5. MAIN CONTENT AREA (List, Grid, or Map View) */}
        <div className="w-full flex-1 flex flex-col min-h-0">
          
          {/* A) LIST VIEW */}
          {viewMode === 'list' && (
            <DataTable
              title={
                <span className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-500" />
                  <span>Locations Ledger</span>
                </span>
              }
              data={filteredData}
              columns={columns}
              sortAccessor={(row: Location) => row.createdAt}
              tableClassName="table-fixed w-full"
              enableSelection={true}
              bulkActions={bulkActions}
              selectionResetKey={selectionResetKey}
              compact={true}
              isLoading={isLoading}
              isError={isError}
              errorMessage={(error as Error)?.message || 'Failed to load locations.'}
              searchValue={search}
              onSearchChange={setSearch}
              pageSize={pageSize}
              onPageSizeChange={(size) => setPageSize(size)}
              onRowClick={(row) => setEditTarget(row)}
              emptyTitle="No Locations Found"
              emptyMessage="There are no logistics locations matching your current search term or filter settings."
            />
          )}

          {/* B) INTERACTIVE MAP VIEW */}
          {viewMode === 'map' && (
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-[580px] h-[650px] lg:h-[calc(100vh-230px)] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs relative z-0">
              
              {/* Map Canvas (3 columns on large screens) */}
              <div className="lg:col-span-3 relative h-[450px] lg:h-full min-h-[450px] bg-slate-100 dark:bg-slate-950 overflow-hidden">
                <MapContainer
                  center={selectedMapCenter || SAUDI_MAP_CONTAINER_PROPS.center}
                  zoom={6}
                  minZoom={SAUDI_MAP_CONTAINER_PROPS.minZoom}
                  maxZoom={SAUDI_MAP_CONTAINER_PROPS.maxZoom}
                  maxBounds={SAUDI_MAP_CONTAINER_PROPS.maxBounds}
                  maxBoundsViscosity={SAUDI_MAP_CONTAINER_PROPS.maxBoundsViscosity}
                  scrollWheelZoom={true}
                  style={{ height: '100%', width: '100%', position: 'absolute', inset: 0, zIndex: 0 }}
                  zoomControl={true}
                >
                  <TileLayer
                    key={mapThemeId}
                    url={currentTheme.url}
                    attribution={currentTheme.attribution}
                  />

                  {/* Automatic bounds fitter and Leaflet size invalidator */}
                  <MapBoundsController
                    locations={filteredData}
                    selectedMapCenter={selectedMapCenter}
                    fitTrigger={fitTrigger}
                  />

                  {/* Location Markers */}
                  {filteredData
                    .filter((l) => l.lat != null && l.lng != null)
                    .map((loc) => {
                      const isSelected = selectedLocationId === loc.id;
                      const rates = rateCardUses(loc);
                      const isPriced = rates > 0;
                      const customPin = createCustomLocationPin(
                        isSelected,
                        loc.is_active ?? true,
                        isPriced,
                        currentTheme.isDark
                      );

                      return (
                        <Marker
                          key={loc.id}
                          position={[loc.lat!, loc.lng!]}
                          icon={customPin}
                          eventHandlers={{
                            click: () => {
                              setSelectedLocationId(loc.id);
                              setSelectedMapCenter([loc.lat!, loc.lng!]);
                            },
                          }}
                        >
                          <Popup className={currentTheme.isDark ? 'dark-map-popup' : ''} maxWidth={280}>
                            <div className="p-1 flex flex-col gap-2 font-sans">
                              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
                                <span className="font-mono text-[10px] font-bold text-brand">
                                  LOC-{loc.id.slice(0, 6).toUpperCase()}
                                </span>
                                {loc.is_active ? (
                                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">Active</span>
                                ) : (
                                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">Inactive</span>
                                )}
                              </div>

                              <div>
                                <h4 className="font-bold text-xs text-slate-900">{loc.name}</h4>
                                <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">{loc.address || 'No street address'}</p>
                              </div>

                              <div className="font-mono text-[10px] bg-slate-100 p-1.5 rounded text-slate-700 flex items-center justify-between">
                                <span>{loc.lat?.toFixed(5)}, {loc.lng?.toFixed(5)}</span>
                                <button
                                  type="button"
                                  onClick={(e) => handleCopyCoords(loc, e)}
                                  className="text-slate-400 hover:text-slate-800"
                                >
                                  {copiedId === loc.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                </button>
                              </div>

                              <div className="flex items-center gap-1.5 pt-0.5">
                                {rates > 0 && <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">{rates} Rate Cards</span>}
                                {tripUses(loc) > 0 && <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">{tripUses(loc)} Stops</span>}
                              </div>

                              <Button
                                size="sm"
                                onClick={() => setEditTarget(loc)}
                                className="w-full h-7 text-xs bg-brand hover:bg-brand-hover text-white font-bold mt-1"
                              >
                                <Edit2 className="w-3 h-3 mr-1" /> Edit Details
                              </Button>
                            </div>
                          </Popup>
                        </Marker>
                      );
                    })}
                </MapContainer>

                {/* Map Overlay Controls & HUD */}
                <div className="absolute top-3 left-3 z-[1000] flex items-center gap-2">
                  <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-md text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-brand" />
                    <span>{filteredData.filter((l) => l.lat != null && l.lng != null).length} Plotted Pins</span>
                  </div>

                  {filteredData.filter((l) => l.lat != null && l.lng != null).length > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleFitAllPins}
                      className="h-8 text-xs font-bold bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-slate-200 dark:border-slate-800 shadow-md hover:bg-slate-100 flex items-center gap-1.5"
                      title="Fit all location pins in viewport"
                    >
                      <Maximize2 className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Fit All</span>
                    </Button>
                  )}
                </div>

                {/* Overlay: Empty State if no locations match */}
                {filteredData.length === 0 ? (
                  <div className="absolute inset-0 z-[1000] flex flex-col items-center justify-center p-6 bg-slate-900/10 backdrop-blur-[2px]">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-sm text-center flex flex-col items-center gap-3 animate-fade-in">
                      <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-950/50 border border-orange-200/80 dark:border-orange-900/60 flex items-center justify-center">
                        <MapPin className="w-6 h-6 text-brand" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                          {locations.length === 0 ? 'No Locations Registered' : 'No Matching Locations'}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                          {locations.length === 0
                            ? 'Add logistics hubs, depots, and customer yards to plot them on the interactive map.'
                            : 'No locations match your current search or filter criteria.'}
                        </p>
                      </div>
                      {locations.length === 0 ? (
                        <Button
                          size="sm"
                          onClick={() => setIsAddOpen(true)}
                          className="bg-brand hover:bg-brand-hover text-white font-bold text-xs mt-1 shadow-xs"
                        >
                          <Plus className="w-4 h-4 mr-1.5" /> Add First Location
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setSearch(''); setFilter('all'); }}
                          className="text-xs font-bold mt-1 shadow-2xs"
                        >
                          Reset Filters
                        </Button>
                      )}
                    </div>
                  </div>
                ) : filteredData.filter((l) => l.lat != null && l.lng != null).length === 0 ? (
                  <div className="absolute bottom-4 left-4 right-4 z-[1000] bg-amber-500/95 backdrop-blur-md text-white px-4 py-3 rounded-xl shadow-lg border border-amber-400 flex items-center justify-between gap-3 text-xs animate-fade-in">
                    <div className="flex items-center gap-2.5 font-medium">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-white" />
                      <span>
                        None of your <strong>{filteredData.length} location{filteredData.length === 1 ? '' : 's'}</strong> have GPS coordinates assigned. Select a location in the sidebar to add coordinates.
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Sidebar Location Selector Pane */}
              <div className="lg:col-span-1 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50">
                <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
                  <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Location Pins ({filteredData.length})</span>
                  </h3>
                  {filteredData.length > 0 && (
                    <span className="text-[10px] font-bold text-slate-400">
                      {filteredData.filter((l) => l.lat != null && l.lng != null).length} mapped
                    </span>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                  {filteredData.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                      No locations match filters.
                    </div>
                  ) : (
                    filteredData.map((loc) => {
                      const isSelected = selectedLocationId === loc.id;
                      const hasCoords = loc.lat != null && loc.lng != null;

                      return (
                        <div
                          key={loc.id}
                          onClick={() => {
                            if (hasCoords) {
                              setSelectedLocationId(loc.id);
                              setSelectedMapCenter([loc.lat!, loc.lng!]);
                            } else {
                              setEditTarget(loc);
                            }
                          }}
                          className={`p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                            isSelected
                              ? 'bg-orange-50 dark:bg-orange-950/40 border-orange-300 dark:border-orange-900 shadow-2xs'
                              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-extrabold text-xs text-slate-900 dark:text-slate-100 truncate">
                              {loc.name}
                            </span>
                            {hasCoords ? (
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px] font-bold px-1.5 py-0 shrink-0">
                                Mapped
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[9px] font-bold px-1.5 py-0 shrink-0">
                                No Coords
                              </Badge>
                            )}
                          </div>

                          <p className="text-[11px] text-slate-500 truncate">
                            {loc.address || 'No street address'}
                          </p>

                          <div className="pt-0.5 flex items-center justify-between">
                            {hasCoords ? (
                              <>
                                <span className="font-mono text-[10px] text-slate-400">
                                  {loc.lat?.toFixed(4)}, {loc.lng?.toFixed(4)}
                                </span>
                                <span className="text-brand text-[11px] font-bold hover:underline flex items-center gap-0.5">
                                  Focus →
                                </span>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditTarget(loc);
                                }}
                                className="text-[11px] font-bold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1"
                              >
                                <Plus className="w-3 h-3" /> Set Coordinates
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>
          )}

        </div>

        {/* 6. Dialogs & Confirm Modals */}
        <LocationFormDialog isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} />
        <LocationFormDialog
          isOpen={!!editTarget}
          location={editTarget}
          onClose={() => setEditTarget(null)}
        />

        <ExcelImportDialog
          isOpen={importDialogOpen}
          onClose={() => setImportDialogOpen(false)}
          entityLabel="Locations"
          columns={LOCATION_COLUMNS}
          requiredFields={['name']}
          preferSheet="location"
          templateUrl="/templates/MERCON_Locations_Import_Template.xlsx"
          matchLabel="location name"
          onImport={(rows) => locationService.importRows(rows)}
          invalidateKeys={[['locations']]}
        />

        <ConfirmModal
          isOpen={!!deleteTarget}
          onClose={() => { setDeleteTarget(null); setDeleteError(null); }}
          title="Delete Location"
          message={
            deleteError
              ? deleteError
              : deleteTarget && tripUses(deleteTarget) > 0
              ? `"${deleteTarget.name}" is on ${tripUses(deleteTarget)} trip stop${tripUses(deleteTarget) === 1 ? '' : 's'}. Those trips keep their own address and coordinates, but the place disappears from the picker.`
              : `Delete "${deleteTarget?.name}"? It disappears from the location picker. Rate cards still using it will block this.`
          }
          confirmLabel={deleteError ? 'Close' : 'Yes, delete'}
          isDestructive={!deleteError}
          isLoading={isDeleting}
          onConfirm={() => {
            if (deleteError) { setDeleteTarget(null); setDeleteError(null); return; }
            handleDelete();
          }}
        />

        <ConfirmModal
          isOpen={!!bulkDeleteTargets}
          onClose={() => setBulkDeleteTargets(null)}
          title="Delete Selected Locations"
          message={`Are you sure you want to delete ${bulkDeleteTargets?.length ?? 0} selected locations? Locations tied to active rate cards will be preserved automatically.`}
          confirmLabel="Yes, delete selected"
          isDestructive={true}
          isLoading={isBulkDeleting}
          onConfirm={handleBulkDelete}
        />

        {/* ── Universal Export Modal ─────────────────────────────────── */}
        <ExportModal
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
          title="Export Locations Registry"
          description="Choose your export preferences, filters, and columns."
          fileNamePrefix="locations_registry"
          sheetName="Locations"
          subtitle="MERCON Logistics Locations & Geofence Registry"
          filteredData={filteredData}
          allData={locations}
          selectedData={selectedLocationsForExport}
          totalCount={locations.length}
          columns={LOCATION_EXPORT_COLUMNS}
          filters={LOCATION_EXPORT_FILTERS}
          formats={['xlsx', 'csv', 'pdf']}
        />

      </div>
    </DashboardLayout>
  );
}
