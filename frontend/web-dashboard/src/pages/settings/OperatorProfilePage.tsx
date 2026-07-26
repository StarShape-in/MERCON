import { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { User, Mail, Phone, Shield, Save } from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import FormInput from '@/components/ui/FormInput';
import Btn from '@/components/ui/Btn';
import { authService } from '@/services/authService';

export default function OperatorProfilePage() {
  const { data: user, isLoading, refetch } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authService.getMe,
  });

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const [saveError, setSaveError] = useState('');

  // Password change
  const [showPwd, setShowPwd] = useState(false);
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' });
  const [pwdMsg, setPwdMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (user) {
      const [firstName = '', ...rest] = (user.name || '').split(' ');
      setForm({ firstName, lastName: rest.join(' '), email: user.email || '', phone: user.phone || '' });
    }
  }, [user]);

  const set = (field: keyof typeof form, value: string) => setForm((p) => ({ ...p, [field]: value }));

  const saveMutation = useMutation({
    mutationFn: () =>
      authService.updateMe({
        name: `${form.firstName} ${form.lastName}`.trim(),
        email: form.email || undefined,
        phone: form.phone || undefined,
      }),
    onSuccess: () => { setIsEditing(false); setSaveError(''); refetch(); },
    onError: (err: any) => setSaveError(err?.response?.data?.error?.message || 'Failed to save profile.'),
  });

  const pwdMutation = useMutation({
    mutationFn: () => authService.changePassword(pwd.current, pwd.next),
    onSuccess: () => { setPwdMsg({ ok: true, text: 'Password updated.' }); setPwd({ current: '', next: '', confirm: '' }); setShowPwd(false); },
    onError: (err: any) => setPwdMsg({ ok: false, text: err?.response?.data?.error?.message || 'Failed to update password.' }),
  });

  const submitPassword = () => {
    setPwdMsg(null);
    if (pwd.next.length < 8) return setPwdMsg({ ok: false, text: 'New password must be at least 8 characters.' });
    if (pwd.next !== pwd.confirm) return setPwdMsg({ ok: false, text: 'New passwords do not match.' });
    pwdMutation.mutate();
  };

  const initials = `${form.firstName[0] ?? ''}${form.lastName[0] ?? ''}` || (user?.username?.[0]?.toUpperCase() ?? '?');

  return (
    <DashboardLayout
      active="Settings"
      title="My Profile"
      breadcrumb="Settings"
      pageTitle="Operator Profile"
      pageSub="Manage your personal information and account settings."
      actions={
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Btn label="Cancel" variant="ghost" onClick={() => { setIsEditing(false); setSaveError(''); refetch(); }} />
              <Btn label={saveMutation.isPending ? 'Saving…' : 'Save Changes'} icon={<Save size={14} />} onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} />
            </>
          ) : (
            <Btn label="Edit Profile" onClick={() => setIsEditing(true)} disabled={isLoading} />
          )}
        </div>
      }
    >
      <div className="px-6 pb-6 max-w-5xl mx-auto w-full flex flex-col gap-6">

        {saveError && (
          <div className="bg-[#FEF2F2] border border-[#DC2626]/20 text-[#DC2626] p-3 rounded-lg text-sm font-bold">{saveError}</div>
        )}

        {/* Top Box: Avatar + Personal Info */}
        <div className="bg-white border border-black/[0.08] rounded-lg shadow-sm flex flex-col lg:flex-row">

          {/* Avatar Section (Left) */}
          <div className="w-full lg:w-1/3 p-6 border-b lg:border-b-0 lg:border-r border-black/[0.08] text-center relative overflow-hidden flex flex-col">
            <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-br from-[#E8450F]/20 to-transparent"></div>

            <div className="relative mt-8 mb-4">
              <div className="w-24 h-24 mx-auto bg-white rounded-full border-4 border-white shadow-md flex items-center justify-center relative">
                <div className="w-full h-full rounded-full bg-[#F5F5F7] flex items-center justify-center text-4xl font-bold text-[#E8450F] uppercase">
                  {initials}
                </div>
              </div>
            </div>

            <h2 className="text-xl font-bold text-[#111] mb-1">{form.firstName} {form.lastName}</h2>
            <p className="text-sm font-medium text-[#E8450F] mb-4">{user?.role ?? '—'}</p>

            <div className="flex justify-center gap-2 mb-6">
              <span className="bg-[#F0FDF4] text-[#16A34A] border border-[#16A34A]/20 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider">
                Active Account
              </span>
            </div>

            <div className="border-t border-black/[0.04] pt-4 space-y-3 text-left mt-auto">
              <div className="flex items-center gap-3 text-sm text-[#444]">
                <Mail size={14} className="text-[#9898A4]" />
                <span className="truncate">{form.email || '—'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-[#444]">
                <Phone size={14} className="text-[#9898A4]" />
                <span>{form.phone || '—'}</span>
              </div>
            </div>
          </div>

          {/* Personal Information (Right) */}
          <div className="w-full lg:w-2/3 p-6 flex flex-col">
            <h3 className="text-lg font-bold text-[#111] mb-6 flex items-center gap-2 pb-4 border-b border-black/[0.04]">
              <User size={18} className="text-[#E8450F]" /> Personal Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 flex-1 content-start">
              <FormInput label="First Name" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} disabled={!isEditing} />
              <FormInput label="Last Name" value={form.lastName} onChange={(e) => set('lastName', e.target.value)} disabled={!isEditing} />
              <FormInput label="Email Address" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} disabled={!isEditing} />
              <FormInput label="Phone Number" value={form.phone} onChange={(e) => set('phone', e.target.value)} disabled={!isEditing} />
            </div>
          </div>
        </div>

        {/* Bottom Row: Security + Account */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Security & Access Box */}
          <div className="lg:col-span-1 bg-white border border-black/[0.08] rounded-lg p-6 shadow-sm h-full flex flex-col">
            <h3 className="text-lg font-bold text-[#111] mb-6 flex items-center gap-2 pb-4 border-b border-black/[0.04]">
              <Shield size={18} className="text-[#E8450F]" /> Security & Access
            </h3>

            {!showPwd ? (
              <button onClick={() => { setShowPwd(true); setPwdMsg(null); }} className="text-xs font-bold text-[#E8450F] hover:underline self-start">
                Update Password
              </button>
            ) : (
              <div className="space-y-3">
                <FormInput label="Current Password" type="password" value={pwd.current} onChange={(e) => setPwd((p) => ({ ...p, current: e.target.value }))} />
                <FormInput label="New Password" type="password" value={pwd.next} onChange={(e) => setPwd((p) => ({ ...p, next: e.target.value }))} />
                <FormInput label="Confirm New Password" type="password" value={pwd.confirm} onChange={(e) => setPwd((p) => ({ ...p, confirm: e.target.value }))} />
                <div className="flex gap-2 pt-1">
                  <Btn label={pwdMutation.isPending ? 'Saving…' : 'Save Password'} onClick={submitPassword} disabled={pwdMutation.isPending} />
                  <Btn label="Cancel" variant="ghost" onClick={() => { setShowPwd(false); setPwd({ current: '', next: '', confirm: '' }); setPwdMsg(null); }} />
                </div>
              </div>
            )}

            {pwdMsg && (
              <p className={`text-xs font-bold mt-3 ${pwdMsg.ok ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>{pwdMsg.text}</p>
            )}
          </div>

          {/* Account Box */}
          <div className="lg:col-span-2 bg-white border border-black/[0.08] rounded-lg p-6 shadow-sm h-full flex flex-col">
            <h3 className="text-lg font-bold text-[#111] mb-6 flex items-center gap-2 pb-4 border-b border-black/[0.04]">
              <User size={18} className="text-[#E8450F]" /> Account
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 flex-1 content-start">
              <FormInput label="Username" value={user?.username || ''} disabled />
              <FormInput label="System Role" value={user?.role || ''} disabled />
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}
