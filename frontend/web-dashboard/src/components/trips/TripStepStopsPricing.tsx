import {
  Navigation,
  Calendar,
  Receipt,
  Loader2,
  AlertTriangle,
  DollarSign,
} from 'lucide-react';
import TripStopCard from '@/components/trips/TripStopCard';
import { Customer } from '@/services/customerService';
import { RateCard } from '@/services/rateCardService';
import { Location } from '@/services/locationService';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface TransitInfo {
  totalMinutes: number;
  durationString: string;
  isInvalid: boolean;
  isTight: boolean;
  isOptimal: boolean;
}

interface TripStepStopsPricingProps {
  pickupLocationId: string;
  pickupLocationName: string;
  pickupLat: number | null;
  pickupLng: number | null;
  pickupTime: string;
  pickupName: string;
  pickupAddress: string;
  dropoffLocationId: string;
  dropoffLocationName: string;
  dropoffLat: number | null;
  dropoffLng: number | null;
  dropoffTime: string;
  dropoffName: string;
  dropoffAddress: string;
  locations: Location[];
  selectedPickupLocation: Location | null;
  selectedDropoffLocation: Location | null;
  pickupDistanceKm: number | null;
  dropoffDistanceKm: number | null;
  transitInfo: TransitInfo | null;
  isLookingUpRate: boolean;
  matchedRateCard: RateCard | null;
  rateSource: 'customer' | 'standard' | null;
  laneHasNoRate: boolean;
  saveRateAs: 'standard' | 'customer' | 'none';
  selectedCustomer: Customer | null;
  rateSaveWarning: string | null;
  billingAmount: string;
  onPickupLocationIdChange: (id: string) => void;
  onPickupLocationNameChange: (name: string) => void;
  onPickupCoordinatesChange: (lat: number | null, lng: number | null) => void;
  onPickupTimeChange: (time: string) => void;
  onPickupNameChange: (name: string) => void;
  onPickupAddressChange: (address: string) => void;
  onDropoffLocationIdChange: (id: string) => void;
  onDropoffLocationNameChange: (name: string) => void;
  onDropoffCoordinatesChange: (lat: number | null, lng: number | null) => void;
  onDropoffTimeChange: (time: string) => void;
  onDropoffNameChange: (name: string) => void;
  onDropoffAddressChange: (address: string) => void;
  onApplyDropoffOffset: (hours: number, setEod?: boolean) => void;
  onSaveRateAsChange: (val: 'standard' | 'customer' | 'none') => void;
  onBillingAmountChange: (val: string) => void;
  onAdjustPrice: (amount: number) => void;
}

