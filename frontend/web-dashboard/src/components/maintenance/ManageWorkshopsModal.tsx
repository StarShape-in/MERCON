import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Wrench,
  Trash2,
  Plus,
  Phone,
  MapPin,
  Tag,
  Search,
  CheckCircle2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { maintenanceService, Workshop, SavedWorkItem } from '@/services/maintenanceService';

interface ManageWorkshopsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ManageWorkshopsModal({
  open,
  onOpenChange,
}: ManageWorkshopsModalProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'workshops' | 'services'>('workshops');
  const [search, setSearch] = useState('');

  // Add Workshop Form
  const [wsName, setWsName] = useState('');
  const [wsPhone, setWsPhone] = useState('');
  const [wsAddress, setWsAddress] = useState('');
  const [wsError, setWsError] = useState('');

  // Add Service Form
  const [svcTitle, setSvcTitle] = useState('');
  const [svcCategory, setSvcCategory] = useState('General');
  const [svcError, setSvcError] = useState('');

  // Queries
  const { data: workshops = [], isLoading: isLoadingWs } = useQuery({
    queryKey: ['workshops'],
    queryFn: () => maintenanceService.getWorkshops(),
    enabled: open,
  });

  const { data: workItems = [], isLoading: isLoadingSvc } = useQuery({
    queryKey: ['workItems'],
    queryFn: () => maintenanceService.getWorkItems(),
    enabled: open,
  });

  // Mutations
  const createWsMutation = useMutation({
    mutationFn: (payload: { name: string; contact_phone?: string; address?: string }) =>
      maintenanceService.createWorkshop(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workshops'] });
      setWsName('');
      setWsPhone('');
      setWsAddress('');
      setWsError('');
    },
    onError: (err: any) => {
      setWsError(err.response?.data?.error?.message || 'Failed to save workshop.');
    },
  });

  const deleteWsMutation = useMutation({
    mutationFn: (id: string) => maintenanceService.deleteWorkshop(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workshops'] });
    },
  });

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

  const handleAddWorkshop = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wsName.trim()) {
      setWsError('Workshop name is required.');
      return;
    }
    createWsMutation.mutate({
      name: wsName.trim(),
      contact_phone: wsPhone.trim() || undefined,
      address: wsAddress.trim() || undefined,
    });
  };

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

  const filteredWorkshops = workshops.filter((w) =>
    w.name.toLowerCase().includes(search.toLowerCase()) ||
    (w.contact && w.contact.includes(search))
  );

  const filteredServices = workItems.filter((s) =>
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    (s.category && s.category.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl rounded-2xl p-0 overflow-hidden max-h-[85vh] flex flex-col border-slate-200 dark:border-slate-800">
        <DialogHeader className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <DialogTitle className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#E8450F]" />
            Manage Saved Workshops &amp; Service Items
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Configure savable workshops and work items so they can be selected quickly during maintenance entries.
          </DialogDescription>

          {/* Navigation Tabs */}
          <div className="flex gap-2 pt-3">
            <button
              type="button"
              onClick={() => setActiveTab('workshops')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'workshops'
                  ? 'bg-[#E8450F] text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Saved Workshops ({workshops.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('services')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'services'
                  ? 'bg-[#E8450F] text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Saved Service Items ({workItems.length})</span>
            </button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={activeTab === 'workshops' ? 'Search workshops...' : 'Search service items...'}
              className="pl-8 h-8.5 text-xs"
            />
          </div>

          {/* Tab 1: Workshops */}
          {activeTab === 'workshops' && (
            <div className="space-y-4">
              {/* Add form */}
              <form onSubmit={handleAddWorkshop} className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Add New Workshop</p>
                {wsError && <p className="text-xs font-bold text-rose-600">{wsError}</p>}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <Input
                    value={wsName}
                    onChange={(e) => setWsName(e.target.value)}
                    placeholder="Workshop Name *"
                    className="h-8 text-xs"
                  />
                  <Input
                    value={wsPhone}
                    onChange={(e) => setWsPhone(e.target.value)}
                    placeholder="Contact Phone"
                    className="h-8 text-xs"
                  />
                  <Input
                    value={wsAddress}
                    onChange={(e) => setWsAddress(e.target.value)}
                    placeholder="Address / City"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="flex justify-end">
                  <Button type="submit" size="sm" disabled={createWsMutation.isPending} className="h-7 text-xs bg-[#E8450F] hover:bg-[#d03c0b] text-white font-bold">
                    <Plus className="w-3 h-3 mr-1" />
                    Save Workshop
                  </Button>
                </div>
              </form>

              {/* Workshops List */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Saved &amp; Used Workshops List</p>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                  {filteredWorkshops.map((w) => (
                    <div key={w.name} className="p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Wrench className="w-4 h-4 text-amber-500 shrink-0" />
                          <span className="font-bold text-slate-900 dark:text-slate-100">{w.name}</span>
                          {w.is_saved && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-200">
                              Saved
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400">
                          {w.contact && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {w.contact}
                            </span>
                          )}
                          {w.address && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {w.address}
                            </span>
                          )}
                          <span>{w.order_count} service order(s)</span>
                        </div>
                      </div>

                      {w.id && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteWsMutation.mutate(w.id!)}
                          className="h-7 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                          title="Delete saved workshop"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {filteredWorkshops.length === 0 && (
                    <p className="p-4 text-center text-slate-400">No workshops found.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Service Items */}
          {activeTab === 'services' && (
            <div className="space-y-4">
              {/* Add form */}
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

              {/* Service Items Grid */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Saved Service Items</p>
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
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
