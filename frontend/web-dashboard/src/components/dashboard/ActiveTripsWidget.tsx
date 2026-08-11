import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import DataTable, { Column } from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import { Navigation } from 'lucide-react';
import type { Trip } from '@/services/tripService';

interface ActiveTripsWidgetProps {
  trips: Trip[];
  total: number;
  isLoading: boolean;
}

function routeLabel(trip: Trip): string {
  if (trip.rateCard?.route_origin && trip.rateCard?.route_destination) {
    return `${trip.rateCard.route_origin} → ${trip.rateCard.route_destination}`;
  }
  const stops = trip.stops || [];
  const origin = stops[0]?.location_name || stops[0]?.location?.name;
  const destination = stops[stops.length - 1]?.location_name || stops[stops.length - 1]?.location?.name;
  if (origin && destination) return `${origin} → ${destination}`;
  return '—';
}

export default function ActiveTripsWidget({ trips, total, isLoading }: ActiveTripsWidgetProps) {
  const navigate = useNavigate();

  const columns: Column<Trip>[] = [
    {
      header: 'Ref ID',
      accessor: (t) => <span className="font-mono font-bold text-slate-800 dark:text-slate-200">#{t.ref_id}</span>,
    },
    {
      header: 'Status',
      accessor: (t) => <StatusBadge status={t.status} />,
    },
    {
      header: 'Customer',
      accessor: (t) => t.customer?.name || '—',
    },
    {
      header: 'Driver',
      accessor: (t) => (t.driver ? `${t.driver.first_name} ${t.driver.last_name}` : '—'),
    },
    {
      header: 'Vehicle',
      accessor: (t) => t.vehicle?.plate_number || '—',
    },
    {
      header: 'Route',
      accessor: (t) => routeLabel(t),
    },
    {
      header: 'Planned Start',
      accessor: (t) => (t.planned_start ? new Date(t.planned_start).toLocaleString() : '—'),
    },
  ];

  return (
    <Card className="border-slate-200/60 shadow-sm rounded-xl bg-white dark:bg-slate-900">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <Navigation className="w-4 h-4 text-blue-500" />
            <span>Active Trips</span>
          </CardTitle>
          <CardDescription className="text-[10px] text-slate-400 mt-0.5">
            Dispatched, at pickup, in transit or at delivery — right now
          </CardDescription>
        </div>
        <span className="bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 text-[10px] font-black px-2.5 py-0.5 rounded-full">
          {total} In-Flight
        </span>
      </CardHeader>
      <CardContent className="p-0">
        <DataTable
          columns={columns}
          data={trips}
          isLoading={isLoading}
          enableSelection={false}
          onRowClick={(t) => navigate(`/trips/${t.id}`)}
          emptyTitle="No Active Trips"
          emptyMessage="No trips are currently dispatched, at pickup, in transit or at delivery."
          className="rounded-none border-0 shadow-none"
        />
      </CardContent>
    </Card>
  );
}
