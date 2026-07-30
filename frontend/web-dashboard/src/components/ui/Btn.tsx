import React, { useRef, useEffect, useState } from 'react';
import { Button } from './button';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ShortcutConfig {
  key: string;            // e.g. "Enter", "r", "n"
  metaOrControl?: boolean; // command (mac) / ctrl (win)
  alt?: boolean;          // option (mac) / alt (win)
}

interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
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

  // Map our custom variants to Shadcn variants
  const shadcnVariant = 
    variant === 'primary' ? 'default' :
    variant === 'secondary' ? 'secondary' :
    variant === 'outline' ? 'outline' :
    variant === 'danger' ? 'destructive' : 'ghost';

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

  return (
    <Button 
      ref={buttonRef}
      variant={shadcnVariant} 
      size={shadcnSize} 
      className={cn("gap-1.5 font-semibold", className)} 
      disabled={isLoading || props.disabled} 
      {...props}
    >
      {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : icon}
      <span>{isLoading ? 'Loading...' : label}</span>
      {shortcut && !isLoading && (
        <kbd className="ml-1 px-1 py-0.5 text-[9px] font-bold font-mono tracking-wide rounded bg-black/10 dark:bg-white/15 text-slate-500 dark:text-slate-400 border border-slate-200/20 dark:border-slate-800/20 leading-none select-none pointer-events-none">
          {getShortcutText()}
        </kbd>
      )}
    </Button>
  );
}
