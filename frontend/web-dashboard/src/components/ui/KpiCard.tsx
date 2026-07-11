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
  subtitle?: string;
}

export default function KpiCard({
  label,
  value,
  delta,
  up,
  icon: Icon,
  color = '#E8450F',
  bg = '#FFF0EB',
  subtitle,
}: KpiCardProps) {
  const showDelta = delta !== undefined && delta !== null;
  const isUp = up === true || (typeof delta === 'number' && delta >= 0);

  return (
    <div className="bg-white rounded-3xl p-5 border border-black/[0.06] shadow-sm flex flex-col justify-center items-center w-[170px] h-[170px] shrink-0 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
      <div 
        className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110 shrink-0" 
        style={{ backgroundColor: bg }}
      >
        <Icon size={24} style={{ color }} />
      </div>
      
      <p className="text-2xl font-extrabold text-[#111] leading-none tracking-tight mb-1.5 text-center truncate w-full">{value}</p>
      <p className="text-[10px] font-bold text-[#9898A4] uppercase tracking-wider text-center px-1 leading-tight line-clamp-2">
        {label}
      </p>
      
      {showDelta && (
        <div 
          className={`absolute top-3 right-3 flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
            isUp 
              ? 'text-[#16A34A] bg-[#F0FDF4]' 
              : 'text-[#DC2626] bg-[#FEF2F2]'
          }`}
        >
          {isUp ? <ArrowUp size={10} className="stroke-[2.5]" /> : <ArrowDown size={10} className="stroke-[2.5]" />}
          <span>
            {typeof delta === 'number' ? `${Math.abs(delta)}%` : delta}
          </span>
        </div>
      )}
    </div>
  );
}
