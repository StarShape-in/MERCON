import { CheckCircle2, Calendar, MapPin, Clock, Truck, User, DollarSign, TrendingUp } from 'lucide-react';
import { Customer } from '@/services/customerService';
import { Driver } from '@/services/driverService';
import { Vehicle } from '@/services/vehicleService';
import { ContractSlot, BatchTripRow } from './types';

interface DayAssignment {
  driverId: string;
  vehicleId: string;
  tripCharge?: string;
  driverTripCharge?: string;
}

interface Step5ReviewProps {
  selectedCustomer: Customer | undefined;
  contractRateCategory: string;
  contractVehicleType: string;
  contractBillingType: string;
  assignMode: 'single' | 'alternating';
  contractSlots: ContractSlot[];
  selectedDatesCount: number;
  batchTripRows: BatchTripRow[];
  dayAssignments: Record<string, DayAssignment>;
  drivers: Driver[];
  vehicles: Vehicle[];
  masterDriver: string;
  masterVehicle: string;
  masterTripCharge: string;
  masterDriverCharge: string;
  loopTeams?: { id: string; name: string; driverId: string; vehicleId: string }[];
  isSubmitting: boolean;
  onConfirm: () => void;
  onBack: () => void;
}

function fmt(val: number) {
  return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Step5Review({
  selectedCustomer,
  contractRateCategory,
  contractVehicleType,
  contractBillingType,
  assignMode,
  contractSlots,
  selectedDatesCount,
  batchTripRows,
  dayAssignments,
  drivers,
  vehicles,
  masterDriver,
  masterVehicle,
  masterTripCharge,
  masterDriverCharge,
  loopTeams = [],
}: Step5ReviewProps) {
  /** Get the ContractSlot for a BatchTripRow */
  const getSlot = (row: BatchTripRow): ContractSlot | undefined => {
    if (contractSlots.length <= 1) return contractSlots[0];
    const slotId = row.key.includes('::') ? row.key.split('::')[1] : undefined;
    return slotId ? contractSlots.find((s) => s.id === slotId) : contractSlots[0];
  };

  /** Resolve per-row financials: per-row override → master → slot fallback */
  const resolveRowFinancials = (row: BatchTripRow, slot: ContractSlot | undefined) => {
    const asgn = dayAssignments[row.key] || { driverId: '', vehicleId: '' };

    const billingBase = Number(
      (asgn.tripCharge !== undefined && asgn.tripCharge !== '')
        ? asgn.tripCharge
        : (masterTripCharge || slot?.billingAmount || '0')
    ) || 0;

    const driverPayout = Number(
      (asgn.driverTripCharge !== undefined && asgn.driverTripCharge !== '')
        ? asgn.driverTripCharge
        : (masterDriverCharge || slot?.driverTripCharge || '0')
    ) || 0;

    const stopFees =
      (slot?.intermediateStopFees || []).reduce((s, f) => s + (Number(f) || 0), 0) +
      (slot?.returnIntermediateStopFees || []).reduce((s, f) => s + (Number(f) || 0), 0);

    const totalBilled = billingBase + stopFees;
    const grossMargin = totalBilled - driverPayout;

    return { billingBase, stopFees, totalBilled, driverPayout, grossMargin };
  };

  /** Resolve driver & vehicle for a row */
  const resolveAssignment = (row: BatchTripRow) => {
    const asgn = dayAssignments[row.key] || { driverId: '', vehicleId: '' };
    const driverId = asgn.driverId || masterDriver;
    const vehicleId = asgn.vehicleId || masterVehicle;
    const driver = drivers.find((d) => d.id === driverId);
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    return { driver, vehicle };
  };

  /** Aggregate totals across all rows */
  const totals = batchTripRows.reduce(
    (acc, row) => {
      const slot = getSlot(row);
      const f = resolveRowFinancials(row, slot);
      acc.billing += f.billingBase;
      acc.totalBilled += f.totalBilled;
      acc.driverPayout += f.driverPayout;
      acc.grossMargin += f.grossMargin;
      return acc;
    },
    { billing: 0, totalBilled: 0, driverPayout: 0, grossMargin: 0 }
  );

  /** Primary driver / vehicle for header display */
  const primaryDriverId = masterDriver || Object.values(dayAssignments).find((a) => a.driverId)?.driverId || '';
  const primaryVehicleId = masterVehicle || Object.values(dayAssignments).find((a) => a.vehicleId)?.vehicleId || '';
  const primaryDriver = drivers.find((d) => d.id === primaryDriverId);
  const primaryVehicle = vehicles.find((v) => v.id === primaryVehicleId);
  const isMultiDriver = assignMode === 'alternating';

  const getDriverName = (d?: Driver) =>
    d ? `${d.first_name || ''} ${d.last_name || ''}`.trim() : '—';
  const getVehiclePlate = (v?: Vehicle) => (v as any)?.plate_number || '—';

  /** Derive loop driver names for header display if in alternating mode */
  const loopDriverNames = isMultiDriver
    ? loopTeams
        .map((team) => {
          const d = drivers.find((drv) => drv.id === team.driverId);
          return d ? `${d.first_name || ''} ${d.last_name || ''}`.trim() : team.name;
        })
        .filter(Boolean)
        .join(' & ')
    : '';

  /** Group trip rows by identical slot route, driver, vehicle, and charges (combines alternating days into driver-based groups) */
  const groupedTripCards = (() => {
    const groupMap = new Map<
      string,
      {
        rows: BatchTripRow[];
        driver?: Driver;
        vehicle?: Vehicle;
        slot?: ContractSlot;
        financials: ReturnType<typeof resolveRowFinancials>;
        tripCount: number;
      }
    >();

    batchTripRows.forEach((row) => {
      const slot = getSlot(row);
      const { driver, vehicle } = resolveAssignment(row);
      const financials = resolveRowFinancials(row, slot);

      const driverId = driver?.id || 'unassigned';
      const vehicleId = vehicle?.id || 'unassigned';
      const slotId = slot?.id || 'default';

      const groupKey = `${slotId}_${driverId}_${vehicleId}_${financials.billingBase}_${financials.driverPayout}`;

      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, {
          rows: [row],
          driver,
          vehicle,
          slot,
          financials,
          tripCount: 1,
        });
      } else {
        const group = groupMap.get(groupKey)!;
        group.rows.push(row);
        group.tripCount += 1;
      }
    });

    return Array.from(groupMap.values()).map((g) => {
      const firstDate = g.rows[0].formattedDate;
      const lastDate = g.rows[g.rows.length - 1].formattedDate;
      const dateLabel = g.rows.length === 1 ? firstDate : `${firstDate} — ${lastDate}`;
      return { ...g, dateLabel };
    });
  })();

  return (
    <div className="w-full space-y-4 animate-fade-in py-1">

      {/* ── HEADER LABEL BAR ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          Review &amp; Confirm
        </h3>
        <span className="text-[10px] font-semibold text-slate-500">
          {batchTripRows.length} Trip{batchTripRows.length !== 1 ? 's' : ''} Ready to Create · {selectedDatesCount} operating days
        </span>
      </div>

      {/* ── KPI HEADER STRIP ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 divide-x divide-slate-100 dark:divide-slate-800">

          {/* Customer */}
          <div className="p-3 space-y-0.5">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <User className="w-2.5 h-2.5" /> Customer
            </span>
            <p className="text-xs font-extrabold text-slate-900 dark:text-slate-100 truncate">
              {(selectedCustomer as any)?.company_name || (selectedCustomer as any)?.name || '—'}
            </p>
            <p className="text-[9px] text-slate-400 truncate">{contractRateCategory} · {contractVehicleType}</p>
          </div>

          {/* Driver */}
          <div className="p-3 space-y-0.5">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <User className="w-2.5 h-2.5" /> Driver
            </span>
            <p className="text-xs font-extrabold text-slate-900 dark:text-slate-100 truncate" title={isMultiDriver ? (loopDriverNames || 'A/B Rotation') : getDriverName(primaryDriver)}>
              {isMultiDriver ? (loopDriverNames || 'A/B Rotation') : getDriverName(primaryDriver)}
            </p>
            <p className="text-[9px] text-slate-400">{isMultiDriver ? 'Alternating Shuttle Loop' : 'Single Master'}</p>
          </div>

          {/* Truck */}
          <div className="p-3 space-y-0.5">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Truck className="w-2.5 h-2.5" /> Truck
            </span>
            <p className="text-xs font-extrabold text-slate-900 dark:text-slate-100 truncate">
              {isMultiDriver ? 'Multiple' : getVehiclePlate(primaryVehicle)}
            </p>
            <p className="text-[9px] text-slate-400">{contractBillingType || 'Per Trip'}</p>
          </div>

          {/* Customer Billing */}
          <div className="p-3 space-y-0.5">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <DollarSign className="w-2.5 h-2.5" /> Customer Billing
            </span>
            <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
              SAR {fmt(totals.billing)}
            </p>
            <p className="text-[9px] text-slate-400">Base rate × {batchTripRows.length} trips</p>
          </div>

          {/* Total Billed */}
          <div className="p-3 space-y-0.5 bg-emerald-50/60 dark:bg-emerald-900/10">
            <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1">
              <DollarSign className="w-2.5 h-2.5" /> Total Billed (inc. stops)
            </span>
            <p className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400">
              SAR {fmt(totals.totalBilled)}
            </p>
            <p className="text-[9px] text-emerald-500">Incl. intermediate stop fees</p>
          </div>

          {/* Driver / 3PL Payout */}
          <div className="p-3 space-y-0.5">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <DollarSign className="w-2.5 h-2.5" /> Driver/3PL Payout
            </span>
            <p className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400">
              SAR {fmt(totals.driverPayout)}
            </p>
            <p className="text-[9px] text-slate-400">Trip charges total</p>
          </div>

          {/* Gross Margin */}
          <div className={`p-3 space-y-0.5 ${totals.grossMargin >= 0 ? 'bg-blue-50/60 dark:bg-blue-900/10' : 'bg-rose-50/60 dark:bg-rose-900/10'}`}>
            <span className={`text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 ${totals.grossMargin >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
              <TrendingUp className="w-2.5 h-2.5" /> Gross Margin (Profit)
            </span>
            <p className={`text-sm font-extrabold ${totals.grossMargin >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-rose-600'}`}>
              SAR {fmt(totals.grossMargin)}
            </p>
            <p className={`text-[9px] ${totals.grossMargin >= 0 ? 'text-blue-500' : 'text-rose-500'}`}>
              {totals.totalBilled > 0
                ? `${((totals.grossMargin / totals.totalBilled) * 100).toFixed(1)}% margin`
                : '—'}
            </p>
          </div>

        </div>
      </div>

      {/* ── PER-TRIP / GROUPED CARDS ───────────────────────────────────────────── */}
      <div className="space-y-2 max-h-[calc(100vh-380px)] overflow-y-auto pr-0.5">
        {groupedTripCards.map((group, idx) => {
          const { slot, driver, vehicle, financials, dateLabel, tripCount } = group;
          const { billingBase, stopFees, totalBilled, driverPayout, grossMargin } = financials;

          const origin = slot?.origin || '—';
          const destination = slot?.destination || '—';
          const pickupTime = slot?.pickupTime || '';
          const dropoffTime = slot?.dropoffTime || '';

          const groupTotalBilling = billingBase * tripCount;
          const groupTotalBilled = totalBilled * tripCount;
          const groupDriverPayout = driverPayout * tripCount;
          const groupGrossMargin = grossMargin * tripCount;

          return (
            <div
              key={idx}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden"
            >
              {/* Card Header */}
              <div className="flex items-center justify-between px-3.5 py-2 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-brand" />
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {dateLabel}
                  </span>
                  <span className="text-[9px] font-extrabold bg-brand/10 text-brand border border-brand/20 px-2 py-0.5 rounded-full">
                    {tripCount} {tripCount === 1 ? 'Trip' : 'Trips'}
                  </span>
                  {group.rows[0]?.slotLabel && (
                    <span className="text-[9px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded">
                      {group.rows[0].slotLabel}
                    </span>
                  )}
                </div>
                {/* Financial badges */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">
                    BILLING: SAR {fmt(groupTotalBilling)} {tripCount > 1 ? `(${fmt(billingBase)}/trip)` : ''}
                  </span>
                  <span className="text-[9px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                    TOTAL: SAR {fmt(groupTotalBilled)}
                  </span>
                  <span className="text-[9px] font-bold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded-full">
                    TRIP CHARGES: SAR {fmt(groupDriverPayout)}
                  </span>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${groupGrossMargin >= 0 ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'bg-rose-100 text-rose-700'}`}>
                    BALANCE: SAR {fmt(groupGrossMargin)}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Route */}
                <div className="space-y-1.5">
                  <div className="flex items-start gap-1.5">
                    <MapPin className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Outbound Pickup</p>
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{origin}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <MapPin className="w-3 h-3 text-rose-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Outbound Dropoff</p>
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{destination}</p>
                    </div>
                  </div>
                  {stopFees > 0 && (
                    <div className="text-[9px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded w-fit">
                      + SAR {fmt(stopFees)} intermediate stop fees per trip
                    </div>
                  )}
                </div>

                {/* Times + Assignment */}
                <div className="space-y-1.5">
                  <div className="grid grid-cols-2 gap-2">
                    {pickupTime && (
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" /> Outbound Pickup
                        </p>
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{pickupTime}</p>
                      </div>
                    )}
                    {dropoffTime && (
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" /> Outbound Dropoff
                        </p>
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{dropoffTime}</p>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-0.5">
                        <User className="w-2.5 h-2.5" /> Driver
                      </p>
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {getDriverName(driver)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-0.5">
                        <Truck className="w-2.5 h-2.5" /> Truck
                      </p>
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {getVehiclePlate(vehicle)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


