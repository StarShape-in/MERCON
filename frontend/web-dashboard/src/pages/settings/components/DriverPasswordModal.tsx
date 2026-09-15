import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import Btn from '@/components/ui/Btn';
import { Driver } from '@/services/driverService';
import { 
  KeyRound, 
  Smartphone, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Sparkles, 
  Copy, 
  Check, 
  AlertTriangle, 
  Lock, 
  Info,
  CheckCircle2,
  XCircle,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

interface DriverPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  driver: Driver | null;
  onSave: (driverId: string, password: string) => void;
  isLoading: boolean;
}

export default function DriverPasswordModal({
  isOpen,
  onClose,
  driver,
  onSave,
  isLoading,
}: DriverPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setConfirmPassword('');
      setShowPassword(false);
      setShowConfirmPassword(false);
      setCopied(false);
      setErrorMsg('');
    }
  }, [isOpen, driver]);

  if (!driver) return null;

  const handleGeneratePassword = () => {
    // Generate a clean 6-digit numeric PIN for simple mobile login
    const randomPin = Math.floor(100000 + Math.random() * 900000).toString();
    setPassword(randomPin);
    setConfirmPassword(randomPin);
    setErrorMsg('');
    toast.success('Generated 6-digit mobile app PIN');
  };

  const handleCopyCredentials = () => {
    if (!password) return;
    const phone = driver.phone_primary || 'N/A';
    const text = `MERCON Mobile App Credentials:\nDriver: ${driver.first_name} ${driver.last_name}\nLogin Phone: ${phone}\nPassword: ${password}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Login credentials copied to clipboard');
    setTimeout(() => setCopied(false), 2500);
  };

  const getPasswordStrength = (pass: string) => {
    if (!pass) return { level: 0, label: '', color: 'bg-slate-200' };
    if (pass.length < 4) return { level: 1, label: 'Too short (min 4 chars)', color: 'bg-rose-500' };
    if (pass.length < 6) return { level: 2, label: 'Fair (6-digit PIN recommended)', color: 'bg-amber-500' };
    if (pass.length < 8) return { level: 3, label: 'Good', color: 'bg-blue-500' };
    return { level: 4, label: 'Strong', color: 'bg-emerald-500' };
  };

  const strength = getPasswordStrength(password);
  const isMatch = password.length >= 4 && confirmPassword.length >= 4 && password === confirmPassword;
  const isMismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const isFormValid = password.length >= 4 && isMatch;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!password || password.length < 4) {
      setErrorMsg('Password must be at least 4 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    setErrorMsg('');
    onSave(driver.id, password);
  };

  const hasPhone = Boolean(driver.phone_primary && driver.phone_primary.trim().length > 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl">
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-5 text-white relative">
          <div className="flex items-center gap-3">
            <KeyRound className="w-5 h-5 text-indigo-300 shrink-0" />
            <div>
              <DialogTitle className="text-base font-bold text-white tracking-tight">
                {driver.hasAccountPassword ? 'Update Driver Password' : 'Set Mobile App Password'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-300 mt-0.5">
                Configure authentication details for MERCON Mobile App access
              </DialogDescription>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Driver identity summary card */}
          <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/10 dark:bg-indigo-400/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm border border-indigo-600/20">
                {driver.avatar_url ? (
                  <img src={driver.avatar_url} alt="" className="w-full h-full rounded-xl object-cover" />
                ) : (
                  `${driver.first_name?.[0]?.toUpperCase() || ''}${driver.last_name?.[0]?.toUpperCase() || ''}`
                )}
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>{driver.first_name} {driver.last_name}</span>
                  {driver.ref_id && (
                    <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono px-1.5 py-0.5 rounded font-semibold">
                      #{driver.ref_id}
                    </span>
                  )}
                </h4>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-0.5">
                  <Smartphone className="w-3.5 h-3.5 text-indigo-500" />
                  <span className={hasPhone ? "text-slate-700 dark:text-slate-300 font-semibold" : "text-amber-600 dark:text-amber-400 font-semibold"}>
                    {hasPhone ? driver.phone_primary : 'No Primary Phone Set'}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                driver.hasAccountPassword
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/50'
                  : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/50'
              }`}>
                <ShieldCheck size={12} />
                {driver.hasAccountPassword ? 'Password Active' : 'No Password'}
              </span>
            </div>
          </div>

          {/* Alert Notice */}
          {!hasPhone ? (
            <div className="text-xs bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300 rounded-xl p-3 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong>Attention:</strong> Driver has no primary phone number registered. Drivers log into the mobile app using their phone number, so please ensure their phone number is updated.
              </div>
            </div>
          ) : (
            <div className="text-xs bg-blue-50/80 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 text-blue-900 dark:text-blue-300 rounded-xl p-3 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                Driver logs into the MERCON Mobile App using primary phone (<strong>{driver.phone_primary}</strong>) and this password.
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="text-xs text-rose-700 dark:text-rose-300 font-medium bg-rose-50 dark:bg-rose-950/40 p-3 rounded-xl border border-rose-200 dark:border-rose-900/50 flex items-center gap-2">
              <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Quick Actions Bar */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-indigo-500" />
              Password Credentials
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleGeneratePassword}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Generate PIN
              </button>
              {password && (
                <button
                  type="button"
                  onClick={handleCopyCredentials}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              )}
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>New Password <span className="text-rose-500">*</span></span>
              {password && (
                <span className="text-[11px] font-semibold text-slate-500">
                  {strength.label}
                </span>
              )}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                placeholder="Enter password or click Generate PIN"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-3.5 pr-10 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Strength Meter Bar */}
            {password.length > 0 && (
              <div className="grid grid-cols-4 gap-1 pt-1">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`h-1 rounded-full transition-all duration-300 ${
                      step <= strength.level ? strength.color : 'bg-slate-200 dark:bg-slate-800'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Confirm Password Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Confirm Password <span className="text-rose-500">*</span></span>
              {isMatch && (
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Passwords match
                </span>
              )}
              {isMismatch && (
                <span className="text-[11px] font-bold text-rose-500 flex items-center gap-1">
                  <XCircle className="w-3 h-3" /> Passwords don't match
                </span>
              )}
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                placeholder="Re-enter password to confirm"
                className={`w-full bg-slate-50 dark:bg-slate-900 border rounded-xl pl-3.5 pr-10 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all font-mono ${
                  isMismatch
                    ? 'border-rose-400 focus:ring-rose-500/20 focus:border-rose-500'
                    : isMatch
                    ? 'border-emerald-400 focus:ring-emerald-500/20 focus:border-emerald-500'
                    : 'border-slate-200 dark:border-slate-800 focus:ring-indigo-500/20 focus:border-indigo-500'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-slate-100 dark:border-slate-800 gap-2 sm:gap-2">
            <Btn
              type="button"
              variant="outline"
              label="Cancel"
              onClick={onClose}
              disabled={isLoading}
              className="rounded-xl border-slate-200 dark:border-slate-700"
            />
            <button
              type="submit"
              disabled={isLoading || !isFormValid}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-[#FA634E] hover:bg-[#e0523d] disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs active:scale-[0.98] transition-all cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Password...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>{driver.hasAccountPassword ? 'Update Password' : 'Set Password'}</span>
                </>
              )}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

