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
  UserCheck, 
  BadgeCheck,
  Building2
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { driverService, CreateDriverPayload } from '@/services/driverService';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function AddDriverPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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

  const isExpiryValid = formData.license_expiry ? new Date(formData.license_expiry) > new Date() : false;

  const isFormValid = 
    formData.first_name.trim() !== '' && 
    formData.last_name.trim() !== '' && 
    formData.phone_primary.trim() !== '' && 
    formData.license_number.trim() !== '' && 
    formData.license_expiry !== '' &&
    isExpiryValid;

  const handleSubmit = useCallback(() => {
    setError(null);

    if (!formData.first_name.trim()) {
      setError('First name is required');
      return;
    }
    if (!formData.last_name.trim()) {
      setError('Last name is required');
      return;
    }
    if (!formData.phone_primary.trim()) {
      setError('Primary phone number is required');
      return;
    }
    if (!formData.license_number.trim()) {
      setError('License number is required');
      return;
    }
    if (!formData.license_expiry) {
      setError('License expiry date is required');
      return;
    }
    if (!isExpiryValid) {
      setError('License is already expired. Only drivers with a valid, future-dated license can be onboarded.');
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

  // Keyboard Shortcuts Listener (Ctrl + Enter)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (isFormValid && !createMutation.isPending) {
          handleSubmit();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSubmit, isFormValid, createMutation.isPending]);

  const fullName = `${formData.first_name} ${formData.last_name}`.trim();
  const initials = (formData.first_name[0] || 'D') + (formData.last_name[0] || 'R');
  // isExpiryValid is now defined above isFormValid (moved up)

  return (
    <DashboardLayout active="Drivers" title="Onboard New Driver">
      <div className="px-6 pb-6 space-y-4 animate-fade-in max-w-[1400px] mx-auto">
        
        {/* Top Scope & Action Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
              <Building2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>MERCON Fleet</span>
              <span>•</span>
              <span className="text-slate-900 dark:text-slate-100 font-bold">Human Capital</span>
            </div>
            <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-200 font-bold dark:bg-indigo-950/40 dark:text-indigo-300">
              Driver Onboarding
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/drivers')}
              className="h-9 gap-1.5 text-xs font-semibold border-slate-200 bg-white hover:bg-slate-50 shadow-2xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Drivers
            </Button>

            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleReset}
              className="h-9 gap-1.5 text-xs text-slate-500 hover:text-slate-900"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </Button>

            <Button 
              size="sm" 
              onClick={() => handleSubmit()}
              disabled={createMutation.isPending || !isFormValid}
              className="h-9 gap-1.5 text-xs bg-[#E8450F] hover:bg-[#d03d0c] text-white font-bold shadow-xs rounded-md px-4"
            >
              <Plus className="w-3.5 h-3.5" /> {createMutation.isPending ? 'Onboarding...' : 'Onboard Driver'}
              <kbd className="ml-1.5 px-1.5 py-0.5 text-[10px] font-mono font-bold bg-white/20 text-white rounded border border-white/30">
                Ctrl + ↵
              </kbd>
            </Button>
          </div>
        </div>

        {/* THEMED KEYBOARD QUICK CONTROLS BAR */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-3 px-4 shadow-2xs border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 flex items-center justify-center">
              <Keyboard className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <span className="font-bold text-slate-900 dark:text-slate-100">Keyboard Quick Controls:</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            {/* Submit Onboarding Shortcut */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Onboard Driver:</span>
              <kbd className="px-2 py-0.5 text-[11px] font-mono font-bold bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded border border-slate-300 dark:border-slate-600 shadow-2xs">
                Ctrl + Enter ↵
              </kbd>
            </div>
          </div>
        </div>

        {/* Header KPI Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Driver Candidate</span>
              <UserCheck className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-base font-extrabold text-slate-900 dark:text-slate-100 truncate max-w-[140px]">
                {fullName || 'Driver Name'}
              </span>
              <Badge variant="outline" className="text-[9px] px-1 py-0 bg-indigo-50 text-indigo-600 border-indigo-200 font-bold">
                Candidate
              </Badge>
            </div>
          </Card>

          <Card className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Contact Phone</span>
              <Phone className="w-4 h-4 text-blue-600" />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono truncate max-w-[130px]">
                {formData.phone_primary || 'Not Set'}
              </span>
              <span className="text-[10px] text-slate-500 font-medium">Primary</span>
            </div>
          </Card>

          <Card className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Commercial License</span>
              <FileText className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono truncate max-w-[130px]">
                {formData.license_number || 'DL-XXXX-XXXX'}
              </span>
              <span className="text-[10px] text-slate-500 font-medium">KSA</span>
            </div>
          </Card>

          <Card className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Compliance Status</span>
              <BadgeCheck className="w-4 h-4 text-purple-600" />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                {formData.license_expiry ? (isExpiryValid ? 'Valid License' : 'Expired License') : 'Pending Expiry'}
              </span>
              <Badge 
                variant="outline" 
                className={`text-[9px] px-1 py-0 font-bold ${
                  formData.license_expiry 
                    ? (isExpiryValid ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200')
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}
              >
                {formData.license_expiry ? (isExpiryValid ? 'Verified' : 'Invalid') : 'Required'}
              </Badge>
            </div>
          </Card>
        </div>

        {/* Main Content Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* Left Column: Unified Single Onboarding Form Card (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            <Card className="border border-slate-200 dark:border-slate-800 shadow-2xs rounded-xl bg-white dark:bg-slate-900">
              <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <UserCheck className="w-4.5 h-4.5 text-indigo-600" /> Driver Onboarding Details
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500 mt-0.5">
                      Enter driver personal contact info and commercial Saudi license credentials.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-5 space-y-6">
                
                {/* SECTION 1: Personal & Contact Info */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <User className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      1. Personal & Contact Details
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="first_name" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        First Name <span className="text-rose-500">*</span>
                      </Label>
                      <Input
                        id="first_name"
                        placeholder="e.g. Ahmed"
                        value={formData.first_name}
                        onChange={(e) => handleChange('first_name', e.target.value)}
                        className="h-9 text-xs font-medium border-slate-200 focus-visible:ring-slate-400"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="last_name" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Last Name <span className="text-rose-500">*</span>
                      </Label>
                      <Input
                        id="last_name"
                        placeholder="e.g. Al-Farsi"
                        value={formData.last_name}
                        onChange={(e) => handleChange('last_name', e.target.value)}
                        className="h-9 text-xs font-medium border-slate-200 focus-visible:ring-slate-400"
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="phone_primary" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                        <span>Primary Phone Number <span className="text-rose-500">*</span></span>
                        <span className="text-[10px] text-slate-400 font-normal">e.g. +966 50 123 4567</span>
                      </Label>
                      <Input
                        id="phone_primary"
                        placeholder="+966 50 123 4567"
                        value={formData.phone_primary}
                        onChange={(e) => handleChange('phone_primary', e.target.value)}
                        className="h-9 text-xs font-mono border-slate-200 focus-visible:ring-slate-400"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 2: Commercial Licensing & Credentials */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      2. Commercial Licensing Credentials
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="license_number" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Commercial License Number <span className="text-rose-500">*</span>
                      </Label>
                      <Input
                        id="license_number"
                        placeholder="e.g. DL-9920-8812"
                        value={formData.license_number}
                        onChange={(e) => handleChange('license_number', e.target.value.toUpperCase())}
                        className="h-9 text-xs uppercase font-mono font-medium border-slate-200 focus-visible:ring-slate-400"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="license_expiry" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" /> License Expiry Date <span className="text-rose-500">*</span>
                      </Label>
                      <Input
                        id="license_expiry"
                        type="date"
                        value={formData.license_expiry}
                        onChange={(e) => handleChange('license_expiry', e.target.value)}
                        className="h-9 text-xs font-mono border-slate-200 focus-visible:ring-slate-400"
                      />
                    </div>
                  </div>
                </div>

              </CardContent>

              <CardFooter className="bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 p-4 flex justify-between items-center rounded-b-xl">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={handleReset}
                  className="h-9 text-xs font-semibold border-slate-200 bg-white"
                >
                  Reset Form
                </Button>

                <Button 
                  type="button" 
                  size="sm"
                  onClick={() => handleSubmit()}
                  disabled={createMutation.isPending || !isFormValid}
                  className="h-9 text-xs bg-[#E8450F] hover:bg-[#d03d0c] text-white font-bold px-5 shadow-xs gap-1.5 rounded-md"
                >
                  <Plus className="w-4 h-4" /> {createMutation.isPending ? 'Onboarding...' : 'Onboard Driver'}
                  <kbd className="ml-1.5 px-1.5 py-0.5 text-[10px] font-mono font-bold bg-white/20 text-white rounded border border-white/30">
                    Ctrl + ↵
                  </kbd>
                </Button>
              </CardFooter>
            </Card>

            {error && (
              <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-xs font-semibold border border-rose-200 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
                {error}
              </div>
            )}
          </div>

          {/* Right Column: Live Driver ID Badge Preview (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="border border-slate-200 dark:border-slate-800 shadow-2xs rounded-xl overflow-hidden sticky top-4 bg-white dark:bg-slate-900">
              <CardHeader className="pb-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="bg-white text-[10px] uppercase font-bold tracking-wider text-slate-700 border-slate-200">
                    Live Driver Badge Preview
                  </Badge>
                  <span className="text-[10px] text-slate-400 font-mono">REF: DRV-TEMP</span>
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold text-sm flex items-center justify-center shadow-xs shrink-0">
                    {initials.toUpperCase()}
                  </div>
                  <div>
                    <CardTitle className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                      {fullName || 'New Driver Candidate'}
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Commercial Heavy Transport Specialist
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-4 space-y-4">
                
                {/* Saudi Driving License Card Graphic */}
                <div className="bg-gradient-to-br from-emerald-50 to-teal-100/60 dark:from-emerald-950/40 dark:to-teal-900/20 border-2 border-emerald-300 dark:border-emerald-700/60 rounded-xl p-3.5 space-y-2.5 shadow-2xs relative">
                  <div className="flex items-center justify-between border-b border-emerald-300/60 dark:border-emerald-700/60 pb-1.5">
                    <div className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                      <span>KSA</span> <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block" /> <span>Kingdom of Saudi Arabia</span>
                    </div>
                    <Badge className="bg-emerald-600 text-white text-[9px] px-1.5 py-0 font-bold">
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

                {/* Onboarding Readiness Checklist */}
                <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Onboarding Checklist</span>
                  
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                        {formData.first_name && formData.last_name ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <Circle className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
                        Full Driver Name
                      </span>
                      <span className="font-semibold text-[11px] truncate max-w-[120px]">{fullName || 'Missing'}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                        {formData.phone_primary ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <Circle className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
                        Primary Phone Contact
                      </span>
                      <span className="font-semibold font-mono text-[11px]">{formData.phone_primary || 'Missing'}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                        {formData.license_number ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <Circle className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
                        Commercial License No
                      </span>
                      <span className="font-semibold font-mono text-[11px]">{formData.license_number || 'Missing'}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                        {formData.license_expiry && isExpiryValid ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <Circle className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
                        Valid Expiry Date
                      </span>
                      <span className="font-semibold font-mono text-[11px]">{formData.license_expiry || 'Missing'}</span>
                    </div>
                  </div>
                </div>

              </CardContent>

              <CardFooter className="bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 p-3 flex justify-between items-center">
                <div className="text-[11px] text-slate-500">
                  Status: <span className="font-bold text-emerald-600 dark:text-emerald-400">Ready to Onboard</span>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleSubmit()}
                  disabled={createMutation.isPending || !isFormValid}
                  className="h-9 text-xs bg-[#E8450F] hover:bg-[#d03d0c] text-white font-bold px-4 gap-1.5 shadow-xs rounded-md"
                >
                  {createMutation.isPending ? 'Onboarding...' : 'Onboard Driver'}
                  <kbd className="ml-1.5 px-1.5 py-0.5 text-[10px] font-mono font-bold bg-white/20 text-white rounded border border-white/30">
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
