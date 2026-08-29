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
      className="bg-slate-100/60 dark:bg-slate-950/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3 sm:p-3.5 space-y-2.5 font-sans cursor-pointer group shadow-2xs hover:shadow-md transition-all duration-200"
    >
      {/* ── BENTO TOP HEADER: 2 Compartments (Identity Tile + Health Tile) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
        {/* Bento Tile 1: Identity */}
        <div className="sm:col-span-7 bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            {isDriver ? (
              <UserIcon className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0 transition-transform group-hover:scale-105" />
            ) : (
              <Truck className="w-5 h-5 text-brand dark:text-orange-400 shrink-0 transition-transform group-hover:scale-105" />
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black font-mono text-slate-900 dark:text-slate-100 tracking-tight leading-none truncate">
                  {title}
                </h3>
                {row.ownerRef && (
                  <span className="text-[10px] font-mono font-extrabold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 shrink-0">
                    {row.ownerRef}
                  </span>
                )}
              </div>
              {row.relatedName && (
                <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 truncate mt-1" title={row.relatedName}>
                  {row.relatedName}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Bento Tile 2: Overall Health Summary */}
        <div className={cn(
          "sm:col-span-5 rounded-xl p-3 border flex items-center justify-between shadow-2xs",
          issueCount > 0
            ? "bg-rose-50/70 dark:bg-rose-950/40 border-rose-200/80 dark:border-rose-900/60 text-rose-900 dark:text-rose-100"
            : "bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200/80 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-100"
        )}>
          {issueCount > 0 ? (
            <div className="flex items-center justify-between w-full">
              <div className="flex flex-col">
                <span className="text-xs font-black font-mono text-rose-700 dark:text-rose-300 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                  {issueCount} Issue{issueCount > 1 ? 's' : ''}
                </span>
                {breakdownText && (
                  <span className="text-[10px] font-semibold text-rose-600/90 dark:text-rose-400/90 mt-0.5 font-mono truncate">
                    {breakdownText}
                  </span>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-rose-400 shrink-0" />
            </div>
          ) : (
            <div className="flex items-center justify-between w-full">
              <div className="flex flex-col">
                <span className="text-xs font-black text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  All Valid
                </span>
                <span className="text-[10px] font-semibold text-emerald-600/90 dark:text-emerald-400/90 mt-0.5 font-mono">
                  {mandatorySlots.length} Documents OK
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-emerald-400 shrink-0" />
            </div>
          )}
        </div>
      </div>

      {/* ── BENTO MIDDLE GRID: 5 Slot Compartment Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {mandatorySlots.slice(0, 5).map((slot) => {
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
                "rounded-xl p-2.5 border transition-all flex flex-col justify-between min-h-[76px] cursor-pointer shadow-2xs group/slot",
                isValid
                  ? "bg-white dark:bg-slate-900 border-slate-200/70 dark:border-slate-800 hover:border-emerald-300 hover:bg-emerald-50/20"
                  : isExpired
                    ? "bg-rose-50/60 dark:bg-rose-950/30 border-rose-200/80 dark:border-rose-900/60 hover:bg-rose-100/50"
                    : isExpiringSoon
                      ? "bg-amber-50/60 dark:bg-amber-950/30 border-amber-200/80 dark:border-amber-900/60 hover:bg-amber-100/50"
                      : "bg-slate-100/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700 hover:bg-slate-200/50"
              )}
            >
              {/* Slot Top: Icon + Document Title */}
              <div className="flex items-center gap-1.5 min-w-0">
                <IconComponent className={cn(
                  "w-3.5 h-3.5 shrink-0 transition-transform group-hover/slot:scale-110",
                  isValid
                    ? "text-emerald-600 dark:text-emerald-400"
                    : isExpired
                      ? "text-rose-600 dark:text-rose-400"
                      : isExpiringSoon
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-slate-400"
                )} />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate" title={slot.name}>
                  {slot.name}
                </span>
              </div>

              {/* Slot Bottom: Explicit Status Badge */}
              <div className="mt-2">
                {isExpired ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-mono font-black bg-rose-100 dark:bg-rose-900/70 text-rose-700 dark:text-rose-300">
                    ! Exp. {formattedDate || 'Expired'}
                  </span>
                ) : isExpiringSoon ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-mono font-extrabold bg-amber-100 dark:bg-amber-900/70 text-amber-700 dark:text-amber-300">
                    ⚠️ {formattedDate || 'Expiring'}
                  </span>
                ) : isValid ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/70">
                    ✓ Valid
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-200/60 dark:bg-slate-800">
                    — Missing
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── BENTO BOTTOM FOOTER: Footer Compartment Bar ── */}
      <div className="bg-white dark:bg-slate-900 rounded-xl px-3 py-2 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between shadow-2xs text-xs">
        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium">
          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>
            Updated {(row as any).lastUpdated
              ? formatInDeploymentTz((row as any).lastUpdated, tz, 'd MMM yyyy')
              : 'recently'}
          </span>
        </div>

        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onOpen(); }}
          className="font-extrabold text-brand dark:text-orange-400 hover:text-brand-hover flex items-center gap-1 transition-colors cursor-pointer"
        >
          <FolderOpen className="w-3.5 h-3.5 text-brand dark:text-orange-400" />
          <span>Open Folder</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
