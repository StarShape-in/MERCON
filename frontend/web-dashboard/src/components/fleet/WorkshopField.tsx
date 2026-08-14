import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Wrench, Plus, Building2, Phone, Search, ChevronsUpDown, Check, X, Trash2, CheckCircle2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { maintenanceService, Workshop } from '@/services/maintenanceService';
import { cn } from '@/lib/utils';
import ConfirmModal from '@/components/ui/ConfirmModal';

interface WorkshopFieldProps {
  value: string;
  onChange: (name: string) => void;
  onPick?: (workshop: Workshop) => void;
  placeholder?: string;
  className?: string;
}

export default function WorkshopField({
  value,
  onChange,
  onPick,
  placeholder = 'Select or enter workshop name',
  className,
}: WorkshopFieldProps) {
  const queryClient = useQueryClient();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newWorkshopName, setNewWorkshopName] = useState('');
  const [newWorkshopPhone, setNewWorkshopPhone] = useState('');
  const [newWorkshopAddress, setNewWorkshopAddress] = useState('');
  const [saveError, setSaveError] = useState('');

  const [checkedForDeleteNames, setCheckedForDeleteNames] = useState<Set<string>>(new Set());
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  const { data: workshops = [], isLoading } = useQuery({
    queryKey: ['workshops'],
    queryFn: () => maintenanceService.getWorkshops(),
    staleTime: 30_000,
  });

  const saveWorkshopMutation = useMutation({
    mutationFn: (payload: { name: string; contact_phone?: string; address?: string }) =>
      maintenanceService.createWorkshop(payload),
    onSuccess: (saved: any) => {
      queryClient.invalidateQueries({ queryKey: ['workshops'] });
      const contactVal = saved.contact_phone || saved.contact || newWorkshopPhone.trim() || null;
      onChange(saved.name);
      onPick?.({
        id: saved.id,
        name: saved.name,
        contact: contactVal,
        address: saved.address || newWorkshopAddress.trim() || null,
        order_count: 0,
        is_saved: true,
      });
      setIsAddDialogOpen(false);
      setPopoverOpen(false);
      setNewWorkshopName('');
      setNewWorkshopPhone('');
      setNewWorkshopAddress('');
      setSaveError('');
      setSearchQuery('');
    },
    onError: (err: any) => {
      setSaveError(err.response?.data?.error?.message || 'Failed to save workshop.');
    },
  });

  const deleteWorkshopsMutation = useMutation({
    mutationFn: (targets: Workshop[]) =>
      Promise.all(
        targets.map((w) =>
          w.id ? maintenanceService.deleteWorkshop(w.id) : maintenanceService.clearWorkshopName(w.name)
        )
      ),
    onSuccess: (_data, targets) => {
      queryClient.invalidateQueries({ queryKey: ['workshops'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      const deletedNames = targets.map((w) => w.name);
      if (deletedNames.includes(value)) onChange('');
      setCheckedForDeleteNames(new Set());
      setIsConfirmDeleteOpen(false);
    },
  });

  const toggleCheckedForDelete = (name: string) => {
    setCheckedForDeleteNames((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const checkedWorkshops = workshops.filter((w) => checkedForDeleteNames.has(w.name));
  const checkedWorkshopNames = checkedWorkshops.map((w) => w.name);

  const handleSelectWorkshop = (w: Workshop) => {
    onChange(w.name);
    onPick?.(w);
    setPopoverOpen(false);
    setSearchQuery('');
  };

  const handleUseTypedName = (typedName: string) => {
    const trimmed = typedName.trim();
    if (!trimmed) return;
    const existing = workshops.find((w) => w.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      handleSelectWorkshop(existing);
    } else {
      onChange(trimmed);
      onPick?.({
        name: trimmed,
        contact: null,
        address: null,
        order_count: 0,
        is_saved: false,
      });
      setPopoverOpen(false);
      setSearchQuery('');
    }
  };

  const openAddDialogWith = (initialName: string = '') => {
    setNewWorkshopName(initialName);
    setNewWorkshopPhone('');
    setNewWorkshopAddress('');
    setSaveError('');
    setIsAddDialogOpen(true);
  };

  const handleSaveNewWorkshop = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkshopName.trim()) {
      setSaveError('Workshop name is required.');
      return;
    }
    saveWorkshopMutation.mutate({
      name: newWorkshopName.trim(),
      contact_phone: newWorkshopPhone.trim() || undefined,
      address: newWorkshopAddress.trim() || undefined,
    });
  };

  const filteredWorkshops = workshops.filter(
    (w) =>
      w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (w.contact && w.contact.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const exactMatchExists = workshops.some(
    (w) => w.name.trim().toLowerCase() === searchQuery.trim().toLowerCase()
  );

  return (
    <div className="relative w-full">
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen} modal={false}>
        <div className="relative flex items-center w-full">
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                'w-full h-9.5 px-3 pr-8 rounded-xl border bg-white dark:bg-slate-900 text-left text-xs transition-all flex items-center justify-between gap-2 cursor-pointer shadow-2xs',
                popoverOpen
                  ? 'border-[#E8450F] ring-2 ring-[#E8450F]/20'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700',
                className
              )}
            >
              {value ? (
                <div className="flex items-center gap-2 truncate font-semibold text-slate-900 dark:text-slate-100">
                  <Building2 className="w-3.5 h-3.5 text-[#E8450F] shrink-0" />
                  <span className="truncate">{value}</span>
                </div>
              ) : (
                <span className="text-slate-400 flex items-center gap-2 min-w-0 truncate">
                  <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate whitespace-nowrap">{isLoading ? 'Loading workshops...' : placeholder}</span>
                </span>
              )}
              <ChevronsUpDown className="w-4 h-4 text-slate-400 shrink-0 ml-auto" />
            </button>
          </PopoverTrigger>

          {value && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
                onPick?.({
                  name: '',
                  contact: null,
                  address: null,
                  order_count: 0,
                  is_saved: false,
                });
              }}
              title="Clear selected workshop"
              className="absolute right-7 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <PopoverContent
          align="start"
          className="w-[var(--radix-popover-trigger-width)] min-w-[320px] p-0 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl bg-white dark:bg-slate-900 overflow-hidden z-[9999] flex flex-col max-h-[min(24rem,var(--radix-popover-content-available-height))]"
        >
          {/* Search Header */}
          <div className="shrink-0 p-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (searchQuery.trim()) {
                    handleUseTypedName(searchQuery);
                  }
                }
              }}
              placeholder="Search or type workshop name..."
              className="h-8 text-xs border-none shadow-none focus-visible:ring-0 bg-transparent p-0"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* List Content */}
          <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
            {/* If user typed a custom workshop name that doesn't exist, show quick assign + save options */}
            {searchQuery.trim() !== '' && !exactMatchExists && (
              <div className="space-y-1 pb-1">
                <button
                  type="button"
                  onClick={() => handleUseTypedName(searchQuery)}
                  className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-orange-50/90 dark:bg-orange-950/40 text-[#E8450F] dark:text-orange-400 border border-orange-200/80 dark:border-orange-900/80 flex items-center justify-between gap-2 cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-950/60 transition-colors text-left"
                >
                  <div className="flex items-center gap-2 truncate">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-[#E8450F]" />
                    <span className="truncate">Use "<strong>{searchQuery.trim()}</strong>"</span>
                  </div>
                  <span className="text-[10px] font-semibold opacity-75 shrink-0">Press Enter ↵</span>
                </button>
              </div>
            )}

            {filteredWorkshops.map((w) => {
              const isSelected = value === w.name;
              const isCheckedForDelete = checkedForDeleteNames.has(w.name);
              return (
                <div
                  key={w.name}
                  className={cn(
                    'w-full px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors select-none group',
                    isCheckedForDelete
                      ? 'bg-emerald-50 dark:bg-emerald-950/30'
                      : isSelected
                      ? 'bg-orange-50/80 dark:bg-orange-950/30 text-[#E8450F] dark:text-orange-300 font-bold'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200'
                  )}
                >
                  <button
                    type="button"
                    onClick={() => handleSelectWorkshop(w)}
                    className="flex-1 flex items-center gap-2.5 truncate text-left cursor-pointer bg-transparent border-0 p-0"
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCheckedForDelete(w.name);
                      }}
                      title={isCheckedForDelete ? 'Unselect for deletion' : 'Select for deletion'}
                      className={cn(
                        'w-4 h-4 rounded shrink-0 flex items-center justify-center border-2 transition-colors cursor-pointer',
                        isCheckedForDelete
                          ? 'bg-emerald-500 border-emerald-500'
                          : 'border-slate-300 dark:border-slate-600 hover:border-emerald-400'
                      )}
                    >
                      {isCheckedForDelete && <Check className="w-3 h-3 text-white stroke-[3]" />}
                    </button>
                    <Wrench className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="truncate font-medium">{w.name}</span>
                    {!w.id && (
                      <span className="text-[9px] text-slate-400 font-medium shrink-0">(history)</span>
                    )}
                  </button>

                  <div
                    onClick={() => handleSelectWorkshop(w)}
                    className="flex items-center gap-2 shrink-0 cursor-pointer pl-2"
                  >
                    {w.contact && (
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                        <Phone className="w-2.5 h-2.5" />
                        {w.contact}
                      </span>
                    )}
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#E8450F] stroke-[3]" />}
                  </div>
                </div>
              );
            })}

            {filteredWorkshops.length === 0 && searchQuery.trim() === '' && (
              <div className="p-4 text-center text-xs text-slate-400">
                No saved workshops found.
              </div>
            )}
          </div>

          {/* Footer Action */}
          <div className="shrink-0 p-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={checkedForDeleteNames.size === 0}
              onClick={() => setIsConfirmDeleteOpen(true)}
              title={checkedForDeleteNames.size > 0 ? `Delete ${checkedForDeleteNames.size} selected workshop(s)` : 'Check a workshop to delete it'}
              className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 disabled:opacity-30"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => openAddDialogWith(searchQuery)}
              className="h-7 text-xs font-bold text-[#E8450F] border-orange-200 dark:border-orange-900/50 hover:bg-orange-50"
            >
              <Plus className="w-3 h-3 mr-1" />
              + Save New Workshop
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Confirm Delete Workshop(s) */}
      <ConfirmModal
        isOpen={isConfirmDeleteOpen}
        onClose={() => setIsConfirmDeleteOpen(false)}
        onConfirm={() => deleteWorkshopsMutation.mutate(checkedWorkshops)}
        title={checkedWorkshopNames.length === 1 ? 'Delete Workshop' : 'Delete Workshops'}
        message={(() => {
          const hasUnsaved = checkedWorkshops.some((w) => !w.id);
          const names = checkedWorkshopNames.join(', ');
          const base = checkedWorkshopNames.length === 1
            ? `Delete "${names}"?`
            : `Delete these ${checkedWorkshopNames.length} workshops? ${names}.`;
          return hasUnsaved
            ? `${base} Any of these that were never saved as a workshop will also be cleared off every past maintenance record that used them. This can't be undone.`
            : `${base} This can't be undone.`;
        })()}
        confirmLabel="Yes, delete"
        isDestructive
        isLoading={deleteWorkshopsMutation.isPending}
      />

      {/* Save New Workshop Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl p-0 overflow-hidden border-slate-200 dark:border-slate-800">
          <DialogHeader className="px-5 py-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
            <DialogTitle className="text-sm font-extrabold flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <Building2 className="w-4 h-4 text-[#E8450F]" />
              Save New Workshop
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Add a workshop once so it can be selected anytime for maintenance records.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveNewWorkshop} className="p-5 space-y-3.5 text-xs">
            {saveError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700">
                {saveError}
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs font-bold">Workshop Name *</Label>
              <Input
                value={newWorkshopName}
                onChange={(e) => setNewWorkshopName(e.target.value)}
                placeholder="e.g. Al-Riyadh Heavy Truck Service"
                className="h-8.5 text-xs"
                autoFocus
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Contact Phone</Label>
              <Input
                value={newWorkshopPhone}
                onChange={(e) => setNewWorkshopPhone(e.target.value)}
                placeholder="+966 5x xxx xxxx"
                className="h-8.5 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Address / Location</Label>
              <Input
                value={newWorkshopAddress}
                onChange={(e) => setNewWorkshopAddress(e.target.value)}
                placeholder="Industrial Area 2, Exit 17, Riyadh"
                className="h-8.5 text-xs"
              />
            </div>

            <DialogFooter className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsAddDialogOpen(false)}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saveWorkshopMutation.isPending}
                className="h-8 text-xs bg-[#E8450F] hover:bg-[#d03c0b] text-white font-bold px-4"
              >
                {saveWorkshopMutation.isPending ? 'Saving...' : 'Save Workshop'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
