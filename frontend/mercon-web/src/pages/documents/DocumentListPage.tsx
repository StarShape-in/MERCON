import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { FileText, Eye, AlertTriangle, Calendar, Search } from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import { documentService, MerconDocument, DocType, DocStatus } from '@/services/documentService';

export default function DocumentListPage() {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedType, setSelectedType] = useState<DocType | 'All'>('All');
  const [selectedStatus, setSelectedStatus] = useState<DocStatus | 'All'>('All');

  // Fetch documents
  const { data: docsRes, isLoading } = useQuery({
    queryKey: ['documents', selectedType, selectedStatus, currentPage],
    queryFn: () => documentService.getAll({
      doc_type: selectedType === 'All' ? undefined : selectedType,
      status: selectedStatus === 'All' ? undefined : selectedStatus,
      page: currentPage,
      per_page: 15,
    }),
  });

  const documents = docsRes?.data || [];
  const totalPages = docsRes?.meta?.total_pages || 1;

  // Stats
  const stats = [
    { label: 'Total Documents', value: docsRes?.meta?.total || documents.length, bg: '#F5F5F7', color: '#111' },
    { label: 'Pending Review', value: documents.filter(d => d.status === 'PendingReview').length, bg: '#FEF9C3', color: '#CA8A04' },
    { label: 'Expired', value: documents.filter(d => d.status === 'Expired').length, bg: '#FEF2F2', color: '#DC2626' },
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
      header: 'Issue Date',
      accessor: (row: MerconDocument) => (
        <span className="text-xs text-[#6E6E80] font-medium">
          {row.issue_date ? new Date(row.issue_date).toLocaleDateString() : '—'}
        </span>
      ),
    },
    {
      header: 'Expiry Date',
      accessor: (row: MerconDocument) => {
        if (!row.expiry_date) return <span className="text-xs text-[#6E6E80] font-medium">—</span>;
        const isExpired = new Date(row.expiry_date) < new Date();
        return (
          <span className={`text-xs font-medium ${isExpired ? 'text-red-500 font-bold' : 'text-[#6E6E80]'}`}>
            {new Date(row.expiry_date).toLocaleDateString()}
          </span>
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
            {/* If we needed to verify, we could add a verify action here */}
          </div>
        );
      },
    },
  ];

  return (
    <DashboardLayout 
      active="Documents" 
      title="Documents Center" 
      pageTitle="Document Center" 
      pageSub="Centralized repository for all operational documents"
    >
      <div className="px-6 mb-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-4 border border-black/[0.06] shadow-sm flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs text-[#6E6E80] mt-0.5 font-medium">{s.label}</p>
            </div>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: s.bg }}>
              <FileText size={16} style={{ color: s.color }} />
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
                value={selectedType}
                onChange={(e) => {
                  setSelectedType(e.target.value as DocType | 'All');
                  setCurrentPage(1);
                }}
                className="text-xs font-semibold bg-white border border-black/[0.07] px-3 py-2 rounded-xl outline-none focus:border-[#E8450F] transition-colors"
              >
                <option value="All">All Types</option>
                <option value="DriverLicense">Driver License</option>
                <option value="VehicleRegistration">Vehicle Registration</option>
                <option value="Insurance">Insurance</option>
                <option value="POD">Proof of Delivery</option>
                <option value="Contract">Contract</option>
                <option value="Invoice">Invoice</option>
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value as DocStatus | 'All');
                  setCurrentPage(1);
                }}
                className="text-xs font-semibold bg-white border border-black/[0.07] px-3 py-2 rounded-xl outline-none focus:border-[#E8450F] transition-colors"
              >
                <option value="All">All Statuses</option>
                <option value="PendingReview">Pending Review</option>
                <option value="Verified">Verified</option>
                <option value="Rejected">Rejected</option>
                <option value="Expired">Expired</option>
              </select>
            </div>
          }
        />
      </div>
    </DashboardLayout>
  );
}
