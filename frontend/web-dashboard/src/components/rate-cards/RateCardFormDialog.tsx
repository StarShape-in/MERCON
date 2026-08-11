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
import { rateCardService, RateCard, VEHICLE_TYPES, RATE_CATEGORIES } from '@/services/rateCardService';
import { customerService } from '@/services/customerService';

/** Renders as "No tier" in dropdowns — the DB stores this selection as null. */
const NONE_VALUE = '__none__';

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

  // Reset every time the dialog opens so a previous edit never leaks into a
  // fresh create.
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
      <DialogContent className="max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-extrabold">
            {isEditing ? 'Edit rate' : 'Add rate'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            One price for one lane, for one customer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Customer */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Customer</Label>
            {lockedCustomerId ? (
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-3 py-2 text-xs font-semibold">
                <Building2 className="h-3.5 w-3.5 text-indigo-600" />
                {lockedCustomerName || 'This customer'}
              </div>
            ) : (
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Choose customer..." />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Lane */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Lane</Label>
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <LocationCombobox
                  value={originId}
                  onChange={(id) => setOriginId(id)}
                  placeholder="From..."
                />
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-[#E8450F]" />
              <div className="flex-1 min-w-0">
                <LocationCombobox
                  value={destinationId}
                  onChange={(id) => setDestinationId(id)}
                  placeholder="To..."
                />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Not on the list? Type the name in the dropdown to add it. Same place on both ends is
              fine for within-city local delivery.
            </p>
          </div>

          {/* Vehicle type & Rate category */}
          <RateCategoryVehicleTypeForm
            vehicleType={vehicleType}
            onVehicleTypeChange={setVehicleType}
            rateCategory={rateCategory}
            onRateCategoryChange={setRateCategory}
            showPreviewBar={true}
          />

          {/* Price */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="rate_price" className="text-xs font-semibold">
                Price per trip
              </Label>
              <Input
                id="rate_price"
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="1500.00"
                className="h-9 font-mono text-xs font-bold"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rate_currency" className="text-xs font-semibold">
                Currency
              </Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="rate_currency" className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SAR">SAR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Optional label — the lane already names itself, so this stays last */}
          <div className="space-y-1.5">
            <Label htmlFor="rate_name" className="text-xs font-semibold">
              Label <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="rate_name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Defaults to the lane name"
              className="h-9 text-xs"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} className="h-9 text-xs">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!isValid || saveMutation.isPending}
            className="h-9 gap-1.5 bg-[#E8450F] text-xs font-bold text-white hover:bg-[#d03d0c]"
          >
            {saveMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isEditing ? 'Save changes' : 'Add rate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
