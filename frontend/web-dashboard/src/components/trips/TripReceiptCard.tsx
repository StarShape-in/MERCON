import React from 'react';
import { Truck, MapPin } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { formatInDeploymentTz } from '@/lib/datetime';

interface TripReceiptCardProps {
  trip: any;
  pickupStop?: any;
  dropoffStop?: any;
  pickupName: string;
  dropoffName: string;
  baseRate: number;
  chargesTotal: number;
  driverCharge: number;
  totalAmount: number;
  tz: string;
  onEditCharges?: () => void;
}

function resolveFileUrl(url?: string | null): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return trimmed;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  if (!trimmed.startsWith('/') && trimmed.length > 30 && !trimmed.includes(' ')) {
    return `data:image/png;base64,${trimmed}`;
  }
  const base = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '') : '';
  return `${base}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
}

export default function TripReceiptCard({
  trip,
  pickupStop,
  dropoffStop,
  pickupName,
  dropoffName,
  baseRate,
  chargesTotal,
  driverCharge,
  totalAmount,
  tz,
  onEditCharges,
}: TripReceiptCardProps) {
  const refId = trip.ref_id || trip.id || 'TRP-0234';
  const customerName = trip.customer?.name || 'iMILE DELIVERY';
  const customerLogo = (trip.customer as any)?.avatar_url || (trip.customer as any)?.logo_url;

  const driverName = trip.is_third_party
    ? trip.third_party_driver_name || '3PL Driver'
    : trip.driver
    ? `${trip.driver.first_name} ${trip.driver.last_name}`
    : 'ABU BAKAR';

  const driverPhone = trip.driver?.phone_primary || '+966 55 027 0702';
  const driverAvatar = (trip.driver as any)?.avatar_url;

  const vehiclePlate = trip.is_third_party
    ? trip.third_party_vehicle_plate || 'Rented Truck'
    : trip.vehicle?.plate_number || 'ESA-4244';

  const vehicleType = trip.vehicle?.asset_type || 'Box Truck';

  const tripDateStr = trip.createdAt
    ? formatInDeploymentTz(trip.createdAt, tz, 'dd MMM yyyy')
    : '02 Sep 2026';

  const pickupTimeStr = pickupStop?.actual_arrival
    ? formatInDeploymentTz(pickupStop.actual_arrival, tz, 'hh:mm a')
    : pickupStop?.planned_arrival
    ? formatInDeploymentTz(pickupStop.planned_arrival, tz, 'hh:mm a')
    : '08:53 AM';

  const dropoffTimeStr = dropoffStop?.actual_arrival
    ? formatInDeploymentTz(dropoffStop.actual_arrival, tz, 'hh:mm a')
    : '—';

  return (
    <div className="relative w-full flex flex-col items-center select-none font-sans drop-shadow-md">
      {/* Sawtooth Perforated Top Edge */}
      <div className="w-full overflow-hidden leading-none h-3 -mb-[1px]">
        <svg
          viewBox="0 0 300 12"
          preserveAspectRatio="none"
          className="w-full h-3 fill-[#FFFFFF] text-transparent"
        >
          <path d="M 0 12 L 0 6 L 6 0 L 12 6 L 18 0 L 24 6 L 30 0 L 36 6 L 42 0 L 48 6 L 54 0 L 60 6 L 66 0 L 72 6 L 78 0 L 84 6 L 90 0 L 96 6 L 102 0 L 108 6 L 114 0 L 120 6 L 126 0 L 132 6 L 138 0 L 144 6 L 150 0 L 156 6 L 162 0 L 168 6 L 174 0 L 180 6 L 186 0 L 192 6 L 198 0 L 204 6 L 210 0 L 216 6 L 222 0 L 228 6 L 234 0 L 240 6 L 246 0 L 252 6 L 258 0 L 264 6 L 270 0 L 276 6 L 282 0 L 288 6 L 294 0 L 300 6 L 300 12 Z" />
        </svg>
      </div>

      {/* Main Receipt Body */}
      <div className="w-full bg-[#FFFFFF] border-x border-[#EAE9E6] px-4 py-3 flex flex-col text-[#2A2929] text-[11px] leading-tight space-y-2.5">
        {/* Company Header */}
        <div className="flex flex-col items-center justify-center text-center pt-0.5 pb-1">
          <div className="w-10 h-10 rounded-full bg-[#1E40AF] text-white flex items-center justify-center font-bold text-xs shadow-xs mb-1.5 overflow-hidden">
            {customerLogo ? (
              <img src={resolveFileUrl(customerLogo)} alt={customerName} className="w-full h-full object-cover" />
            ) : (
              <span className="tracking-tight italic font-black text-[13px]">iMile</span>
            )}
          </div>
          <h2 className="font-extrabold text-[13px] tracking-tight uppercase text-[#1F2937]">
            {customerName}
          </h2>
          <p className="text-[9.5px] text-[#6B7280] font-medium tracking-wide">
            Logistics & Supply Chain
          </p>
        </div>

        {/* Dotted Divider */}
        <div className="w-full border-b border-dashed border-[#D1D5DB]" />

        {/* TRIP SUMMARY */}
        <div className="space-y-1">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#4B5563]">
            TRIP SUMMARY
          </h3>
          <div className="space-y-0.5 text-[11px]">
            <div className="flex justify-between">
              <span className="text-[#6B7280]">Trip ID</span>
              <span className="font-mono font-semibold text-[#1F2937]">{refId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B7280]">Route</span>
              <span className="font-medium text-[#1F2937] text-right truncate max-w-[140px]">
                {pickupName} → {dropoffName}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B7280]">Trip Type</span>
              <span className="font-medium text-[#1F2937]">
                {trip.trip_type === 'round_trip' ? 'Round Trip' : 'One Way Trip'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B7280]">Date</span>
              <span className="font-medium text-[#1F2937]">{tripDateStr}</span>
            </div>
          </div>
        </div>

        {/* Dotted Divider */}
        <div className="w-full border-b border-dashed border-[#D1D5DB]" />

        {/* Driver & Vehicle */}
        <div className="space-y-2">
          {/* Driver */}
          <div className="flex items-center gap-2.5">
            <Avatar className="w-8 h-8 rounded-full border border-[#E5E7EB] bg-slate-100 shrink-0">
              {driverAvatar && <AvatarImage src={resolveFileUrl(driverAvatar)} alt={driverName} />}
              <AvatarFallback className="text-[10px] font-bold bg-slate-200 text-slate-700">
                {driverName.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <span className="text-[9px] uppercase font-bold text-[#9CA3AF] block leading-none">Driver</span>
              <p className="font-bold text-[11.5px] text-[#1F2937] truncate mt-0.5">{driverName}</p>
              <p className="text-[10px] text-[#6B7280] font-mono">{driverPhone}</p>
            </div>
          </div>

          {/* Vehicle */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-100 border border-[#E5E7EB] flex items-center justify-center shrink-0 text-[#4B5563]">
              <Truck size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[9px] uppercase font-bold text-[#9CA3AF] block leading-none">Vehicle</span>
              <p className="font-bold text-[11.5px] text-[#1F2937] truncate mt-0.5">{vehiclePlate}</p>
              <p className="text-[10px] text-[#6B7280]">{vehicleType}</p>
            </div>
          </div>
        </div>

        {/* Dotted Divider */}
        <div className="w-full border-b border-dashed border-[#D1D5DB]" />

        {/* Origin & Destination Timeline */}
        <div className="relative pl-1 space-y-2 py-0.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shrink-0" />
              <span className="font-bold text-[11px] text-[#1F2937] truncate max-w-[120px]">{pickupName}</span>
            </div>
            <span className="font-mono text-[10px] text-[#4B5563] font-semibold">{pickupTimeStr}</span>
          </div>

          <div className="flex items-center pl-1 text-[#9CA3AF] -my-1 text-[10px]">
            <span className="border-l border-dashed border-[#9CA3AF] h-3 ml-0.5 mr-2" />
            <span>↓</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin size={11} className="text-rose-500 fill-rose-500 shrink-0" />
              <span className="font-bold text-[11px] text-[#1F2937] truncate max-w-[120px]">{dropoffName}</span>
            </div>
            <span className="font-mono text-[10px] text-[#6B7280]">{dropoffTimeStr}</span>
          </div>
        </div>

        {/* Dotted Divider */}
        <div className="w-full border-b border-dashed border-[#D1D5DB]" />

        {/* CHARGES Breakdown */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#4B5563]">
              CHARGES
            </h3>
            {onEditCharges && (
              <button
                type="button"
                onClick={onEditCharges}
                className="text-[9px] text-[#FA634E] hover:underline font-semibold cursor-pointer"
              >
                + Add / Edit
              </button>
            )}
          </div>
          <div className="space-y-1 pt-0.5 text-[11px]">
            <div className="flex justify-between">
              <span className="text-[#6B7280]">Base Rate (Contract)</span>
              <span className="font-mono font-medium text-[#1F2937]">
                SAR {baseRate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B7280]">Trip Charge (Driver)</span>
              <span className="font-mono font-medium text-[#1F2937]">
                SAR {driverCharge.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B7280]">Additional Charges</span>
              <span className="font-mono font-medium text-[#1F2937]">
                SAR {chargesTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* Solid Total Line */}
            <div className="pt-2 border-t border-[#1F2937] flex justify-between items-baseline">
              <span className="font-extrabold text-[12px] tracking-tight uppercase text-[#1F2937]">
                TOTAL AMOUNT
              </span>
              <span className="font-mono font-black text-[15px] text-[#059669]">
                SAR {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex justify-between pt-0.5 text-[10.5px]">
              <span className="text-[#6B7280]">Driver Payout</span>
              <span className="font-mono font-semibold text-[#4B5563]">
                SAR {driverCharge.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Dotted Divider */}
        <div className="w-full border-b border-dashed border-[#D1D5DB]" />

        {/* Bottom Script & Barcode */}
        <div className="flex flex-col items-center justify-center pt-0.5 pb-0 text-center space-y-1">
          <p className="italic font-serif text-[13px] text-[#4B5563] tracking-wide" style={{ fontFamily: 'Georgia, serif' }}>
            Thank you!
          </p>

          {/* Barcode SVG */}
          <div className="flex flex-col items-center">
            <svg viewBox="0 0 160 26" className="w-36 h-6 text-[#1F2937] fill-current">
              <rect x="0" y="0" width="3" height="26" />
              <rect x="5" y="0" width="1" height="26" />
              <rect x="8" y="0" width="2" height="26" />
              <rect x="13" y="0" width="4" height="26" />
              <rect x="19" y="0" width="2" height="26" />
              <rect x="23" y="0" width="1" height="26" />
              <rect x="26" y="0" width="3" height="26" />
              <rect x="32" y="0" width="2" height="26" />
              <rect x="36" y="0" width="4" height="26" />
              <rect x="42" y="0" width="1" height="26" />
              <rect x="45" y="0" width="3" height="26" />
              <rect x="51" y="0" width="2" height="26" />
              <rect x="55" y="0" width="1" height="26" />
              <rect x="58" y="0" width="4" height="26" />
              <rect x="64" y="0" width="2" height="26" />
              <rect x="68" y="0" width="3" height="26" />
              <rect x="73" y="0" width="1" height="26" />
              <rect x="76" y="0" width="4" height="26" />
              <rect x="82" y="0" width="2" height="26" />
              <rect x="86" y="0" width="3" height="26" />
              <rect x="91" y="0" width="1" height="26" />
              <rect x="94" y="0" width="2" height="26" />
              <rect x="98" y="0" width="4" height="26" />
              <rect x="104" y="0" width="2" height="26" />
              <rect x="108" y="0" width="1" height="26" />
              <rect x="111" y="0" width="3" height="26" />
              <rect x="116" y="0" width="2" height="26" />
              <rect x="120" y="0" width="4" height="26" />
              <rect x="126" y="0" width="1" height="26" />
              <rect x="129" y="0" width="3" height="26" />
              <rect x="134" y="0" width="2" height="26" />
              <rect x="138" y="0" width="1" height="26" />
              <rect x="141" y="0" width="4" height="26" />
              <rect x="147" y="0" width="2" height="26" />
              <rect x="151" y="0" width="3" height="26" />
              <rect x="156" y="0" width="4" height="26" />
            </svg>
            <span className="font-mono text-[9px] tracking-widest text-[#6B7280] uppercase mt-0.5">
              {refId}
            </span>
          </div>
        </div>
      </div>

      {/* Sawtooth Perforated Bottom Edge */}
      <div className="w-full overflow-hidden leading-none h-3 -mt-[1px]">
        <svg
          viewBox="0 0 300 12"
          preserveAspectRatio="none"
          className="w-full h-3 fill-[#FFFFFF] text-transparent"
        >
          <path d="M 0 0 L 0 6 L 6 12 L 12 6 L 18 12 L 24 6 L 30 12 L 36 6 L 42 12 L 48 6 L 54 12 L 60 6 L 66 12 L 72 6 L 78 12 L 84 6 L 90 12 L 96 6 L 102 12 L 108 6 L 114 12 L 120 6 L 126 12 L 132 6 L 138 12 L 144 6 L 150 12 L 156 6 L 162 12 L 168 6 L 174 12 L 180 6 L 186 12 L 192 6 L 198 12 L 204 6 L 210 12 L 216 6 L 222 12 L 228 6 L 234 12 L 240 6 L 246 12 L 252 6 L 258 12 L 264 6 L 270 12 L 276 6 L 282 12 L 288 6 L 294 12 L 300 6 L 300 0 Z" />
        </svg>
      </div>
    </div>
  );
}
