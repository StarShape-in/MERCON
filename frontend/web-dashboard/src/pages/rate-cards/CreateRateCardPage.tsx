import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  RotateCcw,
  Plus,
  CheckCircle2,
  FileText,
  Building2,
  MapPin,
  CreditCard,
  ArrowRight,
  Info,
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import LocationCombobox from '@/components/rate-cards/LocationCombobox';
import { rateCardService, CreateRateCardPayload, VEHICLE_TYPES, RATE_CATEGORIES } from '@/services/rateCardService';
import { customerService } from '@/services/customerService';
import { locationService } from '@/services/locationService';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Btn from '@/components/ui/Btn';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/**
 * Create one priced lane for one customer. Every rate card belongs to exactly
 * one customer — there is no all-customers "standard" rate, since every quote
 * these carriers give is customer-specific.
 */
export default function CreateRateCardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  // The trip wizard and the customer page both link here with context.
  const presetCustomerId = searchParams.get('customerId') || '';
  const presetOriginId = searchParams.get('origin') || '';
  const presetDestinationId = searchParams.get('destination') || '';
  const presetPrice = searchParams.get('price') || '';

  const [customerId, setCustomerId] = useState(presetCustomerId);
  const [originId, setOriginId] = useState(presetOriginId);
  const [originName, setOriginName] = useState('');
  const [destinationId, setDestinationId] = useState(presetDestinationId);
  const [destinationName, setDestinationName] = useState('');
  const [basePrice, setBasePrice] = useState(presetPrice);
  const [currency, setCurrency] = useState('SAR');
  const [name, setName] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [rateCategory, setRateCategory] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: customersResponse } = useQuery({
    queryKey: ['customers-select'],
    queryFn: () => customerService.getAll({ per_page: 100 }),
  });
  const customers = customersResponse?.data || [];
  const selectedCustomer = customers.find((c) => c.id === customerId);

  // The combobox hands back the name when the user picks; a lane arriving
  // preset by URL (from the trip wizard or a customer page) has ids only, so
  // resolve those names once for the preview header.
  const { data: locationsRes } = useQuery({
    queryKey: ['locations'],
    queryFn: () => locationService.getAll({ active_only: true }),
  });

  useEffect(() => {
    const locations = locationsRes?.data || [];
    if (!locations.length) return;
    if (originId && !originName) {
      setOriginName(locations.find((l) => l.id === originId)?.name || '');
    }
    if (destinationId && !destinationName) {
      setDestinationName(locations.find((l) => l.id === destinationId)?.name || '');
    }
  }, [locationsRes, originId, destinationId, originName, destinationName]);

  const numericPrice = parseFloat(basePrice || '');
  const hasPrice = !isNaN(numericPrice) && numericPrice > 0;
  const laneComplete = !!originId && !!destinationId;
  const isFormValid = laneComplete && hasPrice && !!customerId;

  const handleReset = () => {
    setCustomerId('');
    setOriginId('');
    setOriginName('');
    setDestinationId('');
    setDestinationName('');
    setBasePrice('');
    setCurrency('SAR');
    setName('');
    setVehicleType('');
    setRateCategory('');
    setError(null);
  };

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

  const handleSubmit = useCallback(() => {
    setError(null);

    if (!customerId) {
      setError('Choose which customer this rate is for.');
      return;
    }
    if (!originId || !destinationId) {
      setError('Pick both an origin and a destination for this lane.');
      return;
    }
    if (!hasPrice) {
      setError('Enter a base price greater than 0.');
      return;
    }

    createMutation.mutate({
      name: name.trim() || undefined,
      customerId,
      origin_location_id: originId,
      destination_location_id: destinationId,
      base_price: numericPrice,
      currency,
      vehicle_type: vehicleType || null,
      rate_category: rateCategory || null,
    });
  }, [originId, destinationId, customerId, hasPrice, name, numericPrice, currency, vehicleType, rateCategory, createMutation]);

  // Ctrl/Cmd+Enter saves from anywhere on the page.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (isFormValid && !createMutation.isPending) handleSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSubmit, isFormValid, createMutation.isPending]);

  const laneLabel = originName && destinationName ? `${originName} → ${destinationName}` : 'Not specified';

  return (
    <DashboardLayout active="RateCards" title="Create Rate Card">
      <div className="px-4 sm:px-6 pb-6 space-y-4 animate-fade-in max-w-[1400px] mx-auto">

        {/* Top Scope & Action Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
              <Building2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>MERCON Commercial</span>
              <span>•</span>
              <span className="text-slate-900 dark:text-slate-100 font-bold">Rate Cards</span>
            </div>
            <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-200 font-bold dark:bg-indigo-950/40 dark:text-indigo-300">
              New Rate
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Btn
              variant="outline"
              size="sm"
              onClick={() => navigate('/rate-cards')}
              className="h-9 gap-1.5 text-xs font-semibold border-slate-200 bg-white hover:bg-slate-50 shadow-2xs"
              label="Back to Rate Cards"
              icon={<ArrowLeft className="w-3.5 h-3.5" />}
              shortcut={{ key: 'b', alt: true }}
            />

            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-9 gap-1.5 text-xs text-slate-500 hover:text-slate-900"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </Button>

            <Btn
              size="sm"
              onClick={() => handleSubmit()}
              disabled={createMutation.isPending || !isFormValid}
              className="h-9 gap-1.5 text-xs bg-[#E8450F] hover:bg-[#d03d0c] text-white font-bold shadow-xs rounded-md px-4"
              label={createMutation.isPending ? 'Saving...' : 'Save Rate Card'}
              icon={<Plus className="w-3.5 h-3.5" />}
              shortcut={{ key: 'Enter', metaOrControl: true }}
            />
          </div>
        </div>

        {/* Live manifest */}
        <Card className="border border-slate-200 dark:border-slate-800 shadow-2xs rounded-xl overflow-hidden bg-white dark:bg-slate-900">
          <div className="flex flex-col md:flex-row items-center divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-800">

            <div className="flex-1 p-4 flex items-center gap-3 w-full">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400 shrink-0">
                <MapPin className="w-4.5 h-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Lane</span>
                <p className="text-sm font-bold truncate mt-0.5 text-slate-900 dark:text-slate-100">{laneLabel}</p>
              </div>
              {laneComplete && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
            </div>

            <div className="flex-1 p-4 flex items-center gap-3 w-full">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 shrink-0">
                <Building2 className="w-4.5 h-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Customer</span>
                <p className="text-sm font-bold truncate mt-0.5 text-slate-900 dark:text-slate-100">
                  {selectedCustomer ? selectedCustomer.name : 'Pick a customer'}
                </p>
              </div>
              {!!customerId && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
            </div>

            <div className="flex-1 p-4 flex items-center gap-3 w-full">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-amber-100 text-[#E8450F] dark:bg-amber-900/40 dark:text-[#ff6a38] shrink-0">
                <CreditCard className="w-4.5 h-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Price per trip</span>
                <p className="text-sm font-bold truncate mt-0.5 text-slate-900 dark:text-slate-100 font-mono">
                  {currency} {hasPrice ? numericPrice.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
                </p>
              </div>
              {hasPrice && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
            </div>

            <div className="flex-1 p-4 flex items-center gap-3 w-full">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400 shrink-0">
                <FileText className="w-4.5 h-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Label</span>
                <p className="text-sm font-bold truncate mt-0.5 text-slate-900 dark:text-slate-100">
                  {name.trim() || laneLabel}
                </p>
              </div>
            </div>

          </div>
        </Card>

        <div className="max-w-3xl mx-auto w-full pt-2">
          <Card className="border border-slate-200 dark:border-slate-800 shadow-2xs rounded-xl bg-white dark:bg-slate-900">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FileText className="w-4.5 h-4.5 text-indigo-600" /> Rate Setup
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                One price for one lane, for one customer.
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-5 space-y-6">

              {/* Customer */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Customer <span className="text-rose-500">*</span>
                </Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger className="h-9 text-xs border-slate-200 bg-white">
                    <SelectValue placeholder="Choose customer organization..." />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.contact_phone || 'No Phone'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Lane */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Lane <span className="text-rose-500">*</span>
                </Label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <LocationCombobox
                      value={originId}
                      onChange={(locId, loc) => {
                        setOriginId(locId);
                        setOriginName(loc?.name || '');
                        setError(null);
                      }}
                      placeholder="From (e.g. Riyadh)"
                    />
                  </div>
                  <ArrowRight className="w-4 h-4 shrink-0 text-[#E8450F]" />
                  <div className="flex-1 min-w-0">
                    <LocationCombobox
                      value={destinationId}
                      onChange={(locId, loc) => {
                        setDestinationId(locId);
                        setDestinationName(loc?.name || '');
                        setError(null);
                      }}
                      placeholder="To (e.g. Jeddah)"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                  <Info className="w-3 h-3 shrink-0" />
                  Place not on the list? Type its name in the dropdown to add it — it becomes available
                  everywhere. Same place on both ends is fine for within-city local delivery.
                </p>
              </div>

              {/* Tier / booking type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Vehicle type <span className="font-normal text-slate-400">(optional)</span>
                  </Label>
                  <Select
                    value={vehicleType || '__none__'}
                    onValueChange={(v) => setVehicleType(v === '__none__' ? '' : v)}
                  >
                    <SelectTrigger className="h-9 text-xs border-slate-200 bg-white">
                      <SelectValue placeholder="Any / not set" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Any / not set</SelectItem>
                      {VEHICLE_TYPES.map((v) => (
                        <SelectItem key={v} value={v}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Rate category <span className="font-normal text-slate-400">(optional)</span>
                  </Label>
                  <Select
                    value={rateCategory || '__none__'}
                    onValueChange={(v) => setRateCategory(v === '__none__' ? '' : v)}
                  >
                    <SelectTrigger className="h-9 text-xs border-slate-200 bg-white">
                      <SelectValue placeholder="Any / not set" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Any / not set</SelectItem>
                      {RATE_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Price */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label htmlFor="base_price" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Price per trip <span className="text-rose-500">*</span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-bold text-slate-400 font-mono">{currency}</span>
                    <Input
                      id="base_price"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="1500.00"
                      value={basePrice}
                      onChange={(e) => setBasePrice(e.target.value)}
                      className="h-9 text-xs pl-12 font-mono font-bold border-slate-200"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="currency" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Currency <span className="text-rose-500">*</span>
                  </Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger id="currency" className="h-9 text-xs border-slate-200 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SAR">SAR — Saudi Riyal</SelectItem>
                      <SelectItem value="USD">USD — US Dollar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Optional label */}
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Label <span className="font-normal text-slate-400">(optional)</span>
                </Label>
                <Input
                  id="name"
                  placeholder={laneComplete ? laneLabel : 'Defaults to the lane name'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-9 text-xs font-medium border-slate-200"
                />
                <p className="text-[11px] text-slate-500">
                  Only needed when a lane needs a contract name to tell it apart in the ledger.
                </p>
              </div>

              {error && (
                <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-xs font-semibold border border-rose-200 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                  {error}
                </div>
              )}

            </CardContent>
          </Card>
        </div>

      </div>
    </DashboardLayout>
  );
}
