import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Loader2, Tag, Banknote, ShieldCheck } from 'lucide-react';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { surchargeRuleService, SurchargeRule, CreateSurchargeRulePayload } from '@/services/quotationService';

interface SurchargeRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  quotationId?: string;
  customerName?: string;
  editingRule?: SurchargeRule | null;
}

const CHARGE_TYPES = [
  { value: 'Additional Stop', label: 'Additional Stop' },
  { value: 'Waiting / Labor', label: 'Waiting / Labor' },
  { value: 'Labour Charge', label: 'Labour Charge' },
  { value: 'Offloading Charge', label: 'Offloading Charge' },
  { value: 'Same-Day Delivery', label: 'Same-Day Delivery' },
  { value: 'Trolley Fee', label: 'Trolley Fee' },
];

const UNITS = [
  { value: 'Per Stop', label: 'Per Stop' },
  { value: 'Per Hour', label: 'Per Hour' },
  { value: 'Per Person', label: 'Per Person' },
  { value: 'Per Vehicle', label: 'Per Vehicle' },
  { value: 'Flat', label: 'Flat' },
];

const VEHICLE_CLASSES = [
  { value: 'ALL', label: 'All Vehicles' },
  { value: '3-4 TON', label: '3-4 TON' },
  { value: '5 TON', label: '5 TON' },
  { value: '10 TON', label: '10 TON' },
  { value: '20 TON', label: '20 TON' },
  { value: '40 FEET', label: '40 FEET' },
];

export default function SurchargeRuleModal({
  isOpen,
  onClose,
  customerId,
  quotationId,
  customerName,
  editingRule,
}: SurchargeRuleModalProps) {
  const queryClient = useQueryClient();

  const [chargeType, setChargeType] = useState<string>('Additional Stop');
  const [unit, setUnit] = useState<string>('Per Stop');
  const [rate, setRate] = useState<string>('50.00');
  const [currency, setCurrency] = useState<string>('SAR');
  const [vehicleType, setVehicleType] = useState<string>('ALL');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (editingRule) {
      setChargeType(editingRule.charge_type || 'Additional Stop');
      setUnit(editingRule.unit || 'Per Stop');
      setRate(String(editingRule.rate ?? '50.00'));
      setCurrency(editingRule.currency || 'SAR');
      setVehicleType(editingRule.vehicle_type || 'ALL');
      setIsActive(editingRule.is_active ?? true);
    } else {
      setChargeType('Additional Stop');
      setUnit('Per Stop');
      setRate('50.00');
      setCurrency('SAR');
      setVehicleType('ALL');
      setIsActive(true);
    }
    setFormError(null);
  }, [editingRule, isOpen]);

  const numericRate = parseFloat(rate || '');

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: CreateSurchargeRulePayload = {
        customerId,
        quotationId: quotationId || null,
        rateCardId: quotationId || null,
        charge_type: chargeType,
        unit,
        rate: numericRate,
        currency,
        vehicle_type: vehicleType === 'ALL' ? null : vehicleType,
        is_active: isActive,
      };

      return editingRule?.id
        ? surchargeRuleService.update(editingRule.id, payload)
        : surchargeRuleService.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surcharge-rules'] });
      toast.success(`Additional charge ${editingRule ? 'updated' : 'added'} successfully.`);
      onClose();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error?.message || err.message || 'Failed to save surcharge rule.';
      setFormError(msg);
      toast.error(msg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!chargeType.trim()) {
      setFormError('Please select or specify a charge type.');
      return;
    }
    if (isNaN(numericRate) || numericRate <= 0) {
      setFormError('Please enter a valid rate greater than 0.');
      return;
    }

    saveMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !saveMutation.isPending) onClose(); }}>
      <DialogContent className="w-full max-w-md rounded-2xl p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xl">
        <DialogHeader className="p-0 border-b border-slate-100 dark:border-slate-800 pb-3">
          <DialogTitle className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Tag className="h-4 w-4 text-indigo-600" />
            {editingRule ? 'Edit Additional Charge' : 'Add Additional Charge'}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 font-medium">
            Define a secondary customer surcharge rule for {customerName || 'this quotation'}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-3 text-xs">
          {formError && (
            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 font-semibold rounded-lg text-[11px]">
              {formError}
            </div>
          )}

          {/* Charge Type */}
          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Charge Type *</Label>
            <Select value={chargeType} onValueChange={setChargeType}>
              <SelectTrigger className="h-9 text-xs bg-white dark:bg-slate-900 font-semibold border-slate-200 dark:border-slate-800 rounded-lg">
                <SelectValue placeholder="Select charge type..." />
              </SelectTrigger>
              <SelectContent className="z-[9999]">
                {CHARGE_TYPES.map((ct) => (
                  <SelectItem key={ct.value} value={ct.value} className="text-xs font-semibold">
                    {ct.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Unit & Rate Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Unit *</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger className="h-9 text-xs bg-white dark:bg-slate-900 font-semibold border-slate-200 dark:border-slate-800 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[9999]">
                  {UNITS.map((u) => (
                    <SelectItem key={u.value} value={u.value} className="text-xs font-semibold">
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Rate *</Label>
              <Input
                type="number"
                step="0.01"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="50.00"
                className="h-9 text-xs bg-white dark:bg-slate-900 font-extrabold rounded-lg"
              />
            </div>
          </div>

          {/* Currency & Vehicle Class Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="h-9 text-xs bg-white dark:bg-slate-900 font-bold border-slate-200 dark:border-slate-800 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[9999]">
                  <SelectItem value="SAR" className="text-xs font-bold">SAR</SelectItem>
                  <SelectItem value="AED" className="text-xs font-bold">AED</SelectItem>
                  <SelectItem value="USD" className="text-xs font-bold">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Vehicle Class</Label>
              <Select value={vehicleType} onValueChange={setVehicleType}>
                <SelectTrigger className="h-9 text-xs bg-white dark:bg-slate-900 font-semibold border-slate-200 dark:border-slate-800 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[9999]">
                  {VEHICLE_CLASSES.map((vc) => (
                    <SelectItem key={vc.value} value={vc.value} className="text-xs font-semibold">
                      {vc.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active Checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="is_active_check"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <Label htmlFor="is_active_check" className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
              Rule is active for future trip matching
            </Label>
          </div>

          <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="flex-1 h-9 text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saveMutation.isPending}
              size="sm"
              className="flex-1 h-9 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs rounded-lg"
            >
              {saveMutation.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              {editingRule ? 'Save Changes' : 'Save Charge'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
