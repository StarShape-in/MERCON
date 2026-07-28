import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, DollarSign, Download, Trash2, CheckCircle } from 'lucide-react';
import { InvoiceDoc, ClockIcon, RiskAlert } from '@/components/ui/kpi-icons';

import { downloadCSV } from '@/utils/exportUtils';

import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import Btn from '@/components/ui/Btn';
import { invoiceService, Invoice, InvoiceStatus } from '@/services/invoiceService';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

export default function InvoiceListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState<InvoiceStatus | 'All'>('All');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);

  // Fetch invoices using React Query
  const { data: invoicesRes, isLoading } = useQuery({
    queryKey: ['invoices', selectedStatus, debouncedSearch, currentPage],
    queryFn: () => invoiceService.getAll({
      status: selectedStatus === 'All' ? undefined : selectedStatus,
      search: debouncedSearch || undefined,
      page: currentPage,
      per_page: 10,
    }),
  });

  const invoices = invoicesRes?.data || [];
  const totalPages = invoicesRes?.meta?.total_pages || 1;

  // Stats
  const stats = [
    { label: 'Total Invoices', value: invoicesRes?.meta?.total || invoices.length, bg: '#F5F5F7', color: '#111', icon: InvoiceDoc },
    { label: 'Pending', value: invoices.filter(i => i.status === 'Pending').length, bg: '#FEF9C3', color: '#CA8A04', icon: ClockIcon },
    { label: 'Overdue', value: invoices.filter(i => i.status === 'Overdue').length, bg: '#FEF2F2', color: '#DC2626', icon: RiskAlert },
  ];

  const getStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case 'Paid': return <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Paid</span>;
      case 'Pending': return <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Pending</span>;
      case 'Overdue': return <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Overdue</span>;
      case 'Cancelled': return <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Cancelled</span>;
      default: return <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Draft</span>;
    }
  };

  const columns = [
    {
      header: 'Invoice ID',
      accessor: (row: Invoice) => (
        <span className="font-mono text-xs font-bold text-[#E8450F]">
          {row.ref_id || row.id.split('-')[0].toUpperCase()}
        </span>
      ),
    },
    {
      header: 'Customer',
      accessor: (row: Invoice) => (
        <div className="font-semibold text-[#111]">
          {row.customer?.name || '—'}
        </div>
      ),
    },
    {
      header: 'Trip Ref',
      accessor: (row: Invoice) => (
        <span className="text-xs text-[#444] font-medium font-mono">{row.trip?.ref_id || '—'}</span>
      ),
    },
    {
      header: 'Total Amount',
      accessor: (row: Invoice) => (
        <span className="text-xs text-[#111] font-bold">
          {row.currency} {row.total_amount.toLocaleString()}
        </span>
      ),
    },
    {
      header: 'Due Date',
      accessor: (row: Invoice) => {
        const isOverdue = new Date(row.due_date) < new Date() && row.status !== 'Paid';
        return (
          <span className={`text-xs font-medium ${isOverdue ? 'text-red-500 font-bold' : 'text-[#6E6E80]'}`}>
            {new Date(row.due_date).toLocaleDateString()}
          </span>
        );
      },
    },
    {
      header: 'Status',
      accessor: (row: Invoice) => getStatusBadge(row.status),
    },
    {
      header: 'Actions',
      accessor: (row: Invoice) => (
        <div className="flex gap-1">
          <button 
            onClick={() => window.open(`/invoices/${row.id}/print`, '_blank')}
            className="w-7 h-7 rounded-lg bg-[#F5F5F7] hover:bg-[#EBEBEF] flex items-center justify-center transition-colors"
            title="Download PDF"
          >
            <Download size={13} className="text-[#6E6E80]" />
          </button>
          {row.status === 'Pending' && (
            <button 
              onClick={() => navigate(`/invoices/${row.id}/payment`)}
              className="w-7 h-7 rounded-lg bg-[#F0FDF4] hover:bg-[#DCFCE7] flex items-center justify-center transition-colors"
              title="Record Payment"
            >
              <DollarSign size={13} className="text-green-600" />
            </button>
          )}
        </div>
      ),
    },
  ];

  const bulkActions = [
    {
      label: 'Mark Paid',
      icon: <CheckCircle size={13} />,
      onClick: async (selectedRows: Invoice[]) => {
        if (!confirm(`Mark ${selectedRows.length} invoices as Paid?`)) return;
        try {
          await invoiceService.bulkUpdateStatus(selectedRows.map(r => r.id), 'Paid');
          queryClient.invalidateQueries({ queryKey: ['invoices'] });
        } catch (e) { alert('Failed to update status'); }
      }
    },
    {
      label: 'Export CSV',
      icon: <Download size={13} />,
      variant: 'secondary' as const,
      onClick: (selectedRows: Invoice[]) => {
        downloadCSV(selectedRows, 'invoices_export.csv');
      }
    },
    {
      label: 'Delete',
      icon: <Trash2 size={13} />,
      variant: 'danger' as const,
      onClick: async (selectedRows: Invoice[]) => {
        if (!confirm(`Are you sure you want to delete ${selectedRows.length} invoices?`)) return;
        try {
          await invoiceService.bulkDelete(selectedRows.map(r => r.id));
          queryClient.invalidateQueries({ queryKey: ['invoices'] });
        } catch (e) { alert('Failed to delete invoices'); }
      }
    }
  ];

  return (
    <DashboardLayout 
      active="Invoices" 
      title="Invoices" 
      pageTitle="Billing & Invoicing" 
      pageSub="Manage customer invoices and track payments"
      actions={
        <>
          <Btn 
            label="Create Invoice" 
            icon={<Plus size={14} />} 
            onClick={() => navigate('/invoices/new')}
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
              <p className="text-[10px] font-bold text-[#9898A4] uppercase tracking-wider text-center px-1 leading-tight">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="flex-1 min-h-0 flex flex-col">
        <DataTable
          columns={columns}
          data={invoices}
          bulkActions={bulkActions}
          isLoading={isLoading}
          searchPlaceholder="Search invoices..."
          searchValue={search}
          onSearchChange={setSearch}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          onRowClick={(row) => navigate(`/invoices/${row.id}`)}
          filterElement={
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value as InvoiceStatus | 'All');
                setCurrentPage(1);
              }}
              className="text-xs font-semibold bg-white border border-black/[0.07] px-3 py-2 rounded-lg outline-none focus:border-[#E8450F] transition-colors"
            >
              <option value="All">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Pending">Pending</option>
              <option value="Paid">Paid</option>
              <option value="Overdue">Overdue</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          }
        />
        </div>
      </div>
    </DashboardLayout>
  );
}
