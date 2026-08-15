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
  FileText,
} from 'lucide-react';
import { EXPENSE_CATEGORIES, EXPENSE_PAYMENT_METHODS } from '@mercon/shared-types';
import { getCategoryTheme } from '@/utils/expenseCategoryColors';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
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
  const [showVehicleLink, setShowVehicleLink] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFormError('');

    if (editingExpense) {
      const hasVehicle = Boolean(editingExpense.vehicleId);
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
      setShowVehicleLink(hasVehicle);

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
      setShowVehicleLink(false);
    }
  }, [open, editingExpense]);

  const isSalaryCategory =
    formData.category === 'Salary' || formData.category === 'Salary Advance';

  const set = <K extends keyof CreateExpensePayload>(key: K, value: CreateExpensePayload[K]) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  const handleCategoryChange = (val: string) => {
    set('category', val);
    const vehicleCategories = ['Fuel', 'Vehicle Maintenance', 'Toll & Parking'];
    if (vehicleCategories.includes(val)) {
      setShowVehicleLink(true);
    }
  };

  const handleToggleVehicleLink = (enable: boolean) => {
    setShowVehicleLink(enable);
    if (!enable) {
      set('vehicle_id', null);
    }
  };

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
        vehicle_id: showVehicleLink ? formData.vehicle_id || null : null,
        payee:
          formData.payee?.trim() ||
          (isSalaryCategory && employeeName.trim() ? employeeName.trim() : formData.payee),
      };

      if (editingExpense) {
        await expenseService.update(editingExpense.id, payload);
      } else {
        await expenseService.create(payload);
      }

      queryClient.invalidateQueries({ queryKey: ['expenses'] });
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
      <DialogContent className="w-full max-w-[95vw] sm:max-w-2xl md:max-w-3xl lg:max-w-3xl rounded-2xl p-0 overflow-hidden border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col shadow-2xl bg-white dark:bg-slate-950">
        {/* Header */}
        <DialogHeader className="px-6 py-4.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-brand border border-orange-500/20 shadow-sm shrink-0">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <DialogTitle className="text-lg font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                    {editingExpense ? 'Edit Expense Record' : 'New Expense Record'}
                  </DialogTitle>
                  <Badge className="bg-orange-50 text-brand border-orange-200/80 dark:bg-orange-950/30 dark:border-orange-800/50 font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 shadow-none">
                    Finance Module
                  </Badge>
                </div>
                <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Record company expenses — salaries, fuel, rent, maintenance, utilities, or general costs.
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Form Body */}
        <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Error banner */}
            {formError && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs font-semibold text-rose-700 dark:text-rose-400 flex items-center gap-2.5 animate-in fade-in slide-in-from-top-1">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Top Grid: Classification & Financials side by side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Categorization & Status */}
              <div className="bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-800/70 rounded-xl p-4.5 space-y-4">
                <SectionLabel icon={<Tag className="w-4 h-4 text-orange-500" />} label="Classification" />

                {/* Category */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Category <Required />
                  </Label>
                  <Select
                    value={formData.category}
                    onValueChange={handleCategoryChange}
                  >
                    <SelectTrigger className="h-10 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-medium">
                      <SelectValue placeholder="Select an expense category…" />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map((c) => {
                        const theme = getCategoryTheme(c);
                        return (
                          <SelectItem key={c} value={c} className="text-xs">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${theme.dot}`} />
                              <span className="font-medium">{c}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Expense Date & Payment Status */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Expense Date <Required />
                    </Label>
                    <Input
                      type="date"
                      value={formData.expense_date}
                      onChange={(e) => set('expense_date', e.target.value)}
                      className="h-10 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Payment Status <Required />
                    </Label>
                    <Select
                      value={formData.status}
                      onValueChange={(val: ExpenseStatus) => set('status', val)}
                    >
                      <SelectTrigger className="h-10 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-medium">
                        <SelectValue placeholder="Status…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Paid" className="text-xs">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                            <span className="font-semibold text-emerald-700 dark:text-emerald-400">Paid</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="Pending" className="text-xs">
                          <div className="flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                            <span className="font-semibold text-amber-700 dark:text-amber-400">Pending</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Right Column: Financial & Payment Info */}
              <div className="bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-800/70 rounded-xl p-4.5 space-y-4">
                <SectionLabel icon={<CreditCard className="w-4 h-4 text-orange-500" />} label="Financial Details" />

                {/* Amount */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Amount <Required />
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-extrabold text-slate-500 dark:text-slate-400 pointer-events-none bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                      SAR
                    </span>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.amount || ''}
                      onChange={(e) => set('amount', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="h-10 text-sm font-bold text-slate-900 dark:text-slate-100 pl-16 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
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
                    <SelectTrigger className="h-10 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-medium">
                      <SelectValue placeholder="Select method…" />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPENSE_PAYMENT_METHODS.map((m) => (
                        <SelectItem key={m} value={m} className="text-xs">
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Payee / Recipient Section */}
            <div className="bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-800/70 rounded-xl p-4.5 space-y-4">
              <SectionLabel icon={<User className="w-4 h-4 text-orange-500" />} label="Payee & Beneficiary" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Payee Name */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Payee / Vendor Name
                  </Label>
                  <Input
                    value={formData.payee || ''}
                    onChange={(e) => set('payee', e.target.value)}
                    placeholder={
                      isSalaryCategory
                        ? 'e.g. Employee Full Name'
                        : 'e.g. Al-Jazeera Gas Station, Landlord, Supplier…'
                    }
                    className="h-10 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                  />
                  <p className="text-[11px] text-slate-400 leading-snug">
                    {isSalaryCategory
                      ? 'Name of the recipient receiving this salary payment.'
                      : 'Vendor, contractor, or individual paid.'}
                  </p>
                </div>

                {/* Employee Name (for Salary categories) */}
                {isSalaryCategory && (
                  <div className="space-y-1.5 animate-in fade-in duration-200">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Employee Name
                    </Label>
                    <Input
                      value={employeeName}
                      onChange={(e) => setEmployeeName(e.target.value)}
                      placeholder="Full name of staff member…"
                      className="h-10 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                    />
                    <p className="text-[11px] text-slate-400 leading-snug">
                      For payroll tracking (driver, staff, or admin).
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Optional Asset Linkage (Vehicle Link) */}
            <div className="space-y-3">
              {!showVehicleLink ? (
                <button
                  type="button"
                  onClick={() => handleToggleVehicleLink(true)}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50/50 hover:bg-orange-50/30 dark:bg-slate-900/30 dark:hover:bg-orange-950/10 text-slate-600 dark:text-slate-400 hover:text-brand dark:hover:text-brand hover:border-orange-300 dark:hover:border-orange-900 transition-all group"
                >
                  <div className="flex items-center gap-2.5 text-xs font-semibold">
                    <div className="p-1.5 rounded-lg bg-slate-200/60 dark:bg-slate-800 group-hover:bg-orange-100 dark:group-hover:bg-orange-950/40 text-slate-500 group-hover:text-brand transition-colors">
                      <Truck className="w-4 h-4" />
                    </div>
                    <span>+ Link expense to a specific vehicle / asset</span>
                  </div>
                  <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500 group-hover:text-orange-600/80 transition-colors">
                    Optional (fuel, repair, maintenance)
                  </span>
                </button>
              ) : (
                <div className="bg-orange-50/40 dark:bg-orange-950/10 border border-orange-200/70 dark:border-orange-900/30 rounded-xl p-4.5 space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <SectionLabel
                      icon={<Truck className="w-4 h-4 text-brand" />}
                      label="Vehicle / Asset Linkage"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleVehicleLink(false)}
                      className="h-7 text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 px-2 rounded-lg"
                    >
                      Remove vehicle link
                    </Button>
                  </div>

                  <div className="space-y-1.5 max-w-md">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Associated Vehicle
                    </Label>
                    <Select
                      value={formData.vehicle_id || 'none'}
                      onValueChange={(val) => set('vehicle_id', val === 'none' ? null : val)}
                    >
                      <SelectTrigger className="h-10 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-medium">
                        <SelectValue placeholder="Select vehicle…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none" className="text-xs">
                          — No Vehicle Selected —
                        </SelectItem>
                        {vehicles.map((v) => (
                          <SelectItem key={v.id} value={v.id} className="text-xs">
                            {v.plate_number} {v.ref_id ? `(${v.ref_id})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            {/* Notes Section */}
            <div className="space-y-2">
              <SectionLabel icon={<FileText className="w-4 h-4 text-orange-500" />} label="Notes & References" />
              <textarea
                value={formData.description || ''}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Additional details, invoice numbers, receipt reference, or context…"
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-brand resize-none transition-colors"
              />
            </div>
          </div>

          {/* Footer */}
          <DialogFooter className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 shrink-0 flex items-center justify-between gap-3">
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <Required /> Required fields
            </div>
            <div className="flex items-center gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={isSaving}
                className="text-xs h-9 px-4 font-semibold border-slate-200 dark:border-slate-800"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSaving}
                className="text-xs h-9 px-6 bg-brand hover:bg-[#d03c0b] text-white font-bold rounded-xl shadow-md shadow-orange-500/20 transition-all"
              >
                {isSaving ? (
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Saving…
                  </span>
                ) : editingExpense ? (
                  'Update Expense'
                ) : (
                  'Save Expense'
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* Helpers */

function Required() {
  return <span className="text-rose-500 font-bold ml-0.5">*</span>;
}

function SectionLabel({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400">
        {label}
      </span>
    </div>
  );
}
