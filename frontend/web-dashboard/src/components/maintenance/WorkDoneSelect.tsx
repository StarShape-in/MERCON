import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Wrench, Plus, Check, Search, ChevronsUpDown, X, Tag } from 'lucide-react';

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
import { maintenanceService } from '@/services/maintenanceService';
import { cn } from '@/lib/utils';

interface WorkDoneSelectProps {
  value: string;
  onChange: (text: string) => void;
}

export default function WorkDoneSelect({ value, onChange }: WorkDoneSelectProps) {
  const queryClient = useQueryClient();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Add custom item dialog
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('General');
  const [saveError, setSaveError] = useState('');

  const { data: workItems = [] } = useQuery({
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
      setSaveError(err.response?.data?.error?.message || 'Failed to save service item.');
    },
  });

  // Convert current comma-separated value string into an array of titles
  const selectedItems = value
    ? value
        .split(/,\s*|\n+/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const toggleItem = (title: string) => {
    let updated: string[];
    if (selectedItems.includes(title)) {
      updated = selectedItems.filter((item) => item !== title);
    } else {
      updated = [...selectedItems, title];
    }
    onChange(updated.join(', '));
  };

  const removeItem = (titleToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = selectedItems.filter((item) => item !== titleToRemove);
    onChange(updated.join(', '));
  };

  const handleSaveNewItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setSaveError('Service title is required.');
      return;
    }
    saveWorkItemMutation.mutate({
      title: newTitle.trim(),
      category: newCategory.trim() || 'General',
    });
  };

  const filteredWorkItems = workItems.filter(
    (item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
          Work Done / Service Details *
        </Label>
        <span className="text-[11px] text-slate-400 font-normal">
          {selectedItems.length} item(s) selected
        </span>
      </div>

      {/* Field Trigger Button opening Popover Dropdown */}
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'w-full min-h-[42px] px-3 py-2 rounded-xl border bg-white dark:bg-slate-900 text-left text-xs transition-all flex items-center justify-between gap-2 shadow-2xs cursor-pointer',
              popoverOpen
                ? 'border-brand ring-2 ring-brand/20'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            )}
          >
            <div className="flex-1 flex flex-wrap gap-1.5 items-center overflow-hidden">
              {selectedItems.length > 0 ? (
                selectedItems.map((title) => (
                  <span
                    key={title}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-orange-50 dark:bg-orange-950/40 text-brand dark:text-orange-400 border border-orange-200 dark:border-orange-900/60"
                  >
                    <span>{title}</span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => removeItem(title, e)}
                      className="hover:text-rose-600 cursor-pointer ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </span>
                  </span>
                ))
              ) : (
                <span className="text-slate-400 font-normal flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-slate-400" />
                  Select service details (e.g. Tire Puncture Repair, Oil Change)...
                </span>
              )}
            </div>
            <ChevronsUpDown className="w-4 h-4 text-slate-400 shrink-0" />
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          className="w-[360px] sm:w-[480px] p-0 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl bg-white dark:bg-slate-900 overflow-hidden z-[9999]"
        >
          {/* Search Bar Header */}
          <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search service details (e.g. Tire, Oil, Brakes)..."
              className="h-8 text-xs border-none shadow-none focus-visible:ring-0 bg-transparent"
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

          {/* Selectable Items List */}
          <div className="max-h-60 overflow-y-auto p-2 space-y-1">
            {filteredWorkItems.map((item) => {
              const isSelected = selectedItems.includes(item.title);
              return (
                <div
                  key={item.id}
                  onClick={() => toggleItem(item.title)}
                  className={cn(
                    'px-3 py-2 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-colors',
                    isSelected
                      ? 'bg-orange-50/80 dark:bg-orange-950/30 text-brand dark:text-orange-300 font-bold'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        'w-4 h-4 rounded border flex items-center justify-center transition-colors',
                        isSelected
                          ? 'bg-brand border-brand text-white'
                          : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800'
                      )}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span>{item.title}</span>
                  </div>

                  {item.category && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                      {item.category}
                    </span>
                  )}
                </div>
              );
            })}

            {filteredWorkItems.length === 0 && (
              <div className="p-4 text-center text-xs text-slate-400">
                No service items matching "{searchQuery}"
              </div>
            )}
          </div>

          {/* Footer Action: Save New Service Item */}
          <div className="p-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-medium">Don't see your service item?</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setPopoverOpen(false);
                setIsAddDialogOpen(true);
              }}
              className="h-7 text-xs font-bold text-brand border-orange-200 dark:border-orange-900/50 hover:bg-orange-50"
            >
              <Plus className="w-3 h-3 mr-1" />
              + Save New Service Item
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Dialog for adding custom new service item */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl p-0 overflow-hidden border-slate-200 dark:border-slate-800">
          <DialogHeader className="px-5 py-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
            <DialogTitle className="text-sm font-extrabold flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <Tag className="w-4 h-4 text-brand" />
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
                className="h-8 text-xs bg-brand hover:bg-[#d03c0b] text-white font-bold px-4"
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
