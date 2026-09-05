import { useState, useEffect } from 'react';
import { User, Eye, EyeOff, CheckCircle2, Shield, UserCheck, Lock, ChevronDown } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import Btn from '@/components/ui/Btn';
import { UserDTO } from '@/services/userService';

const COUNTRY_CODES = [
  { code: '+966', flag: '🇸🇦', country: 'SA', name: 'Saudi Arabia' },
  { code: '+971', flag: '🇦🇪', country: 'AE', name: 'UAE' },
  { code: '+965', flag: '🇰🇼', country: 'KW', name: 'Kuwait' },
  { code: '+974', flag: '🇶🇦', country: 'QA', name: 'Qatar' },
  { code: '+973', flag: '🇧🇭', country: 'BH', name: 'Bahrain' },
  { code: '+968', flag: '🇴🇲', country: 'OM', name: 'Oman' },
  { code: '+20',  flag: '🇪🇬', country: 'EG', name: 'Egypt' },
  { code: '+962', flag: '🇯🇴', country: 'JO', name: 'Jordan' },
  { code: '+91',  flag: '🇮🇳', country: 'IN', name: 'India' },
  { code: '+92',  flag: '🇵🇰', country: 'PK', name: 'Pakistan' },
  { code: '+44',  flag: '🇬🇧', country: 'GB', name: 'UK' },
  { code: '+1',   flag: '🇺🇸', country: 'US', name: 'USA' },
];

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<UserDTO> & { password?: string }) => void;
  initialData?: UserDTO | null;
  isLoading: boolean;
  canManageSuperAdmin?: boolean;
}

