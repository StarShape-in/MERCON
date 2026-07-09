import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, Edit2, FileText, User } from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import Btn from '@/components/ui/Btn';
import { driverService, Driver, DriverStatus } from '@/services/driverService';

export default function DriverListPage() {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState<DriverStatus | 'All'>('All');
  const [search, setSearch] = useState('');

  // Fetch drivers using React Query
  const { data: driversRes, isLoading } = useQuery({
    queryKey: ['drivers', selectedStatus, search, currentPage],
    queryFn: () => driverService.getAll({
      status: selectedStatus === 'All' ? undefined : selectedStatus,
      search: search || undefined,
      page: currentPage,
      per_page: 10,
    }),
  });

  const drivers = driversRes?.data || [];
  const totalPages = driversRes?.meta?.total_pages || 1;

  // Filtered drivers count totals for stats header
  const stats = [
    { label: 'Total', value: driversRes?.meta?.total || drivers.length, bg: '#F5F5F7', color: '#111' },
    { label: 'Available', value: drivers.filter(d => d.status === 'Available').length, bg: '#F0FDF4', color: '#16A34A' },
    { label: 'On Trip', value: drivers.filter(d => d.status === 'OnTrip').length, bg: '#EFF6FF', color: '#2563EB' },
  ];

  const columns = [
    {
      header: 'Driver ID',
      accessor: (row: Driver) => (
        <span className="font-mono text-xs font-bold text-[#E8450F]">
          {row.ref_id || 'Draft'}
        </span>
      ),
    },
    {
      header: 'Name',
      accessor: (row: Driver) => (
        <div className="font-semibold text-[#111]">
          {row.first_name} {row.last_name}
        </div>
      ),
    },
    {
      header: 'Phone',
      accessor: (row: Driver) => (
        <span className="text-xs text-[#444] font-medium">{row.phone_primary}</span>
      ),
    },
    {
      header: 'License No.',
      accessor: (row: Driver) => (
        <span className="font-mono text-xs text-[#6E6E80] font-semibold">
          {row.license_number}
        </span>
      ),
    },
    {
      header: 'License Expiry',
      accessor: (row: Driver) => {
        const isExpired = new Date(row.license_expiry) < new Date();
        return (
          <span className={`text-xs font-medium ${isExpired ? 'text-red-500' : 'text-[#444]'}`}>
            {new Date(row.license_expiry).toLocaleDateString()}
          </span>
        );
      },
    },
    {
      header: 'Status',
      accessor: (row: Driver) => <StatusBadge status={row.status} />,
    },
    {
      header: 'Risk Score',
      accessor: (row: Driver) => {
        const score = row.ai_risk_score || 0;
        let color = '#16A34A'; // Green
        if (score > 3) color = '#EAB308'; // Yellow
        if (score > 7) color = '#DC2626'; // Red
        return (
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-xs font-bold" style={{ color }}>
              {score.toFixed(1)}
            </span>
          </div>
        );
      },
    },
    {
      header: 'Actions',
      accessor: (row: Driver) => (
        <div className="flex gap-1">
          <button 
            onClick={() => navigate(`/drivers/${row.id}`)}
            className="w-7 h-7 rounded-lg bg-[#F5F5F7] hover:bg-[#EBEBEF] flex items-center justify-center transition-colors"
            title="View Details"
          >
            <Eye size={13} className="text-[#6E6E80]" />
          </button>
          <button 
            onClick={() => navigate(`/drivers/${row.id}/edit`)}
            className="w-7 h-7 rounded-lg bg-[#F5F5F7] hover:bg-[#EBEBEF] flex items-center justify-center transition-colors"
            title="Edit Driver"
          >
            <Edit2 size={13} className="text-[#6E6E80]" />
          </button>
          <button 
            onClick={() => navigate(`/drivers/${row.id}/documents`)}
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
      active="Drivers" 
      title="Drivers" 
      pageTitle="Driver Management" 
      pageSub="Manage your fleet drivers, performance, and compliance"
      actions={
        <>
          <Btn 
            label="Add Driver" 
            icon={<Plus size={14} />} 
            onClick={() => navigate('/drivers/new')}
          />
        </>
      }
    >
      <div className="px-6 mb-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-4 border border-black/[0.06] shadow-sm flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs text-[#6E6E80] mt-0.5 font-medium">{s.label} Drivers</p>
            </div>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: s.bg }}>
              <User size={16} style={{ color: s.color }} />
            </div>
          </div>
        ))}
      </div>

      <div className="px-6 pb-6">
        <DataTable
          columns={columns}
          data={drivers}
          isLoading={isLoading}
          searchPlaceholder="Search drivers by name or phone..."
          onSearchChange={setSearch}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          filterElement={
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value as DriverStatus | 'All');
                setCurrentPage(1);
              }}
              className="text-xs font-semibold bg-white border border-black/[0.07] px-3 py-2 rounded-xl outline-none focus:border-[#E8450F] transition-colors"
            >
              <option value="All">All Statuses</option>
              <option value="Available">Available</option>
              <option value="OnTrip">On Trip</option>
              <option value="OffDuty">Off Duty</option>
              <option value="Inactive">Inactive</option>
            </select>
          }
        />
      </div>
    </DashboardLayout>
  );
}
