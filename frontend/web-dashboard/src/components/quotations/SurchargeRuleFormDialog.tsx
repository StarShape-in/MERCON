import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Loader2, Tag, MapPin, Banknote, Sparkles } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ChargeTypeCombobox from '@/components/quotations/ChargeTypeCombobox';
import { rateCardService, surchargeRuleService, SurchargeRule } from '@/services/rateCardService';
import { customerService } from '@/services/customerService';
import Btn from '@/components/ui/Btn';

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
  const [rate, setRate] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: customersRes } = useQuery({
    queryKey: ['customers-select'],
    queryFn: () => customerService.getAll({ per_page: 100, mode: 'lookup' }),
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
      setRate(String(rule.rate ?? ''));
    } else {
      setCustomerId(lockedCustomerId || '');
      setRateCardId(ANY_LANE);
      setChargeType('');
      setRate('');
    }
  }, [isOpen, rule, lockedCustomerId]);

  const numericRate = parseFloat(rate || '');
  const isValid = !!effectiveCustomerId && !!chargeType.trim() && !isNaN(numericRate) && numericRate > 0;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        customerId: effectiveCustomerId,
        rateCardId: rateCardId === ANY_LANE ? null : rateCardId,
        charge_type: chargeType.trim(),
        unit: null,
        vehicle_type: null,
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
    if (!effectiveCustomerId) return setError('Select a customer for this surcharge.');
    if (!chargeType.trim()) return setError('Enter or select a charge type.');
    if (isNaN(numericRate) || numericRate <= 0) return setError('Enter a rate greater than 0.');
    saveMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px] p-6 rounded-2xl border-slate-200/80 shadow-2xl bg-white dark:bg-slate-900 dark:border-slate-800">
        {/* Header */}
        <DialogHeader className="space-y-1.5 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/10 text-brand border border-orange-500/20">
                <Tag className="h-4.5 w-4.5" />
              </div>
              <div>
                <DialogTitle className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                  {isEditing ? 'Edit Surcharge Fee' : 'Add Surcharge Fee'}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                  Standing rate card fee for waiting, additional stops, or labor.
                </DialogDescription>
              </div>
            </div>
            <Badge className="bg-orange-50 dark:bg-orange-950/40 text-brand border-orange-200 dark:border-orange-900/50 font-semibold text-[10px] uppercase tracking-wider px-2 py-0.5 shrink-0">
              Rate Card Fee
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Section 1: Customer Account & Scope */}
          <div className="p-3.5 bg-slate-50/60 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-3">
            {/* Customer Account */}
            <div className="space-y-1.5 min-w-0">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-slate-400" /> Customer Account
              </Label>
              {lockedCustomerId ? (
                <div className="flex h-9 items-center gap-2 rounded-lg border border-slate-200/80 bg-white px-3 text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 shadow-2xs">
                  <Building2 className="h-3.5 w-3.5 text-brand" />
                  <span>{lockedCustomerName || 'Selected Customer'}</span>
                </div>
              ) : (
                <Select value={customerId} onValueChange={(v) => { setCustomerId(v); setRateCardId(ANY_LANE); }}>
                  <SelectTrigger className="h-9 text-xs bg-white dark:bg-slate-900 font-semibold border-slate-200 dark:border-slate-700 rounded-lg shadow-2xs">
                    <SelectValue placeholder="Select a company..." />
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
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-slate-400" /> Applies To Lane
              </Label>
              <Select value={rateCardId} onValueChange={setRateCardId} disabled={!effectiveCustomerId}>
                <SelectTrigger className="h-9 text-xs bg-white dark:bg-slate-900 font-semibold border-slate-200 dark:border-slate-700 rounded-lg shadow-2xs">
                  <SelectValue placeholder="Select a lane..." />
                </SelectTrigger>
                <SelectContent className="z-[9999]">
                  <SelectItem value={ANY_LANE} className="text-xs font-medium">
                    Every lane for this customer
                  </SelectItem>
                  {rateCards.map((rc) => {
                    const stops = rc.stops || [];
                    const origin = stops[0]?.source_label || stops[0]?.location?.name || (rc as any).origin_name || rc.route_origin;
                    const dest = stops[stops.length - 1]?.source_label || stops[stops.length - 1]?.location?.name || (rc as any).destination_name || rc.route_destination;
                    const label = origin && dest ? `${origin} → ${dest}` : rc.name || 'Untitled Lane';
                    return (
                      <SelectItem key={rc.id} value={rc.id} className="text-xs font-medium">
                        {label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Section 2: Charge Type */}
          <div className="p-3.5 bg-slate-50/60 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-slate-400" /> Charge Type / Fee Name
              </Label>
              <ChargeTypeCombobox value={chargeType} onChange={setChargeType} customerId={effectiveCustomerId} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="surcharge_rate" className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Banknote className="h-3.5 w-3.5 text-slate-400" /> Base Price per Unit (SAR)
              </Label>
              <input
                id="surcharge_rate"
                type="number"
                step="0.01"
                min="0"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="0.00"
                className="w-full h-9 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 outline-none focus:border-brand transition-colors"
              />
            </div>

            {chargeType.trim() && numericRate > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-50/70 dark:bg-orange-950/30 border border-orange-200/70 dark:border-orange-900/40 text-xs font-medium text-amber-900 dark:text-amber-200">
                <Sparkles className="w-3.5 h-3.5 text-brand shrink-0" />
                <span>
                  Preset surcharge of <strong className="font-mono font-bold text-brand">{numericRate.toLocaleString()} SAR</strong> for <strong>{chargeType}</strong>.
                </span>
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300 font-medium">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="mt-1 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Btn label="Cancel" variant="secondary" size="sm" onClick={onClose} type="button" />
          <Btn
            label={saveMutation.isPending ? 'Saving...' : isEditing ? 'Save Changes' : '+ Add Surcharge Fee'}
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={!isValid || saveMutation.isPending}
            isLoading={saveMutation.isPending}
            type="button"
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
