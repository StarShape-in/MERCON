import React from 'react';
import { MapPin, Plus, Trash2, Calendar, Clock, Moon, RotateCcw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LocationCombobox from '@/components/quotations/LocationCombobox';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { TimePicker } from '@/components/ui/time-picker';
import TransitTimeBadge from '@/components/trips/TransitTimeBadge';
import { RouteMiniMap } from '@/components/trips/RouteMiniMap';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getAllTaxonomyOptions, resolveTaxonomyOption } from '@/utils/taxonomyRegistry';
import { isDateTimeInPast } from '@/utils/pastDateTripUtils';
import { cn, isUuid } from '@/lib/utils';

interface RouteWorkspaceProps {
  slot: any;
  contractCustomer: string;
  isRoundTrip: boolean;
  canRemoveSlot: boolean;
  contractRateCategory?: string;
  contractBillingType?: string;
  setContractRateCategory?: (cat: string) => void;
  triggerRateLookupForSlots?: (vType?: string, rCat?: string, custId?: string, bType?: string) => void;
  handleAddSlotIntermediate: (slotId: string) => void;
  handleRemoveTripSlot: (slotId: string) => void;
  handleSlotLocationChange: (slotId: string, field: 'origin' | 'destination', locName: string, locObj: any) => void;
  handleUpdateTripSlot: (slotId: string, patch: any) => void;
  handleRemoveSlotIntermediate: (slotId: string, idx: number) => void;
  handleUpdateSlotIntermediate: (slotId: string, idx: number, val: string) => void;
  handleAddSlotReturnIntermediate?: (slotId: string) => void;
  handleRemoveSlotReturnIntermediate?: (slotId: string, idx: number) => void;
  handleUpdateSlotReturnIntermediate?: (slotId: string, idx: number, val: string) => void;
  fieldErrors?: Record<string, boolean>;
}

