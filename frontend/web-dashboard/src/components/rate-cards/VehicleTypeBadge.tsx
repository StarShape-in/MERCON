import React from 'react';
import { Badge } from '@/components/ui/badge';
import { VEHICLE_TYPES, type VehicleType } from '@mercon/shared-types';
import { Truck, Scale, Box, ShieldCheck, Container } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface VehicleTypeBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  vehicleType: string | VehicleType | null | undefined;
  size?: 'sm' | 'default' | 'lg';
  showIcon?: boolean;
  fallbackText?: string;
}

const VEHICLE_STYLES: Record<string, { bg: string; text: string; border: string; icon: React.ElementType }> = {
  '6.5M-10TON': { bg: 'bg-amber-50/90', text: 'text-amber-800', border: 'border-amber-200', icon: Scale },
  '5 TON': { bg: 'bg-[#FFF0EB]', text: 'text-[#E8450F]', border: 'border-[#FFD4C4]', icon: Truck },
  '10 TON': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', icon: Scale },
  '5M-5TON': { bg: 'bg-teal-50/90', text: 'text-teal-800', border: 'border-teal-200', icon: Truck },
  '13.5M-20TON': { bg: 'bg-slate-900', text: 'text-white', border: 'border-slate-800', icon: Container },
  '3TON/4TON': { bg: 'bg-cyan-50/90', text: 'text-cyan-800', border: 'border-cyan-200', icon: Box },
  'DYNA 3 TON': { bg: 'bg-indigo-50/90', text: 'text-indigo-700', border: 'border-indigo-200', icon: Truck },
  'LORRY': { bg: 'bg-blue-50/90', text: 'text-blue-700', border: 'border-blue-200', icon: Truck },
  '40 FEET': { bg: 'bg-purple-50/90', text: 'text-purple-800', border: 'border-purple-200', icon: Container },
};

const DEFAULT_STYLE = { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', icon: Truck };

export function VehicleTypeBadge({
  vehicleType,
  size = 'default',
  showIcon = true,
  fallbackText = 'Any Vehicle',
  className,
  ...props
}: VehicleTypeBadgeProps) {
  if (!vehicleType) {
    return (
      <Badge
        variant="outline"
        className={cn(
          'font-semibold text-slate-400 border-slate-200 bg-slate-50/50',
          size === 'sm' && 'text-[9px] px-1.5 py-0 h-4',
          size === 'default' && 'text-[10px] px-2 py-0.5 h-5',
          size === 'lg' && 'text-xs px-2.5 py-1 h-6',
          className
        )}
        {...props}
      >
        {fallbackText}
      </Badge>
    );
  }

  const style = VEHICLE_STYLES[vehicleType] || DEFAULT_STYLE;
  const IconComponent = style.icon;

  const sizeClasses = {
    sm: 'text-[9px] px-1.5 py-0 h-4 gap-1',
    default: 'text-[10px] font-extrabold px-2 py-0.5 h-5 gap-1',
    lg: 'text-xs font-extrabold px-2.5 py-1 h-6 gap-1.5',
  }[size];

  const iconSizes = {
    sm: 'w-2.5 h-2.5',
    default: 'w-3 h-3',
    lg: 'w-3.5 h-3.5',
  }[size];

  return (
    <Badge
      variant="outline"
      className={cn(
        'inline-flex items-center font-bold tracking-tight rounded-md shadow-2xs transition-colors',
        style.bg,
        style.text,
        style.border,
        sizeClasses,
        className
      )}
      {...props}
    >
      {showIcon && <IconComponent className={cn('shrink-0 stroke-[2.2]', iconSizes)} />}
      <span>{vehicleType}</span>
    </Badge>
  );
}

export default VehicleTypeBadge;
