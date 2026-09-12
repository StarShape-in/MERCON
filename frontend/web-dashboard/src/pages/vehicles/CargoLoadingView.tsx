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
  History, ExternalLink, Package, Radio, Calendar, Droplets, Disc, Wind, Thermometer, Settings
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
    ? maintenanceData.data.map((r, idx) => ({
        id: r.id,
        ref_id: r.ref_id || `MNT-${r.id.slice(0, 5).toUpperCase()}`,
        work_done: r.work_done || r.maintenance_type || 'General Service',
        workshop_name: r.workshop_name || 'Standard Workshop',
        service_date: r.service_date ? new Date(r.service_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
        odometer_reading: r.odometer_reading ? `${r.odometer_reading.toLocaleString()} km` : '142,500 km',
        cost: r.cost ? `SAR ${r.cost.toLocaleString()}` : 'SAR 1,450',
        status: r.status || 'Completed',
        typeIndex: idx % 3,
      }))
    : [
        {
          id: 'mnt-1',
          ref_id: 'MNT-048',
          work_done: 'Engine Oil & Filter Service',
          workshop_name: 'Zahid Heavy Equipment Workshop',
          service_date: '12 Aug 2026',
          odometer_reading: '142,500 km',
          cost: 'SAR 1,450',
          status: 'Completed',
          typeIndex: 0,
        },
        {
          id: 'mnt-2',
          ref_id: 'MNT-039',
          work_done: 'Brake Pad Replacement',
          workshop_name: 'Al-Refaei Truck Service Center',
          service_date: '25 Jun 2026',
          odometer_reading: '135,000 km',
          cost: 'SAR 2,200',
          status: 'Completed',
          typeIndex: 1,
        },
        {
          id: 'mnt-3',
          ref_id: 'MNT-031',
          work_done: 'Air Filter Replacement',
          workshop_name: 'Saudi Heavy Maintenance Hub',
          service_date: '14 Mar 2026',
          odometer_reading: '128,300 km',
          cost: 'SAR 650',
          status: 'Completed',
          typeIndex: 2,
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
    <div className="w-full min-h-[calc(100vh-4rem)] bg-[#FDFDFD] text-slate-900 font-sans px-4 pb-4 pt-1 sm:px-5 sm:pb-5 sm:pt-1 flex flex-col gap-2.5 overflow-y-auto">
      
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

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 flex-1">
        
        {/* ── Left Sidebar: 2 Clean Balanced Cards (Expanded to Right) ── */}
        <div className="xl:col-span-4 flex flex-col gap-3.5">
          
          {/* BOX 1: Truck & Driver Information */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 shadow-xs flex flex-col gap-3 shrink-0">
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
            <div className="flex items-center justify-between bg-slate-50/70 p-2.5 rounded-xl border border-slate-200/80">
              <div className="flex items-center gap-2.5">
                <DriverAvatar
                  src={driverAvatar}
                  firstName={driverFirstName}
                  lastName={driverLastName}
                  size="md"
                  className="w-9 h-9 border-2 border-white shadow-2xs shrink-0 rounded-full ring-1 ring-slate-200"
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
                  className="w-7.5 h-7.5 rounded-lg border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 shadow-2xs"
                  onClick={() => {
                    const phone = vehicle?.assignedDriver?.phone_primary;
                    if (phone) window.open(`tel:${phone}`);
                  }}
                >
                  <Phone className="w-3.5 h-3.5 text-slate-600" />
                </Button>
                <Button variant="outline" size="icon" className="w-7.5 h-7.5 rounded-lg border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 shadow-2xs">
                  <MessageSquare className="w-3.5 h-3.5 text-slate-600" />
                </Button>
              </div>
            </div>

            {/* Vehicle Specs Grid */}
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              {/* Card 1: Plate & Ref ID */}
              <div className="bg-slate-50/60 p-2.5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Plate & Ref ID</p>
                  <div className="w-4.5 h-4.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200/80 flex items-center justify-center">
                    <FileText className="w-2.5 h-2.5" />
                  </div>
                </div>
                <p className="font-mono font-black text-slate-900 leading-tight text-xs">
                  {plateNumber}
                </p>
                <p className="text-[9.5px] font-mono font-semibold text-slate-500 truncate mt-0.5">
                  Ref: {vehicle?.ref_id || 'TRK-129'}
                </p>
              </div>

              {/* Card 2: Asset & Capacity */}
              <div className="bg-slate-50/60 p-2.5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Asset & Capacity</p>
                  <div className="w-4.5 h-4.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200/80 flex items-center justify-center">
                    <Package className="w-2.5 h-2.5" />
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

              {/* Card 3: Driver Contact */}
              <div className="bg-slate-50/60 p-2.5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Driver Contact</p>
                  <div className="w-4.5 h-4.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200/80 flex items-center justify-center">
                    <Phone className="w-2.5 h-2.5" />
                  </div>
                </div>
                <p className="font-mono font-black text-slate-900 leading-tight text-xs truncate">
                  {assignedDriver?.phone_primary || assignedDriver?.phone || '+966546126286'}
                </p>
                <p className="text-[9.5px] font-semibold text-slate-500 truncate mt-0.5">
                  {assignedDriver ? 'Assigned Phone' : 'Primary Contact'}
                </p>
              </div>

              {/* Card 4: Telematics & GPS */}
              <div className="bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-200/60 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[9px] font-extrabold text-emerald-800 uppercase tracking-wider">Telematics & GPS</p>
                  <div className="w-4.5 h-4.5 rounded-md bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center">
                    <Radio className="w-2.5 h-2.5 animate-pulse" />
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
                  {vehicle?.icces_device_id ? `ICCES: ${vehicle.icces_device_id}` : 'ICCES: 8676048587338...'}
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-dashed border-slate-200 my-0.5"></div>

            {/* Dynamic Location Display */}
            <div className="flex items-center justify-between p-2 px-3 bg-slate-50/70 rounded-xl border border-slate-200/80">
              {vehicleStatus === 'OnTrip' || vehicleStatus === 'In Transit' || vehicleStatus === 'InTransit' ? (
                <>
                  <div className="text-left">
                    <p className="text-xs font-black text-slate-900 leading-none">RUH</p>
                    <p className="text-[10px] font-semibold text-slate-400 mt-1 truncate max-w-[75px]">Riyadh</p>
                  </div>

                  <div className="flex-1 mx-3 flex items-center justify-center relative">
                    <div className="w-full h-1 bg-emerald-200 rounded-full"></div>
                    <div className="absolute w-5.5 h-5.5 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs ring-2 ring-white">
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
                    <div className="absolute w-5.5 h-5.5 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs ring-2 ring-white">
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
                    <div className="absolute w-5.5 h-5.5 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-xs ring-2 ring-white">
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
                    <div className="absolute w-5.5 h-5.5 rounded-full bg-slate-300 text-slate-700 flex items-center justify-center shadow-2xs ring-2 ring-white">
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

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <Button 
                variant="outline" 
                onClick={() => navigate(`/vehicles/${id || ''}/edit`)}
                className="w-full h-8 font-bold text-xs border-slate-200 rounded-xl hover:bg-slate-100 text-slate-800 shadow-2xs bg-white hover:border-slate-300 transition-all"
              >
                Change driver
              </Button>
              <Button 
                onClick={() => navigate(`/trips/new?vehicle_id=${id || ''}`)}
                className="w-full h-8 font-bold text-xs bg-[#FA634E] hover:bg-[#e0533e] text-white rounded-xl shadow-xs border border-transparent transition-all flex items-center justify-center gap-1.5"
              >
                <span>Edit route</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* BOX 2: Vehicle Documents & Validity (Clean Vertically-Centered List + More Details Button) */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-3 sm:p-3.5 shadow-xs flex-1 flex flex-col justify-between min-h-0 overflow-hidden">
            <div className="flex items-center justify-between shrink-0 mb-1">
              <h2 className="text-xs font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                Documents & Validity
              </h2>
              <span className="text-[10px] font-bold text-slate-400">5 Registered</span>
            </div>

            {/* Document list stretching vertically with equal centered slots */}
            <div className="flex-1 my-1 flex flex-col rounded-xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden bg-slate-50/30 min-h-0">
              {/* 1. Istimara */}
              <div className="flex items-center justify-between px-3 py-1 flex-1 bg-slate-50/60 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-800">Istimara</span>
                </div>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full whitespace-nowrap">Valid (15 Oct 2027)</span>
              </div>
              {/* 2. Insurance */}
              <div className="flex items-center justify-between px-3 py-1 flex-1 bg-slate-50/60 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-800">Insurance</span>
                </div>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full whitespace-nowrap">Valid (10 Jan 2027)</span>
              </div>
              {/* 3. Operation Card */}
              <div className="flex items-center justify-between px-3 py-1 flex-1 bg-amber-50/40 hover:bg-amber-50/70 transition-colors">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-800">Operation Card</span>
                </div>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded-md whitespace-nowrap">Expiring 28 Sep</span>
              </div>
              {/* 4. SASO Plates */}
              <div className="flex items-center justify-between px-3 py-1 flex-1 bg-slate-50/60 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-800">SASO Plates</span>
                </div>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full whitespace-nowrap">Valid (04 Nov 2028)</span>
              </div>
              {/* 5. FAHAS */}
              <div className="flex items-center justify-between px-3 py-1 flex-1 bg-slate-50/60 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-1.5">
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
              className="w-full h-8 font-bold text-xs border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700 shadow-2xs justify-center gap-1.5 shrink-0"
            >
              <span>More Details</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </Button>
          </div>
        </div>

        {/* ── Main Central & Bottom Area ── */}
        <div className="xl:col-span-8 flex flex-col justify-between gap-3.5 min-w-0 overflow-hidden">
          
          {/* Truck Cargo Visualizer */}
          <div className="w-full relative flex items-center justify-end shrink-0 overflow-hidden rounded-2xl">
            
            {/* Inner wrapper shifted 1/6th to the right out of frame */}
            <div className="relative w-[118%] max-w-none translate-x-[16.6%] transition-transform">
              <img src={truckNewImg} alt="Truck" className="w-full h-auto object-contain block" />
              
              {/* Clean Direct HUD Floating Sub-Cards inside Trailer Body (Perfect White Panel Framing) */}
              <div className="absolute top-[12.5%] left-[28%] w-[68%] h-[48.5%] flex items-stretch gap-3 pointer-events-auto p-1 overflow-hidden">
                
                {/* ── LEFT SECTION: Odometer & Service Progress ── */}
                <div className="w-[36%] flex flex-col justify-start gap-2 pt-0.5 shrink-0 min-w-0">
                  
                  {/* Top Header */}
                  <div className="flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 text-[#3E3C3D] dark:text-slate-200 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                        <Gauge className="w-4 h-4 text-[#3E3C3D] dark:text-slate-200" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-xs sm:text-sm font-black text-[#3E3C3D] dark:text-slate-100 leading-tight tracking-tight truncate">Odometer</h3>
                      </div>
                    </div>

                    <Badge className="bg-slate-100 text-[#3E3C3D] dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold px-2 py-0.5 text-[9px] rounded-lg shadow-none flex items-center gap-1 shrink-0">
                      <span className="w-1.5 h-1.5 bg-[#3E3C3D] dark:bg-slate-300 rounded-full"></span>
                      Active
                    </Badge>
                  </div>

                  {/* Clean Subtle Odometer Wheel Box */}
                  <div className="pt-1">
                    <div className="bg-slate-100 dark:bg-slate-800/90 p-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs flex items-center justify-center gap-1">
                      <div className="flex items-center gap-0.5 sm:gap-1">
                        {(() => {
                          const rawOdo = vehicle?.current_odometer || 7944500;
                          const strOdo = String(rawOdo);
                          const padLen = Math.max(7, strOdo.length);
                          const digitArray = strOdo.padStart(padLen, '0').split('');

                          return digitArray.map((digit, idx) => (
                            <div
                              key={idx}
                              className="relative w-4.5 h-6.5 sm:w-5 sm:h-7 bg-white dark:bg-slate-900 text-[#3E3C3D] dark:text-slate-100 font-mono font-black text-xs sm:text-sm rounded border border-slate-300 dark:border-slate-700 shadow-2xs flex items-center justify-center overflow-hidden shrink-0 select-none"
                            >
                              <span className="relative z-10">
                                {digit}
                              </span>
                            </div>
                          ));
                        })()}
                      </div>
                      <span className="text-xs font-black text-[#3E3C3D] dark:text-slate-200 ml-1 shrink-0">
                        km
                      </span>
                    </div>
                  </div>

                </div>

                {/* Vertical Divider Line between Left and Right sections */}
                <div className="w-[1px] bg-slate-300 dark:bg-slate-700 my-1 shrink-0" />

                {/* ── RIGHT SECTION: Vehicle Service History ── */}
                <div className="flex-1 flex flex-col justify-between min-w-0 overflow-hidden space-y-1">
                  
                  {/* Header */}
                  <div className="flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 text-[#3E3C3D] dark:text-slate-200 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                        <Calendar className="w-4 h-4 text-[#3E3C3D] dark:text-slate-200" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-xs sm:text-sm font-black text-[#3E3C3D] dark:text-slate-100 tracking-tight leading-tight truncate">Vehicle Service History</h3>
                      </div>
                    </div>

                    <span className="text-[10px] font-extrabold text-[#3E3C3D] dark:text-slate-200 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-0.5 rounded-lg shrink-0">
                      3 Records
                    </span>
                  </div>

                  {/* Service Timeline Entries */}
                  <div className="relative flex-1 min-h-0 flex flex-col justify-between py-1 my-0.5">
                    {/* Vertical Connector Line */}
                    <div className="absolute left-[9px] top-2 bottom-2 w-[1.5px] bg-slate-300 dark:bg-slate-700" />

                    {[
                      {
                        id: 1,
                        date: '12 Aug 2026',
                        title: 'Engine Oil & Filter Service',
                        workshop: 'Zahid Heavy Equipment Workshop',
                        icon: Droplets,
                        isRecent: true,
                      },
                      {
                        id: 2,
                        date: '25 Jun 2026',
                        title: 'Brake Pad Replacement',
                        workshop: 'Al-Refaei Truck Service Center',
                        icon: Disc,
                        isRecent: false,
                      },
                      {
                        id: 3,
                        date: '14 Mar 2026',
                        title: 'Air Filter Replacement',
                        workshop: 'Saudi Heavy Maintenance Hub',
                        icon: Wind,
                        isRecent: false,
                      },
                    ].map((item) => {
                      const IconComp = item.icon;
                      return (
                        <div key={item.id} className="relative flex items-center justify-between gap-2 pl-4 min-w-0">
                          {/* Timeline node dot */}
                          <div
                            className={`absolute left-[6px] rounded-full z-10 ${
                              item.isRecent
                                ? 'w-2.5 h-2.5 bg-[#3E3C3D] dark:bg-slate-200 ring-2 ring-slate-200 dark:ring-slate-700'
                                : 'w-2 h-2 bg-slate-400 ring-2 ring-slate-100 dark:ring-slate-800'
                            }`}
                          />

                          {/* Item Icon */}
                          <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-[#3E3C3D] dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                            <IconComp className="w-3 h-3 text-[#3E3C3D] dark:text-slate-200" />
                          </div>

                          {/* Main Service Details */}
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold text-slate-500 leading-tight">{item.date}</p>
                            <p className="text-xs sm:text-sm font-extrabold text-[#3E3C3D] dark:text-slate-100 leading-tight truncate">{item.title}</p>
                            <p className="text-[10px] font-medium text-slate-500 leading-tight truncate">{item.workshop}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                </div>

              </div>
            </div>
          </div>

          {/* Bottom Assignment & Trip Status Box */}
          <div className={`bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-xs flex flex-col justify-between transition-all duration-300 ${isExpanded ? 'fixed inset-4 z-50 shadow-2xl max-w-none' : ''}`}>
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

              {/* Action Control: All Trips Redirect Button */}
              <Button
                variant="outline"
                onClick={() => navigate('/trips')}
                className="h-8 px-3.5 font-bold text-xs border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700 shadow-2xs transition-colors flex items-center gap-1.5"
              >
                <span>All Trips</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </Button>
            </div>

            {/* Fixed 3-Column Data Cards / Blank Boxes Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1">
              {(() => {
                const displayed = getDisplayedData().slice(0, 3);
                return Array.from({ length: 3 }).map((_, index) => {
                  const item = displayed[index];
                  if (!item) {
                    return (
                      <div 
                        key={`blank-box-${index}`} 
                        className="border border-dashed border-slate-200/90 bg-slate-50/40 rounded-xl p-3.5 flex flex-col items-center justify-center text-center h-full gap-2 transition-all hover:bg-slate-50/70"
                      >
                        <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center border border-slate-200/80 shadow-2xs">
                          <Truck className="w-4.5 h-4.5 text-slate-400 stroke-[1.5]" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-600">No Trip Assigned</p>
                          <p className="text-[10px] font-medium text-slate-400 mt-0.5">Blank Slot</p>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div 
                      key={item.id} 
                      onClick={() => item.rawId && navigate(`/trips/${item.rawId}`)}
                      className={`border rounded-xl p-3 sm:p-3.5 flex flex-col justify-between h-full bg-white shadow-2xs transition-all ${
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
