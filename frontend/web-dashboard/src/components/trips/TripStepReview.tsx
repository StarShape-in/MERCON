import React from 'react';
import { format, parseISO, isValid } from 'date-fns';
import {
  User,
  Navigation,
  Clock,
  Truck,
  Receipt,
  Pencil,
  Building2,
  Sparkles,
  ShieldCheck,
  DollarSign,
} from 'lucide-react';
import { Customer } from '@/services/customerService';
import { Driver } from '@/services/driverService';
import { Vehicle } from '@/services/vehicleService';
import { RateCard } from '@/services/rateCardService';
import { EstimatedDeliveryResult } from '@/hooks/useEstimatedDelivery';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TripStepReviewProps {
  selectedCustomer: Customer | null;
  pickupName: string;
  dropoffName: string;
  truckArrivalTime: string;
  estimatedDelivery: EstimatedDeliveryResult;
  isThirdParty: boolean;
  selectedDriver: Driver | null;
  selectedVehicle: Vehicle | null;
  assignDriverLater: boolean;
  assignVehicleLater: boolean;
  thirdPartyProviderName: string;
  thirdPartyDriverName: string;
  thirdPartyVehiclePlate: string;
  billingAmount: string;
  tripCharges?: string;
  matchedRateCard: RateCard | null;
  onEditStep: (step: 1 | 2 | 3 | 4) => void;
}

function ReviewSection({
  icon,
  title,
  step,
  onEditStep,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  step: 1 | 2 | 3 | 4;
  onEditStep: (step: 1 | 2 | 3 | 4) => void;
  children: React.ReactNode;
}) {
  return (
    <Card className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-2xs">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
          {icon} {title}
        </h4>
        <button
          type="button"
          onClick={() => onEditStep(step)}
          className="text-[11px] font-bold text-brand hover:underline flex items-center gap-1 cursor-pointer"
        >
          <Pencil className="w-3 h-3" /> Edit
        </button>
      </div>
      {children}
    </Card>
  );
}

function Row({ label, value, valueClassName }: { label: string; value: React.ReactNode; valueClassName?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs py-0.5">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className={cn('font-semibold text-slate-900 dark:text-slate-100 text-right truncate', valueClassName)}>
        {value}
      </span>
    </div>
  );
}

