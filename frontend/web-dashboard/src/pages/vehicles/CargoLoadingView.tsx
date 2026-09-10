import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { vehicleService } from '@/services/vehicleService';
import { resolveFileUrl } from '@/lib/documents';
import truckNewImg from '@/assets/truck-new.png';
import { maintenanceService } from '@/services/maintenanceService';
import { 
  Phone, MessageSquare, ArrowRight, CheckCircle2, 
  Search, SlidersHorizontal, LayoutGrid, Plus, 
  Clock, MapPin, Truck, FileText, ShieldCheck, 
  AlertTriangle, UserCheck, Wrench, Maximize2, Minimize2, Navigation, Award, Edit2, Gauge,
  History, ExternalLink, Package, Radio
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

  const { data: maintenanceData } = useQuery({
    queryKey: ['vehicle-maintenance', id],
    queryFn: () => (id ? maintenanceService.getAll({ vehicle_id: id }) : null),
    enabled: !!id,
  });

  const serviceRecords = (maintenanceData?.data && maintenanceData.data.length > 0)
    ? maintenanceData.data.map(r => ({
        id: r.id,
        ref_id: r.ref_id || `MNT-${r.id.slice(0, 5).toUpperCase()}`,
        work_done: r.work_done || r.maintenance_type || 'General Service',
        workshop_name: r.workshop_name || 'Standard Workshop',
        service_date: r.service_date ? new Date(r.service_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
        odometer_reading: r.odometer_reading ? `${r.odometer_reading.toLocaleString()} km` : '142,500 km',
        cost: r.cost ? `SAR ${r.cost.toLocaleString()}` : 'SAR 1,450',
        status: r.status || 'Completed',
      }))
    : [
        {
          id: 'mnt-1',
          ref_id: 'MNT-048',
          work_done: 'Engine Oil & Filter Service (50k Interval)',
          workshop_name: 'Zahid Heavy Equipment Workshop',
          service_date: '12 Aug 2026',
          odometer_reading: '142,500 km',
          cost: 'SAR 1,450',
          status: 'Completed',
        },
        {
          id: 'mnt-2',
          ref_id: 'MNT-039',
          work_done: 'Brake Pad Replacement & Air System Check',
          workshop_name: 'Al-Refaei Truck Service Center',
          service_date: '25 Jun 2026',
          odometer_reading: '135,000 km',
          cost: 'SAR 2,200',
          status: 'Completed',
        },
        {
          id: 'mnt-3',
          ref_id: 'MNT-024',
          work_done: 'Front Axle Alignment & Tire Balancing',
          workshop_name: 'Main Fleet Workshop Riyadh',
          service_date: '10 Apr 2026',
          odometer_reading: '128,000 km',
          cost: 'SAR 850',
          status: 'Completed',
        },
      ];

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
  const [activeMilestoneId, setActiveMilestoneId] = useState<string>('mnt-1');

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
        
        {/* ── Left Sidebar: 2 Clean Balanced Cards ── */}
        <div className="xl:col-span-3 flex flex-col gap-3 h-full overflow-hidden">
          
          {/* BOX 1: Truck & Driver Information (Semantic Logical Colors) */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex flex-col gap-3.5 shrink-0">
            {/* Box Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-slate-700" />
                Truck Information
              </h2>
              <span className="text-[10px] font-mono font-black text-slate-800 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-md shadow-2xs">
                {plateNumber}
              </span>
            </div>

            {/* Driver Information Row */}
            <div className="flex items-center justify-between bg-slate-50/70 p-3 rounded-xl border border-slate-200/80">
              <div className="flex items-center gap-2.5">
                <DriverAvatar
                  src={driverAvatar}
                  firstName={driverFirstName}
                  lastName={driverLastName}
                  size="md"
                  className="w-10 h-10 border-2 border-white shadow-2xs shrink-0 rounded-full ring-1 ring-slate-200"
                />
                <div>
                  <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Driver</p>
                  <p className="text-xs sm:text-sm font-black text-slate-900 leading-tight">{driverName}</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="w-8 h-8 rounded-lg border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 shadow-2xs"
                  onClick={() => {
                    const phone = vehicle?.assignedDriver?.phone_primary;
                    if (phone) window.open(`tel:${phone}`);
                  }}
                >
                  <Phone className="w-3.5 h-3.5 text-slate-600" />
                </Button>
                <Button variant="outline" size="icon" className="w-8 h-8 rounded-lg border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 shadow-2xs">
                  <MessageSquare className="w-3.5 h-3.5 text-slate-600" />
                </Button>
              </div>
            </div>

            {/* Real ERP Vehicle Specifications Grid (Clean Logical Semantic Styling) */}
            <div className="grid grid-cols-2 gap-2.5 text-[11px]">
              {/* Card 1: Plate & Ref ID (Neutral Specification) */}
              <div className="bg-slate-50/60 p-2.5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Plate & Ref ID</p>
                  <div className="w-5 h-5 rounded-md bg-slate-100 text-slate-600 border border-slate-200/80 flex items-center justify-center">
                    <FileText className="w-3 h-3" />
                  </div>
                </div>
                <p className="font-mono font-black text-slate-900 leading-tight text-xs">
                  {plateNumber}
                </p>
                <p className="text-[9.5px] font-mono font-semibold text-slate-500 truncate mt-0.5">
                  Ref: {vehicle?.ref_id || 'TRK-128'}
                </p>
              </div>

              {/* Card 2: Asset & Capacity (Neutral Specification) */}
              <div className="bg-slate-50/60 p-2.5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Asset & Capacity</p>
                  <div className="w-5 h-5 rounded-md bg-slate-100 text-slate-600 border border-slate-200/80 flex items-center justify-center">
                    <Package className="w-3 h-3" />
                  </div>
                </div>
                <p className="font-black text-slate-900 leading-tight text-xs">
                  {vehicle?.asset_type || 'Box'} Truck
                </p>
                <div className="mt-0.5">
                  <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-700 border border-slate-200/80">
                    Cap: {capacityFormatted}
                  </span>
                </div>
              </div>

              {/* Card 3: Driver Contact (Neutral Specification) */}
              <div className="bg-slate-50/60 p-2.5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Driver Contact</p>
                  <div className="w-5 h-5 rounded-md bg-slate-100 text-slate-600 border border-slate-200/80 flex items-center justify-center">
                    <Phone className="w-3 h-3" />
                  </div>
                </div>
                <p className="font-mono font-black text-slate-900 leading-tight text-xs truncate">
                  {assignedDriver?.phone_primary || assignedDriver?.phone || '+966 50 123 4567'}
                </p>
                <p className="text-[9.5px] font-semibold text-slate-500 truncate mt-0.5">
                  {assignedDriver ? 'Assigned Phone' : 'Primary Contact'}
                </p>
              </div>

              {/* Card 4: Telematics & GPS (Semantic Green for Live Active Status) */}
              <div className="bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-200/60 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[9px] font-extrabold text-emerald-800 uppercase tracking-wider">Telematics & GPS</p>
                  <div className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center">
                    <Radio className="w-3 h-3 animate-pulse" />
                  </div>
                </div>
                <p className="font-mono font-bold text-emerald-950 leading-tight text-xs flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  {vehicle?.gps_device_id ? `GPS: ${vehicle.gps_device_id}` : 'GPS: Active'}
                </p>
                <p className="text-[9.5px] font-mono font-semibold text-emerald-700/80 truncate mt-0.5">
                  {vehicle?.icces_device_id ? `ICCES: ${vehicle.icces_device_id}` : 'ICCES: Connected'}
                </p>
              </div>
            </div>

            {/* Dotted Divider */}
            <div className="border-t border-dashed border-slate-200 my-0.5"></div>

            {/* Dynamic Logical Route & Location Display */}
            <div className="flex items-center justify-between p-2.5 px-3 bg-slate-50/70 rounded-xl border border-slate-200/80">
              {vehicleStatus === 'OnTrip' || vehicleStatus === 'In Transit' || vehicleStatus === 'InTransit' ? (
                <>
                  <div className="text-left">
                    <p className="text-xs font-black text-slate-900 leading-none">RUH</p>
                    <p className="text-[10px] font-semibold text-slate-400 mt-1 truncate max-w-[75px]">Riyadh</p>
                  </div>

                  <div className="flex-1 mx-3 flex items-center justify-center relative">
                    <div className="w-full h-1 bg-emerald-200 rounded-full"></div>
                    <div className="absolute w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs ring-2 ring-white">
                      <Navigation className="w-3 h-3 fill-white text-white rotate-90" />
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-xs font-black text-slate-900 leading-none">BAH</p>
                    <p className="text-[10px] font-semibold text-slate-400 mt-1 truncate max-w-[75px]">Al Bahah</p>
                  </div>
                </>
              ) : vehicleStatus === 'Loading' ? (
                <>
                  <div className="text-left">
                    <p className="text-xs font-black text-slate-900 leading-none">RUH</p>
                    <p className="text-[10px] font-semibold text-slate-400 mt-1 truncate max-w-[75px]">Riyadh Hub</p>
                  </div>

                  <div className="flex-1 mx-3 flex items-center justify-center relative">
                    <div className="w-full h-1 bg-amber-200 rounded-full"></div>
                    <div className="absolute w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs ring-2 ring-white">
                      <Clock className="w-3 h-3 text-white animate-pulse" />
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-xs font-black text-slate-900 leading-none">DOCK #3</p>
                    <p className="text-[10px] font-semibold text-amber-600 mt-1 truncate max-w-[75px]">Loading Yard</p>
                  </div>
                </>
              ) : vehicleStatus === 'Maintenance' ? (
                <>
                  <div className="text-left">
                    <p className="text-xs font-black text-slate-900 leading-none">WRK</p>
                    <p className="text-[10px] font-semibold text-slate-400 mt-1 truncate max-w-[75px]">Workshop</p>
                  </div>

                  <div className="flex-1 mx-3 flex items-center justify-center relative">
                    <div className="w-full h-1 bg-rose-200 rounded-full"></div>
                    <div className="absolute w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-xs ring-2 ring-white">
                      <Wrench className="w-3 h-3 text-white" />
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-xs font-black text-slate-900 leading-none">BAY #2</p>
                    <p className="text-[10px] font-semibold text-rose-600 mt-1 truncate max-w-[75px]">Service Bay</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-left">
                    <p className="text-xs font-black text-slate-900 leading-none">RUH</p>
                    <p className="text-[10px] font-semibold text-slate-400 mt-1 truncate max-w-[75px]">Main Yard</p>
                  </div>

                  <div className="flex-1 mx-3 flex items-center justify-center relative">
                    <div className="w-full h-1 bg-slate-200 rounded-full"></div>
                    <div className="absolute w-6 h-6 rounded-full bg-slate-300 text-slate-700 flex items-center justify-center shadow-2xs ring-2 ring-white">
                      <MapPin className="w-3 h-3 text-slate-700" />
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-xs font-black text-slate-400 leading-none">IDLE</p>
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
                className="w-full h-8.5 font-bold text-xs border-slate-200 rounded-xl hover:bg-slate-100 text-slate-800 shadow-2xs bg-white hover:border-slate-300 transition-all"
              >
                Change driver
              </Button>
              <Button 
                onClick={() => navigate(`/trips/new?vehicle_id=${id || ''}`)}
                className="w-full h-8.5 font-bold text-xs bg-[#FA634E] hover:bg-[#e0533e] text-white rounded-xl shadow-xs border border-transparent transition-all flex items-center justify-center gap-1.5"
              >
                <span>Edit route</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* BOX 2: Vehicle Documents & Validity (Contiguous Evenly-Spaced List + Horizontal More Details Button) */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex flex-col justify-between flex-1 min-h-0 overflow-hidden">
            <div className="flex items-center justify-between shrink-0 mb-1.5">
              <h2 className="text-xs font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                Documents & Validity
              </h2>
              <span className="text-[10px] font-bold text-slate-400">5 Registered</span>
            </div>

            {/* Contiguous document list expanding evenly across available height */}
            <div className="flex flex-col flex-1 min-h-0 my-1 rounded-lg border border-slate-200/80 divide-y divide-slate-100 overflow-hidden">
              {/* 1. Istimara */}
              <div className="flex items-center justify-between px-3 py-2 flex-1 bg-slate-50/60 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-800">Istimara</span>
                </div>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full whitespace-nowrap">Valid (15 Oct 2027)</span>
              </div>
              {/* 2. Insurance */}
              <div className="flex items-center justify-between px-3 py-2 flex-1 bg-slate-50/60 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-800">Insurance</span>
                </div>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full whitespace-nowrap">Valid (10 Jan 2027)</span>
              </div>
              {/* 3. Operation Card */}
              <div className="flex items-center justify-between px-3 py-2 flex-1 bg-amber-50/40 hover:bg-amber-50/70 transition-colors">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-800">Operation Card</span>
                </div>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded-md whitespace-nowrap">Expiring 28 Sep</span>
              </div>
              {/* 4. SASO Plates */}
              <div className="flex items-center justify-between px-3 py-2 flex-1 bg-slate-50/60 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-2">
                  <Award className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-800">SASO Plates</span>
                </div>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full whitespace-nowrap">Valid (04 Nov 2028)</span>
              </div>
              {/* 5. FAHAS */}
              <div className="flex items-center justify-between px-3 py-2 flex-1 bg-slate-50/60 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-800">FAHAS</span>
                </div>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full whitespace-nowrap">Valid (20 May 2027)</span>
              </div>
            </div>

            {/* Horizontal More Details Button at bottom */}
            <Button
              variant="outline"
              onClick={() => navigate(`/vehicles/${vehicle?.id || id}/documents`)}
              className="w-full h-8 font-bold text-xs border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700 shadow-2xs shrink-0 mt-1.5 justify-center gap-1.5"
            >
              <span>More Details</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </Button>
          </div>
        </div>

        {/* ── Main Central & Bottom Area ── */}
        <div className="xl:col-span-9 flex flex-col justify-between gap-3 h-full overflow-hidden">
          
          {/* Truck Cargo Visualizer */}
          <div className="w-full relative flex items-center justify-end shrink-0 -mt-1 sm:-mt-2 pl-2 sm:pl-6 overflow-hidden">
            
            {/* Inner wrapper tightly hugging the image */}
            <div className="relative w-full max-w-6xl xl:max-w-7xl translate-x-2 sm:translate-x-5">
              <img src={truckNewImg} alt="Truck" className="w-full h-auto object-contain block" />
              
              {/* Single Seamless Vehicle Service History HUD Overlay inside Trailer */}
              <div className="absolute top-[11.2%] left-[28.4%] w-[67.2%] h-[47.8%] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl p-3 sm:p-3.5 border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col justify-between overflow-hidden">
                
                <div className="grid grid-cols-12 gap-3 h-full items-stretch overflow-hidden">
                  
                  {/* ── LEFT SIDE: Rolling Counter Odometer Drum Wheels (Col-span-5) ── */}
                  <div className="col-span-5 bg-slate-50/90 dark:bg-slate-950/60 rounded-xl p-3 flex flex-col justify-between border border-slate-200/80 dark:border-slate-800 shrink-0">
                    
                    {/* Header: Icon + ODOMETER + Active Pill */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 shadow-2xs">
                          <Gauge className="w-3 h-3 text-slate-700 dark:text-slate-300" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                          ODOMETER
                        </span>
                      </div>

                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200/80 font-extrabold px-2.5 py-0.5 text-[10px] rounded-full shadow-none flex items-center gap-1.5 hover:bg-emerald-50">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                        Active
                      </Badge>
                    </div>

                    {/* Mechanical Rolling Counter Drum Wheels */}
                    <div className="my-auto py-1">
                      <div className="inline-flex items-center gap-1">
                        <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-950 p-1.5 rounded-xl border border-slate-800 shadow-inner">
                          {(() => {
                            const rawOdo = vehicle?.current_odometer || 7944500;
                            const strOdo = String(rawOdo);
                            const padLen = Math.max(7, strOdo.length);
                            const digitArray = strOdo.padStart(padLen, '0').split('');

                            return digitArray.map((digit, idx) => (
                              <div
                                key={idx}
                                className="relative w-4.5 h-6.5 sm:w-6 sm:h-8.5 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white font-mono font-black text-xs sm:text-base rounded-md border border-slate-700/80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.9)] flex items-center justify-center overflow-hidden shrink-0 select-none"
                              >
                                {/* Glossy top glass reflection */}
                                <div className="absolute inset-x-0 top-0 h-[40%] bg-gradient-to-b from-white/20 to-transparent pointer-events-none rounded-t-md" />
                                {/* Bottom shadow gradient */}
                                <div className="absolute inset-x-0 bottom-0 h-[30%] bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
                                {/* Center wheel seam line */}
                                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px] bg-black/50 pointer-events-none" />

                                <span className="relative z-10 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                                  {digit}
                                </span>
                              </div>
                            ));
                          })()}
                        </div>
                        <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white ml-1 shrink-0">
                          km
                        </span>
                      </div>
                    </div>

                    {/* Service Progress & Next Due */}
                    <div className="pt-1.5 border-t border-slate-200/70 dark:border-slate-800 space-y-1">
                      <div className="flex justify-between items-center text-[9.5px]">
                        <span className="font-bold text-slate-500">Next Service</span>
                        <span className="font-extrabold text-emerald-700 dark:text-emerald-400">in 7,500 km</span>
                      </div>
                      <div className="w-full bg-slate-200/80 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-[#FA634E] h-full w-[70%]" title="70% interval elapsed"></div>
                      </div>
                    </div>

                  </div>

                  {/* ── RIGHT SIDE: Clean Service History Details (Col-span-7) ── */}
                  <div className="col-span-7 flex flex-col justify-between h-full min-h-0 overflow-hidden pl-0.5">
                    
                    {/* Header */}
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <Wrench className="w-3.5 h-3.5 text-[#FA634E]" />
                        <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 tracking-tight">
                          Vehicle Service History
                        </h3>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => navigate(`/maintenance/new?vehicle_id=${id}`)}
                          className="h-6 px-2.5 text-[10px] font-bold bg-[#FA634E] hover:bg-[#e0533e] text-white rounded-lg shadow-2xs gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          + Log Service
                        </Button>
                        <button
                          onClick={() => navigate('/maintenance')}
                          className="text-[10px] font-bold text-slate-500 hover:text-[#FA634E] flex items-center gap-0.5 transition-colors"
                        >
                          All <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Non-scrollable Service History Rows (2 clean rows) */}
                    <div className="flex-1 min-h-0 flex flex-col justify-center gap-2 py-1 overflow-hidden">
                      {serviceRecords.slice(0, 2).map((rec) => (
                        <div 
                          key={rec.id}
                          onClick={() => navigate(`/maintenance/${rec.id}`)}
                          className="group bg-slate-50/80 hover:bg-slate-100/80 border border-slate-200/80 rounded-xl p-2.5 transition-all cursor-pointer flex items-center justify-between gap-3 shrink-0"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-bold text-slate-600 uppercase tracking-wide px-1.5 py-0.5 bg-white border border-slate-200 rounded-md shrink-0">
                                {rec.ref_id}
                              </span>
                              <p className="text-xs font-black text-slate-900 truncate leading-tight group-hover:text-[#FA634E] transition-colors">
                                {rec.work_done}
                              </p>
                            </div>
                            <div className="flex items-center gap-2.5 text-[10px] text-slate-500 mt-1">
                              <span className="font-semibold truncate max-w-[150px]">{rec.workshop_name}</span>
                              <span className="text-slate-300">•</span>
                              <span className="font-medium text-slate-400">{rec.service_date}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0 text-right">
                            <div>
                              <p className="text-xs font-black text-slate-900 leading-tight">{rec.cost}</p>
                              <p className="text-[9px] font-semibold text-slate-400 mt-0.5">{rec.odometer_reading}</p>
                            </div>
                            <Badge className={`text-[9px] font-bold px-2 py-0.5 rounded-full border shadow-none shrink-0 ${
                              rec.status.toLowerCase().includes('in_progress') || rec.status.toLowerCase().includes('progress')
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}>
                              {rec.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Footer info line */}
                    <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400 shrink-0">
                      <span className="font-medium">Verified Workshop Records</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">Vehicle Health: Operational</span>
                    </div>

                  </div>

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
