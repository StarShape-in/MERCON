import React from 'react';
import { UserCheck } from 'lucide-react';

export interface RecentDriverItem {
  driverId: string;
  driverObj: any;
  vehicleObj: any;
  count: number;
  lastUsedDate: Date;
  formattedLastUsed: string;
}

interface RecentDriverAcceleratorsProps {
  recentDriversList: RecentDriverItem[];
  masterDriver: string;
  originName?: string;
  destinationName?: string;
  contractVehicleType?: string;
  onApplyRecentDriver: (item: RecentDriverItem) => void;
  getVehicleTypeFromCapacity: (capacityKg?: number | null) => string;
  DriverAvatar: React.ComponentType<any>;
}

export const RecentDriverAccelerators: React.FC<RecentDriverAcceleratorsProps> = ({
  recentDriversList,
  masterDriver,
  originName = 'ORIGIN',
  destinationName = 'DESTINATION',
  contractVehicleType = '',
  onApplyRecentDriver,
  getVehicleTypeFromCapacity,
  DriverAvatar,
}) => {
  if (!recentDriversList || recentDriversList.length === 0) return null;

  return (
    <div className="p-2.5 rounded-xl bg-[#EEF1F6]/70 border border-slate-200/90 space-y-1.5 animate-fade-in mb-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-extrabold text-[#3E3C3D] uppercase tracking-wider flex items-center gap-1.5">
          <UserCheck className="w-3.5 h-3.5 text-[#FA634E]" />
          RECENT DRIVERS FOR {originName.toUpperCase()} → {destinationName.toUpperCase()}
        </span>
        <span className="text-[10px] font-bold text-[#6E6E80]">Click to select driver & suggested vehicle</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {recentDriversList.map((item) => {
          const isSelected = masterDriver === item.driverId;
          const dObj = item.driverObj;
          const vObj = item.vehicleObj;
          const vehClass = vObj ? (vObj.asset_type || getVehicleTypeFromCapacity(vObj.capacity_kg) || contractVehicleType) : contractVehicleType;
          const plate = vObj?.plate_number || 'ESA-4244';

          return (
            <button
              key={item.driverId}
              type="button"
              onClick={() => onApplyRecentDriver(item)}
              className={`p-2 rounded-xl border text-left transition-all flex items-center gap-2.5 cursor-pointer shadow-2xs ${
                isSelected
                  ? 'bg-orange-50/80 border-[#FA634E] ring-1 ring-[#FA634E]/30'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
              }`}
            >
              <DriverAvatar
                src={dObj?.avatar_url || dObj?.photo_url || dObj?.profile_photo}
                firstName={dObj?.first_name || 'Driver'}
                lastName={dObj?.last_name || ''}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-extrabold text-[#3E3C3D] truncate">
                  {dObj?.first_name} {dObj?.last_name}
                </p>
                <p className="text-[10px] font-bold text-[#6E6E80] truncate">
                  {plate} · {vehClass}
                </p>
                <p className="text-[9px] font-semibold text-slate-400 truncate">
                  Used {item.count} {item.count === 1 ? 'time' : 'times'} · {item.formattedLastUsed}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default RecentDriverAccelerators;
