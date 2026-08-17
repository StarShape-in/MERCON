import { useState } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import OwnerFolderCard from '@/components/documents/OwnerFolderCard';
import type { OwnerFoldersSummaryRow } from '@/services/documentService';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 8;

interface FolderCardSectionProps {
  title: string;
  icon: React.ReactNode;
  noun: string; // "Vehicles" | "Drivers" — used for the "View all N Vehicles" label
  rows: OwnerFoldersSummaryRow[];
  onOpenRow: (row: OwnerFoldersSummaryRow) => void;
  onPreviewDocument: (documentId: string) => void;
}

/**
 * Dumping every driver/vehicle folder card onto the page at once doesn't
 * scale past a couple dozen owners. Shows one page of cards at a time with
 * Prev/Next, plus a "View all" toggle to expand the whole list inline —
 * matches the target design instead of an unbounded grid.
 */
export default function FolderCardSection({ title, icon, noun, rows, onOpenRow, onPreviewDocument }: FolderCardSectionProps) {
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState(false);

  if (rows.length === 0) return null;

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages - 1);
  const visibleRows = expanded ? rows : rows.slice(clampedPage * PAGE_SIZE, clampedPage * PAGE_SIZE + PAGE_SIZE);
  const showPager = !expanded && rows.length > PAGE_SIZE;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 tracking-wider uppercase flex items-center gap-2">
          {icon}
          <span>{title} ({rows.length} {noun})</span>
        </h3>
        <div className="flex items-center gap-3 shrink-0">
          {expanded ? (
            <button
              onClick={() => { setExpanded(false); setPage(0); }}
              className="text-xs font-bold text-brand hover:text-brand-hover"
            >
              Show less
            </button>
          ) : rows.length > PAGE_SIZE ? (
            <button
              onClick={() => setExpanded(true)}
              className="text-xs font-bold text-brand hover:text-brand-hover flex items-center gap-1"
            >
              View all {noun.toLowerCase()} <ArrowRight className="w-3 h-3" />
            </button>
          ) : null}
          {showPager && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={clampedPage === 0}
                className={cn(
                  'w-6 h-6 rounded-lg border flex items-center justify-center transition-colors',
                  clampedPage === 0
                    ? 'border-slate-200 dark:border-slate-800 text-slate-300 dark:text-slate-700 cursor-not-allowed'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                )}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-mono text-slate-400 px-1">{clampedPage + 1}/{totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={clampedPage >= totalPages - 1}
                className={cn(
                  'w-6 h-6 rounded-lg border flex items-center justify-center transition-colors',
                  clampedPage >= totalPages - 1
                    ? 'border-slate-200 dark:border-slate-800 text-slate-300 dark:text-slate-700 cursor-not-allowed'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                )}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {visibleRows.map((row) => (
          <OwnerFolderCard key={row.ownerId} row={row} onOpen={() => onOpenRow(row)} onPreviewDocument={onPreviewDocument} />
        ))}
      </div>
    </div>
  );
}
