import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Building2,
  Calculator,
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
  Receipt,
  Printer,
  Coins
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import LocationCombobox from '@/components/quotations/LocationCombobox';
import { QuotationPrintModal } from '@/components/quotations/QuotationPrintModal';
import { TaxonomySelect } from '@/components/common/TaxonomySelect';
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

export interface QuotationSurchargeRule {
  id: string;
  name: string;
  amount: string;
  unit: string;
}

const COMMON_SURCHARGE_PRESETS = [
  { name: 'Within City Same Day Delivery', amount: '75', unit: 'Per Delivery', label: '+ Same Day (75 SAR)' },
  { name: 'Labor Charges', amount: '125', unit: 'Per Person', label: '+ Labor (125 SAR)' },
  { name: 'Jack Trolley', amount: '100', unit: 'Per Trip', label: '+ Jack Trolley (100 SAR)' },
  { name: 'Waiting Hour Charge', amount: '50', unit: 'Per Hour', label: '+ Waiting Hour (50 SAR)' },
];

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

  // Commercial Surcharge Rules Array
  const [surchargeRules, setSurchargeRules] = useState<QuotationSurchargeRule[]>([]);

  const handleAddSurchargeRule = () => {
    setSurchargeRules((prev) => [
      ...prev,
      {
        id: `sur-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: '',
        amount: '',
        unit: 'Per Delivery',
      },
    ]);
  };

  const handleUpdateSurchargeRule = (id: string, field: keyof QuotationSurchargeRule, value: string) => {
    setSurchargeRules((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleRemoveSurchargeRule = (id: string) => {
    setSurchargeRules((prev) => prev.filter((item) => item.id !== id));
  };

  const [formError, setFormError] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Fetch Customers lookup
  const { data: customersRes } = useQuery({
    queryKey: ['customers-select'],
    queryFn: () => customerService.getAll({ per_page: 200, mode: 'lookup' }),
  });
  const customers = customersRes?.data || [];
  const selectedCustomerObj = customers.find((c) => c.id === customerId);

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

  // Formatted line items for official document print preview
  const printLineItems = useMemo(() => {
    return lineItems.map((line) => {
      const rawOrigin = locationMap.get(line.originLocationId) || '';
      const rawDest = locationMap.get(line.destinationLocationId) || '';
      const originName = rawOrigin.includes('—') ? rawOrigin.split('—')[1].trim() : rawOrigin || 'Origin';
      const destinationName = rawDest.includes('—') ? rawDest.split('—')[1].trim() : rawDest || 'Destination';
      return {
        originName,
        destinationName,
        vehicleClass: line.vehicleClass,
        rate: line.rate,
        driverPayout: line.driverPayout,
        lineType: line.lineType,
      };
    });
  }, [lineItems, locationMap]);

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

    const stopsArr = existingQuotation.stops || [];
    const pickupStop = stopsArr.find((s: any) => s.stop_type === 'Pickup' || s.sequence === 1) || stopsArr[0];
    const dropoffStops = stopsArr.filter((s: any) => s.stop_type === 'Dropoff');
    const dropoffStop = dropoffStops.length > 0 ? dropoffStops[dropoffStops.length - 1] : (stopsArr.length > 1 ? stopsArr[stopsArr.length - 1] : null);

    const originId = pickupStop?.locationId || (pickupStop as any)?.location_id || existingQuotation.originLocationId || (existingQuotation as any).origin_location_id || '';
    const destId = dropoffStop?.locationId || (dropoffStop as any)?.location_id || existingQuotation.destinationLocationId || (existingQuotation as any).destination_location_id || '';

    // Extract intermediate stops
    const restStops = stopsArr
      .filter((s: any) => s !== pickupStop && s !== dropoffStop)
      .map((s: any, idx: number) => ({ id: `via-${idx}`, locationId: s.locationId || (s as any).location_id || '' }));

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

  const isReturnToTrip = searchParams.get('return_to_trip') === 'true';

  // Populate state from search params if passed from /trips/new
  useEffect(() => {
    if (isEdit) return;

    const custId = searchParams.get('customer_id');
    const origId = searchParams.get('origin_id');
    const destId = searchParams.get('destination_id');
    const vClass = searchParams.get('vehicle_class');
    const lType = searchParams.get('line_type');
    const bType = searchParams.get('billing_type');
    const priceVal = searchParams.get('price');

    if (custId) setCustomerId(custId);
    if (bType) {
      const normB = bType.toUpperCase().includes('MONTHLY') ? 'MONTHLY' : 'EXTRA';
      setOperationType(normB);
    }

    if (origId || destId || vClass || lType || priceVal) {
      setLineItems([
        createEmptyLine({
          originLocationId: origId || '',
          destinationLocationId: destId || '',
          vehicleClass: vClass || '10 TON',
          lineType: lType || 'SINGLE_TRIP',
          rate: priceVal || '',
        }),
      ]);
    }
  }, [isEdit, searchParams]);

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

  // Commercial Agreement Setup Metrics
  const agreementSummaryMetrics = useMemo(() => {
    const lineTypeLabels: Record<string, string> = {
      SINGLE_TRIP: 'Single Trip',
      ROUND_TRIP: 'Round Trip',
      SHIFT_10H: '10h Shift',
      SHIFT_12H: '12h Shift',
    };

    const vehicleClassesList = Array.from(new Set(lineItems.map((l) => l.vehicleClass).filter(Boolean)));
    const lineTypesList = Array.from(new Set(lineItems.map((l) => lineTypeLabels[l.lineType] || l.lineType).filter(Boolean)));

    let validityText = 'Immediate / Open';
    if (validFrom && validTo) {
      const d1 = new Date(validFrom);
      const d2 = new Date(validTo);
      const diffDays = Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24));
      if (diffDays > 0) validityText = `${diffDays} Days Term`;
      else validityText = 'Custom Dates';
    } else if (validFrom) {
      validityText = `From ${validFrom}`;
    } else if (validTo) {
      validityText = `Until ${validTo}`;
    }

    return {
      routesCount: lineItems.length,
      vehicleClassesCount: vehicleClassesList.length,
      vehicleClassesLabel: vehicleClassesList.length > 0 ? vehicleClassesList.join(', ') : 'None selected',
      lineTypesCount: lineTypesList.length,
      lineTypesLabel: lineTypesList.length > 0 ? lineTypesList.join(', ') : 'Single Trip',
      validityText,
    };
  }, [lineItems, validFrom, validTo]);

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
      if (isNaN(numRate) || !isFinite(numRate) || numRate <= 0 || numRate > 999999999.99) {
        setFormError(`Line #${i + 1}: Enter a valid agreed rate between 0 and 999,999,999.`);
        return false;
      }
      if (item.driverPayout) {
        const numPayout = parseFloat(item.driverPayout);
        if (isNaN(numPayout) || !isFinite(numPayout) || numPayout < 0 || numPayout > 999999999.99) {
          setFormError(`Line #${i + 1}: Enter a valid driver payout amount.`);
          return false;
        }
      }
    }

    setFormError(null);
    return true;
  };

  // Batch Save Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const parseSafeDecimal = (val?: string | number | null): number | undefined => {
        if (val === null || val === undefined || val === '' || val === 'NULL') return undefined;
        const num = typeof val === 'number' ? val : parseFloat(String(val));
        if (isNaN(num) || !isFinite(num) || num < 0) return undefined;
        return Math.min(num, 999999999.99);
      };

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
          rate: parseSafeDecimal(line.rate) ?? 0,
          driver_payout: parseSafeDecimal(line.driverPayout),
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
            rate: parseSafeDecimal(line.rate) ?? 0,
            driver_payout: parseSafeDecimal(line.driverPayout),
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
      queryClient.invalidateQueries({ queryKey: ['rate-cards'] });
      queryClient.invalidateQueries({ queryKey: ['quotations-select'] });
      queryClient.invalidateQueries({ queryKey: ['quotation-lookup'] });
      setIsPreviewOpen(false);

      if (isReturnToTrip) {
        const returnStep = searchParams.get('return_step') || '3';
        toast.success('Commercial Quotation created successfully! Returning to Trip creation...');
        setTimeout(() => {
          navigate(`/trips/new?step=${returnStep}`);
        }, 300);
      } else {
        toast.success(
          isEdit
            ? 'Quotation updated successfully'
            : `Successfully created ${lineItems.length} commercial rate line${lineItems.length > 1 ? 's' : ''}`
        );
        navigate('/quotations');
      }
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
              <Calculator className="w-6 h-6 text-[#FA634E] shrink-0" />
              <span>{isEdit ? 'Edit Commercial Quotation' : 'Create Commercial Agreement'}</span>
            </h1>

            <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-[#2D2B2C] text-white dark:bg-slate-100 dark:text-slate-900 rounded-lg font-mono font-black text-xs shadow-2xs">
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
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsPrintModalOpen(true)}
              className="h-8.5 text-xs font-bold border-slate-200 dark:border-slate-800 rounded-xl px-3.5 gap-1.5 cursor-pointer bg-white dark:bg-slate-900 text-[#3E3C3D] hover:bg-slate-50"
            >
              <Printer className="h-3.5 w-3.5 text-[#FA634E]" />
              <span>Print / PDF Document</span>
            </Button>
            
            <Button
              type="submit"
              size="sm"
              className="h-8.5 px-4.5 text-xs font-black text-white bg-[#FA634E] hover:bg-[#DF4834] shadow-md shadow-[#FA634E]/20 rounded-xl transition-all hover:scale-[1.01] active:scale-95 gap-1.5 cursor-pointer border-0"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{isReturnToTrip ? 'Save Quotation & Return to Trip →' : `Save Agreement (${lineItems.length} Lines)`}</span>
            </Button>
          </div>
        </div>

        {isReturnToTrip && (
          <div className="p-3.5 rounded-xl bg-orange-50/90 border border-[#FA634E]/30 flex items-center justify-between gap-3 text-xs font-bold text-[#3E3C3D] animate-fade-in shadow-2xs">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4.5 h-4.5 text-[#FA634E] shrink-0" />
              <span>Creating commercial quotation to apply to your current trip creation workflow.</span>
            </div>
            <Badge className="bg-[#FA634E] text-white font-extrabold text-[10px] uppercase px-2.5 py-0.5 rounded-md">
              Trip Creation Context
            </Badge>
          </div>
        )}

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
            
            <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden bg-white dark:bg-[#2D2B2C]">
              <CardHeader className="bg-slate-50/70 dark:bg-slate-800/40 py-2.5 px-4 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5 text-[#FA634E]" />
                  Customer &amp; Contract Terms
                </CardTitle>
              </CardHeader>

              <CardContent className="p-4 space-y-4">
                
                {/* Customer Picker */}
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-900 dark:text-slate-100">Customer *</Label>
                  <Select value={customerId} onValueChange={setCustomerId}>
                    <SelectTrigger className="h-9 text-xs bg-white dark:bg-[#2D2B2C] font-bold border-slate-200 dark:border-slate-800 rounded-xl">
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
                  <TaxonomySelect
                    category="OPERATION_TYPE"
                    value={operationType}
                    onValueChange={(val: string) => setOperationType(val as any)}
                    placeholder="Select Operation Type"
                  />
                </div>

                {/* Contract Validity Range */}
                <div className="grid grid-cols-2 gap-2.5 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Valid From</Label>
                    <Input
                      type="date"
                      value={validFrom}
                      onChange={(e) => setValidFrom(e.target.value)}
                      className="h-8.5 text-xs bg-white dark:bg-[#2D2B2C] font-medium rounded-xl border-slate-200 dark:border-slate-800 px-2.5"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Valid Until</Label>
                    <Input
                      type="date"
                      value={validTo}
                      onChange={(e) => setValidTo(e.target.value)}
                      className="h-8.5 text-xs bg-white dark:bg-[#2D2B2C] font-medium rounded-xl border-slate-200 dark:border-slate-800 px-2.5"
                    />
                  </div>
                </div>

                {/* Executive Summary Panel */}
                <div className="pt-2">
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60 space-y-3">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <span className="flex items-center gap-1.5 text-[#3E3C3D] dark:text-slate-300 font-bold">
                        <Receipt className="w-3.5 h-3.5 text-[#FA634E]" />
                        Summary
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {/* 1. Routes Defined */}
                      <div className="p-2.5 bg-white dark:bg-[#2D2B2C] rounded-lg border border-slate-200/60 dark:border-slate-800 space-y-0.5">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Routes</div>
                        <div className="text-xs font-bold text-[#3E3C3D] dark:text-white">
                          {agreementSummaryMetrics.routesCount} {agreementSummaryMetrics.routesCount === 1 ? 'Route' : 'Routes'}
                        </div>
                      </div>

                      {/* 2. Vehicle Classes */}
                      <div className="p-2.5 bg-white dark:bg-[#2D2B2C] rounded-lg border border-slate-200/60 dark:border-slate-800 space-y-0.5">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Vehicle Classes</div>
                        <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 truncate">
                          {agreementSummaryMetrics.vehicleClassesLabel}
                        </div>
                      </div>

                      {/* 3. Line Types */}
                      <div className="p-2.5 bg-white dark:bg-[#2D2B2C] rounded-lg border border-slate-200/60 dark:border-slate-800 space-y-0.5">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Line Types</div>
                        <div className="text-xs font-bold text-blue-600 dark:text-blue-400 truncate">
                          {agreementSummaryMetrics.lineTypesLabel}
                        </div>
                      </div>

                      {/* 4. Contract Term / Validity */}
                      <div className="p-2.5 bg-white dark:bg-[#2D2B2C] rounded-lg border border-slate-200/60 dark:border-slate-800 space-y-0.5">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Validity</div>
                        <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 truncate">
                          {agreementSummaryMetrics.validityText}
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
            
            <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden bg-white dark:bg-[#2D2B2C]">
              <CardHeader className="bg-slate-50/70 dark:bg-slate-800/40 py-2.5 px-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Layers className="h-3.5 w-3.5 text-[#FA634E]" />
                  Commercial Route Lines ({lineItems.length})
                </CardTitle>
                
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddLine}
                  className="h-7.5 px-3 text-xs font-bold text-[#FA634E] bg-[#FA634E]/10 hover:bg-[#FA634E]/20 border border-[#FA634E]/30 rounded-xl gap-1 cursor-pointer transition-all"
                >
                  <Plus size={13} /> Add Route
                </Button>
              </CardHeader>

              <CardContent className="p-4 space-y-4">

            {/* Rate Line Cards Stack */}
            {lineItems.map((line, index) => {
              const numRate = parseFloat(line.rate) || 0;

              return (
                <div
                  key={line.id}
                  className="p-3.5 bg-white dark:bg-[#2D2B2C] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3 transition-all hover:border-[#FA634E]/30"
                >
                  {/* Line Item Header Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-[#3E3C3D] text-white text-[11px] font-mono font-black">
                        #{index + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        Route Line #{index + 1}
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
                        <Plus size={12} /> Add Stop
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
                    
                    {/* Origin */}
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                        Origin *
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

                    {/* Destination */}
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                        Destination *
                      </span>
                      <LocationCombobox
                        customerId={customerId}
                        value={line.destinationLocationId}
                        onChange={(val, loc) => {
                          handleUpdateLine(index, 'destinationLocationId', val);
                          if (loc?.customerId && !customerId) setCustomerId(loc.customerId);
                        }}
                        placeholder="Select destination location..."
                      />
                    </div>

                  </div>

                  {/* Vehicle Class & Line Type Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Vehicle Class Dropdown */}
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Vehicle Class *</Label>
                      <TaxonomySelect
                        category="VEHICLE_CLASS"
                        value={line.vehicleClass}
                        onValueChange={(val: string) => handleUpdateLine(index, 'vehicleClass', val)}
                        size="sm"
                        placeholder="Select Vehicle Class"
                      />
                    </div>

                    {/* Line Type */}
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Line Type *</Label>
                      <TaxonomySelect
                        category="LINE_TYPE"
                        value={line.lineType}
                        onValueChange={(val: string) => handleUpdateLine(index, 'lineType', val)}
                        size="sm"
                        placeholder="Select Line Type"
                      />
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
                          <div key={via.id} className="flex items-center gap-2 bg-white dark:bg-[#2D2B2C] p-1.5 rounded-lg border border-slate-200/80 dark:border-slate-800">
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
                          placeholder="Enter agreed rate..."
                          className="h-8.5 text-xs bg-white dark:bg-[#2D2B2C] font-black rounded-xl border-slate-200 dark:border-slate-800 flex-1"
                        />
                        <Select
                          value={line.currency}
                          onValueChange={(val) => handleUpdateLine(index, 'currency', val)}
                        >
                          <SelectTrigger className="h-8.5 w-16 text-xs bg-white dark:bg-[#2D2B2C] font-extrabold border-slate-200 dark:border-slate-800 rounded-xl px-2">
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
                        placeholder="Enter driver payout..."
                        className="h-8.5 text-xs bg-white dark:bg-[#2D2B2C] font-extrabold rounded-xl border-slate-200 dark:border-slate-800"
                      />
                    </div>

                    {/* Pricing Basis */}
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Pricing Basis</Label>
                      <Select
                        value={line.pricingBasis}
                        onValueChange={(val) => handleUpdateLine(index, 'pricingBasis', val as any)}
                      >
                        <SelectTrigger className="h-8.5 text-xs bg-white dark:bg-[#2D2B2C] font-semibold border-slate-200 dark:border-slate-800 rounded-xl">
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

            {/* 3. COMMERCIAL SURCHARGES CARD */}
            <div className="bg-white dark:bg-[#2D2B2C] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 space-y-3 shadow-2xs mt-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-amber-500 shrink-0" />
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Commercial Surcharges
                  </h3>
                  <Badge variant="outline" className="text-[10px] font-mono font-bold px-1.5 py-0 text-slate-600 dark:text-slate-300">
                    {surchargeRules.length}
                  </Badge>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddSurchargeRule}
                  className="h-7.5 text-xs font-bold border-dashed border-[#FA634E]/50 text-[#FA634E] hover:bg-[#FA634E]/10 rounded-xl gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Plus size={13} /> Add Surcharge Rule
                </Button>
              </div>

              {/* Quick Add Presets Bar */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mr-1">
                  Quick Presets:
                </span>
                {COMMON_SURCHARGE_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() =>
                      setSurchargeRules((prev) => [
                        ...prev,
                        {
                          id: `sur-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                          name: preset.name,
                          amount: preset.amount,
                          unit: preset.unit,
                        },
                      ])
                    }
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-[#FA634E]/10 hover:text-[#FA634E] text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 transition-all cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {surchargeRules.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/30 text-xs text-slate-400 space-y-1">
                  <p className="font-bold text-slate-600 dark:text-slate-300">No surcharges configured</p>
                  <p>Click <strong className="text-[#FA634E]">+ Add Surcharge Rule</strong> or select a 1-click Quick Preset above.</p>
                </div>
              ) : (
                <div className="space-y-2 pt-1">
                  {surchargeRules.map((rule, idx) => (
                    <div key={rule.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center p-3 bg-slate-50/80 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-slate-300 transition-all">
                      
                      <div className="sm:col-span-5 space-y-1">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                          <span>Surcharge Title #{idx + 1}</span>
                        </Label>
                        <Input
                          value={rule.name}
                          onChange={(e) => handleUpdateSurchargeRule(rule.id, 'name', e.target.value)}
                          placeholder="e.g. Within City Same Day Delivery"
                          className="h-8.5 text-xs bg-white dark:bg-[#2D2B2C] font-extrabold rounded-xl border-slate-200 dark:border-slate-800 focus-visible:ring-1 focus-visible:ring-[#FA634E]"
                        />
                      </div>

                      <div className="sm:col-span-3 space-y-1">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Amount (SAR)
                        </Label>
                        <div className="relative">
                          <Input
                            type="number"
                            step="0.01"
                            value={rule.amount}
                            onChange={(e) => handleUpdateSurchargeRule(rule.id, 'amount', e.target.value)}
                            placeholder="75"
                            className="h-8.5 text-xs bg-white dark:bg-[#2D2B2C] font-black rounded-xl border-slate-200 dark:border-slate-800 pr-12 focus-visible:ring-1 focus-visible:ring-[#FA634E]"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 pointer-events-none">
                            SAR
                          </span>
                        </div>
                      </div>

                      <div className="sm:col-span-3 space-y-1">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Unit / Frequency
                        </Label>
                        <Select
                          value={rule.unit}
                          onValueChange={(val) => handleUpdateSurchargeRule(rule.id, 'unit', val)}
                        >
                          <SelectTrigger className="h-8.5 text-xs bg-white dark:bg-[#2D2B2C] font-bold border-slate-200 dark:border-slate-800 rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="z-[9999]">
                            <SelectItem value="Per Delivery" className="text-xs font-semibold">Per Delivery</SelectItem>
                            <SelectItem value="Per Person" className="text-xs font-semibold">Per Person</SelectItem>
                            <SelectItem value="Per Trip" className="text-xs font-semibold">Per Trip</SelectItem>
                            <SelectItem value="Fixed" className="text-xs font-semibold">Fixed Fee</SelectItem>
                            <SelectItem value="Per Hour" className="text-xs font-semibold">Per Hour</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="sm:col-span-1 flex justify-end pt-2 sm:pt-4">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveSurchargeRule(rule.id)}
                          className="h-8.5 w-8.5 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl cursor-pointer"
                          title="Remove surcharge"
                        >
                          <X size={15} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

              </CardContent>
            </Card>

          </div>

        </div>

      </form>

      {/* Agreement Confirmation & Rate Matrix Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-3xl rounded-2xl p-0 overflow-hidden border-slate-200 dark:border-slate-800 shadow-2xl z-[9999]">
          <DialogHeader className="bg-[#2D2B2C] text-white dark:bg-slate-950 p-4 border-b border-slate-800 flex flex-row items-center justify-between">
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
                <div className="text-[10px] font-bold text-slate-400 uppercase">Vehicle Classes</div>
                <div className="font-extrabold text-[#FA634E] text-xs truncate">
                  {agreementSummaryMetrics.vehicleClassesLabel}
                </div>
              </div>
            </div>

            {/* Commercial Rate Lines Summary List */}
            <div className="space-y-2">
              <div className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center justify-between">
                <span>Defined Commercial Routes ({lineItems.length} Lines)</span>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-[#2D2B2C]">
                {lineItems.map((line, idx) => (
                  <div key={line.id} className="p-3 text-xs space-y-1.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="font-mono font-black px-1.5 py-0.5 bg-[#2D2B2C] text-white rounded text-[10px] shrink-0">
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

      {/* Official MERCON Commercial Quotation Printable Document Modal */}
      <QuotationPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        customerName={selectedCustomerObj?.name || 'Valued Customer'}
        customerAddress={(selectedCustomerObj as any)?.address || (selectedCustomerObj as any)?.city || 'Riyadh, Saudi Arabia'}
        attnName={(selectedCustomerObj as any)?.contact_person || (selectedCustomerObj as any)?.contact_phone || 'Procurement Department'}
        quoteNo={quotationRefId}
        validFromDate={validFrom ? new Date(validFrom).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB')}
        validToDate={validTo ? new Date(validTo).toLocaleDateString('en-GB') : '30/04/2026'}
        lineItems={printLineItems}
        surchargeRules={surchargeRules.map((s) => ({ name: s.name, amount: Number(s.amount) || 0, unit: s.unit }))}
      />
    </DashboardLayout>
  );
}
