import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
import { authService } from '@/services/authService';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await authService.login({ email, password });
      navigate('/');
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Login failed. Please check your credentials.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F7] p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#E8450F] rounded-full mix-blend-multiply filter blur-[120px] opacity-10 animate-pulse-ring"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#7C3AED] rounded-full mix-blend-multiply filter blur-[120px] opacity-10"></div>

      <div className="w-full max-w-md animate-fade-in relative z-10">
        <div className="bg-white rounded-[24px] shadow-lg border border-gray-100 p-8 sm:p-10">
          
          <div className="mb-8 text-center">
            <div className="w-14 h-14 bg-[#E8450F] text-white flex items-center justify-center rounded-xl mx-auto mb-4 font-bold text-xl tracking-wider shadow-md shadow-[#E8450F]/20">
              M
            </div>
            <h1 className="text-2xl font-bold text-[#1C1C2E]">MERCON Operator</h1>
            <p className="text-gray-500 text-sm mt-1">Sign in to manage the platform</p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium mb-6 border border-red-100 animate-slide-in">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#F5F5F7] border border-transparent focus:border-[#E8450F]/30 focus:bg-white focus:ring-4 focus:ring-[#E8450F]/10 rounded-xl outline-none transition-all"
                  placeholder="admin@mercon.sa"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-semibold text-gray-700">Password</label>
                <a href="/forgot-password" className="text-[#E8450F] text-xs font-semibold hover:underline">Forgot?</a>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#F5F5F7] border border-transparent focus:border-[#E8450F]/30 focus:bg-white focus:ring-4 focus:ring-[#E8450F]/10 rounded-xl outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#E8450F] hover:bg-[#C7380A] text-white font-semibold py-3.5 rounded-xl transition-colors shadow-md shadow-[#E8450F]/20 flex items-center justify-center gap-2 disabled:opacity-70"
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

        </div>
        
        <p className="text-center text-gray-400 text-xs mt-6 font-medium">
          Secure Operator Login &copy; {new Date().getFullYear()} MERCON Logistics
        </p>
      </div>
    </div>
  );
}
