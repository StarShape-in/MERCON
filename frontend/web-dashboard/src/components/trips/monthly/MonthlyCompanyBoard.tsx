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
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();

  const handleSelectTrip = onSelectTrip || ((t: MonthlyBoardTrip) => navigate(`/trips/${t.id}`));

  const trips = useMemo(() => {
    const list = company.days.flatMap((day) => day.trips);
    
    // Sort: Non-completed/terminal first, completed/terminal last
    const sortedList = [...list].sort((a, b) => {
      const statusA = (a.status || '').toLowerCase().trim();
      const statusB = (b.status || '').toLowerCase().trim();
      
      const aIsCompleted = statusA === 'completed' || statusA === 'invoiced' || statusA === 'cancelled' || statusA === 'delivered' || statusA === 'atdelivery';
      const bIsCompleted = statusB === 'completed' || statusB === 'invoiced' || statusB === 'cancelled' || statusB === 'delivered' || statusB === 'atdelivery';
      
      if (aIsCompleted && !bIsCompleted) return 1;
      if (!aIsCompleted && bIsCompleted) return -1;
      return 0;
    });

    console.log(`[MERCON Board Sort] Column: ${company.customer.name}, Trips total: ${sortedList.length}`);

    if (!search || !search.trim()) return sortedList;

    return [...sortedList].sort((a, b) => {
      const scoreA = computeMonthlyTripSearchRelevance(a, search);
      const scoreB = computeMonthlyTripSearchRelevance(b, search);
      if (scoreA !== scoreB) return scoreB - scoreA;
      
      const statusA = (a.status || '').toLowerCase().trim();
      const statusB = (b.status || '').toLowerCase().trim();
      const aIsCompleted = statusA === 'completed' || statusA === 'invoiced' || statusA === 'cancelled' || statusA === 'delivered' || statusA === 'atdelivery';
      const bIsCompleted = statusB === 'completed' || statusB === 'invoiced' || statusB === 'cancelled' || statusB === 'delivered' || statusB === 'atdelivery';
      
      if (aIsCompleted && !bIsCompleted) return 1;
      if (!aIsCompleted && bIsCompleted) return -1;
      return 0;
    });
  }, [company, search]);

  const companyTripIds = useMemo(() => trips.map((t) => t.id), [trips]);
  const unassignedCount = useMemo(() => trips.filter((t) => isUnassigned(t)).length, [trips]);

  const allSelected =
    companyTripIds.length > 0 && companyTripIds.every((id) => selectedTripIds.includes(id));
  const someSelected =
    !allSelected && companyTripIds.some((id) => selectedTripIds.includes(id));

  const firstTrip = trips[0];
  const compactTrips = trips.slice(1);
  const visibleCompactTrips = isExpanded ? compactTrips : compactTrips.slice(0, 5);
  const remainingCount = compactTrips.length > 5 ? compactTrips.length - 5 : 0;

  return (
    <div className="w-[340px] shrink-0 rounded-xl border border-slate-200 bg-slate-50/80 shadow-xs flex flex-col max-h-[750px] overflow-hidden">
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
            <span className="h-8 w-8 shrink-0 rounded-lg bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 grid place-items-center text-xs font-extrabold shadow-3xs">
              {initialsOf(company.customer.name)}
            </span>
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
              {trips.length}
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

      {/* ── Trip Cards Column Body ───────────────────────────────────── */}
      <div className="p-2.5 overflow-y-auto space-y-2.5 flex-1">
        {trips.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 font-medium border border-dashed border-slate-200 rounded-lg bg-white">
            No scheduled trips
          </div>
        ) : (
          <>
            {/* 1st Trip: Expanded / Full Card */}
            {firstTrip && (
              <CompanyBoardTripCard
                trip={firstTrip}
                isSelected={selectedTripIds.includes(firstTrip.id)}
                onToggle={onToggleTrip ? () => onToggleTrip(firstTrip.id) : undefined}
                onOpen={() => handleSelectTrip(firstTrip)}
              />
            )}

            {/* Remaining Trips: Compact Rows */}
            {visibleCompactTrips.length > 0 && (
              <div className="flex flex-col gap-2">
                {visibleCompactTrips.map((trip) => (
                  <CompactTripRow
                    key={trip.id}
                    trip={trip}
                    isSelected={selectedTripIds.includes(trip.id)}
                    onToggle={onToggleTrip ? () => onToggleTrip(trip.id) : undefined}
                    onOpen={() => handleSelectTrip(trip)}
                  />
                ))}
              </div>
            )}

            {/* "+ X more trips" expandable control */}
            {remainingCount > 0 && (
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full py-2 text-center text-xs font-bold text-purple-600 hover:underline flex items-center justify-center gap-1 bg-[#FAF7FF] border border-purple-200 rounded-xl cursor-pointer hover:bg-purple-100/30 transition-colors"
              >
                <span>{isExpanded ? `Show less ▴` : `+ ${remainingCount} more trips ▾`}</span>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function CompactTripRow({
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
  const driverName = trip.driver?.name ?? 'Not assigned';
  const gap = isUnassigned(trip);

  return (
    <div
      onClick={onOpen}
      className={`group relative bg-white dark:bg-slate-900 border rounded-xl shadow-3xs hover:shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer px-2 py-1.5 flex flex-col gap-1 select-none ${
        isSelected 
          ? 'border-purple-500 ring-1 ring-purple-500/30 bg-purple-50/20' 
          : gap
          ? 'border-amber-200 bg-amber-50/20'
          : 'border-slate-200'
      }`}
    >
      {/* Top line: Checkbox + Calendar Icon + Date Time */}
      <div className="flex items-center gap-1.5">
        {onToggle && (
          <div onClick={(e) => e.stopPropagation()} className="shrink-0 flex items-center">
            <Checkbox
              checked={isSelected}
              onCheckedChange={onToggle}
              className="h-3 w-3 rounded border-slate-300 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
            />
          </div>
        )}
        <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">
          <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
          {formatDayHeading(trip.date)}
          <span className="ml-1 text-[9px] font-medium text-slate-400">{formatTime(trip.planned_start)}</span>
        </span>
      </div>

      {/* Bottom line: Route  Driver Name  Status Badge  Chevron */}
      <div className="flex items-center justify-between gap-2 min-w-0 w-full">
        <div className="flex items-center gap-1 min-w-0 flex-1">
          <span className="text-[10px] font-extrabold text-slate-700 dark:text-slate-300 truncate">
            {trip.origin ?? '—'} → {(trip.destination ?? '—').replace(/🔁\s*/g, '').trim()}
          </span>
          <span className="text-slate-300 text-[9px] select-none">·</span>
          <span className="text-[9px] text-slate-500 dark:text-slate-400 font-semibold truncate max-w-[130px]" title={driverName}>
            {driverName}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <StatusBadge status={trip.status} />
          <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-slate-600 transition-colors shrink-0" />
        </div>
      </div>
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
      className={`group relative rounded-xl border bg-white p-3.5 shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col gap-2.5 ${
        isSelected
          ? 'border-purple-500 ring-1 ring-purple-500/30 bg-purple-50/20'
          : gap
          ? 'border-amber-200 bg-amber-50/30 hover:border-amber-300'
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      {/* Top Header Row: Date & Status */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          {onToggle && (
            <div onClick={(e) => e.stopPropagation()} className="shrink-0">
              <Checkbox
                checked={isSelected}
                onCheckedChange={onToggle}
                className="h-4 w-4 rounded border-slate-300 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
              />
            </div>
          )}
          <span className="flex items-center gap-1 text-[11px] font-bold text-slate-800 truncate">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            {formatDayHeading(trip.date)}
          </span>
          <span className="text-[10px] font-semibold text-slate-400 shrink-0">
            {formatTime(trip.planned_start)}
          </span>
        </div>

        <StatusBadge status={trip.status} />
      </div>

      {/* Ref ID & Route */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-mono font-bold text-purple-700 uppercase tracking-wider">
            {trip.ref_id || 'TRIP'}
          </span>
          {trip.billing_amount != null && (
            <span className="text-xs font-extrabold text-slate-900">
              {formatMoney(trip.billing_amount, trip.currency)}
            </span>
          )}
        </div>

        {(trip.origin || trip.destination) && (
          <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5 flex-wrap mt-0.5">
            <span className="truncate max-w-[120px]" title={trip.origin ?? ''}>{trip.origin ?? '—'}</span>
            <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />
            <span className="truncate max-w-[120px]" title={trip.destination ?? ''}>
              {(trip.destination ?? '—').replace(/🔁\s*/g, '').trim()}
            </span>
          </div>
        )}
      </div>

      {/* Driver & Vehicle Assignment Footer */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <User className="h-3 w-3 text-slate-400 shrink-0" />
          <span
            className={`truncate font-medium ${
              trip.driver ? 'text-slate-700' : 'text-amber-700 font-bold'
            }`}
            title={trip.driver?.name}
          >
            {trip.driver?.name ?? 'No Driver'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Truck className="h-3 w-3 text-slate-400 shrink-0" />
          <span
            className={`font-medium ${
              trip.vehicle ? 'text-slate-700 font-mono' : 'text-amber-700 font-bold'
            }`}
          >
            {trip.vehicle?.plate_number ?? 'No Truck'}
          </span>
        </div>
      </div>
    </div>
  );
}
