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
  CreditCard, 
  Calendar, 
  DollarSign, 
  Truck, 
  Loader2, 
  Check 
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { customerService } from '@/services/customerService';
import { tripService } from '@/services/tripService';
import { invoiceService, CreateInvoicePayload } from '@/services/invoiceService';
import { rateCardService } from '@/services/rateCardService';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function CreateInvoicePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'client' | 'billing'>('client');
  const [error, setError] = useState<string | null>(null);

  const [customerId, setCustomerId] = useState<string>('');
  const [selectedTripId, setSelectedTripId] = useState<string>('');
  const [paymentTermsDays, setPaymentTermsDays] = useState<number>(30);
  const [customSubtotal, setCustomSubtotal] = useState<string>('');
  const [subtotalAutoFilled, setSubtotalAutoFilled] = useState(false);

  // Fetch active customers for dropdown
  const { data: customersRes } = useQuery({
    queryKey: ['customers', 'Active'],
    queryFn: () => customerService.getAll({ is_active: true }),
  });

  const customers = Array.isArray(customersRes) 
    ? customersRes 
    : (customersRes as any)?.data || [];

  const selectedCustomer = customers.find((c: any) => c.id === customerId);

  // Fetch completed, un-invoiced trips for the selected customer
  const { data: tripsRes, isLoading: isLoadingTrips } = useQuery({
    queryKey: ['trips', 'Completed', customerId],
    queryFn: () => tripService.getAll({ customer_id: customerId, status: 'Completed' }),
    enabled: !!customerId,
  });

  const rawTrips = Array.isArray(tripsRes) 
    ? tripsRes 
    : (tripsRes as any)?.data || [];

  const trips = rawTrips.filter((t: any) => !t.invoices || t.invoices.length === 0);

  // Fetch the customer's active rate card to auto-fill the subtotal
  const { data: rateCardsRes } = useQuery({
    queryKey: ['rate-cards', customerId],
    queryFn: () => rateCardService.getAll(),
    enabled: !!customerId,
  });

  const customerRateCard = (rateCardsRes?.data ?? []).find(
    (rc) => rc.customerId === customerId && rc.is_active
  ) ?? null;

  const selectedTrip = trips.find((t: any) => t.id === selectedTripId);

  // When a trip is selected and a rate card exists, auto-fill the subtotal once
  // (only if the operator hasn't already edited the field from a previous trip).
  useEffect(() => {
    if (selectedTripId && customerRateCard && !subtotalAutoFilled) {
      setCustomSubtotal(String(customerRateCard.base_price));
      setSubtotalAutoFilled(true);
    }
    if (!selectedTripId) {
      setSubtotalAutoFilled(false);
    }
  }, [selectedTripId, customerRateCard, subtotalAutoFilled]);

  const subtotalAmount = parseFloat(customSubtotal || '3500') || 3500;
  const vatRate = 0.15; // 15% KSA VAT
  const vatAmount = subtotalAmount * vatRate;
  const grandTotal = subtotalAmount + vatAmount;

  // Calculate Due Date
  const dueDateObj = new Date();
  dueDateObj.setDate(dueDateObj.getDate() + paymentTermsDays);
  const dueDateFormatted = dueDateObj.toISOString().split('T')[0];

  const handleReset = () => {
    setActiveTab('client');
    setCustomerId('');
    setSelectedTripId('');
    setPaymentTermsDays(30);
    setCustomSubtotal('');
    setSubtotalAutoFilled(false);
    setError(null);
  };

  // Create Invoice Mutation
  const createInvoiceMutation = useMutation({
    mutationFn: (payload: CreateInvoicePayload) => invoiceService.create(payload),
    onSuccess: (newInvoice) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      // Open print template in new tab
      window.open(`/invoices/${newInvoice.id}/print`, '_blank');
      navigate('/invoices');
    },
    onError: (err: any) => {
      setError(err.response?.data?.error?.message || err.message || 'Failed to generate invoice');
    },
  });

  const isFormValid = customerId !== '' && selectedTripId !== '' && subtotalAmount > 0;

  const handleSubmit = useCallback(() => {
    setError(null);

    if (!customerId) {
      setActiveTab('client');
      setError('Please select a customer client account');
      return;
    }

    if (!selectedTripId || !selectedTrip) {
      setActiveTab('billing');
      setError('Please select a completed trip to bill');
      return;
    }

    if (isNaN(subtotalAmount) || subtotalAmount <= 0) {
      setActiveTab('billing');
      setError('Valid subtotal amount is required');
      return;
    }

    createInvoiceMutation.mutate({
      trip_id: selectedTrip.id,
      customer_id: customerId,
      subtotal: subtotalAmount,
      total_amount: grandTotal,
      due_date: dueDateObj.toISOString(),
    });
  }, [customerId, selectedTripId, selectedTrip, subtotalAmount, grandTotal, dueDateObj, createInvoiceMutation]);

  // Tab Navigation Functions
  const goToNextTab = useCallback(() => {
    setActiveTab('billing');
  }, []);

  const goToPrevTab = useCallback(() => {
    setActiveTab('client');
  }, []);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';

      // 1. Save Invoice: Ctrl + Enter or Cmd + Enter
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (isFormValid && !createInvoiceMutation.isPending) {
          handleSubmit();
        }
        return;
      }

      // 2. Direct Tab Jumping: Alt + 1, Alt + 2
      if (e.altKey && e.key === '1') {
        e.preventDefault();
        setActiveTab('client');
        return;
      }
      if (e.altKey && e.key === '2') {
        e.preventDefault();
        setActiveTab('billing');
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
  }, [goToNextTab, goToPrevTab, handleSubmit, isFormValid, createInvoiceMutation.isPending]);

  return (
    <DashboardLayout active="Invoices" title="Generate Invoice">
      <div className="px-6 pb-6 space-y-4 animate-fade-in max-w-[1400px] mx-auto">
        
        {/* Top Scope & Action Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
              <span>🏢 MERCON Financials</span>
              <span>•</span>
              <span className="text-slate-900 dark:text-slate-100 font-bold">Billing & Invoicing</span>
            </div>
            <Badge variant="outline" className="bg-[#E8450F]/10 text-[#E8450F] border-[#E8450F]/30 font-bold">
              VAT Invoice Generation
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/invoices')}
              className="h-9 gap-1.5 text-xs font-semibold border-slate-200 bg-white hover:bg-slate-50 shadow-2xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Invoices
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
              disabled={createInvoiceMutation.isPending || !isFormValid}
              className="h-9 gap-1.5 text-xs bg-[#E8450F] hover:bg-[#d03d0c] text-white font-bold shadow-xs rounded-md px-4"
            >
              <Save className="w-3.5 h-3.5" /> {createInvoiceMutation.isPending ? 'Generating...' : 'Generate & Download PDF'}
              <kbd className="ml-1.5 px-1.5 py-0.5 text-[10px] font-mono font-bold bg-white/20 text-white rounded border border-white/30">
                Ctrl + ↵
              </kbd>
            </Button>
          </div>
        </div>

        {/* THEMED KEYBOARD QUICK CONTROLS BAR */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-3 px-4 shadow-2xs border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#E8450F]/10 border border-[#E8450F]/20 flex items-center justify-center">
              <Keyboard className="w-3.5 h-3.5 text-[#E8450F]" />
            </div>
            <span className="font-bold text-slate-900 dark:text-slate-100">Keyboard Quick Controls:</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            
            {/* Tab Switching Keycaps */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Switch Tabs:</span>
              <kbd className="px-1.5 py-0.5 text-[11px] font-mono font-bold bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded border border-slate-300 dark:border-slate-600 shadow-2xs">
                Alt
              </kbd>
              <span className="text-slate-400 font-bold">+</span>
              <kbd className="px-1.5 py-0.5 text-[11px] font-mono font-bold bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded border border-slate-300 dark:border-slate-600 shadow-2xs">
                ← / →
              </kbd>
            </div>

            {/* Jump to Tab Keycaps */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Jump Tab:</span>
              <kbd className="px-1.5 py-0.5 text-[11px] font-mono font-bold bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded border border-slate-300 dark:border-slate-600 shadow-2xs">
                Alt
              </kbd>
              <span className="text-slate-400 font-bold">+</span>
              <kbd className="px-1.5 py-0.5 text-[11px] font-mono font-bold bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded border border-slate-300 dark:border-slate-600 shadow-2xs">
                1 / 2
              </kbd>
            </div>

            {/* Save Invoice Keycaps */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Generate Invoice:</span>
              <kbd className="px-1.5 py-0.5 text-[11px] font-mono font-bold bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded border border-slate-300 dark:border-slate-600 shadow-2xs">
                Ctrl + Enter ↵
              </kbd>
            </div>

          </div>
        </div>

        {/* Header KPI Instrument Panel Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Customer Account</span>
              <Building2 className="w-4 h-4 text-blue-600" />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate max-w-[140px]">
                {selectedCustomer ? selectedCustomer.name : 'Unselected'}
              </span>
              <Badge variant="outline" className="text-[9px] px-1 py-0 bg-blue-50 text-blue-600 border-blue-200 font-bold">
                Client SLA
              </Badge>
            </div>
          </Card>

          <Card className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Un-invoiced Trips</span>
              <Truck className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-base font-extrabold text-slate-900 dark:text-slate-100">{trips.length}</span>
              <span className="text-[10px] text-slate-500 font-medium">Completed</span>
            </div>
          </Card>

          <Card className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Invoice Subtotal</span>
              <CreditCard className="w-4 h-4 text-[#E8450F]" />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xs font-bold font-mono text-slate-900 dark:text-slate-100">
                SAR {subtotalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-slate-500 font-medium">+15% VAT</span>
            </div>
          </Card>

          <Card className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Net Payment Terms</span>
              <Calendar className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xs font-bold font-mono text-slate-900 dark:text-slate-100">
                Net-{paymentTermsDays} Days
              </span>
              <Badge variant="outline" className="text-[9px] px-1 py-0 bg-emerald-50 text-emerald-700 border-emerald-200 font-bold">
                {dueDateFormatted}
              </Badge>
            </div>
          </Card>
        </div>

        {/* Main 2-Column Content Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* Left Column: 2 Tabs Workspace (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            <Card className="border border-slate-200 dark:border-slate-800 shadow-2xs rounded-xl bg-white dark:bg-slate-900">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <FileText className="w-4.5 h-4.5 text-[#E8450F]" /> Generate New Customer Invoice
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Select customer organization, link a completed dispatch trip, and verify billing breakdown.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-4">
                <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full">
                  
                  {/* Tabs Navigation Header */}
                  <TabsList className="grid grid-cols-2 w-full mb-4 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    
                    <TabsTrigger value="client" className="text-xs font-semibold flex items-center justify-between gap-1">
                      <span>1. Select Client Account</span>
                      <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded border border-slate-200 dark:border-slate-700 shadow-2xs">
                        Alt+1
                      </kbd>
                    </TabsTrigger>

                    <TabsTrigger value="billing" className="text-xs font-semibold flex items-center justify-between gap-1">
                      <span>2. Select Trip & Billing</span>
                      <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded border border-slate-200 dark:border-slate-700 shadow-2xs">
                        Alt+2
                      </kbd>
                    </TabsTrigger>

                  </TabsList>

                  {/* TAB 1: Select Client Account */}
                  <TabsContent value="client" className="space-y-4 m-0">
                    <div className="space-y-3">
                      
                      <div className="space-y-1.5">
                        <Label htmlFor="customer_id" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Customer / Client Account <span className="text-rose-500">*</span>
                        </Label>
                        <Select 
                          value={customerId} 
                          onValueChange={(val) => {
                            setCustomerId(val);
                            setSelectedTripId('');
                          }}
                        >
                          <SelectTrigger id="customer_id" className="h-9 text-xs border-slate-200 bg-white">
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

                      {selectedCustomer && (
                        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                          <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <Building2 className="w-4 h-4 text-blue-600" /> {selectedCustomer.name}
                            </span>
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold">
                              Verified Account
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                            <div>
                              <span className="text-slate-400 block font-medium">Billing Phone:</span>
                              <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">{selectedCustomer.contact_phone || '---'}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block font-medium">Tax Reg ID:</span>
                              <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">310199824200003</span>
                            </div>
                          </div>
                        </div>
                      )}

                    </div>

                    <div className="pt-2 flex justify-end">
                      <Button 
                        type="button" 
                        size="sm"
                        onClick={goToNextTab}
                        disabled={!customerId}
                        className="h-9 text-xs gap-1.5 bg-[#E8450F] hover:bg-[#d03d0c] text-white font-bold rounded-md px-4 shadow-xs"
                      >
                        Next: Select Trip & Billing <ChevronRight className="w-3.5 h-3.5" />
                        <kbd className="ml-1 px-1.5 py-0.5 text-[10px] font-mono font-bold bg-white/20 text-white rounded border border-white/30">
                          Alt + →
                        </kbd>
                      </Button>
                    </div>
                  </TabsContent>

                  {/* TAB 2: Select Trip & Billing */}
                  <TabsContent value="billing" className="space-y-4 m-0">
                    
                    {/* Un-invoiced Trip Selection Grid */}
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                        <span>Select Completed Dispatch Trip <span className="text-rose-500">*</span></span>
                        <span className="text-[11px] text-slate-500 font-normal">{trips.length} available</span>
                      </Label>

                      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                        {isLoadingTrips ? (
                          <div className="p-8 flex justify-center items-center gap-2 text-xs font-semibold text-slate-500">
                            <Loader2 className="w-4 h-4 animate-spin text-[#E8450F]" /> Fetching completed trips...
                          </div>
                        ) : trips.length === 0 ? (
                          <div className="p-8 text-center text-slate-500 text-xs font-medium">
                            No completed, un-invoiced trips found for this customer.
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-56 overflow-y-auto">
                            {trips.map((trip: any) => (
                              <label 
                                key={trip.id} 
                                className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${
                                  selectedTripId === trip.id 
                                    ? 'bg-amber-50/60 dark:bg-amber-950/20' 
                                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <input
                                    type="radio"
                                    name="selectedTrip"
                                    checked={selectedTripId === trip.id}
                                    onChange={() => setSelectedTripId(trip.id)}
                                    className="w-4 h-4 text-[#E8450F] accent-[#E8450F]"
                                  />
                                  <div>
                                    <div className="text-xs font-extrabold text-slate-900 dark:text-slate-100 font-mono">
                                      {trip.ref_id || 'TRIP-XXXX'}
                                    </div>
                                    <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                      <span>Completed:</span>
                                      <span className="font-semibold">{trip.actual_end ? new Date(trip.actual_end).toLocaleDateString() : 'Recent'}</span>
                                    </div>
                                  </div>
                                </div>

                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-[10px]">
                                  Completed
                                </Badge>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Subtotal & Payment Terms */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      
                      <div className="space-y-1.5">
                        <Label htmlFor="customSubtotal" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                          <span>Base Subtotal Amount (SAR) <span className="text-rose-500">*</span></span>
                          {subtotalAutoFilled && customerRateCard && (
                            <span className="text-[10px] font-normal text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <Check className="w-3 h-3" /> Auto-filled from rate card — editable
                            </span>
                          )}
                        </Label>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-xs font-bold text-slate-400 font-mono">SAR</span>
                          <Input
                            id="customSubtotal"
                            type="number"
                            step="0.01"
                            placeholder={customerRateCard ? String(customerRateCard.base_price) : '3500.00'}
                            value={customSubtotal}
                            onChange={(e) => {
                              setCustomSubtotal(e.target.value);
                              // Mark as manually edited so future trip switches don't re-overwrite
                              if (subtotalAutoFilled) setSubtotalAutoFilled(true);
                            }}
                            className={`h-9 text-xs pl-12 font-mono font-bold border-slate-200 ${subtotalAutoFilled ? 'border-emerald-300 dark:border-emerald-700' : ''}`}
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="paymentTermsDays" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Payment Terms SLA
                        </Label>
                        <Select 
                          value={paymentTermsDays.toString()} 
                          onValueChange={(val) => setPaymentTermsDays(parseInt(val))}
                        >
                          <SelectTrigger id="paymentTermsDays" className="h-9 text-xs border-slate-200 bg-white">
                            <SelectValue placeholder="Select SLA Terms" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="15">Net-15 Days</SelectItem>
                            <SelectItem value="30">Net-30 Days (Standard)</SelectItem>
                            <SelectItem value="60">Net-60 Days</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                    </div>

                    <div className="pt-2 flex justify-between">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={goToPrevTab}
                        className="h-9 text-xs gap-1 border-slate-200 bg-white"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" /> Back
                        <kbd className="ml-1 px-1.5 py-0.5 text-[10px] font-mono font-bold bg-slate-100 text-slate-700 rounded border border-slate-200">
                          Alt + ←
                        </kbd>
                      </Button>

                      <Button 
                        type="button" 
                        size="sm"
                        onClick={() => handleSubmit()}
                        disabled={createInvoiceMutation.isPending || !isFormValid}
                        className="h-9 text-xs bg-[#E8450F] hover:bg-[#d03d0c] text-white font-bold gap-1.5 shadow-xs rounded-md px-4"
                      >
                        <Save className="w-3.5 h-3.5" /> Generate Invoice
                        <kbd className="ml-1.5 px-1.5 py-0.5 text-[10px] font-mono font-bold bg-white/20 text-white rounded border border-white/30">
                          Ctrl + ↵
                        </kbd>
                      </Button>
                    </div>

                  </TabsContent>

                </Tabs>
              </CardContent>
            </Card>

            {error && (
              <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-xs font-semibold border border-rose-200 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
                {error}
              </div>
            )}
          </div>

          {/* Right Column: Live Tax Invoice Document Card (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="border border-slate-200 dark:border-slate-800 shadow-2xs rounded-xl overflow-hidden sticky top-4 bg-white dark:bg-slate-900">
              <CardHeader className="pb-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="bg-white text-[10px] uppercase font-bold tracking-wider text-slate-700 border-slate-200">
                    Tax Invoice Document Preview
                  </Badge>
                  <span className="text-[10px] text-slate-400 font-mono">INV-DRAFT</span>
                </div>
                <CardTitle className="text-base font-extrabold text-slate-900 dark:text-slate-100 mt-2">
                  Tax Invoice • KSA Commercial
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  {selectedCustomer ? selectedCustomer.name : 'Select Client Organization'}
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-4 space-y-4">
                
                {/* Financial Summary Card */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                    <span>Subtotal:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                      SAR {subtotalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                    <span>Saudi VAT Tax (15%):</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                      SAR {vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between items-center">
                    <span className="font-extrabold text-slate-900 dark:text-slate-100">Net Total Billed:</span>
                    <span className="font-mono font-black text-base text-[#E8450F]">
                      SAR {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Dispatch Trip Info */}
                <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-800/60 text-xs space-y-1">
                  <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider block">Billed Trip Ref</span>
                  <div className="font-mono font-extrabold text-slate-900 dark:text-slate-100">
                    {selectedTrip ? selectedTrip.ref_id : 'Select Trip'}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Payment Due Date: <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">{dueDateFormatted}</span>
                  </div>
                </div>

                {/* Invoice Readiness Checklist */}
                <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Document Readiness</span>
                  
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                        {customerId ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <Circle className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
                        Customer Client Selected
                      </span>
                      <span className="font-semibold text-[11px] truncate max-w-[120px]">{selectedCustomer ? selectedCustomer.name : 'Missing'}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                        {selectedTripId ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <Circle className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
                        Completed Trip Linked
                      </span>
                      <span className="font-semibold font-mono text-[11px]">{selectedTrip ? selectedTrip.ref_id : 'Missing'}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                        {subtotalAmount > 0 ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <Circle className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
                        15% VAT Tax Calculated
                      </span>
                      <span className="font-semibold font-mono text-[11px]">Ready</span>
                    </div>
                  </div>
                </div>

              </CardContent>

              <CardFooter className="bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 p-3 flex justify-between items-center">
                <div className="text-[11px] text-slate-500">
                  Status: <span className="font-bold text-indigo-600 dark:text-indigo-400">Ready to Generate</span>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleSubmit()}
                  disabled={createInvoiceMutation.isPending || !isFormValid}
                  className="h-9 text-xs bg-[#E8450F] hover:bg-[#d03d0c] text-white font-bold px-4 gap-1.5 shadow-xs rounded-md"
                >
                  {createInvoiceMutation.isPending ? 'Generating...' : 'Generate Invoice'}
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
