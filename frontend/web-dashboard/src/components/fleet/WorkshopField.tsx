import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Wrench, Plus, Building2, Phone } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

interface WorkshopFieldProps {
  value: string;
  onChange: (name: string) => void;
  onPick?: (workshop: Workshop) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export default function WorkshopField({
  value,
  onChange,
  onPick,
  placeholder = 'Select Saved Workshop',
  className,
}: WorkshopFieldProps) {
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newWorkshopName, setNewWorkshopName] = useState('');
  const [newWorkshopPhone, setNewWorkshopPhone] = useState('');
  const [newWorkshopAddress, setNewWorkshopAddress] = useState('');
  const [saveError, setSaveError] = useState('');

  const { data: workshops = [], isLoading } = useQuery({
    queryKey: ['workshops'],
    queryFn: () => maintenanceService.getWorkshops(),
    staleTime: 30_000,
  });

  const saveWorkshopMutation = useMutation({
    mutationFn: (payload: { name: string; contact_phone?: string; address?: string }) =>
      maintenanceService.createWorkshop(payload),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['workshops'] });
      onChange(saved.name);
      onPick?.({
        name: saved.name,
        contact: saved.contact || newWorkshopPhone || null,
        address: saved.address || newWorkshopAddress || null,
        order_count: 0,
        is_saved: true,
      });
      setIsAddDialogOpen(false);
      setNewWorkshopName('');
      setNewWorkshopPhone('');
      setNewWorkshopAddress('');
      setSaveError('');
    },
    onError: (err: any) => {
      setSaveError(err.response?.data?.error?.message || 'Failed to save workshop.');
    },
  });

  const handleSelectWorkshop = (val: string) => {
    if (val === '__ADD_NEW__') {
      setIsAddDialogOpen(true);
      return;
    }

    const found = workshops.find((w) => w.name === val);
    onChange(val);
    if (found) {
      onPick?.(found);
    }
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

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Select value={value || ''} onValueChange={handleSelectWorkshop}>
          <SelectTrigger className={cn('h-8.5 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800', className)}>
            <SelectValue placeholder={isLoading ? 'Loading workshops...' : placeholder}>
              {value ? (
                <div className="flex items-center gap-2 truncate font-semibold text-slate-900 dark:text-slate-100">
                  <Building2 className="w-3.5 h-3.5 text-[#E8450F] shrink-0" />
                  <span className="truncate">{value}</span>
                </div>
              ) : (
                <span className="text-slate-400">{placeholder}</span>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-60">
            <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span>Saved Workshops ({workshops.length})</span>
            </div>

            {workshops.map((w) => (
              <SelectItem key={w.name} value={w.name} className="text-xs cursor-pointer py-2">
                <div className="flex items-center justify-between gap-3 w-full">
                  <div className="flex items-center gap-2 truncate">
                    <Wrench className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="font-medium text-slate-800 dark:text-slate-200">{w.name}</span>
                    {w.is_saved && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50">
                        Saved
                      </span>
                    )}
                  </div>
                  {w.contact && (
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 shrink-0">
                      <Phone className="w-2.5 h-2.5" />
                      {w.contact}
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}

            <div className="p-1 border-t border-slate-100 dark:border-slate-800 mt-1">
              <button
                type="button"
                onClick={() => setIsAddDialogOpen(true)}
                className="w-full px-2.5 py-1.5 rounded text-xs font-bold text-[#E8450F] hover:bg-orange-50 dark:hover:bg-orange-950/30 flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Save New Workshop</span>
              </button>
            </div>
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsAddDialogOpen(true)}
          title="Save a new workshop"
          className="h-8.5 px-2.5 text-xs font-bold shrink-0 border-slate-200 dark:border-slate-800 text-[#E8450F] hover:bg-orange-50 dark:hover:bg-orange-950/20"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          New
        </Button>
      </div>

      {/* Dialog for adding/saving a new Workshop */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl p-0 overflow-hidden">
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
