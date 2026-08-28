import { 
  FileText, Calendar, Building2, Hash, FileCheck, FileClock, FileKey2, ShieldAlert,
  Briefcase, Eye, Download, ChevronRight, Image as ImageIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useDeploymentTimezone } from '@/lib/datetime';
import { formatDocDate, resolveFileUrl } from '@/lib/documents';

interface SingleDocumentCardProps {
  doc: {
    id: string;
    doc_type: string;
    file_url: string;
    file_name?: string | null;
    mime_type?: string | null;
    issuer?: string | null;
    entityName?: string | null;
    issue_date?: string | null;
    expiry_date?: string | null;
    expStatus: string;
  };
  category: 'Company' | 'Operations';
  onPreview: (doc: any) => void;
}

const EXPIRY_BADGE: Record<string, { label: string; className: string }> = {
  VALID: { label: '🟢 Valid', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  EXPIRING_SOON: { label: '⚠️ Expiring Soon', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  EXPIRED: { label: '🔴 Expired', className: 'bg-rose-50 text-rose-700 border-rose-200' },
  NO_EXPIRY: { label: 'Permanent', className: 'bg-slate-100 text-slate-600 border-slate-200' },
  MISSING: { label: 'Missing', className: 'bg-slate-100 text-slate-500 border-slate-200' },
};

const DOC_ICONS: Record<string, React.ElementType> = {
  Contract: FileText,
  Invoice: FileText,
  CustomerDoc: Briefcase,
  Waybill: FileClock,
  POD: FileCheck,
  CustomsClearance: FileKey2,
  Emergency: ShieldAlert,
};

function checkIsImage(url: string, mime?: string | null): boolean {
  if (mime && mime.startsWith('image/')) return true;
  return /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(url);
}

function checkIsPdf(url: string, mime?: string | null): boolean {
  if (mime === 'application/pdf') return true;
  return /\.pdf$/i.test(url);
}

export default function SingleDocumentCard({ doc, category, onPreview }: SingleDocumentCardProps) {
  const tz = useDeploymentTimezone();
  const resolvedUrl = resolveFileUrl(doc.file_url);
  const isImg = checkIsImage(doc.file_url, doc.mime_type);
  const isPdf = checkIsPdf(doc.file_url, doc.mime_type);

  const IconComponent = DOC_ICONS[doc.doc_type] || FileText;
  const isOps = category === 'Operations';

  const badgeInfo = EXPIRY_BADGE[doc.expStatus] || {
    label: doc.expStatus,
    className: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  const title = doc.doc_type.replace(/([A-Z])/g, ' $1').trim();
  const subtitle = doc.entityName || doc.issuer || (isOps ? 'Operations Document' : 'Company Document');

  return (
    <div
      onClick={() => onPreview(doc)}
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-all cursor-pointer group p-4 sm:p-4.5 flex flex-col gap-3.5 font-sans"
    >
      {/* ── 1. HEADER ── */}
      <div className="flex items-center justify-between gap-3">
        {/* Left: Icon + Title */}
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105',
            isOps
              ? 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/40 dark:border-amber-900'
              : 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/40 dark:border-blue-900'
          )}>
            <IconComponent className="w-6 h-6 stroke-[2]" />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight leading-tight truncate">
              {title}
            </h3>
            <p
              className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider mt-0.5 truncate max-w-[200px] sm:max-w-[260px]"
              title={subtitle}
            >
              {subtitle}
            </p>
          </div>
        </div>

        {/* Right: Expiry Status Pill */}
        <Badge className={cn('px-3 py-1 text-xs font-bold rounded-full shrink-0 border shadow-2xs', badgeInfo.className)}>
          {badgeInfo.label}
        </Badge>
      </div>

      {/* Divider */}
      <div className="border-t border-slate-100 dark:border-slate-800/80 my-0.5" />

      {/* ── 2. MATRIX SLOTS / METADATA BOXES ── */}
      <div className="grid grid-cols-4 gap-2">
        {/* Slot 1: Doc Type */}
        <div className="flex flex-col items-center justify-between py-2.5 px-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-center min-h-[100px]">
          <div className="w-9 h-9 rounded-full bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center border border-slate-200/60 dark:border-slate-700 shrink-0">
            <FileText className="w-4 h-4 stroke-[1.8]" />
          </div>
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-1">Type</span>
          <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate w-full px-0.5">{doc.doc_type}</span>
          <span className="text-slate-300 dark:text-slate-700 text-[10px] font-bold mt-0.5 leading-none">—</span>
        </div>

        {/* Slot 2: Issuer */}
        <div className="flex flex-col items-center justify-between py-2.5 px-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-center min-h-[100px]">
          <div className="w-9 h-9 rounded-full bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center border border-slate-200/60 dark:border-slate-700 shrink-0">
            <Building2 className="w-4 h-4 stroke-[1.8]" />
          </div>
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-1">Issuer</span>
          <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate w-full px-0.5" title={doc.issuer || 'N/A'}>
            {doc.issuer || 'N/A'}
          </span>
          <span className="text-slate-300 dark:text-slate-700 text-[10px] font-bold mt-0.5 leading-none">—</span>
        </div>

        {/* Slot 3: Reference ID */}
        <div className="flex flex-col items-center justify-between py-2.5 px-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-center min-h-[100px]">
          <div className="w-9 h-9 rounded-full bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center border border-slate-200/60 dark:border-slate-700 shrink-0">
            <Hash className="w-4 h-4 stroke-[1.8]" />
          </div>
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-1">Ref ID</span>
          <span className="text-[11px] font-bold font-mono text-slate-800 dark:text-slate-200 truncate w-full px-0.5">
            #{doc.id.slice(0, 6)}
          </span>
          <span className="text-slate-300 dark:text-slate-700 text-[10px] font-bold mt-0.5 leading-none">—</span>
        </div>

        {/* Slot 4: Format */}
        <div className="flex flex-col items-center justify-between py-2.5 px-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-center min-h-[100px]">
          <div className="w-9 h-9 rounded-full bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center border border-slate-200/60 dark:border-slate-700 shrink-0">
            {isImg ? <ImageIcon className="w-4 h-4 stroke-[1.8] text-emerald-600" /> : <FileText className="w-4 h-4 stroke-[1.8] text-rose-600" />}
          </div>
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-1">Format</span>
          <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 uppercase">
            {isImg ? 'Image' : isPdf ? 'PDF' : 'File'}
          </span>
          <span className="text-slate-300 dark:text-slate-700 text-[10px] font-bold mt-0.5 leading-none">—</span>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-slate-100 dark:border-slate-800/80 my-0.5" />

      {/* ── 3. FOOTER ── */}
      <div className="flex items-center justify-between gap-3">
        {/* Expiry / Date Info */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-900/60 shrink-0">
            <Calendar className="w-4 h-4 stroke-[1.8]" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider block">
              {doc.expiry_date ? 'Expiry Date' : 'Issue Date'}
            </span>
            <span className="text-[12px] font-bold text-slate-800 dark:text-slate-200 font-mono">
              {doc.expiry_date
                ? formatDocDate(doc.expiry_date)
                : doc.issue_date
                  ? formatDocDate(doc.issue_date)
                  : 'Permanent'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPreview(doc);
            }}
            className="h-8 px-3 text-xs font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs group-hover:border-slate-300"
          >
            <Eye className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
            <span>View</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
          <a
            href={resolvedUrl}
            download
            onClick={(e) => e.stopPropagation()}
            className="h-8 w-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 transition-colors shadow-2xs"
            title="Download Document"
          >
            <Download className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
