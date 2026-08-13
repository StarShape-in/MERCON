import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Wallet,
  AlertTriangle,
  CheckCircle2,
  Clock,
  User,
  Truck,
  CreditCard,
  Tag,
  CalendarDays,
  FileText,
} from 'lucide-react';
import { EXPENSE_CATEGORIES, EXPENSE_PAYMENT_METHODS } from '@mercon/shared-types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { expenseService, Expense, CreateExpensePayload, ExpenseStatus } from '@/services/expenseService';
import { vehicleService } from '@/services/vehicleService';

const TODAY_ISO = new Date().toISOString().split('T')[0];

const EMPTY_FORM: CreateExpensePayload = {
  category: '',
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

export default function ExpenseModal({
  open,
  onOpenChange,
  editingExpense = null,
  onSuccess,
}: ExpenseModalProps) {
  const queryClient = useQueryClient();

  const { data: vehiclesRes } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => vehicleService.getAll({ per_page: 500 }),
    enabled: open,
  });

  const vehicles = vehiclesRes?.data || [];

  const [formData, setFormData] = useState<CreateExpensePayload>(EMPTY_FORM);
  const [employeeName, setEmployeeName] = useState('');
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
        expense_date: editingExpense.expense_date
          ? editingExpense.expense_date.split('T')[0]
          : TODAY_ISO,
        payment_method: editingExpense.payment_method || '',
        description: editingExpense.description || '',
      });
      // Pre-fill employee name from driver if present
      if (editingExpense.driver) {
        setEmployeeName(
          `${editingExpense.driver.first_name} ${editingExpense.driver.last_name}`.trim()
        );
      } else {
        setEmployeeName('');
      }
    } else {
      setFormData(EMPTY_FORM);
      setEmployeeName('');
    }
  }, [open, editingExpense]);

  const isSalaryCategory =
    formData.category === 'Salary' || formData.category === 'Salary Advance';

  const invalidateCache = () => {
    queryClient.invalidateQueries({ queryKey: ['expenses'] });
  };

  const set = <K extends keyof CreateExpensePayload>(key: K, value: CreateExpensePayload[K]) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.category.trim()) {
      setFormError('Please select a category.');
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
        // If salary category and employee name provided but no payee, use it as payee
        payee:
          formData.payee?.trim() ||
          (isSalaryCategory && employeeName.trim() ? employeeName.trim() : formData.payee),
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
      <DialogContent className="w-full max-w-[95vw] sm:max-w-lg md:max-w-xl rounded-2xl p-0 overflow-hidden border-slate-200 dark:border-slate-800 max-h-[92vh] flex flex-col shadow-xl">
        {/* ── Header ────────────────────────────────────────────────── */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-900 shrink-0">
          <DialogTitle className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E8450F]/10">
              <Wallet className="w-4 h-4 text-[#E8450F]" />
            </span>
            {editingExpense ? 'Edit Expense' : 'New Expense'}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 mt-1 ml-[42px]">
            Record any operating cost — salary, fuel, rent, maintenance, utilities, and more.
          </DialogDescription>
        </DialogHeader>

        {/* ── Form Body ─────────────────────────────────────────────── */}
        <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-6">
            {/* Error */}
            {formError && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 text-xs font-semibold text-rose-700 dark:text-rose-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* ── Section 1: Classification ──────────────────────── */}
            <section className="space-y-3">
              <SectionLabel icon={<Tag className="w-3.5 h-3.5" />} label="Classification" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Category */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Category <Required />
                  </Label>
                  <Select
                    value={formData.category}
                    onValueChange={(val: string) => set('category', val)}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Select a category…" />
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

                {/* Status */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Payment Status <Required />
                  </Label>
                  <Select
                    value={formData.status}
                    onValueChange={(val: ExpenseStatus) => set('status', val)}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Select status…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Paid">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          <span>Paid</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="Pending">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          <span>Pending</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            {/* ── Section 2: Payment Details ──────────────────────── */}
            <section className="space-y-3">
              <SectionLabel icon={<CreditCard className="w-3.5 h-3.5" />} label="Payment Details" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Amount */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Amount <Required />
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                      SAR
                    </span>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.amount || ''}
                      onChange={(e) => set('amount', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="h-9 text-xs pl-11"
                    />
                  </div>
                </div>

                {/* Payment Method */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Payment Method
                  </Label>
                  <Select
                    value={formData.payment_method || ''}
                    onValueChange={(val) => set('payment_method', val)}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Select method…" />
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

                {/* Date */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Expense Date <Required />
                  </Label>
                  <Input
                    type="date"
                    value={formData.expense_date}
                    onChange={(e) => set('expense_date', e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            </section>

            {/* ── Section 3: Payee / Recipient ────────────────────── */}
            <section className="space-y-3">
              <SectionLabel icon={<User className="w-3.5 h-3.5" />} label="Payee / Recipient" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Payee */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Payee Name
                  </Label>
                  <Input
                    value={formData.payee || ''}
                    onChange={(e) => set('payee', e.target.value)}
                    placeholder={
                      isSalaryCategory
                        ? 'e.g. Ahmed Al-Harbi'
                        : 'e.g. Al-Jazeera Gas Station, Landlord…'
                    }
                    className="h-9 text-xs"
                  />
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    {isSalaryCategory
                      ? 'Name of the employee receiving this salary payment.'
                      : 'Vendor, supplier, or individual receiving this payment.'}
                  </p>
                </div>

                {/* Employee Name — only shown for salary-type categories */}
                {isSalaryCategory && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Employee Name
                    </Label>
                    <Input
                      value={employeeName}
                      onChange={(e) => setEmployeeName(e.target.value)}
                      placeholder="Full name of the employee…"
                      className="h-9 text-xs"
                    />
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      For salary tracking. Can be a driver, admin, or any staff member.
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* ── Section 4: Link to Asset (optional) ─────────────── */}
            <section className="space-y-3">
              <SectionLabel
                icon={<Truck className="w-3.5 h-3.5" />}
                label="Link to Asset"
                optional
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Vehicle */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Vehicle
                  </Label>
                  <Select
                    value={formData.vehicle_id || 'none'}
                    onValueChange={(val) =>
                      set('vehicle_id', val === 'none' ? null : val)
                    }
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— None —</SelectItem>
                      {vehicles.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.plate_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-slate-400">
                    Tie this expense to a specific vehicle (e.g., fuel, maintenance).
                  </p>
                </div>
              </div>
            </section>

            {/* ── Section 5: Notes ────────────────────────────────── */}
            <section className="space-y-3">
              <SectionLabel icon={<FileText className="w-3.5 h-3.5" />} label="Notes" optional />
              <textarea
                value={formData.description || ''}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Any additional context, invoice reference, or internal notes…"
                rows={3}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E8450F]/40 focus:border-[#E8450F] resize-none transition-colors"
              />
            </section>
          </div>

          {/* ── Footer ──────────────────────────────────────────────── */}
          <DialogFooter className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 shrink-0 flex justify-end gap-2.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
              className="text-xs h-9 px-4 font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSaving}
              className="text-xs h-9 px-5 bg-[#E8450F] hover:bg-[#d03c0b] text-white font-bold rounded-lg shadow-sm"
            >
              {isSaving
                ? 'Saving…'
                : editingExpense
                ? 'Update Expense'
                : 'Save Expense'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ── Helpers ──────────────────────────────────────────────────────────── */

function Required() {
  return <span className="text-rose-500 ml-0.5">*</span>;
}

function SectionLabel({
  icon,
  label,
  optional,
}: {
  icon: React.ReactNode;
  label: string;
  optional?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-slate-400">{icon}</span>
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
        {label}
      </span>
      {optional && (
        <span className="text-[10px] font-normal text-slate-300 dark:text-slate-600 ml-1">
          · optional
        </span>
      )}
    </div>
  );
}
