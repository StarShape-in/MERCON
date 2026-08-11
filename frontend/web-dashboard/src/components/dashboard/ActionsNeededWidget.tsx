import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { FileWarning, Wrench, Clock, Receipt, CreditCard, MapPin, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckBadge } from '@/components/ui/kpi-icons';
import { docTypeLabel, daysUntil } from '@/lib/documents';
import { cn } from '@/lib/utils';
import type { MerconDocument } from '@/services/documentService';
import type { MaintenanceRecord } from '@/services/maintenanceService';
import type { Invoice } from '@/services/invoiceService';
import type { RateCard } from '@/services/rateCardService';
import type { Location } from '@/services/locationService';
import type { DelayLogRow } from '@/services/reportsService';

type ActionCategory = 'document' | 'maintenance' | 'delay' | 'invoice' | 'ratecard' | 'location';
type ActionSeverity = 'critical' | 'warning' | 'info';

interface ActionItem {
  id: string;
  category: ActionCategory;
  severity: ActionSeverity;
  title: string;
  subtitle: string;
  dueLabel: string;
  /** Lower sorts first — negative for the most overdue/severe. */
  urgencyValue: number;
  onResolve: () => void;
  resolveLabel: string;
}

interface ActionsNeededWidgetProps {
  expiringDocs: MerconDocument[];
  dueMaintenance: MaintenanceRecord[];
  delaysNeedingReason: DelayLogRow[];
  invoices: Invoice[];
  rateCards: RateCard[];
  locations: Location[];
  isLoading: boolean;
  onLogDelayReason: (row: DelayLogRow) => void;
}

