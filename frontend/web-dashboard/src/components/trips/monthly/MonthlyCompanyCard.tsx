import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, AlertTriangle, ArrowRight, Phone, ArrowUpRight, Trash2, RotateCcw, Calendar, User, ChevronRight } from 'lucide-react';

import StatusBadge from '@/components/ui/StatusBadge';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import type { MonthlyBoardCompany, MonthlyBoardTrip } from '@/services/tripService';
import { formatDayHeading, formatMoney, formatTime, initialsOf, isUnassigned } from './monthlyBoardUtils';

const FIELD_LABEL = 'text-[9px] font-bold uppercase tracking-wider text-[#9898A4]';
const ROUTE_CONNECTOR_SET = new Set(['to', 'from', 'via', 'ret', 'return', '-', '->', '>', ',']);

const normalisePlace = (s: string) =>
  (s || '')
    .toLowerCase()
    .trim()
    .replace(/^al[\s-]+|^ad[\s-]+|^ar[\s-]+|^ash[\s-]+|^an[\s-]+/g, '')
    .replace(/dh/g, 'd')
    .replace(/th/g, 't')
    .replace(/kh/g, 'k')
    .replace(/[^a-z0-9]/g, '');

export const computeMonthlyTripSearchRelevance = (trip: MonthlyBoardTrip, search: string): number => {
  if (!search || !search.trim()) return 0;
  const rawQuery = search.trim().toLowerCase();
  const normQuery = normalisePlace(rawQuery);

  const rawTokens = rawQuery.split(/\s+/).filter(Boolean);
  const locationTokens = rawTokens.filter(t => !ROUTE_CONNECTOR_SET.has(t));
  const effectiveTokens = locationTokens.length > 0 ? locationTokens : rawTokens;

  let score = 0;

  const originText = trip.origin || '';
  const destText = trip.destination || '';
  const rateCardName = trip.rate_card?.name || '';

  const matchesText = (text: string, token: string): boolean => {
    if (!text) return false;
    const lower = text.toLowerCase();
    const normText = normalisePlace(text);
    const normTok = normalisePlace(token);
    return lower.includes(token) || (normTok ? normText.includes(normTok) : false);
  };

  const startsWithText = (text: string, token: string): boolean => {
    if (!text) return false;
    const lower = text.toLowerCase();
    const normText = normalisePlace(text);
    const normTok = normalisePlace(token);
    return lower.startsWith(token) || (normTok ? normText.startsWith(normTok) : false);
  };

  // 1. Route Pair Match (e.g., "dammam to BURAIDAH", "dammam - BURAIDAH")
  if (locationTokens.length >= 2) {
    const originTerm = locationTokens[0];
    const destTerm = locationTokens[1];

    const originMatches = matchesText(originText, originTerm) || (rateCardName && matchesText(rateCardName.split(/[-–>]/)[0] || '', originTerm));
    const destMatches = matchesText(destText, destTerm) || (rateCardName && matchesText(rateCardName.split(/[-–>]/).slice(1).join(' ') || '', destTerm));

    const originMatchesDest = matchesText(originText, destTerm);
    const destMatchesOrigin = matchesText(destText, originTerm);

    if (originMatches && destMatches) {
      score += 10000;
    } else if (originMatchesDest && destMatchesOrigin) {
      score += 3000;
    } else if (originMatches) {
      score += 2000;
    } else if (destMatches) {
      score += 1500;
    }
  }

  // 2. Single Location / Token Evaluation (e.g. "dammam")
  const primaryTerm = effectiveTokens[0] || rawQuery;

  // Origin match (TOP PRIORITY)
  if (effectiveTokens.every(tok => matchesText(originText, tok))) {
    score += 5000;
    if (startsWithText(originText, primaryTerm)) {
      score += 1000;
    }
  }

  // Rate card route name origin match
  if (rateCardName) {
    const lowerRc = rateCardName.toLowerCase();
    const normRc = normalisePlace(rateCardName);
    if (lowerRc.includes(primaryTerm) || (normQuery && normRc.includes(normQuery))) {
      score += 800;
      if (lowerRc.startsWith(primaryTerm) || (normQuery && normRc.startsWith(normQuery))) {
        score += 1200;
      }
    }
  }

  // Destination match
  if (effectiveTokens.every(tok => matchesText(destText, tok))) {
    score += 1500;
    if (startsWithText(destText, primaryTerm)) {
      score += 300;
    }
  }

  // Driver name / Vehicle plate match
  const driverName = trip.driver?.name || '';
  const vehiclePlate = trip.vehicle?.plate_number || '';

  if (effectiveTokens.every(tok => matchesText(driverName, tok))) {
    score += 1500;
  }
  if (effectiveTokens.every(tok => matchesText(vehiclePlate, tok))) {
    score += 1500;
  }

  // Ref ID match
  if (trip.ref_id && matchesText(trip.ref_id, rawQuery)) {
    score += 8000;
  }

  return score;
};

