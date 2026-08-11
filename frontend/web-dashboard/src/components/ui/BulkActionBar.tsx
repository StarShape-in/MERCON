import * as React from 'react';
import { X, CheckSquare } from 'lucide-react';
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
    <div className={cn(
      "fixed bottom-6 left-[50%] -translate-x-[50%] z-50 flex items-center gap-3",
      "bg-white/95 dark:bg-slate-900/95 border border-slate-200/90 dark:border-slate-800",
      "shadow-[0_20px_50px_rgba(0,0,0,0.18)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)]",
      "px-3.5 sm:px-4 py-2.5 rounded-2xl text-sm animate-in fade-in slide-in-from-bottom-4 duration-250 backdrop-blur-md max-w-[94vw]",
      className
    )}>
      {/* Selected count pill */}
      <span className="font-mono text-xs font-extrabold bg-indigo-600 dark:bg-indigo-500 text-white px-3 py-1.5 rounded-xl shadow-xs shrink-0 flex items-center gap-1.5 tracking-tight">
        <CheckSquare className="w-3.5 h-3.5 stroke-[2.5]" />
        <span>{selectedCount} Selected</span>
      </span>

      <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 shrink-0" />

      {/* Buttons container - single row scrolling if needed, never wrap into multiline */}
      <div className="flex items-center gap-2 flex-nowrap whitespace-nowrap overflow-x-auto no-scrollbar py-0.5 max-w-[70vw] sm:max-w-none">
        {children}
      </div>

      <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 shrink-0" />

      {/* Clear X button */}
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={onClear} 
        className="h-8 w-8 p-0 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all"
        title="Clear selection"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default BulkActionBar;
