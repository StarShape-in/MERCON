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
  AlertTriangle, UserCheck, Wrench, Maximize2, Minimize2, Navigation, Award, Edit2, Gauge
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import DriverAvatar from '@/components/ui/DriverAvatar';

type SlotId = 'A1' | 'A2' | 'A3' | 'A4' | 'A5' | 'A6' |
              'B1' | 'B2' | 'B3' | 'B4' | 'B5' | 'B6' |
              'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'C6';

interface CargoSlot {
  id: SlotId;
  status: 'empty' | 'loaded';
  weight?: string;
  shipmentId?: string;
  rawTripId?: string;
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
  customerName: string;
  cargoType: string;
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
  const assignedDriver = vehicle?.assignedDriver || (vehicle as any)?.driver;
  const driverFirstName = assignedDriver?.first_name || (assignedDriver?.name ? assignedDriver.name.split(' ')[0] : 'Abdul');
  const driverLastName = assignedDriver?.last_name || (assignedDriver?.name ? assignedDriver.name.split(' ').slice(1).join(' ') : 'Malik');
  const driverName = assignedDriver 
    ? `${assignedDriver.first_name || ''} ${assignedDriver.last_name || ''}`.trim() || assignedDriver.name || 'Abdul Malik'
    : 'Abdul Malik';
  const rawAvatarUrl = assignedDriver?.avatar_url || assignedDriver?.photo_url || assignedDriver?.image_url || (assignedDriver as any)?.avatar || null;
  const driverAvatar = rawAvatarUrl ? resolveFileUrl(rawAvatarUrl) : '/drivers/abdul_malik.jpg';
  const capacityFormatted = vehicle?.capacity_kg ? `${vehicle.capacity_kg / 1000} Ton` : '10 Ton';
  const tripRoute = vehicleStatus === 'OnTrip' || vehicleStatus === 'In Transit' || vehicleStatus === 'InTransit' ? 'Riyadh → Al Bahah' : 'Riyadh → Al Hasa';

  const [selectedSlot, setSelectedSlot] = useState<SlotId | null>(null);
  const [slots, setSlots] = useState<CargoSlot[]>(INITIAL_SLOTS);
  const [tripTab, setTripTab] = useState<'recent' | 'upcoming' | 'completed'>('recent');
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const getNorm = (status?: string) => (status || '').toLowerCase().replace(/[\s\-_]+/g, '');

