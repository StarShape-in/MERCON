import { MapPin, Plus, Trash2, Moon, Clock, ChevronRight, ChevronLeft, RefreshCw, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import LocationCombobox from '@/components/rate-cards/LocationCombobox';
import { RateCategorySelect } from '@/components/rate-cards/RateCategorySelect';
import TransitTimeBadge from '@/components/trips/TransitTimeBadge';
import { RateCard } from '@/services/rateCardService';
import { ContractSlot } from './types';

interface Step2RouteSlotsProps {
  contractCustomer: string;
  contractRateCategory: string;
  contractVehicleType: string;
  contractBillingType: string;
  contractSlots: ContractSlot[];
  onUpdateRateCategory: (cat: string) => void;
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

export default function Step2RouteSlots({
  contractCustomer,
  contractRateCategory,
  contractVehicleType,
  contractBillingType,
  contractSlots,
  onUpdateRateCategory,
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
  isStep2Valid,
  onNext,
  onBack,
}: Step2RouteSlotsProps) {
  const isRoundTrip = isRoundTripCategory(contractRateCategory);

  return (
    <div className="space-y-3.5 animate-fade-in py-1 max-w-5xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-2.5">
        <div className="space-y-0.5">
          <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-brand" />
            Route Locations & Trip Slots ({contractSlots.length})
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Configure origin/destination stops, intermediate stops, times, and pricing model.
          </p>
        </div>

        {/* Rate Category Selector */}
        <div className="flex items-center gap-2 bg-orange-50/70 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 px-2.5 py-1 rounded-xl">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
            Category:
          </span>
          <RateCategorySelect
            value={contractRateCategory}
            onValueChange={onUpdateRateCategory}
            size="sm"
            allowClear={false}
            showBadgesInOptions={true}
          />
        </div>
      </div>

      {/* Slots Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Active Route Slots ({contractSlots.length})
          </span>
          <Button
            type="button"
            onClick={onAddSlot}
            className="h-7 px-2.5 rounded-lg bg-orange-50 text-brand border border-orange-200 hover:bg-orange-100 text-xs font-bold dark:bg-orange-950/40 dark:border-orange-800"
          >
            <Plus className="w-3 h-3 mr-1" />
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
              className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-2.5"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
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
                    className="h-6.5 text-[11px] font-bold text-white bg-brand hover:bg-[#d13d0d] gap-1 px-2"
                    onClick={() => onAddSlotIntermediate(slot.id)}
                  >
                    <Plus className="w-3 h-3 text-white" />
                    Add Stop
                  </Button>
                  {contractSlots.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onRemoveSlot(slot.id)}
                      className="text-slate-400 hover:text-rose-600 transition-colors p-0.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Round Trip vs 1-Way Layout */}
              {isRoundTrip ? (
                <div className="space-y-2.5">
                  <div className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 space-y-1.5">
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold">
                      Leg 1: Outbound Journey
                    </Badge>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
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

                  <div className="p-2.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 space-y-1.5">
                    <Badge className="bg-indigo-600 text-white border-indigo-600 text-[10px] font-bold flex items-center gap-1">
                      <RefreshCw className="w-2.5 h-2.5" /> Leg 2: Return Journey
                    </Badge>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {/* Pickup Card */}
                  <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/30 dark:bg-emerald-950/20 p-2.5 space-y-1.5">
                    <span className="text-xs font-bold text-emerald-950 dark:text-emerald-300">Pickup Stop (Origin)</span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
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
                          className="w-full h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Dropoff Card */}
                  <div className="rounded-xl border border-orange-200/80 bg-orange-50/30 dark:bg-orange-950/20 p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-orange-950 dark:text-orange-300">Dropoff Stop (Destination)</span>
                      <label className="flex items-center gap-1 cursor-pointer text-[10px] font-bold text-indigo-700">
                        <input
                          type="checkbox"
                          checked={Boolean(slot.isOvernight)}
                          onChange={(e) => onUpdateSlot(slot.id, { isOvernight: e.target.checked })}
                          className="rounded border-slate-300 text-brand"
                        />
                        <span>+1 Day (Overnight)</span>
                      </label>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
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
                          className="w-full h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
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

              {/* Rate Card Match Banner */}
              <div className="flex items-center justify-between text-xs pt-0.5">
                {matchedRateCard ? (
                  <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-lg">
                    Rate Card Matched: SAR {matchedRateCard.base_price}
                  </span>
                ) : (
                  slot.origin && slot.destination && (
                    <span className="text-[11px] font-semibold text-amber-600">
                      ⚠️ No matching rate card found for lane
                    </span>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-1">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="h-9 px-4 rounded-xl font-bold text-xs"
        >
          <ChevronLeft className="w-3.5 h-3.5 mr-1" />
          Back to Customer
        </Button>

        <Button
          type="button"
          disabled={!isStep2Valid}
          onClick={onNext}
          className="h-9 px-5 rounded-xl bg-brand hover:bg-[#d13d0d] text-white font-bold text-xs gap-1.5 shadow-md disabled:opacity-50"
        >
          Next: Schedule & Days
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
