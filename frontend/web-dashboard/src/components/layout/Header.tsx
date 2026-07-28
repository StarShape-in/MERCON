import { useState, useRef, useEffect } from 'react';
import { Search, Bell, ChevronDown, User, Settings, LogOut, Building2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { authStore } from '@/store/authStore';

interface HeaderProps {
  title?: string;
  breadcrumb?: string;
}

export default function Header({ title, breadcrumb }: HeaderProps) {
  const navigate = useNavigate();
  const user = authStore.getUser();
  const [dropdownOpen, setDropdownOpen] = useState(false);
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

  return (
    <div className="shrink-0 bg-white border-b border-black/[0.08] px-6 h-[56px] flex items-center justify-between gap-4 relative z-20">
      
      {/* Left side spacing */}
      <div className="flex items-center gap-2"></div>

      {/* Right Side Controls */}
      <div className="flex items-center gap-3">
        
        {/* Global Search box */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#F5F5F7] w-56 border border-black/[0.04]">
          <Search size={13} className="text-[#9898A4]" />
          <input 
            type="text" 
            placeholder="Search anything…" 
            className="bg-transparent border-none outline-none text-xs text-[#111] placeholder-[#9898A4] w-full"
          />
        </div>

        {/* Notifications trigger */}
        <Link to="/notifications" className="relative group">
          <div className="w-8 h-8 rounded-lg bg-[#F5F5F7] hover:bg-[#EBEBEF] flex items-center justify-center transition-colors">
            <Bell size={15} className="text-[#444]" />
          </div>
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#E8450F] text-white text-[9px] font-bold flex items-center justify-center shadow-sm">
            5
          </span>
        </Link>

        {/* User profile dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#F5F5F7] hover:bg-[#EBEBEF] transition-colors border border-black/[0.04]"
          >
            <div className="w-5 h-5 rounded-full bg-[#E8450F] flex items-center justify-center text-white text-[9px] font-bold select-none">
              {initials}
            </div>
            <span className="text-xs font-semibold text-[#111] max-w-[80px] truncate">{firstName}</span>
            <ChevronDown size={12} className={`text-[#9898A4] transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-1.5 w-48 bg-white border border-black/[0.07] rounded-lg shadow-lg py-1.5 animate-fade-in origin-top-right z-50">
              <div className="px-4 py-2 border-b border-black/[0.04]">
                <p className="text-xs font-bold text-[#111] truncate">{user?.name || 'Mohammed Al-Harbi'}</p>
                <p className="text-[10px] text-gray-500 truncate">{user?.role || 'Operator'}</p>
              </div>
              
              <Link 
                to="/settings/profile" 
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-[#444] hover:bg-gray-50 transition-colors"
              >
                <User size={14} className="text-[#9898A4]" />
                My Profile
              </Link>
              
              <Link 
                to="/settings" 
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-[#444] hover:bg-gray-50 transition-colors"
              >
                <Settings size={14} className="text-[#9898A4]" />
                Settings
              </Link>

              <div className="border-t border-black/[0.04] mt-1.5 pt-1.5">
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors"
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
