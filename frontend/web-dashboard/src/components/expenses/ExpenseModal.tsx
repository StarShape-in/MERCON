import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Wallet,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Truck,
  CreditCard,
  Tag,
  FileText,
  Plus,
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
import { driverService, Driver } from '@/services/driverService';
import { User, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const TODAY_ISO = new Date().toISOString().split('T')[0];
const ADD_NEW_CATEGORY_VALUE = '__add_new_category__';

const EMPTY_FORM: CreateExpensePayload = {
  category: '',
  status: 'Paid',
  driver_id: null,
  vehicle_id: null,
  amount: 0,
  currency: 'SAR',
  expense_date: TODAY_ISO,
  payment_method: 'Bank Transfer',
  description: '',
  bill_issued_date: '',
  bill_paid_date: '',
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

  const { data: driversRes } = useQuery({
    queryKey: ['drivers-select'],
    queryFn: () => driverService.getAll({ per_page: 500 }),
    enabled: open,
  });

  const vehicles = vehiclesRes?.data || [];
  const drivers: Driver[] = driversRes?.data || [];

  const [formData, setFormData] = useState<CreateExpensePayload>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showVehicleLink, setShowVehicleLink] = useState(false);
  const [showDriverLink, setShowDriverLink] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState('');

  useEffect(() => {
    if (!open) return;
    setFormError('');

    if (editingExpense) {
      const hasVehicle = Boolean(editingExpense.vehicleId);
      const hasDriver = Boolean(editingExpense.driverId);
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
        bill_issued_date: editingExpense.bill_issued_date
          ? editingExpense.bill_issued_date.split('T')[0]
          : '',
        bill_paid_date: editingExpense.bill_paid_date
          ? editingExpense.bill_paid_date.split('T')[0]
          : '',
      });
      setShowVehicleLink(hasVehicle);
      setShowDriverLink(hasDriver);

      const isKnownCategory = (EXPENSE_CATEGORIES as readonly string[]).includes(
        editingExpense.category
      );
      setIsAddingCategory(!isKnownCategory && Boolean(editingExpense.category));
      setCustomCategory(isKnownCategory ? '' : editingExpense.category || '');
    } else {
      setFormData(EMPTY_FORM);
      setShowVehicleLink(false);
      setShowDriverLink(false);
      setIsAddingCategory(false);
      setCustomCategory('');
    }
  }, [open, editingExpense]);

  // A Pending expense is a placeholder — only Classification is known yet.
  // Everything else gets filled in once it's actually paid.
  const isPending = formData.status === 'Pending';

  const set = <K extends keyof CreateExpensePayload>(key: K, value: CreateExpensePayload[K]) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  const handleCategoryChange = (val: string) => {
    if (val === ADD_NEW_CATEGORY_VALUE) {
      setIsAddingCategory(true);
      setCustomCategory('');
      set('category', '');
      return;
    }
    setIsAddingCategory(false);
    set('category', val);
    const vehicleCategories = ['Fuel', 'Vehicle Maintenance', 'Toll & Parking'];
    if (vehicleCategories.includes(val)) {
      setShowVehicleLink(true);
    }
    const driverCategories = ['Salary', 'Salary Advance'];
    if (driverCategories.includes(val)) {
      setShowDriverLink(true);
    }
  };

  const handleCustomCategoryChange = (val: string) => {
    setCustomCategory(val);
    set('category', val);
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
                  {isAddingCategory ? (
                    <div className="flex items-center gap-2">
                      <Input
                        autoFocus
                        value={customCategory}
                        onChange={(e) => handleCustomCategoryChange(e.target.value)}
                        placeholder="Type a new category name…"
                        className="h-10 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsAddingCategory(false);
                          setCustomCategory('');
                          set('category', '');
                        }}
                        className="h-10 text-[11px] font-semibold border-slate-200 dark:border-slate-800 shrink-0"
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
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
                        <SelectItem value={ADD_NEW_CATEGORY_VALUE} className="text-xs">
                          <div className="flex items-center gap-2 text-brand font-semibold">
                            <Plus className="w-3.5 h-3.5 shrink-0" />
                            <span>Add new category…</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
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

                {/* Bill Issued & Paid Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Bill Issued Date
                    </Label>
                    <Input
                      type="date"
                      value={formData.bill_issued_date || ''}
                      onChange={(e) => set('bill_issued_date', e.target.value)}
                      className="h-10 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Bill Paid Date
                    </Label>
                    <Input
                      type="date"
                      value={formData.bill_paid_date || ''}
                      onChange={(e) => set('bill_paid_date', e.target.value)}
                      className="h-10 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Financial & Payment Info */}
              <div className="bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-800/70 rounded-xl p-4.5 space-y-4">
                <SectionLabel icon={<CreditCard className="w-4 h-4 text-orange-500" />} label="Financial Details" />

                {/* Amount — always fillable, Pending or not: the bill's amount is
                    normally known even before it's paid. */}
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

                {/* Payment Method — the one field that genuinely doesn't apply
                    until the bill is actually paid. */}
                <div className={cn('space-y-1.5 transition-opacity', isPending && 'opacity-45')}>
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Payment Method
                  </Label>
                  <Select
                    value={formData.payment_method || ''}
                    onValueChange={(val) => set('payment_method', val)}
                    disabled={isPending}
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

            {isPending && (
              <p className="text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-1.5 -mt-3">
                <Clock className="w-3 h-3 shrink-0" />
                Payment Method and vehicle linkage can wait until this is marked Paid — everything else can be filled in now.
              </p>
            )}

            {/* Optional Driver Linkage */}
            <div className={cn('space-y-3 transition-opacity', isPending && 'opacity-45')}>
              {!showDriverLink ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setShowDriverLink(true)}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50/50 hover:bg-purple-50/30 dark:bg-slate-900/30 dark:hover:bg-purple-950/10 text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:border-purple-300 dark:hover:border-purple-900 transition-all group disabled:cursor-not-allowed disabled:hover:bg-slate-50/50 disabled:hover:text-slate-600 disabled:hover:border-slate-300"
                >
                  <div className="flex items-center gap-2.5 text-xs font-semibold">
                    <div className="p-1.5 rounded-lg bg-slate-200/60 dark:bg-slate-800 group-hover:bg-purple-100 dark:group-hover:bg-purple-950/40 text-slate-500 group-hover:text-purple-600 transition-colors">
                      <Users className="w-4 h-4" />
                    </div>
                    <span>+ Link expense to a specific driver / employee</span>
                  </div>
                  <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500 group-hover:text-purple-600/80 transition-colors">
                    Recommended for Salary & Salary Advance
                  </span>
                </button>
              ) : (
                <div className="bg-purple-50/40 dark:bg-purple-950/10 border border-purple-200/70 dark:border-purple-900/30 rounded-xl p-4.5 space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <SectionLabel
                      icon={<Users className="w-4 h-4 text-purple-600" />}
                      label="Driver / Personnel Linkage"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isPending}
                      onClick={() => {
                        setShowDriverLink(false);
                        set('driver_id', null);
                      }}
                      className="h-7 text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 px-2 rounded-lg"
                    >
                      Remove driver link
                    </Button>
                  </div>

                  <div className="space-y-1.5 max-w-md">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Associated Driver / Employee
                    </Label>
                    <Select
                      value={formData.driver_id || 'none'}
                      onValueChange={(val) => set('driver_id', val === 'none' ? null : val)}
                      disabled={isPending}
                    >
                      <SelectTrigger className="h-10 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-medium">
                        <SelectValue placeholder="Select driver name…" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        <SelectItem value="none" className="text-xs">
                          — No Driver Selected —
                        </SelectItem>
                        {drivers.map((d) => (
                          <SelectItem key={d.id} value={d.id} className="text-xs font-semibold">
                            {d.first_name} {d.last_name} {d.ref_id ? `(${d.ref_id})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            {/* Optional Asset Linkage (Vehicle Link) */}
            <div className={cn('space-y-3 transition-opacity', isPending && 'opacity-45')}>
              {!showVehicleLink ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleToggleVehicleLink(true)}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50/50 hover:bg-orange-50/30 dark:bg-slate-900/30 dark:hover:bg-orange-950/10 text-slate-600 dark:text-slate-400 hover:text-brand dark:hover:text-brand hover:border-orange-300 dark:hover:border-orange-900 transition-all group disabled:cursor-not-allowed disabled:hover:bg-slate-50/50 disabled:hover:text-slate-600 disabled:hover:border-slate-300"
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
                      disabled={isPending}
                      onClick={() => handleToggleVehicleLink(false)}
                      className="h-7 text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 px-2 rounded-lg"
                    >
                      Remove vehicle link
                    </Button>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Associated Vehicle
                    </Label>
                    <Select
                      value={formData.vehicle_id || 'none'}
                      onValueChange={(val) => set('vehicle_id', val === 'none' ? null : val)}
                      disabled={isPending}
                    >
                      <SelectTrigger className="h-auto min-h-[42px] text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-medium py-2">
                        {formData.vehicle_id && vehicles.find(v => v.id === formData.vehicle_id) ? (() => {
                          const sv = vehicles.find(v => v.id === formData.vehicle_id)!;
                          return (
                            <div className="flex items-center gap-2.5 w-full">
                              <div className="p-1.5 rounded-md bg-brand/10 text-brand shrink-0">
                                <Truck className="w-3.5 h-3.5" />
                              </div>
                              <div className="flex flex-col items-start text-left">
                                <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">{sv.plate_number}</span>
                                <span className="text-[10px] text-slate-500">{sv.asset_type} {sv.ref_id ? `· ${sv.ref_id}` : ''} · {sv.status}</span>
                              </div>
                            </div>
                          );
                        })() : (
                          <span className="text-slate-400 text-xs">Select vehicle…</span>
                        )}
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        <SelectItem value="none" className="text-xs">
                          <span className="text-slate-400">— No Vehicle Selected —</span>
                        </SelectItem>
                        {vehicles.map((v) => (
                          <SelectItem key={v.id} value={v.id} className="text-xs py-2">
                            <div className="flex items-center gap-3 w-full">
                              <div className="p-1.5 rounded-md bg-orange-50 dark:bg-orange-950/30 text-brand shrink-0">
                                <Truck className="w-3.5 h-3.5" />
                              </div>
                              <div className="flex flex-col gap-0.5 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">{v.plate_number}</span>
                                  {v.ref_id && (
                                    <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded">{v.ref_id}</span>
                                  )}
                                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                    v.status === 'Available' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' :
                                    v.status === 'OnTrip' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400' :
                                    v.status === 'Maintenance' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400' :
                                    'bg-slate-100 text-slate-500'
                                  }`}>{v.status}</span>
                                </div>
                                <div className="flex items-center gap-3 text-[10px] text-slate-400 dark:text-slate-500">
                                  <span>{v.asset_type}</span>
                                  {v.capacity_kg > 0 && <span>· {(v.capacity_kg / 1000).toFixed(1)} TON</span>}
                                  {v.current_odometer > 0 && <span>· {v.current_odometer.toLocaleString()} km</span>}
                                </div>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            {/* Notes Section */}
            <div className={cn('space-y-2 transition-opacity', isPending && 'opacity-45')}>
              <SectionLabel icon={<FileText className="w-4 h-4 text-orange-500" />} label="Notes & References" />
              <textarea
                value={formData.description || ''}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Additional details, invoice numbers, receipt reference, or context…"
                rows={3}
                disabled={isPending}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-brand resize-none transition-colors disabled:cursor-not-allowed"
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
