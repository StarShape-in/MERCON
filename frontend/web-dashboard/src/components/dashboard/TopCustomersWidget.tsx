import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CreditExposureKpi } from '@/components/ui/CustomKpiWidgets';
import { Users, ChevronRight, Navigation } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Customer } from '@/services/customerService';
import type { Invoice } from '@/services/invoiceService';

interface TopCustomer {
  id: string;
  name: string;
  value: number;
}

interface TopCustomersWidgetProps {
  customers: TopCustomer[];
  /** Full Customer records for the top rows, keyed by id — fetched once the ranked list is known. */
  customerDetails: Record<string, Customer>;
  /** Shared invoice list (already fetched for Actions Needed) — filtered per customer here, no new request. */
  invoices: Invoice[];
  isLoading: boolean;
}

/** Same 6-hue palette used across Actions Needed's categories, so the two flagship widgets read as one system. */
const AVATAR_PALETTE = [
  { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-600 dark:text-amber-400' },
  { bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-600 dark:text-blue-400' },
  { bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-600 dark:text-rose-400' },
  { bg: 'bg-purple-50 dark:bg-purple-950/40', text: 'text-purple-600 dark:text-purple-400' },
  { bg: 'bg-indigo-50 dark:bg-indigo-950/40', text: 'text-indigo-600 dark:text-indigo-400' },
  { bg: 'bg-teal-50 dark:bg-teal-950/40', text: 'text-teal-600 dark:text-teal-400' },
];

const IN_FLIGHT_STATUSES = ['Dispatched', 'AtPickup', 'InTransit', 'AtDelivery'];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?';
}

export default function TopCustomersWidget({ customers, customerDetails, invoices, isLoading }: TopCustomersWidgetProps) {
  const navigate = useNavigate();
  const top = customers.slice(0, 5);
  const maxValue = top.reduce((max, c) => Math.max(max, c.value), 0);

  return (
    <Card className="border-slate-200/60 shadow-sm rounded-xl bg-white dark:bg-slate-900 flex flex-col">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
        <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
          <Users className="w-4 h-4 text-indigo-500" />
          <span>Top Customers</span>
        </CardTitle>
        <CardDescription className="text-[10px] text-slate-400 mt-0.5">
          By revenue, last 6 months
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 p-4 flex flex-col gap-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 skeleton w-full rounded-lg" />
          ))
        ) : top.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">No revenue recorded yet.</p>
        ) : (
          top.map((cust, idx) => {
            const share = maxValue > 0 ? (cust.value / maxValue) * 100 : 0;
            const palette = AVATAR_PALETTE[idx % AVATAR_PALETTE.length];
            const detail = customerDetails[cust.id];
            const activeTripsCount = detail?.trips?.filter((t) => IN_FLIGHT_STATUSES.includes(t.status)).length ?? 0;
            const usedAmount = invoices
              .filter((inv) => inv.customer?.id === cust.id && (inv.status === 'Pending' || inv.status === 'Overdue'))
              .reduce((sum, inv) => sum + inv.total_amount, 0);
            const creditLimit = detail?.credit_limit ?? 0;

            return (
              <button
                key={cust.id}
                onClick={() => navigate(`/customers/${cust.id}`)}
                className="w-full flex flex-col gap-2 p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 text-left transition-colors animate-fade-in"
                style={{ animationDelay: `${idx * 0.03}s` }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar className={cn('size-8 shrink-0', idx === 0 && 'ring-2 ring-[#E8450F]/50 ring-offset-2 dark:ring-offset-slate-900')}>
                      <AvatarFallback className={cn('text-[10px] font-extrabold', palette.bg, palette.text)}>
                        {initials(cust.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate text-xs">{cust.name}</span>
                        {activeTripsCount > 0 && (
                          <span className="shrink-0 inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-full">
                            <Navigation className="w-2.5 h-2.5" />
                            {activeTripsCount} active
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="font-extrabold text-slate-950 dark:text-slate-100 shrink-0 text-xs">
                    SAR {cust.value.toLocaleString()}
                  </span>
                </div>

                <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={cn('h-full rounded-full', idx === 0 ? 'bg-[#E8450F]' : 'bg-slate-400 dark:bg-slate-600')}
                    style={{ width: `${share}%` }}
                  />
                </div>

                {creditLimit > 0 && (
                  <CreditExposureKpi usedAmount={usedAmount} limitAmount={creditLimit} />
                )}
              </button>
            );
          })
        )}
      </CardContent>
      <div className="p-3 bg-slate-50/70 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/customers')}
          className="text-[11px] font-bold text-[#E8450F] hover:text-[#C7380A] p-0 h-auto hover:bg-transparent"
        >
          <span>View Customers</span>
          <ChevronRight size={12} className="ml-0.5" />
        </Button>
      </div>
    </Card>
  );
}
