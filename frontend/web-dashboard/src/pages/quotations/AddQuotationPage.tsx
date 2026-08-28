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
      <form onSubmit={handleSubmit} className="px-4 sm:px-6 pb-12 w-full max-w-7xl mx-auto animate-fade-in space-y-5">
        
        {/* Page Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                {isEdit ? 'Edit Commercial Quotation' : 'Create Commercial Agreement'}
              </h1>
              
              <Badge className="bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 font-bold text-xs px-2.5 py-0.5">
                Commercial Contract
              </Badge>

              <div className="flex items-center gap-1 px-2.5 py-0.5 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-lg font-mono font-black text-xs shadow-2xs">
                <Hash className="w-3 h-3 text-amber-400 dark:text-amber-600" />
                <span>{quotationRefId}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate(isEdit && id ? `/quotations/${id}` : '/quotations')}
              className="h-9 text-xs font-bold border-slate-200 dark:border-slate-800 rounded-xl px-4"
            >
              Cancel
            </Button>
            
            <Button
              type="submit"
              disabled={saveMutation.isPending}
              size="sm"
              className="h-9 px-5 text-xs font-extrabold text-white bg-amber-500 hover:bg-amber-600 shadow-md rounded-xl transition-all hover:scale-[1.02] active:scale-95 gap-1.5 cursor-pointer"
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              <span>{saveMutation.isPending ? 'Saving...' : (isEdit ? 'Save Changes' : 'Create Quotation')}</span>
            </Button>
          </div>
        </div>

        {formError && (
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-semibold rounded-2xl border border-rose-200 dark:border-rose-900/60 flex items-center gap-2.5 shadow-2xs">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {/* Workspace Layout: Left Main Form Controls + Right Dedicated Sticky Summary Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Main Form Content Area (7 Columns) */}
          <div className="lg:col-span-7 space-y-5">
            
            {/* Card 01: Customer & Vehicle Specification */}
            <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden bg-white dark:bg-slate-900">
              <CardHeader className="bg-slate-50/70 dark:bg-slate-800/40 py-3.5 px-5 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-amber-500" />
                  01 · Customer & Vehicle Specification
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                
                {/* Customer Picker */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">Customer *</Label>
                  <Select value={customerId} onValueChange={setCustomerId}>
                    <SelectTrigger className="h-9.5 text-xs bg-white dark:bg-slate-900 font-bold border-slate-200 dark:border-slate-800 rounded-xl">
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

                {/* Vehicle Class Segmented Selector */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">Vehicle Class *</Label>
                  <div className="flex flex-wrap gap-2">
                    {vehicleClasses.map((vc) => (
                      <button
                        key={vc}
                        type="button"
                        onClick={() => setVehicleClass(vc)}
                        className={cn(
                          "px-3.5 py-1.5 text-xs font-extrabold rounded-xl border transition-all cursor-pointer",
                          vehicleClass === vc
                            ? "bg-amber-500 text-white border-amber-600 shadow-2xs scale-[1.02]"
                            : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-amber-300"
                        )}
                      >
                        {vc}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Customer Vehicle Description */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Customer Vehicle Description (Optional)</Label>
                  <Input
                    value={sourceVehicleLabel}
                    onChange={(e) => setSourceVehicleLabel(e.target.value)}
                    placeholder="e.g. 6.5M - 10TON"
                    className="h-9 text-xs bg-white dark:bg-slate-900 font-medium rounded-xl border-slate-200 dark:border-slate-800"
                  />
                </div>

              </CardContent>
            </Card>

            {/* Card 02: Sequential Route Corridor Builder */}
            <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden bg-white dark:bg-slate-900">
              <CardHeader className="bg-slate-50/70 dark:bg-slate-800/40 py-3.5 px-5 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-emerald-600" />
                  02 · Ordered Route Corridor Sequence
                </CardTitle>
                <Badge variant="outline" className="text-[10px] font-bold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                  Sequence Matching Enforced
                </Badge>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                
                <div className="space-y-3.5 bg-slate-50/60 dark:bg-slate-800/30 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800">
                  {/* 01 Pickup Location */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 block uppercase tracking-wider">
                      01 Pickup Location (Origin) *
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

                  {/* Dynamic Intermediate Waypoints */}
                  {viaStops.map((via, index) => (
                    <div key={via.id} className="space-y-1 pl-3.5 border-l-2 border-dashed border-amber-400 dark:border-amber-800 relative">
                      <div className="flex items-center justify-between text-[10px] font-extrabold text-amber-700 dark:text-amber-400">
                        <span>0{index + 2} Intermediate Stop</span>
                        <button type="button" onClick={() => handleRemoveViaStop(index)} className="text-slate-400 hover:text-rose-600 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
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
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddViaStop}
                    className="h-8.5 w-full text-xs font-bold border-dashed border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 gap-1.5 rounded-xl cursor-pointer"
                  >
                    <Plus size={13} /> + Add Intermediate Stop
                  </Button>

                  {/* 0N Dropoff Location */}
                  <div className="space-y-1 pt-1">
                    <span className="text-[10px] font-extrabold text-rose-700 dark:text-rose-400 block uppercase tracking-wider">
                      0{viaStops.length + 2} Dropoff Location (Destination) *
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

              </CardContent>
            </Card>

            {/* Card 03: Commercial Terms & Pricing */}
            <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden bg-white dark:bg-slate-900">
              <CardHeader className="bg-slate-50/70 dark:bg-slate-800/40 py-3.5 px-5 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-emerald-600" />
                  03 · Commercial Terms & Pricing
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                
                {/* Rate & Currency Input Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                        <Banknote className="h-3.5 w-3.5 text-emerald-600" /> Agreed Rate *
                      </Label>
                      {isEdit && existingQuotation && (
                        <span className="text-[10px] text-slate-400 font-bold">
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
                        "h-9.5 text-xs bg-white dark:bg-slate-900 font-black rounded-xl border-slate-200 dark:border-slate-800",
                        isRateChanged && "border-amber-400 ring-2 ring-amber-400/20"
                      )}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Currency</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger className="h-9.5 text-xs bg-white dark:bg-slate-900 font-extrabold border-slate-200 dark:border-slate-800 rounded-xl">
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

                {/* Driver Charge Input */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Driver Charge / Payout (Optional)
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={driverPayout}
                    onChange={(e) => setDriverPayout(e.target.value)}
                    placeholder="e.g. 350.00"
                    className="h-9.5 text-xs bg-white dark:bg-slate-900 font-extrabold rounded-xl border-slate-200 dark:border-slate-800"
                  />
                </div>

                {/* Live Net Balance Display Box */}
                {numericRate > 0 && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-600 dark:text-slate-400 text-xs">Net Margin Balance</span>
                    <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                      {currency} {netBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                {/* Rate Change Detected Alert */}
                {isRateChanged && (
                  <div className="p-3.5 bg-amber-50/90 dark:bg-amber-950/40 rounded-xl border border-amber-300 dark:border-amber-800 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-amber-900 dark:text-amber-200 uppercase">
                      <span>Rate Revision Detected</span>
                      <Badge className="bg-amber-200 text-amber-900 text-[10px]">Audit Log</Badge>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-amber-950 dark:text-amber-200">Reason for Adjustment *</Label>
                      <Input
                        value={changeReason}
                        onChange={(e) => setChangeReason(e.target.value)}
                        placeholder="e.g. Annual contract renewal"
                        className="h-8.5 text-xs bg-white dark:bg-slate-900 border-amber-300 font-medium rounded-lg"
                      />
                    </div>
                  </div>
                )}

                {/* Billing Type Segmented Selector */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">Billing Type *</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setBillingType('MONTHLY')}
                      className={cn(
                        "h-9 rounded-xl border text-xs font-extrabold transition-all cursor-pointer",
                        billingType === 'MONTHLY' ? "bg-amber-500 text-white border-amber-600 shadow-2xs" : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800"
                      )}
                    >
                      MONTHLY
                    </button>
                    <button
                      type="button"
                      onClick={() => setBillingType('EXTRA')}
                      className={cn(
                        "h-9 rounded-xl border text-xs font-extrabold transition-all cursor-pointer",
                        billingType === 'EXTRA' ? "bg-amber-500 text-white border-amber-600 shadow-2xs" : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800"
                      )}
                    >
                      EXTRA
                    </button>
                  </div>
                </div>

                {/* Line Type & Pricing Basis */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Line Type *</Label>
                    <Select value={lineType} onValueChange={setLineType}>
                      <SelectTrigger className="h-9 text-xs bg-white dark:bg-slate-900 font-semibold border-slate-200 dark:border-slate-800 rounded-xl">
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

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Pricing Basis</Label>
                    <Select value={pricingBasis} onValueChange={(val) => setPricingBasis(val as any)}>
                      <SelectTrigger className="h-9 text-xs bg-white dark:bg-slate-900 font-semibold border-slate-200 dark:border-slate-800 rounded-xl">
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

                {/* Validity Dates Clean Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Valid From</Label>
                    <Input type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} className="h-8.5 text-xs bg-white dark:bg-slate-900 font-medium rounded-xl border-slate-200 dark:border-slate-800 px-2.5" />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Valid Until</Label>
                    <Input type="date" value={validTo} onChange={(e) => setValidTo(e.target.value)} className="h-8.5 text-xs bg-white dark:bg-slate-900 font-medium rounded-xl border-slate-200 dark:border-slate-800 px-2.5" />
                  </div>
                </div>

              </CardContent>
            </Card>

          </div>

          {/* Sticky Right Sidebar (5 Columns) */}
          <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-6">
            
            {/* Sidebar Summary Card */}
            <Card className="rounded-2xl border-slate-800 shadow-xl bg-slate-900 text-white overflow-hidden">
              <CardHeader className="py-3 px-4 border-b border-slate-800 bg-slate-950/70 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  Commercial Agreement Summary
                </CardTitle>
                <Badge className={cn(
                  "text-[10px] font-extrabold border-transparent px-2 py-0.5 transition-colors",
                  isFormReady ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"
                )}>
                  {isFormReady ? 'Ready to Save' : 'Drafting'}
                </Badge>
              </CardHeader>
              <CardContent className="p-4 space-y-4 text-xs">
                
                {/* Reference & Customer */}
                <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>Agreement Reference</span>
                    <Hash className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div className="font-mono font-extrabold text-amber-400 text-sm">
                    {quotationRefId}
                  </div>
                  <div className="pt-1.5 border-t border-slate-700/60 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Customer:</span>
                    <span className="font-bold text-white truncate max-w-[170px]">
                      {selectedCustomer?.name || prefilledCustomerName || 'Unassigned'}
                    </span>
                  </div>
                </div>

                {/* Financial Overview Spotlight */}
                <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>Financial Terms</span>
                    <Banknote className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  
                  <div className="flex items-baseline justify-between">
                    <span className="text-slate-400 text-xs font-semibold">Billing Rate:</span>
                    <span className="text-xl font-black text-amber-400">
                      {currency} {numericRate > 0 ? numericRate.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
                    </span>
                  </div>

                  {hasDriverPayout && (
                    <div className="flex items-center justify-between text-slate-400 text-xs">
                      <span>Driver Payout:</span>
                      <span className="font-semibold text-slate-300">
                        {currency} {driverPayoutNum.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-emerald-400 font-bold">Net Margin:</span>
                    <span className="font-mono font-black text-emerald-400">
                      {currency} {netBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <Badge variant="outline" className="text-[10px] font-bold border-slate-700 bg-slate-800 text-slate-200">
                      {vehicleClass}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] font-bold border-amber-500/40 bg-amber-500/10 text-amber-300">
                      {billingType || 'EXTRA'}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] font-bold border-blue-500/40 bg-blue-500/10 text-blue-300">
                      {getLineTypeLabel(lineType)}
                    </Badge>
                  </div>
                </div>

                {/* Interactive Ordered Route Visualizer */}
                <div className="p-3.5 bg-slate-800/60 rounded-xl border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>Route Sequence ({fullRouteStops.length} Stops)</span>
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  </div>

                  {fullRouteStops.length > 0 ? (
                    <div className="space-y-2 relative pl-3.5 border-l-2 border-slate-700">
                      {fullRouteStops.map((stop, idx) => (
                        <div key={idx} className="relative flex items-center justify-between text-xs">
                          <div className={cn(
                            "absolute -left-[19px] w-2.5 h-2.5 rounded-full border-2 bg-slate-900",
                            stop.stopType === 'Pickup' && "border-emerald-500 bg-emerald-500",
                            stop.stopType === 'Via' && "border-amber-400 bg-amber-400",
                            stop.stopType === 'Dropoff' && "border-rose-500 bg-rose-500"
                          )} />
                          <span className="font-bold text-slate-200 truncate max-w-[180px]">{stop.name}</span>
                          <span className="text-[10px] font-semibold text-slate-400 uppercase">{stop.stopType}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-slate-500 text-xs italic">Select pickup & dropoff locations</div>
                  )}
                </div>

                {/* Validity Period Summary */}
                <div className="flex items-center justify-between text-slate-400 text-xs px-1">
                  <span className="flex items-center gap-1"><Calendar size={12} /> Validity:</span>
                  <span className="font-semibold text-slate-200">
                    {validFrom || validTo ? `${validFrom || 'Start'} → ${validTo || 'Ongoing'}` : 'Ongoing Contract'}
                  </span>
                </div>

              </CardContent>
            </Card>

            {/* Sidebar Execution Actions Card */}
            <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-2xs bg-white dark:bg-slate-900 p-4 space-y-3">
              <Button
                type="submit"
                disabled={saveMutation.isPending}
                className="w-full h-11 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl shadow-md cursor-pointer transition-all hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                <span>{saveMutation.isPending ? 'Saving Record...' : (isEdit ? 'Save Quotation Changes' : 'Create Commercial Agreement')}</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(isEdit && id ? `/quotations/${id}` : '/quotations')}
                className="w-full h-9 text-xs font-bold border-slate-200 dark:border-slate-800 rounded-xl"
              >
                Cancel
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

