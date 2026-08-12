import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDown, Truck, User, CalendarDays, ListOrdered,
  AlertTriangle, ArrowRight, Phone, Wallet,
} from 'lucide-react';

import StatusBadge from '@/components/ui/StatusBadge';
import { Badge } from '@/components/ui/badge';
import type { MonthlyBoardCompany, MonthlyBoardTrip } from '@/services/tripService';
import {
  companyHue, dayKey, daysInMonth, formatDayHeading, formatMoney, formatTime,
  initialsOf, isToday, isUnassigned, STATUS_DOT,
} from './monthlyBoardUtils';

/** Sunday-first, matching the Saudi working week the fleet runs on. */
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const LABEL = 'text-[10px] font-bold uppercase tracking-wider text-[#9898A4]';

interface MonthlyCompanyCardProps {
  company: MonthlyBoardCompany;
  /** YYYY-MM — the calendar grid is drawn for this month, not for the data. */
  month: string;
  defaultExpanded?: boolean;
}

/**
 * One company's month: how many trips were committed, who is covering them,
 * and on which day. Collapsed it answers "how much work is this company",
 * expanded it answers "which driver and which truck on the 14th".
 */
export default function MonthlyCompanyCard({ company, month, defaultExpanded = false }: MonthlyCompanyCardProps) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [view, setView] = useState<'calendar' | 'schedule'>('calendar');

  const hue = companyHue(company.customer.name);
  const tripsByDay = new Map(company.days.map((d) => [d.date, d.trips]));

  const days = daysInMonth(month);
  // Pad the first week so the 1st lands under its real weekday.
  const leadingBlanks = days.length > 0 ? days[0].getDay() : 0;

  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white shadow-sm overflow-hidden">
      {/* ── Company header ─────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        className="w-full flex items-center gap-4 p-5 text-left hover:bg-[#FAFAFA] transition-colors"
      >
        <span className={`w-1 self-stretch rounded-full ${hue.rail} shrink-0`} aria-hidden="true" />

        <span className={`h-11 w-11 shrink-0 rounded-xl ${hue.chip} grid place-items-center text-sm font-bold`}>
          {initialsOf(company.customer.name)}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 flex-wrap">
            <span className="text-[15px] font-bold text-[#111111] truncate">{company.customer.name}</span>
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
            {company.categories.slice(0, 3).map((category) => (
              <span
                key={category.name}
                className="inline-flex items-center gap-1 rounded-md bg-black/[0.04] px-1.5 py-0.5 text-[11px] font-semibold text-[#6E6E80]"
              >
                {category.name}
                <span className="text-[#9898A4]">×{category.trips}</span>
              </span>
            ))}
          </span>
        </span>

        <span className="hidden md:flex items-center gap-6 shrink-0">
          <Stat label="Trips" value={String(company.total_trips)} icon={CalendarDays} />
          <Stat label="Drivers" value={String(company.drivers.length)} icon={User} />
          <Stat label="Vehicles" value={String(company.vehicles.length)} icon={Truck} />
          <Stat
            label="Value"
            value={company.total_billed > 0 ? formatMoney(company.total_billed) : '—'}
            icon={Wallet}
          />
        </span>

        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[#9898A4] transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Compact stat row for narrow screens, where the header stats are hidden */}
      <div className="md:hidden flex items-center gap-4 px-5 pb-4 -mt-1 text-xs text-[#6E6E80]">
        <span><b className="text-[#111111]">{company.total_trips}</b> trips</span>
        <span><b className="text-[#111111]">{company.drivers.length}</b> drivers</span>
        <span><b className="text-[#111111]">{company.vehicles.length}</b> vehicles</span>
      </div>

      {expanded && (
        <div className="border-t border-black/[0.06]">
          {/* ── View switch + roster ─────────────────────────────────── */}
          <div className="flex items-start justify-between gap-4 flex-wrap p-5 pb-3">
            <div className="min-w-0">
              <p className={LABEL}>Assigned this month</p>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                {company.drivers.length === 0 && company.vehicles.length === 0 && (
                  <span className="text-xs text-[#9898A4]">Nobody assigned yet</span>
                )}
                {company.drivers.map((driver) => (
                  <span
                    key={driver.id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-black/[0.06] bg-white px-2 py-1 text-[11px] font-semibold text-[#111111]"
                  >
                    <span className={`h-5 w-5 rounded-md ${hue.chip} grid place-items-center text-[9px] font-bold`}>
                      {initialsOf(driver.name)}
                    </span>
                    {driver.name}
                    <span className="text-[#9898A4]">×{driver.trips}</span>
                  </span>
                ))}
                {company.vehicles.map((vehicle) => (
                  <span
                    key={vehicle.id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-black/[0.06] bg-black/[0.02] px-2 py-1 text-[11px] font-semibold text-[#111111]"
                  >
                    <Truck className="h-3 w-3 text-[#9898A4]" />
                    {vehicle.plate_number}
                    <span className="text-[#9898A4]">×{vehicle.trips}</span>
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-1 rounded-xl border border-black/[0.06] bg-black/[0.02] p-1 shrink-0">
              <ViewTab active={view === 'calendar'} onClick={() => setView('calendar')} icon={CalendarDays} label="Calendar" />
              <ViewTab active={view === 'schedule'} onClick={() => setView('schedule')} icon={ListOrdered} label="Schedule" />
            </div>
          </div>

          {view === 'calendar' ? (
            <div className="px-5 pb-5">
              <div className="grid grid-cols-7 gap-1.5 mb-1.5">
                {WEEKDAY_LABELS.map((weekday) => (
                  <div key={weekday} className={`${LABEL} text-center py-1`}>{weekday}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: leadingBlanks }, (_, i) => (
                  <div key={`blank-${i}`} className="rounded-xl bg-black/[0.015] min-h-[92px]" />
                ))}
                {days.map((date) => {
                  const key = dayKey(date);
                  const dayTrips = tripsByDay.get(key) ?? [];
                  const today = isToday(date);
                  return (
                    <div
                      key={key}
                      className={`rounded-xl border p-1.5 min-h-[92px] flex flex-col gap-1 transition-colors ${
                        dayTrips.length > 0
                          ? `border-black/[0.06] ${hue.tint}`
                          : 'border-black/[0.04] bg-white'
                      } ${today ? 'ring-2 ring-[#E8450F]/40' : ''}`}
                    >
                      <div className="flex items-center justify-between px-0.5">
                        <span className={`text-[11px] font-bold ${today ? 'text-[#E8450F]' : 'text-[#6E6E80]'}`}>
                          {date.getDate()}
                        </span>
                        {dayTrips.length > 1 && (
                          <span className="text-[9px] font-bold text-[#9898A4]">{dayTrips.length}</span>
                        )}
                      </div>
                      {dayTrips.map((trip) => (
                        <CalendarTripChip key={trip.id} trip={trip} onOpen={() => navigate(`/trips/${trip.id}`)} />
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="px-5 pb-5 flex flex-col gap-4">
              {company.days.map((day) => (
                <div key={day.date}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-[#111111]">{formatDayHeading(day.date)}</span>
                    <span className="text-[11px] text-[#9898A4]">
                      {day.trips.length} {day.trips.length === 1 ? 'trip' : 'trips'}
                    </span>
                    <span className="flex-1 h-px bg-black/[0.06]" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {day.trips.map((trip) => (
                      <ScheduleRow key={trip.id} trip={trip} onOpen={() => navigate(`/trips/${trip.id}`)} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) {
  return (
    <span className="flex flex-col items-end">
      <span className={`${LABEL} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {label}
      </span>
      <span className="text-sm font-bold text-[#111111] mt-0.5">{value}</span>
    </span>
  );
}

function ViewTab({
  active, onClick, icon: Icon, label,
}: { active: boolean; onClick: () => void; icon: React.ElementType; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold transition-colors ${
        active ? 'bg-white text-[#111111] shadow-sm' : 'text-[#6E6E80] hover:text-[#111111]'
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

/** A single trip inside a calendar day cell: who is driving, in what truck. */
function CalendarTripChip({ trip, onOpen }: { trip: MonthlyBoardTrip; onOpen: () => void }) {
  const gap = isUnassigned(trip);
  return (
    <button
      type="button"
      onClick={onOpen}
      title={`${trip.ref_id ?? 'Trip'} · ${trip.driver?.name ?? 'No driver'} · ${trip.vehicle?.plate_number ?? 'No vehicle'}`}
      className={`w-full rounded-lg border px-1.5 py-1 text-left transition-colors hover:bg-white ${
        gap ? 'border-amber-300/70 bg-amber-50/70' : 'border-black/[0.06] bg-white/80'
      }`}
    >
      <span className="flex items-center gap-1">
        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${STATUS_DOT[trip.status] ?? 'bg-slate-400'}`} />
        <span className="text-[10px] font-bold text-[#111111] truncate">
          {trip.driver ? trip.driver.name.split(' ')[0] : 'No driver'}
        </span>
      </span>
      <span className="mt-0.5 flex items-center gap-1 text-[9px] font-semibold text-[#6E6E80] truncate">
        <Truck className="h-2.5 w-2.5 shrink-0 text-[#9898A4]" />
        {trip.vehicle?.plate_number ?? 'No vehicle'}
      </span>
      {trip.vehicle_type && (
        <span className="mt-0.5 block text-[9px] text-[#9898A4] truncate">{trip.vehicle_type}</span>
      )}
    </button>
  );
}

/** The schedule view's row — the same trip with room for the lane and price. */
function ScheduleRow({ trip, onOpen }: { trip: MonthlyBoardTrip; onOpen: () => void }) {
  const gap = isUnassigned(trip);
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`w-full rounded-xl border px-3 py-2.5 text-left transition-colors hover:bg-[#FAFAFA] ${
        gap ? 'border-amber-200 bg-amber-50/40' : 'border-black/[0.06] bg-white'
      }`}
    >
      <div className="flex items-center gap-3 flex-wrap">
        <span className="w-14 shrink-0 text-xs font-bold text-[#111111]">{formatTime(trip.planned_start)}</span>

        <span className="inline-flex items-center gap-1.5 min-w-[150px]">
          <span className="h-6 w-6 rounded-md bg-black/[0.04] grid place-items-center text-[9px] font-bold text-[#6E6E80]">
            {trip.driver ? initialsOf(trip.driver.name) : '—'}
          </span>
          <span className={`text-xs font-semibold ${trip.driver ? 'text-[#111111]' : 'text-amber-700'}`}>
            {trip.driver?.name ?? 'Driver not assigned'}
          </span>
        </span>

        <span className="inline-flex items-center gap-1.5 min-w-[110px]">
          <Truck className="h-3.5 w-3.5 text-[#9898A4]" />
          <span className={`text-xs font-semibold ${trip.vehicle ? 'text-[#111111]' : 'text-amber-700'}`}>
            {trip.vehicle?.plate_number ?? 'No vehicle'}
          </span>
        </span>

        {(trip.origin || trip.destination) && (
          <span className="inline-flex items-center gap-1 text-xs text-[#6E6E80] min-w-[160px]">
            {trip.origin ?? '—'}
            <ArrowRight className="h-3 w-3 text-[#9898A4]" />
            {trip.destination ?? '—'}
          </span>
        )}

        {(trip.rate_category || trip.vehicle_type) && (
          <span className="rounded-md bg-black/[0.04] px-1.5 py-0.5 text-[10px] font-semibold text-[#6E6E80]">
            {[trip.rate_category, trip.vehicle_type].filter(Boolean).join(' · ')}
          </span>
        )}

        <span className="ml-auto flex items-center gap-3">
          <span className="text-xs font-bold text-[#111111]">
            {trip.billing_amount != null ? formatMoney(trip.billing_amount, trip.currency) : '—'}
          </span>
          <StatusBadge status={trip.status} />
          <span className="text-[10px] font-bold text-[#9898A4]">{trip.ref_id ?? ''}</span>
        </span>
      </div>
      {trip.date_is_inferred && (
        <p className="mt-1.5 text-[10px] text-amber-700 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          No planned start — shown on the day it was created
        </p>
      )}
    </button>
  );
}
