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
import Btn from '@/components/ui/Btn';

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
            <Btn 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/drivers')}
              className="h-9 gap-1.5 text-xs font-semibold border-slate-200 bg-white hover:bg-slate-50 shadow-2xs"
              label="Back to Drivers"
              icon={<ArrowLeft className="w-3.5 h-3.5" />}
              shortcut={{ key: 'b', alt: true }}
            />

            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleReset}
              className="h-9 gap-1.5 text-xs text-slate-500 hover:text-slate-900"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </Button>

            <Btn 
              size="sm" 
              onClick={() => handleSubmit()}
              disabled={createMutation.isPending || !isFormValid}
              className="h-9 gap-1.5 text-xs bg-[#E8450F] hover:bg-[#d03d0c] text-white font-bold shadow-xs rounded-md px-4"
              label={createMutation.isPending ? 'Onboarding...' : 'Onboard Driver'}
              icon={<Plus className="w-3.5 h-3.5" />}
              shortcut={{ key: 'Enter', metaOrControl: true }}
            />
          </div>
        </div>

        {/* Top Horizontal Live Preview / Manifest */}
        <Card className="border border-slate-200 dark:border-slate-800 shadow-2xs rounded-xl overflow-hidden bg-white dark:bg-slate-900">
          <div className="flex flex-col md:flex-row items-center divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-800">
            
            {/* Driver Candidate Segment */}
            <div className="flex-1 p-4 flex items-center gap-3 w-full">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400 shrink-0">
                <User className="w-4.5 h-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Driver Candidate</span>
                <p className="text-sm font-bold truncate mt-0.5 text-slate-900 dark:text-slate-100">
                  {fullName || 'New Driver Candidate'}
                </p>
              </div>
              {(formData.first_name && formData.last_name) && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
            </div>

            {/* Contact Phone Segment */}
            <div className="flex-1 p-4 flex items-center gap-3 w-full">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 shrink-0">
                <Phone className="w-4.5 h-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Contact Phone</span>
                <p className="text-sm font-bold truncate mt-0.5 text-slate-900 dark:text-slate-100 font-mono">
                  {formData.phone_primary || 'Not Set'}
                </p>
              </div>
              {formData.phone_primary && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
            </div>

            {/* Commercial License Segment */}
            <div className="flex-1 p-4 flex items-center gap-3 w-full">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400 shrink-0">
                <FileText className="w-4.5 h-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Commercial License</span>
                <p className="text-sm font-bold truncate mt-0.5 text-slate-900 dark:text-slate-100 font-mono">
                  {formData.license_number || 'DL-XXXX-XXXX'}
                </p>
              </div>
              {formData.license_number && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
            </div>

            {/* Compliance Expiry Segment */}
            <div className="flex-1 p-4 flex items-center gap-3 w-full">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 shrink-0">
                <Calendar className="w-4.5 h-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">License Expiry</span>
                <p className="text-sm font-bold truncate mt-0.5 text-slate-900 dark:text-slate-100 font-mono">
                  {formData.license_expiry || 'YYYY-MM-DD'}
                </p>
              </div>
              {(formData.license_expiry && isExpiryValid) && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
            </div>

          </div>
        </Card>

        {/* Main Content Workspace (Single Column Centered) */}
        <div className="max-w-4xl mx-auto w-full pt-2">
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

            <CardContent className="pt-6">
              
              <div className="space-y-6">
                
                {/* Section 1: Personal Details */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="w-1.5 h-3.5 bg-indigo-600 rounded-full" /> 
                    Personal Profile Details
                  </h3>

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
                        className="h-9 text-xs border-slate-200"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="last_name" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Last Name <span className="text-rose-500">*</span>
                      </Label>
                      <Input
                        id="last_name"
                        placeholder="e.g. Al-Mansoor"
                        value={formData.last_name}
                        onChange={(e) => handleChange('last_name', e.target.value)}
                        className="h-9 text-xs border-slate-200"
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="phone_primary" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Primary Phone Contact <span className="text-rose-500">*</span>
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-xs font-bold text-slate-400 font-mono">
                          +966
                        </span>
                        <Input
                          id="phone_primary"
                          placeholder="50XXXXXXX"
                          value={formData.phone_primary}
                          onChange={(e) => handleChange('phone_primary', e.target.value)}
                          className="h-9 text-xs pl-14 font-mono border-slate-200"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: License Details */}
                <div className="space-y-4 pt-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="w-1.5 h-3.5 bg-emerald-500 rounded-full" /> 
                    Commercial driving license
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="license_number" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Saudi License ID Number <span className="text-rose-500">*</span>
                      </Label>
                      <Input
                        id="license_number"
                        placeholder="e.g. 10XXXXXXXX"
                        value={formData.license_number}
                        onChange={(e) => handleChange('license_number', e.target.value)}
                        className="h-9 text-xs font-mono border-slate-200"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="license_expiry" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                        <span>Expiration Date <span className="text-rose-500">*</span></span>
                        {formData.license_expiry && (
                          <span className={`text-[10px] font-bold ${isExpiryValid ? 'text-emerald-600' : 'text-rose-600 animate-pulse'}`}>
                            {isExpiryValid ? 'Verified Active' : 'EXPIRED LICENSE'}
                          </span>
                        )}
                      </Label>
                      <Input
                        id="license_expiry"
                        type="date"
                        value={formData.license_expiry}
                        onChange={(e) => handleChange('license_expiry', e.target.value)}
                        className="h-9 text-xs font-mono border-slate-200"
                      />
                    </div>
                  </div>
                </div>

              </div>

            </CardContent>

            <CardFooter className="bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 p-4 flex justify-between items-center rounded-b-xl">
              <Btn 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={handleReset}
                className="h-9 text-xs font-semibold border-slate-200 bg-white"
                label="Reset Form"
              />

              <Btn 
                type="button" 
                size="sm"
                onClick={() => handleSubmit()}
                disabled={createMutation.isPending || !isFormValid}
                className="h-9 text-xs bg-[#E8450F] hover:bg-[#d03d0c] text-white font-bold px-5 shadow-xs gap-1.5 rounded-md"
                label={createMutation.isPending ? 'Onboarding...' : 'Onboard Driver'}
                icon={<Plus className="w-4 h-4" />}
                shortcut={{ key: 'Enter', metaOrControl: true }}
              />
            </CardFooter>
          </Card>

          {error && (
            <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-xs font-semibold border border-rose-200 flex items-center gap-2 mt-4">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
              {error}
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  );
}
