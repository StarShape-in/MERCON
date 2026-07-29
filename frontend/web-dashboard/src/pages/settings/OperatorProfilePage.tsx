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
  Sliders, 
  Check, 
  RotateCcw, 
  Clock, 
  ShieldCheck, 
  Award, 
  Bell, 
  Laptop, 
  Smartphone, 
  Globe, 
  LogOut,
  IdCard,
  MapPin
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
import { cn } from '@/lib/utils';

// Mock active sessions data
interface LoginSession {
  id: string;
  device: string;
  browser: string;
  ip: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
  type: 'desktop' | 'mobile';
}

const INITIAL_SESSIONS: LoginSession[] = [
  { id: 'sess_1', device: 'Windows PC (Chrome)', browser: 'Chrome 126.0', ip: '185.220.101.42', location: 'Riyadh, SA', lastActive: 'Active now', isCurrent: true, type: 'desktop' },
  { id: 'sess_2', device: 'iPhone 15 Pro (Safari)', browser: 'Mobile Safari 17.4', ip: '94.201.18.99', location: 'Jeddah, SA', lastActive: '2 hours ago', isCurrent: false, type: 'mobile' },
  { id: 'sess_3', device: 'MacBook Pro (Firefox)', browser: 'Firefox 127.0', ip: '213.166.138.10', location: 'Dammam, SA', lastActive: 'Yesterday at 18:40', isCurrent: false, type: 'desktop' },
];

