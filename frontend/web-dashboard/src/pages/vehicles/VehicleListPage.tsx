import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, FileText, Truck, Trash2, CheckCircle, XCircle, Send, Download, Wrench } from 'lucide-react';

import { downloadCSV } from '@/utils/exportUtils';
import { notificationService } from '@/services/notificationService';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import Btn from '@/components/ui/Btn';
import { vehicleService, Vehicle, AssetStatus } from '@/services/vehicleService';

export default function VehicleListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState<AssetStatus | 'All'>('All');
  const [search, setSearch] = useState('');
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
    { label: 'Total', value: vehiclesRes?.meta?.total || vehicles.length, bg: '#F5F5F7', color: '#111' },
    { label: 'Available', value: vehicles.filter(v => v.status === 'Available').length, bg: '#F0FDF4', color: '#16A34A' },
    { label: 'Maintenance', value: vehicles.filter(v => v.status === 'Maintenance').length, bg: '#FEF2F2', color: '#DC2626' },
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
      pageTitle="Vehicle Fleet" 
      pageSub="Manage trucks, trailers, and maintenance status"
      actions={
        <>
          <Btn 
            label="Add Vehicle" 
            icon={<Plus size={14} />} 
            onClick={() => navigate('/vehicles/new')}
          />
        </>
      }
    >
      <div className="px-6 pb-6 h-full flex flex-col animate-fade-in">
        <div className="mb-4 flex gap-4 overflow-x-auto pb-2 shrink-0 hide-scrollbar">
          {stats.map((s) => (
            <div key={s.label} className="bg-white rounded-lg p-5 border border-black/[0.06] shadow-sm flex flex-col justify-center items-center flex-1 min-w-[200px] py-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-3 transition-transform group-hover:scale-110" style={{ backgroundColor: s.bg }}>
                <Truck size={24} style={{ color: s.color }} />
              </div>
              <p className="text-2xl font-extrabold leading-none tracking-tight mb-1.5 text-center" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px] font-bold text-[#9898A4] uppercase tracking-wider text-center px-1 leading-tight">{s.label} Vehicles</p>
            </div>
          ))}
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
