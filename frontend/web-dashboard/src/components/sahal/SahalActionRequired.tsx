import { useState } from 'react';
import {
  Clock,
  CheckCircle2,
  FileWarning,
  Wrench,
  DollarSign,
  Flame,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export interface ActionItem {
  id: string;
  category: 'compliance' | 'maintenance' | 'financial' | 'operations';
  priority: 'critical' | 'high' | 'medium';
  title: string;
  subtitle: string;
  dueText: string;
  actionLabel: string;
  targetRef?: string;
}

const INITIAL_ACTIONS: ActionItem[] = [
  {
    id: 'act-1',
    category: 'compliance',
    priority: 'critical',
    title: 'Driver Medical Certificate Expired',
    subtitle: 'Driver Tariq Al-Otaibi (DRV-882) requires immediate renewal',
    dueText: 'Expired 1d ago',
    actionLabel: 'Upload Cert',
    targetRef: 'DRV-882',
  },
  {
    id: 'act-2',
    category: 'maintenance',
    priority: 'high',
    title: 'Brake System Inspection Due',
    subtitle: 'Truck TRK-104 exceeded 50,000 km routine safety threshold',
    dueText: 'Due in 24 hrs',
    actionLabel: 'Book Service',
    targetRef: 'TRK-104',
  },
  {
    id: 'act-3',
    category: 'financial',
    priority: 'high',
    title: 'Pending Post-Trip Settlement ($8,450)',
    subtitle: 'Trip TRP-9021 awaiting manager clearance for demurrage fuel',
    dueText: '3 days pending',
    actionLabel: 'Approve',
    targetRef: 'TRP-9021',
  },
  {
    id: 'act-4',
    category: 'operations',
    priority: 'medium',
    title: 'Delayed Arrival Notification',
    subtitle: 'Route Riyadh ➔ Jeddah delayed by +45m due to sandstorm warning',
    dueText: 'Updated 10m ago',
    actionLabel: 'Re-route',
    targetRef: 'TRP-9044',
  },
  {
    id: 'act-5',
    category: 'compliance',
    priority: 'medium',
    title: 'Dangerous Goods (ADR) Permit Renewal',
    subtitle: 'Trailer TRL-08 permit expires in 5 calendar days',
    dueText: '5 days left',
    actionLabel: 'Renew',
    targetRef: 'TRL-08',
  },
];

export default function SahalActionRequired() {
  const [actions, setActions] = useState<ActionItem[]>(INITIAL_ACTIONS);
  const [filter, setFilter] = useState<'all' | 'critical' | 'compliance' | 'fleet'>('all');

  const handleAction = (item: ActionItem) => {
    toast.success(`Action resolved: ${item.title}`);
    setActions(prev => prev.filter(a => a.id !== item.id));
  };

  const filteredActions = actions.filter(item => {
    if (filter === 'critical') return item.priority === 'critical' || item.priority === 'high';
    if (filter === 'compliance') return item.category === 'compliance';
    if (filter === 'fleet') return item.category === 'maintenance' || item.category === 'operations';
    return true;
  });

  const getPriorityStyle = (priority: ActionItem['priority']) => {
    switch (priority) {
      case 'critical':
        return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800';
      case 'high':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800';
      case 'medium':
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800';
    }
  };

  const getCategoryIcon = (category: ActionItem['category']) => {
    switch (category) {
      case 'compliance':
        return <FileWarning size={14} className="text-rose-500" />;
      case 'maintenance':
        return <Wrench size={14} className="text-amber-500" />;
      case 'financial':
        return <DollarSign size={14} className="text-emerald-500" />;
      case 'operations':
        return <Clock size={14} className="text-blue-500" />;
    }
  };

  return (
    <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-sm rounded-2xl overflow-hidden backdrop-blur-sm flex flex-col">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500/15 to-amber-500/15 dark:from-rose-500/25 dark:to-amber-500/25 flex items-center justify-center border border-rose-500/20 text-rose-600 dark:text-rose-400">
              <Flame size={18} className="stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Action Required
                </CardTitle>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500 text-white shadow-xs animate-pulse">
                  {actions.length} Urgent
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Tasks demanding immediate operator intervention
              </p>
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 overflow-x-auto text-xs pb-0.5">
          <button
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              filter === 'all'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            All ({actions.length})
          </button>
          <button
            onClick={() => setFilter('critical')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              filter === 'critical'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
            }`}
          >
            High Priority
          </button>
          <button
            onClick={() => setFilter('compliance')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              filter === 'compliance'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Compliance
          </button>
          <button
            onClick={() => setFilter('fleet')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              filter === 'fleet'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Fleet & Trips
          </button>
        </div>
      </CardHeader>

      <CardContent className="p-3 flex-1 overflow-y-auto max-h-[300px] space-y-2.5 divide-y divide-slate-100 dark:divide-slate-800/60">
        {filteredActions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 size={36} className="text-emerald-500 mb-2" />
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              All Actions Resolved
            </p>
            <p className="text-xs text-slate-500">
              No outstanding emergency tasks at this time.
            </p>
          </div>
        ) : (
          filteredActions.map((item, idx) => (
            <div
              key={item.id}
              className={`pt-2.5 first:pt-0 flex items-start justify-between gap-3 group transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40 p-2 rounded-xl`}
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="mt-0.5 p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0">
                  {getCategoryIcon(item.category)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {item.title}
                    </span>
                    <Badge variant="outline" className={`text-[9px] px-1.5 py-0 font-semibold uppercase tracking-wider ${getPriorityStyle(item.priority)}`}>
                      {item.priority}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                    {item.subtitle}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                      <Clock size={10} />
                      {item.dueText}
                    </span>
                    {item.targetRef && (
                      <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                        #{item.targetRef}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0 pt-0.5">
                <button
                  onClick={() => handleAction(item)}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-[#E8450F] dark:hover:bg-[#E8450F] dark:hover:text-white transition-all shadow-xs cursor-pointer"
                >
                  {item.actionLabel}
                </button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
