import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  RotateCcw, 
  Plus, 
  CheckCircle2, 
  Circle, 
  Keyboard, 
  ChevronRight, 
  ChevronLeft, 
  Building2, 
  Phone, 
  Mail, 
  DollarSign, 
  Factory, 
  ToggleRight,
  CreditCard,
  Calendar,
  FileCheck,
  Sparkles
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { customerService, CreateCustomerPayload } from '@/services/customerService';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AddCustomerPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'company' | 'financial'>('company');
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    contact_phone: '',
    email: '',
    industry: '',
    credit_limit: '',
    billing_cycle: '',
    payment_terms: '',
    isActive: true,
  });

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleReset = () => {
    setActiveTab('company');
    setFormData({
      name: '',
      contact_phone: '',
      email: '',
      industry: '',
      credit_limit: '',
      billing_cycle: '',
      payment_terms: '',
      isActive: true,
    });
    setError(null);
  };

  // Create Customer Mutation
  const createMutation = useMutation({
    mutationFn: (payload: CreateCustomerPayload) => customerService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      navigate('/customers');
    },
    onError: (err: any) => {
      setError(err.response?.data?.error?.message || err.message || 'Failed to onboard customer');
    },
  });

  const isFormValid = formData.name.trim() !== '' && formData.contact_phone.trim() !== '';

  const handleSubmit = useCallback(() => {
    setError(null);

    if (!formData.name.trim()) {
      setActiveTab('company');
      setError('Company name is required');
      return;
    }
    if (!formData.contact_phone.trim()) {
      setActiveTab('company');
      setError('Primary contact phone is required');
      return;
    }

    createMutation.mutate({
      name: formData.name.trim(),
      contact_phone: formData.contact_phone.trim(),
      credit_limit: formData.credit_limit ? Number(formData.credit_limit) : 0,
    });
  }, [formData, createMutation]);

  // Tab Navigation
  const goToNextTab = useCallback(() => setActiveTab('financial'), []);
  const goToPrevTab = useCallback(() => setActiveTab('company'), []);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';

      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (isFormValid && !createMutation.isPending) handleSubmit();
        return;
      }
      if (e.altKey && e.key === '1') { e.preventDefault(); setActiveTab('company'); return; }
      if (e.altKey && e.key === '2') { e.preventDefault(); setActiveTab('financial'); return; }
      if ((e.altKey || e.ctrlKey) && e.key === 'ArrowRight') { e.preventDefault(); goToNextTab(); return; }
      if ((e.altKey || e.ctrlKey) && e.key === 'ArrowLeft') { e.preventDefault(); goToPrevTab(); return; }
      if (!isInput) {
        if (e.key === 'ArrowRight') { e.preventDefault(); goToNextTab(); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); goToPrevTab(); }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNextTab, goToPrevTab, handleSubmit, isFormValid, createMutation.isPending]);

  // Form Completion Tracking
  const completionFields = [
    { label: 'Company Name', filled: formData.name.trim() !== '' },
    { label: 'Contact Phone', filled: formData.contact_phone.trim() !== '' },
    { label: 'Business Email', filled: formData.email.trim() !== '' },
    { label: 'Industry Vertical', filled: formData.industry !== '' },
    { label: 'Credit Limit', filled: formData.credit_limit !== '' },
    { label: 'Billing Cycle', filled: formData.billing_cycle !== '' },
  ];
  const filledCount = completionFields.filter(f => f.filled).length;
  const completionPct = Math.round((filledCount / completionFields.length) * 100);

  // Industry Presets
  const industryPresets = ['Logistics', 'Retail', 'Manufacturing', 'FMCG', 'Government', 'Healthcare', 'Oil & Gas', 'Construction'];

  return (
    <DashboardLayout active="Customers" title="Onboard Customer">
      <div className="px-6 pb-6 space-y-4 animate-fade-in max-w-[1400px] mx-auto">
        
        {/* Top Scope & Action Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
              <Building2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>MERCON Commercial</span>
              <span>•</span>
              <span className="text-slate-900 dark:text-slate-100 font-bold">Customer Onboarding</span>
            </div>
            <Badge variant="outline" className="bg-cyan-50 text-cyan-700 border-cyan-200 font-bold dark:bg-cyan-950/40 dark:text-cyan-300">
              New Customer
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/customers')}
              className="h-9 gap-1.5 text-xs font-semibold border-slate-200 bg-white hover:bg-slate-50 shadow-2xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Customers
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
              <Plus className="w-3.5 h-3.5" /> {createMutation.isPending ? 'Saving...' : 'Onboard Customer'}
              <kbd className="ml-1.5 px-1.5 py-0.5 text-[10px] font-mono font-bold bg-white/20 text-white rounded border border-white/30">
                Ctrl + ↵
              </kbd>
            </Button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 rounded-xl text-xs font-bold border border-rose-200 dark:border-rose-800 flex items-center gap-2">
            <Circle className="w-3.5 h-3.5 fill-rose-500 text-rose-500 shrink-0" />
            {error}
          </div>
        )}

        {/* Two-Panel Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* LEFT PANEL: Tabbed Form (3/5) */}
          <div className="lg:col-span-3 space-y-4">
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs overflow-hidden">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-800 flex items-center justify-center">
                      <Building2 className="w-4.5 h-4.5 text-cyan-600" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <Building2 className="w-4.5 h-4.5 text-cyan-600" /> Customer Registration
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-500">
                        Configure company identity, contacts, and financial setup.
                      </CardDescription>
                    </div>
                  </div>

                  {/* Keyboard Hints */}
                  <div className="hidden sm:flex items-center gap-1 text-[10px] text-slate-400">
                    <Keyboard className="w-3 h-3" />
                    <span>Alt+1/2 tabs</span>
                    <span className="text-slate-300">|</span>
                    <span>Ctrl+↵ save</span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-5">
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'company' | 'financial')}>
                  <TabsList className="grid grid-cols-2 w-full mb-4 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    <TabsTrigger value="company" className="text-xs font-semibold flex items-center justify-between gap-1">
                      <span>1. Company Identity</span>
                      <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded border border-slate-200 dark:border-slate-700 shadow-2xs">
                        Alt+1
                      </kbd>
                    </TabsTrigger>
                    <TabsTrigger value="financial" className="text-xs font-semibold flex items-center justify-between gap-1">
                      <span>2. Financial Setup</span>
                      <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded border border-slate-200 dark:border-slate-700 shadow-2xs">
                        Alt+2
                      </kbd>
                    </TabsTrigger>
                  </TabsList>

                  {/* TAB 1: Company Identity */}
                  <TabsContent value="company" className="space-y-4 m-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                      {/* Company Name */}
                      <div className="space-y-1.5">
                        <Label htmlFor="name" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" /> Company Name <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                          id="name"
                          placeholder="e.g. Almarai Logistics"
                          value={formData.name}
                          onChange={(e) => handleChange('name', e.target.value)}
                          className="h-9 text-xs font-medium border-slate-200"
                        />
                      </div>

                      {/* Contact Phone */}
                      <div className="space-y-1.5">
                        <Label htmlFor="contact_phone" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-slate-400" /> Primary Contact Phone <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                          id="contact_phone"
                          placeholder="+966 50 123 4567"
                          value={formData.contact_phone}
                          onChange={(e) => handleChange('contact_phone', e.target.value)}
                          className="h-9 text-xs font-medium border-slate-200"
                        />
                      </div>

                      {/* Business Email */}
                      <div className="space-y-1.5">
                        <Label htmlFor="email" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5 text-slate-400" /> Business Email
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="accounts@almarai.com"
                          value={formData.email}
                          onChange={(e) => handleChange('email', e.target.value)}
                          className="h-9 text-xs font-medium border-slate-200"
                        />
                      </div>

                      {/* Industry Vertical */}
                      <div className="space-y-1.5">
                        <Label htmlFor="industry" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <Factory className="w-3.5 h-3.5 text-slate-400" /> Industry Vertical
                        </Label>
                        <Select value={formData.industry} onValueChange={(v) => handleChange('industry', v)}>
                          <SelectTrigger className="h-9 text-xs font-medium border-slate-200">
                            <SelectValue placeholder="Select industry sector" />
                          </SelectTrigger>
                          <SelectContent>
                            {industryPresets.map((ind) => (
                              <SelectItem key={ind} value={ind} className="text-xs">
                                {ind}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Industry Quick Presets */}
                    <div className="pt-1">
                      <p className="text-[10px] text-slate-400 font-semibold mb-2 uppercase tracking-wider">Quick Industry Presets</p>
                      <div className="flex flex-wrap gap-1.5">
                        {industryPresets.map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => handleChange('industry', preset)}
                            className={`text-[11px] px-2.5 py-1 rounded-md border transition-all ${
                              formData.industry === preset
                                ? 'bg-cyan-600 text-white border-cyan-600 font-bold shadow-2xs'
                                : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex justify-end pt-2">
                      <Button size="sm" variant="outline" onClick={goToNextTab} className="text-xs font-bold gap-1">
                        Financial Setup <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TabsContent>

                  {/* TAB 2: Financial Setup */}
                  <TabsContent value="financial" className="space-y-4 m-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                      {/* Credit Limit */}
                      <div className="space-y-1.5">
                        <Label htmlFor="credit_limit" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <DollarSign className="w-3.5 h-3.5 text-slate-400" /> Credit Limit (SAR)
                        </Label>
                        <Input
                          id="credit_limit"
                          type="number"
                          placeholder="50,000"
                          value={formData.credit_limit}
                          onChange={(e) => handleChange('credit_limit', e.target.value)}
                          className="h-9 text-xs font-medium border-slate-200"
                        />
                        {/* Credit Limit Quick Presets */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {['10000', '25000', '50000', '100000', '250000', '500000'].map((amt) => (
                            <button
                              key={amt}
                              type="button"
                              onClick={() => handleChange('credit_limit', amt)}
                              className={`text-[11px] px-2 py-0.5 rounded-md border transition-all font-mono ${
                                formData.credit_limit === amt
                                  ? 'bg-cyan-600 text-white border-cyan-600 font-bold shadow-2xs'
                                  : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              SAR {Number(amt).toLocaleString()}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Billing Cycle */}
                      <div className="space-y-1.5">
                        <Label htmlFor="billing_cycle" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" /> Billing Cycle
                        </Label>
                        <Select value={formData.billing_cycle} onValueChange={(v) => handleChange('billing_cycle', v)}>
                          <SelectTrigger className="h-9 text-xs font-medium border-slate-200">
                            <SelectValue placeholder="Select billing cycle" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Monthly" className="text-xs">Monthly</SelectItem>
                            <SelectItem value="Quarterly" className="text-xs">Quarterly</SelectItem>
                            <SelectItem value="Annual" className="text-xs">Annual</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Payment Terms */}
                      <div className="space-y-1.5">
                        <Label htmlFor="payment_terms" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <CreditCard className="w-3.5 h-3.5 text-slate-400" /> Payment Terms
                        </Label>
                        <Select value={formData.payment_terms} onValueChange={(v) => handleChange('payment_terms', v)}>
                          <SelectTrigger className="h-9 text-xs font-medium border-slate-200">
                            <SelectValue placeholder="Select payment terms" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="COD" className="text-xs">Cash on Delivery (COD)</SelectItem>
                            <SelectItem value="Net 15" className="text-xs">Net 15 Days</SelectItem>
                            <SelectItem value="Net 30" className="text-xs">Net 30 Days</SelectItem>
                            <SelectItem value="Net 45" className="text-xs">Net 45 Days</SelectItem>
                            <SelectItem value="Net 60" className="text-xs">Net 60 Days</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Account Status Toggle */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <ToggleRight className="w-3.5 h-3.5 text-slate-400" /> Account Status
                        </Label>
                        <div className="flex items-center gap-3 pt-1">
                          <button
                            type="button"
                            onClick={() => handleChange('isActive', true)}
                            className={`text-xs px-3 py-1.5 rounded-lg border font-bold transition-all ${
                              formData.isActive
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-2xs dark:bg-emerald-950/30 dark:text-emerald-300'
                                : 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                            }`}
                          >
                            ● Active
                          </button>
                          <button
                            type="button"
                            onClick={() => handleChange('isActive', false)}
                            className={`text-xs px-3 py-1.5 rounded-lg border font-bold transition-all ${
                              !formData.isActive
                                ? 'bg-rose-50 text-rose-700 border-rose-300 shadow-2xs dark:bg-rose-950/30 dark:text-rose-300'
                                : 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                            }`}
                          >
                            ○ Inactive
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex justify-between pt-2">
                      <Button size="sm" variant="outline" onClick={goToPrevTab} className="text-xs font-bold gap-1">
                        <ChevronLeft className="w-3.5 h-3.5" /> Company Identity
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => handleSubmit()}
                        disabled={createMutation.isPending || !isFormValid}
                        className="text-xs bg-[#E8450F] hover:bg-[#d03d0c] text-white font-bold gap-1 px-4"
                      >
                        <Plus className="w-3.5 h-3.5" /> {createMutation.isPending ? 'Saving...' : 'Onboard Customer'}
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT PANEL: Live Preview (2/5) */}
          <div className="lg:col-span-2 space-y-4">

            {/* Live Customer Profile Card */}
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs overflow-hidden border-l-4 border-l-cyan-500">
              <CardHeader className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
                  <CardTitle className="text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    Live Customer Preview
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4">

                {/* Avatar + Name + ID */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-cyan-50 dark:bg-cyan-950/40 border-2 border-cyan-200 dark:border-cyan-800 flex items-center justify-center text-lg font-black text-cyan-700 dark:text-cyan-300 shrink-0">
                    {formData.name.trim() ? formData.name[0].toUpperCase() : 'C'}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">
                      {formData.name.trim() || 'Company Name'}
                    </span>
                    <span className="text-[11px] font-mono font-bold text-cyan-600">
                      CUST-{formData.name.trim() ? formData.name.slice(0, 3).toUpperCase() : 'XXX'}XX
                    </span>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={`ml-auto text-[9px] px-1.5 py-0 font-bold shrink-0 ${
                      formData.isActive 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}
                  >
                    {formData.isActive ? '● Active' : '○ Inactive'}
                  </Badge>
                </div>

                {/* Contact Details */}
                <div className="space-y-2 py-2 border-y border-slate-100 dark:border-slate-800 text-xs">
                  <div className="flex items-center gap-2.5">
                    <Phone className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {formData.contact_phone.trim() || '—'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Mail className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {formData.email.trim() || '—'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Factory className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {formData.industry || '—'}
                    </span>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-cyan-50/60 dark:bg-cyan-950/20 border border-cyan-200/60 dark:border-cyan-800">
                    <div>
                      <div className="text-[10px] text-cyan-600 dark:text-cyan-400 font-medium">Credit Limit</div>
                      <div className="font-mono font-extrabold text-cyan-800 dark:text-cyan-200 text-sm">
                        SAR {formData.credit_limit ? Number(formData.credit_limit).toLocaleString() : '0'}
                      </div>
                    </div>
                    <DollarSign className="w-4 h-4 text-cyan-500" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700">
                      <div className="text-[10px] text-slate-400 font-medium">Billing</div>
                      <div className="font-bold text-slate-900 dark:text-slate-100 text-[11px]">
                        {formData.billing_cycle || '—'}
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700">
                      <div className="text-[10px] text-slate-400 font-medium">Payment</div>
                      <div className="font-bold text-slate-900 dark:text-slate-100 text-[11px]">
                        {formData.payment_terms || '—'}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Completion Checklist Card */}
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs overflow-hidden">
              <CardHeader className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-3.5 h-3.5 text-cyan-600" />
                    <CardTitle className="text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                      Form Completion
                    </CardTitle>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-500">
                    {filledCount}/{completionFields.length}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {/* Progress Bar */}
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${completionPct}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 font-semibold">{completionPct}% Complete</p>

                {/* Checklist Items */}
                <div className="space-y-1.5">
                  {completionFields.map((field) => (
                    <div key={field.label} className="flex items-center gap-2 text-xs">
                      {field.filled ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      ) : (
                        <Circle className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                      )}
                      <span className={`font-medium ${field.filled ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400'}`}>
                        {field.label}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
