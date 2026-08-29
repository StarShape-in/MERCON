import React from 'react';
import { ArrowRight, RefreshCw, Clock, Truck, Check, CheckCircle2, AlertTriangle, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ServiceVehicleSelectorProps {
  contractRateCategory: string;
  contractVehicleType: string;
  contractBillingType?: string;
  onUpdateRateCategory: (cat: string) => void;
  onUpdateVehicleType?: (veh: string) => void;
  onUpdateBillingType?: (billingType: string) => void;
  matchStatus?: 'matched' | 'unmatched' | 'idle';
  className?: string;
}

const CATEGORY_OPTIONS = [
  {
    id: 'SINGLE_TRIP',
    label: 'Single Trip',
    icon: ArrowRight,
  },
  {
    id: 'ROUND_TRIP',
    label: 'Round Trip',
    icon: RefreshCw,
  },
  {
    id: '10_HRS',
    label: '10 Hours Shift',
    icon: Clock,
  },
  {
    id: '12_HRS',
    label: '12 Hours Shift',
    icon: Clock,
  },
];

const VEHICLE_OPTIONS = ['3-4 TON', '5 TON', '10 TON', '20 TON', '40 FEET'];

export const isCategorySelected = (catId: string, current: string) => {
  if (!current) return catId === 'SINGLE_TRIP';
  if (current === catId) return true;
  const c = current.toUpperCase();
  if (catId === 'SINGLE_TRIP' && (c.includes('SINGLE') || c === 'TRIP')) return true;
  if (catId === 'ROUND_TRIP' && c.includes('ROUND')) return true;
  if (catId === '10_HRS' && (c.includes('10') || c.includes('10_HRS'))) return true;
  if (catId === '12_HRS' && (c.includes('12') || c.includes('12_HRS'))) return true;
  return false;
};

export const isVehicleSelected = (vehId: string, current: string) => {
  if (!current) return vehId === '10 TON';
  if (current === vehId) return true;
  const v = current.toUpperCase();
  if (vehId === '3-4 TON' && (v.includes('3-4') || v.includes('3–4') || v.includes('3.5'))) return true;
  if (vehId === '5 TON' && (v === '5 TON' || v === '5')) return true;
  if (vehId === '10 TON' && (v === '10 TON' || v === '10')) return true;
  if (vehId === '20 TON' && (v === '20 TON' || v === '20')) return true;
  if (vehId === '40 FEET' && (v.includes('40') || v.includes('FEET'))) return true;
  return false;
};

export default function ServiceVehicleSelector({
  contractRateCategory,
  contractVehicleType,
  contractBillingType = 'Monthly',
  onUpdateRateCategory,
  onUpdateVehicleType,
  onUpdateBillingType,
  matchStatus = 'idle',
  className,
}: ServiceVehicleSelectorProps) {
  return (
    <div className={cn("p-2.5 px-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs w-full flex flex-col xl:flex-row xl:items-center justify-between gap-3 text-xs", className)}>
      {/* 0. OPERATION TYPE BADGE */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
          OPERATION TYPE:
        </span>
        <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-700 flex items-center gap-1">
          📅 {contractBillingType || 'Monthly'}
        </span>
      </div>

      <div className="hidden xl:block h-6 w-px bg-slate-200 dark:bg-slate-800 shrink-0" />
      {/* 1. OPERATIONAL TRIP CATEGORY */}
      <div className="flex items-center gap-2 flex-wrap shrink-0">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1 shrink-0">
          <Tag className="w-3 h-3 text-brand" /> CATEGORY <span className="text-rose-500">*</span>:
        </span>
        <div className="flex items-center gap-1.5 flex-wrap" role="radiogroup" aria-label="Operational Trip Category">
          {CATEGORY_OPTIONS.map((cat) => {
            const isSelected = isCategorySelected(cat.id, contractRateCategory);
            const IconComp = cat.icon;
            return (
              <button
                key={cat.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => onUpdateRateCategory(cat.id)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border shadow-2xs focus:outline-none focus:ring-1 focus:ring-brand",
                  isSelected
                    ? "bg-brand text-white border-brand shadow-xs"
                    : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-orange-50/60 dark:hover:bg-orange-950/40 hover:border-orange-300"
                )}
              >
                <IconComp className={cn("w-3 h-3 shrink-0", isSelected ? "text-white" : "text-slate-400")} />
                <span>{cat.label}</span>
                {isSelected && <Check className="w-3 h-3 text-white ml-0.5 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Divider on XL screens */}
      <div className="hidden xl:block h-6 w-px bg-slate-200 dark:bg-slate-800 shrink-0" />

      {/* 2. VEHICLE CLASS & MATCH BADGE */}
      <div className="flex items-center gap-3 flex-wrap shrink-0 justify-between xl:justify-end flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1 shrink-0">
            <Truck className="w-3 h-3 text-brand" /> VEHICLE <span className="text-rose-500">*</span>:
          </span>
          <div className="flex items-center gap-1.5 flex-wrap" role="radiogroup" aria-label="Vehicle Class">
            {VEHICLE_OPTIONS.map((ton) => {
              const isSelected = isVehicleSelected(ton, contractVehicleType);
              return (
                <button
                  key={ton}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => onUpdateVehicleType && onUpdateVehicleType(ton)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border shadow-2xs focus:outline-none focus:ring-1 focus:ring-brand",
                    isSelected
                      ? "bg-brand text-white border-brand shadow-xs"
                      : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-orange-50/60 dark:hover:bg-orange-950/40 hover:border-orange-300"
                  )}
                >
                  <span>{ton}</span>
                  {isSelected && <Check className="w-3 h-3 text-white ml-0.5 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Commercial Match Status */}
        {matchStatus === 'matched' && (
          <span className="inline-flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-md text-[10px] shrink-0">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Route Matched
          </span>
        )}
        {matchStatus === 'unmatched' && (
          <span className="inline-flex items-center gap-1 font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-md text-[10px] shrink-0">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            No Route Match
          </span>
        )}
      </div>
    </div>
  );
}
