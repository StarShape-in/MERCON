import React from 'react';
import { getCategoryTheme } from '@/utils/expenseCategoryColors';
import { cn } from '@/lib/utils';

export interface ExpenseCategoryBadgeProps {
  category: string;
  showDot?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ExpenseCategoryBadge({
  category,
  showDot = true,
  size = 'sm',
  className,
}: ExpenseCategoryBadgeProps) {
  const theme = getCategoryTheme(category);

  const sizeClasses = {
    sm: 'px-2.5 py-0.5 text-[11px] font-medium gap-1.5',
    md: 'px-3 py-1 text-xs font-semibold gap-1.5',
    lg: 'px-3.5 py-1 text-xs font-bold gap-2',
  }[size];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border shadow-2xs shrink-0 w-fit transition-colors',
        theme.badgeClass,
        sizeClasses,
        className
      )}
    >
      {showDot && (
        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', theme.dot)} />
      )}
      <span>{category || 'Uncategorized'}</span>
    </span>
  );
}

export default ExpenseCategoryBadge;
