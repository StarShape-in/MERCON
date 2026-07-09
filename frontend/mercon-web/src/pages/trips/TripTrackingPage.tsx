import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Navigation, NavigationOff, ShieldCheck } from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import Btn from '@/components/ui/Btn';
import StatusBadge from '@/components/ui/StatusBadge';
import { tripService } from '@/services/tripService';

export default function TripTrackingPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: trip, isLoading, refetch } = useQuery({
    queryKey: ['trip-track', id],
    queryFn: () => tripService.getById(id!),
    enabled: !!id,
  });

  if (isLoading || !trip) {
    return (
      <DashboardLayout active="Trips" title="Live Tracking">
        <div className="p-8 flex items-center justify-center">
          <div className="h-8 w-8 border-2 border-[#E8450F] border-t-transparent rounded-full animate-spin"></div>
        </div>
      </DashboardLayout>
    );
  }

  // Lat/Lng centers
  const pickup = trip.stops?.find(s => s.stop_type === 'Pickup');
  const dropoff = trip.stops?.find(s => s.stop_type === 'Dropoff');

  const latCenter = pickup ? pickup.location_lat : 24.7136;
  const lngCenter = pickup ? pickup.location_lng : 46.6753;

  return (
    <DashboardLayout 
      active="Trips" 
      title="Live Tracking" 
      breadcrumb={`Trips / ${trip.ref_id || 'Track'}`}
      pageTitle="Live GPS Tracking"
      actions={
        <div className="flex gap-2">
          <Btn 
            label="Back" 
            variant="secondary" 
            size="sm" 
            icon={<ArrowLeft size={13} />} 
            onClick={() => navigate(`/trips/${id}`)} 
          />
          <Btn 
            label="Poll Status" 
            variant="secondary" 
            size="sm" 
            icon={<RefreshCw size={13} />} 
            onClick={() => refetch()} 
          />
        </div>
      }
    >
      <div className="px-6 pb-6 grid grid-cols-1 lg:grid-cols-3 gap-5 h-[calc(100vh-170px)] animate-fade-in">
        
        {/* Mock Map panel */}
        <div className="lg:col-span-2 bg-[#EBEBED] rounded-[24px] border border-black/[0.06] shadow-sm relative overflow-hidden flex flex-col justify-between p-5 min-h-[300px]">
          {/* Mock Map Background Grid */}
          <div className="absolute inset-0 bg-white bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-70" />
          
          {/* Simulated Route Line */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <path 
              d="M 150 150 Q 300 200 450 350" 
              fill="none" 
              stroke="#E8450F" 
              strokeWidth="4" 
              strokeDasharray="8,6" 
              className="opacity-70 animate-pulse"
            />
          </svg>

          {/* GPS Pin 1 (Pickup) */}
          <div className="absolute left-[150px] top-[150px] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center select-none z-10">
            <div className="bg-[#E8450F] text-white p-1.5 rounded-full shadow-lg">
              <Navigation size={14} className="rotate-45" />
            </div>
            <span className="text-[10px] font-bold bg-[#1C1C2E] text-white px-2 py-0.5 rounded shadow mt-1">
              Pickup (Riyadh)
            </span>
          </div>

          {/* GPS Pin 2 (Dropoff) */}
          <div className="absolute left-[450px] top-[350px] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center select-none z-10">
            <div className="bg-[#16A34A] text-white p-1.5 rounded-full shadow-lg">
              <Navigation size={14} className="rotate-180" />
            </div>
            <span className="text-[10px] font-bold bg-[#1C1C2E] text-white px-2 py-0.5 rounded shadow mt-1">
              Jeddah Port
            </span>
          </div>

          {/* Map Overlay Controls */}
          <div className="relative z-10 flex justify-between items-start w-full">
            <div className="bg-white/95 backdrop-blur px-3 py-2 rounded-xl shadow-sm border border-black/[0.06] flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-ping" />
              <span className="text-[10px] font-bold text-[#111]">Active GPS Signal</span>
            </div>
            
            <div className="bg-[#1C1C2E] text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-md flex items-center gap-2">
              <ShieldCheck size={14} className="text-green-400" />
              <span>Secure Route Protocol Enforced</span>
            </div>
          </div>

          <div className="relative z-10 mt-auto bg-white/95 backdrop-blur p-4 rounded-2xl shadow-md border border-black/[0.06] flex items-center justify-between max-w-sm">
            <div>
              <p className="text-[9px] text-[#6E6E80] uppercase font-bold tracking-wider">Current GPS Coords</p>
              <p className="text-xs font-mono font-bold text-[#111] mt-0.5">{latCenter.toFixed(5)}, {lngCenter.toFixed(5)}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] text-[#6E6E80] uppercase font-bold tracking-wider">Speed</p>
              <p className="text-xs font-bold text-[#111] mt-0.5">85 km/h</p>
            </div>
          </div>
        </div>

        {/* Tracking info panel */}
        <div className="bg-white rounded-[24px] border border-black/[0.06] p-5 shadow-sm space-y-5 flex flex-col justify-between h-full">
          <div>
            <div className="border-b border-black/[0.04] pb-4 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-[#6E6E80] font-bold uppercase tracking-wider">Active Trip</span>
                <StatusBadge status={trip.status} />
              </div>
              <p className="text-base font-bold text-[#111] mt-1">{trip.ref_id}</p>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-[9px] text-[#6E6E80] uppercase font-bold tracking-wider">Driver Profile</p>
                {trip.driver ? (
                  <p className="text-xs font-semibold text-[#111] mt-0.5">
                    {trip.driver.first_name} {trip.driver.last_name} ({trip.driver.phone_primary})
                  </p>
                ) : (
                  <p className="text-xs text-red-500 font-semibold mt-0.5">Driver Not Assigned</p>
                )}
              </div>

              <div>
                <p className="text-[9px] text-[#6E6E80] uppercase font-bold tracking-wider">Vehicle Details</p>
                {trip.vehicle ? (
                  <p className="text-xs font-semibold text-[#111] mt-0.5">
                    {trip.vehicle.plate_number} ({trip.vehicle.asset_type})
                  </p>
                ) : (
                  <p className="text-xs text-red-500 font-semibold mt-0.5">Vehicle Not Assigned</p>
                )}
              </div>

              <div>
                <p className="text-[9px] text-[#6E6E80] uppercase font-bold tracking-wider">Cargo Type</p>
                <p className="text-xs font-semibold text-[#111] mt-0.5">{trip.cargo_type}</p>
              </div>

              {pickup && dropoff && (
                <div>
                  <p className="text-[9px] text-[#6E6E80] uppercase font-bold tracking-wider">Stops Sequence</p>
                  <div className="mt-2 space-y-3 pl-3 border-l-2 border-[#F5F5F7]">
                    <div className="text-xs">
                      <p className="font-bold text-[#111]">1. Pickup Location</p>
                      <p className="text-[10px] text-gray-500 font-medium">Planned: {pickup.planned_arrival ? new Date(pickup.planned_arrival).toLocaleTimeString() : '—'}</p>
                    </div>
                    <div className="text-xs">
                      <p className="font-bold text-[#111]">2. Dropoff Destination</p>
                      <p className="text-[10px] text-gray-500 font-medium">Planned: {dropoff.planned_arrival ? new Date(dropoff.planned_arrival).toLocaleTimeString() : '—'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-black/[0.04] pt-4">
            <div className="bg-[#FFF0EB] border border-[#E8450F]/10 p-3 rounded-xl flex items-start gap-2.5">
              <Navigation size={16} className="text-[#E8450F] shrink-0 mt-0.5 stroke-[2.2]" />
              <div>
                <p className="text-xs font-bold text-[#E8450F]">Telemetry Auto-Syncing</p>
                <p className="text-[10px] text-[#E8450F]/80 mt-0.5">Live positioning data points update automatically every 10 seconds.</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
