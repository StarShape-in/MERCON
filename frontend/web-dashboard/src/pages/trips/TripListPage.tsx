import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Download, Plus, Edit2, MapPin, Navigation, Trash2 } from 'lucide-react';
import { TruckMotion, CheckBadge, RouteLine } from '@/components/ui/kpi-icons';

import { downloadCSV } from '@/utils/exportUtils';

import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import Btn from '@/components/ui/Btn';
import { tripService, Trip, TripStatus } from '@/services/tripService';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

import KpiCard from '@/components/ui/KpiCard';

export default function TripListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState<TripStatus | 'All'>('All');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);

  // Fetch trips using React Query
  const { data: tripsRes, isLoading } = useQuery({
    queryKey: ['trips', selectedStatus, debouncedSearch, currentPage],
    queryFn: () => tripService.getAll({
      status: selectedStatus === 'All' ? undefined : selectedStatus,
      search: debouncedSearch || undefined,
      page: currentPage,
      per_page: 10,
    }),
  });

  const trips = tripsRes?.data || [];
  const totalPages = tripsRes?.meta?.total_pages || 1;

  // Filtered trips count totals for stats header mockup
  const stats = [
    { label: 'Total', value: tripsRes?.meta?.total || trips.length, bg: '#F5F5F7', color: '#111', icon: TruckMotion },
    { label: 'Completed', value: trips.filter(t => t.status === 'Completed').length, bg: '#F0FDF4', color: '#16A34A', icon: CheckBadge },
    { label: 'In Transit', value: trips.filter(t => t.status === 'InTransit').length, bg: '#EFF6FF', color: '#2563EB', icon: RouteLine },
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

  const bulkActions = [
    {
      label: 'Export CSV',
      icon: <Download size={13} />,
      variant: 'secondary' as const,
      onClick: (selectedRows: Trip[]) => {
        downloadCSV(selectedRows, 'trips_export.csv');
      }
    },
    {
      label: 'Delete',
      icon: <Trash2 size={13} />,
      variant: 'danger' as const,
      onClick: async (selectedRows: Trip[]) => {
        if (!confirm(`Are you sure you want to delete ${selectedRows.length} trips?`)) return;
        try {
          await tripService.bulkDelete(selectedRows.map(r => r.id));
          queryClient.invalidateQueries({ queryKey: ['trips'] });
        } catch (e) { alert('Failed to delete trips'); }
      }
    }
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
      <div className="px-6 pb-6 h-full flex flex-col animate-fade-in">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 shrink-0">
          <KpiCard
            title="Total Trips"
            value={tripsRes?.meta?.total || trips.length}
            variant="brand"
            trend="up"
            trendValue="+12%"
            description="Total logged trips"
            icon={TruckMotion}
            chartData={[10, 14, 18, 15, 22, 28, 35]}
          />
          <KpiCard
            title="Completed Trips"
            value={trips.filter(t => t.status === 'Completed').length}
            variant="emerald"
            trend="up"
            trendValue="Delivered"
            description="Completed shipments"
            icon={CheckBadge}
            chartData={[8, 12, 14, 13, 19, 24, 30]}
          />
          <KpiCard
            title="In Transit"
            value={trips.filter(t => t.status === 'InTransit').length}
            variant="blue"
            trend="neutral"
            trendValue="Active"
            description="On the road now"
            icon={RouteLine}
            chartData={[2, 3, 4, 3, 5, 4, 6]}
          />
        </div>

        <div className="flex-1 min-h-0 flex flex-col">
        <DataTable
          columns={columns}
          data={trips}
          bulkActions={bulkActions}
          isLoading={isLoading}
          searchPlaceholder="Search trips..."
          searchValue={search}
          onSearchChange={setSearch}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          onRowClick={(row) => navigate(`/trips/${row.id}`)}
          filterElement={
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value as TripStatus | 'All');
                setCurrentPage(1);
              }}
              className="text-xs font-semibold bg-white border border-black/[0.07] px-3 py-2 rounded-lg outline-none"
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
      </div>
    </DashboardLayout>
  );
}
