import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, Edit2, FileText, Banknote } from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import Btn from '@/components/ui/Btn';

// Mock Data
const MOCK_RATE_CARDS = [
  { id: 'RC-101', name: 'Almarai Dammam Route', customer: 'Almarai Logistics', valid_until: '2024-12-31', status: 'Active' },
  { id: 'RC-102', name: 'SABIC Riyadh Route', customer: 'SABIC', valid_until: '2024-12-31', status: 'Active' },
  { id: 'RC-103', name: 'Jeddah Port Standard', customer: 'General Port', valid_until: '2023-12-31', status: 'Expired' },
];

export default function RateCardListPage() {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');

  const filteredData = MOCK_RATE_CARDS.filter(rc => 
    rc.name.toLowerCase().includes(search.toLowerCase()) || 
    rc.customer.toLowerCase().includes(search.toLowerCase())
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
        <span className="text-xs text-[#444] font-medium">{row.customer}</span>
      ),
    },
    {
      header: 'Valid Until',
      accessor: (row: any) => (
        <span className="text-xs text-[#6E6E80] font-medium">
          {new Date(row.valid_until).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: (row: any) => (
        row.status === 'Active' 
          ? <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Active</span>
          : <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Expired</span>
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
          />
        </>
      }
    >
      <div className="px-6 mb-6">
        <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-3 text-blue-800 text-sm font-medium">
          <Banknote size={20} className="shrink-0" />
          <p>
            The Rate Card module backend API is currently in development. This page displays mock data for demonstration purposes.
          </p>
        </div>
      </div>

      <div className="px-6 pb-6">
        <DataTable
          columns={columns}
          data={filteredData}
          isLoading={false}
          searchPlaceholder="Search by name or customer..."
          onSearchChange={setSearch}
          currentPage={currentPage}
          totalPages={1}
          onPageChange={setCurrentPage}
        />
      </div>
    </DashboardLayout>
  );
}
