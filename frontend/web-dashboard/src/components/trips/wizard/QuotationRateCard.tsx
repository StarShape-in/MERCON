import React from 'react';
import { cn } from '@/lib/utils';
import { normalizeRateCategory, normalizeVehicleClass } from '@/utils/taxonomyRegistry';

export interface RateCardItem {
  id: string;
  quotation_number?: string;
  rate?: number;
  base_price?: number;
  vehicle_class?: string;
  vehicle_type?: string;
  vehicleClass?: string;
  rate_category?: string;
  line_type?: string;
  lineType?: string;
  billing_type?: string;
  billingType?: string;
  pricing_basis?: string;
  quotation_billing_type?: string;
  driver_payout?: number | string;
  driver_name?: string;
  recent_driver?: string;
  vehicle_plate?: string;
  recent_vehicle?: string;
  usage_count?: number;
  stops?: any[];
  route_origin?: string;
  origin_name?: string;
  originLocation?: { id?: string; name?: string };
  origin_city?: string;
  origin?: string;
  from?: string;
  route_destination?: string;
  destination_name?: string;
  destinationLocation?: { id?: string; name?: string };
  destination_city?: string;
  destination?: string;
  to?: string;
}

export function extractEndpointName(stop: any, fallbackFields: (string | undefined)[]): string {
  if (stop) {
    const stopName = stop.source_label || stop.location?.name || stop.location_name;
    if (stopName && typeof stopName === 'string' && stopName.trim()) {
      return stopName.trim();
    }
  }
  for (const field of fallbackFields) {
    if (field && typeof field === 'string' && field.trim()) {
      return field.trim();
    }
  }
  return '';
}

interface QuotationRateCardProps {
  rc: RateCardItem;
  idx: number;
  isSelected: boolean;
  contractRateCategory?: string;
  contractVehicleType?: string;
  onApplyRateCard: (rc: RateCardItem, targetCategory: string, targetVehicleClass: string, origName: string, destName: string, rateVal: number) => void;
  className?: string;
}

export const QuotationRateCard: React.FC<QuotationRateCardProps> = ({
  rc,
  idx,
  isSelected,
  contractRateCategory = '',
  contractVehicleType = '',
  onApplyRateCard,
  className,
}) => {
  const rateVal = rc.rate ?? rc.base_price ?? 0;
  const rawVClass = rc.vehicle_class || rc.vehicle_type || rc.vehicleClass || contractVehicleType;
  const vClass = normalizeVehicleClass(rawVClass);

  const rawCat = rc.rate_category || rc.line_type || rc.lineType || contractRateCategory;
  const rCat = normalizeRateCategory(rawCat);

  const cardBType = (rc.quotation_billing_type || rc.billing_type || rc.billingType || rc.pricing_basis || '').toLowerCase();
  const isMonthlyCard = cardBType.includes('monthly') || cardBType.includes('month');

  const firstStop = rc.stops && rc.stops.length > 0 ? rc.stops[0] : null;
  const lastStop = rc.stops && rc.stops.length > 1 ? rc.stops[rc.stops.length - 1] : firstStop;

  const origName = extractEndpointName(firstStop, [
    rc.route_origin,
    rc.origin_name,
    rc.originLocation?.name,
    rc.origin_city,
    rc.origin,
    rc.from,
  ]);

  const destName = extractEndpointName(lastStop, [
    rc.route_destination,
    rc.destination_name,
    rc.destinationLocation?.name,
    rc.destination_city,
    rc.destination,
    rc.to,
  ]);

  return (
    <button
      key={rc.id || idx}
      type="button"
      onClick={() => onApplyRateCard(rc, rCat, vClass, origName, destName, rateVal)}
      className={cn(
        "p-2.5 rounded-xl border transition-all text-left flex flex-col justify-between space-y-1.5 bg-white dark:bg-slate-800 shadow-2xs cursor-pointer select-none min-h-[110px]",
        isSelected
          ? isMonthlyCard
            ? "border-purple-600 ring-2 ring-purple-500/20 bg-purple-50/40 dark:bg-purple-950/20"
            : "border-brand ring-2 ring-brand/20 bg-orange-50/40 dark:bg-amber-950/20"
          : "border-slate-200 dark:border-slate-700 hover:border-brand/60 hover:bg-slate-50 dark:hover:bg-slate-700",
        className
      )}
    >
      {/* TOP ROW: QUOTATION ID + PRICE BADGE */}
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-600 shrink-0">
            {rc.quotation_number || `QUO-${idx + 1}`}
          </span>
          {isSelected && (
            <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-full border border-emerald-200 shrink-0">
              Applied ✓
            </span>
          )}
        </div>

        {/* PRICE BADGE */}
        <span className="text-xs font-black font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200/80 dark:border-emerald-900/60 shrink-0">
          SAR {Number(rateVal).toLocaleString()}{' '}
          <span className="text-[9px] font-bold font-sans text-slate-500">
            {isMonthlyCard ? '/mo' : '/trip'}
          </span>
        </span>
      </div>

      {/* HERO CENTER: PROMINENT LOCATION ROUTE LANE */}
      <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-1.5 my-0.5">
        <span className="text-xs font-black text-slate-900 dark:text-white truncate max-w-[45%]" title={origName || 'Origin'}>
          {origName || 'Origin'}
        </span>
        <span className="text-[#FA634E] font-bold text-xs shrink-0">→</span>
        <span className="text-xs font-black text-[#FA634E] truncate max-w-[45%]" title={destName || 'Destination'}>
          {destName || 'Destination'}
        </span>
      </div>

      {/* BOTTOM ROW: LINE TYPE & VEHICLE CLASS + ACTION */}
      <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold pt-0.5">
        <span className="truncate">
          {rCat} • <span className="text-slate-800 dark:text-slate-200">{vClass}</span>
        </span>
        <span
          className={cn(
            "font-black shrink-0",
            isSelected ? (isMonthlyCard ? "text-purple-600" : "text-brand") : "text-slate-400 hover:text-slate-600"
          )}
        >
          {isSelected ? 'Active' : 'Apply →'}
        </span>
      </div>
    </button>
  );
};

export default QuotationRateCard;
