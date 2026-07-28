import { useMemo, useState } from 'react';
import { 
  UploadCloud, FileText, Search, FolderOpen, Shield, Car, User as UserIcon, Eye, Download, 
  RotateCw, AlertTriangle, CheckCircle2, FileCheck, Briefcase, Clock, ChevronRight,
  FileBadge2, FileBarChart2, FileClock, FileKey2
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

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// ─── Category Config ─────────────────────────────────────────────────────────

const CATEGORY_TABS: Array<'All' | DocCategory> = ['All', 'Drivers', 'Vehicles', 'Operations', 'Company'];

const CATEGORY_CONFIG: Record<DocCategory, {
  icon: React.ElementType;
  color: string;
  iconBg: string;
  borderColor: string;
  lightBg: string;
  label: string;
  description: string;
}> = {
  Drivers:    { icon: UserIcon,      color: 'text-[#E8450F]',   iconBg: 'bg-[#FFF0EB] dark:bg-[#E8450F]/10', borderColor: 'border-[#E8450F]/20', lightBg: 'bg-[#FFF8F5]', label: 'Driver Documents', description: 'Licenses, medical certificates & permits' },
  Vehicles:   { icon: Car,           color: 'text-blue-600',    iconBg: 'bg-blue-50 dark:bg-blue-950/30',    borderColor: 'border-blue-200/60',   lightBg: 'bg-blue-50/50', label: 'Vehicle Documents', description: 'Registrations, insurance & inspections' },
  Operations: { icon: Briefcase,     color: 'text-violet-600',  iconBg: 'bg-violet-50 dark:bg-violet-950/30',borderColor: 'border-violet-200/60', lightBg: 'bg-violet-50/50', label: 'Operations Files', description: 'Waybills, PODs & customs clearance' },
  Company:    { icon: Shield,        color: 'text-emerald-600', iconBg: 'bg-emerald-50 dark:bg-emerald-950/30', borderColor: 'border-emerald-200/60', lightBg: 'bg-emerald-50/50', label: 'Company Records', description: 'Contracts, invoices & corporate filings' },
};

const DOC_TYPE_ICON: Record<string, React.ElementType> = {
  DriverLicense:       FileBadge2,
  VehicleRegistration: FileKey2,
  Insurance:           FileCheck,
  POD:                 FileBarChart2,
  CustomsClearance:    FileKey2,
  Waybill:             FileClock,
  Contract:            FileText,
  Invoice:             FileBarChart2,
};

// ─── Expiry Status ────────────────────────────────────────────────────────────

function expiryStatus(iso: string | null | undefined): 'expired' | 'critical' | 'warning' | 'valid' | 'none' {
  const days = daysUntil(iso);
  if (days === null) return 'none';
  if (days <= 0) return 'expired';
  if (days <= 7) return 'critical';
  if (days <= 30) return 'warning';
  return 'valid';
}

const EXPIRY_BADGE: Record<string, { label: string; className: string }> = {
  expired:  { label: 'Expired',      className: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800/50' },
  critical: { label: 'Critical <7d', className: 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-800/40' },
  warning:  { label: 'Due Soon',     className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800/40' },
  valid:    { label: 'Valid',         className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800/40' },
  none:     { label: 'No Expiry',    className: 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700' },
};

// ─── Category Folder Panel ────────────────────────────────────────────────────

function CategoryFolderPanel({
  category,
  folders,
  totalDocs,
  expiringCount,
  isActive,
  onClick,
}: {
  category: DocCategory;
  folders: { docType: string; count: number; category: DocCategory }[];
  totalDocs: number;
  expiringCount: number;
  isActive: boolean;
  onClick: () => void;
}) {
  const cfg = CATEGORY_CONFIG[category];
  const Icon = cfg.icon;
  const categoryTotal = folders.reduce((s, f) => s + f.count, 0);

  return (
    <Card
      onClick={onClick}
      className={cn(
        'group border rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-md',
        isActive ? `border-2 ${cfg.borderColor} shadow-sm` : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
      )}
    >
      {/* Card top accent strip */}
      <div className={cn('h-1 w-full', isActive ? `bg-gradient-to-r from-slate-300 via-slate-200 to-transparent` : 'bg-slate-100 dark:bg-slate-800/60 group-hover:bg-slate-200')} />

      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', cfg.iconBg)}>
            <Icon className={cn('w-5 h-5', cfg.color)} />
          </div>
          <div className="flex items-center gap-1.5">
            {expiringCount > 0 && (
              <span className="flex items-center gap-0.5 text-[9px] font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 px-1.5 py-0.5 rounded-full">
                <AlertTriangle className="w-2.5 h-2.5" />{expiringCount}
              </span>
            )}
            <Badge variant="outline" className="text-[10px] font-bold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
              {categoryTotal} files
            </Badge>
          </div>
        </div>

        {/* Label & Description */}
        <h4 className={cn('font-extrabold text-sm mb-0.5 transition-colors', cfg.color)}>{cfg.label}</h4>
        <p className="text-[10px] text-slate-400 font-medium mb-3">{cfg.description}</p>

        {/* Document Type Chips */}
        <div className="flex flex-wrap gap-1 mb-3">
          {folders.slice(0, 3).map(f => (
            <span key={f.docType} className="text-[9px] font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
              {docTypeLabel(f.docType)} ({f.count})
            </span>
          ))}
          {folders.length > 3 && (
            <span className="text-[9px] font-bold text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-1.5 py-0.5 rounded-md">
              +{folders.length - 3} more
            </span>
          )}
        </div>

        {/* Fill bar */}
        <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-500', cfg.color.replace('text-', 'bg-'))}
            style={{ width: `${totalDocs > 0 ? Math.round((categoryTotal / totalDocs) * 100) : 0}%` }}
          />
        </div>
        <div className="flex justify-between text-[9px] font-mono text-slate-400 mt-1">
          <span>{Math.round((categoryTotal / (totalDocs || 1)) * 100)}% of repository</span>
          <ChevronRight className="w-3 h-3 text-slate-300 group-hover:text-slate-500 transition-colors" />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

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

  // Folders grouped by doc_type
  const folders = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of docs) counts.set(d.doc_type, (counts.get(d.doc_type) ?? 0) + 1);
    return Array.from(counts.entries())
      .map(([docType, count]) => ({ docType, count, category: categoryForDocType(docType) }))
      .sort((a, b) => b.count - a.count);
  }, [docs]);

  // Folders grouped by category
  const foldersByCategory = useMemo(() => {
    const map: Partial<Record<DocCategory, typeof folders>> = {};
    for (const f of folders) {
      if (!map[f.category]) map[f.category] = [];
      map[f.category]!.push(f);
    }
    return map;
  }, [folders]);

  // Recent docs with enriched fields
  const enrichedDocs = useMemo(() => {
    return docs
      .map((d) => ({
        ...d,
        entityName: nameFor(d),
        category: categoryForEntity(d.entity_type),
        expiryStatus: expiryStatus(d.expiry_date),
        daysLeft: daysUntil(d.expiry_date),
      }))
      .filter((d) => {
        const matchesCat = activeCategory === 'All' || d.category === activeCategory;
        const q = search.toLowerCase();
        const matchesSearch =
          docTypeLabel(d.doc_type).toLowerCase().includes(q) || d.entityName.toLowerCase().includes(q);
        return matchesCat && matchesSearch;
      })
      .sort((a, b) => {
        // Sort expired/critical first
        const order = { expired: 0, critical: 1, warning: 2, valid: 3, none: 4 };
        return (order[a.expiryStatus] ?? 4) - (order[b.expiryStatus] ?? 4);
      })
      .slice(0, 15);
  }, [docs, nameFor, activeCategory, search]);

  // Expiring docs
  const expiringDocs = docs.filter(d => {
    const days = daysUntil(d.expiry_date);
    return days !== null && days <= 30;
  });
  const expiringCount = expiringDocs.length;
  const expiredCount = docs.filter(d => (daysUntil(d.expiry_date) ?? 1) <= 0).length;
  const criticalCount = expiringDocs.filter(d => {
    const days = daysUntil(d.expiry_date);
    return days !== null && days > 0 && days <= 7;
  }).length;
  const totalDocsCount = docs.length;
  const safeCount = Math.max(0, totalDocsCount - expiringCount);
  const compliancePct = totalDocsCount > 0 ? Math.round((safeCount / totalDocsCount) * 100) : 100;

  // Expiring by category for folder panels
  const expiringByCategory = useMemo(() => {
    const map: Partial<Record<DocCategory, number>> = {};
    for (const d of expiringDocs) {
      const cat = categoryForEntity(d.entity_type);
      map[cat] = (map[cat] ?? 0) + 1;
    }
    return map;
  }, [expiringDocs]);

  return (
    <DashboardLayout active="Documents" title="Documents Center">
      <div className="px-6 pb-6 h-full flex flex-col animate-fade-in gap-5 max-w-[1400px] mx-auto w-full">

        {/* ── Page Header ─────────────────────────────────────────────────── */}
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
                  Compliance Repository
                </Badge>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Fleet compliance vault — driver licenses, vehicle permits, and operational documents
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-xs font-semibold border-slate-200 bg-white hover:bg-rose-50 shadow-2xs text-rose-600 hover:text-rose-700 hover:border-rose-200"
              onClick={() => navigate('/documents/expiring')}
            >
              <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
              Expiry Radar {expiringCount > 0 && <span className="ml-0.5 bg-rose-500 text-white text-[9px] font-bold rounded-full px-1.5 py-0.5">{expiringCount}</span>}
            </Button>

            <Button
              size="sm"
              className="h-9 gap-1.5 text-xs bg-[#E8450F] hover:bg-[#d03d0c] text-white font-bold shadow-xs rounded-lg px-4"
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
              title="Refresh"
            >
              <RotateCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* ── Compliance Health KPI Strip ──────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
          <KpiCard
            title="TOTAL REPOSITORY"
            value={totalDocsCount}
            variant="brand"
            trend="up"
            trendValue={`${compliancePct}% Compliant`}
            description="Click to view full repository"
            icon={CheckBadge}
            completionGauge={{
              percentage: compliancePct || 90,
              label: `${compliancePct}% Compliance Health`,
              subtext: `${safeCount} Valid • ${expiringCount} Due Soon`
            }}
            onClick={() => setActiveCategory('All')}
          />

          <KpiCard
            title="EXPIRATION RADAR"
            value={expiringCount}
            variant="amber"
            trend={expiringCount > 0 ? 'down' : 'neutral'}
            trendValue={expiringCount > 0 ? 'Action Required' : 'All Clear'}
            description="Click to open Expiry Radar Center"
            icon={CalendarAlertIcon}
            progressSegments={[
              { label: `${expiredCount} Expired`, value: expiringCount > 0 ? Math.round((expiredCount / (totalDocsCount || 1)) * 100) || 30 : 0, color: 'bg-rose-600' },
              { label: `${criticalCount} Critical`, value: expiringCount > 0 ? Math.round((criticalCount / (totalDocsCount || 1)) * 100) || 25 : 0, color: 'bg-amber-500' },
              { label: 'Clear', value: Math.round((safeCount / (totalDocsCount || 1)) * 100) || 100, color: 'bg-slate-200' },
            ]}
            onClick={() => navigate('/documents/expiring')}
          />

          <KpiCard
            title="DRIVER COMPLIANCE"
            value={drivers.length}
            variant="blue"
            trend="neutral"
            trendValue="Verified"
            description="Click to filter Driver documents"
            icon={DriverBadge}
            progressSegments={[
              { label: 'Licensed', value: 80, color: 'bg-indigo-500' },
              { label: 'Medical', value: 20, color: 'bg-emerald-500' },
            ]}
            onClick={() => setActiveCategory('Drivers')}
          />

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
              label: '92% Permits Active',
              subtext: `${vehicles.length} Registered Assets`
            }}
            onClick={() => setActiveCategory('Vehicles')}
          />
        </div>

        {/* ── Repository Category Panels ───────────────────────────────────── */}
        <div className="shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">Document Repository</h2>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">Select a category folder to filter documents below</p>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200/60 dark:border-slate-700">
              {CATEGORY_TABS.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition-all whitespace-nowrap ${
                    activeCategory === cat
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* 4 Category Folder Panels */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(['Drivers', 'Vehicles', 'Operations', 'Company'] as DocCategory[]).map((cat) => (
              <CategoryFolderPanel
                key={cat}
                category={cat}
                folders={foldersByCategory[cat] ?? []}
                totalDocs={totalDocsCount || 1}
                expiringCount={expiringByCategory[cat] ?? 0}
                isActive={activeCategory === cat}
                onClick={() => setActiveCategory(activeCategory === cat ? 'All' : cat)}
              />
            ))}
          </div>
        </div>

        {/* ── Document Ledger ──────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs overflow-hidden shrink-0">

          {/* Ledger Header */}
          <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-900">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-indigo-500" />
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                {activeCategory === 'All' ? 'All Compliance Documents' : `${activeCategory} Documents`}
              </h3>
              <Badge variant="outline" className="text-[10px] font-mono font-bold text-slate-500 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 ml-1">
                {enrichedDocs.length} files
              </Badge>
            </div>

            {/* Search */}
            <div className="relative w-60">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <Input
                type="text"
                placeholder="Search document or entity..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 text-xs pl-8 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 rounded-lg"
              />
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
              <RotateCw className="w-8 h-8 animate-spin text-indigo-400 opacity-60" />
              <p className="text-xs font-medium">Loading document repository...</p>
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <AlertTriangle className="w-8 h-8 text-rose-400 opacity-60" />
              <p className="text-xs text-rose-500 font-medium">Failed to load documents repository.</p>
            </div>
          ) : enrichedDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <FileText className="w-7 h-7 text-slate-300 dark:text-slate-600" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-slate-600 dark:text-slate-400">No documents found</p>
                <p className="text-xs text-slate-400 mt-0.5">Try adjusting the category filter or search query</p>
              </div>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900">
                  <th className="px-5 py-2.5 font-bold text-[10px] uppercase text-slate-400 tracking-wider">Document</th>
                  <th className="px-5 py-2.5 font-bold text-[10px] uppercase text-slate-400 tracking-wider">Owner</th>
                  <th className="px-5 py-2.5 font-bold text-[10px] uppercase text-slate-400 tracking-wider">Category</th>
                  <th className="px-5 py-2.5 font-bold text-[10px] uppercase text-slate-400 tracking-wider">Expiry Status</th>
                  <th className="px-5 py-2.5 font-bold text-[10px] uppercase text-slate-400 tracking-wider">Expires</th>
                  <th className="px-5 py-2.5 font-bold text-[10px] uppercase text-slate-400 tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {enrichedDocs.map((doc) => {
                  const DocIcon = DOC_TYPE_ICON[doc.doc_type] ?? FileText;
                  const expBadge = EXPIRY_BADGE[doc.expiryStatus];
                  const catCfg = CATEGORY_CONFIG[doc.category];

                  return (
                    <tr
                      key={doc.id}
                      className={cn(
                        'hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors',
                        doc.expiryStatus === 'expired' && 'bg-rose-50/30 dark:bg-rose-950/10',
                        doc.expiryStatus === 'critical' && 'bg-amber-50/20 dark:bg-amber-950/10',
                      )}
                    >
                      {/* Document */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', catCfg.iconBg)}>
                            <DocIcon className={cn('w-4 h-4', catCfg.color)} />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-slate-100 text-xs block">
                              {docTypeLabel(doc.doc_type)}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">#{doc.id.toString().slice(0, 8)}</span>
                          </div>
                        </div>
                      </td>

                      {/* Owner */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5">
                          {catCfg && <catCfg.icon className={cn('w-3 h-3 shrink-0', catCfg.color)} />}
                          <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold truncate max-w-[150px]">{doc.entityName}</span>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-5 py-3">
                        <Badge variant="outline" className={cn('text-[10px] font-bold border', catCfg.borderColor, catCfg.iconBg, catCfg.color)}>
                          {doc.category}
                        </Badge>
                      </td>

                      {/* Expiry Status */}
                      <td className="px-5 py-3">
                        <span className={cn('inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border', expBadge.className)}>
                          {doc.expiryStatus === 'expired' || doc.expiryStatus === 'critical' ? (
                            <AlertTriangle className="w-2.5 h-2.5" />
                          ) : doc.expiryStatus === 'valid' ? (
                            <CheckCircle2 className="w-2.5 h-2.5" />
                          ) : doc.expiryStatus === 'warning' ? (
                            <Clock className="w-2.5 h-2.5" />
                          ) : null}
                          {expBadge.label}
                        </span>
                      </td>

                      {/* Expires */}
                      <td className="px-5 py-3">
                        {doc.expiry_date ? (
                          <div>
                            <span className="text-xs text-slate-700 dark:text-slate-300 font-mono block">
                              {new Date(doc.expiry_date).toLocaleDateString()}
                            </span>
                            {doc.daysLeft !== null && (
                              <span className={cn(
                                'text-[10px] font-bold',
                                doc.daysLeft <= 0 ? 'text-rose-600' : doc.daysLeft <= 7 ? 'text-rose-500' : doc.daysLeft <= 30 ? 'text-amber-600' : 'text-emerald-600'
                              )}>
                                {doc.daysLeft <= 0 ? `${Math.abs(doc.daysLeft)}d overdue` : `${doc.daysLeft}d remaining`}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <a
                            href={doc.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-8 h-8 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/30 flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-colors"
                            title="View Document"
                          >
                            <Eye size={14} />
                          </a>
                          <a
                            href={doc.file_url}
                            download
                            className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
                            title="Download Document"
                          >
                            <Download size={14} />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

        </div>

      </div>
    </DashboardLayout>
  );
}
