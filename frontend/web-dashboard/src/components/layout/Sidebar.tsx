import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Home, Bell, Truck, Users, Car, Building2,
  CreditCard, ReceiptText, FileText, BarChart3,
  Settings, User, LogOut, Wrench, X, MapPin, DollarSign, Trash2,
  CalendarRange, Wallet, Wand2, ChevronsLeft, ChevronsRight, FileSpreadsheet
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
  const isAdmin = user?.role === 'Admin';
  const initials = user?.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : (isAdmin ? 'AD' : 'OP');

  const isItemActive = (itemPath: string, itemEnd?: boolean) => {
    const currentPath = location.pathname;
    if (itemPath === '/vehicles') {
      return currentPath.startsWith('/vehicles') && !currentPath.includes('/financials');
    }
    if (itemPath === '/vehicles/financials') {
      return currentPath.includes('/financials');
    }
    if (itemPath === '/trips') {
      return currentPath === '/trips' || (currentPath.startsWith('/trips/') && !currentPath.startsWith('/trips/monthly'));
    }
    if (itemEnd || itemPath === '/') {
      return currentPath === itemPath;
    }
    return currentPath === itemPath || currentPath.startsWith(itemPath + '/');
  };

  const handleLogout = () => {
    authStore.clearSession();
    navigate('/login');
  };

  const { data: notificationsRes } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationService.getAll,
    refetchInterval: 60000,
  });

  const unreadCount = notificationsRes?.data?.filter((n: any) => !n.is_read).length || 0;

  const groups = [
    {
      label: 'OVERVIEW',
      color: 'text-[#E8450F]',
      items: [
        { icon: Home, label: 'Dashboard', path: '/' },
        { icon: Bell, label: 'Notifications', path: '/notifications', badge: unreadCount },
      ],
    },
    {
      label: 'OPERATIONS',
      color: 'text-[#D9531E]',
      items: [
        { icon: Truck, label: 'Trips', path: '/trips' },
        { icon: CalendarRange, label: 'Monthly Trips', path: '/trips/monthly' },
        { icon: Users, label: 'Drivers', path: '/drivers' },
        { icon: Car, label: 'Vehicles', path: '/vehicles' },
        { icon: Building2, label: 'Third-Party Fleet', path: '/third-party' },
        { icon: Wrench, label: 'Maintenance', path: '/maintenance' },
        { icon: Building2, label: 'Customers', path: '/customers' },
      ],
    },
    {
      label: 'FINANCE',
      color: 'text-[#C44916]',
      items: [
        { icon: CreditCard, label: 'Rate Cards', path: '/rate-cards' },
        { icon: MapPin, label: 'Locations', path: '/locations' },
        { icon: ReceiptText, label: 'Invoices', path: '/invoices' },
        { icon: Wallet, label: 'Expenses', path: '/expenses' },
        { icon: DollarSign, label: 'Vehicle P&L', path: '/vehicles/financials' },
      ],
    },
    {
      label: 'COMPLIANCE',
      color: 'text-[#E0602B]',
      items: [
        { icon: FileText, label: 'Documents', path: '/documents' },
        { icon: BarChart3, label: 'Reports', path: '/reports' },
        { icon: FileSpreadsheet, label: 'Company Reports', path: '/company-reports' },
        { icon: Wand2, label: 'Report Builder', path: '/report-builder' },
      ],
    },
    {
      label: 'ACCOUNT',
      color: 'text-[#B05C28]',
      items: [
        { icon: Settings, label: 'Settings', path: '/settings', end: true },
        { icon: User, label: 'Profile', path: '/settings/profile' },
        ...(user?.role === 'Admin' ? [{ icon: Users, label: 'User Management', path: '/settings/users' }] : []),
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
          bg-[#FAF6F0] border-r border-[#EAE3D9] shadow-xs
          fixed inset-y-0 left-0 z-50 lg:relative lg:z-30
          transform transition-[transform,width] duration-300 ease-in-out lg:transform-none
          ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${collapsed ? 'lg:w-[76px]' : 'lg:w-[220px]'}
        `}
      >
        {/* Logo */}
        <div className={`relative flex items-center shrink-0 justify-center bg-[#FAF6F0] border-b border-[#EAE3D9] h-[72px] lg:h-[88px] overflow-hidden ${collapsed ? 'lg:px-2' : ''}`}>
          {collapsed ? (
            <div className="hidden lg:flex items-center justify-center w-8 h-8 rounded-xl bg-[#E8450F] text-white font-black text-sm shadow-md shadow-[#E8450F]/20">
              M
            </div>
          ) : null}
          <img src="/navbar-logo-final.png" alt="MERCON Logo" className={`w-full h-full object-contain scale-[2.5] origin-center ${collapsed ? 'lg:hidden' : ''}`} />
          <button
            onClick={onClose}
            aria-label="Close navigation menu"
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg text-[#7A6E5F] hover:text-[#E8450F] hover:bg-[#F2ECE1] transition-colors lg:hidden cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/*
          Desktop rail toggle button. Sits in the vertical middle of the sidebar's right edge,
          matching the exact same design and feel as ImportantReminders in warm theme.
        */}
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
          title={`${collapsed ? 'Expand' : 'Collapse'} sidebar (⌘B)`}
          className="
            group hidden lg:flex absolute -right-3.5 top-1/2 -translate-y-1/2 z-30
            w-7 h-7 items-center justify-center rounded-full
            bg-white border border-[#E5DDD0] text-[#7A6E5F] shadow-sm
            before:absolute before:-inset-2 before:content-['']
            hover:bg-[#E8450F] hover:border-[#E8450F] hover:text-white
            focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8450F]
            transition-colors duration-150 cursor-pointer
          "
        >
          {collapsed ? (
            <ChevronsRight size={14} className="stroke-[2.25] transition-transform duration-150 group-hover:translate-x-px" />
          ) : (
            <ChevronsLeft size={14} className="stroke-[2.25] transition-transform duration-150 group-hover:-translate-x-px" />
          )}
        </button>

        {/* Nav groups */}
        <div className={`flex-1 py-4 space-y-5 overflow-y-auto overflow-x-hidden px-3 transition-[padding] duration-300 ease-in-out ${collapsed ? 'lg:px-2' : ''}`}>
          {groups.map((g) => (
            <div key={g.label}>
              <p className={`text-[9.5px] font-extrabold ${g.color} uppercase tracking-wider px-3 mb-1.5 ${collapsed ? 'lg:hidden' : ''}`}>
                {g.label}
              </p>
              <div className="space-y-0.5">
                {g.items.map((item: any) => {
                  const isActive = isItemActive(item.path, item.end);
                  return (
                    <NavLink
                      key={item.label}
                      to={item.path}
                      onClick={onClose}
                      title={collapsed ? item.label : undefined}
                      className={`
                        flex items-center gap-2.5 px-3 py-2.5 lg:py-2 rounded-lg cursor-pointer transition-all duration-150 group relative border-l-2
                        ${collapsed ? 'lg:justify-center lg:px-2' : ''}
                        ${isActive
                          ? 'bg-gradient-to-r from-[#E8450F] to-[#FA5B25] text-white shadow-md shadow-[#E8450F]/20 font-bold border-[#C7380A]'
                          : 'text-[#4A3E31] hover:bg-[#FFF4EC] hover:text-[#C7380A] font-semibold border-transparent hover:border-[#E8450F]'
                        }
                      `}
                    >
                      <item.icon
                        size={16}
                        className={`transition-transform duration-150 group-hover:scale-110 shrink-0 ${
                          isActive ? 'stroke-[2.2] text-white' : `${g.color} group-hover:text-[#E8450F] stroke-[1.8]`
                        }`}
                      />
                      <span className={`text-xs flex-1 truncate ${collapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
                      {item.badge !== undefined && item.badge > 0 && !isActive && (
                        <span className={`w-4 h-4 rounded-full bg-[#E8450F] text-white text-[9px] font-bold flex items-center justify-center animate-pulse shrink-0 ${collapsed ? 'lg:hidden' : ''}`}>
                          {item.badge > 9 ? '9+' : item.badge}
                        </span>
                      )}
                      {collapsed && item.badge !== undefined && item.badge > 0 && !isActive && (
                        <span aria-hidden="true" className="hidden lg:block absolute top-1.5 right-2 w-2 h-2 rounded-full bg-[#E8450F] animate-pulse" />
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* User footer */}
        <div className={`px-4 py-3.5 border-t border-[#EAE3D9] flex items-center gap-2.5 bg-[#F2ECE1]/70 shrink-0 ${collapsed ? 'lg:flex-col lg:gap-2 lg:px-2' : ''}`}>
          <div
            title={collapsed ? user?.name || (isAdmin ? 'Admin User' : 'Mohammed Al-Harbi') : undefined}
            className="w-8 h-8 rounded-full bg-[#E8450F] flex items-center justify-center text-white text-xs font-bold shrink-0 border border-black/5 shadow-sm shadow-[#E8450F]/20 select-none"
          >
            {initials}
          </div>
          <div className={`flex-1 min-w-0 ${collapsed ? 'lg:hidden' : ''}`}>
            <p className="text-xs font-semibold text-[#3B332B] truncate">{user?.name || (isAdmin ? 'Admin User' : 'Mohammed Al-Harbi')}</p>
            <p className="text-[9px] text-[#7A6E5F] truncate">{user?.email || (isAdmin ? 'admin@mercon.sa' : 'operator@mercon.sa')}</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-[#8C7D6B] hover:text-[#E8450F] p-1 rounded-lg hover:bg-[#E8DFD1] transition-colors shrink-0 cursor-pointer"
            title="Logout"
          >
            <LogOut size={14} />
          </button>
        </div>
      </aside>
    </>
  );
}
