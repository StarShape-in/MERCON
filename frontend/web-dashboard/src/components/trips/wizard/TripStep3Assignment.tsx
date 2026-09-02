import React from 'react';
import {
  Layers,
  SlidersHorizontal,
  CalendarDays,
  Clock,
  Truck,
  Tag,
  CheckCircle2,
  AlertCircle,
  Plus,
  UserCheck,
  User,
  DollarSign,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import DriverAvatar from '@/components/ui/DriverAvatar';
import VehicleCompatibilityBadge from '@/components/trips/shared/VehicleCompatibilityBadge';
import { cn } from '@/lib/utils';

interface TripStep3AssignmentProps {
  contractBillingType: string;
  setContractBillingType: (val: string) => void;
  contractRateCategory: string;
  setContractRateCategory: (val: string) => void;
  contractVehicleType: string;
  setContractVehicleType: (val: string) => void;
  setIsVehicleTypeEditable: (editable: boolean) => void;
  triggerRateLookupForSlots: (vType?: string, rCat?: string, custId?: string, bType?: string) => void;
  normalizeBillingType: (val?: string | null) => string;
  normalizeRateCategory: (val?: string | null) => string;
  normalizeVehicleClass: (val?: string | null) => string;
  contractSlots: any[];
  getAvailableRateCardsForLane: (orig: string, dest: string, origId?: string | null, destId?: string | null, rCat?: string | null, retDest?: string | null, retDestId?: string | null) => any[];
  setIsManualRateOverride: (override: boolean) => void;
  handleOpenCreateQuotation: (slot: any) => void;
  assignmentType: 'own' | 'third_party';
  setAssignmentType: (type: 'own' | 'third_party') => void;
  recentDriversList: any[];
  contractCustomer: string;
  masterDriver: string;
  masterVehicle: string;
  handleApplyRecentDriver: (item: any) => void;
  getVehicleTypeFromCapacity: (capKg?: number | null) => string;
  setIsCreateDriverOpen: (open: boolean) => void;
  drivers: any[];
  driverOptions: any[];
  handleDriverChange: (driverId: string) => void;
  vehicles: any[];
  vehicleOptions: any[];
  handleVehicleChange: (vehicleId: string) => void;
  getCompatibilityRuleForClass: (codeOrId: string) => any;
  thirdPartyProviderId: string;
  setThirdPartyProviderId: (id: string) => void;
  thirdPartyProviders: any[];
  thirdPartyVehiclePlate: string;
  setThirdPartyVehiclePlate: (plate: string) => void;
  thirdPartyDriverName: string;
  setThirdPartyDriverName: (name: string) => void;
  marginMetrics: { totalBilling: number; totalCost: number; profit: number; marginPct: number };
}

export const TripStep3Assignment: React.FC<TripStep3AssignmentProps> = ({
  contractBillingType,
  setContractBillingType,
  contractRateCategory,
  setContractRateCategory,
  contractVehicleType,
  setContractVehicleType,
  setIsVehicleTypeEditable,
  triggerRateLookupForSlots,
  normalizeBillingType,
  normalizeRateCategory,
  normalizeVehicleClass,
  contractSlots,
  getAvailableRateCardsForLane,
  setIsManualRateOverride,
  handleOpenCreateQuotation,
  assignmentType,
  setAssignmentType,
  recentDriversList,
  contractCustomer,
  masterDriver,
  masterVehicle,
  handleApplyRecentDriver,
  getVehicleTypeFromCapacity,
  setIsCreateDriverOpen,
  drivers,
  driverOptions,
  handleDriverChange,
  vehicles,
  vehicleOptions,
  handleVehicleChange,
  getCompatibilityRuleForClass,
  thirdPartyProviderId,
  setThirdPartyProviderId,
  thirdPartyProviders,
  thirdPartyVehiclePlate,
  setThirdPartyVehiclePlate,
  thirdPartyDriverName,
  setThirdPartyDriverName,
  marginMetrics,
}) => {
  return (
    <div className="space-y-3.5 animate-fade-in text-[#3E3C3D]">
      <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2">
        <h4 className="text-base font-semibold text-[#3E3C3D] flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#FA634E]" />
          SERVICE & ASSIGNMENT
        </h4>
      </div>

      {/* TWO-COLUMN WORKSPACE: LEFT (Decisions & Entry ~72-75%) and RIGHT (Financial Feedback ~25-28%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
        
        {/* LEFT COLUMN: SERVICE + QUOTATIONS + ASSIGNMENT (~75% / col-span-8 or 9) */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-3">
          
          {/* 1. COMBINED SERVICE + QUOTATIONS CARD */}
          <div className="p-3.5 rounded-xl bg-white border border-[#E5E7EB] shadow-2xs space-y-2.5">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-start">
              
              {/* Left Sub-Box: SERVICE CONFIG */}
              <div className="md:col-span-5 space-y-2 border-b md:border-b-0 md:border-r border-[#E5E7EB] pb-3 md:pb-0 md:pr-3.5">
                <div className="flex items-center justify-between pb-1 border-b border-[#E5E7EB]">
                  <span className="text-[11px] font-extrabold text-[#3E3C3D] uppercase tracking-wider flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-[#FA634E]" />
                    SERVICE CONFIG
                  </span>
                </div>

                <div className="space-y-2">
                  {/* Operation */}
                  <div className="space-y-0.5">
                    <label className="text-[11px] font-semibold text-[#3E3C3D] flex items-center gap-1">
                      <CalendarDays className="w-3 h-3 text-emerald-600" />
                      Operation
                    </label>
                    <Select
                      value={normalizeBillingType(contractBillingType)}
                      onValueChange={(val) => {
                        setContractBillingType(val);
                        triggerRateLookupForSlots(undefined, undefined, undefined, val);
                      }}
                    >
                      <SelectTrigger id="step3-first-field" className="h-8.5 w-full rounded-lg bg-white border-[#E5E7EB] text-xs font-semibold text-[#3E3C3D] focus:ring-2 focus:ring-[#FA634E]">
                        <SelectValue placeholder="Select Operation" />
                      </SelectTrigger>
                      <SelectContent className="z-[9999]">
                        <SelectItem value="Monthly" className="text-xs font-semibold py-1.5 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: '#10B981' }} />
                            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-950 font-bold border border-emerald-200">
                              Monthly
                            </span>
                          </div>
                        </SelectItem>
                        <SelectItem value="Extra" className="text-xs font-semibold py-1.5 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: '#14B8A6' }} />
                            <span className="px-1.5 py-0.5 rounded bg-teal-50 text-teal-950 font-bold border border-teal-200">
                              Extra (Spot)
                            </span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Vehicle Class */}
                  <div className="space-y-0.5">
                    <label className="text-[11px] font-semibold text-[#3E3C3D] flex items-center gap-1">
                      <Truck className="w-3 h-3 text-amber-600" />
                      Vehicle Class
                    </label>
                    <Select
                      value={normalizeVehicleClass(contractVehicleType)}
                      onValueChange={(val) => {
                        setContractVehicleType(val);
                        setIsVehicleTypeEditable(false);
                        triggerRateLookupForSlots(val);
                      }}
                    >
                      <SelectTrigger className="h-8.5 w-full rounded-lg bg-white border-[#E5E7EB] text-xs font-semibold text-[#3E3C3D] focus:ring-1 focus:ring-amber-500">
                        <SelectValue placeholder="Select Vehicle Class" />
                      </SelectTrigger>
                      <SelectContent className="z-[9999]">
                        <SelectItem value="3-4 TON" className="text-xs font-semibold py-1.5 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: '#06B6D4' }} />
                            <span className="px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-950 font-bold border border-cyan-200">
                              3-4 TON
                            </span>
                          </div>
                        </SelectItem>
                        <SelectItem value="5 TON" className="text-xs font-semibold py-1.5 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: '#FA634E' }} />
                            <span className="px-1.5 py-0.5 rounded bg-orange-50 text-red-950 font-bold border border-orange-200">
                              5 TON
                            </span>
                          </div>
                        </SelectItem>
                        <SelectItem value="10 TON" className="text-xs font-semibold py-1.5 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: '#F59E0B' }} />
                            <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-950 font-bold border border-amber-200">
                              10 TON
                            </span>
                          </div>
                        </SelectItem>
                        <SelectItem value="20 TON" className="text-xs font-semibold py-1.5 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: '#0F172A' }} />
                            <span className="px-1.5 py-0.5 rounded bg-slate-900 text-white font-bold border border-slate-800">
                              20 TON
                            </span>
                          </div>
                        </SelectItem>
                        <SelectItem value="40 FEET" className="text-xs font-semibold py-1.5 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: '#A855F7' }} />
                            <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-950 font-bold border border-purple-200">
                              40 FEET
                            </span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Right Sub-Box: QUOTATIONS */}
              <div className="md:col-span-7 space-y-2">
                {contractSlots.map((slot) => {
                  const isRoundTrip = normalizeRateCategory(contractRateCategory) === 'Round Trip';
                  const returnDest = slot.returnDestination || slot.origin;
                  const returnDestId = slot.returnDestinationLocationId || slot.originLocationId;

                  const laneRateCards = getAvailableRateCardsForLane(
                    slot.origin,
                    slot.destination,
                    slot.originLocationId,
                    slot.destinationLocationId,
                    contractRateCategory,
                    returnDest,
                    returnDestId
                  );

                  return (
                    <div key={slot.id} className="space-y-2">
                      <div className="flex items-center justify-between pb-1 border-b border-[#E5E7EB]">
                        <span className="text-[11px] font-bold text-[#3E3C3D] uppercase tracking-wider flex items-center gap-1.5 truncate">
                          <Tag className="w-3.5 h-3.5 text-[#FA634E] shrink-0" />
                          {isRoundTrip ? (
                            <span>ROUND TRIP QUOTATIONS ({slot.origin ? slot.origin.toUpperCase() : 'ORIGIN'} ↔ {slot.destination ? slot.destination.toUpperCase() : 'DESTINATION'})</span>
                          ) : (
                            <span>QUOTATIONS ({slot.origin ? slot.origin.toUpperCase() : 'ORIGIN'} → {slot.destination ? slot.destination.toUpperCase() : 'DESTINATION'})</span>
                          )}
                        </span>
                        <div>
                          {slot.rateMatched ? (
                            <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.2 rounded-full border border-emerald-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Matched
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.2 rounded-full border border-amber-200 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 text-amber-600" />
                              No Match
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Horizontal Scrollable Quotes Row */}
                      {laneRateCards.length > 0 ? (
                        <div className="flex items-stretch gap-2 overflow-x-auto py-0.5">
                          {laneRateCards.map((rc) => {
                            const vLabel = normalizeVehicleClass(rc.vehicle_class || rc.vehicle_type || rc.source_vehicle_label);
                            const cLabel = normalizeRateCategory(rc.line_type || rc.rate_category);
                            const bLabel = normalizeBillingType(rc.billing_type);
                            const rateVal = rc.rate ?? rc.base_price ?? 0;
                            const driverPayoutVal = (rc as any).driver_charge ?? rc.default_trip_charge ?? (rc as any).trip_charge ?? 149;
                            const isSelected = normalizeVehicleClass(contractVehicleType) === vLabel &&
                                               normalizeRateCategory(contractRateCategory) === cLabel &&
                                               normalizeBillingType(contractBillingType) === bLabel;

                            return (
                              <div
                                key={rc.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => {
                                  setContractVehicleType(vLabel);
                                  setContractRateCategory(cLabel);
                                  setContractBillingType(bLabel);
                                  triggerRateLookupForSlots(vLabel, cLabel, undefined, bLabel);
                                  setIsManualRateOverride(false);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setContractVehicleType(vLabel);
                                    setContractRateCategory(cLabel);
                                    setContractBillingType(bLabel);
                                    triggerRateLookupForSlots(vLabel, cLabel, undefined, bLabel);
                                    setIsManualRateOverride(false);
                                  }
                                }}
                                className={cn(
                                  "w-[145px] min-w-[145px] p-2 rounded-xl border transition-all flex flex-col justify-between space-y-1 bg-white shadow-2xs select-none cursor-pointer hover:shadow-xs focus-visible:ring-2 focus-visible:ring-[#FA634E] focus-visible:outline-none",
                                  isSelected
                                    ? "border-[#FA634E] ring-2 ring-[#FA634E]/20 bg-orange-50/20"
                                    : "border-[#E5E7EB] hover:border-[#FA634E]/60 hover:bg-slate-50/80"
                                )}
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.2 rounded bg-[#EEF1F6] text-[#3E3C3D]">
                                      {bLabel}
                                    </span>
                                    {isSelected && (
                                      <span className="text-[9px] font-extrabold text-[#FA634E] bg-orange-100 px-1 py-0.2 rounded-full">
                                        Applied ✓
                                      </span>
                                    )}
                                  </div>

                                  <div className="text-base font-bold font-mono text-[#3E3C3D]">
                                    SAR {rateVal.toLocaleString()}
                                  </div>

                                  <div className="text-[11px] text-[#6E6E80] space-y-0.2 leading-tight">
                                    <div className="font-medium truncate">{cLabel}</div>
                                    <div className="font-semibold text-[#3E3C3D] truncate">{vLabel}</div>
                                  </div>
                                </div>

                                <div className="pt-1 border-t border-[#E5E7EB] flex items-center justify-between text-[10px]">
                                  <span className="font-medium text-[#6E6E80]">
                                    Driver {driverPayoutVal > 0 ? `SAR ${driverPayoutVal}` : '—'}
                                  </span>
                                  <span className={cn("font-extrabold", isSelected ? "text-[#FA634E]" : "text-slate-400")}>
                                    {isSelected ? 'Applied ✓' : 'Apply →'}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-3.5 rounded-xl bg-slate-50/80 border border-dashed border-[#E5E7EB] flex flex-col items-center justify-center text-center gap-1.5 my-1">
                          <div className="text-xs font-semibold text-[#3E3C3D] flex items-center gap-1.5">
                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                            No quotation template registered for this lane ({slot.origin ? slot.origin.toUpperCase() : 'ORIGIN'} → {slot.destination ? slot.destination.toUpperCase() : 'DESTINATION'}).
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleOpenCreateQuotation(slot)}
                            className="h-8 rounded-lg bg-[#FA634E] hover:bg-[#e0533e] text-white text-xs font-bold px-3.5 gap-1.5 shadow-2xs mt-1 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Create Quotation
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

            </div>
          </div>

          {/* 3. ASSIGNMENT & DISPATCH */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-orange-50/40 via-white to-slate-50/50 border border-orange-200/90 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-orange-100 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-[#FA634E] text-white flex items-center justify-center font-bold shadow-2xs">
                  <UserCheck className="w-3.5 h-3.5" />
                </span>
                <div>
                  <h5 className="text-xs font-extrabold text-[#3E3C3D] uppercase tracking-wider">ASSIGNMENT & DISPATCH</h5>
                </div>
              </div>

              <div className="inline-flex items-center p-0.5 bg-white rounded-lg border border-orange-200 text-xs shadow-2xs">
                <button
                  type="button"
                  onClick={() => setAssignmentType('own')}
                  className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                    assignmentType === 'own' ? 'bg-[#FA634E] text-white shadow-2xs' : 'text-[#6E6E80] hover:text-[#3E3C3D]'
                  }`}
                >
                  Own Fleet
                </button>
                <button
                  type="button"
                  onClick={() => setAssignmentType('third_party')}
                  className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                    assignmentType === 'third_party' ? 'bg-purple-700 text-white shadow-2xs' : 'text-[#6E6E80] hover:text-[#3E3C3D]'
                  }`}
                >
                  3PL Vehicle
                </button>
              </div>
            </div>

            {assignmentType === 'own' ? (
              <div className="space-y-3">
                {/* RECENT DRIVERS FOR THIS ROUTE ACCELERATOR CHIPS */}
                {recentDriversList.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-[#EEF1F6]/70 border border-slate-200/90 space-y-1.5 animate-fade-in mb-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold text-[#3E3C3D] uppercase tracking-wider flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-[#FA634E]" />
                        RECENT DRIVERS FOR {contractSlots[0]?.origin?.toUpperCase() || 'ORIGIN'} → {contractSlots[0]?.destination?.toUpperCase() || 'DESTINATION'}
                      </span>
                      <span className="text-[10px] font-bold text-[#6E6E80]">Click to select driver & suggested vehicle</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {recentDriversList.map((item) => {
                        const isSelected = masterDriver === item.driverId;
                        const dObj = item.driverObj;
                        const vObj = item.vehicleObj;
                        const vehClass = vObj ? (vObj.asset_type || getVehicleTypeFromCapacity(vObj.capacity_kg) || contractVehicleType) : contractVehicleType;
                        const plate = vObj?.plate_number || 'ESA-4244';

                        return (
                          <button
                            key={item.driverId}
                            type="button"
                            onClick={() => handleApplyRecentDriver(item)}
                            className={`p-2 rounded-xl border text-left transition-all flex items-center gap-2.5 cursor-pointer shadow-2xs ${
                              isSelected
                                ? 'bg-orange-50/80 border-[#FA634E] ring-1 ring-[#FA634E]/30'
                                : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                            }`}
                          >
                            <DriverAvatar
                              src={dObj?.avatar_url || dObj?.photo_url || dObj?.profile_photo}
                              firstName={dObj?.first_name || 'Driver'}
                              lastName={dObj?.last_name || ''}
                              size="sm"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-extrabold text-[#3E3C3D] truncate">
                                {dObj?.first_name} {dObj?.last_name}
                              </p>
                              <p className="text-[10px] font-bold text-[#6E6E80] truncate">
                                {plate} · {vehClass}
                              </p>
                              <p className="text-[9px] font-semibold text-slate-400 truncate">
                                Used {item.count} {item.count === 1 ? 'time' : 'times'} · {item.formattedLastUsed}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 items-start">
                  {/* Driver Field */}
                  <div className="p-3 rounded-lg bg-white border border-[#E5E7EB] shadow-2xs space-y-2 focus-within:border-[#FA634E] transition-all">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-[#3E3C3D] flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-[#FA634E]" />
                        Primary Driver
                      </label>
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded-full">
                        Required
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {(() => {
                        const selDriver = drivers.find((d) => d.id === masterDriver);
                        const initials = selDriver ? `${selDriver.first_name?.[0] || ''}${selDriver.last_name?.[0] || ''}`.toUpperCase() : null;
                        return (
                          <>
                            {initials && (
                              <div className="w-8 h-8 rounded-full bg-[#FA634E] text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                                {initials}
                              </div>
                            )}
                            <Combobox
                              options={[{ value: 'unassigned', label: '-- Unassigned --' }, ...driverOptions]}
                              value={masterDriver}
                              onChange={handleDriverChange}
                              placeholder="Select primary driver..."
                              searchPlaceholder="Search driver..."
                              emptyText="No drivers found."
                              triggerClassName="h-9 rounded-lg bg-slate-50/50 border-[#E5E7EB] text-xs font-semibold w-full"
                            />
                          </>
                        );
                      })()}
                    </div>

                    {/* Secondary / Co-Driver Option (Extensible Multi-Driver Support) */}
                    <div className="pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-[#6E6E80] flex items-center gap-1">
                          <UserCheck className="w-3 h-3 text-[#FA634E]" />
                          Secondary Driver (Co-Driver / Reliever)
                        </span>
                        <span className="text-[9px] font-medium text-slate-400">Optional</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        For long-haul trips requiring 2 drivers. Synchronizes itinerary to both driver mobile apps.
                      </p>
                    </div>
                  </div>

                  {/* Vehicle Field */}
                  <div className="p-3 rounded-lg bg-white border border-[#E5E7EB] shadow-2xs space-y-1.5 focus-within:border-[#FA634E] transition-all">
                    <label className="text-xs font-bold text-[#3E3C3D] flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-[#FA634E]" />
                      Vehicle Selection
                    </label>
                    <Combobox
                      options={[{ value: 'unassigned', label: '-- Unassigned --' }, ...vehicleOptions]}
                      value={masterVehicle}
                      onChange={handleVehicleChange}
                      placeholder="Select vehicle..."
                      searchPlaceholder="Search vehicle..."
                      emptyText="No vehicles found."
                      triggerClassName="h-9 rounded-lg bg-slate-50/50 border-[#E5E7EB] text-xs font-semibold w-full"
                    />
                    <VehicleCompatibilityBadge
                      contractVehicleType={contractVehicleType}
                      masterVehicle={masterVehicle}
                      vehicles={vehicles}
                      activeCompatibilityRule={getCompatibilityRuleForClass(contractVehicleType)}
                      getVehicleTypeFromCapacity={getVehicleTypeFromCapacity}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start p-3 rounded-lg bg-white border border-purple-200 shadow-2xs">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#3E3C3D] block">3PL Provider *</label>
                  <Select value={thirdPartyProviderId} onValueChange={setThirdPartyProviderId}>
                    <SelectTrigger className="h-9 w-full rounded-lg bg-slate-50/50 border-[#E5E7EB] text-xs font-semibold">
                      <SelectValue placeholder="Select provider..." />
                    </SelectTrigger>
                    <SelectContent>
                      {thirdPartyProviders.map((p) => (
                        <SelectItem key={p.id} value={p.id} className="text-xs font-semibold">
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#3E3C3D] block">3PL Plate *</label>
                  <input
                    type="text"
                    value={thirdPartyVehiclePlate}
                    onChange={(e) => setThirdPartyVehiclePlate(e.target.value)}
                    placeholder="Plate number..."
                    className="w-full h-9 px-2.5 rounded-lg border border-[#E5E7EB] text-xs font-semibold bg-slate-50/50 outline-none focus:border-purple-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#3E3C3D] block">3PL Driver Name</label>
                  <input
                    type="text"
                    value={thirdPartyDriverName}
                    onChange={(e) => setThirdPartyDriverName(e.target.value)}
                    placeholder="Driver name..."
                    className="w-full h-9 px-2.5 rounded-lg border border-[#E5E7EB] text-xs font-semibold bg-slate-50/50 outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: PERSISTENT FINANCIAL SUMMARY (~25% / col-span-4 or 3) */}
        <div className="lg:col-span-4 xl:col-span-3">
          <div className="p-3.5 rounded-xl bg-white border border-[#E5E7EB] shadow-2xs space-y-3 sticky top-4">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2">
              <span className="text-[11px] font-extrabold text-[#3E3C3D] uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-[#FA634E]" />
                FINANCIAL SUMMARY
              </span>
            </div>

            <div className="space-y-3 divide-y divide-[#E5E7EB]">
              {/* Customer Billing */}
              <div className="space-y-0.5 pt-1">
                <span className="text-[11px] font-semibold text-[#6E6E80] uppercase tracking-wider block">CUSTOMER BILLING</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-bold font-mono text-[#3E3C3D]">
                    SAR {marginMetrics.totalBilling.toLocaleString()}
                  </span>
                  <span className="text-xs text-[#6E6E80] font-mono font-medium">
                    {contractBillingType === 'Monthly' ? '/month' : '/trip'}
                  </span>
                </div>
              </div>

              {/* Driver Payout */}
              <div className="space-y-0.5 pt-2.5">
                <span className="text-[11px] font-semibold text-[#6E6E80] uppercase tracking-wider block">DRIVER PAYOUT</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-bold font-mono text-[#3E3C3D]">
                    SAR {marginMetrics.totalCost.toLocaleString()}
                  </span>
                  <span className="text-xs text-[#6E6E80] font-mono font-medium">
                    /trip
                  </span>
                </div>
              </div>

              {/* Additional Charges */}
              <div className="space-y-1 pt-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#6E6E80] uppercase tracking-wider">ADDITIONAL CHARGES</span>
                  <button
                    type="button"
                    className="text-[11px] font-bold text-[#FA634E] hover:underline cursor-pointer"
                  >
                    + Add Charge
                  </button>
                </div>
                <div className="text-base font-bold font-mono text-[#3E3C3D]">
                  SAR 0.00
                </div>
              </div>

              {/* Balance / Margin */}
              <div className="space-y-1 pt-2.5">
                <span className="text-[11px] font-extrabold text-[#3E3C3D] uppercase tracking-wider block">BALANCE / MARGIN</span>
                <div className="flex items-baseline justify-between">
                  <span className={`text-xl font-bold font-mono ${marginMetrics.profit >= 0 ? 'text-[#10B981]' : 'text-[#FA634E]'}`}>
                    SAR {marginMetrics.profit.toLocaleString()}
                  </span>
                  <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full ${marginMetrics.profit >= 0 ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
                    {marginMetrics.marginPct.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default TripStep3Assignment;
