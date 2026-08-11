import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, ChevronRight } from 'lucide-react';

interface TopCustomer {
  name: string;
  value: number;
}

interface TopCustomersWidgetProps {
  customers: TopCustomer[];
  isLoading: boolean;
}

const RANK_COLORS = ['bg-orange-50 text-[#E8450F]', 'bg-indigo-50 text-indigo-700', 'bg-blue-50 text-blue-700', 'bg-slate-50 text-slate-600', 'bg-slate-50 text-slate-600'];

export default function TopCustomersWidget({ customers, isLoading }: TopCustomersWidgetProps) {
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
      <CardContent className="flex-1 p-4 flex flex-col justify-center gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-8 skeleton w-full rounded-md" />
          ))
        ) : top.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">No revenue recorded yet.</p>
        ) : (
          top.map((cust, idx) => {
            const share = maxValue > 0 ? (cust.value / maxValue) * 100 : 0;
            return (
              <div key={cust.name} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black shrink-0 ${RANK_COLORS[idx] || 'bg-slate-100 text-slate-700'}`}>
                      {idx + 1}
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{cust.name}</span>
                  </div>
                  <span className="font-extrabold text-slate-950 dark:text-slate-100 shrink-0">
                    SAR {cust.value.toLocaleString()}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${idx === 0 ? 'bg-[#E8450F]' : 'bg-slate-400 dark:bg-slate-600'}`}
                    style={{ width: `${share}%` }}
                  />
                </div>
              </div>
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
