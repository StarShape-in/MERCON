import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Trash2, RotateCcw, Search, RefreshCw, Download, 
  Truck, Users, Car, Wrench, Building2, ReceiptText, 
  CreditCard, ShieldAlert, CheckCircle2, ArrowUpDown, Filter, Sparkles, Wallet, MapPin
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { trashService, TrashItem } from '@/services/trashService';
import ConfirmModal from '@/components/ui/ConfirmModal';
import DataTable from '@/components/ui/DataTable';
import KpiCard from '@/components/ui/KpiCard';
import { cn } from '@/lib/utils';
import { matchesSearch } from '@/lib/search';
import { useDeploymentTimezone, formatInDeploymentTz } from '@/lib/datetime';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SortDropdown, SortOption } from '@/components/ui/SortDropdown';

type EntityFilter = 'ALL' | 'Trip' | 'Driver' | 'Vehicle' | 'MaintenanceRecord' | 'Customer' | 'Expense' | 'Location' | 'FINANCIALS';
type TrashSortOption = 'newest' | 'oldest' | 'type' | 'name';

const TRASH_SORT_OPTIONS: SortOption<TrashSortOption>[] = [
  { value: 'newest', label: 'Newest Deleted', icon: <ArrowUpDown className="w-3.5 h-3.5 text-blue-600" /> },
  { value: 'oldest', label: 'Oldest Deleted', icon: <ArrowUpDown className="w-3.5 h-3.5 text-amber-600" /> },
  { value: 'type', label: 'Entity Category (A → Z)', icon: <Filter className="w-3.5 h-3.5 text-purple-600" /> },
  { value: 'name', label: 'Identifier Name (A → Z)', icon: <Filter className="w-3.5 h-3.5 text-indigo-600" /> },
];

