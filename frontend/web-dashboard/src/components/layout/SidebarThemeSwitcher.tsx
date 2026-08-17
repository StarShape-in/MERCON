import { useEffect, useRef, useState } from 'react';
import { Palette, Check } from 'lucide-react';
import { SIDEBAR_THEMES } from '@/config/sidebarThemes';

interface SidebarThemeSwitcherProps {
  themeId: string;
  onSelect: (id: string) => void;
  collapsed?: boolean;
}

/** Small popover button that lets the user click through the orange sidebar presets. */
export default function SidebarThemeSwitcher({ themeId, onSelect, collapsed }: SidebarThemeSwitcherProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Change sidebar color"
        aria-expanded={open}
        title="Sidebar theme"
        className={`
          flex items-center justify-center shrink-0 w-8 h-8 rounded-full cursor-pointer
          text-zinc-400 hover:text-white transition-colors
          bg-[var(--sidebar-hover)] hover:bg-[var(--color-brand)]
          border border-[var(--sidebar-border)]
        `}
      >
        <Palette size={14} />
      </button>

      {open && (
        <div
          className={`
            absolute bottom-full mb-2 z-50 p-3 rounded-xl w-52
            bg-[var(--sidebar-bg-alt)] border border-[var(--sidebar-border)] shadow-lg shadow-black/40
            ${collapsed ? 'left-0' : 'right-0'}
          `}
        >
          <p className="text-[9.5px] font-extrabold text-zinc-400 uppercase tracking-wider mb-2 px-0.5">
            Sidebar Color
          </p>
          <div className="grid grid-cols-3 gap-2">
            {SIDEBAR_THEMES.map((theme) => {
              const active = theme.id === themeId;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => {
                    onSelect(theme.id);
                    setOpen(false);
                  }}
                  title={theme.name}
                  aria-label={theme.name}
                  aria-pressed={active}
                  className="flex flex-col items-center gap-1 group cursor-pointer"
                >
                  <span
                    style={{ background: theme.bg }}
                    className={`
                      relative w-9 h-9 rounded-full flex items-center justify-center
                      border-2 transition-transform duration-150 group-hover:scale-105
                      ${active ? 'border-[#FA5B25]' : 'border-white/10'}
                    `}
                  >
                    {active && <Check size={14} className="text-white" strokeWidth={3} />}
                  </span>
                  <span className="text-[8.5px] text-zinc-400 group-hover:text-white text-center leading-tight truncate w-full">
                    {theme.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
