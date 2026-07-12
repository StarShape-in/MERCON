import { useMemo, useState } from 'react';
import { UploadCloud, FileText, Search, Folder, Shield, Car, User as UserIcon, Eye, Download } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import DashboardLayout from '@/components/layout/DashboardLayout';
import Btn from '@/components/ui/Btn';
import { documentService, type MerconDocument } from '@/services/documentService';
import { driverService } from '@/services/driverService';
import { vehicleService } from '@/services/vehicleService';
import { docTypeLabel, categoryForDocType, categoryForEntity, type DocCategory } from '@/lib/documents';

const CATEGORY_TABS: Array<'All' | DocCategory> = ['All', 'Drivers', 'Vehicles', 'Operations', 'Company'];

const CATEGORY_ICON: Record<DocCategory, { icon: React.ReactNode; bg: string }> = {
  Drivers:    { icon: <UserIcon size={18} className="text-[#E8450F]" />, bg: 'bg-[#FFF0EB]' },
  Vehicles:   { icon: <Car size={18} className="text-[#2563EB]" />, bg: 'bg-[#EFF6FF]' },
  Operations: { icon: <Folder size={18} className="text-[#8B5CF6]" />, bg: 'bg-[#F5F3FF]' },
  Company:    { icon: <Shield size={18} className="text-[#16A34A]" />, bg: 'bg-[#F0FDF4]' },
};

export default function DocumentsCenterPage() {
  const [activeCategory, setActiveCategory] = useState<'All' | DocCategory>('All');
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

  // Folders = real counts grouped by doc_type
  const folders = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of docs) counts.set(d.doc_type, (counts.get(d.doc_type) ?? 0) + 1);
    return Array.from(counts.entries())
      .map(([docType, count]) => ({ docType, count, category: categoryForDocType(docType) }))
      .sort((a, b) => b.count - a.count);
  }, [docs]);

  const filteredFolders = folders.filter((f) => {
    const matchesCat = activeCategory === 'All' || f.category === activeCategory;
    const matchesSearch = docTypeLabel(f.docType).toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // Recent docs (backend already returns newest-first); resolve entity + category
  const recentDocs = useMemo(() => {
    return docs
      .map((d) => ({ ...d, entityName: nameFor(d), category: categoryForEntity(d.entity_type) }))
      .filter((d) => {
        const matchesCat = activeCategory === 'All' || d.category === activeCategory;
        const q = search.toLowerCase();
        const matchesSearch =
          docTypeLabel(d.doc_type).toLowerCase().includes(q) || d.entityName.toLowerCase().includes(q);
        return matchesCat && matchesSearch;
      })
      .slice(0, 10);
  }, [docs, nameFor, activeCategory, search]);

  return (
    <DashboardLayout
      active="Documents"
      title="Documents Center"
      pageTitle="Document Repository"
      pageSub="Browse driver, vehicle, and company documents."
      actions={
        <div className="flex gap-2">
          <Btn label="Upload Document" icon={<UploadCloud size={14} />} />
        </div>
      }
    >
      <div className="px-6 pb-6">

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
          <div className="flex items-center gap-2 p-1 bg-[#F5F5F7] rounded-none w-full sm:w-auto overflow-x-auto">
            {CATEGORY_TABS.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-1.5 text-xs font-bold rounded-none transition-all whitespace-nowrap ${
                  activeCategory === cat
                    ? 'bg-white text-[#111] shadow-sm'
                    : 'text-[#6E6E80] hover:text-[#111]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9898A4]" />
            <input
              type="text"
              placeholder="Search documents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-black/[0.08] rounded-none pl-9 pr-4 py-2 text-xs outline-none focus:border-[#E8450F] shadow-sm transition-all"
            />
          </div>
        </div>

        {/* Folders Grid */}
        <h3 className="text-sm font-bold text-[#111] mb-4">Categories</h3>
        {isLoading ? (
          <div className="text-xs text-[#9898A4] mb-8">Loading…</div>
        ) : isError ? (
          <div className="text-xs text-[#DC2626] mb-8">Failed to load documents.</div>
        ) : filteredFolders.length === 0 ? (
          <div className="text-xs text-[#9898A4] mb-8">No documents yet.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
            {filteredFolders.map((folder) => {
              const ci = CATEGORY_ICON[folder.category];
              return (
                <div
                  key={folder.docType}
                  className="bg-white border border-black/[0.06] rounded-none p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-10 h-10 rounded-none flex items-center justify-center ${ci.bg}`}>
                      {ci.icon}
                    </div>
                    <span className="text-[10px] font-bold text-[#6E6E80] bg-[#F5F5F7] px-2 py-0.5 rounded-full group-hover:bg-[#111] group-hover:text-white transition-colors">
                      {folder.count} files
                    </span>
                  </div>
                  <h4 className="font-bold text-[#111] text-sm mb-1">{docTypeLabel(folder.docType)}</h4>
                  <p className="text-xs text-[#9898A4]">{folder.category}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Recent Files Table */}
        <div className="bg-white border border-black/[0.06] rounded-none shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-black/[0.04] flex justify-between items-center bg-[#FAFAFA]">
            <h3 className="text-sm font-bold text-[#111]">Recently Added Documents</h3>
          </div>

          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-black/[0.04]">
                <th className="px-5 py-3 font-semibold text-[10px] uppercase text-[#9898A4] tracking-wider">Document</th>
                <th className="px-5 py-3 font-semibold text-[10px] uppercase text-[#9898A4] tracking-wider">Owner</th>
                <th className="px-5 py-3 font-semibold text-[10px] uppercase text-[#9898A4] tracking-wider">Category</th>
                <th className="px-5 py-3 font-semibold text-[10px] uppercase text-[#9898A4] tracking-wider">Uploaded</th>
                <th className="px-5 py-3 font-semibold text-[10px] uppercase text-[#9898A4] tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentDocs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-xs text-[#9898A4]">
                    {isLoading ? 'Loading…' : 'No documents to show.'}
                  </td>
                </tr>
              ) : recentDocs.map((doc) => (
                <tr key={doc.id} className="border-b border-black/[0.04] hover:bg-[#FAFAFA] transition-colors last:border-0">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-none bg-[#FEE2E2] text-[#DC2626] flex items-center justify-center shrink-0">
                        <FileText size={14} />
                      </div>
                      <span className="font-semibold text-[#111] truncate max-w-[200px]">{docTypeLabel(doc.doc_type)}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-[#444] font-medium">{doc.entityName}</td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs font-medium text-[#6E6E80] bg-[#F5F5F7] px-2 py-0.5 rounded-md">
                      {doc.category}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-[#6E6E80] font-medium">
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-8 h-8 rounded-none hover:bg-[#F5F5F7] flex items-center justify-center text-[#6E6E80] transition-colors"
                        title="View"
                      >
                        <Eye size={14} />
                      </a>
                      <a
                        href={doc.file_url}
                        download
                        className="w-8 h-8 rounded-none hover:bg-[#F5F5F7] flex items-center justify-center text-[#6E6E80] transition-colors"
                        title="Download"
                      >
                        <Download size={14} />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </DashboardLayout>
  );
}