export default function RecycleBinPage() {
  const queryClient = useQueryClient();
  const tz = useDeploymentTimezone();
  const [selectedCategory, setSelectedCategory] = useState<EntityFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'type' | 'name'>('newest');

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
    isDestructive?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    isDestructive: false,
  });

  // Query soft-deleted trash items
  const { data: trashItems = [], isLoading, isRefetching } = useQuery({
    queryKey: ['trash'],
    queryFn: trashService.getAll,
    refetchInterval: 30000,
  });

  // Mutations
  const restoreMutation = useMutation({
    mutationFn: (payload: { type: string; id: string }) => trashService.restore(payload.type, payload.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trash'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.error?.message || err.message || 'Failed to restore item.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (payload: { type: string; id: string }) => trashService.permanentDelete(payload.type, payload.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trash'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.error?.message || err.message || 'Failed to permanently delete item.');
    },
  });

  // Categorized counts calculation
  const counts = useMemo(() => {
    const tripCount = trashItems.filter(i => i.type === 'Trip').length;
    const driverCount = trashItems.filter(i => i.type === 'Driver').length;
    const vehicleCount = trashItems.filter(i => i.type === 'Vehicle').length;
    const maintenanceCount = trashItems.filter(i => i.type === 'MaintenanceRecord').length;
    const customerCount = trashItems.filter(i => i.type === 'Customer').length;
    const expenseCount = trashItems.filter(i => i.type === 'Expense').length;
    const locationCount = trashItems.filter(i => i.type === 'Location').length;
    const financialsCount = trashItems.filter(i => i.type === 'Invoice' || i.type === 'RateCard' || i.type === 'Expense').length;
    
    return {
      all: trashItems.length,
      trip: tripCount,
      driver: driverCount,
      vehicle: vehicleCount,
      maintenance: maintenanceCount,
      customer: customerCount,
      expense: expenseCount,
      location: locationCount,
      financials: financialsCount,
      operations: tripCount + vehicleCount,
      people: driverCount + customerCount,
      serviceAndFinance: maintenanceCount + financialsCount,
    };
  }, [trashItems]);

  // Filtering & Sorting
  const filteredItems = useMemo(() => {
    return trashItems
      .filter((item) => {
        // Category Filter
        if (selectedCategory !== 'ALL') {
          if (selectedCategory === 'FINANCIALS') {
            if (item.type !== 'Invoice' && item.type !== 'RateCard' && item.type !== 'Expense') return false;
          } else if (item.type !== selectedCategory) {
            return false;
          }
        }

        // Search Filter
        return matchesSearch(searchQuery, [item.name, item.type, item.id]);
      })
      .sort((a, b) => {
        if (sortBy === 'newest') return new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime();
        if (sortBy === 'oldest') return new Date(a.deletedAt).getTime() - new Date(b.deletedAt).getTime();
        if (sortBy === 'type') return a.type.localeCompare(b.type);
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        return 0;
      });
  }, [trashItems, selectedCategory, searchQuery, sortBy]);

  // Helper renderer for entity badges
  const renderEntityBadge = (type: string) => {
    switch (type) {
      case 'Trip':
        return (
          <Badge className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800 font-bold text-[10px] uppercase gap-1">
            <Truck className="w-3 h-3 text-amber-600" /> Trip
          </Badge>
        );
      case 'Driver':
        return (
          <Badge className="bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border-teal-200 dark:border-teal-800 font-bold text-[10px] uppercase gap-1">
            <Users className="w-3 h-3 text-teal-600" /> Driver
          </Badge>
        );
      case 'Vehicle':
        return (
          <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800 font-bold text-[10px] uppercase gap-1">
            <Car className="w-3 h-3 text-blue-600" /> Vehicle
          </Badge>
        );
      case 'MaintenanceRecord':
        return (
          <Badge className="bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800 font-bold text-[10px] uppercase gap-1">
            <Wrench className="w-3 h-3 text-rose-600" /> Maintenance
          </Badge>
        );
      case 'Customer':
        return (
          <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 font-bold text-[10px] uppercase gap-1">
            <Building2 className="w-3 h-3 text-indigo-600" /> Customer
          </Badge>
        );
      case 'Invoice':
        return (
          <Badge className="bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800 font-bold text-[10px] uppercase gap-1">
            <ReceiptText className="w-3 h-3 text-purple-600" /> Invoice
          </Badge>
        );
      case 'RateCard':
        return (
          <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700 font-bold text-[10px] uppercase gap-1">
            <CreditCard className="w-3 h-3 text-slate-600" /> Rate Card
          </Badge>
        );
      case 'Expense':
        return (
          <Badge className="bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 border-orange-200 dark:border-orange-800 font-bold text-[10px] uppercase gap-1">
            <Wallet className="w-3 h-3 text-orange-600" /> Expense
          </Badge>
        );
      case 'Location':
        return (
          <Badge className="bg-[#FA634E]/10 text-[#FA634E] dark:bg-[#FA634E]/20 border-[#FA634E]/30 font-bold text-[10px] uppercase gap-1">
            <MapPin className="w-3 h-3 text-[#FA634E]" /> Location
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-[10px] font-bold uppercase">
            {type}
          </Badge>
        );
    }
  };

  // Table Columns
  const columns = [
    {
      header: 'Entity Type',
      className: 'w-[140px]',
      accessor: (row: TrashItem) => renderEntityBadge(row.type),
    },
    {
      header: 'Identifier / Name',
      accessor: (row: TrashItem) => (
        <div className="flex flex-col py-0.5">
          <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
            {row.name}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            ID: {row.id.slice(0, 8)}...
          </span>
        </div>
      ),
    },
    {
      header: 'Deleted On',
      accessor: (row: TrashItem) => {
        const deletedDate = new Date(row.deletedAt);
        return (
          <div className="flex flex-col text-xs font-mono">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {formatInDeploymentTz(deletedDate, tz, 'MMM d, yyyy')}
            </span>
            <span className="text-[10px] text-slate-400">
              {formatInDeploymentTz(deletedDate, tz, 'hh:mm a')}
            </span>
          </div>
        );
      },
    },
    {
      header: 'Actions',
      headerClassName: 'text-right',
      accessor: (row: TrashItem) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => {
              setConfirmModal({
                isOpen: true,
                title: `Restore ${row.type === 'MaintenanceRecord' ? 'Maintenance Record' : row.type}`,
                message: `Are you sure you want to restore "${row.name}"? It will immediately return to active operational lists.`,
                isDestructive: false,
                onConfirm: () => restoreMutation.mutate({ type: row.type, id: row.id }),
              });
            }}
            title="Restore Item"
            className="p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors border border-transparent hover:border-emerald-200"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setConfirmModal({
                isOpen: true,
                title: `Permanently Delete ${row.type === 'MaintenanceRecord' ? 'Maintenance Record' : row.type}`,
                message: `Are you sure you want to permanently delete "${row.name}"? This action is IRREVERSIBLE and cannot be undone.`,
                isDestructive: true,
                onConfirm: () => deleteMutation.mutate({ type: row.type, id: row.id }),
              });
            }}
            title="Permanently Delete"
            className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors border border-transparent hover:border-rose-200"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  // Bulk Actions
  const bulkActions = [
    {
      label: 'Restore Selected',
      icon: <RotateCcw size={13} />,
      variant: 'primary' as const,
      onClick: (selectedRows: TrashItem[]) => {
        setConfirmModal({
          isOpen: true,
          title: 'Restore Selected Items',
          message: `Are you sure you want to restore ${selectedRows.length} item(s)? They will return to their respective operational lists.`,
          isDestructive: false,
          onConfirm: async () => {
            let failed = 0;
            for (const r of selectedRows) {
              try {
                await trashService.restore(r.type, r.id);
              } catch (e) {
                failed++;
              }
            }
            queryClient.invalidateQueries({ queryKey: ['trash'] });
            if (failed > 0) {
              alert(`Completed with ${failed} item(s) failing to restore.`);
            }
          },
        });
      },
    },
    {
      label: 'Delete Permanently',
      icon: <Trash2 size={13} />,
      variant: 'danger' as const,
      onClick: (selectedRows: TrashItem[]) => {
        setConfirmModal({
          isOpen: true,
          title: 'Permanently Delete Selected Items',
          message: `Are you sure you want to permanently delete ${selectedRows.length} item(s)? This process is permanent and cannot be reversed.`,
          isDestructive: true,
          onConfirm: async () => {
            let failed = 0;
            for (const r of selectedRows) {
              try {
                await trashService.permanentDelete(r.type, r.id);
              } catch (e) {
                failed++;
              }
            }
            queryClient.invalidateQueries({ queryKey: ['trash'] });
            if (failed > 0) {
              alert(`Completed with ${failed} item(s) failing to delete.`);
            }
          },
        });
      },
    },
  ];

  // Purge All Trash Handler
  const handlePurgeAll = () => {
    if (trashItems.length === 0) return;
    setConfirmModal({
      isOpen: true,
      title: 'Empty Recycle Bin (Purge All)',
      message: `WARNING: You are about to PERMANENTLY DELETE ALL ${trashItems.length} soft-deleted items across Trips, Drivers, Vehicles, Maintenance, and Customers. Proceed with extreme caution!`,
      isDestructive: true,
      onConfirm: async () => {
        let failed = 0;
        for (const item of trashItems) {
          try {
            await trashService.permanentDelete(item.type, item.id);
          } catch (e) {
            failed++;
          }
        }
        queryClient.invalidateQueries({ queryKey: ['trash'] });
        if (failed > 0) {
          alert(`Purge completed with ${failed} item(s) failing to delete.`);
        }
      },
    });
  };



  return (
    <DashboardLayout active="Account" title="Recycle Bin">
      <div className="px-4 sm:px-6 pb-8 h-full flex flex-col animate-fade-in gap-5 max-w-[1400px] mx-auto w-full">
        
        {/* Top Header Bar & Scope Selector */}
        <div className="flex flex-wrap items-center justify-between gap-4 shrink-0 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <Trash2 className="w-6 h-6 text-rose-500 dark:text-rose-400 shrink-0" />

            <div className="flex flex-col">
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                  Recycle Bin
                </h1>
                <Badge className="bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200 dark:border-rose-800 font-bold text-[10px] uppercase">
                  Data Governance Module
                </Badge>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Manage soft-deleted trips, drivers, vehicles, maintenance records, and customers
              </p>
            </div>
          </div>

          {/* Top Bar Actions Group */}
          <div className="flex items-center gap-2.5">
            <Button
              variant="destructive"
              size="sm"
              onClick={handlePurgeAll}
              disabled={trashItems.length === 0}
              className="h-9 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-2xs gap-1.5"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              Purge All
            </Button>
          </div>
        </div>

        {/* Toolbar & Category Control Bar */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-2 shadow-2xs shrink-0 flex flex-col gap-3">
          {/* Horizontal Entity Switcher Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-extrabold transition-all shrink-0 cursor-pointer",
                selectedCategory === 'ALL'
                  ? "bg-brand text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              <Trash2 className="h-3.5 w-3.5" /> All Items
              <span className={cn("px-1.5 py-0.5 text-[10px] rounded-md font-mono", selectedCategory === 'ALL' ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300")}>
                {counts.all}
              </span>
            </button>

            <button
              onClick={() => setSelectedCategory('Trip')}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer",
                selectedCategory === 'Trip'
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              <Truck className="h-3.5 w-3.5 text-amber-500" /> Trips
              <span className={cn("px-1.5 py-0.5 text-[10px] rounded-md font-mono", selectedCategory === 'Trip' ? "bg-white/20 text-white" : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300")}>
                {counts.trip}
              </span>
            </button>

            <button
              onClick={() => setSelectedCategory('Driver')}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer",
                selectedCategory === 'Driver'
                  ? "bg-teal-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              <Users className="h-3.5 w-3.5 text-teal-500" /> Drivers
              <span className={cn("px-1.5 py-0.5 text-[10px] rounded-md font-mono", selectedCategory === 'Driver' ? "bg-white/20 text-white" : "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300")}>
                {counts.driver}
              </span>
            </button>

            <button
              onClick={() => setSelectedCategory('Vehicle')}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer",
                selectedCategory === 'Vehicle'
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              <Car className="h-3.5 w-3.5 text-blue-500" /> Vehicles
              <span className={cn("px-1.5 py-0.5 text-[10px] rounded-md font-mono", selectedCategory === 'Vehicle' ? "bg-white/20 text-white" : "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300")}>
                {counts.vehicle}
              </span>
            </button>

            <button
              onClick={() => setSelectedCategory('MaintenanceRecord')}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer",
                selectedCategory === 'MaintenanceRecord'
                  ? "bg-rose-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              <Wrench className="h-3.5 w-3.5 text-rose-500" /> Maintenance
              <span className={cn("px-1.5 py-0.5 text-[10px] rounded-md font-mono", selectedCategory === 'MaintenanceRecord' ? "bg-white/20 text-white" : "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300")}>
                {counts.maintenance}
              </span>
            </button>

            <button
              onClick={() => setSelectedCategory('Customer')}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer",
                selectedCategory === 'Customer'
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              <Building2 className="h-3.5 w-3.5 text-indigo-500" /> Customers
              <span className={cn("px-1.5 py-0.5 text-[10px] rounded-md font-mono", selectedCategory === 'Customer' ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300")}>
                {counts.customer}
              </span>
            </button>

            <button
              onClick={() => setSelectedCategory('Expense')}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer",
                selectedCategory === 'Expense'
                  ? "bg-orange-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              <Wallet className="h-3.5 w-3.5 text-orange-500" /> Expenses
              <span className={cn("px-1.5 py-0.5 text-[10px] rounded-md font-mono", selectedCategory === 'Expense' ? "bg-white/20 text-white" : "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300")}>
                {counts.expense}
              </span>
            </button>

            <button
              onClick={() => setSelectedCategory('Location')}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer",
                selectedCategory === 'Location'
                  ? "bg-[#FA634E] text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              <MapPin className="h-3.5 w-3.5 text-[#FA634E]" /> Locations
              <span className={cn("px-1.5 py-0.5 text-[10px] rounded-md font-mono", selectedCategory === 'Location' ? "bg-white/20 text-white" : "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300")}>
                {counts.location}
              </span>
            </button>

            <button
              onClick={() => setSelectedCategory('FINANCIALS')}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer",
                selectedCategory === 'FINANCIALS'
                  ? "bg-purple-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              <ReceiptText className="h-3.5 w-3.5 text-purple-500" /> Invoices & Rates
              <span className={cn("px-1.5 py-0.5 text-[10px] rounded-md font-mono", selectedCategory === 'FINANCIALS' ? "bg-white/20 text-white" : "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300")}>
                {counts.financials}
              </span>
            </button>

          </div>

          {/* Secondary Control Row: Search & Sort */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 px-1">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                type="text"
                placeholder="Search deleted items by ID, name, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-8.5 text-xs border-slate-200 dark:border-slate-700 focus-visible:ring-brand/20 focus-visible:border-brand"
              />
            </div>

            <SortDropdown
              value={sortBy}
              onChange={setSortBy}
              options={TRASH_SORT_OPTIONS}
              triggerClassName="h-8.5"
            />
          </div>
        </div>

        {/* Data Table Ledger Container */}
        <div className="flex-1 min-h-0">
          <DataTable
            title={
              <span className="flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-500" />
                <span>Soft-Deleted Ledger</span>
              </span>
            }
            subtitle="Review soft-deleted system entities before restoring or permanently purging."
            columns={columns}
            data={filteredItems}
            enableSelection={true}
            bulkActions={bulkActions}
            compact={true}
            isLoading={isLoading}
            emptyTitle={`No Soft-Deleted ${selectedCategory === 'ALL' ? 'Items' : selectedCategory} Found`}
            emptyMessage={
              searchQuery
                ? `No soft-deleted records match "${searchQuery}". Try clearing your search string.`
                : `There are currently no soft-deleted records under this category.`
            }
          />
        </div>

        {/* Confirm Modal */}
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
          onConfirm={async () => {
            await confirmModal.onConfirm();
            setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          }}
          title={confirmModal.title}
          message={confirmModal.message}
          isDestructive={confirmModal.isDestructive}
        />

      </div>
    </DashboardLayout>
  );
}
