import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Edit2, FileText, Trash2, CheckCircle, XCircle, Send, Download, UploadCloud, Wrench,
  RotateCw, Truck, Eye, Search, Filter, LayoutGrid, List, AlertTriangle, ShieldCheck, 
  Gauge,Calendar, CheckCircle2, Clock, MoreVertical, Map, Navigation, X, ChevronDown
} from 'lucide-react';
import { FleetTruck, CheckBadge, MaintenanceWrench } from '@/components/ui/kpi-icons';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MAP_THEMES } from '@/components/maps/mapThemes';
import MapThemeSelector from '@/components/maps/MapThemeSelector';

import { downloadCSV, exportExcelTable } from '@/utils/exportUtils';
import { VEHICLE_COLUMNS } from '@/utils/importUtils';
import ExcelImportDialog from '@/components/fleet/ExcelImportDialog';
import { notificationService } from '@/services/notificationService';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import { vehicleService, Vehicle, AssetStatus } from '@/services/vehicleService';
import ConfirmModal from '@/components/ui/ConfirmModal';

import KpiCard from '@/components/ui/KpiCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator,
  DropdownMenuLabel 
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

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
          <span>⚠️</span>
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

export default function VehicleListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedStatus, setSelectedStatus] = useState<AssetStatus | 'All'>('All');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'map'>('list');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
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

  const debouncedSearch = useDebouncedValue(search, 300);

  // Fetch vehicles using React Query
  const { data: vehiclesRes, isLoading, isError, error } = useQuery({
    queryKey: ['vehicles', selectedStatus, debouncedSearch, currentPage, pageSize],
    queryFn: () => vehicleService.getAll({
      status: selectedStatus === 'All' ? undefined : selectedStatus,
      search: debouncedSearch || undefined,
      page: currentPage,
      per_page: pageSize,
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
    if (selectedType === 'All') return rawVehicles;
    return rawVehicles.filter(v => v.asset_type.toLowerCase().includes(selectedType.toLowerCase()));
  }, [rawVehicles, selectedType]);

  /**
   * Only vehicles that have actually reported a position belong on the map.
   *
   * This previously synthesised coordinates from the vehicle's UUID whenever
   * `last_lat`/`last_lng` were null, which placed a stable, plausible marker
   * inside Saudi Arabia for a truck that has never reported at all — and an
   * operator had no way to tell it from a real one. A vehicle with no GPS is
   * now absent from the map and counted instead.
   *
   * `Number.isFinite` rather than a truthiness check: latitude 0 is a real
   * coordinate, and the old `||` would have discarded it.
   */
  const { trackedVehicles, untrackedCount } = useMemo(() => {
    const tracked = vehicles.filter(
      (v) => Number.isFinite(v.last_lat) && Number.isFinite(v.last_lng)
    );
    return { trackedVehicles: tracked, untrackedCount: vehicles.length - tracked.length };
  }, [vehicles]);

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

  const getTypeStyle = (type: string) => {
    const t = (type || '').toLowerCase();
    if (t.includes('tractor') || t.includes('heavy')) return 'bg-indigo-50 text-indigo-700 border-indigo-200/80 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-800';
    if (t.includes('reefer')) return 'bg-sky-50 text-sky-700 border-sky-200/80 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-800';
    if (t.includes('flatbed')) return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    if (t.includes('tanker')) return 'bg-purple-50 text-purple-700 border-purple-200/80 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800';
    return 'bg-slate-50 text-slate-600 border-slate-200';
  };

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

  // Table columns
  const columns = [
    {
      header: 'Vehicle ID',
      accessor: (row: Vehicle) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-xs font-extrabold text-[#E8450F] block">
            {row.ref_id || `VEH-${row.id.slice(0, 6).toUpperCase()}`}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">ID: {row.id.slice(0, 6)}</span>
          {row.status === 'Maintenance' && (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[9px] font-bold px-1.5 py-0 h-4 w-fit flex items-center gap-0.5 mt-0.5">
              <Wrench size={9} className="text-amber-500" />
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
          <div>
            <div className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span>{row.plate_number}</span>
              <Badge variant="outline" className="text-[9px] font-mono font-bold px-1.5 py-0 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                KSA
              </Badge>
            </div>
            {row.asset_type && (
              <span className="text-[10px] text-slate-500 font-medium">
                {row.asset_type}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Asset Type',
      accessor: (row: Vehicle) => (
        <Badge variant="outline" className={cn("text-[10px] font-bold px-2 py-0.5", getTypeStyle(row.asset_type))}>
          {row.asset_type || 'Standard'}
        </Badge>
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
                className="font-bold text-xs text-slate-800 dark:text-slate-200 hover:text-[#E8450F] transition-colors cursor-pointer truncate"
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
      header: 'Payload Capacity',
      accessor: (row: Vehicle) => (
        <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
          {((row.capacity_kg || 24000) / 1000).toFixed(1)} t
        </span>
      ),
    },
    {
      header: 'Odometer Mileage',
      accessor: (row: Vehicle) => {
        const mileagePct = Math.min(100, Math.round(((row.current_odometer || 0) / 300000) * 100));
        const mileageColor = mileagePct > 80 ? 'bg-rose-500' : mileagePct > 50 ? 'bg-amber-500' : 'bg-indigo-500';
        return (
          <div className="space-y-1">
            <span className="text-xs text-slate-700 dark:text-slate-300 font-mono font-bold block">
              {(row.current_odometer || 184500).toLocaleString()} km
            </span>
            <div className="w-20 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className={cn("h-full rounded-full transition-all duration-300", mileageColor)} style={{ width: `${mileagePct}%` }} />
            </div>
          </div>
        );
      },
    },
    {
      header: 'Status',
      className: 'w-[130px]',
      headerClassName: 'w-[130px]',
      accessor: (row: Vehicle) => {
        const handleQuickStatusChange = async (newStatus: AssetStatus) => {
          if (newStatus === row.status) return;
          try {
            await vehicleService.bulkUpdateStatus([row.id], newStatus);
            toast.success(`Vehicle ${row.plate_number} status updated to ${newStatus}`);
            queryClient.invalidateQueries({ queryKey: ['vehicles'] });
          } catch {
            toast.error(`Failed to update status for ${row.plate_number}`);
          }
        };

        return (
          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button 
                  className="group flex items-center gap-1 focus:outline-none rounded-full transition-transform hover:scale-105"
                  title="Click to quick-change vehicle status"
                >
                  <StatusBadge status={row.status} />
                  <ChevronDown size={11} className="text-slate-400 opacity-60 group-hover:opacity-100 transition-opacity" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44 p-1">
                <DropdownMenuLabel className="text-[10px] font-bold uppercase text-slate-400 px-2 py-1">Quick Status Change</DropdownMenuLabel>
                <DropdownMenuItem 
                  onClick={() => handleQuickStatusChange('Available')}
                  className={cn("text-xs font-semibold gap-2 py-1.5 cursor-pointer", row.status === 'Available' && "bg-slate-100 dark:bg-slate-800 font-bold")}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  Available (Active)
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleQuickStatusChange('Maintenance')}
                  className={cn("text-xs font-semibold gap-2 py-1.5 cursor-pointer", row.status === 'Maintenance' && "bg-slate-100 dark:bg-slate-800 font-bold")}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  Maintenance (In Shop)
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleQuickStatusChange('Inactive')}
                  className={cn("text-xs font-semibold gap-2 py-1.5 cursor-pointer", row.status === 'Inactive' && "bg-slate-100 dark:bg-slate-800 font-bold")}
                >
                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                  Inactive (Off Duty)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
    {
      header: 'Actions',
      accessor: (row: Vehicle) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button 
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/vehicles/${row.id}`)}
            className="h-8 w-8 p-0 text-slate-500 hover:text-indigo-600"
            title="View Details"
          >
            <Eye size={14} />
          </Button>

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
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[10px] font-bold uppercase text-slate-400">Status Control</DropdownMenuLabel>
              {row.status === 'Maintenance' ? (
                <DropdownMenuItem 
                  onClick={async () => {
                    try {
                      await vehicleService.bulkUpdateStatus([row.id], 'Available');
                      toast.success(`Vehicle ${row.plate_number} marked Available`);
                      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
                    } catch {
                      toast.error('Failed to update status');
                    }
                  }} 
                  className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30 hover:bg-emerald-100/80"
                >
                  <CheckCircle size={13} className="mr-2 text-emerald-500" /> Mark Available (Ready)
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem 
                  onClick={async () => {
                    try {
                      await vehicleService.bulkUpdateStatus([row.id], 'Maintenance');
                      toast.success(`Vehicle ${row.plate_number} marked Maintenance`);
                      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
                    } catch {
                      toast.error('Failed to update status');
                    }
                  }} 
                  className="text-xs font-semibold text-amber-600 dark:text-amber-400"
                >
                  <Wrench size={13} className="mr-2 text-amber-500" /> Mark Maintenance
                </DropdownMenuItem>
              )}
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
      label: 'Mark Available',
      icon: <CheckCircle size={13} />,
      onClick: (selectedRows: Vehicle[]) => {
        setConfirmModal({
          isOpen: true,
          title: 'Mark Vehicles as Available',
          message: `Are you sure you want to mark ${selectedRows.length} vehicles as Available?`,
          isDestructive: false,
          onConfirm: async () => {
            try {
              await vehicleService.bulkUpdateStatus(selectedRows.map(r => r.id), 'Available');
              queryClient.invalidateQueries({ queryKey: ['vehicles'] });
            } catch (e) { toast.error('Failed to update status'); }
          }
        });
      }
    },
    {
      label: 'Mark Maintenance',
      icon: <Wrench size={13} />,
      variant: 'secondary' as const,
      onClick: (selectedRows: Vehicle[]) => {
        setConfirmModal({
          isOpen: true,
          title: 'Mark Vehicles as Maintenance',
          message: `Are you sure you want to mark ${selectedRows.length} vehicles as Maintenance?`,
          isDestructive: false,
          onConfirm: async () => {
            try {
              await vehicleService.bulkUpdateStatus(selectedRows.map(r => r.id), 'Maintenance');
              queryClient.invalidateQueries({ queryKey: ['vehicles'] });
            } catch (e) { toast.error('Failed to update status'); }
          }
        });
      }
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
      label: 'Export Excel',
      icon: <Download size={13} />,
      variant: 'secondary' as const,
      onClick: (selectedRows: Vehicle[]) => {
        handleExportExcel(selectedRows);
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
          message: `Are you sure you want to delete ${selectedRows.length} vehicles? This action cannot be undone.`,
          isDestructive: true,
          onConfirm: async () => {
            try {
              await vehicleService.bulkDelete(selectedRows.map(r => r.id));
              queryClient.invalidateQueries({ queryKey: ['vehicles'] });
            } catch (e) { toast.error('Failed to delete vehicles'); }
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
            <Truck className="w-6 h-6 text-orange-500 dark:text-orange-400 shrink-0" />

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

            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-xs font-semibold border-slate-200 bg-white hover:bg-slate-50 shadow-2xs dark:bg-slate-900 dark:border-slate-800"
              onClick={() => handleExportExcel(vehicles)}
            >
              <Download className="h-3.5 w-3.5 text-slate-600" />
              Export Excel
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-xs font-semibold border-slate-200 bg-white hover:bg-slate-50 shadow-2xs dark:bg-slate-900 dark:border-slate-800"
              onClick={() => setIsImportOpen(true)}
            >
              <UploadCloud className="h-3.5 w-3.5 text-emerald-600" />
              Import Excel
            </Button>

            <Button
              size="sm"
              className="h-9 gap-1.5 text-xs font-bold bg-[#E8450F] hover:bg-[#d03d0c] text-white shadow-xs rounded-lg px-4"
              onClick={() => navigate('/vehicles/new')}
            >
              <Plus className="h-4 w-4" />
              Add Vehicle
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 p-0 text-slate-600 border-slate-200 bg-white hover:bg-slate-50 shadow-2xs dark:bg-slate-900 dark:border-slate-800"
              onClick={async () => {
                setIsRefreshing(true);
                await queryClient.invalidateQueries({ queryKey: ['vehicles'] });
                setTimeout(() => setIsRefreshing(false), 500);
              }}
              title="Refresh Data"
            >
              <RotateCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* ── 4 Telematics Instrument Panel Cards ───────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 shrink-0">
          
          {/* Card 1: Total Fleet Assets */}
          <KpiCard
            title="TOTAL FLEET ASSETS"
            value={
              <span>
                {totalCount}
                <span className="text-[16px] font-semibold ml-1.5 opacity-85">Vehicles</span>
              </span>
            }
            variant="brand"
            trend="up"
            trendValue={`${activePct}% Active`}
            description="Total assets in database"
            icon={FleetTruck}
            isActive={selectedStatus === 'All'}
            onClick={() => { setSelectedStatus('All'); setViewMode('map'); setCurrentPage(1); }}
            customFooter={
              <div className="relative h-9 mt-4 -mx-5 overflow-hidden rounded-b-2xl bg-[#FFF8F6] dark:bg-[#E8450F]/10 border-t border-[#E8450F]/10">
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
                    stroke="#E8450F" 
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
            onClick={() => { setSelectedStatus('Available'); setViewMode('map'); setCurrentPage(1); }}
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
            onClick={() => { setSelectedStatus('Maintenance'); setViewMode('map'); setCurrentPage(1); }}
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
                      <span>⚠️</span>
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
            onClick={() => { setSelectedStatus('OnTrip'); setViewMode('map'); setCurrentPage(1); }}
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
              bulkActions={bulkActions}
              enableSelection={true}
              compact={true}
              isLoading={isLoading}
              isError={isError}
              errorMessage={(error as Error)?.message || 'Failed to load fleet vehicles.'}
              searchPlaceholder="Search by plate number, ref ID, or asset type..."
              onSearchChange={setSearch}
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
              filterElement={
                <div className="flex items-center gap-3">
                  {/* Status Dropdown using shadcn Select */}
                  <Select
                    value={selectedStatus}
                    onValueChange={(val) => {
                      setSelectedStatus(val as AssetStatus | 'All');
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="h-9 w-36 text-xs font-semibold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus-visible:ring-[#E8450F]/20">
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

                  {/* Asset Type Dropdown using shadcn Select */}
                  <Select
                    value={selectedType}
                    onValueChange={(val) => setSelectedType(val)}
                  >
                    <SelectTrigger className="h-9 w-40 text-xs font-semibold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus-visible:ring-[#E8450F]/20">
                      <SelectValue placeholder="Asset Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All" className="text-xs font-semibold">All Asset Types</SelectItem>
                      <SelectItem value="Tractor" className="text-xs font-semibold">Heavy Tractor</SelectItem>
                      <SelectItem value="Reefer" className="text-xs font-semibold">Reefer Truck</SelectItem>
                      <SelectItem value="Flatbed" className="text-xs font-semibold">Flatbed Trailer</SelectItem>
                      <SelectItem value="Tanker" className="text-xs font-semibold">Tanker Unit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              }
            />
          </div>
        )}
        
        {viewMode === 'grid' && (
          /* GRID VIEW MODE */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 shrink-0">
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
                className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs hover:shadow-xs hover:border-[#E8450F]/45 hover:-translate-y-0.5 transition-all duration-150 ease-in-out bg-white dark:bg-slate-900 flex flex-col justify-between outline-none focus-visible:ring-2 focus-visible:ring-[#E8450F]/30"
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
                    <StatusBadge status={v.status} />
                  </div>

                  <div>
                    <h4 
                      onClick={() => navigate(`/vehicles/${v.id}`)}
                      className="font-extrabold text-sm text-slate-950 dark:text-slate-50 hover:text-[#E8450F] cursor-pointer truncate"
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
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {v.assignedDriver ? `${v.assignedDriver.first_name} ${v.assignedDriver.last_name}` : (v.trips?.[0]?.driver ? `${v.trips[0].driver.first_name} ${v.trips[0].driver.last_name}` : 'Unassigned')}
                      </span>
                    </div>
                    {v.capacity_kg ? (
                      <div className="flex justify-between text-slate-500">
                        <span>Payload Capacity:</span>
                        <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{(v.capacity_kg / 1000).toFixed(1)} t</span>
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
                    className="h-7 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-[#E8450F] gap-1"
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
        )}

        {viewMode === 'map' && (
          /* MAP VIEW MODE */
          <div className="h-[550px] rounded-[24px] overflow-hidden border border-slate-200 dark:border-slate-800 relative shadow-md" style={{ background: MAP_THEMES[mapThemeId]?.previewColor || '#F4F5F7' }}>
            <MapContainer
              center={[24.5000, 44.5000]}
              zoom={6}
              scrollWheelZoom={true}
              style={{ height: '100%', width: '100%', zIndex: 0 }}
            >
              <TileLayer
                key={mapThemeId}
                attribution={MAP_THEMES[mapThemeId]?.attribution || MAP_THEMES.voyager.attribution}
                url={MAP_THEMES[mapThemeId]?.url || MAP_THEMES.voyager.url}
              />

              {trackedVehicles.map((v) => {
                return (
                  <Marker
                    key={v.id}
                    position={[v.last_lat as number, v.last_lng as number]}
                    icon={createVehicleMapIcon(v.plate_number, v.status, MAP_THEMES[mapThemeId]?.isDark || false)}
                  >
                    <Popup maxWidth={320}>
                      <div className="p-2 space-y-3 font-sans">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-2">
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{v.ref_id || 'VEH-UNIT'}</span>
                            <p className="text-base font-black leading-tight mt-0.5">{v.plate_number}</p>
                          </div>
                          <Badge className={cn(
                            "font-bold text-[10px] uppercase border px-2 py-0.5",
                            v.status === 'Available' && "bg-emerald-50 text-emerald-700 border-emerald-200",
                            v.status === 'Maintenance' && "bg-amber-50 text-amber-700 border-amber-200",
                            v.status === 'Inactive' && "bg-slate-100 text-slate-700 border-slate-200"
                          )}>
                            {v.status}
                          </Badge>
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
                            className="flex-1 h-8 bg-[#E8450F] hover:bg-[#D94800] text-white text-xs font-bold gap-1 border-0"
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
              {/* Says what is actually on the map, and names what is missing.
                  "N VEHICLES RENDERED" was counting the whole filter, including
                  the ones with no position at all. */}
              <span>{trackedVehicles.length} TRACKED IN CURRENT FILTER</span>
              {untrackedCount > 0 && (
                <span className="font-semibold text-amber-600 dark:text-amber-400">
                  • {untrackedCount} NO GPS
                </span>
              )}
            </div>

            {/* An empty map with no explanation reads as "nothing is moving".
                It usually means no tracker has reported yet. */}
            {trackedVehicles.length === 0 && (
              <div className="absolute inset-0 z-[400] flex items-center justify-center pointer-events-none">
                <div className={`px-4 py-3 rounded-xl shadow-lg border text-center max-w-xs ${
                  MAP_THEMES[mapThemeId]?.isDark
                    ? 'bg-[#090A0F]/90 backdrop-blur-xl border-white/10 text-white'
                    : 'bg-white/95 backdrop-blur-xl border-black/[0.08] text-[#111]'
                }`}>
                  <Navigation size={18} className="mx-auto mb-1.5 text-[#E8450F]" />
                  <p className="text-xs font-bold">Location unavailable</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {vehicles.length === 0
                      ? 'No vehicles match the current filter.'
                      : `None of the ${vehicles.length} vehicle${vehicles.length === 1 ? '' : 's'} in this filter has reported a GPS position yet.`}
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

      </div>
    </DashboardLayout>
  );
}
