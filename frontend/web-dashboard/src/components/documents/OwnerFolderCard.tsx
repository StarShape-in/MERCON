import { 
  ChevronRight, Truck, User as UserIcon, Clock,
  FileText, ShieldCheck, CreditCard, Shield, Car,
  AlertTriangle, CheckCircle2, FolderOpen
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
  const title = row.ownerName; // e.g. "VRA-5510" or "DSA-3078"
  const isDriver = row.ownerType === 'Driver';

  const issueCount = cardSummary.issuesCount;
  const expiredSlots = mandatorySlots.filter((s) => s.status === 'EXPIRED');
  const expiringSoonSlots = mandatorySlots.filter((s) => s.status === 'EXPIRING_SOON');
  const missingSlots = mandatorySlots.filter((s) => !s.documentId || s.status === 'MISSING');

  return (
    <div
      onClick={onOpen}
      className="bg-[#FAFBFD] dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-md shadow-slate-200/50 dark:shadow-none hover:shadow-xl hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300 p-6 font-sans cursor-pointer group relative overflow-hidden"
    >
      {/* Subtle Paper Edge / Sheet Accent Line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 opacity-60" />

      {/* ── TOP SECTION: VEHICLE IDENTITY | COMPLIANCE STATUS | ACTION ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        
        {/* 1. VEHICLE IDENTITY */}
        <div className="flex items-start gap-4 min-w-0">
          <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700 text-slate-700 dark:text-slate-300 shrink-0 mt-0.5">
            {isDriver ? (
              <UserIcon className="w-6 h-6 text-slate-700 dark:text-slate-300" />
            ) : (
              <Truck className="w-6 h-6 text-slate-700 dark:text-slate-300" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-slate-100 tracking-tight leading-none">
                {title}
              </h3>
              {row.ownerRef && (
                <span className="font-mono font-bold text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-0.5 rounded-md border border-slate-200/80 dark:border-slate-700">
                  {row.ownerRef}
                </span>
              )}
            </div>

            {row.relatedName && (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 mt-2 truncate">
                <UserIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{row.relatedName}</span>
              </div>
            )}

            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-1">
              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>
                Updated{' '}
                {(row as any).lastUpdated
                  ? formatInDeploymentTz((row as any).lastUpdated, tz, 'd MMM yyyy')
                  : 'recently'}
              </span>
            </div>
          </div>
        </div>

        {/* 2. COMPLIANCE STATUS & DONUT INDICATOR */}
        <div className="flex items-center gap-5 shrink-0 bg-white dark:bg-slate-850/60 p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-800">
          {/* Donut SVG Ring */}
          <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
            <svg className="w-14 h-14 transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-100 dark:text-slate-800"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className={issueCount > 0 ? "text-rose-500" : "text-emerald-500"}
                strokeDasharray={issueCount > 0 ? "70, 100" : "100, 100"}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute text-center leading-none">
              <span className="text-xl font-black text-slate-900 dark:text-slate-100 font-mono block">
                {issueCount}
              </span>
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500">
                Issues
              </span>
            </div>
          </div>

          <div className="space-y-1 text-xs">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
              Compliance Status
            </span>
            <div className="space-y-0.5 font-bold">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                <span>{expiredSlots.length} Expired</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
                <span>{missingSlots.length} Missing</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. PRIMARY ACTION BUTTON */}
        <div className="shrink-0 self-start lg:self-center">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onOpen(); }}
            className="h-10 px-5 text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 rounded-xl flex items-center gap-2 shadow-xs hover:shadow-md transition-all cursor-pointer whitespace-nowrap"
          >
            <FolderOpen className="w-4 h-4 text-white shrink-0" />
            <span>Open Folder</span>
            <ChevronRight className="w-4 h-4 text-white opacity-80 shrink-0" />
          </button>
        </div>
      </div>

      {/* ── NEUTRAL DIVIDER LINE ── */}
      <div className="border-t border-slate-200/80 dark:border-slate-800 my-5" />

      {/* ── BOTTOM SECTION: 5 EQUALLY ALIGNED DOCUMENT COLUMNS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/60 dark:divide-slate-800 gap-y-4 sm:gap-y-0">
        {mandatorySlots.map((slot, idx) => {
          const formattedDate = slot.expiry_date ? formatDocDate(slot.expiry_date) : null;
          const isExpired = slot.status === 'EXPIRED';
          const isExpiringSoon = slot.status === 'EXPIRING_SOON';
          const isValid = slot.status === 'VALID';
          const IconComponent = SLOT_ICONS[slot.code] || SLOT_ICONS[slot.name.replace(/\s+/g, '')] || FileText;

          return (
            <div
              key={slot.code}
              onClick={(e) => {
                e.stopPropagation();
                if (slot.documentId) { onOpen(); }
                else { onUploadMissing?.(row, slot.code); }
              }}
              className={cn(
                "flex flex-col items-center justify-between text-center p-3 transition-colors cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/40 rounded-xl",
                idx !== 0 && "sm:pl-4"
              )}
            >
              {/* Row 1: Document Name */}
              <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 tracking-tight truncate w-full mb-2">
                {slot.name}
              </span>

              {/* Row 2: Standalone Lucide Icon (NO CONTAINER BOX) */}
              <IconComponent
                className={cn(
                  "w-5 h-5 shrink-0 my-1.5",
                  isValid
                    ? "text-emerald-600 dark:text-emerald-400"
                    : isExpired
                      ? "text-rose-600 dark:text-rose-400"
                      : isExpiringSoon
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-slate-400 dark:text-slate-500"
                )}
              />

              {/* Row 3: Status Badge */}
              <span
                className={cn(
                  "inline-block text-[10px] font-black px-2.5 py-0.5 rounded-md mt-2 font-mono shrink-0",
                  isValid
                    ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/40"
                    : isExpired
                      ? "text-rose-700 bg-rose-50 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/60 dark:border-rose-900/40"
                      : isExpiringSoon
                        ? "text-amber-700 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/40"
                        : "text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60"
                )}
              >
                {isValid ? '✓ Valid' : isExpired ? '! Expired' : isExpiringSoon ? '⚠️ Expiring' : '— Missing'}
              </span>

              {/* Row 4: Date */}
              <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 mt-2 block">
                {formattedDate || '—'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
