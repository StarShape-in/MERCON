import React from 'react';
import { Badge } from '@/components/ui/badge';
import { RATE_CATEGORIES, type RateCategory } from '@mercon/shared-types';
import {
  Tag,
  Clock,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface RateCategoryBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  category: string | RateCategory | null | undefined;
  size?: 'sm' | 'default' | 'lg';
  showIcon?: boolean;
  fallbackText?: string;
}

const CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string; icon: React.ElementType }> = {
  'Single Trip': { bg: 'bg-indigo-50/80', text: 'text-indigo-700', border: 'border-indigo-200/80', icon: Tag },
  'Round Trip': { bg: 'bg-blue-50/80', text: 'text-blue-700', border: 'border-blue-200/80', icon: Layers },
  '10 Hrs Duty': { bg: 'bg-violet-50/80', text: 'text-violet-700', border: 'border-violet-200/80', icon: Clock },
  '12 Hrs Duty': { bg: 'bg-sky-50/80', text: 'text-sky-700', border: 'border-sky-200/80', icon: Clock },
};

const DEFAULT_STYLE = { bg: 'bg-slate-100/80', text: 'text-slate-700', border: 'border-slate-200', icon: Tag };

export function RateCategoryBadge({
  category,
  size = 'default',
  showIcon = true,
  fallbackText = 'Uncategorized',
  className,
  ...props
}: RateCategoryBadgeProps) {
  if (!category) {
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

  const style = CATEGORY_STYLES[category] || DEFAULT_STYLE;
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
      <span>{category}</span>
    </Badge>
  );
}

export default RateCategoryBadge;
