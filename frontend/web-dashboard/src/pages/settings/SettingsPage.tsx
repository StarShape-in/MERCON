import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  User, Shield, Building2, Bell, Key, Save, CheckCircle2,
  AlertTriangle, RefreshCw, Upload, Loader2
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { authService } from '@/services/authService';
import { settingsService } from '@/services/settingsService';
import { MODULE_KEYS, COMMON_TIMEZONES, type ModuleKey } from '@mercon/shared-types';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'profile' | 'company' | 'security' | 'notifications'>('profile');
  // Feedback Messages
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [notifSuccess, setNotifSuccess] = useState<string | null>(null);

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
  });

  // Password Form State
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  // Notification Preferences State
  const [notifPrefs, setNotifPrefs] = useState({
    email_dispatch: true,
    sms_alerts: true,
    document_expiry: true,
    weekly_reports: false,
  });

  // Fetch Current Auth User
  const { data: user, isLoading } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authService.getMe,
  });

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  // Deployment branding + modules (superadmin-editable) — only fetched once
  // logged in, so it's fine to always call this; the tab itself is gated.
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsService.get,
  });

  const [brandingForm, setBrandingForm] = useState({
    appName: '',
    companyLegalName: '',
    logoUrl: '',
    primaryColor: '#E8450F',
    timezone: 'Asia/Riyadh',
  });
  const [enabledModules, setEnabledModules] = useState<ModuleKey[]>([]);
  const [brandingSuccess, setBrandingSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setBrandingForm({
        appName: settings.appName,
        companyLegalName: settings.companyLegalName,
        logoUrl: settings.logoUrl || '',
        primaryColor: settings.primaryColor,
        timezone: settings.timezone || 'Asia/Riyadh',
      });
      setEnabledModules(settings.enabledModules);
    }
  }, [settings]);

  const updateSettingsMutation = useMutation({
    mutationFn: () => settingsService.update({ ...brandingForm, enabledModules }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      queryClient.invalidateQueries({ queryKey: ['settings', 'public'] });
      setBrandingSuccess('Branding & modules updated!');
      setTimeout(() => setBrandingSuccess(null), 4000);
    },
  });

  const [logoError, setLogoError] = useState<string | null>(null);
  const uploadLogoMutation = useMutation({
    mutationFn: (file: File) => settingsService.uploadLogo(file),
    onSuccess: (fileUrl) => {
      setBrandingForm((f) => ({ ...f, logoUrl: fileUrl }));
      setLogoError(null);
    },
    onError: (err: any) => {
      setLogoError(err.response?.data?.error?.message || err.message || 'Upload failed.');
    },
  });

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (file) uploadLogoMutation.mutate(file);
  };

  const toggleModule = (key: ModuleKey) => {
    setEnabledModules((prev) => (prev.includes(key) ? prev.filter((m) => m !== key) : [...prev, key]));
  };

  // Update Profile Mutation (Real Backend)
  const updateProfileMutation = useMutation({
    mutationFn: (payload: { name?: string; email?: string; phone?: string }) => authService.updateMe(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      setProfileSuccess('Profile details successfully updated!');
      setProfileError(null);
      setTimeout(() => setProfileSuccess(null), 4000);
    },
    onError: (err: any) => {
      setProfileError(err.response?.data?.error?.message || err.message || 'Failed to update profile.');
      setProfileSuccess(null);
    },
  });

  // Change Password Mutation (Real Backend)
  const changePasswordMutation = useMutation({
    mutationFn: (payload: { current_password: string; new_password: string }) => 
      authService.changePassword(payload.current_password, payload.new_password),
    onSuccess: () => {
      setPasswordSuccess('Password changed successfully!');
      setPasswordError(null);
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      setTimeout(() => setPasswordSuccess(null), 4000);
    },
    onError: (err: any) => {
      setPasswordError(err.response?.data?.error?.message || err.message || 'Failed to change password. Verify your current password.');
      setPasswordSuccess(null);
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess(null);
    setProfileError(null);

    if (!profileForm.name.trim()) {
      setProfileError('Full name cannot be empty.');
      return;
    }

    updateProfileMutation.mutate({
      name: profileForm.name.trim(),
      email: profileForm.email.trim() || undefined,
      phone: profileForm.phone.trim() || undefined,
    });
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess(null);
    setPasswordError(null);

    if (!passwordForm.current_password) {
      setPasswordError('Current password is required.');
      return;
    }
    if (passwordForm.new_password.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    changePasswordMutation.mutate({
      current_password: passwordForm.current_password,
      new_password: passwordForm.new_password,
    });
  };

  const handleNotifSave = () => {
    setNotifSuccess('Notification preferences saved!');
    setTimeout(() => setNotifSuccess(null), 3000);
  };

  const initials = user?.name ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'ME';

  return (
    <DashboardLayout 
      active="Account" 
      title="Settings" 
    >
      <div className="px-4 sm:px-6 pb-6 h-full flex flex-col animate-fade-in gap-5 max-w-[1200px] mx-auto w-full">
        
        {/* Page Content Header Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 shrink-0 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <User className="w-6 h-6 text-orange-500 dark:text-orange-400 shrink-0" />

            <div className="flex flex-col">
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                  Account Settings
                </h1>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Manage your user profile, security credentials, and organization preferences
              </p>
            </div>
          </div>
        </div>

        {/* Clean Horizontal Tab Controller */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-1.5 shadow-2xs shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
                activeTab === 'profile'
                  ? 'bg-brand text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <User className="h-4 w-4" /> My Profile
            </button>

            <button
              onClick={() => setActiveTab('company')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
                activeTab === 'company'
                  ? 'bg-brand text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Building2 className="h-4 w-4" /> Company Details
            </button>

            <button
              onClick={() => setActiveTab('security')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
                activeTab === 'security'
                  ? 'bg-brand text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Shield className="h-4 w-4" /> Security & Password
            </button>

            <button
              onClick={() => setActiveTab('notifications')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
                activeTab === 'notifications'
                  ? 'bg-brand text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Bell className="h-4 w-4" /> Notifications
            </button>
          </div>
        </div>

        {/* Tab 1: Profile Information */}
        {activeTab === 'profile' && (
          <Card className="border border-slate-200 dark:border-slate-800 shadow-2xs rounded-xl bg-white dark:bg-slate-900">
            <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <User className="h-4.5 w-4.5 text-indigo-600" /> Personal Profile Information
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Update your account details and contact information.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleProfileSubmit}>
              <CardContent className="pt-5 space-y-6">
                
                <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700">
                  <div className="w-14 h-14 rounded-full bg-brand text-white font-extrabold text-lg flex items-center justify-center shadow-xs shrink-0">
                    {initials}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{user?.name || 'Administrator'}</h3>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">{user?.email || 'operator@mercon.tech'}</p>
                    <Badge variant="outline" className="mt-1.5 bg-indigo-50 text-indigo-600 border-indigo-200 text-[9px] font-bold uppercase">
                      {user?.role || 'SYSTEM OPERATOR'}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="prof_name" className="text-xs font-bold text-slate-700 dark:text-slate-300">Full Name</Label>
                    <Input
                      id="prof_name"
                      value={profileForm.name}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                      className="h-9 text-xs font-semibold border-slate-200 focus-visible:ring-brand/20 focus-visible:border-brand"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="prof_email" className="text-xs font-bold text-slate-700 dark:text-slate-300">Email Address</Label>
                    <Input
                      id="prof_email"
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                      className="h-9 text-xs font-semibold border-slate-200 focus-visible:ring-brand/20 focus-visible:border-brand"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="prof_phone" className="text-xs font-bold text-slate-700 dark:text-slate-300">Phone Number</Label>
                    <Input
                      id="prof_phone"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+966 50 000 0000"
                      className="h-9 text-xs font-mono font-medium border-slate-200 focus-visible:ring-brand/20 focus-visible:border-brand"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Account Role</Label>
                    <Input
                      value={user?.role || 'Operator'}
                      readOnly
                      className="h-9 text-xs font-bold bg-slate-100 dark:bg-slate-800 border-slate-200 text-slate-500 cursor-not-allowed"
                    />
                  </div>
                </div>

                {profileSuccess && (
                  <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-semibold border border-emerald-200 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    {profileSuccess}
                  </div>
                )}

                {profileError && (
                  <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-xs font-semibold border border-rose-200 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    {profileError}
                  </div>
                )}

              </CardContent>

              <CardFooter className="bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 p-4 flex justify-end">
                <Button 
                  type="submit" 
                  disabled={updateProfileMutation.isPending}
                  className="h-9 text-xs bg-brand hover:bg-brand-hover text-white font-bold px-5 shadow-xs rounded-md gap-1.5"
                >
                  <Save className="h-3.5 w-3.5" />
                  {updateProfileMutation.isPending ? 'Saving...' : 'Save Profile Details'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        )}

        {/* Tab 2: Company Details / Branding & Modules */}
        {activeTab === 'company' && (
          <Card className="border border-slate-200 dark:border-slate-800 shadow-2xs rounded-xl bg-white dark:bg-slate-900">
            <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Building2 className="h-4.5 w-4.5 text-indigo-600" /> Deployment Branding & Modules
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                {user?.isSuperAdmin
                  ? 'This deployment’s name, logo, brand color, and which optional modules are visible.'
                  : 'Deployment branding and modules — editable by a superadmin only.'}
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">App Name</Label>
                  <Input
                    value={brandingForm.appName}
                    readOnly={!user?.isSuperAdmin}
                    onChange={(e) => setBrandingForm((f) => ({ ...f, appName: e.target.value }))}
                    className="h-9 text-xs font-bold border-slate-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Company Legal Name</Label>
                  <Input
                    value={brandingForm.companyLegalName}
                    readOnly={!user?.isSuperAdmin}
                    onChange={(e) => setBrandingForm((f) => ({ ...f, companyLegalName: e.target.value }))}
                    className="h-9 text-xs font-bold border-slate-200"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Logo</Label>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 shrink-0 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
                      {brandingForm.logoUrl ? (
                        <img src={brandingForm.logoUrl} alt="Logo preview" className="h-full w-full object-contain" />
                      ) : (
                        <Building2 className="h-5 w-5 text-slate-300" />
                      )}
                    </div>
                    <Input
                      value={brandingForm.logoUrl}
                      readOnly={!user?.isSuperAdmin}
                      onChange={(e) => setBrandingForm((f) => ({ ...f, logoUrl: e.target.value }))}
                      placeholder="Upload a file, or paste an image URL"
                      className="h-9 text-xs font-mono border-slate-200 flex-1"
                    />
                    {user?.isSuperAdmin && (
                      <>
                        <input
                          id="logo-upload-input"
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={handleLogoFileChange}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-9 text-xs font-semibold shrink-0"
                          disabled={uploadLogoMutation.isPending}
                          onClick={() => document.getElementById('logo-upload-input')?.click()}
                        >
                          {uploadLogoMutation.isPending ? (
                            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                          ) : (
                            <Upload className="h-3.5 w-3.5 mr-1.5" />
                          )}
                          Upload
                        </Button>
                      </>
                    )}
                  </div>
                  {logoError && <p className="text-xs text-red-600">{logoError}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Primary Brand Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={brandingForm.primaryColor}
                      disabled={!user?.isSuperAdmin}
                      onChange={(e) => setBrandingForm((f) => ({ ...f, primaryColor: e.target.value }))}
                      className="h-9 w-9 rounded border border-slate-200 disabled:opacity-60"
                    />
                    <Input
                      value={brandingForm.primaryColor}
                      readOnly={!user?.isSuperAdmin}
                      onChange={(e) => setBrandingForm((f) => ({ ...f, primaryColor: e.target.value }))}
                      className="h-9 text-xs font-mono border-slate-200"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Timezone</Label>
                  <select
                    value={brandingForm.timezone}
                    disabled={!user?.isSuperAdmin}
                    onChange={(e) => setBrandingForm((f) => ({ ...f, timezone: e.target.value }))}
                    className="h-9 w-full text-xs font-semibold border border-slate-200 rounded-md px-2.5 bg-white dark:bg-slate-900 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {COMMON_TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500">All dates/times across the dashboard and driver app display in this timezone.</p>
                </div>
              </div>

              <div className="pt-2">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">Enabled Modules</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {MODULE_KEYS.map((key) => (
                    <label
                      key={key}
                      className={`flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg border cursor-pointer ${
                        enabledModules.includes(key)
                          ? 'border-brand/40 bg-brand/5 text-brand'
                          : 'border-slate-200 text-slate-500'
                      } ${!user?.isSuperAdmin ? 'pointer-events-none opacity-70' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={enabledModules.includes(key)}
                        onChange={() => toggleModule(key)}
                        disabled={!user?.isSuperAdmin}
                      />
                      {key}
                    </label>
                  ))}
                </div>
              </div>
            </CardContent>

            <CardFooter className="bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 p-4 flex justify-between items-center">
              <span className="text-xs text-slate-500">
                {brandingSuccess || (user?.isSuperAdmin ? 'Changes apply to everyone on this deployment.' : 'Locked by System Administrator.')}
              </span>
              {user?.isSuperAdmin ? (
                <Button
                  size="sm"
                  className="h-9 text-xs font-semibold bg-brand hover:bg-brand-hover text-white"
                  onClick={() => updateSettingsMutation.mutate()}
                  disabled={updateSettingsMutation.isPending}
                >
                  <Save className="h-3.5 w-3.5 mr-1.5" /> Save
                </Button>
              ) : (
                <Button disabled variant="outline" size="sm" className="h-9 text-xs font-semibold">
                  Locked
                </Button>
              )}
            </CardFooter>
          </Card>
        )}

        {/* Tab 3: Security & Passwords */}
        {activeTab === 'security' && (
          <Card className="border border-slate-200 dark:border-slate-800 shadow-2xs rounded-xl bg-white dark:bg-slate-900">
            <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Shield className="h-4.5 w-4.5 text-indigo-600" /> Security & Password Management
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Change account login password securely.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handlePasswordSubmit}>
              <CardContent className="pt-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  
                  <div className="space-y-1.5">
                    <Label htmlFor="cur_pwd" className="text-xs font-bold text-slate-700 dark:text-slate-300">Current Password</Label>
                    <Input
                      id="cur_pwd"
                      type="password"
                      value={passwordForm.current_password}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, current_password: e.target.value }))}
                      placeholder="••••••••"
                      className="h-9 text-xs border-slate-200 focus-visible:ring-brand/20 focus-visible:border-brand"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="new_pwd" className="text-xs font-bold text-slate-700 dark:text-slate-300">New Password</Label>
                    <Input
                      id="new_pwd"
                      type="password"
                      value={passwordForm.new_password}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, new_password: e.target.value }))}
                      placeholder="••••••••"
                      className="h-9 text-xs border-slate-200 focus-visible:ring-brand/20 focus-visible:border-brand"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="cnf_pwd" className="text-xs font-bold text-slate-700 dark:text-slate-300">Confirm New Password</Label>
                    <Input
                      id="cnf_pwd"
                      type="password"
                      value={passwordForm.confirm_password}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, confirm_password: e.target.value }))}
                      placeholder="••••••••"
                      className="h-9 text-xs border-slate-200 focus-visible:ring-brand/20 focus-visible:border-brand"
                    />
                  </div>

                </div>

                {passwordSuccess && (
                  <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-semibold border border-emerald-200 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    {passwordSuccess}
                  </div>
                )}

                {passwordError && (
                  <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-xs font-semibold border border-rose-200 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    {passwordError}
                  </div>
                )}

              </CardContent>

              <CardFooter className="bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 p-4 flex justify-end">
                <Button 
                  type="submit" 
                  disabled={changePasswordMutation.isPending}
                  className="h-9 text-xs bg-brand hover:bg-brand-hover text-white font-bold px-5 shadow-xs rounded-md gap-1.5"
                >
                  <Key className="h-3.5 w-3.5" />
                  {changePasswordMutation.isPending ? 'Updating...' : 'Update Password'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        )}

        {/* Tab 4: Notifications */}
        {activeTab === 'notifications' && (
          <Card className="border border-slate-200 dark:border-slate-800 shadow-2xs rounded-xl bg-white dark:bg-slate-900">
            <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Bell className="h-4.5 w-4.5 text-indigo-600" /> Dispatch & System Notifications
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Configure real-time alerts, email summaries, and document expiry warnings.
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-5 space-y-4">
              <div className="space-y-3">
                
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Trip Dispatch Alerts</h4>
                    <p className="text-[11px] text-slate-500">Receive instant notifications when new trips are created or dispatched.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifPrefs.email_dispatch}
                    onChange={(e) => setNotifPrefs(prev => ({ ...prev, email_dispatch: e.target.checked }))}
                    className="w-4 h-4 rounded text-brand focus:ring-brand cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Document Expiry Warnings</h4>
                    <p className="text-[11px] text-slate-500">Get 30-day advance warnings for expiring driver licenses and vehicle permits.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifPrefs.document_expiry}
                    onChange={(e) => setNotifPrefs(prev => ({ ...prev, document_expiry: e.target.checked }))}
                    className="w-4 h-4 rounded text-brand focus:ring-brand cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">SMS Notifications to Drivers</h4>
                    <p className="text-[11px] text-slate-500">Send automated SMS dispatch links to drivers upon trip assignment.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifPrefs.sms_alerts}
                    onChange={(e) => setNotifPrefs(prev => ({ ...prev, sms_alerts: e.target.checked }))}
                    className="w-4 h-4 rounded text-brand focus:ring-brand cursor-pointer"
                  />
                </div>

              </div>

              {notifSuccess && (
                <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-semibold border border-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  {notifSuccess}
                </div>
              )}
            </CardContent>

            <CardFooter className="bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 p-4 flex justify-end">
              <Button 
                onClick={handleNotifSave}
                className="h-9 text-xs bg-brand hover:bg-brand-hover text-white font-bold px-5 shadow-xs rounded-md gap-1.5"
              >
                <Save className="h-3.5 w-3.5" /> Save Preferences
              </Button>
            </CardFooter>
          </Card>
        )}

      </div>
    </DashboardLayout>
  );
}
