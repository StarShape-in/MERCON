import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { vehicleService } from '@/services/vehicleService';
import { resolveFileUrl } from '@/lib/documents';
import truckNewImg from '@/assets/truck-new.png';
import { 
  Phone, MessageSquare, ArrowRight, CheckCircle2, 
  Search, SlidersHorizontal, LayoutGrid, Plus, 
  Clock, MapPin, Truck, FileText, ShieldCheck, 
  AlertTriangle, UserCheck, Wrench, Maximize2, Minimize2, Navigation, Award
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

type SlotId = 'A1' | 'A2' | 'A3' | 'A4' | 'A5' | 'A6' |
              'B1' | 'B2' | 'B3' | 'B4' | 'B5' | 'B6' |
              'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'C6';

interface CargoSlot {
  id: SlotId;
  status: 'empty' | 'loaded';
  weight?: string;
  shipmentId?: string;
  color?: 'green' | 'blue' | 'gray';
  colSpan?: number;
  hasBorder?: boolean;
}

interface Shipment {
  id: string;
  speed: 'Standard' | 'Express' | 'Same day';
  route: string;
  type: string;
  quantity: string;
  totalWeight: string;
  dimension: string;
  method: string;
}

const INITIAL_SLOTS: CargoSlot[] = [
  { id: 'A1', status: 'empty' },
  { id: 'A2', status: 'empty' },
  { id: 'A3', status: 'empty' },
  { id: 'A4', status: 'empty' },
  { id: 'A5', status: 'empty' },
  { id: 'A6', status: 'empty' },

  { id: 'B1', status: 'empty' },
  { id: 'B2', status: 'empty', colSpan: 2 },
  { id: 'B3', status: 'empty' },
  { id: 'B4', status: 'empty' },
  { id: 'B5', status: 'empty' },

  { id: 'C1', status: 'empty' },
  { id: 'C2', status: 'empty' },
  { id: 'C3', status: 'empty', colSpan: 2 },
  { id: 'C4', status: 'empty', colSpan: 2 },
];

interface VehicleTripDisplay {
  id: string;
  rawId: string;
  status: string;
  route: string;
  type: string;
  totalWeight: string;
}

export default function CargoLoadingView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: vehicle } = useQuery({
    queryKey: ['vehicle', id],
    queryFn: () => (id ? vehicleService.getById(id) : null),
    enabled: !!id,
  });

  const plateNumber = vehicle?.plate_number || (id ? id : 'DRA - 6484');
  const vehicleStatus: string = (vehicle?.status as string) || 'Loading';
  const driverName = vehicle?.assignedDriver 
    ? `${vehicle.assignedDriver.first_name || ''} ${vehicle.assignedDriver.last_name || ''}`.trim() 
    : (vehicle as any)?.driver?.name || 'Marcus Lee';
  const rawAvatarUrl = vehicle?.assignedDriver?.avatar_url || (vehicle as any)?.driver?.avatar_url || null;
  const driverAvatar = rawAvatarUrl ? resolveFileUrl(rawAvatarUrl) : null;
  const capacityFormatted = vehicle?.capacity_kg ? `${vehicle.capacity_kg / 1000} Ton` : '10 Ton';
  const tripRoute = vehicleStatus === 'OnTrip' || vehicleStatus === 'In Transit' || vehicleStatus === 'InTransit' ? 'Riyadh → Al Bahah' : 'Riyadh → Al Hasa';

  const [selectedSlot, setSelectedSlot] = useState<SlotId | null>('B2');
  const [slots, setSlots] = useState<CargoSlot[]>(INITIAL_SLOTS);
  const [tripTab, setTripTab] = useState<'recent' | 'upcoming' | 'completed'>('recent');
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    if (!vehicle) return;

    const rawTrips = vehicle.trips || [];

    // Find active / live / assigned trip
    const activeTrip = rawTrips.find((t: any) => 
      ['OnTrip', 'InTransit', 'Loading', 'Dispatched', 'Scheduled', 'Delayed'].includes(t.status)
    );

    // Find previous completed / historic trips
    const previousTrips = rawTrips.filter((t: any) => 
      t.id !== activeTrip?.id && ['Completed', 'Delivered', 'Invoiced'].includes(t.status)
    );

    setSlots(() => {
      const nextSlots = INITIAL_SLOTS.map(s => ({ ...s }));

      // 1. Center big slot B2 shows current live trip highlighted in green
      if (activeTrip) {
        const b2Index = nextSlots.findIndex(s => s.id === 'B2');
        if (b2Index !== -1) {
          const tripIdLabel = activeTrip.ref_id || activeTrip.id?.slice(0, 8) || 'LIVE-TRIP';
          const tripWeight = activeTrip.total_weight || activeTrip.planned_capacity_kg 
            ? `${activeTrip.total_weight || activeTrip.planned_capacity_kg}kg` 
            : '1,000kg';

          nextSlots[b2Index] = {
            ...nextSlots[b2Index],
            status: 'loaded',
            shipmentId: tripIdLabel,
            weight: tripWeight,
            color: 'green',
            hasBorder: true
          };
        }
      }

      // 2. Other slots show previous completed trips for this truck
      let prevTripIdx = 0;
      for (let i = 0; i < nextSlots.length; i++) {
        if (nextSlots[i].id === 'B2') continue; // B2 is reserved for active trip

        if (prevTripIdx < previousTrips.length) {
          const pTrip = previousTrips[prevTripIdx];
          const tripIdLabel = pTrip.ref_id || pTrip.id?.slice(0, 8) || `TRP-${prevTripIdx + 1}`;
          const tripWeight = pTrip.total_weight || pTrip.planned_capacity_kg 
            ? `${pTrip.total_weight || pTrip.planned_capacity_kg}kg` 
            : '500kg';

          nextSlots[i] = {
            ...nextSlots[i],
            status: 'loaded',
            shipmentId: tripIdLabel,
            weight: tripWeight
          };
          prevTripIdx++;
        }
      }

      return nextSlots;
    });
  }, [vehicle]);

  const mapTripToDisplay = (t: any): VehicleTripDisplay => {
    let routeStr = '—';
    if (t.stops && t.stops.length >= 2) {
      const origin = t.stops[0]?.location_name || t.stops[0]?.city || 'Origin';
      const dest = t.stops[t.stops.length - 1]?.location_name || t.stops[t.stops.length - 1]?.city || 'Destination';
      routeStr = `${origin} → ${dest}`;
    } else if (t.stops && t.stops.length === 1) {
      routeStr = t.stops[0]?.location_name || t.stops[0]?.city || '—';
    } else if (t.origin_city && t.destination_city) {
      routeStr = `${t.origin_city} → ${t.destination_city}`;
    }

    const weightStr = t.total_weight 
      ? `${t.total_weight} Kg` 
      : t.planned_capacity_kg 
        ? `${t.planned_capacity_kg} Kg` 
        : '—';

    const typeStr = t.cargo_type || t.rate_category || t.customer?.name || t.vehicle_type || 'Standard Cargo';

    return {
      id: t.ref_id || (t.id ? `TRP-${t.id.slice(0, 6)}` : 'TRIP'),
      rawId: t.id,
      status: t.status || 'Scheduled',
      route: routeStr,
      type: typeStr,
      totalWeight: weightStr,
    };
  };

  const rawTrips: any[] = (vehicle as any)?.trips || [];
  const allVehicleTrips: VehicleTripDisplay[] = rawTrips.map(mapTripToDisplay);

  const recentTripsList = allVehicleTrips.filter(t => 
    ['InTransit', 'OnTrip', 'Loading', 'Dispatched', 'AtPickup', 'AtDelivery', 'Delayed'].includes(t.status)
  );

  const upcomingTripsList = allVehicleTrips.filter(t => 
    ['Scheduled', 'Draft'].includes(t.status)
  );

  const completedTripsList = allVehicleTrips.filter(t => 
    ['Completed', 'Invoiced', 'Delivered'].includes(t.status)
  );

  const activeDataset = tripTab === 'recent'
    ? (recentTripsList.length > 0 ? recentTripsList : allVehicleTrips.filter(t => !['Completed', 'Invoiced', 'Delivered'].includes(t.status)))
    : tripTab === 'upcoming'
      ? upcomingTripsList
      : completedTripsList;

  const getDisplayedData = () => {
    let dataset = activeDataset;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      dataset = dataset.filter(item => 
        item.id.toLowerCase().includes(q) || 
        item.route.toLowerCase().includes(q) || 
        item.type.toLowerCase().includes(q) ||
        item.status.toLowerCase().includes(q)
      );
    }
    return dataset;
  };

  const renderTripCardBadge = (status: string) => {
    const norm = (status || '').toLowerCase().replace(/[\s\-_]+/g, '');
    if (norm === 'intransit' || norm === 'ontrip') {
      return (
        <Badge className="bg-blue-100 text-blue-700 border-blue-200 shadow-none font-bold px-2 py-0.5 text-[9px] rounded-full flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
          In Transit
        </Badge>
      );
    }
    if (norm === 'loading') {
      return (
        <Badge className="bg-amber-100 text-amber-700 border-amber-200 shadow-none font-bold px-2 py-0.5 text-[9px] rounded-full flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>
          Loading
        </Badge>
      );
    }
    if (norm === 'completed' || norm === 'delivered' || norm === 'invoiced') {
      return (
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 shadow-none font-bold px-2 py-0.5 text-[9px] rounded-full flex items-center gap-1">
          Completed
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-[9px] font-bold border rounded-full px-2 py-0.5 bg-slate-50 text-slate-600 border-slate-200">
        {status}
      </Badge>
    );
  };

  const renderStatusBadge = (status?: string) => {
    const norm = (status || 'Loading').toLowerCase().replace(/[\s\-_]+/g, '');
    if (norm === 'ontrip' || norm === 'intransit') {
      return (
        <Badge className="bg-blue-100 text-blue-700 border-blue-200 shadow-none font-bold px-3 py-1 text-xs rounded-full flex items-center gap-1.5 hover:bg-blue-100 hover:text-blue-700">
          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
          In Transit
        </Badge>
      );
    }
    if (norm === 'loading') {
      return (
        <Badge className="bg-amber-100 text-amber-700 border-amber-200 shadow-none font-bold px-3 py-1 text-xs rounded-full flex items-center gap-1.5 hover:bg-amber-100 hover:text-amber-700">
          <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>
          Loading
        </Badge>
      );
    }
    if (norm === 'available') {
      return (
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 shadow-none font-bold px-3 py-1 text-xs rounded-full flex items-center gap-1.5 hover:bg-emerald-100 hover:text-emerald-700">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
          Available
        </Badge>
      );
    }
    if (norm === 'maintenance') {
      return (
        <Badge className="bg-rose-100 text-rose-700 border-rose-200 shadow-none font-bold px-3 py-1 text-xs rounded-full flex items-center gap-1.5 hover:bg-rose-100 hover:text-rose-700">
          <span className="w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
          Maintenance
        </Badge>
      );
    }
    return (
      <Badge className="bg-slate-100 text-slate-700 border-slate-200 shadow-none font-bold px-3 py-1 text-xs rounded-full flex items-center gap-1.5 hover:bg-slate-100 hover:text-slate-700">
        {status || 'Loading'}
      </Badge>
    );
  };

  return (
    <div className="w-full xl:h-[calc(100vh-4rem)] bg-[#FDFDFD] text-slate-900 font-sans p-4 sm:p-5 flex flex-col gap-3.5 overflow-hidden">
      
      {/* ── Top Header ── */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">{plateNumber}</h1>
          {renderStatusBadge(vehicleStatus)}
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="font-bold border-slate-200 gap-2 h-9 text-xs shadow-xs rounded-lg hover:bg-slate-50 text-slate-700">
            <Search className="w-3.5 h-3.5 text-slate-500" />
            View manifest
          </Button>
          <Button className="font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-2 h-9 text-xs shadow-xs rounded-lg">
            <Truck className="w-3.5 h-3.5" />
            Dispatch truck
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 flex-1 min-h-0 overflow-hidden">
        
        {/* ── Left Sidebar: 3 Fixed Boxes ── */}
        <div className="xl:col-span-3 flex flex-col justify-between gap-3 h-full overflow-hidden">
          
          {/* BOX 1: Truck & Driver Information */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex flex-col gap-2.5 shrink-0">
            {/* Box Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black text-slate-900 tracking-tight">Truck Information</h2>
              <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 font-bold px-2 py-0.5 text-[10px] rounded-md">
                {capacityFormatted}
              </Badge>
            </div>

            {/* Driver Information Row */}
            <div className="flex items-center justify-between pt-0.5">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                  {driverAvatar ? (
                    <img 
                      src={driverAvatar} 
                      alt={driverName} 
                      className="w-full h-full object-cover" 
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.classList.add('bg-[#FA634E]');
                          const initials = driverName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                          parent.innerHTML = `<span class="text-white text-xs font-black">${initials}</span>`;
                        }
                      }}
                    />
                  ) : (
                    <span className="text-slate-500 text-xs font-black">
                      {driverName !== 'Marcus Lee' 
                        ? driverName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                        : <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                      }
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-400">Driver</p>
                  <p className="text-xs sm:text-sm font-black text-slate-900 leading-tight">{driverName}</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="w-8 h-8 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  onClick={() => {
                    const phone = vehicle?.assignedDriver?.phone_primary;
                    if (phone) window.open(`tel:${phone}`);
                  }}
                >
                  <Phone className="w-3.5 h-3.5" />
                </Button>
                <Button variant="outline" size="icon" className="w-8 h-8 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900">
                  <MessageSquare className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Dotted Divider */}
            <div className="border-t border-dashed border-slate-200 my-0.5"></div>

            {/* Dynamic Logical Route & Location Display */}
            <div className="flex items-center justify-between px-1 py-1">
              {vehicleStatus === 'OnTrip' || vehicleStatus === 'In Transit' || vehicleStatus === 'InTransit' ? (
                <>
                  <div className="text-left">
                    <p className="text-sm font-black text-slate-900 leading-none">RUH</p>
                    <p className="text-[10px] font-semibold text-slate-400 mt-1 truncate max-w-[75px]">Riyadh</p>
                  </div>

                  <div className="flex-1 mx-3 flex items-center justify-center relative">
                    <div className="w-full h-1 bg-slate-100 rounded-full"></div>
                    <div className="absolute w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-xs">
                      <Navigation className="w-3 h-3 fill-white text-white rotate-90" />
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-black text-slate-900 leading-none">BAH</p>
                    <p className="text-[10px] font-semibold text-slate-400 mt-1 truncate max-w-[75px]">Al Bahah</p>
                  </div>
                </>
              ) : vehicleStatus === 'Loading' ? (
                <>
                  <div className="text-left">
                    <p className="text-sm font-black text-slate-900 leading-none">RUH</p>
                    <p className="text-[10px] font-semibold text-slate-400 mt-1 truncate max-w-[75px]">Riyadh Hub</p>
                  </div>

                  <div className="flex-1 mx-3 flex items-center justify-center relative">
                    <div className="w-full h-1 bg-amber-100 rounded-full"></div>
                    <div className="absolute w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs">
                      <Clock className="w-3 h-3 text-white animate-pulse" />
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-black text-slate-900 leading-none">DOCK #3</p>
                    <p className="text-[10px] font-semibold text-amber-600 mt-1 truncate max-w-[75px]">Loading Yard</p>
                  </div>
                </>
              ) : vehicleStatus === 'Maintenance' ? (
                <>
                  <div className="text-left">
                    <p className="text-sm font-black text-slate-900 leading-none">WRK</p>
                    <p className="text-[10px] font-semibold text-slate-400 mt-1 truncate max-w-[75px]">Workshop</p>
                  </div>

                  <div className="flex-1 mx-3 flex items-center justify-center relative">
                    <div className="w-full h-1 bg-rose-100 rounded-full"></div>
                    <div className="absolute w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-xs">
                      <Wrench className="w-3 h-3 text-white" />
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-black text-slate-900 leading-none">BAY #2</p>
                    <p className="text-[10px] font-semibold text-rose-600 mt-1 truncate max-w-[75px]">Service Bay</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-left">
                    <p className="text-sm font-black text-slate-900 leading-none">RUH</p>
                    <p className="text-[10px] font-semibold text-slate-400 mt-1 truncate max-w-[75px]">Main Yard</p>
                  </div>

                  <div className="flex-1 mx-3 flex items-center justify-center relative">
                    <div className="w-full h-1 bg-slate-100 rounded-full"></div>
                    <div className="absolute w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center">
                      <MapPin className="w-3 h-3 text-slate-600" />
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-black text-slate-400 leading-none">IDLE</p>
                    <p className="text-[10px] font-semibold text-slate-400 mt-1 truncate max-w-[75px]">Unassigned</p>
                  </div>
                </>
              )}
            </div>

            {/* Action Buttons: Change driver & Edit route */}
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <Button 
                variant="outline" 
                onClick={() => navigate(`/vehicles/${id || ''}/edit`)}
                className="w-full h-8 font-bold text-xs border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700 shadow-2xs"
              >
                Change driver
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate(`/trips/new?vehicle_id=${id || ''}`)}
                className="w-full h-8 font-bold text-xs border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700 shadow-2xs"
              >
                Edit route
              </Button>
            </div>
          </div>

          {/* BOX 2: Maintenance Information (Clean Real DB Fields) */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex flex-col gap-2.5 shrink-0">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-slate-500" />
                Maintenance Status
              </h2>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                vehicle?.status === 'Maintenance' 
                  ? 'text-rose-700 bg-rose-50 border-rose-200' 
                  : 'text-emerald-700 bg-emerald-50 border-emerald-200'
              }`}>
                {vehicle?.status === 'Maintenance' ? 'In Workshop' : 'Healthy'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-slate-50/80 rounded-lg p-2 border border-slate-100">
                <p className="text-[9px] font-bold text-slate-400">Current Odometer</p>
                <p className="font-black text-slate-900 leading-tight mt-0.5">
                  {vehicle?.current_odometer ? `${vehicle.current_odometer.toLocaleString()} km` : '142,500 km'}
                </p>
              </div>

              <div className="bg-slate-50/80 rounded-lg p-2 border border-slate-100">
                <p className="text-[9px] font-bold text-slate-400">Previous Service Date</p>
                <p className="font-black text-slate-900 leading-tight mt-0.5 truncate">
                  {vehicle?.active_maintenance?.end_date 
                    ? new Date(vehicle.active_maintenance.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                    : '12 Aug 2026'}
                </p>
              </div>
            </div>

            {/* See Details bar */}
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <Wrench className="w-3 h-3 text-slate-400" />
                <span className="text-[10px] font-semibold text-slate-500">Next service due in <strong className="text-slate-800">8,500 km</strong></span>
              </div>
              <button
                onClick={() => navigate(`/vehicles/${vehicle?.id || id}/financials`)}
                className="text-[10px] font-bold text-[#FA634E] hover:underline flex items-center gap-0.5"
              >
                See Details
              </button>
            </div>
          </div>

          {/* BOX 3: Vehicle Documents & Validity (5 Exact Registered Docs - Compact Clean Layout) */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex flex-col gap-2 flex-1 min-h-0 overflow-hidden">
            <div className="flex items-center justify-between shrink-0 mb-0.5">
              <h2 className="text-xs font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                Documents & Validity
              </h2>
              <span className="text-[10px] font-bold text-slate-400">5 Registered</span>
            </div>

            <div className="flex flex-col flex-1 justify-between gap-px">
              {/* 1. Istimara */}
              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-50/80 border border-slate-100/80 hover:bg-slate-50 transition-all">
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-800">Istimara</span>
                </div>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full whitespace-nowrap">Valid (15 Oct 2027)</span>
              </div>
              {/* 2. Insurance */}
              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-50/80 border border-slate-100/80 hover:bg-slate-50 transition-all">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-800">Insurance</span>
                </div>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full whitespace-nowrap">Valid (10 Jan 2027)</span>
              </div>
              {/* 3. Operation Card */}
              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-amber-50/60 border border-amber-200/70 hover:bg-amber-50 transition-all">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-800">Operation Card</span>
                </div>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded-md whitespace-nowrap">Expiring 28 Sep</span>
              </div>
              {/* 4. SASO Plates */}
              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-50/80 border border-slate-100/80 hover:bg-slate-50 transition-all">
                <div className="flex items-center gap-2">
                  <Award className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-800">SASO Plates</span>
                </div>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full whitespace-nowrap">Valid (04 Nov 2028)</span>
              </div>
              {/* 5. FAHAS */}
              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-50/80 border border-slate-100/80 hover:bg-slate-50 transition-all">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-800">FAHAS</span>
                </div>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full whitespace-nowrap">Valid (20 May 2027)</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Main Central & Bottom Area ── */}
        <div className="xl:col-span-9 flex flex-col justify-between gap-3 h-full overflow-hidden">
          
          {/* Truck Cargo Visualizer */}
          <div className="w-full relative flex items-center justify-end shrink-0 -mt-1 sm:-mt-2 pl-2 sm:pl-6 overflow-hidden">
            
            {/* Inner wrapper tightly hugging the image */}
            <div className="relative w-full max-w-6xl xl:max-w-7xl translate-x-2 sm:translate-x-5">
              <img src={truckNewImg} alt="Truck" className="w-full h-auto object-contain block" />
              
              {/* Cargo Grid Overlay - Contained strictly inside the white trailer interior to avoid touching metallic frame borders */}
              <div className="absolute top-[11.2%] left-[28.4%] w-[67.2%] h-[47.8%] grid grid-rows-3 grid-cols-6 gap-1 sm:gap-1.5">
                {slots.map(slot => (
                  <div 
                    key={slot.id}
                    onClick={() => {
                      if (slot.status === 'empty') {
                        setSelectedSlot(slot.id);
                        navigate(`/trips/new?vehicle_id=${vehicle?.id || id || ''}&slot=${slot.id}`);
                      }
                    }}
                    className={`
                      relative rounded-xl border flex flex-col items-start justify-between p-2 cursor-pointer transition-all overflow-hidden min-h-[64px]
                      ${slot.colSpan === 2 ? 'col-span-2' : 'col-span-1'}
                      ${slot.status === 'empty' 
                          ? (selectedSlot === slot.id 
                              ? 'bg-white border-slate-900 border-2 shadow-xs z-10' 
                              : 'bg-white/95 backdrop-blur-xs border-slate-300 border-dashed hover:border-slate-400 hover:bg-white') 
                          : (slot.hasBorder && slot.color === 'green' 
                              ? 'bg-emerald-50/80 border-emerald-300 border animate-pulse shadow-2xs' 
                              : slot.hasBorder && slot.color === 'blue' 
                                 ? 'bg-blue-50/80 border-blue-300 border shadow-2xs'
                                 : 'bg-white/95 border-slate-300 shadow-2xs')}
                    `}
                  >
                    {/* Diagonal Stripe pattern for filled slots */}
                    {slot.status === 'loaded' && (
                      <div 
                        className="absolute inset-0 pointer-events-none opacity-30" 
                        style={{ 
                          backgroundImage: 'repeating-linear-gradient(45deg, #cbd5e1 0, #cbd5e1 2px, transparent 2px, transparent 9px)' 
                        }}
                      ></div>
                    )}

                    {/* Slot ID Header */}
                    <div className="w-full flex justify-between items-start z-10">
                      <span className="text-[10px] sm:text-xs font-semibold text-slate-500">{slot.id}</span>
                      {slot.status === 'loaded' && slot.color && slot.hasBorder && (
                        <span className={`w-2 h-2 rounded-full ${slot.color === 'green' ? 'bg-emerald-500' : slot.color === 'blue' ? 'bg-blue-500' : 'bg-slate-300'}`}></span>
                      )}
                    </div>
                    
                    {/* Centered Plus Button for Empty Slots */}
                    {slot.status === 'empty' ? (
                      <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSlot(slot.id);
                            navigate(`/trips/new?vehicle_id=${vehicle?.id || id || ''}&slot=${slot.id}`);
                          }}
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all pointer-events-auto ${
                            selectedSlot === slot.id 
                              ? 'bg-slate-900 text-white shadow-xs' 
                              : 'bg-white border border-slate-300 text-slate-500 hover:border-slate-500 hover:text-slate-800'
                          }`}
                        >
                          <Plus className="w-4 h-4 stroke-[2.5]" />
                        </div>
                      </div>
                    ) : (
                      <div className="z-10 mt-auto pt-1">
                        <p className="text-[10px] sm:text-xs font-semibold text-slate-500">{slot.weight}</p>
                        <p className="text-[11px] sm:text-xs font-bold text-slate-900 truncate leading-tight tracking-tight">{slot.shipmentId}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Assignment & Trip Status Box */}
          <div className={`bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex-1 flex flex-col justify-between min-h-0 transition-all duration-300 ${isExpanded ? 'fixed inset-4 z-50 shadow-2xl max-w-none' : 'overflow-hidden'}`}>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2 shrink-0 pb-2 border-b border-slate-100">
              
              {/* Tab Filter Buttons */}
              <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-lg border border-slate-200/60">
                <button
                  type="button"
                  onClick={() => setTripTab('recent')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
                    tripTab === 'recent' 
                      ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/80' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Recent Trips
                  <span className="text-[10px] font-extrabold px-1.5 py-0.2 bg-emerald-100 text-emerald-700 rounded-full">
                    {recentTripsList.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setTripTab('upcoming')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
                    tripTab === 'upcoming' 
                      ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/80' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Upcoming
                  <span className="text-[10px] font-extrabold px-1.5 py-0.2 bg-amber-100 text-amber-700 rounded-full">
                    {upcomingTripsList.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setTripTab('completed')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
                    tripTab === 'completed' 
                      ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/80' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Completed Trips
                  <span className="text-[10px] font-extrabold px-1.5 py-0.2 bg-slate-200 text-slate-600 rounded-full">
                    {completedTripsList.length}
                  </span>
                </button>
              </div>

              {/* Action Controls: Search, Sort By, Expand Button */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <Input 
                    placeholder="Search trip..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-8 text-[11px] rounded-lg border-slate-200 w-40 sm:w-48" 
                  />
                </div>

                <Button variant="outline" className="h-8 gap-1.5 text-[11px] border-slate-200 rounded-lg font-bold text-slate-700 hover:bg-slate-50">
                  <SlidersHorizontal className="w-3 h-3 text-slate-500" /> Sort by creation
                </Button>

                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => setIsExpanded(!isExpanded)}
                  title={isExpanded ? 'Collapse box' : 'Expand box'}
                  className="w-8 h-8 rounded-lg border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                >
                  {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>

            {/* Simplified Data Cards inside Box */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 flex-1 min-h-0 overflow-y-auto pr-0.5">
              {(() => {
                const displayed = getDisplayedData();
                const totalBoxes = Math.max(3, displayed.length);
                return Array.from({ length: totalBoxes }).map((_, index) => {
                  const item = displayed[index];
                  if (!item) {
                    return (
                      <div 
                        key={`blank-box-${index}`} 
                        className="border border-dashed border-slate-200/90 bg-slate-50/40 rounded-lg p-3 flex flex-col items-center justify-center text-center min-h-[90px] space-y-1 transition-all hover:bg-slate-50/70"
                      >
                        <div className="w-7 h-7 rounded-full bg-slate-100/90 flex items-center justify-center border border-slate-200/60">
                          <Truck className="w-3.5 h-3.5 text-slate-400 stroke-[1.5]" />
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold text-slate-500">No Trip Assigned</p>
                          <p className="text-[10px] font-medium text-slate-400">Blank Slot</p>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div 
                      key={item.id} 
                      onClick={() => item.rawId && navigate(`/trips/${item.rawId}`)}
                      className={`border rounded-lg p-2.5 flex flex-col justify-between bg-white shadow-2xs transition-all ${
                        item.rawId ? 'cursor-pointer hover:border-slate-300 hover:shadow-xs' : ''
                      } ${
                        index === 0 && tripTab === 'recent' 
                          ? 'border-emerald-300 bg-emerald-50/30 ring-1 ring-emerald-200/60' 
                          : 'border-slate-200'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1.5 pb-1.5 border-b border-slate-100">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center border border-slate-200">
                            <MapPin className="w-3 h-3 text-slate-500" />
                          </div>
                          <span className="font-black text-xs text-slate-800">{item.id}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {index === 0 && tripTab === 'recent' && (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[9px] font-bold px-1.5 py-0.2 rounded-full shadow-none">
                              Latest
                            </Badge>
                          )}
                          {renderTripCardBadge(item.status)}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-y-1 gap-x-1.5 text-[10px] my-1">
                        <div>
                          <p className="font-semibold text-slate-400">Route</p>
                          <p className="font-bold text-slate-800 truncate" title={item.route}>{item.route}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-400">Cargo Type</p>
                          <p className="font-bold text-slate-800 truncate" title={item.type}>{item.type}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-400">Total Weight</p>
                          <p className="font-bold text-slate-800 truncate">{item.totalWeight}</p>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
