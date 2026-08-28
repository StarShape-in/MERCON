import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Building2,
  MapPin,
  Plus,
  Trash2,
  Receipt,
  Calendar,
  Banknote,
  Loader2,
  Sparkles,
  ShieldCheck,
  Tag,
  History,
  AlertCircle,
  Hash,
  Check,
  CheckCircle2,
  ChevronRight,
  Info,
  DollarSign,
  Truck,
  ArrowRight,
  FileText,
  Clock
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import LocationCombobox from '@/components/quotations/LocationCombobox';
import { quotationService, CreateQuotationPayload } from '@/services/quotationService';
import { customerService } from '@/services/customerService';
import { locationService } from '@/services/locationService';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export default function AddQuotationPage({ isEdit = false }: { isEdit?: boolean }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const prefilledCustomerId = searchParams.get('customer_id') || '';
  const prefilledCustomerName = searchParams.get('customer_name') || '';

  // Form State
  const [customerId, setCustomerId] = useState(prefilledCustomerId);

  // Dynamic Route Stops
  const [pickupLocationId, setPickupLocationId] = useState('');
  const [dropoffLocationId, setDropoffLocationId] = useState('');
  const [viaStops, setViaStops] = useState<Array<{ id: string; locationId: string }>>([]);

  // Commercial Terms
  const [billingType, setBillingType] = useState<'MONTHLY' | 'EXTRA' | ''>('EXTRA');
  const [lineType, setLineType] = useState<string>('SINGLE_TRIP');
  const [pricingBasis, setPricingBasis] = useState<'PER_TRIP' | 'PER_MONTH' | 'NULL'>('NULL');

  // Vehicle & Financials
  const [vehicleClass, setVehicleClass] = useState<string>('10 TON');
  const [sourceVehicleLabel, setSourceVehicleLabel] = useState<string>('');
  const [rate, setRate] = useState<string>('');
  const [driverPayout, setDriverPayout] = useState<string>('');
  const [currency, setCurrency] = useState<string>('SAR');
  const [quotationName, setQuotationName] = useState<string>('');

  // Validity & Rate Change
  const [validFrom, setValidFrom] = useState<string>('');
  const [validTo, setValidTo] = useState<string>('');
  const [changeReason, setChangeReason] = useState<string>('');

  const [formError, setFormError] = useState<string | null>(null);

  // Fetch Customers lookup
  const { data: customersRes } = useQuery({
    queryKey: ['customers-select'],
    queryFn: () => customerService.getAll({ per_page: 200, mode: 'lookup' }),
  });
  const customers = customersRes?.data || [];
  const selectedCustomer = customers.find((c) => c.id === customerId);

  // Fetch Locations for route preview
  const { data: locationsRes } = useQuery({
    queryKey: ['locations-lookup-all'],
    queryFn: () => locationService.getAll(),
  });
  const locations = locationsRes?.data || [];
  const locationMap = useMemo(() => {
    const map = new Map<string, string>();
    locations.forEach((l) => map.set(l.id, l.name));
    return map;
  }, [locations]);

  // Fetch existing quotation if editing
  const { data: existingQuotation } = useQuery({
    queryKey: ['quotation', id],
    queryFn: () => quotationService.getById(id!),
    enabled: isEdit && !!id,
  });

  // Quotation Reference ID (Auto-generated or existing)
  const quotationRefId = useMemo(() => {
    if (isEdit && existingQuotation) {
      return existingQuotation.agreement_ref || `QT-${existingQuotation.id.substring(0, 8).toUpperCase()}`;
    }
    return `QT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  }, [isEdit, existingQuotation]);

  // Populate state from existing quotation
  useEffect(() => {
    if (!isEdit || !existingQuotation) return;
    setCustomerId(existingQuotation.customerId || '');
    setQuotationName(existingQuotation.name || '');
    setBillingType((existingQuotation.billing_type as any) || 'EXTRA');
    setLineType(existingQuotation.line_type || existingQuotation.rate_category || 'SINGLE_TRIP');
    
    if (existingQuotation.pricing_basis === 'PER_TRIP') setPricingBasis('PER_TRIP');
    else if (existingQuotation.pricing_basis === 'PER_MONTH') setPricingBasis('PER_MONTH');
    else setPricingBasis('NULL');

    setVehicleClass(existingQuotation.vehicle_class || '10 TON');
    setSourceVehicleLabel(existingQuotation.source_vehicle_label || existingQuotation.vehicle_type || '');
    setRate(String(existingQuotation.rate ?? existingQuotation.base_price ?? ''));
    setDriverPayout(existingQuotation.driver_payout != null ? String(existingQuotation.driver_payout) : '');
    setCurrency(existingQuotation.currency || 'SAR');

    setValidFrom(existingQuotation.valid_from ? existingQuotation.valid_from.substring(0, 10) : '');
    setValidTo(existingQuotation.valid_to ? existingQuotation.valid_to.substring(0, 10) : '');

    // Set route stops from existing stops
    const stops = existingQuotation.stops || [];
    if (stops.length > 0) {
      const pickup = stops.find((s) => s.stop_type === 'Pickup') || stops[0];
      const dropoff = [...stops].reverse().find((s) => s.stop_type === 'Dropoff') || stops[stops.length - 1];
      const vias = stops.filter((s) => s.id !== pickup?.id && s.id !== dropoff?.id);

      if (pickup?.locationId) setPickupLocationId(pickup.locationId);
      else if (existingQuotation.originLocationId) setPickupLocationId(existingQuotation.originLocationId);

      if (dropoff?.locationId) setDropoffLocationId(dropoff.locationId);
      else if (existingQuotation.destinationLocationId) setDropoffLocationId(existingQuotation.destinationLocationId);

      setViaStops(vias.map((v, idx) => ({ id: v.id || `via-${idx}`, locationId: v.locationId || '' })));
    } else {
      if (existingQuotation.originLocationId) setPickupLocationId(existingQuotation.originLocationId);
      if (existingQuotation.destinationLocationId) setDropoffLocationId(existingQuotation.destinationLocationId);
    }
  }, [isEdit, existingQuotation]);

  // Dynamic Via Stops handlers
  const handleAddViaStop = () => {
    setViaStops((prev) => [...prev, { id: `via-${Date.now()}-${Math.random()}`, locationId: '' }]);
  };

  const handleUpdateViaStop = (index: number, locationId: string) => {
    setViaStops((prev) => {
      const updated = [...prev];
      updated[index].locationId = locationId;
      return updated;
    });
  };

  const handleRemoveViaStop = (index: number) => {
    setViaStops((prev) => prev.filter((_, i) => i !== index));
  };

  // Full ordered route stops for live preview
  const fullRouteStops = useMemo(() => {
    const list: Array<{ stopType: 'Pickup' | 'Via' | 'Dropoff'; locationId: string; name: string }> = [];
    
    if (pickupLocationId) {
      list.push({
        stopType: 'Pickup',
        locationId: pickupLocationId,
        name: locationMap.get(pickupLocationId) || 'Origin Location',
      });
    }

    viaStops.forEach((v, idx) => {
      if (v.locationId) {
        list.push({
          stopType: 'Via',
          locationId: v.locationId,
          name: locationMap.get(v.locationId) || `Via Stop #${idx + 1}`,
        });
      }
    });

    if (dropoffLocationId) {
      list.push({
        stopType: 'Dropoff',
        locationId: dropoffLocationId,
        name: locationMap.get(dropoffLocationId) || 'Destination Location',
      });
    }

    return list;
  }, [pickupLocationId, viaStops, dropoffLocationId, locationMap]);

  // Labels
  const getLineTypeLabel = (lt: string) => {
    switch (lt) {
      case 'SINGLE_TRIP': return 'Single Trip';
      case 'ROUND_TRIP': return 'Round Trip';
      case '10_HRS': return '10 Hrs Duty';
      case '12_HRS': return '12 Hrs Duty';
      default: return lt;
    }
  };

  const getPricingBasisLabel = (pb: string) => {
    switch (pb) {
      case 'PER_TRIP': return 'Per Trip';
      case 'PER_MONTH': return 'Per Month';
      default: return 'Not Specified';
    }
  };

  // Check rate changes and changes summary
  const numericRate = parseFloat(rate || '');
  const oldRate = Number(existingQuotation?.rate ?? existingQuotation?.base_price ?? 0);
  const isRateChanged = isEdit && existingQuotation && numericRate > 0 && numericRate !== oldRate;
  const driverPayoutNum = parseFloat(driverPayout || '');
  const hasDriverPayout = !isNaN(driverPayoutNum) && driverPayoutNum > 0;
  const netBalance = numericRate > 0 ? (hasDriverPayout ? numericRate - driverPayoutNum : numericRate) : 0;

  const isRateValid = !isNaN(numericRate) && numericRate > 0;
  const isDateRangeValid = !validFrom || !validTo || new Date(validTo) >= new Date(validFrom);

  // Form Readiness state for visual indicator
  const isFormReady = useMemo(() => {
    return Boolean(
      customerId &&
      pickupLocationId &&
      dropoffLocationId &&
      pickupLocationId !== dropoffLocationId &&
      billingType &&
      lineType &&
      isRateValid &&
      (!isRateChanged || changeReason.trim()) &&
      isDateRangeValid
    );
  }, [customerId, pickupLocationId, dropoffLocationId, billingType, lineType, isRateValid, isRateChanged, changeReason, isDateRangeValid]);

  // Submit Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const stopsPayload = [];
      let seq = 1;
      
      if (pickupLocationId) {
        stopsPayload.push({
          sequence: seq++,
          location_id: pickupLocationId,
          locationId: pickupLocationId,
          stop_type: 'Pickup',
          source_label: locationMap.get(pickupLocationId) || null,
        });
      }

      viaStops.forEach((v) => {
        if (v.locationId) {
          stopsPayload.push({
            sequence: seq++,
            location_id: v.locationId,
            locationId: v.locationId,
            stop_type: 'Dropoff',
            source_label: locationMap.get(v.locationId) || null,
          });
        }
      });

      if (dropoffLocationId) {
        stopsPayload.push({
          sequence: seq++,
          location_id: dropoffLocationId,
          locationId: dropoffLocationId,
          stop_type: 'Dropoff',
          source_label: locationMap.get(dropoffLocationId) || null,
        });
      }

      const payload: CreateQuotationPayload = {
        name: quotationName.trim() || undefined,
        customerId,
        origin_location_id: pickupLocationId || null,
        destination_location_id: dropoffLocationId || null,
        vehicle_class: vehicleClass || null,
        source_vehicle_label: sourceVehicleLabel.trim() || vehicleClass || null,
        vehicle_type: sourceVehicleLabel.trim() || vehicleClass || null,
        line_type: lineType || null,
        rate_category: lineType || null,
        billing_type: billingType || null,
        pricing_basis: pricingBasis === 'NULL' ? null : pricingBasis,
        rate: numericRate,
        base_price: numericRate,
        driver_payout: driverPayout ? parseFloat(driverPayout) : null,
        currency,
        valid_from: validFrom || null,
        valid_to: validTo || null,
        source_type: 'MANUAL',
        agreement_ref: quotationRefId,
        reason: changeReason.trim() || undefined,
        stops: stopsPayload,
      };

      return isEdit && id
        ? quotationService.update(id, payload)
        : quotationService.create(payload);
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      queryClient.invalidateQueries({ queryKey: ['quotation', saved.id] });
      toast.success(`Commercial Quotation ${isEdit ? 'updated' : 'created'} successfully.`);
      navigate(`/quotations/${saved.id}`);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error?.message || err.message || 'Failed to save quotation record.';
      setFormError(msg);
      toast.error(msg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!customerId) {
      setFormError('Please select a customer for this commercial agreement.');
      toast.error('Customer is required.');
      return;
    }
    if (!pickupLocationId || !dropoffLocationId) {
      setFormError('Please select both a Pickup and a Dropoff location.');
      toast.error('Pickup and Dropoff locations are required.');
      return;
    }
    if (pickupLocationId === dropoffLocationId) {
      setFormError('Pickup and Dropoff locations must be different.');
      toast.error('Pickup and Dropoff cannot be the same location.');
      return;
    }
    if (!billingType) {
      setFormError('Please select a Billing Type (MONTHLY or EXTRA).');
      toast.error('Billing Type is required.');
      return;
    }
    if (!lineType) {
      setFormError('Please select a Line Type.');
      toast.error('Line Type is required.');
      return;
    }
    if (!isRateValid) {
      setFormError('Please enter a valid commercial rate greater than 0.');
      toast.error('Rate must be greater than 0.');
      return;
    }
    if (isRateChanged && !changeReason.trim()) {
      setFormError('Reason for rate adjustment is required when changing the rate.');
      toast.error('Adjustment reason is required.');
      return;
    }
    if (!isDateRangeValid) {
      setFormError('Valid Until date cannot be earlier than Valid From date.');
      toast.error('Invalid date range.');
      return;
    }

    saveMutation.mutate();
  };

  // Keyboard shortcut Ctrl+Enter to submit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        saveMutation.mutate();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveMutation]);

  const vehicleClasses = ['3-4 TON', '5 TON', '10 TON', '20 TON', '40 FEET'];

  return (
    <DashboardLayout active="Quotations" title={isEdit ? 'Edit Quotation' : 'New Quotation'} hideBackButton={true}>
      <form onSubmit={handleSubmit} className="px-3 sm:px-5 pb-6 w-full max-w-[1500px] mx-auto animate-fade-in space-y-3">
        
        {/* Compact Page Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
              {isEdit ? 'Edit Commercial Quotation' : 'Create Commercial Agreement'}
            </h1>
            
            <Badge className="bg-[#FA634E]/10 text-[#FA634E] border-[#FA634E]/30 font-extrabold text-[11px] px-2 py-0.5">
              Commercial Contract
            </Badge>

            <div className="flex items-center gap-1 px-2 py-0.5 bg-[#3E3C3D] text-white rounded-lg font-mono font-black text-xs shadow-2xs border border-white/10">
              <Hash className="w-3 h-3 text-[#FA634E]" />
              <span>{quotationRefId}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate(isEdit && id ? `/quotations/${id}` : '/quotations')}
              className="h-8 text-xs font-bold border-slate-200 dark:border-slate-800 rounded-xl px-3"
            >
              Cancel
            </Button>
            
            <Button
              type="submit"
              disabled={saveMutation.isPending}
              size="sm"
              className="h-8 px-4 text-xs font-extrabold text-white bg-[#FA634E] hover:bg-[#DF4834] shadow-xs shadow-[#FA634E]/25 rounded-xl transition-all hover:scale-[1.02] active:scale-95 gap-1.5 cursor-pointer border-0"
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              <span>{saveMutation.isPending ? 'Saving...' : (isEdit ? 'Save Changes' : 'Create Quotation')}</span>
            </Button>
          </div>
        </div>

        {formError && (
          <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-semibold rounded-xl border border-rose-200 dark:border-rose-900/60 flex items-center gap-2 shadow-2xs">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {/* High-Density Zero-Scroll 2-Column Workspace Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          
          {/* Main Form Area (7 Columns) */}
          <div className="lg:col-span-7 space-y-3">
            
            {/* Card 01: Customer, Vehicle & Commercial Terms (High-Density Multi-Column Row Grid) */}
            <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden bg-white dark:bg-slate-900">
              <CardHeader className="bg-slate-50/70 dark:bg-slate-800/40 py-2.5 px-4 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5 text-[#FA634E]" />
                  01 · Customer & Commercial Terms Specification
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3.5 space-y-3">
                
                {/* Row 1: Customer (2 cols) + Customer Vehicle Label (1 col) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1">
                    <Label className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Customer *</Label>
                    <Select value={customerId} onValueChange={setCustomerId}>
                      <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-900 font-bold border-slate-200 dark:border-slate-800 rounded-xl">
                        <SelectValue placeholder="Select customer..." />
                      </SelectTrigger>
                      <SelectContent className="z-[9999]">
                        {customers.map((c) => (
                          <SelectItem key={c.id} value={c.id} className="text-xs font-semibold">
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Vehicle Description</Label>
                    <Input
                      value={sourceVehicleLabel}
                      onChange={(e) => setSourceVehicleLabel(e.target.value)}
                      placeholder="e.g. 6.5M - 10TON"
                      className="h-8 text-xs bg-white dark:bg-slate-900 font-medium rounded-xl border-slate-200 dark:border-slate-800"
                    />
                  </div>
                </div>

                {/* Row 2: Vehicle Class Segmented Selector */}
                <div className="space-y-1 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                  <Label className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Vehicle Class *</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {vehicleClasses.map((vc) => (
                      <button
                        key={vc}
                        type="button"
                        onClick={() => setVehicleClass(vc)}
                        className={cn(
                          "px-3 py-1 text-xs font-extrabold rounded-lg border transition-all cursor-pointer",
                          vehicleClass === vc
                            ? "bg-[#FA634E] text-white border-[#DF4834] shadow-xs scale-[1.02]"
                            : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-[#FA634E]/40"
                        )}
                      >
                        {vc}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Row 3: Rate (2 cols) + Currency (1 col) + Driver Payout (1 col) */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                  <div className="sm:col-span-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                        <Banknote className="h-3 w-3 text-[#FA634E]" /> Agreed Rate *
                      </Label>
                      {isEdit && existingQuotation && (
                        <span className="text-[9px] text-slate-400 font-bold">
                          Old: {oldRate.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      )}
                    </div>
                    <Input
                      type="number"
                      step="0.01"
                      value={rate}
                      onChange={(e) => setRate(e.target.value)}
                      placeholder="e.g. 1550.00"
                      className={cn(
                        "h-8 text-xs bg-white dark:bg-slate-900 font-black rounded-xl border-slate-200 dark:border-slate-800",
                        isRateChanged && "border-[#FA634E] ring-2 ring-[#FA634E]/20"
                      )}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Currency</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-900 font-extrabold border-slate-200 dark:border-slate-800 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[9999]">
                        <SelectItem value="SAR" className="text-xs font-bold">SAR</SelectItem>
                        <SelectItem value="AED" className="text-xs font-bold">AED</SelectItem>
                        <SelectItem value="USD" className="text-xs font-bold">USD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate block">Driver Payout</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={driverPayout}
                      onChange={(e) => setDriverPayout(e.target.value)}
                      placeholder="e.g. 350"
                      className="h-8 text-xs bg-white dark:bg-slate-900 font-extrabold rounded-xl border-slate-200 dark:border-slate-800"
                    />
                  </div>
                </div>

                {/* Rate Revision Reason Alert (Shown only if rate edited) */}
                {isRateChanged && (
                  <div className="p-2.5 bg-[#FA634E]/10 rounded-xl border border-[#FA634E]/30 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-bold text-[#FA634E] uppercase">
                      <span>Rate Revision Reason Required *</span>
                      <Badge className="bg-[#FA634E] text-white text-[9px] px-1.5 py-0">Audit</Badge>
                    </div>
                    <Input
                      value={changeReason}
                      onChange={(e) => setChangeReason(e.target.value)}
                      placeholder="e.g. Annual contract renewal"
                      className="h-7.5 text-xs bg-white dark:bg-slate-900 border-[#FA634E]/40 font-medium rounded-lg"
                    />
                  </div>
                )}

                {/* Row 4: Billing Type (2 cols) + Line Type (1 col) + Pricing Basis (1 col) */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                  <div className="sm:col-span-2 space-y-1">
                    <Label className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Billing Type *</Label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setBillingType('MONTHLY')}
                        className={cn(
                          "h-8 rounded-lg border text-xs font-extrabold transition-all cursor-pointer",
                          billingType === 'MONTHLY' ? "bg-[#FA634E] text-white border-[#DF4834] shadow-xs" : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800"
                        )}
                      >
                        MONTHLY
                      </button>
                      <button
                        type="button"
                        onClick={() => setBillingType('EXTRA')}
                        className={cn(
                          "h-8 rounded-lg border text-xs font-extrabold transition-all cursor-pointer",
                          billingType === 'EXTRA' ? "bg-[#FA634E] text-white border-[#DF4834] shadow-xs" : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800"
                        )}
                      >
                        EXTRA
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Line Type *</Label>
                    <Select value={lineType} onValueChange={setLineType}>
                      <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-900 font-semibold border-slate-200 dark:border-slate-800 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[9999]">
                        <SelectItem value="SINGLE_TRIP" className="text-xs font-semibold">Single Trip</SelectItem>
                        <SelectItem value="ROUND_TRIP" className="text-xs font-semibold">Round Trip</SelectItem>
                        <SelectItem value="10_HRS" className="text-xs font-semibold">10 Hrs Duty</SelectItem>
                        <SelectItem value="12_HRS" className="text-xs font-semibold">12 Hrs Duty</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Pricing Basis</Label>
                    <Select value={pricingBasis} onValueChange={(val) => setPricingBasis(val as any)}>
                      <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-900 font-semibold border-slate-200 dark:border-slate-800 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[9999]">
                        <SelectItem value="PER_TRIP" className="text-xs font-semibold">Per Trip</SelectItem>
                        <SelectItem value="PER_MONTH" className="text-xs font-semibold">Per Month</SelectItem>
                        <SelectItem value="NULL" className="text-xs font-semibold">Not Specified</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Row 5: Validity Dates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Valid From</Label>
                    <Input type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} className="h-7.5 text-xs bg-white dark:bg-slate-900 font-medium rounded-xl border-slate-200 dark:border-slate-800 px-2" />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Valid Until</Label>
                    <Input type="date" value={validTo} onChange={(e) => setValidTo(e.target.value)} className="h-7.5 text-xs bg-white dark:bg-slate-900 font-medium rounded-xl border-slate-200 dark:border-slate-800 px-2" />
                  </div>
                </div>

              </CardContent>
            </Card>

            {/* Card 02: Ordered Route Corridor Sequence (Compact Inline Pickers) */}
            <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden bg-white dark:bg-slate-900">
              <CardHeader className="bg-slate-50/70 dark:bg-slate-800/40 py-2.5 px-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                  02 · Ordered Route Corridor Sequence
                </CardTitle>
                <Badge variant="outline" className="text-[9px] font-bold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                  Exact Sequence Matching
                </Badge>
              </CardHeader>
              <CardContent className="p-3.5 space-y-2.5">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Origin Location */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 block uppercase tracking-wider">
                      01 Pickup Origin *
                    </span>
                    <LocationCombobox
                      customerId={customerId}
                      value={pickupLocationId}
                      onChange={(val, loc) => {
                        setPickupLocationId(val);
                        if (loc?.customerId && !customerId) {
                          setCustomerId(loc.customerId);
                        }
                      }}
                      placeholder="Select origin location..."
                    />
                  </div>

                  {/* Destination Location */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold text-rose-700 dark:text-rose-400 block uppercase tracking-wider">
                      02 Dropoff Destination *
                    </span>
                    <LocationCombobox
                      customerId={customerId}
                      value={dropoffLocationId}
                      onChange={(val, loc) => {
                        setDropoffLocationId(val);
                        if (loc?.customerId && !customerId) {
                          setCustomerId(loc.customerId);
                        }
                      }}
                      placeholder="Select destination location..."
                    />
                  </div>
                </div>

                {/* Intermediate Vias Section */}
                {viaStops.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="text-[10px] font-extrabold text-[#FA634E] uppercase">Intermediate Waypoints</div>
                    {viaStops.map((via, index) => (
                      <div key={via.id} className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 w-12 shrink-0">Via #{index + 1}</span>
                        <div className="flex-1">
                          <LocationCombobox
                            customerId={customerId}
                            value={via.locationId}
                            onChange={(val, loc) => {
                              handleUpdateViaStop(index, val);
                              if (loc?.customerId && !customerId) {
                                setCustomerId(loc.customerId);
                              }
                            }}
                            placeholder="Select intermediate stop..."
                          />
                        </div>
                        <button type="button" onClick={() => handleRemoveViaStop(index)} className="text-slate-400 hover:text-rose-600 transition-colors p-1">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddViaStop}
                  className="h-7.5 w-full text-xs font-bold border-dashed border-[#FA634E]/40 text-[#FA634E] hover:bg-[#FA634E]/10 gap-1.5 rounded-xl cursor-pointer"
                >
                  <Plus size={12} /> + Add Intermediate Stop
                </Button>

              </CardContent>
            </Card>

          </div>

          {/* Sticky Right Sidebar (5 Columns) — Compact Dashboard Summary Panel */}
          <div className="lg:col-span-5 space-y-3 lg:sticky lg:top-4">
            
            {/* Sidebar Summary Card */}
            <Card className="rounded-2xl border-[#3E3C3D] shadow-xl bg-[#3E3C3D] text-[#EEF1F6] overflow-hidden">
              <CardHeader className="py-3 px-4 border-b border-white/10 bg-black/20 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#FA634E]" />
                  Commercial Agreement Summary
                </CardTitle>
                <Badge className={cn(
                  "text-[10px] font-extrabold border-transparent px-2.5 py-0.5 transition-colors",
                  isFormReady ? "bg-emerald-500 text-white" : "bg-[#FA634E] text-white"
                )}>
                  {isFormReady ? 'Ready to Save' : 'Drafting'}
                </Badge>
              </CardHeader>
              <CardContent className="p-3.5 space-y-3 text-xs">
                
                {/* Reference & Customer */}
                <div className="p-2.5 bg-black/25 rounded-xl border border-white/10 flex items-center justify-between text-xs">
                  <div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Ref ID</div>
                    <div className="font-mono font-extrabold text-[#FA634E] text-xs">{quotationRefId}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Customer</div>
                    <div className="font-bold text-white truncate max-w-[150px]">
                      {selectedCustomer?.name || prefilledCustomerName || 'Unassigned'}
                    </div>
                  </div>
                </div>

                {/* Financial Overview Spotlight */}
                <div className="p-3 bg-black/35 rounded-xl border border-white/10 space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>Financial Overview</span>
                    <Banknote className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  
                  <div className="flex items-baseline justify-between">
                    <span className="text-slate-300 text-xs font-semibold">Billing Rate:</span>
                    <span className="text-lg font-black text-[#FA634E]">
                      {currency} {numericRate > 0 ? numericRate.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
                    </span>
                  </div>

                  {hasDriverPayout && (
                    <div className="flex items-center justify-between text-slate-400 text-xs">
                      <span>Driver Payout:</span>
                      <span className="font-semibold text-slate-200">
                        {currency} {driverPayoutNum.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}

                  <div className="pt-1.5 border-t border-white/10 flex items-center justify-between text-xs">
                    <span className="text-emerald-400 font-bold">Net Margin:</span>
                    <span className="font-mono font-black text-emerald-400">
                      {currency} {netBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1 pt-0.5">
                    <Badge variant="outline" className="text-[9px] font-bold border-white/20 bg-white/10 text-white px-1.5 py-0">
                      {vehicleClass}
                    </Badge>
                    <Badge variant="outline" className="text-[9px] font-bold border-[#FA634E]/50 bg-[#FA634E]/20 text-[#FA634E] px-1.5 py-0">
                      {billingType || 'EXTRA'}
                    </Badge>
                    <Badge variant="outline" className="text-[9px] font-bold border-blue-400/40 bg-blue-500/20 text-blue-300 px-1.5 py-0">
                      {getLineTypeLabel(lineType)}
                    </Badge>
                  </div>
                </div>

                {/* Ordered Route Visualizer */}
                <div className="p-3 bg-black/25 rounded-xl border border-white/10 space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>Route Sequence ({fullRouteStops.length} Stops)</span>
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  </div>

                  {fullRouteStops.length > 0 ? (
                    <div className="space-y-1.5 relative pl-3.5 border-l-2 border-white/20">
                      {fullRouteStops.map((stop, idx) => (
                        <div key={idx} className="relative flex items-center justify-between text-xs">
                          <div className={cn(
                            "absolute -left-[19px] w-2 h-2 rounded-full border bg-[#3E3C3D]",
                            stop.stopType === 'Pickup' && "border-emerald-500 bg-emerald-500",
                            stop.stopType === 'Via' && "border-[#FA634E] bg-[#FA634E]",
                            stop.stopType === 'Dropoff' && "border-rose-400 bg-rose-400"
                          )} />
                          <span className="font-bold text-slate-100 truncate max-w-[170px]">{stop.name}</span>
                          <span className="text-[9px] font-semibold text-slate-400 uppercase">{stop.stopType}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-slate-400 text-xs italic">Select pickup & dropoff locations</div>
                  )}
                </div>

                {/* Validity Period Summary */}
                <div className="flex items-center justify-between text-slate-400 text-xs px-1">
                  <span className="flex items-center gap-1 text-[11px]"><Calendar size={11} /> Validity:</span>
                  <span className="font-semibold text-slate-200 text-[11px]">
                    {validFrom || validTo ? `${validFrom || 'Start'} → ${validTo || 'Ongoing'}` : 'Ongoing Contract'}
                  </span>
                </div>

              </CardContent>
            </Card>

            {/* Sidebar Execution Actions Card */}
            <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-2xs bg-white dark:bg-slate-900 p-3 space-y-2">
              <Button
                type="submit"
                disabled={saveMutation.isPending}
                className="w-full h-10 bg-[#FA634E] hover:bg-[#DF4834] text-white font-black rounded-xl shadow-md shadow-[#FA634E]/25 cursor-pointer transition-all hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-2 text-xs uppercase tracking-wider border-0"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                <span>{saveMutation.isPending ? 'Saving Record...' : (isEdit ? 'Save Quotation Changes' : 'Create Commercial Agreement')}</span>
              </Button>

              <div className="text-center text-[10px] text-slate-400 font-semibold flex items-center justify-center gap-1">
                <span>Tip: Press</span>
                <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-mono font-bold border border-slate-200 dark:border-slate-700">Ctrl + Enter</kbd>
                <span>to save</span>
              </div>
            </Card>

          </div>

        </div>

      </form>
    </DashboardLayout>
  );
}

