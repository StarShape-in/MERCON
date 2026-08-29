import React from 'react';
import { ShieldCheck, Wifi } from 'lucide-react';

export default function IccesStatusHeader() {
  return (
    <div className="bg-[#EEF1F6] dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 rounded-xl px-3.5 py-2 flex items-center justify-between text-xs mb-3">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
        <div>
          <span className="font-bold text-[#3E3C3D] dark:text-slate-200 text-[11.5px]">
            WASL &amp; ICCES GPS Gateway Status
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
            Active tracking &amp; official compliance sync
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-900/60">
          <Wifi className="w-3 h-3 animate-pulse" /> Live
        </span>
      </div>
    </div>
  );
}
