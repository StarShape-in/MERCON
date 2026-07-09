import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, CheckCircle2, ShieldCheck } from 'lucide-react';
import FormInput from '@/components/ui/FormInput';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);
    // Mock API call
    setTimeout(() => {
      setIsLoading(false);
      setIsSuccess(true);
    }, 1500);
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-[24px] shadow-sm border border-black/[0.08] p-8 text-center">
          <div className="w-16 h-16 bg-[#FEF2F2] text-[#DC2626] rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock size={24} />
          </div>
          <h3 className="text-xl font-bold text-[#111] mb-2">Invalid Reset Link</h3>
          <p className="text-sm text-[#6E6E80] font-medium leading-relaxed mb-6">
            The password reset link is invalid or has expired. Please request a new one.
          </p>
          <button
            onClick={() => navigate('/forgot-password')}
            className="bg-[#E8450F] hover:bg-[#D43D0D] text-white font-bold py-3 px-6 rounded-xl transition-all"
          >
            Request New Link
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-[24px] shadow-sm border border-black/[0.08] overflow-hidden">
        
        {/* Header */}
        <div className="bg-[#111] p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <ShieldCheck size={120} className="text-white" />
          </div>
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-12 h-12 bg-[#E8450F] rounded-xl flex items-center justify-center mb-4">
              <span className="text-white font-bold text-xl tracking-tighter">M.</span>
            </div>
            <h1 className="text-white text-2xl font-bold tracking-tight">Set New Password</h1>
            <p className="text-[#9898A4] text-sm mt-2 font-medium">Create a strong password for your account</p>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-8">
          {!isSuccess ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {error && (
                <div className="bg-[#FEF2F2] border border-[#DC2626]/20 text-[#DC2626] p-3 rounded-xl text-sm font-bold flex items-center gap-2">
                  <Lock size={14} /> {error}
                </div>
              )}

              <FormInput
                label="New Password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <FormInput
                label="Confirm New Password"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />

              <button
                type="submit"
                disabled={isLoading || !password || !confirmPassword}
                className="w-full bg-[#E8450F] hover:bg-[#D43D0D] text-white font-bold py-3.5 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Reset Password <CheckCircle2 size={16} /></>
                )}
              </button>
            </form>
          ) : (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-[#F0FDF4] text-[#16A34A] rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={24} />
              </div>
              <h3 className="text-xl font-bold text-[#111] mb-2">Password Reset Successfully</h3>
              <p className="text-sm text-[#6E6E80] font-medium leading-relaxed mb-6">
                Your password has been securely updated. You can now log in using your new credentials.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="bg-[#111] hover:bg-black text-white font-bold py-3 px-6 rounded-xl transition-all w-full"
              >
                Go to Login
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
