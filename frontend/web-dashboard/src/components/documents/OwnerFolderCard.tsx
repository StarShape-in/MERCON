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
  const title = row.ownerName;
  const issueCount = cardSummary.issuesCount;
  const isDriver = row.ownerType === 'Driver';

  return (
    <div
      onClick={onOpen}
      className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 hover:shadow-md transition-all duration-200 font-sans cursor-pointer group space-y-3"
    >
      {/* ── TOP ROW: Identity + Summary Pill + Action Link ── */}
      <div className="flex items-center justify-between gap-3 min-w-0">
        {/* Identity */}
        <div className="flex items-center gap-2.5 min-w-0">
          {isDriver ? (
            <UserIcon className="w-4.5 h-4.5 text-purple-600 dark:text-purple-400 shrink-0" />
          ) : (
            <Truck className="w-4.5 h-4.5 text-brand dark:text-orange-400 shrink-0" />
          )}

          <h3 className="text-base font-black font-mono text-slate-900 dark:text-slate-100 tracking-tight shrink-0">
            {title}
          </h3>

          {row.ownerRef && (
            <span className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200/80 dark:border-slate-700 shrink-0">
              {row.ownerRef}
            </span>
          )}

          {row.relatedName && (
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium truncate hidden sm:inline" title={row.relatedName}>
              • {row.relatedName}
            </span>
          )}
        </div>

        {/* Health Badge & Action Link */}
        <div className="flex items-center gap-2 shrink-0">
          {issueCount > 0 ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 font-mono">
              {issueCount} Issues
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              All Valid
            </span>
          )}

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onOpen(); }}
            className="text-xs font-extrabold text-slate-600 dark:text-slate-400 hover:text-brand dark:hover:text-orange-400 flex items-center gap-0.5 ml-1 transition-colors cursor-pointer"
          >
            <span>Open</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── BOTTOM ROW: MINIMALIST COLORED DOCUMENT STATUS BADGES ── */}
      <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-100 dark:border-slate-800">
        {mandatorySlots.map((slot) => {
          const isExpired = slot.status === 'EXPIRED';
          const isExpiringSoon = slot.status === 'EXPIRING_SOON';
          const isValid = slot.status === 'VALID';
          const formattedDate = slot.expiry_date ? formatDocDate(slot.expiry_date) : null;

          return (
            <div
              key={slot.code}
              onClick={(e) => {
                e.stopPropagation();
                if (slot.documentId) { onOpen(); }
                else { onUploadMissing?.(row, slot.code); }
              }}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer",
                isValid
                  ? "bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-900/50"
                  : isExpired
                    ? "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200/80 dark:border-rose-900/60 font-semibold"
                    : isExpiringSoon
                      ? "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-900/60 font-semibold"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200/80 dark:border-slate-700"
              )}
            >
              {/* Colored Dot Indicator */}
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full shrink-0",
                  isValid
                    ? "bg-emerald-500"
                    : isExpired
                      ? "bg-rose-500 animate-pulse"
                      : isExpiringSoon
                        ? "bg-amber-500"
                        : "bg-slate-400"
                )}
              />

              {/* Document Title */}
              <span>{slot.name}</span>

              {/* Status / Expiry Date */}
              <span className="text-[10px] font-mono opacity-80 font-bold ml-0.5">
                {isExpired
                  ? formattedDate ? `(Exp. ${formattedDate})` : '(Expired)'
                  : isExpiringSoon
                    ? formattedDate ? `(${formattedDate})` : '(Expiring)'
                    : isValid
                      ? formattedDate ? `(${formattedDate})` : '✓'
                      : '(Missing)'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
