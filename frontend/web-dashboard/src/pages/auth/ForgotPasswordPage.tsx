import { Link } from 'react-router-dom';
import { ArrowLeft, LifeBuoy } from 'lucide-react';

export default function ForgotPasswordPage() {
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
            <p className="text-[#9898A4] text-sm mt-2 font-medium">Reset your account access</p>
          </div>
        </div>

        {/* Body */}
        <div className="p-8">
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-[#FFF0EB] text-[#E8450F] rounded-full flex items-center justify-center mx-auto mb-5">
              <LifeBuoy size={26} />
            </div>
            <h3 className="text-xl font-bold text-[#111] mb-3">Contact your operator</h3>
            <p className="text-sm text-[#6E6E80] font-medium leading-relaxed">
              Passwords are reset by your operator or administrator. Please reach out to
              them and they will set a new password for your account.
            </p>

            <div className="mt-6 bg-[#F5F5F7] border border-black/[0.06] rounded-none p-4 text-left">
              <p className="text-[11px] uppercase tracking-wider font-bold text-[#9898A4] mb-1">Support</p>
              <a href="mailto:support@mercon.sa" className="text-sm font-bold text-[#E8450F] hover:underline">
                support@mercon.sa
              </a>
            </div>
          </div>

          <div className="mt-6 text-center border-t border-black/[0.04] pt-6">
            <Link to="/login" className="inline-flex items-center gap-2 text-sm font-bold text-[#6E6E80] hover:text-[#111] transition-colors">
              <ArrowLeft size={16} /> Back to Login
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
