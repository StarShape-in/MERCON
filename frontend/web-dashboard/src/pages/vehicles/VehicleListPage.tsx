import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, FileText, Trash2, CheckCircle, XCircle, Send, Download, Wrench, RotateCw, Truck } from 'lucide-react';
import { FleetTruck, CheckBadge, MaintenanceWrench } from '@/components/ui/kpi-icons';

import { downloadCSV } from '@/utils/exportUtils';
import { notificationService } from '@/services/notificationService';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import Btn from '@/components/ui/Btn';
import { vehicleService, Vehicle, AssetStatus } from '@/services/vehicleService';

import KpiCard from '@/components/ui/KpiCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function VehicleListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState<AssetStatus | 'All'>('All');
  const [search, setSearch] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 300);

  // Fetch vehicles using React Query
  const { data: vehiclesRes, isLoading } = useQuery({
    queryKey: ['vehicles', selectedStatus, debouncedSearch, currentPage],
    queryFn: () => vehicleService.getAll({
      status: selectedStatus === 'All' ? undefined : selectedStatus,
      search: debouncedSearch || undefined,
      page: currentPage,
      per_page: 10,
    }),
  });

  const vehicles = vehiclesRes?.data || [];
  const totalPages = vehiclesRes?.meta?.total_pages || 1;

  // Stats
  const stats = [
    { label: 'Total', value: vehiclesRes?.meta?.total || vehicles.length, bg: '#F5F5F7', color: '#111', icon: FleetTruck },
    { label: 'Available', value: vehicles.filter(v => v.status === 'Available').length, bg: '#F0FDF4', color: '#16A34A', icon: CheckBadge },
    { label: 'Maintenance', value: vehicles.filter(v => v.status === 'Maintenance').length, bg: '#FEF2F2', color: '#DC2626', icon: MaintenanceWrench },
  ];

  const columns = [
    {
      header: 'Vehicle ID',
      accessor: (row: Vehicle) => (
        <span className="font-mono text-xs font-bold text-[#E8450F]">
          {row.ref_id || 'NO-REF'}
        </span>
      ),
    },
    {
      header: 'Plate Number',
      accessor: (row: Vehicle) => (
        <div className="font-semibold text-[#111]">
          {row.plate_number}
        </div>
      ),
    },
    {
      header: 'Type',
      accessor: (row: Vehicle) => (
        <span className="text-xs text-[#444] font-medium">{row.asset_type}</span>
      ),
    },
    {
      header: 'Capacity',
      accessor: (row: Vehicle) => (
        <span className="font-medium text-[#444]">
          {((row.capacity_kg || 0) / 1000).toFixed(1)}t
        </span>
      ),
    },
    {
      header: 'Odometer',
      accessor: (row: Vehicle) => (
        <span className="text-xs text-[#6E6E80] font-medium">
          {row.current_odometer.toLocaleString()} km
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: (row: Vehicle) => <StatusBadge status={row.status} />,
    },
    {
      header: 'Trailer Attached',
      accessor: (row: Vehicle) => (
        <span className="text-xs text-[#444] font-medium">
          {row.trailer_number ? row.trailer_number : <span className="text-[#9898A4]">None</span>}
        </span>
      ),
    },
    {
      header: 'Actions',
      accessor: (row: Vehicle) => (
        <div className="flex gap-1">
          <button 
            onClick={() => navigate(`/vehicles/${row.id}/edit`)}
            className="w-7 h-7 rounded-lg bg-[#F5F5F7] hover:bg-[#EBEBEF] flex items-center justify-center transition-colors"
            title="Edit Vehicle"
          >
            <Edit2 size={13} className="text-[#6E6E80]" />
          </button>
          <button 
            onClick={() => navigate(`/vehicles/${row.id}/documents`)}
            className="w-7 h-7 rounded-lg bg-[#F5F5F7] hover:bg-[#EBEBEF] flex items-center justify-center transition-colors"
            title="Documents"
          >
            <FileText size={13} className="text-[#6E6E80]" />
          </button>
        </div>
      ),
    },
  ];

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
      label: 'Send Message',
      icon: <Send size={13} />,
      variant: 'secondary' as const,
      onClick: async (selectedRows: Vehicle[]) => {
        const msg = prompt('Enter message to send via SMS to drivers of selected vehicles:');
        if (!msg) return;
        try {
          await notificationService.sendBulkCommunication({
            entity_type: 'Vehicle',
            ids: selectedRows.map(r => r.id),
            method: 'sms',
            subject: 'Dashboard Update',
            message: msg
          });
          alert('Messages queued successfully (simulated).');
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
    <DashboardLayout 
      active="Vehicles" 
      title="Vehicles" 
    >
      <div className="px-6 pb-6 h-full flex flex-col animate-fade-in gap-5">
        
        {/* Page Content Header Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 shrink-0 pb-1">
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
                  Fleet Module
                </Badge>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Scope: Manage trucks, trailers, and maintenance status
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-xs font-semibold border-slate-200 bg-white hover:bg-slate-50 shadow-2xs"
              onClick={() => downloadCSV(vehicles, 'vehicles_export.csv')}
            >
              <Download className="h-3.5 w-3.5 text-slate-600" />
              Export CSV
            </Button>

            <Button
              size="sm"
              className="h-9 gap-1.5 text-xs font-bold bg-[#E8450F] hover:bg-[#d03d0c] text-white shadow-xs rounded-md px-4"
              onClick={() => navigate('/vehicles/new')}
            >
              <Plus className="h-4 w-4" />
              Add Vehicle
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 p-0 text-slate-600 border-slate-200 bg-white hover:bg-slate-50 shadow-2xs"
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 shrink-0">
          <KpiCard
            title="Total Fleet"
            value={vehiclesRes?.meta?.total || vehicles.length}
            variant="blue"
            trend="neutral"
            trendValue="Fleet Size"
            description="Trucks & trailers"
            icon={FleetTruck}
            chartData={[12, 14, 15, 18, 20, 22, 25]}
          />
          <KpiCard
            title="Available"
            value={vehicles.filter(v => v.status === 'Available').length}
            variant="emerald"
            trend="up"
            trendValue="Ready"
            description="Ready for dispatch"
            icon={CheckBadge}
            chartData={[8, 10, 11, 13, 14, 16, 18]}
          />
          <KpiCard
            title="In Maintenance"
            value={vehicles.filter(v => v.status === 'Maintenance').length}
            variant="amber"
            trend="down"
            trendValue="Service"
            description="Workshop maintenance"
            icon={MaintenanceWrench}
            chartData={[2, 3, 1, 4, 2, 3, 2]}
          />
        </div>

        <div className="flex-1 min-h-0 flex flex-col">
        <DataTable
          columns={columns}
          data={vehicles}
          bulkActions={bulkActions}
          isLoading={isLoading}
          searchPlaceholder="Search by plate or ref ID..."
          onSearchChange={setSearch}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          onRowClick={(row) => navigate(`/vehicles/${row.id}`)}
          filterElement={
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value as AssetStatus | 'All');
                setCurrentPage(1);
              }}
              className="text-xs font-semibold bg-white border border-black/[0.07] px-3 py-2 rounded-lg outline-none focus:border-[#E8450F] transition-colors"
            >
              <option value="All">All Statuses</option>
              <option value="Available">Available</option>
              <option value="OnTrip">On Trip</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Inactive">Inactive</option>
            </select>
          }
        />
        </div>
      </div>
    </DashboardLayout>
  );
}
