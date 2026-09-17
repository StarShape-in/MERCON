import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { vehicleService } from '@/services/vehicleService';
import { resolveFileUrl } from '@/lib/documents';
import truckNewImg from '@/assets/truck-new.png';
import truckExplodedImg from '@/assets/exploded view.png';
import truckAnimation3sVideo from '@/assets/truck-animation-3s.mp4';
import { maintenanceService } from '@/services/maintenanceService';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { 
  Phone, MessageSquare, ArrowRight, CheckCircle2, 
  Search, SlidersHorizontal, LayoutGrid, Plus, 
  Clock, MapPin, Truck, FileText, ShieldCheck, 
  AlertTriangle, UserCheck, Wrench, Maximize2, Minimize2, Navigation, Award, Edit2, Gauge,
  History, ExternalLink, Package, Radio, Calendar, Droplets, Disc, Wind, Thermometer, Settings,
  RotateCcw, Sparkles, ChevronRight, ChevronLeft, Info, Layers, Zap, CircleDot, MoreHorizontal, Cpu
} from 'lucide-react';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}
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
        odometer_reading: r.odometer_reading ? `${r.odometer_reading.toLocaleString()} km` : '—',
        cost: r.cost ? `SAR ${r.cost.toLocaleString()}` : '—',
        status: r.status || 'Completed',
        typeIndex: idx % 3,
      }))
    : [];

  const plateNumber = vehicle?.plate_number || id || '—';
  const vehicleStatus: string = (vehicle?.status as string) || 'Loading';
  const assignedDriver = vehicle?.assignedDriver || (vehicle as any)?.driver;
  const driverFirstName = assignedDriver?.first_name || (assignedDriver?.name ? assignedDriver.name.split(' ')[0] : 'Unassigned');
  const driverLastName = assignedDriver?.last_name || (assignedDriver?.name ? assignedDriver.name.split(' ').slice(1).join(' ') : 'Driver');
  const driverName = assignedDriver 
    ? `${assignedDriver.first_name || ''} ${assignedDriver.last_name || ''}`.trim() || assignedDriver.name
    : 'Unassigned Driver';
  const rawAvatarUrl = assignedDriver?.avatar_url || assignedDriver?.photo_url || assignedDriver?.image_url || (assignedDriver as any)?.avatar || null;
  const driverAvatar = rawAvatarUrl ? resolveFileUrl(rawAvatarUrl) : '';
  const capacityFormatted = vehicle?.capacity_kg ? `${(vehicle.capacity_kg / 1000).toLocaleString()} Ton` : '—';
  const tripRoute = vehicleStatus === 'OnTrip' || vehicleStatus === 'In Transit' || vehicleStatus === 'InTransit' ? 'Riyadh → Al Bahah' : 'Riyadh → Al Hasa';

  const [selectedSlot, setSelectedSlot] = useState<SlotId | null>(null);
  const [slots, setSlots] = useState<CargoSlot[]>(INITIAL_SLOTS);
  const [tripTab, setTripTab] = useState<'recent' | 'upcoming' | 'completed'>('recent');
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeMilestoneId, setActiveMilestoneId] = useState<string>('mnt-1');
  const [isExplodedView, setIsExplodedView] = useState<boolean>(false);
  const [showHotspots, setShowHotspots] = useState<boolean>(false);
  const [selectedServiceId, setSelectedServiceId] = useState<number>(1);
  const [activeServiceView, setActiveServiceView] = useState<'categories' | 'detail'>('categories');
  const [recordIndex, setRecordIndex] = useState<number>(0);

  const getCategoryRecords = (categoryKey: string) => {
    if (!maintenanceData?.data || maintenanceData.data.length === 0) return [];
    const key = categoryKey.toLowerCase();
    
    return maintenanceData.data.filter((m: any) => {
      const sys = (m.system || '').toLowerCase();
      const text = `${m.work_done || ''} ${m.maintenance_type || ''} ${m.system || ''}`.toLowerCase();

      if (key === 'engine') return sys === 'engine' || text.includes('engine') || text.includes('oil');
      if (key === 'axles') return sys === 'axles' || sys === 'axle' || text.includes('axle') || text.includes('bearing') || text.includes('suspension');
      if (key === 'air_system') return sys === 'air_system' || sys === 'air system' || sys === 'air' || text.includes('air') || text.includes('filter');
      if (key === 'brakes') return sys === 'brakes' || sys === 'brake' || text.includes('brake') || text.includes('pad') || text.includes('drum');
      if (key === 'tires') return sys === 'tires' || sys === 'tire' || text.includes('tire') || text.includes('wheel') || text.includes('alignment');
      if (key === 'electrical') return sys === 'electrical' || sys === 'electric' || text.includes('electric') || text.includes('battery') || text.includes('fuse');
      if (key === 'others') {
        const isSpecific = ['engine', 'axle', 'air', 'brake', 'tire', 'electric', 'oil', 'battery', 'wheel'].some(k => text.includes(k));
        return !isSpecific;
      }
      return false;
    });
  };

  const getCategoryDetails = (key: string, defaultTitle: string, defaultWorkshop: string, defaultParts: string[]) => {
    const item = maintenanceData?.data?.find((m: any) => {
      if (m.system && m.system.toLowerCase() === key.toLowerCase()) return true;
      const text = `${m.work_done || ''} ${m.maintenance_type || ''} ${m.system || ''}`.toLowerCase();
      if (key === 'engine') return text.includes('engine') || text.includes('oil');
      if (key === 'axles') return text.includes('axle') || text.includes('bearing') || text.includes('suspension');
      if (key === 'air_system') return text.includes('air') || text.includes('filter');
      if (key === 'brakes') return text.includes('brake') || text.includes('pad') || text.includes('drum');
      if (key === 'tires') return text.includes('tire') || text.includes('wheel') || text.includes('alignment');
      if (key === 'electrical') return text.includes('electric') || text.includes('battery') || text.includes('fuse');
      if (key === 'others') return true;
      return false;
    });

    if (!item) {
      return {
        date: '—',
        title: defaultTitle,
        workshop: defaultWorkshop,
        odometer: '—',
        cost: '—',
        status: 'Completed',
        partsReplaced: defaultParts,
      };
    }

    const mDate = item.service_date ? new Date(item.service_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
    const mOdometer = item.odometer_reading ? `${Number(item.odometer_reading).toLocaleString()} km` : '—';
    const mCost = item.cost ? `SAR ${Number(item.cost).toLocaleString()}` : '—';
    const mParts = (item as any).parts_replaced || (item as any).replaced_parts || defaultParts;

    return {
      date: mDate,
      title: item.work_done || item.maintenance_type || defaultTitle,
      workshop: item.workshop_name || defaultWorkshop,
      odometer: mOdometer,
      cost: mCost,
      status: item.status || 'Completed',
      partsReplaced: Array.isArray(mParts) ? mParts : [String(mParts)],
    };
  };

  const engineDet = getCategoryDetails('engine', 'Engine Oil & Filter Service', 'Standard Service Workshop', ['Engine Oil', 'Oil Filter Element', 'Drain Seal']);
  const axlesDet = getCategoryDetails('axles', 'Axle Alignment & Bearing Inspection', 'Heavy Equipment Service Depot', ['Axle Oil Seals', 'Wheel Bearing Grease']);
  const airDet = getCategoryDetails('air_system', 'Air Filter & Compressor Service', 'Standard Maintenance Hub', ['Primary Air Filter', 'Air Dryer Desiccant']);
  const brakesDet = getCategoryDetails('brakes', 'Brake Pad & Drum Inspection', 'Fleet Service Center', ['Heavy Duty Brake Pads', 'Brake Linings']);
  const tiresDet = getCategoryDetails('tires', 'Tire Rotation & Alignment', 'Commercial Tire Depot', ['Drive Tire Rotation', 'Wheel Balancing']);
  const elecDet = getCategoryDetails('electrical', 'Battery & Alternator Check', 'Auto Electric Depot', ['Battery Test Unit', 'Starter Relay Fuse']);
  const othersDet = getCategoryDetails('others', 'Cabin HVAC & General Inspection', 'Depot Workshop', ['Cabin Air Filter', 'Wiper Blades']);

  const serviceItems = [
    {
      id: 1,
      categoryKey: 'engine',
      categoryLabel: 'Engine',
      ...engineDet,
      icon: Cpu,
      isRecent: true,
      hotspot: { top: '48%', left: '26%' },
      system: 'Engine & Lubrication',
      colorTheme: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200', activeBg: 'bg-rose-500 text-white border-rose-600', ping: 'bg-rose-500' },
    },
    {
      id: 2,
      categoryKey: 'axles',
      categoryLabel: 'Axles',
      ...axlesDet,
      icon: Layers,
      isRecent: false,
      hotspot: { top: '74%', left: '38%' },
      system: 'Axles & Suspension',
      colorTheme: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200', activeBg: 'bg-indigo-600 text-white border-indigo-700', ping: 'bg-indigo-500' },
    },
    {
      id: 3,
      categoryKey: 'air_system',
      categoryLabel: 'Air System',
      ...airDet,
      icon: Wind,
      isRecent: false,
      hotspot: { top: '24%', left: '42%' },
      system: 'Air Intake & Filtration',
      colorTheme: { bg: 'bg-sky-50', text: 'text-sky-600', border: 'border-sky-200', activeBg: 'bg-sky-500 text-white border-sky-600', ping: 'bg-sky-500' },
    },
    {
      id: 4,
      categoryKey: 'brakes',
      categoryLabel: 'Brakes',
      ...brakesDet,
      icon: Disc,
      isRecent: false,
      hotspot: { top: '74%', left: '60%' },
      system: 'Braking & Pneumatics',
      colorTheme: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200', activeBg: 'bg-orange-500 text-white border-orange-600', ping: 'bg-orange-500' },
    },
    {
      id: 5,
      categoryKey: 'tires',
      categoryLabel: 'Tires',
      ...tiresDet,
      icon: CircleDot,
      isRecent: false,
      hotspot: { top: '74%', left: '80%' },
      system: 'Tires & Wheels',
      colorTheme: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', activeBg: 'bg-emerald-600 text-white border-emerald-700', ping: 'bg-emerald-500' },
    },
    {
      id: 6,
      categoryKey: 'electrical',
      categoryLabel: 'Electrical',
      ...elecDet,
      icon: Zap,
      isRecent: false,
      hotspot: { top: '48%', left: '12%' },
      system: 'Electrical & Battery',
      colorTheme: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', activeBg: 'bg-amber-500 text-white border-amber-600', ping: 'bg-amber-400' },
    },
    {
      id: 7,
      categoryKey: 'others',
      categoryLabel: 'Others',
      ...othersDet,
      icon: MoreHorizontal,
      isRecent: false,
      hotspot: { top: '24%', left: '68%' },
      system: 'General Maintenance & HVAC',
      colorTheme: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200', activeBg: 'bg-purple-600 text-white border-purple-700', ping: 'bg-purple-500' },
    },
  ];

  const selectedService = serviceItems.find(s => s.id === selectedServiceId) || serviceItems[0];

  const videoRef = useRef<HTMLVideoElement>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const isFirstMount = useRef<boolean>(true);

  const handleToggleServiceHistory = () => {
    if (!isExplodedView) {
      setShowHotspots(false);
      setIsExplodedView(true);
    } else {
      setShowHotspots(false);
      setIsExplodedView(false);
    }
  };

  const handleVideoEnded = () => {
    if (isExplodedView) {
      setShowHotspots(true);
    }
  };

  const handleVideoTimeUpdate = () => {
    if (isExplodedView && videoRef.current && videoRef.current.currentTime >= 1.85) {
      setShowHotspots(true);
    }
  };

  // Play 2s video forward (0.0s -> 2.0s) or reverse (2.0s -> 0.0s) when Service History toggles
  useEffect(() => {
    if (!videoRef.current) return;
    const videoEl = videoRef.current;

    if (animFrameIdRef.current !== null) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }

    if (isFirstMount.current) {
      isFirstMount.current = false;
      videoEl.currentTime = 0;
      videoEl.pause();
      return;
    }

    if (isExplodedView) {
      // FORWARD 2s PLAYBACK (0.0s -> 2.0s)
      setShowHotspots(false);
      if (videoEl.currentTime >= 1.9) {
        videoEl.currentTime = 0;
      }
      videoEl.play().catch(() => {});
    } else {
      // REVERSE 2s PLAYBACK (2.0s -> 0.0s back to initial assembled state)
      setShowHotspots(false);
      videoEl.pause();
      let lastTime = performance.now();

      const stepReverse = (now: number) => {
        const dt = (now - lastTime) / 1000;
        lastTime = now;

        if (videoEl.currentTime > 0.05) {
          videoEl.currentTime = Math.max(0, videoEl.currentTime - dt);
          animFrameIdRef.current = requestAnimationFrame(stepReverse);
        } else {
          videoEl.currentTime = 0;
          videoEl.pause();
          animFrameIdRef.current = null;
        }
      };

      animFrameIdRef.current = requestAnimationFrame(stepReverse);
    }
  }, [isExplodedView]);

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

    const customerName = t.customer?.name || t.customer_name || 'Aprodac';
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
    <div className="w-full bg-[#F5F7FA] text-slate-900 font-sans p-5 sm:p-6 lg:p-7 flex flex-col gap-5 sm:gap-6 overflow-y-auto max-w-[1800px] mx-auto min-h-screen">
      
      {/* ── Top Header Bar ── */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3.5">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">{plateNumber}</h1>
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs sm:text-sm font-bold bg-emerald-100/90 text-emerald-700 border border-emerald-200/60 shadow-2xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            Available
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => navigate(`/vehicles/${vehicle?.id || id}/edit`)}
            className="font-bold bg-[#3E3C3D] hover:bg-slate-900 text-white gap-2 h-10 text-xs sm:text-sm shadow-xs rounded-xl px-5 transition-colors cursor-pointer"
          >
            <Edit2 className="w-4 h-4" />
            Edit
          </Button>
        </div>
      </div>

      {/* ── Top Metrics Grid (4 Large Proportional Cards) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 shrink-0">
        
        {/* Card 1: DRIVER */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs flex items-center justify-between min-h-[96px]">
          <div className="flex items-center gap-3.5 min-w-0">
            <DriverAvatar
              src={driverAvatar}
              firstName={driverFirstName}
              lastName={driverLastName}
              size="lg"
              className="w-12 h-12 border-2 border-white shadow-2xs shrink-0 rounded-full ring-1 ring-slate-200"
            />
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none mb-1.5">DRIVER</p>
              <p className="text-xs sm:text-sm font-black text-slate-900 truncate leading-snug">
                {assignedDriver ? `${assignedDriver.first_name || ''} ${assignedDriver.last_name || ''}`.trim() : 'ABDUL MALIK HABIB UR RAHMAN KHAN'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            <button 
              onClick={() => {
                const phone = vehicle?.assignedDriver?.phone_primary;
                if (phone) window.open(`tel:${phone}`);
              }}
              className="w-9 h-9 rounded-xl border border-slate-200/80 bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
            >
              <Phone className="w-4 h-4 text-blue-600" />
            </button>
            <button className="w-9 h-9 rounded-xl border border-slate-200/80 bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center justify-center transition-colors cursor-pointer shadow-2xs">
              <MessageSquare className="w-4 h-4 text-indigo-600" />
            </button>
          </div>
        </div>

        {/* Card 2: ASSET & CAPACITY */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs flex items-center gap-4 min-h-[96px]">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-2xs flex items-center justify-center shrink-0">
            <Truck className="w-6 h-6 text-[#FA634E] stroke-[1.75]" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none mb-1.5">ASSET &amp; CAPACITY</p>
            <p className="text-xs sm:text-sm font-black text-slate-900 leading-snug">{vehicle?.asset_type || 'Box'} Truck</p>
            <span className="inline-block mt-1 text-[10px] font-extrabold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200/80">
              Cap: {capacityFormatted}
            </span>
          </div>
        </div>

        {/* Card 3: DRIVER CONTACT */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs flex items-center gap-4 min-h-[96px]">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-2xs flex items-center justify-center shrink-0">
            <Phone className="w-6 h-6 text-blue-600 stroke-[1.75]" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none mb-1.5">DRIVER CONTACT</p>
            <p className="text-xs sm:text-sm font-mono font-black text-slate-900 leading-snug">{assignedDriver?.phone_primary || assignedDriver?.phone || '—'}</p>
            <p className="text-[10px] font-semibold text-slate-400 leading-none mt-1">Assigned Phone</p>
          </div>
        </div>

        {/* Card 4: GPS */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs flex items-center gap-4 min-h-[96px]">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-2xs flex items-center justify-center shrink-0">
            <Navigation className="w-6 h-6 text-emerald-600 stroke-[1.75]" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none mb-1.5">GPS</p>
            <p className="text-xs sm:text-sm font-mono font-black text-slate-900 leading-snug flex items-center gap-2 truncate">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
              ICCES: {vehicle?.icces_device_id || '—'}
            </p>
          </div>
        </div>

      </div>

      {/* ── Middle Section (3 Main Columns Grid - Clean Height h-[410px]) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-5 items-stretch">

        {/* Left Column: Documents & Validity */}
        <div className="xl:col-span-3 bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between h-[410px] max-h-[410px]">
          <div>
            <div className="flex items-center justify-between mb-4 pb-2.5 border-b border-slate-100">
              <h2 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
                <FileText className="w-4.5 h-4.5 text-blue-600" />
                Documents &amp; Validity
              </h2>
              <button 
                onClick={() => navigate(`/vehicles/${vehicle?.id || id}/documents`)}
                className="text-xs font-bold px-3 py-1 rounded-full border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              >
                View All
              </button>
            </div>

            {/* 5 Document Cards List */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-2.5 px-3 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-colors shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-white text-blue-600 flex items-center justify-center border border-slate-200/80 shrink-0 shadow-2xs">
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">Istimara</span>
                </div>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100/90 text-emerald-700 border border-emerald-200/60">
                  Valid (15 Oct 2027)
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 px-3 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-colors shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-white text-indigo-600 flex items-center justify-center border border-slate-200/80 shrink-0 shadow-2xs">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">Insurance</span>
                </div>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100/90 text-emerald-700 border border-emerald-200/60">
                  Valid (10 Jan 2027)
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 px-3 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-colors shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-white text-amber-600 flex items-center justify-center border border-slate-200/80 shrink-0 shadow-2xs">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">Operation Card</span>
                </div>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300/70">
                  Expiring 28 Sep
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 px-3 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-colors shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-white text-purple-600 flex items-center justify-center border border-slate-200/80 shrink-0 shadow-2xs">
                    <Award className="w-3.5 h-3.5 text-purple-600" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">SASO Plates</span>
                </div>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100/90 text-emerald-700 border border-emerald-200/60">
                  Valid (04 Nov 2028)
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 px-3 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-colors shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-white text-teal-600 flex items-center justify-center border border-slate-200/80 shrink-0 shadow-2xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">FAHAS</span>
                </div>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100/90 text-emerald-700 border border-emerald-200/60">
                  Valid (20 May 2027)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Center Column: Truck Visualizer Container (Clean h-[410px] Height) */}
        <div className="xl:col-span-6 bg-white border border-slate-200/80 rounded-2xl p-0 shadow-2xs flex items-center justify-center relative overflow-hidden h-[410px] max-h-[410px] w-full">
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden w-full h-full min-h-full">
            {/* Clean 2-Second Exploded Animation Video Element */}
            <video
              ref={videoRef}
              src="/truck-animation-2s.mp4"
              muted
              playsInline
              preload="auto"
              onEnded={handleVideoEnded}
              onTimeUpdate={handleVideoTimeUpdate}
              className="w-full h-full object-cover block transform-gpu transition-all duration-300 inset-0"
            />

            {/* Floating 3D Part Interactive Hotspots (Appears ONLY AFTER 2s animation completes when selected from sidebar) */}
            {isExplodedView && showHotspots && (
              <div className="absolute inset-0 pointer-events-none animate-in fade-in zoom-in-95 duration-300">
                {serviceItems.map((item) => {
                  const isSelected = item.id === selectedServiceId;
                  const IconComp = item.icon;
                  const theme = item.colorTheme;
                  return (
                    <div
                      key={`hotspot-${item.id}`}
                      style={{ top: item.hotspot.top, left: item.hotspot.left }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto transition-transform duration-300 hover:scale-125 z-10"
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (activeServiceView === 'detail' && selectedServiceId === item.id) {
                            setActiveServiceView('categories');
                            setIsExplodedView(false);
                          } else {
                            setSelectedServiceId(item.id);
                            setRecordIndex(0);
                            setActiveServiceView('detail');
                            setIsExplodedView(true);
                          }
                        }}
                        className={`relative group flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full shadow-md transition-all cursor-pointer ${
                          isSelected 
                            ? `${theme.activeBg} ring-4 ring-[#FA634E]/30 scale-110` 
                            : 'bg-white/90 backdrop-blur-xs text-slate-700 hover:bg-white border border-slate-200'
                        }`}
                        title={item.categoryLabel}
                      >
                        <IconComp className={`w-3.5 h-3.5 sm:w-4 sm:h-4 relative z-10 ${isSelected ? 'text-white' : theme.text}`} />
                        <span className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap pointer-events-none shadow-lg z-20">
                          {item.categoryLabel}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Service History (Clean h-[410px] Height, All Cards Fit Cleanly) */}
        <div className="xl:col-span-3 bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between h-[410px] max-h-[410px]">
          <div className="h-full flex flex-col justify-between">
            {activeServiceView === 'categories' ? (
              <div className="flex flex-col justify-between h-full">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 shrink-0">
                  <h2 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <Wrench className="w-4.5 h-4.5 text-[#FA634E]" />
                    Service History
                  </h2>
                </div>

                {/* Category Cards Grid (Free Mode - Fills Box Height & Width Completely) */}
                <div className="grid grid-cols-2 gap-2 flex-1 h-full items-stretch w-full py-0.5">
                  {serviceItems.map((item, idx) => {
                    const isSelected = item.id === selectedServiceId;
                    const IconComp = item.icon;
                    const theme = item.colorTheme;
                    const isLastOdd = serviceItems.length % 2 !== 0 && idx === serviceItems.length - 1;
                    return (
                      <button 
                        key={`cat-rec-${item.id}`}
                        onClick={() => {
                          if (activeServiceView === 'detail' && selectedServiceId === item.id) {
                            setActiveServiceView('categories');
                            setIsExplodedView(false);
                          } else {
                            setSelectedServiceId(item.id);
                            setRecordIndex(0);
                            setActiveServiceView('detail');
                            setIsExplodedView(true);
                          }
                        }}
                        className={`${isLastOdd ? 'col-span-2' : 'col-span-1'} p-3 px-3.5 rounded-xl border flex items-center gap-3 transition-all cursor-pointer text-left h-full min-h-[58px] group ${
                          isSelected
                            ? `bg-orange-50/80 border-[#FA634E] ring-2 ring-[#FA634E]/30 text-slate-900 shadow-2xs`
                            : `bg-white border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/80 shadow-2xs`
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all shrink-0 ${
                          isSelected
                            ? 'bg-white border-orange-200 shadow-2xs'
                            : 'bg-slate-50 border-slate-100 group-hover:bg-white group-hover:border-slate-200 shadow-2xs'
                        }`}>
                          <IconComp className={`w-4 h-4 stroke-[2] ${theme.text}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className={`text-xs font-extrabold truncate block ${isSelected ? 'text-[#FA634E]' : 'text-slate-800'}`}>
                            {item.categoryLabel}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              (() => {
                const catRecords = getCategoryRecords(selectedService.categoryKey);
                const totalRecs = catRecords.length;
                const safeIdx = Math.min(recordIndex, Math.max(0, totalRecs - 1));
                const currentRec = totalRecs > 0 ? catRecords[safeIdx] : null;

                const recDate = currentRec?.service_date
                  ? new Date(currentRec.service_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                  : selectedService.date;
                const recTitle = currentRec?.work_done || currentRec?.maintenance_type || selectedService.title;
                const recWorkshop = currentRec?.workshop_name || selectedService.workshop;
                const recOdometer = currentRec?.odometer_reading ? `${Number(currentRec.odometer_reading).toLocaleString()} km` : selectedService.odometer;
                const recCost = currentRec?.cost ? `SAR ${Number(currentRec.cost).toLocaleString()}` : selectedService.cost;
                const recStatus = currentRec?.status || selectedService.status;
                const rawP = (currentRec as any)?.parts_replaced || (currentRec as any)?.replaced_parts;
                const recParts = rawP ? (Array.isArray(rawP) ? rawP : [String(rawP)]) : selectedService.partsReplaced;

                return (
                  <div className="flex flex-col justify-between h-full space-y-2.5 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 shrink-0">
                      <button
                        onClick={() => {
                          setActiveServiceView('categories');
                          setIsExplodedView(false);
                        }}
                        className="text-xs font-bold text-slate-600 hover:text-[#FA634E] transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>Back</span>
                      </button>
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border bg-slate-100 text-slate-700 border-slate-200">
                        {selectedService.categoryLabel}
                      </span>
                    </div>

                    {totalRecs === 0 ? (
                      <div className="flex-1 bg-slate-50/70 rounded-xl p-4 border border-dashed border-slate-200 shadow-2xs flex flex-col items-center justify-center text-center">
                        <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200/80 flex items-center justify-center mb-2">
                          {(() => {
                            const IconComp = selectedService.icon;
                            return <IconComp className="w-5 h-5 text-slate-400 stroke-[1.5]" />;
                          })()}
                        </div>
                        <p className="text-xs font-bold text-slate-700">No Records Found</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">No maintenance records logged under {selectedService.categoryLabel}.</p>
                      </div>
                    ) : (
                      <div className="flex-1 bg-slate-50/90 rounded-xl p-2.5 border border-slate-200/90 shadow-2xs flex flex-col justify-between gap-2">
                        <div className="flex items-start gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 shadow-2xs flex items-center justify-center shrink-0 mt-0.5">
                            {(() => {
                              const IconComp = selectedService.icon;
                              return <IconComp className={`w-4 h-4 stroke-[2] ${selectedService.colorTheme.text}`} />;
                            })()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-[9px] font-bold text-slate-400">{recDate}</span>
                              <span className="text-[9px] font-bold px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                                {recStatus}
                              </span>
                            </div>
                            <h3 className="text-xs font-black text-slate-900 leading-tight truncate">{recTitle}</h3>
                            <p className="text-[10px] font-semibold text-slate-500 mt-0.5 flex items-center gap-1 truncate">
                              <Wrench className="w-3 h-3 text-slate-400" />
                              {recWorkshop}
                            </p>
                          </div>
                        </div>

                        {totalRecs > 1 && (
                          <div className="flex items-center justify-between px-2 py-1 bg-white rounded-lg border border-slate-200/80 text-[10px] font-bold text-slate-600">
                            <button
                              disabled={safeIdx === 0}
                              onClick={() => setRecordIndex(prev => Math.max(0, prev - 1))}
                              className="p-0.5 hover:text-[#FA634E] disabled:opacity-30 disabled:hover:text-slate-600 cursor-pointer"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                            <span>Record {safeIdx + 1} of {totalRecs}</span>
                            <button
                              disabled={safeIdx >= totalRecs - 1}
                              onClick={() => setRecordIndex(prev => Math.min(totalRecs - 1, prev + 1))}
                              className="p-0.5 hover:text-[#FA634E] disabled:opacity-30 disabled:hover:text-slate-600 cursor-pointer"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 text-[10px]">
                          <div className="bg-white p-1.5 px-2 rounded-lg border border-slate-200/80">
                            <span className="font-extrabold text-slate-400 uppercase tracking-wider block text-[8.5px]">Odometer</span>
                            <span className="font-mono font-black text-slate-900">{recOdometer}</span>
                          </div>
                          <div className="bg-white p-1.5 px-2 rounded-lg border border-slate-200/80">
                            <span className="font-extrabold text-slate-400 uppercase tracking-wider block text-[8.5px]">Cost</span>
                            <span className="font-mono font-black text-[#FA634E]">{recCost}</span>
                          </div>
                        </div>

                        <div className="bg-white p-1.5 px-2 rounded-lg border border-slate-200/80">
                          <span className="font-extrabold text-slate-400 uppercase tracking-wider block text-[8.5px] mb-0.5">Replaced Parts</span>
                          <span className="text-[10px] font-bold text-slate-700 line-clamp-2">
                            {recParts.join(' • ')}
                          </span>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => {
                        const targetSearch = (vehicle?.plate_number && vehicle.plate_number !== '—')
                          ? vehicle.plate_number
                          : (plateNumber && plateNumber !== '—' ? plateNumber : (vehicle?.ref_id || ''));
                        navigate(`/maintenance?search=${encodeURIComponent(targetSearch)}`);
                      }}
                      className="w-full py-2 px-3 rounded-xl border border-slate-200 bg-slate-900 hover:bg-[#FA634E] text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs shrink-0"
                    >
                      <span>Open Maintenance Record</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })()
            )}
          </div>
        </div>

      </div>

      {/* ── Section: Trips Ledger (Positioned Directly Below the Three Middle Boxes) ── */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs shrink-0">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Truck className="w-4.5 h-4.5 text-[#FA634E]" />
              Trips
            </h2>
            {/* Tab Switcher */}
            <div className="flex items-center gap-4 border-l border-slate-200 pl-4">
              <button
                onClick={() => setTripTab('recent')}
                className={`text-xs font-extrabold transition-all relative cursor-pointer ${
                  tripTab === 'recent' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                Recent
                {tripTab === 'recent' && (
                  <span className="absolute -bottom-2 left-0 right-0 h-0.5 bg-[#FA634E] rounded-full"></span>
                )}
              </button>

              <button
                onClick={() => setTripTab('upcoming')}
                className={`text-xs font-extrabold transition-all relative cursor-pointer ${
                  tripTab === 'upcoming' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                Upcoming
                {tripTab === 'upcoming' && (
                  <span className="absolute -bottom-2 left-0 right-0 h-0.5 bg-[#FA634E] rounded-full"></span>
                )}
              </button>

              <button
                onClick={() => setTripTab('completed')}
                className={`text-xs font-extrabold transition-all relative cursor-pointer ${
                  tripTab === 'completed' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                Completed
                {tripTab === 'completed' && (
                  <span className="absolute -bottom-2 left-0 right-0 h-0.5 bg-[#FA634E] rounded-full"></span>
                )}
              </button>
            </div>
          </div>

          <button 
            onClick={() => {
              const targetSearch = (vehicle?.plate_number && vehicle.plate_number !== '—')
                ? vehicle.plate_number
                : (plateNumber && plateNumber !== '—' ? plateNumber : (vehicle?.ref_id || ''));
              navigate(`/trips?search=${encodeURIComponent(targetSearch)}`);
            }}
            className="text-xs font-bold px-3 py-1 rounded-full border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span>All Trips</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>

        {/* Dynamic Vehicle Trips Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {activeDataset.length === 0 ? (
            <div className="col-span-full p-6 text-center border border-dashed border-slate-200/80 rounded-xl bg-slate-50/50">
              <Truck className="w-6 h-6 text-slate-400 mx-auto mb-1.5 stroke-[1.5]" />
              <p className="text-xs font-bold text-slate-600">No Trips Found</p>
              <p className="text-[10px] text-slate-400 mt-0.5">No {tripTab} trip records for this vehicle.</p>
            </div>
          ) : (
            activeDataset.slice(0, 4).map((trip) => (
              <div 
                key={trip.id}
                onClick={() => trip.rawId && navigate(`/trips/${trip.rawId}`)}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-2xs transition-all cursor-pointer"
              >
                <div className="min-w-0 flex-1 pr-2">
                  <p className="text-xs sm:text-sm font-black text-slate-900 truncate">{trip.route}</p>
                  <p className="text-[10px] font-semibold text-slate-400 mt-0.5 truncate">{trip.id} • {trip.customerName}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {renderTripCardBadge(trip.status)}
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
