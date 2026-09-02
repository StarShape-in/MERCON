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
}) => {
  const [coDriver, setCoDriver] = useState('');
  const [showCoDriver, setShowCoDriver] = useState(false);

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
        /* OWN FLEET ASSIGNMENT WORKSPACE */
        <div className="space-y-2">
          {/* PRIMARY DRIVER SELECTION (TOP) */}
          <div className="space-y-1">
            <label className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
              <User className="w-3 h-3 text-emerald-600" /> PRIMARY DRIVER
            </label>
            <Combobox
              options={driverOptions}
              value={masterDriver}
              onChange={handleDriverChange}
              placeholder="Select primary driver..."
              searchPlaceholder="Search driver name, phone..."
              triggerClassName="h-8.5 rounded-lg border-slate-200 text-xs font-bold text-slate-800 shadow-2xs"
            />
          </div>

          {/* VEHICLE ASSET (BELOW DRIVER) */}
          <div className="space-y-1">
            <label className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>VEHICLE ASSET {!masterVehicle && <span className="text-amber-600 font-bold ml-1">⚠ Driver/Vehicle Pending</span>}</span>
            </label>
            <Combobox
              options={vehicleOptions}
              value={masterVehicle}
              onChange={handleVehicleChange}
              placeholder="Select primary vehicle..."
              searchPlaceholder="Search plate, asset code..."
              triggerClassName="h-8.5 rounded-lg border-slate-200 text-xs font-bold text-slate-800 shadow-2xs"
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
              className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer pt-0.5"
            >
              <Plus className="w-3 h-3" /> Add Co-Driver / Reliever
            </button>
          )}
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
