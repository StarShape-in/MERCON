import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Loader2, ArrowRight, ShieldCheck } from 'lucide-react';
import { authStore } from '@/store/authStore';
import { authService } from '@/services/authService';

const ORANGE = '#E8450F';

/** Flat brand illustration: skyline + delivery route + truck. */
function HeroIllustration() {
  return (
    <svg viewBox="0 0 520 360" className="w-full h-auto max-w-[560px]" fill="none">
      {/* soft sun */}
      <circle cx="150" cy="150" r="95" fill="#FDE3D3" opacity="0.7" />
      {/* skyline */}
      <g fill="#C9CCE0" opacity="0.65">
        <rect x="60" y="150" width="42" height="150" rx="3" />
        <rect x="112" y="110" width="34" height="190" rx="3" />
        <rect x="156" y="175" width="30" height="125" rx="3" />
        <rect x="300" y="130" width="36" height="170" rx="3" />
        <rect x="346" y="95" width="30" height="205" rx="3" />
        <rect x="386" y="160" width="40" height="140" rx="3" />
        <rect x="436" y="185" width="30" height="115" rx="3" />
      </g>
      <g fill="#FFFFFF" opacity="0.55">
        <rect x="120" y="122" width="6" height="8" /><rect x="132" y="122" width="6" height="8" />
        <rect x="120" y="140" width="6" height="8" /><rect x="132" y="140" width="6" height="8" />
        <rect x="354" y="108" width="6" height="8" /><rect x="366" y="108" width="6" height="8" />
        <rect x="354" y="126" width="6" height="8" /><rect x="366" y="126" width="6" height="8" />
      </g>
      {/* dashed delivery route */}
      <path d="M70 250 C 150 150, 250 300, 340 190 S 470 120, 470 120" stroke={ORANGE} strokeWidth="3"
        strokeLinecap="round" strokeDasharray="2 12" opacity="0.9" fill="none" />
      {/* pins */}
      <g>
        <path d="M70 250 c -10 -14, -18 -22, -18 -34 a 18 18 0 1 1 36 0 c 0 12 -8 20 -18 34 Z" fill={ORANGE} transform="translate(0,-16)" />
        <circle cx="70" cy="200" r="6" fill="#fff" />
      </g>
      <g>
        <path d="M470 120 c -10 -14, -18 -22, -18 -34 a 18 18 0 1 1 36 0 c 0 12 -8 20 -18 34 Z" fill="#1C1C2E" transform="translate(0,-16)" />
        <circle cx="470" cy="70" r="6" fill="#fff" />
      </g>
      {/* ground */}
      <rect x="20" y="300" width="480" height="3" rx="1.5" fill="#E5E7EB" />
      {/* truck */}
      <g>
        <rect x="150" y="232" width="150" height="68" rx="6" fill={ORANGE} />
        <path d="M170 262 h 60 M170 274 h 50 M170 286 h 44" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
        <path d="M300 250 h 34 l 24 24 v 26 h -58 Z" fill="#1C1C2E" />
        <rect x="308" y="256" width="24" height="18" rx="3" fill="#9BB4D4" />
        <circle cx="200" cy="302" r="16" fill="#1C1C2E" /><circle cx="200" cy="302" r="6" fill="#fff" />
        <circle cx="330" cy="302" r="16" fill="#1C1C2E" /><circle cx="330" cy="302" r="6" fill="#fff" />
      </g>
    </svg>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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
    <div className="min-h-screen w-full flex bg-white">
      {/* Left: branding + illustration */}
      <div className="hidden lg:flex lg:w-[56%] relative flex-col justify-between p-14 overflow-hidden
                      bg-gradient-to-br from-[#FFF4EC] via-white to-[#FCEEE6]">
        <img src="/mercon-logo.png" alt="MERCON Logistics" className="w-44 h-auto" />

        <div className="relative z-10">
          <h1 className="text-5xl font-extrabold tracking-tight text-[#1C1C2E] leading-[1.1]">
            Driving Logistics.
            <br />
            <span style={{ color: ORANGE }}>Delivering Trust.</span>
          </h1>
          <div className="h-1.5 w-24 rounded-full mt-6" style={{ background: `linear-gradient(90deg, ${ORANGE}, #F9A26C)` }} />
        </div>

        <div className="relative z-10 flex justify-center">
          <HeroIllustration />
        </div>
      </div>

      {/* Right: form */}
      <div className="w-full lg:w-[44%] flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md animate-fade-in">
          {/* Mobile brand */}
          <div className="lg:hidden mb-10 flex justify-center">
            <img src="/mercon-logo.png" alt="MERCON Logistics" className="h-16 w-auto" />
          </div>

          <p className="font-semibold text-sm mb-1" style={{ color: ORANGE }}>Welcome back</p>
          <h2 className="text-3xl font-bold text-[#1C1C2E]">Sign in to MERCON Portal</h2>
          <div className="h-1 w-16 rounded-full mt-3 mb-9" style={{ background: `linear-gradient(90deg, ${ORANGE}, #F9A26C)` }} />

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium mb-6 border border-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl outline-none transition-all
                             focus:border-[#E8450F] focus:ring-4 focus:ring-[#E8450F]/10 placeholder:text-gray-400"
                  placeholder="admin"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-semibold text-gray-700">Password</label>
                <a href="/forgot-password" className="text-xs font-semibold hover:underline" style={{ color: ORANGE }}>
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl outline-none transition-all
                             focus:border-[#E8450F] focus:ring-4 focus:ring-[#E8450F]/10 placeholder:text-gray-400"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <label className="flex items-center gap-2.5 select-none cursor-pointer">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-4 h-4 rounded accent-[#E8450F] cursor-pointer"
              />
              <span className="text-sm text-gray-600">Remember me</span>
            </label>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full text-white font-semibold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2
                         disabled:opacity-70 shadow-md shadow-[#E8450F]/25 hover:brightness-95"
              style={{ backgroundColor: ORANGE }}
            >
              {isLoading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <p className="flex items-center justify-center gap-1.5 text-center text-gray-400 text-xs mt-10 font-medium">
            <ShieldCheck size={14} />
            Secure Portal Login &copy; {new Date().getFullYear()} MERCON Logistics
          </p>
        </div>
      </div>
    </div>
  );
}
