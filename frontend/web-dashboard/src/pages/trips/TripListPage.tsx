import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Download, Plus, Eye, Edit2, MapPin, Navigation, Truck } from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import Btn from '@/components/ui/Btn';
import { tripService, Trip, TripStatus } from '@/services/tripService';

export default function TripListPage() {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState<TripStatus | 'All'>('All');
  const [search, setSearch] = useState('');

  // Fetch trips using React Query
  const { data: tripsRes, isLoading } = useQuery({
    queryKey: ['trips', selectedStatus, currentPage],
    queryFn: () => tripService.getAll({
      status: selectedStatus === 'All' ? undefined : selectedStatus,
      page: currentPage,
      per_page: 10,
    }),
  });

  const trips = tripsRes?.data || [];
  const totalPages = tripsRes?.meta?.total_pages || 1;

  // Filtered trips count totals for stats header mockup
  const stats = [
    { label: 'Total', value: tripsRes?.meta?.total || trips.length, bg: '#F5F5F7', color: '#111' },
    { label: 'Completed', value: trips.filter(t => t.status === 'Completed').length, bg: '#F0FDF4', color: '#16A34A' },
    { label: 'In Transit', value: trips.filter(t => t.status === 'InTransit').length, bg: '#EFF6FF', color: '#2563EB' },
  ];

  const columns = [
    {
      header: 'Trip ID',
      accessor: (row: Trip) => (
        <span className="font-mono text-xs font-bold text-[#E8450F]">
          {row.ref_id || 'Draft'}
        </span>
      ),
    },
    {
      header: 'Customer',
      accessor: (row: Trip) => (
        <div className="font-semibold text-[#111]">{row.customer?.name || '—'}</div>
      ),
    },
    {
      header: 'Cargo Type',
      accessor: (row: Trip) => (
        <span className="text-xs text-[#444] font-medium">{row.cargo_type}</span>
      ),
    },
    {
      header: 'Driver',
      accessor: (row: Trip) => (
        <span className="text-xs text-[#444] font-semibold">
          {row.driver ? `${row.driver.first_name} ${row.driver.last_name}` : 'Unassigned'}
        </span>
      ),
    },
    {
      header: 'Vehicle',
      accessor: (row: Trip) => (
        <span className="font-mono text-xs text-[#6E6E80] font-semibold">
          {row.vehicle?.plate_number || 'Unassigned'}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: (row: Trip) => <StatusBadge status={row.status} />,
    },
    {
      header: 'Planned Start',
      accessor: (row: Trip) => (
        <span className="text-xs text-[#9898A4] font-medium">
          {row.planned_start ? new Date(row.planned_start).toLocaleDateString() : '—'}
        </span>
      ),
    },
    {
      header: 'Actions',
      accessor: (row: Trip) => (
        <div className="flex gap-1">
          <button 
            onClick={() => navigate(`/trips/${row.id}`)}
            className="w-7 h-7 rounded-lg bg-[#F5F5F7] hover:bg-[#EBEBEF] flex items-center justify-center transition-colors"
            title="View Details"
          >
            <Eye size={13} className="text-[#6E6E80]" />
          </button>
          <button 
            onClick={() => navigate(`/trips/${row.id}/edit`)}
            className="w-7 h-7 rounded-lg bg-[#F5F5F7] hover:bg-[#EBEBEF] flex items-center justify-center transition-colors"
            title="Edit Status"
          >
            <Edit2 size={13} className="text-[#6E6E80]" />
          </button>
          {row.status === 'InTransit' && (
            <button 
              onClick={() => navigate(`/trips/${row.id}/track`)}
              className="w-7 h-7 rounded-lg bg-[#E8450F]/10 hover:bg-[#E8450F]/20 flex items-center justify-center transition-colors"
              title="Track Live"
            >
              <Navigation size={13} className="text-[#E8450F]" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout 
      active="Trips" 
      title="Trips" 
      pageTitle="Trip Management" 
      pageSub="Manage and monitor operator shipping operations"
      actions={
        <>
          <Btn 
            label="New Trip" 
            icon={<Plus size={14} />} 
            onClick={() => navigate('/trips/new')}
          />
        </>
      }
    >
      <div className="px-6 mb-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-4 border border-black/[0.06] shadow-sm flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs text-[#6E6E80] mt-0.5 font-medium">{s.label} Trips</p>
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
          data={trips}
          isLoading={isLoading}
          searchPlaceholder="Search trips..."
          onSearchChange={setSearch}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          filterElement={
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value as TripStatus | 'All');
                setCurrentPage(1);
              }}
              className="text-xs font-semibold bg-white border border-black/[0.07] px-3 py-2 rounded-xl outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Dispatched">Dispatched</option>
              <option value="AtPickup">At Pickup</option>
              <option value="InTransit">In Transit</option>
              <option value="AtDelivery">At Delivery</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          }
        />
      </div>
    </DashboardLayout>
  );
}
