import React from 'react';
import { TaxonomyBadge } from '@/components/common/TaxonomyBadge';

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
  return (
    <TaxonomyBadge
      category="VEHICLE_CLASS"
      value={vehicleType}
      size={size}
      showIcon={showIcon}
      fallbackText={fallbackText}
      className={className}
      {...props}
    />
  );
}

export default VehicleTypeBadge;
