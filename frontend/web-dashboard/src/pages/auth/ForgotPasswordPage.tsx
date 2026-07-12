import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Send } from 'lucide-react';
import FormInput from '@/components/ui/FormInput';
import { authService } from '@/services/authService';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Always resolves generically — the API never reveals whether the email exists.
      await authService.forgotPassword(email);
      setIsSent(true);
    } catch {
      // Show the same confirmation regardless, to avoid leaking account existence.
      setIsSent(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-[24px] shadow-sm border border-black/[0.08] overflow-hidden">
        
        {/* Header */}
        <div className="bg-[#111] p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <svg width="120" height="120" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="white" strokeWidth="2"/>
            </svg>
          </div>
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-full max-w-[200px] flex items-center justify-center bg-white rounded-none p-0 mb-4 shadow-md overflow-hidden h-16">
              <img src="/invoice-logo.png" alt="MERCON Logo" className="w-full h-full object-cover scale-[1.35] origin-center" />
            </div>
            <h1 className="text-white text-2xl font-bold tracking-tight">Forgot Password</h1>
            <p className="text-[#9898A4] text-sm mt-2 font-medium">Reset your operator account access</p>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-8">
          {!isSent ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <p className="text-sm text-[#6E6E80] font-medium leading-relaxed">
                Enter the email address associated with your MERCON account and we'll send you a link to reset your password.
              </p>
              
              <FormInput
                label="Email Address"
                type="email"
                placeholder="operator@mercon.sa"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                icon={<Mail size={16} className="text-[#9898A4]" />}
              />

              <button
                type="submit"
                disabled={isLoading || !email}
                className="w-full bg-[#E8450F] hover:bg-[#D43D0D] text-white font-bold py-3.5 px-4 rounded-none transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Send Reset Link <Send size={16} /></>
                )}
              </button>
            </form>
          ) : (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-[#F0FDF4] text-[#16A34A] rounded-full flex items-center justify-center mx-auto mb-4">
                <Send size={24} />
              </div>
              <h3 className="text-xl font-bold text-[#111] mb-2">Check your email</h3>
              <p className="text-sm text-[#6E6E80] font-medium leading-relaxed mb-6">
                We've sent password reset instructions to <span className="text-[#111] font-bold">{email}</span>.
              </p>
              <button
                onClick={() => setIsSent(false)}
                className="text-[#E8450F] text-sm font-bold hover:underline"
              >
                Try another email
              </button>
            </div>
          )}

          <div className="mt-8 text-center border-t border-black/[0.04] pt-6">
            <Link to="/login" className="inline-flex items-center gap-2 text-sm font-bold text-[#6E6E80] hover:text-[#111] transition-colors">
              <ArrowLeft size={16} /> Back to Login
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
