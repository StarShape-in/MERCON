import { useEffect, useState, useRef, Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { LayoutProvider, useLayoutMeta } from '@/context/LayoutContext';
import OperationsAssistant from '../assistant/OperationsAssistant';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { KeyboardShortcutsModal } from '@/components/ui/KeyboardShortcutsModal';

/** Inner shell — reads metadata from context set by each page's DashboardLayout */
function ShellInner() {
  const location = useLocation();
  const { meta } = useLayoutMeta();
  const contentRef = useRef<HTMLDivElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('mercon_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebarCollapse = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('mercon_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  // Global shortcut (⌘B or Ctrl+B) to toggle rail mode on desktop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebarCollapse();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close mobile drawer, reset scroll position, and auto-collapse sidebar on /trips?view=kanban
  useEffect(() => {
    setSidebarOpen(false);
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }

    const searchParams = new URLSearchParams(location.search);
    const view = searchParams.get('view');
    const isTripsKanban = location.pathname === '/trips' && view !== 'table';
    if (isTripsKanban) {
      setSidebarCollapsed(true);
      try {
        localStorage.setItem('mercon_sidebar_collapsed', 'true');
      } catch {}
    }
  }, [location.pathname, location.search]);

  // Lock body scroll while mobile drawer is open
  useEffect(() => {
    if (!sidebarOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [sidebarOpen]);

  // Escape closes the drawer
  useEffect(() => {
    if (!sidebarOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [sidebarOpen]);

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-[#F8FAFC]">
      {/* Sidebar — stays mounted forever, never remounts on navigation */}
      <Sidebar
        active={meta.active}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
      />

      <div className="flex flex-col flex-1 min-w-0 bg-[#F8FAFC]">
        <Header
          title={meta.title}
          breadcrumb={meta.breadcrumb}
          hideBackButton={meta.hideBackButton}
          onMenuClick={() => setSidebarOpen(true)}
        />

        {/* Content area — Suspense + ErrorBoundary ensures shell stays mounted and errors are isolated */}
        <div
          ref={contentRef}
          className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 relative pt-4 sm:pt-6 bg-[#F8FAFC]"
        >
          <ErrorBoundary resetKey={location.pathname} key={location.pathname}>
            <Suspense
              fallback={
                <div className="flex items-center justify-center h-full min-h-[350px]">
                  <div className="flex flex-col items-center gap-3">
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        border: '3px solid #F0F0F2',
                        borderTopColor: 'var(--color-brand)',
                        borderRadius: '50%',
                        animation: 'spin 0.7s linear infinite',
                      }}
                    />
                    <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase animate-pulse">
                      Loading...
                    </span>
                  </div>
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
              }
            >
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>

      {/* Floating Operations Assistant Overlay */}
      <OperationsAssistant />
      {/* ERP Keyboard Shortcuts Help Overlay */}
      <KeyboardShortcutsModal />
    </div>
  );
}

export default function AppShell() {
  return (
    <LayoutProvider>
      <ShellInner />
    </LayoutProvider>
  );
}
