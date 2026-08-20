import { Check, Link2, Loader2, AlertCircle } from 'lucide-react';
import type { PasteStatus } from '@/hooks/usePastedLocation';
import { cn } from '@/lib/utils';

interface PasteLocationStatusProps {
  status: PasteStatus;
  className?: string;
}

/**
 * The one line that tells an operator what a paste is doing.
 *
 * It occupies a fixed height in every state, including idle, so resolving a
 * link never pushes the fields below it down the page. In the trip wizard two
 * of these sit side by side and the schedule sits under them; letting the row
 * grow on paste made the form jump under the cursor.
 *
 * The idle state is not empty on purpose: the placeholder that advertises
 * pasting disappears as soon as the field has a value, so an operator editing
 * a saved trip would otherwise have nothing telling them paste works here.
 */
export default function PasteLocationStatus({ status, className }: PasteLocationStatusProps) {
  const base = 'h-4 flex items-center gap-1.5 text-[11px] pl-1 leading-none';

  if (status.kind === 'error') {
    return (
      <p className={cn(base, 'text-rose-600 dark:text-rose-400', className)} role="alert">
        <AlertCircle className="w-3 h-3 shrink-0" />
        <span className="truncate">{status.message}</span>
      </p>
    );
  }

  if (status.kind === 'resolving' || status.kind === 'naming') {
    return (
      <p className={cn(base, 'text-indigo-600 dark:text-indigo-400', className)} aria-live="polite">
        <Loader2 className="w-3 h-3 shrink-0 animate-spin" />
        <span className="truncate">
          {status.kind === 'resolving' ? 'Opening Google Maps link…' : 'Finding the address…'}
        </span>
      </p>
    );
  }

  if (status.kind === 'done') {
    return (
      <p className={cn(base, 'text-emerald-600 dark:text-emerald-400', className)} aria-live="polite">
        <Check className="w-3 h-3 shrink-0" />
        <span className="truncate">Location set from link</span>
      </p>
    );
  }

  return (
    <p className={cn(base, 'text-slate-400 dark:text-slate-500', className)}>
      <Link2 className="w-3 h-3 shrink-0" />
      <span className="truncate">Tip: paste a Google Maps link or coordinates</span>
    </p>
  );
}
