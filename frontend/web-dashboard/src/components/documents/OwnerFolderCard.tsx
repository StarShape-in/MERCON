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
  const title = row.ownerName; // e.g. "DSA-3078" or "VRA-5510"
  const isDriver = row.ownerType === 'Driver';

  const issueCount = cardSummary.issuesCount;
  const expiredSlots = mandatorySlots.filter((s) => s.status === 'EXPIRED');
  const expiringSoonSlots = mandatorySlots.filter((s) => s.status === 'EXPIRING_SOON');
  const missingSlots = mandatorySlots.filter((s) => !s.documentId || s.status === 'MISSING');

  return (
    <div
      onClick={onOpen}
      className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col md:flex-row font-sans cursor-pointer group overflow-hidden relative"
    >
      {/* ── LEFT FOLDER SIDE TAB SURFACE ── */}
      <div className="w-full md:w-72 bg-gradient-to-b from-indigo-600 via-indigo-700 to-indigo-950 p-6 text-white flex flex-col justify-between relative shrink-0">
        {/* Subtle folder tab shape header indicator */}
        <div className="absolute top-0 left-0 w-24 h-3 bg-indigo-500/40 rounded-b-lg" />

        <div>
          {/* Vehicle Visual Header */}
          <div className="flex justify-center my-3 relative">
            <div className="w-32 h-24 flex items-center justify-center">
              <Truck className="w-16 h-16 text-indigo-100 drop-shadow-md shrink-0" />
            </div>
          </div>

          {/* Identity */}
          <h3 className="text-3xl font-black font-mono text-white tracking-tight leading-none mt-2">
            {title}
          </h3>

          <div className="mt-3 space-y-2">
            {row.ownerRef && (
              <span className="inline-block font-mono font-bold text-xs text-indigo-100 bg-indigo-800/80 px-2.5 py-1 rounded-lg border border-indigo-500/40">
                {row.ownerRef}
              </span>
            )}
            {row.relatedName && (
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-200">
                <UserIcon className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
                <span className="truncate">{row.relatedName}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Timestamp */}
        <div className="pt-6 border-t border-indigo-500/30 flex items-center gap-2 text-xs text-indigo-200/90 font-medium">
          <Clock className="w-4 h-4 text-indigo-300 shrink-0" />
          <span>Updated recently</span>
        </div>
      </div>

      {/* ── RIGHT COMPLIANCE CONTENT PANEL ── */}
      <div className="flex-1 p-6 flex flex-col justify-between space-y-6">
        {/* Top Summary & Action Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h4 className="text-sm font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Compliance Status
            </h4>
            <div className="flex items-center gap-4 mt-2">
              <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
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
                <div className="absolute text-center">
                  <span className="text-xl font-black text-slate-900 dark:text-slate-100 font-mono leading-none block">
                    {issueCount}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 leading-none">
                    Issues
                  </span>
                </div>
              </div>

              <div className="space-y-1 text-xs font-bold">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>{expiredSlots.length} Expired</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  <span>{missingSlots.length} Missing</span>
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onOpen(); }}
            className="h-10 px-5 text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900 rounded-2xl flex items-center gap-2 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 transition-all shadow-3xs cursor-pointer self-start sm:self-center"
          >
            <FolderOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Open Folder</span>
            <ChevronRight className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </button>
        </div>

        {/* Bottom Standalone Documents Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-2">
          {mandatorySlots.map((slot) => {
            const formattedDate = slot.expiry_date ? formatDocDate(slot.expiry_date) : null;
            const isExpired = slot.status === 'EXPIRED';
            const isExpiringSoon = slot.status === 'EXPIRING_SOON';
            const isValid = slot.status === 'VALID';
            const isMissing = !slot.documentId || slot.status === 'MISSING';
            const IconComponent = SLOT_ICONS[slot.code] || SLOT_ICONS[slot.name.replace(/\s+/g, '')] || FileText;

            return (
              <div
                key={slot.code}
                onClick={(e) => {
                  e.stopPropagation();
                  if (slot.documentId) { onOpen(); }
                  else { onUploadMissing?.(row, slot.code); }
                }}
                className="flex flex-col items-center text-center p-3 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition-all cursor-pointer"
              >
                {/* Standalone Lucide Icon with Direct Color Class (NO BG CONTAINER BOX) */}
                <IconComponent
                  className={cn(
                    "w-6 h-6 shrink-0 my-1",
                    isValid
                      ? "text-emerald-600 dark:text-emerald-400"
                      : isExpired
                        ? "text-rose-600 dark:text-rose-400"
                        : isExpiringSoon
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-slate-400 dark:text-slate-500"
                  )}
                />

                <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 mt-2 truncate w-full">
                  {slot.name}
                </span>

                <span
                  className={cn(
                    "inline-block text-[10px] font-black px-2 py-0.5 rounded-full mt-2 font-mono",
                    isValid
                      ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300"
                      : isExpired
                        ? "text-rose-700 bg-rose-50 dark:bg-rose-950/60 dark:text-rose-300"
                        : isExpiringSoon
                          ? "text-amber-700 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-300"
                          : "text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-400"
                  )}
                >
                  {isValid ? 'Valid' : isExpired ? 'Expired' : isExpiringSoon ? 'Expiring' : 'Missing'}
                </span>

                <span className="text-[10px] text-slate-400 font-mono mt-1">
                  {formattedDate || '—'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
