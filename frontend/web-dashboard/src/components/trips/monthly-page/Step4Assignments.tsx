import { useState, useMemo } from 'react';
import { Calendar, User, RefreshCw, Plus, Trash2, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Combobox, ComboboxOption } from '@/components/ui/combobox';
import { Driver } from '@/services/driverService';
import { Vehicle } from '@/services/vehicleService';
import CreateDriverModal from '@/components/drivers/CreateDriverModal';
import CreateVehicleModal from '@/components/fleet/CreateVehicleModal';
import { BatchTripRow, ContractSlot, LoopTeam } from './types';

interface Step4AssignmentsProps {
  drivers: Driver[];
  vehicles: Vehicle[];
  contractVehicleType?: string;
  assignMode: 'single' | 'alternating';
  onSetAssignMode: (mode: 'single' | 'alternating') => void;
  masterDriver: string;
  onMasterDriverChange: (id: string) => void;
  masterVehicle: string;
  onMasterVehicleChange: (id: string) => void;
  masterTripCharge: string;
  onMasterTripChargeChange: (val: string) => void;
  masterAdditionalCharges?: string;
  onMasterAdditionalChargesChange?: (val: string) => void;
  masterDriverCharge: string;
  onMasterDriverChargeChange: (val: string) => void;
  loopTeams: LoopTeam[];
  onAddLoopTeam: () => void;
  onRemoveLoopTeam: (id: string) => void;
  onUpdateLoopTeam: (id: string, updates: Partial<LoopTeam>) => void;
  onApplyAlternatingLoop: () => void;
  batchTripRows: BatchTripRow[];
  contractSlots: ContractSlot[];
  dayAssignments: Record<string, { driverId: string; vehicleId: string; tripCharge?: string; additionalCharges?: string; driverTripCharge?: string }>;
  onUpdateDayAssignment: (rowKey: string, updates: Partial<{ driverId: string; vehicleId: string; tripCharge?: string; additionalCharges?: string; driverTripCharge?: string }>) => void;
  onToggleDate: (dateStr: string) => void;
  onNext: () => void;
  onBack: () => void;
  onDriverCreated: () => void;
  onVehicleCreated: () => void;
  getDriverLabel: (d: any, list: any[]) => string;
  getVehicleLabel: (v: any) => string;
}

