import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  Building2,
  Coins,
  Loader2,
  MapPin,
  Route,
  Tag,
  AlertCircle,
  Sparkles,
  Info
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import LocationCombobox from '@/components/rate-cards/LocationCombobox';
import { RateCategoryVehicleTypeForm } from '@/components/rate-cards';
import { rateCardService, RateCard } from '@/services/rateCardService';
import { customerService } from '@/services/customerService';

interface RateCardFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (rateCard: RateCard) => void;
  /** Editing an existing card; omit to create. */
  rateCard?: RateCard | null;
  /** Locks the card to one customer (used from the customer page). */
  lockedCustomerId?: string;
  lockedCustomerName?: string;
  /** Pre-fill the lane, e.g. from the trip the operator is looking at. */
  defaultOriginLocationId?: string;
  defaultDestinationLocationId?: string;
  defaultPrice?: string;
}

/**
 * Add or edit one priced lane for one customer. Used from the rate cards list,
 * the customer page and the trip wizard's "save this rate" flow. Every rate
 * card belongs to exactly one customer — there is no all-customers "standard"
 * rate, since every quote these carriers give is customer-specific.
 */
export default function RateCardFormDialog({
  isOpen,
  onClose,
  onSaved,
  rateCard,
  lockedCustomerId,
  lockedCustomerName,
  defaultOriginLocationId,
  defaultDestinationLocationId,
  defaultPrice,
}: RateCardFormDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = !!rateCard;

  const [customerId, setCustomerId] = useState('');
  const [originId, setOriginId] = useState('');
  const [destinationId, setDestinationId] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('SAR');
  const [name, setName] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [rateCategory, setRateCategory] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: customersRes } = useQuery({
    queryKey: ['customers-select'],
    queryFn: () => customerService.getAll({ per_page: 100 }),
    enabled: isOpen && !lockedCustomerId,
  });
  const customers = customersRes?.data || [];

  // Reset every time the dialog opens so a previous edit never leaks into a fresh create.
  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    if (rateCard) {
      setCustomerId(rateCard.customerId || '');
      setOriginId(rateCard.originLocationId || '');
      setDestinationId(rateCard.destinationLocationId || '');
      setPrice(String(rateCard.base_price ?? ''));
      setCurrency(rateCard.currency || 'SAR');
      setName(rateCard.name || '');
      setVehicleType(rateCard.vehicle_type || '');
      setRateCategory(rateCard.rate_category || '');
    } else {
      setCustomerId(lockedCustomerId || '');
      setOriginId(defaultOriginLocationId || '');
      setDestinationId(defaultDestinationLocationId || '');
      setPrice(defaultPrice || '');
      setCurrency('SAR');
      setName('');
      setVehicleType('');
      setRateCategory('');
    }
  }, [isOpen, rateCard, lockedCustomerId, defaultOriginLocationId, defaultDestinationLocationId, defaultPrice]);

  const numericPrice = parseFloat(price || '');
  const effectiveCustomerId = lockedCustomerId || customerId;
  const isValid =
    !!effectiveCustomerId &&
    !!originId &&
    !!destinationId &&
    !isNaN(numericPrice) &&
    numericPrice > 0;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: name.trim() || undefined,
        base_price: numericPrice,
        currency,
        customerId: effectiveCustomerId,
        origin_location_id: originId,
        destination_location_id: destinationId,
        vehicle_type: vehicleType || null,
        rate_category: rateCategory || null,
      };
      return rateCard
        ? rateCardService.update(rateCard.id, payload)
        : rateCardService.create(payload);
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['rate-cards'] });
      queryClient.invalidateQueries({ queryKey: ['rate-card-lookup'] });
      onSaved?.(saved);
      onClose();
    },
    onError: (err: any) => {
      setError(err.response?.data?.error?.message || err.message || 'Could not save the rate.');
    },
  });

  const handleSubmit = () => {
    setError(null);
    if (!effectiveCustomerId) return setError('Choose which customer this rate is for.');
    if (!originId || !destinationId) return setError('Pick both an origin and a destination.');
    if (isNaN(numericPrice) || numericPrice <= 0) return setError('Enter a price greater than 0.');
    saveMutation.mutate();
  };

  const selectedCustomer = customers.find((c) => c.id === effectiveCustomerId);
  const activeCustomerName = lockedCustomerName || selectedCustomer?.name || 'Selected Customer';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl p-0 overflow-hidden rounded-2xl border-slate-200 dark:border-slate-800 shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 px-6 py-5 text-white border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E8450F]/20 text-[#E8450F] border border-[#E8450F]/30 shadow-inner">
              <Tag className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <DialogTitle className="text-lg font-bold tracking-tight text-white">
                  {isEditing ? 'Edit Customer Rate' : 'Add New Rate'}
                </DialogTitle>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#E8450F]/15 px-2.5 py-0.5 text-[11px] font-semibold text-[#FF6B3B] border border-[#E8450F]/30">
                  <Sparkles className="h-3 w-3" />
                  Contracted Rate
                </span>
              </div>
              <DialogDescription className="text-xs text-slate-300">
                One price for one lane, for one customer.
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Dialog Content Scroll Area */}
        <div className="space-y-5 px-6 py-5 max-h-[75vh] overflow-y-auto bg-slate-50/50 dark:bg-slate-950/40">
          
          {/* Section 1: Customer Selection */}
          <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <Building2 className="h-4 w-4" />
                </div>
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Customer
                </Label>
              </div>
              {lockedCustomerId && (
                <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-200/60 dark:border-indigo-800/60">
                  Fixed Context
                </span>
              )}
            </div>

            {lockedCustomerId ? (
              <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-3.5 py-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white text-xs font-bold">
                  {activeCustomerName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {activeCustomerName}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Rate is locked to this account
                  </p>
                </div>
              </div>
            ) : (
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger className="h-10 text-xs font-medium border-slate-200 bg-slate-50/50 dark:bg-slate-800/50 dark:border-slate-700">
                  <SelectValue placeholder="Select customer account..." />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs font-medium">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5 text-slate-400" />
                        <span>{c.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Section 2: Route & Lane Specification */}
          <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                <Route className="h-4 w-4" />
              </div>
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Lane & Specifications
              </Label>
            </div>

            {/* Origin -> Destination Route Visualizer Box */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-11 gap-2 items-center">
                {/* Origin */}
                <div className="sm:col-span-5 space-y-1.5">
                  <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-emerald-600" /> Origin Location
                  </Label>
                  <LocationCombobox
                    value={originId}
                    onChange={(id) => setOriginId(id)}
                    placeholder="Search origin city/hub..."
                    excludeLocationId={destinationId}
                  />
                </div>

                {/* Connection Arrow */}
                <div className="sm:col-span-1 flex items-center justify-center py-1 sm:py-0">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-[#E8450F] shadow-sm">
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </div>

                {/* Destination */}
                <div className="sm:col-span-5 space-y-1.5">
                  <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-[#E8450F]" /> Destination Location
                  </Label>
                  <LocationCombobox
                    value={destinationId}
                    onChange={(id) => setDestinationId(id)}
                    placeholder="Search destination city/hub..."
                    excludeLocationId={originId}
                  />
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <Info className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>Same location on both ends is permitted for within-city local deliveries.</span>
              </div>
            </div>

            {/* Vehicle Specs & Rate Category */}
            <RateCategoryVehicleTypeForm
              vehicleType={vehicleType}
              onVehicleTypeChange={setVehicleType}
              rateCategory={rateCategory}
              onRateCategoryChange={setRateCategory}
              showPreviewBar={true}
            />
          </div>

          {/* Section 3: Pricing & Details */}
          <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                <Coins className="h-4 w-4" />
              </div>
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Pricing & Details
              </Label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="rate_price" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Base Price per Trip
                </Label>
                <div className="relative">
                  <Input
                    id="rate_price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="e.g. 1500.00"
                    className="h-10 pl-3 pr-12 font-mono text-sm font-bold border-slate-200 bg-slate-50/50 dark:bg-slate-800/50 dark:border-slate-700"
                  />
                  <div className="absolute right-3 top-2.5 text-xs font-bold text-slate-400 uppercase">
                    {currency}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rate_currency" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Currency
                </Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger id="rate_currency" className="h-10 text-xs font-semibold border-slate-200 bg-slate-50/50 dark:bg-slate-800/50 dark:border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SAR" className="text-xs font-bold">SAR (﷼)</SelectItem>
                    <SelectItem value="USD" className="text-xs font-bold">USD ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Optional Rate Label */}
            <div className="space-y-1.5 pt-1">
              <Label htmlFor="rate_name" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Custom Label</span>
                <span className="font-normal text-[11px] text-slate-400">Optional</span>
              </Label>
              <Input
                id="rate_name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Standard Express Rate (defaults to lane name)"
                className="h-9 text-xs border-slate-200 bg-slate-50/50 dark:bg-slate-800/50 dark:border-slate-700"
              />
            </div>
          </div>

          {/* Validation Error Message */}
          {error && (
            <div className="flex items-center gap-2.5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs font-medium text-rose-700 dark:text-rose-300 shadow-sm">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 px-6 py-4 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 font-medium">
            {isValid ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                ✓ Ready to save rate
              </span>
            ) : (
              <span>Fill customer, lane, and price to save</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-9 px-4 text-xs font-medium border-slate-200 dark:border-slate-700"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!isValid || saveMutation.isPending}
              className="h-9 px-5 gap-1.5 bg-[#E8450F] text-xs font-bold text-white hover:bg-[#d03d0c] disabled:opacity-50 shadow-md shadow-[#E8450F]/20 transition-all"
            >
              {saveMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Add Rate'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