export default function TripStepStopsPricing({
  pickupLocationId,
  pickupLocationName,
  pickupLat,
  pickupLng,
  pickupTime,
  pickupName,
  pickupAddress,
  dropoffLocationId,
  dropoffLocationName,
  dropoffLat,
  dropoffLng,
  dropoffTime,
  dropoffName,
  dropoffAddress,
  locations,
  selectedPickupLocation,
  selectedDropoffLocation,
  pickupDistanceKm,
  dropoffDistanceKm,
  transitInfo,
  isLookingUpRate,
  matchedRateCard,
  rateSource,
  laneHasNoRate,
  saveRateAs,
  selectedCustomer,
  rateSaveWarning,
  billingAmount,
  onPickupLocationIdChange,
  onPickupLocationNameChange,
  onPickupCoordinatesChange,
  onPickupTimeChange,
  onPickupNameChange,
  onPickupAddressChange,
  onDropoffLocationIdChange,
  onDropoffLocationNameChange,
  onDropoffCoordinatesChange,
  onDropoffTimeChange,
  onDropoffNameChange,
  onDropoffAddressChange,
  onApplyDropoffOffset,
  onSaveRateAsChange,
  onBillingAmountChange,
  onAdjustPrice,
}: TripStepStopsPricingProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Navigation className="w-4 h-4 text-[#E8450F]" /> Route Stops, SLA &amp; Rate Calculation
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Define origin and destination locations, expected schedule arrival, and billing rates.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Pickup Stop Card */}
        <TripStopCard
          title="Pickup Stop (Origin)"
          locationId={pickupLocationId}
          onLocationIdChange={onPickupLocationIdChange}
          locationName={pickupLocationName}
          onLocationNameChange={onPickupLocationNameChange}
          lat={pickupLat}
          lng={pickupLng}
          onCoordinatesChange={onPickupCoordinatesChange}
          time={pickupTime}
          onTimeChange={onPickupTimeChange}
          name={pickupName}
          onNameChange={onPickupNameChange}
          address={pickupAddress}
          onAddressChange={onPickupAddressChange}
          locations={locations}
          selectedLocation={selectedPickupLocation}
          distanceKm={pickupDistanceKm}
        />

        {/* Dropoff Stop Card */}
        <TripStopCard
          title="Dropoff Stop (Destination)"
          locationId={dropoffLocationId}
          onLocationIdChange={onDropoffLocationIdChange}
          locationName={dropoffLocationName}
          onLocationNameChange={onDropoffLocationNameChange}
          lat={dropoffLat}
          lng={dropoffLng}
          onCoordinatesChange={onDropoffCoordinatesChange}
          time={dropoffTime}
          onTimeChange={onDropoffTimeChange}
          name={dropoffName}
          onNameChange={onDropoffNameChange}
          address={dropoffAddress}
          onAddressChange={onDropoffAddressChange}
          locations={locations}
          selectedLocation={selectedDropoffLocation}
          distanceKm={dropoffDistanceKm}
        />
      </div>

      {/* Schedule SLA Presets Card */}
      <Card className="rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
              Dropoff SLA Delivery Presets
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => onApplyDropoffOffset(4)}
              className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-slate-300 shadow-2xs cursor-pointer"
            >
              +4 Hours SLA
            </button>
            <button
              type="button"
              onClick={() => onApplyDropoffOffset(8)}
              className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-slate-300 shadow-2xs cursor-pointer"
            >
              +8 Hours SLA
            </button>
            <button
              type="button"
              onClick={() => onApplyDropoffOffset(24)}
              className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-slate-300 shadow-2xs cursor-pointer"
            >
              +24 Hours (Next Day)
            </button>
            <button
              type="button"
              onClick={() => onApplyDropoffOffset(0, true)}
              className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-slate-300 shadow-2xs cursor-pointer"
            >
              End of Day (23:59)
            </button>
          </div>
        </div>

        {transitInfo && (
          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-semibold">Calculated Transit Window:</span>
            <Badge
              className={cn(
                'font-extrabold text-xs',
                transitInfo.isInvalid
                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-200'
                  : transitInfo.isTight
                  ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-200'
                  : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-200'
              )}
            >
              {transitInfo.isInvalid ? 'Invalid Schedule (Delivery before pickup)' : transitInfo.durationString}
            </Badge>
          </div>
        )}
      </Card>

      {/* Rate Calculation & Billing Amount Card */}
      <Card className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-indigo-600" /> Lane Rate Card &amp; Billing
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Matched contract rate for {pickupLocationName || 'Origin'} → {dropoffLocationName || 'Destination'}
            </p>
          </div>

          {isLookingUpRate && (
            <div className="flex items-center gap-1.5 text-xs text-indigo-600 font-semibold animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Looking up contract rate...
            </div>
          )}
        </div>

        {matchedRateCard && (
          <div className="rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 p-3 border border-emerald-200/80 dark:border-emerald-900 flex items-center justify-between text-xs">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-emerald-900 dark:text-emerald-200">
                  Contract Rate Found: SAR {matchedRateCard.base_price.toLocaleString()}
                </span>
                <Badge className="bg-emerald-600 text-white text-[10px] uppercase tracking-wider">
                  {rateSource === 'customer' ? 'Customer Contract' : 'Standard Rate Card'}
                </Badge>
              </div>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                Applied automatically to trip billing amount.
              </p>
            </div>
          </div>
        )}

        {laneHasNoRate && (
          <div className="rounded-xl bg-amber-50/80 dark:bg-amber-950/30 p-3 border border-amber-200/80 dark:border-amber-900 space-y-2 text-xs">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-900 dark:text-amber-200">
                  No contract rate found for {pickupLocationName || 'origin'} → {dropoffLocationName || 'destination'}
                </p>
                <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                  Enter the billing price below and choose how to save it for future dispatches.
                </p>
              </div>
            </div>

            <div className="space-y-1 pl-6 pt-1">
              {([
                { key: 'standard', label: 'Save as Standard Rate Card', hint: 'Applies to all customers on this lane' },
                { key: 'customer', label: `Save for ${selectedCustomer?.name || 'this customer'} only`, hint: 'Overrides standard rate for customer' },
                { key: 'none', label: 'One-off price (Do not save rate card)', hint: 'Applies to this trip only' },
              ] as const).map((opt) => (
                <label key={opt.key} className="flex items-start gap-2 cursor-pointer text-xs">
                  <input
                    type="radio"
                    name="save_rate_as"
                    checked={saveRateAs === opt.key}
                    onChange={() => onSaveRateAsChange(opt.key)}
                    className="mt-0.5 accent-[#E8450F]"
                  />
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{opt.label}</span>
                    <span className="block text-[10px] text-slate-500">{opt.hint}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {rateSaveWarning && (
          <div className="rounded-lg bg-rose-50 border border-rose-200 p-2 text-xs font-semibold text-rose-700">
            {rateSaveWarning}
          </div>
        )}

        {/* Billing Amount Input & Quick Adjustments */}
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <Label htmlFor="modal_billing_amount" className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Billing Amount (SAR)
            </Label>
            {billingAmount && (
              <span className="text-xs font-mono font-extrabold text-[#E8450F]">
                Total: SAR {Number(billingAmount).toLocaleString()}
              </span>
            )}
          </div>

          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
              SAR
            </span>
            <Input
              id="modal_billing_amount"
              type="number"
              step="0.01"
              min="0"
              value={billingAmount}
              onChange={(e) => onBillingAmountChange(e.target.value)}
              placeholder={matchedRateCard ? String(matchedRateCard.base_price) : 'e.g. 3500.00'}
              className="h-10 pl-12 rounded-xl font-mono text-sm font-bold border-slate-200 dark:border-slate-800"
            />
          </div>

          {/* Quick Adjustment Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">
              Quick Add:
            </span>
            <button
              type="button"
              onClick={() => onAdjustPrice(100)}
              className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
            >
              +100 SAR
            </button>
            <button
              type="button"
              onClick={() => onAdjustPrice(250)}
              className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
            >
              +250 SAR
            </button>
            <button
              type="button"
              onClick={() => onAdjustPrice(500)}
              className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
            >
              +500 SAR
            </button>
            <button
              type="button"
              onClick={() => onBillingAmountChange('2500')}
              className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
            >
              2.5k SAR
            </button>
            <button
              type="button"
              onClick={() => onBillingAmountChange('3500')}
              className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
            >
              3.5k SAR
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
