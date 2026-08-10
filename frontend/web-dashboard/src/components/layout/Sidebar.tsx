import { NavLink, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Home, Bell, Truck, Users, Car, Building2,
  CreditCard, ReceiptText, FileText, BarChart3,
  Settings, User, LogOut, Wrench, X, MapPin, DollarSign, Trash2,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { authStore } from '@/store/authStore';
import { notificationService } from '@/services/notificationService';

interface SidebarProps {
  active?: string;
  /** Mobile drawer open state — ignored at lg and above, where the sidebar is always visible */
  open?: boolean;
  onClose?: () => void;
  /** Desktop-only rail mode — collapses to an icon strip at lg and above. Mobile drawer is unaffected. */
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function Sidebar({ active, open = false, onClose, collapsed = false, onToggleCollapse }: SidebarProps) {
  const navigate = useNavigate();
  const user = authStore.getUser();
  const initials = user?.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'OP';

  const handleLogout = () => {
    authStore.clearSession();
    navigate('/login');
  };

  const { data: notificationsRes } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationService.getAll,
    refetchInterval: 60000, // Poll every minute
  });

  const unreadCount = notificationsRes?.data?.filter((n: any) => !n.is_read).length || 0;

  const groups = [
    {
      label: 'OVERVIEW',
      items: [
        { icon: Home, label: 'Dashboard', path: '/' },
        { icon: Bell, label: 'Notifications', path: '/notifications', badge: unreadCount },
      ],
    },
    {
      label: 'OPERATIONS',
      items: [
        { icon: Truck, label: 'Trips', path: '/trips' },
        { icon: Users, label: 'Drivers', path: '/drivers' },
        { icon: Car, label: 'Vehicles', path: '/vehicles' },
        { icon: Wrench, label: 'Maintenance', path: '/maintenance' },
        { icon: Building2, label: 'Customers', path: '/customers' },
      ],
    },
    {
      label: 'FINANCE',
      items: [
        { icon: CreditCard, label: 'Rate Cards', path: '/rate-cards' },
        // Sits with Rate Cards rather than Operations: a location exists to be
        // one end of a priced lane, and that's where you go to fix one.
        { icon: MapPin, label: 'Locations', path: '/locations' },
        { icon: ReceiptText, label: 'Invoices', path: '/invoices' },
        { icon: DollarSign, label: 'Vehicle P&L', path: '/vehicles/financials' },
      ],
    },
    {
      label: 'COMPLIANCE',
      items: [
        { icon: FileText, label: 'Documents', path: '/documents' },
        { icon: BarChart3, label: 'Reports', path: '/reports' },
      ],
    },
    {
      label: 'ACCOUNT',
      items: [
        { icon: Settings, label: 'Settings', path: '/settings', end: true },
        { icon: User, label: 'Profile', path: '/settings/profile' },
        ...(user?.role === 'Admin' || user?.role === 'Operator' ? [{ icon: Users, label: 'User Management', path: '/settings/users' }] : []),
        { icon: Trash2, label: 'Recycle Bin', path: '/recycle-bin' },
      ],
    },
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
          fixed inset-y-0 left-0 z-50 lg:relative lg:z-auto
          transform transition-[transform,width] duration-300 ease-in-out lg:transform-none
          ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${collapsed ? 'lg:w-[76px]' : 'lg:w-[220px]'}
        `}
      >
      {/* Desktop collapse toggle — rides the outer edge of the rail */}
      <button
        onClick={onToggleCollapse}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-expanded={!collapsed}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="hidden lg:flex absolute -right-3 top-[104px] z-50 w-6 h-6 items-center justify-center rounded-full bg-[#18181B] border border-white/15 text-white/70 hover:text-white hover:bg-[#E8450F] hover:border-[#E8450F] shadow-md transition-colors cursor-pointer"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

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

      {/* Nav groups */}
      <div className={`flex-1 py-4 space-y-5 overflow-y-auto overflow-x-hidden px-3 transition-[padding] duration-300 ease-in-out ${collapsed ? 'lg:px-2' : ''}`}>
        {groups.map((g) => (
          <div key={g.label}>
            <p className={`text-[9px] font-bold text-white/50 uppercase tracking-widest px-3 mb-2 whitespace-nowrap ${collapsed ? 'lg:hidden' : ''}`}>
              {g.label}
            </p>
            {collapsed && <div aria-hidden="true" className="hidden lg:block h-px bg-white/10 mx-2 mb-2" />}
            <div className="space-y-0.5">
              {g.items.map((item: any) => (
                <NavLink
                  key={item.label}
                  to={item.path}
                  end={item.end ?? item.path === '/'}
                  onClick={onClose}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) => `
                    relative flex items-center gap-2.5 px-3 py-2.5 lg:py-2 rounded-lg cursor-pointer transition-all duration-150 group
                    ${collapsed ? 'lg:justify-center lg:px-0' : ''}
                    ${isActive
                      ? 'bg-[#E8450F] text-white shadow-sm shadow-[#E8450F]/15'
                      : 'text-white/60 hover:bg-white/5 hover:text-white'
                    }
                  `}
                >
                  {({ isActive }) => (
                    <>
                      <item.icon
                        size={16}
                        className={`shrink-0 transition-transform duration-150 group-hover:scale-105 ${isActive ? 'stroke-[2.2]' : 'stroke-[1.7]'}`}
                      />
                      <span className={`text-xs font-semibold flex-1 whitespace-nowrap ${collapsed ? 'lg:hidden' : ''}`}>
                        {item.label}
                      </span>
                      {item.badge !== undefined && item.badge > 0 && !isActive && (
                        <>
                          <span className={`w-4 h-4 rounded-full bg-[#E8450F] text-white text-[9px] font-bold flex items-center justify-center animate-pulse shrink-0 ${collapsed ? 'lg:hidden' : ''}`}>
                            {item.badge > 9 ? '9+' : item.badge}
                          </span>
                          {collapsed && (
                            <span aria-hidden="true" className="hidden lg:block absolute top-1.5 right-3 w-2 h-2 rounded-full bg-[#E8450F] animate-pulse" />
                          )}
                        </>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* User footer */}
      <div className={`px-4 py-3.5 border-t border-white/10 flex items-center gap-2.5 bg-black/20 shrink-0 ${collapsed ? 'lg:flex-col lg:gap-2 lg:px-2' : ''}`}>
        <div
          title={collapsed ? user?.name || 'Mohammed Al-Harbi' : undefined}
          className="w-8 h-8 rounded-full bg-[#E8450F] flex items-center justify-center text-white text-xs font-bold shrink-0 border border-black/5 shadow-sm shadow-[#E8450F]/20 select-none"
        >
          {initials}
        </div>
        <div className={`flex-1 min-w-0 ${collapsed ? 'lg:hidden' : ''}`}>
          <p className="text-xs font-semibold text-white truncate">{user?.name || 'Mohammed Al-Harbi'}</p>
          <p className="text-[9px] text-white/50 truncate">{user?.email || 'operator@mercon.sa'}</p>
        </div>
        <button
          onClick={handleLogout}
          className="text-white/50 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
          title="Logout"
        >
          <LogOut size={14} />
        </button>
      </div>
      </aside>
    </>
  );
}
