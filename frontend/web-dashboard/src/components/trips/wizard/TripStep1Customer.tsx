import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Building2,
  Zap,
  Search,
  Eye,
  Edit2,
  FileCheck,
  Truck,
  User,
  X,
  Building,
  Plus,
  RotateCcw,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';
import { Combobox, ComboboxOption } from '@/components/ui/combobox';
import { Button } from '@/components/ui/button';
import { quotationService } from '@/services/quotationService';
import { tripService, Trip } from '@/services/tripService';

interface TripStep1CustomerProps {
  contractCustomer: string;
  setContractCustomer: (customerId: string) => void;
  customers: any[];
  customerOptions?: ComboboxOption[];
  setPreviewCustomer: (customer: any) => void;
  setEditCustomer: (customer: any) => void;
  setIsCreateCustomerOpen?: (open: boolean) => void;
  onRepeatTrip?: (trip: Trip) => void;
}

export const TripStep1Customer: React.FC<TripStep1CustomerProps> = ({
  contractCustomer,
  setContractCustomer,
  customers,
  customerOptions = [],
  setPreviewCustomer,
  setEditCustomer,
  setIsCreateCustomerOpen,
  onRepeatTrip,
}) => {
  const selectedCust = customers.find((c) => c.id === contractCustomer);
  const initials = selectedCust ? selectedCust.name.substring(0, 2).toUpperCase() : '';

  const { data: customerQuotationsRes } = useQuery({
    queryKey: ['customer-quotations-count', selectedCust?.id],
    queryFn: () => quotationService.getAll({ customerId: selectedCust?.id, active_only: true }),
    enabled: !!selectedCust?.id,
    staleTime: 60000,
  });

  const { data: customerTripsRes, isLoading: isTripsLoading } = useQuery({
    queryKey: ['customer-trips-count', selectedCust?.id],
    queryFn: () => tripService.getAll({ customer_id: selectedCust?.id, per_page: 50 }),
    enabled: !!selectedCust?.id,
    staleTime: 60000,
  });

  const rawCustomerTrips: Trip[] = Array.isArray(customerTripsRes?.data) ? customerTripsRes.data : [];

  // Efficient Smart Deduplication & Relevance Ranking Algorithm:
  // 1. Group trips by unique operational route signature (Origin -> Destination + Line Type + Vehicle Class + Stop Count)
  // 2. Keep the newest instance for repeating while tracking usage frequency
  // 3. Rank by recency & frequency so operators get distinct, high-value trip templates
  const displayRecentTrips = React.useMemo(() => {
    if (!rawCustomerTrips.length) return [];

    const routeMap = new Map<string, { trip: Trip; count: number; lastUsed: number }>();

    for (let i = 0; i < rawCustomerTrips.length; i++) {
      const t = rawCustomerTrips[i];
      const stops = t.stops || [];
      const pickupStop = stops.find((s: any) => s.stop_type === 'Pickup' || s.sequence === 1) || stops[0];
      const dropoffStops = stops.filter((s: any) => s.stop_type === 'Dropoff');
      const dropoffStop = dropoffStops.length > 0 ? dropoffStops[dropoffStops.length - 1] : (stops.length > 1 ? stops[stops.length - 1] : null);

      const orig = ((pickupStop as any)?.source_label || pickupStop?.location?.name || t.rateCard?.route_origin || '').toLowerCase().trim();
      const dest = ((dropoffStop as any)?.source_label || dropoffStop?.location?.name || t.rateCard?.route_destination || '').toLowerCase().trim();
      const lineType = (t.quotation_line_type || (t as any).line_type || (t.rateCard as any)?.line_type || '').toLowerCase().trim();
      const vClass = (t.quotation_vehicle_class || (t as any).vehicle_class || (t.vehicle?.asset_type || '')).toLowerCase().trim();

      const key = `${orig}|${dest}|${lineType}|${vClass}|${stops.length}`;
      const timestamp = t.createdAt ? new Date(t.createdAt).getTime() : 0;

      const existing = routeMap.get(key);
      if (existing) {
        existing.count += 1;
        if (timestamp > existing.lastUsed) {
          existing.lastUsed = timestamp;
          existing.trip = t;
        }
      } else {
        routeMap.set(key, {
          trip: t,
          count: 1,
          lastUsed: timestamp,
        });
      }
    }

    const ranked = Array.from(routeMap.values()).sort((a, b) => {
      if (b.lastUsed !== a.lastUsed) {
        return b.lastUsed - a.lastUsed;
      }
      return b.count - a.count;
    });

    return ranked.slice(0, 3).map((r) => r.trip);
  }, [rawCustomerTrips]);

  const tripBreakdown = React.useMemo(() => {
    let monthly = 0;
    let extra = 0;
    rawCustomerTrips.forEach((t) => {
      const bType = (t.quotation_billing_type || (t as any).billing_type || (t as any).billingType || '').toLowerCase();
      if (bType.includes('extra') || bType.includes('spot')) {
        extra++;
      } else {
        monthly++;
      }
    });
    return { total: rawCustomerTrips.length, monthly, extra };
  }, [rawCustomerTrips]);

  const quotationCount = Array.isArray(customerQuotationsRes?.data) ? customerQuotationsRes.data.length : 0;

  const derivedOptions = React.useMemo(() => {
    if (customerOptions && customerOptions.length > 0) return customerOptions;
    return customers.map((c) => ({
      value: c.id,
      label: c.name,
      keywords: `${c.code || ''} ${c.city || ''} ${c.name}`,
    }));
  }, [customerOptions, customers]);

  return (
    <div className="space-y-6 animate-fade-in max-w-full">
      {/* TOP SECTION: LEFT 6 COLS (SEARCH & RECENT CUSTOMERS) | RIGHT 6 COLS (SELECTED CUSTOMER) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: SEARCH & RECENT CUSTOMERS (6 COLS = HALF WIDTH) */}
        <div className="md:col-span-6 space-y-4">
          <div className="space-y-1 pb-1 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-[#3E3C3D] dark:text-slate-100 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-brand shrink-0" />
              CUSTOMER ACCOUNT SELECTION
            </h3>
          </div>

          {/* Customer Search Combobox */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#3E3C3D] dark:text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-brand" /> CUSTOMER ACCOUNT <span className="text-brand">*</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal normal-case">
                Search by company name, code or city
              </span>
            </label>

            <Combobox
              id="step1-customer-combobox"
              options={derivedOptions}
              value={contractCustomer}
              onChange={setContractCustomer}
              placeholder="Search or select customer account..."
              searchPlaceholder="Type customer name or code (e.g. iMile, AKS)..."
              emptyText="No customer matching your search."
              triggerClassName="h-10.5 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold shadow-2xs w-full focus-visible:ring-2 focus-visible:ring-brand"
            />
          </div>

          {/* RECENT CUSTOMERS QUICK PICK TILES */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" /> RECENT CUSTOMERS
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Quick Pick</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {customers.slice(0, 4).map((c, idx) => {
                const isSelected = contractCustomer === c.id;
                const cInitials = c.name.substring(0, 2).toUpperCase();

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setContractCustomer(c.id)}
                    className={`px-2 py-2 rounded-xl border text-left transition-all flex items-center justify-between gap-1.5 h-11 cursor-pointer focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none ${
                      isSelected
                        ? 'bg-orange-50/90 dark:bg-orange-950/40 border-brand ring-1 ring-brand/30 shadow-2xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className={`w-6 h-6 rounded-md font-extrabold text-[10px] grid place-items-center shrink-0 overflow-hidden shadow-2xs ${
                          isSelected
                            ? 'bg-brand text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {c.logo_url || c.avatar_url ? (
                          <img src={c.logo_url || c.avatar_url || ''} alt={c.name} className="w-full h-full object-cover" />
                        ) : (
                          cInitials
                        )}
                      </span>
                      <p className="text-xs font-bold text-[#3E3C3D] dark:text-slate-100 truncate" title={c.name}>
                        {c.name}
                      </p>
                    </div>

                    <span
                      className={`text-[9px] font-bold border px-1 py-0.5 rounded shrink-0 ${
                        isSelected
                          ? 'bg-brand/10 text-brand border-brand/20'
                          : 'bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700'
                      }`}
                    >
                      Key {idx + 1}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: SELECTED CUSTOMER CONTEXT CARD (6 COLS = HALF WIDTH) */}
        <div className="md:col-span-6 space-y-2">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-brand" /> SELECTED CUSTOMER
          </span>

          {selectedCust ? (
            <div className="bg-slate-50/80 dark:bg-slate-800/40 rounded-xl border border-slate-200/90 dark:border-slate-800 p-4 space-y-3 animate-fade-in shadow-2xs">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-9 h-9 rounded-lg bg-slate-900 dark:bg-slate-800 text-white font-extrabold text-xs grid place-items-center shrink-0 border border-slate-700 overflow-hidden shadow-2xs">
                    {selectedCust.logo_url || selectedCust.avatar_url ? (
                      <img src={selectedCust.logo_url || selectedCust.avatar_url || ''} alt={selectedCust.name} className="w-full h-full object-cover" />
                    ) : (
                      initials
                    )}
                  </span>
                  <div className="min-w-0">
                    <h5 className="text-sm font-extrabold text-[#3E3C3D] dark:text-slate-100 truncate" title={selectedCust.name}>
                      {selectedCust.name}
                    </h5>
                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      Commercial Account · Active
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    title="View Customer"
                    onClick={() => setPreviewCustomer(selectedCust)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    title="Clear selection"
                    onClick={() => setContractCustomer('')}
                    className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs font-bold text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-200/80 dark:border-slate-700/60">
                <span className="flex items-center gap-1.5 text-brand">
                  <FileCheck className="w-3.5 h-3.5" />
                  {quotationCount > 0 ? `${quotationCount} Active Quotations` : 'Spot Rates'}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400">
                  <Truck className="w-3.5 h-3.5" />
                  {tripBreakdown.total} Trips This Month
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50/50 dark:bg-slate-800/20 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-5 h-28 grid place-items-center text-center">
              <p className="text-xs font-semibold text-slate-400">No account selected</p>
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM FULL-WIDTH SECTION: RECENT TRIPS */}
      {selectedCust && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h4 className="text-xs font-extrabold text-[#3E3C3D] dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                <RotateCcw className="w-4 h-4 text-brand shrink-0" /> RECENT TRIPS
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Repeat a previous trip configuration
              </p>
            </div>
          </div>

          {/* Operational List Table */}
          {isTripsLoading ? (
            <div className="space-y-2 py-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
              ))}
            </div>
          ) : displayRecentTrips.length > 0 ? (
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-2xs">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-3 px-4 py-2.5 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200/80 dark:border-slate-800 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <div className="col-span-4">Route</div>
                <div className="col-span-3">Configuration</div>
                <div className="col-span-3">Driver & Vehicle</div>
                <div className="col-span-2 text-right">Action</div>
              </div>

              {/* Rows */}
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {displayRecentTrips.map((t) => {
                  const stops = t.stops || [];
                  const pickupStop = stops.find((s: any) => s.stop_type === 'Pickup' || s.sequence === 1) || stops[0];
                  const dropoffStops = stops.filter((s: any) => s.stop_type === 'Dropoff');
                  const dropoffStop = dropoffStops.length > 0 ? dropoffStops[dropoffStops.length - 1] : (stops.length > 1 ? stops[stops.length - 1] : null);

                  const origName = (pickupStop as any)?.source_label || pickupStop?.location?.name || t.rateCard?.route_origin || 'Origin';
                  const destName = (dropoffStop as any)?.source_label || dropoffStop?.location?.name || t.rateCard?.route_destination || 'Destination';

                  const lineType = t.quotation_line_type || (t as any).line_type || (t.rateCard as any)?.line_type || 'Single Trip';
                  const vehicleClass = t.quotation_vehicle_class || (t as any).vehicle_class || (t.vehicle ? (t.vehicle.asset_type || '10 TON') : '10 TON');
                  const billingType = (t.quotation_billing_type || (t as any).billing_type || '').toLowerCase().includes('extra') ? 'Extra (Spot)' : 'Monthly';

                  const driverName = t.driver
                    ? `${(t.driver as any).first_name || ''} ${(t.driver as any).last_name || ''}`.trim() || (t.driver as any).name || (t.driver as any).code || 'Assigned Driver'
                    : null;
                  const vehiclePlate = t.vehicle ? (t.vehicle.plate_number || (t.vehicle as any).plate || (t.vehicle as any).asset_type || 'Assigned Vehicle') : null;

                  const formatLastUsed = (dateStr?: string) => {
                    if (!dateStr) return 'Recent';
                    const d = new Date(dateStr);
                    const now = new Date();
                    const diffHours = (now.getTime() - d.getTime()) / (1000 * 3600);
                    if (diffHours < 24 && now.getDate() === d.getDate()) return 'Today';
                    if (diffHours < 48 && (now.getDate() - d.getDate() === 1)) return 'Yesterday';
                    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  };

                  const intermediateCount = stops.filter((s: any) => s.stop_type === 'Intermediate' || (s.sequence > 1 && s !== dropoffStop)).length;

                  return (
                    <div
                      key={t.id}
                      className="grid grid-cols-12 gap-3 px-4 py-3.5 items-center hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors text-xs"
                    >
                      {/* Route */}
                      <div className="col-span-4 min-w-0">
                        <div className="flex items-center gap-1.5 font-bold text-[#3E3C3D] dark:text-slate-100 text-xs">
                          <span className="truncate">{origName}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-brand shrink-0" />
                          <span className="truncate">{destName}</span>
                          {intermediateCount > 0 && (
                            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 shrink-0">
                              +{intermediateCount} stops
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                          Last used {formatLastUsed(t.createdAt)}
                        </p>
                      </div>

                      {/* Configuration */}
                      <div className="col-span-3 min-w-0">
                        <p className="font-bold text-[#3E3C3D] dark:text-slate-200 text-xs truncate">
                          {lineType} · {vehicleClass}
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                          {billingType} billing
                        </p>
                      </div>

                      {/* Driver & Vehicle */}
                      <div className="col-span-3 min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1 text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate">
                          <User className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{driverName || 'Driver unassigned'}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate">
                          <Truck className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{vehiclePlate ? `Vehicle: ${vehiclePlate}` : 'Vehicle unassigned'}</span>
                        </div>
                      </div>

                      {/* Action */}
                      <div className="col-span-2 text-right">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => onRepeatTrip?.(t)}
                          className="h-9 px-3 text-xs font-extrabold bg-brand hover:bg-[#E0523D] text-white rounded-lg shadow-xs inline-flex items-center gap-1.5 cursor-pointer transition-all active:scale-[0.98]"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Repeat Trip
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-slate-50/60 dark:bg-slate-800/30 rounded-xl p-6 text-center space-y-1 border border-dashed border-slate-200 dark:border-slate-800">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No Recent Trips Found</p>
              <p className="text-xs text-slate-400">
                Create this customer's first trip using the normal workflow below.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TripStep1Customer;
