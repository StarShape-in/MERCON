import { 
  Check, AlertTriangle, X, FileQuestion, ChevronRight, Truck, User as UserIcon, Calendar,
  FileText, ShieldCheck, CreditCard, Shield, Car
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { OwnerFoldersSummaryRow } from '@/services/documentService';
import { useDeploymentTimezone, formatInDeploymentTz } from '@/lib/datetime';
import { formatDocDate, getOwnerCardSummary } from '@/lib/documents';

interface OwnerFolderCardProps {
  row: OwnerFoldersSummaryRow;
  onOpen: () => void;
  onPreviewDocument?: (documentId: string) => void;
  onUploadMissing?: (row: OwnerFoldersSummaryRow, slotCode: string) => void;
}

// Icon mapper for compliance slots
const SLOT_ICONS: Record<string, React.ElementType> = {
  Istimara: FileText,
  VehicleRegistration: FileText,
  Insurance: ShieldCheck,
  OperationCard: CreditCard,
  SASOPlate: Shield,
  SASOPlates: Shield,
  FAHAS: Car,
  License: CreditCard,
  DriverLicense: CreditCard,
  MedicalReport: FileText,
};

export default function OwnerFolderCard({ row, onOpen, onUploadMissing }: OwnerFolderCardProps) {
  const tz = useDeploymentTimezone();
  const { slots: mandatorySlots } = row;
  const cardSummary = getOwnerCardSummary(mandatorySlots);
  const title = row.ownerName;
  const subtitle = row.ownerType === 'Driver'
    ? [row.ownerRef, row.relatedName].filter(Boolean).join('  |  ') || 'Driver'
    : [row.ownerRef, row.relatedName].filter(Boolean).join('  |  ') || 'Vehicle';

  const issueCount = cardSummary.issuesCount;

  return (
    <Card
      onClick={onOpen}
      className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between cursor-pointer group space-y-4 font-sans"
    >
      {/* 1. Header Row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className={cn(
            'w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105',
            row.ownerType === 'Driver'
              ? 'bg-purple-50/80 text-purple-600 border-purple-200/80 dark:bg-purple-950/40 dark:border-purple-800'
              : 'bg-emerald-50/80 text-emerald-600 border-emerald-200/80 dark:bg-emerald-950/40 dark:border-emerald-800'
          )}>
            {row.ownerType === 'Driver' ? <UserIcon className="w-6 h-6 stroke-[2.2]" /> : <Truck className="w-6 h-6 stroke-[2.2]" />}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-2xl font-black font-mono text-slate-900 dark:text-slate-100 tracking-tight truncate leading-tight">
              {title}
            </h4>
            <p className="text-[11px] text-slate-400 font-extrabold block uppercase tracking-wider mt-0.5 truncate max-w-[220px] sm:max-w-[300px]" title={subtitle}>
              {subtitle}
            </p>
          </div>
        </div>

        {/* Issue Pill */}
        {issueCount > 0 ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpen();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 text-rose-600 border border-rose-100 text-xs font-extrabold shrink-0 hover:bg-rose-100 transition-colors shadow-2xs"
          >
            <div className="w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] font-black">!</div>
            <span>{issueCount} Issue{issueCount > 1 ? 's' : ''}</span>
            <ChevronRight className="w-3.5 h-3.5 opacity-70" />
          </button>
        ) : (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-bold px-3 py-1 rounded-full shrink-0">
            🟢 Fully Valid
          </Badge>
        )}
      </div>

      <div className="border-t border-slate-100 dark:border-slate-800/80 my-1" />

      {/* 2. Horizontal 5-Column Checklist Matrix Cards */}
      <div className="grid grid-cols-5 gap-2.5">
        {mandatorySlots.slice(0, 5).map((slot) => {
          const formattedDate = slot.expiry_date ? formatDocDate(slot.expiry_date) : null;
          const hasDoc = !!slot.documentId;
          const isIssue = slot.status === 'EXPIRED' || slot.status === 'EXPIRING_SOON';
          const isValid = slot.status === 'VALID';

          const IconComponent = SLOT_ICONS[slot.code] || SLOT_ICONS[slot.name.replace(/\s+/g, '')] || FileText;

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
              className={cn(
                "flex flex-col items-center justify-between p-2 sm:p-2.5 rounded-[22px] border transition-all cursor-pointer min-h-[125px] overflow-hidden group/slot",
                isValid
                  ? "bg-emerald-50/20 border-emerald-100/90 dark:bg-emerald-950/10 dark:border-emerald-900/40 hover:bg-emerald-50/50"
                  : isIssue
                    ? "bg-rose-50/30 border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/40 hover:bg-rose-50/60"
                    : "bg-slate-50/40 border-slate-100 dark:bg-slate-800/20 dark:border-slate-800 hover:bg-slate-100/50"
              )}
            >
              {/* Top Circular Badge */}
              <div className={cn(
                "w-11 h-11 rounded-full flex items-center justify-center border shrink-0 transition-transform group-hover/slot:scale-105 my-0.5",
                isValid
                  ? "bg-emerald-100/60 text-emerald-600 border-emerald-200/50 dark:bg-emerald-900/40 dark:text-emerald-400"
                  : isIssue
                    ? "bg-rose-100/60 text-rose-600 border-rose-200/50 dark:bg-rose-900/40 dark:text-rose-400"
                    : "bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 dark:text-slate-400"
              )}>
                <IconComponent className="w-5 h-5 stroke-[2]" />
              </div>

              {/* Title - Allows two-line wrapping so titles like Operation Card don't truncate awkwardly */}
              <span 
                className="text-[11px] sm:text-xs font-black text-slate-900 dark:text-slate-100 text-center leading-tight tracking-tight max-w-full break-words min-h-[26px] flex items-center justify-center px-0.5" 
                title={slot.name}
              >
                {slot.name}
              </span>

              {/* Status Pill / Date */}
              <div className="mt-1 flex items-center justify-center w-full">
                {isValid ? (
                  <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/70 px-2.5 py-0.5 rounded-full whitespace-nowrap">
                    Valid
                  </span>
                ) : (
                  <span className="text-[10px] sm:text-[11px] font-extrabold text-rose-600 dark:text-rose-400 font-mono tracking-tighter text-center whitespace-nowrap">
                    {formattedDate || 'Expired'}
                  </span>
                )}
              </div>

              {/* Bottom Dash Indicator */}
              <span className="text-[10px] text-slate-300 dark:text-slate-600 font-bold leading-none mt-0.5">—</span>
            </div>
          );
        })}
      </div>

      <div className="border-t border-slate-100 dark:border-slate-800/80" />

      {/* 3. Footer Row */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200/60 dark:border-blue-900/60 shrink-0">
            <Calendar className="w-5 h-5 stroke-[2]" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Last Updated</span>
            <span className="text-xs font-black text-slate-900 dark:text-slate-100">
              {(row as any).lastUpdated ? formatInDeploymentTz((row as any).lastUpdated, tz, 'd MMM yyyy') : 'Recently'}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
          className="h-10 px-4 text-xs font-extrabold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 rounded-2xl flex items-center gap-2 transition-all cursor-pointer shadow-xs group-hover:border-slate-300"
        >
          <FolderOpenIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>Open Folder</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>
    </Card>
  );
}

function FolderOpenIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 8 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
      <path d="M2 10h20" />
    </svg>
  );
}
