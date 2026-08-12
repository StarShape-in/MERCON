import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Home, Bell, Truck, Users, Building2,
  ReceiptText, FileText, BarChart3,
  Settings, LogOut, X, DollarSign,
  ChevronsLeft, ChevronsRight, GitFork, ChevronDown
} from 'lucide-react';
import { authStore } from '@/store/authStore';
import { notificationService } from '@/services/notificationService';

interface SidebarProps {
  active?: string;
  /** Mobile drawer open state — ignored at lg and above, where the sidebar is always visible */
  open?: boolean;
  onClose?: () => void;
  /**
   * Desktop-only rail mode — collapses to an icon strip at lg and above. Mobile drawer is
   * unaffected. Toggled from the handle on the sidebar's own right edge.
   */
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function Sidebar({ active, open = false, onClose, collapsed = false, onToggleCollapse }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = authStore.getUser();

  const handleLogout = () => {
    authStore.clearSession();
    navigate('/login');
  };

  const { data: notificationsRes } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationService.getAll,
    refetchInterval: 60000, // Poll every minute
  });

  const unreadCount = notificationsRes?.data?.filter((n: any) => !n.is_read).length || 8;

  const navItems = [
    { icon: Home, label: 'Dashboard', path: '/' },
    { icon: GitFork, label: 'Trips', path: '/trips' },
    { icon: Truck, label: 'Fleet', path: '/vehicles' },
    { icon: Users, label: 'Drivers', path: '/drivers' },
    { icon: Building2, label: 'Customers', path: '/customers' },
    { icon: ReceiptText, label: 'Invoices', path: '/invoices' },
    { icon: FileText, label: 'Documents', path: '/documents' },
    { icon: BarChart3, label: 'Reports', path: '/reports' },
    { icon: DollarSign, label: 'Finance', path: '/rate-cards' },
    { icon: Bell, label: 'Alerts', path: '/notifications', badge: unreadCount },
    { icon: Settings, label: 'Settings', path: '/settings', end: true },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] transition-opacity duration-200 lg:hidden ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      <aside
        role="navigation"
        aria-label="Main navigation"
        className={`
          flex flex-col w-[260px] sm:w-[280px] shrink-0 h-[100dvh] lg:h-full
          bg-[#18181B] border-r border-white/10
          fixed inset-y-0 left-0 z-50 lg:relative lg:z-30
          transform transition-[transform,width] duration-300 ease-in-out lg:transform-none
          ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${collapsed ? 'lg:w-[76px]' : 'lg:w-[220px]'}
        `}
      >
      {/* Logo */}
      <div className="relative flex items-center shrink-0 justify-center bg-[#18181B] border-b border-white/10 h-[72px] lg:h-[88px] overflow-hidden">
        <img
          src="/navbar-logo-final.png"
          alt="MERCON Logo"
          className={`w-full h-full object-contain origin-center transition-transform duration-300 ease-in-out scale-[2.5] ${collapsed ? 'lg:scale-100' : ''}`}
        />
        <button
          onClick={onClose}
          aria-label="Close navigation menu"
          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors lg:hidden"
        >
          <X size={18} />
        </button>
      </div>

      {/* Desktop rail toggle */}
      <button
        onClick={onToggleCollapse}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-expanded={!collapsed}
        title={`${collapsed ? 'Expand' : 'Collapse'} sidebar (⌘B)`}
        className="
          group hidden lg:flex absolute -right-3.5 top-1/2 -translate-y-1/2 z-30
          w-7 h-7 items-center justify-center rounded-full
          bg-[#232326] border border-white/15 text-white/70 shadow-md shadow-black/20
          before:absolute before:-inset-2 before:content-['']
          hover:bg-[#E8450F] hover:border-[#E8450F] hover:text-white
          focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8450F]
          transition-colors duration-150 cursor-pointer
        "
      >
        {collapsed
          ? <ChevronsRight size={14} className="stroke-[2.25] transition-transform duration-150 group-hover:translate-x-px" />
          : <ChevronsLeft size={14} className="stroke-[2.25] transition-transform duration-150 group-hover:-translate-x-px" />}
      </button>

      {/* Nav items list */}
      <div className={`flex-1 py-4 space-y-1 overflow-y-auto overflow-x-hidden px-3 transition-[padding] duration-300 ease-in-out ${collapsed ? 'lg:px-2' : ''}`}>
        {navItems.map((item: any) => (
          <NavLink
            key={item.label}
            to={item.path}
            end={item.end ?? item.path === '/'}
            onClick={onClose}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) => `
              relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl cursor-pointer transition-all duration-150 group
              ${collapsed ? 'lg:justify-center lg:px-0' : ''}
              ${isActive
                ? 'bg-[#E8450F] text-white shadow-sm font-bold'
                : 'text-slate-300/80 hover:bg-white/5 hover:text-white font-medium'
              }
            `}
          >
            {({ isActive }) => (
              <>
                <item.icon
                  size={17}
                  className={`shrink-0 transition-transform duration-150 group-hover:scale-105 ${isActive ? 'stroke-[2.2] text-white' : 'stroke-[1.8] text-slate-400'}`}
                />
                <span className={`text-[13px] flex-1 whitespace-nowrap ${collapsed ? 'lg:hidden' : ''}`}>
                  {item.label}
                </span>
                {item.badge !== undefined && item.badge > 0 && !isActive && (
                  <>
                    <span className={`w-4 h-4 rounded-full bg-[#E8450F] text-white text-[9px] font-extrabold flex items-center justify-center shrink-0 ${collapsed ? 'lg:hidden' : ''}`}>
                      {item.badge > 9 ? '8' : item.badge}
                    </span>
                    {collapsed && (
                      <span aria-hidden="true" className="hidden lg:block absolute top-1.5 right-3 w-2 h-2 rounded-full bg-[#E8450F]" />
                    )}
                  </>
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>

      {/* User footer */}
      <div className={`px-4 py-3.5 border-t border-white/10 flex items-center gap-3 bg-black/20 shrink-0 ${collapsed ? 'lg:flex-col lg:gap-2 lg:px-2' : ''}`}>
        <div
          title={collapsed ? user?.name || 'Mercon Operator' : undefined}
          className="w-8 h-8 rounded-full bg-[#E8450F] flex items-center justify-center text-white text-xs font-bold shrink-0 border border-black/5 shadow-sm select-none"
        >
          MA
        </div>
        <div className={`flex-1 min-w-0 ${collapsed ? 'lg:hidden' : ''}`}>
          <p className="text-xs font-bold text-white truncate leading-tight">Mercon</p>
          <p className="text-[10px] text-slate-400 truncate leading-tight">Operator</p>
        </div>
        <div className={`text-slate-400 hover:text-white p-1 rounded transition-colors shrink-0 cursor-pointer ${collapsed ? 'lg:hidden' : ''}`}>
          <ChevronDown size={14} />
        </div>
      </div>
      </aside>
    </>
  );
}
