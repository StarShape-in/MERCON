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
 * Companies stack vertically down the page, one card each. Inside a card,
 * that company's trips are one tight table — date, driver, vehicle, route,
 * category, amount, status — not a spaced-out stack of sub-cards, which was
 * the previous pass and produced far more scrolling than the data needed.
 * Clicking a row opens a detail dialog on the board rather than navigating
 * away.
 */
export default function MonthlyCompanyCard({ company }: MonthlyCompanyCardProps) {
  const [selectedTrip, setSelectedTrip] = useState<MonthlyBoardTrip | null>(null);

  // Backend already sorts trips by planned_start/createdAt within each day
  // and returns days in date order — flattening preserves that order.
  const trips = company.days.flatMap((day) => day.trips);

  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white shadow-sm overflow-hidden">
      {/* ── Company header ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-black/[0.06]">
        <span className="h-10 w-10 shrink-0 rounded-xl bg-[#E8450F]/10 text-[#E8450F] grid place-items-center text-sm font-bold">
          {initialsOf(company.customer.name)}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 flex-wrap">
            <span className="text-[15px] font-bold text-[#111111] truncate max-w-[280px]" title={company.customer.name}>
              {company.customer.name}
            </span>
            <span className="rounded-md bg-black/[0.04] px-1.5 py-0.5 text-[11px] font-bold text-[#6E6E80]">
              {company.total_trips} {company.total_trips === 1 ? 'trip' : 'trips'}
            </span>
            {company.unassigned_trips > 0 && (
              <Badge className="bg-amber-50 text-amber-700 border-amber-200/80 gap-1 text-[10px] font-bold">
                <AlertTriangle className="h-3 w-3" />
                {company.unassigned_trips} to assign
              </Badge>
            )}
          </span>
          <span className="mt-0.5 flex items-center gap-3 flex-wrap text-xs text-[#6E6E80]">
            {company.customer.contact_phone && (
              <span className="inline-flex items-center gap-1">
                <Phone className="h-3 w-3 text-[#9898A4]" />
                {company.customer.contact_phone}
              </span>
            )}
            {company.total_billed > 0 && (
              <span>Total this month: <b className="text-[#111111]">{formatMoney(company.total_billed)}</b></span>
            )}
          </span>
        </span>
      </div>

      {/* ── Trip table ─────────────────────────────────────────────── */}
      <div className="max-h-[420px] overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="h-9 px-5">Date</TableHead>
              <TableHead className="h-9 px-4">Driver</TableHead>
              <TableHead className="h-9 px-4">Vehicle</TableHead>
              <TableHead className="h-9 px-4">Route</TableHead>
              <TableHead className="h-9 px-4">Category</TableHead>
              <TableHead className="h-9 px-4">Amount</TableHead>
              <TableHead className="h-9 px-4">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
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
      className={`cursor-pointer ${gap ? 'bg-amber-50/50 hover:bg-amber-50' : ''}`}
    >
      <TableCell className="px-5 py-2.5 whitespace-nowrap">
        <span className="text-xs font-bold text-[#111111]">{formatDayHeading(trip.date)}</span>
        <span className="ml-1.5 text-[11px] text-[#9898A4]">{formatTime(trip.planned_start)}</span>
      </TableCell>
      <TableCell className="px-4 py-2.5 max-w-[140px]">
        <span
          className={`block text-xs font-semibold truncate ${trip.driver ? 'text-[#111111]' : 'text-amber-700'}`}
          title={trip.driver?.name}
        >
          {trip.driver?.name ?? 'Not assigned'}
        </span>
      </TableCell>
      <TableCell className="px-4 py-2.5 whitespace-nowrap">
        {trip.vehicle ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#111111]">
            <Truck className="h-3.5 w-3.5 text-[#9898A4]" />
            {trip.vehicle.plate_number}
          </span>
        ) : (
          <span className="text-xs font-semibold text-amber-700">Not assigned</span>
        )}
      </TableCell>
      <TableCell className="px-4 py-2.5 max-w-[180px]">
        {(trip.origin || trip.destination) ? (
          <span
            className="block text-xs text-[#6E6E80] truncate"
            title={`${trip.origin ?? '—'} → ${trip.destination ?? '—'}`}
          >
            {trip.origin ?? '—'} → {trip.destination ?? '—'}
          </span>
        ) : (
          <span className="text-xs text-[#9898A4]">—</span>
        )}
      </TableCell>
      <TableCell className="px-4 py-2.5 max-w-[140px]">
        {(trip.rate_category || trip.vehicle_type) ? (
          <span
            className="inline-block rounded-md bg-black/[0.04] px-1.5 py-0.5 text-[10px] font-semibold text-[#6E6E80] truncate max-w-full"
            title={[trip.rate_category, trip.vehicle_type].filter(Boolean).join(' · ')}
          >
            {[trip.rate_category, trip.vehicle_type].filter(Boolean).join(' · ')}
          </span>
        ) : (
          <span className="text-xs text-[#9898A4]">—</span>
        )}
      </TableCell>
      <TableCell className="px-4 py-2.5 whitespace-nowrap">
        <span className="text-xs font-bold text-[#111111]">
          {trip.billing_amount != null ? formatMoney(trip.billing_amount, trip.currency) : '—'}
        </span>
      </TableCell>
      <TableCell className="px-4 py-2.5">
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
      <DialogContent className="sm:max-w-md">
        {trip && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2 flex-wrap pr-6">
                <DialogTitle className="text-base">{trip.ref_id ?? 'Trip'}</DialogTitle>
                <StatusBadge status={trip.status} />
              </div>
            </DialogHeader>

            <div className="flex flex-col gap-4">
              <div>
                <p className={FIELD_LABEL}>Scheduled</p>
                <p className="mt-0.5 text-sm font-bold text-[#111111]">
                  {formatDayHeading(trip.date)} · {formatTime(trip.planned_start)}
                </p>
                {trip.date_is_inferred && (
                  <p className="mt-1 text-xs text-amber-700 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    No planned start recorded — shown on the day the trip was created.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className={FIELD_LABEL}>Driver</p>
                  <p className={`mt-0.5 text-sm font-bold ${trip.driver ? 'text-[#111111]' : 'text-amber-700'}`}>
                    {trip.driver?.name ?? 'Not assigned'}
                  </p>
                  {trip.driver?.phone_primary && (
                    <p className="mt-0.5 text-xs text-[#6E6E80]">{trip.driver.phone_primary}</p>
                  )}
                </div>
                <div>
                  <p className={FIELD_LABEL}>Vehicle</p>
                  <p className={`mt-0.5 text-sm font-bold ${trip.vehicle ? 'text-[#111111]' : 'text-amber-700'}`}>
                    {trip.vehicle?.plate_number ?? 'Not assigned'}
                  </p>
                  {trip.vehicle?.asset_type && (
                    <p className="mt-0.5 text-xs text-[#6E6E80]">{trip.vehicle.asset_type}</p>
                  )}
                </div>
              </div>

              {(trip.origin || trip.destination) && (
                <div>
                  <p className={FIELD_LABEL}>Route</p>
                  <p className="mt-0.5 text-sm font-bold text-[#111111] flex items-center gap-1.5">
                    {trip.origin ?? '—'}
                    <ArrowRight className="h-3.5 w-3.5 text-[#9898A4] shrink-0" />
                    {trip.destination ?? '—'}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className={FIELD_LABEL}>Amount</p>
                  <p className="mt-0.5 text-sm font-bold text-[#111111]">
                    {trip.billing_amount != null ? formatMoney(trip.billing_amount, trip.currency) : '—'}
                  </p>
                </div>
                {(trip.rate_category || trip.vehicle_type) && (
                  <div>
                    <p className={FIELD_LABEL}>Category</p>
                    <p className="mt-0.5 text-sm font-bold text-[#111111]">
                      {[trip.rate_category, trip.vehicle_type].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                )}
              </div>

              <Button
                className="w-full h-10 rounded-xl text-xs font-bold bg-[#E8450F] hover:bg-[#d13d0d] mt-1"
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
