import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Building2,
  MapPin,
  ArrowRight,
  Plus,
  Trash2,
  Receipt,
  Calendar,
  CreditCard,
  Truck,
  Banknote,
  FileText,
  CheckCircle2,
  Info,
  Loader2,
  Sparkles,
  ShieldCheck,
  Zap,
  Tag,
  Clock,
  Layers,
  ArrowDown
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import LocationCombobox from '@/components/quotations/LocationCombobox';
import { quotationService, Quotation, CreateQuotationPayload } from '@/services/quotationService';
import { customerService } from '@/services/customerService';
import { locationService } from '@/services/locationService';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface RouteStopState {
  id: string;
  locationId: string;
  stopType: 'Pickup' | 'Via' | 'Dropoff';
  sequence: number;
}

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

  // Fetch existing quotation if in edit mode
  const { data: existingQuotation, isLoading: isFetchingQuotation } = useQuery({
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

  // Via stops handlers
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

  // Compute full ordered route array
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

  // Form Validation
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
      <form onSubmit={handleSubmit} className="px-4 sm:px-6 pb-20 w-full flex flex-col gap-6 max-w-7xl mx-auto animate-fade-in">
        
        {/* Page Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
          <div className="space-y-1">
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
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                {isEdit ? 'Edit Quotation' : 'New Quotation'}
              </h1>
              <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800 font-semibold text-xs">
                Commercial Contract
              </Badge>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Create a customer pricing agreement for dispatch and billing.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate('/quotations')}
              className="h-9 text-xs font-semibold border-slate-200 dark:border-slate-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saveMutation.isPending}
              size="sm"
              className="h-9 px-5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs rounded-lg"
            >
              {saveMutation.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Create Quotation'}
            </Button>
          </div>
        </div>

        {formError && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs font-semibold rounded-xl border border-rose-200 dark:border-rose-900/50 flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-rose-600 animate-pulse shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {/* 2-Column Main Layout: Left Form (7 cols), Right Sticky Live Preview (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Form Column */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* 01 Customer & Route */}
            <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden bg-white dark:bg-slate-900">
              <CardHeader className="bg-slate-50/60 dark:bg-slate-800/40 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-extrabold text-xs border border-indigo-200/60 dark:border-indigo-800">
                    01
                  </div>
                  <div>
                    <CardTitle className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                      Customer & Route
                    </CardTitle>
                    <CardDescription className="text-[11px] text-slate-500">
                      Select target customer and build the sequential corridor stops.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-5">
                
                {/* Customer Field */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-indigo-500" /> Customer *
                  </Label>
                  {prefilledCustomerId ? (
                    <div className="flex h-10 items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-xs font-bold text-slate-800 dark:text-slate-200">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-indigo-600" />
                        <span>{prefilledCustomerName || selectedCustomer?.name || 'Selected Customer'}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-white dark:bg-slate-900">Locked</Badge>
                    </div>
                  ) : (
                    <Select value={customerId} onValueChange={setCustomerId}>
                      <SelectTrigger className="h-10 text-xs bg-white dark:bg-slate-900 font-semibold border-slate-200 dark:border-slate-800 rounded-xl">
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
                <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-indigo-600" /> Route Corridor Stops *
                    </Label>
                    <span className="text-[10px] text-slate-400 font-medium">Pickup & Dropoff Required</span>
                  </div>

                  {/* Sequential Stop List */}
                  <div className="space-y-3 bg-slate-50/70 dark:bg-slate-800/30 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
                    
                    {/* 01 Pickup Stop */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                        <span className="flex items-center gap-1">
                          <span className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-[10px] font-extrabold">1</span>
                          01 Pickup Location *
                        </span>
                      </div>
                      <LocationCombobox
                        value={pickupLocationId}
                        onChange={setPickupLocationId}
                        placeholder="Select pickup origin location..."
                      />
                    </div>

                    {/* Via Connecting Stops */}
                    {viaStops.map((via, index) => (
                      <div key={via.id} className="space-y-1 pl-3 border-l-2 border-dashed border-indigo-200 dark:border-indigo-900 my-2 relative">
                        <div className="flex items-center justify-between text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                          <span className="flex items-center gap-1">
                            <span className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-[10px] font-extrabold">{index + 2}</span>
                            0{index + 2} Via / Connecting Stop
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveViaStop(index)}
                            className="text-slate-400 hover:text-rose-600 p-0.5"
                            title="Remove stop"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                        <LocationCombobox
                          value={via.locationId}
                          onChange={(val) => handleUpdateViaStop(index, val)}
                          placeholder="Select via / intermediate location..."
                        />
                      </div>
                    ))}

                    {/* Add Via Stop Button */}
                    <div className="pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddViaStop}
                        className="h-8 w-full text-xs font-semibold border-dashed border-indigo-200 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 gap-1 rounded-lg"
                      >
                        <Plus size={13} />
                        <span>+ Add Intermediate Via Stop</span>
                      </Button>
                    </div>

                    {/* Dropoff Stop */}
                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between text-[11px] font-bold text-rose-700 dark:text-rose-400">
                        <span className="flex items-center gap-1">
                          <span className="w-4 h-4 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 flex items-center justify-center text-[10px] font-extrabold">{viaStops.length + 2}</span>
                          0{viaStops.length + 2} Dropoff Location *
                        </span>
                      </div>
                      <LocationCombobox
                        value={dropoffLocationId}
                        onChange={setDropoffLocationId}
                        placeholder="Select dropoff destination location..."
                      />
                    </div>

                  </div>
                </div>

              </CardContent>
            </Card>

            {/* 02 Commercial Terms */}
            <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden bg-white dark:bg-slate-900">
              <CardHeader className="bg-slate-50/60 dark:bg-slate-800/40 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-extrabold text-xs border border-indigo-200/60 dark:border-indigo-800">
                    02
                  </div>
                  <div>
                    <CardTitle className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                      Commercial Terms
                    </CardTitle>
                    <CardDescription className="text-[11px] text-slate-500">
                      Billing category, operational line type, and pricing basis model.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-5">
                
                {/* Billing Type Selection Cards */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Billing Type *
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div
                      onClick={() => setBillingType('MONTHLY')}
                      className={cn(
                        "p-3.5 rounded-xl border transition-all cursor-pointer space-y-1",
                        billingType === 'MONTHLY'
                          ? "bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/20"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs text-indigo-950 dark:text-indigo-200 uppercase tracking-wide">
                          MONTHLY
                        </span>
                        {billingType === 'MONTHLY' && <CheckCircle2 className="h-4 w-4 text-indigo-600" />}
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Contracted / recurring commercial agreement.
                      </p>
                    </div>

                    <div
                      onClick={() => setBillingType('EXTRA')}
                      className={cn(
                        "p-3.5 rounded-xl border transition-all cursor-pointer space-y-1",
                        billingType === 'EXTRA'
                          ? "bg-amber-50/60 dark:bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/20"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs text-amber-950 dark:text-amber-200 uppercase tracking-wide">
                          EXTRA
                        </span>
                        {billingType === 'EXTRA' && <CheckCircle2 className="h-4 w-4 text-amber-600" />}
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Additional / on-demand quotation rule.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Line Type Select */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Line Type *
                  </Label>
                  <Select value={lineType} onValueChange={setLineType}>
                    <SelectTrigger className="h-10 text-xs bg-white dark:bg-slate-900 font-semibold border-slate-200 dark:border-slate-800 rounded-xl">
                      <SelectValue placeholder="Select line type..." />
                    </SelectTrigger>
                    <SelectContent className="z-[9999]">
                      <SelectItem value="SINGLE_TRIP" className="text-xs font-semibold">Single Trip</SelectItem>
                      <SelectItem value="ROUND_TRIP" className="text-xs font-semibold">Round Trip</SelectItem>
                      <SelectItem value="10_HRS" className="text-xs font-semibold">10 Hrs Duty</SelectItem>
                      <SelectItem value="12_HRS" className="text-xs font-semibold">12 Hrs Duty</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Pricing Basis Choices */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Pricing Basis
                    </Label>
                    <span className="text-[10px] text-slate-400">Independent of Billing Type</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'PER_TRIP', label: 'Per Trip' },
                      { id: 'PER_MONTH', label: 'Per Month' },
                      { id: 'NULL', label: 'Not Specified' },
                    ].map((item) => (
                      <div
                        key={item.id}
                        onClick={() => setPricingBasis(item.id as any)}
                        className={cn(
                          "py-2 px-3 rounded-xl border text-center transition-all cursor-pointer text-xs font-bold",
                          pricingBasis === item.id
                            ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-slate-900 shadow-xs"
                            : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50"
                        )}
                      >
                        {item.label}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Commercial Summary Card & Consistency Alert */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/70 dark:border-slate-800 space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Commercial Arrangement Summary
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                    <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">{billingType || 'EXTRA'}</Badge>
                    <span>·</span>
                    <Badge variant="outline">{getLineTypeLabel(lineType)}</Badge>
                    <span>·</span>
                    <Badge variant="outline">{getPricingBasisLabel(pricingBasis)}</Badge>
                  </div>

                  {billingType === 'MONTHLY' && pricingBasis === 'PER_TRIP' && (
                    <div className="pt-1.5 text-[11px] text-indigo-700 dark:text-indigo-300 font-medium flex items-center gap-1.5">
                      <Info size={13} className="shrink-0 text-indigo-500" />
                      <span>ⓘ <strong>Monthly + Per Trip:</strong> This represents a monthly contracted arrangement priced per completed trip.</span>
                    </div>
                  )}
                </div>

              </CardContent>
            </Card>

            {/* 03 Vehicle & Rate */}
            <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden bg-white dark:bg-slate-900">
              <CardHeader className="bg-slate-50/60 dark:bg-slate-800/40 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-extrabold text-xs border border-indigo-200/60 dark:border-indigo-800">
                    03
                  </div>
                  <div>
                    <CardTitle className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                      Vehicle & Rate
                    </CardTitle>
                    <CardDescription className="text-[11px] text-slate-500">
                      Normalized vehicle class, customer raw label, and commercial rate.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-5">
                
                {/* Vehicle Class & Raw Description */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Normalized Vehicle Class *
                    </Label>
                    <Select value={vehicleClass} onValueChange={setVehicleClass}>
                      <SelectTrigger className="h-10 text-xs bg-white dark:bg-slate-900 font-semibold border-slate-200 dark:border-slate-800 rounded-xl">
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

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Customer Vehicle Description
                    </Label>
                    <Input
                      value={sourceVehicleLabel}
                      onChange={(e) => setSourceVehicleLabel(e.target.value)}
                      placeholder="e.g. 6.5M-10TON"
                      className="h-10 text-xs bg-white dark:bg-slate-900 font-medium rounded-xl"
                    />
                    <p className="text-[10px] text-slate-400 font-normal">
                      Preserve terminology used by customer/contract.
                    </p>
                  </div>
                </div>

                {/* Commercial Rate & Currency */}
                <div className="p-4 bg-slate-50/80 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2 space-y-1.5">
                      <Label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <Banknote className="h-4 w-4 text-emerald-600" /> Commercial Rate *
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={rate}
                        onChange={(e) => setRate(e.target.value)}
                        placeholder="e.g. 499.00"
                        className="h-10 text-sm bg-white dark:bg-slate-900 font-extrabold rounded-xl"
                      />
                      <p className="text-[10px] text-slate-500 font-medium">
                        What Mercon charges the customer under this quotation.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Currency
                      </Label>
                      <Select value={currency} onValueChange={setCurrency}>
                        <SelectTrigger className="h-10 text-xs bg-white dark:bg-slate-900 font-bold border-slate-200 dark:border-slate-800 rounded-xl">
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

                  {isEdit && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-700">
                      <Label className="text-xs font-bold text-amber-700 dark:text-amber-400">
                        Reason for Rate Revision (Audit Log)
                      </Label>
                      <Input
                        value={changeReason}
                        onChange={(e) => setChangeReason(e.target.value)}
                        placeholder="Reason for changing rate (e.g. Annual contract renewal)"
                        className="h-9 text-xs bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 rounded-xl"
                      />
                    </div>
                  )}
                </div>

              </CardContent>
            </Card>

            {/* 04 Validity & Source */}
            <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden bg-white dark:bg-slate-900">
              <CardHeader className="bg-slate-50/60 dark:bg-slate-800/40 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-extrabold text-xs border border-indigo-200/60 dark:border-indigo-800">
                    04
                  </div>
                  <div>
                    <CardTitle className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                      Validity & Source Information
                    </CardTitle>
                    <CardDescription className="text-[11px] text-slate-500">
                      Effective dates and source provenance record.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                
                {/* Validity Dates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-blue-500" /> Valid From
                    </Label>
                    <Input
                      type="date"
                      value={validFrom}
                      onChange={(e) => setValidFrom(e.target.value)}
                      className="h-10 text-xs bg-white dark:bg-slate-900 font-medium rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-blue-500" /> Valid Until
                    </Label>
                    <Input
                      type="date"
                      value={validTo}
                      onChange={(e) => setValidTo(e.target.value)}
                      className="h-10 text-xs bg-white dark:bg-slate-900 font-medium rounded-xl"
                    />
                  </div>
                </div>

                {/* Source Information */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Source Type
                    </Label>
                    <Select value={sourceType} onValueChange={setSourceType}>
                      <SelectTrigger className="h-10 text-xs bg-white dark:bg-slate-900 font-medium border-slate-200 dark:border-slate-800 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[9999]">
                        <SelectItem value="MANUAL" className="text-xs font-semibold">Manual Entry</SelectItem>
                        <SelectItem value="CONTRACT" className="text-xs font-semibold">Contract Agreement</SelectItem>
                        <SelectItem value="QUOTATION_DOC" className="text-xs font-semibold">Operational Quotation</SelectItem>
                        <SelectItem value="OPERATIONAL_SHEET" className="text-xs font-semibold">Customer Pricing Sheet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Source Reference
                    </Label>
                    <Input
                      value={sourceReference}
                      onChange={(e) => setSourceReference(e.target.value)}
                      placeholder="e.g. Contract #2026-IMILE-01"
                      className="h-10 text-xs bg-white dark:bg-slate-900 font-medium rounded-xl"
                    />
                  </div>
                </div>

              </CardContent>
            </Card>

          </div>

          {/* Right Column: Live Quotation Preview Card (Desktop Sticky Sidebar) */}
          <div className="lg:col-span-5 lg:sticky lg:top-6 space-y-4">
            <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900 overflow-hidden">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                      LIVE QUOTATION PREVIEW
                    </CardTitle>
                  </div>
                  <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800 text-[10px] font-bold">
                    Draft Preview
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-5 space-y-4">
                
                {/* Customer Row */}
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center font-extrabold text-xs shrink-0">
                    {selectedCustomer?.name ? selectedCustomer.name.substring(0, 2).toUpperCase() : 'CU'}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Customer</span>
                    <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100 block">
                      {selectedCustomer?.name || prefilledCustomerName || 'Unassigned Customer'}
                    </span>
                  </div>
                </div>

                {/* Route Visual Corridor */}
                <div className="space-y-2 py-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Route Corridor ({fullRouteStops.length} stops)
                  </span>

                  {fullRouteStops.length === 0 ? (
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-slate-400 text-xs italic text-center border border-slate-100 dark:border-slate-800">
                      Select pickup and dropoff locations to preview route corridor...
                    </div>
                  ) : (
                    <div className="space-y-2 bg-slate-50/60 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800">
                      {fullRouteStops.map((stop, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                          <span className={cn(
                            "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold shrink-0",
                            stop.stopType === 'Pickup' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" :
                            stop.stopType === 'Dropoff' ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300" :
                            "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                          )}>
                            {idx + 1}
                          </span>
                          <span className="truncate flex-1">{stop.name}</span>
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-medium">
                            {stop.stopType}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Vehicle & Commercial Spec */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="p-2.5 bg-slate-50/60 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 font-bold block">Vehicle Class</span>
                    <span className="font-extrabold text-xs text-slate-900 dark:text-slate-100">{vehicleClass || '—'}</span>
                    {sourceVehicleLabel && (
                      <span className="block text-[10px] text-slate-400 font-normal truncate">{sourceVehicleLabel}</span>
                    )}
                  </div>

                  <div className="p-2.5 bg-slate-50/60 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 font-bold block">Billing & Line</span>
                    <span className="font-extrabold text-xs text-indigo-600 dark:text-indigo-400">{billingType || 'EXTRA'}</span>
                    <span className="block text-[10px] text-slate-500 font-medium">{getLineTypeLabel(lineType)}</span>
                  </div>
                </div>

                {/* Commercial Rate Banner */}
                <div className="p-4 bg-slate-900 text-white dark:bg-slate-800 rounded-xl shadow-xs space-y-1">
                  <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400 block">
                    Commercial Rate ({getPricingBasisLabel(pricingBasis)})
                  </span>
                  <div className="text-2xl font-black tracking-tight">
                    {currency} {numericRate > 0 ? numericRate.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
                  </div>
                </div>

              </CardContent>
            </Card>
          </div>

        </div>

        {/* Bottom Action Toolbar */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 z-40 flex items-center justify-end gap-3 shadow-lg">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/quotations')}
            className="h-10 text-xs font-bold border-slate-200 dark:border-slate-800 px-5 rounded-xl"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={saveMutation.isPending}
            className="h-10 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md rounded-xl px-6"
          >
            {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit ? 'Save Quotation Changes' : 'Create Quotation'}
          </Button>
        </div>

      </form>
    </DashboardLayout>
  );
}
