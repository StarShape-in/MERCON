import { useState } from 'react';
import {
  ShieldCheck,
  AlertCircle,
  Upload,
  ChevronRight,
  FileCheck2,
  Lock,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

interface DocItem {
  id: string;
  name: string;
  category: 'Driver' | 'Vehicle' | 'Insurance' | 'Permit';
  holder: string;
  status: 'valid' | 'expiring' | 'expired';
  expiryDate: string;
  daysRemaining: number;
}

const DOC_ITEMS: DocItem[] = [
  {
    id: 'doc-1',
    name: 'Driver Heavy Vehicle License',
    category: 'Driver',
    holder: 'Tariq Al-Otaibi',
    status: 'expired',
    expiryDate: 'Yesterday',
    daysRemaining: -1,
  },
  {
    id: 'doc-2',
    name: 'Vehicle Istimara (Registration)',
    category: 'Vehicle',
    holder: 'TRK-104 (Mercedes Actros)',
    status: 'expiring',
    expiryDate: '18 Aug 2026',
    daysRemaining: 7,
  },
  {
    id: 'doc-3',
    name: 'Dangerous Goods Transit Permit',
    category: 'Permit',
    holder: 'Fleet Tankers (Zone 1)',
    status: 'expiring',
    expiryDate: '24 Aug 2026',
    daysRemaining: 13,
  },
  {
    id: 'doc-4',
    name: 'Comprehensive Goods-in-Transit',
    category: 'Insurance',
    holder: 'Tawuniya Fleet #99218',
    status: 'valid',
    expiryDate: '15 Jan 2027',
    daysRemaining: 157,
  },
];

export default function SahalDocumentsCard() {
  const [docs, setDocs] = useState<DocItem[]>(DOC_ITEMS);

  const handleRenew = (name: string) => {
    toast.success(`Renewal upload trigger dispatched for ${name}`);
  };

  const validCount = 44;
  const expiringCount = 3;
  const expiredCount = 1;
  const totalCount = validCount + expiringCount + expiredCount;
  const score = Math.round((validCount / totalCount) * 100);

  return (
    <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-gradient-to-b from-white via-slate-50/50 to-white dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-950 p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-60 h-60 bg-teal-500/5 dark:bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="relative z-10">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-400 text-white flex items-center justify-center shadow-md shadow-teal-500/20">
              <Lock size={20} className="stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                  Compliance Vault
                </h2>
                <Badge className="bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 font-bold text-[10px] px-2 py-0.5">
                  {score}% Verified
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Driver licenses, Istimara & regulatory permits
              </p>
            </div>
          </div>

          <Link
            to="/documents"
            className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 shrink-0"
          >
            Vault <ChevronRight size={14} />
          </Link>
        </div>

        {/* Circular Compliance Meter & Status Cards */}
        <div className="my-4 p-3.5 rounded-2xl bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            {/* SVG Circular Progress Gauge */}
            <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-200 dark:text-slate-700"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-teal-500"
                  strokeDasharray={`${score}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute text-xs font-black text-slate-900 dark:text-white font-mono">
                {score}%
              </span>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                Regulatory Clearance
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {validCount} active legal documents safe
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-1 text-[11px] text-right">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
              ✓ {validCount} Active
            </span>
            <span className="text-amber-500 font-bold">
              ⚠ {expiringCount} Due (14d)
            </span>
            <span className="text-rose-500 font-bold">
              ✕ {expiredCount} Blocked
            </span>
          </div>
        </div>
      </div>

      {/* Actionable Document Rows */}
      <div className="space-y-2 flex-1 overflow-y-auto max-h-[220px] relative z-10">
        {docs.map(doc => (
          <div
            key={doc.id}
            className="p-2.5 rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-white/60 dark:bg-slate-800/30 flex items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-2xs"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  doc.status === 'expired'
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                    : doc.status === 'expiring'
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                    : 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20'
                }`}
              >
                {doc.status === 'valid' ? <FileCheck2 size={15} /> : <AlertCircle size={15} />}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                  {doc.name}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {doc.holder}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="text-right text-[10px]">
                <span
                  className={`font-black block ${
                    doc.status === 'expired'
                      ? 'text-rose-600 dark:text-rose-400'
                      : doc.status === 'expiring'
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-teal-600 dark:text-teal-400'
                  }`}
                >
                  {doc.status === 'expired'
                    ? 'Expired'
                    : doc.status === 'expiring'
                    ? `${doc.daysRemaining}d grace`
                    : 'Compliant'}
                </span>
                <span className="text-slate-400 font-mono">{doc.expiryDate}</span>
              </div>
              {doc.status !== 'valid' && (
                <button
                  onClick={() => handleRenew(doc.name)}
                  className="p-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-[#E8450F] dark:hover:bg-[#E8450F] dark:hover:text-white transition-all shadow-xs cursor-pointer"
                  title="Upload Document"
                >
                  <Upload size={12} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
