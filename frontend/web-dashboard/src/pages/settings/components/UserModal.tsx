import { useState, useEffect } from 'react';
import { User, AtSign, Phone, Mail, Shield, Lock, KeyRound, UserPlus, CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import Btn from '@/components/ui/Btn';
import FormInput from '@/components/ui/FormInput';
import { UserDTO } from '@/services/userService';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<UserDTO> & { password?: string }) => void;
  initialData?: UserDTO | null;
  isLoading: boolean;
  /** Only a superadmin can grant/revoke superadmin — hides the control entirely otherwise. */
  canManageSuperAdmin?: boolean;
}

export default function UserModal({ isOpen, onClose, onSave, initialData, isLoading, canManageSuperAdmin }: UserModalProps) {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Operator');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name || '');
        setUsername(initialData.username || '');
        setPhone(initialData.phone || '');
        setEmail(initialData.email || '');
        setRole(initialData.role || 'Operator');
        setPassword('');
        setConfirmPassword('');
        setIsSuperAdmin(initialData.isSuperAdmin || false);
      } else {
        setName('');
        setUsername('');
        setPhone('');
        setEmail('');
        setRole('Operator');
        setPassword('');
        setConfirmPassword('');
        setIsSuperAdmin(false);
      }
    }
  }, [isOpen, initialData]);

  const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const passwordMatch = confirmPassword.length > 0 && password.length > 0 && password === confirmPassword;

  const isFormValid = (() => {
    if (!name.trim() || !username.trim() || !phone.trim() || !role) return false;
    if (!initialData) {
      // New user creation requires non-empty matching passwords
      if (!password || !confirmPassword || password !== confirmPassword) return false;
    } else {
      // Editing user: if a new password is typed, confirm password must match
      if (password && password !== confirmPassword) return false;
    }
    return true;
  })();

  const handleSubmit = () => {
    if (!isFormValid) return;

    const data: any = {
      name: name.trim(),
      username: username.trim(),
      phone: phone.trim(),
      email: email.trim() || null,
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
      <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden border border-black/10 shadow-2xl rounded-2xl">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white px-6 py-5 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <UserPlus className="w-5 h-5 text-brand shrink-0" />
            <div>
              <DialogTitle className="text-lg font-bold text-white tracking-tight">
                {initialData ? 'Edit User Profile' : 'Add New User'}
              </DialogTitle>
              <p className="text-xs text-slate-300 font-medium">
                {initialData ? 'Update web user access and credentials' : 'Create login credentials and set system permissions'}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body / Form */}
        <div className="px-6 py-5 bg-white space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Section: Account & Contact Information */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-500" /> Account & Contact Details
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormInput
                label="Full Name *"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. John Doe"
                icon={<User className="w-4 h-4 text-slate-400" />}
              />

              <FormInput
                label="Username *"
                name="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. jdoe_admin"
                icon={<AtSign className="w-4 h-4 text-slate-400" />}
              />

              <FormInput
                label="Phone Number *"
                name="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+966500000000"
                icon={<Phone className="w-4 h-4 text-slate-400" />}
              />

              <FormInput
                label="Email (Optional)"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@company.com"
                icon={<Mail className="w-4 h-4 text-slate-400" />}
              />
            </div>
          </div>

          {/* Section: System Role */}
          <div className="space-y-3 pt-1">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-indigo-500" /> Access & Permissions
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormInput
                label="Role *"
                name="role"
                type="select"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                options={[
                  { value: 'Operator', label: 'Operator (Standard Access)' },
                  { value: 'Admin', label: 'Admin (Full Management)' },
                ]}
                icon={<Shield className="w-4 h-4 text-slate-400" />}
              />
            </div>
          </div>

          {/* Section: Security & Password */}
          <div className="space-y-3 pt-1">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-indigo-500" /> Security & Password
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormInput
                label={initialData ? "New Password" : "Password *"}
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={initialData ? "Leave blank to keep current" : "Minimum 6 characters"}
                icon={<Lock className="w-4 h-4 text-slate-400" />}
              />

              <div className="space-y-1">
                <FormInput
                  label={initialData ? "Confirm New Password" : "Confirm Password *"}
                  name="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  icon={<KeyRound className="w-4 h-4 text-slate-400" />}
                  error={passwordMismatch ? "Passwords do not match" : undefined}
                />
                {passwordMatch && (
                  <p className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 mt-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Passwords match
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Superadmin Permissions Checkbox (if applicable) */}
          {canManageSuperAdmin && initialData && role === 'Admin' && (
            <div className="pt-2 border-t border-slate-100">
              <label className="flex items-center gap-3 p-3 bg-amber-50/60 rounded-xl border border-amber-200/60 cursor-pointer select-none hover:bg-amber-50 transition-colors">
                <input
                  type="checkbox"
                  checked={isSuperAdmin}
                  onChange={(e) => setIsSuperAdmin(e.target.checked)}
                  className="w-4.5 h-4.5 rounded text-amber-600 accent-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-amber-900 block">
                    Superadmin Privileges
                  </span>
                  <span className="text-[11px] text-amber-700 block">
                    Grants access to deployment branding & module settings
                  </span>
                </div>
              </label>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <DialogFooter className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
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

