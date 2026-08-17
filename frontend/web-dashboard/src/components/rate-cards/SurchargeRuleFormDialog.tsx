import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Loader2 } from 'lucide-react';

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
import ChargeTypeCombobox from '@/components/rate-cards/ChargeTypeCombobox';
import UnitCombobox from '@/components/rate-cards/UnitCombobox';
import { rateCardService, surchargeRuleService, SurchargeRule } from '@/services/rateCardService';
import { customerService } from '@/services/customerService';
import { SUGGESTED_UNIT_BY_CHARGE_TYPE } from '@mercon/shared-types';

interface SurchargeRuleFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (rule: SurchargeRule) => void;
  /** Editing an existing rule; omit to create. */
  rule?: SurchargeRule | null;
  /** Locks the rule to one customer (used from the customer or rate card page). */
  lockedCustomerId?: string;
  lockedCustomerName?: string;
}

const ANY_LANE = '__any_lane__';

export default function SurchargeRuleFormDialog({
  isOpen,
  onClose,
  onSaved,
  rule,
  lockedCustomerId,
  lockedCustomerName,
}: SurchargeRuleFormDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = !!rule;

  const [customerId, setCustomerId] = useState('');
  const [rateCardId, setRateCardId] = useState(ANY_LANE);
  const [chargeType, setChargeType] = useState('');
  const [unit, setUnit] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [rate, setRate] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: customersRes } = useQuery({
    queryKey: ['customers-select'],
    queryFn: () => customerService.getAll({ per_page: 100 }),
    enabled: isOpen && !lockedCustomerId,
  });
  const customers = customersRes?.data || [];

  const effectiveCustomerId = lockedCustomerId || customerId;

  const { data: rateCardsRes } = useQuery({
    queryKey: ['rate-cards-for-customer', effectiveCustomerId],
    queryFn: () => rateCardService.getAll({ customerId: effectiveCustomerId, per_page: 'all' }),
    enabled: isOpen && !!effectiveCustomerId,
  });
  const rateCards = rateCardsRes?.data || [];

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    if (rule) {
      setCustomerId(rule.customerId || '');
      setRateCardId(rule.rateCardId || ANY_LANE);
      setChargeType(rule.charge_type || '');
      setUnit(rule.unit || '');
      setVehicleType(rule.vehicle_type || '');
      setRate(String(rule.rate ?? ''));
    } else {
      setCustomerId(lockedCustomerId || '');
      setRateCardId(ANY_LANE);
      setChargeType('');
      setUnit('');
      setVehicleType('');
      setRate('');
    }
  }, [isOpen, rule, lockedCustomerId]);

  const handleChargeTypeChange = (v: string) => {
    setChargeType(v);
    // Only fill an empty unit — never overwrite one the user already picked
    // or typed, so re-selecting a different charge type doesn't clobber a
    // deliberate override.
    if (!unit.trim() && v in SUGGESTED_UNIT_BY_CHARGE_TYPE) {
      setUnit(SUGGESTED_UNIT_BY_CHARGE_TYPE[v as keyof typeof SUGGESTED_UNIT_BY_CHARGE_TYPE]);
    }
  };

  const numericRate = parseFloat(rate || '');
  const isValid = !!effectiveCustomerId && !!chargeType.trim() && !isNaN(numericRate) && numericRate > 0;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        customerId: effectiveCustomerId,
        rateCardId: rateCardId === ANY_LANE ? null : rateCardId,
        charge_type: chargeType.trim(),
        unit: unit.trim() || null,
        vehicle_type: vehicleType.trim() || null,
        rate: numericRate,
      };
      return rule
        ? surchargeRuleService.update(rule.id, payload)
        : surchargeRuleService.create(payload);
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['surcharge-rules'] });
      queryClient.invalidateQueries({ queryKey: ['surcharge-charge-types'] });
      onSaved?.(saved);
      onClose();
    },
    onError: (err: any) => {
      setError(err.response?.data?.error?.message || err.message || 'Could not save the fee.');
    },
  });

  const handleSubmit = () => {
    setError(null);
    if (!effectiveCustomerId) return setError('Choose which customer this fee is for.');
    if (!chargeType.trim()) return setError('Enter a charge type.');
    if (isNaN(numericRate) || numericRate <= 0) return setError('Enter a rate greater than 0.');
    saveMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {isEditing ? 'Edit Surcharge Fee' : 'Add Surcharge Fee'}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            A standing fee for this customer — waiting/labor, additional stops, and the like.
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
              <Select value={customerId} onValueChange={(v) => { setCustomerId(v); setRateCardId(ANY_LANE); }}>
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

          {/* Applies to */}
          <div className="grid gap-1.5">
            <Label className="text-xs font-medium">Applies to</Label>
            <Select value={rateCardId} onValueChange={setRateCardId} disabled={!effectiveCustomerId}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Select a lane..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY_LANE} className="text-xs">Every lane for this customer</SelectItem>
                {rateCards.map((rc) => (
                  <SelectItem key={rc.id} value={rc.id} className="text-xs">
                    {rc.route_origin} → {rc.route_destination}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Charge type */}
          <div className="grid gap-1.5">
            <Label className="text-xs font-medium">Charge type</Label>
            <ChargeTypeCombobox value={chargeType} onChange={handleChargeTypeChange} customerId={effectiveCustomerId} />
          </div>

          {/* Unit & Vehicle type */}
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1.5">
              <Label className="text-xs font-medium">Unit</Label>
              <UnitCombobox value={unit} onChange={setUnit} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="surcharge_vehicle_type" className="text-xs font-medium">
                Vehicle type
              </Label>
              <Input
                id="surcharge_vehicle_type"
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                placeholder="Optional"
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Rate */}
          <div className="grid gap-1.5">
            <Label htmlFor="surcharge_rate" className="text-xs font-medium">
              Rate (SAR)
            </Label>
            <Input
              id="surcharge_rate"
              type="number"
              step="0.01"
              min="0"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="0.00"
              className="h-9 text-xs font-mono font-medium"
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
            {isEditing ? 'Save changes' : 'Add fee'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
