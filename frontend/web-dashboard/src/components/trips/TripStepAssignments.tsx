import { Truck, User, Plus, Keyboard, Tag, Building2, Phone, DollarSign, ShieldAlert } from 'lucide-react';
import { Driver } from '@/services/driverService';
import { Vehicle } from '@/services/vehicleService';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Combobox } from '@/components/ui/combobox';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { RateCategoryVehicleTypeForm } from '@/components/rate-cards';
import { cn } from '@/lib/utils';

/** Trip creation only offers these vehicle types — "Custom" is the form's existing free-text toggle. */
const TRIP_VEHICLE_TYPE_OPTIONS = ['5 TON', '10 TON', '3-4 TON', '20 TON', '40 FEET'] as const;
/** Trip creation only offers these rate categories — "Custom" is the form's existing free-text toggle. */
const TRIP_RATE_CATEGORY_OPTIONS = ['Single Trip', '10 Hrs Duty', '12 Hrs Duty', 'Round Trip'] as const;

interface Option {
  value: string;
  label: string;
  keywords?: string;
}

interface TripStepAssignmentsProps {
  driverId: string;
  vehicleId: string;
  assignDriverLater: boolean;
  assignVehicleLater: boolean;
  driverOptions: Option[];
  vehicleOptions: Option[];
  selectedDriver: Driver | null;
  selectedVehicle: Vehicle | null;
  vehicleAutoAssigned: boolean;
  vehicleType: string;
  rateCategory: string;
  // Third-Party props
  isThirdParty: boolean;
  thirdPartyProviderId: string;
  thirdPartyProviderOptions: Option[];
  thirdPartyDriverName: string;
  thirdPartyDriverPhone: string;
  thirdPartyVehiclePlate: string;
  thirdPartyCost: number | '';
  onToggleThirdParty: (val: boolean) => void;
  onSelectThirdPartyProvider: (id: string) => void;
  onChangeThirdPartyDriverName: (val: string) => void;
  onChangeThirdPartyDriverPhone: (val: string) => void;
  onChangeThirdPartyVehiclePlate: (val: string) => void;
  onChangeThirdPartyCost: (val: number | '') => void;
  onOpenAddThirdPartyProvider: () => void;
  onSelectDriver: (id: string) => void;
  onSelectVehicle: (id: string) => void;
  onToggleAssignDriverLater: (val: boolean) => void;
  onToggleAssignVehicleLater: (val: boolean) => void;
  onVehicleTypeChange: (val: string) => void;
  onRateCategoryChange: (val: string) => void;
  onOpenAddDriver: () => void;
  onOpenAddVehicle: () => void;
}

