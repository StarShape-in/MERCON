import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, AlertTriangle, ArrowRight, Phone, ArrowUpRight } from 'lucide-react';

import StatusBadge from '@/components/ui/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
 * One company's month as a vertical stack of trip cards: date, driver,
 * vehicle, route — each field labeled and compact rather than a wide table
 * that forces a horizontal scroll or an unreadably long row. Clicking a trip
 * opens a detail dialog rather than leaving the page, so scanning a month
 * doesn't mean losing your place in it.
 */
export default function MonthlyCompanyCard({ company }: MonthlyCompanyCardProps) {
  const [selectedTrip, setSelectedTrip] = useState<MonthlyBoardTrip | null>(null);

  // Backend already sorts trips by planned_start/createdAt within each day
  // and returns days in date order — flattening preserves that order.
  const trips = company.days.flatMap((day) => day.trips);

  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white shadow-sm overflow-hidden">
      {/* ── Company header ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3 p-5 border-b border-black/[0.06]">
        <span className="h-11 w-11 shrink-0 rounded-xl bg-[#E8450F]/10 text-[#E8450F] grid place-items-center text-sm font-bold">
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

      {/* ── Trips, stacked vertically ─────────────────────────────── */}
      <div className="p-4 flex flex-col gap-2.5 max-h-[520px] overflow-y-auto">
        {trips.map((trip) => (
          <TripCard key={trip.id} trip={trip} onOpen={() => setSelectedTrip(trip)} />
        ))}
      </div>

      <TripDetailDialog trip={selectedTrip} onClose={() => setSelectedTrip(null)} />
    </div>
  );
}

/** One trip, stacked top to bottom: when, status, who, what, where, worth. */
function TripCard({ trip, onOpen }: { trip: MonthlyBoardTrip; onOpen: () => void }) {
  const gap = isUnassigned(trip);
  const route = trip.origin && trip.destination ? `${trip.origin} → ${trip.destination}` : null;
  const category = [trip.rate_category, trip.vehicle_type].filter(Boolean).join(' · ') || null;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`w-full text-left rounded-xl border p-3.5 transition-colors flex flex-col gap-3 ${
        gap ? 'border-amber-200 bg-amber-50/40 hover:bg-amber-50' : 'border-black/[0.06] bg-white hover:bg-[#FAFAFA]'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-[#111111]">
          {formatDayHeading(trip.date)}
          <span className="ml-1.5 font-semibold text-[#9898A4]">{formatTime(trip.planned_start)}</span>
        </span>
        <StatusBadge status={trip.status} />
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
        <Field
          label="Driver"
          value={trip.driver?.name}
          placeholder="Not assigned"
          warn={!trip.driver}
        />
        <Field
          label="Vehicle"
          value={trip.vehicle?.plate_number}
          placeholder="Not assigned"
          warn={!trip.vehicle}
          icon={Truck}
        />
        {route && <Field label="Route" value={route} className="col-span-2" />}
        <Field label="Amount" value={trip.billing_amount != null ? formatMoney(trip.billing_amount, trip.currency) : undefined} />
        {category && <Field label="Category" value={category} />}
      </div>
    </button>
  );
}

function Field({
  label, value, placeholder = '—', warn, icon: Icon, className,
}: {
  label: string;
  value?: string | null;
  placeholder?: string;
  warn?: boolean;
  icon?: React.ElementType;
  className?: string;
}) {
  return (
    <div className={`min-w-0 ${className ?? ''}`}>
      <p className={FIELD_LABEL}>{label}</p>
      <p
        className={`mt-0.5 text-[13px] font-bold truncate flex items-center gap-1 ${
          warn ? 'text-amber-700' : 'text-[#111111]'
        }`}
        title={value ?? undefined}
      >
        {Icon && value && <Icon className="h-3 w-3 text-[#9898A4] shrink-0" />}
        {value ?? placeholder}
      </p>
    </div>
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