  const formatText = (str?: string) => {
    if (!str) return '';
    return str
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, c => c.toUpperCase());
  };

  // Combine trips assigned directly to vehicle as well as assigned driver
  const rawTrips: any[] = (() => {
    if (!vehicle) return [];
    const vehicleTrips: any[] = vehicle.trips || [];
    const driverTrips: any[] = vehicle.assignedDriver?.trips || [];
    const combinedMap = new Map();
    for (const t of [...vehicleTrips, ...driverTrips]) {
      if (t && t.id && !combinedMap.has(t.id)) {
        combinedMap.set(t.id, t);
      }
    }
    return Array.from(combinedMap.values());
  })();

  useEffect(() => {
    if (!vehicle) return;

    // Find active / live / assigned / scheduled trips
    const activeTrips = rawTrips.filter((t: any) => {
      const norm = getNorm(t.status);
      return ['ontrip', 'intransit', 'loading', 'dispatched', 'scheduled', 'delayed', 'atpickup', 'atdelivery', 'draft', 'pending', 'created'].includes(norm);
    });

    setSlots(() => {
      const nextSlots = INITIAL_SLOTS.map(s => ({ ...s }));

      // 1. Center main slot B2 shows the primary active trip
      if (activeTrips.length > 0) {
        const primaryTrip = activeTrips[0];
        const b2Index = nextSlots.findIndex(s => s.id === 'B2');
        if (b2Index !== -1) {
          const tripIdLabel = primaryTrip.ref_id || (primaryTrip.id ? `TRP-${primaryTrip.id.slice(0, 6)}` : 'LIVE-TRIP');
          const tripWeight = primaryTrip.total_weight || primaryTrip.planned_capacity_kg 
            ? `${primaryTrip.total_weight || primaryTrip.planned_capacity_kg}kg` 
            : '1,000kg';

          nextSlots[b2Index] = {
            ...nextSlots[b2Index],
            status: 'loaded',
            shipmentId: tripIdLabel,
            rawTripId: primaryTrip.id,
            weight: tripWeight,
            color: 'green'
          };
        }
      }

      // 2. Additional active trips (if any) populate other slots
      let extraTripIdx = 1;
      for (let i = 0; i < nextSlots.length; i++) {
        if (nextSlots[i].id === 'B2') continue;

        if (extraTripIdx < activeTrips.length) {
          const extraTrip = activeTrips[extraTripIdx];
          const tripIdLabel = extraTrip.ref_id || (extraTrip.id ? `TRP-${extraTrip.id.slice(0, 6)}` : `TRP-${extraTripIdx + 1}`);
          const tripWeight = extraTrip.total_weight || extraTrip.planned_capacity_kg 
            ? `${extraTrip.total_weight || extraTrip.planned_capacity_kg}kg` 
            : '500kg';

          nextSlots[i] = {
            ...nextSlots[i],
            status: 'loaded',
            shipmentId: tripIdLabel,
            rawTripId: extraTrip.id,
            weight: tripWeight,
            color: 'blue'
          };
          extraTripIdx++;
        }
      }

      return nextSlots;
    });
  }, [vehicle]);

  const mapTripToDisplay = (t: any): VehicleTripDisplay => {
    let routeStr = '—';
    if (t.stops && t.stops.length >= 2) {
      const origin = formatText(t.stops[0]?.location_name || t.stops[0]?.city || 'Riyadh');
      const dest = formatText(t.stops[t.stops.length - 1]?.location_name || t.stops[t.stops.length - 1]?.city || 'Al Bahah');
      routeStr = `${origin} → ${dest}`;
    } else if (t.stops && t.stops.length === 1) {
      routeStr = formatText(t.stops[0]?.location_name || t.stops[0]?.city || 'Riyadh');
    } else if (t.origin_city || t.destination_city) {
      const origin = formatText(t.origin_city || 'Riyadh');
      const dest = formatText(t.destination_city || 'Al Bahah');
      routeStr = `${origin} → ${dest}`;
    } else if (t.origin || t.destination) {
      const origin = formatText(t.origin || 'Riyadh');
      const dest = formatText(t.destination || 'Al Bahah');
      routeStr = `${origin} → ${dest}`;
    } else {
      routeStr = 'Riyadh → Al Bahah';
    }

    const rawWeight = t.total_weight || t.planned_capacity_kg || t.cargo_weight || vehicle?.capacity_kg;
    const weightStr = rawWeight 
      ? `${Number(rawWeight).toLocaleString()} Kg` 
      : '10,000 Kg';

    const customerName = t.customer?.company_name || t.customer?.name || t.customer_name || 'Aprodac';
    const rawType = t.cargo_type || t.rate_category || t.billing_type || t.line_type || 'Single Trip';
    const cargoType = formatText(rawType);

    return {
      id: t.ref_id || (t.id ? `TRP-${t.id.slice(0, 6)}` : 'TRP-001'),
      rawId: t.id,
      status: t.status || 'Scheduled',
      route: routeStr,
      customerName,
      cargoType,
      totalWeight: weightStr,
    };
  };

  const allVehicleTrips: VehicleTripDisplay[] = rawTrips.map(mapTripToDisplay);

  const recentTripsList = allVehicleTrips.filter(t => {
    const norm = getNorm(t.status);
    return ['intransit', 'ontrip', 'loading', 'dispatched', 'atpickup', 'atdelivery', 'delayed'].includes(norm);
  });

  const upcomingTripsList = allVehicleTrips.filter(t => {
    const norm = getNorm(t.status);
    return ['scheduled', 'draft', 'pending', 'created'].includes(norm);
  });

  const completedTripsList = allVehicleTrips.filter(t => {
    const norm = getNorm(t.status);
    return ['completed', 'invoiced', 'delivered'].includes(norm);
  });

  const activeDataset = tripTab === 'recent'
    ? recentTripsList
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
        item.cargoType.toLowerCase().includes(q) ||
        item.customerName.toLowerCase().includes(q) ||
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
          <Button 
            onClick={() => navigate(`/vehicles/${vehicle?.id || id}/edit`)}
            className="font-bold bg-[#3E3C3D] hover:bg-slate-900 text-white gap-2 h-9 text-xs shadow-xs rounded-xl px-4 transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
            Edit
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
                <DriverAvatar
                  src={driverAvatar}
                  firstName={driverFirstName}
                  lastName={driverLastName}
                  size="md"
                  className="w-10 h-10 border border-slate-200 shadow-2xs shrink-0"
                />
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
              
              {/* Single Seamless Telemetry HUD Overlay (Contains Odometer Dial & System Health inside Trailer) */}
              <div className="absolute top-[11.2%] left-[28.4%] w-[67.2%] h-[47.8%] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl p-3 border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col justify-between overflow-hidden">
                
                {/* Header Row inside Trailer HUD */}
                <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-[#FA634E]" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Vehicle Telemetry & Service Health
                    </span>
                  </div>
                  <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 px-2 py-0.5 rounded-full">
                    Operational (Healthy)
                  </span>
                </div>

                {/* Middle Row: 3 Telemetry Indicators Side-by-Side */}
                <div className="grid grid-cols-12 gap-2.5 items-center flex-1 my-1">
                  
                  {/* 1. Odometer Gauge Dial (Col-span-5) */}
                  <div className="col-span-5 flex items-center gap-2 bg-slate-50/90 dark:bg-slate-950/60 p-2 rounded-xl border border-slate-100 dark:border-slate-800/80">
                    <div className="relative w-12 h-12 sm:w-14 sm:h-14 shrink-0 flex items-center justify-center">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <path stroke="currentColor" strokeWidth="3" className="text-slate-200 dark:text-slate-800" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <path stroke="#FA634E" strokeWidth="3" strokeDasharray="84, 100" strokeLinecap="round" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <Gauge className="w-3.5 h-3.5 text-[#FA634E]" />
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider">Odometer</p>
                      <p className="text-xs sm:text-sm font-black text-slate-900 dark:text-white leading-tight truncate">
                        {vehicle?.current_odometer ? `${vehicle.current_odometer.toLocaleString()} km` : '7,944,500 km'}
                      </p>
                      <p className="text-[8.5px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 truncate">Due in 8,500 km</p>
                    </div>
                  </div>

                  {/* 2. Engine Oil Arc Gauge (Col-span-3.5) */}
                  <div className="col-span-3.5 sm:col-span-3.5 flex items-center gap-2 bg-slate-50/90 dark:bg-slate-950/60 p-2 rounded-xl border border-slate-100 dark:border-slate-800/80">
                    <div className="relative w-10 h-10 shrink-0">
                      <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                        <path stroke="currentColor" strokeWidth="3.5" className="text-slate-200 dark:text-slate-800" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <path stroke="#10B981" strokeWidth="3.5" strokeDasharray="78, 100" strokeLinecap="round" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-slate-900 dark:text-white">78%</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider">Engine Oil</p>
                      <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 leading-none mt-0.5">Optimal</p>
                    </div>
                  </div>

                  {/* 3. Brake Wear Arc Gauge (Col-span-3.5) */}
                  <div className="col-span-3.5 sm:col-span-3.5 flex items-center gap-2 bg-slate-50/90 dark:bg-slate-950/60 p-2 rounded-xl border border-slate-100 dark:border-slate-800/80">
                    <div className="relative w-10 h-10 shrink-0">
                      <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                        <path stroke="currentColor" strokeWidth="3.5" className="text-slate-200 dark:text-slate-800" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <path stroke="#10B981" strokeWidth="3.5" strokeDasharray="92, 100" strokeLinecap="round" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-slate-900 dark:text-white">92%</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider">Brake Wear</p>
                      <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 leading-none mt-0.5">Good</p>
                    </div>
                  </div>

                </div>

                {/* Bottom Service Progress Timeline Strip */}
                <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 text-[10px]">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="font-bold text-slate-400 uppercase tracking-wider text-[8.5px] shrink-0">Service Log:</span>
                    <div className="flex-1 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden flex">
                      <div className="h-full bg-emerald-500 w-[70%]" title="70% Service Health"></div>
                      <div className="h-full bg-amber-500 w-[30%]" title="30% Scheduled Interval"></div>
                    </div>
                    <span className="font-extrabold text-slate-700 dark:text-slate-300 shrink-0 text-[8.5px]">Last: 12 Aug 2026</span>
                  </div>
                  <span className="font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full text-[8.5px] shrink-0">
                    Tires 32 PSI
                  </span>
                </div>

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

            {/* Fixed 3-Column Data Cards / Blank Boxes Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1 min-h-0 overflow-y-auto pr-0.5">
              {(() => {
                const displayed = getDisplayedData().slice(0, 3);
                return Array.from({ length: 3 }).map((_, index) => {
                  const item = displayed[index];
                  if (!item) {
                    return (
                      <div 
                        key={`blank-box-${index}`} 
                        className="border border-dashed border-slate-200/90 bg-white/40 rounded-2xl p-4 flex flex-col items-center justify-center text-center min-h-[105px] gap-1.5 transition-all hover:bg-slate-50/50"
                      >
                        <div className="w-9 h-9 rounded-full bg-slate-50/90 flex items-center justify-center border border-slate-100 shadow-2xs">
                          <Truck className="w-4 h-4 text-slate-400 stroke-[1.5]" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-600">No Trip Assigned</p>
                          <p className="text-[10px] font-medium text-slate-400">Blank Slot</p>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div 
                      key={item.id} 
                      onClick={() => item.rawId && navigate(`/trips/${item.rawId}`)}
                      className={`border rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between bg-white shadow-2xs transition-all ${
                        item.rawId ? 'cursor-pointer hover:border-slate-300 hover:shadow-xs' : ''
                      } ${
                        index === 0 && tripTab === 'recent' 
                          ? 'border-emerald-200 bg-emerald-50/20 ring-1 ring-emerald-200/50' 
                          : 'border-slate-200/90'
                      }`}
                    >
                      {/* Card Header: Ref ID & Status */}
                      <div className="flex justify-between items-center pb-2 border-b border-slate-100/90">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className="w-5 h-5 rounded-md bg-slate-100 flex items-center justify-center border border-slate-200/80 shrink-0">
                            <MapPin className="w-3 h-3 text-slate-500" />
                          </div>
                          <span className="font-black text-xs text-slate-900 truncate tracking-tight">{item.id}</span>
                          {index === 0 && tripTab === 'recent' && (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[9px] font-bold px-1.5 py-0 rounded-full shadow-none shrink-0">
                              Latest
                            </Badge>
                          )}
                        </div>
                        <div className="shrink-0">
                          {renderTripCardBadge(item.status)}
                        </div>
                      </div>

                      {/* Route Bar */}
                      <div className="py-2 flex items-center justify-between gap-2 border-b border-slate-100/60">
                        <div className="min-w-0 flex-1">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-0.5">Route</p>
                          <p className="text-xs font-black text-slate-900 truncate leading-tight">{item.route}</p>
                        </div>
                      </div>

                      {/* 3-Column Key Data Metrics */}
                      <div className="grid grid-cols-3 gap-2 pt-2 text-[10px]">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-400 truncate">Customer</p>
                          <p className="font-bold text-slate-800 truncate" title={item.customerName}>{item.customerName}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-400 truncate">Cargo Type</p>
                          <p className="font-bold text-slate-800 truncate" title={item.cargoType}>{item.cargoType}</p>
                        </div>
                        <div className="min-w-0 text-right">
                          <p className="font-semibold text-slate-400 truncate">Weight</p>
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
