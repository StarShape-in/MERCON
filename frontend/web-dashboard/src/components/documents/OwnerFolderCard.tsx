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
  const subtitle = row.ownerType === 'Driver'
    ? [row.ownerRef, row.relatedName].filter(Boolean).join(' • ') || 'Driver'
    : [row.ownerRef, row.relatedName].filter(Boolean).join(' • ') || 'Vehicle';

  const issueCount = cardSummary.issuesCount;
  const isDriver = row.ownerType === 'Driver';

  // Categorize slots for visual hierarchy
  const expiredSlots = mandatorySlots.filter(s => s.status === 'EXPIRED');
  const expiringSoonSlots = mandatorySlots.filter(s => s.status === 'EXPIRING_SOON');
  const missingSlots = mandatorySlots.filter(s => !s.documentId || s.status === 'MISSING');
  const validSlots = mandatorySlots.filter(s => s.status === 'VALID');

  const attentionSlots = [...expiredSlots, ...expiringSoonSlots, ...missingSlots];
  const compliantSlots = validSlots;

  const breakdownParts: string[] = [];
  if (expiredSlots.length > 0) breakdownParts.push(`${expiredSlots.length} Expired`);
  if (expiringSoonSlots.length > 0) breakdownParts.push(`${expiringSoonSlots.length} Expiring Soon`);
  if (missingSlots.length > 0) breakdownParts.push(`${missingSlots.length} Missing`);
  const breakdownText = breakdownParts.join(' • ');

  return (
    <div
      onClick={onOpen}
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-md transition-all duration-200 p-4 sm:p-5 flex flex-col justify-between gap-4 font-sans cursor-pointer group"
    >
      {/* ── 1. HEADER ROW: Identity + Health Summary ── */}
      <div className="flex items-start justify-between gap-3">
        {/* Left: Identity */}
        <div className="flex items-start gap-3 min-w-0">
          {isDriver ? (
            <UserIcon className="w-5 h-5 stroke-[2] text-purple-600 dark:text-purple-400 shrink-0 mt-0.5 transition-transform group-hover:scale-105" />
          ) : (
            <Truck className="w-5 h-5 stroke-[2] text-brand dark:text-orange-400 shrink-0 mt-0.5 transition-transform group-hover:scale-105" />
          )}

          <div className="min-w-0">
            <h3 className="text-lg font-black font-mono text-slate-900 dark:text-slate-100 tracking-tight leading-none truncate">
              {title}
            </h3>
            <p
              className="text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-tight mt-1 truncate max-w-[220px] sm:max-w-[280px]"
              title={subtitle}
            >
              {subtitle}
            </p>
          </div>
        </div>

        {/* Right: Health Indicator */}
        {issueCount > 0 ? (
          <div className="flex flex-col items-end shrink-0">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200/80 dark:border-rose-900/80 text-rose-700 dark:text-rose-300 shadow-2xs">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
              <span className="text-xs font-black font-mono">{issueCount} Issue{issueCount > 1 ? 's' : ''}</span>
            </div>
            {breakdownText && (
              <span className="text-[10px] font-semibold text-rose-600/90 dark:text-rose-400/90 mt-1 font-mono tracking-tight text-right">
                {breakdownText}
              </span>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-end shrink-0">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-900/80 text-emerald-700 dark:text-emerald-300 shadow-2xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="text-xs font-black">All Valid</span>
            </div>
            <span className="text-[10px] font-semibold text-emerald-600/90 dark:text-emerald-400/90 mt-1 font-mono tracking-tight">
              {mandatorySlots.length} Documents Compliant
            </span>
          </div>
        )}
      </div>

      {/* ── 2. RESTRUCTURED COMPLIANCE OVERVIEW ── */}
      <div className="space-y-3">
        {/* ATTENTION REQUIRED SECTION */}
        {attentionSlots.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Attention Required ({attentionSlots.length})
            </span>
            <div className="space-y-1.5">
              {attentionSlots.map((slot) => {
                const formattedDate = slot.expiry_date ? formatDocDate(slot.expiry_date) : null;
                const isExpired = slot.status === 'EXPIRED';
                const isExpiringSoon = slot.status === 'EXPIRING_SOON';
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
                      "flex items-center justify-between p-2 rounded-xl border text-xs transition-colors cursor-pointer",
                      isExpired
                        ? "bg-rose-50/70 dark:bg-rose-950/40 border-rose-200/80 dark:border-rose-900/60 hover:bg-rose-100/70"
                        : isExpiringSoon
                          ? "bg-amber-50/70 dark:bg-amber-950/40 border-amber-200/80 dark:border-amber-900/60 hover:bg-amber-100/70"
                          : "bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-100/80"
                    )}
                  >
                    {/* Left: Icon + Doc Name */}
                    <div className="flex items-center gap-2 min-w-0">
                      <IconComponent className={cn(
                        "w-4 h-4 shrink-0",
                        isExpired ? "text-rose-600 dark:text-rose-400" : isExpiringSoon ? "text-amber-600 dark:text-amber-400" : "text-slate-400"
                      )} />
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                        {slot.name}
                      </span>
                    </div>

                    {/* Right: Explicit Status Label */}
                    <div className="shrink-0">
                      {isExpired ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-100 dark:bg-rose-900/80 text-rose-700 dark:text-rose-300 font-mono">
                          ! Expired · {formattedDate || 'Expired'}
                        </span>
                      ) : isExpiringSoon ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-100 dark:bg-amber-900/80 text-amber-700 dark:text-amber-300 font-mono">
                          ⚠️ Expiring · {formattedDate}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-400 font-mono">
                          — Missing
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* COMPLIANT / OTHER DOCUMENTS SECTION */}
        {compliantSlots.length > 0 && (
          <div className="space-y-1.5">
            {attentionSlots.length > 0 && (
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                Other Documents ({compliantSlots.length})
              </span>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {compliantSlots.map((slot) => {
                const IconComponent = SLOT_ICONS[slot.code] || SLOT_ICONS[slot.name.replace(/\s+/g, '')] || FileText;

                return (
                  <div
                    key={slot.code}
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpen();
                    }}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/80 text-xs hover:bg-slate-100/80 dark:hover:bg-slate-800/70 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <IconComponent className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                        {slot.name}
                      </span>
                    </div>

                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/70 shrink-0">
                      ✓ Valid
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── 3. FOOTER ROW: Last Updated + Open Folder Action ── */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3">
        {/* Last Updated */}
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 dark:text-slate-500">
          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>
            Updated {(row as any).lastUpdated
              ? formatInDeploymentTz((row as any).lastUpdated, tz, 'd MMM yyyy')
              : 'recently'}
          </span>
        </div>

        {/* Open Folder Action */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onOpen(); }}
          className="h-8 px-3 text-xs font-extrabold text-brand dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 border border-orange-200/80 dark:border-orange-900/60 hover:bg-orange-100/80 dark:hover:bg-orange-950/80 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs group-hover:border-brand/40"
        >
          <FolderOpen className="w-3.5 h-3.5 text-brand dark:text-orange-400" />
          <span>Open Folder</span>
          <ChevronRight className="w-3.5 h-3.5 opacity-70" />
        </button>
      </div>
    </div>
  );
}
