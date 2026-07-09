import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, Edit2, FileText, Banknote } from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import Btn from '@/components/ui/Btn';

import { useQuery } from '@tanstack/react-query';
import { rateCardService } from '@/services/rateCardService';

export default function RateCardListPage() {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data: response, isLoading } = useQuery({
    queryKey: ['rate-cards', currentPage, search],
    queryFn: () => rateCardService.getAll(),
  });

  const rateCards = response?.data || [];
  const meta = response?.meta || { total_pages: 1 };
  
  // Client side filtering since API doesn't support search yet
  const filteredData = rateCards.filter(rc => 
    rc.name.toLowerCase().includes(search.toLowerCase()) || 
    rc.customer?.name.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    {
      header: 'Rate Card ID',
      accessor: (row: any) => (
        <span className="font-mono text-xs font-bold text-[#E8450F]">
          {row.id}
        </span>
      ),
    },
    {
      header: 'Name',
      accessor: (row: any) => (
        <div className="font-semibold text-[#111]">
          {row.name}
        </div>
      ),
    },
    {
      header: 'Customer',
      accessor: (row: any) => (
        <span className="text-xs text-[#444] font-medium">{row.customer?.name || 'N/A'}</span>
      ),
    },
    {
      header: 'Route',
      accessor: (row: any) => (
        <span className="text-xs text-[#6E6E80] font-medium">
          {row.route_origin} → {row.route_destination}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: (row: any) => (
        row.is_active 
          ? <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Active</span>
          : <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Inactive</span>
      ),
    },
    {
      header: 'Actions',
      accessor: (row: any) => (
        <div className="flex gap-1">
          <button 
            className="w-7 h-7 rounded-lg bg-[#F5F5F7] hover:bg-[#EBEBEF] flex items-center justify-center transition-colors"
            title="View Details"
          >
            <Eye size={13} className="text-[#6E6E80]" />
          </button>
          <button 
            className="w-7 h-7 rounded-lg bg-[#F5F5F7] hover:bg-[#EBEBEF] flex items-center justify-center transition-colors"
            title="Edit Rate Card"
          >
            <Edit2 size={13} className="text-[#6E6E80]" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout 
      active="RateCards" 
      title="Rate Cards" 
      pageTitle="Rate Cards" 
      pageSub="Manage pricing agreements and contracts"
      actions={
        <>
          <Btn 
            label="Create Rate Card" 
            icon={<Plus size={14} />} 
            onClick={() => navigate('/rate-cards/create')}
          />
        </>
      }
    >

      <div className="px-6 pb-6">
        <DataTable
          columns={columns}
          data={filteredData}
          isLoading={isLoading}
          searchPlaceholder="Search by name or customer..."
          onSearchChange={setSearch}
          currentPage={currentPage}
          totalPages={meta.total_pages}
          onPageChange={setCurrentPage}
        />
      </div>
    </DashboardLayout>
  );
}
