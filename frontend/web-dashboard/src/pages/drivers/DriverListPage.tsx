import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, FileText, Trash2, CheckCircle, XCircle, Send, Download } from 'lucide-react';
import { DriverBadge, CheckBadge, RouteLine } from '@/components/ui/kpi-icons';

import { downloadCSV } from '@/utils/exportUtils';
import { notificationService } from '@/services/notificationService';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import Btn from '@/components/ui/Btn';
import { driverService, Driver, DriverStatus } from '@/services/driverService';

export default function DriverListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState<DriverStatus | 'All'>('All');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);

  // Fetch drivers using React Query
  const { data: driversRes, isLoading } = useQuery({
    queryKey: ['drivers', selectedStatus, debouncedSearch, currentPage],
    queryFn: () => driverService.getAll({
      status: selectedStatus === 'All' ? undefined : selectedStatus,
      search: debouncedSearch || undefined,
      page: currentPage,
      per_page: 10,
    }),
  });

  const drivers = driversRes?.data || [];
  const totalPages = driversRes?.meta?.total_pages || 1;

  // Filtered drivers count totals for stats header
  const stats = [
    { label: 'Total', value: driversRes?.meta?.total || drivers.length, bg: '#F5F5F7', color: '#111', icon: DriverBadge },
    { label: 'Available', value: drivers.filter(d => d.status === 'Available').length, bg: '#F0FDF4', color: '#16A34A', icon: CheckBadge },
    { label: 'On Trip', value: drivers.filter(d => d.status === 'OnTrip').length, bg: '#EFF6FF', color: '#2563EB', icon: RouteLine },
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

  const bulkActions = [
    {
      label: 'Mark Available',
      icon: <CheckCircle size={13} />,
      onClick: async (selectedRows: Driver[]) => {
        if (!confirm(`Mark ${selectedRows.length} drivers as Available?`)) return;
        try {
          await driverService.bulkUpdateStatus(selectedRows.map(r => r.id), 'Available');
          queryClient.invalidateQueries({ queryKey: ['drivers'] });
        } catch (e) { alert('Failed to update status'); }
      }
    },
    {
      label: 'Mark Inactive',
      icon: <XCircle size={13} />,
      variant: 'secondary' as const,
      onClick: async (selectedRows: Driver[]) => {
        if (!confirm(`Mark ${selectedRows.length} drivers as Inactive?`)) return;
        try {
          await driverService.bulkUpdateStatus(selectedRows.map(r => r.id), 'Inactive');
          queryClient.invalidateQueries({ queryKey: ['drivers'] });
        } catch (e) { alert('Failed to update status'); }
      }
    },
    {
      label: 'Send Message',
      icon: <Send size={13} />,
      variant: 'secondary' as const,
      onClick: async (selectedRows: Driver[]) => {
        const msg = prompt('Enter message to send via SMS to selected drivers:');
        if (!msg) return;
        try {
          await notificationService.sendBulkCommunication({
            entity_type: 'Driver',
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
      onClick: (selectedRows: Driver[]) => {
        downloadCSV(selectedRows, 'drivers_export.csv');
      }
    },
    {
      label: 'Delete',
      icon: <Trash2 size={13} />,
      variant: 'danger' as const,
      onClick: async (selectedRows: Driver[]) => {
        if (!confirm(`Are you sure you want to delete ${selectedRows.length} drivers?`)) return;
        try {
          await driverService.bulkDelete(selectedRows.map(r => r.id));
          queryClient.invalidateQueries({ queryKey: ['drivers'] });
        } catch (e) { alert('Failed to delete drivers'); }
      }
    }
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
      <div className="px-6 pb-6 h-full flex flex-col animate-fade-in">
        <div className="mb-4 flex gap-4 overflow-x-auto pb-2 shrink-0 hide-scrollbar">
          {stats.map((s) => (
            <div key={s.label} className="bg-white rounded-lg p-5 border border-black/[0.06] shadow-sm flex flex-col justify-center items-center flex-1 min-w-[200px] py-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-3 transition-transform group-hover:scale-110" style={{ backgroundColor: s.bg }}>
                <s.icon className="w-6 h-6" style={{ color: s.color }} />
              </div>
              <p className="text-2xl font-extrabold leading-none tracking-tight mb-1.5 text-center" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px] font-bold text-[#9898A4] uppercase tracking-wider text-center px-1 leading-tight">{s.label} Drivers</p>
            </div>
          ))}
        </div>

        <div className="px-6 pb-6">
        <DataTable
          columns={columns}
          data={drivers}
          bulkActions={bulkActions}
          isLoading={isLoading}
          searchPlaceholder="Search drivers by name or phone..."
          onSearchChange={setSearch}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          onRowClick={(row) => navigate(`/drivers/${row.id}`)}
          filterElement={
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value as DriverStatus | 'All');
                setCurrentPage(1);
              }}
              className="text-xs font-semibold bg-white border border-black/[0.07] px-3 py-2 rounded-lg outline-none focus:border-[#E8450F] transition-colors"
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
      </div>
    </DashboardLayout>
  );
}
