import React from 'react';
import { Info, AlertCircle } from 'lucide-react';
import { Vehicle } from '@/services/vehicleService';
import { VehicleCompatibilityRule } from '@/utils/vehicleCompatibilityRegistry';

interface VehicleCompatibilityBadgeProps {
  contractVehicleType: string;
  masterVehicle: string;
  vehicles: Vehicle[];
  activeCompatibilityRule: VehicleCompatibilityRule | null;
  getVehicleTypeFromCapacity: (capacityKg: number) => string;
}

export const VehicleCompatibilityBadge: React.FC<VehicleCompatibilityBadgeProps> = ({
  contractVehicleType,
  masterVehicle,
  vehicles,
  activeCompatibilityRule,
  getVehicleTypeFromCapacity,
}) => {
  const selVeh = vehicles.find((v) => v.id === masterVehicle);
  const rule = activeCompatibilityRule;
  const isRuleConfigured = Boolean(rule && rule.allowedVehicleClassCodes.length > 0);

  if (!isRuleConfigured && contractVehicleType) {
    return (
      <div className="text-[11px] font-medium text-slate-500 bg-slate-50 dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800 flex items-center gap-1 mt-1">
        <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span>Vehicle compatibility not configured — all fleet vehicles available</span>
      </div>
    );
  }

  if (selVeh && contractVehicleType && rule) {
    const actualClass = selVeh.asset_type || getVehicleTypeFromCapacity(selVeh.capacity_kg ?? 0);
    const isPreferred = rule.preferredVehicleClassCodes.some(
      (c) => c.toLowerCase() === actualClass.toLowerCase()
    );
    const isAllowed = rule.allowedVehicleClassCodes.some(
      (c) => c.toLowerCase() === actualClass.toLowerCase()
    );

    if (isAllowed && !isPreferred) {
      return (
        <div className="text-[11px] font-semibold text-sky-800 bg-sky-50 dark:bg-sky-950/40 px-2.5 py-1 rounded-lg border border-sky-200 dark:border-sky-900 flex items-center gap-1.5 mt-1">
          <Info className="w-3.5 h-3.5 text-sky-600 shrink-0" />
          <span>{contractVehicleType} service · {actualClass} vehicle (Allowed alternative)</span>
        </div>
      );
    }

    if (!isAllowed) {
      return (
        <div className="text-[11px] font-bold text-amber-800 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-300 dark:border-amber-900 flex items-center gap-1.5 mt-1">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>{actualClass} vehicle is outside configured compatibility for {contractVehicleType} service</span>
        </div>
      );
    }
  }

  return null;
};

export default VehicleCompatibilityBadge;
