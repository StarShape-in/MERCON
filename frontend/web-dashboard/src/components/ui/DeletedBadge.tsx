import { Ban } from 'lucide-react';
import { Badge } from './badge';
import { cn } from '@/lib/utils';

interface DeletedBadgeProps {
  className?: string;
}

// Marks a referenced Vehicle/Driver (or other soft-deleted record) shown on
// a historical Trip/Expense/Maintenance/Invoice row, so it doesn't render
// indistinguishably from a live record.
export default function DeletedBadge({ className }: DeletedBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 text-[10px] font-bold leading-none px-2 py-0.5 rounded-full select-none inline-flex items-center border",
        "bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
        className
      )}
    >
      <Ban size={11} className="stroke-[2.2] shrink-0" />
      <span>Deleted</span>
    </Badge>
  );
}
