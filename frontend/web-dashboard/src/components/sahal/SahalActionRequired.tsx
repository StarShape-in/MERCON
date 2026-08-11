import { useState } from 'react';
import {
  Clock,
  CheckCircle2,
  FileWarning,
  Wrench,
  DollarSign,
  Flame,
  Zap,
  Sparkles,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
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
];

export default function SahalActionRequired() {
  const [actions, setActions] = useState<ActionItem[]>(INITIAL_ACTIONS);
  const [filter, setFilter] = useState<'all' | 'critical' | 'compliance'>('all');

  const handleAction = (item: ActionItem) => {
    toast.success(`Action resolved: ${item.title}`);
    setActions(prev => prev.filter(a => a.id !== item.id));
  };

  const handleResolveAll = () => {
    toast.success(`Batch acknowledged ${actions.length} action items`);
    setActions([]);
  };

  const filteredActions = actions.filter(item => {
    if (filter === 'critical') return item.priority === 'critical' || item.priority === 'high';
    if (filter === 'compliance') return item.category === 'compliance';
    return true;
  });

  const getPriorityBadge = (priority: ActionItem['priority']) => {
    switch (priority) {
      case 'critical':
        return (
          <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-rose-500 text-white flex items-center gap-1 shadow-xs animate-pulse">
            <Flame size={10} /> Critical
          </span>
        );
      case 'high':
        return (
          <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            High
          </span>
        );
      case 'medium':
        return (
          <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            Medium
          </span>
        );
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-gradient-to-b from-white via-slate-50/50 to-white dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-950 p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-60 h-60 bg-rose-500/5 dark:bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="relative z-10">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-600 to-amber-500 text-white flex items-center justify-center shadow-md shadow-rose-500/20">
              <ShieldAlert size={20} className="stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                  Priority Dispatch Queue
                </h2>
                <Badge className="bg-rose-500 text-white font-black text-[10px] px-2 py-0.5 shadow-xs">
                  {actions.length} Urgent
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Direct operator interventions & compliance blocks
              </p>
            </div>
          </div>

          {actions.length > 0 && (
            <button
              onClick={handleResolveAll}
              className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Filter Switcher */}
        <div className="flex items-center gap-1.5 my-3.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs font-semibold">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-xl transition-all ${
              filter === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            All Items ({actions.length})
          </button>
          <button
            onClick={() => setFilter('critical')}
            className={`px-3 py-1 rounded-xl transition-all ${
              filter === 'critical'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
            }`}
          >
            High Risk
          </button>
          <button
            onClick={() => setFilter('compliance')}
            className={`px-3 py-1 rounded-xl transition-all ${
              filter === 'compliance'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Compliance
          </button>
        </div>
      </div>

      {/* Action Items List */}
      <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[260px] relative z-10 pr-1">
        {filteredActions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-2">
              <CheckCircle2 size={24} />
            </div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Clear Deck — No Blockers
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              All urgent compliance and operational tickets resolved.
            </p>
          </div>
        ) : (
          filteredActions.map(item => (
            <div
              key={item.id}
              className="p-3 rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-xs flex items-center justify-between gap-3 group"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {getPriorityBadge(item.priority)}
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {item.title}
                  </h4>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                  {item.subtitle}
                </p>
                <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400">
                  <span className="font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <Clock size={10} /> {item.dueText}
                  </span>
                  {item.targetRef && (
                    <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">
                      #{item.targetRef}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => handleAction(item)}
                className="shrink-0 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:bg-[#E8450F] dark:hover:bg-[#E8450F] dark:hover:text-white transition-all shadow-xs cursor-pointer"
              >
                {item.actionLabel}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
