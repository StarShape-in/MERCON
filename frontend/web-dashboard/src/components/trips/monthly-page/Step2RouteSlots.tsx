import { MapPin, Plus, Trash2, Clock, RefreshCw, Tag, Check, CheckCircle2, ArrowRight, Sparkles, Truck, Moon, RotateCcw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import LocationCombobox from '@/components/quotations/LocationCombobox';
import { RateCategorySelect } from '@/components/quotations/RateCategorySelect';
import TransitTimeBadge from '@/components/trips/TransitTimeBadge';
import { RateCard } from '@/services/rateCardService';
import { ContractSlot } from './types';
import { cn, isUuid } from '@/lib/utils';

import ServiceVehicleSelector from '@/components/trips/ServiceVehicleSelector';
import { DateTimePicker } from '@/components/ui/date-time-picker';

interface Step2RouteSlotsProps {
  contractCustomer: string;
  contractRateCategory: string;
  contractVehicleType: string;
  contractBillingType: string;
  contractSlots: ContractSlot[];
  onUpdateRateCategory: (cat: string) => void;
  onUpdateVehicleType?: (veh: string) => void;
  onUpdateBillingType?: (billingType: string) => void;
  onAddSlot: () => void;
  onRemoveSlot: (id: string) => void;
  onUpdateSlot: (id: string, updates: Partial<ContractSlot>) => void;
  onAddSlotIntermediate: (slotId: string) => void;
  onRemoveSlotIntermediate: (slotId: string, idx: number) => void;
  onUpdateSlotIntermediate: (slotId: string, idx: number, val: string) => void;
  onUpdateSlotIntermediateFee: (slotId: string, idx: number, val: string) => void;
  onAddSlotReturnIntermediate: (slotId: string) => void;
  onRemoveSlotReturnIntermediate: (slotId: string, idx: number) => void;
  onUpdateSlotReturnIntermediate: (slotId: string, idx: number, val: string) => void;
  onUpdateSlotReturnIntermediateFee: (slotId: string, idx: number, val: string) => void;
  getMatchingRateCard: (origin?: string, destination?: string, vehicleType?: string, rateCategory?: string, billingType?: string) => RateCard | null;
  getAvailableRateCardsForLane?: (origin?: string, destination?: string, originLocId?: string | null, destLocId?: string | null) => RateCard[];
  isStep2Valid: boolean;
  onNext: () => void;
  onBack: () => void;
}

const isRoundTripCategory = (cat: string) => Boolean(cat) && cat.toLowerCase().includes('round');

const CATEGORY_OPTIONS = [
  {
    id: 'SINGLE_TRIP',
    label: 'Single Trip',
    icon: ArrowRight,
    active: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-400/40',
    inactive: 'bg-blue-50/90 text-blue-800 border border-blue-200 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
  },
  {
    id: 'ROUND_TRIP',
    label: 'Round Trip',
    icon: RefreshCw,
    active: 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/25 ring-2 ring-emerald-400/40',
    inactive: 'bg-emerald-50/90 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
  },
  {
    id: '10_HRS',
    label: '10 Hours Shift',
    icon: Clock,
    active: 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/25 ring-2 ring-amber-400/40',
    inactive: 'bg-amber-50/90 text-amber-900 border border-amber-200 hover:bg-amber-100 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
  },
  {
    id: '12_HRS',
    label: '12 Hours Shift',
    icon: Sparkles,
    active: 'bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-md shadow-purple-500/25 ring-2 ring-purple-400/40',
    inactive: 'bg-purple-50/90 text-purple-800 border border-purple-200 hover:bg-purple-100 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800',
  },
];

export default function Step2RouteSlots({
  contractCustomer,
  contractRateCategory,
  contractVehicleType,
  contractBillingType,
  contractSlots,
  onUpdateRateCategory,
  onUpdateVehicleType,
  onUpdateBillingType,
  onAddSlot,
  onRemoveSlot,
  onUpdateSlot,
  onAddSlotIntermediate,
  onRemoveSlotIntermediate,
  onUpdateSlotIntermediate,
  onUpdateSlotIntermediateFee,
  onAddSlotReturnIntermediate,
  onRemoveSlotReturnIntermediate,
  onUpdateSlotReturnIntermediate,
  onUpdateSlotReturnIntermediateFee,
  getMatchingRateCard,
  getAvailableRateCardsForLane,
}: Step2RouteSlotsProps) {
  const isRoundTrip = isRoundTripCategory(contractRateCategory);

  return (
    <div className="w-full space-y-4 animate-fade-in py-1">
      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-2.5 w-full">
        <div className="space-y-0.5">
          <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-brand" />
            Route Locations &amp; Trip Slots ({contractSlots.length})
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Configure origin/destination stops, intermediate stops, times, and pricing model.
          </p>
        </div>
      </div>

      <ServiceVehicleSelector
        contractRateCategory={contractRateCategory}
        contractVehicleType={contractVehicleType}
        contractBillingType={contractBillingType}
        onUpdateRateCategory={onUpdateRateCategory}
        onUpdateVehicleType={onUpdateVehicleType}
        matchStatus={
          contractSlots.some(s => s.origin && s.destination)
            ? contractSlots.some(s => Boolean(s.rateMatched || getMatchingRateCard(s.origin, s.destination, contractVehicleType, contractRateCategory, contractBillingType)))
              ? 'matched'
              : 'unmatched'
            : 'idle'
        }
      />

      {/* Slots Section */}
      <div className="space-y-3 w-full">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Active Route Slots ({contractSlots.length})
          </span>
          <Button
            type="button"
            onClick={onAddSlot}
            className="h-7 px-3 rounded-lg bg-orange-50 text-brand border border-orange-200 hover:bg-orange-100 text-xs font-bold dark:bg-orange-950/40 dark:border-orange-800"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            + Add Slot
          </Button>
        </div>

        {contractSlots.map((slot, slotIdx) => {
          const matchedRateCard = getMatchingRateCard(
            slot.origin,
            slot.destination,
            contractVehicleType,
            contractRateCategory,
            contractBillingType
          );

          return (
            <div
              key={slot.id}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-3 w-full"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                    Trip Slot #{slotIdx + 1}
                  </span>
                  {slot.isOvernight && (
                    <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                      <Moon className="w-3 h-3 fill-indigo-600" /> Overnight (+1 Day)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {isRoundTrip ? (
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        className="h-7 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 gap-1 px-2.5 shadow-2xs"
                        onClick={() => onAddSlotIntermediate(slot.id)}
                      >
                        <Plus className="w-3.5 h-3.5 text-white" />
                        + Add Leg 1 Stop
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="h-7 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 gap-1 px-2.5 shadow-2xs"
                        onClick={() => onAddSlotReturnIntermediate(slot.id)}
                      >
                        <Plus className="w-3.5 h-3.5 text-white" />
                        + Add Leg 2 Stop
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 text-xs font-bold text-white bg-brand hover:bg-[#d13d0d] gap-1 px-2.5"
                      onClick={() => onAddSlotIntermediate(slot.id)}
                    >
                      <Plus className="w-3.5 h-3.5 text-white" />
                      Add Stop
                    </Button>
                  )}
                  {contractSlots.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onRemoveSlot(slot.id)}
                      className="text-slate-400 hover:text-rose-600 transition-colors p-0.5"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Round Trip vs 1-Way Layout */}
              {isRoundTrip ? (
                <div className="space-y-3 w-full">
                  {/* Round Trip Curved Loop Banner */}
                  <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-50/80 via-teal-50/40 to-indigo-50/80 border border-emerald-200/80 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-indigo-950/40 shadow-2xs">
                    <div className="flex items-center gap-2">
                      <RotateCcw className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                        Round-Trip Loop Journey (Outbound &amp; Return Legs)
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 px-2.5 py-0.5 rounded-lg text-[11px] font-extrabold text-slate-800 dark:text-slate-200">
                      <span className="text-emerald-600 font-bold">{slot.origin || 'Pickup'}</span>
                      <div className="flex items-center px-0.5">
                        <svg className="w-5 h-2 text-emerald-500" viewBox="0 0 32 10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <path d="M 2 8 C 10 2, 22 2, 30 8" />
                          <path d="M 25 3 L 30 8 L 24 9" />
                        </svg>
                        <svg className="w-5 h-2 text-indigo-500" viewBox="0 0 32 10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <path d="M 30 2 C 22 8, 10 8, 2 2" />
                          <path d="M 7 7 L 2 2 L 8 1" />
                        </svg>
                      </div>
                      <span className="text-indigo-600 font-bold">{slot.destination || 'Dropoff'}</span>
                    </div>
                  </div>

                  {/* Outbound Leg (Leg 1) Container */}
                  <div className="space-y-3 p-3 rounded-2xl bg-orange-50/20 dark:bg-orange-950/10 border border-orange-200/60 dark:border-orange-900/40">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
                      {/* Outbound Pickup Location */}
                      <div className="space-y-1 p-3 rounded-xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/60">
                        <label className="text-[11px] font-black text-emerald-900 dark:text-emerald-300 uppercase tracking-wider block flex items-center justify-between">
                          <span>Outbound Pickup (Origin) *</span>
                          <span className="text-[10px] font-bold text-emerald-600">Leg 1 Pickup</span>
                        </label>
                        <LocationCombobox
                          customerId={contractCustomer}
                          value={slot.origin}
                          onChange={(locId, locObj) => {
                            const name = locObj?.name || locObj?.address || (isUuid(locId) ? '' : locId);
                            onUpdateSlot(slot.id, {
                              origin: name,
                              originLocationId: locObj?.id ?? (isUuid(locId) ? locId : null),
                              originLat: locObj?.lat ?? null,
                              originLng: locObj?.lng ?? null,
                              returnDestination: slot.returnDestination || name,
                            });
                          }}
                          placeholder="Search origin location..."
                        />
                      </div>

                      {/* Outbound Dropoff Location */}
                      <div className="space-y-1 p-3 rounded-xl bg-orange-50/40 dark:bg-orange-950/20 border border-orange-200/80 dark:border-orange-900/60">
                        <label className="text-[11px] font-black text-orange-900 dark:text-orange-300 uppercase tracking-wider block flex items-center justify-between">
                          <span>Outbound Dropoff (Destination) *</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-orange-600">Leg 1 Dropoff</span>
                            <button
                              type="button"
                              onClick={() => onAddSlotIntermediate(slot.id)}
                              className="text-[10px] font-bold text-orange-700 bg-orange-100 hover:bg-orange-200 dark:bg-orange-950 dark:text-orange-300 px-2 py-0.5 rounded-md flex items-center gap-1 transition-all cursor-pointer border border-orange-300/60 dark:border-orange-800"
                              title="Add intermediate stop to Leg 1"
                            >
                              <Plus className="w-3 h-3 text-orange-600 dark:text-orange-400" />
                              + Add Stop
                            </button>
                          </div>
                        </label>
                        <LocationCombobox
                          customerId={contractCustomer}
                          value={slot.destination}
                          onChange={(locId, locObj) => {
                            const name = locObj?.name || locObj?.address || (isUuid(locId) ? '' : locId);
                            onUpdateSlot(slot.id, {
                              destination: name,
                              destinationLocationId: locObj?.id ?? (isUuid(locId) ? locId : null),
                              destinationLat: locObj?.lat ?? null,
                              destinationLng: locObj?.lng ?? null,
                              returnOrigin: slot.returnOrigin || name,
                            });
                          }}
                          placeholder="Search destination location..."
                        />
                      </div>
                    </div>

                    {/* Outbound Intermediate Stops List Section (Placed directly under Leg 1 Pickup & Dropoff!) */}
                    {slot.intermediateLocations && slot.intermediateLocations.length > 0 && (
                      <div className="rounded-xl border border-indigo-200/80 bg-indigo-50/20 dark:bg-indigo-950/20 p-3 space-y-2 w-full">
                        <div className="flex items-center justify-between border-b border-indigo-100 dark:border-indigo-900/50 pb-1.5">
                          <span className="text-xs font-black text-indigo-950 dark:text-indigo-100 uppercase tracking-wider flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                            Outbound Leg Intermediate Stops ({slot.intermediateLocations.length})
                          </span>
                          <button
                            type="button"
                            onClick={() => onAddSlotIntermediate(slot.id)}
                            className="text-[10px] font-bold text-indigo-700 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-950 flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <Plus className="w-3 h-3 text-indigo-600" />
                            Add Stop
                          </button>
                        </div>

                        <div className="space-y-1.5">
                          {slot.intermediateLocations.map((loc, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-2 p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/60 shadow-2xs group hover:border-indigo-300 transition-all"
                            >
                              <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 text-[10px] font-extrabold flex items-center justify-center shrink-0">
                                #{idx + 1}
                              </span>

                              <div className="flex-1 min-w-[180px]">
                                <LocationCombobox
                                  customerId={contractCustomer}
                                  value={loc}
                                  onChange={(locId, locObj) => {
                                    const displayName = locObj?.name || locObj?.address || (isUuid(locId) ? '' : locId);
                                    onUpdateSlotIntermediate(slot.id, idx, displayName);
                                  }}
                                  placeholder={`Intermediate Stop #${idx + 1}...`}
                                  triggerClassName="h-8 border-slate-200 bg-white shadow-2xs text-xs font-medium"
                                />
                              </div>

                              <div className="w-28 relative shrink-0">
                                <span className="absolute left-2 top-2 text-[10px] font-bold text-slate-400">SAR</span>
                                <input
                                  type="number"
                                  value={slot.intermediateStopFees?.[idx] || ''}
                                  onChange={(e) => onUpdateSlotIntermediateFee(slot.id, idx, e.target.value)}
                                  placeholder="Fee"
                                  className="w-full h-8 pl-8 pr-2 rounded-md border border-slate-200 text-xs font-bold text-right focus:outline-none focus:border-brand bg-white"
                                />
                              </div>

                              <button
                                type="button"
                                onClick={() => onRemoveSlotIntermediate(slot.id, idx)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition-all shrink-0 cursor-pointer"
                                title="Remove stop"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Return Leg (Leg 2) Container */}
                  <div className="space-y-3 p-3 rounded-2xl bg-teal-50/20 dark:bg-teal-950/10 border border-teal-200/60 dark:border-teal-900/40">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
                      {/* Return Cargo Pickup Location */}
                      <div className="space-y-1 p-3 rounded-xl bg-teal-50/40 dark:bg-teal-950/20 border border-teal-200/80 dark:border-teal-900/60">
                        <label className="text-[11px] font-black text-teal-900 dark:text-teal-300 uppercase tracking-wider block flex items-center justify-between">
                          <span>Return Cargo Pickup (Destination) *</span>
                          <span className="text-[10px] font-bold text-teal-600">Leg 2 Return Pickup</span>
                        </label>
                        <LocationCombobox
                          customerId={contractCustomer}
                          value={slot.returnOrigin || slot.destination}
                          onChange={(locId, locObj) => {
                            const name = locObj?.name || locObj?.address || (isUuid(locId) ? '' : locId);
                            onUpdateSlot(slot.id, {
                              returnOrigin: name,
                            });
                          }}
                          placeholder="Search return pickup location..."
                        />
                      </div>

                      {/* Return Dropoff Location */}
                      <div className="space-y-1 p-3 rounded-xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-900/60">
                        <label className="text-[11px] font-black text-indigo-900 dark:text-indigo-300 uppercase tracking-wider block flex items-center justify-between">
                          <span>Return Dropoff (Final Origin) *</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-indigo-600">Leg 2 Return Dropoff</span>
                            <button
                              type="button"
                              onClick={() => onAddSlotReturnIntermediate(slot.id)}
                              className="text-[10px] font-bold text-indigo-700 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 px-2 py-0.5 rounded-md flex items-center gap-1 transition-all cursor-pointer border border-indigo-300/60 dark:border-indigo-800"
                              title="Add intermediate stop to Leg 2"
                            >
                              <Plus className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                              + Add Stop
                            </button>
                          </div>
                        </label>
                        <LocationCombobox
                          customerId={contractCustomer}
                          value={slot.returnDestination || slot.origin}
                          onChange={(locId, locObj) => {
                            const name = locObj?.name || locObj?.address || (isUuid(locId) ? '' : locId);
                            onUpdateSlot(slot.id, {
                              returnDestination: name,
                            });
                          }}
                          placeholder="Search return dropoff location..."
                        />
                      </div>
                    </div>

                    {/* Return Leg Intermediate Stops List (Placed directly under Return Pickup & Return Dropoff!) */}
                    {slot.returnIntermediateLocations && slot.returnIntermediateLocations.length > 0 && (
                      <div className="rounded-xl border border-teal-200/80 bg-teal-50/20 dark:bg-teal-950/20 p-3 space-y-2 w-full">
                        <div className="flex items-center justify-between border-b border-teal-100 dark:border-teal-900/50 pb-1.5">
                          <span className="text-xs font-black text-teal-950 dark:text-teal-100 uppercase tracking-wider flex items-center gap-1.5">
                            <RotateCcw className="w-3.5 h-3.5 text-teal-600" />
                            Return Leg Intermediate Stops ({slot.returnIntermediateLocations.length})
                          </span>
                          <button
                            type="button"
                            onClick={() => onAddSlotReturnIntermediate(slot.id)}
                            className="text-[10px] font-bold text-teal-700 bg-white dark:bg-slate-900 border border-teal-200 dark:border-teal-800 px-2 py-0.5 rounded-md hover:bg-teal-50 dark:hover:bg-teal-950 flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <Plus className="w-3 h-3 text-teal-600" />
                            Add Return Stop
                          </button>
                        </div>

                        <div className="space-y-1.5">
                          {slot.returnIntermediateLocations.map((loc, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-2 p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-teal-100 dark:border-teal-900/60 shadow-2xs group hover:border-teal-300 transition-all"
                            >
                              <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 text-[10px] font-extrabold flex items-center justify-center shrink-0">
                                #{idx + 1}
                              </span>

                              <div className="flex-1 min-w-[180px]">
                                <LocationCombobox
                                  customerId={contractCustomer}
                                  value={loc}
                                  onChange={(locId, locObj) => {
                                    const displayName = locObj?.name || locObj?.address || (isUuid(locId) ? '' : locId);
                                    onUpdateSlotReturnIntermediate(slot.id, idx, displayName);
                                  }}
                                  placeholder={`Return Intermediate Stop #${idx + 1}...`}
                                  triggerClassName="h-8 border-slate-200 bg-white shadow-2xs text-xs font-medium"
                                />
                              </div>

                              <div className="w-28 relative shrink-0">
                                <span className="absolute left-2 top-2 text-[10px] font-bold text-slate-400">SAR</span>
                                <input
                                  type="number"
                                  value={slot.returnIntermediateStopFees?.[idx] || ''}
                                  onChange={(e) => onUpdateSlotReturnIntermediateFee(slot.id, idx, e.target.value)}
                                  placeholder="Fee"
                                  className="w-full h-8 pl-8 pr-2 rounded-md border border-slate-200 text-xs font-bold text-right focus:outline-none focus:border-brand bg-white"
                                />
                              </div>

                              <button
                                type="button"
                                onClick={() => onRemoveSlotReturnIntermediate(slot.id, idx)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition-all shrink-0 cursor-pointer"
                                title="Remove stop"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
                  {/* Pickup Card */}
                  <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/30 dark:bg-emerald-950/20 p-3 space-y-2 w-full">
                    <span className="text-xs font-bold text-emerald-950 dark:text-emerald-300">Pickup Stop (Origin)</span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-[10px] font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider">
                          Pickup Location *
                        </label>
                        <LocationCombobox
                          customerId={contractCustomer}
                          value={slot.origin}
                          onChange={(locId, locObj) => {
                            const name = locObj?.name || locObj?.address || (isUuid(locId) ? '' : locId);
                            onUpdateSlot(slot.id, {
                              origin: name,
                              originLocationId: locObj?.id ?? (isUuid(locId) ? locId : null),
                              originLat: locObj?.lat ?? null,
                              originLng: locObj?.lng ?? null,
                            });
                          }}
                          placeholder="Search origin..."
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1">
                          <Clock className="w-3 h-3 text-emerald-600" /> Time *
                        </label>
                        <DateTimePicker
                          value={slot.pickupTime}
                          onChange={(isoStr) => {
                            if (!isoStr) {
                              onUpdateSlot(slot.id, { pickupTime: '' });
                              return;
                            }
                            const cleanTime = isoStr.includes('T') ? isoStr.split('T')[1].substring(0, 5) : isoStr;
                            onUpdateSlot(slot.id, { pickupTime: cleanTime });
                          }}
                          placeholder="Pick date & time..."
                          showPresets={false}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Dropoff Card */}
                  <div className="rounded-xl border border-orange-200/80 bg-orange-50/30 dark:bg-orange-950/20 p-3 space-y-2 w-full">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-orange-950 dark:text-orange-300">Dropoff Stop (Destination)</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-[10px] font-bold text-orange-900 dark:text-orange-300 uppercase tracking-wider">
                          Dropoff Location *
                        </label>
                        <LocationCombobox
                          customerId={contractCustomer}
                          value={slot.destination}
                          onChange={(locId, locObj) => {
                            const name = locObj?.name || locObj?.address || (isUuid(locId) ? '' : locId);
                            onUpdateSlot(slot.id, {
                              destination: name,
                              destinationLocationId: locObj?.id ?? (isUuid(locId) ? locId : null),
                              destinationLat: locObj?.lat ?? null,
                              destinationLng: locObj?.lng ?? null,
                            });
                          }}
                          placeholder="Search destination..."
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-orange-900 dark:text-orange-300 uppercase tracking-wider flex items-center gap-1">
                          <Clock className="w-3 h-3 text-brand" /> Time *
                        </label>
                        <DateTimePicker
                          value={slot.dropoffTime}
                          onChange={(isoStr) => {
                            if (!isoStr) {
                              onUpdateSlot(slot.id, { dropoffTime: '' });
                              return;
                            }
                            const cleanTime = isoStr.includes('T') ? isoStr.split('T')[1].substring(0, 5) : isoStr;
                            onUpdateSlot(slot.id, { dropoffTime: cleanTime });
                          }}
                          placeholder="Pick date & time..."
                          showPresets={false}
                        />
                      </div>
                    </div>
                    <TransitTimeBadge
                      origin={slot.origin}
                      destination={slot.destination}
                      originLat={slot.originLat}
                      originLng={slot.originLng}
                      destinationLat={slot.destinationLat}
                      destinationLng={slot.destinationLng}
                      pickupTime={slot.pickupTime}
                      dropoffTime={slot.dropoffTime}
                      onAutoSetDropoffTime={(suggestedTime, isOvernight) => {
                        if (slot.pickupTime && slot.pickupTime.trim()) {
                          onUpdateSlot(slot.id, {
                            dropoffTime: suggestedTime,
                            ...(isOvernight ? { isOvernight: true } : {}),
                          });
                        }
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Single Trip Intermediate Stops List Section */}
              {!isRoundTrip && slot.intermediateLocations && slot.intermediateLocations.length > 0 && (
                <div className="rounded-xl border border-indigo-200/80 bg-indigo-50/20 dark:bg-indigo-950/20 p-3 space-y-2 w-full">
                  <div className="flex items-center justify-between border-b border-indigo-100 dark:border-indigo-900/50 pb-1.5">
                    <span className="text-xs font-black text-indigo-950 dark:text-indigo-100 uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                      Intermediate Stops ({slot.intermediateLocations.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => onAddSlotIntermediate(slot.id)}
                      className="text-[10px] font-bold text-indigo-700 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-950 flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Plus className="w-3 h-3 text-indigo-600" />
                      Add Stop
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {slot.intermediateLocations.map((loc, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/60 shadow-2xs group hover:border-indigo-300 transition-all"
                      >
                        <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 text-[10px] font-extrabold flex items-center justify-center shrink-0">
                          #{idx + 1}
                        </span>

                        <div className="flex-1 min-w-[180px]">
                          <LocationCombobox
                            customerId={contractCustomer}
                            value={loc}
                            onChange={(locId, locObj) => {
                              const displayName = locObj?.name || locObj?.address || (isUuid(locId) ? '' : locId);
                              onUpdateSlotIntermediate(slot.id, idx, displayName);
                            }}
                            placeholder={`Intermediate Stop #${idx + 1}...`}
                            triggerClassName="h-8 border-slate-200 bg-white shadow-2xs text-xs font-medium"
                          />
                        </div>

                        <div className="w-28 relative shrink-0">
                          <span className="absolute left-2 top-2 text-[10px] font-bold text-slate-400">SAR</span>
                          <input
                            type="number"
                            value={slot.intermediateStopFees?.[idx] || ''}
                            onChange={(e) => onUpdateSlotIntermediateFee(slot.id, idx, e.target.value)}
                            placeholder="Fee"
                            className="w-full h-8 pl-8 pr-2 rounded-md border border-slate-200 text-xs font-bold text-right focus:outline-none focus:border-brand bg-white"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => onRemoveSlotIntermediate(slot.id, idx)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition-all shrink-0 cursor-pointer"
                          title="Remove stop"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quotation Match Banner & Save as Quotation Option */}
              <div className="pt-1 w-full">
                {matchedRateCard ? (
                  <div className="w-full p-3.5 rounded-xl bg-gradient-to-r from-emerald-50/90 via-teal-50/40 to-slate-50 border border-emerald-300 dark:from-emerald-950/40 dark:via-teal-950/20 dark:to-slate-900 dark:border-emerald-800 shadow-2xs space-y-2.5">
                    {/* Header line: Match Badge + Quotation Title + Validity */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-black bg-emerald-600 text-white shadow-2xs shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          QUOTATION MATCHED
                        </span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-0.5 rounded-md truncate max-w-lg">
                          {matchedRateCard.name || matchedRateCard.agreement_ref || matchedRateCard.source_reference || 'Active Customer Agreement'}
                        </span>
                      </div>

                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-0.5 rounded-md flex items-center gap-1 shrink-0">
                        📅 {(() => {
                          const fromStr = matchedRateCard.valid_from ? new Date(matchedRateCard.valid_from).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null;
                          const toStr = matchedRateCard.valid_to ? new Date(matchedRateCard.valid_to).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null;
                          if (fromStr && toStr) return `Valid: ${fromStr} → ${toStr}`;
                          if (fromStr) return `Valid from ${fromStr}`;
                          if (toStr) return `Valid until ${toStr}`;
                          return 'Always Valid';
                        })()}
                      </span>
                    </div>

                    {/* Financial & Spec Metrics Grid */}
                    {(() => {
                      const rawRate = Number(matchedRateCard.rate ?? matchedRateCard.base_price ?? 0);
                      const isMonthly = matchedRateCard.pricing_basis === 'PER_TRIP'
                        ? false
                        : matchedRateCard.pricing_basis === 'PER_MONTH'
                        ? true
                        : (matchedRateCard.billing_type || contractBillingType || '').toLowerCase().includes('monthly');
                      const driverPayoutVal = matchedRateCard.driver_payout != null ? Number(matchedRateCard.driver_payout) : null;
                      const dailyEq = isMonthly && rawRate > 0 ? rawRate / 30 : null;

                      return (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-emerald-200/60 dark:border-emerald-900/60">
                          {/* 1. Customer Billing Rate */}
                          <div className="flex flex-col bg-white dark:bg-slate-900 p-2.5 px-3 rounded-lg border border-emerald-200/80 dark:border-emerald-900/40 shadow-2xs">
                            <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                              Customer Billing Rate
                            </span>
                            <div className="flex items-baseline gap-1 mt-0.5">
                              <span className="text-sm font-black text-emerald-700 dark:text-emerald-300 font-mono">
                                SAR {rawRate.toLocaleString()}
                              </span>
                              <span className="text-[10px] font-extrabold text-slate-500">
                                / {isMonthly ? 'month' : 'trip'}
                              </span>
                            </div>
                            {dailyEq != null && (
                              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                                ≈ SAR {dailyEq.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / day
                              </span>
                            )}
                          </div>

                          {/* 2. Driver Charge (Payout) */}
                          <div className="flex flex-col bg-white dark:bg-slate-900 p-2.5 px-3 rounded-lg border border-emerald-200/80 dark:border-emerald-900/40 shadow-2xs">
                            <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                              Driver Charge (Payout)
                            </span>
                            <div className="flex items-baseline gap-1 mt-0.5">
                              <span className="text-sm font-black text-slate-900 dark:text-slate-100 font-mono">
                                {driverPayoutVal != null && !isNaN(driverPayoutVal)
                                  ? `SAR ${driverPayoutVal.toLocaleString()}`
                                  : '—'}
                              </span>
                              {driverPayoutVal != null && <span className="text-[10px] font-extrabold text-slate-500">/ trip</span>}
                            </div>
                            <span className="text-[10px] font-medium text-slate-400 mt-0.5">
                              {driverPayoutVal != null ? 'Pre-set in quotation' : 'Unspecified'}
                            </span>
                          </div>

                          {/* 3. Quotation Specs */}
                          <div className="flex flex-col justify-center bg-white dark:bg-slate-900 p-2.5 px-3 rounded-lg border border-emerald-200/80 dark:border-emerald-900/40 shadow-2xs">
                            <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-1">
                              Quotation Terms
                            </span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-brand/10 text-brand border border-brand/20">
                                {matchedRateCard.vehicle_class || matchedRateCard.vehicle_type || contractVehicleType}
                              </span>
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                {matchedRateCard.line_type || contractRateCategory}
                              </span>
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                {matchedRateCard.billing_type || contractBillingType}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                    {/* AGREED QUOTATIONS FOR THIS ROUTE */}
                    {(() => {
                      if (!getAvailableRateCardsForLane || !slot.origin || !slot.destination) return null;
                      const laneRateCards = getAvailableRateCardsForLane(slot.origin, slot.destination, slot.originLocationId, slot.destinationLocationId);
                      if (laneRateCards.length === 0) return null;

                      return (
                        <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/80 dark:bg-blue-950/20 dark:border-blue-900/50 space-y-2 mt-2">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <span className="text-[11px] font-black uppercase text-blue-900 dark:text-blue-300 tracking-wider flex items-center gap-1.5">
                              <Tag className="w-3.5 h-3.5 text-blue-600" />
                              Agreed Quotation Combos for this Route ({laneRateCards.length} Available)
                            </span>
                            <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400">
                              Click any combo chip to auto-apply vehicle, category & operation type
                            </span>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            {laneRateCards.map((rc) => {
                              const vLabel = rc.vehicle_class || rc.vehicle_type || rc.source_vehicle_label || '10 TON';
                              const cLabel = rc.line_type || rc.rate_category || 'Single Trip';
                              const bLabel = rc.billing_type || 'Monthly';
                              const rateVal = rc.rate ?? rc.base_price ?? 0;
                              const payoutVal = rc.driver_payout ?? (rc as any).driver_charge;

                              const isCurrentlyActive =
                                (contractVehicleType || '').toLowerCase() === vLabel.toLowerCase() &&
                                (contractRateCategory || '').toLowerCase() === cLabel.toLowerCase() &&
                                (contractBillingType || '').toLowerCase() === bLabel.toLowerCase();

                              return (
                                <button
                                  key={rc.id}
                                  type="button"
                                  onClick={() => {
                                    if (onUpdateVehicleType) onUpdateVehicleType(vLabel);
                                    onUpdateRateCategory(cLabel);
                                    if (onUpdateBillingType) onUpdateBillingType(bLabel);
                                  }}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
                                    isCurrentlyActive
                                      ? 'bg-blue-600 text-white border-blue-700 shadow-xs ring-2 ring-blue-300'
                                      : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-blue-200 dark:border-blue-800 hover:bg-blue-100/60 shadow-2xs'
                                  }`}
                                >
                                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-black">
                                    SAR {rateVal.toLocaleString()}
                                  </span>
                                  <span className="text-[10px] font-extrabold opacity-90 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-200">
                                    {bLabel}
                                  </span>
                                  <span className="text-[10px] font-extrabold opacity-90 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-200">
                                    {vLabel}
                                  </span>
                                  <span className="text-[10px] font-extrabold opacity-90 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-200">
                                    {cLabel}
                                  </span>
                                  {payoutVal != null && (
                                    <span className="text-[10px] font-medium opacity-80">
                                      (Driver: SAR {payoutVal})
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  slot.origin && slot.destination && (
                    <div className="space-y-2 w-full">
                      <div className="flex items-center justify-between flex-wrap gap-2 w-full p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60">
                        <span className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 text-amber-600" /> MANUAL RATE: Custom Lane Rate
                        </span>
                        <label className="flex items-center gap-2 cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg shadow-2xs transition-all">
                          <input
                            type="checkbox"
                            checked={Boolean(slot.saveAsQuotation)}
                            onChange={(e) => onUpdateSlot(slot.id, { saveAsQuotation: e.target.checked })}
                            className="rounded border-white text-emerald-800 focus:ring-emerald-400 h-4 w-4"
                          />
                          <span className="text-xs font-black flex items-center gap-1">
                            <Plus className="w-3.5 h-3.5" /> Save as Quotation for Future Trips
                          </span>
                        </label>
                      </div>

                      {/* AGREED QUOTATIONS FOR THIS ROUTE EVEN IF UNMATCHED FOR CURRENT COMBO */}
                      {(() => {
                        if (!getAvailableRateCardsForLane || !slot.origin || !slot.destination) return null;
                        const laneRateCards = getAvailableRateCardsForLane(slot.origin, slot.destination, slot.originLocationId, slot.destinationLocationId);
                        if (laneRateCards.length === 0) return null;

                        return (
                          <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/80 dark:bg-blue-950/20 dark:border-blue-900/50 space-y-2">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <span className="text-[11px] font-black uppercase text-blue-900 dark:text-blue-300 tracking-wider flex items-center gap-1.5">
                                <Tag className="w-3.5 h-3.5 text-blue-600" />
                                Agreed Quotation Combos for this Route ({laneRateCards.length} Available)
                              </span>
                              <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400">
                                Click any combo chip to auto-apply vehicle, category & operation type
                              </span>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                              {laneRateCards.map((rc) => {
                                const vLabel = rc.vehicle_class || rc.vehicle_type || rc.source_vehicle_label || '10 TON';
                                const cLabel = rc.line_type || rc.rate_category || 'Single Trip';
                                const bLabel = rc.billing_type || 'Monthly';
                                const rateVal = rc.rate ?? rc.base_price ?? 0;
                                const payoutVal = rc.driver_payout ?? (rc as any).driver_charge;

                                return (
                                  <button
                                    key={rc.id}
                                    type="button"
                                    onClick={() => {
                                      if (onUpdateVehicleType) onUpdateVehicleType(vLabel);
                                      onUpdateRateCategory(cLabel);
                                      if (onUpdateBillingType) onUpdateBillingType(bLabel);
                                    }}
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-blue-200 dark:border-blue-800 hover:bg-blue-100/60 shadow-2xs"
                                  >
                                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-black">
                                      SAR {rateVal.toLocaleString()}
                                    </span>
                                    <span className="text-[10px] font-extrabold opacity-90 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-200">
                                      {bLabel}
                                    </span>
                                    <span className="text-[10px] font-extrabold opacity-90 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-200">
                                      {vLabel}
                                    </span>
                                    <span className="text-[10px] font-extrabold opacity-90 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-200">
                                      {cLabel}
                                    </span>
                                    {payoutVal != null && (
                                      <span className="text-[10px] font-medium opacity-80">
                                        (Driver: SAR {payoutVal})
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
