import { Check, Clock, AlertTriangle, XCircle, Wrench, Send, FileText, MapPin, Truck, ShieldCheck } from 'lucide-react';
import { Badge } from './badge';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalized = (status || '').toLowerCase().replace(/[\s_-]+/g, '');
  
  let label = status;
  let Icon = Clock;
  let styleClass = "bg-slate-100 text-slate-700 border-slate-200/90 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";

  switch (normalized) {
    case 'draft':
    case 'offduty':
      label = 'Draft';
      Icon = Clock;
      styleClass = "bg-indigo-50 text-indigo-700 border-indigo-200/80 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800";
      break;

    case 'dispatched':
      label = 'Scheduled';
      Icon = Clock;
      styleClass = "bg-indigo-50 text-indigo-700 border-indigo-200/80 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800";
      break;

    case 'atpickup':
      label = 'At Pickup';
      Icon = MapPin;
      styleClass = "bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800";
      break;

    case 'intransit':
    case 'ontrip':
      label = 'In Transit';
      Icon = Truck;
      styleClass = "bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800";
      break;

    case 'atdelivery':
      label = 'Completed';
      Icon = Check;
      styleClass = "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800";
      break;

    case 'completed':
    case 'delivered':
    case 'verified':
    case 'active':
    case 'available':
      label = normalized === 'completed' ? 'Completed' : status;
      Icon = Check;
      styleClass = "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800";
      break;

    case 'invoiced':
    case 'paid':
      label = 'Invoiced';
      Icon = FileText;
      styleClass = "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800";
      break;

    case 'cancelled':
      label = 'Cancelled';
      Icon = XCircle;
      styleClass = "bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800";
      break;

    case 'maintenance':
    case 'inshop':
    case 'undermaintenance':
      label = 'Maintenance';
      Icon = Wrench;
      styleClass = "bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800";
      break;

    case 'overdue':
    case 'expired':
    case 'rejected':
    case 'inactive':
    case 'highrisk':
      label = status;
      Icon = AlertTriangle;
      styleClass = "bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800";
      break;

    default:
      label = status;
      Icon = Clock;
      styleClass = "bg-slate-100 text-slate-700 border-slate-200/90 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
      break;
  }

  return (
    <Badge 
      variant="outline"
      className={cn(
        "gap-1.5 text-[11px] font-bold leading-none px-2.5 py-1 rounded-full select-none inline-flex items-center border",
        styleClass,
        className
      )} 
    >
      <Icon size={12} className="stroke-[2.2] shrink-0" />
      <span>{label}</span>
    </Badge>
  );
}
