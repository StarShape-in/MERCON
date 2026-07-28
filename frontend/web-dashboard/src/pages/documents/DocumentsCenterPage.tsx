import { useMemo, useState } from 'react';
import {
  UploadCloud, FileText, Search, Shield, Car, User as UserIcon,
  Eye, Download, RotateCw, AlertTriangle, CheckCircle2, Clock,
  FolderOpen, FileCheck, Building2, Package, ChevronRight,
  ShieldAlert, ShieldCheck, CalendarClock, Layers
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { documentService, type MerconDocument } from '@/services/documentService';
import { driverService } from '@/services/driverService';
import { vehicleService } from '@/services/vehicleService';
import { docTypeLabel, categoryForDocType, categoryForEntity, type DocCategory, daysUntil } from '@/lib/documents';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/* ─────────────────────── constants ───────────────────────── */

const CATEGORY_TABS: Array<'All' | DocCategory> = ['All', 'Drivers', 'Vehicles', 'Operations', 'Company'];

const CATEGORY_META: Record<'All' | DocCategory, {
  icon: React.ReactNode;
  label: string;
  accent: string;
  bg: string;
  border: string;
  text: string;
}> = {
  All:        { icon: <Layers size={16} />,       label: 'All Documents', accent: 'bg-slate-600',   bg: 'bg-slate-50 dark:bg-slate-800/40',   border: 'border-slate-200 dark:border-slate-700', text: 'text-slate-600 dark:text-slate-300' },
  Drivers:    { icon: <UserIcon size={16} />,      label: 'Driver Files',  accent: 'bg-[#E8450F]',   bg: 'bg-orange-50/60 dark:bg-orange-950/20', border: 'border-orange-200/60 dark:border-orange-900/40', text: 'text-orange-700 dark:text-orange-300' },
  Vehicles:   { icon: <Car size={16} />,           label: 'Vehicle Files', accent: 'bg-blue-600',    bg: 'bg-blue-50/60 dark:bg-blue-950/20',  border: 'border-blue-200/60 dark:border-blue-900/40',    text: 'text-blue-700 dark:text-blue-300' },
  Operations: { icon: <Package size={16} />,       label: 'Operations',    accent: 'bg-purple-600',  bg: 'bg-purple-50/60 dark:bg-purple-950/20', border: 'border-purple-200/60 dark:border-purple-900/40', text: 'text-purple-700 dark:text-purple-300' },
  Company:    { icon: <Building2 size={16} />,     label: 'Company',       accent: 'bg-emerald-600', bg: 'bg-emerald-50/60 dark:bg-emerald-950/20', border: 'border-emerald-200/60 dark:border-emerald-900/40', text: 'text-emerald-700 dark:text-emerald-300' },
};

function expiryStatus(iso: string | null | undefined): {
  label: string; color: string; bg: string; icon: React.ReactNode; days: number | null;
} {
  const days = daysUntil(iso);
  if (days === null) return { label: 'No Expiry', color: 'text-slate-500', bg: 'bg-slate-100 dark:bg-slate-800', icon: <Clock size={11} />, days };
  if (days <= 0)   return { label: 'Expired',     color: 'text-rose-700',  bg: 'bg-rose-100 dark:bg-rose-950/50', icon: <ShieldAlert size={11} />, days };
  if (days <= 7)   return { label: `${days}d — Critical`, color: 'text-rose-600',  bg: 'bg-rose-50 dark:bg-rose-950/30',  icon: <ShieldAlert size={11} />, days };
  if (days <= 30)  return { label: `${days}d — Due Soon`, color: 'text-amber-700', bg: 'bg-amber-50 dark:bg-amber-950/30', icon: <CalendarClock size={11} />, days };
  return { label: `${days}d — Valid`, color: 'text-emerald-700', bg: 'bg-emerald-50 dark:bg-emerald-950/30', icon: <ShieldCheck size={11} />, days };
}

const DOC_TYPE_ICON: Record<string, React.ReactNode> = {
  DriverLicense:       <UserIcon size={14} className="text-[#E8450F]" />,
  VehicleRegistration: <Car size={14} className="text-blue-600" />,
  Insurance:           <Shield size={14} className="text-indigo-600" />,
  POD:                 <FileCheck size={14} className="text-purple-600" />,
  CustomsClearance:    <ShieldCheck size={14} className="text-teal-600" />,
  Waybill:             <FileText size={14} className="text-slate-600" />,
  Contract:            <Building2 size={14} className="text-emerald-600" />,
  Invoice:             <Package size={14} className="text-amber-600" />,
};

/* ─────────────────────── component ───────────────────────── */

export default function DocumentsCenterPage() {
  const navigate    = useNavigate();
  const queryClient = useQueryClient();
  const [activeCategory, setActiveCategory] = useState<'All' | DocCategory>('All');
  const [search, setSearch]                 = useState('');
  const [isRefreshing, setIsRefreshing]     = useState(false);

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
      if (doc.entity_type === 'Driver')  return dMap.get(doc.entity_id) || 'Unknown Driver';
      if (doc.entity_type === 'Vehicle') return vMap.get(doc.entity_id) || 'Unknown Vehicle';
      return doc.entity_type;
    };
  }, [drivers, vehicles]);

  /* KPIs */
  const totalDocsCount = docs.length;
  const allExpiring    = docs.filter(d => { const n = daysUntil(d.expiry_date); return n !== null && n <= 30; });
  const expiringCount  = allExpiring.length;
  const expiredCount   = allExpiring.filter(d => (daysUntil(d.expiry_date) ?? 1) <= 0).length;
  const criticalCount  = allExpiring.filter(d => { const n = daysUntil(d.expiry_date); return n !== null && n > 0 && n <= 7; }).length;
  const safeCount      = Math.max(0, totalDocsCount - expiringCount);
  const compliancePct  = totalDocsCount > 0 ? Math.round((safeCount / totalDocsCount) * 100) : 100;

  /* Per-category counts */
  const catCounts = useMemo(() => {
    const m: Record<string, number> = { All: docs.length, Drivers: 0, Vehicles: 0, Operations: 0, Company: 0 };
    for (const d of docs) { const cat = categoryForEntity(d.entity_type); m[cat] = (m[cat] || 0) + 1; }
    return m;
  }, [docs]);

  /* Filtered files */
  const filteredDocs = useMemo(() =>
    docs
      .map(d => ({ ...d, entityName: nameFor(d), category: categoryForEntity(d.entity_type) }))
      .filter(d => {
        const matchesCat = activeCategory === 'All' || d.category === activeCategory;
        const q = search.toLowerCase();
        const matchesSearch = !q || docTypeLabel(d.doc_type).toLowerCase().includes(q) || d.entityName.toLowerCase().includes(q);
        return matchesCat && matchesSearch;
      }),
    [docs, nameFor, activeCategory, search]);

  /* Grouped folder panels per doc_type */
  const folderGroups = useMemo(() => {
    const groups = new Map<string, typeof filteredDocs>();
    for (const d of filteredDocs) {
      if (!groups.has(d.doc_type)) groups.set(d.doc_type, []);
      groups.get(d.doc_type)!.push(d);
    }
    return Array.from(groups.entries())
      .map(([docType, items]) => ({ docType, items, category: categoryForDocType(docType) }))
      .sort((a, b) => b.items.length - a.items.length);
  }, [filteredDocs]);

  return (
    <DashboardLayout active="Documents" title="Documents Center">
      <div className="px-6 pb-6 h-full flex flex-col animate-fade-in gap-5 max-w-[1400px] mx-auto w-full">

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-4 shrink-0 pb-1 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 flex items-center justify-center shadow-2xs">
              <FolderOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
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
                Fleet regulatory document vault — licenses, permits, contracts & compliance records
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-xs font-semibold border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/20 dark:border-rose-800/50 dark:text-rose-400"
              onClick={() => navigate('/documents/expiring')}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Expiry Radar {expiringCount > 0 && <span className="ml-0.5 bg-rose-600 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full">{expiringCount}</span>}
            </Button>
            <Button
              size="sm"
              className="h-9 gap-1.5 text-xs bg-[#E8450F] hover:bg-[#d03d0c] text-white font-bold shadow-xs rounded-md px-4"
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

        {/* ── Compliance Health Strip ─────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 shrink-0">

          {/* Compliance Score */}
          <Card className="border border-slate-200 dark:border-slate-800 shadow-2xs rounded-2xl overflow-hidden">
            <CardHeader className="pb-2 pt-4 px-5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Overall Compliance Health</span>
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-4xl font-extrabold font-mono text-slate-900 dark:text-slate-100">{compliancePct}%</span>
                <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", compliancePct >= 90 ? "bg-emerald-100 text-emerald-700" : compliancePct >= 70 ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700")}>
                  {compliancePct >= 90 ? 'Compliant' : compliancePct >= 70 ? 'At Risk' : 'Critical'}
                </span>
              </div>
              <Progress
                value={compliancePct}
                className="h-2 rounded-full bg-slate-100 dark:bg-slate-800"
              />
              <div className="flex justify-between text-[10px] font-medium text-slate-400 mt-1.5">
                <span>{safeCount} Valid</span>
                <span>{expiringCount} Need Attention</span>
              </div>
            </CardContent>
          </Card>

          {/* Expiry Breakdown */}
          <Card className="border border-amber-200/70 dark:border-amber-900/40 bg-amber-50/30 dark:bg-amber-950/10 shadow-2xs rounded-2xl">
            <CardHeader className="pb-2 pt-4 px-5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-600 dark:text-amber-400">Expiry Risk Breakdown</span>
                <CalendarClock className="w-4 h-4 text-amber-500" />
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-4 space-y-2">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-800/40">
                <div className="flex items-center gap-2 text-xs font-bold text-rose-700 dark:text-rose-400">
                  <ShieldAlert size={13} />
                  Expired Documents
                </div>
                <span className="font-mono font-extrabold text-rose-700 dark:text-rose-400 text-sm">{expiredCount}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-400">
                  <CalendarClock size={13} />
                  Critical (&lt;7 days)
                </div>
                <span className="font-mono font-extrabold text-amber-700 dark:text-amber-400 text-sm">{criticalCount}</span>
              </div>
            </CardContent>
          </Card>

          {/* Category Breakdown */}
          <Card className="border border-slate-200 dark:border-slate-800 shadow-2xs rounded-2xl">
            <CardHeader className="pb-2 pt-4 px-5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Repository by Category</span>
                <Layers className="w-4 h-4 text-slate-400" />
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-4 space-y-1.5">
              {(['Drivers', 'Vehicles', 'Operations', 'Company'] as DocCategory[]).map(cat => {
                const meta = CATEGORY_META[cat];
                const count = catCounts[cat] || 0;
                const pct = totalDocsCount > 0 ? Math.round((count / totalDocsCount) * 100) : 0;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all hover:bg-slate-50 dark:hover:bg-slate-800/60 group",
                      activeCategory === cat && "bg-slate-100 dark:bg-slate-800"
                    )}
                  >
                    <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", meta.accent)} />
                    <span className="font-semibold text-slate-700 dark:text-slate-300 flex-1 text-left">{cat}</span>
                    <span className="font-mono text-slate-400 text-[10px]">{pct}%</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100 w-6 text-right">{count}</span>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* ── Search + Category Tab Bar ───────────────────────── */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">

          {/* Category Tab Pills */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
            {CATEGORY_TABS.map(cat => {
              const meta = CATEGORY_META[cat];
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
                    isActive
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  )}
                >
                  <span className={cn(isActive ? meta.text : "text-slate-400")}>{meta.icon}</span>
                  {cat}
                  <span className={cn(
                    "text-[9px] font-extrabold px-1.5 py-0.5 rounded-full",
                    isActive ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "bg-slate-200 dark:bg-slate-700 text-slate-500"
                  )}>
                    {catCounts[cat] ?? 0}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-[240px] max-w-sm ml-auto">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <Input
              type="text"
              placeholder="Search document type, owner, entity..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 text-xs pl-8 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 rounded-xl"
            />
          </div>
        </div>

        {/* ── Document Folder Panels ──────────────────────────── */}
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-slate-400">
              <RotateCw className="w-6 h-6 animate-spin" />
              <span className="text-xs font-medium">Loading document repository...</span>
            </div>
          </div>
        ) : isError ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-xs text-rose-500 font-medium">Failed to load documents repository.</div>
          </div>
        ) : folderGroups.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <FolderOpen className="w-8 h-8 text-slate-300 dark:text-slate-600" />
            </div>
            <p className="text-sm font-bold text-slate-500">No documents found</p>
            <p className="text-xs text-slate-400">Try adjusting your category filter or search term</p>
          </div>
        ) : (
          <div className="space-y-3">
            {folderGroups.map(({ docType, items, category }) => {
              const catMeta = CATEGORY_META[category];
              const docIcon = DOC_TYPE_ICON[docType] ?? <FileText size={14} className="text-slate-500" />;
              const expiringItems = items.filter(d => { const n = daysUntil(d.expiry_date); return n !== null && n <= 30; });
              const expiredItems  = items.filter(d => { const n = daysUntil(d.expiry_date); return n !== null && n <= 0; });

              return (
                <div
                  key={docType}
                  className={cn("rounded-2xl border overflow-hidden shadow-2xs", catMeta.border)}
                >
                  {/* Folder Header */}
                  <div className={cn("flex items-center justify-between px-5 py-3", catMeta.bg)}>
                    <div className="flex items-center gap-3">
                      <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center border shadow-2xs bg-white dark:bg-slate-900", catMeta.border)}>
                        {docIcon}
                      </div>
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                          {docTypeLabel(docType)}
                        </h3>
                        <span className={cn("text-[10px] font-bold uppercase tracking-wide", catMeta.text)}>
                          {catMeta.label}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {expiredItems.length > 0 && (
                        <Badge className="bg-rose-600 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full">
                          {expiredItems.length} Expired
                        </Badge>
                      )}
                      {(expiringItems.length - expiredItems.length) > 0 && (
                        <Badge className="bg-amber-500 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full">
                          {expiringItems.length - expiredItems.length} Due Soon
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                        {items.length} files
                      </Badge>
                    </div>
                  </div>

                  <Separator />

                  {/* Files Table */}
                  <div className="bg-white dark:bg-slate-900">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30">
                          <th className="px-5 py-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Owner / Entity</th>
                          <th className="px-5 py-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Uploaded</th>
                          <th className="px-5 py-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Expiry Status</th>
                          <th className="px-5 py-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((doc) => {
                          const status = expiryStatus(doc.expiry_date);
                          return (
                            <tr
                              key={doc.id}
                              className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                            >
                              <td className="px-5 py-2.5">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                    {docIcon}
                                  </div>
                                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                                    {doc.entityName}
                                  </span>
                                </div>
                              </td>
                              <td className="px-5 py-2.5 text-[11px] font-mono text-slate-400">
                                {new Date(doc.createdAt).toLocaleDateString()}
                              </td>
                              <td className="px-5 py-2.5">
                                <span className={cn(
                                  "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full",
                                  status.bg, status.color
                                )}>
                                  {status.icon}
                                  {status.label}
                                </span>
                              </td>
                              <td className="px-5 py-2.5 text-right">
                                <TooltipProvider>
                                  <div className="flex items-center justify-end gap-1">
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <a
                                          href={doc.file_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
                                        >
                                          <Eye size={13} />
                                        </a>
                                      </TooltipTrigger>
                                      <TooltipContent className="text-[10px]">View Document</TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <a
                                          href={doc.file_url}
                                          download
                                          className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
                                        >
                                          <Download size={13} />
                                        </a>
                                      </TooltipTrigger>
                                      <TooltipContent className="text-[10px]">Download</TooltipContent>
                                    </Tooltip>
                                  </div>
                                </TooltipProvider>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
