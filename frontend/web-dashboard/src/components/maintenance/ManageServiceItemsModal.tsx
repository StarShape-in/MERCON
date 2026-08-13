import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tag, Wrench, Trash2, Plus, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { maintenanceService } from '@/services/maintenanceService';

interface ManageServiceItemsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ManageServiceItemsModal({
  open,
  onOpenChange,
}: ManageServiceItemsModalProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  // Add Service Form
  const [svcTitle, setSvcTitle] = useState('');
  const [svcCategory, setSvcCategory] = useState('General');
  const [svcError, setSvcError] = useState('');

  // Query
  const { data: workItems = [], isLoading } = useQuery({
    queryKey: ['workItems'],
    queryFn: () => maintenanceService.getWorkItems(),
    enabled: open,
  });

  // Mutations
  const createSvcMutation = useMutation({
    mutationFn: (payload: { title: string; category?: string }) =>
      maintenanceService.createWorkItem(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workItems'] });
      setSvcTitle('');
      setSvcError('');
    },
    onError: (err: any) => {
      setSvcError(err.response?.data?.error?.message || 'Failed to save service item.');
    },
  });

  const deleteSvcMutation = useMutation({
    mutationFn: (id: string) => maintenanceService.deleteWorkItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workItems'] });
    },
  });

  const handleAddService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!svcTitle.trim()) {
      setSvcError('Service title is required.');
      return;
    }
    createSvcMutation.mutate({
      title: svcTitle.trim(),
      category: svcCategory.trim() || 'General',
    });
  };

  const filteredServices = workItems.filter(
    (s) =>
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      (s.category && s.category.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl rounded-2xl p-0 overflow-hidden max-h-[85vh] flex flex-col border-slate-200 dark:border-slate-800">
        <DialogHeader className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <DialogTitle className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Tag className="w-5 h-5 text-[#E8450F]" />
            Manage Saved Service Items
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Configure savable service detail presets (e.g. Tire Puncture Repair, Oil Change) so they can be selected quickly.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {/* Add Service Item Form */}
          <form onSubmit={handleAddService} className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Add New Service Detail Item</p>
            {svcError && <p className="text-xs font-bold text-rose-600">{svcError}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <Input
                value={svcTitle}
                onChange={(e) => setSvcTitle(e.target.value)}
                placeholder="e.g. Tire Puncture Repair *"
                className="h-8 text-xs sm:col-span-2"
              />
              <Input
                value={svcCategory}
                onChange={(e) => setSvcCategory(e.target.value)}
                placeholder="Category (e.g. Tires, Brakes)"
                className="h-8 text-xs"
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={createSvcMutation.isPending} className="h-7 text-xs bg-[#E8450F] hover:bg-[#d03c0b] text-white font-bold">
                <Plus className="w-3 h-3 mr-1" />
                Save Service Item
              </Button>
            </div>
          </form>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search service items..."
              className="pl-8 h-8.5 text-xs"
            />
          </div>

          {/* Service Items Grid */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Saved Service Items ({filteredServices.length})
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filteredServices.map((s) => (
                <div key={s.id} className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block">{s.title}</span>
                    {s.category && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">
                        {s.category}
                      </span>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteSvcMutation.mutate(s.id)}
                    className="h-7 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    title="Delete service item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
              {filteredServices.length === 0 && (
                <p className="p-4 text-center text-slate-400 sm:col-span-2">No service items found.</p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
