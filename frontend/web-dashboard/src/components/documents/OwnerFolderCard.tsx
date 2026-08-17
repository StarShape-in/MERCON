import { CheckCircle2, AlertTriangle, XCircle, FileQuestion, ChevronRight, Folder } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { DocComplianceStatus, OwnerFoldersSummaryRow } from '@/services/documentService';

const STATUS_ICON: Record<DocComplianceStatus, { icon: any; className: string }> = {
  VALID:          { icon: CheckCircle2, className: 'text-emerald-600' },
  EXPIRING_SOON:  { icon: AlertTriangle, className: 'text-amber-500' },
  EXPIRED:        { icon: XCircle, className: 'text-rose-600' },
  MISSING:        { icon: FileQuestion, className: 'text-slate-400' },
};

interface OwnerFolderCardProps {
  row: OwnerFoldersSummaryRow;
  onOpen: () => void;
}

/**
 * Documents dominate the card per spec — name/subtitle stay to one line,
 * the mandatory checklist is the primary visual content, not a stat pill.
 */
export default function OwnerFolderCard({ row, onOpen }: OwnerFolderCardProps) {
  const { mandatoryComplete: complete, mandatoryTotal: total, slots: mandatorySlots } = row;
  const accentColor = row.ownerType === 'Driver' ? 'blue' : 'emerald';
  const title = row.ownerName;
  const subtitle = row.ownerType === 'Driver'
    ? [row.ownerRef, row.relatedName ? `Truck: ${row.relatedName}` : null].filter(Boolean).join(' · ') || 'No ref'
    : [row.ownerRef, row.relatedName ? `Driver: ${row.relatedName}` : null].filter(Boolean).join(' · ') || 'No ref';
  const accent = accentColor === 'emerald'
    ? { iconBg: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-600', hoverBorder: 'hover:border-emerald-300 dark:hover:border-emerald-700' }
    : { iconBg: 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800 text-blue-600', hoverBorder: 'hover:border-blue-300 dark:hover:border-blue-700' };

  return (
    <Card
      onClick={onOpen}
      className={cn(
        'border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between cursor-pointer group',
        accent.hoverBorder,
      )}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={cn('w-9 h-9 rounded-xl border flex items-center justify-center shrink-0', accent.iconBg)}>
              <Folder className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 truncate">{title}</h4>
              <span className="text-[10px] text-slate-400 font-mono truncate block">{subtitle}</span>
            </div>
          </div>
          <Badge className={cn(
            'text-[10px] font-mono font-bold px-2 py-0.5 border-0 shrink-0',
            complete === total ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300'
          )}>
            {complete}/{total} Mandatory
          </Badge>
        </div>

        <div className="space-y-1.5">
          {mandatorySlots.map((slot) => {
            const cfg = STATUS_ICON[slot.status];
            const Icon = cfg.icon;
            return (
              <div key={slot.code} className="flex items-center justify-between gap-2 text-[11px]">
                <span className="flex items-center gap-1.5 min-w-0">
                  <Icon className={cn('w-3.5 h-3.5 shrink-0', cfg.className)} />
                  <span className="truncate text-slate-700 dark:text-slate-300 font-medium">{slot.name}</span>
                </span>
                <span className={cn('font-bold shrink-0', cfg.className)}>
                  {slot.status === 'MISSING' ? 'Missing' : slot.status === 'EXPIRING_SOON' ? 'Soon' : slot.status === 'EXPIRED' ? 'Expired' : 'Valid'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end text-xs">
        <span className="text-xs font-bold text-brand group-hover:text-brand-hover flex items-center gap-1">
          <span>Open Folder</span>
          <ChevronRight size={12} />
        </span>
      </div>
    </Card>
  );
}
