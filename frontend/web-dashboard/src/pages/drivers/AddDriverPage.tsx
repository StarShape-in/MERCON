import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Phone, 
  FileText, 
  Calendar, 
  ArrowLeft, 
  RotateCcw, 
  Plus, 
  CheckCircle2, 
  Circle, 
  ShieldCheck, 
  Keyboard, 
  ChevronRight, 
  ChevronLeft, 
  UserCheck, 
  Sparkles, 
  BadgeCheck, 
  AlertCircle 
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { driverService, CreateDriverPayload } from '@/services/driverService';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AddDriverPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'personal' | 'licensing'>('personal');
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone_primary: '',
    license_number: '',
    license_expiry: '',
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleReset = () => {
    setActiveTab('personal');
    setFormData({
      first_name: '',
      last_name: '',
      phone_primary: '',
      license_number: '',
      license_expiry: '',
    });
    setError(null);
  };

  // Create Driver Mutation
  const createMutation = useMutation({
    mutationFn: (payload: CreateDriverPayload) => driverService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-performance'] });
      navigate('/drivers');
    },
    onError: (err: any) => {
      setError(err.response?.data?.error?.message || err.message || 'Failed to create driver');
    },
  });

  const isFormValid = 
    formData.first_name.trim() !== '' && 
    formData.last_name.trim() !== '' && 
    formData.phone_primary.trim() !== '' && 
    formData.license_number.trim() !== '' && 
    formData.license_expiry !== '';

  const handleSubmit = useCallback(() => {
    setError(null);

    if (!formData.first_name.trim()) {
      setActiveTab('personal');
      setError('First name is required');
      return;
    }
    if (!formData.last_name.trim()) {
      setActiveTab('personal');
      setError('Last name is required');
      return;
    }
    if (!formData.phone_primary.trim()) {
      setActiveTab('personal');
      setError('Primary phone number is required');
      return;
    }
    if (!formData.license_number.trim()) {
      setActiveTab('licensing');
      setError('License number is required');
      return;
    }
    if (!formData.license_expiry) {
      setActiveTab('licensing');
      setError('License expiry date is required');
      return;
    }

    createMutation.mutate({
      first_name: formData.first_name.trim(),
      last_name: formData.last_name.trim(),
      phone_primary: formData.phone_primary.trim(),
      license_number: formData.license_number.trim(),
      license_expiry: formData.license_expiry,
    });
  }, [formData, createMutation]);

  // Tab Navigation Functions
  const goToNextTab = useCallback(() => {
    setActiveTab('licensing');
  }, []);

  const goToPrevTab = useCallback(() => {
    setActiveTab('personal');
  }, []);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';

      // 1. Onboard Driver: Ctrl + Enter or Cmd + Enter
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (isFormValid && !createMutation.isPending) {
          handleSubmit();
        }
        return;
      }

      // 2. Direct Tab Jumping: Alt + 1, Alt + 2
      if (e.altKey && e.key === '1') {
        e.preventDefault();
        setActiveTab('personal');
        return;
      }
      if (e.altKey && e.key === '2') {
        e.preventDefault();
        setActiveTab('licensing');
        return;
      }

      // 3. Tab Navigation: Alt + ArrowRight / Alt + ArrowLeft or Ctrl + Right / Left
      if ((e.altKey || e.ctrlKey) && e.key === 'ArrowRight') {
        e.preventDefault();
        goToNextTab();
        return;
      }

      if ((e.altKey || e.ctrlKey) && e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPrevTab();
        return;
      }

      // 4. Tab switching when not typing in inputs: Right/Left arrow
      if (!isInput) {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          goToNextTab();
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          goToPrevTab();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNextTab, goToPrevTab, handleSubmit, isFormValid, createMutation.isPending]);

  const fullName = `${formData.first_name} ${formData.last_name}`.trim();
  const initials = (formData.first_name[0] || 'D') + (formData.last_name[0] || 'R');

  const isExpiryValid = formData.license_expiry ? new Date(formData.license_expiry) > new Date() : false;

  return (
    <DashboardLayout active="Drivers" title="Onboard New Driver">
      <div className="px-6 pb-6 space-y-4 animate-fade-in max-w-[1400px] mx-auto">
        
        {/* Top Scope & Action Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted text-xs font-semibold text-muted-foreground border border-border/80">
              <span>🏢 MERCON Fleet</span>
              <span>•</span>
              <span className="text-foreground">Human Capital</span>
            </div>
            <Badge className="bg-indigo-500/10 text-indigo-600 border-indigo-200 font-semibold dark:bg-indigo-950/40 dark:text-indigo-300">
              Driver Onboarding
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/drivers')}
              className="h-8 gap-1.5 text-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Drivers
            </Button>

            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleReset}
              className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </Button>

            <Button 
              size="sm" 
              onClick={() => handleSubmit()}
              disabled={createMutation.isPending || !isFormValid}
              className="h-8 gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" /> {createMutation.isPending ? 'Onboarding...' : 'Onboard Driver'}
              <kbd className="ml-1 px-1.5 py-0.5 text-[10px] font-mono font-extrabold bg-indigo-950 text-amber-300 rounded border border-amber-400/40 shadow-xs">
                Ctrl + ↵
              </kbd>
            </Button>
          </div>
        </div>

        {/* PROMINENT HIGH-VISIBILITY KEYBOARD SHORTCUT BAR */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-lg p-2.5 px-4 shadow-md border border-indigo-500/30 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center">
              <Keyboard className="w-3.5 h-3.5 text-indigo-300 animate-pulse" />
            </div>
            <span className="font-bold text-slate-200">Keyboard Quick Controls:</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs">
            
            {/* Tab Switching Keycaps */}
            <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700/80">
              <span className="text-[11px] text-slate-400">Switch Tabs:</span>
              <kbd className="px-1.5 py-0.5 text-[11px] font-mono font-extrabold bg-indigo-600 text-white rounded shadow-xs border-b-2 border-indigo-800">
                Alt
              </kbd>
              <span className="text-slate-500 font-bold">+</span>
              <kbd className="px-1.5 py-0.5 text-[11px] font-mono font-extrabold bg-indigo-600 text-white rounded shadow-xs border-b-2 border-indigo-800">
                ← / →
              </kbd>
            </div>

            {/* Jump to Tab Keycaps */}
            <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700/80">
              <span className="text-[11px] text-slate-400">Jump Tab:</span>
              <kbd className="px-1.5 py-0.5 text-[11px] font-mono font-extrabold bg-indigo-600 text-white rounded shadow-xs border-b-2 border-indigo-800">
                Alt
              </kbd>
              <span className="text-slate-500 font-bold">+</span>
              <kbd className="px-1.5 py-0.5 text-[11px] font-mono font-extrabold bg-indigo-600 text-white rounded shadow-xs border-b-2 border-indigo-800">
                1 / 2
              </kbd>
            </div>

            {/* Submit Onboarding Keycaps */}
            <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700/80">
              <span className="text-[11px] text-slate-400">Onboard Driver:</span>
              <kbd className="px-1.5 py-0.5 text-[11px] font-mono font-extrabold bg-emerald-600 text-white rounded shadow-xs border-b-2 border-emerald-800">
                Ctrl
              </kbd>
              <span className="text-slate-500 font-bold">+</span>
              <kbd className="px-1.5 py-0.5 text-[11px] font-mono font-extrabold bg-emerald-600 text-white rounded shadow-xs border-b-2 border-emerald-800">
                Enter ↵
              </kbd>
            </div>

          </div>
        </div>

        {/* Header KPI Instrument Panel Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-3 bg-card border-border/70 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Driver Candidate</span>
              <UserCheck className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-base font-bold text-foreground truncate max-w-[140px]">
                {fullName || 'Driver Name'}
              </span>
              <Badge variant="outline" className="text-[9px] px-1 py-0 bg-indigo-50 text-indigo-600 border-indigo-200">
                Candidate
              </Badge>
            </div>
          </Card>

          <Card className="p-3 bg-card border-border/70 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Contact Phone</span>
              <Phone className="w-4 h-4 text-blue-500" />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xs font-bold text-foreground font-mono truncate max-w-[130px]">
                {formData.phone_primary || 'Not Set'}
              </span>
              <span className="text-[10px] text-muted-foreground">Primary</span>
            </div>
          </Card>

          <Card className="p-3 bg-card border-border/70 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Commercial License</span>
              <FileText className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xs font-bold text-foreground font-mono truncate max-w-[130px]">
                {formData.license_number || 'DL-XXXX-XXXX'}
              </span>
              <span className="text-[10px] text-muted-foreground">KSA</span>
            </div>
          </Card>

          <Card className="p-3 bg-card border-border/70 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Compliance Status</span>
              <BadgeCheck className="w-4 h-4 text-purple-500" />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xs font-bold text-foreground">
                {formData.license_expiry ? (isExpiryValid ? 'Valid License' : 'Expired License') : 'Pending Expiry'}
              </span>
              <Badge 
                variant="outline" 
                className={`text-[9px] px-1 py-0 ${
                  formData.license_expiry 
                    ? (isExpiryValid ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-destructive/10 text-destructive border-destructive/20')
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {formData.license_expiry ? (isExpiryValid ? 'Verified' : 'Invalid') : 'Required'}
              </Badge>
            </div>
          </Card>
        </div>

        {/* Main 2-Column Content Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* Left Column: 2 Tabs Workspace (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            <Card className="border-border/80 shadow-xs">
              <CardHeader className="pb-3 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-indigo-600" /> Driver Onboarding Profile
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Enter personal details, contact number, and commercial license credentials.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-4">
                <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full">
                  
                  {/* Tabs Navigation Header with High Visibility Shortcut Badges */}
                  <TabsList className="grid grid-cols-2 w-full mb-4 bg-muted/70 p-1">
                    
                    <TabsTrigger value="personal" className="text-xs font-semibold flex items-center justify-between gap-1">
                      <span>1. Personal & Contact Details</span>
                      <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-extrabold bg-indigo-600 text-white rounded border border-indigo-700 shadow-2xs">
                        Alt+1
                      </kbd>
                    </TabsTrigger>

                    <TabsTrigger value="licensing" className="text-xs font-semibold flex items-center justify-between gap-1">
                      <span>2. Licensing & Compliance</span>
                      <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-extrabold bg-indigo-600 text-white rounded border border-indigo-700 shadow-2xs">
                        Alt+2
                      </kbd>
                    </TabsTrigger>

                  </TabsList>

                  {/* TAB 1: Personal Details */}
                  <TabsContent value="personal" className="space-y-4 m-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      
                      <div className="space-y-1.5">
                        <Label htmlFor="first_name" className="text-xs font-semibold">
                          First Name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="first_name"
                          placeholder="e.g. Ahmed"
                          value={formData.first_name}
                          onChange={(e) => handleChange('first_name', e.target.value)}
                          className="h-9 text-xs font-medium"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="last_name" className="text-xs font-semibold">
                          Last Name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="last_name"
                          placeholder="e.g. Al-Farsi"
                          value={formData.last_name}
                          onChange={(e) => handleChange('last_name', e.target.value)}
                          className="h-9 text-xs font-medium"
                        />
                      </div>

                      <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor="phone_primary" className="text-xs font-semibold flex items-center justify-between">
                          <span>Primary Phone Number <span className="text-destructive">*</span></span>
                          <span className="text-[10px] text-muted-foreground font-normal">e.g. +966 50 123 4567</span>
                        </Label>
                        <Input
                          id="phone_primary"
                          placeholder="+966 50 123 4567"
                          value={formData.phone_primary}
                          onChange={(e) => handleChange('phone_primary', e.target.value)}
                          className="h-9 text-xs font-mono"
                        />
                      </div>

                    </div>

                    <div className="p-3 bg-muted/40 rounded-lg border border-border/50 text-xs space-y-1">
                      <div className="font-semibold text-foreground flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" /> Identity Verification Ready
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Phone contact will be used for automated dispatch SMS notifications and Mobile Operator App sign-in.
                      </p>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <Button 
                        type="button" 
                        size="sm"
                        onClick={goToNextTab}
                        className="h-9 text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                      >
                        Next: Licensing & Credentials <ChevronRight className="w-3.5 h-3.5" />
                        <kbd className="ml-1 px-1.5 py-0.5 text-[10px] font-mono font-bold bg-indigo-900 text-white rounded border border-indigo-400/40">
                          Alt + →
                        </kbd>
                      </Button>
                    </div>
                  </TabsContent>

                  {/* TAB 2: Licensing & Compliance */}
                  <TabsContent value="licensing" className="space-y-4 m-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      
                      <div className="space-y-1.5">
                        <Label htmlFor="license_number" className="text-xs font-semibold">
                          Commercial License Number <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="license_number"
                          placeholder="e.g. DL-9920-8812"
                          value={formData.license_number}
                          onChange={(e) => handleChange('license_number', e.target.value.toUpperCase())}
                          className="h-9 text-xs uppercase font-mono font-medium"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="license_expiry" className="text-xs font-semibold flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground" /> License Expiry Date <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="license_expiry"
                          type="date"
                          value={formData.license_expiry}
                          onChange={(e) => handleChange('license_expiry', e.target.value)}
                          className="h-9 text-xs font-mono"
                        />
                      </div>

                    </div>

                    <div className="p-3 bg-muted/40 rounded-lg border border-border/50 text-xs space-y-1">
                      <div className="font-semibold text-foreground flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-purple-500" /> AI Safety & Risk Initializer
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Newly onboarded drivers are initialized with a baseline AI Risk Score of 0.0 (Low Risk) and auto-monitored during initial dispatch assignments.
                      </p>
                    </div>

                    <div className="pt-2 flex justify-between">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={goToPrevTab}
                        className="h-9 text-xs gap-1 border-indigo-200 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" /> Back
                        <kbd className="ml-1 px-1.5 py-0.5 text-[10px] font-mono font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded border border-indigo-300">
                          Alt + ←
                        </kbd>
                      </Button>

                      <Button 
                        type="button" 
                        size="sm"
                        onClick={() => handleSubmit()}
                        disabled={createMutation.isPending || !isFormValid}
                        className="h-9 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold gap-1.5 shadow-md"
                      >
                        <Plus className="w-3.5 h-3.5" /> Onboard Driver
                        <kbd className="ml-1 px-1.5 py-0.5 text-[10px] font-mono font-extrabold bg-indigo-950 text-amber-300 rounded border border-amber-400/40 shadow-xs">
                          Ctrl + ↵
                        </kbd>
                      </Button>
                    </div>

                  </TabsContent>

                </Tabs>
              </CardContent>
            </Card>

            {error && (
              <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-xs font-semibold border border-destructive/20 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                {error}
              </div>
            )}
          </div>

          {/* Right Column: Live Interactive Driver ID Badge Card (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="border-border/80 shadow-xs overflow-hidden sticky top-4">
              <CardHeader className="pb-3 bg-gradient-to-r from-muted/50 to-muted/20 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="bg-background text-[10px] uppercase font-bold tracking-wider">
                    Live Driver Badge Preview
                  </Badge>
                  <span className="text-[10px] text-muted-foreground font-mono">REF: DRV-TEMP</span>
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <div className="w-11 h-11 rounded-full bg-indigo-600 text-white font-extrabold text-sm flex items-center justify-center shadow-md">
                    {initials.toUpperCase()}
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold">
                      {fullName || 'New Driver Candidate'}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Commercial Heavy Transport Specialist
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-4 space-y-4">
                
                {/* Saudi Driving License Card Graphic */}
                <div className="bg-gradient-to-br from-emerald-50 to-teal-100/60 dark:from-emerald-950/40 dark:to-teal-900/20 border-2 border-emerald-300 dark:border-emerald-700/60 rounded-lg p-3.5 space-y-2.5 shadow-2xs relative">
                  <div className="flex items-center justify-between border-b border-emerald-300/60 dark:border-emerald-700/60 pb-1.5">
                    <div className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                      <span>KSA</span> <span>🇸🇦</span> <span>Kingdom of Saudi Arabia</span>
                    </div>
                    <Badge className="bg-emerald-600 text-white text-[9px] px-1.5 py-0">
                      COMMERCIAL
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-emerald-800/70 dark:text-emerald-300/70 block">Driver Name</span>
                      <span className="font-bold text-emerald-950 dark:text-emerald-100 truncate block">
                        {fullName || '--- ---'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-emerald-800/70 dark:text-emerald-300/70 block">License No</span>
                      <span className="font-bold font-mono text-emerald-950 dark:text-emerald-100 truncate block">
                        {formData.license_number || 'DL-XXXX-XXXX'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] pt-1 text-emerald-800/80 dark:text-emerald-300/80">
                    <span>Contact: {formData.phone_primary || '---'}</span>
                    <span className="font-mono">Expiry: {formData.license_expiry || 'YYYY-MM-DD'}</span>
                  </div>
                </div>

                {/* AI Risk Score & Verification Spec */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-md bg-muted/40 border border-border/50">
                    <span className="text-[10px] text-muted-foreground block">AI Safety Risk</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> 0.0 (Low Risk)
                    </span>
                  </div>

                  <div className="p-2.5 rounded-md bg-muted/40 border border-border/50">
                    <span className="text-[10px] text-muted-foreground block">Duty Availability</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 mt-0.5 block">
                      Available on Save
                    </span>
                  </div>
                </div>

                {/* Onboarding Readiness Checklist */}
                <div className="space-y-2 pt-1 border-t border-border/50">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Onboarding Checklist</span>
                  
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        {formData.first_name && formData.last_name ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Circle className="w-3.5 h-3.5 text-muted" />}
                        Full Driver Name
                      </span>
                      <span className="font-semibold text-[11px] truncate max-w-[120px]">{fullName || 'Missing'}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        {formData.phone_primary ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Circle className="w-3.5 h-3.5 text-muted" />}
                        Primary Phone Contact
                      </span>
                      <span className="font-semibold font-mono text-[11px]">{formData.phone_primary || 'Missing'}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        {formData.license_number ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Circle className="w-3.5 h-3.5 text-muted" />}
                        Commercial License No
                      </span>
                      <span className="font-semibold font-mono text-[11px]">{formData.license_number || 'Missing'}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        {formData.license_expiry && isExpiryValid ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Circle className="w-3.5 h-3.5 text-muted" />}
                        Valid Expiry Date
                      </span>
                      <span className="font-semibold font-mono text-[11px]">{formData.license_expiry || 'Missing'}</span>
                    </div>
                  </div>
                </div>

              </CardContent>

              <CardFooter className="bg-muted/30 border-t border-border/50 p-3 flex justify-between items-center">
                <div className="text-[11px] text-muted-foreground">
                  Status: <span className="font-semibold text-emerald-600 dark:text-emerald-400">Ready to Onboard</span>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleSubmit()}
                  disabled={createMutation.isPending || !isFormValid}
                  className="h-9 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 gap-1.5 shadow-md"
                >
                  {createMutation.isPending ? 'Onboarding...' : 'Onboard Driver'}
                  <kbd className="ml-1 px-1.5 py-0.5 text-[10px] font-mono font-extrabold bg-indigo-950 text-amber-300 rounded border border-amber-400/40 shadow-xs">
                    Ctrl + ↵
                  </kbd>
                </Button>
              </CardFooter>
            </Card>
          </div>

        </div>

      </div>
    </DashboardLayout>
  );
}
