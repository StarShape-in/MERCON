import React from 'react';
import {
  CheckCircle2,
  Building2,
  User,
  Truck,
  Calendar,
  MapPin,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';

interface TripStep4SummaryProps {
  contractSlots: any[];
  contractCustomer: string;
  masterDriver: string;
  masterVehicle: string;
  assignmentType: 'own' | 'third_party';
  thirdPartyProviderId: string;
  thirdPartyDriverName: string;
  thirdPartyVehiclePlate: string;
  thirdPartyCost: string;
  contractBillingType: string;
  contractVehicleType: string;
  customers: any[];
  drivers: any[];
  vehicles: any[];
  thirdPartyProviders: any[];
  normalizeBillingType: (val: string) => string;
  getVehicleTypeFromCapacity: (cap?: number | null) => string;
  setPreviewCustomer: (c: any) => void;
  setPreviewDriver: (d: any) => void;
  setPreviewVehicle: (v: any) => void;
  DriverAvatar: React.ComponentType<any>;
  MapBoundsAdjuster: React.ComponentType<any>;
  pickupMarkerIcon: any;
  dropoffMarkerIcon: any;
}

export const TripStep4Summary: React.FC<TripStep4SummaryProps> = ({
  contractSlots,
  contractCustomer,
  masterDriver,
  masterVehicle,
  assignmentType,
  thirdPartyProviderId,
  thirdPartyDriverName,
  thirdPartyVehiclePlate,
  thirdPartyCost,
  contractBillingType,
  contractVehicleType,
  customers,
  drivers,
  vehicles,
  thirdPartyProviders,
  normalizeBillingType,
  getVehicleTypeFromCapacity,
  setPreviewCustomer,
  setPreviewDriver,
  setPreviewVehicle,
  DriverAvatar,
  MapBoundsAdjuster,
  pickupMarkerIcon,
  dropoffMarkerIcon,
}) => {
  const customerObj = customers.find((c) => c.id === contractCustomer);
  const driverObj = drivers.find((d) => d.id === masterDriver);
  const vehicleObj = vehicles.find((v) => v.id === masterVehicle);
  const providerObj = thirdPartyProviders.find((p) => p.id === thirdPartyProviderId);

  const isMonthly = normalizeBillingType(contractBillingType) === 'Monthly';
  const baseBillingSum = contractSlots.reduce((sum, s) => sum + (Number(s.billingAmount) || 0), 0);
  const additionalChargesSum = contractSlots.reduce((sum, s) => {
    return sum + (s.intermediateStopFees || []).reduce((a: number, f: any) => a + (Number(f) || 0), 0);
  }, 0);
  const totalAmountSum = baseBillingSum + additionalChargesSum;

  const totalTripCharges = contractSlots.reduce((sum, s) => {
    if (assignmentType === 'third_party') {
      return sum + (thirdPartyCost ? Number(thirdPartyCost) : (Number(s.tripCharges) || 0));
    }
    return sum + (Number(s.tripCharges) || 0);
  }, 0);

  const contractualBalance = totalAmountSum - totalTripCharges;
  const marginPct = totalAmountSum > 0 ? (contractualBalance / totalAmountSum) * 100 : 0;

  return (
    <div className="space-y-3.5 animate-fade-in text-[#3E3C3D]">
      {/* Step Header */}
      <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2">
        <div>
          <h4 className="text-base font-bold text-[#3E3C3D] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#FA634E]" />
            REVIEW & CONFIRM
          </h4>
          <p className="text-xs font-semibold text-[#6E6E80]">
            {contractSlots.length} Trip{contractSlots.length > 1 ? 's' : ''} Ready to Create
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT COLUMN (~68%): OPERATIONAL TRIP REVIEW */}
        <div className="lg:col-span-8 space-y-3.5">
          {/* 1. TRIP OVERVIEW (CUSTOMER | DRIVER | VEHICLE) */}
          <div className="p-3 rounded-xl bg-white border border-[#E5E7EB] shadow-2xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center divide-y sm:divide-y-0 sm:divide-x divide-[#E5E7EB]">
              {/* CUSTOMER */}
              <div className="flex items-center gap-2.5 min-w-0 pr-1">
                {customerObj?.logo_url || customerObj?.avatar_url || customerObj?.image_url ? (
                  <img
                    src={customerObj.logo_url || customerObj.avatar_url || customerObj.image_url}
                    alt={customerObj.name}
                    className="w-9 h-9 rounded-full object-cover border border-[#E5E7EB] shadow-2xs shrink-0"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-[#FA634E] text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                    {customerObj?.name ? customerObj.name.substring(0, 2).toUpperCase() : 'CU'}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-extrabold text-[#6E6E80] uppercase tracking-wider block">CUSTOMER</span>
                    {customerObj && (
                      <button
                        type="button"
                        onClick={() => setPreviewCustomer(customerObj)}
                        className="text-[#6E6E80] hover:text-[#FA634E] cursor-pointer"
                        title="View Customer Profile"
                      >
                        <User className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  {customerObj ? (
                    <button
                      type="button"
                      onClick={() => setPreviewCustomer(customerObj)}
                      className="text-xs font-bold text-[#3E3C3D] hover:text-[#FA634E] hover:underline cursor-pointer block text-left truncate w-full"
                      title={customerObj.name}
                    >
                      {customerObj.name}
                    </button>
                  ) : (
                    <span className="text-xs font-bold text-[#3E3C3D] block truncate">Unassigned Customer</span>
                  )}
                </div>
              </div>

              {/* DRIVER */}
              <div className="flex items-center gap-2.5 min-w-0 sm:pl-3 pr-1 pt-2 sm:pt-0">
                {assignmentType === 'third_party' ? (
                  <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-700 font-extrabold flex items-center justify-center shrink-0 shadow-2xs border border-purple-200">
                    <Building2 className="w-4.5 h-4.5" />
                  </div>
                ) : (
                  <DriverAvatar
                    src={driverObj?.avatar_url || driverObj?.photo_url || driverObj?.profile_photo || driverObj?.image_url}
                    firstName={driverObj?.first_name}
                    lastName={driverObj?.last_name}
                    size="md"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-extrabold text-[#6E6E80] uppercase tracking-wider block">
                      {assignmentType === 'third_party' ? '3PL DRIVER' : 'DRIVER'}
                    </span>
                    {driverObj && assignmentType !== 'third_party' && (
                      <button
                        type="button"
                        onClick={() => setPreviewDriver(driverObj)}
                        className="text-[#6E6E80] hover:text-[#FA634E] cursor-pointer"
                        title="View Driver Profile"
                      >
                        <User className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  {assignmentType === 'third_party' ? (
                    <span className="text-xs font-bold text-[#3E3C3D] block truncate" title={`${providerObj?.name || '3PL Provider'} ${thirdPartyDriverName ? `(${thirdPartyDriverName})` : ''}`}>
                      {providerObj?.name || '3PL Provider'} {thirdPartyDriverName ? `(${thirdPartyDriverName})` : ''}
                    </span>
                  ) : driverObj ? (
                    <button
                      type="button"
                      onClick={() => setPreviewDriver(driverObj)}
                      className="text-xs font-bold text-[#3E3C3D] hover:text-[#FA634E] hover:underline cursor-pointer block text-left truncate w-full"
                      title={`${driverObj.first_name} ${driverObj.last_name}`}
                    >
                      {driverObj.first_name} {driverObj.last_name}
                    </button>
                  ) : (
                    <span className="text-xs font-bold text-[#3E3C3D] block truncate">Unassigned Driver</span>
                  )}
                  {(assignmentType === 'third_party' || (driverObj?.phone || driverObj?.phone_number || driverObj?.mobile)) && (
                    <span className="text-[10px] text-[#6E6E80] block font-medium truncate">
                      {assignmentType === 'third_party' ? 'Third-Party Logistics' : (driverObj?.phone || driverObj?.phone_number || driverObj?.mobile)}
                    </span>
                  )}
                </div>
              </div>

              {/* VEHICLE */}
              <div className="flex items-center gap-2.5 min-w-0 sm:pl-3 pt-2 sm:pt-0">
                <div className="w-9 h-9 rounded-full bg-amber-50 text-amber-600 font-extrabold flex items-center justify-center shrink-0 shadow-2xs border border-amber-200">
                  <Truck className="w-4.5 h-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-extrabold text-[#6E6E80] uppercase tracking-wider block">VEHICLE</span>
                    {vehicleObj && assignmentType !== 'third_party' && (
                      <button
                        type="button"
                        onClick={() => setPreviewVehicle(vehicleObj)}
                        className="text-[#6E6E80] hover:text-[#FA634E] cursor-pointer"
                        title="View Truck Profile"
                      >
                        <Truck className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  {assignmentType === 'third_party' ? (
                    <span className="text-xs font-bold text-[#3E3C3D] block truncate" title={thirdPartyVehiclePlate || '3PL Truck'}>
                      {thirdPartyVehiclePlate || '3PL Truck'}
                    </span>
                  ) : vehicleObj ? (
                    <button
                      type="button"
                      onClick={() => setPreviewVehicle(vehicleObj)}
                      className="text-xs font-bold text-[#3E3C3D] hover:text-[#FA634E] hover:underline cursor-pointer block text-left truncate w-full"
                      title={vehicleObj.plate_number}
                    >
                      {vehicleObj.plate_number}
                    </button>
                  ) : (
                    <span className="text-xs font-bold text-[#3E3C3D] block truncate">Unassigned Vehicle</span>
                  )}
                  <span className="text-[10px] text-[#6E6E80] block font-medium truncate">
                    {vehicleObj ? (vehicleObj.asset_type || getVehicleTypeFromCapacity(vehicleObj.capacity_kg) || contractVehicleType) : contractVehicleType}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. TRIP DETAILS (ROUTE TIMELINE + MAP) */}
          <div className="space-y-3">
            {contractSlots.map((slot, idx) => {
              const dateObj = slot.date ? new Date(slot.date) : new Date();
              const formattedDate = dateObj.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

              const points: [number, number][] = [];
              if (slot.originLat && slot.originLng) points.push([slot.originLat, slot.originLng]);
              if (slot.destinationLat && slot.destinationLng) points.push([slot.destinationLat, slot.destinationLng]);

              return (
                <div key={slot.id} className="p-3.5 rounded-xl border border-[#E5E7EB] bg-white shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#FA634E] shrink-0" />
                      <span className="text-sm font-bold text-[#3E3C3D]">TRIP {idx + 1} • {formattedDate}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                    <div className="md:col-span-7 space-y-2">
                      <div className="flex items-start gap-2.5">
                        <div className="w-3 h-3 rounded-full bg-[#10B981] ring-4 ring-emerald-100 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-xs font-bold text-[#3E3C3D]">
                            {slot.origin ? slot.origin.toUpperCase() : 'ORIGIN LOCATION'}
                          </div>
                          <div className="text-[11px] font-semibold text-[#6E6E80]">
                            Pickup • {slot.pickupTime || '08:00 AM'}
                          </div>
                        </div>
                      </div>

                      <div className="pl-1 flex items-center gap-2.5">
                        <div className="w-0.5 h-6 bg-dashed border-l border-slate-300" />
                        <span className="text-[11px] font-medium text-[#6E6E80] px-2 py-0.5 rounded bg-[#EEF1F6]">
                          892 km • ~11h 09m
                        </span>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <div className="w-3 h-3 rounded-full bg-[#FA634E] ring-4 ring-orange-100 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-xs font-bold text-[#3E3C3D]">
                            {slot.destination ? slot.destination.toUpperCase() : 'DESTINATION LOCATION'}
                          </div>
                          <div className="text-[11px] font-semibold text-[#6E6E80]">
                            Drop-off • {slot.dropoffTime || '07:09 PM'}
                            {slot.isOvernight && <span className="ml-1.5 text-[9px] font-extrabold text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded">+1 Day</span>}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-5 min-h-[160px] h-[160px]">
                      {points.length >= 2 ? (
                        <div className="w-full h-full min-h-[160px] h-[160px] rounded-xl overflow-hidden border border-[#E5E7EB] shadow-2xs relative bg-slate-50 z-0">
                          <MapContainer
                            center={points[0]}
                            zoom={10}
                            scrollWheelZoom={false}
                            zoomControl={false}
                            attributionControl={false}
                            style={{ height: '100%', width: '100%', zIndex: 0 }}
                          >
                            <TileLayer
                              attribution='&copy; OpenStreetMap &copy; Esri'
                              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            <TileLayer
                              url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                            />
                            <MapBoundsAdjuster points={points} />
                            {slot.originLat && slot.originLng && (
                              <Marker position={[slot.originLat, slot.originLng]} icon={pickupMarkerIcon} />
                            )}
                            {slot.destinationLat && slot.destinationLng && (
                              <Marker position={[slot.destinationLat, slot.destinationLng]} icon={dropoffMarkerIcon} />
                            )}
                            <Polyline
                              positions={points}
                              pathOptions={{ color: '#FA634E', weight: 3, opacity: 0.8 }}
                            />
                          </MapContainer>
                        </div>
                      ) : (
                        <div className="w-full h-full min-h-[160px] rounded-xl bg-slate-50 border border-dashed border-[#E5E7EB] flex flex-col items-center justify-center text-slate-400 gap-1 text-xs font-semibold">
                          <MapPin className="w-5 h-5 text-slate-300" />
                          Map Preview
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN (~32%): STICKY FINANCIAL STATEMENT PANEL */}
        <div className="lg:col-span-4 sticky top-4 space-y-3">
          <div className="p-4 rounded-xl bg-white border border-[#E5E7EB] shadow-sm space-y-3.5">
            <div className="border-b border-[#E5E7EB] pb-2">
              <span className="font-extrabold text-[#3E3C3D] tracking-wider uppercase text-xs block">
                FINANCIAL SUMMARY
              </span>
            </div>

            <div className="space-y-3 text-xs font-semibold">
              {isMonthly ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-[#6E6E80]">Monthly Contract</span>
                    <span className="font-bold font-mono text-[#3E3C3D] text-sm">SAR {baseBillingSum.toLocaleString()} / month</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#6E6E80]">Additional Charges</span>
                    </div>
                    <span className="font-bold font-mono text-[#3E3C3D]">+ SAR {additionalChargesSum.toLocaleString()}</span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-[#E5E7EB]">
                    <span className="text-[#6E6E80]">Driver Payout</span>
                    <span className="font-bold font-mono text-rose-600">- SAR {totalTripCharges.toLocaleString()} / trip</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-[#6E6E80]">Customer Revenue</span>
                    <span className="font-bold font-mono text-[#3E3C3D] text-sm">SAR {totalAmountSum.toLocaleString()}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#6E6E80]">Driver Payout / Expense</span>
                    <span className="font-bold font-mono text-rose-600">- SAR {totalTripCharges.toLocaleString()}</span>
                  </div>

                  <div className="pt-2 border-t border-[#E5E7EB] flex items-center justify-between">
                    <span className="text-[#3E3C3D] font-bold">Estimated Profit Margin</span>
                    <span className="font-extrabold font-mono text-emerald-600 text-sm">
                      SAR {contractualBalance.toLocaleString()} ({marginPct.toFixed(1)}%)
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TripStep4Summary;
