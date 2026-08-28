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
  X,
  FileCheck2,
  TrendingUp,
  Receipt
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export interface QuotationLineItem {
  id: string;
  originLocationId: string;
  destinationLocationId: string;
  vehicleClass: string;
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

  // Master Agreement Form State
  const [customerId, setCustomerId] = useState(prefilledCustomerId);
  const [operationType, setOperationType] = useState<'MONTHLY' | 'EXTRA'>('EXTRA');
  const [validFrom, setValidFrom] = useState('');
  const [validTo, setValidTo] = useState('');

  // Multi-Line Rate Items Array
  const [lineItems, setLineItems] = useState<QuotationLineItem[]>([createEmptyLine()]);

  const [formError, setFormError] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Fetch Customers lookup
  const { data: customersRes } = useQuery({
    queryKey: ['customers-select'],
    queryFn: () => customerService.getAll({ per_page: 200, mode: 'lookup' }),
  });
  const customers = customersRes?.data || [];

  // Fetch Locations lookup for route labels
  const { data: locationsRes } = useQuery({
    queryKey: ['locations-lookup-all'],
    queryFn: () => locationService.getAll(),
  });

  const locationMap = useMemo(() => {
    const map = new Map<string, string>();
    (locationsRes?.data || []).forEach((l) => {
      map.set(l.id, `${l.code} — ${l.name}`);
    });
    return map;
  }, [locationsRes?.data]);

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
    setOperationType((existingQuotation.billing_type as 'MONTHLY' | 'EXTRA') || 'EXTRA');
    setValidFrom(existingQuotation.valid_from ? existingQuotation.valid_from.substring(0, 10) : '');
    setValidTo(existingQuotation.valid_to ? existingQuotation.valid_to.substring(0, 10) : '');

    const originId = existingQuotation.originLocationId || (existingQuotation as any).origin_location_id || '';
    const destId = existingQuotation.destinationLocationId || (existingQuotation as any).destination_location_id || '';

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
      viaStops: lineToCopy.viaStops.map((v) => ({ ...v, id: `via-${Date.now()}-${Math.random()}` })),
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
    setLineItems((prev) =>
      prev.map((line, i) => (i === index ? { ...line, [key]: value } : line))
    );
  };

  // Intermediate Via-Stop Handlers per Line (Strictly Immutable to prevent double-adds)
  const handleAddViaStop = (lineIndex: number) => {
    setLineItems((prev) =>
      prev.map((line, idx) =>
        idx === lineIndex
          ? {
              ...line,
              viaStops: [
                ...line.viaStops,
                { id: `via-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`, locationId: '' },
              ],
            }
          : line
      )
    );
  };

  const handleRemoveViaStop = (lineIndex: number, viaIndex: number) => {
    setLineItems((prev) =>
      prev.map((line, idx) =>
        idx === lineIndex
          ? {
              ...line,
              viaStops: line.viaStops.filter((_, i) => i !== viaIndex),
            }
          : line
      )
    );
  };

  const handleUpdateViaStop = (lineIndex: number, viaIndex: number, locationId: string) => {
    setLineItems((prev) =>
      prev.map((line, idx) =>
        idx === lineIndex
          ? {
              ...line,
              viaStops: line.viaStops.map((via, i) => (i === viaIndex ? { ...via, locationId } : via)),
            }
          : line
      )
    );
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
    const avgRate = lineItems.length > 0 ? totalRate / lineItems.length : 0;

    return { totalRate, totalPayout, netMargin, avgRate, validLinesCount };
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
          billing_type: operationType,
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
            billing_type: operationType,
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
      setIsPreviewOpen(false);
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
    setIsPreviewOpen(true);
  };

  // Keyboard shortcut Ctrl + Enter to open preview
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (validateForm()) {
          setIsPreviewOpen(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [customerId, operationType, lineItems, validFrom, validTo]);

  return (
    <DashboardLayout active="Quotations" title={isEdit ? 'Edit Quotation' : 'New Commercial Agreement'} hideBackButton={true}>
      <form onSubmit={handleSubmit} className="px-3 sm:px-6 pb-10 w-full max-w-[1600px] mx-auto animate-fade-in space-y-3.5">
        
        {/* Page Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
              {isEdit ? 'Edit Commercial Quotation' : 'Create Commercial Agreement'}
            </h1>

            <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-lg font-mono font-black text-xs shadow-2xs">
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
              className="h-8.5 text-xs font-bold border-slate-200 dark:border-slate-800 rounded-xl px-4"
            >
              Cancel
            </Button>
            
            <Button
              type="submit"
              size="sm"
              className="h-8.5 px-4.5 text-xs font-black text-white bg-[#FA634E] hover:bg-[#DF4834] shadow-md shadow-[#FA634E]/20 rounded-xl transition-all hover:scale-[1.01] active:scale-95 gap-1.5 cursor-pointer border-0"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Save Agreement ({lineItems.length} Lines)</span>
            </Button>
          </div>
        </div>

        {formError && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-semibold rounded-xl border border-rose-200 dark:border-rose-900/60 flex items-center gap-2 shadow-2xs">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {/* Split View Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          
          {/* LEFT PANEL (5 Columns): Master Contract Setup & Integrated Financial Summary */}
          <div className="lg:col-span-5 space-y-3 lg:sticky lg:top-4">
            
            <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden bg-white dark:bg-slate-900">
              <CardHeader className="bg-slate-50/70 dark:bg-slate-800/40 py-2.5 px-4 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5 text-[#FA634E]" />
                  01 · Master Contract Parameters
                </CardTitle>
              </CardHeader>

              <CardContent className="p-4 space-y-4">
                
                {/* Customer Picker */}
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-900 dark:text-slate-100">Customer Company *</Label>
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

                {/* Operation Type Selector */}
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-900 dark:text-slate-100">Operation Type *</Label>
                  <Select
                    value={operationType}
                    onValueChange={(val) => setOperationType(val as any)}
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

                {/* Contract Validity Range */}
                <div className="grid grid-cols-2 gap-2.5 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Valid From</Label>
                    <Input
                      type="date"
                      value={validFrom}
                      onChange={(e) => setValidFrom(e.target.value)}
                      className="h-8.5 text-xs bg-white dark:bg-slate-900 font-medium rounded-xl border-slate-200 dark:border-slate-800 px-2.5"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Valid Until</Label>
                    <Input
                      type="date"
                      value={validTo}
                      onChange={(e) => setValidTo(e.target.value)}
                      className="h-8.5 text-xs bg-white dark:bg-slate-900 font-medium rounded-xl border-slate-200 dark:border-slate-800 px-2.5"
                    />
                  </div>
                </div>

                {/* Clean Light Summary Spotlight Footer */}
                <div className="pt-2">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60 space-y-2.5">
                    <div className="flex items-center justify-between text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                      <span>Agreement Live Metrics</span>
                      <Sparkles className="w-3.5 h-3.5 text-[#FA634E]" />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/60 dark:border-slate-800">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Routes Defined</div>
                        <div className="text-lg font-mono font-black text-slate-900 dark:text-white">
                          {lineItems.length} {lineItems.length === 1 ? 'Route' : 'Routes'}
                        </div>
                      </div>

                      <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/60 dark:border-slate-800">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Total Agreed Value</div>
                        <div className="text-lg font-mono font-black text-[#FA634E]">
                          SAR {financialTotals.totalRate.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </CardContent>
            </Card>

          </div>

          {/* RIGHT PANEL (7 Columns): Commercial Rate Lines Matrix Builder */}
          <div className="lg:col-span-7 space-y-3">
            
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-emerald-600" />
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  02 · Commercial Rate Lines Matrix ({lineItems.length} Defined Routes)
                </h2>
              </div>
              
              <Button
                type="button"
                size="sm"
                onClick={handleAddLine}
                className="h-8 px-3.5 text-xs font-extrabold text-[#FA634E] bg-[#FA634E]/10 hover:bg-[#FA634E]/20 border border-[#FA634E]/30 rounded-xl gap-1.5 cursor-pointer transition-all"
              >
                <Plus size={14} /> Add Commercial Line
              </Button>
            </div>

            {/* Rate Line Cards Stack */}
            {lineItems.map((line, index) => {
              const numRate = parseFloat(line.rate) || 0;

              return (
                <div
                  key={line.id}
                  className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3 transition-all hover:border-[#FA634E]/30"
                >
                  {/* Line Item Header Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-[#3E3C3D] text-white text-[11px] font-mono font-black">
                        #{index + 1}
                      </span>
                      <span className="text-xs font-black text-slate-900 dark:text-slate-100">
                        Commercial Route Line #{index + 1}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddViaStop(index)}
                        className="h-7 text-xs font-bold border-dashed border-[#FA634E]/40 text-[#FA634E] hover:bg-[#FA634E]/10 px-2.5 rounded-lg gap-1 cursor-pointer"
                      >
                        <Plus size={12} /> Add Intermediate Stop
                      </Button>

                      <button
                        type="button"
                        onClick={() => handleDuplicateLine(index)}
                        title="Duplicate Line"
                        className="px-2.5 py-1 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center gap-1 transition-all"
                      >
                        <Copy size={12} />
                        <span>Duplicate</span>
                      </button>

                      {lineItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(index)}
                          title="Remove Line"
                          className="p-1 text-slate-400 hover:text-rose-600 transition-colors rounded-lg"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Route & Specifications Fields Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                    
                    {/* Pickup Origin */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
                        01 Pickup Origin *
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

                    {/* Dropoff Destination */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-extrabold text-rose-700 dark:text-rose-400 uppercase tracking-wider block">
                        02 Dropoff Destination *
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

                  </div>

                  {/* Vehicle Class & Line Type Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Vehicle Class Dropdown */}
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Vehicle Class *</Label>
                      <Select
                        value={line.vehicleClass}
                        onValueChange={(val) => handleUpdateLine(index, 'vehicleClass', val)}
                      >
                        <SelectTrigger className="h-8.5 text-xs bg-white dark:bg-slate-900 font-bold border-slate-200 dark:border-slate-800 rounded-xl">
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

                    {/* Line Type */}
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Line Type *</Label>
                      <Select
                        value={line.lineType}
                        onValueChange={(val) => handleUpdateLine(index, 'lineType', val)}
                      >
                        <SelectTrigger className="h-8.5 text-xs bg-white dark:bg-slate-900 font-semibold border-slate-200 dark:border-slate-800 rounded-xl">
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

                  {/* Dynamic Intermediate Via-Stops */}
                  {line.viaStops.length > 0 && (
                    <div className="space-y-2 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                      <div className="flex items-center justify-between text-[10px] font-extrabold text-[#FA634E] uppercase">
                        <span>Intermediate Stops ({line.viaStops.length} stops)</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAddViaStop(index)}
                          className="h-6 text-[10px] font-bold text-[#FA634E] hover:bg-[#FA634E]/10 px-2 rounded-lg gap-1"
                        >
                          <Plus size={10} /> Add Stop
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {line.viaStops.map((via, viaIdx) => (
                          <div key={via.id} className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-lg border border-slate-200/80 dark:border-slate-800">
                            <span className="text-[10px] font-bold text-[#FA634E] shrink-0">Via #{viaIdx + 1}</span>
                            <div className="flex-1 min-w-0">
                              <LocationCombobox
                                customerId={customerId}
                                value={via.locationId}
                                onChange={(val, loc) => {
                                  handleUpdateViaStop(index, viaIdx, val);
                                  if (loc?.customerId && !customerId) setCustomerId(loc.customerId);
                                }}
                                placeholder="Select intermediate stop..."
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveViaStop(index, viaIdx)}
                              className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Financial Inputs Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                    
                    {/* Agreed Rate */}
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                        <Banknote className="h-3.5 w-3.5 text-[#FA634E]" /> Agreed Rate *
                      </Label>
                      <div className="flex gap-1.5">
                        <Input
                          type="number"
                          step="0.01"
                          value={line.rate}
                          onChange={(e) => handleUpdateLine(index, 'rate', e.target.value)}
                          placeholder="e.g. 1550"
                          className="h-8.5 text-xs bg-white dark:bg-slate-900 font-black rounded-xl border-slate-200 dark:border-slate-800 flex-1"
                        />
                        <Select
                          value={line.currency}
                          onValueChange={(val) => handleUpdateLine(index, 'currency', val)}
                        >
                          <SelectTrigger className="h-8.5 w-16 text-xs bg-white dark:bg-slate-900 font-extrabold border-slate-200 dark:border-slate-800 rounded-xl px-2">
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
                        Driver Payout
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={line.driverPayout}
                        onChange={(e) => handleUpdateLine(index, 'driverPayout', e.target.value)}
                        placeholder="e.g. 350"
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

            {/* Bottom Add Line & Keyboard Shortcut Bar */}
            <div className="pt-2 flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={handleAddLine}
                className="h-9 px-4 text-xs font-extrabold border-dashed border-[#FA634E]/40 text-[#FA634E] hover:bg-[#FA634E]/10 rounded-xl gap-2 cursor-pointer"
              >
                <Plus size={14} /> Add Another Commercial Line
              </Button>

              <div className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                <span>Press</span>
                <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-mono font-bold border border-slate-200 dark:border-slate-700">Ctrl + Enter</kbd>
                <span>to preview agreement</span>
              </div>
            </div>

          </div>

        </div>

      </form>

      {/* Agreement Confirmation & Rate Matrix Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-3xl rounded-2xl p-0 overflow-hidden border-slate-200 dark:border-slate-800 shadow-2xl z-[9999]">
          <DialogHeader className="bg-slate-900 text-white dark:bg-slate-950 p-4 border-b border-slate-800 flex flex-row items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-[#FA634E]" />
                <DialogTitle className="text-base font-black text-white uppercase tracking-wider">
                  Commercial Agreement Summary &amp; Preview
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-slate-400 mt-0.5">
                Review contract parameters and commercial rate lines matrix before final submission.
              </DialogDescription>
            </div>
            
            <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 rounded-lg text-white font-mono font-black text-xs border border-slate-700">
              <Hash className="w-3.5 h-3.5 text-[#FA634E]" />
              <span>{quotationRefId}</span>
            </div>
          </DialogHeader>

          <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Master Parameters Summary Card */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase">Customer Company</div>
                <div className="font-extrabold text-slate-900 dark:text-white truncate">
                  {customers.find((c) => c.id === customerId)?.name || customerId}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase">Operation Type</div>
                <Badge className={cn('text-[10px] font-bold border-0 mt-0.5', operationType === 'MONTHLY' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800')}>
                  {operationType}
                </Badge>
              </div>

              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase">Validity Period</div>
                <div className="font-semibold text-slate-700 dark:text-slate-300">
                  {validFrom || 'Immediate'} → {validTo || 'Open-ended'}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase">Total Agreed Value</div>
                <div className="font-mono font-black text-[#FA634E] text-sm">
                  SAR {financialTotals.totalRate.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {/* Commercial Rate Lines Summary List */}
            <div className="space-y-2">
              <div className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center justify-between">
                <span>Defined Commercial Routes ({lineItems.length} Lines)</span>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {lineItems.map((line, idx) => (
                  <div key={line.id} className="p-3 text-xs space-y-1.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="font-mono font-black px-1.5 py-0.5 bg-slate-900 text-white rounded text-[10px] shrink-0">
                          #{idx + 1}
                        </span>
                        <span className="font-extrabold text-slate-900 dark:text-white truncate">
                          {locationMap.get(line.originLocationId) || 'Origin'} → {locationMap.get(line.destinationLocationId) || 'Destination'}
                        </span>
                      </div>

                      <div className="font-mono font-black text-[#FA634E] text-sm shrink-0 ml-2">
                        {line.currency} {parseFloat(line.rate || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                      <Badge variant="outline" className="text-[10px] font-semibold">
                        Vehicle: {line.vehicleClass}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] font-semibold">
                        Line: {line.lineType}
                      </Badge>
                      {line.driverPayout && (
                        <span className="text-slate-600 dark:text-slate-400 font-medium">
                          Driver Payout: SAR {parseFloat(line.driverPayout).toLocaleString()}
                        </span>
                      )}
                      {line.viaStops.length > 0 && (
                        <span className="text-[#FA634E] font-bold">
                          +{line.viaStops.length} Intermediate Stop{line.viaStops.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex flex-row items-center justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPreviewOpen(false)}
              className="h-9 px-4 text-xs font-bold rounded-xl border-slate-200 dark:border-slate-700"
            >
              Back to Edit
            </Button>

            <Button
              type="button"
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
              className="h-9 px-5 text-xs font-black text-white bg-[#FA634E] hover:bg-[#DF4834] shadow-md shadow-[#FA634E]/25 rounded-xl gap-1.5 border-0 cursor-pointer"
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>{saveMutation.isPending ? 'Saving Record...' : `Confirm & Save Agreement (${lineItems.length} Lines)`}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
