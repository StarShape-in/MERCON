import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Building2, Loader2 } from 'lucide-react';

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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {isEditing ? 'Edit Rate' : 'Add Rate'}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            One price for one lane, for one customer.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Customer Field */}
          <div className="grid gap-1.5">
            <Label className="text-xs font-medium">Customer</Label>
            {lockedCustomerId ? (
              <div className="flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-slate-50/80 px-3 text-xs font-medium text-slate-800 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-200">
                <Building2 className="h-3.5 w-3.5 text-slate-500" />
                <span>{lockedCustomerName || 'Selected Customer'}</span>
              </div>
            ) : (
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select a customer..." />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Lane (Origin & Destination) */}
          <div className="grid gap-1.5">
            <Label className="text-xs font-medium">Lane</Label>
            <div className="grid grid-cols-[1fr,auto,1fr] gap-2 items-center">
              <LocationCombobox
                value={originId}
                onChange={(id) => setOriginId(id)}
                placeholder="Origin..."
                excludeLocationId={destinationId}
              />
              <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
              <LocationCombobox
                value={destinationId}
                onChange={(id) => setDestinationId(id)}
                placeholder="Destination..."
                excludeLocationId={originId}
              />
            </div>
          </div>

          {/* Vehicle Type & Rate Category */}
          <RateCategoryVehicleTypeForm
            vehicleType={vehicleType}
            onVehicleTypeChange={setVehicleType}
            rateCategory={rateCategory}
            onRateCategoryChange={setRateCategory}
            showPreviewBar={false}
          />

          {/* Price & Currency */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2 grid gap-1.5">
              <Label htmlFor="rate_price" className="text-xs font-medium">
                Price
              </Label>
              <Input
                id="rate_price"
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="h-9 text-xs font-mono font-medium"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="rate_currency" className="text-xs font-medium">
                Currency
              </Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="rate_currency" className="h-9 text-xs font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SAR" className="text-xs">SAR</SelectItem>
                  <SelectItem value="USD" className="text-xs">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Optional Label */}
          <div className="grid gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="rate_name" className="text-xs font-medium">
                Label
              </Label>
              <span className="text-[11px] text-muted-foreground">Optional</span>
            </div>
            <Input
              id="rate_name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Defaults to lane name (e.g. Riyadh → Jeddah)"
              className="h-9 text-xs"
            />
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="mt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-8 text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSubmit}
            disabled={!isValid || saveMutation.isPending}
            className="h-8 gap-1.5 bg-brand text-xs font-medium text-white hover:bg-brand-hover"
          >
            {saveMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isEditing ? 'Save changes' : 'Add rate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