interface MonthlyCompanyCardProps {
  company: MonthlyBoardCompany;
  selectedTripIds?: string[];
  search?: string;
  onToggleTrip?: (id: string) => void;
  onToggleCompany?: (tripIds: string[]) => void;
  onSingleDelete?: (tripId: string) => void;
}

/**
 * One company's month. The card header carries the identity and the two
 * numbers that matter about the month as a whole (how many trips, how many
 * still uncovered); the body is one tight table of the trips themselves.
 * Clicking a row opens a detail dialog on the board rather than navigating
 * away, so scanning a month never costs you your place in it.
 */
export default function MonthlyCompanyCard({
  company,
  selectedTripIds = [],
  search = '',
  onToggleTrip,
  onToggleCompany,
  onSingleDelete,
}: MonthlyCompanyCardProps) {
    const [selectedTrip, setSelectedTrip] = useState<MonthlyBoardTrip | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // When a search term is present, sort trips by search relevance (origin first)
  const trips = useMemo(() => {
    const list = company.days.flatMap((day) => day.trips);
    if (!search || !search.trim()) return list;
    return [...list].sort((a, b) => {
      const scoreA = computeMonthlyTripSearchRelevance(a, search);
      const scoreB = computeMonthlyTripSearchRelevance(b, search);
      if (scoreA !== scoreB) return scoreB - scoreA;
      return 0;
    });
  }, [company, search]);

  const companyTripIds = useMemo(() => trips.map((t) => t.id), [trips]);

  const allSelected =
    companyTripIds.length > 0 && companyTripIds.every((id) => selectedTripIds.includes(id));
  const someSelected =
    !allSelected && companyTripIds.some((id) => selectedTripIds.includes(id));

  const firstTrip = trips[0];
  const compactTrips = trips.slice(1);
  const visibleCompactTrips = isExpanded ? compactTrips : compactTrips.slice(0, 5);
  const remainingCount = compactTrips.length > 5 ? compactTrips.length - 5 : 0;

  return (
    <div className={`rounded-xl border bg-white shadow-sm transition-all overflow-hidden flex flex-col ${
      someSelected || allSelected ? 'border-brand/40 ring-1 ring-brand/20' : 'border-slate-200 hover:border-slate-300'
    }`}>
      {/* ── Company header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 px-4 py-3.5 bg-slate-50/70 border-b border-slate-200">
        <div className="flex items-center gap-3 min-w-0">
          {onToggleCompany && (
            <div onClick={(e) => e.stopPropagation()} className="shrink-0 flex items-center">
              <Checkbox
                checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                onCheckedChange={() => onToggleCompany(companyTripIds)}
                className="h-4 w-4 rounded border-slate-300 data-[state=checked]:bg-brand data-[state=checked]:border-brand"
                aria-label={`Select all trips for ${company.customer.name}`}
              />
            </div>
          )}

          <span className="h-9 w-9 shrink-0 rounded-lg bg-brand/10 border border-brand/20 text-brand grid place-items-center text-xs font-bold">
            {initialsOf(company.customer.name)}
          </span>

          <div className="min-w-0 flex-1">
            <h3
              className="text-sm font-bold text-slate-900 truncate leading-tight"
              title={company.customer.name}
            >
              {company.customer.name}
            </h3>
            <p className="mt-0.5 flex items-center gap-1.5 flex-wrap text-[11px] text-slate-500">
              {company.customer.contact_phone && (
                <>
                  <span className="inline-flex items-center gap-1">
                    <Phone className="h-3 w-3 text-slate-400" />
                    {company.customer.contact_phone}
                  </span>
                  {company.total_billed > 0 && <span className="text-slate-300">·</span>}
                </>
              )}
              {company.total_billed > 0 && (
                <span className="font-semibold text-slate-800">{formatMoney(company.total_billed)}</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="rounded-lg bg-[#FAF7FF] text-purple-600 border border-purple-200 font-bold px-2 py-0.5 text-[11px] shadow-2xs whitespace-nowrap">
            {company.total_trips} {company.total_trips === 1 ? 'trip' : 'trips'}
          </span>
        </div>
      </div>

      {/* ── Trips checklist layout ─────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5 max-h-[500px]">
        {trips.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">
            No trips in this month
          </div>
        ) : (
          <>
            {/* 1st Trip: Expanded / Full Card */}
            {firstTrip && (
              <FullTripCard
                trip={firstTrip}
                isSelected={selectedTripIds.includes(firstTrip.id)}
                onToggle={onToggleTrip ? () => onToggleTrip(firstTrip.id) : undefined}
                onOpen={() => setSelectedTrip(firstTrip)}
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
                    onOpen={() => setSelectedTrip(trip)}
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

      <TripDetailDialog
        trip={selectedTrip}
        onClose={() => setSelectedTrip(null)}
        onDelete={onSingleDelete ? (id) => { setSelectedTrip(null); onSingleDelete(id); } : undefined}
      />
    </div>
  );
}

function FullTripCard({
  trip,
  isSelected = false,
  onToggle,
  onOpen,
}: {
  trip: MonthlyBoardTrip;
  isSelected?: boolean;
  onToggle?: () => void;
  onOpen: () => void;
}) {
  const driverName = trip.driver?.name ?? 'Not assigned';
  const plateNumber = trip.vehicle?.plate_number ?? 'Not assigned';

  return (
    <div
      onClick={onOpen}
      className={`group relative bg-white dark:bg-slate-900 border rounded-xl shadow-2xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer p-3.5 flex flex-col gap-3 select-none ${
        isSelected 
          ? 'border-brand/40 ring-1 ring-brand/20 bg-orange-50/10' 
          : 'border-slate-200/90 dark:border-slate-800'
      }`}
    >
      {/* Row 1: Date/Time (left) + Status (right) */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {onToggle && (
            <div onClick={(e) => e.stopPropagation()} className="shrink-0 flex items-center">
              <Checkbox
                checked={isSelected}
                onCheckedChange={onToggle}
                className="h-4 w-4 rounded border-slate-300 data-[state=checked]:bg-brand data-[state=checked]:border-brand"
              />
            </div>
          )}
          <span className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-slate-100">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            {formatDayHeading(trip.date)}
            <span className="ml-1 text-[11px] font-semibold text-slate-400">{formatTime(trip.planned_start)}</span>
          </span>
        </div>

        <StatusBadge status={trip.status} />
      </div>

      {/* Row 2: Trip ID (purple bold) + Amount */}
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs font-black text-purple-600 dark:text-purple-400 group-hover:text-brand transition-colors tracking-tight">
          {trip.ref_id || 'Trip'}
        </span>
        <span className="text-xs font-black text-slate-900 dark:text-slate-100">
          {trip.billing_amount != null ? formatMoney(trip.billing_amount, trip.currency) : '—'}
        </span>
      </div>

      {/* Row 3: Route */}
      <div className="bg-slate-50/90 dark:bg-slate-800/50 rounded-lg px-2.5 py-1.5 border border-slate-200/70 dark:border-slate-700/50 overflow-hidden min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">
            {trip.origin ?? '—'} → {trip.destination ?? '—'}
          </span>
          <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
        </div>
      </div>

      {/* Row 4: Driver Name + Vehicle Plate */}
      <div className="flex items-center justify-between gap-2 text-[11px] overflow-hidden">
        <div className="flex-1 min-w-0 overflow-hidden flex items-center gap-1">
          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <div className="overflow-hidden whitespace-nowrap flex-1">
            <span
              className={cn(
                'font-semibold block',
                trip.driver ? 'text-slate-600 dark:text-slate-400' : 'text-amber-700 font-bold',
                driverName.length > 13 ? 'animate-marquee-slow' : 'truncate'
              )}
              title={driverName}
            >
              {driverName}
            </span>
          </div>
        </div>
        <span className={`font-semibold shrink-0 flex items-center gap-1 ${trip.vehicle ? 'text-slate-600 dark:text-slate-400' : 'text-amber-700 font-bold'}`}>
          <Truck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          {plateNumber}
        </span>
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
  onOpen: () => void;
}) {
  const driverName = trip.driver?.name ?? 'Not assigned';

  return (
    <div
      onClick={onOpen}
      className={`group relative bg-white dark:bg-slate-900 border rounded-xl shadow-3xs hover:shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer p-2.5 flex flex-col gap-1.5 select-none ${
        isSelected 
          ? 'border-brand/40 ring-1 ring-brand/20 bg-orange-50/10' 
          : 'border-slate-200/90 dark:border-slate-800'
      }`}
    >
      {/* Top line: Checkbox + Calendar Icon + Date Time */}
      <div className="flex items-center gap-2">
        {onToggle && (
          <div onClick={(e) => e.stopPropagation()} className="shrink-0 flex items-center">
            <Checkbox
              checked={isSelected}
              onCheckedChange={onToggle}
              className="h-3.5 w-3.5 rounded border-slate-300 data-[state=checked]:bg-brand data-[state=checked]:border-brand"
            />
          </div>
        )}
        <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">
          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          {formatDayHeading(trip.date)}
          <span className="ml-1 text-[9px] font-medium text-slate-400">{formatTime(trip.planned_start)}</span>
        </span>
      </div>

      {/* Bottom line: Route  Driver Name  Status Badge  Chevron */}
      <div className="flex items-center justify-between gap-2 min-w-0 w-full">
        <div className="flex items-center gap-1.5 min-w-0 flex-1 flex-wrap">
          <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 truncate">
            {trip.origin ?? '—'} → {trip.destination ?? '—'}
          </span>
          <span className="text-slate-300 text-[10px] select-none">·</span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold truncate max-w-[140px]" title={driverName}>
            {driverName}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <StatusBadge status={trip.status} />
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors shrink-0" />
        </div>
      </div>
    </div>
  );
}

function TripRow({
  trip,
  isSelected = false,
  onToggle,
  onOpen,
}: {
  trip: MonthlyBoardTrip;
  isSelected?: boolean;
  onToggle?: () => void;
  onOpen: () => void;
}) {
  const gap = isUnassigned(trip);
  return (
    <TableRow
      onClick={onOpen}
      className={`cursor-pointer transition-colors ${
        isSelected
          ? 'bg-orange-50/70 hover:bg-orange-50 border-b border-orange-200'
          : gap
          ? 'bg-amber-50/40 hover:bg-amber-50/80 border-b border-amber-100/60'
          : 'hover:bg-slate-50/80 border-b border-slate-100'
      }`}
    >
      {onToggle && (
        <TableCell className="w-9 px-3.5 py-2.5" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggle}
            className="h-4 w-4 rounded border-slate-300 data-[state=checked]:bg-brand data-[state=checked]:border-brand"
          />
        </TableCell>
      )}
      <TableCell className="px-4 py-2.5 whitespace-nowrap">
        <span className="text-xs font-bold text-slate-900">{formatDayHeading(trip.date)}</span>
        <span className="ml-1.5 text-[11px] font-medium text-slate-400">{formatTime(trip.planned_start)}</span>
      </TableCell>
      <TableCell className="px-3 py-2.5 max-w-[150px]">
        <span
          className={`block text-xs font-semibold truncate ${trip.driver ? 'text-slate-900' : 'text-amber-700 font-bold'}`}
          title={trip.driver?.name}
        >
          {trip.driver?.name ?? 'Not assigned'}
        </span>
      </TableCell>
      <TableCell className="px-3 py-2.5 whitespace-nowrap">
        {trip.vehicle ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-900">
            <Truck className="h-3.5 w-3.5 text-slate-400" />
            {trip.vehicle.plate_number}
          </span>
        ) : (
          <span className="text-xs font-bold text-amber-700">Not assigned</span>
        )}
      </TableCell>
      <TableCell className="px-4 py-2.5 text-right">
        <StatusBadge status={trip.status} />
      </TableCell>
    </TableRow>
  );
}

/** Full detail for one trip, without leaving the monthly board. */
function TripDetailDialog({
  trip,
  onClose,
  onDelete,
}: {
  trip: MonthlyBoardTrip | null;
  onClose: () => void;
  onDelete?: (id: string) => void;
}) {
  const navigate = useNavigate();

  return (
    <Dialog open={!!trip} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md rounded-xl border border-slate-200 shadow-lg">
        {trip && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2 flex-wrap pr-6">
                <DialogTitle className="text-base font-bold text-slate-900">{trip.ref_id ?? 'Trip'}</DialogTitle>
                <StatusBadge status={trip.status} />
              </div>
            </DialogHeader>

            <div className="flex flex-col gap-3">
              {/* Scheduling leads: it's the reason a trip is on this board. */}
              <div className="rounded-lg bg-slate-50 border border-slate-200 px-3.5 py-3">
                <p className={FIELD_LABEL}>Scheduled</p>
                <p className="mt-1 text-sm font-bold text-slate-900">
                  {formatDayHeading(trip.date)}
                  <span className="ml-1.5 font-semibold text-slate-500">{formatTime(trip.planned_start)}</span>
                </p>
                {trip.date_is_inferred && (
                  <p className="mt-1.5 text-[11px] text-amber-700 flex items-start gap-1 font-medium">
                    <AlertTriangle className="h-3 w-3 shrink-0 mt-px" />
                    No planned start recorded — shown on the day the trip was created.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
                <Detail
                  label="Driver"
                  value={trip.driver?.name}
                  sub={trip.driver?.phone_primary}
                  placeholder="Not assigned"
                />
                <Detail
                  label="Vehicle"
                  value={trip.vehicle?.plate_number}
                  sub={trip.vehicle?.asset_type}
                  placeholder="Not assigned"
                />
              </div>

              {(trip.origin || trip.destination) && (
                <div className="border-t border-slate-200 pt-3">
                  <p className={FIELD_LABEL}>Route</p>
                  <div className="mt-1 text-sm font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                    <span>{trip.origin ?? '—'}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    {(() => {
                      if (!trip.destination) return <span>—</span>;
                      const clean = trip.destination.replace(/🔁\s*/g, '').trim();
                      const match = clean.match(/^(.*?)\s*\[RETURN:\s*(.*?)\]$/i);
                      if (match) {
                        const outbound = match[1].trim();
                        const returnLeg = match[2].trim();
                        return (
                          <span className="inline-flex items-center gap-1.5 flex-wrap">
                            <span>{outbound}</span>
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                              <RotateCcw className="h-3 w-3 text-indigo-600 shrink-0" />
                              <span>Return: {returnLeg}</span>
                            </span>
                          </span>
                        );
                      }
                      return <span>{clean}</span>;
                    })()}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 border-t border-slate-200 pt-3">
                <Detail
                  label="Amount"
                  value={trip.billing_amount != null ? formatMoney(trip.billing_amount, trip.currency) : undefined}
                />
                <Detail
                  label="Category"
                  value={[trip.rate_category, trip.vehicle_type].filter(Boolean).join(' · ') || undefined}
                />
              </div>

              <div className="flex items-center gap-2 mt-1">
                {onDelete && (
                  <Button
                    variant="outline"
                    className="h-10 rounded-lg text-xs font-bold border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 px-3"
                    onClick={() => onDelete(trip.id)}
                    title="Delete Trip"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  className="flex-1 h-10 rounded-lg text-xs font-bold bg-brand hover:bg-[#d13d0d] shadow-none"
                  onClick={() => navigate(`/trips/${trip.id}`)}
                >
                  Open full trip
                  <ArrowUpRight className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** A labelled value in the detail dialog. Missing reads as a warning, not a blank. */
function Detail({
  label, value, sub, placeholder = '—',
}: {
  label: string;
  value?: string | null;
  sub?: string | null;
  placeholder?: string;
}) {
  const missing = !value;
  return (
    <div className="min-w-0">
      <p className={FIELD_LABEL}>{label}</p>
      <p
        className={`mt-1 text-sm font-bold truncate ${
          missing && placeholder !== '—' ? 'text-amber-700' : missing ? 'text-slate-400' : 'text-slate-900'
        }`}
        title={value ?? undefined}
      >
        {value ?? placeholder}
      </p>
      {sub && <p className="mt-0.5 text-[11px] text-slate-500 truncate">{sub}</p>}
    </div>
  );
}