import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Wrench, Plus, Check, Tag } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { maintenanceService, SavedWorkItem } from '@/services/maintenanceService';
import { cn } from '@/lib/utils';

interface WorkDoneSelectProps {
  value: string;
  onChange: (text: string) => void;
}

export default function WorkDoneSelect({ value, onChange }: WorkDoneSelectProps) {
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('General');
  const [saveError, setSaveError] = useState('');

  const { data: workItems = [], isLoading } = useQuery({
    queryKey: ['workItems'],
    queryFn: () => maintenanceService.getWorkItems(),
    staleTime: 30_000,
  });

  const saveWorkItemMutation = useMutation({
    mutationFn: (payload: { title: string; category?: string }) =>
      maintenanceService.createWorkItem(payload),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['workItems'] });
      toggleItem(saved.title);
      setIsAddDialogOpen(false);
      setNewTitle('');
      setSaveError('');
    },
    onError: (err: any) => {
      setSaveError(err.response?.data?.error?.message || 'Failed to save work item.');
    },
  });

  // Toggles or appends a saved service item to the value string
  const toggleItem = (title: string) => {
    const currentItems = value
      ? value
          .split(/,\s*|\n+/)
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    let updated: string[];
    if (currentItems.includes(title)) {
      updated = currentItems.filter((item) => item !== title);
    } else {
      updated = [...currentItems, title];
    }
    onChange(updated.join(', '));
  };

  const handleSaveNewItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setSaveError('Service detail / title is required.');
      return;
    }
    saveWorkItemMutation.mutate({
      title: newTitle.trim(),
      category: newCategory.trim() || 'General',
    });
  };

  const currentList = value
    ? value
        .split(/,\s*|\n+/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
          Work Done / Service Details *
        </Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setIsAddDialogOpen(true)}
          className="h-6 px-2 text-[11px] font-bold text-[#E8450F] hover:bg-orange-50 dark:hover:bg-orange-950/20"
        >
          <Plus className="w-3 h-3 mr-1" />
          + Save New Service Item
        </Button>
      </div>

      {/* Selectable Quick Chips */}
      {workItems.length > 0 && (
        <div className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Select Saved Service Items:
          </p>
          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
            {workItems.map((item) => {
              const isSelected = currentList.includes(item.title);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleItem(item.title)}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-[11px] font-medium transition-all flex items-center gap-1 border',
                    isSelected
                      ? 'bg-[#E8450F] text-white border-[#E8450F] shadow-sm font-semibold'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-[#E8450F]/50 hover:text-[#E8450F]',
                  )}
                >
                  {isSelected ? <Check className="w-3 h-3 shrink-0" /> : <Wrench className="w-2.5 h-2.5 text-slate-400 shrink-0" />}
                  <span>{item.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Text Area for selected or custom service details */}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Select saved service items above or type custom repair details (e.g. Tire Puncture Repair, Oil Change...)"
        rows={2.5}
        className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-[#E8450F] resize-none"
      />

      {/* Add New Service Item Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl p-0 overflow-hidden">
          <DialogHeader className="px-5 py-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
            <DialogTitle className="text-sm font-extrabold flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <Tag className="w-4 h-4 text-[#E8450F]" />
              Save New Service Item
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Save common service work (e.g. Tire Puncture, Brake Pads) to quickly select it anytime.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveNewItem} className="p-5 space-y-3.5 text-xs">
            {saveError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700">
                {saveError}
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs font-bold">Service Detail / Item Title *</Label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Tire Puncture Repair"
                className="h-8.5 text-xs"
                autoFocus
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Category</Label>
              <Input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="e.g. Tires, Brakes, Oil & Fluids, Engine"
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
                disabled={saveWorkItemMutation.isPending}
                className="h-8 text-xs bg-[#E8450F] hover:bg-[#d03c0b] text-white font-bold px-4"
              >
                {saveWorkItemMutation.isPending ? 'Saving...' : 'Save Service Item'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
