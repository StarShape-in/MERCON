import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Truck,
  User,
  MapPin,
  Calendar,
  AlertTriangle,
  ArrowRight,
  Phone,
  ArrowUpRight,
  Trash2,
  Building2,
  RotateCcw,
  CheckSquare,
  Square,
  ChevronRight,
} from 'lucide-react';

import StatusBadge from '@/components/ui/StatusBadge';
import { Checkbox } from '@/components/ui/checkbox';
import type { MonthlyBoardCompany, MonthlyBoardTrip } from '@/services/tripService';
import { formatDayHeading, formatMoney, formatTime, initialsOf, isUnassigned } from './monthlyBoardUtils';
import { computeMonthlyTripSearchRelevance } from './MonthlyCompanyCard';

interface MonthlyCompanyBoardProps {
  companies: MonthlyBoardCompany[];
  selectedTripIds?: string[];
  search?: string;
  onToggleTrip?: (id: string) => void;
  onToggleCompany?: (tripIds: string[]) => void;
  onSelectTrip?: (trip: MonthlyBoardTrip) => void;
}

export default function MonthlyCompanyBoard({
  companies,
  selectedTripIds = [],
  search = '',
  onToggleTrip,
  onToggleCompany,
  onSelectTrip,
}: MonthlyCompanyBoardProps) {
  return (
    <div className="w-full overflow-x-auto pb-6">
      <div className="flex gap-4 min-w-max items-start">
        {companies.map((company) => (
          <CompanyColumn
            key={company.customer.id}
            company={company}
            selectedTripIds={selectedTripIds}
            search={search}
            onToggleTrip={onToggleTrip}
            onToggleCompany={onToggleCompany}
            onSelectTrip={onSelectTrip}
          />
        ))}
      </div>
    </div>
  );
}

export interface TemplateGroup {
  key: string;
  lineType: string;
  vehicleClass: string;
  origin: string;
  destination: string;
  rateStr: string;
  trips: MonthlyBoardTrip[];
  threeDayTrips: MonthlyBoardTrip[];
  otherTrips: MonthlyBoardTrip[];
}

function getThreeDayDateStrings(): string[] {
  const today = new Date();
  const dates: string[] = [];
  for (let i = 0; i < 3; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    dates.push(`${yyyy}-${mm}-${dd}`);
  }
  return dates;
}

