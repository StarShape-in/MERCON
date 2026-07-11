import { Check, Clock, AlertTriangle, XCircle } from 'lucide-react';
import { Badge } from './badge';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  // Common theme mapping matching s_dashboard status indicators
  const normalized = status.toLowerCase().replace(/\s+/g, '');
  
  let color = '#6E6E80';
  let bg = '#F0F0F2';
  let Icon = Clock;

  switch (normalized) {
    case 'available':
    case 'active':
    case 'completed':
    case 'paid':
    case 'verified':
    case 'ontime':
      color = '#16A34A';
      bg = '#F0FDF4';
      Icon = Check;
      break;
    case 'ontrip':
    case 'intransit':
    case 'dispatched':
    case 'atpickup':
    case 'atdelivery':
    case 'pending':
    case 'pendingreview':
      color = '#D97706';
      bg = '#FFFBEB';
      Icon = Clock;
      break;
    case 'maintenance':
    case 'offduty':
    case 'draft':
      color = '#2563EB';
      bg = '#EFF6FF';
      Icon = Clock;
      break;
    case 'overdue':
    case 'expired':
    case 'rejected':
    case 'inactive':
    case 'highrisk':
      color = '#DC2626';
      bg = '#FEF2F2';
      Icon = AlertTriangle;
      break;
    case 'cancelled':
      color = '#7C3AED';
      bg = '#F5F3FF';
      Icon = XCircle;
      break;
  }

  return (
    <Badge 
      variant="outline"
      className={cn("gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full select-none border-transparent")} 
      style={{ color, backgroundColor: bg }}
    >
      <Icon size={12} className="stroke-[2.5]" />
      <span>{status}</span>
    </Badge>
  );
}
