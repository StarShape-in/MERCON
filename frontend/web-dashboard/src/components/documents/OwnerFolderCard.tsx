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
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-all cursor-pointer group p-4 sm:p-4.5 flex flex-col gap-3.5 font-sans"
    >
      {/* ── 1. HEADER ── */}
      <div className="flex items-center justify-between gap-3">
        {/* Left: Icon + Title */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Owner Icon Badge */}
          <div className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105',
            isDriver
              ? 'bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-950/40 dark:border-purple-900'
              : 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-900'
          )}>
            {isDriver
              ? <UserIcon className="w-6 h-6 stroke-[2]" />
              : <Truck className="w-6 h-6 stroke-[2]" />
            }
          </div>

          {/* Name + Subtitle */}
          <div className="min-w-0 flex-1">
            <h3 className="text-xl font-extrabold font-mono text-slate-900 dark:text-slate-100 tracking-tight leading-tight truncate">
              {title}
            </h3>
            <p
              className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider mt-0.5 truncate max-w-[240px] sm:max-w-[300px]"
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
            className="flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 rounded-full px-3 py-1 text-xs font-bold shrink-0 hover:bg-rose-100 dark:hover:bg-rose-950/70 transition-colors shadow-2xs"
          >
            <span className="w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-black shrink-0">!</span>
            <span>{issueCount} Issue{issueCount > 1 ? 's' : ''}</span>
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          </button>
        ) : (
          <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-full px-3 py-1 text-xs font-bold shrink-0">
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[9px] font-black">✓</span>
            <span>All Valid</span>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-slate-100 dark:border-slate-800/80 my-0.5" />

      {/* ── 2. SLOT CARDS ── */}
      <div className="grid grid-cols-5 gap-2">
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
                if (hasDoc) { onOpen(); }
                else { onUploadMissing?.(row, slot.code); }
              }}
              className={cn(
                'flex flex-col items-center justify-between py-2.5 px-1.5 rounded-xl border transition-all cursor-pointer min-h-[110px] group/slot text-center',
                isValid
                  ? 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-emerald-200 hover:bg-emerald-50/20'
                  : isIssue
                    ? 'bg-white dark:bg-slate-900 border-rose-200/80 dark:border-rose-900/40 hover:bg-rose-50/20'
                    : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:bg-slate-50/50'
              )}
            >
              {/* Circular Icon Badge */}
              <div className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center border shrink-0 transition-transform group-hover/slot:scale-105 my-0.5',
                isValid
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900'
                  : isIssue
                    ? 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900'
                    : 'bg-slate-50 text-slate-400 border-slate-100 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700'
              )}>
                <IconComponent className="w-5 h-5 stroke-[1.8]" />
              </div>

              {/* Document Name */}
              <span
                className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 text-center leading-tight mt-1 max-w-full break-words line-clamp-2 min-h-[26px] flex items-center justify-center px-0.5"
                title={slot.name}
              >
                {slot.name}
              </span>

              {/* Status / Date */}
              <div className="mt-1 flex items-center justify-center w-full">
                {isValid ? (
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/70 px-2 py-0.5 rounded-full whitespace-nowrap">
                    Valid
                  </span>
                ) : isIssue ? (
                  <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 font-mono tracking-tight text-center whitespace-nowrap">
                    {formattedDate || 'Expired'}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                    —
                  </span>
                )}
              </div>

              {/* Bottom dash */}
              <span className="text-slate-300 dark:text-slate-700 text-[10px] font-bold mt-1 leading-none">—</span>
            </div>
          );
        })}
      </div>

      {/* Divider */}
      <div className="border-t border-slate-100 dark:border-slate-800/80 my-0.5" />

      {/* ── 3. FOOTER ── */}
      <div className="flex items-center justify-between gap-3">
        {/* Last Updated */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-900/60 shrink-0">
            <Calendar className="w-4 h-4 stroke-[1.8]" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider block">
              Last Updated
            </span>
            <span className="text-[12px] font-bold text-slate-800 dark:text-slate-200">
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
          className="h-8 px-3.5 text-xs font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs group-hover:border-slate-300"
        >
          <FolderOpenIcon className="w-4 h-4 text-blue-500 dark:text-blue-400" />
          <span>Open Folder</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
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