export default function OperatorProfilePage() {
  const { data: user, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authService.getMe,
  });

  const [activeTab, setActiveTab] = useState<'identity' | 'security' | 'notifications' | 'preferences'>('identity');
  const [isEditing, setIsEditing] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Active sessions state
  const [sessions, setSessions] = useState<LoginSession[]>(INITIAL_SESSIONS);

  // Profile Form state
  const [form, setForm] = useState({ 
    firstName: '', 
    lastName: '', 
    email: '', 
    phone: '',
    iqamaNumber: '1092837465',
    department: 'Fleet Operations',
    operatingHub: 'Riyadh Central Logistics Hub',
    timezone: 'Asia/Riyadh (GMT+3)'
  });

  // Password change state
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' });
  const [pwdMsg, setPwdMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Preference & Notification Toggles
  const [notifications, setNotifications] = useState({
    criticalDelays: true,
    documentExpiry: true,
    creditLimits: true,
    driverAlerts: false,
    dailyDigest: true,
  });

  const [preferences, setPreferences] = useState({
    landingPage: '/dashboard',
    compactView: false,
    timezone: 'Asia/Riyadh',
  });

  // Load User Data
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

  // Profile Save Mutation
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

  // Password Change Mutation
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

  const handleRevokeSession = (sessionId: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
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
      if (e.altKey && e.key === '3') { e.preventDefault(); setActiveTab('notifications'); }
      if (e.altKey && e.key === '4') { e.preventDefault(); setActiveTab('preferences'); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditing, saveMutation.isPending, handleSaveProfile]);

  const initials = `${form.firstName[0] ?? ''}${form.lastName[0] ?? ''}`.toUpperCase() || (user?.username?.[0]?.toUpperCase() ?? 'OP');
  const roleTitle = user?.role ? (user.role.charAt(0).toUpperCase() + user.role.slice(1)) : 'Fleet Dispatcher';

  // Password strength calculator
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
    <DashboardLayout active="Settings" title="Operator Profile">
      <div className="px-6 pb-6 space-y-6 animate-fade-in max-w-[1300px] mx-auto w-full">

        {/* ── Page Content Header ─────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/40 border border-violet-200/80 dark:border-violet-800/80 flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0 shadow-2xs">
              <User className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                  Operator Profile
                </h1>
                <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200/80 text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 dark:bg-violet-950/40 dark:text-violet-300">
                  Account & Security Hub
                </Badge>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Manage your profile details, security credentials, active sessions, and dispatch preferences
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="h-9 gap-1.5 text-xs font-semibold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs text-slate-700 dark:text-slate-300"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-[#E8450F]' : 'text-slate-500'}`} />
              Refresh
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
                  <Save className="w-3.5 h-3.5" /> {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                onClick={() => setIsEditing(true)}
                disabled={isLoading}
                className="h-9 gap-1.5 text-xs bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 font-bold shadow-xs px-4"
              >
                <User className="w-3.5 h-3.5" /> Edit Profile
              </Button>
            )}
          </div>
        </div>

        {/* ── Status Banners ────────────────────────────────────────────── */}
        {saveError && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs font-bold text-rose-700 dark:text-rose-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{saveError}</span>
          </div>
        )}

        {saveSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Profile information successfully updated across MERCON dispatch nodes.</span>
          </div>
        )}

        {/* ── Operator Command Profile Card ──────────────────────────────── */}
        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs overflow-hidden">
          <div className="h-24 bg-gradient-to-r from-violet-600 via-indigo-600 to-[#E8450F] relative">
            <div className="absolute top-3 right-4">
              <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-md text-[10px] font-mono font-bold">
                MERCON Fleet Ops v2.4
              </Badge>
            </div>
          </div>

          <CardContent className="p-6 pt-0 relative">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 -mt-10">
              
              {/* Avatar + Main Information */}
              <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
                <div className="relative">
                  <div className="w-20 h-20 rounded-2xl bg-white dark:bg-slate-900 p-1 shadow-md border-2 border-white dark:border-slate-800">
                    <div className="w-full h-full rounded-xl bg-gradient-to-br from-violet-500 to-[#E8450F] flex items-center justify-center text-white text-2xl font-black shadow-inner">
                      {initials}
                    </div>
                  </div>
                  <span className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" title="Active Session"></span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
                      {form.firstName} {form.lastName}
                    </h2>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-extrabold dark:bg-emerald-950/40 dark:text-emerald-400">
                      ● Active Session
                    </Badge>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-[#E8450F]">{roleTitle}</span>
                    <span>•</span>
                    <span className="font-mono text-slate-500">ID: OP-{user?.username?.toUpperCase() || 'SYS'}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" /> {form.department}
                    </span>
                  </p>
                </div>
              </div>

              {/* Quick Operational Telematics Gauges */}
              <div className="grid grid-cols-3 gap-3 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800 pt-4 md:pt-0 md:pl-6 shrink-0">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-center min-w-[100px]">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Access Tier</div>
                  <div className="text-xs font-mono font-extrabold text-indigo-600 dark:text-indigo-400 mt-0.5">Tier 1 Admin</div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-center min-w-[100px]">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Security 2FA</div>
                  <div className="text-xs font-mono font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">Protected</div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-center min-w-[100px]">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Operating Hub</div>
                  <div className="text-xs font-mono font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">Riyadh Hub</div>
                </div>
              </div>

            </div>
          </CardContent>
        </Card>

        {/* ── 4-Tab Workspace ────────────────────────────────────────────── */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full space-y-4">
          <TabsList className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-xl grid grid-cols-2 sm:grid-cols-4 w-full shadow-2xs">
            <TabsTrigger value="identity" className="text-xs font-bold gap-2 data-[state=active]:bg-[#E8450F] data-[state=active]:text-white rounded-lg">
              <User className="w-3.5 h-3.5" />
              <span>Identity & Contact</span>
            </TabsTrigger>

            <TabsTrigger value="security" className="text-xs font-bold gap-2 data-[state=active]:bg-[#E8450F] data-[state=active]:text-white rounded-lg">
              <Shield className="w-3.5 h-3.5" />
              <span>Security & 2FA</span>
            </TabsTrigger>

            <TabsTrigger value="notifications" className="text-xs font-bold gap-2 data-[state=active]:bg-[#E8450F] data-[state=active]:text-white rounded-lg">
              <Bell className="w-3.5 h-3.5" />
              <span>Notification Rules</span>
            </TabsTrigger>

            <TabsTrigger value="preferences" className="text-xs font-bold gap-2 data-[state=active]:bg-[#E8450F] data-[state=active]:text-white rounded-lg">
              <Sliders className="w-3.5 h-3.5" />
              <span>Roles & Preferences</span>
            </TabsTrigger>
          </TabsList>

          {/* ── TAB 1: Identity & Contact ──────────────────────────────────── */}
          <TabsContent value="identity" className="m-0">
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <User className="w-4 h-4 text-[#E8450F]" /> Personal & Logistics Credentials
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Manage your official personal contact details and regional dispatch assignment.
                    </CardDescription>
                  </div>

                  {!isEditing && (
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="h-8 text-xs font-bold border-slate-200 dark:border-slate-800">
                      Edit Credentials
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

                  {/* Work Email */}
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

                  {/* Mobile Phone */}
                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" /> Mobile / WhatsApp Number
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

                  {/* Saudi National ID / Iqama */}
                  <div className="space-y-1.5">
                    <Label htmlFor="iqama" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <IdCard className="w-3.5 h-3.5 text-slate-400" /> Saudi Iqama / National ID Ref
                    </Label>
                    <Input
                      id="iqama"
                      value={form.iqamaNumber}
                      onChange={(e) => setFormField('iqamaNumber', e.target.value)}
                      disabled={!isEditing}
                      placeholder="1092837465"
                      className="h-9 text-xs font-mono font-medium border-slate-200 dark:border-slate-800 disabled:bg-slate-50 dark:disabled:bg-slate-800/50"
                    />
                  </div>

                  {/* Operating Hub */}
                  <div className="space-y-1.5">
                    <Label htmlFor="hub" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" /> Primary Logistics Hub
                    </Label>
                    <Input
                      id="hub"
                      value={form.operatingHub}
                      onChange={(e) => setFormField('operatingHub', e.target.value)}
                      disabled={!isEditing}
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

          {/* ── TAB 2: Security & 2FA ─────────────────────────────────────── */}
          <TabsContent value="security" className="m-0 space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
              
              {/* Password Form (3/5) */}
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
                      <div className={cn(
                        'p-3 rounded-xl text-xs font-bold flex items-center gap-2 border',
                        pwdMsg.ok 
                          ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' 
                          : 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                      )}>
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
                      
                      {/* Strength Bar */}
                      {pwd.next && (
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
                          <div className={cn('h-full transition-all duration-300', pwdStrength.color)} style={{ width: `${pwdStrength.score}%` }} />
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
                      className="h-9 gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs px-4 rounded-lg"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      {pwdMutation.isPending ? 'Updating Password...' : 'Update Password'}
                    </Button>
                  </CardFooter>
                </form>
              </Card>

              {/* Security Audit (2/5) */}
              <div className="lg:col-span-2 space-y-4">
                <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs">
                  <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
                    <CardTitle className="text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" /> Security Audit Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Two-Factor Auth (2FA)</div>
                        <div className="text-[10px] text-slate-500">MFA token protection active</div>
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
                      <Badge variant="outline" className="text-[10px] font-mono font-bold border-slate-200">
                        TRUSTED
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">JWT Token Expiry</div>
                        <div className="text-[10px] text-slate-500">Valid for 24 hours</div>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-emerald-600">
                        23h remaining
                      </span>
                    </div>

                  </CardContent>
                </Card>
              </div>

            </div>

            {/* Active Login Sessions Ledger */}
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs overflow-hidden">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Laptop className="w-4 h-4 text-violet-600" /> Logged-In Devices & Sessions
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Devices currently authorized to access your MERCON dispatch account.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono font-bold text-slate-500">
                  {sessions.length} Active Sessions
                </Badge>
              </CardHeader>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {sessions.map((sess) => (
                  <div key={sess.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 shrink-0">
                        {sess.type === 'mobile' ? <Smartphone className="w-4 h-4 text-indigo-500" /> : <Laptop className="w-4 h-4 text-violet-500" />}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{sess.device}</span>
                          {sess.isCurrent && (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px] font-extrabold">
                              THIS DEVICE
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-0.5">
                          <span className="font-mono">{sess.ip}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1"><Globe className="w-3 h-3 text-slate-400" /> {sess.location}</span>
                          <span>•</span>
                          <span>{sess.lastActive}</span>
                        </div>
                      </div>
                    </div>

                    {!sess.isCurrent && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevokeSession(sess.id)}
                        className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1 font-semibold"
                      >
                        <LogOut className="w-3.5 h-3.5" /> Revoke
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </Card>

          </TabsContent>

          {/* ── TAB 3: Notification Rules ──────────────────────────────────── */}
          <TabsContent value="notifications" className="m-0">
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <CardTitle className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#E8450F]" /> Dispatch Notification & Alert Rules
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Configure automated alert thresholds and dispatch notification preferences.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-6 space-y-4">
                
                {/* Rule 1: Critical Trip Delays */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Critical Fleet Trip Delays</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Receive immediate push & email notifications when a trip exceeds SLA tolerance (+30 mins)</div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setNotifications((n) => ({ ...n, criticalDelays: !n.criticalDelays }))}
                    className={cn(
                      'h-8 text-xs font-bold min-w-[90px] rounded-lg transition-all',
                      notifications.criticalDelays ? 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300' : 'text-slate-400'
                    )}
                  >
                    {notifications.criticalDelays ? '● ENABLED' : 'DISABLED'}
                  </Button>
                </div>

                {/* Rule 2: MOT Expiry Radar */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Saudi MOT & Istimara Expiry Alerts</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Automated warnings when driver licenses or vehicle registrations enter 30-day expiry window</div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setNotifications((n) => ({ ...n, documentExpiry: !n.documentExpiry }))}
                    className={cn(
                      'h-8 text-xs font-bold min-w-[90px] rounded-lg transition-all',
                      notifications.documentExpiry ? 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300' : 'text-slate-400'
                    )}
                  >
                    {notifications.documentExpiry ? '● ENABLED' : 'DISABLED'}
                  </Button>
                </div>

                {/* Rule 3: Customer Credit Exposure Warnings */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Customer Credit Exposure Warnings</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Alert dispatcher when corporate client exceeds 85% of approved credit limit</div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setNotifications((n) => ({ ...n, creditLimits: !n.creditLimits }))}
                    className={cn(
                      'h-8 text-xs font-bold min-w-[90px] rounded-lg transition-all',
                      notifications.creditLimits ? 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300' : 'text-slate-400'
                    )}
                  >
                    {notifications.creditLimits ? '● ENABLED' : 'DISABLED'}
                  </Button>
                </div>

                {/* Rule 4: Daily Operational Digest */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Daily Fleet Performance Digest</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Receive a daily morning summary email of completed trips, revenue, and active fleet status</div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setNotifications((n) => ({ ...n, dailyDigest: !n.dailyDigest }))}
                    className={cn(
                      'h-8 text-xs font-bold min-w-[90px] rounded-lg transition-all',
                      notifications.dailyDigest ? 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300' : 'text-slate-400'
                    )}
                  >
                    {notifications.dailyDigest ? '● ENABLED' : 'DISABLED'}
                  </Button>
                </div>

              </CardContent>
            </Card>
          </TabsContent>

          {/* ── TAB 4: Roles & Preferences ─────────────────────────────────── */}
          <TabsContent value="preferences" className="m-0 space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              
              {/* Granted Privilege Matrix */}
              <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                  <CardTitle className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Award className="w-4 h-4 text-[#E8450F]" /> System Role & Granted Privileges
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Read-only authorization Matrix assigned by your system administrator.
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Username</Label>
                      <Input value={user?.username || 'operator'} disabled className="h-9 font-mono font-bold text-xs bg-slate-50 dark:bg-slate-800/50" />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">System Role</Label>
                      <Input value={user?.role || 'Admin'} disabled className="h-9 font-mono font-bold text-xs bg-slate-50 dark:bg-slate-800/50 text-[#E8450F]" />
                    </div>
                  </div>

                  <div className="pt-2">
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2.5">Granted Dispatch Privileges</div>
                    <div className="flex flex-wrap gap-2">
                      {[
                        'Trip Dispatch Write',
                        'Vehicle Ledger Read',
                        'Driver Management Write',
                        'Rate Card Authoring',
                        'Invoice Settlement Approval',
                        'System Audit Logs View'
                      ].map((perm) => (
                        <Badge key={perm} variant="outline" className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-semibold py-1 px-2.5 rounded-md border-slate-200 dark:border-slate-700">
                          <Check className="w-3 h-3 text-emerald-500 mr-1" /> {perm}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Startup & UI Preferences */}
              <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                  <CardTitle className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-violet-600" /> Startup & Workspace Preferences
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Customize your personal view and default module settings.
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-6 space-y-4">
                  
                  {/* Landing Module */}
                  <div className="space-y-1.5">
                    <Label htmlFor="landingPage" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Default Startup Module Page
                    </Label>
                    <Select value={preferences.landingPage} onValueChange={(v) => setPreferences((p) => ({ ...p, landingPage: v }))}>
                      <SelectTrigger className="h-9 text-xs font-medium border-slate-200 dark:border-slate-800">
                        <SelectValue placeholder="Select startup page" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="/dashboard" className="text-xs">📊 Operational Command Dashboard</SelectItem>
                        <SelectItem value="/trips" className="text-xs">🚚 Trip Control Ledger</SelectItem>
                        <SelectItem value="/vehicles" className="text-xs">🚛 Vehicle Fleet Ledger</SelectItem>
                        <SelectItem value="/drivers" className="text-xs">👤 Driver Duty Roster</SelectItem>
                        <SelectItem value="/documents" className="text-xs">🛡️ Documents & Expiry Center</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Compact Table View Toggle */}
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 mt-2">
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Compact Data Tables</div>
                      <div className="text-[10px] text-slate-500">Reduce table row height for higher data density on screen</div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPreferences((p) => ({ ...p, compactView: !p.compactView }))}
                      className={cn(
                        'h-7 text-[11px] font-bold min-w-[80px] rounded-lg transition-all',
                        preferences.compactView ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'text-slate-400'
                      )}
                    >
                      {preferences.compactView ? 'ENABLED' : 'OFF'}
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
