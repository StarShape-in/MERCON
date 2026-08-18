import { Truck, User, Plus, Keyboard, Tag, Building2, Phone, DollarSign } from 'lucide-react';
import { Driver } from '@/services/driverService';
import { Vehicle } from '@/services/vehicleService';
import DriverAvatar from '@/components/ui/DriverAvatar';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Combobox } from '@/components/ui/combobox';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { RateCategoryVehicleTypeForm } from '@/components/rate-cards';
import { cn } from '@/lib/utils';

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
  billingType: string;
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
  onBillingTypeChange: (val: string) => void;
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
  billingType,
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
  onBillingTypeChange,
  onOpenAddDriver,
  onOpenAddVehicle,
}: TripStepAssignmentsProps) {
  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Truck className="w-4 h-4 text-brand" /> Assignments
        </h3>
        <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-slate-700">
          <Keyboard className="w-3.5 h-3.5 text-brand" />
          <span>Press <kbd className="font-mono bg-white dark:bg-slate-900 px-1 py-0.2 border rounded text-slate-700 dark:text-slate-300 font-bold">1-4</kbd> Driver, <kbd className="font-mono bg-white dark:bg-slate-900 px-1 py-0.2 border rounded text-slate-700 dark:text-slate-300 font-bold">L</kbd> Later</span>
        </div>
      </div>

      <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3.5 shadow-2xs !overflow-visible">
        {/* Fleet source toggle */}
        <div className="flex items-center justify-between p-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/60">
          <button
            type="button"
            onClick={() => onToggleThirdParty(false)}
            className={cn(
              'flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer',
              !isThirdParty
                ? 'bg-white dark:bg-slate-800 text-brand shadow-sm border border-slate-200/80 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            )}
          >
            <Truck className="w-3.5 h-3.5" /> Own Fleet
          </button>
          <button
            type="button"
            onClick={() => onToggleThirdParty(true)}
            className={cn(
              'flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer',
              isThirdParty
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            )}
          >
            <Building2 className="w-3.5 h-3.5" /> Third-Party
          </button>
        </div>

        {/* Vehicle type / rate category — flat row, no nested box */}
        <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
          <Label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-brand" /> Vehicle Specification &amp; Rate Category <span className="text-rose-500">*</span>
          </Label>
          <RateCategoryVehicleTypeForm
            vehicleType={vehicleType}
            onVehicleTypeChange={onVehicleTypeChange}
            rateCategory={rateCategory}
            onRateCategoryChange={onRateCategoryChange}
            billingType={billingType}
            onBillingTypeChange={onBillingTypeChange}
            size="sm"
            required={true}
            showPreviewBar={false}
          />
        </div>

        {!isThirdParty ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 border-t border-slate-100 dark:border-slate-800 md:divide-x md:divide-slate-100 dark:md:divide-slate-800">
            {/* Driver */}
            <div className="space-y-2 md:pr-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-600" /> Driver
                </Label>
                <button
                  type="button"
                  onClick={onOpenAddDriver}
                  className="text-[11px] font-bold text-brand hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Add
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

              <div className="flex items-center gap-2">
                <Checkbox id="assign_driver_later" checked={assignDriverLater} onCheckedChange={(c) => onToggleAssignDriverLater(!!c)} />
                <Label htmlFor="assign_driver_later" className="text-[11px] text-slate-600 dark:text-slate-400 cursor-pointer">
                  Assign driver later
                </Label>
              </div>

              {selectedDriver && !assignDriverLater && (
                <div className="flex items-center gap-2 p-2 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-900/60 rounded-xl">
                  <DriverAvatar
                    src={selectedDriver.avatar_url}
                    firstName={selectedDriver.first_name}
                    lastName={selectedDriver.last_name}
                    size="sm"
                  />
                  <div className="flex flex-col text-[11px]">
                    <span className="font-bold text-emerald-900 dark:text-emerald-200">
                      {selectedDriver.first_name} {selectedDriver.last_name}
                    </span>
                    <span className="text-emerald-700 dark:text-emerald-400">
                      {selectedDriver.phone_primary}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Vehicle */}
            <div className="space-y-2 md:pl-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-indigo-600" /> Vehicle
                </Label>
                <button
                  type="button"
                  onClick={onOpenAddVehicle}
                  className="text-[11px] font-bold text-brand hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Add
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

              <div className="flex items-center gap-2">
                <Checkbox id="assign_vehicle_later" checked={assignVehicleLater} onCheckedChange={(c) => onToggleAssignVehicleLater(!!c)} />
                <Label htmlFor="assign_vehicle_later" className="text-[11px] text-slate-600 dark:text-slate-400 cursor-pointer">
                  Assign vehicle later
                </Label>
              </div>

              {selectedVehicle && !assignVehicleLater && (
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1.5">
                  {selectedVehicle.plate_number} • {selectedVehicle.asset_type}
                  {vehicleAutoAssigned && <Badge className="bg-emerald-600 text-white text-[9px] px-1.5 py-0">Auto-filled</Badge>}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3 pt-1 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-950 dark:text-purple-200 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" /> Third-Party Provider
              </span>
              <button
                type="button"
                onClick={onOpenAddThirdPartyProvider}
                className="text-[11px] font-bold text-purple-700 dark:text-purple-300 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> New Provider
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-purple-600" /> Rental Cost (SAR)
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-purple-600" /> Vehicle Plate # <span className="text-rose-500">*</span>
                </Label>
                <Input
                  placeholder="e.g. ABC-1234"
                  value={thirdPartyVehiclePlate}
                  onChange={(e) => onChangeThirdPartyVehiclePlate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-purple-600" /> Driver Name
                </Label>
                <Input
                  placeholder="e.g. Khalid Al-Amri"
                  value={thirdPartyDriverName}
                  onChange={(e) => onChangeThirdPartyDriverName(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
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
      </Card>
    </div>
  );
}
