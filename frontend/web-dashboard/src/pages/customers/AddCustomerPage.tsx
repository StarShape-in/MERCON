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
  CreditCard,
  Calendar,
  Sparkles,
  MapPin,
  ShieldCheck,
  Briefcase,
  FileText,
  Zap,
  ChevronRight,
  ChevronLeft,
  Truck,
  Check,
  Globe,
  Sliders,
  UserCheck
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
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import Btn from '@/components/ui/Btn';

type TabKey = 'basic' | 'contact' | 'billing' | 'shipping';

export default function AddCustomerPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabKey>('basic');
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Basic Info
    name: '',
    trade_alias: '',
    cr_number: '',
    vat_number: '',
    industry: 'Logistics',
    company_tier: 'Enterprise',

    // Step 2: Contact
    contact_phone: '',
    email: '',
    contact_person: '',
    contact_title: '',
    ops_phone: '',
    billing_address: '',

    // Step 3: Billing & Credit
    credit_limit: '100000',
    billing_cycle: 'Monthly',
    payment_terms: 'Net 30 Days',
    currency: 'SAR',
    tax_exempt: false,
    isActive: true,

    // Step 4: Shipping
    pickup_city: 'Riyadh',
    pickup_lat: '24.7136',
    pickup_lng: '46.6753',
    dropoff_city: 'Jeddah',
    dropoff_lat: '21.4858',
    dropoff_lng: '39.1925',
    is_refrigerated: false,
    is_hazmat: false,
    service_level: 'Priority',
  });

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Quick Presets
  const applyPreset = (type: 'enterprise' | 'retail' | 'sme' | 'cod') => {
    switch (type) {
      case 'enterprise':
        setFormData((prev) => ({
          ...prev,
          company_tier: 'Enterprise',
          industry: 'Logistics',
          credit_limit: '250000',
          payment_terms: 'Net 45 Days',
          billing_cycle: 'Monthly',
          service_level: 'Priority',
          is_refrigerated: true,
        }));
        break;
      case 'retail':
        setFormData((prev) => ({
          ...prev,
          company_tier: 'Mid-Market',
          industry: 'Retail',
          credit_limit: '100000',
          payment_terms: 'Net 30 Days',
          billing_cycle: 'Monthly',
          service_level: 'Standard',
          is_refrigerated: false,
        }));
        break;
      case 'sme':
        setFormData((prev) => ({
          ...prev,
          company_tier: 'SME',
          industry: 'FMCG',
          credit_limit: '25000',
          payment_terms: 'Net 15 Days',
          billing_cycle: 'Weekly',
          service_level: 'Standard',
        }));
        break;
      case 'cod':
        setFormData((prev) => ({
          ...prev,
          company_tier: 'SME',
          industry: 'FMCG',
          credit_limit: '0',
          payment_terms: 'Cash on Delivery (COD)',
          billing_cycle: 'Per Shipment',
          service_level: 'Standard',
        }));
        break;
    }
  };

  const handleReset = () => {
    setActiveTab('basic');
    setFormData({
      name: '',
      trade_alias: '',
      cr_number: '',
      vat_number: '',
      industry: 'Logistics',
      company_tier: 'Enterprise',
      contact_phone: '',
      email: '',
      contact_person: '',
      contact_title: '',
      ops_phone: '',
      billing_address: '',
      credit_limit: '100000',
      billing_cycle: 'Monthly',
      payment_terms: 'Net 30 Days',
      currency: 'SAR',
      tax_exempt: false,
      isActive: true,
      pickup_city: 'Riyadh',
      pickup_lat: '24.7136',
      pickup_lng: '46.6753',
      dropoff_city: 'Jeddah',
      dropoff_lat: '21.4858',
      dropoff_lng: '39.1925',
      is_refrigerated: false,
      is_hazmat: false,
      service_level: 'Priority',
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
      setActiveTab('basic');
      setError('Company Name is required');
      return;
    }
    if (!formData.contact_phone.trim()) {
      setActiveTab('contact');
      setError('Contact Phone is required');
      return;
    }

    createMutation.mutate({
      name: formData.name.trim(),
      contact_phone: formData.contact_phone.trim(),
      credit_limit: formData.credit_limit ? Number(formData.credit_limit) : 0,
      default_pickup_lat: formData.pickup_lat ? Number(formData.pickup_lat) : null,
      default_pickup_lng: formData.pickup_lng ? Number(formData.pickup_lng) : null,
      default_dropoff_lat: formData.dropoff_lat ? Number(formData.dropoff_lat) : null,
      default_dropoff_lng: formData.dropoff_lng ? Number(formData.dropoff_lng) : null,
    });
  }, [formData, createMutation]);

  // Navigation
  const tabSequence: TabKey[] = ['basic', 'contact', 'billing', 'shipping'];
  const currentTabIndex = tabSequence.indexOf(activeTab);

  const goToNextTab = useCallback(() => {
    if (currentTabIndex < tabSequence.length - 1) {
      setActiveTab(tabSequence[currentTabIndex + 1]);
    }
  }, [currentTabIndex]);

  const goToPrevTab = useCallback(() => {
    if (currentTabIndex > 0) {
      setActiveTab(tabSequence[currentTabIndex - 1]);
    }
  }, [currentTabIndex]);

  // Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';

      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (isFormValid && !createMutation.isPending) handleSubmit();
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        navigate('/customers');
        return;
      }
      if (e.altKey && e.key === '1') { e.preventDefault(); setActiveTab('basic'); return; }
      if (e.altKey && e.key === '2') { e.preventDefault(); setActiveTab('contact'); return; }
      if (e.altKey && e.key === '3') { e.preventDefault(); setActiveTab('billing'); return; }
      if (e.altKey && e.key === '4') { e.preventDefault(); setActiveTab('shipping'); return; }
      if (e.altKey && e.key === 'r') { e.preventDefault(); handleReset(); return; }

      if (!isInput) {
        if (e.key === 'ArrowRight') { e.preventDefault(); goToNextTab(); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); goToPrevTab(); }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNextTab, goToPrevTab, handleSubmit, isFormValid, createMutation.isPending, navigate]);

  // Completion calculation
  const completionFields = [
    { label: 'Company Name', filled: formData.name.trim() !== '' },
    { label: 'Contact Phone', filled: formData.contact_phone.trim() !== '' },
    { label: 'Business Email', filled: formData.email.trim() !== '' },
    { label: 'Credit Limit', filled: formData.credit_limit !== '' },
    { label: 'Pickup City', filled: formData.pickup_city.trim() !== '' },
    { label: 'Delivery City', filled: formData.dropoff_city.trim() !== '' },
  ];
  const filledCount = completionFields.filter(f => f.filled).length;
  const completionPct = Math.round((filledCount / completionFields.length) * 100);

  return (
    <DashboardLayout active="Customers" title="Add Customer">
      <div className="px-4 sm:px-6 pb-6 space-y-4 animate-fade-in max-w-[1400px] mx-auto">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-0.5">
              <button onClick={() => navigate('/customers')} className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                Customers
              </button>
              <span>/</span>
              <span className="text-[#E8450F] font-bold">New</span>
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
              className="h-8 text-xs bg-[#E8450F] hover:bg-[#d03d0c] text-white font-bold px-4"
            >
              {createMutation.isPending ? 'Saving...' : 'Save Customer'}
            </Button>
          </div>
        </div>

        {/* 2-Column Balanced Dashboard Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* Main Form Section (7 Columns) */}
          <div className="lg:col-span-7 space-y-4">
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl shadow-2xs">
              <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
                  <TabsList className="grid grid-cols-4 w-full bg-slate-200/60 dark:bg-slate-800 p-1 rounded-lg">
                    <TabsTrigger value="basic" className="text-xs font-semibold py-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900">
                      1. Basic Info
                    </TabsTrigger>
                    <TabsTrigger value="contact" className="text-xs font-semibold py-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900">
                      2. Contact
                    </TabsTrigger>
                    <TabsTrigger value="billing" className="text-xs font-semibold py-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900">
                      3. Billing
                    </TabsTrigger>
                    <TabsTrigger value="shipping" className="text-xs font-semibold py-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900">
                      4. Shipping
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>

              <CardContent className="p-5">
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
                  
                  {/* TAB 1: Basic Info */}
                  <TabsContent value="basic" className="space-y-4 m-0">
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

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Company Size
                      </Label>
                      <div className="grid grid-cols-3 gap-2">
                        {['Enterprise', 'Mid-Market', 'SME'].map((tier) => (
                          <button
                            key={tier}
                            type="button"
                            onClick={() => handleChange('company_tier', tier)}
                            className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all ${
                              formData.company_tier === tier
                                ? 'bg-orange-50 dark:bg-orange-950/40 text-[#E8450F] border-[#E8450F] font-bold'
                                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                            }`}
                          >
                            {tier}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
                      <Button size="sm" onClick={goToNextTab} className="h-8 text-xs bg-[#E8450F] hover:bg-[#d03d0c] text-white gap-1">
                        Next <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TabsContent>

                  {/* TAB 2: Contact */}
                  <TabsContent value="contact" className="space-y-4 m-0">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="contact_phone" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Phone Number <span className="text-rose-500">*</span>
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
                        className="min-h-[70px] text-xs" 
                      />
                    </div>

                    <div className="flex justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                      <Button variant="outline" size="sm" onClick={goToPrevTab} className="h-8 text-xs gap-1">
                        <ChevronLeft className="w-3.5 h-3.5" /> Back
                      </Button>
                      <Button size="sm" onClick={goToNextTab} className="h-8 text-xs bg-[#E8450F] hover:bg-[#d03d0c] text-white gap-1">
                        Next <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TabsContent>

                  {/* TAB 3: Billing & Credit */}
                  <TabsContent value="billing" className="space-y-4 m-0">
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
                        <Label htmlFor="payment_terms" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Payment Terms
                        </Label>
                        <Select value={formData.payment_terms} onValueChange={(v) => handleChange('payment_terms', v)}>
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="Select terms" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Net 15 Days" className="text-xs">Net 15 Days</SelectItem>
                            <SelectItem value="Net 30 Days" className="text-xs">Net 30 Days</SelectItem>
                            <SelectItem value="Net 45 Days" className="text-xs">Net 45 Days</SelectItem>
                            <SelectItem value="Net 60 Days" className="text-xs">Net 60 Days</SelectItem>
                            <SelectItem value="Cash on Delivery (COD)" className="text-xs">Cash on Delivery (COD)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="billing_cycle" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Billing Cycle
                        </Label>
                        <Select value={formData.billing_cycle} onValueChange={(v) => handleChange('billing_cycle', v)}>
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="Select cycle" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Weekly" className="text-xs">Weekly</SelectItem>
                            <SelectItem value="Monthly" className="text-xs">Monthly</SelectItem>
                            <SelectItem value="Per Shipment" className="text-xs">Per Shipment</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Account Status
                        </Label>
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleChange('isActive', true)}
                            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border text-center ${
                              formData.isActive
                                ? 'bg-emerald-600 text-white border-emerald-600 font-bold'
                                : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800'
                            }`}
                          >
                            Active
                          </button>
                          <button
                            type="button"
                            onClick={() => handleChange('isActive', false)}
                            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border text-center ${
                              !formData.isActive
                                ? 'bg-rose-600 text-white border-rose-600 font-bold'
                                : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800'
                            }`}
                          >
                            Inactive
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                      <Button variant="outline" size="sm" onClick={goToPrevTab} className="h-8 text-xs gap-1">
                        <ChevronLeft className="w-3.5 h-3.5" /> Back
                      </Button>
                      <Button size="sm" onClick={goToNextTab} className="h-8 text-xs bg-[#E8450F] hover:bg-[#d03d0c] text-white gap-1">
                        Next <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TabsContent>

                  {/* TAB 4: Shipping */}
                  <TabsContent value="shipping" className="space-y-4 m-0">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="pickup_city" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Pickup City
                        </Label>
                        <Input 
                          id="pickup_city" 
                          placeholder="e.g. Riyadh" 
                          value={formData.pickup_city} 
                          onChange={(e) => handleChange('pickup_city', e.target.value)} 
                          className="h-9 text-xs" 
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="dropoff_city" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Delivery City
                        </Label>
                        <Input 
                          id="dropoff_city" 
                          placeholder="e.g. Jeddah" 
                          value={formData.dropoff_city} 
                          onChange={(e) => handleChange('dropoff_city', e.target.value)} 
                          className="h-9 text-xs" 
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="service_level" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Delivery Speed
                      </Label>
                      <Select value={formData.service_level} onValueChange={(v) => handleChange('service_level', v)}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Select speed" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Priority" className="text-xs">Priority Express</SelectItem>
                          <SelectItem value="Standard" className="text-xs">Standard Freight</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer">
                        <Checkbox 
                          checked={formData.is_refrigerated} 
                          onCheckedChange={(c) => handleChange('is_refrigerated', !!c)} 
                        />
                        <span className="text-xs font-medium">Refrigerated Storage</span>
                      </label>

                      <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer">
                        <Checkbox 
                          checked={formData.is_hazmat} 
                          onCheckedChange={(c) => handleChange('is_hazmat', !!c)} 
                        />
                        <span className="text-xs font-medium">Hazardous Cargo</span>
                      </label>
                    </div>

                    <div className="flex justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                      <Button variant="outline" size="sm" onClick={goToPrevTab} className="h-8 text-xs gap-1">
                        <ChevronLeft className="w-3.5 h-3.5" /> Back
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={handleSubmit} 
                        disabled={createMutation.isPending || !isFormValid}
                        className="h-8 text-xs bg-[#E8450F] hover:bg-[#d03d0c] text-white font-bold px-4"
                      >
                        {createMutation.isPending ? 'Saving...' : 'Save Customer'}
                      </Button>
                    </div>
                  </TabsContent>

                </Tabs>
              </CardContent>
            </Card>

            {error && (
              <div className="p-3 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 rounded-xl text-xs font-semibold border border-rose-200 dark:border-rose-800">
                {error}
              </div>
            )}
          </div>

          {/* Right Sidebar: Quick Fill Presets & Live Summary Card (5 Columns) */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* Quick Fill Card */}
            <Card className="border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#E8450F]" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Quick Fill Templates</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset('enterprise')}
                  className="h-8 text-xs font-semibold justify-start bg-white dark:bg-slate-800"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-500 mr-1.5" /> Enterprise
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset('retail')}
                  className="h-8 text-xs font-semibold justify-start bg-white dark:bg-slate-800"
                >
                  <Briefcase className="w-3.5 h-3.5 text-blue-500 mr-1.5" /> Retail
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset('sme')}
                  className="h-8 text-xs font-semibold justify-start bg-white dark:bg-slate-800"
                >
                  <Truck className="w-3.5 h-3.5 text-emerald-500 mr-1.5" /> SME
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset('cod')}
                  className="h-8 text-xs font-semibold justify-start bg-white dark:bg-slate-800"
                >
                  <DollarSign className="w-3.5 h-3.5 text-slate-500 mr-1.5" /> Cash / COD
                </Button>
              </div>
            </Card>

            {/* Live Customer Account Preview */}
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Account Summary</span>
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
                      {formData.name.trim() || 'New Customer'}
                    </p>
                    <span className="text-[11px] text-slate-500">{formData.industry} • {formData.company_tier}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-blue-500 mt-0.5" />
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Contact</span>
                    <p className="text-xs font-bold font-mono text-slate-900 dark:text-slate-100">
                      {formData.contact_phone.trim() ? `+966 ${formData.contact_phone}` : 'Not provided'}
                    </p>
                    <span className="text-[11px] text-slate-500">{formData.email || 'No email'}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <DollarSign className="w-4 h-4 text-emerald-500 mt-0.5" />
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Credit & Terms</span>
                    <p className="text-xs font-bold font-mono text-slate-900 dark:text-slate-100">
                      SAR {formData.credit_limit ? Number(formData.credit_limit).toLocaleString() : '0'}
                    </p>
                    <span className="text-[11px] text-slate-500">{formData.payment_terms} • {formData.billing_cycle}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-indigo-500 mt-0.5" />
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Route</span>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {formData.pickup_city || 'Pickup'} → {formData.dropoff_city || 'Delivery'}
                    </p>
                    <span className="text-[11px] text-slate-500">{formData.service_level} Delivery</span>
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
