import { useNavigate } from 'react-router-dom';
import { Truck, AlertTriangle, ArrowRight, Phone } from 'lucide-react';

import StatusBadge from '@/components/ui/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import type { MonthlyBoardCompany, MonthlyBoardTrip } from '@/services/tripService';
import {
  companyHue, formatDayHeading, formatMoney, formatTime, initialsOf, isUnassigned,
} from './monthlyBoardUtils';

interface MonthlyCompanyCardProps {
  company: MonthlyBoardCompany;
}

/**
 * One company's month as one table: every trip, its date, its driver, its
 * truck. This is the whole page's point — a monthly commitment is sold as
 * "N trips this month" and covered day by day, so the flat list of who is
 * covering what is the answer, not a calendar or a drill-down.
 */
export default function MonthlyCompanyCard({ company }: MonthlyCompanyCardProps) {
  const navigate = useNavigate();
  const hue = companyHue(company.customer.name);

  // Backend already sorts trips by planned_start/createdAt within each day
  // and returns days in date order — flattening preserves that order.
  const trips = company.days.flatMap((day) => day.trips);

  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white shadow-sm overflow-hidden">
      {/* ── Company header ─────────────────────────────────────────── */}
      <div className="flex items-center gap-4 p-5">
        <span className={`w-1 self-stretch rounded-full ${hue.rail} shrink-0`} aria-hidden="true" />

        <span className={`h-11 w-11 shrink-0 rounded-xl ${hue.chip} grid place-items-center text-sm font-bold`}>
          {initialsOf(company.customer.name)}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 flex-wrap">
            <span className="text-[15px] font-bold text-[#111111] truncate">{company.customer.name}</span>
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
          <span className="mt-1 flex items-center gap-3 flex-wrap text-xs text-[#6E6E80]">
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
      <div className="border-t border-black/[0.06] max-h-[420px] overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Route</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trips.map((trip) => (
              <TripRow key={trip.id} trip={trip} onOpen={() => navigate(`/trips/${trip.id}`)} />
            ))}
          </TableBody>
        </Table>
      </div>
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
      <TableCell className="px-5 py-3 whitespace-nowrap">
        <span className="text-xs font-bold text-[#111111]">{formatDayHeading(trip.date)}</span>
        <span className="block text-[11px] text-[#9898A4]">{formatTime(trip.planned_start)}</span>
      </TableCell>
      <TableCell className="px-5 py-3">
        {trip.driver ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-6 w-6 rounded-md bg-black/[0.04] grid place-items-center text-[9px] font-bold text-[#6E6E80] shrink-0">
              {initialsOf(trip.driver.name)}
            </span>
            <span className="text-xs font-semibold text-[#111111]">{trip.driver.name}</span>
          </span>
        ) : (
          <span className="text-xs font-semibold text-amber-700">Not assigned</span>
        )}
      </TableCell>
      <TableCell className="px-5 py-3">
        {trip.vehicle ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#111111]">
            <Truck className="h-3.5 w-3.5 text-[#9898A4]" />
            {trip.vehicle.plate_number}
          </span>
        ) : (
          <span className="text-xs font-semibold text-amber-700">Not assigned</span>
        )}
      </TableCell>
      <TableCell className="px-5 py-3">
        {(trip.origin || trip.destination) ? (
          <span className="inline-flex items-center gap-1 text-xs text-[#6E6E80] whitespace-nowrap">
            {trip.origin ?? '—'}
            <ArrowRight className="h-3 w-3 text-[#9898A4] shrink-0" />
            {trip.destination ?? '—'}
          </span>
        ) : (
          <span className="text-xs text-[#9898A4]">—</span>
        )}
      </TableCell>
      <TableCell className="px-5 py-3">
        {(trip.rate_category || trip.vehicle_type) ? (
          <span className="rounded-md bg-black/[0.04] px-1.5 py-0.5 text-[10px] font-semibold text-[#6E6E80] whitespace-nowrap">
            {[trip.rate_category, trip.vehicle_type].filter(Boolean).join(' · ')}
          </span>
        ) : (
          <span className="text-xs text-[#9898A4]">—</span>
        )}
      </TableCell>
      <TableCell className="px-5 py-3 whitespace-nowrap">
        <span className="text-xs font-bold text-[#111111]">
          {trip.billing_amount != null ? formatMoney(trip.billing_amount, trip.currency) : '—'}
        </span>
      </TableCell>
      <TableCell className="px-5 py-3">
        <StatusBadge status={trip.status} />
      </TableCell>
    </TableRow>
  );
}
