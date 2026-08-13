import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Wallet, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { EXPENSE_CATEGORIES, EXPENSE_PAYMENT_METHODS } from '@mercon/shared-types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { expenseService, Expense, CreateExpensePayload, ExpenseStatus } from '@/services/expenseService';
import { driverService } from '@/services/driverService';
import { vehicleService } from '@/services/vehicleService';

const TODAY_ISO = new Date().toISOString().split('T')[0];

const EMPTY_FORM: CreateExpensePayload = {
  category: 'Salary',
  status: 'Paid',
  driver_id: null,
  vehicle_id: null,
  payee: '',
  amount: 0,
  currency: 'SAR',
  expense_date: TODAY_ISO,
  payment_method: 'Bank Transfer',
  description: '',
};

export interface ExpenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingExpense?: Expense | null;
  onSuccess?: () => void;
}

export default function ExpenseModal({ open, onOpenChange, editingExpense = null, onSuccess }: ExpenseModalProps) {
  const queryClient = useQueryClient();

  const { data: driversRes } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => driverService.getAll({ per_page: 500 }),
    enabled: open,
  });
  const { data: vehiclesRes } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => vehicleService.getAll({ per_page: 500 }),
    enabled: open,
  });

  const drivers = driversRes?.data || [];
  const vehicles = vehiclesRes?.data || [];

  const [formData, setFormData] = useState<CreateExpensePayload>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFormError('');

    if (editingExpense) {
      setFormData({
        category: editingExpense.category,
        status: editingExpense.status,
        driver_id: editingExpense.driverId || null,
        vehicle_id: editingExpense.vehicleId || null,
        payee: editingExpense.payee || '',
        amount: editingExpense.amount,
        currency: editingExpense.currency || 'SAR',
        expense_date: editingExpense.expense_date ? editingExpense.expense_date.split('T')[0] : TODAY_ISO,
        payment_method: editingExpense.payment_method || '',
        description: editingExpense.description || '',
      });
    } else {
      setFormData(EMPTY_FORM);
    }
  }, [open, editingExpense]);

  const isSalaryCategory = formData.category === 'Salary' || formData.category === 'Salary Advance';

  const invalidateCache = () => {
    queryClient.invalidateQueries({ queryKey: ['expenses'] });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.category.trim()) {
      setFormError('Category is required.');
      return;
    }
    if (!formData.amount || formData.amount <= 0) {
      setFormError('Amount must be greater than zero.');
      return;
    }

    setIsSaving(true);
    try {
      const payload: CreateExpensePayload = {
        ...formData,
        driver_id: formData.driver_id || null,
        vehicle_id: formData.vehicle_id || null,
      };

      if (editingExpense) {
        await expenseService.update(editingExpense.id, payload);
      } else {
        await expenseService.create(payload);
      }

      invalidateCache();
      onSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      setFormError(err.response?.data?.error?.message || 'Failed to save expense.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !isSaving && onOpenChange(val)}>
      <DialogContent className="w-full max-w-[95vw] sm:max-w-xl md:max-w-2xl rounded-2xl p-0 overflow-hidden border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col">
        <DialogHeader className="px-6 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 shrink-0">
          <DialogTitle className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-[#E8450F]" />
            {editingExpense ? 'Edit Expense' : 'Add Expense'}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 mt-0.5">
            Log a salary payment, fuel bill, rent, or any other operating cost.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-5 space-y-3.5 text-xs">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="space-y-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">What &amp; When</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(val: string) => setFormData((prev) => ({ ...prev, category: val }))}
                >
                  <SelectTrigger className="h-8.5 text-xs">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Status *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(val: ExpenseStatus) => setFormData((prev) => ({ ...prev, status: val }))}
                >
                  <SelectTrigger className="h-8.5 text-xs">
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Paid">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <span>Paid</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="Pending">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        <span>Pending</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Expense Date *</Label>
                <Input
                  type="date"
                  value={formData.expense_date}
                  onChange={(e) => setFormData((prev) => ({ ...prev, expense_date: e.target.value }))}
                  className="h-8.5 text-xs"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2.5 pt-1">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Linked To (optional)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <Label className="text-xs font-bold">
                  Driver {isSalaryCategory && <span className="text-slate-400 font-normal">(for salary payments)</span>}
                </Label>
                <Select
                  value={formData.driver_id || 'none'}
                  onValueChange={(val) => setFormData((prev) => ({ ...prev, driver_id: val === 'none' ? null : val }))}
                >
                  <SelectTrigger className="h-8.5 text-xs">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {drivers.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.first_name} {d.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Vehicle</Label>
                <Select
                  value={formData.vehicle_id || 'none'}
                  onValueChange={(val) => setFormData((prev) => ({ ...prev, vehicle_id: val === 'none' ? null : val }))}
                >
                  <SelectTrigger className="h-8.5 text-xs">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {vehicles.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.plate_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-2.5 pt-1">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Payment</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Amount (SAR) *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData((prev) => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                  placeholder="0.00"
                  className="h-8.5 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Payment Method</Label>
                <Select
                  value={formData.payment_method || ''}
                  onValueChange={(val) => setFormData((prev) => ({ ...prev, payment_method: val }))}
                >
                  <SelectTrigger className="h-8.5 text-xs">
                    <SelectValue placeholder="Select Method" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Payee</Label>
                <Input
                  value={formData.payee || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, payee: e.target.value }))}
                  placeholder="e.g. driver name, vendor, landlord"
                  className="h-8.5 text-xs"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1 pt-1">
            <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">Notes</Label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Internal notes about this expense..."
              rows={3}
              className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-[#E8450F] resize-none"
            />
          </div>

          <DialogFooter className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 shrink-0">
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={isSaving} className="text-xs h-8.5">
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSaving}
              className="text-xs h-8.5 bg-[#E8450F] hover:bg-[#d03c0b] text-white font-bold px-4"
            >
              {isSaving ? 'Saving...' : editingExpense ? 'Update Expense' : 'Save Expense'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
