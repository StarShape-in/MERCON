import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin, Plus, RotateCw, Edit2, Trash2, MoreHorizontal,
  Download, FileSpreadsheet, FileText, UploadCloud,
  Building2, List, Map as MapIcon, Check, CheckCircle2,
  Search, Filter, X, ArrowDown, ArrowUp, Navigation,
  ChevronDown, Eye,
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import ConfirmModal from '@/components/ui/ConfirmModal';
import LocationFormDialog from '@/components/locations/LocationFormDialog';


import { locationService, Location } from '@/services/locationService';
import { customerService } from '@/services/customerService';
import { SAUDI_MAP_CONTAINER_PROPS } from '@/utils/saudiMapConfig';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ExportModal, { ExportColumn } from '@/components/ui/ExportModal';
import { SortDropdown, SortOption } from '@/components/ui/SortDropdown';
import { matchesSearch } from '@/lib/search';
import { cn } from '@/lib/utils';
import KpiCard from '@/components/ui/KpiCard';

import {
  Select, SelectContent, SelectGroup, SelectItem,
  SelectLabel, SelectSeparator, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { exportExcelTable, exportPDFTable } from '@/utils/exportUtils';

// ─── helpers ───────────────────────────────────────────────────────────────
const quotationUses = (l: Location) => l._count?.quotationStops ?? 0;
const tripUses      = (l: Location) => l._count?.tripStops      ?? 0;

// ─── export config ─────────────────────────────────────────────────────────
const LOCATION_EXPORT_COLUMNS: ExportColumn<Location>[] = [
  { id: 'customer',        label: 'Customer',        accessor: (l) => l.customer?.name || '—' },
  { id: 'code',            label: 'Code',            accessor: (l) => l.code },
  { id: 'name',            label: 'Location Name',   accessor: (l) => l.name },
  { id: 'city',            label: 'City',            accessor: (l) => l.city || '—' },
  { id: 'address',         label: 'Address',         accessor: (l) => l.address || '—' },
  { id: 'pinned',          label: 'Pin Status',      accessor: (l) => (l.lat != null && l.lng != null ? 'PINNED' : 'UNPINNED') },
  { id: 'latitude',        label: 'Latitude',        accessor: (l) => (l.lat != null ? l.lat.toFixed(6) : '—') },
  { id: 'longitude',       label: 'Longitude',       accessor: (l) => (l.lng != null ? l.lng.toFixed(6) : '—') },
  { id: 'quotation_count', label: 'Quotation Stops', accessor: (l) => quotationUses(l) },
  { id: 'trip_count',      label: 'Trip Stops',      accessor: (l) => tripUses(l) },
  { id: 'status',          label: 'Status',          accessor: (l) => (l.is_active ? 'Active' : 'Inactive') },
];

// ─── map pin ───────────────────────────────────────────────────────────────
function createCustomLocationPin(isSelected: boolean, isActive: boolean, isPinned: boolean) {
  let pinColor = '#E8450F';
  let glowColor = 'rgba(232, 69, 15, 0.45)';
  if (!isActive) { pinColor = '#64748B'; glowColor = 'rgba(100,116,139,0.3)'; }
  else if (!isPinned) { pinColor = '#D97706'; glowColor = 'rgba(217,119,6,0.45)'; }
  const borderCol = isSelected ? '#E8450F' : '#FFFFFF';
  const size = isSelected ? 44 : 36;
  const outerSize = isSelected ? 52 : 44;
  const html = `
    <div style="position:relative;width:${outerSize}px;height:${outerSize}px;display:flex;align-items:center;justify-content:center;">
      ${isSelected ? `<div class="animate-ping" style="position:absolute;width:${outerSize}px;height:${outerSize}px;border-radius:50%;background-color:${glowColor};opacity:0.75;"></div>` : ''}
      <div style="width:${size}px;height:${size}px;border-radius:50%;background:${pinColor};border:3px solid ${borderCol};box-shadow:0 4px 14px ${glowColor};display:flex;align-items:center;justify-content:center;color:white;">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
        </svg>
      </div>
    </div>`;
  return L.divIcon({ html, className: 'custom-location-pin-wrapper', iconSize: [outerSize, outerSize], iconAnchor: [outerSize / 2, outerSize / 2], popupAnchor: [0, -outerSize / 2] });
}

// ─── map bounds controller ─────────────────────────────────────────────────
function MapBoundsController({ locations, selectedMapCenter, fitTrigger }: {
  locations: Location[];
  selectedMapCenter: [number, number] | null;
  fitTrigger: number;
}) {
  const map = useMap();
  useEffect(() => {
    const safe = () => { try { if (map && (map as any)._container) map.invalidateSize(); } catch {} };
    safe();
    const t1 = setTimeout(safe, 50);
    const t2 = setTimeout(safe, 200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [map]);
  useEffect(() => {
    if (!selectedMapCenter) return;
    const t = setTimeout(() => { try { map.flyTo(selectedMapCenter, 14, { animate: true, duration: 1.0 }); map.invalidateSize(); } catch {} }, 200);
    return () => clearTimeout(t);
  }, [selectedMapCenter, map]);
  useEffect(() => {
    if (selectedMapCenter && fitTrigger === 0) return;
    const t = setTimeout(() => {
      try {
        const mapped = locations.filter(l => l.lat != null && l.lng != null);
        map.invalidateSize();
        if (mapped.length === 1) map.flyTo([mapped[0].lat!, mapped[0].lng!], 13, { animate: true, duration: 0.8 });
        else if (mapped.length > 1) map.fitBounds(L.latLngBounds(mapped.map(l => [l.lat!, l.lng!])), { padding: [50, 50], maxZoom: 14 });
        else map.setView([24.7136, 46.6753], 6);
      } catch {}
    }, 250);
    return () => clearTimeout(t);
  }, [locations, fitTrigger, map, selectedMapCenter]);
  return null;
}

// ─── sort options ──────────────────────────────────────────────────────────
type LocationSortOption = 'latest' | 'oldest' | 'code_asc' | 'name_asc' | 'customer_asc' | 'status';

const LOCATION_SORT_OPTIONS: SortOption<LocationSortOption>[] = [
  { value: 'latest',       label: 'Newest Added',           icon: <ArrowDown  className="w-3.5 h-3.5 text-blue-600" /> },
  { value: 'oldest',       label: 'Oldest Added',           icon: <ArrowUp    className="w-3.5 h-3.5 text-amber-600" /> },
  { value: 'code_asc',     label: 'Code (A → Z)',           icon: <Building2  className="w-3.5 h-3.5 text-indigo-600" /> },
  { value: 'name_asc',     label: 'Location Name (A → Z)',  icon: <MapPin     className="w-3.5 h-3.5 text-purple-600" /> },
  { value: 'customer_asc', label: 'Customer Name (A → Z)',  icon: <Building2  className="w-3.5 h-3.5 text-emerald-600" /> },
  { value: 'status',       label: 'Status',                 icon: <Filter     className="w-3.5 h-3.5 text-slate-500" /> },
];

// ─── component ────────────────────────────────────────────────────────────
export default function LocationListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [searchParams, setSearchParams] = useSearchParams();
  const viewMode = (searchParams.get('view') as 'list' | 'map') || 'list';
  const setViewMode = (mode: 'list' | 'map') => {
    setSearchParams(prev => { const n = new URLSearchParams(prev); n.set('view', mode); return n; });
  };

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'pinned' | 'unpinned' | 'active' | 'inactive' | 'exact' | 'approximate' | 'unknown'>('all');
  const [sortOrder, setSortOrder] = useState<LocationSortOption>('code_asc');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const [isExportOpen, setIsExportOpen] = useState(false);
  const [selectedLocationsForExport, setSelectedLocationsForExport] = useState<Location[]>([]);
  const [editTarget, setEditTarget] = useState<Location | null>(null);
  const [selectionResetKey, setSelectionResetKey] = useState(0);
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
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [selectedMapCenter, setSelectedMapCenter] = useState<[number, number] | null>(null);
  const [fitTrigger, setFitTrigger] = useState(0);

  const { data: customersRes } = useQuery({
    queryKey: ['customers-all'],
    queryFn: () => customerService.getAll(),
  });
  const customers = customersRes?.data || [];

  const { data: response, isLoading } = useQuery({
    queryKey: ['locations', selectedCustomerId],
    queryFn: () => locationService.getAll({ customerId: selectedCustomerId !== 'all' ? selectedCustomerId : undefined }),
  });
  const locations = response?.data || [];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['locations'] });
    setSelectionResetKey(k => k + 1);
    setFitTrigger(k => k + 1);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const filteredData = useMemo(() => {
    return locations
      .filter(l => {
        const matchesCustomer = selectedCustomerId === 'all' || l.customerId === selectedCustomerId;
        const matchesTerm = matchesSearch(search, [l.name, l.code, l.city, l.address, l.customer?.name]);
        let matchesFilter = true;
        if (filter === 'exact')       matchesFilter = l.coordinate_precision === 'EXACT';
        else if (filter === 'approximate') matchesFilter = l.coordinate_precision === 'APPROXIMATE';
        else if (filter === 'unknown')     matchesFilter = l.coordinate_precision === 'UNKNOWN';
        else if (filter === 'active')      matchesFilter = l.is_active === true;
        else if (filter === 'inactive')    matchesFilter = l.is_active === false;
        return matchesCustomer && matchesTerm && matchesFilter;
      })
      .sort((a, b) => {
        if (sortOrder === 'code_asc')     return (a.code || '').localeCompare(b.code || '');
        if (sortOrder === 'name_asc')     return (a.name || '').localeCompare(b.name || '');
        if (sortOrder === 'customer_asc') return (a.customer?.name || '').localeCompare(b.customer?.name || '');
        if (sortOrder === 'status')       return (b.is_active ? 1 : 0) - (a.is_active ? 1 : 0);
        const dA = new Date(a.createdAt || 0).getTime();
        const dB = new Date(b.createdAt || 0).getTime();
        return sortOrder === 'oldest' ? dA - dB : dB - dA;
      });
  }, [locations, selectedCustomerId, search, filter, sortOrder]);

  const kpiStats = useMemo(() => {
    const total       = locations.length;
    const exact       = locations.filter(l => l.coordinate_precision === 'EXACT').length;
    const approximate = locations.filter(l => l.coordinate_precision === 'APPROXIMATE').length;
    const unknown     = locations.filter(l => l.coordinate_precision === 'UNKNOWN' || (!l.lat && !l.lng)).length;
    const active      = locations.filter(l => l.is_active).length;
    const inactive    = total - active;
    return { total, exact, approximate, unknown, active, inactive };
  }, [locations]);



  const handleQuickExport = async (format: 'xlsx' | 'pdf') => {
    const toastId = toast.loading('Preparing export…');
    try {
      const headers = ['Customer', 'Code', 'Location Name', 'City', 'Address', 'Pin Status', 'Latitude', 'Longitude', 'Quotation Stops', 'Trip Stops', 'Status'];
      const rows = filteredData.map(l => [
        l.customer?.name || '—', l.code, l.name, l.city || '—', l.address || '—',
        l.lat != null && l.lng != null ? 'PINNED' : 'UNPINNED',
        l.lat != null ? l.lat.toFixed(6) : '—',
        l.lng != null ? l.lng.toFixed(6) : '—',
        quotationUses(l), tripUses(l), l.is_active ? 'Active' : 'Inactive',
      ]);
      toast.dismiss(toastId);
      if (format === 'xlsx') await exportExcelTable('MERCON Customer Locations', headers, rows, `customer_locations_${new Date().toISOString().slice(0, 10)}.xlsx`);
      else exportPDFTable('MERCON Customer Locations', headers, rows, `customer_locations_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch {
      toast.dismiss(toastId);
      toast.error('Failed to generate export');
    }
  };

  // ── table columns ──────────────────────────────────────────────────────
  const columns = [
    {
      header: 'Customer',
      className: 'w-[13%] min-w-[110px]',
      accessor: (row: Location) => (
        <Badge variant="outline" className="bg-indigo-50/80 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 font-bold text-xs">
          {row.customer?.name || '—'}
        </Badge>
      ),
    },
    {
      header: 'Code',
      className: 'w-[90px]',
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
      className: 'w-[11%] min-w-[90px]',
      accessor: (row: Location) => (
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{row.city || '—'}</span>
      ),
    },
    {
      header: 'Address',
      className: 'w-[20%] min-w-[150px]',
      accessor: (row: Location) => (
        <span className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1" title={row.address || ''}>
          {row.address || '—'}
        </span>
      ),
    },
    {
      header: 'Precision / Map Pin',
      className: 'w-[17%] min-w-[140px]',
      accessor: (row: Location) => {
        const prec = row.coordinate_precision || (row.lat != null ? 'APPROXIMATE' : 'UNKNOWN');
        return (
          <div className="flex flex-col gap-1">
            {prec === 'EXACT' && (
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold text-[10px] w-fit flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-600" />
                <span>✓ Exact ({row.lat!.toFixed(3)}, {row.lng!.toFixed(3)})</span>
              </Badge>
            )}
            {prec === 'APPROXIMATE' && (
              <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 font-bold text-[10px] w-fit flex items-center gap-1">
                <span>≈ Area ({row.lat!.toFixed(3)}, {row.lng!.toFixed(3)})</span>
              </Badge>
            )}
            {prec === 'UNKNOWN' && (
              <Badge variant="outline" className="bg-amber-50/80 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 font-bold text-[10px] w-fit flex items-center gap-1">
                <span>○ Not pinned</span>
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      header: 'Usage',
      className: 'w-[11%] min-w-[110px]',
      accessor: (row: Location) => (
        <div className="text-[11px] font-mono text-slate-500 flex flex-col gap-0.5">
          <span>{quotationUses(row)} Quotations</span>
          <span>{tripUses(row)} Trip Stops</span>
        </div>
      ),
    },
    {
      header: 'Status',
      className: 'w-[80px]',
      accessor: (row: Location) => (
        <Badge variant={row.is_active ? 'default' : 'outline'} className={cn(
          'text-[10px] font-bold',
          row.is_active ? 'bg-emerald-600 text-white' : 'text-slate-400 border-slate-300',
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
        <div className="flex items-center justify-end gap-0.5" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => navigate(`/locations/${row.id}`)}
            title="View location details"
            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 transition-colors focus:outline-none cursor-pointer"
                title="More actions"
                aria-label="Location Actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 p-1.5 shadow-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl">
              <DropdownMenuItem
                onClick={() => navigate(`/locations/${row.id}`)}
                className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md"
              >
                <Eye className="mr-2 h-3.5 w-3.5 text-indigo-600" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setEditTarget(row)}
                className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md"
              >
                <Edit2 className="mr-2 h-3.5 w-3.5 text-amber-600" />
                Edit Location
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1 border-slate-100 dark:border-slate-800" />
              <DropdownMenuItem
                onClick={async () => {
                  const locName = row.name;
                  const qCount = quotationUses(row);
                  const tCount = tripUses(row);
                  const parts: string[] = [];
                  if (qCount > 0) parts.push(`${qCount} quotation stop${qCount === 1 ? '' : 's'}`);
                  if (tCount > 0) parts.push(`${tCount} trip stop${tCount === 1 ? '' : 's'}`);
                  const message = parts.length > 0
                    ? `"${locName}" (${row.code}) is referenced in ${parts.join(' and ')}. Deleting it will remove the location — linked quotations and historical trip stops may be affected.`
                    : `"${locName}" (${row.code}) has no linked quotations or trip stops. This will permanently delete the location.`;
                  setConfirmModal({
                    isOpen: true,
                    title: 'Delete Customer Location?',
                    message,
                    isDestructive: true,
                    onConfirm: async () => {
                      try {
                        await locationService.delete(row.id);
                        toast.success(`Location "${locName}" deleted successfully`);
                        queryClient.invalidateQueries({ queryKey: ['locations'] });
                        setSelectionResetKey(k => k + 1);
                      } catch (e: any) {
                        toast.error(e?.response?.data?.error?.message || 'Failed to delete location');
                      }
                    },
                  });
                }}
                className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Delete Location
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  // ── table filter element ───────────────────────────────────────────────
  const filterElement = (
    <div className="flex items-center gap-3">
      {/* Customer filter */}
      <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
        <SelectTrigger className="h-9 px-3 w-40 shrink-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
            <SelectValue placeholder="All Customers" />
          </div>
        </SelectTrigger>
        <SelectContent align="start" className="w-52 p-1.5 shadow-lg border border-slate-200 bg-white rounded-xl">
          <SelectGroup>
            <SelectLabel className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-2 py-1">Customer</SelectLabel>
            <SelectItem value="all" className="cursor-pointer text-xs font-semibold py-1.5 px-2 rounded-md">All Customers</SelectItem>
          </SelectGroup>
          <SelectSeparator className="my-1 border-slate-100" />
          <SelectGroup>
            {customers.map(c => (
              <SelectItem key={c.id} value={c.id} className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                {c.name}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      {/* Precision filter */}
      <Select value={filter} onValueChange={(val: any) => setFilter(val)}>
        <SelectTrigger className="h-9 px-3 w-40 shrink-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
            <SelectValue placeholder="Precision" />
          </div>
        </SelectTrigger>
        <SelectContent align="start" className="w-48 p-1.5 shadow-lg border border-slate-200 bg-white rounded-xl">
          <SelectGroup>
            <SelectLabel className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-2 py-1">Pin Status</SelectLabel>
            <SelectItem value="all"         className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">All Locations</SelectItem>
            <SelectItem value="exact"       className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">✓ Exact Only</SelectItem>
            <SelectItem value="approximate" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">≈ Area Only</SelectItem>
            <SelectItem value="unknown"     className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">○ Not Pinned Only</SelectItem>
          </SelectGroup>
          <SelectSeparator className="my-1 border-slate-100" />
          <SelectGroup>
            <SelectLabel className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-2 py-1">Active Status</SelectLabel>
            <SelectItem value="active"   className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md text-emerald-700 font-semibold">Active Only</SelectItem>
            <SelectItem value="inactive" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md text-rose-600 font-semibold">Inactive Only</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>

      {/* Sort */}
      <SortDropdown value={sortOrder} onChange={setSortOrder} options={LOCATION_SORT_OPTIONS} />
    </div>
  );

  // ── render ─────────────────────────────────────────────────────────────
  return (
    <DashboardLayout active="Locations" title="Locations Ledger">
      <div className="px-4 sm:px-6 pb-6 w-full flex flex-col animate-fade-in gap-5">

        {/* ── 1. PAGE HEADER ── */}
        <div className="flex flex-wrap items-center justify-between gap-4 shrink-0 pb-1">
          <div className="flex items-center gap-3">
            <MapPin className="w-6 h-6 text-brand shrink-0" />
            <div className="flex flex-col">
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                  Locations
                </h1>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* View switcher */}
            <div className="flex items-center bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={cn(
                  'px-3 py-1 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5',
                  viewMode === 'list'
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900',
                )}
              >
                <List className="w-3.5 h-3.5" /> List
              </button>
              <button
                type="button"
                onClick={() => setViewMode('map')}
                className={cn(
                  'px-3 py-1 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5',
                  viewMode === 'map'
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900',
                )}
              >
                <MapIcon className="w-3.5 h-3.5" /> Map
              </button>
            </div>

            {/* Export / Import dropdown */}
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
                <DropdownMenuItem onClick={() => handleQuickExport('xlsx')} className="cursor-pointer text-xs font-semibold py-1.5 px-2 rounded-md">
                  <FileSpreadsheet className="mr-2 h-3.5 w-3.5 text-emerald-600" />
                  Export Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleQuickExport('pdf')} className="cursor-pointer text-xs font-semibold py-1.5 px-2 rounded-md">
                  <FileText className="mr-2 h-3.5 w-3.5 text-rose-600" />
                  Export PDF (.pdf)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => { setSelectedLocationsForExport(filteredData); setIsExportOpen(true); }}
                  className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md text-brand hover:bg-orange-50 dark:hover:bg-orange-950/40"
                >
                  <Filter className="mr-2 h-3.5 w-3.5 text-brand" />
                  Custom Export Settings…
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1 border-slate-100 dark:border-slate-800" />
                <DropdownMenuLabel className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-2 py-1">
                  Import Data
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={() => toast.info('Location Excel import coming soon')} className="cursor-pointer text-xs font-semibold py-1.5 px-2 rounded-md text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40">
                  <UploadCloud className="mr-2 h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  Import from Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Add Location */}
            <Button
              size="sm"
              className="h-9 gap-1.5 text-xs font-bold bg-brand hover:bg-brand-hover text-white shadow-xs rounded-md px-4"
              onClick={() => navigate('/locations/create')}
            >
              <Plus className="h-4 w-4" />
              Add Location
            </Button>

            {/* Refresh */}
            <button
              onClick={handleRefresh}
              title="Refresh Locations"
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <RotateCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
            </button>
          </div>
        </div>

        {/* ── 2. KPI INSTRUMENT PANEL ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 shrink-0">
          {/* Total Locations */}
          <KpiCard
            title="TOTAL LOCATIONS"
            value={
              <span>
                {kpiStats.total}
                <span className="text-[16px] font-semibold ml-1.5 opacity-85">Hubs</span>
              </span>
            }
            variant="slate"
            description="Canonical customer-scoped hubs"
            icon={MapPin}
            semiCircleGauge={{
              segments: [
                { label: 'Active', count: kpiStats.active, color: '#10B981' },
                { label: 'Inactive', count: kpiStats.inactive, color: '#64748B' },
              ],
            }}
            isActive={filter === 'all'}
            onClick={() => setFilter('all')}
          />

          {/* Exact Facilities */}
          <KpiCard
            title="✓ EXACT FACILITIES"
            value={
              <span>
                {kpiStats.exact}
                <span className="text-[16px] font-semibold ml-1.5 opacity-85">Pinned</span>
              </span>
            }
            variant="emerald"
            trend="up"
            trendValue="Confirmed"
            description="Confirmed dock / building pins"
            icon={CheckCircle2}
            completionGauge={{
              percentage: Math.round((kpiStats.exact / (kpiStats.total || 1)) * 100) || 0,
              label: `${Math.round((kpiStats.exact / (kpiStats.total || 1)) * 100)}% Exact`,
              subtext: `${kpiStats.exact} Exact • ${kpiStats.approximate} Area`,
            }}
            isActive={filter === 'exact'}
            onClick={() => setFilter(filter === 'exact' ? 'all' : 'exact')}
          />

          {/* Area Hubs */}
          <KpiCard
            title="≈ AREA HUBS"
            value={
              <span>
                {kpiStats.approximate}
                <span className="text-[16px] font-semibold ml-1.5 opacity-85">Area</span>
              </span>
            }
            variant="blue"
            trend="neutral"
            trendValue="Navigable"
            description="Navigable general area pins"
            icon={Navigation}
            chartData={[2, 3, 4, kpiStats.approximate || 5, 4, 3, kpiStats.approximate || 5]}
            isActive={filter === 'approximate'}
            onClick={() => setFilter(filter === 'approximate' ? 'all' : 'approximate')}
          />

          {/* Not Pinned */}
          <KpiCard
            title="○ NOT PINNED"
            value={
              <span>
                {kpiStats.unknown}
                <span className="text-[16px] font-semibold ml-1.5 opacity-85">Pending</span>
              </span>
            }
            variant="amber"
            trend={kpiStats.unknown > 0 ? 'down' : 'neutral'}
            trendValue={kpiStats.unknown > 0 ? 'Needs GPS' : 'All Pinned'}
            description="Operational — no GPS coordinates"
            icon={MapPin}
            progressSegments={[
              { label: `Not Pinned (${kpiStats.unknown})`, value: Math.max(kpiStats.unknown > 0 ? 10 : 0, Math.round((kpiStats.unknown / (kpiStats.total || 1)) * 100)), color: 'bg-amber-500' },
              { label: `Pinned (${kpiStats.exact + kpiStats.approximate})`, value: Math.max(10, 100 - Math.round((kpiStats.unknown / (kpiStats.total || 1)) * 100)), color: 'bg-emerald-500' },
            ]}
            isActive={filter === 'unknown'}
            onClick={() => setFilter(filter === 'unknown' ? 'all' : 'unknown')}
          />
        </div>

        {/* ── 3. DATA TABLE / MAP VIEW ── */}
        {viewMode === 'list' ? (
          <div className="w-full flex flex-col">
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
              onRowClick={row => navigate(`/locations/${row.id}`)}
              emptyTitle="No Locations Found"
              emptyMessage="No customer locations match the selected filters."
              searchPlaceholder="Search name, code, city, address…"
              searchValue={search}
              onSearchChange={setSearch}
              filterElement={filterElement}
            />
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden h-[600px] relative shadow-lg">
            <MapContainer className="h-full w-full" {...SAUDI_MAP_CONTAINER_PROPS}>
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
                .filter(l => l.lat != null && l.lng != null)
                .map(loc => (
                  <Marker
                    key={loc.id}
                    position={[loc.lat!, loc.lng!]}
                    icon={createCustomLocationPin(loc.id === selectedLocationId, loc.is_active, loc.lat != null)}
                    eventHandlers={{ click: () => setSelectedLocationId(loc.id) }}
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

      {/* ── Dialogs ── */}
      <LocationFormDialog
        isOpen={isAddOpen || !!editTarget}
        onClose={() => { setIsAddOpen(false); setEditTarget(null); }}
        location={editTarget}
        defaultCustomerId={selectedCustomerId !== 'all' ? selectedCustomerId : undefined}
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
        confirmLabel="Delete Location"
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
