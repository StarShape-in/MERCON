import { MapPin, Plus, Trash2, Clock, RefreshCw, Tag, Check, ArrowRight, Sparkles, Truck, Moon, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import LocationCombobox from '@/components/quotations/LocationCombobox';
import { RateCategorySelect } from '@/components/quotations/RateCategorySelect';
import TransitTimeBadge from '@/components/trips/TransitTimeBadge';
import { RateCard } from '@/services/rateCardService';
import { ContractSlot } from './types';
import { cn } from '@/lib/utils';

interface Step2RouteSlotsProps {
  contractCustomer: string;
  contractRateCategory: string;
  contractVehicleType: string;
  contractBillingType: string;
  contractSlots: ContractSlot[];
  onUpdateRateCategory: (cat: string) => void;
  onUpdateVehicleType?: (veh: string) => void;
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

      {/* Prominent Grouped Category & Tonnage Class Card Box */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4 w-full">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-100 text-brand dark:bg-orange-950/60 dark:text-orange-300 flex items-center justify-center font-bold text-xs border border-orange-200 dark:border-orange-900/60 shrink-0">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                Service Category &amp; Vehicle Tonnage Class <span className="text-rose-500">*</span>
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Select trip shape and vehicle capacity tier to match quotation rates and filter driver/vehicle assignments.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 1. Category Selection */}
          <div className="space-y-2">
            <label className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-brand" /> 1. Operational Trip Category
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {CATEGORY_OPTIONS.map((cat) => {
                const isSelected = contractRateCategory === cat.id;
                const IconComp = cat.icon;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => onUpdateRateCategory(cat.id)}
                    className={cn(
                      "px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs",
                      isSelected ? cat.active : cat.inactive
                    )}
                  >
                    <IconComp className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'opacity-80'}`} />
                    <span>{cat.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-white ml-0.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Vehicle Tonnage Class Selection */}
          <div className="space-y-2">
            <label className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> 2. Vehicle Tonnage Class (Tonnage)
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {['3-4 TON', '5 TON', '10 TON', '20 TON', '40 FEET'].map((ton) => {
                const isSelected = contractVehicleType === ton;
                return (
                  <button
                    key={ton}
                    type="button"
                    onClick={() => onUpdateVehicleType && onUpdateVehicleType(ton)}
                    className={cn(
                      "px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs",
                      isSelected
                        ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/25 ring-2 ring-indigo-400/40"
                        : "bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                    )}
                  >
                    <span>{ton}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-white ml-0.5" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

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
                  <Button
                    type="button"
                    size="sm"
                    className="h-7 text-xs font-bold text-white bg-brand hover:bg-[#d13d0d] gap-1 px-2.5"
                    onClick={() => onAddSlotIntermediate(slot.id)}
                  >
                    <Plus className="w-3.5 h-3.5 text-white" />
                    Add Stop
                  </Button>
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
                  <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 space-y-2 w-full">
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold">
                      Leg 1: Outbound Journey
                    </Badge>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider block">
                          Outbound Pickup *
                        </label>
                        <LocationCombobox
                          customerId={contractCustomer}
                          value={slot.origin}
                          onChange={(locName) =>
                            onUpdateSlot(slot.id, {
                              origin: locName,
                              returnDestination: slot.returnDestination || locName,
                            })
                          }
                          placeholder="Search origin..."
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-orange-900 dark:text-orange-300 uppercase tracking-wider block">
                          Outbound Dropoff *
                        </label>
                        <LocationCombobox
                          customerId={contractCustomer}
                          value={slot.destination}
                          onChange={(locName) =>
                            onUpdateSlot(slot.id, {
                              destination: locName,
                              returnOrigin: slot.returnOrigin || locName,
                            })
                          }
                          placeholder="Search destination..."
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 space-y-2 w-full">
                    <Badge className="bg-indigo-600 text-white border-indigo-600 text-[10px] font-bold flex items-center gap-1">
                      <RefreshCw className="w-2.5 h-2.5" /> Leg 2: Return Journey
                    </Badge>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-indigo-950 dark:text-indigo-300 uppercase tracking-wider block">
                          Return Reload Pickup *
                        </label>
                        <LocationCombobox
                          customerId={contractCustomer}
                          value={slot.returnOrigin || slot.destination}
                          onChange={(locName) => onUpdateSlot(slot.id, { returnOrigin: locName })}
                          placeholder="Search return origin..."
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-purple-950 dark:text-purple-300 uppercase tracking-wider flex items-center justify-between">
                          <span>Return Dropoff (Home) *</span>
                          <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 font-bold text-[9px]">
                            <RotateCcw className="w-2 h-2 text-emerald-600 mr-0.5" /> Linked Home
                          </Badge>
                        </label>
                        <LocationCombobox
                          customerId={contractCustomer}
                          value={slot.returnDestination || slot.origin}
                          onChange={(locName) => onUpdateSlot(slot.id, { returnDestination: locName })}
                          placeholder="Search home location..."
                        />
                      </div>
                    </div>
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
                          onChange={(locName) => onUpdateSlot(slot.id, { origin: locName })}
                          placeholder="Search origin..."
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1">
                          <Clock className="w-3 h-3 text-emerald-600" /> Time *
                        </label>
                        <input
                          type="time"
                          value={slot.pickupTime}
                          onChange={(e) => onUpdateSlot(slot.id, { pickupTime: e.target.value })}
                          className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
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
                          onChange={(locName) => onUpdateSlot(slot.id, { destination: locName })}
                          placeholder="Search destination..."
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-orange-900 dark:text-orange-300 uppercase tracking-wider flex items-center gap-1">
                          <Clock className="w-3 h-3 text-brand" /> Time *
                        </label>
                        <input
                          type="time"
                          value={slot.dropoffTime}
                          onChange={(e) => onUpdateSlot(slot.id, { dropoffTime: e.target.value })}
                          className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                        />
                      </div>
                    </div>
                    <TransitTimeBadge
                      origin={slot.origin}
                      destination={slot.destination}
                      pickupTime={slot.pickupTime}
                      dropoffTime={slot.dropoffTime}
                    />
                  </div>
                </div>
              )}

              {/* Quotation Match Banner */}
              <div className="flex items-center justify-between text-xs pt-0.5">
                {matchedRateCard ? (
                  <span className="text-[11px] font-extrabold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                    ✓ QUOTATION MATCHED: Billing Rate SAR {Number(matchedRateCard.rate ?? matchedRateCard.base_price).toLocaleString()} • Driver Charge SAR {Number(matchedRateCard.driver_payout ?? 0).toLocaleString()}
                  </span>
                ) : (
                  slot.origin && slot.destination && (
                    <span className="text-[11px] font-extrabold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                      ⚠ MANUAL RATE: Enter Billing Rate &amp; Driver Charge on next steps
                    </span>
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
