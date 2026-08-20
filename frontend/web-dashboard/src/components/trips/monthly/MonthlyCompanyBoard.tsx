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
  const unassignedCount = useMemo(() => trips.filter((t) => isUnassigned(t)).length, [trips]);

  const allSelected =
    companyTripIds.length > 0 && companyTripIds.every((id) => selectedTripIds.includes(id));
  const someSelected =
    !allSelected && companyTripIds.some((id) => selectedTripIds.includes(id));

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
                className="h-4 w-4 rounded border-slate-300 data-[state=checked]:bg-brand data-[state=checked]:border-brand shrink-0"
                aria-label={`Select all trips for ${company.customer.name}`}
              />
            )}
            <span className="h-8 w-8 shrink-0 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 grid place-items-center text-xs font-bold">
              {initialsOf(company.customer.name)}
            </span>
            <div className="min-w-0">
              <h3 className="text-xs font-bold text-slate-900 truncate leading-tight" title={company.customer.name}>
                {company.customer.name}
              </h3>
              <p className="text-[10px] text-slate-500 truncate mt-0.5">
                {company.total_billed > 0 ? formatMoney(company.total_billed) : 'Monthly Account'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200">
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
          trips.map((trip) => (
            <CompanyBoardTripCard
              key={trip.id}
              trip={trip}
              isSelected={selectedTripIds.includes(trip.id)}
              onToggle={onToggleTrip ? () => onToggleTrip(trip.id) : undefined}
              onOpen={onSelectTrip ? () => onSelectTrip(trip) : undefined}
            />
          ))
        )}
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
          ? 'border-brand ring-1 ring-brand/30 bg-orange-50/20'
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
                className="h-4 w-4 rounded border-slate-300 data-[state=checked]:bg-brand data-[state=checked]:border-brand"
              />
            </div>
          )}
          <span className="text-[11px] font-bold text-slate-800 truncate">
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
          <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
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
