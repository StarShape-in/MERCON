import { 
  ChevronRight, Truck, User as UserIcon, Calendar,
  FileText, ShieldCheck, CreditCard, Shield, Car
} from 'lucide-react';
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
  const isDriver = row.ownerType === 'Driver';

  return (
    <div
      onClick={onOpen}
      className="bg-white dark:bg-slate-900 rounded-[20px] border border-slate-200/70 dark:border-slate-800 shadow-sm hover:shadow-md transition-all cursor-pointer group p-5 flex flex-col gap-4 font-sans"
    >
      {/* ── 1. HEADER ── */}
      <div className="flex items-start justify-between gap-4">
        {/* Left: Icon + Title */}
        <div className="flex items-center gap-3.5 min-w-0">
          {/* Owner Icon Badge */}
          <div className={cn(
            'w-[60px] h-[60px] rounded-[16px] flex items-center justify-center shrink-0',
            isDriver
              ? 'bg-purple-50 dark:bg-purple-950/50'
              : 'bg-emerald-50 dark:bg-emerald-950/50'
          )}>
            {isDriver
              ? <UserIcon className="w-7 h-7 text-purple-600 dark:text-purple-400 stroke-[1.8]" />
              : <Truck className="w-7 h-7 text-emerald-600 dark:text-emerald-400 stroke-[1.8]" />
            }
          </div>

          {/* Name + Subtitle */}
          <div className="min-w-0">
            <h3 className="text-[26px] font-extrabold text-slate-900 dark:text-slate-50 tracking-tight leading-none truncate">
              {title}
            </h3>
            <p
              className="text-[12px] text-slate-400 dark:text-slate-500 font-semibold mt-1 truncate max-w-[260px]"
              title={subtitle}
            >
              {subtitle}
            </p>
          </div>
        </div>

        {/* Right: Issue / Valid badge */}
        {issueCount > 0 ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onOpen(); }}
            className="flex items-center gap-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 rounded-full px-3.5 py-1.5 text-[13px] font-bold shrink-0 hover:bg-rose-100 dark:hover:bg-rose-950/70 transition-colors"
          >
            <span className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[11px] font-black shrink-0">!</span>
            <span>{issueCount} Issue{issueCount > 1 ? 's' : ''}</span>
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          </button>
        ) : (
          <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-full px-3.5 py-1.5 text-[13px] font-bold shrink-0">
            <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-black">✓</span>
            <span>All Valid</span>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-slate-100 dark:border-slate-800" />

      {/* ── 2. SLOT CARDS ── */}
      <div className="grid grid-cols-5 gap-2.5">
        {mandatorySlots.slice(0, 5).map((slot) => {
          const formattedDate = slot.expiry_date ? formatDocDate(slot.expiry_date) : null;
          const hasDoc = !!slot.documentId;
          const isIssue = slot.status === 'EXPIRED' || slot.status === 'EXPIRING_SOON';
          const isValid = slot.status === 'VALID';
          const isMissing = !isValid && !isIssue;

          const IconComponent = SLOT_ICONS[slot.code] || SLOT_ICONS[slot.name.replace(/\s+/g, '')] || FileText;

          return (
            <div
              key={slot.code}
              onClick={(e) => {
                e.stopPropagation();
                if (hasDoc) { onOpen(); }
                else { onUploadMissing?.(row, slot.code); }
              }}
              className={cn(
                'flex flex-col items-center justify-between py-3 px-1.5 rounded-2xl border transition-all cursor-pointer group/slot',
                isValid
                  ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                  : isIssue
                    ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
              )}
            >
              {/* Circular Icon Badge */}
              <div className={cn(
                'w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover/slot:scale-105',
                isValid
                  ? 'bg-emerald-100/80 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'
                  : isIssue
                    ? 'bg-rose-100/80 dark:bg-rose-900/40 text-rose-500 dark:text-rose-400'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
              )}>
                <IconComponent className="w-5 h-5 stroke-[1.8]" />
              </div>

              {/* Document Name */}
              <span
                className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 text-center leading-snug mt-2 w-full px-0.5 line-clamp-2 min-h-[28px] flex items-center justify-center"
                title={slot.name}
              >
                {slot.name}
              </span>

              {/* Status / Date */}
              <div className="mt-1.5 flex items-center justify-center w-full">
                {isValid ? (
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full">
                    Valid
                  </span>
                ) : isIssue ? (
                  <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 font-mono whitespace-nowrap">
                    {formattedDate || 'Expired'}
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">
                    —
                  </span>
                )}
              </div>

              {/* Bottom dash */}
              <span className="text-slate-300 dark:text-slate-700 text-xs font-bold mt-1.5 leading-none">—</span>
            </div>
          );
        })}
      </div>

      {/* Divider */}
      <div className="border-t border-slate-100 dark:border-slate-800" />

      {/* ── 3. FOOTER ── */}
      <div className="flex items-center justify-between gap-3">
        {/* Last Updated */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center shrink-0">
            <Calendar className="w-4.5 h-4.5 text-blue-500 dark:text-blue-400 stroke-[1.8]" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wide">
              Last Updated
            </span>
            <span className="text-[13px] font-bold text-slate-800 dark:text-slate-200">
              {(row as any).lastUpdated
                ? formatInDeploymentTz((row as any).lastUpdated, tz, 'd MMM yyyy')
                : 'Recently'}
            </span>
          </div>
        </div>

        {/* Open Folder Button */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onOpen(); }}
          className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 rounded-2xl px-4 py-2 transition-all shadow-xs group-hover:border-slate-300 dark:group-hover:border-slate-600"
        >
          <FolderOpenIcon className="w-5 h-5 text-blue-500 dark:text-blue-400" />
          <span className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Open Folder</span>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>
      </div>
    </div>
  );
}

function FolderOpenIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 8 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
      <path d="M2 10h20" />
    </svg>
  );
}
