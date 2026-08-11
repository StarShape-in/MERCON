import { useState } from 'react';
import {
  ShieldCheck,
  AlertCircle,
  Upload,
  ChevronRight,
  FileCheck2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
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
    name: 'Comprehensive Fleet Insurance',
    category: 'Insurance',
    holder: 'Tawuniya Policy #99218',
    status: 'valid',
    expiryDate: '15 Jan 2027',
    daysRemaining: 157,
  },
];

export default function SahalDocumentsCard() {
  const [docs, setDocs] = useState<DocItem[]>(DOC_ITEMS);

  const handleRenew = (docId: string, name: string) => {
    toast.success(`Renewal initiated for ${name}`);
  };

  const validCount = docs.filter(d => d.status === 'valid').length + 42; // +42 historical valid docs
  const expiringCount = docs.filter(d => d.status === 'expiring').length;
  const expiredCount = docs.filter(d => d.status === 'expired').length;
  const totalCount = validCount + expiringCount + expiredCount;
  const complianceRate = Math.round((validCount / totalCount) * 100);

  return (
    <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-sm rounded-2xl overflow-hidden backdrop-blur-sm flex flex-col">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/15 to-teal-500/15 dark:from-emerald-500/25 dark:to-teal-500/25 flex items-center justify-center border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck size={18} className="stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Documents & Compliance
                </CardTitle>
                <Badge variant="outline" className="text-[10px] uppercase font-bold bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800">
                  {complianceRate}% Health
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Driver licenses, Istimara, insurance & safety permits
              </p>
            </div>
          </div>

          <Link
            to="/documents"
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 shrink-0"
          >
            Docs Center <ChevronRight size={13} />
          </Link>
        </div>

        {/* Health bar */}
        <div className="mt-3 space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Fleet Compliance Score
            </span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {validCount} of {totalCount} Active
            </span>
          </div>
          <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
            <div
              className="bg-emerald-500 h-full transition-all"
              style={{ width: `${complianceRate}%` }}
              title="Valid Documents"
            />
            <div
              className="bg-amber-400 h-full transition-all"
              style={{ width: `${(expiringCount / totalCount) * 100}%` }}
              title="Expiring soon"
            />
            <div
              className="bg-rose-500 h-full transition-all"
              style={{ width: `${(expiredCount / totalCount) * 100}%` }}
              title="Expired"
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-0.5">
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {validCount} Valid
            </span>
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> {expiringCount} Expiring (30d)
            </span>
            <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> {expiredCount} Expired
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-3 flex-1 overflow-y-auto max-h-[260px] space-y-2">
        {docs.map(doc => (
          <div
            key={doc.id}
            className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between gap-3 hover:border-slate-200 dark:hover:border-slate-700 transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`p-2 rounded-lg shrink-0 ${
                doc.status === 'expired'
                  ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                  : doc.status === 'expiring'
                  ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400'
                  : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
              }`}>
                {doc.status === 'valid' ? <FileCheck2 size={15} /> : <AlertCircle size={15} />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                    {doc.name}
                  </p>
                  <Badge variant="outline" className="text-[9px] px-1 py-0 border-slate-200 dark:border-slate-700 text-slate-500">
                    {doc.category}
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {doc.holder}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="text-right">
                <span className={`text-[10px] font-bold block ${
                  doc.status === 'expired'
                    ? 'text-rose-600 dark:text-rose-400'
                    : doc.status === 'expiring'
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}>
                  {doc.status === 'expired'
                    ? 'Expired'
                    : doc.status === 'expiring'
                    ? `${doc.daysRemaining}d left`
                    : 'Verified'}
                </span>
                <span className="text-[9px] text-slate-400 font-mono">
                  {doc.expiryDate}
                </span>
              </div>
              {doc.status !== 'valid' && (
                <button
                  onClick={() => handleRenew(doc.id, doc.name)}
                  className="p-1.5 rounded-lg bg-slate-900 dark:bg-slate-700 text-white hover:bg-[#E8450F] dark:hover:bg-[#E8450F] transition-colors cursor-pointer"
                  title="Upload / Renew"
                >
                  <Upload size={12} />
                </button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
