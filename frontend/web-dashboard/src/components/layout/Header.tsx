import { useState, useRef, useEffect } from 'react';
import { 
  Bell, 
  ChevronDown, 
  User, 
  Settings, 
  LogOut, 
  Truck, 
  Users, 
  Menu, 
  ArrowLeft, 
  CalendarRange, 
  Car, 
  Building2, 
  Wrench, 
  Plus,
  FileText,
  Receipt,
} from 'lucide-react';
import { Link, useNavigate, useLocation, NavLink } from 'react-router-dom';
import { authStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface HeaderProps {
  title?: string;
  breadcrumb?: string;
  hideBackButton?: boolean;
  /** Opens the off-canvas sidebar — only rendered below lg */
  onMenuClick?: () => void;
}

const operationsItems = [
  {
    label: 'Trips',
    path: '/trips?view=kanban',
    icon: Truck,
    iconColor: 'text-orange-500 dark:text-orange-400',
    activeClass: 'text-orange-600 dark:text-orange-400 bg-orange-50/90 dark:bg-orange-950/40 font-extrabold',
    hoverClass: 'hover:bg-orange-50/70 dark:hover:bg-orange-950/30 hover:text-orange-600 dark:hover:text-orange-400',
    accentColor: 'bg-orange-600 dark:bg-orange-500',
  },
  {
    label: 'Monthly Trips',
    path: '/trips/monthly',
    icon: CalendarRange,
    iconColor: 'text-purple-600 dark:text-purple-400',
    activeClass: 'text-purple-600 dark:text-purple-400 bg-purple-50/90 dark:bg-purple-950/40 font-extrabold',
    hoverClass: 'hover:bg-purple-50/70 dark:hover:bg-purple-950/30 hover:text-purple-600 dark:hover:text-purple-400',
    accentColor: 'bg-purple-600 dark:bg-purple-500',
  },
  {
    label: 'Drivers',
    path: '/drivers',
    icon: Users,
    iconColor: 'text-emerald-500 dark:text-emerald-400',
    activeClass: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50/90 dark:bg-emerald-950/40 font-extrabold',
    hoverClass: 'hover:bg-emerald-50/70 dark:hover:bg-emerald-950/30 hover:text-emerald-600 dark:hover:text-emerald-400',
    accentColor: 'bg-emerald-600 dark:bg-emerald-500',
  },
  {
    label: 'Vehicles',
    path: '/vehicles',
    icon: Car,
    iconColor: 'text-blue-500 dark:text-blue-400',
    activeClass: 'text-blue-600 dark:text-blue-400 bg-blue-50/90 dark:bg-blue-950/40 font-extrabold',
    hoverClass: 'hover:bg-blue-50/70 dark:hover:bg-blue-950/30 hover:text-blue-600 dark:hover:text-blue-400',
    accentColor: 'bg-blue-600 dark:bg-blue-500',
  },
  {
    label: '3rd Party Fleet',
    path: '/third-party',
    icon: Building2,
    iconColor: 'text-teal-600 dark:text-teal-400',
    activeClass: 'text-teal-600 dark:text-teal-400 bg-teal-50/90 dark:bg-teal-950/40 font-extrabold',
    hoverClass: 'hover:bg-teal-50/70 dark:hover:bg-teal-950/30 hover:text-teal-600 dark:hover:text-teal-400',
    accentColor: 'bg-teal-600 dark:bg-teal-500',
  },
  {
    label: 'Maintenance',
    path: '/maintenance',
    icon: Wrench,
    iconColor: 'text-rose-500 dark:text-rose-400',
    activeClass: 'text-rose-600 dark:text-rose-400 bg-rose-50/90 dark:bg-rose-950/40 font-extrabold',
    hoverClass: 'hover:bg-rose-50/70 dark:hover:bg-rose-950/30 hover:text-rose-600 dark:hover:text-rose-400',
    accentColor: 'bg-rose-600 dark:bg-rose-500',
  },
  {
    label: 'Customers',
    path: '/customers',
    icon: Building2,
    iconColor: 'text-blue-600 dark:text-blue-400',
    activeClass: 'text-blue-600 dark:text-blue-400 bg-blue-50/90 dark:bg-blue-950/40 font-extrabold',
    hoverClass: 'hover:bg-blue-50/70 dark:hover:bg-blue-950/30 hover:text-blue-600 dark:hover:text-blue-400',
    accentColor: 'bg-blue-600 dark:bg-blue-500',
  },
];

export default function Header({ title, breadcrumb, hideBackButton, onMenuClick }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = authStore.getUser();
  const isAdmin = user?.role === 'Admin';
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isDashboard = location.pathname === '/' || title === 'Dashboard' || !!hideBackButton;
  const initials = user?.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : (isAdmin ? 'AD' : 'OP');

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global Keyboard Shortcut: Alt + T or Alt + N opens Create New Trip Modal from any page
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const key = e.key.toLowerCase();
        if (key === 't' || key === 'n' || e.code === 'KeyT' || e.code === 'KeyN') {
          e.preventDefault();
          navigate('/trips/new');
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const handleLogout = () => {
    authStore.clearSession();
    navigate('/login');
  };

  const isItemActive = (itemPath: string) => {
    const currentPath = location.pathname;
    if (itemPath === '/vehicles') {
      return currentPath.startsWith('/vehicles') && !currentPath.includes('/financials');
    }
    if (itemPath.startsWith('/trips') && !itemPath.includes('/monthly')) {
      return currentPath === '/trips' || (currentPath.startsWith('/trips/') && !currentPath.startsWith('/trips/monthly'));
    }
    return currentPath === itemPath || currentPath.startsWith(itemPath + '/');
  };

  return (
    <div className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 relative z-20 flex flex-col">
      {/* Primary Top Header Row */}
      <div className="px-3 sm:px-4 lg:px-6 h-[72px] lg:h-[88px] flex items-center justify-between gap-2 sm:gap-4">

        {/* Mobile: hamburger + back button + current page title */}
        <div className="flex items-center gap-2.5 min-w-0 lg:hidden">
          <button
            onClick={onMenuClick}
            aria-label="Open navigation menu"
            className="p-2 -ml-1 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
          >
            <Menu size={20} />
          </button>
          {!isDashboard && (
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 rounded-lg text-brand dark:text-orange-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all shrink-0 cursor-pointer shadow-2xs"
              title="Go Back"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate leading-tight">
              {title || 'MERCON'}
            </p>
            {breadcrumb && (
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate leading-tight">{breadcrumb}</p>
            )}
          </div>
        </div>

        {/* Desktop Left: Back button & Page Title */}
        <div className="hidden lg:flex items-center gap-2.5 min-w-0 lg:flex-1">
          {!isDashboard && (
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:text-brand dark:hover:text-brand transition-all cursor-pointer border border-slate-200 dark:border-slate-700 hover:border-brand/40 dark:hover:border-brand/40 shadow-2xs shrink-0 group"
              title="Go Back"
            >
              <ArrowLeft size={14} className="text-brand dark:text-orange-400 transition-transform group-hover:-translate-x-0.5 shrink-0" />
              <span>Back</span>
            </button>
          )}
          {title && (
            <div className="flex items-center gap-1.5 min-w-0">
              {!isDashboard && <span className="text-slate-300 dark:text-slate-600 font-light shrink-0">/</span>}
              <h1 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm xl:text-base tracking-tight truncate" title={title}>{title}</h1>
            </div>
          )}
        </div>

        {/* Desktop Center: Operations Routes Navigation Bar */}
        <div className="hidden lg:flex items-center justify-center lg:flex-1">
          <div className="flex items-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs divide-x divide-slate-100 dark:divide-slate-800/80 overflow-hidden">
            {operationsItems.map((item) => {
              const isActive = isItemActive(item.path);
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`
                    relative inline-flex items-center gap-2 px-3.5 xl:px-4 py-2.5 text-xs font-bold transition-all duration-150 shrink-0 whitespace-nowrap cursor-pointer select-none
                    ${isActive 
                      ? item.activeClass 
                      : `text-slate-700 dark:text-slate-200 ${item.hoverClass}`
                    }
                  `}
                >
                  {isActive && (
                    <span className={`absolute bottom-0 left-3 right-3 h-[3px] ${item.accentColor} rounded-t-full`} />
                  )}
                  <Icon size={16} className={item.iconColor} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        </div>

        {/* Right Side: Notifications & User Profile */}
        <div className="flex items-center gap-2 sm:gap-3 justify-end lg:flex-1 shrink-0">
          {/* More Actions Dropdown Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 text-xs font-semibold border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 shadow-xs rounded-2xl transition-colors cursor-pointer"
                title="More Actions"
              >
                <Plus size={14} className="text-brand dark:text-orange-400" />
                <span>More</span>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 p-1.5 shadow-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl">
              <DropdownMenuLabel className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-2 py-1">
                Quick Workflows
              </DropdownMenuLabel>
              <DropdownMenuItem onClick={() => navigate('/vehicles/new')} className="cursor-pointer text-xs font-semibold py-1.5 px-2 rounded-md">
                <Truck className="w-3.5 h-3.5 mr-2 text-blue-600" /> Register Vehicle
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/drivers/new')} className="cursor-pointer text-xs font-semibold py-1.5 px-2 rounded-md">
                <Users className="w-3.5 h-3.5 mr-2 text-emerald-600" /> Onboard Driver
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1 bg-slate-200/50 dark:bg-slate-800" />
              <DropdownMenuItem onClick={() => navigate('/rate-cards')} className="cursor-pointer text-xs font-semibold py-1.5 px-2 rounded-md">
                <FileText className="w-3.5 h-3.5 mr-2 text-brand" /> Create Rate Card
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/invoices/new')} className="cursor-pointer text-xs font-semibold py-1.5 px-2 rounded-md">
                <Receipt className="w-3.5 h-3.5 mr-2 text-purple-600" /> Generate Invoice
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notifications trigger */}
          <Link to="/notifications" className="relative group">
            <div className="w-9 h-9 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center transition-colors border border-slate-200/90 dark:border-slate-800 shadow-xs">
              <Bell size={16} className="text-slate-600 dark:text-slate-300" />
            </div>
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-orange-600 text-white text-[9px] font-black flex items-center justify-center ring-2 ring-white dark:ring-slate-900 shadow-xs">
              8
            </span>
          </Link>
        </div>

      </div>

      {/* Mobile Operations Navigation Horizontal Scroll Strip */}
      <div className="flex lg:hidden items-center gap-1.5 px-3 py-2 overflow-x-auto no-scrollbar border-t border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 divide-x divide-slate-100 dark:divide-slate-800/80">
        {operationsItems.map((item) => {
          const isActive = isItemActive(item.path);
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`
                relative inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all shrink-0 whitespace-nowrap cursor-pointer
                ${isActive 
                  ? item.activeClass 
                  : `text-slate-700 dark:text-slate-200 ${item.hoverClass}`
                }
              `}
            >
              {isActive && (
                <span className={`absolute bottom-0 left-2 right-2 h-[2.5px] ${item.accentColor} rounded-t-full`} />
              )}
              <Icon size={13} className={item.iconColor} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>

    </div>
  );
}
