import React from 'react';
import { MapPin, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LocationCombobox from '@/components/quotations/LocationCombobox';

function isUuid(str: string): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

interface RouteWorkspaceProps {
  slot: any;
  contractCustomer: string;
  isRoundTrip: boolean;
  canRemoveSlot: boolean;
  handleAddSlotIntermediate: (slotId: string) => void;
  handleRemoveTripSlot: (slotId: string) => void;
  handleSlotLocationChange: (slotId: string, field: 'origin' | 'destination', locName: string, locObj: any) => void;
  handleUpdateTripSlot: (slotId: string, patch: any) => void;
  handleRemoveSlotIntermediate: (slotId: string, idx: number) => void;
  handleUpdateSlotIntermediate: (slotId: string, idx: number, val: string) => void;
  handleAddSlotReturnIntermediate: (slotId: string) => void;
  handleRemoveSlotReturnIntermediate: (slotId: string, idx: number) => void;
  handleUpdateSlotReturnIntermediate: (slotId: string, idx: number, val: string) => void;
}

export const RouteWorkspace: React.FC<RouteWorkspaceProps> = ({
  slot,
  contractCustomer,
  isRoundTrip,
  canRemoveSlot,
  handleAddSlotIntermediate,
  handleRemoveTripSlot,
  handleSlotLocationChange,
  handleUpdateTripSlot,
  handleRemoveSlotIntermediate,
  handleUpdateSlotIntermediate,
  handleAddSlotReturnIntermediate,
  handleRemoveSlotReturnIntermediate,
  handleUpdateSlotReturnIntermediate,
}) => {
  return (
    <div className="space-y-3">
      {/* SLOT HEADER (IF MULTI-SLOT) */}
      {canRemoveSlot && (
        <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
          <span className="text-xs font-extrabold text-[#3E3C3D] dark:text-slate-100 uppercase tracking-wider">
            TRIP SLOT #{slot.slotNumber || 1}
          </span>
          <button
            type="button"
            onClick={() => handleRemoveTripSlot(slot.id)}
            className="text-slate-400 hover:text-rose-600 transition-colors p-1 cursor-pointer"
            title="Remove trip slot"
          >
            <Trash2 className="w-4 h-4" />
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
              <label className="text-xs font-extrabold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider block">
                LEG 1 ORIGIN LOCATION *
              </label>
              <LocationCombobox
                id="step2-first-field"
                customerId={contractCustomer}
                value={slot.origin}
                onChange={(locName, locObj) => handleSlotLocationChange(slot.id, 'origin', locName, locObj)}
                placeholder="Search Leg 1 origin (e.g. Riyadh Distribution Centre)..."
                triggerClassName="h-9 border-slate-200 bg-white text-xs font-bold text-[#3E3C3D] dark:text-slate-100 shadow-2xs"
              />
            </div>

            {/* Leg 1 Intermediate Stops */}
            {slot.intermediateLocations?.length > 0 && (
              <div className="pl-3 border-l-2 border-emerald-200 dark:border-emerald-900 my-1.5 space-y-2">
                {slot.intermediateLocations.map((loc: string, idx: number) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
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
                      triggerClassName="h-9 border-slate-200 bg-white text-xs font-semibold shadow-2xs"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Leg 1 Destination */}
            <div className="space-y-1">
              <label className="text-xs font-extrabold text-orange-800 dark:text-orange-400 uppercase tracking-wider block">
                LEG 1 DESTINATION LOCATION *
              </label>
              <LocationCombobox
                customerId={contractCustomer}
                value={slot.destination}
                onChange={(locName, locObj) => handleSlotLocationChange(slot.id, 'destination', locName, locObj)}
                placeholder="Search Leg 1 destination (e.g. Al Baha Station)..."
                triggerClassName="h-9 border-slate-200 bg-white text-xs font-bold text-[#3E3C3D] dark:text-slate-100 shadow-2xs"
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
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
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
                      triggerClassName="h-9 border-slate-200 bg-white text-xs font-semibold shadow-2xs"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Leg 2 Final Home Location */}
            <div className="space-y-1">
              <label className="text-xs font-extrabold text-purple-900 dark:text-purple-300 uppercase tracking-wider block">
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
                triggerClassName="h-9 border-purple-200 bg-white text-xs font-bold text-[#3E3C3D] dark:text-slate-100 shadow-2xs"
              />
            </div>
          </div>
        </div>
      ) : (
        /* B. STANDARD 1-WAY ROUTE WORKSPACE (SINGLE TRIP / SHIFT DUTY) */
        <div className="p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-3.5">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-extrabold text-[#3E3C3D] dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-brand shrink-0" /> ROUTE LOCATION PATH
            </h4>
          </div>

          <div className="space-y-3 relative">
            {/* Origin */}
            <div className="space-y-1 max-w-lg">
              <label className="text-xs font-extrabold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200 shrink-0" />
                ORIGIN LOCATION *
              </label>
              <LocationCombobox
                id="step2-first-field-oneway"
                customerId={contractCustomer}
                value={slot.origin}
                onChange={(locName, locObj) => handleSlotLocationChange(slot.id, 'origin', locName, locObj)}
                placeholder="Search starting origin (e.g. Riyadh Distribution Centre)..."
                triggerClassName="h-9.5 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-[#3E3C3D] dark:text-slate-100 shadow-2xs"
              />
            </div>

            {/* Route Connector Line & Intermediate Stops */}
            <div className="pl-3.5 border-l-2 border-slate-200 dark:border-slate-800 my-2 space-y-2.5 max-w-lg">
              {slot.intermediateLocations?.map((loc: string, idx: number) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
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
                    triggerClassName="h-9 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold shadow-2xs"
                  />
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleAddSlotIntermediate(slot.id)}
                className="h-7.5 text-xs font-bold border-slate-200 dark:border-slate-800 text-brand hover:bg-orange-50 dark:hover:bg-orange-950/30 gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-brand" /> Add Stop
              </Button>
            </div>

            {/* Destination */}
            <div className="space-y-1 max-w-lg">
              <label className="text-xs font-extrabold text-orange-800 dark:text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-brand ring-2 ring-orange-200 shrink-0" />
                DESTINATION LOCATION *
              </label>
              <LocationCombobox
                customerId={contractCustomer}
                value={slot.destination}
                onChange={(locName, locObj) => handleSlotLocationChange(slot.id, 'destination', locName, locObj)}
                placeholder="Search delivery destination (e.g. Al Baha Station)..."
                triggerClassName="h-9.5 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-[#3E3C3D] dark:text-slate-100 shadow-2xs"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
