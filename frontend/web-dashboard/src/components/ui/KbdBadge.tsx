import React from 'react';

interface KbdBadgeProps {
  keys: string;
  className?: string;
}

/**
 * Visual key cap badge to render keyboard shortcuts next to buttons or labels.
 * Example: <KbdBadge keys="Ctrl+S" />
 */
export const KbdBadge: React.FC<KbdBadgeProps> = ({ keys, className = '' }) => {
  return (
    <kbd
      className={`hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 ml-1.5 text-[10px] font-mono font-medium tracking-tight rounded border border-gray-300 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 shadow-2xs pointer-events-none select-none opacity-80 ${className}`}
    >
      {keys}
    </kbd>
  );
};