export default function UserModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  isLoading,
  canManageSuperAdmin
}: UserModalProps) {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0]);
  const [role, setRole] = useState('Operator');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name || '');
        setUsername(initialData.username?.replace(/^@/, '') || '');

        const existingPhone = initialData.phone || '';
        const matchedCountry = COUNTRY_CODES.find(c => existingPhone.startsWith(c.code));
        if (matchedCountry) {
          setSelectedCountry(matchedCountry);
          setPhone(existingPhone.slice(matchedCountry.code.length));
        } else {
          setSelectedCountry(COUNTRY_CODES[0]);
          setPhone(existingPhone);
        }

        setRole(initialData.role || 'Operator');
        setPassword('');
        setConfirmPassword('');
        setIsSuperAdmin(initialData.isSuperAdmin || false);
      } else {
        setName('');
        setUsername('');
        setPhone('');
        setSelectedCountry(COUNTRY_CODES[0]);
        setRole('Operator');
        setPassword('');
        setConfirmPassword('');
        setIsSuperAdmin(false);
      }
      setShowPassword(false);
    }
  }, [isOpen, initialData]);

  const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const passwordMatch = confirmPassword.length > 0 && password.length > 0 && password === confirmPassword;

  const isFormValid = (() => {
    if (!name.trim() || !username.trim() || !phone.trim() || !role) return false;
    if (!initialData) {
      if (!password || !confirmPassword || password !== confirmPassword) return false;
    } else {
      if (password && password !== confirmPassword) return false;
    }
    return true;
  })();

  const handleSubmit = () => {
    if (!isFormValid) return;

    const formattedPhone = `${selectedCountry.code}${phone.replace(/[^\d]/g, '')}`;

    const data: any = {
      name: name.trim(),
      username: username.trim().replace(/^@/, ''),
      phone: formattedPhone,
      role,
      ...(initialData ? {} : { status: 'Active' })
    };

    if (password) {
      data.password = password;
    }

    if (canManageSuperAdmin && initialData) {
      data.isSuperAdmin = isSuperAdmin;
    }

    onSave(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[520px] p-0 overflow-hidden border border-slate-200/90 shadow-xl rounded-2xl bg-white">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <DialogTitle className="text-base font-bold text-slate-900 tracking-tight">
              {initialData ? 'Edit User' : 'Add New User'}
            </DialogTitle>
            <p className="text-xs text-slate-500 font-normal mt-0.5">
              {initialData ? 'Update permissions and credentials' : 'Set up user access details and credentials'}
            </p>
          </div>
        </div>

        {/* Form Body */}
        <div className="px-6 py-5 space-y-5 max-h-[78vh] overflow-y-auto">
          {/* Full Name & Username */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Abdullah Al-Mansoor"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 shadow-sm focus:border-slate-400 focus:ring-2 focus:ring-slate-950/5 outline-none transition-all placeholder:text-slate-400 text-slate-900"
              />
            </div>

            {/* Username with Handle Badge */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Username <span className="text-rose-500">*</span>
              </label>
              <div className="flex rounded-lg border border-slate-200 shadow-sm focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-950/5 transition-all overflow-hidden bg-white">
                <span className="inline-flex items-center px-3 text-slate-400 bg-slate-50 border-r border-slate-200 text-xs font-medium select-none">
                  @
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/\s+/g, '').toLowerCase())}
                  placeholder="jdoe_admin"
                  className="w-full px-3 py-2 text-xs text-slate-900 outline-none bg-transparent placeholder:text-slate-400"
                />
              </div>
            </div>
          </div>

          {/* Phone Number with Selectable Country Code Dropdown */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">
              Phone Number <span className="text-rose-500">*</span>
            </label>
            <div className="flex rounded-lg border border-slate-200 shadow-sm focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-950/5 transition-all overflow-hidden bg-white">
              {/* Changeable Country Code Dropdown */}
              <div className="relative border-r border-slate-200 bg-slate-50 hover:bg-slate-100/80 transition-colors shrink-0">
                <select
                  value={selectedCountry.code}
                  onChange={(e) => {
                    const found = COUNTRY_CODES.find(c => c.code === e.target.value);
                    if (found) setSelectedCountry(found);
                  }}
                  className="appearance-none bg-transparent pl-3 pr-7 py-2 text-xs font-medium text-slate-700 cursor-pointer outline-none flex items-center gap-1.5 z-10 relative"
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.code} ({c.country})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Phone Input */}
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, ''))}
                placeholder="50 000 0000"
                className="w-full px-3 py-2 text-xs text-slate-900 outline-none bg-transparent placeholder:text-slate-400 font-mono tracking-wide"
              />
            </div>
          </div>

          {/* Role Selection Segmented Cards */}
          <div className="space-y-2 pt-1">
            <label className="text-xs font-semibold text-slate-700 block">
              Access Role <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Operator Button */}
              <button
                type="button"
                onClick={() => setRole('Operator')}
                className={`p-3.5 rounded-xl border text-left transition-all relative ${
                  role === 'Operator'
                    ? 'border-[#FA634E] bg-[#FA634E]/[0.03] ring-1 ring-[#FA634E]'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-slate-600" /> Operator
                  </span>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                    role === 'Operator' ? 'border-[#FA634E] bg-[#FA634E]' : 'border-slate-300'
                  }`}>
                    {role === 'Operator' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5 leading-snug">
                  Standard operational dispatch & trip handling
                </p>
              </button>

              {/* Admin Button */}
              <button
                type="button"
                onClick={() => setRole('Admin')}
                className={`p-3.5 rounded-xl border text-left transition-all relative ${
                  role === 'Admin'
                    ? 'border-[#FA634E] bg-[#FA634E]/[0.03] ring-1 ring-[#FA634E]'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-slate-600" /> Administrator
                  </span>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                    role === 'Admin' ? 'border-[#FA634E] bg-[#FA634E]' : 'border-slate-300'
                  }`}>
                    {role === 'Admin' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5 leading-snug">
                  Full management, billing & system control
                </p>
              </button>
            </div>
          </div>

          {/* Password & Confirm Password */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                {initialData ? "New Password" : "Password *"}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={initialData ? "Leave blank to keep" : "Min 6 characters"}
                  className="w-full pl-3 pr-9 py-2 text-xs rounded-lg border border-slate-200 shadow-sm focus:border-slate-400 focus:ring-2 focus:ring-slate-950/5 outline-none transition-all placeholder:text-slate-400 text-slate-900"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                {initialData ? "Confirm Password" : "Confirm Password *"}
              </label>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className={`w-full px-3 py-2 text-xs rounded-lg border shadow-sm outline-none transition-all placeholder:text-slate-400 text-slate-900 ${
                  passwordMismatch
                    ? 'border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-500/10 bg-rose-50/20'
                    : 'border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-950/5'
                }`}
              />
              {passwordMismatch && (
                <p className="text-[11px] font-medium text-rose-500 mt-1">
                  Passwords do not match
                </p>
              )}
              {passwordMatch && (
                <p className="text-[11px] font-medium text-emerald-600 flex items-center gap-1 mt-1">
                  <CheckCircle2 className="w-3 h-3" /> Passwords match
                </p>
              )}
            </div>
          </div>

          {/* Superadmin Checkbox (if applicable) */}
          {canManageSuperAdmin && initialData && role === 'Admin' && (
            <div className="pt-2">
              <label className="flex items-center gap-3 p-3 bg-amber-50/60 rounded-xl border border-amber-200/60 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isSuperAdmin}
                  onChange={(e) => setIsSuperAdmin(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-600 accent-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <span className="text-xs font-semibold text-amber-900">
                  Superadmin Privileges
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-3.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <Btn variant="outline" label="Cancel" onClick={onClose} disabled={isLoading} />
          <Btn
            label={initialData ? "Save Changes" : "Save User"}
            onClick={handleSubmit}
            disabled={isLoading || !isFormValid}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}





