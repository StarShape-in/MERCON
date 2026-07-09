import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface KpiCardProps {
  label: string;
  value: string | number;
  delta?: string | number | null;
  up?: boolean | null;
  icon: React.ElementType;
  color?: string;
  bg?: string;
}

export default function KpiCard({
  label,
  value,
  delta,
  up,
  icon: Icon,
  color = '#E8450F',
  bg = '#FFF0EB',
}: KpiCardProps) {
  const showDelta = delta !== undefined && delta !== null;
  const isUp = up === true || (typeof delta === 'number' && delta >= 0);

  return (
    <div className="bg-white rounded-2xl p-5 border border-black/[0.06] shadow-sm flex flex-col justify-between h-full hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div 
          className="w-10 h-10 rounded-2xl flex items-center justify-center" 
          style={{ backgroundColor: bg }}
        >
          <Icon size={20} style={{ color }} />
        </div>
        
        {showDelta && (
          <div 
            className={`flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full ${
              isUp 
                ? 'text-[#16A34A] bg-[#F0FDF4]' 
                : 'text-[#DC2626] bg-[#FEF2F2]'
            }`}
          >
            {isUp ? <ArrowUp size={12} className="stroke-[2.5]" /> : <ArrowDown size={12} className="stroke-[2.5]" />}
            <span>
              {typeof delta === 'number' ? `${Math.abs(delta)}%` : delta}
            </span>
          </div>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-[#111] leading-none tracking-tight">{value}</p>
        <p className="text-xs text-[#6E6E80] mt-1.5 font-medium">{label}</p>
      </div>
    </div>
  );
}
