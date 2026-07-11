import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, FileText, Banknote, Download, Trash2 } from 'lucide-react';

import { downloadCSV } from '@/utils/exportUtils';

import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import Btn from '@/components/ui/Btn';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { rateCardService } from '@/services/rateCardService';

export default function RateCardListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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
            className="w-7 h-7 rounded-none bg-[#F5F5F7] hover:bg-[#EBEBEF] flex items-center justify-center transition-colors"
            title="Edit Rate Card"
          >
            <Edit2 size={13} className="text-[#6E6E80]" />
          </button>
        </div>
      ),
    },
  ];

  const bulkActions = [
    {
      label: 'Export CSV',
      icon: <Download size={13} />,
      variant: 'secondary' as const,
      onClick: (selectedRows: any[]) => {
        downloadCSV(selectedRows, 'rate_cards_export.csv');
      }
    },
    {
      label: 'Delete',
      icon: <Trash2 size={13} />,
      variant: 'danger' as const,
      onClick: async (selectedRows: any[]) => {
        if (!confirm(`Are you sure you want to delete ${selectedRows.length} rate cards?`)) return;
        try {
          await rateCardService.bulkDelete(selectedRows.map(r => r.id));
          queryClient.invalidateQueries({ queryKey: ['rate-cards'] });
        } catch (e) { alert('Failed to delete rate cards'); }
      }
    }
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
            onClick={() => navigate('/rate-cards/new')}
          />
        </>
      }
    >
      <div className="px-6 pb-6 h-full flex flex-col animate-fade-in">
        <div className="flex-1 min-h-0 flex flex-col">
          <DataTable
            columns={columns}
            data={filteredData}
            bulkActions={bulkActions}
            isLoading={isLoading}
            searchPlaceholder="Search by name or customer..."
            onSearchChange={setSearch}
            currentPage={currentPage}
            totalPages={meta.total_pages}
            onPageChange={setCurrentPage}
            onRowClick={(row) => navigate(`/rate-cards/${row.id}`)}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
