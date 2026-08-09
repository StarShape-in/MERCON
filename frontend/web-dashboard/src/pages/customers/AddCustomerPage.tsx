import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  RotateCcw, 
  Plus, 
  CheckCircle2, 
  Building2, 
  Phone, 
  Mail, 
  DollarSign, 
  Factory, 
  Sparkles,
  FileText,
  Zap,
  Briefcase,
  Truck,
  Award
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { customerService, CreateCustomerPayload } from '@/services/customerService';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export default function AddCustomerPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [error, setError] = useState<string | null>(null);

  // Streamlined Form State
  const [formData, setFormData] = useState({
    name: '',
    trade_alias: '',
    industry: 'Logistics',
    cr_number: '',
    vat_number: '',
    contact_phone: '',
    email: '',
    contact_person: '',
    contact_title: '',
    billing_address: '',
    credit_limit: '100000',
    isActive: true,
  });

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Quick Presets
  const applyPreset = (tier: 'enterprise' | 'midmarket' | 'sme' | 'standard') => {
    switch (tier) {
      case 'enterprise':
        setFormData((prev) => ({ ...prev, industry: 'Logistics', credit_limit: '250000' }));
        break;
      case 'midmarket':
        setFormData((prev) => ({ ...prev, industry: 'Retail', credit_limit: '100000' }));
        break;
      case 'sme':
        setFormData((prev) => ({ ...prev, industry: 'FMCG', credit_limit: '25000' }));
        break;
      case 'standard':
        setFormData((prev) => ({ ...prev, industry: 'General', credit_limit: '0' }));
        break;
    }
  };

  const handleReset = () => {
    setFormData({
      name: '',
      trade_alias: '',
      industry: 'Logistics',
      cr_number: '',
      vat_number: '',
      contact_phone: '',
      email: '',
      contact_person: '',
      contact_title: '',
      billing_address: '',
      credit_limit: '100000',
      isActive: true,
    });
    setError(null);
  };

  // Mutation
  const createMutation = useMutation({
    mutationFn: (payload: CreateCustomerPayload) => customerService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      navigate('/customers');
    },
    onError: (err: any) => {
      setError(err.response?.data?.error?.message || err.message || 'Failed to create customer');
    },
  });

  const isFormValid = formData.name.trim() !== '' && formData.contact_phone.trim() !== '';

  const handleSubmit = useCallback(() => {
    setError(null);

    if (!formData.name.trim()) {
      setError('Company Name is required');
      return;
    }
    if (!formData.contact_phone.trim()) {
      setError('Contact Phone is required');
      return;
    }

    createMutation.mutate({
      name: formData.name.trim(),
      contact_phone: formData.contact_phone.trim(),
      credit_limit: formData.credit_limit ? Number(formData.credit_limit) : 0,
    });
  }, [formData, createMutation]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (isFormValid && !createMutation.isPending) handleSubmit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        navigate('/customers');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSubmit, isFormValid, createMutation.isPending, navigate]);

  // Field Completion Tracking
  const completionFields = [
    { label: 'Company Name', filled: formData.name.trim() !== '' },
    { label: 'Contact Phone', filled: formData.contact_phone.trim() !== '' },
    { label: 'Billing Email', filled: formData.email.trim() !== '' },
    { label: 'CR Number', filled: formData.cr_number.trim() !== '' },
    { label: 'Credit Limit', filled: formData.credit_limit !== '' },
  ];
  const filledCount = completionFields.filter(f => f.filled).length;
  const completionPct = Math.round((filledCount / completionFields.length) * 100);

  return (
    <DashboardLayout active="Customers" title="Add Customer">
      <div className="px-4 sm:px-6 pb-6 space-y-4 animate-fade-in max-w-[1300px] mx-auto">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-0.5">
              <button onClick={() => navigate('/customers')} className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                Customers
              </button>
              <span>/</span>
              <span className="text-[#E8450F] font-bold">New Customer</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#E8450F]" />
              New Customer Account
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/customers')}
              className="h-8 text-xs font-medium border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Cancel
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleReset}
              className="h-8 text-xs text-slate-600 dark:text-slate-400"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset
            </Button>
            <Button 
              size="sm" 
              onClick={handleSubmit}
              disabled={createMutation.isPending || !isFormValid}
              className="h-8 text-xs bg-[#E8450F] hover:bg-[#d03d0c] text-white font-bold px-4 shadow-xs"
            >
              {createMutation.isPending ? 'Saving...' : 'Save Customer'}
            </Button>
          </div>
        </div>

        {/* 2-Column Clean Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* Form Card (7 Columns) */}
          <div className="lg:col-span-7 space-y-4">
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl shadow-2xs">
              <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-orange-500" /> Company & Contact Details
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Enter primary company identity, contact representative, and credit limit.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-5 space-y-4">
                
                {/* 1. Company Profile */}
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Company Name <span className="text-rose-500">*</span>
                    </Label>
                    <Input 
                      id="name" 
                      placeholder="e.g. SABIC Logistics Co." 
                      value={formData.name} 
                      onChange={(e) => handleChange('name', e.target.value)} 
                      className="h-9 text-xs" 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="trade_alias" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Trade Name / Brand
                      </Label>
                      <Input 
                        id="trade_alias" 
                        placeholder="e.g. SABIC" 
                        value={formData.trade_alias} 
                        onChange={(e) => handleChange('trade_alias', e.target.value)} 
                        className="h-9 text-xs" 
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="industry" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Industry
                      </Label>
                      <Select value={formData.industry} onValueChange={(v) => handleChange('industry', v)}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Select industry" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Logistics" className="text-xs">Logistics</SelectItem>
                          <SelectItem value="Retail" className="text-xs">Retail & E-commerce</SelectItem>
                          <SelectItem value="Manufacturing" className="text-xs">Manufacturing</SelectItem>
                          <SelectItem value="FMCG" className="text-xs">FMCG</SelectItem>
                          <SelectItem value="Healthcare" className="text-xs">Healthcare</SelectItem>
                          <SelectItem value="Construction" className="text-xs">Construction</SelectItem>
                          <SelectItem value="General" className="text-xs">General</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="cr_number" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Commercial Reg. (CR) No.
                      </Label>
                      <Input 
                        id="cr_number" 
                        placeholder="1010XXXXXX" 
                        value={formData.cr_number} 
                        onChange={(e) => handleChange('cr_number', e.target.value)} 
                        className="h-9 text-xs font-mono" 
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="vat_number" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        VAT / Tax Number
                      </Label>
                      <Input 
                        id="vat_number" 
                        placeholder="310123456700003" 
                        value={formData.vat_number} 
                        onChange={(e) => handleChange('vat_number', e.target.value)} 
                        className="h-9 text-xs font-mono" 
                      />
                    </div>
                  </div>
                </div>

                <hr className="border-slate-100 dark:border-slate-800" />

                {/* 2. Contact Information */}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="contact_phone" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Contact Phone <span className="text-rose-500">*</span>
                      </Label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400 font-mono">+966</span>
                        <Input 
                          id="contact_phone" 
                          placeholder="50XXXXXXX" 
                          value={formData.contact_phone} 
                          onChange={(e) => handleChange('contact_phone', e.target.value)} 
                          className="h-9 text-xs pl-14 font-mono" 
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Billing Email
                      </Label>
                      <Input 
                        id="email" 
                        type="email" 
                        placeholder="billing@company.com" 
                        value={formData.email} 
                        onChange={(e) => handleChange('email', e.target.value)} 
                        className="h-9 text-xs" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="contact_person" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Contact Person
                      </Label>
                      <Input 
                        id="contact_person" 
                        placeholder="Name" 
                        value={formData.contact_person} 
                        onChange={(e) => handleChange('contact_person', e.target.value)} 
                        className="h-9 text-xs" 
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="contact_title" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Job Title
                      </Label>
                      <Input 
                        id="contact_title" 
                        placeholder="Title" 
                        value={formData.contact_title} 
                        onChange={(e) => handleChange('contact_title', e.target.value)} 
                        className="h-9 text-xs" 
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="billing_address" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Address / Notes
                    </Label>
                    <Textarea 
                      id="billing_address" 
                      placeholder="Riyadh, Saudi Arabia" 
                      value={formData.billing_address} 
                      onChange={(e) => handleChange('billing_address', e.target.value)} 
                      className="min-h-[60px] text-xs" 
                    />
                  </div>
                </div>

                <hr className="border-slate-100 dark:border-slate-800" />

                {/* 3. Credit Limit & Account Status */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="credit_limit" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Credit Limit (SAR)
                    </Label>
                    <Input 
                      id="credit_limit" 
                      type="number" 
                      placeholder="100000" 
                      value={formData.credit_limit} 
                      onChange={(e) => handleChange('credit_limit', e.target.value)} 
                      className="h-9 text-xs font-mono font-bold" 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Account Status
                    </Label>
                    <div className="flex items-center gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={() => handleChange('isActive', true)}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border text-center transition-all ${
                          formData.isActive
                            ? 'bg-emerald-600 text-white border-emerald-600 font-bold shadow-2xs'
                            : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        Active
                      </button>
                      <button
                        type="button"
                        onClick={() => handleChange('isActive', false)}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border text-center transition-all ${
                          !formData.isActive
                            ? 'bg-rose-600 text-white border-rose-600 font-bold shadow-2xs'
                            : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        Inactive
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button 
                    size="sm" 
                    onClick={handleSubmit} 
                    disabled={createMutation.isPending || !isFormValid}
                    className="h-9 text-xs bg-[#E8450F] hover:bg-[#d03d0c] text-white font-bold px-5"
                  >
                    {createMutation.isPending ? 'Saving...' : 'Save Customer'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {error && (
              <div className="p-3 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 rounded-xl text-xs font-semibold border border-rose-200 dark:border-rose-800">
                {error}
              </div>
            )}
          </div>

          {/* Right Sidebar: Presets & Live Summary (5 Columns) */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* Presets Card */}
            <Card className="border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#E8450F]" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Quick Credit Templates</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset('enterprise')}
                  className="h-8 text-xs font-semibold justify-start bg-white dark:bg-slate-800"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-500 mr-1.5" /> Enterprise (250k)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset('midmarket')}
                  className="h-8 text-xs font-semibold justify-start bg-white dark:bg-slate-800"
                >
                  <Briefcase className="w-3.5 h-3.5 text-blue-500 mr-1.5" /> Mid-Market (100k)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset('sme')}
                  className="h-8 text-xs font-semibold justify-start bg-white dark:bg-slate-800"
                >
                  <Truck className="w-3.5 h-3.5 text-emerald-500 mr-1.5" /> SME (25k)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset('standard')}
                  className="h-8 text-xs font-semibold justify-start bg-white dark:bg-slate-800"
                >
                  <DollarSign className="w-3.5 h-3.5 text-slate-500 mr-1.5" /> Standard (0)
                </Button>
              </div>
            </Card>

            {/* Live Customer Summary */}
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Live Account Summary</span>
                <Badge variant="outline" className="text-[10px] font-mono text-[#E8450F]">
                  {completionPct}% Complete
                </Badge>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Building2 className="w-4 h-4 text-orange-500 mt-0.5" />
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Company</span>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {formData.name.trim() || 'New Customer Account'}
                    </p>
                    <span className="text-[11px] text-slate-500">{formData.industry}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-blue-500 mt-0.5" />
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Contact</span>
                    <p className="text-xs font-bold font-mono text-slate-900 dark:text-slate-100">
                      {formData.contact_phone.trim() ? `+966 ${formData.contact_phone}` : 'Not specified'}
                    </p>
                    <span className="text-[11px] text-slate-500">{formData.email || 'No email specified'}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <DollarSign className="w-4 h-4 text-emerald-500 mt-0.5" />
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Approved Credit Limit</span>
                    <p className="text-xs font-bold font-mono text-slate-900 dark:text-slate-100">
                      SAR {formData.credit_limit ? Number(formData.credit_limit).toLocaleString() : '0'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                <div className="flex justify-between text-[11px] font-semibold text-slate-500">
                  <span>Required fields</span>
                  <span>{filledCount} of {completionFields.length}</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-[#E8450F] h-full transition-all duration-300 rounded-full"
                    style={{ width: `${completionPct}%` }}
                  />
                </div>
              </div>
            </Card>

          </div>

        </div>

      </div>
    </DashboardLayout>
  );
}
