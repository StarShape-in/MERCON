import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Lock, Eye, EyeOff, ArrowRight, Loader2, ShieldCheck,
  Truck, MapPin, Zap, AlertCircle,
} from 'lucide-react';
import { authStore } from '@/store/authStore';
import { authService } from '@/services/authService';

/* Brand tokens */
const C = {
  orange: '#E8450F',
  orangeDark: '#CF3D0D',
  dark: '#1E1F28',
  sub: '#6E7285',
  border: '#ECEEF3',
  danger: '#F04438',
  success: '#12B76A',
};
const FONT = "'Inter Variable', Inter, system-ui, -apple-system, sans-serif";

const inputCls =
  'w-full h-12 pl-11 pr-4 rounded-xl bg-white text-[15px] text-[#1E1F28] border border-[#ECEEF3] outline-none ' +
  'transition-all duration-200 placeholder:text-[#9AA0AB] hover:border-[#DDE0E6] ' +
  'focus:border-[#E8450F] focus:ring-4 focus:ring-[#E8450F]/15';

/* Small dashboard "product peek" — Stripe-style trust cue */
function ProductPeek() {
  return (
    <div className="mt-10 w-full max-w-sm rounded-2xl bg-white p-5 border border-[#ECEEF3] shadow-[0_18px_50px_-20px_rgba(30,31,40,0.28)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: '#FFF1EC', color: C.orange }}>
            <Truck size={18} />
          </div>
          <div className="leading-tight">
            <div className="text-[13px] font-semibold text-[#1E1F28]">Active shipments</div>
            <div className="text-xs" style={{ color: C.sub }}>Live · updated now</div>
          </div>
        </div>
        <span className="text-[11px] font-semibold px-2 py-1 rounded-full" style={{ background: '#ECFDF3', color: C.success }}>
          98% on-time
        </span>
      </div>
      <div className="mt-5 flex items-end justify-between">
        <div>
          <div className="text-[30px] font-bold leading-none tracking-[-0.02em] text-[#1E1F28]">1,248</div>
          <div className="text-xs mt-1.5" style={{ color: C.sub }}>trips this month</div>
        </div>
        <svg width="128" height="44" viewBox="0 0 128 44" fill="none">
          <path d="M2 34 L22 28 L42 32 L62 20 L82 24 L102 12 L126 6" stroke={C.orange} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M2 34 L22 28 L42 32 L62 20 L82 24 L102 12 L126 6 L126 44 L2 44 Z" fill="url(#g)" opacity="0.5" />
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={C.orange} stopOpacity="0.25" />
              <stop offset="1" stopColor={C.orange} stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}

function Feature({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex items-center gap-2 text-[13px] font-medium" style={{ color: C.sub }}>
      <Icon size={16} style={{ color: C.orange }} />
      {label}
    </div>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authStore.isAuthenticated()) navigate('/', { replace: true });
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await authService.login({ username: username.trim(), password });
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-white" style={{ fontFamily: FONT, color: C.dark }}>
      {/* Left — brand panel */}
      <div
        className="hidden lg:flex lg:w-[54%] relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #FFF7F3 0%, #F8F9FC 55%, #F8F9FC 100%)' }}
      >
        <div className="absolute -top-24 -left-24 w-[440px] h-[440px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(232,69,15,0.10), transparent 70%)' }} />
        <div className="absolute inset-y-0 right-0 w-px bg-[#ECEEF3]" />

        <div className="relative z-10 flex flex-col justify-between p-16 w-full">
          <img src="/mercon-logo.png" alt="MERCON Logistics" className="w-44 h-auto" />

          <div className="animate-fade-in">
            <h1 className="text-[46px] leading-[1.06] font-bold tracking-[-0.025em]">
              Driving logistics.
              <br />
              <span style={{ color: C.orange }}>Delivering trust.</span>
            </h1>
            <ProductPeek />
          </div>

          <div className="flex items-center gap-7">
            <Feature icon={Zap} label="Real-time" />
            <Feature icon={MapPin} label="Route tracking" />
            <Feature icon={ShieldCheck} label="Enterprise-grade" />
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div className="w-full lg:w-[46%] flex items-center justify-center px-6 py-12" style={{ background: '#F8F9FC' }}>
        <div className="w-full max-w-[400px] animate-fade-in">
          <div className="lg:hidden mb-8 flex justify-center">
            <img src="/mercon-logo.png" alt="MERCON Logistics" className="h-14 w-auto" />
          </div>

          <div className="rounded-2xl border border-[#ECEEF3] bg-white p-8 shadow-[0_18px_50px_-24px_rgba(30,31,40,0.25)]">
            <p className="text-sm font-semibold" style={{ color: C.orange }}>Welcome back</p>
            <h2 className="mt-1.5 text-[26px] font-bold tracking-[-0.02em]">Sign in to your workspace</h2>

            {error && (
              <div className="mt-6 flex items-start gap-2 rounded-xl px-3.5 py-3 text-sm font-medium"
                style={{ background: '#FEF3F2', color: C.danger, border: '1px solid #FEE4E2' }}>
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="mt-7 space-y-5">
            <div>
              <label className="block text-[13px] font-medium mb-2" style={{ color: C.dark }}>Username</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9AA0AB]">
                  <User size={18} />
                </span>
                <input
                  type="text"
                  required
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={inputCls}
                  placeholder="admin"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[13px] font-medium" style={{ color: C.dark }}>Password</label>
                <a href="/forgot-password" className="text-[13px] font-semibold hover:underline" style={{ color: C.orange }}>
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9AA0AB]">
                  <Lock size={18} />
                </span>
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputCls + ' pr-11'}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#9AA0AB] hover:text-[#6E7285] transition-colors"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2.5 select-none cursor-pointer w-fit">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-[18px] h-[18px] rounded-[6px] accent-[#E8450F] cursor-pointer"
              />
              <span className="text-sm" style={{ color: C.sub }}>Keep me signed in</span>
            </label>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 rounded-xl text-white font-semibold text-[15px] flex items-center justify-center gap-2
                         transition-all duration-200 disabled:opacity-70 shadow-[0_6px_16px_-4px_rgba(232,69,15,0.4)]
                         hover:-translate-y-0.5 active:translate-y-0"
              style={{ backgroundColor: C.orange }}
              onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => (e.currentTarget.style.backgroundColor = C.orangeDark)}
              onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => (e.currentTarget.style.backgroundColor = C.orange)}
            >
              {isLoading ? <Loader2 size={20} className="animate-spin" /> : (<>Sign in<ArrowRight size={18} /></>)}
            </button>
            </form>

            <p className="mt-8 flex items-center justify-center gap-1.5 text-xs" style={{ color: C.sub }}>
              <ShieldCheck size={14} />
              Secure portal · © {new Date().getFullYear()} MERCON Logistics
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
