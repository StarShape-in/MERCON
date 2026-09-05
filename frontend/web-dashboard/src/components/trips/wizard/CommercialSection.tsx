import React from 'react';
import { DollarSign, CheckCircle2, Plus, Tag, AlertCircle, ChevronLeft, ChevronRight, Building2, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Combobox, ComboboxOption } from '@/components/ui/combobox';
import { cn } from '@/lib/utils';

interface CommercialSectionProps {
  contractSlots: any[];
  contractRateCategory: string;
  contractBillingType: string;
  contractVehicleType: string;
  getAvailableRateCardsForLane: (slot: any) => any[];
  customerRateCards?: any[];
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
  customerRateCards = [],
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

  // Use full customerRateCards so selecting a card does NOT hide other quotations
  const effectiveRateCards = React.useMemo(() => {
    if (customerRateCards && customerRateCards.length > 0) {
      return customerRateCards;
    }
    if (availableRateCards && availableRateCards.length > 0) {
      return availableRateCards;
    }
    return getAvailableRateCardsForLane({}) || [];
  }, [customerRateCards, availableRateCards, getAvailableRateCardsForLane]);

  const matchedRateCard = primarySlot.matchedRateCard || (primarySlot.origin ? availableRateCards[0] : null);
  const activeSelectedId = primarySlot.matchedRateCard?.id || matchedRateCard?.id;

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

