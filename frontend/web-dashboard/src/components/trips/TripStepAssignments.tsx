import { Truck, User, Plus, Keyboard, Tag } from 'lucide-react';
import { Driver } from '@/services/driverService';
import { Vehicle } from '@/services/vehicleService';
import { Label } from '@/components/ui/label';
import { Combobox } from '@/components/ui/combobox';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { RateCategoryVehicleTypeForm } from '@/components/rate-cards';

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
            <Truck className="w-4 h-4 text-[#E8450F]" /> Assign Fleet Resources &amp; Vehicle Type
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Set vehicle type specification, rate category, and assign driver and vehicle to dispatch this trip.
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-slate-700">
          <Keyboard className="w-3.5 h-3.5 text-[#E8450F]" />
          <span>Press <kbd className="font-mono bg-white dark:bg-slate-900 px-1 py-0.2 border rounded text-slate-700 dark:text-slate-300 font-bold">D</kbd> Driver, <kbd className="font-mono bg-white dark:bg-slate-900 px-1 py-0.2 border rounded text-slate-700 dark:text-slate-300 font-bold">V</kbd> Vehicle, <kbd className="font-mono bg-white dark:bg-slate-900 px-1 py-0.2 border rounded text-slate-700 dark:text-slate-300 font-bold">L</kbd> Defer, <kbd className="font-mono bg-white dark:bg-slate-900 px-1 py-0.2 border rounded text-slate-700 dark:text-slate-300 font-bold">↵</kbd> Next</span>
        </div>
      </div>

      {/* Required Vehicle Type & Rate Category Card */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30 space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-[#E8450F]" /> Required Vehicle Specification &amp; Category <span className="text-rose-500">*</span>
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
        />
      </div>

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
              className="text-[11px] font-bold text-[#E8450F] hover:underline flex items-center gap-1 cursor-pointer"
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
              className="text-[11px] font-bold text-[#E8450F] hover:underline flex items-center gap-1 cursor-pointer"
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
    </div>
  );
}


