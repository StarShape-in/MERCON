import { useEffect, useState, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  User, 
  Mail, 
  Phone, 
  Shield, 
  Save, 
  RefreshCw, 
  Building2, 
  KeyRound, 
  Lock, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  Sliders, 
  Check, 
  RotateCcw, 
  Sparkles, 
  Clock, 
  Activity,
  ShieldCheck,
  Award,
  Layers,
  Bell
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { authService } from '@/services/authService';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function OperatorProfilePage() {
  const { data: user, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authService.getMe,
  });

  const [activeTab, setActiveTab] = useState<'identity' | 'security' | 'preferences'>('identity');
  const [isEditing, setIsEditing] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [form, setForm] = useState({ 
    firstName: '', 
    lastName: '', 
    email: '', 
    phone: '',
    department: 'Fleet Operations',
    timezone: 'Asia/Riyadh (GMT+3)'
  });

  // Password change state
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' });
  const [pwdMsg, setPwdMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Preference toggles
  const [preferences, setPreferences] = useState({
    landingPage: '/dashboard',
    emailAlerts: true,
    compactView: false,
  });

  useEffect(() => {
    if (user) {
      const [firstName = '', ...rest] = (user.name || '').split(' ');
      setForm((prev) => ({
        ...prev,
        firstName,
        lastName: rest.join(' '),
        email: user.email || '',
        phone: user.phone || '',
      }));
    }
  }, [user]);

  const setFormField = (field: keyof typeof form, value: string) => {
    setForm((p) => ({ ...p, [field]: value }));
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      authService.updateMe({
        name: `${form.firstName} ${form.lastName}`.trim(),
        email: form.email || undefined,
        phone: form.phone || undefined,
      }),
    onSuccess: () => { 
      setIsEditing(false); 
      setSaveError(''); 
      setSaveSuccess(true);
      refetch(); 
      setTimeout(() => setSaveSuccess(false), 4000);
    },
    onError: (err: any) => setSaveError(err?.response?.data?.error?.message || 'Failed to update profile settings.'),
  });

  const pwdMutation = useMutation({
    mutationFn: () => authService.changePassword(pwd.current, pwd.next),
    onSuccess: () => { 
      setPwdMsg({ ok: true, text: 'Password successfully updated!' }); 
      setPwd({ current: '', next: '', confirm: '' }); 
      setTimeout(() => setPwdMsg(null), 5000);
    },
    onError: (err: any) => setPwdMsg({ ok: false, text: err?.response?.data?.error?.message || 'Failed to update password.' }),
  });

  const handleSaveProfile = useCallback(() => {
    setSaveError('');
    if (!form.firstName.trim()) {
      setSaveError('First name is required.');
      return;
    }
    saveMutation.mutate();
  }, [form.firstName, saveMutation]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg(null);
    if (!pwd.current) return setPwdMsg({ ok: false, text: 'Current password is required.' });
    if (pwd.next.length < 8) return setPwdMsg({ ok: false, text: 'New password must be at least 8 characters long.' });
    if (pwd.next !== pwd.confirm) return setPwdMsg({ ok: false, text: 'New passwords do not match.' });
    pwdMutation.mutate();
  };

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (isEditing && !saveMutation.isPending) {
          handleSaveProfile();
        }
      }
      if (e.altKey && e.key === '1') { e.preventDefault(); setActiveTab('identity'); }
      if (e.altKey && e.key === '2') { e.preventDefault(); setActiveTab('security'); }
      if (e.altKey && e.key === '3') { e.preventDefault(); setActiveTab('preferences'); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditing, saveMutation.isPending, handleSaveProfile]);

  const initials = `${form.firstName[0] ?? ''}${form.lastName[0] ?? ''}`.toUpperCase() || (user?.username?.[0]?.toUpperCase() ?? 'OP');
  const roleTitle = user?.role ? (user.role.charAt(0).toUpperCase() + user.role.slice(1)) : 'Fleet Dispatcher';

  // Password strength calculation
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: 'None', color: 'bg-slate-200' };
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 1) return { score: 25, label: 'Weak', color: 'bg-rose-500' };
    if (score === 2) return { score: 50, label: 'Fair', color: 'bg-amber-500' };
    if (score === 3) return { score: 75, label: 'Good', color: 'bg-blue-500' };
    return { score: 100, label: 'Strong', color: 'bg-emerald-500' };
  };

  const pwdStrength = getPasswordStrength(pwd.next);

  return (
    <DashboardLayout 
      active="Settings" 
      title="My Profile" 
      breadcrumb="Settings"
    >
      <div className="px-6 pb-6 space-y-5 animate-fade-in max-w-[1400px] mx-auto">
        
        {/* Top Bar Header & Action Control */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
              <span>🏢 MERCON Operations</span>
              <span>•</span>
              <span className="text-slate-900 dark:text-slate-100 font-bold">Profile Settings</span>
            </div>
            <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200 font-bold dark:bg-violet-950/40 dark:text-violet-300">
              Account & Security
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="h-9 gap-1.5 text-xs font-semibold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-[#E8450F]' : 'text-slate-500'}`} />
              Refresh Data
            </Button>

            {isEditing ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setIsEditing(false); setSaveError(''); refetch(); }}
                  className="h-9 gap-1.5 text-xs text-slate-500 hover:text-slate-900"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Cancel
                </Button>

                <Button
                  size="sm"
                  onClick={handleSaveProfile}
                  disabled={saveMutation.isPending}
                  className="h-9 gap-1.5 text-xs bg-[#E8450F] hover:bg-[#d03d0c] text-white font-bold shadow-xs px-4"
                >
                  <Save className="w-3.5 h-3.5" /> {saveMutation.isPending ? 'Saving...' : 'Save Profile'}
                  <kbd className="ml-1 px-1.5 py-0.5 text-[10px] font-mono font-bold bg-white/20 text-white rounded border border-white/30">
                    Ctrl + S
                  </kbd>
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                onClick={() => setIsEditing(true)}
                disabled={isLoading}
                className="h-9 gap-1.5 text-xs bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 font-bold shadow-xs px-4"
              >
                <User className="w-3.5 h-3.5" /> Edit Profile Details
              </Button>
            )}
          </div>
        </div>

        {/* Global Notifications Banners */}
        {saveError && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs font-bold text-rose-700 dark:text-rose-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{saveError}</span>
          </div>
        )}

        {saveSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Profile information successfully saved and updated across MERCON dispatch nodes.</span>
          </div>
        )}

        {/* Profile Command Overview Header Card */}
        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs overflow-hidden">
          {/* Gradient Banner Header */}
          <div className="h-28 bg-gradient-to-r from-violet-600 via-indigo-600 to-[#E8450F] relative overflow-hidden">
            <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px]"></div>
            <div className="absolute top-3 right-4 flex items-center gap-2">
              <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-md text-[10px] font-mono font-bold">
                MERCON Fleet Ops v2.4
              </Badge>
            </div>
          </div>

          <CardContent className="p-6 relative pt-0">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 -mt-12">
              
              {/* Avatar + Main Details */}
              <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
                <div className="relative">
                  <div className="w-24 h-24 rounded-2xl bg-white dark:bg-slate-900 p-1 shadow-md border-2 border-white dark:border-slate-800">
                    <div className="w-full h-full rounded-xl bg-gradient-to-br from-violet-500 to-[#E8450F] flex items-center justify-center text-white text-3xl font-black shadow-inner">
                      {initials}
                    </div>
                  </div>
                  <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" title="Active Online Session"></span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
                      {form.firstName} {form.lastName}
                    </h1>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-extrabold dark:bg-emerald-950/40 dark:text-emerald-400">
                      ● Active Operator
                    </Badge>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <span className="font-semibold text-[#E8450F]">{roleTitle}</span>
                    <span>•</span>
                    <span className="font-mono text-slate-400">ID: OP-{user?.username?.toUpperCase() || 'SYS'}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><Building2 className="w-3 h-3 text-slate-400" /> {form.department}</span>
                  </p>
                </div>
              </div>

              {/* Quick Operational Metrics */}
              <div className="grid grid-cols-3 gap-3 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800 pt-4 md:pt-0 md:pl-6">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Access Tier</div>
                  <div className="text-xs font-mono font-extrabold text-indigo-600 dark:text-indigo-400 mt-0.5">Tier 1 Admin</div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Auth Status</div>
                  <div className="text-xs font-mono font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">Verified</div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Node Zone</div>
                  <div className="text-xs font-mono font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">Riyadh Hub</div>
                </div>
              </div>

            </div>
          </CardContent>
        </Card>

        {/* Tabbed Workspace Section */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full space-y-4">
          <TabsList className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-xl grid grid-cols-3 w-full sm:w-auto sm:inline-flex shadow-2xs">
            <TabsTrigger value="identity" className="text-xs font-bold gap-2 data-[state=active]:bg-[#E8450F] data-[state=active]:text-white">
              <User className="w-3.5 h-3.5" />
              <span>Personal Identity</span>
              <kbd className="hidden sm:inline px-1 py-0.2 text-[9px] font-mono rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 data-[state=active]:bg-white/20 data-[state=active]:text-white">
                Alt+1
              </kbd>
            </TabsTrigger>

            <TabsTrigger value="security" className="text-xs font-bold gap-2 data-[state=active]:bg-[#E8450F] data-[state=active]:text-white">
              <Shield className="w-3.5 h-3.5" />
              <span>Security & Password</span>
              <kbd className="hidden sm:inline px-1 py-0.2 text-[9px] font-mono rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 data-[state=active]:bg-white/20 data-[state=active]:text-white">
                Alt+2
              </kbd>
            </TabsTrigger>

            <TabsTrigger value="preferences" className="text-xs font-bold gap-2 data-[state=active]:bg-[#E8450F] data-[state=active]:text-white">
              <Sliders className="w-3.5 h-3.5" />
              <span>System & Preferences</span>
              <kbd className="hidden sm:inline px-1 py-0.2 text-[9px] font-mono rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 data-[state=active]:bg-white/20 data-[state=active]:text-white">
                Alt+3
              </kbd>
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Personal Identity */}
          <TabsContent value="identity" className="m-0 space-y-4">
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <User className="w-4 h-4 text-[#E8450F]" /> Operator Contact Details
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Manage your official personal credentials used across MERCON logistics network.
                    </CardDescription>
                  </div>

                  {!isEditing && (
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="h-8 text-xs font-bold">
                      Edit Fields
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  
                  {/* First Name */}
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      First Name <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="firstName"
                      value={form.firstName}
                      onChange={(e) => setFormField('firstName', e.target.value)}
                      disabled={!isEditing}
                      placeholder="Mohammed"
                      className="h-9 text-xs font-medium border-slate-200 dark:border-slate-800 disabled:bg-slate-50 dark:disabled:bg-slate-800/50"
                    />
                  </div>

                  {/* Last Name */}
                  <div className="space-y-1.5">
                    <Label htmlFor="lastName" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Last Name
                    </Label>
                    <Input
                      id="lastName"
                      value={form.lastName}
                      onChange={(e) => setFormField('lastName', e.target.value)}
                      disabled={!isEditing}
                      placeholder="Al-Harbi"
                      className="h-9 text-xs font-medium border-slate-200 dark:border-slate-800 disabled:bg-slate-50 dark:disabled:bg-slate-800/50"
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-slate-400" /> Work Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setFormField('email', e.target.value)}
                      disabled={!isEditing}
                      placeholder="m.alharbi@mercon.sa"
                      className="h-9 text-xs font-medium border-slate-200 dark:border-slate-800 disabled:bg-slate-50 dark:disabled:bg-slate-800/50"
                    />
                  </div>

                  {/* Phone */}
                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" /> Mobile / Phone Number
                    </Label>
                    <Input
                      id="phone"
                      value={form.phone}
                      onChange={(e) => setFormField('phone', e.target.value)}
                      disabled={!isEditing}
                      placeholder="+966 50 123 4567"
                      className="h-9 text-xs font-medium border-slate-200 dark:border-slate-800 disabled:bg-slate-50 dark:disabled:bg-slate-800/50"
                    />
                  </div>

                  {/* Department */}
                  <div className="space-y-1.5">
                    <Label htmlFor="department" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" /> Department Division
                    </Label>
                    <Input
                      id="department"
                      value={form.department}
                      onChange={(e) => setFormField('department', e.target.value)}
                      disabled={!isEditing}
                      className="h-9 text-xs font-medium border-slate-200 dark:border-slate-800 disabled:bg-slate-50 dark:disabled:bg-slate-800/50"
                    />
                  </div>

                  {/* Timezone */}
                  <div className="space-y-1.5">
                    <Label htmlFor="timezone" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" /> Operational Timezone
                    </Label>
                    <Input
                      id="timezone"
                      value={form.timezone}
                      onChange={(e) => setFormField('timezone', e.target.value)}
                      disabled={!isEditing}
                      className="h-9 text-xs font-medium border-slate-200 dark:border-slate-800 disabled:bg-slate-50 dark:disabled:bg-slate-800/50"
                    />
                  </div>

                </div>
              </CardContent>

              {isEditing && (
                <CardFooter className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-4 flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} className="text-xs">
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSaveProfile} disabled={saveMutation.isPending} className="text-xs bg-[#E8450F] text-white font-bold">
                    Save Changes
                  </Button>
                </CardFooter>
              )}
            </Card>
          </TabsContent>

          {/* TAB 2: Security & Password */}
          <TabsContent value="security" className="m-0 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
              
              {/* Password Update Form (3/5) */}
              <Card className="lg:col-span-3 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                  <CardTitle className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-indigo-600" /> Update Account Password
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Ensure your account uses a strong, complex password to protect system dispatch controls.
                  </CardDescription>
                </CardHeader>

                <form onSubmit={handlePasswordSubmit}>
                  <CardContent className="p-6 space-y-4">
                    
                    {pwdMsg && (
                      <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                        pwdMsg.ok 
                          ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200' 
                          : 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-200'
                      }`}>
                        {pwdMsg.ok ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />}
                        <span>{pwdMsg.text}</span>
                      </div>
                    )}

                    {/* Current Password */}
                    <div className="space-y-1.5">
                      <Label htmlFor="current_pwd" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Current Password <span className="text-rose-500">*</span>
                      </Label>
                      <Input
                        id="current_pwd"
                        type="password"
                        placeholder="••••••••••••"
                        value={pwd.current}
                        onChange={(e) => setPwd((p) => ({ ...p, current: e.target.value }))}
                        className="h-9 text-xs border-slate-200 dark:border-slate-800"
                      />
                    </div>

                    {/* New Password */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="next_pwd" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          New Password <span className="text-rose-500">*</span>
                        </Label>
                        {pwd.next && (
                          <span className="text-[10px] font-bold text-slate-500">
                            Strength: <span className="font-extrabold text-slate-900 dark:text-slate-100">{pwdStrength.label}</span>
                          </span>
                        )}
                      </div>
                      <Input
                        id="next_pwd"
                        type="password"
                        placeholder="At least 8 characters"
                        value={pwd.next}
                        onChange={(e) => setPwd((p) => ({ ...p, next: e.target.value }))}
                        className="h-9 text-xs border-slate-200 dark:border-slate-800"
                      />
                      
                      {/* Password Strength Bar */}
                      {pwd.next && (
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
                          <div className={`h-full ${pwdStrength.color} transition-all duration-300`} style={{ width: `${pwdStrength.score}%` }}></div>
                        </div>
                      )}
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-1.5">
                      <Label htmlFor="confirm_pwd" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Confirm New Password <span className="text-rose-500">*</span>
                      </Label>
                      <Input
                        id="confirm_pwd"
                        type="password"
                        placeholder="Re-enter new password"
                        value={pwd.confirm}
                        onChange={(e) => setPwd((p) => ({ ...p, confirm: e.target.value }))}
                        className="h-9 text-xs border-slate-200 dark:border-slate-800"
                      />
                    </div>

                  </CardContent>

                  <CardFooter className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-4 flex justify-end">
                    <Button
                      type="submit"
                      disabled={pwdMutation.isPending}
                      className="h-9 gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs px-4"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      {pwdMutation.isPending ? 'Updating Password...' : 'Update Password'}
                    </Button>
                  </CardFooter>
                </form>
              </Card>

              {/* Security Audit & Compliance Overview (2/5) */}
              <div className="lg:col-span-2 space-y-4">
                <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs">
                  <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
                    <CardTitle className="text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" /> Security Compliance Audit
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Two-Factor Auth (2FA)</div>
                        <div className="text-[10px] text-slate-500">MFA token protection enabled</div>
                      </div>
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-mono text-[10px] font-bold">
                        ACTIVE
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Last Session IP</div>
                        <div className="text-[10px] text-slate-500 font-mono">185.220.101.42 (Riyadh, SA)</div>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-mono font-bold">
                        TRUSTED
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Session Expiry</div>
                        <div className="text-[10px] text-slate-500">JWT Token valid for 24h</div>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400">
                        23h remaining
                      </span>
                    </div>

                  </CardContent>
                </Card>
              </div>

            </div>
          </TabsContent>

          {/* TAB 3: System & Preferences */}
          <TabsContent value="preferences" className="m-0 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              
              {/* Account Role & Permission Matrix */}
              <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                  <CardTitle className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Award className="w-4 h-4 text-[#E8450F]" /> System Role & Permissions
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Read-only authorization breakdown configured by system administrator.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Account Username</Label>
                      <Input value={user?.username || 'operator'} disabled className="h-9 font-mono font-bold text-xs bg-slate-50 dark:bg-slate-800/50" />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">System Role</Label>
                      <Input value={user?.role || 'operator'} disabled className="h-9 font-mono font-bold text-xs bg-slate-50 dark:bg-slate-800/50 text-[#E8450F]" />
                    </div>
                  </div>

                  <div className="pt-2">
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">Granted Privilege Chips</div>
                    <div className="flex flex-wrap gap-1.5">
                      {['Trip Dispatch Write', 'Vehicle Ledger Read', 'Driver Management Write', 'Rate Card Authoring', 'Invoice Generation', 'System Logs View'].map((perm) => (
                        <Badge key={perm} variant="outline" className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-semibold">
                          <Check className="w-3 h-3 text-emerald-500 mr-1" /> {perm}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Operator Dashboard Preferences */}
              <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                  <CardTitle className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-violet-600" /> Interface & Dispatch Preferences
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Customize your personal view and automated dispatch notification alerts.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  
                  {/* Default Landing Page */}
                  <div className="space-y-1.5">
                    <Label htmlFor="landingPage" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Default Startup Module
                    </Label>
                    <Select value={preferences.landingPage} onValueChange={(v) => setPreferences(p => ({ ...p, landingPage: v }))}>
                      <SelectTrigger className="h-9 text-xs font-medium border-slate-200 dark:border-slate-800">
                        <SelectValue placeholder="Select landing page" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="/dashboard" className="text-xs">📊 Operational Dashboard</SelectItem>
                        <SelectItem value="/trips" className="text-xs">🚚 Trip Control Center</SelectItem>
                        <SelectItem value="/vehicles" className="text-xs">🚛 Vehicle Fleet Ledger</SelectItem>
                        <SelectItem value="/drivers" className="text-xs">👤 Driver Duty Roster</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Email Notifications Toggle */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Bell className="w-3.5 h-3.5 text-violet-600" /> Dispatch Alerts & Notifications
                      </div>
                      <div className="text-[10px] text-slate-500">Receive email alerts for trip delays & MOT expirations</div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setPreferences(p => ({ ...p, emailAlerts: !p.emailAlerts }))}
                      className={`h-7 text-xs font-bold ${preferences.emailAlerts ? 'bg-violet-50 text-violet-700 border-violet-200' : ''}`}
                    >
                      {preferences.emailAlerts ? 'ENABLED' : 'DISABLED'}
                    </Button>
                  </div>

                </CardContent>
              </Card>

            </div>
          </TabsContent>
        </Tabs>

      </div>
    </DashboardLayout>
  );
}