function getTodayDateString(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function shouldShowTripOnMonthlyBoard(trip: MonthlyBoardTrip, todayStr: string): boolean {
  const status = (trip.status || '').toLowerCase().trim();
  const isTerminalCompleted =
    status === 'completed' || status === 'invoiced' || status === 'delivered' || status === 'cancelled';

  if (isTerminalCompleted) {
    // Show completed/terminal trips ONLY if their date is TODAY
    return trip.date.startsWith(todayStr);
  }
  // Show all active/scheduled trips
  return true;
}

function CompanyColumn({
  company,
  selectedTripIds = [],
  search = '',
  onToggleTrip,
  onToggleCompany,
  onSelectTrip,
}: {
  company: MonthlyBoardCompany;
  selectedTripIds?: string[];
  search?: string;
  onToggleTrip?: (id: string) => void;
  onToggleCompany?: (tripIds: string[]) => void;
  onSelectTrip?: (trip: MonthlyBoardTrip) => void;
}) {
  const navigate = useNavigate();
  const handleSelectTrip = onSelectTrip || ((t: MonthlyBoardTrip) => navigate(`/trips/${t.id}`));

  const allCompanyTrips = useMemo(() => {
    const todayStr = getTodayDateString();
    const list = company.days.flatMap((day) => day.trips);

    // Rule: Hide completed trips except completed of Today
    const filteredTrips = list.filter((t) => shouldShowTripOnMonthlyBoard(t, todayStr));

    if (!search || !search.trim()) return filteredTrips;
    return filteredTrips.filter((t) => computeMonthlyTripSearchRelevance(t, search) > 0);
  }, [company, search]);

  const companyTripIds = useMemo(() => allCompanyTrips.map((t) => t.id), [allCompanyTrips]);
  const unassignedCount = useMemo(() => allCompanyTrips.filter((t) => isUnassigned(t)).length, [allCompanyTrips]);

  const allSelected =
    companyTripIds.length > 0 && companyTripIds.every((id) => selectedTripIds.includes(id));
  const someSelected =
    !allSelected && companyTripIds.some((id) => selectedTripIds.includes(id));

  // Group company trips by Template = Line Type + Vehicle Class + Route / Stops + Billing Rate
  const templateGroups = useMemo(() => {
    const threeDayDates = getThreeDayDateStrings();
    const map = new Map<string, TemplateGroup>();

    for (const trip of allCompanyTrips) {
      const lineType = trip.rate_category || trip.billing_type || 'Single Trip';
      const vehicleClass = trip.vehicle_type || 'Standard Truck';
      const origin = trip.origin ?? '—';
      const destination = (trip.destination ?? '—').replace(/🔁\s*/g, '').trim();
      const rateStr = trip.billing_amount != null ? formatMoney(trip.billing_amount, trip.currency) : '—';
      const key = `${lineType}||${vehicleClass}||${origin}→${destination}||${rateStr}`;

      let group = map.get(key);
      if (!group) {
        group = {
          key,
          lineType,
          vehicleClass,
          origin,
          destination,
          rateStr,
          trips: [],
          threeDayTrips: [],
          otherTrips: [],
        };
        map.set(key, group);
      }
      group.trips.push(trip);
    }

    // Partition trips into threeDayTrips (Today & Next 2 Days) and otherTrips
    const groups: TemplateGroup[] = [];
    map.forEach((g) => {
      // Sort trips by date & time
      g.trips.sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return (a.planned_start || '').localeCompare(b.planned_start || '');
      });

      // Filter for Today and next 2 days
      const threeDayMatches = g.trips.filter((t) => threeDayDates.some((d) => t.date.startsWith(d)));

      if (threeDayMatches.length > 0) {
        g.threeDayTrips = threeDayMatches.slice(0, 3);
        const threeDaySet = new Set(g.threeDayTrips.map((t) => t.id));
        g.otherTrips = g.trips.filter((t) => !threeDaySet.has(t.id));
      } else {
        // Fallback if no trips fall exactly on Today/Tomorrow/Day+2: take earliest 3 trips
        g.threeDayTrips = g.trips.slice(0, 3);
        g.otherTrips = g.trips.slice(3);
      }

      groups.push(g);
    });

    // Sort template groups by volume (busiest template first)
    return groups.sort((a, b) => b.trips.length - a.trips.length);
  }, [allCompanyTrips]);

  return (
    <div className="w-[360px] shrink-0 rounded-xl border border-slate-200 bg-slate-50/80 shadow-xs flex flex-col max-h-[780px] overflow-hidden">
      {/* ── Column Header ────────────────────────────────────────────── */}
      <div className="p-3.5 bg-white border-b border-slate-200 flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            {onToggleCompany && (
              <Checkbox
                checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                onCheckedChange={() => onToggleCompany(companyTripIds)}
                className="h-4 w-4 rounded border-slate-300 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600 shrink-0"
                aria-label={`Select all trips for ${company.customer.name}`}
              />
            )}
            {company.customer.avatar_url || company.customer.logo_url ? (
              <img
                src={company.customer.avatar_url || company.customer.logo_url || ''}
                alt={company.customer.name}
                className="h-8 w-8 shrink-0 rounded-lg object-cover border border-purple-200 dark:border-purple-800 shadow-3xs"
              />
            ) : (
              <span className="h-8 w-8 shrink-0 rounded-lg bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 grid place-items-center text-xs font-extrabold shadow-3xs">
                {initialsOf(company.customer.name)}
              </span>
            )}
            <div className="min-w-0">
              <h3 className="text-xs font-bold text-slate-900 truncate leading-tight" title={company.customer.name}>
                {company.customer.name}
              </h3>
              <p className="text-[10px] text-slate-500 truncate mt-0.5 font-medium">
                {company.total_billed > 0 ? formatMoney(company.total_billed) : 'Monthly Account'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-50 text-purple-700 border border-purple-200">
              {allCompanyTrips.length}
            </span>
            {unassignedCount > 0 && (
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200"
                title={`${unassignedCount} trips need assignment`}
              >
                {unassignedCount} gap
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Column Body: Template Cards ───────────────────────────────── */}
      <div className="p-3 overflow-y-auto space-y-3.5 flex-1">
        {templateGroups.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 font-medium border border-dashed border-slate-200 rounded-lg bg-white">
            No scheduled trips
          </div>
        ) : (
          templateGroups.map((group) => (
            <TemplateBigCard
              key={group.key}
              group={group}
              selectedTripIds={selectedTripIds}
              onToggleTrip={onToggleTrip}
              onSelectTrip={handleSelectTrip}
            />
          ))
        )}
      </div>
    </div>
  );
}

