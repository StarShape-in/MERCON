import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock, Search, ShieldAlert } from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import { documentService, type MerconDocument } from '@/services/documentService';
import { driverService } from '@/services/driverService';
import { vehicleService } from '@/services/vehicleService';
import { docTypeLabel, daysUntil } from '@/lib/documents';

interface ExpiryRow extends MerconDocument {
  entityName: string;
  daysRemaining: number;
}

export default function ExpiryManagementPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const { data: docs = [], isLoading, isError } = useQuery({
    queryKey: ['documents', 'all'],
    queryFn: async () => (await documentService.getAll({ per_page: 200 })).data,
  });
  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers', 'lookup'],
    queryFn: async () => (await driverService.getAll()).data,
  });
  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles', 'lookup'],
    queryFn: async () => (await vehicleService.getAll()).data,
  });

  const nameFor = useMemo(() => {
    const dMap = new Map(drivers.map((d) => [d.id, `${d.first_name} ${d.last_name}`.trim()]));
    const vMap = new Map(vehicles.map((v) => [v.id, v.plate_number || v.ref_id || '']));
    return (doc: MerconDocument): string => {
      if (doc.entity_type === 'Driver') return dMap.get(doc.entity_id) || 'Unknown Driver';
      if (doc.entity_type === 'Vehicle') return vMap.get(doc.entity_id) || 'Unknown Vehicle';
      return doc.entity_type;
    };
  }, [drivers, vehicles]);

  // Documents that have an expiry date within the next 30 days (or already expired).
  const items = useMemo<ExpiryRow[]>(() => {
    return docs
      .map((doc) => ({ ...doc, entityName: nameFor(doc), daysRemaining: daysUntil(doc.expiry_date) ?? Infinity }))
      .filter((row) => row.daysRemaining <= 30)
      .sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [docs, nameFor]);

  const expiredCount = items.filter((i) => i.daysRemaining <= 0).length;
  const criticalCount = items.filter((i) => i.daysRemaining > 0 && i.daysRemaining <= 7).length;
  const upcomingCount = items.filter((i) => i.daysRemaining > 0).length;

  const filteredItems = items.filter((i) => {
    const q = search.toLowerCase();
    return i.entityName.toLowerCase().includes(q) || docTypeLabel(i.doc_type).toLowerCase().includes(q);
  });

  const entityDocsLink = (row: MerconDocument): string | null => {
    if (row.entity_type === 'Driver') return `/drivers/${row.entity_id}/documents`;
    if (row.entity_type === 'Vehicle') return `/vehicles/${row.entity_id}/documents`;
    return null;
  };

  const columns = [
    {
      header: 'Document Type',
      accessor: (row: ExpiryRow) => (
        <span className="font-bold text-[#111]">{docTypeLabel(row.doc_type)}</span>
      ),
    },
    {
      header: 'Entity / Owner',
      accessor: (row: ExpiryRow) => (
        <div>
          <span className="font-semibold text-[#444]">{row.entityName}</span>
          <span className="ml-2 text-[10px] font-bold bg-[#F5F5F7] text-[#6E6E80] px-1.5 py-0.5 rounded">
            {row.entity_type}
          </span>
        </div>
      ),
    },
    {
      header: 'Expiry Date',
      accessor: (row: ExpiryRow) => (
        <span className="font-mono text-xs font-semibold text-[#444]">
          {row.expiry_date ? new Date(row.expiry_date).toLocaleDateString() : '—'}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: (row: ExpiryRow) => {
        if (row.daysRemaining <= 0) {
          return (
            <span className="inline-flex items-center gap-1 bg-[#FEF2F2] text-[#DC2626] px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider">
              <ShieldAlert size={12} /> Expired
            </span>
          );
        } else if (row.daysRemaining <= 7) {
          return (
            <span className="inline-flex items-center gap-1 bg-[#FFFBEB] text-[#D97706] px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider">
              <AlertTriangle size={12} /> Critical ({row.daysRemaining}d)
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 bg-[#F5F5F7] text-[#6E6E80] px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider">
            <Clock size={12} /> {row.daysRemaining} days left
          </span>
        );
      },
    },
    {
      header: 'Actions',
      accessor: (row: ExpiryRow) => {
        const link = entityDocsLink(row);
        return link ? (
          <button
            onClick={() => navigate(link)}
            className="text-xs font-bold text-[#2563EB] bg-[#EFF6FF] px-3 py-1.5 rounded-lg hover:bg-[#DBEAFE] transition-colors"
          >
            Update Doc
          </button>
        ) : (
          <span className="text-xs text-[#9898A4]">—</span>
        );
      },
    },
  ];

  return (
    <DashboardLayout
      active="Documents"
      breadcrumb="Documents"
      title="Expiry Management"
      pageTitle="Expiry Management"
      pageSub="Monitor documents approaching expiration."
    >
      <div className="px-6 pb-6">

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-[#FEF2F2] border border-[#DC2626]/20 rounded-lg p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-[#DC2626]/10 flex items-center justify-center text-[#DC2626]">
                <ShieldAlert size={16} />
              </div>
              <h3 className="text-sm font-bold text-[#DC2626]">Already Expired</h3>
            </div>
            <p className="text-3xl font-bold text-[#DC2626] ml-11">{isLoading ? '—' : expiredCount}</p>
          </div>

          <div className="bg-[#FFFBEB] border border-[#D97706]/20 rounded-lg p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-[#D97706]/10 flex items-center justify-center text-[#D97706]">
                <AlertTriangle size={16} />
              </div>
              <h3 className="text-sm font-bold text-[#D97706]">Critical (≤ 7 Days)</h3>
            </div>
            <p className="text-3xl font-bold text-[#D97706] ml-11">{isLoading ? '—' : criticalCount}</p>
          </div>

          <div className="bg-[#F5F5F7] border border-black/[0.05] rounded-lg p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-black/[0.05] flex items-center justify-center text-[#6E6E80]">
                <Clock size={16} />
              </div>
              <h3 className="text-sm font-bold text-[#6E6E80]">Upcoming (30 Days)</h3>
            </div>
            <p className="text-3xl font-bold text-[#111] ml-11">{isLoading ? '—' : upcomingCount}</p>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-lg border border-black/[0.06] shadow-sm overflow-hidden">
          <div className="p-5 border-b border-black/[0.04] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FAFAFA]">
            <h3 className="text-sm font-bold text-[#111]">Action Required</h3>

            <div className="relative max-w-xs w-full">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9898A4]" />
              <input
                type="text"
                placeholder="Search entity or document..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white border border-black/[0.08] rounded-lg pl-9 pr-4 py-2 text-xs outline-none focus:border-[#E8450F] shadow-sm transition-all"
              />
            </div>
          </div>

          {isError ? (
            <div className="p-12 text-center text-[#DC2626] text-sm">Failed to load documents.</div>
          ) : (
            <DataTable columns={columns} data={filteredItems} isLoading={isLoading} />
          )}
        </div>

      </div>
    </DashboardLayout>
  );
}
