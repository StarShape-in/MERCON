import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Home, Bell, Truck, Users, Car, Building2,
  CreditCard, ReceiptText, FileText, BarChart3,
  Settings, User, LogOut, Wrench, X, MapPin, DollarSign, Trash2,
  CalendarRange, Wallet, Wand2, ChevronsLeft, ChevronsRight, FileSpreadsheet, SlidersHorizontal, FolderGit2
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

  /** Bold MERCON Orange Active Accent with Black Border */
  const getActiveAccent = () => {
    return { from: '#E8450F', to: '#FA5B25', shadow: 'rgba(232, 69, 15, 0.3)', border: '#000000' };
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
      label: '',
      items: [
        { icon: Home, label: 'Dashboard', path: '/' },
      ],
    },
    {
      label: 'FINANCE',
      items: [
        { icon: CreditCard, label: 'Rate Cards', path: '/rate-cards' },
        { icon: MapPin, label: 'Locations', path: '/locations' },
        { icon: ReceiptText, label: 'Invoices', path: '/invoices' },
        { icon: Wallet, label: 'Expenses', path: '/expenses' },
        { icon: DollarSign, label: 'Vehicle P&L', path: '/vehicles/financials' },
      ],
    },
    {
      label: 'COMPLIANCE & REPORTS',
      items: [
        { icon: FileText, label: 'Documents', path: '/documents' },
        { icon: FolderGit2, label: 'Aprodac Vault', path: '/aprodac-documents' },
        { icon: FileSpreadsheet, label: 'Company Reports', path: '/company-reports' },
        { icon: Wand2, label: 'Report Builder', path: '/report-builder' },
      ],
    },
    {
      label: 'ACCOUNT',
      items: [
        { icon: Settings, label: 'Settings', path: '/settings', end: true },
        ...(user?.role === 'Admin' ? [{ icon: Users, label: 'User Management', path: '/settings/users' }] : []),
        ...(user?.role === 'Admin' ? [{ icon: FileText, label: 'Document Types', path: '/settings/document-types' }] : []),
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
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-200 lg:hidden ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      <aside
        role="navigation"
        aria-label="Main navigation"
        className={`
          flex flex-col w-[260px] sm:w-[280px] shrink-0 h-[100dvh] lg:h-full
          bg-white border-r-2 border-slate-200 shadow-sm
          fixed inset-y-0 left-0 z-50 lg:relative lg:z-30
          transform transition-[transform,width,background-color] duration-300 ease-in-out lg:transform-none
          ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${collapsed ? 'lg:w-[76px]' : 'lg:w-[220px]'}
        `}
      >
        {/* Logo */}
        <div className={`relative flex items-center shrink-0 justify-center bg-white border-b-2 border-slate-200 h-[72px] lg:h-[88px] px-4 overflow-hidden ${collapsed ? 'lg:px-2' : ''}`}>
          {collapsed ? (
            <div className="hidden lg:flex items-center justify-center w-9 h-9 rounded-xl bg-[#E8450F] text-white font-black text-sm shadow-md shadow-[#E8450F]/20">
              M
            </div>
          ) : (
            <img src="/mercon-logo.png" alt="MERCON Logo" className="h-10 sm:h-12 w-auto max-w-full object-contain" />
          )}
          <button
            onClick={onClose}
            aria-label="Close navigation menu"
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg text-black hover:text-[#E8450F] hover:bg-orange-50 transition-colors lg:hidden cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Desktop rail toggle button */}
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
          title={`${collapsed ? 'Expand' : 'Collapse'} sidebar (⌘B)`}
          className="
            group hidden lg:flex absolute -right-3.5 top-1/2 -translate-y-1/2 z-30
            w-7 h-7 items-center justify-center rounded-full
            bg-white border-2 border-black text-black shadow-md
            before:absolute before:-inset-2 before:content-['']
            hover:bg-[#E8450F] hover:border-[#E8450F] hover:text-white
            focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8450F]
            transition-colors duration-150 cursor-pointer
          "
        >
          {collapsed ? (
            <ChevronsRight size={14} className="stroke-[2.5] transition-transform duration-150 group-hover:translate-x-px" />
          ) : (
            <ChevronsLeft size={14} className="stroke-[2.5] transition-transform duration-150 group-hover:-translate-x-px" />
          )}
        </button>

        {/* Nav groups */}
        <div className={`flex-1 py-4 space-y-4 overflow-y-auto overflow-x-hidden px-3 transition-[padding] duration-300 ease-in-out ${collapsed ? 'lg:px-2' : ''}`}>
          {groups.map((g, idx) => (
            <div key={g.label || `group-${idx}`}>
              {g.label ? (
                <p className={`text-[10px] font-black text-black uppercase tracking-wider px-3 mb-1.5 flex items-center gap-1.5 ${collapsed ? 'lg:hidden' : ''}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E8450F] shrink-0" />
                  <span>{g.label}</span>
                </p>
              ) : null}
              <div className="space-y-0.5">
                {g.items.map((item: any) => {
                  const isActive = isItemActive(item.path, item.end);
                  const accent = isActive ? getActiveAccent() : null;
                  return (
                    <NavLink
                      key={item.label}
                      to={item.path}
                      onClick={onClose}
                      title={collapsed ? item.label : undefined}
                      className={`
                        flex items-center gap-2.5 px-3 py-2.5 lg:py-2 rounded-lg cursor-pointer transition-all duration-150 group relative border-l-[3px]
                        ${collapsed ? 'lg:justify-center lg:px-2' : ''}
                        ${isActive
                          ? 'text-white font-black'
                          : 'text-black hover:bg-orange-50 hover:text-[#E8450F] font-bold border-transparent hover:border-[#E8450F]'
                        }
                      `}
                      style={isActive && accent ? {
                        background: `linear-gradient(135deg, ${accent.from}, ${accent.to})`,
                        boxShadow: `0 4px 12px ${accent.shadow}`,
                        borderColor: accent.border,
                      } : undefined}
                    >
                      <item.icon
                        size={16}
                        className={`transition-transform duration-150 group-hover:scale-110 shrink-0 ${
                          isActive ? 'stroke-[2.5] text-white' : 'stroke-[2.2] text-black group-hover:text-[#E8450F]'
                        }`}
                      />
                      <span className={`text-xs flex-1 truncate ${collapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
                      {item.badge !== undefined && item.badge > 0 && !isActive && (
                        <span className={`w-4 h-4 rounded-full bg-black text-[#E8450F] text-[9px] font-black flex items-center justify-center animate-pulse shrink-0 border border-[#E8450F] ${collapsed ? 'lg:hidden' : ''}`}>
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
        <div className={`px-4 py-3.5 border-t-2 border-slate-200 flex items-center gap-2.5 bg-orange-50/60 shrink-0 ${collapsed ? 'lg:flex-col lg:gap-2 lg:px-2' : ''}`}>
          <div
            title={collapsed ? user?.name || (isAdmin ? 'Admin User' : 'Mohammed Al-Harbi') : undefined}
            className="w-8 h-8 rounded-full bg-black text-[#E8450F] flex items-center justify-center text-xs font-black shrink-0 border-2 border-[#E8450F] shadow-sm select-none"
          >
            {initials}
          </div>
          <div className={`flex-1 min-w-0 ${collapsed ? 'lg:hidden' : ''}`}>
            <p className="text-xs font-black text-black truncate">{user?.name || (isAdmin ? 'Admin User' : 'Mohammed Al-Harbi')}</p>
            <p className="text-[9.5px] font-bold text-slate-700 truncate">{user?.email || (isAdmin ? 'admin@mercon.sa' : 'operator@mercon.sa')}</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-black hover:text-[#E8450F] p-1.5 rounded-lg hover:bg-orange-100 transition-colors shrink-0 cursor-pointer"
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>
    </>
  );
}


