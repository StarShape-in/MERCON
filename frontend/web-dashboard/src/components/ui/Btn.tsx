import React, { useRef, useEffect, useState } from 'react';
import { Button } from './button';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ShortcutConfig {
  key: string;            // e.g. "Enter", "r", "n"
  metaOrControl?: boolean; // command (mac) / ctrl (win)
  alt?: boolean;          // option (mac) / alt (win)
}

export type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'success' | 'warning' | 'info';

interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon?: React.ReactNode;
  variant?: BtnVariant;
  size?: 'sm' | 'md';
  isLoading?: boolean;
  shortcut?: ShortcutConfig;
}

export default function Btn({
  label,
  icon,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className = '',
  shortcut,
  ...props
}: BtnProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent || navigator.platform || ''));
  }, []);

  useEffect(() => {
    if (!shortcut || props.disabled || isLoading) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isTyping = activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' || 
        activeEl.getAttribute('contenteditable') === 'true'
      );
      
      if (isTyping) {
        const hasModifier = shortcut.metaOrControl || shortcut.alt;
        if (!hasModifier) return;
      }

      const modifierMatch = shortcut.metaOrControl 
        ? (isMac ? e.metaKey : e.ctrlKey) 
        : (!e.metaKey && !e.ctrlKey);

      const altMatch = shortcut.alt 
        ? e.altKey 
        : (!e.altKey);

      if (
        e.key.toLowerCase() === shortcut.key.toLowerCase() && 
        modifierMatch && 
        altMatch
      ) {
        e.preventDefault();
        buttonRef.current?.click();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcut, props.disabled, isLoading, isMac]);

  // Variant styling map — replaces dull gray defaults with rich, vibrant, modern colors
  const variantStyles: Record<BtnVariant, string> = {
    primary: 'bg-[#E8450F] hover:bg-[#d03e0d] text-white font-bold shadow-xs border border-orange-600/30 rounded-xl transition-all',
    secondary: 'bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 dark:hover:text-white font-semibold rounded-xl shadow-2xs transition-all',
    success: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 dark:hover:text-white font-semibold rounded-xl shadow-2xs transition-all',
    warning: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/80 hover:bg-amber-600 hover:text-white dark:hover:bg-amber-600 dark:hover:text-white font-semibold rounded-xl shadow-2xs transition-all',
    info: 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800/80 hover:bg-sky-600 hover:text-white dark:hover:bg-sky-600 dark:hover:text-white font-semibold rounded-xl shadow-2xs transition-all',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs border border-rose-600/30 transition-all',
    outline: 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold rounded-xl shadow-2xs transition-all',
    ghost: 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold rounded-xl transition-all',
  };

  const shadcnSize = size === 'sm' ? 'sm' : 'default';

  const getShortcutText = () => {
    if (!shortcut) return '';
    const parts: string[] = [];
    if (shortcut.metaOrControl) {
      parts.push(isMac ? '⌘' : 'Ctrl');
    }
    if (shortcut.alt) {
      parts.push(isMac ? '⌥' : 'Alt');
    }
    const displayKey = shortcut.key.toLowerCase() === 'enter' 
      ? (isMac ? '↵' : 'Enter') 
      : shortcut.key.toUpperCase();
    parts.push(displayKey);
    
    return parts.join(isMac ? '' : '+');
  };

  const getShortcutClassName = () => {
    const base = "ml-1.5 px-1 py-0.5 text-[9px] font-extrabold font-mono tracking-wide rounded leading-none select-none pointer-events-none border transition-all";
    if (variant === 'primary' || variant === 'danger') {
      return cn(base, "bg-white/20 text-white border-white/30");
    } else {
      return cn(base, "bg-indigo-100/60 dark:bg-white/10 text-indigo-900 dark:text-slate-200 border-indigo-200/40 dark:border-slate-700/40");
    }
  };

  return (
    <Button 
      ref={buttonRef}
      variant="ghost" 
      size={shadcnSize} 
      className={cn(
        "gap-1.5 font-semibold text-xs px-3 h-8.5 cursor-pointer whitespace-nowrap shrink-0",
        variantStyles[variant],
        className
      )} 
      disabled={isLoading || props.disabled} 
      {...props}
    >
      {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : icon}
      <span>{isLoading ? 'Loading...' : label}</span>
      {shortcut && !isLoading && (
        <kbd className={getShortcutClassName()}>
          {getShortcutText()}
        </kbd>
      )}
    </Button>
  );
}