export default function TripStepReview({
  selectedCustomer,
  pickupName,
  dropoffName,
  truckArrivalTime,
  estimatedDelivery,
  isThirdParty,
  selectedDriver,
  selectedVehicle,
  assignDriverLater,
  assignVehicleLater,
  thirdPartyProviderName,
  thirdPartyDriverName,
  thirdPartyVehiclePlate,
  billingAmount,
  tripCharges,
  matchedRateCard,
  onEditStep,
}: TripStepReviewProps) {
  const truckArrivalDate = truckArrivalTime ? parseISO(truckArrivalTime) : null;
  const deliveryDate =
    estimatedDelivery.status === 'ready' && estimatedDelivery.estimatedDeliveryLocal
      ? parseISO(estimatedDelivery.estimatedDeliveryLocal)
      : null;
  const totalBilling = billingAmount && !isNaN(parseFloat(billingAmount)) ? parseFloat(billingAmount) : (matchedRateCard?.base_price ?? null);
  const driverTripCharge = matchedRateCard?.default_trip_charge != null ? matchedRateCard.default_trip_charge : (tripCharges && !isNaN(parseFloat(tripCharges)) ? parseFloat(tripCharges) : null);

  return (
    <div className="space-y-3.5 animate-in fade-in-50 duration-200">
      <div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-brand" /> Review Trip
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Verify everything below before creating the trip. Use Edit to jump back to any step.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        <ReviewSection icon={<User className="w-3.5 h-3.5 text-brand" />} title="Customer" step={1} onEditStep={onEditStep}>
          <Row label="Account" value={selectedCustomer?.name || 'Not selected'} />
          {selectedCustomer?.company_name && <Row label="Company" value={selectedCustomer.company_name} />}
        </ReviewSection>

        <ReviewSection icon={<Navigation className="w-3.5 h-3.5 text-brand" />} title="Route" step={2} onEditStep={onEditStep}>
          <div className="flex items-center gap-2 text-xs font-bold py-0.5">
            <span className="px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 truncate max-w-[45%]">
              {pickupName || 'Pickup'}
            </span>
            <Navigation className="w-3 h-3 text-slate-400 shrink-0 rotate-90" />
            <span className="px-2 py-0.5 rounded-lg bg-orange-100 dark:bg-orange-950/80 text-orange-800 dark:text-orange-300 truncate max-w-[45%]">
              {dropoffName || 'Dropoff'}
            </span>
          </div>
          {estimatedDelivery.status === 'ready' && estimatedDelivery.travel && (
            <Row label="Distance" value={`${estimatedDelivery.travel.distanceKm.toLocaleString()} km`} />
          )}
        </ReviewSection>

        <ReviewSection icon={<Clock className="w-3.5 h-3.5 text-brand" />} title="Timing" step={2} onEditStep={onEditStep}>
          <Row
            label="Truck Arrival Time"
            value={truckArrivalDate && isValid(truckArrivalDate) ? format(truckArrivalDate, 'MMM d, h:mm a') : 'Not set'}
          />
          <Row
            label="Google Maps Travel Time"
            value={estimatedDelivery.status === 'ready' && estimatedDelivery.travel ? estimatedDelivery.travel.durationText : estimatedDelivery.status === 'unavailable' ? 'Unavailable' : 'Pending'}
          />
          <Row
            label="Estimated Delivery"
            value={deliveryDate && isValid(deliveryDate) ? format(deliveryDate, 'MMM d, h:mm a') : 'Not calculated'}
            valueClassName="text-emerald-700 dark:text-emerald-300"
          />
        </ReviewSection>

        <ReviewSection icon={<Truck className="w-3.5 h-3.5 text-brand" />} title="Assignment" step={3} onEditStep={onEditStep}>
          {isThirdParty ? (
            <>
              <Row label="Fleet" value={<Badge className="bg-purple-600 text-white text-[10px] px-1.5 py-0">Third-Party</Badge>} />
              <Row label="Provider" value={thirdPartyProviderName || 'Not selected'} />
              <Row label="Driver" value={thirdPartyDriverName || 'Not set'} />
              <Row label="Vehicle Plate" value={thirdPartyVehiclePlate || 'Not set'} />
            </>
        <ReviewSection icon={<MapPin className="w-3.5 h-3.5 text-brand" />} title="Route" step={2} onEditStep={onEditStep}>
          <Row label="Pickup" value={pickupLocationName || 'Not selected'} />
          <Row label="Dropoff" value={dropoffLocationName || 'Not selected'} />
        </ReviewSection>
      </div>

      <ReviewSection icon={<Receipt className="w-3.5 h-3.5 text-brand" />} title="Commercials" step={4} onEditStep={onEditStep}>
        {matchedRateCard && (
          <div className="mb-2 text-[11px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-lg border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Quotation Matched: {matchedRateCard.name} ({matchedRateCard.line_type || matchedRateCard.rate_category || 'Standard'})</span>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center pt-1">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
              <DollarSign className="w-3 h-3 text-emerald-600" /> Billing Rate
            </span>
            <span className="font-extrabold text-base text-emerald-700 dark:text-emerald-400 block">
              {totalBilling !== null ? `SAR ${totalBilling.toLocaleString()}` : 'Not set'}
            </span>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
              <DollarSign className="w-3 h-3 text-indigo-600" /> Driver Charge
            </span>
            <span className="font-extrabold text-base text-indigo-700 dark:text-indigo-400 block">
              {driverTripCharge !== null ? `SAR ${driverTripCharge.toLocaleString()}` : 'Not set'}
            </span>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
              <DollarSign className="w-3 h-3 text-blue-600" /> Balance
            </span>
            <span className={`font-extrabold text-base block ${balance !== null && balance >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-rose-600'}`}>
              {balance !== null ? `SAR ${balance.toLocaleString()}` : 'Not set'}
            </span>
          </div>
        </div>
      </ReviewSection>
    </div>
  );
}
