import { useEffect, useState, Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { LayoutProvider, useLayoutMeta } from '@/context/LayoutContext';

const SIDEBAR_COLLAPSED_KEY = 'mercon.sidebarCollapsed';

/** Inner shell — reads metadata from context set by each page's DashboardLayout */
function ShellInner() {
  const location = useLocation();
  const { meta } = useLayoutMeta();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true'
  );

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // Close mobile drawer on navigation
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

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
    <div className="flex h-[100dvh] w-full overflow-hidden bg-white">
      {/* Sidebar — stays mounted forever, never remounts on navigation */}
      <Sidebar
        active={meta.active}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
      />

      <div className="flex flex-col flex-1 min-w-0 bg-white">
        <Header
          title={meta.title}
          breadcrumb={meta.breadcrumb}
          onMenuClick={() => setSidebarOpen(true)}
        />

        {/* Content area — Suspense here means only content swaps, shell stays */}
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
            <Outlet />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

/**
 * AppShell — a single persistent layout route that renders the sidebar and header
 * shell exactly once. All protected pages are nested under this via React Router's
 * layout routes. The sidebar never unmounts between navigations.
 */
export default function AppShell() {
  return (
    <LayoutProvider>
      <ShellInner />
    </LayoutProvider>
  );
}
