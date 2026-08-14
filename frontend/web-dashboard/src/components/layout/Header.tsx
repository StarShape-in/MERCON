import { useState, useRef, useEffect } from 'react';
import { 
  Bell, 
  ChevronDown, 
  User, 
  Settings, 
  LogOut, 
  Plus, 
  Truck, 
  Users, 
  FileText, 
  Receipt,
  Menu,
  FilePlus,
  ArrowLeft
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
import CreateTripModal from '@/components/trips/CreateTripModal';

interface HeaderProps {
  title?: string;
  breadcrumb?: string;
  hideBackButton?: boolean;
  /** Opens the off-canvas sidebar — only rendered below lg */
  onMenuClick?: () => void;
}

export default function Header({ title, breadcrumb, hideBackButton, onMenuClick }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = authStore.getUser();
  const isAdmin = user?.role === 'Admin';
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isCreateTripOpen, setIsCreateTripOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isDashboard = location.pathname === '/' || title === 'Dashboard' || !!hideBackButton;
  const initials = user?.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : (isAdmin ? 'AD' : 'OP');
  const firstName = user?.name ? user.name.split(' ')[0] : (isAdmin ? 'Admin' : 'Operator');

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
          setIsCreateTripOpen(true);
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

  return (
    <div className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 sm:px-4 lg:px-6 h-[56px] lg:h-[62px] flex items-center justify-between gap-2 sm:gap-4 relative z-20">

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
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
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

      {/* Desktop Left: Back button & Page Title — the sidebar rail toggle lives on the sidebar edge */}
      <div className="hidden lg:flex items-center gap-3 min-w-0">
        {!isDashboard && (
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer border border-slate-200/80 dark:border-slate-700 shadow-2xs"
            title="Go Back"
          >
            <ArrowLeft size={14} className="text-slate-500 dark:text-slate-400" />
            <span>Back</span>
          </button>
        )}
        {title && (
          <div className="flex items-center gap-2">
            {!isDashboard && <span className="text-slate-300 dark:text-slate-600 font-light">/</span>}
            <h1 className="font-extrabold text-slate-900 dark:text-slate-100 text-lg tracking-tight truncate max-w-[260px]">{title}</h1>
          </div>
        )}
      </div>

      {/* Right Side: Quick Action Buttons in Refined Project Color Palette & User Profile */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">

        {/* Primary Action Button: Create New Trip (MERCON Brand Orange #E8450F) */}
        <button
          onClick={() => setIsCreateTripOpen(true)}
          title="Create New Trip (Shortcut: Alt + T or Alt + N)"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-extrabold bg-brand hover:bg-brand-hover text-white shadow-2xs transition-all active:scale-[0.98] cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span className="hidden sm:inline">Create New Trip</span>
          <span className="sm:hidden">New Trip</span>
          <span className="ml-1 hidden md:inline-block text-[10px] font-mono bg-black/20 text-white/90 px-1.5 py-0.2 rounded">Alt+T</span>
        </button>

        {/* Secondary Action Button: Add New Document (Dark Slate / Border Accent) */}
        <button
          onClick={() => navigate('/documents')}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#18181B] dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white shadow-2xs transition-all active:scale-[0.98] cursor-pointer border border-slate-800 dark:border-slate-700"
        >
          <FileText className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Add New Document</span>
          <span className="md:hidden hidden sm:inline">Add Document</span>
        </button>

        {/* More Actions Dropdown Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button 
              className="hidden lg:inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-all shadow-2xs cursor-pointer"
              title="More Actions"
            >
              <span>More</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
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
          <div className="w-8.5 h-8.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100/50 dark:hover:bg-slate-700 flex items-center justify-center transition-colors border border-slate-200 dark:border-slate-700">
            <Bell size={15} className="text-slate-600 dark:text-slate-300" />
          </div>
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-brand text-white text-[9px] font-extrabold flex items-center justify-center shadow-2xs">
            8
          </span>
        </Link>

        {/* User profile dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100/50 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
          >
            <div className="w-6 h-6 rounded-full bg-brand flex items-center justify-center text-white text-[10px] font-bold select-none">
              {initials}
            </div>
            <span className="hidden sm:inline text-xs font-bold text-slate-800 dark:text-slate-200 max-w-[90px] truncate">
              {user?.name || (isAdmin ? 'Admin' : 'Operator')}
            </span>
            <ChevronDown size={12} className={`text-slate-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-1.5 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg py-1.5 animate-fade-in origin-top-right z-50">
              <div className="px-4 py-2 border-b border-slate-200/60 dark:border-slate-800">
                <p className="text-xs font-extrabold text-slate-900 dark:text-slate-100 truncate">
                  {user?.name || (isAdmin ? 'Mercon Admin' : 'Mercon Operator')}
                </p>
                <p className="text-[10px] font-semibold text-brand truncate">
                  {isAdmin ? 'Admin Module' : 'Operator Module'}
                </p>
              </div>
              
              <Link 
                to="/settings/profile" 
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100/50 dark:hover:bg-slate-800 transition-colors"
              >
                <User size={14} className="text-slate-400" />
                My Profile
              </Link>
              
              <Link 
                to="/settings" 
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100/50 dark:hover:bg-slate-800 transition-colors"
              >
                <Settings size={14} className="text-slate-400" />
                Settings
              </Link>

              <div className="border-t border-slate-200/60 dark:border-slate-800 mt-1.5 pt-1.5">
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors cursor-pointer"
                >
                  <LogOut size={14} />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <CreateTripModal
        isOpen={isCreateTripOpen}
        onClose={() => setIsCreateTripOpen(false)}
      />
    </div>
  );
}
