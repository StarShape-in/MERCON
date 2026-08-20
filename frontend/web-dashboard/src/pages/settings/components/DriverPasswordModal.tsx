import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import Btn from '@/components/ui/Btn';
import FormInput from '@/components/ui/FormInput';
import { Driver } from '@/services/driverService';
import { KeyRound, Smartphone, ShieldCheck } from 'lucide-react';

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
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setConfirmPassword('');
      setErrorMsg('');
    }
  }, [isOpen, driver]);

  if (!driver) return null;

  const handleSubmit = () => {
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <KeyRound className="w-5 h-5 text-brand" />
            {driver.hasAccountPassword ? 'Update Driver Password' : 'Set Mobile App Password'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Driver identity summary card */}
          <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand/10 text-brand flex items-center justify-center font-bold text-sm">
                {driver.first_name?.[0]?.toUpperCase()}{driver.last_name?.[0]?.toUpperCase()}
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {driver.first_name} {driver.last_name}
                </h4>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-0.5">
                  <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{driver.phone_primary || 'No phone number set'}</span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                driver.hasAccountPassword
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400'
                  : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400'
              }`}>
                <ShieldCheck size={12} />
                {driver.hasAccountPassword ? 'Password Set' : 'No Password'}
              </span>
            </div>
          </div>

          <div className="text-xs text-slate-500 bg-blue-50/70 border border-blue-100 text-blue-800 rounded-lg p-3 leading-relaxed">
            💡 The driver will use their primary phone number (<strong>{driver.phone_primary}</strong>) and this password to log in to the MERCON Mobile App.
          </div>

          {errorMsg && (
            <div className="text-xs text-red-600 font-medium bg-red-50 p-2.5 rounded-lg border border-red-100">
              {errorMsg}
            </div>
          )}

          <FormInput
            label="New Password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errorMsg) setErrorMsg('');
            }}
            placeholder="Enter new password"
          />

          <FormInput
            label="Confirm Password"
            name="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (errorMsg) setErrorMsg('');
            }}
            placeholder="Confirm new password"
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Btn variant="outline" label="Cancel" onClick={onClose} disabled={isLoading} />
          <Btn
            label={driver.hasAccountPassword ? 'Update Password' : 'Create Password'}
            onClick={handleSubmit}
            disabled={isLoading || !password || !confirmPassword}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
