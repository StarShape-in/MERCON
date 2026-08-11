import { useEffect, useState, Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useLayoutMeta } from '@/context/LayoutContext';

const SIDEBAR_COLLAPSED_KEY = 'mercon.sidebarCollapsed';

interface DashboardLayoutProps {
  active: string;
  title: string;
  breadcrumb?: string;
  pageTitle?: React.ReactNode;
  pageSub?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export default function DashboardLayout({
  active,
  title,
  breadcrumb,
  pageTitle,
  pageSub,
  actions,
  children,
}: DashboardLayoutProps) {
  const { isInsideShell, setMeta } = useLayoutMeta();

  // ── When inside AppShell: push metadata up and render only the content ──
  // The shell already owns the sidebar, header, and scroll container.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (isInsideShell) {
      setMeta({ active, title, breadcrumb, pageTitle, pageSub, actions });
    }
    // Re-run only when primitive values change (actions/pageTitle are JSX so
    // excluding them from deps avoids infinite loops; they update via ref on
    // each render in AppShell anyway).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInsideShell, active, title, breadcrumb, pageSub]);

  if (isInsideShell) {
    // Shell is already rendering the sidebar/header — just return the content.
    return <>{children}</>;
  }

  // ── Standalone mode (fallback): render the full shell inline ────────────
  // This path is only taken on pages that are NOT inside the AppShell layout
  // route, e.g. during local development of an isolated page.
  return <StandaloneShell {...{ active, title, breadcrumb, pageTitle, pageSub, actions, children }} />;
}

/** Full standalone shell — only used when AppShell is not the parent route. */
function StandaloneShell({
  active,
  title,
  breadcrumb,
  children,
}: DashboardLayoutProps) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true'
  );

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!sidebarOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [sidebarOpen]);

  // Cmd/Ctrl + B collapses or expands the desktop rail
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setSidebarCollapsed((c) => !c);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

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
    <div className="flex h-[100dvh] w-full overflow-hidden bg-white">
      <Sidebar
        active={active}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
      />
      <div className="flex flex-col flex-1 min-w-0 bg-white">
        <Header
          title={title}
          breadcrumb={breadcrumb}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 relative pt-4 sm:pt-6 bg-white">
          <Suspense fallback={
            <div className="flex items-center justify-center h-full min-h-[300px]">
              <div style={{
                width: 32, height: 32,
                border: '3px solid #F0F0F2',
                borderTopColor: '#E8450F',
                borderRadius: '50%',
                animation: 'spin 0.7s linear infinite',
              }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          }>
            {children}
          </Suspense>
        </div>
      </div>
    </div>
  );
}
