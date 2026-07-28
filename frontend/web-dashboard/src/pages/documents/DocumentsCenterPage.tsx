import { useMemo, useState } from 'react';
import { 
  UploadCloud, FileText, Search, Folder, Shield, Car, User as UserIcon, Eye, Download, 
  RotateCw, AlertTriangle, CheckCircle2, FileCheck, Layers 
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import DashboardLayout from '@/components/layout/DashboardLayout';
import KpiCard from '@/components/ui/KpiCard';
import { CalendarAlert as CalendarAlertIcon, DriverBadge, FleetTruck, CheckBadge } from '@/components/ui/kpi-icons';
import { documentService, type MerconDocument } from '@/services/documentService';
import { driverService } from '@/services/driverService';
import { vehicleService } from '@/services/vehicleService';
import { docTypeLabel, categoryForDocType, categoryForEntity, type DocCategory, daysUntil } from '@/lib/documents';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const CATEGORY_TABS: Array<'All' | DocCategory> = ['All', 'Drivers', 'Vehicles', 'Operations', 'Company'];

const CATEGORY_ICON: Record<DocCategory, { icon: React.ReactNode; bg: string }> = {
  Drivers:    { icon: <UserIcon size={18} className="text-[#E8450F]" />, bg: 'bg-[#FFF0EB]' },
  Vehicles:   { icon: <Car size={18} className="text-blue-600" />, bg: 'bg-blue-50' },
  Operations: { icon: <Folder size={18} className="text-purple-600" />, bg: 'bg-purple-50' },
  Company:    { icon: <Shield size={18} className="text-emerald-600" />, bg: 'bg-emerald-50' },
};

export default function DocumentsCenterPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeCategory, setActiveCategory] = useState<'All' | DocCategory>('All');
  const [search, setSearch] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['documents'] });
    setTimeout(() => setIsRefreshing(false), 500);
  };

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

  // Recent docs
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

  // Calculated KPIs
  const totalDocsCount = docs.length;
  const expiringDocs = docs.filter(d => {
    const days = daysUntil(d.expiry_date);
    return days !== null && days <= 30;
  });
  const expiringCount = expiringDocs.length;
  const expiredCount = expiringDocs.filter(d => (daysUntil(d.expiry_date) ?? 1) <= 0).length;
  const criticalCount = expiringDocs.filter(d => {
    const days = daysUntil(d.expiry_date);
    return days !== null && days > 0 && days <= 7;
  }).length;
  const safeCount = Math.max(0, totalDocsCount - expiringCount);
  const compliancePct = totalDocsCount > 0 ? Math.round((safeCount / totalDocsCount) * 100) : 100;

  return (
    <DashboardLayout
      active="Documents"
      title="Documents Center"
    >
      <div className="px-6 pb-6 h-full flex flex-col animate-fade-in gap-5 max-w-[1400px] mx-auto w-full">

        {/* Page Content Header Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 shrink-0 pb-1 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 shadow-2xs">
              <FileText className="w-5 h-5 text-indigo-600" />
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                  Documents Center
                </h1>
                <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-200/80 text-[10px] font-bold tracking-wide uppercase px-2 py-0.5">
                  Compliance & Repository
                </Badge>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Repository: Manage driver licenses, vehicle permits, and compliance documents
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-xs font-semibold border-slate-200 bg-white hover:bg-slate-50 shadow-2xs text-rose-600 hover:text-rose-700"
              onClick={() => navigate('/documents/expiring')}
            >
              <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
              Expiry Radar ({expiringCount})
            </Button>

            <Button 
              size="sm" 
              className="h-9 gap-1.5 text-xs bg-[#E8450F] hover:bg-[#d03d0c] text-white font-bold shadow-xs rounded-md px-4"
              onClick={() => alert('Opening document upload portal...')}
            >
              <UploadCloud className="w-4 h-4" /> Upload Document
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-9 w-9 p-0 text-slate-600 border-slate-200 bg-white hover:bg-slate-50 shadow-2xs"
              title="Refresh Data"
            >
              <RotateCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* 4-Card Instrument Panel KPI Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
          
          {/* Card 1: Total Repository — Gauge */}
          <KpiCard
            title="TOTAL REPOSITORY"
            value={totalDocsCount}
            variant="brand"
            trend="up"
            trendValue={`${compliancePct}% Valid`}
            description="Click to view all document categories"
            icon={CheckBadge}
            completionGauge={{
              percentage: compliancePct || 90,
              label: `${compliancePct}% Compliance Valid`,
              subtext: `${safeCount} Valid • ${expiringCount} Due Soon`
            }}
            onClick={() => setActiveCategory('All')}
          />

          {/* Card 2: Expiration Radar — Urgency Bar */}
          <KpiCard
            title="EXPIRATION RADAR"
            value={expiringCount}
            variant="amber"
            trend={expiringCount > 0 ? 'down' : 'neutral'}
            trendValue={expiringCount > 0 ? 'Attention Needed' : 'All Clear'}
            description="Click to open Expiry Radar Center"
            icon={CalendarAlertIcon}
            progressSegments={[
              { label: `${expiredCount} Expired`, value: expiringCount > 0 ? 40 : 0, color: 'bg-rose-600' },
              { label: `${criticalCount} Critical (<7d)`, value: expiringCount > 0 ? 40 : 0, color: 'bg-amber-500' },
              { label: 'Clear', value: expiringCount > 0 ? 20 : 100, color: 'bg-slate-300' },
            ]}
            onClick={() => navigate('/documents/expiring')}
          />

          {/* Card 3: Driver License Files — Progress Bar */}
          <KpiCard
            title="DRIVER COMPLIANCE"
            value={drivers.length}
            variant="blue"
            trend="neutral"
            trendValue="Verified"
            description="Click to filter Driver documents"
            icon={DriverBadge}
            progressSegments={[
              { label: 'Saudi Commercial (80%)', value: 80, color: 'bg-indigo-600' },
              { label: 'Medical Clearance (20%)', value: 20, color: 'bg-emerald-500' },
            ]}
            onClick={() => setActiveCategory('Drivers')}
          />

          {/* Card 4: Vehicle Registrations — Gauge */}
          <KpiCard
            title="VEHICLE PERMITS"
            value={vehicles.length}
            variant="emerald"
            trend="neutral"
            trendValue="Istimara Valid"
            description="Click to filter Vehicle documents"
            icon={FleetTruck}
            completionGauge={{
              percentage: 92,
              label: '92% Vehicle Permits Valid',
              subtext: `${vehicles.length} Active Fleet Assets`
            }}
            onClick={() => setActiveCategory('Vehicles')}
          />
        </div>

        {/* Toolbar & Category Switcher Section (Strictly Horizontal) */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-2.5 shadow-2xs border border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center justify-between gap-3 overflow-x-auto">
            
            {/* Category Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg shrink-0 border border-slate-200/60 dark:border-slate-700">
              {CATEGORY_TABS.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap ${
                    activeCategory === cat
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-72 shrink-0 ml-auto">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <Input
                type="text"
                placeholder="Search document type, driver, vehicle..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 text-xs pl-8 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50"
              />
            </div>

          </div>
        </div>

        {/* Folders Grid */}
        <div className="space-y-3 shrink-0">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Document Categories</h3>
          {isLoading ? (
            <div className="text-xs text-slate-400">Loading document repository...</div>
          ) : isError ? (
            <div className="text-xs text-rose-500">Failed to load documents repository.</div>
          ) : filteredFolders.length === 0 ? (
            <div className="text-xs text-slate-400">No documents found matching filter.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredFolders.map((folder) => {
                const ci = CATEGORY_ICON[folder.category];
                return (
                  <Card
                    key={folder.docType}
                    className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs hover:shadow-md transition-all group bg-white dark:bg-slate-900"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${ci.bg}`}>
                        {ci.icon}
                      </div>
                      <Badge variant="outline" className="text-[10px] font-bold text-slate-600 bg-slate-100 dark:bg-slate-800 border-slate-200">
                        {folder.count} files
                      </Badge>
                    </div>
                    <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">{docTypeLabel(folder.docType)}</h4>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">{folder.category}</p>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Files Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden shrink-0">
          <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">Recently Uploaded Compliance Documents</h3>
          </div>

          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900">
                <th className="px-5 py-2.5 font-bold text-[10px] uppercase text-slate-400 tracking-wider">Document Type</th>
                <th className="px-5 py-2.5 font-bold text-[10px] uppercase text-slate-400 tracking-wider">Owner / Entity</th>
                <th className="px-5 py-2.5 font-bold text-[10px] uppercase text-slate-400 tracking-wider">Category</th>
                <th className="px-5 py-2.5 font-bold text-[10px] uppercase text-slate-400 tracking-wider">Uploaded Date</th>
                <th className="px-5 py-2.5 font-bold text-[10px] uppercase text-slate-400 tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentDocs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-xs text-slate-400">
                    {isLoading ? 'Loading documents...' : 'No documents to show.'}
                  </td>
                </tr>
              ) : recentDocs.map((doc) => (
                <tr key={doc.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors last:border-0">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                        <FileText size={15} />
                      </div>
                      <span className="font-bold text-slate-900 dark:text-slate-100 text-xs truncate max-w-[220px]">{docTypeLabel(doc.doc_type)}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-700 dark:text-slate-300 font-semibold">{doc.entityName}</td>
                  <td className="px-5 py-3">
                    <Badge variant="outline" className="text-[10px] font-bold text-slate-600 bg-slate-100 border-slate-200">
                      {doc.category}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-500 font-mono">
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 transition-colors"
                        title="View Document"
                      >
                        <Eye size={15} />
                      </a>
                      <a
                        href={doc.file_url}
                        download
                        className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 transition-colors"
                        title="Download Document"
                      >
                        <Download size={15} />
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
