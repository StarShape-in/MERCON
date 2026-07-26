import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileText, CheckCircle2, Clock, AlertTriangle, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import DashboardLayout from '@/components/layout/DashboardLayout';
import KpiCard from '@/components/ui/KpiCard';
import Btn from '@/components/ui/Btn';
import DataTable from '@/components/ui/DataTable';
import { invoiceService, type Invoice, type InvoiceStatus } from '@/services/invoiceService';

const TABS: Array<'All' | InvoiceStatus> = ['All', 'Draft', 'Pending', 'Paid', 'Overdue', 'Cancelled'];

function sar(value: number): string {
  if (Math.abs(value) >= 1000) {
    return `SAR ${(value / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 })}K`;
  }
  return `SAR ${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toISOString().slice(0, 10);
}

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  Draft:     'bg-[#F5F5F7] text-[#6E6E80]',
  Pending:   'bg-[#EFF6FF] text-[#2563EB]',
  Paid:      'bg-[#F0FDF4] text-[#16A34A]',
  Overdue:   'bg-[#FEF2F2] text-[#DC2626]',
  Cancelled: 'bg-[#F5F5F7] text-[#9898A4]',
};

export default function PaymentStatusPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'All' | InvoiceStatus>('All');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['invoices', 'payment-status'],
    queryFn: async () => (await invoiceService.getAll({ per_page: 100 })).data,
  });

  const invoices = useMemo(() => data ?? [], [data]);

  const kpis = useMemo(() => {
    const now = new Date();
    const sum = (list: Invoice[]) => list.reduce((s, i) => s + (i.total_amount ?? 0), 0);
    const outstanding = sum(invoices.filter((i) => i.status === 'Pending' || i.status === 'Overdue'));
    const overdue = sum(invoices.filter((i) => i.status === 'Overdue'));
    const paidThisMonth = sum(
      invoices.filter((i) => {
        if (i.status !== 'Paid') return false;
        const d = new Date(i.createdAt);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      }),
    );
    const draftCount = invoices.filter((i) => i.status === 'Draft').length;
    return { outstanding, overdue, paidThisMonth, draftCount };
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    const q = search.toLowerCase();
    return invoices.filter((i) => {
      const client = i.customer?.name ?? '';
      const ref = i.ref_id ?? i.id;
      const matchesSearch = client.toLowerCase().includes(q) || ref.toLowerCase().includes(q);
      const matchesTab = activeTab === 'All' || i.status === activeTab;
      return matchesSearch && matchesTab;
    });
  }, [invoices, search, activeTab]);

  const columns = [
    {
      header: 'Invoice ID',
      accessor: (row: Invoice) => (
        <span
          className="font-mono text-xs font-bold text-[#E8450F] cursor-pointer hover:underline"
          onClick={() => navigate(`/invoices/${row.id}`)}
        >
          {row.ref_id ?? row.id.slice(0, 8)}
        </span>
      ),
    },
    {
      header: 'Client',
      accessor: (row: Invoice) => (
        <span className="font-bold text-[#111]">{row.customer?.name ?? '—'}</span>
      ),
    },
    {
      header: 'Amount',
      accessor: (row: Invoice) => (
        <span className="font-bold text-[#444]">SAR {(row.total_amount ?? 0).toLocaleString()}</span>
      ),
    },
    {
      header: 'Issue Date',
      accessor: (row: Invoice) => (
        <span className="text-xs text-[#6E6E80] font-medium">{fmtDate(row.createdAt)}</span>
      ),
    },
    {
      header: 'Due Date',
      accessor: (row: Invoice) => (
        <span className="text-xs text-[#6E6E80] font-medium">{fmtDate(row.due_date)}</span>
      ),
    },
    {
      header: 'Status',
      accessor: (row: Invoice) => (
        <span className={`${STATUS_STYLES[row.status]} px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider`}>
          {row.status}
        </span>
      ),
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
            value={isLoading ? '—' : sar(kpis.outstanding)}
            icon={Clock}
            color="#2563EB"
            bg="#EFF6FF"
          />
          <KpiCard
            label="Total Overdue"
            value={isLoading ? '—' : sar(kpis.overdue)}
            icon={AlertTriangle}
            color="#DC2626"
            bg="#FEF2F2"
          />
          <KpiCard
            label="Paid This Month"
            value={isLoading ? '—' : sar(kpis.paidThisMonth)}
            icon={CheckCircle2}
            color="#16A34A"
            bg="#F0FDF4"
          />
          <KpiCard
            label="Draft Invoices"
            value={isLoading ? '—' : kpis.draftCount.toString()}
            icon={FileText}
            color="#D97706"
            bg="#FFFBEB"
          />
        </div>

        {/* Data Table Area */}
        <div className="bg-white rounded-lg border border-black/[0.06] shadow-sm overflow-hidden">
          <div className="p-5 border-b border-black/[0.04] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FAFAFA]">

            <div className="flex items-center gap-1 p-1 bg-[#F5F5F7] rounded-lg overflow-x-auto">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
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
                  className="w-full bg-white border border-black/[0.08] rounded-lg pl-9 pr-4 py-2 text-xs outline-none focus:border-[#E8450F] shadow-sm transition-all"
                />
              </div>
            </div>
          </div>

          {isError ? (
            <div className="p-12 text-center text-[#DC2626] text-sm">Failed to load invoices.</div>
          ) : (
            <DataTable
              columns={columns}
              data={filteredInvoices}
              isLoading={isLoading}
            />
          )}
        </div>

      </div>
    </DashboardLayout>
  );
}
