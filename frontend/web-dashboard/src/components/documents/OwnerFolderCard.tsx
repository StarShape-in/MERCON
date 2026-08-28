import { Check, AlertTriangle, X, FileQuestion, ChevronRight, Truck, User as UserIcon, Calendar } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { DocComplianceStatus, OwnerFoldersSummaryRow } from '@/services/documentService';
import { useDeploymentTimezone, formatInDeploymentTz } from '@/lib/datetime';
import { formatDocDate, getOwnerCardSummary } from '@/lib/documents';

interface OwnerFolderCardProps {
  row: OwnerFoldersSummaryRow;
  onOpen: () => void;
  onPreviewDocument?: (documentId: string) => void;
  onUploadMissing?: (row: OwnerFoldersSummaryRow, slotCode: string) => void;
}

export default function OwnerFolderCard({ row, onOpen, onPreviewDocument, onUploadMissing }: OwnerFolderCardProps) {
  const tz = useDeploymentTimezone();
  const { slots: mandatorySlots } = row;
  const cardSummary = getOwnerCardSummary(mandatorySlots);
  const title = row.ownerName;
  const subtitle = row.ownerType === 'Driver'
    ? [row.ownerRef, row.relatedName].filter(Boolean).join(' • ') || 'Driver'
    : [row.ownerRef, row.relatedName].filter(Boolean).join(' • ') || 'Vehicle';

  return (
    <Card
      onClick={onOpen}
      className="border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between cursor-pointer group space-y-3"
    >
      {/* 1. Header Row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border',
            row.ownerType === 'Driver'
              ? 'bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-950/40 dark:border-purple-800'
              : 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800'
          )}>
            {row.ownerType === 'Driver' ? <UserIcon className="w-4 h-4 text-purple-600" /> : <Truck className="w-4 h-4 text-emerald-600" />}
          </div>
          <div className="min-w-0">
            <h4 className="text-base font-extrabold text-slate-900 dark:text-slate-100 tracking-tight truncate">{title}</h4>
            <p className="text-[10px] text-slate-400 font-extrabold truncate block uppercase">{subtitle}</p>
          </div>
        </div>
        <Badge className={cn('text-[10px] font-extrabold px-2.5 py-0.5 border shrink-0 rounded-full', cardSummary.className)}>
          {cardSummary.label}
        </Badge>
      </div>

      {/* 2. Horizontal 5-Column Checklist Matrix */}
      <div className="grid grid-cols-5 gap-1 py-2 border-y border-slate-100 dark:border-slate-800/80 text-center bg-slate-50/40 dark:bg-slate-800/30 rounded-xl px-1">
        {mandatorySlots.slice(0, 5).map((slot) => {
          const formattedDate = slot.expiry_date ? formatDocDate(slot.expiry_date) : null;
          const hasDoc = !!slot.documentId;

          return (
            <div
              key={slot.code}
              onClick={(e) => {
                e.stopPropagation();
                if (hasDoc) {
                  onOpen();
                } else {
                  onUploadMissing?.(row, slot.code);
                }
              }}
              className="flex flex-col items-center justify-between min-h-[54px] p-1 rounded-lg hover:bg-white dark:hover:bg-slate-800/90 transition-all cursor-pointer"
            >
              <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 truncate w-full" title={slot.name}>
                {slot.name}
              </span>
              <div className="my-1 flex items-center justify-center">
                {slot.status === 'VALID' && (
                  <div className="w-5 h-5 rounded-full border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-2xs">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}
                {slot.status === 'EXPIRING_SOON' && (
                  <div className="w-5 h-5 rounded-full border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-2xs">
                    <AlertTriangle className="w-3 h-3 stroke-[2.5]" />
                  </div>
                )}
                {slot.status === 'EXPIRED' && (
                  <div className="w-5 h-5 rounded-full border border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-2xs">
                    <X className="w-3 h-3 stroke-[3]" />
                  </div>
                )}
                {slot.status === 'MISSING' && (
                  <div className="w-5 h-5 rounded-full border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                    <FileQuestion className="w-3 h-3" />
                  </div>
                )}
              </div>
              <span className={cn(
                'text-[9px] font-bold truncate w-full',
                slot.status === 'VALID' ? 'text-emerald-600 dark:text-emerald-400' :
                slot.status === 'EXPIRING_SOON' ? 'text-amber-600 dark:text-amber-400 font-mono' :
                slot.status === 'EXPIRED' ? 'text-rose-600 dark:text-rose-400 font-mono' :
                'text-slate-400'
              )}>
                {slot.status === 'VALID' ? 'Valid' :
                 slot.status === 'MISSING' ? 'Missing' :
                 formattedDate || 'Expired'}
              </span>
            </div>
          );
        })}
      </div>

      {/* 3. Footer Row */}
      <div className="flex items-center justify-between gap-2 pt-1 text-xs">
        <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 text-[10px] font-semibold">
          <Calendar className="w-3.5 h-3.5" />
          <span>Last Updated {(row as any).lastUpdated ? formatInDeploymentTz((row as any).lastUpdated, tz, 'd MMM yyyy') : 'Recently'}</span>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
          className="h-7 px-3 text-[11px] font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
        >
          <span>Open Folder</span>
          <ChevronRight className="w-3 h-3 text-slate-400" />
        </button>
      </div>
    </Card>
  );
}
