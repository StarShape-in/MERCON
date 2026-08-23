import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Building2, Loader2, Receipt, MapPin, Banknote, Tag, Sparkles } from 'lucide-react';

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
import { Badge } from '@/components/ui/badge';

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
  const [defaultTripCharge, setDefaultTripCharge] = useState('');
  const [currency, setCurrency] = useState('SAR');
  const [name, setName] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [rateCategory, setRateCategory] = useState('');
  const [billingType, setBillingType] = useState('');
  const [changeReason, setChangeReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: customersRes } = useQuery({
    queryKey: ['customers-select'],
    queryFn: () => customerService.getAll({ per_page: 100 , mode: 'lookup' }),
    enabled: isOpen && !lockedCustomerId,
  });
  const customers = customersRes?.data || [];

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setChangeReason('');
    if (rateCard) {
      setCustomerId(rateCard.customerId || '');
      setOriginId(rateCard.originLocationId || '');
      setDestinationId(rateCard.destinationLocationId || '');
      setPrice(String(rateCard.base_price ?? ''));
      setDefaultTripCharge(rateCard.default_trip_charge != null ? String(rateCard.default_trip_charge) : '');
      setCurrency(rateCard.currency || 'SAR');
      setName(rateCard.name || '');
      setVehicleType(rateCard.vehicle_type || '');
      setRateCategory(rateCard.rate_category || '');
      setBillingType(rateCard.billing_type || '');
    } else {
      setCustomerId(lockedCustomerId || '');
      setOriginId(defaultOriginLocationId || '');
      setDestinationId(defaultDestinationLocationId || '');
      setPrice(defaultPrice || '');
      setDefaultTripCharge('');
      setCurrency('SAR');
      setName('');
      setVehicleType('');
      setRateCategory('');
      setBillingType('');
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
        billing_type: billingType || null,
        default_trip_charge: defaultTripCharge.trim() ? Number(defaultTripCharge) : null,
        reason: changeReason.trim() || undefined,
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[560px] p-6 rounded-2xl border-slate-200/80 shadow-2xl bg-white dark:bg-slate-900 dark:border-slate-800">
        <DialogHeader className="space-y-1.5 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-brand border border-brand/20">
                <Receipt className="h-4.5 w-4.5 text-brand" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {isEditing ? 'Edit Rate Card' : 'Add Rate Card'}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  One price for one lane, for one customer.
                </DialogDescription>
              </div>
            </div>
            <Badge className="bg-indigo-50 text-indigo-700 hover:bg-indigo-50 border-indigo-200/60 font-semibold text-[10px] uppercase tracking-wider px-2 py-0.5">
              Pricing Module
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Customer & Lane Section */}
          <div className="space-y-3 p-3.5 bg-slate-50/60 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/80">
            {/* Customer Field */}
            <div className="space-y-1.5 min-w-0">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-slate-400" /> Customer
              </Label>
              {lockedCustomerId ? (
                <div className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 shadow-2xs">
                  <Building2 className="h-3.5 w-3.5 text-brand" />
                  <span>{lockedCustomerName || 'Selected Customer'}</span>
                </div>
              ) : (
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger className="h-9 text-xs bg-white dark:bg-slate-900 font-medium border-slate-200 dark:border-slate-700 rounded-lg shadow-2xs">
                    <SelectValue placeholder="Select a customer..." />
                  </SelectTrigger>
                  <SelectContent className="z-[9999]">
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-xs font-medium">
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Lane (Origin & Destination) */}
            <div className="space-y-1.5 min-w-0">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-slate-400" /> Route / Lane
              </Label>
              <div className="grid grid-cols-[1fr,auto,1fr] gap-2 items-center min-w-0">
                <div className="min-w-0">
                  <LocationCombobox
                    value={originId}
                    onChange={(id) => setOriginId(id)}
                    placeholder="Origin location..."
                    excludeLocationId={destinationId}
                    customerId={effectiveCustomerId}
                  />
                </div>
                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs text-slate-400 shrink-0">
                  <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
                </div>
                <div className="min-w-0">
                  <LocationCombobox
                    value={destinationId}
                    onChange={(id) => setDestinationId(id)}
                    placeholder="Destination..."
                    excludeLocationId={originId}
                    customerId={effectiveCustomerId}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Vehicle Type & Rate Category Specifications */}
          <div className="p-3.5 bg-slate-50/60 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-brand" /> Rate Specifications
              </span>
            </div>
            <RateCategoryVehicleTypeForm
              vehicleType={vehicleType}
              onVehicleTypeChange={setVehicleType}
              rateCategory={rateCategory}
              onRateCategoryChange={setRateCategory}
              billingType={billingType}
              onBillingTypeChange={setBillingType}
              showPreviewBar={true}
            />
          </div>

          {/* Price, Currency & Driver Payout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Price & Currency */}
            <div className="space-y-1.5">
              <Label htmlFor="rate_price" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Banknote className="h-3.5 w-3.5 text-slate-400" /> Base Customer Price
              </Label>
              <div className="grid grid-cols-3 gap-1.5">
                <Input
                  id="rate_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="col-span-2 h-9 text-xs font-mono font-bold border-slate-200 dark:border-slate-700 rounded-lg shadow-2xs"
                />
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger id="rate_currency" className="h-9 text-xs font-bold border-slate-200 dark:border-slate-700 rounded-lg shadow-2xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[9999]">
                    <SelectItem value="SAR" className="text-xs font-semibold">SAR</SelectItem>
                    <SelectItem value="USD" className="text-xs font-semibold">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Driver Payout */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="rate_trip_charge" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  Trip Charge (Driver Payout)
                </Label>
                <span className="text-[10px] text-slate-400 font-medium">Optional</span>
              </div>
              <Input
                id="rate_trip_charge"
                type="number"
                step="0.01"
                min="0"
                value={defaultTripCharge}
                onChange={(e) => setDefaultTripCharge(e.target.value)}
                placeholder="Driver payout amount..."
                className="h-9 text-xs font-mono font-medium border-slate-200 dark:border-slate-700 rounded-lg shadow-2xs"
              />
            </div>
          </div>

          {/* Optional Label */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="rate_name" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-slate-400" /> Rate Card Label
              </Label>
              <span className="text-[10px] text-slate-400 font-medium">Optional</span>
            </div>
            <Input
              id="rate_name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Defaults to lane name (e.g. Riyadh → Jeddah)"
              className="h-9 text-xs font-medium border-slate-200 dark:border-slate-700 rounded-lg shadow-2xs"
            />
          </div>

          {/* Price Change Reason */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="change_reason" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-indigo-500" /> Reason for Price Change / Note
              </Label>
              <span className="text-[10px] text-slate-400 font-medium">Optional</span>
            </div>
            <Input
              id="change_reason"
              value={changeReason}
              onChange={(e) => setChangeReason(e.target.value)}
              placeholder="e.g. Annual contract update, Fuel rate adjustment..."
              className="h-9 text-xs font-medium border-slate-200 dark:border-slate-700 rounded-lg shadow-2xs"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50/80 p-3 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300 font-medium">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="mt-1 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-9 px-4 text-xs font-semibold rounded-xl border-slate-200 dark:border-slate-700"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSubmit}
            disabled={!isValid || saveMutation.isPending}
            className="h-9 px-5 gap-1.5 bg-brand hover:bg-brand-hover text-white text-xs font-bold rounded-xl shadow-sm transition-all disabled:opacity-50"
          >
            {saveMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isEditing ? 'Save Changes' : '+ Add Rate Card'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
