import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Building2,
  MapPin,
  Plus,
  Trash2,
  Copy,
  Calendar,
  Banknote,
  Loader2,
  Sparkles,
  AlertCircle,
  Hash,
  CheckCircle2,
  Layers,
  FileText,
  Truck,
  ArrowRight,
  HelpCircle
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

export interface QuotationLineItem {
  id: string;
  originLocationId: string;
  destinationLocationId: string;
  vehicleClass: string;
  operationType: 'MONTHLY' | 'EXTRA';
  lineType: string;
  pricingBasis: 'PER_TRIP' | 'PER_MONTH' | 'NULL';
  rate: string;
  driverPayout: string;
  currency: string;
  sourceVehicleLabel: string;
  viaStops: Array<{ id: string; locationId: string }>;
}

const VEHICLE_CLASSES = ['3-4 TON', '5 TON', '10 TON', '20 TON', '40 FEET'];

const createEmptyLine = (overrides?: Partial<QuotationLineItem>): QuotationLineItem => ({
  id: `line-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
  originLocationId: '',
  destinationLocationId: '',
  vehicleClass: '10 TON',
  operationType: 'EXTRA',
  lineType: 'SINGLE_TRIP',
  pricingBasis: 'NULL',
  rate: '',
  driverPayout: '',
  currency: 'SAR',
  sourceVehicleLabel: '',
  viaStops: [],
  ...overrides,
});

export default function AddQuotationPage({ isEdit = false }: { isEdit?: boolean }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const prefilledCustomerId = searchParams.get('customer_id') || '';
  const prefilledCustomerName = searchParams.get('customer_name') || '';

  // Master Agreement Form State
  const [customerId, setCustomerId] = useState(prefilledCustomerId);
  const [agreementTitle, setAgreementTitle] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validTo, setValidTo] = useState('');
  const [changeReason, setChangeReason] = useState('');

  // Multi-Line Rate Items Array
  const [lineItems, setLineItems] = useState<QuotationLineItem[]>([createEmptyLine()]);

  const [formError, setFormError] = useState<string | null>(null);

  // Fetch Customers lookup
  const { data: customersRes } = useQuery({
    queryKey: ['customers-select'],
    queryFn: () => customerService.getAll({ per_page: 200, mode: 'lookup' }),
  });
  const customers = customersRes?.data || [];
  const selectedCustomer = customers.find((c) => c.id === customerId);

  // Fetch Locations lookup for route labels
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

  // Populate state from existing quotation when editing
  useEffect(() => {
    if (!isEdit || !existingQuotation) return;
    setCustomerId(existingQuotation.customerId || '');
    setValidFrom(existingQuotation.valid_from ? existingQuotation.valid_from.substring(0, 10) : '');
    setValidTo(existingQuotation.valid_to ? existingQuotation.valid_to.substring(0, 10) : '');

    const originId = existingQuotation.origin_location_id || '';
    const destId = existingQuotation.destination_location_id || '';

    // Extract intermediate stops
    const restStops = (existingQuotation.stops || [])
      .filter((s) => s.stop_type !== 'Pickup' && s.stop_type !== 'Dropoff')
      .map((s, idx) => ({ id: `via-${idx}`, locationId: s.locationId || '' }));

    setLineItems([
      {
        id: `edit-${existingQuotation.id}`,
        originLocationId: originId,
        destinationLocationId: destId,
        vehicleClass: existingQuotation.vehicle_class || '10 TON',
        operationType: (existingQuotation.billing_type as 'MONTHLY' | 'EXTRA') || 'EXTRA',
        lineType: existingQuotation.line_type || 'SINGLE_TRIP',
        pricingBasis: (existingQuotation.pricing_basis as any) || 'NULL',
        rate: String(existingQuotation.rate || ''),
        driverPayout: String(existingQuotation.driver_payout || ''),
        currency: existingQuotation.currency || 'SAR',
        sourceVehicleLabel: existingQuotation.source_vehicle_label || '',
        viaStops: restStops,
      },
    ]);
  }, [isEdit, existingQuotation]);

  // Line Item Handlers
  const handleAddLine = () => {
    setLineItems((prev) => [...prev, createEmptyLine()]);
  };

  const handleDuplicateLine = (index: number) => {
    const lineToCopy = lineItems[index];
    const duplicatedLine = createEmptyLine({
      ...lineToCopy,
      id: `line-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    });
    setLineItems((prev) => [...prev.slice(0, index + 1), duplicatedLine, ...prev.slice(index + 1)]);
    toast.success(`Duplicated Line #${index + 1}`);
  };

  const handleRemoveLine = (index: number) => {
    if (lineItems.length <= 1) {
      toast.error('Agreement must contain at least one commercial rate line');
      return;
    }
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateLine = (index: number, key: keyof QuotationLineItem, value: any) => {
    setLineItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [key]: value };
      return copy;
    });
  };

  // Intermediate Stop Handlers per Line
  const handleAddViaStop = (lineIndex: number) => {
    setLineItems((prev) => {
      const copy = [...prev];
      const line = copy[lineIndex];
      line.viaStops = [...line.viaStops, { id: `via-${Date.now()}`, locationId: '' }];
      return copy;
    });
  };

  const handleRemoveViaStop = (lineIndex: number, viaIndex: number) => {
    setLineItems((prev) => {
      const copy = [...prev];
      const line = copy[lineIndex];
      line.viaStops = line.viaStops.filter((_, i) => i !== viaIndex);
      return copy;
    });
  };

  const handleUpdateViaStop = (lineIndex: number, viaIndex: number, locationId: string) => {
    setLineItems((prev) => {
      const copy = [...prev];
      const line = copy[lineIndex];
      line.viaStops[viaIndex].locationId = locationId;
      return copy;
    });
  };

  // Financial Metrics Calculation across all lines
  const financialTotals = useMemo(() => {
    let totalRate = 0;
    let totalPayout = 0;
    let validLinesCount = 0;

    lineItems.forEach((item) => {
      const r = parseFloat(item.rate) || 0;
      const p = parseFloat(item.driverPayout) || 0;
      if (r > 0) validLinesCount++;
      totalRate += r;
      totalPayout += p;
    });

    const netMargin = totalRate - totalPayout;
    const marginPercent = totalRate > 0 ? (netMargin / totalRate) * 100 : 0;

    return { totalRate, totalPayout, netMargin, marginPercent, validLinesCount };
  }, [lineItems]);

  // Form Validation
  const validateForm = () => {
    if (!customerId) {
      setFormError('Please select a customer for this agreement.');
      return false;
    }

    for (let i = 0; i < lineItems.length; i++) {
      const item = lineItems[i];
      if (!item.originLocationId) {
        setFormError(`Line #${i + 1}: Origin pickup location is required.`);
        return false;
      }
      if (!item.destinationLocationId) {
        setFormError(`Line #${i + 1}: Destination dropoff location is required.`);
        return false;
      }
      const numRate = parseFloat(item.rate);
      if (isNaN(numRate) || numRate <= 0) {
        setFormError(`Line #${i + 1}: Enter a valid agreed rate greater than 0.`);
        return false;
      }
    }

    setFormError(null);
    return true;
  };

  // Batch Save Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (isEdit && id) {
        // Single quotation update
        const line = lineItems[0];
        const payload: CreateQuotationPayload = {
          customerId,
          origin_location_id: line.originLocationId,
          destination_location_id: line.destinationLocationId,
          vehicle_class: line.vehicleClass,
          billing_type: line.operationType,
          line_type: line.lineType,
          pricing_basis: line.pricingBasis !== 'NULL' ? line.pricingBasis : undefined,
          rate: parseFloat(line.rate),
          driver_payout: line.driverPayout ? parseFloat(line.driverPayout) : undefined,
          currency: line.currency,
          source_vehicle_label: line.sourceVehicleLabel || line.vehicleClass,
          valid_from: validFrom || undefined,
          valid_to: validTo || undefined,
          stops: [
            ...(line.originLocationId ? [{ sequence: 1, locationId: line.originLocationId, stop_type: 'Pickup' as const }] : []),
            ...line.viaStops.map((v, i) => ({ sequence: i + 2, locationId: v.locationId, stop_type: 'Rest' as const })),
            ...(line.destinationLocationId ? [{ sequence: line.viaStops.length + 2, locationId: line.destinationLocationId, stop_type: 'Dropoff' as const }] : []),
          ],
        };
        return await quotationService.update(id, payload);
      } else {
        // Create multiple rate lines in parallel for customer
        const requests = lineItems.map((line) => {
          const payload: CreateQuotationPayload = {
            customerId,
            origin_location_id: line.originLocationId,
            destination_location_id: line.destinationLocationId,
            vehicle_class: line.vehicleClass,
            billing_type: line.operationType,
            line_type: line.lineType,
            pricing_basis: line.pricingBasis !== 'NULL' ? line.pricingBasis : undefined,
            rate: parseFloat(line.rate),
            driver_payout: line.driverPayout ? parseFloat(line.driverPayout) : undefined,
            currency: line.currency,
            source_vehicle_label: line.sourceVehicleLabel || line.vehicleClass,
            valid_from: validFrom || undefined,
            valid_to: validTo || undefined,
            stops: [
              ...(line.originLocationId ? [{ sequence: 1, locationId: line.originLocationId, stop_type: 'Pickup' as const }] : []),
              ...line.viaStops.map((v, i) => ({ sequence: i + 2, locationId: v.locationId, stop_type: 'Rest' as const })),
              ...(line.destinationLocationId ? [{ sequence: line.viaStops.length + 2, locationId: line.destinationLocationId, stop_type: 'Dropoff' as const }] : []),
            ],
          };
          return quotationService.create(payload);
        });

        return await Promise.all(requests);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      toast.success(
        isEdit
          ? 'Quotation updated successfully'
          : `Successfully created ${lineItems.length} commercial rate line${lineItems.length > 1 ? 's' : ''}`
      );
      navigate('/quotations');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error?.message || err.message || 'Failed to save agreement rates';
      setFormError(msg);
      toast.error(msg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    saveMutation.mutate();
  };

  // Keyboard shortcut Ctrl + Enter to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (validateForm() && !saveMutation.isPending) {
          saveMutation.mutate();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveMutation, customerId, lineItems, validFrom, validTo]);

  return (
    <DashboardLayout active="Quotations" title={isEdit ? 'Edit Quotation' : 'New Commercial Agreement'} hideBackButton={true}>
      <form onSubmit={handleSubmit} className="px-3 sm:px-5 pb-8 w-full max-w-[1600px] mx-auto animate-fade-in space-y-4">
        
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
              {isEdit ? 'Edit Commercial Quotation' : 'Create Customer Commercial Agreement'}
            </h1>
            
            <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 font-extrabold text-[11px] px-2.5 py-0.5">
              Commercial Contract Matrix
            </Badge>

            <div className="flex items-center gap-1 px-2.5 py-0.5 bg-[#3E3C3D] text-white rounded-lg font-mono font-black text-xs shadow-2xs border border-white/10">
              <Hash className="w-3.5 h-3.5 text-[#FA634E]" />
              <span>{quotationRefId}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate(isEdit && id ? `/quotations/${id}` : '/quotations')}
              className="h-8.5 text-xs font-bold border-slate-200 dark:border-slate-800 rounded-xl px-3.5"
            >
              Cancel
            </Button>
            
            <Button
              type="submit"
              disabled={saveMutation.isPending}
              size="sm"
              className="h-8.5 px-4 text-xs font-extrabold text-white bg-[#FA634E] hover:bg-[#DF4834] shadow-xs shadow-[#FA634E]/25 rounded-xl transition-all hover:scale-[1.01] active:scale-95 gap-1.5 cursor-pointer border-0"
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              <span>{saveMutation.isPending ? 'Saving...' : `Save Agreement (${lineItems.length} Lines)`}</span>
            </Button>
          </div>
        </div>

        {formError && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-semibold rounded-xl border border-rose-200 dark:border-rose-900/60 flex items-center gap-2 shadow-2xs">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {/* Master Header Card: Customer & Contract Validity */}
        <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden bg-white dark:bg-slate-900">
          <CardHeader className="bg-slate-50/70 dark:bg-slate-800/40 py-2.5 px-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-[#FA634E]" />
              Master Agreement Header
            </CardTitle>
            <span className="text-[11px] font-bold text-slate-400">Common Contract Terms</span>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
              
              {/* Customer Selector */}
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs font-bold text-slate-900 dark:text-slate-100">Customer *</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger className="h-9 text-xs bg-white dark:bg-slate-900 font-bold border-slate-200 dark:border-slate-800 rounded-xl">
                    <SelectValue placeholder="Select customer company..." />
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

              {/* Valid From */}
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Valid From</Label>
                <Input
                  type="date"
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                  className="h-9 text-xs bg-white dark:bg-slate-900 font-medium rounded-xl border-slate-200 dark:border-slate-800 px-2.5"
                />
              </div>

              {/* Valid Until */}
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Valid Until</Label>
                <Input
                  type="date"
                  value={validTo}
                  onChange={(e) => setValidTo(e.target.value)}
                  className="h-9 text-xs bg-white dark:bg-slate-900 font-medium rounded-xl border-slate-200 dark:border-slate-800 px-2.5"
                />
              </div>

            </div>
          </CardContent>
        </Card>

        {/* Commercial Rate Lines Matrix / Multi-Line Ledger */}
        <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden bg-white dark:bg-slate-900">
          <CardHeader className="bg-slate-50/70 dark:bg-slate-800/40 py-3 px-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-emerald-600" />
              <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                Commercial Rate Lines ({lineItems.length} Routes)
              </CardTitle>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={handleAddLine}
                className="h-8 px-3 text-xs font-extrabold text-[#FA634E] bg-[#FA634E]/10 hover:bg-[#FA634E]/20 border border-[#FA634E]/30 rounded-xl gap-1.5 cursor-pointer transition-all"
              >
                <Plus size={14} /> + Add Commercial Line
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="p-4 space-y-4">
            {lineItems.map((line, index) => {
              const numRate = parseFloat(line.rate) || 0;
              const numPayout = parseFloat(line.driverPayout) || 0;
              const margin = numRate - numPayout;

              return (
                <div
                  key={line.id}
                  className="p-3.5 bg-slate-50/70 dark:bg-slate-800/30 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 space-y-3 transition-all hover:border-[#FA634E]/30"
                >
                  {/* Line Row Header Bar */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-[#3E3C3D] text-white text-[11px] font-mono font-black">
                        #{index + 1}
                      </span>
                      <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                        Commercial Route Line #{index + 1}
                      </span>
                      {numRate > 0 && (
                        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-bold">
                          Margin: {line.currency} {margin.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleDuplicateLine(index)}
                        title="Duplicate Line"
                        className="px-2.5 py-1 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center gap-1 transition-all"
                      >
                        <Copy size={12} />
                        <span>Duplicate</span>
                      </button>

                      {lineItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(index)}
                          title="Remove Line"
                          className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors rounded-lg"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Line Fields Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    
                    {/* Pickup Origin (3 cols) */}
                    <div className="md:col-span-3 space-y-1">
                      <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
                        Origin (Pickup) *
                      </span>
                      <LocationCombobox
                        customerId={customerId}
                        value={line.originLocationId}
                        onChange={(val, loc) => {
                          handleUpdateLine(index, 'originLocationId', val);
                          if (loc?.customerId && !customerId) setCustomerId(loc.customerId);
                        }}
                        placeholder="Select origin location..."
                      />
                    </div>

                    {/* Dropoff Destination (3 cols) */}
                    <div className="md:col-span-3 space-y-1">
                      <span className="text-[10px] font-extrabold text-rose-700 dark:text-rose-400 uppercase tracking-wider block">
                        Destination (Dropoff) *
                      </span>
                      <LocationCombobox
                        customerId={customerId}
                        value={line.destinationLocationId}
                        onChange={(val, loc) => {
                          handleUpdateLine(index, 'destinationLocationId', val);
                          if (loc?.customerId && !customerId) setCustomerId(loc.customerId);
                        }}
                        placeholder="Select dropoff location..."
                      />
                    </div>

                    {/* Vehicle Class Dropdown (2 cols) */}
                    <div className="md:col-span-2 space-y-1">
                      <Label className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Vehicle Class *</Label>
                      <Select
                        value={line.vehicleClass}
                        onValueChange={(val) => handleUpdateLine(index, 'vehicleClass', val)}
                      >
                        <SelectTrigger className="h-9 text-xs bg-white dark:bg-slate-900 font-bold border-slate-200 dark:border-slate-800 rounded-xl">
                          <SelectValue placeholder="Vehicle Class" />
                        </SelectTrigger>
                        <SelectContent className="z-[9999]">
                          {VEHICLE_CLASSES.map((vc) => (
                            <SelectItem key={vc} value={vc} className="text-xs font-semibold">
                              {vc}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Operation Type Dropdown (Monthly / Extra) (2 cols) */}
                    <div className="md:col-span-2 space-y-1">
                      <Label className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Operation Type *</Label>
                      <Select
                        value={line.operationType}
                        onValueChange={(val) => handleUpdateLine(index, 'operationType', val as any)}
                      >
                        <SelectTrigger className="h-9 text-xs bg-white dark:bg-slate-900 font-extrabold border-slate-200 dark:border-slate-800 rounded-xl">
                          <SelectValue placeholder="Operation Type" />
                        </SelectTrigger>
                        <SelectContent className="z-[9999]">
                          <SelectItem value="MONTHLY" className="text-xs font-bold text-emerald-600">MONTHLY</SelectItem>
                          <SelectItem value="EXTRA" className="text-xs font-bold text-blue-600">EXTRA</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Line Type (2 cols) */}
                    <div className="md:col-span-2 space-y-1">
                      <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Line Type *</Label>
                      <Select
                        value={line.lineType}
                        onValueChange={(val) => handleUpdateLine(index, 'lineType', val)}
                      >
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

                  </div>

                  {/* Financial Inputs Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1 border-t border-slate-200/40 dark:border-slate-800">
                    
                    {/* Agreed Rate */}
                    <div className="sm:col-span-2 space-y-1">
                      <Label className="text-[11px] font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                        <Banknote className="h-3.5 w-3.5 text-[#FA634E]" /> Agreed Billing Rate *
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          step="0.01"
                          value={line.rate}
                          onChange={(e) => handleUpdateLine(index, 'rate', e.target.value)}
                          placeholder="e.g. 1550.00"
                          className="h-8.5 text-xs bg-white dark:bg-slate-900 font-black rounded-xl border-slate-200 dark:border-slate-800 flex-1"
                        />
                        <Select
                          value={line.currency}
                          onValueChange={(val) => handleUpdateLine(index, 'currency', val)}
                        >
                          <SelectTrigger className="h-8.5 w-20 text-xs bg-white dark:bg-slate-900 font-extrabold border-slate-200 dark:border-slate-800 rounded-xl">
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

                    {/* Driver Charge / Payout */}
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                        Driver Charge / Payout
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={line.driverPayout}
                        onChange={(e) => handleUpdateLine(index, 'driverPayout', e.target.value)}
                        placeholder="e.g. 350.00"
                        className="h-8.5 text-xs bg-white dark:bg-slate-900 font-extrabold rounded-xl border-slate-200 dark:border-slate-800"
                      />
                    </div>

                    {/* Pricing Basis */}
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Pricing Basis</Label>
                      <Select
                        value={line.pricingBasis}
                        onValueChange={(val) => handleUpdateLine(index, 'pricingBasis', val as any)}
                      >
                        <SelectTrigger className="h-8.5 text-xs bg-white dark:bg-slate-900 font-semibold border-slate-200 dark:border-slate-800 rounded-xl">
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

                </div>
              );
            })}

            {/* Bottom Add Line Trigger Bar */}
            <div className="pt-2 flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={handleAddLine}
                className="h-9 px-4 text-xs font-extrabold border-dashed border-[#FA634E]/40 text-[#FA634E] hover:bg-[#FA634E]/10 rounded-xl gap-2 cursor-pointer"
              >
                <Plus size={14} /> + Add Another Commercial Line
              </Button>

              <span className="text-[11px] text-slate-400 font-semibold">
                Tip: Each line creates a distinct route rate entry under the agreement
              </span>
            </div>

          </CardContent>
        </Card>

        {/* Master Bottom Ledger Financial Summary & Batch Execution Bar */}
        <Card className="rounded-2xl border-[#3E3C3D] shadow-xl bg-[#3E3C3D] text-[#EEF1F6] p-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            
            {/* Financial Overview Spotlight */}
            <div className="flex flex-wrap items-center gap-6 text-xs">
              <div>
                <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Total Rate Lines</div>
                <div className="text-lg font-black text-white">{lineItems.length} Routes</div>
              </div>

              <div className="h-8 w-px bg-white/10 hidden sm:block" />

              <div>
                <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Total Combined Agreed Value</div>
                <div className="text-lg font-black text-[#FA634E]">
                  SAR {financialTotals.totalRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>

              <div className="h-8 w-px bg-white/10 hidden sm:block" />

              <div>
                <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Total Estimated Margin</div>
                <div className="text-lg font-black text-emerald-400">
                  SAR {financialTotals.netMargin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  <span className="text-xs font-semibold text-emerald-300/80 ml-1.5">
                    ({financialTotals.marginPercent.toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>

            {/* Action Execution Button */}
            <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/quotations')}
                className="h-10 text-xs font-bold border-white/20 text-white hover:bg-white/10 rounded-xl px-4"
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={saveMutation.isPending}
                className="h-10 px-6 text-xs font-black text-white bg-[#FA634E] hover:bg-[#DF4834] shadow-md shadow-[#FA634E]/25 rounded-xl transition-all hover:scale-[1.01] active:scale-95 gap-2 cursor-pointer border-0 uppercase tracking-wider"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                <span>{saveMutation.isPending ? 'Creating Lines...' : `Save Agreement (${lineItems.length} Lines)`}</span>
              </Button>
            </div>

          </div>
        </Card>

      </form>
    </DashboardLayout>
  );
}
