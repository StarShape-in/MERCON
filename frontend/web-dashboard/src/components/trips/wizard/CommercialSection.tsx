import React from 'react';
import { DollarSign, CheckCircle2, Plus, Tag, AlertCircle, ChevronLeft, ChevronRight, Building2, Search, X, Calendar, Zap, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Combobox, ComboboxOption } from '@/components/ui/combobox';
import { cn } from '@/lib/utils';
import { getAllTaxonomyOptions, normalizeCode } from '@/utils/taxonomyRegistry';
import { normalizeRateCategory, normalizeVehicleClass, normalizeBillingType } from '@/utils/taxonomyRegistry';
import { LaneRateHistoryPopover } from './LaneRateHistoryPopover';
import { DefineQuotationInlineForm } from './DefineQuotationInlineForm';
import CustomerCardCarousel from './CustomerCardCarousel';
import QuotationCardCarousel from './QuotationCardCarousel';

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
  fieldErrors?: Record<string, boolean>;
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
  fieldErrors = {},
}) => {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const [isInlineMode, setIsInlineMode] = React.useState(false);
  const [quotationSearchQuery, setQuotationSearchQuery] = React.useState('');

  const vehicleClassOptions = React.useMemo(() => getAllTaxonomyOptions('VEHICLE_CLASS'), []);
  const lineTypeOptions = React.useMemo(() => getAllTaxonomyOptions('LINE_TYPE'), []);

  const primarySlot = contractSlots[0] || {};
  const availableRateCards = getAvailableRateCardsForLane(primarySlot) || [];

  const [inlinePricingBasis, setInlinePricingBasis] = React.useState<'Per Trip' | 'Per Month'>(
    primarySlot.pricingBasis || 'Per Trip'
  );

  const effectiveRateCards = React.useMemo(() => {
    if (customerRateCards && customerRateCards.length > 0) {
      return customerRateCards;
    }
    if (availableRateCards && availableRateCards.length > 0) {
      return availableRateCards;
    }
    return getAvailableRateCardsForLane({}) || [];
  }, [customerRateCards, availableRateCards, getAvailableRateCardsForLane]);

  // Filter rate cards matching current billing type specifications
  const matchingCardsForSpec = React.useMemo(() => {
    if (!effectiveRateCards || effectiveRateCards.length === 0) return [];
    const targetBt = normalizeBillingType(contractBillingType);

    return effectiveRateCards.filter((rc) => {
      const rcRaw = (rc as any).operation_type || (rc as any).quotation_operation_type || rc.billing_type || rc.billingType || (rc as any).pricing_basis || (rc as any).quotation_billing_type;
      const rcBt = normalizeBillingType(rcRaw);
      return rcBt === targetBt;
    });
  }, [effectiveRateCards, contractBillingType]);

  // Compute live card counts per operation type for segment tab badges
  const { monthlyCount, extraCount } = React.useMemo(() => {
    if (!effectiveRateCards || effectiveRateCards.length === 0) {
      return { monthlyCount: 0, extraCount: 0 };
    }
    let m = 0;
    let e = 0;
    effectiveRateCards.forEach((rc) => {
      const rcRaw = (rc as any).operation_type || (rc as any).quotation_operation_type || rc.billing_type || rc.billingType || (rc as any).pricing_basis || (rc as any).quotation_billing_type;
      const rcBt = normalizeBillingType(rcRaw);
      if (rcBt === 'Monthly') m++;
      else e++;
    });
    return { monthlyCount: m, extraCount: e };
  }, [effectiveRateCards]);

  // Default to showing saved rate cards if available; only show inline form if explicitly toggled or customer has 0 cards
  const showInlineForm = isInlineMode || (effectiveRateCards.length === 0 && !quotationSearchQuery);

  const matchedRateCard = primarySlot.matchedRateCard || null;
  const activeSelectedId = primarySlot.matchedRateCard?.id || primarySlot.rateCardId || null;

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

  // Sort quotations: Active selected quotation pinned FIRST to position 0 (leftmost)
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
        return String(a.quotation_number || a.id).localeCompare(String(b.quotation_number || b.id));
      })
      .slice(0, 50);
  }, [effectiveRateCards, activeSelectedId]);

  const displayedRateCards = React.useMemo(() => {
    const cards = matchingCardsForSpec;

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
  }, [sortedRateCards, matchingCardsForSpec, quotationSearchQuery]);

  const selectedCust = customers.find((c) => c.id === contractCustomer);

  return (
    <div className="p-3.5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-2.5 text-[#3E3C3D]">
      {/* UNIFIED SINGLE HEADER: CUSTOMER ACCOUNT */}
      <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800 flex-wrap">
        {/* LEFT: LOGO + CUSTOMER SEARCH COMBOBOX + MATCHED RATE BADGE */}
        <div className="flex items-center gap-2.5 flex-wrap flex-1 min-w-0">
          {/* COMPANY PROFILE PICTURE */}
          {selectedCust ? (
            selectedCust.logo_url ? (
              <img
                src={selectedCust.logo_url}
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
            <div id="field-customer" className="w-full sm:w-[320px] shrink-0">
              <Combobox
                options={derivedCustomerOptions}
                value={contractCustomer}
                hasError={Boolean(fieldErrors?.['customer'])}
                onChange={(val) => setContractCustomer?.(val)}
                placeholder="Select customer account..."
                searchPlaceholder="Search customer name or code..."
                triggerClassName="h-8.5 rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 shadow-2xs w-full focus:ring-2 focus:ring-brand"
              />
            </div>
          )}
        </div>

        {/* RIGHT: CREATE QUOTATION BUTTON / TOGGLE */}
        <div className="flex items-center gap-1.5 shrink-0">
          {contractCustomer && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsInlineMode(!showInlineForm)}
              className="h-8 text-xs font-bold border-brand text-brand hover:bg-orange-50 dark:hover:bg-orange-950/40 gap-1.5 cursor-pointer shrink-0 rounded-lg px-2.5"
            >
              <Plus className="w-3.5 h-3.5" />
              {showInlineForm && effectiveRateCards.length > 0
                ? `Saved Cards (${effectiveRateCards.length})`
                : 'Define Quotation'}
            </Button>
          )}
        </div>
      </div>

      {/* STAGE 1: NO CUSTOMER SELECTED */}
      {!contractCustomer && (
        <CustomerCardCarousel
          customers={sortedCustomers}
          onSelectCustomer={(id) => setContractCustomer?.(id)}
        />
      )}

      {/* STAGE 2: CUSTOMER IS SELECTED */}
      {Boolean(contractCustomer) && (
        <div className="space-y-2.5">
          {/* SLEEK SINGLE-ROW OPERATIONAL TOOLBAR (OPERATION TYPE SEGMENTS + SEARCH INPUT) */}
          {setContractBillingType && (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              {/* SEGMENTED TAB CONTROL WITH LIVE COUNT BADGES */}
              <div className="p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl flex items-center gap-1 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs shrink-0">
                <button
                  type="button"
                  onClick={() => setContractBillingType('Monthly')}
                    className={cn(
                      "px-3 py-1 rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1.5 select-none",
                      contractBillingType?.toLowerCase() === 'monthly'
                        ? "bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 font-extrabold shadow-2xs border border-purple-200/80 dark:border-purple-800/60"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-bold border border-transparent"
                    )}
                  >
                    <Calendar className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span>Monthly Contract</span>
                    <span className={cn(
                      "px-1.5 py-0.2 rounded-md font-mono text-[10px] font-bold transition-colors",
                      contractBillingType?.toLowerCase() === 'monthly'
                        ? "bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60"
                        : "bg-slate-200/60 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                    )}>
                      {monthlyCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setContractBillingType('Extra')}
                    className={cn(
                      "px-3 py-1 rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1.5 select-none",
                      contractBillingType?.toLowerCase() !== 'monthly'
                        ? "bg-white dark:bg-slate-900 text-[#FA634E] dark:text-rose-400 font-extrabold shadow-2xs border border-[#FFD4C4] dark:border-rose-900/60"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-bold border border-transparent"
                    )}
                  >
                    <Zap className="w-3.5 h-3.5 text-[#FA634E] dark:text-rose-400" />
                    <span>Extra / Spot Trip</span>
                    <span className={cn(
                      "px-1.5 py-0.2 rounded-md font-mono text-[10px] font-bold transition-colors",
                      contractBillingType?.toLowerCase() !== 'monthly'
                        ? "bg-orange-50 dark:bg-rose-950/80 text-[#FA634E] dark:text-rose-300 border border-orange-200/60 dark:border-rose-900/60"
                        : "bg-slate-200/60 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                    )}>
                      {extraCount}
                    </span>
                  </button>
                </div>

              {/* INTEGRATED SEARCH INPUT */}
              {!showInlineForm && (
                <div className="relative flex-1 min-w-[240px] max-w-md flex items-center">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={quotationSearchQuery}
                    onChange={(e) => setQuotationSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setQuotationSearchQuery('');
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    placeholder="Search quotations by route, rate, vehicle class..."
                    className="h-8.5 w-full pl-9 pr-20 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand shadow-2xs transition-all"
                  />
                  {quotationSearchQuery && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <span className="text-[10px] font-black text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 shrink-0 select-none">
                        {displayedRateCards.length}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuotationSearchQuery('')}
                        className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                        title="Clear search (Esc)"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {showInlineForm ? (
            <DefineQuotationInlineForm
              primarySlot={primarySlot}
              selectedCustName={selectedCust?.name}
              contractCustomer={contractCustomer}
              contractVehicleType={contractVehicleType}
              contractRateCategory={contractRateCategory}
              contractBillingType={contractBillingType}
              inlinePricingBasis={inlinePricingBasis}
              setInlinePricingBasis={setInlinePricingBasis}
              setContractBillingType={setContractBillingType}
              setContractVehicleType={setContractVehicleType}
              setContractRateCategory={setContractRateCategory}
              handleUpdateTripSlot={handleUpdateTripSlot}
              fieldErrors={fieldErrors}
            />
          ) : displayedRateCards.length > 0 ? (
            <QuotationCardCarousel
              rateCards={displayedRateCards}
              activeSelectedId={activeSelectedId}
              primarySlotMatchedId={primarySlot.matchedRateCard?.id}
              contractRateCategory={contractRateCategory}
              contractVehicleType={contractVehicleType}
              onApplyRateCard={(rc, targetCategory, targetVehicleClass, origName, destName, rateVal) => {
                const isAlreadySelected = Boolean(activeSelectedId && (rc.id === activeSelectedId || primarySlot.matchedRateCard?.id === rc.id));

                if (isAlreadySelected) {
                  // Toggle Deselect / Clear selection
                  handleUpdateTripSlot(primarySlot.id, {
                    matchedRateCard: null,
                    rateCardId: null,
                    billingAmount: '0',
                  });
                  return;
                }

                const firstStop = rc.stops && rc.stops.length > 0 ? rc.stops[0] : null;
                const lastStop = rc.stops && rc.stops.length > 1 ? rc.stops[rc.stops.length - 1] : firstStop;

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
                  driverPayout: rc.driver_payout != null ? String(rc.driver_payout) : '0',
                  driverPayoutModified: false,
                  updateQuotationPayout: false,
                  rateCategory: targetCategory,
                  vehicleType: targetVehicleClass,
                });
              }}
            />
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
