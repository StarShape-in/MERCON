import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Eye, AlertTriangle, Calendar, Clock } from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import { documentService, MerconDocument, DocStatus } from '@/services/documentService';

export default function DocumentExpiryPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [expiryFilter, setExpiryFilter] = useState<'30' | '60' | '90' | 'All'>('30');

  // Fetch documents (we'll fetch expiring within 90 days max for this view, then filter locally if needed)
  const { data: docsRes, isLoading } = useQuery({
    queryKey: ['documents', 'expiry', expiryFilter, currentPage],
    queryFn: () => documentService.getAll({
      expiring_within_days: expiryFilter === 'All' ? undefined : Number(expiryFilter),
      page: currentPage,
      per_page: 15,
    }),
  });

  const documents = docsRes?.data || [];
  const totalPages = docsRes?.meta?.total_pages || 1;

  // Stats
  const stats = [
    { label: 'Expiring Soon (30d)', value: documents.filter(d => d.expiry_date && (new Date(d.expiry_date).getTime() - Date.now()) / (1000 * 3600 * 24) <= 30 && (new Date(d.expiry_date).getTime() - Date.now()) > 0).length, bg: '#FEF9C3', color: '#CA8A04' },
    { label: 'Already Expired', value: documents.filter(d => d.expiry_date && new Date(d.expiry_date) < new Date()).length, bg: '#FEF2F2', color: '#DC2626' },
  ];

  const getStatusBadge = (status: DocStatus) => {
    switch (status) {
      case 'Verified': return <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Verified</span>;
      case 'Rejected': return <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Rejected</span>;
      case 'Expired': return <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Expired</span>;
      default: return <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Pending</span>;
    }
  };

  const columns = [
    {
      header: 'Document ID',
      accessor: (row: MerconDocument) => (
        <span className="font-mono text-xs font-bold text-[#E8450F]">
          {row.id.split('-')[0].toUpperCase()}
        </span>
      ),
    },
    {
      header: 'Type',
      accessor: (row: MerconDocument) => (
        <div className="font-semibold text-[#111]">
          {row.doc_type.replace(/([A-Z])/g, ' $1').trim()}
        </div>
      ),
    },
    {
      header: 'Entity Link',
      accessor: (row: MerconDocument) => (
        <span className="text-xs text-[#444] font-medium font-mono">
          {row.entity_type} {row.entity_id.split('-')[0]}
        </span>
      ),
    },
    {
      header: 'Expiry Date',
      accessor: (row: MerconDocument) => {
        if (!row.expiry_date) return <span className="text-xs text-[#6E6E80] font-medium">—</span>;
        
        const expiryDate = new Date(row.expiry_date);
        const daysUntil = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 3600 * 24));
        const isExpired = daysUntil < 0;

        let colorClass = 'text-[#6E6E80]';
        if (isExpired) colorClass = 'text-red-600 font-bold';
        else if (daysUntil <= 30) colorClass = 'text-orange-500 font-bold';

        return (
          <div className="flex flex-col">
            <span className={`text-xs ${colorClass}`}>
              {expiryDate.toLocaleDateString()}
            </span>
            <span className="text-[10px] text-[#9898A4]">
              {isExpired ? `Expired ${Math.abs(daysUntil)} days ago` : `In ${daysUntil} days`}
            </span>
          </div>
        );
      },
    },
    {
      header: 'Status',
      accessor: (row: MerconDocument) => getStatusBadge(row.status),
    },
    {
      header: 'Actions',
      accessor: (row: MerconDocument) => {
        const fileUrl = row.file_url.startsWith('http') ? row.file_url : `${import.meta.env.VITE_API_URL}${row.file_url}`;
        return (
          <div className="flex gap-1">
            <a 
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-7 h-7 rounded-lg bg-[#F5F5F7] hover:bg-[#EBEBEF] flex items-center justify-center transition-colors"
              title="View File"
            >
              <Eye size={13} className="text-[#6E6E80]" />
            </a>
          </div>
        );
      },
    },
  ];

  return (
    <DashboardLayout 
      active="Compliance" 
      title="Expiry Management" 
      pageTitle="Expiry Tracker" 
      pageSub="Monitor documents approaching their expiration dates"
    >
      <div className="px-6 mb-4 grid grid-cols-2 gap-3 max-w-lg">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-4 border border-black/[0.06] shadow-sm flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs text-[#6E6E80] mt-0.5 font-medium">{s.label}</p>
            </div>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: s.bg }}>
              <Clock size={16} style={{ color: s.color }} />
            </div>
          </div>
        ))}
      </div>

      <div className="px-6 pb-6">
        <DataTable
          columns={columns}
          data={documents}
          isLoading={isLoading}
          searchPlaceholder="Search by ID..."
          onSearchChange={() => {}}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          filterElement={
            <div className="flex gap-2">
              <select
                value={expiryFilter}
                onChange={(e) => {
                  setExpiryFilter(e.target.value as '30' | '60' | '90' | 'All');
                  setCurrentPage(1);
                }}
                className="text-xs font-semibold bg-white border border-black/[0.07] px-3 py-2 rounded-xl outline-none focus:border-[#E8450F] transition-colors"
              >
                <option value="30">Expiring &lt; 30 Days</option>
                <option value="60">Expiring &lt; 60 Days</option>
                <option value="90">Expiring &lt; 90 Days</option>
                <option value="All">All Documents</option>
              </select>
            </div>
          }
        />
      </div>
    </DashboardLayout>
  );
}
