import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, RefreshCw, Download, Search, Check, Edit2, Trash2
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TaxonomyBadge } from '@/components/common/TaxonomyBadge';
import ConfirmModal from '@/components/ui/ConfirmModal';
import {
  getAllTaxonomyOptions,
  TaxonomyOption,
  TaxonomyCategory,
  COLOR_PALETTES,
  saveCustomTaxonomyOption,
  toggleTaxonomyOptionActiveStatus,
  deleteCustomTaxonomyOption,
  TAXONOMY_UPDATED_EVENT
} from '@/utils/taxonomyRegistry';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export default function TaxonomyManagementPage() {
  const [options, setOptions] = useState<TaxonomyOption[]>([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | TaxonomyCategory>('ALL');

  // Modal State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<TaxonomyOption | null>(null);

  // Form Fields
  const [formCategory, setFormCategory] = useState<TaxonomyCategory>('VEHICLE_CLASS');
  const [formCode, setFormCode] = useState('');
  const [formLabel, setFormLabel] = useState('');
  const [formColorId, setFormColorId] = useState(COLOR_PALETTES[0].id);
  const [formIsActive, setFormIsActive] = useState(true);

  // Delete Confirm Modal State
  const [deletingOption, setDeletingOption] = useState<TaxonomyOption | null>(null);

  const loadData = () => {
    setOptions(getAllTaxonomyOptions());
  };

  useEffect(() => {
    loadData();
    window.addEventListener(TAXONOMY_UPDATED_EVENT, loadData);
    return () => {
      window.removeEventListener(TAXONOMY_UPDATED_EVENT, loadData);
    };
  }, []);

  const handleOpenAddModal = (initialCategory: TaxonomyCategory = 'VEHICLE_CLASS') => {
    setEditingOption(null);
    setFormCategory(initialCategory);
    setFormCode('');
    setFormLabel('');
    setFormColorId(COLOR_PALETTES[0].id);
    setFormIsActive(true);
    setIsDialogOpen(true);
  };

  const handleOpenEditModal = (opt: TaxonomyOption) => {
    setEditingOption(opt);
    setFormCategory(opt.category === 'OPERATION_TYPE' ? 'BILLING_TYPE' : opt.category);
    setFormCode(opt.code);
    setFormLabel(opt.label);
    setFormColorId(opt.colorTheme.id);
    setFormIsActive(opt.isActive !== false);
    setIsDialogOpen(true);
  };

  const handleSaveOption = () => {
    if (!formLabel.trim()) return;

    try {
      saveCustomTaxonomyOption({
        id: editingOption?.id,
        label: formLabel,
        category: formCategory,
        colorThemeId: formColorId,
        code: formCode || undefined,
        isActive: formIsActive,
      });

      setIsDialogOpen(false);
      loadData();
    } catch (e) {
      console.error('Failed to save taxonomy option', e);
    }
  };

  const handleToggleStatus = (opt: TaxonomyOption) => {
    toggleTaxonomyOptionActiveStatus(opt.id, opt.code, opt.category, opt.isActive !== false);
    loadData();
  };

  const handleDeleteConfirm = () => {
    if (!deletingOption) return;
    deleteCustomTaxonomyOption(deletingOption.id);
    setDeletingOption(null);
    loadData();
  };

  // Filtered options
  const filteredOptions = useMemo(() => {
    return options.filter(item => {
      if (activeTab !== 'ALL') {
        if (activeTab === 'BILLING_TYPE' || activeTab === 'OPERATION_TYPE') {
          if (item.category !== 'BILLING_TYPE' && item.category !== 'OPERATION_TYPE') return false;
        } else if (item.category !== activeTab) {
          return false;
        }
      }
      if (!search.trim()) return true;
      const term = search.toLowerCase();
      return (
        item.label.toLowerCase().includes(term) ||
        item.code.toLowerCase().includes(term) ||
        item.category.toLowerCase().includes(term)
      );
    });
  }, [options, activeTab, search]);

  // Grouped options for structured rendering
  const vehicleClasses = filteredOptions.filter(o => o.category === 'VEHICLE_CLASS');
  const lineTypes = filteredOptions.filter(o => o.category === 'LINE_TYPE');
  const billingTypes = filteredOptions.filter(o => o.category === 'BILLING_TYPE' || o.category === 'OPERATION_TYPE');

  const customCount = options.filter(o => o.isCustom).length;

  return (
    <DashboardLayout active="/taxonomy" title="Taxonomy & Master Data">
      <div className="space-y-4 pb-12 max-w-7xl mx-auto">
        {/* 3. PAGE HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800">
          <div className="space-y-0.5">
            <div className="text-[11px] font-semibold text-slate-400">
              Master Data / Taxonomy
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#3E3C3D] dark:text-white tracking-tight">
              Taxonomy & Master Data
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage controlled options used across MERCON
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const json = JSON.stringify(options, null, 2);
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `mercon-taxonomy-${Date.now()}.json`;
                a.click();
              }}
              className="h-8.5 text-xs font-semibold rounded-lg gap-1.5 border-slate-200 dark:border-slate-800"
            >
              <Download size={13} />
              Export JSON
            </Button>

            <Button
              size="sm"
              onClick={() => handleOpenAddModal('VEHICLE_CLASS')}
              className="h-8.5 px-3.5 text-xs font-bold bg-[#FA634E] hover:bg-[#DF4834] text-white rounded-lg shadow-2xs gap-1.5"
            >
              <Plus size={14} strokeWidth={2.5} />
              + Add Option
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={loadData}
              title="Refresh taxonomy data"
              className="h-8.5 w-8.5 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg"
            >
              <RefreshCw size={13} />
            </Button>
          </div>
        </div>

        {/* 4. COMPACT HORIZONTAL SUMMARY STRIP */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-6 px-3.5 py-2 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200/80 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-bold uppercase text-[10px]">Vehicle Classes</span>
            <Badge variant="outline" className="h-5 text-[11px] font-bold bg-white dark:bg-slate-900 px-2 border-slate-200 dark:border-slate-700">
              {options.filter(o => o.category === 'VEHICLE_CLASS').length}
            </Badge>
          </div>
          <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-bold uppercase text-[10px]">Line Types</span>
            <Badge variant="outline" className="h-5 text-[11px] font-bold bg-white dark:bg-slate-900 px-2 border-slate-200 dark:border-slate-700">
              {options.filter(o => o.category === 'LINE_TYPE').length}
            </Badge>
          </div>
          <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-bold uppercase text-[10px]">Billing Types</span>
            <Badge variant="outline" className="h-5 text-[11px] font-bold bg-white dark:bg-slate-900 px-2 border-slate-200 dark:border-slate-700">
              {options.filter(o => o.category === 'BILLING_TYPE' || o.category === 'OPERATION_TYPE').length}
            </Badge>
          </div>
          <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-bold uppercase text-[10px]">Custom Additions</span>
            <Badge className="h-5 text-[11px] font-bold bg-purple-50 text-purple-700 border-purple-200 px-2">
              {customCount}
            </Badge>
          </div>
        </div>

        {/* 5. MAIN CONTROL BAR & CATEGORY TABS */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200/80 dark:border-slate-800">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search options..."
              className="pl-8 h-8.5 text-xs bg-white dark:bg-[#2D2B2C] border-slate-200 dark:border-slate-800 rounded-lg"
            />
          </div>

          <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)}>
            <TabsList className="h-8.5 p-1 bg-white dark:bg-[#2D2B2C] border border-slate-200 dark:border-slate-800 rounded-lg">
              <TabsTrigger value="ALL" className="text-xs font-bold px-3 h-6.5 rounded-md data-[state=active]:bg-[#FA634E] data-[state=active]:text-white">
                All
              </TabsTrigger>
              <TabsTrigger value="VEHICLE_CLASS" className="text-xs font-bold px-3 h-6.5 rounded-md data-[state=active]:bg-[#FA634E] data-[state=active]:text-white">
                Vehicle Classes
              </TabsTrigger>
              <TabsTrigger value="LINE_TYPE" className="text-xs font-bold px-3 h-6.5 rounded-md data-[state=active]:bg-[#FA634E] data-[state=active]:text-white">
                Line Types
              </TabsTrigger>
              <TabsTrigger value="BILLING_TYPE" className="text-xs font-bold px-3 h-6.5 rounded-md data-[state=active]:bg-[#FA634E] data-[state=active]:text-white">
                Billing Types
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* 7 & 8. MAIN REGISTRY & CATEGORY GROUPING */}
        <div className="space-y-4">
          {/* GROUP 1: VEHICLE CLASSES */}
          {(activeTab === 'ALL' || activeTab === 'VEHICLE_CLASS') && (
            <TaxonomyCategoryGroupTable
              title="VEHICLE CLASSES"
              category="VEHICLE_CLASS"
              options={vehicleClasses}
              onEdit={handleOpenEditModal}
              onToggleStatus={handleToggleStatus}
              onDelete={setDeletingOption}
              onAddOption={() => handleOpenAddModal('VEHICLE_CLASS')}
            />
          )}

          {/* GROUP 2: LINE TYPES */}
          {(activeTab === 'ALL' || activeTab === 'LINE_TYPE') && (
            <TaxonomyCategoryGroupTable
              title="LINE TYPES"
              category="LINE_TYPE"
              options={lineTypes}
              onEdit={handleOpenEditModal}
              onToggleStatus={handleToggleStatus}
              onDelete={setDeletingOption}
              onAddOption={() => handleOpenAddModal('LINE_TYPE')}
            />
          )}

          {/* GROUP 3: BILLING TYPES */}
          {(activeTab === 'ALL' || activeTab === 'BILLING_TYPE' || activeTab === 'OPERATION_TYPE') && (
            <TaxonomyCategoryGroupTable
              title="BILLING TYPES"
              category="BILLING_TYPE"
              options={billingTypes}
              onEdit={handleOpenEditModal}
              onToggleStatus={handleToggleStatus}
              onDelete={setDeletingOption}
              onAddOption={() => handleOpenAddModal('BILLING_TYPE')}
            />
          )}
        </div>
      </div>

      {/* 13 & 14. ADD / EDIT OPTION SHADCN DIALOG */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#1E1C1D] border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-[#3E3C3D] dark:text-white">
              {editingOption ? 'Edit Taxonomy Option' : 'Add Taxonomy Option'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3.5 py-1 text-xs">
            {/* Category Selector */}
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Category *</Label>
              <div className="grid grid-cols-3 gap-2">
                {(['VEHICLE_CLASS', 'LINE_TYPE', 'BILLING_TYPE'] as TaxonomyCategory[]).map(cat => {
                  const label = cat === 'VEHICLE_CLASS' ? 'Vehicle Class' : cat === 'LINE_TYPE' ? 'Line Type' : 'Billing Type';
                  const isSelected = formCategory === cat || (cat === 'BILLING_TYPE' && formCategory === 'OPERATION_TYPE');
                  return (
                    <button
                      key={cat}
                      type="button"
                      disabled={Boolean(editingOption && !editingOption.isCustom)}
                      onClick={() => setFormCategory(cat)}
                      className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-all ${
                        isSelected
                          ? 'bg-[#FA634E] text-white border-[#FA634E] shadow-2xs'
                          : 'bg-white dark:bg-[#2D2B2C] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Code / Identifier */}
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Code / Identifier *</Label>
              <Input
                value={formCode}
                onChange={e => setFormCode(e.target.value)}
                disabled={Boolean(editingOption && !editingOption.isCustom)}
                placeholder="e.g. 15 TON, DEDICATED_DAILY"
                className="h-8.5 text-xs font-mono font-bold rounded-lg"
              />
              {editingOption && !editingOption.isCustom && (
                <span className="text-[10px] text-slate-400 font-medium">Canonical system identifier cannot be modified.</span>
              )}
            </div>

            {/* Display Label */}
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Display Label *</Label>
              <Input
                value={formLabel}
                onChange={e => setFormLabel(e.target.value)}
                placeholder="e.g. 15 TON, Dedicated Daily"
                className="h-8.5 text-xs font-semibold rounded-lg"
              />
            </div>

            {/* Color Swatch Picker */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Universal Badge Color Theme
              </Label>
              <div className="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto p-1 border border-slate-100 dark:border-slate-800 rounded-lg">
                {COLOR_PALETTES.map(palette => {
                  const isSelected = formColorId === palette.id;
                  return (
                    <button
                      key={palette.id}
                      type="button"
                      onClick={() => setFormColorId(palette.id)}
                      className={`flex flex-col items-center justify-center p-1.5 rounded-md border transition-all text-center relative ${palette.bg} ${palette.border} ${
                        isSelected
                          ? 'ring-2 ring-[#FA634E] ring-offset-1 border-[#FA634E]'
                          : 'opacity-80 hover:opacity-100'
                      }`}
                    >
                      <span
                        className="w-3 h-3 rounded-full border mb-0.5 shadow-2xs"
                        style={{ backgroundColor: palette.hex }}
                      />
                      <span className={`text-[9px] font-bold truncate max-w-full ${palette.text}`}>
                        {palette.name.split(' ')[0]}
                      </span>
                      {isSelected && (
                        <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-[#FA634E] text-white flex items-center justify-center">
                          <Check size={6} strokeWidth={3} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Status Switch */}
            <div className="flex items-center justify-between pt-1">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Status Active</Label>
              <button
                type="button"
                onClick={() => setFormIsActive(!formIsActive)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  formIsActive ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    formIsActive ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              className="h-8 text-xs font-bold rounded-lg"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveOption}
              disabled={!formLabel.trim()}
              className="h-8 text-xs font-bold bg-[#FA634E] hover:bg-[#DF4834] text-white rounded-lg shadow-2xs"
            >
              {editingOption ? 'Save Changes' : 'Create Option'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 15. DELETE CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={Boolean(deletingOption)}
        onClose={() => setDeletingOption(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Custom Option"
        message={`Are you sure you want to delete custom option "${deletingOption?.label}"? This action cannot be undone.`}
        confirmLabel="Delete Option"
        isDestructive
      />
    </DashboardLayout>
  );
}

/**
 * Grouped Category Table Component
 */
function TaxonomyCategoryGroupTable({
  title,
  category,
  options,
  onEdit,
  onToggleStatus,
  onDelete,
  onAddOption,
}: {
  title: string;
  category: TaxonomyCategory;
  options: TaxonomyOption[];
  onEdit: (opt: TaxonomyOption) => void;
  onToggleStatus: (opt: TaxonomyOption) => void;
  onDelete: (opt: TaxonomyOption) => void;
  onAddOption: () => void;
}) {
  return (
    <div className="bg-white dark:bg-[#1E1C1D] border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
      <div className="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/30">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-[#3E3C3D] dark:text-white tracking-wide uppercase">
            {title}
          </span>
          <Badge variant="outline" className="h-4 text-[9px] font-bold px-1.5 border-slate-200 dark:border-slate-700 text-slate-500">
            {options.length} options
          </Badge>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onAddOption}
          className="h-6 text-[10px] font-extrabold text-[#FA634E] hover:bg-[#FA634E]/10 px-2 rounded-md gap-1"
        >
          <Plus size={10} strokeWidth={3} /> Add
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/20">
              <th className="py-2.5 px-3.5">Category</th>
              <th className="py-2.5 px-3.5">Code</th>
              <th className="py-2.5 px-3.5">Display Label</th>
              <th className="py-2.5 px-3.5">Badge Preview</th>
              <th className="py-2.5 px-3.5">Color Swatch</th>
              <th className="py-2.5 px-3.5">Origin</th>
              <th className="py-2.5 px-3.5">Status</th>
              <th className="py-2.5 px-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
            {options.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-5 text-center text-slate-400 text-[11px]">
                  No custom options defined for {title.toLowerCase()}.
                </td>
              </tr>
            ) : (
              options.map(row => {
                const isActive = row.isActive !== false;

                return (
                  <tr key={row.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3.5">
                      <span className="text-[10px] font-bold uppercase text-slate-500">
                        {row.category.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="py-2.5 px-3.5 font-mono font-bold text-slate-900 dark:text-slate-100">
                      {row.code}
                    </td>

                    <td className="py-2.5 px-3.5 font-bold text-slate-800 dark:text-slate-200">
                      {row.label}
                    </td>

                    <td className="py-2.5 px-3.5">
                      <TaxonomyBadge category={category} value={row.code} size="default" />
                    </td>

                    <td className="py-2.5 px-3.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-3 h-3 rounded-full border border-black/10 shrink-0 shadow-2xs"
                          style={{ backgroundColor: row.colorTheme.hex }}
                        />
                        <span className="font-mono text-[10px] text-slate-500 font-semibold">
                          {row.colorTheme.hex}
                        </span>
                      </div>
                    </td>

                    <td className="py-2.5 px-3.5">
                      {row.isCustom ? (
                        <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-[9px] font-bold px-1.5 py-0">
                          Custom
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] font-semibold text-slate-400 border-slate-200 px-1.5 py-0">
                          Canonical
                        </Badge>
                      )}
                    </td>

                    <td className="py-2.5 px-3.5">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onToggleStatus(row)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                            isActive ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                              isActive ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                        <span className={`text-[10px] font-bold ${isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </td>

                    <td className="py-2.5 px-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(row)}
                          className="h-7 px-2 text-[11px] font-bold text-slate-600 hover:text-slate-900 rounded-md"
                        >
                          <Edit2 size={11} className="mr-1" /> Edit
                        </Button>

                        {row.isCustom && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete(row)}
                            className="h-7 px-1.5 text-[11px] font-bold text-rose-600 hover:bg-rose-50 rounded-md"
                          >
                            <Trash2 size={11} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
