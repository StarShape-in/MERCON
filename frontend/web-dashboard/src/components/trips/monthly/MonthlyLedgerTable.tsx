import { useMemo } from 'react';
import { Truck, User, ArrowRight, Eye, Trash2 } from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import type { MonthlyBoardCompany, MonthlyBoardTrip } from '@/services/tripService';
import { formatDayHeading, formatMoney, formatTime, isUnassigned } from './monthlyBoardUtils';

interface MonthlyLedgerTableProps {
  companies: MonthlyBoardCompany[];
  selectedTripIds?: string[];
  onToggleTrip?: (id: string) => void;
  onSelectAllVisible?: () => void;
  onSelectTrip?: (trip: MonthlyBoardTrip) => void;
  onSingleDelete?: (tripId: string) => void;
}

export default function MonthlyLedgerTable({
  companies,
  selectedTripIds = [],
  onToggleTrip,
  onSelectAllVisible,
  onSelectTrip,
  onSingleDelete,
}: MonthlyLedgerTableProps) {
  // Flatten all trips with company info
  const allTripsWithCompany = useMemo(() => {
    return companies.flatMap((company) =>
      company.days.flatMap((day) =>
        day.trips.map((trip) => ({
          trip,
          companyName: company.customer.name,
        }))
      )
    );
  }, [companies]);

  const allTripIds = useMemo(() => allTripsWithCompany.map((t) => t.trip.id), [allTripsWithCompany]);
  const allSelected = allTripIds.length > 0 && allTripIds.every((id) => selectedTripIds.includes(id));
  const someSelected = !allSelected && allTripIds.some((id) => selectedTripIds.includes(id));

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Ledger Header Bar */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50/80 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-900">🥞 Monthly Trip Ledger</span>
        </div>
        <span className="text-xs font-semibold text-slate-500">
          {allTripsWithCompany.length} {allTripsWithCompany.length === 1 ? 'record' : 'records'}
        </span>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-100/70 hover:bg-slate-100/70 border-b border-slate-200">
              {onSelectAllVisible && (
                <TableHead className="w-10 px-4">
                  <Checkbox
                    checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                    onCheckedChange={onSelectAllVisible}
                    className="h-4 w-4 rounded border-slate-300 data-[state=checked]:bg-brand data-[state=checked]:border-brand"
                  />
                </TableHead>
              )}
              <TableHead className="h-9 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Ref ID</TableHead>
              <TableHead className="h-9 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Company</TableHead>
              <TableHead className="h-9 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Date & Time</TableHead>
              <TableHead className="h-9 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Route</TableHead>
              <TableHead className="h-9 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Driver</TableHead>
              <TableHead className="h-9 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Vehicle</TableHead>
              <TableHead className="h-9 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-right">Amount</TableHead>
              <TableHead className="h-9 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-slate-100">
            {allTripsWithCompany.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-32 text-center text-xs text-slate-400 font-medium">
                  No trips match the current filter criteria.
                </TableCell>
              </TableRow>
            ) : (
              allTripsWithCompany.map(({ trip, companyName }) => {
                const isSelected = selectedTripIds.includes(trip.id);
                const gap = isUnassigned(trip);
                return (
                  <TableRow
                    key={trip.id}
                    onClick={() => onSelectTrip?.(trip)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-orange-50/70 hover:bg-orange-50 border-b border-orange-200'
                        : gap
                        ? 'bg-amber-50/40 hover:bg-amber-50/80'
                        : 'hover:bg-slate-50/80'
                    }`}
                  >
                    {onToggleTrip && (
                      <TableCell className="w-10 px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => onToggleTrip(trip.id)}
                          className="h-4 w-4 rounded border-slate-300 data-[state=checked]:bg-brand data-[state=checked]:border-brand"
                        />
                      </TableCell>
                    )}
                    <TableCell className="px-4 py-3 whitespace-nowrap text-xs font-mono font-bold text-slate-800">
                      {trip.ref_id || '—'}
                    </TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap text-xs font-bold text-slate-900">
                      {companyName}
                    </TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap text-xs font-semibold text-slate-700">
                      {formatDayHeading(trip.date)}
                      <span className="ml-1 text-[11px] font-medium text-slate-400">{formatTime(trip.planned_start)}</span>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-xs font-semibold text-slate-800">
                      {trip.origin || trip.destination ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{trip.origin || '—'}</span>
                          <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />
                          <span>{(trip.destination || '—').replace(/🔁\s*/g, '').trim()}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-xs font-semibold ${trip.driver ? 'text-slate-900' : 'text-amber-700 font-bold'}`}>
                        {trip.driver?.name ?? 'Not assigned'}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap">
                      {trip.vehicle ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-900 font-mono">
                          <Truck className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          {trip.vehicle.plate_number}
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-amber-700">Not assigned</span>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap text-xs font-extrabold text-slate-900 text-right">
                      {trip.billing_amount != null ? formatMoney(trip.billing_amount, trip.currency) : '—'}
                    </TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap text-right">
                      <StatusBadge status={trip.status} />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