export default function Step4Assignments({
  drivers,
  vehicles,
  contractVehicleType,
  assignMode,
  onSetAssignMode,
  masterDriver,
  onMasterDriverChange,
  masterVehicle,
  onMasterVehicleChange,
  masterTripCharge,
  onMasterTripChargeChange,
  masterAdditionalCharges = '',
  onMasterAdditionalChargesChange,
  masterDriverCharge,
  onMasterDriverChargeChange,
  loopTeams,
  onAddLoopTeam,
  onRemoveLoopTeam,
  onUpdateLoopTeam,
  onApplyAlternatingLoop,
  batchTripRows,
  contractSlots,
  dayAssignments,
  onUpdateDayAssignment,
  onToggleDate,
  onDriverCreated,
  onVehicleCreated,
  getDriverLabel,
  getVehicleLabel,
}: Step4AssignmentsProps) {
  const [isCreateDriverOpen, setIsCreateDriverOpen] = useState(false);
  const [isCreateVehicleOpen, setIsCreateVehicleOpen] = useState(false);

  const isVehicleMatchingTon = (v: Vehicle, targetTon?: string) => {
    if (!targetTon) return true;
    const vType = (v.asset_type || (v as any).assetType || '').toLowerCase();
    const target = targetTon.toLowerCase();
    if (vType.includes(target) || target.includes(vType)) return true;
    const capacityKg = v.capacity_kg || 0;
    if (target === '3-4 ton' && capacityKg > 0 && capacityKg <= 4000) return true;
    if (target === '5 ton' && capacityKg > 4000 && capacityKg <= 5000) return true;
    if (target === '10 ton' && capacityKg > 5000 && capacityKg <= 10000) return true;
    if (target === '20 ton' && capacityKg > 10000 && capacityKg <= 20000) return true;
    if (target === '40 feet' && capacityKg > 20000) return true;
    return false;
  };

  const displayVehicles = useMemo(() => {
    if (!contractVehicleType) return vehicles;
    const matching = vehicles.filter((v) => isVehicleMatchingTon(v, contractVehicleType));
    const nonMatching = vehicles.filter((v) => !isVehicleMatchingTon(v, contractVehicleType));
    return [...matching, ...nonMatching];
  }, [vehicles, contractVehicleType]);

  const displayDrivers = useMemo(() => {
    if (!contractVehicleType) return drivers;
    const matchingSet = new Set(
      drivers.filter((d) => {
        const assignedVeh = d.assignedVehicle && typeof d.assignedVehicle === 'object'
          ? (d.assignedVehicle as any)
          : vehicles.find((v) => v.id === (d.assignedVehicleId || (d as any).assigned_vehicle_id));
        if (!assignedVeh) return true;
        return isVehicleMatchingTon(assignedVeh, contractVehicleType);
      }).map((d) => d.id)
    );

    const matching = drivers.filter((d) => matchingSet.has(d.id));
    const nonMatching = drivers.filter((d) => !matchingSet.has(d.id));
    return [...matching, ...nonMatching];
  }, [drivers, vehicles, contractVehicleType]);

  const driverComboboxOptions = useMemo<ComboboxOption[]>(() => [
    { value: 'unassigned', label: '-- Unassigned --' },
    ...displayDrivers.map((d) => ({
      value: d.id,
      label: getDriverLabel(d, vehicles),
      keywords: `${d.first_name || ''} ${d.last_name || ''} ${d.phone_primary || ''} ${d.license_number || ''}`,
    })),
  ], [displayDrivers, vehicles, getDriverLabel]);

  const vehicleComboboxOptions = useMemo<ComboboxOption[]>(() => [
    { value: 'unassigned', label: '-- Unassigned --' },
    ...displayVehicles.map((v) => ({
      value: v.id,
      label: getVehicleLabel(v),
      keywords: `${v.plate_number || ''} ${v.asset_type || (v as any).assetType || ''} ${v.ref_id || ''}`,
    })),
  ], [displayVehicles, getVehicleLabel]);

  /** Return the ContractSlot for a given BatchTripRow (used for charge defaults) */
  const getSlotForRow = (row: BatchTripRow): ContractSlot | undefined => {
    if (contractSlots.length <= 1) return contractSlots[0];
    const slotId = row.key.includes('::') ? row.key.split('::')[1] : undefined;
    return slotId ? contractSlots.find((s) => s.id === slotId) : contractSlots[0];
  };

  return (
    <div className="w-full space-y-4 animate-fade-in py-1">
      {/* Assignment Control Bar */}
      <div className="p-4 bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3.5 shadow-2xs w-full">
        <div className="flex items-center justify-between flex-wrap gap-2 w-full">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Assignment Model
          </label>
          <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
            <button
              type="button"
              onClick={() => onSetAssignMode('single')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                assignMode === 'single'
                  ? 'bg-brand text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              Single Master Driver
            </button>
            <button
              type="button"
              onClick={() => onSetAssignMode('alternating')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                assignMode === 'alternating'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Alternating A/B Shuttle Loop
            </button>
          </div>
        </div>

        {assignMode === 'single' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2.5 items-end pt-1 w-full">
            {/* Master Default Driver */}
            <div className="space-y-1 sm:col-span-1 lg:col-span-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Master Default Driver
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCreateDriverOpen(true)}
                  className="h-5 text-[10px] text-brand font-bold p-0"
                >
                  + New Driver
                </Button>
              </div>
              <Combobox
                options={driverComboboxOptions}
                value={masterDriver || 'unassigned'}
                onChange={onMasterDriverChange}
                placeholder="Select master driver..."
                searchPlaceholder="Search driver name, phone, license..."
                triggerClassName="h-8.5 text-xs font-semibold w-full"
              />
            </div>

            {/* Master Default Vehicle */}
            <div className="space-y-1 sm:col-span-1 lg:col-span-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Master Default Vehicle
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCreateVehicleOpen(true)}
                  className="h-5 text-[10px] text-brand font-bold p-0"
                >
                  + New Vehicle
                </Button>
              </div>
              <Combobox
                options={vehicleComboboxOptions}
                value={masterVehicle || 'unassigned'}
                onChange={onMasterVehicleChange}
                placeholder="Select master vehicle..."
                searchPlaceholder="Search plate number, type..."
                triggerClassName="h-8.5 text-xs font-semibold w-full"
              />
            </div>

            {/* Master Billing Rate */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-emerald-500" />
                Billing Rate
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-emerald-500 font-bold text-[10px] pointer-events-none">
                  SAR
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={masterTripCharge}
                  onChange={(e) => onMasterTripChargeChange(e.target.value)}
                  placeholder={contractSlots[0]?.billingAmount || '0.00'}
                  className="h-8.5 w-full pl-9 pr-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Master Extras (Additional Charges) */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-amber-500" />
                Extras (Additional)
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-amber-500 font-bold text-[10px] pointer-events-none">
                  SAR
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={masterAdditionalCharges}
                  onChange={(e) => onMasterAdditionalChargesChange && onMasterAdditionalChargesChange(e.target.value)}
                  placeholder={contractSlots[0]?.additionalCharges || '0.00'}
                  className="h-8.5 w-full pl-9 pr-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Master Total Amount */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-emerald-600" />
                Total Amount
              </label>
              <div className="h-8.5 w-full px-2.5 flex items-center rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/40 font-mono text-xs font-black text-emerald-700 dark:text-emerald-300">
                SAR {( (parseFloat(masterTripCharge || contractSlots[0]?.billingAmount || '0') || 0) + (parseFloat(masterAdditionalCharges || contractSlots[0]?.additionalCharges || '0') || 0) ).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            {/* Master Driver Charge */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-indigo-500" />
                Driver Charge
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-indigo-400 font-bold text-[10px] pointer-events-none">
                  SAR
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={masterDriverCharge}
                  onChange={(e) => onMasterDriverChargeChange(e.target.value)}
                  placeholder={contractSlots[0]?.driverTripCharge || '0.00'}
                  className="h-8.5 w-full pl-9 pr-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400 placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Master Balance Amount */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-teal-600" />
                Balance Amount
              </label>
              {(() => {
                const bVal = parseFloat(masterTripCharge || contractSlots[0]?.billingAmount || '0') || 0;
                const eVal = parseFloat(masterAdditionalCharges || contractSlots[0]?.additionalCharges || '0') || 0;
                const dVal = parseFloat(masterDriverCharge || contractSlots[0]?.driverTripCharge || '0') || 0;
                const totVal = bVal + eVal;
                const balVal = totVal - (eVal + dVal);
                return (
                  <div className={`h-8.5 w-full px-2.5 flex items-center rounded-lg border font-mono text-xs font-black ${
                    balVal >= 0
                      ? 'border-teal-200 dark:border-teal-900/60 bg-teal-50/60 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300'
                      : 'border-rose-200 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                  }`}>
                    SAR {balVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                );
              })()}
            </div>
          </div>
        ) : (
          <div className="space-y-3 pt-1 w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 w-full">
              {loopTeams.map((team) => (
                <div key={team.id} className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{team.name}</span>
                    {loopTeams.length > 2 && (
                      <button
                        type="button"
                        onClick={() => onRemoveLoopTeam(team.id)}
                        className="text-slate-400 hover:text-rose-600 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <Combobox
                    options={driverComboboxOptions}
                    value={team.driverId || 'unassigned'}
                    onChange={(val) => onUpdateLoopTeam(team.id, { driverId: val === 'unassigned' ? '' : val })}
                    placeholder="Driver"
                    searchPlaceholder="Search driver..."
                    triggerClassName="h-8 text-xs font-medium w-full"
                  />

                  <Combobox
                    options={vehicleComboboxOptions}
                    value={team.vehicleId || 'unassigned'}
                    onChange={(val) => onUpdateLoopTeam(team.id, { vehicleId: val === 'unassigned' ? '' : val })}
                    placeholder="Truck"
                    searchPlaceholder="Search truck..."
                    triggerClassName="h-8 text-xs font-medium w-full"
                  />

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-700/60">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-0.5">
                        <DollarSign className="w-2.5 h-2.5 text-emerald-500" />
                        Billing Rate
                      </label>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-emerald-500 font-bold text-[9px] pointer-events-none">
                          SAR
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={team.tripCharge ?? ''}
                          onChange={(e) => onUpdateLoopTeam(team.id, { tripCharge: e.target.value })}
                          placeholder="0.00"
                          className="h-7.5 w-full pl-8 pr-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 placeholder:text-slate-300"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-0.5">
                        <DollarSign className="w-2.5 h-2.5 text-indigo-500" />
                        Driver Charge
                      </label>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-indigo-400 font-bold text-[9px] pointer-events-none">
                          SAR
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={team.driverTripCharge ?? ''}
                          onChange={(e) => onUpdateLoopTeam(team.id, { driverTripCharge: e.target.value })}
                          placeholder="0.00"
                          className="h-7.5 w-full pl-8 pr-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400 placeholder:text-slate-300"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onAddLoopTeam}
                className="h-8 text-xs font-bold gap-1 text-slate-700 dark:text-slate-300 border-dashed"
              >
                <Plus className="w-3.5 h-3.5" /> Add Team Pair
              </Button>
              <Button
                type="button"
                onClick={onApplyAlternatingLoop}
                className="h-8 text-xs font-bold gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Apply Shuttle Rotation to All Dates
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Date Schedule Matrix */}
      <div className="space-y-2.5 w-full">
        <div className="flex items-center justify-between flex-wrap gap-2 px-1">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-brand" />
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
              Full Monthly Dates Schedule ({batchTripRows.length} Generated Trips)
            </h4>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">
            Per-date driver, truck & charge overrides
          </span>
        </div>

        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs bg-white dark:bg-slate-900 w-full">
          <div className="max-h-[calc(100vh-320px)] min-h-[240px] overflow-y-auto w-full">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3">Date & Slot</th>
                  <th className="py-2.5 px-3">Assigned Driver</th>
                  <th className="py-2.5 px-3">Assigned Truck</th>
                  <th className="py-2.5 px-2">
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3 text-emerald-500" />
                      Billing Rate
                    </span>
                  </th>
                  <th className="py-2.5 px-2">
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3 text-amber-500" />
                      Extras
                    </span>
                  </th>
                  <th className="py-2.5 px-2">
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3 text-emerald-600" />
                      Total
                    </span>
                  </th>
                  <th className="py-2.5 px-2">
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3 text-indigo-500" />
                      Driver Charge
                    </span>
                  </th>
                  <th className="py-2.5 px-2">
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3 text-teal-600" />
                      Balance
                    </span>
                  </th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {batchTripRows.map((rowItem) => {
                  const currentAssignment = dayAssignments[rowItem.key] || { driverId: '', vehicleId: '' };
                  const effectiveDriver = currentAssignment.driverId || masterDriver;
                  const effectiveVehicle = currentAssignment.vehicleId || masterVehicle;
                  const slotDefault = getSlotForRow(rowItem);

                  const billingVal = parseFloat(currentAssignment.tripCharge !== undefined && currentAssignment.tripCharge !== '' ? currentAssignment.tripCharge : (masterTripCharge || slotDefault?.billingAmount || '0')) || 0;
                  const extrasVal = parseFloat(currentAssignment.additionalCharges !== undefined && currentAssignment.additionalCharges !== '' ? currentAssignment.additionalCharges : (masterAdditionalCharges || slotDefault?.additionalCharges || '0')) || 0;
                  const totalAmt = billingVal + extrasVal;
                  const driverVal = parseFloat(currentAssignment.driverTripCharge !== undefined && currentAssignment.driverTripCharge !== '' ? currentAssignment.driverTripCharge : (masterDriverCharge || slotDefault?.driverTripCharge || '0')) || 0;
                  const balanceAmt = totalAmt - (extrasVal + driverVal);

                  return (
                    <tr key={rowItem.key} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                      <td className="py-2 px-3 font-semibold text-slate-900 dark:text-slate-100">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-brand shrink-0" />
                          <span>{rowItem.formattedDate}</span>
                          {rowItem.slotLabel && (
                            <span className="text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded shrink-0">
                              {rowItem.slotLabel}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <Combobox
                          options={driverComboboxOptions}
                          value={effectiveDriver || 'unassigned'}
                          onChange={(val) => {
                            const drvVal = val === 'unassigned' ? '' : val;
                            onUpdateDayAssignment(rowItem.key, {
                              driverId: drvVal,
                              vehicleId: currentAssignment.vehicleId || effectiveVehicle,
                            });
                          }}
                          placeholder="Assign driver..."
                          searchPlaceholder="Search driver..."
                          triggerClassName="h-8 text-xs font-medium w-48"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <Combobox
                          options={vehicleComboboxOptions}
                          value={effectiveVehicle || 'unassigned'}
                          onChange={(val) => {
                            const vehVal = val === 'unassigned' ? '' : val;
                            onUpdateDayAssignment(rowItem.key, {
                              driverId: currentAssignment.driverId || effectiveDriver,
                              vehicleId: vehVal,
                            });
                          }}
                          placeholder="Assign truck..."
                          searchPlaceholder="Search truck..."
                          triggerClassName="h-8 text-xs font-medium w-48"
                        />
                      </td>

                      {/* Billing Rate Override */}
                      <td className="py-2 px-2">
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-emerald-500 font-bold text-[9px] pointer-events-none">
                            SAR
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={currentAssignment.tripCharge !== undefined && currentAssignment.tripCharge !== '' ? currentAssignment.tripCharge : masterTripCharge}
                            onChange={(e) =>
                              onUpdateDayAssignment(rowItem.key, { tripCharge: e.target.value })
                            }
                            placeholder={slotDefault?.billingAmount || '0.00'}
                            className="h-8 w-24 pl-8 pr-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 placeholder:text-slate-300 font-mono"
                          />
                        </div>
                      </td>

                      {/* Extras (Additional Charges) Override */}
                      <td className="py-2 px-2">
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-amber-500 font-bold text-[9px] pointer-events-none">
                            SAR
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={currentAssignment.additionalCharges !== undefined && currentAssignment.additionalCharges !== '' ? currentAssignment.additionalCharges : masterAdditionalCharges}
                            onChange={(e) =>
                              onUpdateDayAssignment(rowItem.key, { additionalCharges: e.target.value })
                            }
                            placeholder={slotDefault?.additionalCharges || '0.00'}
                            className="h-8 w-24 pl-8 pr-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 placeholder:text-slate-300 font-mono"
                          />
                        </div>
                      </td>

                      {/* Total Amount (Calculated) */}
                      <td className="py-2 px-2 font-mono text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                        SAR {totalAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* Driver Charge Override */}
                      <td className="py-2 px-2">
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-indigo-400 font-bold text-[9px] pointer-events-none">
                            SAR
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={currentAssignment.driverTripCharge !== undefined && currentAssignment.driverTripCharge !== '' ? currentAssignment.driverTripCharge : masterDriverCharge}
                            onChange={(e) =>
                              onUpdateDayAssignment(rowItem.key, { driverTripCharge: e.target.value })
                            }
                            placeholder={slotDefault?.driverTripCharge || '0.00'}
                            className="h-8 w-24 pl-8 pr-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400 placeholder:text-slate-300 font-mono"
                          />
                        </div>
                      </td>

                      {/* Balance Amount (Calculated) */}
                      <td className={`py-2 px-2 font-mono text-xs font-black ${balanceAmt >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        SAR {balanceAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      <td className="py-2 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => onToggleDate(rowItem.dateStr)}
                          className="p-1 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <CreateDriverModal
        isOpen={isCreateDriverOpen}
        onClose={() => setIsCreateDriverOpen(false)}
        onSuccess={() => {
          setIsCreateDriverOpen(false);
          onDriverCreated();
        }}
      />

      <CreateVehicleModal
        isOpen={isCreateVehicleOpen}
        onClose={() => setIsCreateVehicleOpen(false)}
        onSuccess={() => {
          setIsCreateVehicleOpen(false);
          onVehicleCreated();
        }}
      />
    </div>
  );
}