export default function TripStepAssignments({
  driverId,
  vehicleId,
  assignDriverLater,
  assignVehicleLater,
  driverOptions,
  vehicleOptions,
  selectedDriver,
  selectedVehicle,
  vehicleAutoAssigned,
  vehicleType,
  rateCategory,
  isThirdParty,
  thirdPartyProviderId,
  thirdPartyProviderOptions,
  thirdPartyDriverName,
  thirdPartyDriverPhone,
  thirdPartyVehiclePlate,
  thirdPartyCost,
  onToggleThirdParty,
  onSelectThirdPartyProvider,
  onChangeThirdPartyDriverName,
  onChangeThirdPartyDriverPhone,
  onChangeThirdPartyVehiclePlate,
  onChangeThirdPartyCost,
  onOpenAddThirdPartyProvider,
  onSelectDriver,
  onSelectVehicle,
  onToggleAssignDriverLater,
  onToggleAssignVehicleLater,
  onVehicleTypeChange,
  onRateCategoryChange,
  onOpenAddDriver,
  onOpenAddVehicle,
}: TripStepAssignmentsProps) {
  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Truck className="w-4 h-4 text-brand" /> Assign Fleet Resources &amp; Vehicle Type
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Choose between internal company fleet or rented third-party logistics capacity.
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-slate-700">
          <Keyboard className="w-3.5 h-3.5 text-brand" />
          <span>Press <kbd className="font-mono bg-white dark:bg-slate-900 px-1 py-0.2 border rounded text-slate-700 dark:text-slate-300 font-bold">D</kbd> Driver, <kbd className="font-mono bg-white dark:bg-slate-900 px-1 py-0.2 border rounded text-slate-700 dark:text-slate-300 font-bold">V</kbd> Vehicle, <kbd className="font-mono bg-white dark:bg-slate-900 px-1 py-0.2 border rounded text-slate-700 dark:text-slate-300 font-bold">↵</kbd> Next</span>
        </div>
      </div>

      {/* Resource Carrier Source Toggle */}
      <div className="flex items-center justify-between p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/60">
        <button
          type="button"
          onClick={() => onToggleThirdParty(false)}
          className={cn(
            'flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer',
            !isThirdParty
              ? 'bg-white dark:bg-slate-800 text-brand shadow-sm border border-slate-200/80 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          )}
        >
          <Truck className="w-4 h-4" />
          <span>Internal Company Fleet</span>
        </button>

        <button
          type="button"
          onClick={() => onToggleThirdParty(true)}
          className={cn(
            'flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer',
            isThirdParty
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          )}
        >
          <Building2 className="w-4 h-4" />
          <span>Third-Party Rental / Subcontractor</span>
        </button>
      </div>

      {/* Required Vehicle Type & Rate Category Card */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30 space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-brand" /> Required Vehicle Specification &amp; Category <span className="text-rose-500">*</span>
          </Label>
        </div>
        <RateCategoryVehicleTypeForm
          vehicleType={vehicleType}
          onVehicleTypeChange={onVehicleTypeChange}
          rateCategory={rateCategory}
          onRateCategoryChange={onRateCategoryChange}
          size="sm"
          required={true}
          showPreviewBar={true}
          vehicleTypeOptions={TRIP_VEHICLE_TYPE_OPTIONS}
          rateCategoryOptions={TRIP_RATE_CATEGORY_OPTIONS}
        />
      </div>

      {!isThirdParty ? (
        /* Internal Own Fleet Assignment Mode */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Driver Assignment Card */}
          <div className="space-y-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-600" /> Driver Assignment
                <kbd className="font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.2 rounded text-[10px] text-slate-500 font-semibold ml-1">D</kbd>
              </Label>
              <button
                type="button"
                onClick={onOpenAddDriver}
                className="text-[11px] font-bold text-brand hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Quick Add Driver
              </button>
            </div>

            {!assignDriverLater && (
              <Combobox
                id="driver_assignment"
                options={driverOptions}
                value={driverId}
                onChange={onSelectDriver}
                placeholder="Select driver..."
                searchPlaceholder="Search by driver name..."
                emptyText="No available drivers found."
              />
            )}

            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="assign_driver_later"
                checked={assignDriverLater}
                onCheckedChange={(c) => onToggleAssignDriverLater(!!c)}
              />
              <Label htmlFor="assign_driver_later" className="text-xs text-slate-600 dark:text-slate-400 cursor-pointer flex items-center gap-1.5">
                <span>Assign driver later (Unassigned dispatch pool)</span>
                <kbd className="font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1 py-0.2 rounded text-[9px] text-slate-400">L</kbd>
              </Label>
            </div>

            {selectedDriver && !assignDriverLater && (
              <div className="rounded-lg bg-emerald-50/80 dark:bg-emerald-950/30 p-2.5 text-xs border border-emerald-200/80 dark:border-emerald-900">
                <p className="font-bold text-emerald-900 dark:text-emerald-200">
                  {selectedDriver.first_name} {selectedDriver.last_name}
                </p>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                  Phone: {selectedDriver.phone_primary} • License: {selectedDriver.license_number || 'Valid'}
                </p>
              </div>
            )}
          </div>

          {/* Vehicle Assignment Card */}
          <div className="space-y-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-indigo-600" /> Vehicle Assignment
                <kbd className="font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.2 rounded text-[10px] text-slate-500 font-semibold ml-1">V</kbd>
              </Label>
              <button
                type="button"
                onClick={onOpenAddVehicle}
                className="text-[11px] font-bold text-brand hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Quick Add Vehicle
              </button>
            </div>

            {!assignVehicleLater && (
              <Combobox
                id="vehicle_assignment"
                options={vehicleOptions}
                value={vehicleId}
                onChange={onSelectVehicle}
                placeholder="Select vehicle..."
                searchPlaceholder="Search by plate number..."
                emptyText="No available vehicles found."
              />
            )}

            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="assign_vehicle_later"
                checked={assignVehicleLater}
                onCheckedChange={(c) => onToggleAssignVehicleLater(!!c)}
              />
              <Label htmlFor="assign_vehicle_later" className="text-xs text-slate-600 dark:text-slate-400 cursor-pointer flex items-center gap-1.5">
                <span>Assign vehicle later</span>
                <kbd className="font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1 py-0.2 rounded text-[9px] text-slate-400">L</kbd>
              </Label>
            </div>

            {selectedVehicle && !assignVehicleLater && (
              <div className="rounded-lg bg-emerald-50/80 dark:bg-emerald-950/30 p-2.5 text-xs border border-emerald-200/80 dark:border-emerald-900">
                <p className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center justify-between">
                  <span>Plate: {selectedVehicle.plate_number}</span>
                  {vehicleAutoAssigned && (
                    <Badge className="bg-emerald-600 text-white text-[9px] px-1.5 py-0">Auto-filled</Badge>
                  )}
                </p>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                  Type: {selectedVehicle.asset_type} • Cap: {selectedVehicle.capacity_kg.toLocaleString()} kg
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Third-Party Rented Fleet Assignment Mode */
        <div className="space-y-4 p-4 rounded-xl border border-purple-200 dark:border-purple-900 bg-purple-50/30 dark:bg-purple-950/20">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-purple-950 dark:text-purple-200 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              Subcontracted / Rented Carrier Assignment
            </h4>

            <button
              type="button"
              onClick={onOpenAddThirdPartyProvider}
              className="text-[11px] font-bold text-purple-700 dark:text-purple-300 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> + New Third-Party Provider
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Provider Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-purple-600" /> Provider Company <span className="text-rose-500">*</span>
              </Label>
              <Combobox
                id="third_party_provider"
                options={thirdPartyProviderOptions}
                value={thirdPartyProviderId}
                onChange={onSelectThirdPartyProvider}
                placeholder="Select rental provider..."
                searchPlaceholder="Search provider name..."
                emptyText="No third-party providers found."
              />
            </div>

            {/* Subcontract Rental Cost */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-purple-600" /> Provider Rental Cost (SAR)
              </Label>
              <Input
                type="number"
                placeholder="e.g. 1500"
                value={thirdPartyCost}
                onChange={(e) => onChangeThirdPartyCost(e.target.value ? Number(e.target.value) : '')}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            {/* Third-Party Rented Plate */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-purple-600" /> Rented Truck Plate # <span className="text-rose-500">*</span>
              </Label>
              <Input
                placeholder="e.g. ABC-1234"
                value={thirdPartyVehiclePlate}
                onChange={(e) => onChangeThirdPartyVehiclePlate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            {/* Third-Party Driver Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-purple-600" /> Third-Party Driver Name
              </Label>
              <Input
                placeholder="e.g. Khalid Al-Amri"
                value={thirdPartyDriverName}
                onChange={(e) => onChangeThirdPartyDriverName(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            {/* Third-Party Driver Phone */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-purple-600" /> Driver Phone #
              </Label>
              <Input
                placeholder="e.g. +966 50 000 0000"
                value={thirdPartyDriverPhone}
                onChange={(e) => onChangeThirdPartyDriverPhone(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
