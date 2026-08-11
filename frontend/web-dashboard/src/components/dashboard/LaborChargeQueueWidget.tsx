import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import DataTable, { Column } from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import Btn from '@/components/ui/Btn';
import { DollarSign } from 'lucide-react';
import type { Trip } from '@/services/tripService';

interface LaborChargeQueueWidgetProps {
  trips: Trip[];
  isLoading: boolean;
  onSettle: (trip: Trip) => void;
}

export default function LaborChargeQueueWidget({ trips, isLoading, onSettle }: LaborChargeQueueWidgetProps) {
  const columns: Column<Trip>[] = [
    {
      header: 'Ref ID',
      accessor: (t) => <span className="font-mono font-bold text-slate-800 dark:text-slate-200">#{t.ref_id}</span>,
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
      header: 'Completed',
      accessor: (t) => (t.actual_end ? new Date(t.actual_end).toLocaleDateString() : '—'),
    },
    {
      header: 'Status',
      accessor: (t) => <StatusBadge status={t.status} />,
    },
    {
      header: '',
      accessor: (t) => (
        <div className="flex justify-end">
          <Btn
            label="Enter Labor Charges"
            variant="warning"
            size="sm"
            icon={<DollarSign size={13} />}
            onClick={() => onSettle(t)}
          />
        </div>
      ),
      className: 'text-right',
    },
  ];

  return (
    <Card className="border-slate-200/60 shadow-sm rounded-xl bg-white dark:bg-slate-900">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-amber-500" />
            <span>Post-Trip Settlement Queue</span>
          </CardTitle>
          <CardDescription className="text-[10px] text-slate-400 mt-0.5">
            Completed trips awaiting labor charge entry
          </CardDescription>
        </div>
        <span className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-[10px] font-black px-2.5 py-0.5 rounded-full">
          {trips.length} Pending
        </span>
      </CardHeader>
      <CardContent className="p-0">
        <DataTable
          columns={columns}
          data={trips}
          isLoading={isLoading}
          enableSelection={false}
          emptyTitle="All Trips Settled"
          emptyMessage="Every completed trip has its waiting/labor charges recorded."
          className="rounded-none border-0 shadow-none"
        />
      </CardContent>
    </Card>
  );
}
