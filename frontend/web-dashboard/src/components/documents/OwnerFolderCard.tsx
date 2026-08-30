import { CheckCircle2, AlertTriangle, XCircle, FileQuestion, ChevronRight, Folder } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import DriverAvatar from '@/components/ui/DriverAvatar';
import { cn } from '@/lib/utils';
import type { DocComplianceStatus, OwnerFoldersSummaryRow } from '@/services/documentService';
import { useDeploymentTimezone, formatInDeploymentTz } from '@/lib/datetime';

import { formatDocDate, getOwnerCardSummary } from '@/lib/documents';

const STATUS_ICON: Record<DocComplianceStatus, { label?: string; icon: any; className: string }> = {
  VALID:          { label: 'Valid', icon: CheckCircle2, className: 'text-emerald-600' },
  EXPIRING_SOON:  { label: 'Expiring Soon', icon: AlertTriangle, className: 'text-amber-500' },
  EXPIRED:        { label: 'Expired', icon: XCircle, className: 'text-rose-600' },
  MISSING:        { label: 'Missing', icon: FileQuestion, className: 'text-slate-400' },
};

interface OwnerFolderCardProps {
  row: OwnerFoldersSummaryRow;
  onOpen: () => void;
  /** Clicking a slot that already has a document previews it directly, without leaving the page. */
  onPreviewDocument?: (documentId: string) => void;
  /** Clicking a Missing slot opens the upload flow directly, without leaving the page. */
  onUploadMissing?: (row: OwnerFoldersSummaryRow, slotCode: string) => void;
}

/**
 * Documents dominate the card per spec — name/subtitle stay to one line,
 * the mandatory checklist is the primary visual content, not a stat pill.
 */
export default function OwnerFolderCard({ row, onOpen, onPreviewDocument, onUploadMissing }: OwnerFolderCardProps) {
  const tz = useDeploymentTimezone();
  const { slots: mandatorySlots } = row;
  const cardSummary = getOwnerCardSummary(mandatorySlots);
  const accentColor = row.ownerType === 'Driver' ? 'blue' : 'emerald';
  const title = row.ownerName;
  const subtitle = row.ownerType === 'Driver'
    ? [row.ownerRef, row.relatedName ? `Truck: ${row.relatedName}` : null].filter(Boolean).join(' · ') || 'No ref'
    : [row.ownerRef, row.relatedName ? `Driver: ${row.relatedName}` : null].filter(Boolean).join(' · ') || 'No ref';
  const accent = row.ownerType === 'Driver'
    ? { iconBg: 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800 text-blue-600', hoverBorder: 'hover:border-blue-300 dark:hover:border-blue-700' }
    : cardSummary.isCompliant
      ? { iconBg: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-600', hoverBorder: 'hover:border-emerald-300 dark:hover:border-emerald-700' }
      : { iconBg: 'bg-rose-50 dark:bg-rose-950/60 border-rose-205 dark:border-rose-805 text-rose-500', hoverBorder: 'hover:border-rose-300 dark:hover:border-rose-700' };

  const folderTheme = (() => {
    const hasExpired = mandatorySlots.some((s) => s.status === 'EXPIRED');
    const hasExpiring = mandatorySlots.some((s) => s.status === 'EXPIRING_SOON');
    const hasMissing = mandatorySlots.some((s) => s.status === 'MISSING');

    if (hasExpired) {
      return {
        tabBg: "bg-rose-50/90 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-800/80 group-hover:border-rose-450 dark:group-hover:border-rose-600",
        cardHoverBorder: "group-hover:border-rose-350 dark:group-hover:border-rose-600"
      };
    }
    if (hasExpiring) {
      return {
        tabBg: "bg-amber-50/90 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-800/80 group-hover:border-amber-450 dark:group-hover:border-amber-600",
        cardHoverBorder: "group-hover:border-amber-350 dark:group-hover:border-amber-600"
      };
    }
    if (hasMissing) {
      return {
        tabBg: "bg-slate-100/90 dark:bg-slate-800/30 border-slate-200/80 dark:border-slate-700/80 group-hover:border-slate-350 dark:group-hover:border-slate-500",
        cardHoverBorder: "group-hover:border-slate-300 dark:group-hover:border-slate-650"
      };
    }
    return {
      tabBg: "bg-emerald-50/90 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-800/80 group-hover:border-emerald-450 dark:group-hover:border-emerald-600",
      cardHoverBorder: "group-hover:border-emerald-350 dark:group-hover:border-emerald-600"
    };
  })();

  return (
    <div className="relative mt-3 group">
      {/* Folder Tab Shape */}
      <div
        className={cn(
          "absolute -top-[13px] left-0 h-[14px] w-24 rounded-t-lg border-t border-x z-0 transition-all duration-300",
          folderTheme.tabBg
        )}
      />

      <Card
        onClick={onOpen}
        className={cn(
          'border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl rounded-tl-none p-4 shadow-2xs transition-all duration-300 flex flex-col justify-between cursor-pointer group-hover:shadow-xs relative z-10',
          folderTheme.cardHoverBorder
        )}
      >
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              {row.ownerType === 'Driver' ? (
                <DriverAvatar
                  src={row.avatar_url}
                  firstName={title.split(' ')[0]}
                  lastName={title.split(' ')[1]}
                  size="sm"
                />
              ) : (
                <div className={cn('w-9 h-9 rounded-xl border flex items-center justify-center shrink-0', accent.iconBg)}>
                  <Folder className="w-4 h-4" />
                </div>
              )}
              <div className="min-w-0">
                <h4 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 truncate">{title}</h4>
                <span className="text-[10px] text-slate-400 font-mono truncate block">{subtitle}</span>
              </div>
            </div>
            <Badge className={cn('text-[10px] font-mono font-bold px-2 py-0.5 border shrink-0', cardSummary.className)}>
              {cardSummary.label}
            </Badge>
          </div>
 
          <div className="space-y-1.5">
            {mandatorySlots.map((slot) => {
              const cfg = STATUS_ICON[slot.status];
              const Icon = cfg.icon;
              const hasDoc = !!slot.documentId;
              const formattedDate = slot.expiry_date ? formatDocDate(slot.expiry_date) : null;

              const getStatusText = () => {
                if (slot.status === 'MISSING') return 'Missing';
                if (slot.status === 'VALID') return 'Valid';
                if (slot.status === 'EXPIRING_SOON') return formattedDate ? `Expiring ${formattedDate}` : 'Soon';
                if (slot.status === 'EXPIRED') return formattedDate ? `Expired ${formattedDate}` : 'Expired';
                return 'Valid';
              };

              return (
                <div
                  key={slot.code}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (hasDoc) onPreviewDocument?.(slot.documentId!);
                    else onUploadMissing?.(row, slot.code);
                  }}
                  className="flex items-center justify-between gap-2 text-[11px] -mx-1 px-1 py-0.5 rounded-md cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60"
                >
                  <span className="flex items-center gap-1.5 min-w-0">
                    <Icon className={cn('w-3.5 h-3.5 shrink-0', cfg.className)} />
                    <span className="truncate text-slate-700 dark:text-slate-300 font-medium">{slot.name}</span>
                  </span>
                  <span className={cn('font-bold shrink-0', cfg.className)}>
                    {getStatusText()}
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
    </div>
  );
}
