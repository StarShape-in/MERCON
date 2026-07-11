import { useState } from 'react';
import { Download, Filter, FileText, CheckCircle2, Clock, AlertTriangle, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import DashboardLayout from '@/components/layout/DashboardLayout';
import KpiCard from '@/components/ui/KpiCard';
import Btn from '@/components/ui/Btn';
import DataTable from '@/components/ui/DataTable';

const mockInvoices = [
  { id: 'INV-2026-001', client: 'SABIC', amount: 45000, date: '2026-07-01', dueDate: '2026-07-31', status: 'Sent' },
  { id: 'INV-2026-002', client: 'Saudi Aramco', amount: 82000, date: '2026-06-15', dueDate: '2026-07-15', status: 'Paid' },
  { id: 'INV-2026-003', client: 'Almarai', amount: 15500, date: '2026-06-01', dueDate: '2026-07-01', status: 'Overdue' },
  { id: 'INV-2026-004', client: 'FMCG Corp', amount: 9000, date: '2026-07-08', dueDate: '2026-08-08', status: 'Draft' },
  { id: 'INV-2026-005', client: 'SABIC', amount: 21000, date: '2026-05-20', dueDate: '2026-06-20', status: 'Paid' },
];

export default function PaymentStatusPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'All' | 'Draft' | 'Sent' | 'Paid' | 'Overdue'>('All');

  const filteredInvoices = mockInvoices.filter(i => {
    const matchesSearch = i.client.toLowerCase().includes(search.toLowerCase()) || i.id.toLowerCase().includes(search.toLowerCase());
    const matchesTab = activeTab === 'All' || i.status === activeTab;
    return matchesSearch && matchesTab;
  });

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'Draft': return <span className="bg-[#F5F5F7] text-[#6E6E80] px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Draft</span>;
      case 'Sent': return <span className="bg-[#EFF6FF] text-[#2563EB] px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Sent</span>;
      case 'Paid': return <span className="bg-[#F0FDF4] text-[#16A34A] px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Paid</span>;
      case 'Overdue': return <span className="bg-[#FEF2F2] text-[#DC2626] px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Overdue</span>;
      default: return null;
    }
  };

  const columns = [
    {
      header: 'Invoice ID',
      accessor: (row: any) => (
        <span className="font-mono text-xs font-bold text-[#E8450F] cursor-pointer hover:underline">
          {row.id}
        </span>
      ),
    },
    {
      header: 'Client',
      accessor: (row: any) => (
        <span className="font-bold text-[#111]">{row.client}</span>
      ),
    },
    {
      header: 'Amount',
      accessor: (row: any) => (
        <span className="font-bold text-[#444]">SAR {row.amount.toLocaleString()}</span>
      ),
    },
    {
      header: 'Issue Date',
      accessor: (row: any) => (
        <span className="text-xs text-[#6E6E80] font-medium">{row.date}</span>
      ),
    },
    {
      header: 'Due Date',
      accessor: (row: any) => (
        <span className="text-xs text-[#6E6E80] font-medium">{row.dueDate}</span>
      ),
    },
    {
      header: 'Status',
      accessor: (row: any) => getStatusBadge(row.status),
    },
  ];

  return (
    <DashboardLayout 
      active="Invoices" 
      breadcrumb="Invoices"
      title="Payment Status" 
      pageTitle="Accounts Receivable" 
      pageSub="Track invoice statuses, overdue payments, and cash flow."
      actions={
        <div className="flex gap-2">
          <Btn label="Export" variant="outline" icon={<Download size={14} />} />
          <Btn label="New Invoice" icon={<FileText size={14} />} onClick={() => navigate('/invoices/new')} />
        </div>
      }
    >
      <div className="px-6 pb-6">
        
        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard 
            label="Total Outstanding" 
            value="SAR 60.5K" 
            delta={-5.2}
            up={true} // Less outstanding is good
            icon={Clock} 
            color="#2563EB" 
            bg="#EFF6FF" 
          />
          <KpiCard 
            label="Total Overdue" 
            value="SAR 15.5K" 
            delta={12}
            up={false} // More overdue is bad
            icon={AlertTriangle} 
            color="#DC2626" 
            bg="#FEF2F2" 
          />
          <KpiCard 
            label="Paid This Month" 
            value="SAR 103K" 
            delta={18}
            up={true}
            icon={CheckCircle2} 
            color="#16A34A" 
            bg="#F0FDF4" 
          />
          <KpiCard 
            label="Draft Invoices" 
            value="3" 
            icon={FileText} 
            color="#D97706" 
            bg="#FFFBEB" 
          />
        </div>

        {/* Data Table Area */}
        <div className="bg-white rounded-none border border-black/[0.06] shadow-sm overflow-hidden">
          <div className="p-5 border-b border-black/[0.04] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FAFAFA]">
            
            <div className="flex items-center gap-1 p-1 bg-[#F5F5F7] rounded-none overflow-x-auto">
              {['All', 'Draft', 'Sent', 'Paid', 'Overdue'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`px-4 py-1.5 text-xs font-bold rounded-none transition-all ${
                    activeTab === tab 
                      ? 'bg-white text-[#111] shadow-sm' 
                      : 'text-[#6E6E80] hover:text-[#111]'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            
            <div className="flex items-center gap-2">
              <div className="relative max-w-xs w-full">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9898A4]" />
                <input 
                  type="text" 
                  placeholder="Search invoice or client..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-white border border-black/[0.08] rounded-none pl-9 pr-4 py-2 text-xs outline-none focus:border-[#E8450F] shadow-sm transition-all"
                />
              </div>
            </div>
          </div>
          
          <DataTable
            columns={columns}
            data={filteredInvoices}
            isLoading={false}
          />
        </div>

      </div>
    </DashboardLayout>
  );
}
