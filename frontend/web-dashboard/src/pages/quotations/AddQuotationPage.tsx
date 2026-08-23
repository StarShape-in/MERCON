import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Building2,
  MapPin,
  Plus,
  Trash2,
  Receipt,
  Calendar,
  CreditCard,
  Truck,
  Banknote,
  CheckCircle2,
  Info,
  Loader2,
  Sparkles,
  Zap,
  Tag,
  Clock
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import LocationCombobox from '@/components/quotations/LocationCombobox';
import { quotationService, Quotation, CreateQuotationPayload } from '@/services/quotationService';
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
  const [currency, setCurrency] = useState<string>('SAR');
  const [quotationName, setQuotationName] = useState<string>('');

  // Validity & Provenance
  const [validFrom, setValidFrom] = useState<string>('');
  const [validTo, setValidTo] = useState<string>('');
  const [sourceType, setSourceType] = useState<string>('MANUAL');
  const [sourceReference, setSourceReference] = useState<string>('');
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
    setCurrency(existingQuotation.currency || 'SAR');

    setValidFrom(existingQuotation.valid_from ? existingQuotation.valid_from.substring(0, 10) : '');
    setValidTo(existingQuotation.valid_to ? existingQuotation.valid_to.substring(0, 10) : '');
    setSourceType(existingQuotation.source_type || 'MANUAL');
    setSourceReference(existingQuotation.source_reference || '');

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
        name: locationMap.get(pickupLocationId) || 'Selected Origin',
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
        name: locationMap.get(dropoffLocationId) || 'Selected Destination',
      });
    }

    return list;
  }, [pickupLocationId, viaStops, dropoffLocationId, locationMap]);

  // Validation
  const numericRate = parseFloat(rate || '');
  const isRateValid = !isNaN(numericRate) && numericRate > 0;
  const isDateRangeValid = !validFrom || !validTo || new Date(validTo) >= new Date(validFrom);

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
            stop_type: 'Via',
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
        currency,
        valid_from: validFrom || null,
        valid_to: validTo || null,
        source_type: sourceType || 'MANUAL',
        source_reference: sourceReference.trim() || null,
        reason: changeReason.trim() || undefined,
        stops: stopsPayload,
      };

      return isEdit && id
        ? quotationService.update(id, payload)
        : quotationService.create(payload);
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      toast.success(`Quotation ${isEdit ? 'updated' : 'created'} successfully.`);
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
      setFormError('Please select a customer for this quotation.');
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
    if (!isDateRangeValid) {
      setFormError('Valid Until date cannot be earlier than Valid From date.');
      toast.error('Invalid date range.');
      return;
    }

    saveMutation.mutate();
  };

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

  return (
    <DashboardLayout active="Quotations" title={isEdit ? 'Edit Quotation' : 'New Quotation'}>
      <form onSubmit={handleSubmit} className="px-4 sm:px-6 pb-14 w-full flex flex-col gap-4 max-w-7xl mx-auto animate-fade-in">
        
        {/* Compact Page Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-1 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => navigate('/quotations')}
              className="h-8 -ml-2 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              Quotations
            </Button>
            <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              {isEdit ? 'Edit Quotation' : 'New Quotation'}
            </h1>
            <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800 font-semibold text-[11px] px-2 py-0.5">
              Commercial Contract
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate('/quotations')}
              className="h-8 text-xs font-semibold border-slate-200 dark:border-slate-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saveMutation.isPending}
              size="sm"
              className="h-8 px-4 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs rounded-lg"
            >
              {saveMutation.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Create Quotation'}
            </Button>
          </div>
        </div>

        {formError && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs font-semibold rounded-lg border border-rose-200 dark:border-rose-900/50 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-rose-600 animate-pulse shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {/* Dense 2-Card Desktop Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          
          {/* Main Form Column (8 cols) */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Card 1: Customer, Route & Vehicle Specs */}
            <Card className="rounded-xl border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden bg-white dark:bg-slate-900">
              <CardHeader className="bg-slate-50/60 dark:bg-slate-800/40 py-2.5 px-4 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5 text-indigo-600" />
                  01 · Customer, Route Corridor & Vehicle Class
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3.5">
                
                {/* Customer Select */}
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Customer *</Label>
                  {prefilledCustomerId ? (
                    <div className="flex h-9 items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-xs font-bold text-slate-800 dark:text-slate-200">
                      <span>{prefilledCustomerName || selectedCustomer?.name || 'Selected Customer'}</span>
                      <Badge variant="outline" className="text-[10px] bg-white dark:bg-slate-900">Locked</Badge>
                    </div>
                  ) : (
                    <Select value={customerId} onValueChange={setCustomerId}>
                      <SelectTrigger className="h-9 text-xs bg-white dark:bg-slate-900 font-semibold border-slate-200 dark:border-slate-800 rounded-lg">
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
                  )}
                </div>

                {/* Route Builder */}
                <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-indigo-600" /> Route Corridor Stops *
                    </Label>
                  </div>

                  <div className="space-y-2 bg-slate-50/60 dark:bg-slate-800/30 p-3 rounded-lg border border-slate-200/60 dark:border-slate-800">
                    {/* Pickup */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 block">01 Pickup Location *</span>
                      <LocationCombobox value={pickupLocationId} onChange={setPickupLocationId} placeholder="Origin location..." />
                    </div>

                    {/* Vias */}
                    {viaStops.map((via, index) => (
                      <div key={via.id} className="space-y-1 pl-2.5 border-l-2 border-dashed border-indigo-200 dark:border-indigo-900 relative">
                        <div className="flex items-center justify-between text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                          <span>0{index + 2} Via Stop</span>
                          <button type="button" onClick={() => handleRemoveViaStop(index)} className="text-slate-400 hover:text-rose-600">
                            <Trash2 size={12} />
                          </button>
                        </div>
                        <LocationCombobox value={via.locationId} onChange={(val) => handleUpdateViaStop(index, val)} placeholder="Via location..." />
                      </div>
                    ))}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddViaStop}
                      className="h-7 w-full text-[11px] font-semibold border-dashed border-indigo-200 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 gap-1 rounded-md"
                    >
                      <Plus size={12} /> + Add Intermediate Via Stop
                    </Button>

                    {/* Dropoff */}
                    <div className="space-y-1 pt-0.5">
                      <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 block">0{viaStops.length + 2} Dropoff Location *</span>
                      <LocationCombobox value={dropoffLocationId} onChange={setDropoffLocationId} placeholder="Destination location..." />
                    </div>
                  </div>
                </div>

                {/* Vehicle Class & Customer Label */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Vehicle Class *</Label>
                    <Select value={vehicleClass} onValueChange={setVehicleClass}>
                      <SelectTrigger className="h-9 text-xs bg-white dark:bg-slate-900 font-semibold border-slate-200 dark:border-slate-800 rounded-lg">
                        <SelectValue placeholder="Select class..." />
                      </SelectTrigger>
                      <SelectContent className="z-[9999]">
                        <SelectItem value="3-4 TON" className="text-xs font-semibold">3-4 TON</SelectItem>
                        <SelectItem value="5 TON" className="text-xs font-semibold">5 TON</SelectItem>
                        <SelectItem value="10 TON" className="text-xs font-semibold">10 TON</SelectItem>
                        <SelectItem value="20 TON" className="text-xs font-semibold">20 TON</SelectItem>
                        <SelectItem value="40 FEET" className="text-xs font-semibold">40 FEET</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Customer Vehicle Description</Label>
                    <Input
                      value={sourceVehicleLabel}
                      onChange={(e) => setSourceVehicleLabel(e.target.value)}
                      placeholder="e.g. 6.5M-10TON"
                      className="h-9 text-xs bg-white dark:bg-slate-900 font-medium rounded-lg"
                    />
                  </div>
                </div>

              </CardContent>
            </Card>

            {/* Card 2: Commercial Pricing & Terms */}
            <Card className="rounded-xl border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden bg-white dark:bg-slate-900">
              <CardHeader className="bg-slate-50/60 dark:bg-slate-800/40 py-2.5 px-4 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Banknote className="h-3.5 w-3.5 text-emerald-600" />
                  02 · Commercial Rate, Terms & Validity
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3.5">
                
                {/* Rate & Currency Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1">
                    <Label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                      <Banknote className="h-3.5 w-3.5 text-emerald-600" /> Commercial Rate *
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={rate}
                      onChange={(e) => setRate(e.target.value)}
                      placeholder="e.g. 499.00"
                      className="h-9 text-xs bg-white dark:bg-slate-900 font-extrabold rounded-lg"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Currency</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger className="h-9 text-xs bg-white dark:bg-slate-900 font-bold border-slate-200 dark:border-slate-800 rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[9999]">
                        <SelectItem value="SAR" className="text-xs font-bold">SAR</SelectItem>
                        <SelectItem value="AED" className="text-xs font-bold">AED</SelectItem>
                        <SelectItem value="USD" className="text-xs font-bold">USD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Billing Type & Line Type & Pricing Basis */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Billing Type *</Label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setBillingType('MONTHLY')}
                        className={cn(
                          "h-8 rounded-lg border text-[11px] font-extrabold transition-all",
                          billingType === 'MONTHLY' ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs" : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800"
                        )}
                      >
                        MONTHLY
                      </button>
                      <button
                        type="button"
                        onClick={() => setBillingType('EXTRA')}
                        className={cn(
                          "h-8 rounded-lg border text-[11px] font-extrabold transition-all",
                          billingType === 'EXTRA' ? "bg-amber-600 text-white border-amber-600 shadow-2xs" : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800"
                        )}
                      >
                        EXTRA
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Line Type *</Label>
                    <Select value={lineType} onValueChange={setLineType}>
                      <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-900 font-semibold border-slate-200 dark:border-slate-800 rounded-lg">
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
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Pricing Basis</Label>
                    <Select value={pricingBasis} onValueChange={(val) => setPricingBasis(val as any)}>
                      <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-900 font-semibold border-slate-200 dark:border-slate-800 rounded-lg">
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

                {/* Validity Dates & Source Info Row */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Valid From</Label>
                    <Input type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} className="h-8 text-[11px] bg-white dark:bg-slate-900 font-medium rounded-lg px-2" />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Valid Until</Label>
                    <Input type="date" value={validTo} onChange={(e) => setValidTo(e.target.value)} className="h-8 text-[11px] bg-white dark:bg-slate-900 font-medium rounded-lg px-2" />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Source Type</Label>
                    <Select value={sourceType} onValueChange={setSourceType}>
                      <SelectTrigger className="h-8 text-[11px] bg-white dark:bg-slate-900 font-medium border-slate-200 dark:border-slate-800 rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[9999]">
                        <SelectItem value="MANUAL" className="text-xs font-semibold">Manual Entry</SelectItem>
                        <SelectItem value="CONTRACT" className="text-xs font-semibold">Contract Agreement</SelectItem>
                        <SelectItem value="QUOTATION_DOC" className="text-xs font-semibold">Operational Quotation</SelectItem>
                        <SelectItem value="OPERATIONAL_SHEET" className="text-xs font-semibold">Customer Sheet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Source Ref</Label>
                    <Input value={sourceReference} onChange={(e) => setSourceReference(e.target.value)} placeholder="Ref #" className="h-8 text-[11px] bg-white dark:bg-slate-900 font-medium rounded-lg px-2" />
                  </div>
                </div>

                {isEdit && (
                  <div className="space-y-1 pt-1">
                    <Label className="text-[11px] font-bold text-amber-700 dark:text-amber-400">Reason for Change</Label>
                    <Input value={changeReason} onChange={(e) => setChangeReason(e.target.value)} placeholder="Audit reason" className="h-8 text-xs bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 rounded-lg" />
                  </div>
                )}

              </CardContent>
            </Card>

          </div>

          {/* Right Column: Live Quotation Preview Card (5 cols) */}
          <div className="lg:col-span-5 lg:sticky lg:top-4 space-y-3">
            <Card className="rounded-xl border-slate-200/80 dark:border-slate-800 shadow-2xs bg-white dark:bg-slate-900 overflow-hidden">
              <CardHeader className="py-2.5 px-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                    <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                      LIVE QUOTATION PREVIEW
                    </CardTitle>
                  </div>
                  <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800 text-[10px] font-bold">
                    Draft Preview
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-3">
                
                {/* Customer */}
                <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center font-extrabold text-xs shrink-0">
                    {selectedCustomer?.name ? selectedCustomer.name.substring(0, 2).toUpperCase() : 'CU'}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Customer</span>
                    <span className="font-extrabold text-xs text-slate-900 dark:text-slate-100 block">
                      {selectedCustomer?.name || prefilledCustomerName || 'Unassigned Customer'}
                    </span>
                  </div>
                </div>

                {/* Route Corridor */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Route Corridor ({fullRouteStops.length} stops)
                  </span>

                  {fullRouteStops.length === 0 ? (
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 text-slate-400 text-xs italic text-center border border-slate-100 dark:border-slate-800">
                      Select origin & destination to view corridor...
                    </div>
                  ) : (
                    <div className="space-y-1.5 bg-slate-50/60 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800">
                      {fullRouteStops.map((stop, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                          <span className={cn(
                            "w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-extrabold shrink-0",
                            stop.stopType === 'Pickup' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" :
                            stop.stopType === 'Dropoff' ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300" :
                            "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                          )}>
                            {idx + 1}
                          </span>
                          <span className="truncate flex-1 text-[11px]">{stop.name}</span>
                          <Badge variant="outline" className="text-[9px] px-1 py-0 font-medium">
                            {stop.stopType}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Vehicle & Commercial Summary */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <div className="p-2 bg-slate-50/60 dark:bg-slate-800/40 rounded-lg border border-slate-200/60 dark:border-slate-800">
                    <span className="text-[9px] text-slate-400 font-bold block">Vehicle</span>
                    <span className="font-extrabold text-[11px] text-slate-900 dark:text-slate-100">{vehicleClass || '—'}</span>
                    {sourceVehicleLabel && (
                      <span className="block text-[9px] text-slate-400 font-normal truncate">{sourceVehicleLabel}</span>
                    )}
                  </div>

                  <div className="p-2 bg-slate-50/60 dark:bg-slate-800/40 rounded-lg border border-slate-200/60 dark:border-slate-800">
                    <span className="text-[9px] text-slate-400 font-bold block">Billing & Line</span>
                    <span className="font-extrabold text-[11px] text-indigo-600 dark:text-indigo-400">{billingType || 'EXTRA'}</span>
                    <span className="block text-[9px] text-slate-500 font-medium">{getLineTypeLabel(lineType)}</span>
                  </div>
                </div>

                {/* Commercial Rate */}
                <div className="p-3 bg-slate-900 text-white dark:bg-slate-800 rounded-lg shadow-2xs space-y-0.5">
                  <span className="text-[9px] font-bold tracking-wider uppercase text-slate-400 block">
                    Commercial Rate ({getPricingBasisLabel(pricingBasis)})
                  </span>
                  <div className="text-xl font-black tracking-tight">
                    {currency} {numericRate > 0 ? numericRate.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
                  </div>
                </div>

              </CardContent>
            </Card>
          </div>

        </div>

      </form>
    </DashboardLayout>
  );
}
