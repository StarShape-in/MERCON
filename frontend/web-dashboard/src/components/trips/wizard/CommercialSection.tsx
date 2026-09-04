import React from 'react';
import { DollarSign, CheckCircle2, Plus, Tag, AlertCircle, ChevronLeft, ChevronRight, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Combobox, ComboboxOption } from '@/components/ui/combobox';
import { cn } from '@/lib/utils';

interface CommercialSectionProps {
  contractSlots: any[];
  contractRateCategory: string;
  contractBillingType: string;
  contractVehicleType: string;
  getAvailableRateCardsForLane: (slot: any) => any[];
  handleOpenCreateQuotation?: () => void;
  setIsManualRateOverride?: (override: boolean) => void;
  handleUpdateTripSlot: (slotId: string, patch: any) => void;
  handleSlotLocationChange?: (slotId: string, field: 'origin' | 'destination', locName: string, locObj: any) => void;
  setContractRateCategory?: (cat: string) => void;
  setContractBillingType?: (bType: string) => void;
  setContractVehicleType?: (vType: string) => void;
  contractCustomer?: string;
  setContractCustomer?: (customerId: string) => void;
  customers?: any[];
  customerOptions?: ComboboxOption[];
}

export const CommercialSection: React.FC<CommercialSectionProps> = ({
  contractSlots,
  contractRateCategory,
  contractBillingType,
  contractVehicleType,
  getAvailableRateCardsForLane,
  handleOpenCreateQuotation,
  handleUpdateTripSlot,
  handleSlotLocationChange,
  setContractRateCategory,
  setContractBillingType,
  setContractVehicleType,
  contractCustomer = '',
  setContractCustomer,
  customers = [],
  customerOptions = [],
}) => {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  const primarySlot = contractSlots[0] || {};
  const availableRateCards = getAvailableRateCardsForLane(primarySlot) || [];
  const matchedRateCard = primarySlot.matchedRateCard || (primarySlot.origin ? availableRateCards[0] : null);

  const handleScrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -320, behavior: 'smooth' });
    }
  };

  const handleScrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 320, behavior: 'smooth' });
    }
  };

  const derivedCustomerOptions = React.useMemo(() => {
    if (customerOptions && customerOptions.length > 0) return customerOptions;
    return customers.map((c) => ({
      value: c.id,
      label: c.name,
      keywords: `${c.code || ''} ${c.city || ''} ${c.name}`,
    }));
  }, [customerOptions, customers]);

  // Sort quotations: Most used / trip history first, then all remaining active quotations (max 50)
  const sortedRateCards = React.useMemo(() => {
    if (!availableRateCards) return [];
    return [...availableRateCards]
      .sort((a, b) => {
        const aUsage = Number(a.usage_count || 0) + (a.driver_name || a.recent_driver ? 10 : 0);
        const bUsage = Number(b.usage_count || 0) + (b.driver_name || b.recent_driver ? 10 : 0);

        if (aUsage !== bUsage) return bUsage - aUsage;
        return 0;
      })
      .slice(0, 50);
  }, [availableRateCards]);

  const selectedCust = customers.find((c) => c.id === contractCustomer);

  return (
    <div className="p-3 rounded-2xl border-2 border-orange-200/80 dark:border-orange-900/60 bg-white dark:bg-slate-900 shadow-xs space-y-2.5 text-[#3E3C3D]">
      {/* UNIFIED SINGLE HEADER: CUSTOMER ACCOUNT & COMMERCIAL QUOTATIONS */}
      <div className="space-y-2 pb-2 border-b border-slate-100 dark:border-slate-800">
        
        {/* ROW 1: HEADER TITLE + ACTIVE STATE / STATUS BADGES + CONTROLS */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-brand shrink-0" />
              <span>CUSTOMERS & QUOTATIONS</span>
              {contractCustomer && (
                <span className="text-brand font-extrabold">({sortedRateCards.length})</span>
              )}
              <span className="text-brand">*</span>
            </h4>

            {/* STAGE STATUS INDICATORS */}
            {contractCustomer && (
              /* STAGE 2: CUSTOMER SELECTED - SHOW MATCHED OR UNSET RATE STATUS */
              <>
                {matchedRateCard ? (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Matched Rate Card
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 text-amber-600" /> Rate Unset
                  </span>
                )}
              </>
            )}
          </div>

          {/* TOP RIGHT: CONTROLS & CREATE QUOTATION BUTTON */}
          <div className="flex items-center gap-1.5 shrink-0">
            {handleOpenCreateQuotation && contractCustomer && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleOpenCreateQuotation}
                className="h-7 text-xs font-bold border-brand text-brand hover:bg-orange-50 dark:hover:bg-orange-950/40 gap-1.5 cursor-pointer shrink-0 rounded-lg px-2.5"
              >
                <Plus className="w-3.5 h-3.5" /> Create Quotation
              </Button>
            )}
          </div>
        </div>

        {/* ROW 2: SEARCH COMBOBOX & ACTIVE CUSTOMER CONTEXT / BILLING TYPE */}
        <div className="flex items-center justify-between gap-2 pt-0.5 flex-wrap">
          {/* LEFT SIDE: CUSTOMER SEARCH / ACTIVE CUSTOMER CHIP */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* CUSTOMER SEARCH COMBOBOX */}
            {setContractCustomer && (
              <div className="w-full sm:w-[220px] shrink-0">
                <Combobox
                  options={derivedCustomerOptions}
                  value={contractCustomer}
                  onChange={(val) => setContractCustomer?.(val)}
                  placeholder="Select customer account..."
                  searchPlaceholder="Search customer name or code..."
                  triggerClassName="h-8 rounded-lg border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/70 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-2xs w-full focus:ring-2 focus:ring-brand"
                />
              </div>
            )}

            {/* STAGE 2 ACTIVE CUSTOMER BADGE WITH CHANGE BUTTON */}
            {contractCustomer && selectedCust && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-50 dark:bg-orange-950/40 border border-brand/50 text-brand ring-1 ring-brand/20 text-xs font-bold shrink-0">
                <span className="w-4.5 h-4.5 rounded font-black text-[9px] grid place-items-center bg-brand text-white shrink-0 shadow-2xs">
                  {selectedCust.name.substring(0, 2).toUpperCase()}
                </span>
                <span className="truncate max-w-[150px] font-extrabold">{selectedCust.name}</span>
                <button
                  type="button"
                  onClick={() => setContractCustomer?.('')}
                  className="ml-1 text-[10px] underline hover:text-orange-800 dark:hover:text-orange-300 cursor-pointer font-bold shrink-0"
                >
                  Change
                </button>
              </div>
            )}
          </div>

          {/* RIGHT SIDE: BILLING TYPE TOGGLE (MONTHLY / EXTRA) */}
          {setContractBillingType && (
            <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0 ml-auto">
              <button
                type="button"
                onClick={() => setContractBillingType('Monthly')}
                className={`px-2.5 py-0.5 rounded text-[11px] font-extrabold transition-all cursor-pointer h-7 ${
                  contractBillingType === 'Monthly'
                    ? 'bg-brand text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setContractBillingType('Extra')}
                className={`px-2.5 py-0.5 rounded text-[11px] font-extrabold transition-all cursor-pointer h-7 ${
                  contractBillingType === 'Extra'
                    ? 'bg-brand text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                Extra
              </button>
            </div>
          )}
        </div>

      </div>

      {/* ========================================================================= */}
      {/* STAGE 1: NO CUSTOMER SELECTED -> SHOW COMPANY QUICK SELECTION CARDS CAROUSEL */}
      {/* ========================================================================= */}
      {!contractCustomer ? (
        <div className="relative group">
          {/* CAROUSEL LEFT SCROLL BUTTON */}
          {customers && customers.length > 2 && (
            <button
              type="button"
              onClick={handleScrollLeft}
              className="absolute -left-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-white/95 dark:bg-slate-800/95 shadow-md border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 grid place-items-center transition-all cursor-pointer opacity-90 hover:scale-105"
              title="Scroll Left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          {/* CAROUSEL RIGHT SCROLL BUTTON */}
          {customers && customers.length > 2 && (
            <button
              type="button"
              onClick={handleScrollRight}
              className="absolute -right-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-white/95 dark:bg-slate-800/95 shadow-md border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 grid place-items-center transition-all cursor-pointer opacity-90 hover:scale-105"
              title="Scroll Right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          <div ref={scrollContainerRef} className="flex items-center gap-2.5 overflow-x-auto custom-scrollbar p-0.5 pb-1 transition-all duration-300 ease-in-out">
            {customers && customers.length > 0 ? (
              customers.map((c, idx) => {
                const cInitials = c.name.substring(0, 2).toUpperCase();
                const firstName = c.name.split(' ')[0];

                return (
                  <button
                    key={c.id || idx}
                    type="button"
                    onClick={() => setContractCustomer?.(c.id)}
                    className={cn(
                      "p-3 rounded-xl border transition-all duration-200 text-left flex flex-col justify-between h-[104px] min-w-[220px] max-w-[260px] shrink-0 bg-white dark:bg-slate-800 shadow-2xs cursor-pointer select-none border-slate-200 dark:border-slate-700 hover:border-brand hover:bg-orange-50/50 dark:hover:bg-slate-700/80 group"
                    )}
                  >
                    {/* TOP ROW: PROFILE PIC / AVATAR + FIRST NAME / SHORT NAME */}
                    <div className="flex items-center gap-2.5">
                      {c.logo_url || c.avatar_url ? (
                        <img src={c.logo_url || c.avatar_url} alt={c.name} className="w-9 h-9 rounded-xl object-cover border border-slate-200 shrink-0 shadow-2xs" />
                      ) : (
                        <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-brand font-black text-xs grid place-items-center shrink-0 border border-orange-200/60 dark:border-orange-900/40 group-hover:bg-brand group-hover:text-white transition-colors shadow-2xs">
                          {cInitials}
                        </div>
                      )}

                      <div className="truncate">
                        <div className="text-sm font-black text-slate-800 dark:text-slate-100 truncate group-hover:text-brand transition-colors" title={c.name}>
                          {firstName}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 truncate">
                          {c.name}
                        </div>
                      </div>
                    </div>

                    {/* BOTTOM ROW: CLEAN ACTION LINK */}
                    <div className="pt-1.5 border-t border-slate-100 dark:border-slate-700 flex items-center justify-end text-[10px]">
                      <span className="font-extrabold text-slate-500 group-hover:text-brand transition-colors flex items-center gap-1">
                        Select Company →
                      </span>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="w-full p-4 text-center rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 text-xs text-slate-500">
                No customer accounts found. Use the search box above.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* STAGE 2: CUSTOMER IS SELECTED -> SHOW QUOTATION RATE CARDS CAROUSEL      */
        /* ========================================================================= */
        <>
          {sortedRateCards.length > 0 ? (
            <div className="relative group">
              {/* CAROUSEL LEFT SCROLL BUTTON */}
              {sortedRateCards.length > 2 && (
                <button
                  type="button"
                  onClick={handleScrollLeft}
                  className="absolute -left-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-white/95 dark:bg-slate-800/95 shadow-md border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 grid place-items-center transition-all cursor-pointer opacity-90 hover:scale-105"
                  title="Scroll Left"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}

              {/* CAROUSEL RIGHT SCROLL BUTTON */}
              {sortedRateCards.length > 2 && (
                <button
                  type="button"
                  onClick={handleScrollRight}
                  className="absolute -right-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-white/95 dark:bg-slate-800/95 shadow-md border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 grid place-items-center transition-all cursor-pointer opacity-90 hover:scale-105"
                  title="Scroll Right"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}

              <div ref={scrollContainerRef} className="flex items-center gap-2.5 overflow-x-auto custom-scrollbar p-0.5 pb-1">
                {sortedRateCards.map((rc, idx) => {
                  const isSelected = matchedRateCard?.id === rc.id || primarySlot.matchedRateCard?.id === rc.id;
                  const rateVal = rc.rate ?? rc.base_price ?? 0;
                  const vClass = rc.vehicle_class || rc.vehicle_type || 'Standard';
                  const rCat = rc.rate_category || rc.line_type || contractRateCategory;
                  const hasHistory = Boolean(rc.driver_name || rc.recent_driver || rc.vehicle_plate || rc.recent_vehicle);

                  const firstStop = rc.stops && rc.stops.length > 0 ? rc.stops[0] : null;
                  const lastStop = rc.stops && rc.stops.length > 1 ? rc.stops[rc.stops.length - 1] : firstStop;

                  const origName = String(
                    firstStop?.source_label ||
                    firstStop?.location?.name ||
                    (firstStop as any)?.location_name ||
                    rc.route_origin ||
                    rc.origin_name ||
                    rc.originLocation?.name ||
                    rc.origin_city ||
                    rc.origin ||
                    rc.from ||
                    ''
                  );

                  const destName = String(
                    lastStop?.source_label ||
                    lastStop?.location?.name ||
                    (lastStop as any)?.location_name ||
                    rc.route_destination ||
                    rc.destination_name ||
                    rc.destinationLocation?.name ||
                    rc.destination_city ||
                    rc.destination ||
                    rc.to ||
                    ''
                  );

                  return (
                    <button
                      key={rc.id || idx}
                      type="button"
                      onClick={() => {
                        if (origName && handleSlotLocationChange) {
                          handleSlotLocationChange(primarySlot.id, 'origin', origName, rc.originLocation || firstStop?.location || null);
                        }
                        if (destName && handleSlotLocationChange) {
                          handleSlotLocationChange(primarySlot.id, 'destination', destName, rc.destinationLocation || lastStop?.location || null);
                        }
                        if (rc.line_type && setContractRateCategory) {
                          setContractRateCategory(rc.line_type);
                        }
                        if (rc.vehicle_class && setContractVehicleType) {
                          setContractVehicleType(rc.vehicle_class);
                        }
                        handleUpdateTripSlot(primarySlot.id, {
                          matchedRateCard: rc,
                          billingAmount: String(rateVal),
                        });
                      }}
                      className={cn(
                        "p-2.5 rounded-xl border transition-all text-left flex flex-col justify-between space-y-1.5 bg-white dark:bg-slate-800 shadow-2xs cursor-pointer select-none min-w-[220px] max-w-[260px] shrink-0",
                        isSelected
                          ? "border-brand ring-2 ring-brand/20 bg-orange-50/30 dark:bg-amber-950/20"
                          : "border-slate-200 dark:border-slate-700 hover:border-brand/60 hover:bg-slate-50 dark:hover:bg-slate-700"
                      )}
                    >
                      {/* TOP CARD HEADER: QUOTATION NO. + TOP RIGHT CHIPS (NEW RATE & APPLIED) */}
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                          {rc.quotation_number || `QUO-${idx + 1}`}
                        </span>
                        <div className="flex items-center gap-1">
                          {!hasHistory && (
                            <span className="text-[9px] font-extrabold text-orange-800 dark:text-orange-300 bg-orange-100/80 dark:bg-orange-950/40 px-1.5 py-0.2 rounded-full border border-orange-200/70 dark:border-orange-900/60">
                              ✨ New Rate
                            </span>
                          )}
                          {isSelected && (
                            <span className="text-[9px] font-extrabold text-brand bg-orange-100 dark:bg-brand/20 px-1.5 py-0.2 rounded-full">
                              Applied ✓
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="text-sm font-extrabold font-mono text-slate-900 dark:text-white">
                          SAR {Number(rateVal).toLocaleString()}
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium truncate">
                          {rCat} • <span className="font-bold text-slate-700 dark:text-slate-300">{vClass}</span>
                        </div>
                      </div>

                      {/* RECENT DRIVER & VEHICLE PROFILE TAG */}
                      {hasHistory && (
                        <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/50 px-1.5 py-0.5 rounded border border-slate-200/70 dark:border-slate-700 truncate">
                          <span className="shrink-0">👤</span>
                          <span className="truncate">{rc.driver_name || rc.recent_driver || 'Recent Driver'}</span>
                          {(rc.vehicle_plate || rc.recent_vehicle) && (
                            <span className="font-mono font-bold text-slate-500 shrink-0">({rc.vehicle_plate || rc.recent_vehicle})</span>
                          )}
                        </div>
                      )}

                      <div className="pt-1 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-[10px] text-slate-400 gap-1">
                        <span className="truncate max-w-[130px] font-medium" title={`${origName || 'Origin'} → ${destName || 'Destination'}`}>
                          {origName || 'Origin'} → {destName || 'Destination'}
                        </span>
                        <span className={cn("font-bold shrink-0", isSelected ? "text-brand" : "text-slate-500")}>
                          {isSelected ? 'Active' : 'Apply →'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* NO QUOTATION MATCHED FOR SELECTED CUSTOMER */
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 text-center space-y-1.5">
              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                No active commercial quotation rates found for <span className="font-bold text-slate-800 dark:text-slate-100">{selectedCust?.name || 'this customer'}</span>.
              </p>
              {handleOpenCreateQuotation && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleOpenCreateQuotation}
                  className="h-7 text-xs font-bold border-brand text-brand hover:bg-orange-50 gap-1 mx-auto cursor-pointer rounded-lg"
                >
                  <Plus className="w-3.5 h-3.5" /> Create Quotation for {selectedCust?.name?.split(' ')[0] || 'Customer'}
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

