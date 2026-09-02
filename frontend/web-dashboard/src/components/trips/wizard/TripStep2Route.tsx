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
  ArrowRight,
  Sliders,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import LocationCombobox from '@/components/quotations/LocationCombobox';
import TransitTimeBadge from '@/components/trips/TransitTimeBadge';
import { DatePicker } from '@/components/ui/date-picker';
import { TimePicker } from '@/components/ui/time-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getAllTaxonomyOptions, resolveTaxonomyOption } from '@/utils/taxonomyRegistry';
import { cn, isUuid } from '@/lib/utils';

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
  setContractRateCategory?: (cat: string) => void;
  triggerRateLookupForSlots?: (vType?: string, rCat?: string, custId?: string, bType?: string) => void;
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
  normalizeRateCategory?: (cat?: string | null) => string;
}

export const TripStep2Route: React.FC<TripStep2RouteProps> = ({
  contractSlots,
  contractCustomer,
  contractRateCategory,
  setContractRateCategory,
  triggerRateLookupForSlots,
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
  normalizeRateCategory,
}) => {
  const currentCategory = (normalizeRateCategory ? normalizeRateCategory(contractRateCategory) : contractRateCategory) || 'Single Trip';
  const isRoundTrip = isRoundTripCategory(contractRateCategory) || currentCategory === 'Round Trip';
  const isDuty = currentCategory.includes('10 Hours') || currentCategory.includes('12 Hours') || currentCategory.includes('Duty');

  return (
    <div className="space-y-4 animate-fade-in text-[#3E3C3D]">
      {/* 2-COLUMN WORKSPACE: LEFT (ROUTE WORKSPACE ~65-70%) & RIGHT (SCHEDULE + LINE TYPE PANEL ~30-35%) */}
      {contractSlots.map((slot, slotIdx) => (
        <div key={slot.id} className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* LEFT COLUMN: ROUTE WORKSPACE (lg:col-span-8 ~65-70% WIDTH) */}
          <div className="lg:col-span-8 space-y-4">
            {/* RECENTLY USED ROUTES QUICK-PICKER */}
            {recentRoutesList && recentRoutesList.length > 0 && (
              <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <RotateCcw className="w-3.5 h-3.5 text-brand" /> RECENTLY USED ROUTES
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">Click to populate route</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentRoutesList.slice(0, 4).map((r, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleApplyRecentRoute(r)}
                      className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:border-brand hover:text-brand transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <MapPin className="w-3 h-3 text-brand" />
                      <span>{r.origin || 'Origin'}</span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span>{r.destination || 'Destination'}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

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

            {isRoundTrip ? (
              /* A. ROUND TRIP DUAL-LEG WORKSPACE (LEG 1 + LEG 2 SIDE-BY-SIDE 2 COLUMNS) */
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 items-start">
                {/* LEG 1: OUTBOUND JOURNEY */}
                <div className="p-3.5 rounded-xl border border-emerald-200/90 dark:border-emerald-900 bg-white dark:bg-slate-900 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-emerald-100 dark:border-emerald-900">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white font-extrabold text-[10px] tracking-wider uppercase">
                        LEG 1
                      </span>
                      <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100">Outbound Journey</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddSlotIntermediate(slot.id)}
                      className="h-6.5 text-xs font-bold border-emerald-200 text-emerald-800 hover:bg-emerald-50 gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3 text-emerald-600" /> Add Stop
                    </Button>
                  </div>

                  {/* Leg 1 Origin */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-extrabold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider block">
                      LEG 1 ORIGIN LOCATION *
                    </label>
                    <LocationCombobox
                      id="step2-first-field"
                      customerId={contractCustomer}
                      value={slot.origin}
                      onChange={(locName, locObj) => handleSlotLocationChange(slot.id, 'origin', locName, locObj)}
                      placeholder="Search Leg 1 origin (e.g. Riyadh Distribution Centre)..."
                      triggerClassName="h-9 border-slate-200 bg-white text-xs font-semibold shadow-2xs"
                    />
                  </div>

                  {/* Leg 1 Intermediate Stops */}
                  {slot.intermediateLocations.length > 0 && (
                    <div className="pl-3 border-l-2 border-emerald-200 dark:border-emerald-900 my-1.5 space-y-2">
                      {slot.intermediateLocations.map((loc: string, idx: number) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-emerald-600" /> Leg 1 Stop #{idx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveSlotIntermediate(slot.id, idx)}
                              className="text-xs font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>
                          <LocationCombobox
                            customerId={contractCustomer}
                            value={loc}
                            onChange={(locId, locObj) => handleUpdateSlotIntermediate(slot.id, idx, locObj?.name || locObj?.address || (isUuid(locId) ? '' : locId))}
                            placeholder={`Search Leg 1 Stop #${idx + 1}...`}
                            triggerClassName="h-9 border-slate-200 bg-white text-xs font-medium shadow-2xs"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Leg 1 Destination */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-extrabold text-orange-800 dark:text-orange-400 uppercase tracking-wider block">
                      LEG 1 DESTINATION LOCATION *
                    </label>
                    <LocationCombobox
                      customerId={contractCustomer}
                      value={slot.destination}
                      onChange={(locName, locObj) => handleSlotLocationChange(slot.id, 'destination', locName, locObj)}
                      placeholder="Search Leg 1 destination (e.g. Al Baha Station)..."
                      triggerClassName="h-9 border-slate-200 bg-white text-xs font-semibold shadow-2xs"
                    />
                  </div>
                </div>

                {/* LEG 2: RETURN JOURNEY LOOP */}
                <div className="p-3.5 rounded-xl border border-indigo-200/90 dark:border-indigo-900 bg-indigo-50/20 dark:bg-indigo-950/20 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-indigo-100 dark:border-indigo-900">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white font-extrabold text-[10px] tracking-wider uppercase">
                        LEG 2
                      </span>
                      <span className="text-xs font-extrabold text-indigo-950 dark:text-indigo-200">Return Journey Loop</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddSlotReturnIntermediate(slot.id)}
                      className="h-6.5 text-xs font-bold border-indigo-200 text-brand hover:bg-orange-50 gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3 text-brand" /> Add Stop
                    </Button>
                  </div>

                  {/* Return Pickup Banner */}
                  <div className="p-2 rounded-lg bg-white/90 border border-indigo-200/80 flex items-center justify-between text-xs shadow-2xs">
                    <span className="font-extrabold text-slate-800 flex items-center gap-1.5 truncate">
                      <RotateCcw className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span className="truncate">Return Pickup: {slot.destination || 'Leg 1 Destination'}</span>
                    </span>
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200 shrink-0">Auto-Linked Loop</span>
                  </div>

                  {/* Leg 2 Return Intermediate Stops */}
                  {slot.returnIntermediateLocations?.length > 0 && (
                    <div className="pl-3 border-l-2 border-indigo-300 dark:border-indigo-900 my-1.5 space-y-2">
                      {slot.returnIntermediateLocations.map((loc: string, idx: number) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-indigo-600" /> Leg 2 Stop #{idx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveSlotReturnIntermediate(slot.id, idx)}
                              className="text-xs font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>
                          <LocationCombobox
                            customerId={contractCustomer}
                            value={loc}
                            onChange={(locId, locObj) => handleUpdateSlotReturnIntermediate(slot.id, idx, locObj?.name || locObj?.address || (isUuid(locId) ? '' : locId))}
                            placeholder={`Search Leg 2 Stop #${idx + 1}...`}
                            triggerClassName="h-9 border-slate-200 bg-white text-xs font-medium shadow-2xs"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Leg 2 Final Home Location */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-extrabold text-purple-900 dark:text-purple-300 uppercase tracking-wider block">
                      LEG 2 FINAL HOME LOCATION *
                    </label>
                    <LocationCombobox
                      customerId={contractCustomer}
                      value={slot.returnDestination || slot.origin}
                      onChange={(locName, locObj) => handleUpdateTripSlot(slot.id, {
                        returnDestination: locObj?.name || locObj?.address || (isUuid(locName) ? slot.origin : locName),
                        returnDestinationLat: locObj?.lat ?? null,
                        returnDestinationLng: locObj?.lng ?? null
                      })}
                      placeholder="Search final home destination..."
                      triggerClassName="h-9 border-purple-200 bg-white text-xs font-semibold shadow-2xs"
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* C. SINGLE TRIP 1-WAY ROUTE WORKSPACE */
              <div className="p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-extrabold text-[#3E3C3D] dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-brand shrink-0" /> ROUTE
                  </h4>
                </div>

                <div className="space-y-3 relative">
                  {/* Origin */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200 shrink-0" />
                      ORIGIN *
                    </label>
                    <LocationCombobox
                      id="step2-first-field-oneway"
                      customerId={contractCustomer}
                      value={slot.origin}
                      onChange={(locName, locObj) => handleSlotLocationChange(slot.id, 'origin', locName, locObj)}
                      placeholder="Search starting origin (e.g. Riyadh Distribution Centre)..."
                      triggerClassName="h-9.5 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold shadow-2xs"
                    />
                  </div>

                  {/* Route Connector Line & Intermediate Stops */}
                  <div className="pl-3.5 border-l-2 border-slate-200 dark:border-slate-800 my-2 space-y-3">
                    {slot.intermediateLocations.map((loc: string, idx: number) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-emerald-600" /> Stop #{idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSlotIntermediate(slot.id, idx)}
                            className="text-xs font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                        <LocationCombobox
                          customerId={contractCustomer}
                          value={loc}
                          onChange={(locId, locObj) => handleUpdateSlotIntermediate(slot.id, idx, locObj?.name || locObj?.address || (isUuid(locId) ? '' : locId))}
                          placeholder={`Search Stop #${idx + 1}...`}
                          triggerClassName="h-9.5 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium shadow-2xs"
                        />
                      </div>
                    ))}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddSlotIntermediate(slot.id)}
                      className="h-8 text-xs font-bold border-slate-200 dark:border-slate-800 text-brand hover:bg-orange-50 dark:hover:bg-orange-950/30 gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-brand" /> Add Stop
                    </Button>
                  </div>

                  {/* Destination */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-orange-800 dark:text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-brand ring-2 ring-orange-200 shrink-0" />
                      DESTINATION *
                    </label>
                    <LocationCombobox
                      customerId={contractCustomer}
                      value={slot.destination}
                      onChange={(locName, locObj) => handleSlotLocationChange(slot.id, 'destination', locName, locObj)}
                      placeholder="Search delivery destination (e.g. Al Baha Station)..."
                      triggerClassName="h-9.5 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold shadow-2xs"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: SCHEDULE & LINE TYPE PANEL (lg:col-span-4 ~30-35% WIDTH) */}
          <div className="lg:col-span-4 space-y-3">
            <div className="p-3 rounded-xl border border-[#FFDCD6] bg-white dark:bg-slate-900 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between pb-1.5 border-b border-[#FFDCD6]">
                <h4 className="text-xs font-extrabold text-[#FA634E] uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#FA634E] shrink-0" /> SCHEDULE & SERVICE
                </h4>
                <span className="text-[10px] font-bold text-[#FA634E] bg-[#FFF5F2] border border-[#FFDCD6] px-2 py-0.5 rounded-full">
                  Service Config
                </span>
              </div>

              {/* 1. LINE TYPE SEGMENTED SELECTOR (CLEAN & ERGONOMIC) */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#3E3C3D] dark:text-slate-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Line Type <span className="text-brand">*</span></span>
                  <span className="text-[9px] text-slate-400 font-normal normal-case">Controls route structure</span>
                </label>
                {(() => {
                  const lineTypeTaxonomyOptions = getAllTaxonomyOptions('LINE_TYPE');
                  const selectedOpt = resolveTaxonomyOption('LINE_TYPE', currentCategory);

                  return (
                    <div className="grid grid-cols-2 gap-1.5">
                      {lineTypeTaxonomyOptions.map((opt) => {
                        const isSelected = selectedOpt?.id === opt.id || selectedOpt?.code === opt.code;

                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              if (setContractRateCategory) {
                                setContractRateCategory(opt.label);
                              }
                              if (triggerRateLookupForSlots) {
                                triggerRateLookupForSlots(undefined, opt.label);
                              }
                            }}
                            className={cn(
                              "h-8 px-2.5 rounded-lg border text-xs font-bold flex items-center justify-between transition-all cursor-pointer",
                              isSelected
                                ? cn(
                                    "shadow-2xs ring-1",
                                    opt.colorTheme.bg,
                                    opt.colorTheme.text,
                                    opt.colorTheme.border,
                                    opt.colorTheme.darkBg,
                                    opt.colorTheme.darkText
                                  )
                                : "bg-slate-50/70 hover:bg-slate-100 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800"
                            )}
                          >
                            <span className="flex items-center gap-1.5 truncate">
                              <span
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: opt.colorTheme.hex }}
                              />
                              <span className="truncate">{opt.label}</span>
                            </span>
                            {isSelected && (
                              <span className="w-1.5 h-1.5 rounded-full bg-brand shrink-0 animate-pulse" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-2 space-y-2">
                {/* 2. PICKUP SCHEDULE */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#3E3C3D] dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-emerald-600" /> PICKUP SCHEDULE
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <DatePicker
                      value={slot.date || ''}
                      onChange={(_, dateStr) => handleUpdateTripSlot(slot.id, { date: dateStr, dropoffDate: dateStr })}
                      placeholder="Select date..."
                      buttonClassName="h-8 border-slate-200 bg-white shadow-2xs font-semibold text-xs text-slate-800 px-2.5"
                      minDate={new Date()}
                    />
                    <TimePicker
                      value={slot.pickupTime}
                      onChange={(timeStr) => handleUpdateTripSlot(slot.id, { pickupTime: timeStr })}
                      placeholder="Select time..."
                      buttonClassName="h-8 border-slate-200 bg-white shadow-2xs font-semibold text-xs text-slate-800 px-2.5"
                    />
                  </div>
                </div>

                {/* 3. DROPOFF SCHEDULE */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#3E3C3D] dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-brand" /> DROPOFF SCHEDULE
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <DatePicker
                      value={slot.dropoffDate || ''}
                      onChange={(_, dateStr) => handleUpdateTripSlot(slot.id, { dropoffDate: dateStr })}
                      placeholder="Select date..."
                      buttonClassName="h-8 border-slate-200 bg-white shadow-2xs font-semibold text-xs text-slate-800 px-2.5"
                      minDate={slot.date ? new Date(slot.date) : new Date()}
                    />
                    <TimePicker
                      value={slot.dropoffTime}
                      onChange={(timeStr) => handleUpdateTripSlot(slot.id, { dropoffTime: timeStr })}
                      placeholder="Select time..."
                      buttonClassName="h-8 border-slate-200 bg-white shadow-2xs font-semibold text-xs text-slate-800 px-2.5"
                    />
                  </div>
                </div>

                {/* 4. OVERNIGHT STATUS INDICATOR (AUTO-CALCULATED) */}
                <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-[#3E3C3D] dark:text-slate-200 flex items-center gap-1.5">
                    <Moon className="w-3.5 h-3.5 text-indigo-500" /> Overnight Trip
                  </span>
                  {slot.isOvernight ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-extrabold flex items-center gap-1 shadow-2xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                      ON (+1 Day)
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 text-[10px] font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                      OFF (Same Day)
                    </span>
                  )}
                </div>

                {/* 5. TRANSIT ESTIMATE BADGE (MERCON CORAL ORANGE STYLING) */}
                <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800">
                  <TransitTimeBadge
                    origin={slot.origin}
                    destination={slot.destination}
                    returnDestination={slot.returnDestination}
                    isRoundTrip={isRoundTrip}
                    intermediateLocations={slot.intermediateLocations}
                    returnIntermediateLocations={slot.returnIntermediateLocations}
                    originLat={slot.originLat}
                    originLng={slot.originLng}
                    destinationLat={slot.destinationLat}
                    destinationLng={slot.destinationLng}
                    pickupTime={slot.pickupTime}
                    dropoffTime={slot.dropoffTime}
                    onAutoSetDropoffTime={(suggestedTime, isOvernight) => {
                      handleUpdateTripSlot(slot.id, {
                        dropoffTime: suggestedTime,
                        isOvernight: isOvernight,
                      });
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

        </div>
      ))}
    </div>
  );
};

export default TripStep2Route;
