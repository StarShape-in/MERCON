import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, Edit2, FileText, Truck } from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import Btn from '@/components/ui/Btn';
import { vehicleService, Vehicle, AssetStatus } from '@/services/vehicleService';

export default function VehicleListPage() {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState<AssetStatus | 'All'>('All');
  const [search, setSearch] = useState('');

  // Fetch vehicles using React Query
  const { data: vehiclesRes, isLoading } = useQuery({
    queryKey: ['vehicles', selectedStatus, search, currentPage],
    queryFn: () => vehicleService.getAll({
      status: selectedStatus === 'All' ? undefined : selectedStatus,
      search: search || undefined,
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
            onClick={() => navigate(`/vehicles/${row.id}`)}
            className="w-7 h-7 rounded-lg bg-[#F5F5F7] hover:bg-[#EBEBEF] flex items-center justify-center transition-colors"
            title="View Details"
          >
            <Eye size={13} className="text-[#6E6E80]" />
          </button>
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
      <div className="px-6 mb-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-4 border border-black/[0.06] shadow-sm flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs text-[#6E6E80] mt-0.5 font-medium">{s.label} Vehicles</p>
            </div>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: s.bg }}>
              <Truck size={16} style={{ color: s.color }} />
            </div>
          </div>
        ))}
      </div>

      <div className="px-6 pb-6">
        <DataTable
          columns={columns}
          data={vehicles}
          isLoading={isLoading}
          searchPlaceholder="Search by plate or ref ID..."
          onSearchChange={setSearch}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          filterElement={
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value as AssetStatus | 'All');
                setCurrentPage(1);
              }}
              className="text-xs font-semibold bg-white border border-black/[0.07] px-3 py-2 rounded-xl outline-none focus:border-[#E8450F] transition-colors"
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
    </DashboardLayout>
  );
}
