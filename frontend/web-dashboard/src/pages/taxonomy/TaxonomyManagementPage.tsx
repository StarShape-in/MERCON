import React, { useState, useEffect } from 'react';
import {
  Tag, Plus, RefreshCw, Download, Search, Truck, Zap, Calendar, Sparkles, SlidersHorizontal, Check, Edit2
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TaxonomyBadge } from '@/components/common/TaxonomyBadge';
import { TaxonomySelect } from '@/components/common/TaxonomySelect';
import {
  getAllTaxonomyOptions,
  TaxonomyOption,
  TaxonomyCategory,
  COLOR_PALETTES,
  saveCustomTaxonomyOption,
  TAXONOMY_UPDATED_EVENT,
  resolveTaxonomyOption
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
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New option state
  const [newLabel, setNewLabel] = useState('');
  const [newCategory, setNewCategory] = useState<TaxonomyCategory>('VEHICLE_CLASS');
  const [selectedColorId, setSelectedColorId] = useState(COLOR_PALETTES[0].id);

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

  const handleSaveOption = () => {
    if (!newLabel.trim()) return;

    try {
      saveCustomTaxonomyOption({
        label: newLabel,
        category: newCategory,
        colorThemeId: selectedColorId,
      });

      setNewLabel('');
      setIsAddModalOpen(false);
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const filteredOptions = options.filter(item => {
    if (activeTab !== 'ALL' && item.category !== activeTab) return false;
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      item.label.toLowerCase().includes(term) ||
      item.code.toLowerCase().includes(term) ||
      item.category.toLowerCase().includes(term)
    );
  });

  const vehicleClassCount = options.filter(o => o.category === 'VEHICLE_CLASS').length;
  const lineTypeCount = options.filter(o => o.category === 'LINE_TYPE').length;
  const operationTypeCount = options.filter(o => o.category === 'OPERATION_TYPE').length;
  const customCount = options.filter(o => o.isCustom).length;

  return (
    <DashboardLayout active="/taxonomy" title="Taxonomy & Universal Colors">
      <div className="space-y-6 pb-12">
        {/* 1. Header Layout & Top Bar Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                🏢 MERCON Logistics ↕
              </span>
              <Badge className="bg-[#FA634E]/10 text-[#FA634E] border-[#FA634E]/30 font-semibold text-[11px]">
                Master Data Module
              </Badge>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Taxonomy & Universal Colors
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage universal color codes, vehicle tonnage classes, service line types, and operation categories across MERCON.
            </p>
          </div>

          {/* Top Bar Actions Group */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
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
              className="h-9 text-xs font-semibold rounded-xl gap-1.5 border-slate-200 dark:border-slate-800"
            >
              <Download size={14} />
              Export JSON
            </Button>

            <Button
              size="sm"
              onClick={() => setIsAddModalOpen(true)}
              className="h-9 px-4 text-xs font-extrabold bg-[#FA634E] hover:bg-[#DF4834] text-white rounded-xl shadow-md gap-1.5"
            >
              <Plus size={14} strokeWidth={2.5} />
              + New Option
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={loadData}
              title="Refresh master data"
              className="h-9 w-9 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-xl"
            >
              <RefreshCw size={14} />
            </Button>
          </div>
        </div>

        {/* 2. Instrument-Panel KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Card 1: Vehicle Classes */}
          <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#1E1C1D] p-4 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Vehicle Classes
              </span>
              <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 border border-amber-200 dark:border-amber-900/50">
                <Truck size={14} />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {vehicleClassCount}
            </div>
            <div className="text-[10px] text-slate-400 font-medium">
              → Active Tonnage Presets
            </div>
          </Card>

          {/* Card 2: Line Types */}
          <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#1E1C1D] p-4 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Line Types
              </span>
              <div className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-600 border border-sky-200 dark:border-sky-900/50">
                <Zap size={14} />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {lineTypeCount}
            </div>
            <div className="text-[10px] text-slate-400 font-medium">
              → Service Duty Modes
            </div>
          </Card>

          {/* Card 3: Operation Types */}
          <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#1E1C1D] p-4 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Operation Types
              </span>
              <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-200 dark:border-emerald-900/50">
                <Calendar size={14} />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {operationTypeCount}
            </div>
            <div className="text-[10px] text-slate-400 font-medium">
              → Contract Billing Categories
            </div>
          </Card>

          {/* Card 4: Custom Additions */}
          <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#1E1C1D] p-4 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                User Custom Options
              </span>
              <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 border border-purple-200 dark:border-purple-900/50">
                <Sparkles size={14} />
              </div>
            </div>
            <div className="text-2xl font-black font-mono text-[#FA634E]">
              {customCount}
            </div>
            <div className="text-[10px] text-slate-400 font-medium">
              ↑ Dynamic Extensions
            </div>
          </Card>
        </div>

        {/* 3. Toolbar & Control Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search ID, label, category, color..."
              className="pl-9 h-9 text-xs bg-white dark:bg-[#2D2B2C] border-slate-200 dark:border-slate-800 rounded-xl"
            />
          </div>

          {/* View Switcher Tabs */}
          <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)}>
            <TabsList className="h-9 p-1 bg-white dark:bg-[#2D2B2C] border border-slate-200 dark:border-slate-800 rounded-xl">
              <TabsTrigger value="ALL" className="text-xs font-bold px-3 h-7 rounded-lg">
                All ({options.length})
              </TabsTrigger>
              <TabsTrigger value="VEHICLE_CLASS" className="text-xs font-bold px-3 h-7 rounded-lg">
                Vehicle Classes
              </TabsTrigger>
              <TabsTrigger value="LINE_TYPE" className="text-xs font-bold px-3 h-7 rounded-lg">
                Line Types
              </TabsTrigger>
              <TabsTrigger value="OPERATION_TYPE" className="text-xs font-bold px-3 h-7 rounded-lg">
                Operation Types
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* 4. Data Table Ledger */}
        <div className="bg-white dark:bg-[#1E1C1D] border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/20">
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                🥞 Master Data Taxonomy Ledger
              </span>
            </div>
            <span className="text-xs font-semibold text-slate-400">
              {filteredOptions.length} records found
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/40 dark:bg-slate-800/10">
                  <th className="py-3 px-4 w-12">#</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Code / Identifier</th>
                  <th className="py-3 px-4">Display Label</th>
                  <th className="py-3 px-4">Universal Badge Preview</th>
                  <th className="py-3 px-4">Color Swatch (Hex)</th>
                  <th className="py-3 px-4">Origin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
                {filteredOptions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center gap-2">
                        <Tag className="w-8 h-8 stroke-1 text-slate-300" />
                        <span className="font-bold">No taxonomy options match search criteria.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredOptions.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                        {idx + 1}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
                          {row.category.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                        {row.code}
                      </td>

                      <td className="py-3.5 px-4 font-extrabold text-slate-800 dark:text-slate-200">
                        {row.label}
                      </td>

                      <td className="py-3.5 px-4">
                        <TaxonomyBadge category={row.category} value={row.code} size="default" />
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-4 h-4 rounded-full border border-black/10 shadow-2xs shrink-0"
                            style={{ backgroundColor: row.colorTheme.hex }}
                          />
                          <span className="font-mono text-[11px] text-slate-500 font-semibold">
                            {row.colorTheme.hex} ({row.colorTheme.name})
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {row.isCustom ? (
                          <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 text-[10px] font-bold">
                            User Custom
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] font-semibold text-slate-400 border-slate-200">
                            Canonical System
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Creation Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#1E1C1D] border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-extrabold text-slate-900 dark:text-white">
              <Sparkles className="w-4 h-4 text-[#FA634E]" />
              Add New Taxonomy Option
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Category *</Label>
              <TaxonomySelect
                category="VEHICLE_CLASS"
                value=""
                onValueChange={() => {}}
                placeholder="Choose Target Category"
              />
              <div className="grid grid-cols-3 gap-2 pt-1">
                {(['VEHICLE_CLASS', 'LINE_TYPE', 'OPERATION_TYPE'] as TaxonomyCategory[]).map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setNewCategory(cat)}
                    className={`py-1.5 px-2 rounded-xl text-[10px] font-extrabold border transition-all ${
                      newCategory === cat
                        ? 'bg-[#FA634E] text-white border-[#FA634E] shadow-2xs'
                        : 'bg-white dark:bg-[#2D2B2C] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {cat.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Option Label / Name *
              </Label>
              <Input
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                placeholder="e.g. 15 TON, Dedicated Daily, Project Rate"
                className="h-9 text-xs font-semibold rounded-xl"
              />
            </div>

            {/* Universal Color Palette Picker */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Universal Badge Color Theme
              </Label>
              <div className="grid grid-cols-4 gap-2 max-h-44 overflow-y-auto p-1 border border-slate-100 dark:border-slate-800 rounded-xl">
                {COLOR_PALETTES.map(palette => {
                  const isSelected = selectedColorId === palette.id;
                  return (
                    <button
                      key={palette.id}
                      type="button"
                      onClick={() => setSelectedColorId(palette.id)}
                      className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all text-center relative ${palette.bg} ${palette.border} ${
                        isSelected
                          ? 'ring-2 ring-[#FA634E] ring-offset-1 border-[#FA634E]'
                          : 'opacity-80 hover:opacity-100'
                      }`}
                    >
                      <span
                        className="w-4 h-4 rounded-full border mb-1 shadow-2xs"
                        style={{ backgroundColor: palette.hex }}
                      />
                      <span className={`text-[9px] font-bold truncate max-w-full ${palette.text}`}>
                        {palette.name.split(' ')[0]}
                      </span>
                      {isSelected && (
                        <span className="absolute top-1 right-1 w-3 h-3 rounded-full bg-[#FA634E] text-white flex items-center justify-center">
                          <Check size={8} strokeWidth={3} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddModalOpen(false)}
              className="h-8.5 text-xs font-bold rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveOption}
              disabled={!newLabel.trim()}
              className="h-8.5 text-xs font-bold bg-[#FA634E] hover:bg-[#E04F3A] text-white rounded-xl shadow-md"
            >
              Save Option
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
