import * as React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface BulkActionBarProps {
  selectedCount: number;
  onClear: () => void;
  children: React.ReactNode;
  className?: string;
}

export function BulkActionBar({ selectedCount, onClear, children, className }: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className={cn("fixed bottom-6 left-[50%] translate-x-[-50%] z-50 flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xl px-4 py-2.5 rounded-xl text-sm animate-in fade-in slide-in-from-bottom-3 duration-200 backdrop-blur-md", className)}>
      <span className="font-mono text-xs font-bold bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
        {selectedCount} Selected
      </span>
      <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
      <div className="flex gap-2 items-center flex-wrap">{children}</div>
      <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={onClear} 
        className="h-8 w-8 p-0 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
        title="Clear selection"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default BulkActionBar;
