import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Download, Building2, Calendar, DollarSign, FileText, CheckCircle } from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import Btn from '@/components/ui/Btn';
import { invoiceService, InvoiceStatus } from '@/services/invoiceService';

export default function InvoiceDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: invoice, isLoading, error } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => invoiceService.getById(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <DashboardLayout active="Invoices" title="Invoice Details">
        <div className="p-6 animate-pulse flex flex-col gap-6">
          <div className="h-20 bg-black/5 rounded-none"></div>
          <div className="h-64 bg-black/5 rounded-none"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !invoice) {
    return (
      <DashboardLayout active="Invoices" title="Invoice Details">
        <div className="p-6 text-center mt-20">
          <p className="text-[#6E6E80]">Invoice not found.</p>
        </div>
      </DashboardLayout>
    );
  }

  const getStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case 'Paid': return <span className="bg-green-100 text-green-700 px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider">Paid</span>;
      case 'Pending': return <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider">Pending</span>;
      case 'Overdue': return <span className="bg-red-100 text-red-700 px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider">Overdue</span>;
      case 'Cancelled': return <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider">Cancelled</span>;
      default: return <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider">Draft</span>;
    }
  };

  return (
    <DashboardLayout 
      active="Invoices" 
      title={`Invoice: ${invoice.ref_id || invoice.id.split('-')[0].toUpperCase()}`}
      actions={
        <div className="flex gap-2">
          {invoice.status === 'Pending' && (
            <Btn 
              label="Record Payment" 
              icon={<DollarSign size={14} />} 
              onClick={() => navigate(`/invoices/${invoice.id}/payment`)}
            />
          )}
          <Btn 
            label="Download PDF" 
            variant="outline" 
            icon={<Download size={14} />} 
            onClick={() => window.open(`/invoices/${invoice.id}/print`, '_blank')}
          />
        </div>
      }
    >
      <div className="px-6 pb-6 max-w-4xl">
        <button 
          onClick={() => navigate('/invoices')}
          className="flex items-center gap-2 text-sm font-semibold text-[#6E6E80] hover:text-[#111] transition-colors mb-6"
        >
          <ArrowLeft size={16} /> Back to Invoices
        </button>

        <div className="bg-white border border-black/[0.08] rounded-none shadow-sm overflow-hidden">
          {/* Header */}
          <div className="p-6 md:p-8 border-b border-black/[0.04] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-[#111] mb-2 flex items-center gap-3">
                {invoice.ref_id || invoice.id.split('-')[0].toUpperCase()}
                {getStatusBadge(invoice.status)}
              </h1>
              <p className="text-sm text-[#6E6E80] font-medium flex items-center gap-1.5">
                <Calendar size={14} /> Created: {new Date(invoice.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-[#6E6E80] font-medium mb-1">Total Due</p>
              <h2 className="text-3xl font-bold text-[#E8450F]">
                {invoice.currency} {invoice.total_amount.toLocaleString()}
              </h2>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-black/[0.04]">
            {/* Bill To */}
            <div className="p-6 md:p-8">
              <h3 className="text-xs font-bold text-[#9898A4] uppercase tracking-wider mb-4 flex items-center gap-2">
                <Building2 size={14} /> Billed To
              </h3>
              <p className="text-lg font-bold text-[#111] mb-1">{invoice.customer?.name || 'Unknown Customer'}</p>
              <p className="text-sm text-[#6E6E80] font-medium">Customer ID: {invoice.customer?.id?.split('-')[0].toUpperCase()}</p>
            </div>

            {/* Terms */}
            <div className="p-6 md:p-8">
              <h3 className="text-xs font-bold text-[#9898A4] uppercase tracking-wider mb-4 flex items-center gap-2">
                <FileText size={14} /> Invoice Details
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-[#6E6E80] font-medium">Due Date:</span>
                  <span className={`text-sm font-bold ${new Date(invoice.due_date) < new Date() && invoice.status !== 'Paid' ? 'text-red-500' : 'text-[#111]'}`}>
                    {new Date(invoice.due_date).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[#6E6E80] font-medium">Linked Trip:</span>
                  <span className="text-sm font-bold font-mono text-[#E8450F] cursor-pointer hover:underline" onClick={() => invoice.trip?.id && navigate(`/trips/${invoice.trip.id}`)}>
                    {invoice.trip?.ref_id || 'NO-REF'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Line Items Mock */}
          <div className="p-6 md:p-8 bg-[#F9F9FB] border-t border-black/[0.04]">
            <h3 className="text-sm font-bold text-[#111] mb-4">Line Items</h3>
            <div className="bg-white border border-black/[0.06] rounded-none overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-black/[0.04] bg-[#F5F5F7]">
                    <th className="px-4 py-3 font-semibold text-xs text-[#6E6E80] uppercase">Description</th>
                    <th className="px-4 py-3 font-semibold text-xs text-[#6E6E80] uppercase text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-black/[0.02]">
                    <td className="px-4 py-4 font-medium text-[#111]">Freight Transportation Services (Trip {invoice.trip?.ref_id})</td>
                    <td className="px-4 py-4 font-bold text-[#111] text-right">{invoice.currency} {invoice.subtotal.toLocaleString()}</td>
                  </tr>
                  <tr className="bg-[#F9F9FB]">
                    <td className="px-4 py-3 font-bold text-[#111] text-right">Total</td>
                    <td className="px-4 py-3 font-bold text-[#E8450F] text-right text-lg">{invoice.currency} {invoice.total_amount.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
