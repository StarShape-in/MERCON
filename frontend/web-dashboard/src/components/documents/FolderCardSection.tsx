import { useState } from 'react';
import { ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import OwnerFolderCard from '@/components/documents/OwnerFolderCard';
import type { OwnerFoldersSummaryRow } from '@/services/documentService';
import { cn } from '@/lib/utils';

const ITEMS_PER_ROW = 4;
const INITIAL_BATCH = 8;
const BATCH_INCREMENT = 8;

interface FolderCardSectionProps {
  title: string;
  icon: React.ReactNode;
  noun: string; // "Vehicles" | "Drivers" — used for the "View all N Vehicles" label
  rows: OwnerFoldersSummaryRow[];
  onOpenRow: (row: OwnerFoldersSummaryRow) => void;
  onUploadMissing?: (row: OwnerFoldersSummaryRow, slotCode: string) => void;
  isOverview?: boolean;
  onViewAll?: () => void;
}

/**
 * Renders owner folder cards in a grid.
 * In overview mode (isOverview=true), shows strictly 1 row (4 items) with a "View all"
 * button that navigates to the dedicated category page.
 * In category mode (isOverview=false), shows grid with a "Show More" expansion button.
 */
export default function FolderCardSection({
  title,
  icon,
  noun,
  rows,
  onOpenRow,
  onUploadMissing,
  isOverview = false,
  onViewAll,
}: FolderCardSectionProps) {
  const [visibleLimit, setVisibleLimit] = useState(INITIAL_BATCH);

  if (rows.length === 0) return null;

  const visibleRows = isOverview
    ? rows.slice(0, ITEMS_PER_ROW)
    : rows.slice(0, visibleLimit);

  const hasMore = !isOverview && rows.length > visibleLimit;
  const isExpanded = !isOverview && visibleLimit > INITIAL_BATCH && visibleLimit >= rows.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/80 shadow-2xs">
          <span className="shrink-0 flex items-center justify-center">
            {icon}
          </span>
          <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <span>{title}</span>
            <span className="text-xs font-extrabold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 px-2.5 py-0.5 rounded-full border border-slate-200/80 dark:border-slate-600 shadow-2xs">
              ({rows.length} {noun})
            </span>
          </h3>
        </div>
        {isOverview && onViewAll && rows.length > ITEMS_PER_ROW && (
          <button
            onClick={onViewAll}
            className="text-xs font-bold text-brand hover:text-brand-hover flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>View all {noun.toLowerCase()} ({rows.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
        {visibleRows.map((row) => (
          <OwnerFolderCard key={row.ownerId} row={row} onOpen={() => onOpenRow(row)} onUploadMissing={onUploadMissing} />
        ))}
      </div>

      {!isOverview && (hasMore || isExpanded) && (
        <div className="flex justify-center pt-2">
          {hasMore ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setVisibleLimit((prev) => prev + BATCH_INCREMENT)}
              className="h-9 px-5 gap-2 text-xs font-extrabold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-200 rounded-xl shadow-2xs cursor-pointer transition-all hover:scale-[1.01]"
            >
              <span>Show More ({rows.length - visibleLimit} remaining)</span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setVisibleLimit(INITIAL_BATCH)}
              className="h-8 px-4 gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
            >
              <span>Show Less</span>
              <ChevronUp className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
