import React, { useState, useEffect, useMemo } from 'react';
import {
  Truck, Search, Edit2, AlertTriangle, Check, X, Info, ShieldCheck, SlidersHorizontal, Plus
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TaxonomyBadge } from '@/components/common/TaxonomyBadge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { TaxonomyOption } from '@/utils/taxonomyRegistry';
import {
  VehicleCompatibilityRule,
  getAllCompatibilityRules,
  saveCompatibilityRule,
  fetchCompatibilityRulesFromApi,
  auditRuleAgainstTaxonomy,
  COMPATIBILITY_UPDATED_EVENT,
} from '@/utils/vehicleCompatibilityRegistry';

interface VehicleCompatibilitySectionProps {
  vehicleClassOptions: TaxonomyOption[];
}

export default function VehicleCompatibilitySection({
  vehicleClassOptions,
}: VehicleCompatibilitySectionProps) {
  const [rules, setRules] = useState<VehicleCompatibilityRule[]>([]);
  const [search, setSearch] = useState('');
  const [editingRule, setEditingRule] = useState<VehicleCompatibilityRule | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Form State for editing compatibility
  const [targetServiceClass, setTargetServiceClass] = useState<TaxonomyOption | null>(null);
  const [selectedPreferredCodes, setSelectedPreferredCodes] = useState<string[]>([]);
  const [selectedAllowedCodes, setSelectedAllowedCodes] = useState<string[]>([]);
  const [classSearch, setClassSearch] = useState('');

  const loadRules = () => {
    setRules(getAllCompatibilityRules());
  };

  useEffect(() => {
    loadRules();
    fetchCompatibilityRulesFromApi().then((apiRules) => {
      if (apiRules && apiRules.length > 0) {
        setRules(apiRules);
      }
    });
    window.addEventListener(COMPATIBILITY_UPDATED_EVENT, loadRules);
    return () => {
      window.removeEventListener(COMPATIBILITY_UPDATED_EVENT, loadRules);
    };
  }, []);

  // Map rules by service vehicle class code for efficient lookup
  const rulesByClassCode = useMemo(() => {
    const map = new Map<string, VehicleCompatibilityRule>();
    rules.forEach((r) => {
      if (r.serviceVehicleClassCode) {
        map.set(r.serviceVehicleClassCode.toLowerCase(), r);
      }
    });
    return map;
  }, [rules]);

  // Active Vehicle Classes available for selection
  const activeVehicleClasses = useMemo(() => {
    return vehicleClassOptions.filter((opt) => opt.isActive !== false);
  }, [vehicleClassOptions]);

  // Filtered rows for the compatibility table based on search
  const filteredVehicleClasses = useMemo(() => {
    if (!search.trim()) return vehicleClassOptions;
    const term = search.toLowerCase();
    return vehicleClassOptions.filter(
      (opt) =>
        opt.label.toLowerCase().includes(term) ||
        opt.code.toLowerCase().includes(term)
    );
  }, [vehicleClassOptions, search]);

  const handleOpenEditModal = (serviceClass: TaxonomyOption) => {
    const existingRule = rulesByClassCode.get(serviceClass.code.toLowerCase());
    setTargetServiceClass(serviceClass);

    if (existingRule) {
      setEditingRule(existingRule);
      setSelectedPreferredCodes([...existingRule.preferredVehicleClassCodes]);
      setSelectedAllowedCodes([...existingRule.allowedVehicleClassCodes]);
    } else {
      // Default initial state: self is preferred & allowed
      setEditingRule(null);
      setSelectedPreferredCodes([serviceClass.code]);
      setSelectedAllowedCodes([serviceClass.code]);
    }

    setClassSearch('');
    setIsEditOpen(true);
  };

  // Toggle preferred vehicle class
  const handleTogglePreferred = (code: string) => {
    let nextPreferred: string[];
    if (selectedPreferredCodes.includes(code)) {
      nextPreferred = selectedPreferredCodes.filter((c) => c !== code);
    } else {
      nextPreferred = [...selectedPreferredCodes, code];
    }

    setSelectedPreferredCodes(nextPreferred);

    // Rule: A preferred vehicle must automatically be considered allowed
    let nextAllowed = [...selectedAllowedCodes];
    nextPreferred.forEach((prefCode) => {
      if (!nextAllowed.includes(prefCode)) {
        nextAllowed.push(prefCode);
      }
    });
    setSelectedAllowedCodes(nextAllowed);
  };

  // Toggle allowed vehicle class
  const handleToggleAllowed = (code: string) => {
    let nextAllowed: string[];
    if (selectedAllowedCodes.includes(code)) {
      nextAllowed = selectedAllowedCodes.filter((c) => c !== code);
    } else {
      nextAllowed = [...selectedAllowedCodes, code];
    }

    setSelectedAllowedCodes(nextAllowed);

    // Rule: If a class is removed from Allowed, it cannot remain in Preferred
    let nextPreferred = selectedPreferredCodes.filter((prefCode) =>
      nextAllowed.includes(prefCode)
    );
    setSelectedPreferredCodes(nextPreferred);
  };

  const handleSaveRule = () => {
    if (!targetServiceClass) return;

    saveCompatibilityRule({
      id: editingRule?.id,
      serviceVehicleClassId: targetServiceClass.id,
      serviceVehicleClassCode: targetServiceClass.code,
      preferredVehicleClassCodes: selectedPreferredCodes,
      allowedVehicleClassCodes: selectedAllowedCodes,
      isActive: true,
    });

    setIsEditOpen(false);
    loadRules();
  };

  return (
    <div className="bg-white dark:bg-[#1E1C1D] border border-slate-200/70 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs space-y-0">
      {/* Header Bar */}
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/20">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-brand/10 text-brand flex items-center justify-center font-bold">
            <ShieldCheck size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-[#3E3C3D] dark:text-white tracking-tight uppercase">
                Vehicle Compatibility
              </h2>
              <Badge variant="outline" className="text-[10px] font-bold text-slate-500 border-slate-200">
                Operational Rules
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Define which physical vehicle classes are operationally acceptable when a trip is commercially configured for a specific Vehicle Class.
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vehicle class..."
            className="pl-8.5 h-8.5 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl focus-visible:ring-brand"
          />
        </div>
      </div>

      {/* Compatibility Matrix Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/60 dark:bg-slate-800/30">
              <th className="py-3 px-5">Commercial Service Class</th>
              <th className="py-3 px-5">Preferred Vehicles</th>
              <th className="py-3 px-5">Allowed Vehicles</th>
              <th className="py-3 px-5">Status</th>
              <th className="py-3 px-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
            {filteredVehicleClasses.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center space-y-1.5">
                    <SlidersHorizontal size={18} className="text-slate-300" />
                    <p className="text-xs font-bold text-slate-600">No matching vehicle classes found</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredVehicleClasses.map((vc) => {
                const rule = rulesByClassCode.get(vc.code.toLowerCase());
                const isConfigured = Boolean(rule && rule.allowedVehicleClassCodes.length > 0);
                const audit = rule ? auditRuleAgainstTaxonomy(rule, vehicleClassOptions) : null;
                const hasWarning = audit && !audit.isValid;

                return (
                  <tr
                    key={vc.id}
                    onClick={() => handleOpenEditModal(vc)}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                  >
                    {/* Commercial Service Class */}
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-2">
                        <TaxonomyBadge category="VEHICLE_CLASS" value={vc.code} size="default" />
                        {vc.isActive === false && (
                          <Badge className="bg-amber-50 text-amber-800 border-amber-200 text-[9px] font-semibold">
                            Inactive Class
                          </Badge>
                        )}
                      </div>
                    </td>

                    {/* Preferred Vehicles */}
                    <td className="py-3.5 px-5">
                      {isConfigured && rule ? (
                        <div className="flex flex-wrap gap-1.5 items-center">
                          {rule.preferredVehicleClassCodes.map((prefCode) => (
                            <span
                              key={prefCode}
                              className="inline-flex items-center text-[11px] font-bold text-slate-800 dark:text-slate-100 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 px-2 py-0.5 rounded-md"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 shrink-0" />
                              {prefCode}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-normal italic">Not configured</span>
                      )}
                    </td>

                    {/* Allowed Vehicles */}
                    <td className="py-3.5 px-5">
                      {isConfigured && rule ? (
                        <div className="flex flex-wrap gap-1.5 items-center">
                          {rule.allowedVehicleClassCodes.map((allowCode) => {
                            const isInactive = audit?.inactiveAllowedCodes.includes(allowCode);
                            const isMissing = audit?.missingCodes.includes(allowCode);

                            return (
                              <span
                                key={allowCode}
                                className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
                                  isInactive || isMissing
                                    ? 'bg-amber-50 text-amber-900 border-amber-300 font-bold'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700'
                                }`}
                              >
                                {(isInactive || isMissing) && (
                                  <AlertTriangle className="w-3 h-3 text-amber-600 mr-1 shrink-0" />
                                )}
                                {allowCode}
                                {isInactive && <span className="text-[9px] ml-1 text-amber-700">(Inactive)</span>}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-normal italic">Not configured</span>
                      )}
                    </td>

                    {/* Status Column */}
                    <td className="py-3.5 px-5">
                      {hasWarning ? (
                        <span className="inline-flex items-center text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          Needs Attention
                        </span>
                      ) : isConfigured ? (
                        <span className="inline-flex items-center text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md gap-1">
                          <Check className="w-3 h-3 text-emerald-600" />
                          Configured
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                          Not configured
                        </span>
                      )}
                    </td>

                    {/* Action Column */}
                    <td className="py-3.5 px-5 text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditModal(vc);
                        }}
                        className="h-7 px-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg gap-1.5 shadow-2xs"
                      >
                        <Edit2 size={12} className="text-slate-500" />
                        Edit Rule
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* EDIT VEHICLE COMPATIBILITY MODAL DIALOG */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-lg bg-white dark:bg-[#1E1C1D] border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-[#3E3C3D] dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-brand" />
              Edit Vehicle Compatibility
            </DialogTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Configure operational vehicle assignment rules when a trip is commercially booked under this vehicle class.
            </p>
          </DialogHeader>

          {targetServiceClass && (
            <div className="space-y-4 text-xs">
              {/* Commercial Service Class Context Header Card */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Commercial Service Class
                  </span>
                  <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {targetServiceClass.code}
                  </span>
                </div>
                <TaxonomyBadge category="VEHICLE_CLASS" value={targetServiceClass.code} size="default" />
              </div>

              {/* Class Filter Input inside modal */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  value={classSearch}
                  onChange={(e) => setClassSearch(e.target.value)}
                  placeholder="Filter available taxonomy vehicle classes..."
                  className="pl-8 h-8 text-xs bg-slate-50/60 dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl"
                />
              </div>

              {/* 1. Preferred Vehicles Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Preferred Vehicles
                  </Label>
                  <span className="text-[10px] text-slate-400">Ranked highest during assignment</span>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap gap-2 max-h-36 overflow-y-auto">
                  {activeVehicleClasses
                    .filter((vc) =>
                      classSearch
                        ? vc.code.toLowerCase().includes(classSearch.toLowerCase()) ||
                          vc.label.toLowerCase().includes(classSearch.toLowerCase())
                        : true
                    )
                    .map((vc) => {
                      const isSelected = selectedPreferredCodes.includes(vc.code);
                      return (
                        <button
                          key={vc.id}
                          type="button"
                          onClick={() => handleTogglePreferred(vc.code)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-100 text-emerald-950 border-emerald-300 shadow-2xs'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 text-emerald-700 stroke-[3]" />}
                          <span>{vc.code}</span>
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* 2. Allowed Vehicles Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    Allowed Vehicles
                  </Label>
                  <span className="text-[10px] text-slate-400">Operationally acceptable</span>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap gap-2 max-h-36 overflow-y-auto">
                  {activeVehicleClasses
                    .filter((vc) =>
                      classSearch
                        ? vc.code.toLowerCase().includes(classSearch.toLowerCase()) ||
                          vc.label.toLowerCase().includes(classSearch.toLowerCase())
                        : true
                    )
                    .map((vc) => {
                      const isAllowed = selectedAllowedCodes.includes(vc.code);
                      const isPreferred = selectedPreferredCodes.includes(vc.code);

                      return (
                        <button
                          key={vc.id}
                          type="button"
                          onClick={() => handleToggleAllowed(vc.code)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
                            isAllowed
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 shadow-2xs font-bold'
                              : 'bg-slate-50 dark:bg-slate-950 text-slate-400 border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-100'
                          }`}
                        >
                          {isAllowed && <Check className="w-3.5 h-3.5 text-slate-700 stroke-[2.5]" />}
                          <span>{vc.code}</span>
                          {isPreferred && (
                            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1 py-0.2 rounded-sm ml-0.5">
                              Pref
                            </span>
                          )}
                        </button>
                      );
                    })}
                </div>
                <p className="text-[11px] text-slate-400 flex items-center gap-1 italic">
                  <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  Note: Preferred vehicles are automatically included in Allowed vehicles.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditOpen(false)}
              className="h-8.5 text-xs font-bold rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveRule}
              className="h-8.5 text-xs font-bold bg-[#FA634E] hover:bg-[#DF4834] text-white rounded-xl shadow-2xs gap-1"
            >
              Save Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
