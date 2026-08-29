import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Truck } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface VehicleTypeBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  vehicleType: string | null | undefined;
  size?: 'sm' | 'default' | 'lg';
  showIcon?: boolean;
  fallbackText?: string;
  className?: string;
}

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
        'inline-flex items-center font-bold tracking-tight rounded-md shadow-2xs transition-colors bg-indigo-50/80 text-indigo-700 border-indigo-200/80',
        sizeClasses,
        className
      )}
      {...props}
    >
      {showIcon && <Truck className={cn('shrink-0 stroke-[2.2]', iconSizes)} />}
      <span>{vehicleType}</span>
    </Badge>
  );
}

export default VehicleTypeBadge;