export const RouteWorkspace: React.FC<RouteWorkspaceProps> = ({
  slot,
  contractCustomer,
  isRoundTrip,
  canRemoveSlot,
  contractRateCategory = 'Single Trip',
  contractBillingType,
  setContractRateCategory,
  triggerRateLookupForSlots,
  handleAddSlotIntermediate,
  handleRemoveTripSlot,
  handleSlotLocationChange,
  handleUpdateTripSlot,
  handleRemoveSlotIntermediate,
  handleUpdateSlotIntermediate,
  handleAddSlotReturnIntermediate,
  handleRemoveSlotReturnIntermediate,
  handleUpdateSlotReturnIntermediate,
  fieldErrors = {},
}) => {
  const lineTypeTaxonomyOptions = getAllTaxonomyOptions('LINE_TYPE');
  const selectedTaxonomyOption = resolveTaxonomyOption('LINE_TYPE', contractRateCategory);
  const isMonthly = contractBillingType?.toLowerCase() === 'monthly';

  const pickupIsoValue = React.useMemo(() => {
    if (!slot.date || !slot.pickupTime) return null;
    const time = slot.pickupTime;
    const cleanTime = time.includes(':') ? time.split(' ')[0] : '08:00';
    return `${slot.date}T${cleanTime.length === 4 ? '0' + cleanTime : cleanTime}`;
  }, [slot.date, slot.pickupTime]);

  const dropoffIsoValue = React.useMemo(() => {
    if (!slot.dropoffDate) return null;
    const time = slot.dropoffTime || '';
    const cleanTime = time.includes(':') ? time.split(' ')[0] : '14:00';
    return `${slot.dropoffDate}T${cleanTime.length === 4 ? '0' + cleanTime : cleanTime}`;
  }, [slot.dropoffDate, slot.dropoffTime]);

  const pickupDateObj = React.useMemo(() => {
    if (!pickupIsoValue) return undefined;
    const d = new Date(pickupIsoValue);
    return isNaN(d.getTime()) ? undefined : d;
  }, [pickupIsoValue]);

  const isPastSchedule = React.useMemo(() => {
    if (isMonthly || !slot.date) return false;
    return isDateTimeInPast(slot.date, slot.pickupTime);
  }, [isMonthly, slot.date, slot.pickupTime]);

  const scheduleError = React.useMemo(() => {
    if (isMonthly) return null;
    if (!slot.date) return null;
    const dropoffDate = slot.dropoffDate || slot.date;
    if (!dropoffDate) return null;

    const pTime = (slot.pickupTime || '').split(' ')[0];
    const dTime = (slot.dropoffTime || '').split(' ')[0];

    // 1. Date comparison
    if (dropoffDate < slot.date) {
      return 'Drop-off date cannot be before start date.';
    }

    // 2. Same date time comparison
    if (dropoffDate === slot.date && dTime <= pTime) {
      return 'Drop-off time must be after the start time.';
    }

    // 3. Exact ISO timestamp comparison
    if (pickupIsoValue && dropoffIsoValue) {
      const pTs = new Date(pickupIsoValue).getTime();
      const dTs = new Date(dropoffIsoValue).getTime();
      if (!isNaN(pTs) && !isNaN(dTs) && dTs <= pTs) {
        return 'Drop-off date and time must be strictly later than start date and time.';
      }
    }

    return null;
  }, [isMonthly, slot.date, slot.dropoffDate, slot.pickupTime, slot.dropoffTime, pickupIsoValue, dropoffIsoValue]);

  return (
    <div className="space-y-3 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-3.5 rounded-2xl shadow-2xs">
      {/* COMPACT INLINE SLOT HEADER: LINE TYPE + OVERNIGHT */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider shrink-0">
            LINE TYPE:
          </span>
          <Select
            value={contractRateCategory}
            onValueChange={(val) => {
              if (setContractRateCategory) setContractRateCategory(val);
              handleUpdateTripSlot(slot.id, { rateCategory: val, matchedRateCard: null });
              if (triggerRateLookupForSlots) triggerRateLookupForSlots(undefined, val);
            }}
          >
            <SelectTrigger className="h-7.5 rounded-lg border-slate-200 bg-white text-xs font-bold text-slate-800 shadow-2xs w-[145px]">
              <div className="flex items-center gap-1.5">
                {selectedTaxonomyOption ? (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-extrabold border",
                      selectedTaxonomyOption.colorTheme.bg,
                      selectedTaxonomyOption.colorTheme.text,
                      selectedTaxonomyOption.colorTheme.border
                    )}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: selectedTaxonomyOption.colorTheme.hex }} />
                    <span>{selectedTaxonomyOption.label}</span>
                  </span>
                ) : (
                  <SelectValue placeholder="Select Line Type" />
                )}
              </div>
            </SelectTrigger>
            <SelectContent className="z-[9999]">
              {lineTypeTaxonomyOptions.map((opt) => (
                <SelectItem key={opt.id} value={opt.label} className="text-xs font-bold py-1.5 cursor-pointer">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* COMPACT INLINE TRANSIT TIME BADGE NEXT TO LINE TYPE */}
          {slot.origin && slot.destination && (
            <TransitTimeBadge
              origin={slot.origin}
              destination={slot.destination}
              originLat={slot.originLat}
              originLng={slot.originLng}
              destinationLat={slot.destinationLat}
              destinationLng={slot.destinationLng}
              pickupDate={slot.date || slot.pickupDate}
              pickupTime={slot.pickupTime || ''}
              onAutoSetDropoffDateTime={(dDate, dTime, isOvernight) => {
                if (slot.pickupTime && slot.pickupTime.trim()) {
                  handleUpdateTripSlot(slot.id, { dropoffDate: dDate, dropoffTime: dTime, isOvernight });
                }
              }}
              compact
            />
          )}
        </div>

        {/* RIGHT: REMOVE SLOT (IF MULTI-SLOT) */}
        {canRemoveSlot && (
          <button
            type="button"
            onClick={() => handleRemoveTripSlot(slot.id)}
            className="text-slate-400 hover:text-rose-600 transition-colors p-1 cursor-pointer"
            title="Remove trip slot"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* UNIFIED LOCATION & SCHEDULE INPUT FIELDS */}
      <div className="w-full space-y-2.5">
          {/* LINE 1: ORIGIN + UNIFIED PICKUP DATETIME */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-start">
            {/* ORIGIN LOCATION (BALANCED 8 COLS) */}
            <div id={`field-origin-${slot.id}`} className="md:col-span-8 space-y-1">
              <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between h-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" /> ORIGIN LOCATION <span className="text-[#FA634E]">*</span>
                </span>
                {(fieldErrors?.[`origin-${slot.id}`] || fieldErrors?.['origin']) && (
                  <span className="text-[9px] font-bold text-red-500 animate-pulse">Required</span>
                )}
              </label>
              <LocationCombobox
                id="step2-first-field"
                customerId={contractCustomer}
                value={slot.origin}
                hasError={Boolean(fieldErrors?.[`origin-${slot.id}`] || fieldErrors?.['origin'])}
                onChange={(locName, locObj) => handleSlotLocationChange(slot.id, 'origin', locName, locObj)}
                placeholder="Search starting origin (e.g. Riyadh Distribution Centre)..."
                triggerClassName="h-9 border-slate-200 bg-white text-xs font-bold text-[#3E3C3D] dark:text-slate-100 shadow-2xs w-full"
              />
            </div>

            {/* COMBINED PICKUP DATE & TIME (4 COLS) */}
            <div className="md:col-span-4 space-y-1">
              <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between h-4">
                <span className="flex items-center gap-1 truncate">
                  {isMonthly ? (
                    <>
                      <Clock className="w-3 h-3 text-emerald-600 shrink-0" /> PICKUP TIME
                    </>
                  ) : (
                    <>
                      <Calendar className="w-3 h-3 text-emerald-600 shrink-0" /> PICKUP SCHEDULE
                    </>
                  )}
                </span>
                {!isMonthly && isPastSchedule && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 text-[9px] font-black border border-amber-200 dark:border-amber-900 shrink-0 animate-fade-in">
                    <Clock className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" /> Past Time
                  </span>
                )}
              </label>
              {isMonthly ? (
                <TimePicker
                  value={slot.pickupTime || ''}
                  onChange={(timeStr) => {
                    handleUpdateTripSlot(slot.id, {
                      pickupTime: timeStr,
                      ...(!timeStr ? { dropoffTime: '' } : {}),
                    });
                  }}
                  placeholder="Select pickup time..."
                  buttonClassName="h-9 rounded-xl border-slate-200 bg-white shadow-2xs font-semibold text-xs text-slate-800 px-3 w-full"
                />
              ) : (
                <DateTimePicker
                  value={pickupIsoValue}
                  onChange={(isoStr) => {
                    if (!isoStr) {
                      handleUpdateTripSlot(slot.id, {
                        pickupTime: '',
                        dropoffTime: '',
                      });
                      return;
                    }
                    const [dPart, tPart] = isoStr.split('T');
                    const cleanTime = tPart ? tPart.substring(0, 5) : '';
                    handleUpdateTripSlot(slot.id, {
                      date: dPart,
                      pickupTime: cleanTime,
                      ...(!cleanTime ? { dropoffTime: '' } : {}),
                    });
                  }}
                  placeholder="Pick date & time..."
                  showPresets={false}
                  showRelativeBadge={false}
                  className="h-9 rounded-xl border-slate-200 bg-white shadow-2xs text-xs font-semibold"
                />
              )}
            </div>
          </div>

          {/* INTERMEDIATE STOPS (IF ANY) */}
          {slot.intermediateLocations?.length > 0 && (
            <div className="pl-3 border-l-2 border-dashed border-amber-300 space-y-1.5 py-0.5">
              {slot.intermediateLocations.map((stopVal: string, idx: number) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 shrink-0">
                    Stop #{idx + 1}
                  </span>
                  <div className="flex-1">
                    <LocationCombobox
                      customerId={contractCustomer}
                      value={stopVal}
                      onChange={(locId, locObj) => {
                        const val = locObj?.name || locObj?.address || (isUuid(locId) ? '' : locId);
                        handleUpdateSlotIntermediate(slot.id, idx, val);
                      }}
                      placeholder={`Search intermediate stop #${idx + 1}...`}
                      triggerClassName="h-8 text-xs font-semibold"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveSlotIntermediate(slot.id, idx)}
                    className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleAddSlotIntermediate(slot.id)}
              className="h-6.5 text-[11px] font-bold border-dashed border-slate-300 hover:border-brand hover:bg-orange-50 text-slate-600 hover:text-brand gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" /> Add Intermediate Stop
            </Button>
          </div>

          {/* LINE 2: DESTINATION LOCATION + UNIFIED DROPOFF DATETIME */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-start pt-1 border-t border-slate-100 dark:border-slate-800">
            {/* DESTINATION LOCATION (BALANCED 8 COLS) */}
            <div id={`field-destination-${slot.id}`} className="md:col-span-8 space-y-1">
              <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between h-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" /> {isRoundTrip ? 'OUTBOUND DESTINATION *' : 'DESTINATION LOCATION *'}
                </span>
                {(fieldErrors?.[`destination-${slot.id}`] || fieldErrors?.['destination']) && (
                  <span className="text-[9px] font-bold text-red-500 animate-pulse">Required</span>
                )}
              </label>
              <LocationCombobox
                customerId={contractCustomer}
                value={slot.destination}
                hasError={Boolean(fieldErrors?.[`destination-${slot.id}`] || fieldErrors?.['destination'])}
                onChange={(locName, locObj) => handleSlotLocationChange(slot.id, 'destination', locName, locObj)}
                placeholder="Search delivery destination (e.g. Al Baha Station)..."
                triggerClassName="h-9 border-slate-200 bg-white text-xs font-bold text-[#3E3C3D] dark:text-slate-100 shadow-2xs w-full"
              />
            </div>

            {/* COMBINED DROPOFF DATE & TIME (4 COLS) */}
            <div className="md:col-span-4 space-y-1">
              <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1 truncate h-4">
                {isMonthly ? (
                  <>
                    <Clock className="w-3 h-3 text-[#FA634E] shrink-0" /> {isRoundTrip ? 'OUTBOUND ARRIVAL TIME' : 'DROPOFF TIME'}
                  </>
                ) : (
                  <>
                    <Calendar className="w-3 h-3 text-[#FA634E] shrink-0" /> {isRoundTrip ? 'OUTBOUND ARRIVAL' : 'DROPOFF SCHEDULE'}
                  </>
                )}
              </label>
              {isMonthly ? (
                <TimePicker
                  value={slot.dropoffTime || ''}
                  onChange={(timeStr) => {
                    handleUpdateTripSlot(slot.id, {
                      dropoffTime: timeStr,
                    });
                  }}
                  placeholder="Select dropoff time..."
                  buttonClassName="h-9 rounded-xl border-slate-200 bg-white shadow-2xs font-semibold text-xs text-slate-800 px-3 w-full"
                />
              ) : (
                <DateTimePicker
                  value={dropoffIsoValue}
                  minDate={pickupDateObj}
                  error={!!scheduleError}
                  onChange={(isoStr) => {
                    if (!isoStr) {
                      handleUpdateTripSlot(slot.id, { dropoffDate: '', dropoffTime: '' });
                      return;
                    }
                    const [dPart, tPart] = isoStr.split('T');
                    const cleanTime = tPart ? tPart.substring(0, 5) : '';
                    handleUpdateTripSlot(slot.id, { dropoffDate: dPart, dropoffTime: cleanTime });
                  }}
                  placeholder="Pick date & time..."
                  showPresets={false}
                  showRelativeBadge={false}
                  className="h-9 rounded-xl border-slate-200 bg-white shadow-2xs text-xs font-semibold"
                />
              )}
              {!isMonthly && scheduleError && (
                <div className="flex items-center gap-1.5 mt-1 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{scheduleError}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ROUND TRIP LEG 2: RETURN JOURNEY (ONLY VISIBLE WHEN LINE TYPE IS ROUND TRIP) */}
        {isRoundTrip && (
          <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 space-y-2 pt-2.5 animate-fade-in">
            <div className="flex items-center justify-between pb-1 border-b border-amber-200/80 dark:border-amber-900/80">
              <span className="text-[11px] font-extrabold text-amber-900 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5 text-amber-600 shrink-0" /> LEG 2: RETURN JOURNEY ({slot.returnOrigin || slot.destination || 'Destination'} → {(!slot.returnDestination || isUuid(slot.returnDestination)) ? (slot.origin || 'Origin') : slot.returnDestination})
              </span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100">
                🔄 Round Trip Active
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              {/* RETURN LOADING LOCATION */}
              <div className="md:col-span-6 space-y-1">
                <label className="text-[10px] font-extrabold text-amber-800 dark:text-amber-300 uppercase tracking-wider block">
                  RETURN LOADING LOCATION *
                </label>
                <LocationCombobox
                  customerId={contractCustomer}
                  value={slot.returnOrigin || slot.destination}
                  onChange={(locId, locObj) => {
                    const val = locObj?.name || locObj?.address || (isUuid(locId) ? '' : locId);
                    handleUpdateTripSlot(slot.id, { returnOrigin: val, returnOriginLocationId: locObj?.id || (isUuid(locId) ? locId : null) });
                  }}
                  placeholder="Return loading (defaults to Outbound Destination)..."
                  triggerClassName="h-9 border-slate-200 bg-[#FFFFFF] text-xs font-bold text-[#3E3C3D] dark:text-slate-100 shadow-2xs w-full"
                />
              </div>

              {/* RETURN DESTINATION LOCATION */}
              <div className="md:col-span-6 space-y-1">
                <label className="text-[10px] font-extrabold text-amber-800 dark:text-amber-300 uppercase tracking-wider block">
                  RETURN DESTINATION LOCATION *
                </label>
                <LocationCombobox
                  customerId={contractCustomer}
                  value={slot.returnDestination || slot.origin}
                  onChange={(locId, locObj) => {
                    const val = locObj?.name || locObj?.address || (isUuid(locId) ? '' : locId);
                    handleUpdateTripSlot(slot.id, { returnDestination: val, returnDestinationLocationId: locObj?.id || (isUuid(locId) ? locId : null) });
                  }}
                  placeholder="Return destination (defaults to Origin)..."
                  triggerClassName="h-9 border-slate-200 bg-[#FFFFFF] text-xs font-bold text-[#3E3C3D] dark:text-slate-100 shadow-2xs w-full"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              {handleAddSlotReturnIntermediate && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddSlotReturnIntermediate(slot.id)}
                  className="h-7 text-[11px] font-bold border-dashed border-amber-300 hover:border-amber-500 bg-white text-amber-800 gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Add Return Intermediate Stop
                </Button>
              )}
            </div>

            {/* RETURN INTERMEDIATE STOPS */}
            {slot.returnIntermediateLocations?.length > 0 && (
              <div className="pl-3 border-l-2 border-dashed border-amber-400 space-y-1.5 py-1">
                {slot.returnIntermediateLocations.map((rStop: string, rIdx: number) => (
                  <div key={rIdx} className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded shrink-0">
                      Return Stop #{rIdx + 1}
                    </span>
                    <div className="flex-1">
                      <LocationCombobox
                        customerId={contractCustomer}
                        value={rStop}
                        onChange={(locId, locObj) => {
                          const val = locObj?.name || locObj?.address || (isUuid(locId) ? '' : locId);
                          handleUpdateSlotReturnIntermediate && handleUpdateSlotReturnIntermediate(slot.id, rIdx, val);
                        }}
                        placeholder={`Search return stop #${rIdx + 1}...`}
                        triggerClassName="h-8 text-xs font-semibold"
                      />
                    </div>
                    {handleRemoveSlotReturnIntermediate && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSlotReturnIntermediate(slot.id, rIdx)}
                        className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };
