import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
  Save, 
  ArrowLeft, 
  RotateCcw, 
  Plus, 
  CheckCircle2, 
  Circle, 
  Keyboard, 
  ChevronRight, 
  ChevronLeft, 
  FileText, 
  Building2, 
  MapPin, 
  CreditCard, 
  ArrowRight, 
  Sparkles, 
  ShieldCheck 
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { rateCardService, CreateRateCardPayload } from '@/services/rateCardService';
import { customerService } from '@/services/customerService';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function CreateRateCardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'general' | 'pricing'>('general');
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    customerId: '',
    route_origin: '',
    route_destination: '',
    base_price: '',
    currency: 'SAR',
  });

  // Fetch active customers for selection
  const { data: customersResponse } = useQuery({
    queryKey: ['customers', 'Active'],
    queryFn: () => customerService.getAll({ is_active: true })
  });

  const customers = Array.isArray(customersResponse) 
    ? customersResponse 
    : (customersResponse as any)?.data || [];

  const selectedCustomer = customers.find((c: any) => c.id === formData.customerId);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleReset = () => {
    setActiveTab('general');
    setFormData({
      name: '',
      customerId: '',
      route_origin: '',
      route_destination: '',
      base_price: '',
      currency: 'SAR',
    });
    setError(null);
  };

  // Create Rate Card Mutation
  const createMutation = useMutation({
    mutationFn: (payload: CreateRateCardPayload) => rateCardService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rate-cards'] });
      navigate('/rate-cards');
    },
    onError: (err: any) => {
      setError(err.response?.data?.error?.message || err.message || 'Failed to create rate card');
    },
  });

  const numericPrice = parseFloat(formData.base_price || '0');
  const isFormValid = 
    formData.name.trim() !== '' && 
    formData.customerId !== '' && 
    formData.route_origin.trim() !== '' && 
    formData.route_destination.trim() !== '' && 
    !isNaN(numericPrice) && numericPrice > 0;

  const handleSubmit = useCallback(() => {
    setError(null);

    if (!formData.name.trim()) {
      setActiveTab('general');
      setError('Agreement name is required');
      return;
    }
    if (!formData.customerId) {
      setActiveTab('general');
      setError('Please select a customer organization');
      return;
    }
    if (!formData.route_origin.trim()) {
      setActiveTab('pricing');
      setError('Route origin city is required');
      return;
    }
    if (!formData.route_destination.trim()) {
      setActiveTab('pricing');
      setError('Route destination city is required');
      return;
    }
    if (isNaN(numericPrice) || numericPrice <= 0) {
      setActiveTab('pricing');
      setError('Please enter a valid base price greater than 0');
      return;
    }

    createMutation.mutate({
      name: formData.name.trim(),
      customerId: formData.customerId,
      route_origin: formData.route_origin.trim(),
      route_destination: formData.route_destination.trim(),
      base_price: numericPrice,
      currency: formData.currency,
    });
  }, [formData, numericPrice, createMutation]);

  // Tab Navigation Functions
  const goToNextTab = useCallback(() => {
    setActiveTab('pricing');
  }, []);

  const goToPrevTab = useCallback(() => {
    setActiveTab('general');
  }, []);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';

      // 1. Save Rate Card: Ctrl + Enter or Cmd + Enter
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
        setActiveTab('general');
        return;
      }
      if (e.altKey && e.key === '2') {
        e.preventDefault();
        setActiveTab('pricing');
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

  return (
    <DashboardLayout active="RateCards" title="Create Rate Card">
      <div className="px-6 pb-6 space-y-4 animate-fade-in max-w-[1400px] mx-auto">
        
        {/* Top Scope & Action Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted text-xs font-semibold text-muted-foreground border border-border/80">
              <span>🏢 MERCON Commercial</span>
              <span>•</span>
              <span className="text-foreground">Tariff Agreements</span>
            </div>
            <Badge className="bg-indigo-500/10 text-indigo-600 border-indigo-200 font-semibold dark:bg-indigo-950/40 dark:text-indigo-300">
              Rate Card Creation
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/rate-cards')}
              className="h-8 gap-1.5 text-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Rate Cards
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
              <Plus className="w-3.5 h-3.5" /> {createMutation.isPending ? 'Saving...' : 'Save Rate Card'}
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

            {/* Save Rate Card Keycaps */}
            <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700/80">
              <span className="text-[11px] text-slate-400">Save Rate Card:</span>
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
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Contract Title</span>
              <FileText className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-base font-bold text-foreground truncate max-w-[140px]">
                {formData.name || 'Contract Agreement'}
              </span>
              <Badge variant="outline" className="text-[9px] px-1 py-0 bg-indigo-50 text-indigo-600 border-indigo-200">
                Draft
              </Badge>
            </div>
          </Card>

          <Card className="p-3 bg-card border-border/70 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Client Organization</span>
              <Building2 className="w-4 h-4 text-blue-500" />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xs font-bold text-foreground truncate max-w-[130px]">
                {selectedCustomer ? selectedCustomer.name : 'Unselected'}
              </span>
              <span className="text-[10px] text-muted-foreground">Account</span>
            </div>
          </Card>

          <Card className="p-3 bg-card border-border/70 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Freight Corridor</span>
              <MapPin className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xs font-bold text-foreground truncate max-w-[130px]">
                {formData.route_origin && formData.route_destination ? `${formData.route_origin} → ${formData.route_destination}` : 'Route Not Set'}
              </span>
              <span className="text-[10px] text-muted-foreground">KSA</span>
            </div>
          </Card>

          <Card className="p-3 bg-card border-border/70 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Base Tariff Rate</span>
              <CreditCard className="w-4 h-4 text-purple-500" />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xs font-bold font-mono text-foreground">
                {formData.currency} {numericPrice > 0 ? numericPrice.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
              </span>
              <Badge variant="outline" className={`text-[9px] px-1 py-0 ${isFormValid ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-muted text-muted-foreground'}`}>
                {isFormValid ? 'Ready' : 'Pending'}
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
                      <FileText className="w-4 h-4 text-indigo-600" /> Rate Card Agreement Setup
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Define commercial tariff name, customer client account, route origin/destination, and base rate.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-4">
                <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full">
                  
                  {/* Tabs Navigation Header with High Visibility Shortcut Badges */}
                  <TabsList className="grid grid-cols-2 w-full mb-4 bg-muted/70 p-1">
                    
                    <TabsTrigger value="general" className="text-xs font-semibold flex items-center justify-between gap-1">
                      <span>1. General Contract Info</span>
                      <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-extrabold bg-indigo-600 text-white rounded border border-indigo-700 shadow-2xs">
                        Alt+1
                      </kbd>
                    </TabsTrigger>

                    <TabsTrigger value="pricing" className="text-xs font-semibold flex items-center justify-between gap-1">
                      <span>2. Route & Tariff Pricing</span>
                      <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-extrabold bg-indigo-600 text-white rounded border border-indigo-700 shadow-2xs">
                        Alt+2
                      </kbd>
                    </TabsTrigger>

                  </TabsList>

                  {/* TAB 1: General Contract Info */}
                  <TabsContent value="general" className="space-y-4 m-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor="name" className="text-xs font-semibold flex items-center justify-between">
                          <span>Rate Card Agreement Name <span className="text-destructive">*</span></span>
                          <span className="text-[10px] text-indigo-600 font-semibold">Presets available</span>
                        </Label>
                        <Input
                          id="name"
                          placeholder="e.g. SABIC Dammam Dedicated Route 2024"
                          value={formData.name}
                          onChange={(e) => handleChange('name', e.target.value)}
                          className="h-9 text-xs font-medium"
                        />
                        {/* Name Presets */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {['SABIC Dammam Route', 'Saudi Aramco Jubail Express', 'Olayan Riyadh Logistics', 'Standard Commercial Tariff'].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => handleChange('name', preset)}
                              className={`text-[11px] px-2 py-0.5 rounded border transition-colors ${
                                formData.name === preset 
                                  ? 'bg-indigo-600 text-white border-indigo-600 font-semibold' 
                                  : 'bg-muted/50 hover:bg-muted text-muted-foreground border-border'
                              }`}
                            >
                              {preset}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor="customerId" className="text-xs font-semibold">
                          Select Customer / Client Account <span className="text-destructive">*</span>
                        </Label>
                        <Select 
                          value={formData.customerId} 
                          onValueChange={(val) => handleChange('customerId', val)}
                        >
                          <SelectTrigger id="customerId" className="h-9 text-xs">
                            <SelectValue placeholder="Choose customer organization..." />
                          </SelectTrigger>
                          <SelectContent>
                            {customers.map((c: any) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name} ({c.contact_phone || 'No Phone'})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor="currency" className="text-xs font-semibold">
                          Contract Currency <span className="text-destructive">*</span>
                        </Label>
                        <Select 
                          value={formData.currency} 
                          onValueChange={(val) => handleChange('currency', val)}
                        >
                          <SelectTrigger id="currency" className="h-9 text-xs">
                            <SelectValue placeholder="Select currency..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SAR">SAR — Saudi Riyal (Default)</SelectItem>
                            <SelectItem value="USD">USD — US Dollar</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                    </div>

                    <div className="p-3 bg-muted/40 rounded-lg border border-border/50 text-xs space-y-1">
                      <div className="font-semibold text-foreground flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-indigo-500" /> Client SLA Binding
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Rate cards bound to a specific customer account will automatically calculate trip billing invoices for dispatches matching this route corridor.
                      </p>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <Button 
                        type="button" 
                        size="sm"
                        onClick={goToNextTab}
                        className="h-9 text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                      >
                        Next: Route & Pricing <ChevronRight className="w-3.5 h-3.5" />
                        <kbd className="ml-1 px-1.5 py-0.5 text-[10px] font-mono font-bold bg-indigo-900 text-white rounded border border-indigo-400/40">
                          Alt + →
                        </kbd>
                      </Button>
                    </div>
                  </TabsContent>

                  {/* TAB 2: Route & Tariff Pricing */}
                  <TabsContent value="pricing" className="space-y-4 m-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      
                      <div className="space-y-1.5">
                        <Label htmlFor="route_origin" className="text-xs font-semibold flex items-center justify-between">
                          <span>Route Origin City <span className="text-destructive">*</span></span>
                        </Label>
                        <Input
                          id="route_origin"
                          placeholder="e.g. Riyadh"
                          value={formData.route_origin}
                          onChange={(e) => handleChange('route_origin', e.target.value)}
                          className="h-9 text-xs font-medium"
                        />
                        {/* Origin Presets */}
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {['Riyadh', 'Jeddah', 'Dammam'].map((city) => (
                            <button
                              key={city}
                              type="button"
                              onClick={() => handleChange('route_origin', city)}
                              className={`text-[10px] px-1.5 py-0.5 rounded border ${
                                formData.route_origin === city 
                                  ? 'bg-indigo-600 text-white border-indigo-600 font-bold' 
                                  : 'bg-muted/50 hover:bg-muted text-muted-foreground border-border'
                              }`}
                            >
                              {city}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="route_destination" className="text-xs font-semibold flex items-center justify-between">
                          <span>Route Destination City <span className="text-destructive">*</span></span>
                        </Label>
                        <Input
                          id="route_destination"
                          placeholder="e.g. Dammam"
                          value={formData.route_destination}
                          onChange={(e) => handleChange('route_destination', e.target.value)}
                          className="h-9 text-xs font-medium"
                        />
                        {/* Destination Presets */}
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {['Jeddah', 'Dammam', 'Jubail', 'Yanbu'].map((city) => (
                            <button
                              key={city}
                              type="button"
                              onClick={() => handleChange('route_destination', city)}
                              className={`text-[10px] px-1.5 py-0.5 rounded border ${
                                formData.route_destination === city 
                                  ? 'bg-indigo-600 text-white border-indigo-600 font-bold' 
                                  : 'bg-muted/50 hover:bg-muted text-muted-foreground border-border'
                              }`}
                            >
                              {city}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor="base_price" className="text-xs font-semibold">
                          Base Tariff Price per Trip <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-xs font-bold text-muted-foreground font-mono">
                            {formData.currency}
                          </span>
                          <Input
                            id="base_price"
                            type="number"
                            step="0.01"
                            placeholder="1500.00"
                            value={formData.base_price}
                            onChange={(e) => handleChange('base_price', e.target.value)}
                            className="h-9 text-xs pl-12 font-mono font-bold"
                          />
                        </div>
                      </div>

                    </div>

                    <div className="p-3 bg-indigo-500/10 rounded-lg border border-indigo-200 dark:border-indigo-800 text-xs space-y-1">
                      <div className="font-semibold text-foreground flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4 text-indigo-600" /> Commercial Contract Price Summary
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        This fixed route rate will be billed at <span className="font-bold text-foreground font-mono">{formData.currency} {numericPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span> per completed dispatch.
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
                        <Plus className="w-3.5 h-3.5" /> Save Rate Card
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

          {/* Right Column: Live Interactive Rate Card Certificate Card (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="border-border/80 shadow-xs overflow-hidden sticky top-4">
              <CardHeader className="pb-3 bg-gradient-to-r from-muted/50 to-muted/20 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="bg-background text-[10px] uppercase font-bold tracking-wider">
                    Rate Card Agreement Preview
                  </Badge>
                  <span className="text-[10px] text-muted-foreground font-mono">RC-DRAFT</span>
                </div>
                <CardTitle className="text-base font-bold mt-2">
                  {formData.name || 'Untitled Tariff Agreement'}
                </CardTitle>
                <CardDescription className="text-xs">
                  {selectedCustomer ? selectedCustomer.name : 'Select Client Organization'}
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-4 space-y-4">
                
                {/* Visual Freight Corridor Banner */}
                <div className="bg-gradient-to-r from-indigo-50 via-muted to-emerald-50 dark:from-indigo-950/30 dark:via-muted/20 dark:to-emerald-950/30 border border-border/80 rounded-lg p-3 space-y-2">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Contracted Route Corridor
                  </div>
                  
                  <div className="flex items-center justify-between gap-2 text-xs font-mono">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span className="font-bold text-foreground truncate max-w-[90px]">
                        {formData.route_origin || 'Origin'}
                      </span>
                    </div>

                    <div className="flex-1 flex items-center justify-center text-muted-foreground">
                      <span className="border-t border-dashed border-border w-full" />
                      <ArrowRight className="w-4 h-4 mx-1 shrink-0 text-indigo-500" />
                      <span className="border-t border-dashed border-border w-full" />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-foreground truncate max-w-[90px]">
                        {formData.route_destination || 'Destination'}
                      </span>
                      <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    </div>
                  </div>
                </div>

                {/* Base Rate Price Banner */}
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-200 dark:border-emerald-800 text-xs space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Fixed Tariff Rate per Dispatch</span>
                  <div className="text-2xl font-extrabold text-foreground font-mono">
                    {formData.currency} {numericPrice > 0 ? numericPrice.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
                  </div>
                </div>

                {/* Agreement Readiness Checklist */}
                <div className="space-y-2 pt-1 border-t border-border/50">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Contract Validation</span>
                  
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        {formData.name ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Circle className="w-3.5 h-3.5 text-muted" />}
                        Agreement Name
                      </span>
                      <span className="font-semibold text-[11px] truncate max-w-[120px]">{formData.name || 'Missing'}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        {formData.customerId ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Circle className="w-3.5 h-3.5 text-muted" />}
                        Customer Client Account
                      </span>
                      <span className="font-semibold text-[11px] truncate max-w-[120px]">{selectedCustomer ? selectedCustomer.name : 'Missing'}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        {formData.route_origin && formData.route_destination ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Circle className="w-3.5 h-3.5 text-muted" />}
                        Route Origin & Destination
                      </span>
                      <span className="font-semibold text-[11px]">{formData.route_origin && formData.route_destination ? 'Specified' : 'Missing'}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        {numericPrice > 0 ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Circle className="w-3.5 h-3.5 text-muted" />}
                        Base Price Valid
                      </span>
                      <span className="font-semibold font-mono text-[11px]">{numericPrice > 0 ? 'Ready' : 'Missing'}</span>
                    </div>
                  </div>
                </div>

              </CardContent>

              <CardFooter className="bg-muted/30 border-t border-border/50 p-3 flex justify-between items-center">
                <div className="text-[11px] text-muted-foreground">
                  Status: <span className="font-semibold text-indigo-600 dark:text-indigo-400">Ready to Save</span>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleSubmit()}
                  disabled={createMutation.isPending || !isFormValid}
                  className="h-9 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 gap-1.5 shadow-md"
                >
                  {createMutation.isPending ? 'Saving...' : 'Save Rate Card'}
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
