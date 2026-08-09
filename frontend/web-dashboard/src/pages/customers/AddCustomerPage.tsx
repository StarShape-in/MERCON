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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import Btn from '@/components/ui/Btn';

type TabKey = 'company' | 'contact' | 'financial' | 'logistics';

export default function AddCustomerPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabKey>('company');
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Corporate Identity
    name: '',
    trade_alias: '',
    cr_number: '',
    vat_number: '',
    industry: 'Logistics & Supply Chain',
    company_tier: 'Tier 1 Enterprise',

    // Step 2: Contact Details
    contact_phone: '',
    email: '',
    contact_person: '',
    contact_title: '',
    ops_phone: '',
    billing_address: '',

    // Step 3: Financial SLA
    credit_limit: '100000',
    billing_cycle: 'Monthly Invoicing',
    payment_terms: 'Net 30 Days',
    currency: 'SAR',
    tax_exempt: false,
    isActive: true,

    // Step 4: Logistics SLA & Routes
    pickup_city: 'Riyadh Logistics Park',
    pickup_lat: '24.7136',
    pickup_lng: '46.6753',
    dropoff_city: 'Jeddah Islamic Port',
    dropoff_lat: '21.4858',
    dropoff_lng: '39.1925',
    is_refrigerated: false,
    is_hazmat: false,
    service_level: 'Priority Dedicated Fleet',
  });

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Quick Preset Handlers
  const applyPreset = (type: 'enterprise' | 'retail' | 'sme' | 'cod') => {
    switch (type) {
      case 'enterprise':
        setFormData((prev) => ({
          ...prev,
          company_tier: 'Tier 1 Enterprise',
          industry: 'Logistics & Supply Chain',
          credit_limit: '250000',
          payment_terms: 'Net 45 Days',
          billing_cycle: 'Monthly Invoicing',
          service_level: 'Priority Dedicated Fleet',
          is_refrigerated: true,
        }));
        break;
      case 'retail':
        setFormData((prev) => ({
          ...prev,
          company_tier: 'Tier 2 Mid-Market',
          industry: 'Retail & E-commerce',
          credit_limit: '100000',
          payment_terms: 'Net 30 Days',
          billing_cycle: 'Monthly Invoicing',
          service_level: 'Regular Scheduled Freight',
          is_refrigerated: false,
        }));
        break;
      case 'sme':
        setFormData((prev) => ({
          ...prev,
          company_tier: 'Tier 3 SME',
          industry: 'FMCG & Consumer Goods',
          credit_limit: '25000',
          payment_terms: 'Net 15 Days',
          billing_cycle: 'Weekly Invoicing',
          service_level: 'Regular Scheduled Freight',
        }));
        break;
      case 'cod':
        setFormData((prev) => ({
          ...prev,
          company_tier: 'Tier 3 SME',
          industry: 'FMCG & Consumer Goods',
          credit_limit: '0',
          payment_terms: 'Cash on Delivery (COD)',
          billing_cycle: 'Per Shipment',
          service_level: 'Regular Scheduled Freight',
        }));
        break;
    }
  };

  const handleReset = () => {
    setActiveTab('company');
    setFormData({
      name: '',
      trade_alias: '',
      cr_number: '',
      vat_number: '',
      industry: 'Logistics & Supply Chain',
      company_tier: 'Tier 1 Enterprise',
      contact_phone: '',
      email: '',
      contact_person: '',
      contact_title: '',
      ops_phone: '',
      billing_address: '',
      credit_limit: '100000',
      billing_cycle: 'Monthly Invoicing',
      payment_terms: 'Net 30 Days',
      currency: 'SAR',
      tax_exempt: false,
      isActive: true,
      pickup_city: 'Riyadh Logistics Park',
      pickup_lat: '24.7136',
      pickup_lng: '46.6753',
      dropoff_city: 'Jeddah Islamic Port',
      dropoff_lat: '21.4858',
      dropoff_lng: '39.1925',
      is_refrigerated: false,
      is_hazmat: false,
      service_level: 'Priority Dedicated Fleet',
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
      setError(err.response?.data?.error?.message || err.message || 'Failed to onboard customer entity');
    },
  });

  const isFormValid = formData.name.trim() !== '' && formData.contact_phone.trim() !== '';

  const handleSubmit = useCallback(() => {
    setError(null);

    if (!formData.name.trim()) {
      setActiveTab('company');
      setError('Company name / Legal Entity is required');
      return;
    }
    if (!formData.contact_phone.trim()) {
      setActiveTab('contact');
      setError('Primary contact phone is required');
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

  // Tab Navigation helpers
  const tabSequence: TabKey[] = ['company', 'contact', 'financial', 'logistics'];
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
      if (e.key === 'Escape') {
        e.preventDefault();
        navigate('/customers');
        return;
      }
      if (e.altKey && e.key === '1') { e.preventDefault(); setActiveTab('company'); return; }
      if (e.altKey && e.key === '2') { e.preventDefault(); setActiveTab('contact'); return; }
      if (e.altKey && e.key === '3') { e.preventDefault(); setActiveTab('financial'); return; }
      if (e.altKey && e.key === '4') { e.preventDefault(); setActiveTab('logistics'); return; }
      if (e.altKey && e.key === 'r') { e.preventDefault(); handleReset(); return; }

      if (!isInput) {
        if (e.key === 'ArrowRight') { e.preventDefault(); goToNextTab(); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); goToPrevTab(); }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNextTab, goToPrevTab, handleSubmit, isFormValid, createMutation.isPending, navigate]);

  // Form Completion Tracking
  const completionFields = [
    { label: 'Company Name', filled: formData.name.trim() !== '' },
    { label: 'Contact Phone', filled: formData.contact_phone.trim() !== '' },
    { label: 'Business Email', filled: formData.email.trim() !== '' },
    { label: 'CR Number', filled: formData.cr_number.trim() !== '' },
    { label: 'Credit Limit', filled: formData.credit_limit !== '' },
    { label: 'Payment Terms', filled: formData.payment_terms !== '' },
    { label: 'Pickup Location', filled: formData.pickup_city.trim() !== '' },
    { label: 'Dropoff Location', filled: formData.dropoff_city.trim() !== '' },
  ];
  const filledCount = completionFields.filter(f => f.filled).length;
  const completionPct = Math.round((filledCount / completionFields.length) * 100);

  return (
    <DashboardLayout active="Customers" title="Onboard Customer">
      <div className="px-4 sm:px-6 pb-8 space-y-6 animate-fade-in max-w-[1440px] mx-auto">
        
        {/* Clean, Balanced Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => navigate('/customers')}
                className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 flex items-center gap-1 transition-colors"
              >
                Customers
              </button>
              <span className="text-slate-300 dark:text-slate-700">/</span>
              <span className="text-xs font-bold text-[#E8450F]">New Onboarding</span>
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2.5">
              <Building2 className="w-5 h-5 text-[#E8450F]" />
              Onboard New Customer
            </h1>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5">
            <Btn 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/customers')}
              className="h-9 gap-1.5 text-xs font-semibold border-slate-200 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 shadow-2xs"
              label="Cancel"
              icon={<ArrowLeft className="w-3.5 h-3.5" />}
              shortcut={{ key: 'Escape' }}
            />
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleReset}
              className="h-9 gap-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </Button>
            <Btn 
              size="sm" 
              onClick={() => handleSubmit()}
              disabled={createMutation.isPending || !isFormValid}
              className="h-9 gap-1.5 text-xs bg-[#E8450F] hover:bg-[#d03d0c] text-white font-bold shadow-xs rounded-lg px-4"
              label={createMutation.isPending ? 'Saving...' : 'Save & Onboard'}
              icon={<Plus className="w-4 h-4" />}
              shortcut={{ key: 'Enter', metaOrControl: true }}
            />
          </div>
        </div>

        {/* Quick-Fill Presets Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-gradient-to-r from-orange-50/60 via-slate-50 to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#E8450F] animate-pulse shrink-0" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">1-Click Presets:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyPreset('enterprise')}
              className="h-7 text-[11px] font-semibold gap-1 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-slate-700"
            >
              <Zap className="w-3 h-3 text-amber-500" /> Enterprise Freight
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyPreset('retail')}
              className="h-7 text-[11px] font-semibold gap-1 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-slate-700"
            >
              <Briefcase className="w-3 h-3 text-blue-500" /> Standard Retail
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyPreset('sme')}
              className="h-7 text-[11px] font-semibold gap-1 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-slate-700"
            >
              <Truck className="w-3 h-3 text-emerald-500" /> SME Distribution
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyPreset('cod')}
              className="h-7 text-[11px] font-semibold gap-1 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-slate-700"
            >
              <DollarSign className="w-3 h-3 text-slate-500" /> Cash / COD
            </Button>
          </div>
        </div>

        {/* Live Instrument Panel & Progress Bar */}
        <Card className="border border-slate-200 dark:border-slate-800 shadow-2xs rounded-xl overflow-hidden bg-white dark:bg-slate-900">
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800">
            {/* Metric 1: Client Identity */}
            <div className="flex items-center gap-3 pr-2">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-orange-100 text-[#E8450F] dark:bg-orange-950/50 dark:text-orange-400 shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Account Name</span>
                  {formData.name.trim() && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                </div>
                <p className="text-xs font-bold truncate mt-0.5 text-slate-900 dark:text-slate-100">
                  {formData.name.trim() || 'New Account Entity'}
                </p>
                <span className="text-[11px] text-slate-500 truncate block">
                  {formData.industry}
                </span>
              </div>
            </div>

            {/* Metric 2: Contact Details */}
            <div className="flex items-center gap-3 sm:pl-4 pr-2 pt-3 sm:pt-0">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 shrink-0">
                <Phone className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Primary Contact</span>
                  {(formData.contact_phone.trim() || formData.email.trim()) && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                </div>
                <p className="text-xs font-bold truncate mt-0.5 text-slate-900 dark:text-slate-100 font-mono">
                  {formData.contact_phone.trim() ? `+966 ${formData.contact_phone}` : 'No Phone'}
                </p>
                <span className="text-[11px] text-slate-500 truncate block font-mono">
                  {formData.email.trim() || 'No Email'}
                </span>
              </div>
            </div>

            {/* Metric 3: Financial SLA */}
            <div className="flex items-center gap-3 lg:pl-4 pr-2 pt-3 lg:pt-0">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 shrink-0">
                <DollarSign className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Financial SLA</span>
                  {formData.credit_limit && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                </div>
                <p className="text-xs font-bold truncate mt-0.5 text-slate-900 dark:text-slate-100 font-mono">
                  SAR {formData.credit_limit ? Number(formData.credit_limit).toLocaleString() : '0'}
                </p>
                <span className="text-[11px] text-slate-500 truncate block">
                  {formData.payment_terms}
                </span>
              </div>
            </div>

            {/* Metric 4: Logistics SLA Route */}
            <div className="flex items-center gap-3 lg:pl-4 pt-3 lg:pt-0">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-indigo-100 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Route SLA</span>
                  {formData.pickup_city && formData.dropoff_city && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                </div>
                <p className="text-xs font-bold truncate mt-0.5 text-slate-900 dark:text-slate-100">
                  {formData.pickup_city || 'Origin'} → {formData.dropoff_city || 'Destination'}
                </p>
                <span className="text-[11px] text-slate-500 truncate block">
                  {formData.service_level}
                </span>
              </div>
            </div>
          </div>

          {/* Form Completion Progress Bar */}
          <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0">
              <span>Progress:</span>
              <Badge variant="outline" className="font-mono text-xs bg-white dark:bg-slate-900 text-[#E8450F] border-orange-200">
                {completionPct}%
              </Badge>
            </div>
            <div className="flex-1 bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-orange-500 to-amber-500 h-full transition-all duration-300 rounded-full"
                style={{ width: `${completionPct}%` }}
              />
            </div>
            <div className="hidden sm:flex items-center gap-2 text-[11px] font-semibold text-slate-500">
              <span>{filledCount} of {completionFields.length} fields</span>
            </div>
          </div>
        </Card>

        {/* Form Wizard Tabs Container */}
        <div className="max-w-5xl mx-auto w-full pt-1">
          <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl shadow-2xs overflow-hidden">
            
            {/* Card Header with Description */}
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-950/40 text-[#E8450F]">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      Customer Registration Form
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500 mt-0.5">
                      Enter company details, contact personnel, credit SLA, and logistics parameters.
                    </CardDescription>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono bg-white dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 self-start sm:self-auto">
                  <span>Step {currentTabIndex + 1} of 4</span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
                
                {/* Tab Triggers */}
                <TabsList className="grid grid-cols-2 lg:grid-cols-4 w-full mb-6 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl gap-1">
                  <TabsTrigger 
                    value="company" 
                    className="text-xs font-semibold flex items-center justify-between py-2 px-3 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-2xs rounded-lg transition-all"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Building2 className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                      <span className="truncate">1. Identity & CR</span>
                    </div>
                    <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700">Alt+1</kbd>
                  </TabsTrigger>

                  <TabsTrigger 
                    value="contact" 
                    className="text-xs font-semibold flex items-center justify-between py-2 px-3 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-2xs rounded-lg transition-all"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Phone className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span className="truncate">2. Key Contacts</span>
                    </div>
                    <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700">Alt+2</kbd>
                  </TabsTrigger>

                  <TabsTrigger 
                    value="financial" 
                    className="text-xs font-semibold flex items-center justify-between py-2 px-3 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-2xs rounded-lg transition-all"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="truncate">3. Financial SLA</span>
                    </div>
                    <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700">Alt+3</kbd>
                  </TabsTrigger>

                  <TabsTrigger 
                    value="logistics" 
                    className="text-xs font-semibold flex items-center justify-between py-2 px-3 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-2xs rounded-lg transition-all"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span className="truncate">4. Routes & SLA</span>
                    </div>
                    <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700">Alt+4</kbd>
                  </TabsTrigger>
                </TabsList>

                {/* TAB 1: Company Profile & Identity */}
                <TabsContent value="company" className="space-y-5 m-0 focus-visible:outline-none">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Legal Entity Name */}
                    <div className="space-y-1.5 md:col-span-2">
                      <Label htmlFor="name" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        Company Legal Name / Entity Name <span className="text-rose-500">*</span>
                      </Label>
                      <Input 
                        id="name" 
                        placeholder="e.g. SABIC Supply Chain Services Co." 
                        value={formData.name} 
                        onChange={(e) => handleChange('name', e.target.value)} 
                        className="h-10 text-xs font-medium border-slate-200 dark:border-slate-700 focus-visible:ring-1 focus-visible:ring-orange-500" 
                      />
                    </div>

                    {/* Trade Alias */}
                    <div className="space-y-1.5">
                      <Label htmlFor="trade_alias" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                        Trade Name / Alias
                      </Label>
                      <Input 
                        id="trade_alias" 
                        placeholder="e.g. SABIC Logistics" 
                        value={formData.trade_alias} 
                        onChange={(e) => handleChange('trade_alias', e.target.value)} 
                        className="h-10 text-xs border-slate-200 dark:border-slate-700" 
                      />
                    </div>

                    {/* Industry Vertical */}
                    <div className="space-y-1.5">
                      <Label htmlFor="industry" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Factory className="w-3.5 h-3.5 text-slate-400" />
                        Industry Sector
                      </Label>
                      <Select value={formData.industry} onValueChange={(v) => handleChange('industry', v)}>
                        <SelectTrigger className="h-10 text-xs font-medium border-slate-200 dark:border-slate-700">
                          <SelectValue placeholder="Select industry" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Logistics & Supply Chain" className="text-xs">Logistics & Supply Chain</SelectItem>
                          <SelectItem value="Retail & E-commerce" className="text-xs">Retail & E-commerce</SelectItem>
                          <SelectItem value="Heavy Manufacturing" className="text-xs">Heavy Manufacturing</SelectItem>
                          <SelectItem value="FMCG & Consumer Goods" className="text-xs">FMCG & Consumer Goods</SelectItem>
                          <SelectItem value="Healthcare & Pharma" className="text-xs">Healthcare & Pharma</SelectItem>
                          <SelectItem value="Oil, Gas & Energy" className="text-xs">Oil, Gas & Energy</SelectItem>
                          <SelectItem value="Construction & Contracting" className="text-xs">Construction & Contracting</SelectItem>
                          <SelectItem value="Government & Defense" className="text-xs">Government & Defense</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Commercial Registration (CR) */}
                    <div className="space-y-1.5">
                      <Label htmlFor="cr_number" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        Commercial Registration (CR) No.
                      </Label>
                      <Input 
                        id="cr_number" 
                        placeholder="1010XXXXXX" 
                        value={formData.cr_number} 
                        onChange={(e) => handleChange('cr_number', e.target.value)} 
                        className="h-10 text-xs font-mono border-slate-200 dark:border-slate-700" 
                      />
                    </div>

                    {/* Tax / VAT Number */}
                    <div className="space-y-1.5">
                      <Label htmlFor="vat_number" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-slate-400" />
                        VAT / Tax Registration Number
                      </Label>
                      <Input 
                        id="vat_number" 
                        placeholder="310123456700003" 
                        value={formData.vat_number} 
                        onChange={(e) => handleChange('vat_number', e.target.value)} 
                        className="h-10 text-xs font-mono border-slate-200 dark:border-slate-700" 
                      />
                    </div>

                    {/* Company Tier */}
                    <div className="space-y-1.5 md:col-span-2">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-slate-400" />
                        Account Tier & Service Priority
                      </Label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                        {[
                          { id: 'Tier 1 Enterprise', name: 'Enterprise Tier 1', desc: 'Dedicated account manager & priority fleet' },
                          { id: 'Tier 2 Mid-Market', name: 'Mid-Market Tier 2', desc: 'Standard SLA with scheduled dispatch' },
                          { id: 'Tier 3 SME', name: 'SME Tier 3', desc: 'Standard freight dispatch & automated invoicing' }
                        ].map((tier) => (
                          <div 
                            key={tier.id}
                            onClick={() => handleChange('company_tier', tier.id)}
                            className={`p-3 rounded-xl border cursor-pointer transition-all ${
                              formData.company_tier === tier.id 
                                ? 'border-[#E8450F] bg-orange-50/50 dark:bg-orange-950/20 text-[#E8450F]' 
                                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold">{tier.name}</span>
                              {formData.company_tier === tier.id && <Check className="w-3.5 h-3.5 text-[#E8450F]" />}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-1 leading-tight">{tier.desc}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Navigation Buttons */}
                  <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                    <Btn 
                      type="button" 
                      size="sm" 
                      onClick={goToNextTab} 
                      className="text-xs font-bold gap-1.5 bg-[#E8450F] hover:bg-[#d03d0c] text-white px-5 h-9" 
                      label="Next: Key Contacts" 
                      icon={<ChevronRight className="w-4 h-4" />} 
                      shortcut={{ key: 'ArrowRight', alt: true }} 
                    />
                  </div>
                </TabsContent>

                {/* TAB 2: Contacts & Personnel */}
                <TabsContent value="contact" className="space-y-5 m-0 focus-visible:outline-none">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Primary Contact Phone */}
                    <div className="space-y-1.5">
                      <Label htmlFor="contact_phone" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        Primary Contact Phone <span className="text-rose-500">*</span>
                      </Label>
                      <div className="relative">
                        <div className="absolute left-3 top-2.5 flex items-center gap-1.5 text-xs font-bold text-slate-500 font-mono select-none">
                          <span>🇸🇦</span>
                          <span>+966</span>
                        </div>
                        <Input 
                          id="contact_phone" 
                          placeholder="50XXXXXXX" 
                          value={formData.contact_phone} 
                          onChange={(e) => handleChange('contact_phone', e.target.value)} 
                          className="h-10 text-xs pl-20 font-mono border-slate-200 dark:border-slate-700" 
                        />
                      </div>
                    </div>

                    {/* Business Email */}
                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        Billing Email Address <span className="text-rose-500">*</span>
                      </Label>
                      <Input 
                        id="email" 
                        type="email" 
                        placeholder="billing@company.com" 
                        value={formData.email} 
                        onChange={(e) => handleChange('email', e.target.value)} 
                        className="h-10 text-xs border-slate-200 dark:border-slate-700" 
                      />
                    </div>

                    {/* Contact Person Name */}
                    <div className="space-y-1.5">
                      <Label htmlFor="contact_person" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        Primary Contact Representative
                      </Label>
                      <Input 
                        id="contact_person" 
                        placeholder="e.g. Eng. Tariq Al-Mansoor" 
                        value={formData.contact_person} 
                        onChange={(e) => handleChange('contact_person', e.target.value)} 
                        className="h-10 text-xs border-slate-200 dark:border-slate-700" 
                      />
                    </div>

                    {/* Representative Job Title */}
                    <div className="space-y-1.5">
                      <Label htmlFor="contact_title" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                        Job Title / Designation
                      </Label>
                      <Input 
                        id="contact_title" 
                        placeholder="e.g. VP of Supply Chain & Logistics" 
                        value={formData.contact_title} 
                        onChange={(e) => handleChange('contact_title', e.target.value)} 
                        className="h-10 text-xs border-slate-200 dark:border-slate-700" 
                      />
                    </div>

                    {/* Operations Hotline */}
                    <div className="space-y-1.5">
                      <Label htmlFor="ops_phone" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        24/7 Operations / Dispatch Phone
                      </Label>
                      <Input 
                        id="ops_phone" 
                        placeholder="+966 11 XXX XXXX" 
                        value={formData.ops_phone} 
                        onChange={(e) => handleChange('ops_phone', e.target.value)} 
                        className="h-10 text-xs font-mono border-slate-200 dark:border-slate-700" 
                      />
                    </div>

                    {/* Invoicing Address */}
                    <div className="space-y-1.5 md:col-span-2">
                      <Label htmlFor="billing_address" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        Official Billing Address & Invoicing Notes
                      </Label>
                      <Textarea 
                        id="billing_address" 
                        placeholder="District 4, Building 829, King Fahd Road, Riyadh, Saudi Arabia" 
                        value={formData.billing_address} 
                        onChange={(e) => handleChange('billing_address', e.target.value)} 
                        className="min-h-[80px] text-xs border-slate-200 dark:border-slate-700" 
                      />
                    </div>
                  </div>

                  {/* Navigation Buttons */}
                  <div className="flex justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                    <Btn 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={goToPrevTab} 
                      className="text-xs font-bold gap-1 h-9" 
                      label="Back: Identity" 
                      icon={<ChevronLeft className="w-4 h-4" />} 
                      shortcut={{ key: 'ArrowLeft', alt: true }} 
                    />
                    <Btn 
                      type="button" 
                      size="sm" 
                      onClick={goToNextTab} 
                      className="text-xs font-bold gap-1.5 bg-[#E8450F] hover:bg-[#d03d0c] text-white px-5 h-9" 
                      label="Next: Financial SLA" 
                      icon={<ChevronRight className="w-4 h-4" />} 
                      shortcut={{ key: 'ArrowRight', alt: true }} 
                    />
                  </div>
                </TabsContent>

                {/* TAB 3: Financial SLA & Invoicing */}
                <TabsContent value="financial" className="space-y-5 m-0 focus-visible:outline-none">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Credit Limit */}
                    <div className="space-y-1.5">
                      <Label htmlFor="credit_limit" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                        Approved Credit Limit (SAR)
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">SAR</span>
                        <Input 
                          id="credit_limit" 
                          type="number" 
                          placeholder="100,000" 
                          value={formData.credit_limit} 
                          onChange={(e) => handleChange('credit_limit', e.target.value)} 
                          className="h-10 text-xs pl-12 font-mono font-bold border-slate-200 dark:border-slate-700" 
                        />
                      </div>
                    </div>

                    {/* Payment Terms */}
                    <div className="space-y-1.5">
                      <Label htmlFor="payment_terms" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                        Payment Terms
                      </Label>
                      <Select value={formData.payment_terms} onValueChange={(v) => handleChange('payment_terms', v)}>
                        <SelectTrigger className="h-10 text-xs font-medium border-slate-200 dark:border-slate-700">
                          <SelectValue placeholder="Select payment terms" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Net 15 Days" className="text-xs font-mono">Net 15 Days</SelectItem>
                          <SelectItem value="Net 30 Days" className="text-xs font-mono">Net 30 Days (Standard)</SelectItem>
                          <SelectItem value="Net 45 Days" className="text-xs font-mono">Net 45 Days (Enterprise)</SelectItem>
                          <SelectItem value="Net 60 Days" className="text-xs font-mono">Net 60 Days</SelectItem>
                          <SelectItem value="Cash on Delivery (COD)" className="text-xs font-mono">Cash on Delivery (COD)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Billing Cycle */}
                    <div className="space-y-1.5">
                      <Label htmlFor="billing_cycle" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        Billing Cycle Frequency
                      </Label>
                      <Select value={formData.billing_cycle} onValueChange={(v) => handleChange('billing_cycle', v)}>
                        <SelectTrigger className="h-10 text-xs font-medium border-slate-200 dark:border-slate-700">
                          <SelectValue placeholder="Select billing cycle" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Weekly Invoicing" className="text-xs">Weekly Invoicing</SelectItem>
                          <SelectItem value="Bi-Weekly Invoicing" className="text-xs">Bi-Weekly Invoicing</SelectItem>
                          <SelectItem value="Monthly Invoicing" className="text-xs">Monthly Invoicing</SelectItem>
                          <SelectItem value="Quarterly Invoicing" className="text-xs">Quarterly Invoicing</SelectItem>
                          <SelectItem value="Per Shipment" className="text-xs">Per Shipment</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Billing Currency */}
                    <div className="space-y-1.5">
                      <Label htmlFor="currency" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-slate-400" />
                        Invoicing Currency
                      </Label>
                      <Select value={formData.currency} onValueChange={(v) => handleChange('currency', v)}>
                        <SelectTrigger className="h-10 text-xs font-medium border-slate-200 dark:border-slate-700">
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SAR" className="text-xs font-mono">SAR - Saudi Riyal</SelectItem>
                          <SelectItem value="USD" className="text-xs font-mono">USD - US Dollar</SelectItem>
                          <SelectItem value="AED" className="text-xs font-mono">AED - UAE Dirham</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Tax Status & Active Switch */}
                    <div className="space-y-3 md:col-span-2 pt-2">
                      <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Tax Exemption Status</span>
                            <p className="text-[11px] text-slate-500">Enable if entity possesses official government VAT exemption certificate.</p>
                          </div>
                          <Checkbox 
                            id="tax_exempt" 
                            checked={formData.tax_exempt} 
                            onCheckedChange={(checked) => handleChange('tax_exempt', !!checked)} 
                          />
                        </div>

                        <div className="border-t border-slate-200 dark:border-slate-700/60 pt-3 flex items-center justify-between">
                          <div className="space-y-0.5">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Account Operational Status</span>
                            <p className="text-[11px] text-slate-500">Active accounts can immediately request trip dispatches.</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              type="button" 
                              onClick={() => handleChange('isActive', true)} 
                              className={`text-xs px-3 py-1 rounded-lg border font-bold transition-all ${
                                formData.isActive 
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs' 
                                  : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              Active
                            </button>
                            <button 
                              type="button" 
                              onClick={() => handleChange('isActive', false)} 
                              className={`text-xs px-3 py-1 rounded-lg border font-bold transition-all ${
                                !formData.isActive 
                                  ? 'bg-rose-600 text-white border-rose-600 shadow-2xs' 
                                  : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              Inactive / Hold
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Navigation Buttons */}
                  <div className="flex justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                    <Btn 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={goToPrevTab} 
                      className="text-xs font-bold gap-1 h-9" 
                      label="Back: Contacts" 
                      icon={<ChevronLeft className="w-4 h-4" />} 
                      shortcut={{ key: 'ArrowLeft', alt: true }} 
                    />
                    <Btn 
                      type="button" 
                      size="sm" 
                      onClick={goToNextTab} 
                      className="text-xs font-bold gap-1.5 bg-[#E8450F] hover:bg-[#d03d0c] text-white px-5 h-9" 
                      label="Next: Routes & Logistics SLA" 
                      icon={<ChevronRight className="w-4 h-4" />} 
                      shortcut={{ key: 'ArrowRight', alt: true }} 
                    />
                  </div>
                </TabsContent>

                {/* TAB 4: Logistics SLA & Default Routes */}
                <TabsContent value="logistics" className="space-y-5 m-0 focus-visible:outline-none">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Default Pickup Hub */}
                    <div className="space-y-1.5">
                      <Label htmlFor="pickup_city" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-orange-500" />
                        Default Pickup Origin Hub
                      </Label>
                      <Input 
                        id="pickup_city" 
                        placeholder="e.g. Riyadh Logistics Hub - Gate 4" 
                        value={formData.pickup_city} 
                        onChange={(e) => handleChange('pickup_city', e.target.value)} 
                        className="h-10 text-xs border-slate-200 dark:border-slate-700" 
                      />
                    </div>

                    {/* Default Pickup Coordinates */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="pickup_lat" className="text-[11px] font-semibold text-slate-500">Pickup Lat</Label>
                        <Input 
                          id="pickup_lat" 
                          type="number"
                          step="any"
                          placeholder="24.7136" 
                          value={formData.pickup_lat} 
                          onChange={(e) => handleChange('pickup_lat', e.target.value)} 
                          className="h-10 text-xs font-mono border-slate-200 dark:border-slate-700" 
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="pickup_lng" className="text-[11px] font-semibold text-slate-500">Pickup Lng</Label>
                        <Input 
                          id="pickup_lng" 
                          type="number"
                          step="any"
                          placeholder="46.6753" 
                          value={formData.pickup_lng} 
                          onChange={(e) => handleChange('pickup_lng', e.target.value)} 
                          className="h-10 text-xs font-mono border-slate-200 dark:border-slate-700" 
                        />
                      </div>
                    </div>

                    {/* Default Dropoff Hub */}
                    <div className="space-y-1.5">
                      <Label htmlFor="dropoff_city" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                        Default Dropoff Destination Hub
                      </Label>
                      <Input 
                        id="dropoff_city" 
                        placeholder="e.g. Dammam Port Commercial Gate" 
                        value={formData.dropoff_city} 
                        onChange={(e) => handleChange('dropoff_city', e.target.value)} 
                        className="h-10 text-xs border-slate-200 dark:border-slate-700" 
                      />
                    </div>

                    {/* Default Dropoff Coordinates */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="dropoff_lat" className="text-[11px] font-semibold text-slate-500">Dropoff Lat</Label>
                        <Input 
                          id="dropoff_lat" 
                          type="number"
                          step="any"
                          placeholder="26.4207" 
                          value={formData.dropoff_lat} 
                          onChange={(e) => handleChange('dropoff_lat', e.target.value)} 
                          className="h-10 text-xs font-mono border-slate-200 dark:border-slate-700" 
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="dropoff_lng" className="text-[11px] font-semibold text-slate-500">Dropoff Lng</Label>
                        <Input 
                          id="dropoff_lng" 
                          type="number"
                          step="any"
                          placeholder="50.0888" 
                          value={formData.dropoff_lng} 
                          onChange={(e) => handleChange('dropoff_lng', e.target.value)} 
                          className="h-10 text-xs font-mono border-slate-200 dark:border-slate-700" 
                        />
                      </div>
                    </div>

                    {/* Preferred Service Level */}
                    <div className="space-y-1.5">
                      <Label htmlFor="service_level" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-slate-400" />
                        Transport Service Commitment Tier
                      </Label>
                      <Select value={formData.service_level} onValueChange={(v) => handleChange('service_level', v)}>
                        <SelectTrigger className="h-10 text-xs font-medium border-slate-200 dark:border-slate-700">
                          <SelectValue placeholder="Select transport service level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Priority Dedicated Fleet" className="text-xs">Priority Dedicated Fleet (Guaranteed SLA)</SelectItem>
                          <SelectItem value="Regular Scheduled Freight" className="text-xs">Regular Scheduled Freight</SelectItem>
                          <SelectItem value="On-Demand Spot Freight" className="text-xs">On-Demand Spot Freight</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Special Handling Requirements */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Special Cargo Handling Requirements
                      </Label>
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700/80 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <Checkbox 
                            checked={formData.is_refrigerated} 
                            onCheckedChange={(c) => handleChange('is_refrigerated', !!c)} 
                          />
                          <span className="text-xs font-medium">Refrigerated / Cold-Chain</span>
                        </label>

                        <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700/80 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <Checkbox 
                            checked={formData.is_hazmat} 
                            onCheckedChange={(c) => handleChange('is_hazmat', !!c)} 
                          />
                          <span className="text-xs font-medium">Hazardous (Hazmat)</span>
                        </label>
                      </div>
                    </div>

                  </div>

                  {/* Submit Action Bar */}
                  <div className="flex justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                    <Btn 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={goToPrevTab} 
                      className="text-xs font-bold gap-1 h-9" 
                      label="Back: Financial SLA" 
                      icon={<ChevronLeft className="w-4 h-4" />} 
                      shortcut={{ key: 'ArrowLeft', alt: true }} 
                    />
                    <Btn 
                      size="sm" 
                      onClick={() => handleSubmit()} 
                      disabled={createMutation.isPending || !isFormValid} 
                      className="text-xs bg-[#E8450F] hover:bg-[#d03d0c] text-white font-bold gap-1.5 px-6 h-9" 
                      label={createMutation.isPending ? 'Saving Account...' : '+ Complete Customer Onboarding'} 
                      icon={<Plus className="w-4 h-4" />} 
                      shortcut={{ key: 'Enter', metaOrControl: true }} 
                    />
                  </div>
                </TabsContent>

              </Tabs>
            </CardContent>
          </Card>

          {/* Validation / Error Banner */}
          {error && (
            <div className="p-4 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 rounded-xl text-xs font-semibold border border-rose-200 dark:border-rose-800/60 flex items-center gap-3 mt-4 animate-shake">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  );
}
