import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Loader2, Tag, MapPin, Truck, Banknote, Sparkles, Layers } from 'lucide-react';

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
import { Badge } from '@/components/ui/badge';
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
    queryFn: () => customerService.getAll({ per_page: 100 , mode: 'lookup' }),
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
    // Only fill an empty unit — never overwrite one the user already picked or typed
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
      <DialogContent className="sm:max-w-[540px] p-6 rounded-2xl border-slate-200/80 shadow-2xl bg-white dark:bg-slate-900 dark:border-slate-800">
        
        {/* Header */}
        <DialogHeader className="space-y-1.5 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 border border-amber-200/60 dark:border-amber-800">
                <Tag className="h-4.5 w-4.5" />
              </div>
              <div>
                <DialogTitle className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                  {isEditing ? 'Edit Surcharge Fee' : 'Add Surcharge Fee'}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Standing customer fee schedule for waiting, additional stops, or labor.
                </DialogDescription>
              </div>
            </div>
            <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50 border-amber-200/60 font-semibold text-[10px] uppercase tracking-wider px-2 py-0.5 shrink-0">
              Surcharge Module
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          
          {/* Section 1: Customer & Scope */}
          <div className="p-3.5 bg-slate-50/60 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/80 space-y-3">
            
            {/* Customer Field */}
            <div className="space-y-1.5 min-w-0">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-slate-400" /> Customer Account
              </Label>
              {lockedCustomerId ? (
                <div className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 shadow-2xs">
                  <Building2 className="h-3.5 w-3.5 text-indigo-500" />
                  <span>{lockedCustomerName || 'Selected Customer'}</span>
                </div>
              ) : (
                <Select value={customerId} onValueChange={(v) => { setCustomerId(v); setRateCardId(ANY_LANE); }}>
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

            {/* Applies to Lane */}
            <div className="space-y-1.5 min-w-0">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-slate-400" /> Applies To Lane
              </Label>
              <Select value={rateCardId} onValueChange={setRateCardId} disabled={!effectiveCustomerId}>
                <SelectTrigger className="h-9 text-xs bg-white dark:bg-slate-900 font-medium border-slate-200 dark:border-slate-700 rounded-lg shadow-2xs">
                  <SelectValue placeholder="Select a lane..." />
                </SelectTrigger>
                <SelectContent className="z-[9999]">
                  <SelectItem value={ANY_LANE} className="text-xs font-medium">
                    Every lane for this customer
                  </SelectItem>
                  {rateCards.map((rc) => (
                    <SelectItem key={rc.id} value={rc.id} className="text-xs font-medium">
                      {rc.route_origin} → {rc.route_destination}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Section 2: Charge Type & Specification */}
          <div className="p-3.5 bg-slate-50/60 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/80 space-y-3">
            
            {/* Charge Type */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-slate-400" /> Charge Type / Fee Name
              </Label>
              <ChargeTypeCombobox value={chargeType} onChange={handleChargeTypeChange} customerId={effectiveCustomerId} />
            </div>

            {/* Unit & Vehicle Type */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-slate-400" /> Unit
                </Label>
                <UnitCombobox value={unit} onChange={setUnit} />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="surcharge_vehicle_type" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Truck className="h-3.5 w-3.5 text-slate-400" /> Vehicle Type
                  </Label>
                  <span className="text-[10px] text-slate-400 font-medium">Optional</span>
                </div>
                <Input
                  id="surcharge_vehicle_type"
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  placeholder="e.g. Dyna, Flatbed..."
                  className="h-9 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-lg shadow-2xs font-medium"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Pricing Rate & Summary */}
          <div className="p-3.5 bg-slate-50/60 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/80 space-y-2.5">
            
            <div className="space-y-1.5">
              <Label htmlFor="surcharge_rate" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Banknote className="h-3.5 w-3.5 text-slate-400" /> Base Surcharge Rate (SAR)
              </Label>
              <Input
                id="surcharge_rate"
                type="number"
                step="0.01"
                min="0"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="0.00"
                className="h-9 text-xs font-mono font-bold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-lg shadow-2xs"
              />
            </div>

            {/* Live Billing Formula Preview */}
            {chargeType.trim() && numericRate > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/40 text-xs font-medium text-amber-900 dark:text-amber-200">
                <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>
                  Will apply as <strong className="font-mono font-bold text-amber-950 dark:text-amber-100">{numericRate.toLocaleString()} SAR</strong> {unit ? `(${unit})` : 'flat fee'} for <strong>{chargeType}</strong>.
                </span>
              </div>
            )}

          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50/80 p-3 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300 font-medium">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
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
            className="h-9 px-5 gap-1.5 bg-brand hover:bg-brand-hover text-white text-xs font-bold rounded-xl shadow-xs transition-all disabled:opacity-50"
          >
            {saveMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isEditing ? 'Save Changes' : '+ Add Surcharge Fee'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