/** Big Card for a specific Template (Line Type + Vehicle Class + Route + Rate) */
function TemplateBigCard({
  group,
  selectedTripIds = [],
  onToggleTrip,
  onSelectTrip,
}: {
  group: TemplateGroup;
  selectedTripIds?: string[];
  onToggleTrip?: (id: string) => void;
  onSelectTrip: (trip: MonthlyBoardTrip) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const displayedTrips = isExpanded
    ? [...group.threeDayTrips, ...group.otherTrips]
    : group.threeDayTrips;

  const remainingCount = group.otherTrips.length;
  const isUnstacked = isExpanded || isHovered;

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group/template rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-800/80 shadow-2xs hover:shadow-md transition-all flex flex-col p-3 gap-2.5"
    >
      {/* ── 1. Big Template Header Metadata ──────────────────────────── */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="cursor-pointer flex flex-col gap-2 select-none pb-2.5 border-b border-slate-200/80 dark:border-slate-700/80"
      >
        {/* Line Type Badge + Rate */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 dark:text-purple-300 bg-purple-100/90 dark:bg-purple-950/80 px-2.5 py-0.5 rounded-md border border-purple-200/80 dark:border-purple-800/80">
            {group.lineType}
          </span>
          <span className="text-xs font-black text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 px-2.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 shadow-3xs">
            {group.rateStr}
          </span>
        </div>

        {/* Route / Stops */}
        <div className="flex items-center gap-1.5 text-xs font-black text-slate-900 dark:text-slate-100">
          <span className="truncate max-w-[130px]" title={group.origin}>
            {group.origin}
          </span>
          <ArrowRight className="h-3.5 w-3.5 text-purple-600 shrink-0" />
          <span className="truncate max-w-[130px]" title={group.destination}>
            {group.destination}
          </span>
        </div>

        {/* Vehicle Class & Total Trips Count */}
        <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 dark:text-slate-300 pt-1">
          <span className="flex items-center gap-1">
            <Truck className="h-3 w-3 text-purple-600 shrink-0" />
            {group.vehicleClass}
          </span>
          <span className="text-purple-700 dark:text-purple-300 font-extrabold bg-purple-100/80 dark:bg-purple-950/60 px-2 py-0.5 rounded-md border border-purple-200 dark:border-purple-800">
            {group.trips.length} {group.trips.length === 1 ? 'trip' : 'trips'}
          </span>
        </div>
      </div>

      {/* ── 2. Trips Stacked Directly Below Template Header ───────────── */}
      {displayedTrips.length > 0 && (
        <div className="flex flex-col relative transition-all duration-300 ease-out cursor-pointer py-0.5">
          {displayedTrips.map((trip, idx) => {
            const isSelected = selectedTripIds.includes(trip.id);

            // Modern 3D Stacked Deck Effect:
            // Collapsed: Cards stack upward with 3D scale inset and depth shadow
            // Hover / Click: Cards slide down into full spacing view
            const stackStyle = !isUnstacked && idx > 0
              ? idx === 1
                ? '-mt-9 z-20 scale-[0.97] shadow-md border-t border-purple-200/70 dark:border-purple-800/70'
                : '-mt-9 z-10 scale-[0.94] opacity-90 shadow-sm border-t border-purple-200/50 dark:border-purple-800/50'
              : 'mt-0 z-30 scale-100 opacity-100';

            return (
              <div
                key={trip.id}
                className={`transition-all duration-300 ease-out transform-gpu origin-top ${stackStyle} ${
                  idx > 0 && isUnstacked ? 'mt-2.5' : ''
                }`}
              >
                <CompanyBoardTripCard
                  trip={trip}
                  isSelected={isSelected}
                  onToggle={onToggleTrip ? () => onToggleTrip(trip.id) : undefined}
                  onOpen={() => onSelectTrip(trip)}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* ── 3. Expandable Toggle for Remaining Trips in Month ─────────── */}
      {remainingCount > 0 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="w-full py-1.5 text-center text-[11px] font-bold text-purple-700 dark:text-purple-300 hover:underline flex items-center justify-center gap-1 bg-white/80 dark:bg-slate-900/80 border border-purple-200/80 dark:border-purple-800/80 rounded-xl transition-colors cursor-pointer shadow-3xs"
        >
          <span>{isExpanded ? `Show less ▴` : `+ ${remainingCount} more trips in month ▾`}</span>
        </button>
      )}
    </div>
  );
}

function CompanyBoardTripCard({
  trip,
  isSelected = false,
  onToggle,
  onOpen,
}: {
  trip: MonthlyBoardTrip;
  isSelected?: boolean;
  onToggle?: () => void;
  onOpen?: () => void;
}) {
  const gap = isUnassigned(trip);

  return (
    <div
      onClick={onOpen}
      className={`group relative rounded-xl border bg-white dark:bg-slate-900 p-2.5 shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col gap-2 select-none ${
        isSelected
          ? 'border-purple-500 ring-1 ring-purple-500/30 bg-purple-50/20'
          : gap
          ? 'border-amber-200 bg-amber-50/30 hover:border-amber-300'
          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
      }`}
    >
      {/* Top Row: Checkbox, Prominent Date & Day, Ref ID, Status Badge */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {onToggle && (
            <div onClick={(e) => e.stopPropagation()} className="shrink-0 flex items-center">
              <Checkbox
                checked={isSelected}
                onCheckedChange={onToggle}
                className="h-3.5 w-3.5 rounded border-slate-300 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
              />
            </div>
          )}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/60 border border-purple-200/80 dark:border-purple-800/80 text-[11px] font-extrabold text-purple-950 dark:text-purple-200 whitespace-nowrap">
            <Calendar className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
            <span>{formatDayHeading(trip.date)}</span>
            <span className="text-[10px] font-bold text-purple-600 dark:text-purple-300 ml-0.5">{formatTime(trip.planned_start)}</span>
          </span>
          <span className="text-[9px] font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 shrink-0">
            {trip.ref_id || 'TRIP'}
          </span>
        </div>

        <StatusBadge status={trip.status} />
      </div>

      {/* Bottom Row: Driver Name & Vehicle Plate */}
      <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-100 dark:border-slate-800 gap-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span
            className={`truncate font-semibold ${
              trip.driver ? 'text-slate-800 dark:text-slate-200' : 'text-amber-700 dark:text-amber-400 font-bold'
            }`}
            title={trip.driver?.name}
          >
            {trip.driver?.name ?? 'No Driver'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Truck className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span
            className={`font-semibold ${
              trip.vehicle ? 'text-slate-800 dark:text-slate-200 font-mono' : 'text-amber-700 dark:text-amber-400 font-bold'
            }`}
          >
            {trip.vehicle?.plate_number ?? 'No Truck'}
          </span>
        </div>
      </div>
    </div>
  );
}
