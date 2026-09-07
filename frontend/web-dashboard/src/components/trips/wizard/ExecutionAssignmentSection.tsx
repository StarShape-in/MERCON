import React, { useState } from 'react';
import { Truck, User, ShieldAlert, Plus, Trash2, TrendingUp } from 'lucide-react';
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
  thirdPartyCost?: string;
  setThirdPartyCost?: (cost: string) => void;
  contractSlots?: any[];
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
  thirdPartyCost = '',
  setThirdPartyCost,
  contractSlots = [],
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
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
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
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
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
          <div className="md:col-span-7 space-y-2 border-r-0 md:border-r border-slate-100 dark:border-slate-800 pr-0 md:pr-2.5">
            {/* VEHICLE CLASS */}
            {setContractVehicleType && (
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  VEHICLE CLASS
                </label>
                <Select value={contractVehicleType} onValueChange={setContractVehicleType}>
                  <SelectTrigger className="h-8 rounded-lg border-slate-200 text-xs font-bold text-slate-800 dark:text-slate-100 shadow-2xs">
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
                triggerClassName="h-8 rounded-lg border-slate-200 text-xs font-bold text-slate-800 dark:text-slate-100 shadow-2xs"
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
                triggerClassName="h-8 rounded-lg border-slate-200 text-xs font-bold text-slate-800 dark:text-slate-100 shadow-2xs"
              />
            </div>

            {/* OPTIONAL CO-DRIVER / RELIEVER */}
            {showCoDriver ? (
              <div className="space-y-1 p-2 rounded-lg bg-slate-50 border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
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
                className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 flex items-center gap-1 cursor-pointer pt-0.5"
              >
                <Plus className="w-3 h-3" /> Add Co-Driver / Reliever
              </button>
            )}
          </div>

          {/* RIGHT COLUMN: DYNAMIC DRIVER PROFILE SELECTION CARD */}
          <div className="md:col-span-5 flex flex-col justify-between pl-0 md:pl-0.5 transition-all duration-300 ease-in-out">
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
                const firstName = (selectedOpt as any)?.first_name || (selectedOpt as any)?.raw?.first_name || 'Assigned Driver';
                const lastName = (selectedOpt as any)?.last_name || (selectedOpt as any)?.raw?.last_name || '';
                const optDetailsStr = (selectedOpt as any)?.detailsStr || (selectedOpt as any)?.raw?.detailsStr || '';
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
                  <div className="w-full h-full min-h-[135px] py-3.5 px-3 rounded-xl bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-center gap-2 shadow-2xs animate-fade-in transition-all">
                    <DriverAvatar
                      src={avatarUrl}
                      firstName={firstName}
                      lastName={lastName}
                      size="lg"
                      className="border-2 border-white dark:border-slate-800 shadow-xs mx-auto shrink-0"
                    />
                    <div className="w-full px-1 min-w-0">
                      <div className="text-sm font-black text-slate-900 dark:text-slate-100 truncate" title={`${firstName} ${lastName}`}>
                        {firstName} {lastName}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold truncate pt-0.5">
                        {optDetailsStr || 'Truck: Unassigned'}
                      </div>
                    </div>
                  </div>
                );
              })() : (
                /* UNSELECTED STATE: ORIGINAL CARD LAYOUT FOR RECOMMENDED DRIVERS */
                <div className="w-full flex-1 flex flex-col justify-start transition-all duration-300 animate-fade-in space-y-2">
                  {(() => {
                    const listToDisplay = driverOptions.slice(0, 2);

                    if (listToDisplay.length === 0) {
                      return (
                        <div className="py-4 px-2 text-center text-xs text-slate-400 font-medium">
                          No drivers available
                        </div>
                      );
                    }

                    return listToDisplay.map((dOpt, idx) => {
                      const firstName = (dOpt as any).first_name || (dOpt as any).raw?.first_name || 'Driver';
                      const lastName = (dOpt as any).last_name || (dOpt as any).raw?.last_name || '';
                      const optDetailsStr = (dOpt as any).detailsStr || (dOpt as any).raw?.detailsStr || '';
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

                      return (
                        <div
                          key={dOpt.value || idx}
                          onClick={() => handleDriverChange(dOpt.value)}
                          className="w-full p-2.5 text-left transition-all duration-200 flex items-center justify-between cursor-pointer rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-700 hover:border-[#FA634E] dark:hover:border-[#FA634E] text-slate-700 dark:text-slate-300 min-w-0 shadow-2xs group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <DriverAvatar
                              src={avatarUrl}
                              firstName={firstName}
                              lastName={lastName}
                              size="md"
                              className="border border-slate-200 dark:border-slate-700 shadow-2xs shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="text-xs font-black leading-tight text-slate-900 dark:text-slate-100 uppercase truncate" title={`${firstName} ${lastName}`}>
                                {firstName} {lastName}
                              </div>
                              <div className="text-[11px] text-slate-500 font-medium truncate pt-0.5">
                                {optDetailsStr || 'Truck: Unassigned'}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDriverChange(dOpt.value);
                            }}
                            className="text-xs font-bold text-[#FA634E] shrink-0 bg-red-50 dark:bg-red-950/40 px-3.5 py-1 rounded-full hover:bg-[#FA634E] hover:text-white transition-colors ml-2 cursor-pointer"
                          >
                            Select
                          </button>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* 3PL PARTNER ASSIGNMENT WORKSPACE WITH PROFITABILITY CARD */
        <div className="space-y-2.5">
          {/* 3PL PROVIDER */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              3PL PROVIDER *
            </label>
            <Select value={thirdPartyProviderId} onValueChange={setThirdPartyProviderId}>
              <SelectTrigger className="h-8 rounded-lg border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100 shadow-2xs">
                <SelectValue placeholder="Select 3PL Partner..." />
              </SelectTrigger>
              <SelectContent className="z-[9999]">
                {thirdPartyProviders.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs font-bold cursor-pointer">
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* DRIVER NAME, VEHICLE PLATE & 3PL COST IN A 3-COLUMN GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                3PL DRIVER NAME
              </label>
              <input
                type="text"
                value={thirdPartyDriverName}
                onChange={(e) => setThirdPartyDriverName(e.target.value)}
                placeholder="Driver name..."
                className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 text-xs font-semibold w-full shadow-2xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                3PL VEHICLE PLATE
              </label>
              <input
                type="text"
                value={thirdPartyVehiclePlate}
                onChange={(e) => setThirdPartyVehiclePlate(e.target.value)}
                placeholder="Plate number..."
                className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 text-xs font-semibold w-full shadow-2xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-[#FA634E] uppercase tracking-wider">
                3PL COST (SAR) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={thirdPartyCost}
                  onChange={(e) => setThirdPartyCost?.(e.target.value)}
                  placeholder="0"
                  className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 pl-2.5 pr-8 text-xs font-mono font-black w-full shadow-2xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#FA634E]"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">SAR</span>
              </div>
            </div>
          </div>

          {/* REAL-TIME 3PL PROFITABILITY TRACKER CARD */}
          {(() => {
            const billingAmountNum = contractSlots?.reduce((acc, s) => acc + (parseFloat(s.billingAmount) || 0), 0) || 0;
            const costNum = parseFloat(thirdPartyCost || '0') || 0;
            const marginNum = billingAmountNum - costNum;
            const marginPct = billingAmountNum > 0 ? (marginNum / billingAmountNum) * 100 : 0;

            const isPositive = marginNum >= 0;
            const isHigh = marginPct >= 20;
            const isMedium = marginPct >= 0 && marginPct < 20;

            return (
              <div className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-[#FA634E]" /> 3PL REAL-TIME PROFITABILITY
                  </span>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                      isHigh
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                        : isMedium
                        ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                        : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                    }`}
                  >
                    {isPositive ? `+${marginPct.toFixed(1)}% Margin` : `${marginPct.toFixed(1)}% Loss`}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60 text-center">
                  <div className="bg-white dark:bg-slate-900 p-1.5 rounded-lg border border-slate-200/60 dark:border-slate-800">
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase block">Billing</span>
                    <span className="text-xs font-mono font-black text-slate-800 dark:text-slate-100">
                      SAR {billingAmountNum.toLocaleString()}
                    </span>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-1.5 rounded-lg border border-slate-200/60 dark:border-slate-800">
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase block">3PL Cost</span>
                    <span className="text-xs font-mono font-black text-slate-800 dark:text-slate-100">
                      SAR {costNum.toLocaleString()}
                    </span>
                  </div>

                  <div className={`p-1.5 rounded-lg border ${
                    isHigh
                      ? 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800'
                      : isMedium
                      ? 'bg-amber-50/50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800'
                      : 'bg-rose-50/50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-800'
                  }`}>
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase block">Net Margin</span>
                    <span className={`text-xs font-mono font-black ${
                      isPositive ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                    }`}>
                      {isPositive ? '+' : ''}SAR {marginNum.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};
