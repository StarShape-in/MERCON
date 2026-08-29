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

  // Categorize breakdown counts
  const expiredSlots = mandatorySlots.filter(s => s.status === 'EXPIRED');
  const expiringSoonSlots = mandatorySlots.filter(s => s.status === 'EXPIRING_SOON');
  const missingSlots = mandatorySlots.filter(s => !s.documentId || s.status === 'MISSING');

  const breakdownParts: string[] = [];
  if (expiredSlots.length > 0) breakdownParts.push(`${expiredSlots.length} Expired`);
  if (expiringSoonSlots.length > 0) breakdownParts.push(`${expiringSoonSlots.length} Expiring`);
  if (missingSlots.length > 0) breakdownParts.push(`${missingSlots.length} Missing`);
  const breakdownText = breakdownParts.join(' • ');

  return (
    <div
      onClick={onOpen}
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 hover:shadow-lg transition-all duration-200 font-sans cursor-pointer group space-y-4"
    >
      {/* ── TOP ROW: Identity + Summary Pill + Action Button ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
        {/* Left: Truck identity */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
            {isDriver ? (
              <UserIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            ) : (
              <Truck className="w-5 h-5 text-brand dark:text-orange-400" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black font-mono text-slate-900 dark:text-slate-100 tracking-tight leading-none">
                {title}
              </h3>
              {row.ownerRef && (
                <span className="font-mono font-bold text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                  {row.ownerRef}
                </span>
              )}
            </div>

            {row.relatedName && (
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1 truncate">
                <span>{row.relatedName}</span>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <span className="text-[11px] text-slate-400 font-normal">
                  Updated {(row as any).lastUpdated ? formatInDeploymentTz((row as any).lastUpdated, tz, 'd MMM yyyy') : 'recently'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Health Badge & Open Action */}
        <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
          {issueCount > 0 ? (
            <div className="flex flex-col items-end shrink-0">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-rose-50 text-rose-700 border border-rose-200/80 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900/60 font-mono">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                {issueCount} Issue{issueCount > 1 ? 's' : ''}
              </span>
              {breakdownText && (
                <span className="text-[10px] font-semibold text-rose-600/90 dark:text-rose-400/90 font-mono tracking-tight text-right mt-0.5">
                  {breakdownText}
                </span>
              )}
            </div>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900/60">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              All Valid
            </span>
          )}

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onOpen(); }}
            className="h-8.5 px-3.5 text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 rounded-xl flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer whitespace-nowrap"
          >
            <FolderOpen className="w-3.5 h-3.5 text-white" />
            <span>Open Folder</span>
            <ChevronRight className="w-3.5 h-3.5 opacity-80" />
          </button>
        </div>
      </div>

      {/* ── BOTTOM SECTION: UNIFIED HORIZONTAL ROW OF DOCUMENT SLOTS (SMALL GOOD ICONS & STATUS COLOURS) ── */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 flex-wrap">
        {mandatorySlots.map((slot) => {
          const isExpired = slot.status === 'EXPIRED';
          const isExpiringSoon = slot.status === 'EXPIRING_SOON';
          const isValid = slot.status === 'VALID';
          const formattedDate = slot.expiry_date ? formatDocDate(slot.expiry_date) : null;
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
                "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer",
                isValid
                  ? "bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200/70 dark:border-emerald-900/50 hover:bg-emerald-100/70"
                  : isExpired
                    ? "bg-rose-50/90 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-900/60 font-semibold hover:bg-rose-100/90"
                    : isExpiringSoon
                      ? "bg-amber-50/90 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900/60 font-semibold hover:bg-amber-100/90"
                      : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200/70 dark:border-slate-700 hover:bg-slate-100"
              )}
            >
              {/* Small Standalone Icon */}
              <IconComponent
                className={cn(
                  "w-3.5 h-3.5 shrink-0",
                  isValid
                    ? "text-emerald-600 dark:text-emerald-400"
                    : isExpired
                      ? "text-rose-600 dark:text-rose-400"
                      : isExpiringSoon
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-slate-400 dark:text-slate-500"
                )}
              />

              {/* Doc Title */}
              <span className="font-bold">{slot.name}</span>

              {/* Status Badge / Expiry Date */}
              <span
                className={cn(
                  "text-[10px] font-mono font-extrabold px-1.5 py-0.5 rounded-md shrink-0 ml-0.5",
                  isValid
                    ? "bg-emerald-100/80 text-emerald-800 dark:bg-emerald-900/80 dark:text-emerald-200"
                    : isExpired
                      ? "bg-rose-100 text-rose-800 dark:bg-rose-900/90 dark:text-rose-200"
                      : isExpiringSoon
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-900/90 dark:text-amber-200"
                        : "bg-slate-200/80 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                )}
              >
                {isValid
                  ? formattedDate || '✓ Valid'
                  : isExpired
                    ? formattedDate ? `! Expired (${formattedDate})` : '! Expired'
                    : isExpiringSoon
                      ? formattedDate ? `⚠️ (${formattedDate})` : '⚠️ Expiring'
                      : '— Missing'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