  // Auto-scroll to left position 0 whenever customer or selected quotation changes
  React.useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    }
  }, [contractCustomer, activeSelectedId]);

  const derivedCustomerOptions = React.useMemo(() => {
    if (customerOptions && customerOptions.length > 0) return customerOptions;
    return customers.map((c) => ({
      value: c.id,
      label: c.name,
      keywords: `${c.code || ''} ${c.city || ''} ${c.name}`,
    }));
  }, [customerOptions, customers]);

  // Sort customers: Selected customer pinned FIRST to position 0 (leftmost)
  const sortedCustomers = React.useMemo(() => {
    if (!customers) return [];
    return [...customers].sort((a, b) => {
      const aIsSelected = a.id === contractCustomer;
      const bIsSelected = b.id === contractCustomer;
      if (aIsSelected && !bIsSelected) return -1;
      if (!aIsSelected && bIsSelected) return 1;
      return 0;
    });
  }, [customers, contractCustomer]);

  // Sort quotations: Selected quotation pinned FIRST to position 0 (leftmost), then usage count
  const sortedRateCards = React.useMemo(() => {
    if (!effectiveRateCards || effectiveRateCards.length === 0) return [];

    return [...effectiveRateCards]
      .sort((a, b) => {
        const aIsSelected = a.id === activeSelectedId;
        const bIsSelected = b.id === activeSelectedId;
        if (aIsSelected && !bIsSelected) return -1;
        if (!aIsSelected && bIsSelected) return 1;

        const aUsage = Number(a.usage_count || 0) + (a.driver_name || a.recent_driver ? 10 : 0);
        const bUsage = Number(b.usage_count || 0) + (b.driver_name || b.recent_driver ? 10 : 0);

        if (aUsage !== bUsage) return bUsage - aUsage;
        return 0;
      })
      .slice(0, 50);
  }, [effectiveRateCards, activeSelectedId]);

  const [quotationSearchQuery, setQuotationSearchQuery] = React.useState('');

  // Filter quotations based on contractBillingType (All, Monthly, Extra) + search query
  const displayedRateCards = React.useMemo(() => {
    let cards = sortedRateCards;

    // Filter by billing type if not 'All'
    if (contractBillingType && contractBillingType.toLowerCase() !== 'all') {
      const bTarget = contractBillingType.toLowerCase().trim();
      cards = cards.filter((rc) => {
        const rcB = String(rc.billing_type || rc.billingType || rc.billing_mode || '').toLowerCase().trim();
        if (!rcB) return true;
        return rcB.includes(bTarget) || bTarget.includes(rcB);
      });
    }

    if (!quotationSearchQuery.trim()) return cards;
    const q = quotationSearchQuery.toLowerCase().trim();

    return cards.filter((rc) => {
      const qNum = String(rc.quotation_number || '').toLowerCase();
      const firstStop = rc.stops && rc.stops.length > 0 ? rc.stops[0] : null;
      const lastStop = rc.stops && rc.stops.length > 1 ? rc.stops[rc.stops.length - 1] : firstStop;

      const orig = String(
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
      ).toLowerCase();

      const dest = String(
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
      ).toLowerCase();

      const vClass = String(rc.vehicle_class || rc.vehicle_type || '').toLowerCase();
      const rCat = String(rc.rate_category || rc.line_type || '').toLowerCase();
      const rateStr = String(rc.rate ?? rc.base_price ?? '').toLowerCase();

      return (
        qNum.includes(q) ||
        orig.includes(q) ||
        dest.includes(q) ||
        vClass.includes(q) ||
        rCat.includes(q) ||
        rateStr.includes(q)
      );
    });
  }, [sortedRateCards, contractBillingType, quotationSearchQuery]);

  const selectedCust = customers.find((c) => c.id === contractCustomer);

  return (
    <div className="p-3.5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-2.5 text-[#3E3C3D]">
      {/* UNIFIED SINGLE HEADER: CUSTOMER ACCOUNT */}
      <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800 flex-wrap">
        {/* LEFT: LOGO + CUSTOMER SEARCH COMBOBOX + MATCHED RATE BADGE */}
        <div className="flex items-center gap-2.5 flex-wrap flex-1 min-w-0">
          {/* COMPANY PROFILE PICTURE */}
          {selectedCust ? (
            selectedCust.logo_url || selectedCust.avatar_url ? (
              <img
                src={selectedCust.logo_url || selectedCust.avatar_url}
                alt={selectedCust.name}
                className="w-8.5 h-8.5 rounded-xl object-cover border border-brand/40 shadow-2xs shrink-0"
                title={selectedCust.name}
              />
            ) : (
              <div
                className="w-8.5 h-8.5 rounded-xl bg-brand text-white font-black text-xs grid place-items-center shrink-0 shadow-2xs border border-brand/20"
                title={selectedCust.name}
              >
                {selectedCust.name.substring(0, 2).toUpperCase()}
              </div>
            )
          ) : (
            <div className="w-8.5 h-8.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 font-bold text-xs grid place-items-center shrink-0 border border-slate-200 dark:border-slate-700">
              <Building2 className="w-4 h-4 text-slate-400" />
            </div>
          )}

          {/* CUSTOMER SEARCH COMBOBOX */}
          {setContractCustomer && (
            <div className="w-full sm:w-[320px] shrink-0">
              <Combobox
                options={derivedCustomerOptions}
                value={contractCustomer}
                onChange={(val) => setContractCustomer?.(val)}
                placeholder="Select customer account..."
                searchPlaceholder="Search customer name or code..."
                triggerClassName="h-8.5 rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 shadow-2xs w-full focus:ring-2 focus:ring-brand"
              />
            </div>
          )}

          {/* STAGE STATUS INDICATORS */}
          {contractCustomer && (
            <div className="flex items-center gap-1.5">
              {matchedRateCard || primarySlot.matchedRateCard ? (
                <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>
                    Quotation {(matchedRateCard || primarySlot.matchedRateCard)?.quotation_number || 'Applied'} • <span className="text-slate-600 dark:text-slate-400 font-medium">Source for Route & Rate</span>
                  </span>
                </span>
              ) : (
                <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-amber-600" /> Rate Unset
                </span>
              )}
            </div>
          )}
        </div>

        {/* RIGHT: CREATE QUOTATION BUTTON */}
        <div className="flex items-center gap-1.5 shrink-0">
          {handleOpenCreateQuotation && contractCustomer && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenCreateQuotation}
              className="h-8 text-xs font-bold border-brand text-brand hover:bg-orange-50 dark:hover:bg-orange-950/40 gap-1.5 cursor-pointer shrink-0 rounded-lg px-2.5"
            >
              <Plus className="w-3.5 h-3.5" /> Create Quotation
            </Button>
          )}
        </div>
      </div>

      {/* STAGE 1: NO CUSTOMER SELECTED */}
      {!contractCustomer && (
        <div className="w-full">
          {sortedCustomers.length > 0 ? (
            sortedCustomers.length <= 3 ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
                {sortedCustomers.map((c, idx) => {
                  const cInitials = c.name.substring(0, 2).toUpperCase();
                  const firstName = c.name.split(' ')[0];

                  return (
                    <button
                      key={c.id || idx}
                      type="button"
                      onClick={() => setContractCustomer?.(c.id)}
                      className="p-3 rounded-xl border transition-all duration-200 text-left flex flex-col justify-between h-[104px] w-full bg-white dark:bg-slate-800 shadow-2xs cursor-pointer select-none border-slate-200 dark:border-slate-700 hover:border-brand hover:bg-orange-50/50 dark:hover:bg-slate-700/80 group"
                    >
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

                      <div className="pt-1.5 border-t border-slate-100 dark:border-slate-700 flex items-center justify-end text-[10px]">
                        <span className="font-extrabold text-slate-500 group-hover:text-brand transition-colors flex items-center gap-1">
                          Select Company →
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="relative group/carousel w-full flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleScrollLeft}
                  className="w-7 h-7 rounded-full bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-brand hover:text-white hover:border-brand grid place-items-center transition-all cursor-pointer shrink-0 z-10"
                  title="Scroll Left"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div
                  ref={scrollContainerRef}
                  className="flex items-center gap-3 overflow-x-auto scroll-smooth py-1 px-0.5 flex-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                >
                  {sortedCustomers.map((c, idx) => {
                    const cInitials = c.name.substring(0, 2).toUpperCase();
                    const firstName = c.name.split(' ')[0];

                    return (
                      <button
                        key={c.id || idx}
                        type="button"
                        onClick={() => setContractCustomer?.(c.id)}
                        className="p-3 rounded-xl border transition-all duration-200 text-left flex flex-col justify-between h-[104px] w-[calc(33.333%-8px)] min-w-[210px] shrink-0 bg-white dark:bg-slate-800 shadow-2xs cursor-pointer select-none border-slate-200 dark:border-slate-700 hover:border-brand hover:bg-orange-50/50 dark:hover:bg-slate-700/80 group"
                      >
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

                        <div className="pt-1.5 border-t border-slate-100 dark:border-slate-700 flex items-center justify-end text-[10px]">
                          <span className="font-extrabold text-slate-500 group-hover:text-brand transition-colors flex items-center gap-1">
                            Select Company →
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={handleScrollRight}
                  className="w-7 h-7 rounded-full bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-brand hover:text-white hover:border-brand grid place-items-center transition-all cursor-pointer shrink-0 z-10"
                  title="Scroll Right"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )
          ) : (
            <div className="w-full p-4 text-center rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 text-xs text-slate-500">
              No customer accounts found. Use the search box above.
            </div>
          )}
        </div>
      )}

      {/* STAGE 2: CUSTOMER IS SELECTED */}
      {Boolean(contractCustomer) && (
        <div className="space-y-2.5">
          {/* QUOTATIONS TOOLBAR: SEARCH INPUT (ALIGNED WITH COMBOBOX & CARDS) + BILLING TOGGLE */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {/* TOP LEFT: QUOTATION SEARCH BAR WITH SPACER TO MATCH COMBOBOX LEFT ALIGNMENT */}
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="w-8.5 shrink-0 hidden sm:block" />
              <div className="relative w-full sm:w-[276px] shrink-0">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={quotationSearchQuery}
                  onChange={(e) => setQuotationSearchQuery(e.target.value)}
                  placeholder="Search quotations (route, rate)..."
                  className="h-7.5 w-full pl-8 pr-7 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand shadow-2xs"
                />
                {quotationSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setQuotationSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    title="Clear search"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* TOP RIGHT: BILLING TYPE TOGGLE (ALL / MONTHLY / EXTRA) */}
            {setContractBillingType && (
              <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0 ml-auto">
                <button
                  type="button"
                  onClick={() => setContractBillingType('All')}
                  className={`px-2.5 py-0.5 rounded text-[11px] font-extrabold transition-all cursor-pointer h-6.5 ${
                    !contractBillingType || contractBillingType.toLowerCase() === 'all'
                      ? 'bg-brand text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setContractBillingType('Monthly')}
                  className={`px-2.5 py-0.5 rounded text-[11px] font-extrabold transition-all cursor-pointer h-6.5 ${
                    contractBillingType?.toLowerCase() === 'monthly'
                      ? 'bg-brand text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setContractBillingType('Extra')}
                  className={`px-2.5 py-0.5 rounded text-[11px] font-extrabold transition-all cursor-pointer h-6.5 ${
                    contractBillingType?.toLowerCase() === 'extra'
                      ? 'bg-brand text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  Extra
                </button>
              </div>
            )}
          </div>

          {displayedRateCards.length > 0 ? (
            displayedRateCards.length <= 3 ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
                {displayedRateCards.map((rc, idx) => {
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
                        const targetCategory = rc.rate_category || rc.line_type || rc.lineType || contractRateCategory;
                        const targetVehicleClass = rc.vehicle_class || rc.vehicle_type || rc.vehicleClass || contractVehicleType;

                        if (origName && handleSlotLocationChange) {
                          handleSlotLocationChange(primarySlot.id, 'origin', origName, rc.originLocation || firstStop?.location || null);
                        }
                        if (destName && handleSlotLocationChange) {
                          handleSlotLocationChange(primarySlot.id, 'destination', destName, rc.destinationLocation || lastStop?.location || null);
                        }
                        if (targetCategory && setContractRateCategory) {
                          setContractRateCategory(targetCategory);
                        }
                        if (targetVehicleClass && setContractVehicleType) {
                          setContractVehicleType(targetVehicleClass);
                        }
                        handleUpdateTripSlot(primarySlot.id, {
                          matchedRateCard: rc,
                          billingAmount: String(rateVal),
                          rateCategory: targetCategory,
                          vehicleType: targetVehicleClass,
                        });
                      }}
                      className={cn(
                        "p-2.5 rounded-xl border transition-all text-left flex flex-col justify-between space-y-1.5 bg-white dark:bg-slate-800 shadow-2xs cursor-pointer select-none w-full min-h-[110px]",
                        isSelected
                          ? "border-brand ring-2 ring-brand/20 bg-orange-50/40 dark:bg-amber-950/20"
                          : "border-slate-200 dark:border-slate-700 hover:border-brand/60 hover:bg-slate-50 dark:hover:bg-slate-700"
                      )}
                    >
                      {/* TOP ROW: QUOTATION ID + PRICE BADGE */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-600">
                            {rc.quotation_number || `QUO-${idx + 1}`}
                          </span>
                          {isSelected && (
                            <span className="text-[9px] font-black text-brand bg-orange-100 dark:bg-brand/20 px-1.5 py-0.5 rounded-full border border-orange-200/80">
                              Applied ✓
                            </span>
                          )}
                          {!hasHistory && !isSelected && (
                            <span className="text-[9px] font-extrabold text-orange-800 dark:text-orange-300 bg-orange-100/80 dark:bg-orange-950/40 px-1.5 py-0.5 rounded-full border border-orange-200/70">
                              ✨ New Rate
                            </span>
                          )}
                        </div>

                        {/* PRICE BADGE */}
                        <span className="text-xs font-black font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200/80 dark:border-emerald-900/60">
                          SAR {Number(rateVal).toLocaleString()}
                        </span>
                      </div>

                      {/* HERO CENTER: PROMINENT LOCATION ROUTE LANE */}
                      <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-1.5 my-0.5">
                        <span className="text-xs font-black text-slate-900 dark:text-white truncate max-w-[45%]" title={origName}>
                          {origName || 'Origin'}
                        </span>
                        <span className="text-[#FA634E] font-bold text-xs shrink-0">→</span>
                        <span className="text-xs font-black text-[#FA634E] truncate max-w-[45%]" title={destName}>
                          {destName || 'Destination'}
                        </span>
                      </div>

                      {/* BOTTOM ROW: LINE TYPE & VEHICLE CLASS + ACTION */}
                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold pt-0.5">
                        <span className="truncate">
                          {rCat} • <span className="text-slate-800 dark:text-slate-200">{vClass}</span>
                        </span>
                        <span className={cn("font-black shrink-0", isSelected ? "text-brand" : "text-slate-400 hover:text-slate-600")}>
                          {isSelected ? 'Active' : 'Apply →'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="relative group/carousel w-full flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleScrollLeft}
                  className="w-7 h-7 rounded-full bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-brand hover:text-white hover:border-brand grid place-items-center transition-all cursor-pointer shrink-0 z-10"
                  title="Scroll Left"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div
                  ref={scrollContainerRef}
                  className="flex items-center gap-3 overflow-x-auto scroll-smooth py-1 px-0.5 flex-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                >
                  {displayedRateCards.map((rc, idx) => {
                    const isSelected = matchedRateCard?.id === rc.id || primarySlot.matchedRateCard?.id === rc.id;
                    const rateVal = rc.rate ?? rc.base_price ?? 0;
                    const vClass = rc.vehicle_class || rc.vehicle_type || 'Standard';
                    const rCat = rc.rate_category || rc.line_type || contractRateCategory;

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
                          const targetCategory = rc.rate_category || rc.line_type || rc.lineType || contractRateCategory;
                          const targetVehicleClass = rc.vehicle_class || rc.vehicle_type || rc.vehicleClass || contractVehicleType;

                          if (origName && handleSlotLocationChange) {
                            handleSlotLocationChange(primarySlot.id, 'origin', origName, rc.originLocation || firstStop?.location || null);
                          }
                          if (destName && handleSlotLocationChange) {
                            handleSlotLocationChange(primarySlot.id, 'destination', destName, rc.destinationLocation || lastStop?.location || null);
                          }
                          if (targetCategory && setContractRateCategory) {
                            setContractRateCategory(targetCategory);
                          }
                          if (targetVehicleClass && setContractVehicleType) {
                            setContractVehicleType(targetVehicleClass);
                          }
                          handleUpdateTripSlot(primarySlot.id, {
                            matchedRateCard: rc,
                            billingAmount: String(rateVal),
                            rateCategory: targetCategory,
                            vehicleType: targetVehicleClass,
                          });
                        }}
                        className={cn(
                          "p-2.5 rounded-xl border transition-all text-left flex flex-col justify-between space-y-1.5 bg-white dark:bg-slate-800 shadow-2xs cursor-pointer select-none w-[calc(33.333%-8px)] min-w-[210px] shrink-0 min-h-[110px]",
                          isSelected
                            ? "border-brand ring-2 ring-brand/20 bg-orange-50/40 dark:bg-amber-950/20"
                            : "border-slate-200 dark:border-slate-700 hover:border-brand/60 hover:bg-slate-50 dark:hover:bg-slate-700"
                        )}
                      >
                        {/* TOP ROW: QUOTATION ID + PRICE BADGE */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-600">
                              {rc.quotation_number || `QUO-${idx + 1}`}
                            </span>
                            {isSelected && (
                              <span className="text-[9px] font-black text-brand bg-orange-100 dark:bg-brand/20 px-1.5 py-0.5 rounded-full border border-orange-200/80">
                                Applied ✓
                              </span>
                            )}
                          </div>

                          {/* PRICE BADGE */}
                          <span className="text-xs font-black font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200/80 dark:border-emerald-900/60">
                            SAR {Number(rateVal).toLocaleString()}
                          </span>
                        </div>

                        {/* HERO CENTER: PROMINENT LOCATION ROUTE LANE */}
                        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-1.5 my-0.5">
                          <span className="text-xs font-black text-slate-900 dark:text-white truncate max-w-[45%]" title={origName}>
                            {origName || 'Origin'}
                          </span>
                          <span className="text-[#FA634E] font-bold text-xs shrink-0">→</span>
                          <span className="text-xs font-black text-[#FA634E] truncate max-w-[45%]" title={destName}>
                            {destName || 'Destination'}
                          </span>
                        </div>

                        {/* BOTTOM ROW: LINE TYPE & VEHICLE CLASS + ACTION */}
                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold pt-0.5">
                          <span className="truncate">
                            {rCat} • <span className="text-slate-800 dark:text-slate-200">{vClass}</span>
                          </span>
                          <span className={cn("font-black shrink-0", isSelected ? "text-brand" : "text-slate-400 hover:text-slate-600")}>
                            {isSelected ? 'Active' : 'Apply →'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={handleScrollRight}
                  className="w-7 h-7 rounded-full bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-brand hover:text-white hover:border-brand grid place-items-center transition-all cursor-pointer shrink-0 z-10"
                  title="Scroll Right"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )
          ) : (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 text-center space-y-1.5">
              {quotationSearchQuery ? (
                <>
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                    No quotation rate cards match <span className="font-bold text-slate-800 dark:text-slate-100">"{quotationSearchQuery}"</span>.
                  </p>
                  <button
                    type="button"
                    onClick={() => setQuotationSearchQuery('')}
                    className="text-xs font-bold text-brand hover:underline cursor-pointer"
                  >
                    Clear quotation search filter
                  </button>
                </>
              ) : (
                <>
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
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
