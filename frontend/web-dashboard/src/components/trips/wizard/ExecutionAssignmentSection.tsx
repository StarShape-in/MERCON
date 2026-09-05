import React, { useState } from 'react';
import { Truck, User, ShieldAlert, Plus, Trash2 } from 'lucide-react';
import { Combobox, ComboboxOption } from '@/components/ui/combobox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DriverAvatar from '@/components/ui/DriverAvatar';

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
    <div className="p-3.5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-2.5">
      <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
        <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
          <Truck className="w-3.5 h-3.5 text-[#FA634E] shrink-0" /> ASSIGNMENT
        </h4>
        {/* ASSIGNMENT MODE TOGGLE */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200/80 dark:border-slate-700">
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
            {/* VEHICLE CLASS */}
            {setContractVehicleType && (
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  VEHICLE CLASS
                </label>
                <Select value={contractVehicleType} onValueChange={setContractVehicleType}>
                  <SelectTrigger className="h-8 rounded-lg border-slate-200 text-xs font-bold text-slate-800 shadow-2xs">
                    <SelectValue placeholder="Select Vehicle Class..." />
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

            {/* VEHICLE */}
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>VEHICLE {!masterVehicle && <span className="text-amber-600 font-bold ml-1">⚠ Pending</span>}</span>
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

          {/* RIGHT COLUMN: DYNAMIC DRIVER PROFILE SELECTION CARD */}
          <div className="md:col-span-6 flex flex-col justify-between pl-0 md:pl-0.5 transition-all duration-300 ease-in-out">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                {masterDriver ? 'ASSIGNED DRIVER' : 'RECOMMENDED DRIVERS'}
              </span>
              {masterDriver && (
                <button
                  type="button"
                  onClick={() => handleDriverChange('')}
                  className="text-[9px] font-bold text-[#FA634E] hover:text-[#d13d0d] underline cursor-pointer transition-colors"
                >
                  Change Driver
                </button>
              )}
            </div>

            <div className="flex-1 flex flex-col justify-center items-center transition-all duration-300">
              {masterDriver ? (() => {
                // REFINED COMPACT DRIVER VIEW
                const selectedOpt = driverOptions.find((d) => d.value === masterDriver);
                const optLabelStr = selectedOpt ? (typeof selectedOpt.label === 'string' ? selectedOpt.label : String(selectedOpt.label || '')) : '';
                const rawName = optLabelStr.split('(')[0].trim() || 'Assigned Driver';
                const nameParts = rawName.split(' ');
                const firstName = nameParts[0] || rawName;
                const lastName = nameParts.slice(1).join(' ') || '';

                const optDetailsStr = optLabelStr.includes('(') ? optLabelStr.split('(')[1].replace(')', '').trim() : '';
                const avatarUrl = selectedOpt ? (
                  (selectedOpt as any).avatar_url ||
                  (selectedOpt as any).photo_url ||
                  (selectedOpt as any).profile_picture ||
                  (selectedOpt as any).avatarUrl ||
                  (selectedOpt as any).photoUrl ||
                  (selectedOpt as any).image_url ||
                  (selectedOpt as any).raw?.avatar_url ||
                  (selectedOpt as any).raw?.photo_url ||
                  (selectedOpt as any).raw?.profile_picture ||
                  (selectedOpt as any).raw?.avatarUrl ||
                  (selectedOpt as any).raw?.photoUrl ||
                  (selectedOpt as any).raw?.image_url ||
                  null
                ) : null;

                return (
                  <div className="w-full py-2.5 px-3 rounded-xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 text-left flex items-center gap-2.5 shadow-2xs animate-fade-in transition-all">
                    <DriverAvatar
                      src={avatarUrl}
                      firstName={firstName}
                      lastName={lastName}
                      size="md"
                      className="border border-slate-200 dark:border-slate-700 shadow-2xs shrink-0"
                    />
                    <div className="truncate flex-1 min-w-0">
                      <div className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">
                        {firstName} {lastName}
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium truncate pt-0.5">
                        {optDetailsStr || 'Truck: Unassigned'}
                      </div>
                    </div>
                  </div>
                );
              })() : (
                // UNSELECTED STATE: 2 ROWS WITH SUBTLE HORIZONTAL DIVIDER LINE (CENTERED AVATARS, 2-LINE NAMES)
                <div className="w-full flex-1 flex flex-col justify-between transition-all duration-300 animate-fade-in">
                  {driverOptions.slice(0, 2).map((dOpt, idx) => {
                    const optLabelStr = typeof dOpt.label === 'string' ? dOpt.label : String(dOpt.label || '');
                    const rawName = optLabelStr.split('(')[0].trim() || 'Driver';
                    const nameParts = rawName.split(' ');
                    const firstName = nameParts[0] || rawName;
                    const lastName = nameParts.slice(1).join(' ') || '';

                    const optDetailsStr = optLabelStr.includes('(') ? optLabelStr.split('(')[1].replace(')', '').trim() : '';
                    const initials = rawName.substring(0, 2).toUpperCase() || 'DR';
                    const avatarUrl =
                      (dOpt as any).avatar_url ||
                      (dOpt as any).photo_url ||
                      (dOpt as any).profile_picture ||
                      (dOpt as any).avatarUrl ||
                      (dOpt as any).photoUrl ||
                      (dOpt as any).image_url ||
                      (dOpt as any).raw?.avatar_url ||
                      (dOpt as any).raw?.photo_url ||
                      (dOpt as any).raw?.profile_picture ||
                      (dOpt as any).raw?.avatarUrl ||
                      (dOpt as any).raw?.photoUrl ||
                      (dOpt as any).raw?.image_url ||
                      null;
                    const isFirst = idx === 0;

                    return (
                      <button
                        key={dOpt.value || idx}
                        type="button"
                        onClick={() => handleDriverChange(dOpt.value)}
                        className={`w-full py-2 px-3 text-center transition-all duration-200 flex flex-col items-center justify-center cursor-pointer space-y-1 relative rounded-xl hover:bg-slate-50/70 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300 ${
                          isFirst ? 'border-b border-slate-200/80 dark:border-slate-800/80 pb-2 mb-1' : 'pt-1'
                        }`}
                      >
                        <DriverAvatar
                          src={avatarUrl}
                          firstName={firstName}
                          lastName={lastName}
                          size="md"
                          className="border border-slate-200 dark:border-slate-700 shadow-2xs mx-auto"
                        />

                        {/* FIRST NAME AND LAST NAME IN 2 SEPARATE LINES */}
                        <div className="text-xs font-black text-center leading-tight text-slate-900 dark:text-slate-100">
                          <div className="truncate max-w-full">{firstName}</div>
                          {lastName && <div className="truncate max-w-full font-medium text-[11px] text-slate-600 dark:text-slate-300">{lastName}</div>}
                        </div>

                        <div className="text-[10px] text-slate-500 font-medium truncate max-w-full">
                          {optDetailsStr || 'Truck: Unassigned'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
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
