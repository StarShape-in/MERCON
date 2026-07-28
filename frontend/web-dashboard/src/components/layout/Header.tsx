import { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  Bell, 
  ChevronDown, 
  User, 
  Settings, 
  LogOut, 
  Building2, 
  Plus, 
  LayoutDashboard, 
  Truck, 
  Users, 
  FileText, 
  CreditCard, 
  PieChart, 
  Receipt 
} from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { authStore } from '@/store/authStore';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HeaderProps {
  title?: string;
  breadcrumb?: string;
}

export default function Header({ title, breadcrumb }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = authStore.getUser();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [scope, setScope] = useState('MERCON Logistics');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const initials = user?.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'OP';
  const firstName = user?.name ? user.name.split(' ')[0] : 'Operator';

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    authStore.clearSession();
    navigate('/login');
  };

  const navRoutes = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Trips', path: '/trips', icon: Truck },
    { label: 'Vehicles', path: '/vehicles', icon: Truck },
    { label: 'Drivers', path: '/drivers', icon: Users },
    { label: 'Rate Cards', path: '/rate-cards', icon: FileText },
    { label: 'Customers', path: '/customers', icon: Building2 },
    { label: 'Invoices', path: '/invoices', icon: Receipt },
    { label: 'Reports', path: '/reports', icon: PieChart },
  ];

  return (
    <div className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 h-[56px] flex items-center justify-between gap-4 relative z-20 overflow-x-auto">
      
      {/* Left & Center: Scope Pill Selector + Horizontal Route Navigation Hub */}
      <div className="flex items-center gap-3 shrink-0">
        
        {/* Scope Context Selector Pill */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-extrabold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all shadow-2xs">
              <Building2 className="w-3.5 h-3.5 text-[#E8450F]" />
              <span className="truncate max-w-[130px]">{scope}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 p-1.5 shadow-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl">
            <DropdownMenuLabel className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-2 py-1">
              Operating Scope
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setScope('MERCON Logistics')} className="cursor-pointer text-xs font-semibold py-1.5 px-2 rounded-md">
              🏢 MERCON Logistics (Primary)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setScope('MERCON Freight')} className="cursor-pointer text-xs font-semibold py-1.5 px-2 rounded-md">
              🚛 MERCON Freight Commercial
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setScope('MERCON Fleet Ops')} className="cursor-pointer text-xs font-semibold py-1.5 px-2 rounded-md">
              🔧 MERCON Fleet Operations
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* HORIZONTAL ROUTE PILL BAR */}
        <div className="bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl flex items-center gap-1 border border-slate-200/80 dark:border-slate-700">
          {navRoutes.map((route) => {
            const isActive = location.pathname === route.path || (route.path !== '/dashboard' && location.pathname.startsWith(route.path));
            const Icon = route.icon;
            
            return (
              <Link
                key={route.path}
                to={route.path}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  isActive 
                    ? 'bg-[#E8450F] text-white shadow-2xs font-bold' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white dark:hover:bg-slate-900'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{route.label}</span>
              </Link>
            );
          })}

          {/* Quick Create Dropdown Pill */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-[#E8450F] transition-all shadow-2xs ml-1"
                title="Quick Create Action"
              >
                <Plus className="w-3.5 h-3.5 text-[#E8450F]" />
                <span>New</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 p-1.5 shadow-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl">
              <DropdownMenuLabel className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-2 py-1">
                Quick Create Workflows
              </DropdownMenuLabel>
              <DropdownMenuItem onClick={() => navigate('/trips/new')} className="cursor-pointer text-xs font-semibold py-1.5 px-2 rounded-md">
                <Truck className="w-3.5 h-3.5 mr-2 text-indigo-600" /> New Dispatch Trip
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/vehicles/new')} className="cursor-pointer text-xs font-semibold py-1.5 px-2 rounded-md">
                <Truck className="w-3.5 h-3.5 mr-2 text-blue-600" /> Register Vehicle
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/drivers/new')} className="cursor-pointer text-xs font-semibold py-1.5 px-2 rounded-md">
                <Users className="w-3.5 h-3.5 mr-2 text-emerald-600" /> Onboard Driver
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1 bg-slate-100 dark:bg-slate-800" />
              <DropdownMenuItem onClick={() => navigate('/rate-cards/new')} className="cursor-pointer text-xs font-semibold py-1.5 px-2 rounded-md">
                <FileText className="w-3.5 h-3.5 mr-2 text-[#E8450F]" /> Create Rate Card
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/invoices/new')} className="cursor-pointer text-xs font-semibold py-1.5 px-2 rounded-md">
                <Receipt className="w-3.5 h-3.5 mr-2 text-purple-600" /> Generate Invoice
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

        </div>

      </div>

      {/* Right Side Controls */}
      <div className="flex items-center gap-3 shrink-0">
        
        {/* Global Search box */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 w-52 border border-slate-200 dark:border-slate-700">
          <Search size={13} className="text-slate-400" />
          <input 
            type="text" 
            placeholder="Search anything…" 
            className="bg-transparent border-none outline-none text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 w-full font-medium"
          />
        </div>

        {/* Notifications trigger */}
        <Link to="/notifications" className="relative group">
          <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors border border-slate-200 dark:border-slate-700">
            <Bell size={15} className="text-slate-600 dark:text-slate-300" />
          </div>
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#E8450F] text-white text-[9px] font-extrabold flex items-center justify-center shadow-2xs">
            5
          </span>
        </Link>

        {/* User profile dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
          >
            <div className="w-5 h-5 rounded-full bg-[#E8450F] flex items-center justify-center text-white text-[9px] font-black select-none">
              {initials}
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 max-w-[80px] truncate">{firstName}</span>
            <ChevronDown size={12} className={`text-slate-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-1.5 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg py-1.5 animate-fade-in origin-top-right z-50">
              <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                <p className="text-xs font-extrabold text-slate-900 dark:text-slate-100 truncate">{user?.name || 'Mohammed Al-Harbi'}</p>
                <p className="text-[10px] text-slate-500 truncate">{user?.role || 'Operator'}</p>
              </div>
              
              <Link 
                to="/settings/profile" 
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <User size={14} className="text-slate-400" />
                My Profile
              </Link>
              
              <Link 
                to="/settings" 
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <Settings size={14} className="text-slate-400" />
                Settings
              </Link>

              <div className="border-t border-slate-100 dark:border-slate-800 mt-1.5 pt-1.5">
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                >
                  <LogOut size={14} />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
