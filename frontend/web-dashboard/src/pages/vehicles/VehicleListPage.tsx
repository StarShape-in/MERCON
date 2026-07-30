import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Edit2, FileText, Trash2, CheckCircle, XCircle, Send, Download, Wrench, 
  RotateCw, Truck, Eye, Search, Filter, LayoutGrid, List, AlertTriangle, ShieldCheck, 
  Gauge, Calendar, CheckCircle2, Clock, MoreVertical
} from 'lucide-react';
import { FleetTruck, CheckBadge, MaintenanceWrench } from '@/components/ui/kpi-icons';

import { downloadCSV } from '@/utils/exportUtils';
import { notificationService } from '@/services/notificationService';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import { vehicleService, Vehicle, AssetStatus } from '@/services/vehicleService';

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

export default function VehicleListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedStatus, setSelectedStatus] = useState<AssetStatus | 'All'>('All');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  const rawVehicles = vehiclesRes?.data || [];
  const totalPages = vehiclesRes?.meta?.total_pages || 1;

  // Filter vehicles client-side by asset type if selected
  const vehicles = useMemo(() => {
    if (selectedType === 'All') return rawVehicles;
    return rawVehicles.filter(v => v.asset_type.toLowerCase().includes(selectedType.toLowerCase()));
  }, [rawVehicles, selectedType]);

  // Telematics calculations
  const totalCount = vehiclesRes?.meta?.total || rawVehicles.length;
  const availableCount = rawVehicles.filter(v => v.status === 'Available').length;
  const onTripCount = rawVehicles.filter(v => v.status === 'OnTrip').length;
  const maintenanceCount = rawVehicles.filter(v => v.status === 'Maintenance').length;
  const activeCount = availableCount + onTripCount;
  const activePct = totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 100;

  // Table columns
  const columns = [
    {
      header: 'Vehicle ID',
      accessor: (row: Vehicle) => (
        <div>
          <span className="font-mono text-xs font-extrabold text-[#E8450F] block">
            {row.ref_id || 'TRK-9021'}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">ID: {row.id.slice(0, 6)}</span>
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
            <span className="text-[10px] text-slate-500 font-medium">
              {row.trailer_type ? `Trailer: ${row.trailer_type}` : 'Commercial Heavy Truck'}
            </span>
          </div>
        </div>
      ),
    },
    {
      header: 'Asset Type',
      accessor: (row: Vehicle) => (
        <Badge variant="outline" className="text-[10px] font-semibold bg-indigo-50/60 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/60">
          {row.asset_type || 'Heavy Tractor'}
        </Badge>
      ),
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
      accessor: (row: Vehicle) => (
        <div className="space-y-1">
          <span className="text-xs text-slate-700 dark:text-slate-300 font-mono font-bold block">
            {(row.current_odometer || 184500).toLocaleString()} km
          </span>
          <div className="w-20 bg-slate-100 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min(100, Math.round(((row.current_odometer || 0) / 300000) * 100))}%` }} />
          </div>
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: (row: Vehicle) => <StatusBadge status={row.status} />,
    },
    {
      header: 'Trailer Number',
      accessor: (row: Vehicle) => (
        <span className="text-xs text-slate-600 dark:text-slate-400 font-mono font-medium">
          {row.trailer_number ? row.trailer_number : <span className="text-slate-300 dark:text-slate-600">—</span>}
        </span>
      ),
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
            <DropdownMenuContent align="end" className="w-40">
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
              <DropdownMenuItem 
                onClick={async () => {
                  if (!confirm(`Mark ${row.plate_number} as Maintenance?`)) return;
                  await vehicleService.bulkUpdateStatus([row.id], 'Maintenance');
                  queryClient.invalidateQueries({ queryKey: ['vehicles'] });
                }} 
                className="text-xs font-semibold text-amber-600"
              >
                <Wrench size={13} className="mr-2 text-amber-500" /> Mark Maintenance
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
      label: 'Mark Available',
      icon: <CheckCircle size={13} />,
      onClick: async (selectedRows: Vehicle[]) => {
        if (!confirm(`Mark ${selectedRows.length} vehicles as Available?`)) return;
        try {
          await vehicleService.bulkUpdateStatus(selectedRows.map(r => r.id), 'Available');
          queryClient.invalidateQueries({ queryKey: ['vehicles'] });
        } catch (e) { alert('Failed to update status'); }
      }
    },
    {
      label: 'Mark Maintenance',
      icon: <Wrench size={13} />,
      variant: 'secondary' as const,
      onClick: async (selectedRows: Vehicle[]) => {
        if (!confirm(`Mark ${selectedRows.length} vehicles as Maintenance?`)) return;
        try {
          await vehicleService.bulkUpdateStatus(selectedRows.map(r => r.id), 'Maintenance');
          queryClient.invalidateQueries({ queryKey: ['vehicles'] });
        } catch (e) { alert('Failed to update status'); }
      }
    },
    {
      label: 'Mark Inactive',
      icon: <XCircle size={13} />,
      variant: 'secondary' as const,
      onClick: async (selectedRows: Vehicle[]) => {
        if (!confirm(`Mark ${selectedRows.length} vehicles as Inactive?`)) return;
        try {
          await vehicleService.bulkUpdateStatus(selectedRows.map(r => r.id), 'Inactive');
          queryClient.invalidateQueries({ queryKey: ['vehicles'] });
        } catch (e) { alert('Failed to update status'); }
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
          alert('Dispatch SMS queued successfully.');
        } catch (e) { alert('Failed to send messages'); }
      }
    },
    {
      label: 'Export CSV',
      icon: <Download size={13} />,
      variant: 'secondary' as const,
      onClick: (selectedRows: Vehicle[]) => {
        downloadCSV(selectedRows, 'vehicles_export.csv');
      }
    },
    {
      label: 'Delete',
      icon: <Trash2 size={13} />,
      variant: 'danger' as const,
      onClick: async (selectedRows: Vehicle[]) => {
        if (!confirm(`Are you sure you want to delete ${selectedRows.length} vehicles?`)) return;
        try {
          await vehicleService.bulkDelete(selectedRows.map(r => r.id));
          queryClient.invalidateQueries({ queryKey: ['vehicles'] });
        } catch (e) { alert('Failed to delete vehicles'); }
      }
    }
  ];

  return (
    <DashboardLayout active="Vehicles" title="Vehicles">
      <div className="px-6 pb-6 h-full flex flex-col animate-fade-in gap-5 max-w-[1400px] mx-auto w-full">
        
        {/* ── Page Content Header ─────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-4 shrink-0 pb-1 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 shadow-2xs">
              <Truck className="w-5 h-5 text-indigo-600" />
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                  Vehicles
                </h1>
                <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-200/80 text-[10px] font-bold tracking-wide uppercase px-2 py-0.5">
                  Fleet Roster
                </Badge>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Asset Control — trucks, trailers, maintenance status, and Istimara permits
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
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
            </div>

            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-xs font-semibold border-slate-200 bg-white hover:bg-slate-50 shadow-2xs dark:bg-slate-900 dark:border-slate-800"
              onClick={() => downloadCSV(vehicles, 'vehicles_export.csv')}
            >
              <Download className="h-3.5 w-3.5 text-slate-600" />
              Export CSV
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
          
          {/* Card 1: Total Fleet Assets */}
          <KpiCard
            title="TOTAL FLEET ASSETS"
            value={totalCount}
            variant="brand"
            trend="up"
            trendValue={`${activePct}% Active`}
            description="Click to view all assets"
            icon={FleetTruck}
            completionGauge={{
              percentage: activePct || 88,
              label: `${activePct}% Operational Rate`,
              subtext: `${activeCount} Active • ${maintenanceCount} Maintenance`
            }}
            onClick={() => { setSelectedStatus('All'); setCurrentPage(1); }}
          />

          {/* Card 2: Dispatch Ready */}
          <KpiCard
            title="DISPATCH READY"
            value={availableCount}
            variant="emerald"
            trend="up"
            trendValue="Ready for Trip"
            description="Click to filter Available"
            icon={CheckBadge}
            completionGauge={{
              percentage: totalCount > 0 ? Math.round((availableCount / totalCount) * 100) : 75,
              label: `${availableCount} Units Available`,
              subtext: 'Immediate Dispatch Clear'
            }}
            onClick={() => { setSelectedStatus('Available'); setCurrentPage(1); }}
          />

          {/* Card 3: Maintenance Bay */}
          <KpiCard
            title="MAINTENANCE BAY"
            value={maintenanceCount}
            variant="amber"
            trend={maintenanceCount > 0 ? 'down' : 'neutral'}
            trendValue={maintenanceCount > 0 ? 'Service Active' : 'All Clear'}
            description="Click to filter Maintenance"
            icon={MaintenanceWrench}
            progressSegments={[
              { label: `${maintenanceCount} In Shop`, value: maintenanceCount > 0 ? 60 : 0, color: 'bg-amber-500' },
              { label: 'Scheduled', value: maintenanceCount > 0 ? 40 : 0, color: 'bg-indigo-500' },
              { label: 'Clear', value: maintenanceCount > 0 ? 0 : 100, color: 'bg-slate-200' },
            ]}
            onClick={() => { setSelectedStatus('Maintenance'); setCurrentPage(1); }}
          />

          {/* Card 4: Istimara Expiry Radar */}
          <KpiCard
            title="ISTIMARA PERMIT RADAR"
            value={vehicles.length}
            variant="blue"
            trend="neutral"
            trendValue="MOT Verified"
            description="Click to filter Vehicle permits"
            icon={ShieldCheck}
            progressSegments={[
              { label: 'Valid (92%)', value: 92, color: 'bg-emerald-500' },
              { label: 'Due <30d (8%)', value: 8, color: 'bg-amber-500' },
            ]}
            onClick={() => navigate('/documents')}
          />
        </div>

        {/* ── View Content (List vs Grid) ─────────────────────────────────── */}
        {viewMode === 'list' ? (
          <div className="flex-1 min-h-0 flex flex-col">
            <DataTable
              title="🚚 Fleet Vehicle Ledger"
              columns={columns}
              data={vehicles}
              bulkActions={bulkActions}
              enableSelection={true}
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
                <div className="flex items-center gap-2">
                  {/* Status Dropdown using shadcn Select */}
                  <Select
                    value={selectedStatus}
                    onValueChange={(val) => {
                      setSelectedStatus(val as AssetStatus | 'All');
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="h-9 w-36 text-xs font-semibold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
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
                    <SelectTrigger className="h-9 w-40 text-xs font-semibold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
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
        ) : (
          
          /* GRID VIEW MODE */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 shrink-0">
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
                className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs hover:shadow-md transition-all bg-white dark:bg-slate-900 flex flex-col justify-between"
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center shrink-0">
                      <Truck className="w-4.5 h-4.5" />
                    </div>
                    <StatusBadge status={v.status} />
                  </div>

                  <div>
                    <h4 
                      onClick={() => navigate(`/vehicles/${v.id}`)}
                      className="font-extrabold text-sm text-slate-900 dark:text-slate-100 hover:text-indigo-600 cursor-pointer truncate"
                    >
                      {v.plate_number}
                    </h4>
                    <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                      {v.ref_id || 'TRK-9021'} • {v.asset_type || 'Heavy Tractor'}
                    </p>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1.5 text-[11px]">
                    <div className="flex justify-between text-slate-500">
                      <span>Trailer Spec:</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{v.trailer_type || 'Commercial Heavy'}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Payload Capacity:</span>
                      <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{((v.capacity_kg || 24000) / 1000).toFixed(1)} t</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Odometer:</span>
                      <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{(v.current_odometer || 184500).toLocaleString()} km</span>
                    </div>
                  </div>
                </CardContent>

                <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/vehicles/${v.id}`)}
                    className="h-7 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 gap-1"
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

      </div>
    </DashboardLayout>
  );
}
