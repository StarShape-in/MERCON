import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExpiryCountdownKpi } from '@/components/ui/CustomKpiWidgets';
import { docTypeLabel, daysUntil } from '@/lib/documents';
import { ClipboardList, FileWarning, Wrench, ChevronRight } from 'lucide-react';
import type { MerconDocument } from '@/services/documentService';
import type { MaintenanceRecord } from '@/services/maintenanceService';

interface ActionsNeededWidgetProps {
  expiringDocs: MerconDocument[];
  dueMaintenance: MaintenanceRecord[];
  isLoading: boolean;
}

function dueLabel(days: number | null): string {
  if (days === null) return '—';
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'Due today';
  return `Due in ${days}d`;
}

export default function ActionsNeededWidget({ expiringDocs, dueMaintenance, isLoading }: ActionsNeededWidgetProps) {
  const navigate = useNavigate();

  const expiredCount = expiringDocs.filter((d) => (daysUntil(d.expiry_date) ?? Infinity) <= 0).length;
  const criticalCount = expiringDocs.filter((d) => {
    const days = daysUntil(d.expiry_date) ?? Infinity;
    return days > 0 && days <= 7;
  }).length;
  const safeCount = expiringDocs.length - expiredCount - criticalCount;

  const topDocs = [...expiringDocs]
    .sort((a, b) => (daysUntil(a.expiry_date) ?? Infinity) - (daysUntil(b.expiry_date) ?? Infinity))
    .slice(0, 5);

  const dueMaintenanceSorted = [...dueMaintenance]
    .filter((m) => daysUntil(m.next_service_due) !== null && (daysUntil(m.next_service_due) as number) <= 30)
    .sort((a, b) => (daysUntil(a.next_service_due) ?? Infinity) - (daysUntil(b.next_service_due) ?? Infinity))
    .slice(0, 5);

  return (
    <Card className="border-slate-200/60 shadow-sm rounded-xl bg-white dark:bg-slate-900">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
        <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
          <ClipboardList className="w-4 h-4 text-rose-500" />
          <span>Actions Needed</span>
        </CardTitle>
        <CardDescription className="text-[10px] text-slate-400 mt-0.5">
          Documents and maintenance that need attention soon
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Documents Expiring */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <FileWarning className="w-3.5 h-3.5 text-amber-500" />
              Documents Expiring
            </span>
          </div>
          {isLoading ? (
            <div className="h-8 skeleton w-full rounded-md" />
          ) : (
            <ExpiryCountdownKpi expiredCount={expiredCount} criticalCount={criticalCount} safeCount={Math.max(0, safeCount)} />
          )}
          <div className="flex flex-col gap-1.5 mt-1">
            {topDocs.length === 0 && !isLoading && (
              <p className="text-[11px] text-slate-400">No documents expiring soon.</p>
            )}
            {topDocs.map((doc) => (
              <button
                key={doc.id}
                onClick={() => navigate('/documents/expiry')}
                className="flex items-center justify-between text-[11px] px-2 py-1.5 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800/60 text-left"
              >
                <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">{docTypeLabel(doc.doc_type)}</span>
                <span className="text-slate-400 font-mono shrink-0 ml-2">{dueLabel(daysUntil(doc.expiry_date))}</span>
              </button>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/documents/expiry')}
            className="text-[11px] font-bold text-[#E8450F] hover:text-[#C7380A] p-0 h-auto hover:bg-transparent justify-start"
          >
            <span>View Expiry Management</span>
            <ChevronRight size={12} className="ml-0.5" />
          </Button>
        </div>

        {/* Maintenance Due Soon */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5 text-blue-500" />
              Maintenance Due Soon
            </span>
            <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
              {dueMaintenanceSorted.length}
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-6 skeleton w-full rounded-md" />)
            ) : dueMaintenanceSorted.length === 0 ? (
              <p className="text-[11px] text-slate-400">Nothing due within 30 days.</p>
            ) : (
              dueMaintenanceSorted.map((m) => (
                <button
                  key={m.id}
                  onClick={() => navigate(`/maintenance/${m.id}`)}
                  className="flex items-center justify-between text-[11px] px-2 py-1.5 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800/60 text-left"
                >
                  <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">{m.vehicle?.plate_number || '—'}</span>
                  <span className="text-slate-400 font-mono shrink-0 ml-2">{dueLabel(daysUntil(m.next_service_due))}</span>
                </button>
              ))
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/maintenance')}
            className="text-[11px] font-bold text-[#E8450F] hover:text-[#C7380A] p-0 h-auto hover:bg-transparent justify-start"
          >
            <span>View all in Maintenance</span>
            <ChevronRight size={12} className="ml-0.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
