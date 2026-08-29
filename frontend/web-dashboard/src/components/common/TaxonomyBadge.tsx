import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  TaxonomyCategory,
  resolveTaxonomyOption,
  getTaxonomyIconComponent,
  TAXONOMY_UPDATED_EVENT,
  TaxonomyOption,
} from '@/utils/taxonomyRegistry';

export interface TaxonomyBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  category: TaxonomyCategory;
  value: string | null | undefined;
  size?: 'sm' | 'default' | 'lg';
  showIcon?: boolean;
  fallbackText?: string;
  className?: string;
}

export function TaxonomyBadge({
  category,
  value,
  size = 'default',
  showIcon = true,
  fallbackText,
  className,
  ...props
}: TaxonomyBadgeProps) {
  const [option, setOption] = useState<TaxonomyOption | null>(() =>
    resolveTaxonomyOption(category, value)
  );

  useEffect(() => {
    setOption(resolveTaxonomyOption(category, value));

    const handleUpdate = () => {
      setOption(resolveTaxonomyOption(category, value));
    };

    window.addEventListener(TAXONOMY_UPDATED_EVENT, handleUpdate);
    return () => {
      window.removeEventListener(TAXONOMY_UPDATED_EVENT, handleUpdate);
    };
  }, [category, value]);

  if (!value) {
    const defaultFallback =
      fallbackText ||
      (category === 'VEHICLE_CLASS'
        ? 'Any Vehicle'
        : category === 'LINE_TYPE'
        ? 'Single Trip'
        : 'Extra');

    return (
      <Badge
        variant="outline"
        className={cn(
          'font-semibold text-slate-400 border-slate-200 bg-slate-50/50 dark:bg-slate-800/40 dark:border-slate-800',
          size === 'sm' && 'text-[9px] px-1.5 py-0 h-4',
          size === 'default' && 'text-[10px] px-2 py-0.5 h-5',
          size === 'lg' && 'text-xs px-2.5 py-1 h-6',
          className
        )}
        {...props}
      >
        {defaultFallback}
      </Badge>
    );
  }

  const theme = option?.colorTheme || {
    bg: 'bg-slate-100',
    text: 'text-slate-800',
    border: 'border-slate-300',
    darkBg: 'dark:bg-slate-800',
    darkText: 'dark:text-slate-200',
  };

  const IconComponent = getTaxonomyIconComponent(option?.iconName);

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
        'inline-flex items-center font-bold tracking-tight rounded-md shadow-2xs transition-colors shrink-0 whitespace-nowrap',
        theme.bg,
        theme.text,
        theme.border,
        theme.darkBg,
        theme.darkText,
        sizeClasses,
        className
      )}
      {...props}
    >
      {showIcon && <IconComponent className={cn('shrink-0 stroke-[2.2]', iconSizes)} />}
      <span>{option?.label || value}</span>
    </Badge>
  );
}

export default TaxonomyBadge;
