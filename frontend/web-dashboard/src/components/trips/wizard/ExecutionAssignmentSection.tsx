import React, { useState } from 'react';
import { Truck, User, ShieldAlert, Plus, Trash2 } from 'lucide-react';
import { Combobox, ComboboxOption } from '@/components/ui/combobox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ExecutionAssignmentSectionProps {
  assignmentType: 'own' | 'third_party' | '3pl';
  setAssignmentType: (type: 'own' | 'third_party') => void;
  masterVehicle: string;
  masterDriver: string;
  handleVehicleChange: (vId: string) => void;
  handleDriverChange: (dId: string) => void;
  vehicleOptions: ComboboxOption[];
  driverOptions: ComboboxOption[];
  thirdPartyProviderId: string;
  setThirdPartyProviderId: (id: string) => void;
  thirdPartyProviders: any[];
  thirdPartyVehiclePlate: string;
  setThirdPartyVehiclePlate: (plate: string) => void;
  thirdPartyDriverName: string;
  setThirdPartyDriverName: (name: string) => void;
  contractVehicleType?: string;
  setContractVehicleType?: (vType: string) => void;
}

export const ExecutionAssignmentSection: React.FC<ExecutionAssignmentSectionProps> = ({
  assignmentType,
  setAssignmentType,
  masterVehicle,
  masterDriver,
  handleVehicleChange,
  handleDriverChange,
  vehicleOptions,
  driverOptions,
  thirdPartyProviderId,
  setThirdPartyProviderId,
  thirdPartyProviders,
  thirdPartyVehiclePlate,
  setThirdPartyVehiclePlate,
  thirdPartyDriverName,
  setThirdPartyDriverName,
  contractVehicleType = '10 TON',
  setContractVehicleType,
}) => {
  const [coDriver, setCoDriver] = useState('');
  const [showCoDriver, setShowCoDriver] = useState(false);

  const selectedDriverObj = driverOptions.find((d) => d.value === masterDriver);
  const selectedVehicleObj = vehicleOptions.find((v) => v.value === masterVehicle);

  return (
    <div className="p-3 rounded-xl border border-emerald-200/90 dark:border-emerald-900 bg-white dark:bg-slate-900 shadow-2xs space-y-2.5">
      <div className="flex items-center justify-between pb-1.5 border-b border-emerald-100 dark:border-emerald-900">
        <h4 className="text-xs font-extrabold text-emerald-950 dark:text-emerald-200 uppercase tracking-wider flex items-center gap-1.5">
          <Truck className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> ASSIGNMENT
        </h4>
        {/* ASSIGNMENT MODE TOGGLE */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setAssignmentType('own')}
            className={`px-2 py-0.5 rounded text-[10px] font-extrabold transition-all cursor-pointer ${
              assignmentType === 'own'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Own Fleet
          </button>
          <button
            type="button"
            onClick={() => setAssignmentType('third_party')}
            className={`px-2 py-0.5 rounded text-[10px] font-extrabold transition-all cursor-pointer ${
              assignmentType === 'third_party'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            3PL Partner
          </button>
        </div>
      </div>

      {assignmentType === 'own' ? (
        /* 2-COLUMN ASSIGNMENT WORKSPACE */
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
          {/* LEFT COLUMN: SELECTION DROPDOWNS */}
          <div className="md:col-span-6 space-y-2 border-r-0 md:border-r border-slate-100 dark:border-slate-800 pr-0 md:pr-2.5">
            {/* VEHICLE CLASS / TON DROPDOWN */}
            {setContractVehicleType && (
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  REQUIRED VEHICLE CLASS (TON)
                </label>
                <Select value={contractVehicleType} onValueChange={setContractVehicleType}>
                  <SelectTrigger className="h-8 rounded-lg border-slate-200 text-xs font-bold text-slate-800 shadow-2xs">
                    <SelectValue placeholder="Select Ton / Vehicle Class..." />
                  </SelectTrigger>
                  <SelectContent className="z-[9999]">
                    {['10 TON', '20 TON', '40 FEET', '3-4 TON', '5 TON'].map((vClass) => (
                      <SelectItem key={vClass} value={vClass} className="text-xs font-bold py-1.5 cursor-pointer">
                        {vClass}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* PRIMARY DRIVER SELECTION */}
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
                <User className="w-3 h-3 text-emerald-600" /> PRIMARY DRIVER
              </label>
              <Combobox
                options={driverOptions}
                value={masterDriver}
                onChange={handleDriverChange}
                placeholder="Select primary driver..."
                searchPlaceholder="Search driver name, phone..."
                triggerClassName="h-8 rounded-lg border-slate-200 text-xs font-bold text-slate-800 shadow-2xs"
              />
            </div>

            {/* VEHICLE ASSET */}
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>VEHICLE ASSET {!masterVehicle && <span className="text-amber-600 font-bold ml-1">⚠ Pending</span>}</span>
              </label>
              <Combobox
                options={vehicleOptions}
                value={masterVehicle}
                onChange={handleVehicleChange}
                placeholder="Select primary vehicle..."
                searchPlaceholder="Search plate, asset code..."
                triggerClassName="h-8 rounded-lg border-slate-200 text-xs font-bold text-slate-800 shadow-2xs"
              />
            </div>

            {/* OPTIONAL CO-DRIVER / RELIEVER */}
            {showCoDriver ? (
              <div className="space-y-1 p-2 rounded-lg bg-slate-50 border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">
                    CO-DRIVER / RELIEVER
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setCoDriver('');
                      setShowCoDriver(false);
                    }}
                    className="text-slate-400 hover:text-rose-600 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <Combobox
                  options={driverOptions.filter((d) => d.value !== masterDriver)}
                  value={coDriver}
                  onChange={setCoDriver}
                  placeholder="Select co-driver..."
                  searchPlaceholder="Search co-driver name..."
                  triggerClassName="h-8 rounded-lg border-slate-200 text-xs font-semibold shadow-2xs"
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowCoDriver(true)}
                className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer pt-0.5"
              >
                <Plus className="w-3 h-3" /> Add Co-Driver / Reliever
              </button>
            )}
          </div>

          {/* RIGHT COLUMN: SELECTED DRIVER & VEHICLE PROFILE + RECOMMENDED DRIVERS */}
          <div className="md:col-span-6 space-y-2.5 pl-0 md:pl-0.5">
            {/* ASSIGNED DRIVER & VEHICLE PROFILE CARD */}
            {selectedDriverObj ? (() => {
              const dLabel = typeof selectedDriverObj.label === 'string' ? selectedDriverObj.label : String(selectedDriverObj.label || '');
              const vLabel = selectedVehicleObj ? (typeof selectedVehicleObj.label === 'string' ? selectedVehicleObj.label : String(selectedVehicleObj.label || '')) : 'Vehicle Pending';
              const initials = dLabel.substring(0, 2).toUpperCase() || 'DR';
              const nameOnly = dLabel.split('(')[0].trim() || 'Primary Driver';

              return (
                <div className="p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-1.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-extrabold uppercase text-emerald-800 dark:text-emerald-300 tracking-wider">
                      ASSIGNED DRIVER PROFILE
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-600 text-white">
                      Assigned ✓
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-black text-xs grid place-items-center shrink-0 shadow-2xs">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-extrabold text-slate-900 dark:text-slate-100 truncate">
                        {nameOnly}
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium truncate">
                        🚛 {vLabel}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })() : (
              <div className="p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400 bg-slate-50/40 dark:bg-slate-900/40">
                👤 Select driver & vehicle to view profile
              </div>
            )}

            {/* RECOMMENDED DRIVERS (2-ROW OPACITY-LESS STRIP) */}
            {driverOptions && driverOptions.length > 0 && (
              <div className="space-y-1 pt-0.5">
                <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  RECOMMENDED DRIVERS
                </span>
                <div className="grid grid-cols-2 gap-1.5 opacity-75 hover:opacity-100 transition-opacity">
                  {driverOptions.slice(0, 4).map((dOpt) => {
                    const isSelected = masterDriver === dOpt.value;
                    const optLabelStr = typeof dOpt.label === 'string' ? dOpt.label : String(dOpt.label || '');
                    const optNameOnly = optLabelStr.split('(')[0].trim() || 'Driver';

                    return (
                      <button
                        key={dOpt.value}
                        type="button"
                        onClick={() => handleDriverChange(dOpt.value)}
                        className={`p-1.5 rounded-lg border text-left text-[10px] font-bold truncate transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-100/80 border-emerald-500 text-emerald-900 font-black shadow-2xs'
                            : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 hover:bg-slate-100'
                        }`}
                        title={optLabelStr}
                      >
                        👤 {optNameOnly}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* 3PL PARTNER ASSIGNMENT WORKSPACE */
        <div className="space-y-2">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">3PL PROVIDER *</label>
            <Select value={thirdPartyProviderId} onValueChange={setThirdPartyProviderId}>
              <SelectTrigger className="h-8.5 rounded-lg border-slate-200 text-xs font-bold shadow-2xs">
                <SelectValue placeholder="Select 3PL Partner..." />
              </SelectTrigger>
              <SelectContent className="z-[9999]">
                {thirdPartyProviders.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs font-bold">
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <div className="space-y-0.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase">3PL Driver Name</label>
              <input
                type="text"
                value={thirdPartyDriverName}
                onChange={(e) => setThirdPartyDriverName(e.target.value)}
                placeholder="Driver name..."
                className="h-8 rounded-lg border border-slate-200 px-2 text-xs font-semibold w-full shadow-2xs"
              />
            </div>
            <div className="space-y-0.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase">3PL Vehicle Plate</label>
              <input
                type="text"
                value={thirdPartyVehiclePlate}
                onChange={(e) => setThirdPartyVehiclePlate(e.target.value)}
                placeholder="Plate number..."
                className="h-8 rounded-lg border border-slate-200 px-2 text-xs font-semibold w-full shadow-2xs"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
