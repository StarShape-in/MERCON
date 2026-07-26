import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, FileText, Building2 } from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import Btn from '@/components/ui/Btn';
import { customerService, Customer } from '@/services/customerService';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

export default function CustomerListPage() {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);

  // Fetch customers using React Query
  const { data: customersRes, isLoading } = useQuery({
    queryKey: ['customers', debouncedSearch, currentPage],
    queryFn: () => customerService.getAll({
      search: debouncedSearch || undefined,
      page: currentPage,
      per_page: 10,
    }),
  });

  const customers = customersRes?.data || [];
  const totalPages = customersRes?.meta?.total_pages || 1;

  // Stats
  const stats = [
    { label: 'Total', value: customersRes?.meta?.total || customers.length, bg: '#F5F5F7', color: '#111' },
    { label: 'Active', value: customers.filter(c => c.isActive).length, bg: '#F0FDF4', color: '#16A34A' },
  ];

  const columns = [
    {
      header: 'Customer ID',
      accessor: (row: Customer) => (
        <span className="font-mono text-xs font-bold text-[#E8450F]">
          {row.id.split('-')[0].toUpperCase()}
        </span>
      ),
    },
    {
      header: 'Company Name',
      accessor: (row: Customer) => (
        <div className="font-semibold text-[#111]">
          {row.name}
        </div>
      ),
    },
    {
      header: 'Contact Phone',
      accessor: (row: Customer) => (
        <span className="text-xs text-[#444] font-medium">{row.contact_phone}</span>
      ),
    },
    {
      header: 'Credit Limit',
      accessor: (row: Customer) => (
        <span className="text-xs text-[#6E6E80] font-semibold">
          SAR {row.credit_limit.toLocaleString()}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: (row: Customer) => (
        row.isActive 
          ? <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Active</span>
          : <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Inactive</span>
      ),
    },
    {
      header: 'Joined',
      accessor: (row: Customer) => (
        <span className="text-xs text-[#6E6E80] font-medium">
          {new Date(row.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: 'Actions',
      accessor: (row: Customer) => (
        <div className="flex gap-1">
          <button 
            onClick={() => navigate(`/customers/${row.id}/edit`)}
            className="w-7 h-7 rounded-lg bg-[#F5F5F7] hover:bg-[#EBEBEF] flex items-center justify-center transition-colors"
            title="Edit Customer"
          >
            <Edit2 size={13} className="text-[#6E6E80]" />
          </button>
          <button 
            onClick={() => navigate(`/customers/${row.id}/contracts`)}
            className="w-7 h-7 rounded-lg bg-[#F5F5F7] hover:bg-[#EBEBEF] flex items-center justify-center transition-colors"
            title="Contracts"
          >
            <FileText size={13} className="text-[#6E6E80]" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout 
      active="Customers" 
      title="Customers" 
      pageTitle="Client Management" 
      pageSub="Manage corporate clients and credit limits"
      actions={
        <>
          <Btn 
            label="Add Customer" 
            icon={<Plus size={14} />} 
            onClick={() => navigate('/customers/new')}
          />
        </>
      }
    >
      <div className="px-6 pb-6 h-full flex flex-col animate-fade-in">
        <div className="mb-4 flex gap-4 overflow-x-auto pb-2 shrink-0 hide-scrollbar">
          {stats.map((s) => (
            <div key={s.label} className="bg-white rounded-lg p-5 border border-black/[0.06] shadow-sm flex flex-col justify-center items-center flex-1 min-w-[200px] py-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-3 transition-transform group-hover:scale-110" style={{ backgroundColor: s.bg }}>
                <Building2 size={24} style={{ color: s.color }} />
              </div>
              <p className="text-2xl font-extrabold leading-none tracking-tight mb-1.5 text-center" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px] font-bold text-[#9898A4] uppercase tracking-wider text-center px-1 leading-tight">{s.label} Clients</p>
            </div>
          ))}
        </div>

        <div className="flex-1 min-h-0 flex flex-col">
        <DataTable
          columns={columns}
          data={customers}
          isLoading={isLoading}
          searchPlaceholder="Search by name or phone..."
          onSearchChange={setSearch}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          onRowClick={(row) => navigate(`/customers/${row.id}`)}
        />
        </div>
      </div>
    </DashboardLayout>
  );
}
