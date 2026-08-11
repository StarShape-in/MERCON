import { Sparkles } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';

export default function SahalPage() {
  return (
    <DashboardLayout active="Sahal" title="Sahal">
      <div className="px-4 sm:px-6 lg:px-8 pb-8 h-full flex flex-col items-center justify-center gap-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#FEF1EC] text-[#E8450F] flex items-center justify-center border border-orange-100/60">
          <Sparkles size={24} className="stroke-[2]" />
        </div>
        <div>
          <h1 className="text-lg font-extrabold text-slate-900">Sahal</h1>
          <p className="text-xs text-slate-500 font-semibold mt-1 max-w-sm">
            This module is coming soon. Its scope hasn't been defined yet.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
