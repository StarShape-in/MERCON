import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, AlertTriangle, ArrowRight, Phone, ArrowUpRight } from 'lucide-react';

import StatusBadge from '@/components/ui/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import type { MonthlyBoardCompany, MonthlyBoardTrip } from '@/services/tripService';
import { formatDayHeading, formatMoney, formatTime, initialsOf, isUnassigned } from './monthlyBoardUtils';

const FIELD_LABEL = 'text-[9px] font-bold uppercase tracking-wider text-[#9898A4]';

interface MonthlyCompanyCardProps {
  company: MonthlyBoardCompany;
}

/**
 * One company's month. The card header carries the identity and the two
 * numbers that matter about the month as a whole (how many trips, how many
 * still uncovered); the body is one tight table of the trips themselves.
 * Clicking a row opens a detail dialog on the board rather than navigating
 * away, so scanning a month never costs you your place in it.
 */
export default function MonthlyCompanyCard({ company }: MonthlyCompanyCardProps) {
  const [selectedTrip, setSelectedTrip] = useState<MonthlyBoardTrip | null>(null);

  // Backend already sorts trips by planned_start/createdAt within each day
  // and returns days in date order — flattening preserves that order.
  const trips = company.days.flatMap((day) => day.trips);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm hover:border-slate-300 transition-all overflow-hidden flex flex-col">
      {/* ── Company header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 px-4 py-3.5 bg-slate-50/70 border-b border-slate-200">
        <div className="flex items-center gap-3 min-w-0">
          <span className="h-9 w-9 shrink-0 rounded-lg bg-[#E8450F]/10 border border-[#E8450F]/20 text-[#E8450F] grid place-items-center text-xs font-bold">
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
          {company.unassigned_trips > 0 && (
            <Badge className="bg-amber-50 text-amber-800 border border-amber-300/80 gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md shadow-2xs">
              <AlertTriangle className="h-3 w-3" />
              {company.unassigned_trips}
            </Badge>
          )}
          <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-bold text-slate-700 shadow-2xs whitespace-nowrap">
            {company.total_trips} {company.total_trips === 1 ? 'trip' : 'trips'}
          </span>
        </div>
      </div>

      {/* ── Trip table ─────────────────────────────────────────────── */}
      <div className="max-h-[380px] overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-100/60 hover:bg-slate-100/60 border-b border-slate-200">
              {/* Route, category and amount are one click away in the detail
                  dialog — keeping them out of the row is what makes the row
                  scannable at a glance instead of a wall of columns. */}
              <TableHead className="h-8 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Date</TableHead>
              <TableHead className="h-8 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Driver</TableHead>
              <TableHead className="h-8 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Vehicle</TableHead>
              <TableHead className="h-8 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-slate-100">
            {trips.map((trip) => (
              <TripRow key={trip.id} trip={trip} onOpen={() => setSelectedTrip(trip)} />
            ))}
          </TableBody>
        </Table>
      </div>

      <TripDetailDialog trip={selectedTrip} onClose={() => setSelectedTrip(null)} />
    </div>
  );
}

function TripRow({ trip, onOpen }: { trip: MonthlyBoardTrip; onOpen: () => void }) {
  const gap = isUnassigned(trip);
  return (
    <TableRow
      onClick={onOpen}
      className={`cursor-pointer transition-colors ${
        gap ? 'bg-amber-50/40 hover:bg-amber-50/80 border-b border-amber-100/60' : 'hover:bg-slate-50/80 border-b border-slate-100'
      }`}
    >
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
function TripDetailDialog({ trip, onClose }: { trip: MonthlyBoardTrip | null; onClose: () => void }) {
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
                  <p className="mt-1 text-sm font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                    {trip.origin ?? '—'}
                    <ArrowRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    {trip.destination ?? '—'}
                  </p>
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

              <Button
                className="w-full h-10 rounded-lg text-xs font-bold bg-[#E8450F] hover:bg-[#d13d0d] shadow-none mt-1"
                onClick={() => navigate(`/trips/${trip.id}`)}
              >
                Open full trip
                <ArrowUpRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
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
