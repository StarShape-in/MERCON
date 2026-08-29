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
  const title = row.ownerName; // e.g. "DSA-3078"
  const isDriver = row.ownerType === 'Driver';

  const issueCount = cardSummary.issuesCount;

  // Categorize slots for visual hierarchy
  const expiredSlots = mandatorySlots.filter((s) => s.status === 'EXPIRED');
  const expiringSoonSlots = mandatorySlots.filter((s) => s.status === 'EXPIRING_SOON');
  const missingSlots = mandatorySlots.filter((s) => !s.documentId || s.status === 'MISSING');
  const validSlots = mandatorySlots.filter((s) => s.status === 'VALID');

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
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs hover:shadow-md transition-all duration-200 p-5 flex flex-col justify-between gap-4 font-sans cursor-pointer group relative overflow-hidden"
    >
      {/* Top Accent Strip for Attention Vehicles */}
      {issueCount > 0 && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500/80 dark:bg-rose-500/60" />
      )}

      {/* ── 1. PRIMARY VEHICLE IDENTITY & COMPLIANCE HEALTH SUMMARY ── */}
      <div className="flex items-start justify-between gap-4">
        {/* Left: Identity Block */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            {isDriver ? (
              <UserIcon className="w-4.5 h-4.5 text-purple-600 dark:text-purple-400 shrink-0" />
            ) : (
              <Truck className="w-4.5 h-4.5 text-slate-700 dark:text-slate-300 shrink-0" />
            )}
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 font-mono">
              {isDriver ? 'DRIVER FLEET RECORD' : 'ENTERPRISE VEHICLE'}
            </span>
          </div>

          <h3 className="text-2xl font-black font-mono text-slate-900 dark:text-slate-100 tracking-tight leading-none truncate">
            {title}
          </h3>

          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mt-2 truncate">
            {row.ownerRef && (
              <span className="font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200/80 dark:border-slate-700 shrink-0">
                {row.ownerRef}
              </span>
            )}
            {row.relatedName && (
              <span className="truncate" title={row.relatedName}>
                {row.relatedName}
              </span>
            )}
          </div>
        </div>

        {/* Right: Compliance Health Pill / Banner */}
        {issueCount > 0 ? (
          <div className="flex flex-col items-end shrink-0">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200/80 dark:border-rose-900/80 text-rose-700 dark:text-rose-300 shadow-3xs">
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span className="text-xs font-black font-mono tracking-tight">{issueCount} Issues</span>
            </div>
            {breakdownText && (
              <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400/90 mt-1 font-mono tracking-tight text-right">
                {breakdownText}
              </span>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-end shrink-0">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-900/80 text-emerald-700 dark:text-emerald-300 shadow-3xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="text-xs font-black">All Valid</span>
            </div>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400/90 mt-1 font-mono tracking-tight">
              {mandatorySlots.length} Documents Compliant
            </span>
          </div>
        )}
      </div>

      <div className="border-t border-slate-100 dark:border-slate-800/80" />

      {/* ── 2. GROUPED COMPLIANCE DOCUMENTS ── */}
      <div className="space-y-3.5">
        {/* ATTENTION REQUIRED SECTION */}
        {attentionSlots.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> Documents Requiring Attention ({attentionSlots.length})
              </span>
            </div>

            <div className="space-y-2">
              {attentionSlots.map((slot) => {
                const formattedDate = slot.expiry_date ? formatDocDate(slot.expiry_date) : null;
                const isExpired = slot.status === 'EXPIRED';
                const isExpiringSoon = slot.status === 'EXPIRING_SOON';
                const isMissing = !slot.documentId || slot.status === 'MISSING';
                const IconComponent = SLOT_ICONS[slot.code] || SLOT_ICONS[slot.name.replace(/\s+/g, '')] || FileText;

                return (
                  <div
                    key={slot.code}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (slot.documentId) {
                        onOpen();
                      } else {
                        onUploadMissing?.(row, slot.code);
                      }
                    }}
                    className={cn(
                      'flex items-center justify-between p-2.5 rounded-xl border text-xs transition-colors cursor-pointer',
                      isExpired
                        ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-200/80 dark:border-rose-900/60 hover:bg-rose-100/80'
                        : isExpiringSoon
                          ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-200/80 dark:border-amber-900/60 hover:bg-amber-100/80'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-100/80'
                    )}
                  >
                    {/* Left: Standalone Icon + Name */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <IconComponent
                        className={cn(
                          'w-4 h-4 shrink-0',
                          isExpired
                            ? 'text-rose-600 dark:text-rose-400'
                            : isExpiringSoon
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-slate-400 dark:text-slate-500'
                        )}
                      />
                      <span className="font-extrabold text-slate-800 dark:text-slate-200 truncate">
                        {slot.name}
                      </span>
                    </div>

                    {/* Right: Explicit Status & Date */}
                    <div className="shrink-0">
                      {isExpired ? (
                        <div className="flex items-center gap-1.5 text-right font-mono">
                          <span className="text-[11px] font-black text-rose-700 dark:text-rose-300">
                            Expired
                          </span>
                          <span className="text-[10px] font-bold text-rose-600/80 dark:text-rose-400/80">
                            {formattedDate || 'Expired'}
                          </span>
                        </div>
                      ) : isExpiringSoon ? (
                        <div className="flex items-center gap-1.5 text-right font-mono">
                          <span className="text-[11px] font-extrabold text-amber-700 dark:text-amber-300">
                            Expiring Soon
                          </span>
                          <span className="text-[10px] font-bold text-amber-600/80 dark:text-amber-400/80">
                            {formattedDate}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 font-mono">
                          Missing
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* COMPLIANT DOCUMENTS SECTION */}
        {compliantSlots.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
              Compliant Documents ({compliantSlots.length})
            </span>
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
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/80 text-xs hover:bg-slate-100/80 dark:hover:bg-slate-800/70 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <IconComponent className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="font-bold text-slate-700 dark:text-slate-300 truncate">
                        {slot.name}
                      </span>
                    </div>

                    <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 shrink-0">
                      Valid
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── 3. FOOTER ROW: Metadata + Action Button ── */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3">
        {/* Last Updated */}
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>
            Updated{' '}
            {(row as any).lastUpdated
              ? formatInDeploymentTz((row as any).lastUpdated, tz, 'd MMM yyyy')
              : 'Recently'}
          </span>
        </div>

        {/* Open Folder Action Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
          className="h-8 px-3.5 text-xs font-black text-[#FA634E] dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 border border-orange-200/80 dark:border-orange-900/60 hover:bg-orange-100/80 dark:hover:bg-orange-950/80 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-3xs group-hover:border-[#FA634E]/40"
        >
          <FolderOpen className="w-3.5 h-3.5 text-[#FA634E] dark:text-orange-400" />
          <span>Open Folder</span>
          <ChevronRight className="w-3.5 h-3.5 opacity-70" />
        </button>
      </div>
    </div>
  );
}