const CATEGORY_META: Record<ActionCategory, { label: string; icon: LucideIcon; text: string; bg: string; border: string }> = {
  document: { label: 'Documents', icon: FileWarning, text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40', border: 'border-amber-200/80 dark:border-amber-800/60' },
  maintenance: { label: 'Maintenance', icon: Wrench, text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/40', border: 'border-blue-200/80 dark:border-blue-800/60' },
  delay: { label: 'Delays', icon: Clock, text: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/40', border: 'border-rose-200/80 dark:border-rose-800/60' },
  invoice: { label: 'Invoices', icon: Receipt, text: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/40', border: 'border-purple-200/80 dark:border-purple-800/60' },
  ratecard: { label: 'Rate Cards', icon: CreditCard, text: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/40', border: 'border-indigo-200/80 dark:border-indigo-800/60' },
  location: { label: 'Locations', icon: MapPin, text: 'text-slate-600 dark:text-slate-300', bg: 'bg-slate-100 dark:bg-slate-800', border: 'border-slate-200/80 dark:border-slate-700' },
};

const SEVERITY_STYLES: Record<ActionSeverity, string> = {
  critical: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800',
  warning: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
  info: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
};

function dueLabel(days: number | null): string {
  if (days === null) return '—';
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'Due today';
  return `Due in ${days}d`;
}

export default function ActionsNeededWidget({
  expiringDocs,
  dueMaintenance,
  delaysNeedingReason,
  invoices,
  rateCards,
  locations,
  isLoading,
  onLogDelayReason,
}: ActionsNeededWidgetProps) {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<ActionCategory | 'all'>('all');
  const [showAll, setShowAll] = useState(false);

  const items = useMemo<ActionItem[]>(() => {
    const list: ActionItem[] = [];

    expiringDocs.forEach((doc) => {
      const days = daysUntil(doc.expiry_date);
      list.push({
        id: `document-${doc.id}`,
        category: 'document',
        severity: (days ?? Infinity) <= 0 ? 'critical' : 'warning',
        title: docTypeLabel(doc.doc_type),
        subtitle: `${doc.entity_type} document`,
        dueLabel: dueLabel(days),
        urgencyValue: days ?? 999,
        onResolve: () => navigate('/documents/expiry'),
        resolveLabel: 'Review',
      });
    });

    dueMaintenance.forEach((m) => {
      const days = daysUntil(m.next_service_due);
      if (days === null) return;
      list.push({
        id: `maintenance-${m.id}`,
        category: 'maintenance',
        severity: days <= 0 ? 'critical' : 'warning',
        title: m.vehicle?.plate_number || 'Vehicle',
        subtitle: `Next service — ${m.maintenance_type}`,
        dueLabel: dueLabel(days),
        urgencyValue: days,
        onResolve: () => navigate(`/maintenance/${m.id}`),
        resolveLabel: 'Review',
      });
    });

    delaysNeedingReason.forEach((row) => {
      list.push({
        id: `delay-${row.stop_id}`,
        category: 'delay',
        severity: 'critical',
        title: row.route,
        subtitle: `${row.driver} • ${row.vehicle} • ${row.delay_hours.toFixed(1)}h late`,
        dueLabel: `${row.delay_hours.toFixed(1)}h late`,
        urgencyValue: -row.delay_hours,
        onResolve: () => onLogDelayReason(row),
        resolveLabel: 'Log Reason',
      });
    });

    const now = Date.now();
    invoices
      .filter((inv) => inv.status !== 'Paid' && inv.status !== 'Cancelled' && new Date(inv.due_date).getTime() < now)
      .forEach((inv) => {
        const days = Math.floor((new Date(inv.due_date).getTime() - now) / (1000 * 60 * 60 * 24));
        list.push({
          id: `invoice-${inv.id}`,
          category: 'invoice',
          severity: 'critical',
          title: `${inv.customer?.name || 'Customer'} — ${inv.currency} ${inv.total_amount.toLocaleString()}`,
          subtitle: `Invoice #${inv.ref_id || inv.id.substring(0, 8)}`,
          dueLabel: dueLabel(days),
          urgencyValue: days,
          onResolve: () => navigate(`/invoices/${inv.id}`),
          resolveLabel: 'Review',
        });
      });

    rateCards
      .filter((rc) => !rc.originLocationId || !rc.destinationLocationId)
      .forEach((rc) => {
        list.push({
          id: `ratecard-${rc.id}`,
          category: 'ratecard',
          severity: 'info',
          title: rc.name || `${rc.route_origin} → ${rc.route_destination}`,
          subtitle: rc.customer?.name || 'Standard rate card',
          dueLabel: 'Not linked',
          urgencyValue: 0,
          onResolve: () => navigate(`/rate-cards/${rc.id}/edit`),
          resolveLabel: 'Link Lane',
        });
      });

    locations
      .filter((l) => !l.address || l.lat == null)
      .forEach((l) => {
        list.push({
          id: `location-${l.id}`,
          category: 'location',
          severity: 'info',
          title: l.name,
          subtitle: 'Missing address or coordinates',
          dueLabel: 'Incomplete',
          urgencyValue: 0,
          onResolve: () => navigate('/locations'),
          resolveLabel: 'Fix',
        });
      });

    const severityWeight: Record<ActionSeverity, number> = { critical: 0, warning: 1, info: 2 };
    return list.sort((a, b) => severityWeight[a.severity] - severityWeight[b.severity] || a.urgencyValue - b.urgencyValue);
  }, [expiringDocs, dueMaintenance, delaysNeedingReason, invoices, rateCards, locations, navigate, onLogDelayReason]);

  const counts = useMemo(() => {
    const byCategory: Record<ActionCategory, number> = { document: 0, maintenance: 0, delay: 0, invoice: 0, ratecard: 0, location: 0 };
    let critical = 0;
    let warning = 0;
    let info = 0;
    items.forEach((item) => {
      byCategory[item.category]++;
      if (item.severity === 'critical') critical++;
      else if (item.severity === 'warning') warning++;
      else info++;
    });
    return { byCategory, critical, warning, info, total: items.length };
  }, [items]);

  const filteredItems = activeCategory === 'all' ? items : items.filter((i) => i.category === activeCategory);
  const visibleItems = showAll ? filteredItems : filteredItems.slice(0, 8);

  const categories: (ActionCategory | 'all')[] = ['all', 'document', 'maintenance', 'delay', 'invoice', 'ratecard', 'location'];

  return (
    <Card className="border-slate-200/60 shadow-sm rounded-xl bg-white dark:bg-slate-900">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span>Actions Needed</span>
            </CardTitle>
            <CardDescription className="text-[10px] text-slate-400 mt-0.5">
              Everything across the fleet that needs a decision
            </CardDescription>
          </div>
          {!isLoading && (
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold" style={{ color: '#E8450F' }}>{counts.total}</span>
              <span className="text-[11px] font-semibold text-slate-400">items need attention</span>
            </div>
          )}
        </div>
        {!isLoading && counts.total > 0 && (
          <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold mt-1.5">
            {counts.critical > 0 && <span className="text-rose-600 dark:text-rose-400">● {counts.critical} critical</span>}
            {counts.warning > 0 && <span className="text-amber-600 dark:text-amber-400">● {counts.warning} due this week</span>}
            {counts.info > 0 && <span className="text-slate-500 dark:text-slate-400">● {counts.info} cleanup</span>}
          </div>
        )}
      </CardHeader>

      <CardContent className="p-4 flex flex-col gap-4">
        {/* Category filter chips */}
        {!isLoading && counts.total > 0 && (
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200/80 dark:border-slate-700 overflow-x-auto">
            {categories.map((cat) => {
              const count = cat === 'all' ? counts.total : counts.byCategory[cat];
              if (cat !== 'all' && count === 0) return null;
              const meta = cat === 'all' ? null : CATEGORY_META[cat];
              const Icon = meta?.icon;
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => { setActiveCategory(cat); setShowAll(false); }}
                  className={cn(
                    'shrink-0 px-2.5 py-1.5 rounded-md transition-all text-[11px] flex items-center gap-1.5 font-semibold whitespace-nowrap',
                    isActive
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  )}
                >
                  {Icon && <Icon className={cn('w-3 h-3', isActive ? meta!.text : '')} />}
                  <span>{cat === 'all' ? 'All' : meta!.label}</span>
                  <span className={cn('font-mono', isActive ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400')}>{count}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* List */}
        {isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-11 skeleton w-full rounded-lg" />)}
          </div>
        ) : counts.total === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckBadge className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">You're all caught up</p>
            <p className="text-xs text-slate-400">No documents, maintenance, delays, invoices or data cleanup need attention right now.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {visibleItems.map((item, idx) => {
              const meta = CATEGORY_META[item.category];
              const Icon = meta.icon;
              return (
                <button
                  key={item.id}
                  onClick={item.onResolve}
                  className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 text-left animate-fade-in transition-colors"
                  style={{ animationDelay: `${idx * 0.02}s` }}
                >
                  <span className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border', meta.bg, meta.border, meta.text)}>
                    <Icon className="w-4 h-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{item.title}</span>
                    <span className="block text-[10px] text-slate-400 truncate">{item.subtitle}</span>
                  </span>
                  <span className={cn('shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border font-mono whitespace-nowrap', SEVERITY_STYLES[item.severity])}>
                    {item.dueLabel}
                  </span>
                  <span className="shrink-0 text-[11px] font-bold text-[#E8450F] flex items-center gap-0.5 whitespace-nowrap">
                    {item.resolveLabel}
                    <ChevronRight size={12} />
                  </span>
                </button>
              );
            })}
            {filteredItems.length > visibleItems.length && (
              <button
                onClick={() => setShowAll(true)}
                className="text-[11px] font-bold text-[#E8450F] hover:text-[#C7380A] text-center py-1.5"
              >
                +{filteredItems.length - visibleItems.length} more — Show all
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
