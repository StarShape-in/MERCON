import React from 'react';
import {
  MapPin,
  Plus,
  Trash2,
  Calendar,
  Clock,
  RotateCcw,
  RefreshCw,
  Moon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import LocationCombobox from '@/components/quotations/LocationCombobox';
import TransitTimeBadge from '@/components/trips/TransitTimeBadge';
import { DatePicker } from '@/components/ui/date-picker';
import { TimePicker } from '@/components/ui/time-picker';
import { isUuid } from '@/lib/utils';

const addDays = (dateStr: string, days: number): string => {
  if (!dateStr) return dateStr;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

interface TripStep2RouteProps {
  contractSlots: any[];
  contractCustomer: string;
  contractRateCategory: string;
  handleAddSlotIntermediate: (slotId: string) => void;
  handleRemoveTripSlot: (slotId: string) => void;
  handleSlotLocationChange: (slotId: string, field: 'origin' | 'destination', locName: string, locObj: any) => void;
  handleUpdateTripSlot: (slotId: string, patch: any) => void;
  handleRemoveSlotIntermediate: (slotId: string, idx: number) => void;
  handleUpdateSlotIntermediate: (slotId: string, idx: number, val: string) => void;
  handleUpdateSlotIntermediateFee: (slotId: string, idx: number, fee: string) => void;
  handleAddSlotReturnIntermediate: (slotId: string) => void;
  handleRemoveSlotReturnIntermediate: (slotId: string, idx: number) => void;
  handleUpdateSlotReturnIntermediate: (slotId: string, idx: number, val: string) => void;
  handleUpdateSlotReturnIntermediateFee: (slotId: string, idx: number, fee: string) => void;
  recentRoutesList: any[];
  handleApplyRecentRoute: (route: any) => void;
  isRoundTripCategory: (cat: string) => boolean;
}

export const TripStep2Route: React.FC<TripStep2RouteProps> = ({
  contractSlots,
  contractCustomer,
  contractRateCategory,
  handleAddSlotIntermediate,
  handleRemoveTripSlot,
  handleSlotLocationChange,
  handleUpdateTripSlot,
  handleRemoveSlotIntermediate,
  handleUpdateSlotIntermediate,
  handleUpdateSlotIntermediateFee,
  handleAddSlotReturnIntermediate,
  handleRemoveSlotReturnIntermediate,
  handleUpdateSlotReturnIntermediate,
  handleUpdateSlotReturnIntermediateFee,
  recentRoutesList,
  handleApplyRecentRoute,
  isRoundTripCategory,
}) => {
  return (
    <div className="space-y-3.5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-extrabold text-[#111111] dark:text-slate-100 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-brand" />
          Trip / Route
        </h4>
        <Button
          type="button"
          size="sm"
          className="h-7 text-[11px] font-bold text-white bg-brand hover:bg-brand-hover active:scale-[0.98] transition-all shadow-xs rounded-lg gap-1 px-2.5 border-0 cursor-pointer"
          onClick={() => handleAddSlotIntermediate(contractSlots[0]?.id)}
        >
          <Plus className="w-3 h-3 text-white stroke-[2.5]" />
          Add Stop
        </Button>
      </div>

      {/* Daily Route Stop Cards (Full-Width Primary Focal Point) */}
      <div className="space-y-3">
        {contractSlots.map((slot, slotIdx) => (
          <div
            key={slot.id}
            className="p-3.5 rounded-xl border border-slate-200/90 bg-white shadow-2xs space-y-3"
          >
            {contractSlots.length > 1 && (
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-[#111111] bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                  Trip #{slotIdx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveTripSlot(slot.id)}
                  className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                  title="Remove trip slot"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Conditional Rendering for Round Trip (4 Sections) vs Standard 1-Way Trip */}
            {isRoundTripCategory(contractRateCategory) ? (
              <div className="space-y-3 pt-0.5">
                {/* LEG 1: OUTBOUND JOURNEY */}
                <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-1.5">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold">
                        Leg 1: Outbound Journey
                      </Badge>
                      <span className="text-xs font-bold text-slate-800">Origin → Destination</span>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      className="h-6 text-[10px] font-bold text-white bg-brand hover:bg-brand-hover active:scale-[0.98] transition-all shadow-xs rounded-lg gap-1 px-2.5 border-0"
                      onClick={() => handleAddSlotIntermediate(slot.id)}
                    >
                      <Plus className="w-3 h-3 text-white stroke-[2.5]" />
                      Add Outbound Stop
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* SECTION 1: Outbound Pickup (Start) */}
                    <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/30 overflow-hidden space-y-2">
                      <div className="p-2 bg-emerald-50/80 border-b border-emerald-100 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200 shrink-0" />
                          <span className="text-xs font-bold text-emerald-950">1. Outbound Pickup (Start)</span>
                        </div>
                        <span className="text-[9px] font-semibold text-emerald-700 bg-white border border-emerald-200/80 px-1.5 py-0.5 rounded">
                          Starting Point
                        </span>
                      </div>

                      <div className="p-2.5 space-y-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider block">
                            Outbound Pickup Location *
                          </label>
                          <LocationCombobox
                            customerId={contractCustomer}
                            value={slot.origin}
                            onChange={(locName, locObj) => handleSlotLocationChange(slot.id, 'origin', locName, locObj)}
                            placeholder="Search starting origin (e.g. Riyadh)..."
                            triggerClassName="h-8.5 border-emerald-200 bg-white shadow-2xs"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-emerald-600" /> Outbound Date *
                            </label>
                            <DatePicker
                              value={slot.date || ''}
                              onChange={(_, dateStr) => handleUpdateTripSlot(slot.id, { date: dateStr, dropoffDate: dateStr })}
                              placeholder="Select date..."
                              buttonClassName="h-8.5 border-emerald-200 bg-white shadow-2xs font-semibold text-xs text-slate-800"
                              minDate={new Date()}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1">
                              <Clock className="w-3 h-3 text-emerald-600" /> Outbound Time *
                            </label>
                            <TimePicker
                              value={slot.pickupTime}
                              onChange={(timeStr) => handleUpdateTripSlot(slot.id, { pickupTime: timeStr })}
                              placeholder="Select time..."
                              buttonClassName="h-8.5 border-emerald-200 bg-white shadow-2xs font-semibold text-xs text-slate-800"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* SECTION 2: Outbound Dropoff (Destination) */}
                    <div className="rounded-xl border border-orange-200/80 bg-orange-50/30 overflow-hidden space-y-2">
                      <div className="p-2 bg-orange-50/80 border-b border-orange-100 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-brand ring-2 ring-orange-200 shrink-0" />
                          <span className="text-xs font-bold text-orange-950">2. Outbound Dropoff (Destination)</span>
                        </div>
                        <span className="text-[9px] font-semibold text-orange-700 bg-white border border-orange-200/80 px-1.5 py-0.5 rounded">
                          Delivery Point
                        </span>
                      </div>

                      <div className="p-2.5 space-y-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-orange-900 uppercase tracking-wider block">
                            Outbound Dropoff Location *
                          </label>
                          <LocationCombobox
                            customerId={contractCustomer}
                            value={slot.destination}
                            onChange={(locName, locObj) => handleSlotLocationChange(slot.id, 'destination', locName, locObj)}
                            placeholder="Search delivery destination (e.g. Dammam)..."
                            triggerClassName="h-8.5 border-orange-200 bg-white shadow-2xs"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-orange-900 uppercase tracking-wider flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-brand" /> Outbound Date *
                            </label>
                            <DatePicker
                              value={slot.dropoffDate || ''}
                              onChange={(_, dateStr) => handleUpdateTripSlot(slot.id, { dropoffDate: dateStr })}
                              placeholder="Select date..."
                              buttonClassName="h-8.5 border-orange-200 bg-white shadow-2xs font-semibold text-xs text-slate-800"
                              minDate={slot.date ? new Date(slot.date) : new Date()}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-orange-900 uppercase tracking-wider flex items-center gap-1">
                              <Clock className="w-3 h-3 text-brand" /> Outbound Time *
                            </label>
                            <div className="flex items-center gap-1">
                              <TimePicker
                                value={slot.dropoffTime}
                                onChange={(timeStr) => handleUpdateTripSlot(slot.id, { dropoffTime: timeStr })}
                                placeholder="Select time..."
                                buttonClassName="flex-1 h-8.5 border-orange-200 bg-white shadow-2xs font-semibold text-xs text-slate-800"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const [hh, mm] = (slot.dropoffTime || '12:00').split(':').map(Number);
                                  const newHour = (hh + 1) % 24;
                                  const newTime = `${String(newHour).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
                                  const newDate = newHour === 0 ? addDays(slot.dropoffDate || slot.date, 1) : (slot.dropoffDate || slot.date);
                                  handleUpdateTripSlot(slot.id, {
                                    dropoffTime: newTime,
                                    dropoffDate: newDate,
                                    isOvernight: newHour === 0 ? true : slot.isOvernight
                                  });
                                }}
                                className="h-8.5 w-8.5 p-0 rounded-lg border-orange-200 bg-white text-brand hover:bg-orange-50 shrink-0"
                                title="Add 1 Hour"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
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
                      handleUpdateTripSlot(slot.id, {
                        dropoffTime: suggestedTime,
                        ...(isOvernight ? { isOvernight: true } : {}),
                      });
                    }}
                  />

                  {/* Outbound Intermediate Stops & Fees */}
                  {slot.intermediateLocations.length > 0 && (
                    <div className="space-y-2 pt-1.5 border-t border-slate-200/60">
                      <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                        Outbound Intermediate Stops & Fees ({slot.intermediateLocations.length})
                      </span>
                      <div className="space-y-2">
                        {slot.intermediateLocations.map((loc: string, idx: number) => (
                          <div key={idx} className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                <MapPin className="w-3 h-3 text-emerald-600" />
                                Outbound Stop #{idx + 1}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveSlotIntermediate(slot.id, idx)}
                                className="text-slate-400 hover:text-rose-600 transition-colors text-[10px] font-semibold"
                              >
                                Remove Stop
                              </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <div className="sm:col-span-2">
                                <LocationCombobox
                                  customerId={contractCustomer}
                                  value={loc}
                                  onChange={(locId, locObj) => handleUpdateSlotIntermediate(slot.id, idx, locObj?.name || locObj?.address || (isUuid(locId) ? '' : locId))}
                                  placeholder={`Search Outbound Stop #${idx + 1}...`}
                                  triggerClassName="h-8 border-slate-200 bg-white"
                                />
                              </div>
                              <div className="relative">
                                <span className="absolute left-2.5 top-2 text-[11px] font-bold text-slate-400">SAR</span>
                                <input
                                  type="number"
                                  value={slot.intermediateStopFees?.[idx] || ''}
                                  onChange={(e) => handleUpdateSlotIntermediateFee(slot.id, idx, e.target.value)}
                                  placeholder="Stop fee e.g. 150"
                                  className="w-full h-8 pl-10 pr-2.5 rounded-lg border border-slate-200 text-xs font-bold text-right focus:outline-none focus:border-brand"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* LEG 2: RETURN JOURNEY (CLOSED LOOP) */}
                <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-200/80 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-indigo-100 pb-1.5">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-indigo-600 text-white border-indigo-600 text-[10px] font-bold flex items-center gap-1">
                        <RefreshCw className="w-2.5 h-2.5 animate-spin-slow" />
                        Leg 2: Return Journey Loop
                      </Badge>
                      <span className="text-xs font-bold text-indigo-950">Destination &rarr; Return to Origin</span>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      className="h-6 text-[10px] font-bold text-white bg-brand hover:bg-brand-hover active:scale-[0.98] transition-all shadow-xs rounded-lg gap-1 px-2.5 border-0"
                      onClick={() => handleAddSlotReturnIntermediate(slot.id)}
                    >
                      <Plus className="w-3 h-3 text-white stroke-[2.5]" />
                      Add Return Stop
                    </Button>
                  </div>

                  {/* Curved Dual-Arrow Loop Banner */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/80 border border-indigo-200/80 shadow-2xs">
                    <div className="flex items-center gap-2">
                      <RotateCcw className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span className="text-xs font-extrabold text-slate-800">
                        Return Loop automatically starts from Outbound Dropoff ({slot.destination || 'Destination'})
                      </span>
                    </div>
                    <div className="flex items-center gap-2 px-2 py-1 bg-indigo-50 rounded-lg text-xs font-black text-indigo-900 border border-indigo-200">
                      <span>{slot.destination || 'Dropoff'}</span>
                      <div className="flex flex-col items-center px-1">
                        <svg className="w-6 h-2 text-emerald-500" viewBox="0 0 32 10" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M 2 8 C 10 2, 22 2, 30 8" />
                          <path d="M 25 3 L 30 8 L 24 9" />
                        </svg>
                        <svg className="w-6 h-2 text-indigo-500" viewBox="0 0 32 10" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M 30 2 C 22 8, 10 8, 2 2" />
                          <path d="M 7 7 L 2 2 L 8 1" />
                        </svg>
                      </div>
                      <span>{slot.origin || 'Pickup'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {/* SECTION 4: Return Dropoff (Final Home Destination) */}
                    <div className="rounded-xl border border-purple-200/80 bg-purple-50/30 overflow-hidden space-y-2">
                      <div className="p-2 bg-purple-50/80 border-b border-purple-100 flex items-center justify-between flex-wrap gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-purple-600 ring-2 ring-purple-200 shrink-0" />
                          <span className="text-xs font-bold text-purple-950">4. Return Dropoff (Final Home)</span>
                        </div>
                        {Boolean(contractRateCategory && contractRateCategory.toLowerCase().includes('2 vehicles')) && (
                          <button
                            type="button"
                            onClick={() => handleUpdateTripSlot(slot.id, { returnIsOvernight: !slot.returnIsOvernight })}
                            className={`text-[9px] font-bold flex items-center gap-1 px-1.5 py-0.5 rounded transition-all whitespace-nowrap ${
                              slot.returnIsOvernight
                                ? 'bg-indigo-600 text-white shadow-2xs'
                                : 'bg-white text-indigo-900 border border-indigo-200 hover:bg-indigo-50'
                            }`}
                            title="Toggle Return Overnight (+1 Day)"
                          >
                            <Moon className={`w-2.5 h-2.5 ${slot.returnIsOvernight ? 'text-white fill-white' : 'text-indigo-600'}`} />
                            {slot.returnIsOvernight ? '+1 Day (Overnight)' : '+1 Day'}
                          </button>
                        )}
                      </div>

                      <div className="p-2.5 space-y-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-purple-900 uppercase tracking-wider flex items-center justify-between">
                            <span>Return Dropoff (Home) *</span>
                            <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200/90 font-bold text-[9px] gap-1 px-1.5 py-0.5 rounded shadow-2xs">
                              <RotateCcw className="w-2.5 h-2.5 text-emerald-600" />
                              Auto-Linked Home Origin
                            </Badge>
                          </label>
                          <LocationCombobox
                            customerId={contractCustomer}
                            value={slot.returnDestination || slot.origin}
                            onChange={(locName, locObj) => handleUpdateTripSlot(slot.id, {
                              returnDestination: locName,
                              returnDestinationLat: locObj?.lat ?? null,
                              returnDestinationLng: locObj?.lng ?? null
                            })}
                            placeholder="Search final home destination..."
                            triggerClassName="h-8.5 border-purple-200 bg-white shadow-2xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1">
                            <Clock className="w-3 h-3 text-purple-600" /> Return Drop-off Time *
                          </label>
                          <div className="flex items-center gap-1.5">
                            <TimePicker
                              value={slot.returnDropoffTime || '22:00'}
                              onChange={(timeStr) => handleUpdateTripSlot(slot.id, { returnDropoffTime: timeStr })}
                              placeholder="Select time..."
                              buttonClassName={`flex-1 h-8.5 text-xs font-semibold shadow-2xs ${
                                slot.returnIsOvernight
                                  ? 'border-indigo-300 bg-indigo-50/30 text-indigo-950'
                                  : 'border-purple-200 bg-white text-slate-800'
                              }`}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const [hh, mm] = (slot.returnDropoffTime || '22:00').split(':').map(Number);
                                const newHour = (hh + 1) % 24;
                                const newTime = `${String(newHour).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
                                handleUpdateTripSlot(slot.id, {
                                  returnDropoffTime: newTime,
                                  returnIsOvernight: newHour === 0 ? true : slot.returnIsOvernight
                                });
                              }}
                              className="h-8.5 w-8.5 p-0 rounded-lg border-purple-200 bg-white text-[#7c3aed] hover:bg-purple-50 shrink-0"
                              title="Add 1 Hour"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <TransitTimeBadge
                    origin={slot.returnOrigin || slot.destination}
                    destination={slot.returnDestination || slot.origin}
                    originLat={slot.returnOriginLat || slot.destinationLat}
                    originLng={slot.returnOriginLng || slot.destinationLng}
                    destinationLat={slot.returnDestinationLat || slot.originLat}
                    destinationLng={slot.returnDestinationLng || slot.originLng}
                    pickupTime={slot.returnPickupTime || '14:00'}
                    dropoffTime={slot.returnDropoffTime}
                    onAutoSetDropoffTime={(suggestedTime, isOvernight) => {
                      handleUpdateTripSlot(slot.id, {
                        returnDropoffTime: suggestedTime,
                        ...(isOvernight ? { isOvernight: true } : {}),
                      });
                    }}
                  />

                  {/* Return Intermediate Stops & Fees */}
                  {(slot.returnIntermediateLocations || []).length > 0 && (
                    <div className="space-y-2 pt-1.5 border-t border-indigo-100">
                      <span className="text-[10px] font-bold text-indigo-950 uppercase tracking-wider block">
                        Return Intermediate Stops & Fees ({(slot.returnIntermediateLocations || []).length})
                      </span>
                      <div className="space-y-2">
                        {(slot.returnIntermediateLocations || []).map((loc: string, idx: number) => (
                          <div key={idx} className="p-2.5 rounded-lg bg-white border border-indigo-200 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                                <MapPin className="w-3 h-3 text-purple-600" />
                                Return Stop #{idx + 1}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveSlotReturnIntermediate(slot.id, idx)}
                                className="text-slate-400 hover:text-rose-600 transition-colors text-[10px] font-semibold"
                              >
                                Remove Stop
                              </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <div className="sm:col-span-2">
                                <LocationCombobox
                                  customerId={contractCustomer}
                                  value={loc}
                                  onChange={(locId, locObj) => handleUpdateSlotReturnIntermediate(slot.id, idx, locObj?.name || locObj?.address || (isUuid(locId) ? '' : locId))}
                                  placeholder={`Search Return Stop #${idx + 1}...`}
                                  triggerClassName="h-8 border-indigo-200 bg-white"
                                />
                              </div>
                              <div className="relative">
                                <span className="absolute left-2.5 top-2 text-[11px] font-bold text-slate-400">SAR</span>
                                <input
                                  type="number"
                                  value={slot.returnIntermediateStopFees?.[idx] || ''}
                                  onChange={(e) => handleUpdateSlotReturnIntermediateFee(slot.id, idx, e.target.value)}
                                  placeholder="Stop fee e.g. 150"
                                  className="w-full h-8 pl-10 pr-2.5 rounded-lg border border-indigo-200 text-xs font-bold text-right focus:outline-none focus:border-indigo-600"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Option 2: Split Side-by-Side (Origin | Destination) with Middle Intermediate List */
              <div className="space-y-3 pt-0.5">
                {/* 0. RECENT ROUTES ACCELERATOR CHIPS */}
                {recentRoutesList.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-[#EEF1F6]/70 border border-slate-200/80 space-y-1.5 animate-fade-in mb-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold text-[#3E3C3D] uppercase tracking-wider flex items-center gap-1.5">
                        <RotateCcw className="w-3 h-3 text-[#FA634E]" />
                        RECENT ROUTES
                      </span>
                      <span className="text-[10px] font-bold text-[#6E6E80]">Click to prefill lane stops</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                      {recentRoutesList.map((route) => (
                        <button
                          key={route.key}
                          type="button"
                          onClick={() => handleApplyRecentRoute(route)}
                          className="p-2 rounded-xl bg-white border border-slate-200/90 hover:border-[#FA634E] hover:bg-orange-50/40 transition-all text-left group shadow-2xs cursor-pointer flex flex-col justify-between"
                        >
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-[#FA634E] shrink-0" />
                            <span className="text-xs font-extrabold text-[#3E3C3D] group-hover:text-[#FA634E] truncate">
                              {route.origin} → {route.destination}
                            </span>
                          </div>
                          <p className="text-[10px] font-semibold text-[#6E6E80] mt-1">
                            {route.stopsCount} Stops · Used {route.count} {route.count === 1 ? 'time' : 'times'} · {route.formattedLastUsed}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 1. TOP ROW: Side-by-Side Pickup (Origin) & Dropoff (Destination) Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* 🟢 PICKUP STOP CARD (ORIGIN) */}
                  <div className="rounded-xl border border-emerald-200/90 bg-emerald-50/40 dark:bg-emerald-950/20 p-2.5 space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-emerald-100 dark:border-emerald-900/50 pb-1.5">
                      <span className="text-xs font-black text-emerald-950 dark:text-emerald-100 uppercase tracking-wider flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600 fill-emerald-100" /> Pickup Stop (Origin)
                      </span>
                      <span className="text-[9px] font-bold text-emerald-700 bg-white dark:bg-slate-900 border border-emerald-200 px-2 py-0.5 rounded">
                        Route Start
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider block">
                          Pickup Location *
                        </label>
                        <LocationCombobox
                          customerId={contractCustomer}
                          value={slot.origin}
                          onChange={(locName, locObj) => handleSlotLocationChange(slot.id, 'origin', locName, locObj)}
                          placeholder="Search or select pickup location..."
                          triggerClassName="h-8.5 border-emerald-200 bg-white shadow-2xs"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-0.5">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-emerald-600" /> Pickup Date *
                          </label>
                          <DatePicker
                            value={slot.date || ''}
                            onChange={(_, dateStr) => handleUpdateTripSlot(slot.id, { date: dateStr, dropoffDate: dateStr })}
                            placeholder="Select date..."
                            buttonClassName="h-8.5 border-emerald-200 bg-white shadow-2xs font-semibold text-xs text-slate-800"
                            minDate={new Date()}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1">
                            <Clock className="w-3 h-3 text-emerald-600" /> Pickup Time *
                          </label>
                          <TimePicker
                            value={slot.pickupTime}
                            onChange={(timeStr) => handleUpdateTripSlot(slot.id, { pickupTime: timeStr })}
                            placeholder="Select time..."
                            buttonClassName="h-8.5 border-emerald-200 bg-white shadow-2xs font-semibold text-xs text-slate-800"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 🟠 DROPOFF STOP CARD (DESTINATION) */}
                  <div className="rounded-xl border border-orange-200/90 bg-orange-50/40 dark:bg-orange-950/20 p-2.5 space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-orange-100 dark:border-orange-900/50 pb-1.5">
                      <span className="text-xs font-black text-orange-950 dark:text-orange-100 uppercase tracking-wider flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-brand fill-orange-100" /> Dropoff Stop (Destination)
                      </span>

                      {Boolean(contractRateCategory && contractRateCategory.toLowerCase().includes('2 vehicles')) && (
                        <button
                          type="button"
                          onClick={() => handleUpdateTripSlot(slot.id, { isOvernight: !slot.isOvernight })}
                          className={`text-[9px] font-bold flex items-center gap-1 px-1.5 py-0.5 rounded transition-all whitespace-nowrap ${
                            slot.isOvernight
                              ? 'bg-indigo-600 text-white shadow-2xs'
                              : 'bg-white text-indigo-900 border border-indigo-200 hover:bg-indigo-50'
                          }`}
                          title="Toggle Overnight / Next-Day Return trip (+1 Day)"
                        >
                          <Moon className={`w-2.5 h-2.5 ${slot.isOvernight ? 'text-white fill-white' : 'text-indigo-600'}`} />
                          +1 Day
                        </button>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-orange-900 dark:text-orange-300 uppercase tracking-wider block">
                          Dropoff Location *
                        </label>
                        <LocationCombobox
                          customerId={contractCustomer}
                          value={slot.destination}
                          onChange={(locName, locObj) => handleSlotLocationChange(slot.id, 'destination', locName, locObj)}
                          placeholder="Search or select dropoff location..."
                          triggerClassName="h-8.5 bg-white shadow-2xs border-orange-200"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-0.5">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-orange-900 dark:text-orange-300 uppercase tracking-wider flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-brand" /> Drop-off Date *
                          </label>
                          <DatePicker
                            value={slot.dropoffDate || ''}
                            onChange={(_, dateStr) => handleUpdateTripSlot(slot.id, { dropoffDate: dateStr })}
                            placeholder="Select date..."
                            buttonClassName="h-8.5 border-orange-200 bg-white shadow-2xs font-semibold text-xs text-slate-800"
                            minDate={slot.date ? new Date(slot.date) : new Date()}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-orange-900 dark:text-orange-300 uppercase tracking-wider flex items-center gap-1">
                            <Clock className="w-3 h-3 text-brand" /> Drop-off Time *
                          </label>
                          <div className="flex items-center gap-1">
                            <TimePicker
                              value={slot.dropoffTime}
                              onChange={(timeStr) => handleUpdateTripSlot(slot.id, { dropoffTime: timeStr })}
                              placeholder="Select time..."
                              buttonClassName="flex-1 h-8.5 border-orange-200 bg-white shadow-2xs font-semibold text-xs text-slate-800"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const [hh, mm] = (slot.dropoffTime || '12:00').split(':').map(Number);
                                const newHour = (hh + 1) % 24;
                                const newTime = `${String(newHour).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
                                const newDate = newHour === 0 ? addDays(slot.dropoffDate || slot.date, 1) : (slot.dropoffDate || slot.date);
                                handleUpdateTripSlot(slot.id, {
                                  dropoffTime: newTime,
                                  dropoffDate: newDate,
                                  isOvernight: newHour === 0 ? true : slot.isOvernight
                                });
                              }}
                              className="h-8.5 w-8.5 p-0 rounded-lg border-orange-200 bg-white text-brand hover:bg-orange-50 shrink-0"
                              title="Add 1 Hour"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
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
                    handleUpdateTripSlot(slot.id, {
                      dropoffTime: suggestedTime,
                      ...(isOvernight ? { isOvernight: true } : {}),
                    });
                  }}
                />

                {/* 2. MIDDLE ROW: Intermediate Stops & Per-Stop Custom Surcharge Fees */}
                {slot.intermediateLocations.length > 0 && (
                  <div className="space-y-2 pt-1 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                        Intermediate Stops & Fees ({slot.intermediateLocations.length})
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px] font-bold text-brand hover:bg-orange-50"
                        onClick={() => handleAddSlotIntermediate(slot.id)}
                      >
                        <Plus className="w-3 h-3 mr-1" /> Add Another Stop
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {slot.intermediateLocations.map((loc: string, idx: number) => (
                        <div key={idx} className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-1.5 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                              <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 font-extrabold text-[10px] grid place-items-center">
                                {idx + 1}
                              </span>
                              Intermediate Stop #{idx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveSlotIntermediate(slot.id, idx)}
                              className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                              title="Remove stop"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div className="sm:col-span-2">
                              <LocationCombobox
                                customerId={contractCustomer}
                                value={loc}
                                onChange={(locId, locObj) => handleUpdateSlotIntermediate(slot.id, idx, locObj?.name || locObj?.address || (isUuid(locId) ? '' : locId))}
                                placeholder={`Search stop location (e.g. Al-Hasa)...`}
                                triggerClassName="h-8.5 border-slate-200 bg-white"
                              />
                            </div>
                            <div className="relative">
                              <span className="absolute left-2.5 top-2.5 text-[11px] font-bold text-slate-400">SAR</span>
                              <input
                                type="number"
                                value={slot.intermediateStopFees?.[idx] || ''}
                                onChange={(e) => handleUpdateSlotIntermediateFee(slot.id, idx, e.target.value)}
                                placeholder="Stop Fee (e.g. 150)"
                                className="w-full h-8.5 pl-10 pr-2.5 rounded-lg border border-slate-200 text-xs font-bold text-right focus:outline-none focus:border-brand"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TripStep2Route;
