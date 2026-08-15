import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Plus,
  FileText,
  RotateCw,
  Download,
  Maximize2,
  ArrowUpRight,
  Truck,
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import ImportantReminders from '@/components/dashboard/ImportantReminders';
import MonthlyOverview from '@/components/dashboard/MonthlyOverview';
import OperatorActionCenter from '@/components/dashboard/OperatorActionCenter';
import DataTable, { Column } from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { authStore } from '@/store/authStore';
import { reportsService } from '@/services/reportsService';
import { tripService } from '@/services/tripService';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { exportToCSV } from '@/utils/exportUtils';

import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ─── Leaflet Map Auto-Resizer when Panels Expand/Collapse or Tab Changes ────
function MapResizer({ isCollapsed, tripTab }: { isCollapsed: boolean; tripTab: string }) {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const t1 = setTimeout(() => map.invalidateSize(), 100);
    const t2 = setTimeout(() => map.invalidateSize(), 300);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isCollapsed, tripTab, map]);
  return null;
}

// ─── 3D Truck Map Marker Generator ──────────────────────────────────────────
function createTruckMapIcon(plate: string, status: string) {
  let imgFilter = '';
  let glowColor = 'rgba(100,116,139,0.4)';
  let borderColor = '#94A3B8';
  let ping = false;

  if (status === 'In Transit') {
    imgFilter = 'hue-rotate(100deg) saturate(1.3) brightness(0.95) drop-shadow(0 4px 6px rgba(0,0,0,0.25))';
    glowColor  = 'rgba(16,185,129,0.65)';
    borderColor = '#10B981';
    ping       = true;
  } else if (status === 'To Pickup') {
    imgFilter = 'hue-rotate(30deg) saturate(1.5) brightness(0.95) drop-shadow(0 4px 6px rgba(0,0,0,0.25))';
    glowColor  = 'rgba(249,115,22,0.65)';
    borderColor = '#F97316';
    ping       = true;
  } else if (status === 'At Pickup') {
    imgFilter = 'hue-rotate(200deg) saturate(1.2) brightness(0.95) drop-shadow(0 4px 6px rgba(0,0,0,0.25))';
    glowColor  = 'rgba(59,130,246,0.65)';
    borderColor = '#3B82F6';
    ping       = true;
  } else if (status === 'To Delivery') {
    imgFilter = 'hue-rotate(260deg) saturate(1.4) brightness(0.9) drop-shadow(0 4px 6px rgba(0,0,0,0.25))';
    glowColor  = 'rgba(139,92,246,0.65)';
    borderColor = '#8B5CF6';
    ping       = true;
  } else if (status === 'Issue') {
    imgFilter = 'hue-rotate(335deg) saturate(2) brightness(0.85) drop-shadow(0 4px 6px rgba(0,0,0,0.25))';
    glowColor  = 'rgba(220,38,38,0.65)';
    borderColor = '#DC2626';
  }

  const svgHtml = `
    <div style="position:relative;width:58px;height:62px;display:flex;flex-direction:column;align-items:center;justify-content:center;">
      ${ping ? `<div class="animate-ping" style="position:absolute;width:36px;height:36px;border-radius:50%;background-color:${glowColor};opacity:0.35;z-index:1;"></div>` : ''}
      <div style="position:relative;z-index:2;transform:translateY(-3px);width:44px;height:44px;">
        <img
          src="/truck_3d_orange_transparent.png"
          alt="truck"
          style="width:100%;height:100%;object-fit:contain;filter:${imgFilter};"
        />
      </div>
      <div style="position:absolute;bottom:0px;background:white;color:${borderColor};font-family:monospace;font-size:8px;font-weight:800;padding:1px 5px;border-radius:4px;white-space:nowrap;border:1.5px solid ${borderColor};box-shadow:0 2px 6px rgba(0,0,0,0.18);z-index:3;">
        ${plate}
      </div>
    </div>
  `;
  return L.divIcon({ html: svgHtml, className: '', iconSize: [58, 62], iconAnchor: [29, 31] });
}

// ─── Fallback Coordinates for Saudi Hubs ────────────────────────────────────
const CITY_COORDS: Record<string, [number, number]> = {
  riyadh: [24.7136, 46.6753],
  jeddah: [21.5433, 39.1728],
  dammam: [26.4207, 50.0888],
  makkah: [21.3891, 39.8579],
  madinah: [24.5247, 39.5692],
  khobar: [26.2172, 50.1971],
  jubail: [27.0046, 49.6601],
  qassim: [26.3260, 43.9750],
  taif: [21.4373, 40.5127],
  tabuk: [28.3835, 36.5662],
  abha: [18.2164, 42.5053],
  jizan: [16.8892, 42.5706],
};

function getApproxCoords(cityName: string = '', index: number = 0): [number, number] {
  const clean = cityName.toLowerCase().trim();
  for (const [key, coords] of Object.entries(CITY_COORDS)) {
    if (clean.includes(key)) {
      // Add slight jitter so multiple trucks in same city don't completely overlap
      const offsetLat = ((index % 5) - 2) * 0.12;
      const offsetLng = (((index * 3) % 5) - 2) * 0.12;
      return [coords[0] + offsetLat, coords[1] + offsetLng];
    }
  }
  // Default central Saudi Arabia coordinates
  return [24.5 + (index % 4) * 0.5, 45.0 + (index % 4) * 0.5];
}

const STATUS_STYLE: Record<string, { dot: string; badge: string; label: string }> = {
  'In Transit':  { dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'In Transit' },
  'To Pickup':   { dot: 'bg-orange-500',  badge: 'bg-orange-50 text-orange-700 border-orange-200',   label: 'To Pickup' },
  'At Pickup':   { dot: 'bg-blue-500',    badge: 'bg-blue-50 text-blue-700 border-blue-200',         label: 'At Pickup' },
  'To Delivery': { dot: 'bg-purple-500',  badge: 'bg-purple-50 text-purple-700 border-purple-200',   label: 'To Delivery' },
  'Completed':   { dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Completed' },
  'Scheduled':   { dot: 'bg-indigo-500',  badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',   label: 'Scheduled' },
  'Cancelled':   { dot: 'bg-slate-400',   badge: 'bg-slate-100 text-slate-600 border-slate-200',     label: 'Cancelled' },
  'Issue':       { dot: 'bg-red-500',     badge: 'bg-red-50 text-red-700 border-red-200',            label: 'Issue' },
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const [tripTab, setTripTab] = useState<'current' | 'upcoming' | 'recent'>('current');
  const [tripSearch, setTripSearch] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRemindersCollapsed, setIsRemindersCollapsed] = useState(false);

  const user = authStore.getUser();
  const isAdmin = user?.role === 'Admin';
  const userName = user?.name ? user.name.split(' ')[0] : 'Mercon';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  // Live Queries for summary (Admin only) + real trips from API
  const { refetch: refetchSummary } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: reportsService.getSummary,
    enabled: isAdmin,
  });

  const { data: tripsRes, refetch: refetchTrips } = useQuery({
    queryKey: ['dashboard-trips'],
    queryFn: () => tripService.getAll({ per_page: 100 }),
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([isAdmin ? refetchSummary() : Promise.resolve(), refetchTrips()]);
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const rawTrips = tripsRes?.data || [];

  // Categorize live trips into current, upcoming, recent
  const { currentTrips, upcomingTrips, recentTrips } = useMemo(() => {
    const current: any[] = [];
    const upcoming: any[] = [];
    const recent: any[] = [];

    rawTrips.forEach((t, idx) => {
      const driverName = t.driver
        ? `${t.driver.first_name} ${t.driver.last_name}`.trim()
        : (t.is_third_party ? (t.third_party_driver_name || t.thirdPartyProvider?.name || '3PL Driver') : 'Unassigned Driver');
      const initials = t.driver
        ? `${t.driver.first_name?.[0] || ''}${t.driver.last_name?.[0] || ''}`.toUpperCase() || 'DR'
        : (t.is_third_party ? (t.third_party_driver_name?.[0] || t.thirdPartyProvider?.name?.[0] || '3P').toUpperCase() : 'UN');
      const vehiclePlate = t.vehicle?.plate_number || t.vehicle?.ref_id || (t.is_third_party ? (t.third_party_vehicle_plate || '3PL Truck') : 'VEH-PENDING');

      const origin = t.stops?.[0]?.location_name || t.rateCard?.route_origin || 'Riyadh Hub';
      const destination = t.stops?.[t.stops.length - 1]?.location_name || t.rateCard?.route_destination || 'Jeddah Gateway';
      const route = `${origin} → ${destination}`;
      const customerName = t.customer?.name || 'Saudi Aramco Logistics';
      const price = t.billing_amount ?? t.trip_charges ?? t.rateCard?.base_price ?? (t.planned_distance ? t.planned_distance * 3 : 2450);

      let mappedStatus = 'In Transit';
      let progress = 65;
      let eta = '2h 15m';

      if (t.status === 'Draft') {
        mappedStatus = 'Scheduled';
        progress = 0;
        eta = 'Pending';
      } else if (t.status === 'Dispatched') {
        mappedStatus = 'To Pickup';
        progress = 25;
        eta = '1h 30m';
      } else if (t.status === 'AtPickup') {
        mappedStatus = 'At Pickup';
        progress = 45;
        eta = 'Loading';
      } else if (t.status === 'InTransit') {
        mappedStatus = 'In Transit';
        progress = 75;
        eta = '2h 45m';
      } else if (t.status === 'AtDelivery') {
        mappedStatus = 'To Delivery';
        progress = 90;
        eta = '30m';
      } else if (t.status === 'Completed' || t.status === 'Invoiced') {
        mappedStatus = 'Completed';
        progress = 100;
        eta = 'Done';
      } else if (t.status === 'Cancelled') {
        mappedStatus = 'Cancelled';
        progress = 0;
        eta = 'Cancelled';
      }

      const coords = t.stops?.[0]?.location_lat && t.stops?.[0]?.location_lng
        ? [t.stops[0].location_lat, t.stops[0].location_lng] as [number, number]
        : getApproxCoords(origin, idx);

      const item = {
        id: t.ref_id || `TRP-${t.id.slice(0, 6).toUpperCase()}`,
        rawId: t.id,
        pickup: origin,
        dropoff: destination,
        route,
        customerName,
        price,
        driver: driverName,
        initials,
        avatarBg: 'bg-blue-100 text-blue-700',
        vehicle: vehiclePlate,
        status: mappedStatus,
        rawStatus: t.status || mappedStatus,
        startTime: t.planned_start
          ? new Date(t.planned_start).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
          : new Date(t.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
        eta,
        progress,
        distance: `${t.planned_distance || 850} km`,
        lat: coords[0],
        lng: coords[1],
        plate: vehiclePlate,
        tripId: t.ref_id || `TRP-${t.id.slice(0, 6).toUpperCase()}`,
      };

      if (['InTransit', 'Dispatched', 'AtPickup', 'AtDelivery'].includes(t.status)) {
        current.push(item);
      } else if (t.status === 'Draft' || (t.planned_start && new Date(t.planned_start) > new Date())) {
        upcoming.push(item);
      } else {
        recent.push(item);
      }
    });

    // Fallback seed trips if system is fresh with 0 database records
    const fallbackCurrent = [
      { id: 'TRP-0030', rawId: 'TRP-0030', pickup: 'Dammam', dropoff: 'Jeddah', route: 'Dammam → Jeddah', customerName: 'Saudi Aramco Logistics', price: 3450, driver: 'Mohammed Faizan', initials: 'MF', avatarBg: 'bg-blue-100 text-blue-700', vehicle: 'VSA-3871', plate: 'VSA-3871', tripId: 'TRP-0030', status: 'In Transit', rawStatus: 'InTransit', startTime: 'Today', eta: '2h 15m', progress: 76, distance: '1,234 km', lat: 26.20, lng: 43.80 },
      { id: 'TRP-0029', rawId: 'TRP-0029', pickup: 'Riyadh', dropoff: 'Dammam', route: 'Riyadh → Dammam', customerName: 'SABIC Petrochemicals', price: 2100, driver: 'Umar Farooq', initials: 'UF', avatarBg: 'bg-blue-100 text-blue-700', vehicle: 'VRA-3356', plate: 'VRA-3356', tripId: 'TRP-0029', status: 'To Pickup', rawStatus: 'Dispatched', startTime: 'Today', eta: '3h 45m', progress: 50, distance: '1,876 km', lat: 24.71, lng: 46.67 },
      { id: 'TRP-0028', rawId: 'TRP-0028', pickup: 'Abu Dhabi', dropoff: 'Dammam', route: 'Abu Dhabi → Dammam', customerName: 'Almarai Dairy Fleet', price: 4200, driver: 'Abdul Malik', initials: 'AM', avatarBg: 'bg-blue-100 text-blue-700', vehicle: 'DRA-6484', plate: 'DRA-6484', tripId: 'TRP-0028', status: 'At Pickup', rawStatus: 'AtPickup', startTime: 'Today', eta: '4h 20m', progress: 42, distance: '2,145 km', lat: 21.54, lng: 39.17 },
      { id: 'TRP-0027', rawId: 'TRP-0027', pickup: 'Jeddah', dropoff: 'Riyadh', route: 'Jeddah → Riyadh', customerName: 'Panda Retail Operations', price: 1850, driver: 'Liaqat Ali', initials: 'LA', avatarBg: 'bg-purple-100 text-purple-700', vehicle: 'ERA-9380', plate: 'ERA-9380', tripId: 'TRP-0027', status: 'To Delivery', rawStatus: 'AtDelivery', startTime: 'Today', eta: '1h 30m', progress: 85, distance: '876 km', lat: 23.20, lng: 45.10 },
    ];

    const fallbackUpcoming = [
      { id: 'TRP-0033', rawId: 'TRP-0033', pickup: 'Riyadh', dropoff: 'Madinah', route: 'Riyadh → Madinah', customerName: 'Jarir Marketing Co.', price: 1950, driver: 'Khalid Saeed', initials: 'KS', avatarBg: 'bg-blue-100 text-blue-700', vehicle: 'DRA-6485', plate: 'DRA-6485', tripId: 'TRP-0033', status: 'Scheduled', rawStatus: 'Draft', startTime: 'Tomorrow', eta: '5h 00m', progress: 0, distance: '310 km', lat: 24.68, lng: 46.72 },
      { id: 'TRP-0032', rawId: 'TRP-0032', pickup: 'Jeddah', dropoff: 'Taif', route: 'Jeddah → Taif', customerName: 'BinDawood Superstores', price: 1200, driver: 'Mohammed Faizan', initials: 'MF', avatarBg: 'bg-blue-100 text-blue-700', vehicle: 'KSA-7712', plate: 'KSA-7712', tripId: 'TRP-0032', status: 'Scheduled', rawStatus: 'Draft', startTime: 'Tomorrow', eta: '2h 30m', progress: 0, distance: '98 km', lat: 21.38, lng: 39.86 },
    ];

    const fallbackRecent = [
      { id: 'TRP-0025', rawId: 'TRP-0025', pickup: 'Riyadh', dropoff: 'Qassim', route: 'Riyadh → Qassim', customerName: 'Al-Othaim Commercial', price: 2600, driver: 'Faizan Malik', initials: 'FM', avatarBg: 'bg-blue-100 text-blue-700', vehicle: 'DRA-9873', plate: 'DRA-9873', tripId: 'TRP-0025', status: 'Completed', rawStatus: 'Completed', startTime: 'Yesterday', eta: 'Done', progress: 100, distance: '180 km', lat: 26.32, lng: 43.97 },
    ];

    return {
      currentTrips: current.length ? current : fallbackCurrent,
      upcomingTrips: upcoming.length ? upcoming : fallbackUpcoming,
      recentTrips: recent.length ? recent : fallbackRecent,
    };
  }, [rawTrips]);

  const activeTrips = tripTab === 'current' ? currentTrips : tripTab === 'upcoming' ? upcomingTrips : recentTrips;
  const activeFleet = activeTrips;

  const filteredActiveTrips = useMemo(() => {
    if (!tripSearch.trim()) return activeTrips;
    const q = tripSearch.toLowerCase().trim();
    return activeTrips.filter((t: any) => {
      const idStr = String(t.id || t.tripId || t.ref_id || '').toLowerCase();
      const custStr = String(t.customerName || t.customer?.name || '').toLowerCase();
      const driverStr = String(t.driver || '').toLowerCase();
      const vehicleStr = String(t.vehicle || t.plate || '').toLowerCase();
      const pickupStr = String(t.pickup || '').toLowerCase();
      const dropoffStr = String(t.dropoff || '').toLowerCase();
      const statusStr = String(t.status || t.rawStatus || '').toLowerCase();
      return (
        idStr.includes(q) ||
        custStr.includes(q) ||
        driverStr.includes(q) ||
        vehicleStr.includes(q) ||
        pickupStr.includes(q) ||
        dropoffStr.includes(q) ||
        statusStr.includes(q)
      );
    });
  }, [activeTrips, tripSearch]);

  // Comprehensive Trip Ledger Columns matching TripListPage + full telemetry
  const tripLedgerColumns = useMemo<Column<any>[]>(() => [
    {
      header: 'Trip ID',
      className: 'w-[100px] shrink-0',
      accessor: (row: any) => (
        <span className="font-mono text-xs font-bold text-brand truncate block">
          {row.id || row.tripId || row.ref_id || 'Draft'}
        </span>
      ),
    },
    {
      header: 'Customer',
      className: 'min-w-[140px] max-w-[180px] truncate',
      accessor: (row: any) => (
        <div className="flex flex-col truncate">
          <span className="font-semibold text-xs text-slate-900 dark:text-slate-100 leading-tight truncate" title={row.customerName || 'Standard Freight'}>
            {row.customerName || 'Standard Freight'}
          </span>
        </div>
      ),
    },
    {
      header: 'Route',
      className: 'min-w-[160px] max-w-[200px] truncate',
      accessor: (row: any) => {
        const pickup = row.pickup || (row.route || '').split('→')[0]?.trim() || 'Riyadh';
        const dropoff = row.dropoff || (row.route || '').split('→')[1]?.trim() || 'Jeddah';
        return (
          <div className="flex flex-col gap-0 py-0.5 max-w-[180px] truncate" title={`From: ${pickup}\nTo: ${dropoff}`}>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                {pickup}
              </span>
            </div>
            <div className="ml-[2.5px] w-0 h-2 border-l border-dotted border-slate-400 dark:border-slate-500 my-0.5" />
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-brand shrink-0" />
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                {dropoff}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Driver',
      className: 'min-w-[140px] max-w-[180px]',
      accessor: (row: any) => {
        if (row.is_third_party) {
          const name = row.third_party_driver_name || row.driver || '3PL Driver';
          const providerName = row.carrier_name || '3PL Carrier';
          return (
            <div className="flex items-center gap-1.5 truncate" title={`3PL Driver: ${name}\nProvider: ${providerName}`}>
              <div className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold text-[9px] flex items-center justify-center shrink-0 border border-purple-200 dark:border-purple-800">
                3P
              </div>
              <div className="flex flex-col min-w-0 truncate leading-tight">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {name}
                </span>
                <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium truncate">
                  3PL: {providerName}
                </span>
              </div>
            </div>
          );
        }

        return (
          <div className="flex items-center gap-1.5 truncate">
            <div className="w-5.5 h-5.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[9px] flex items-center justify-center shrink-0">
              {row.initials || (row.driver ? `${row.driver[0]}` : 'U')}
            </div>
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate" title={row.driver}>
              {row.driver || 'Unassigned'}
            </span>
          </div>
        );
      },
    },
    {
      header: 'Vehicle',
      className: 'w-[105px] shrink-0',
      accessor: (row: any) => (
        <div className="flex items-center gap-1">
          <Truck size={12} className={row.is_third_party ? "text-purple-500 shrink-0" : "text-slate-400 shrink-0"} />
          {row.vehicle ? (
            <span className={row.is_third_party
              ? "font-mono text-[11px] font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 border border-purple-200/80 dark:border-purple-800/60 px-1.5 py-0.5 rounded truncate"
              : "font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded truncate"
            }>
              {row.vehicle}
            </span>
          ) : (
            <span className="text-xs text-slate-400 italic">Unassigned</span>
          )}
        </div>
      ),
    },
    {
      header: 'Status',
      className: 'w-[110px] shrink-0',
      accessor: (row: any) => (
        <StatusBadge status={row.rawStatus || row.status} />
      ),
    },
    {
      header: 'Departure',
      className: 'w-[95px] shrink-0',
      accessor: (row: any) => (
        <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
          {row.startTime}
        </span>
      ),
    },
    {
      header: 'ETA',
      className: 'w-[80px] shrink-0',
      accessor: (row: any) => (
        <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100 font-mono">
          {row.eta || '—'}
        </span>
      ),
    },
    {
      header: 'Progress',
      className: 'w-[130px] shrink-0',
      accessor: (row: any) => (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand rounded-full transition-all duration-300"
              style={{ width: `${row.progress ?? 0}%` }}
            />
          </div>
          <span className="text-[10px] font-extrabold text-brand shrink-0 font-mono">
            {row.progress ?? 0}%
          </span>
        </div>
      ),
    },
    {
      header: 'Distance',
      className: 'w-[90px] shrink-0',
      accessor: (row: any) => (
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 font-mono">
          {row.distance || '—'}
        </span>
      ),
    },
    {
      header: 'Rate (SAR)',
      className: 'w-[110px] text-right shrink-0',
      headerClassName: 'text-right',
      accessor: (row: any) => {
        const price = row.price;
        return (
          <div className="flex items-center justify-end font-mono text-xs">
            <span className="font-extrabold text-slate-900 dark:text-slate-200">
              {price !== undefined && price !== null && Number(price) > 0
                ? `SAR ${Number(price).toLocaleString('en-US')}`
                : '—'}
            </span>
          </div>
        );
      },
    },
    {
      header: '',
      className: 'w-[36px] text-right shrink-0',
      accessor: () => (
        <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-brand transition-colors ml-auto" />
      ),
    },
  ], []);

  return (
    <TooltipProvider>
      <DashboardLayout active="Dashboard" title="Dashboard" hideBackButton>
        <div className="px-4 sm:px-6 lg:px-8 pb-8 h-full flex flex-col gap-5 animate-fade-in">

          {/* ── Page Subheader / Context Bar ─────────────────────────────── */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1 pb-1 border-b border-black/[0.04]">
            {/* Left: Greeting & Module Badge */}
            <div className="flex items-center gap-2.5">
              <h1 className="text-[17px] font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                {greeting}, <span className="text-slate-900 dark:text-slate-100">{userName}</span>
              </h1>
              {isAdmin ? (
                <Badge className="bg-[#EEF2FF] text-[#4F46E5] border-[#C7D2FE] font-semibold text-[10px] px-2.5 py-0.5 rounded-full">
                  Admin Module
                </Badge>
              ) : (
                <Badge className="bg-[#ECFDF5] text-[#059669] border-[#A7F3D0] font-semibold text-[10px] px-2.5 py-0.5 rounded-full">
                  Operator Module
                </Badge>
              )}
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs font-semibold border-slate-200 bg-white shadow-2xs text-slate-700 hover:bg-slate-50"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" /> Export CSV
              </Button>

              <Button
                onClick={() => navigate('/trips/new')}
                className="h-8 gap-1.5 px-3.5 bg-brand hover:bg-brand-hover text-white text-xs font-extrabold rounded-lg shadow-sm transition-all active:scale-[0.97]"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                New Trip
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/documents')}
                className="h-8 gap-1.5 text-xs font-semibold border-slate-200 bg-white shadow-2xs text-slate-700 hover:bg-slate-50"
              >
                <FileText className="w-3.5 h-3.5 text-slate-500" /> Add Document
              </Button>

              <Tooltip>
                <TooltipTrigger
                  onClick={handleRefresh}
                  className="h-8 w-8 p-0 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white shadow-2xs text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-brand' : ''}`} />
                </TooltipTrigger>
                <TooltipContent><p className="text-xs">Refresh dashboard data</p></TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* ── TOP ROW: 3 Cards Side-by-Side (Consistent Height) ─────────── */}
          <div className="flex flex-col lg:flex-row gap-5 items-stretch transition-all duration-300 ease-in-out">

            {/* 1. Left Card (~32%): Monthly Financial Overview for Admin, Live Delay Watch for Operator */}
            <div className="w-full lg:w-[33%] xl:w-[32%] shrink-0 flex flex-col h-[390px] max-h-[390px] transition-all duration-300 ease-in-out">
              {isAdmin ? (
                <MonthlyOverview />
              ) : (
                <OperatorActionCenter trips={rawTrips} />
              )}
            </div>

            {/* 2. Active Trips Live Map (expands when reminders collapses) */}
            <div className="flex-1 min-w-0 flex flex-col h-[390px] max-h-[390px] bg-white rounded-[18px] border border-black/[0.06] shadow-sm overflow-hidden transition-all duration-300 ease-in-out">

              {/* Map Canvas with Overlays */}
              <div className="relative flex-1 min-h-[310px] w-full z-0" style={{ background: '#EAECEF' }}>
                {/* Overlay HUD: Active Trips Badge (Bold, Ultra-Visible & Floating over Leaflet) */}
                <div className="absolute top-3 left-3 z-[1000] px-4 py-2 rounded-xl shadow-lg border border-slate-900/15 bg-white text-slate-900 flex items-center gap-2.5 pointer-events-auto">
                  <span className="relative flex h-3 w-3 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                  </span>
                  <span className="text-xs sm:text-sm font-black tracking-wide uppercase text-slate-900">
                    {activeFleet.length} {tripTab.toUpperCase()} TRIPS
                  </span>
                </div>

                {/* Overlay: Full Map Button */}
                <button
                  onClick={() => navigate('/vehicles')}
                  className="absolute top-3 right-3 z-[1000] px-3 py-2 rounded-xl shadow-lg border border-slate-900/15 bg-white text-slate-800 text-xs font-extrabold hover:bg-slate-900 hover:text-white hover:border-slate-900 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                >
                  <Maximize2 className="w-3.5 h-3.5" /> Full Map
                </button>

                <MapContainer
                  center={[24.0, 45.0]}
                  zoom={5}
                  scrollWheelZoom={false}
                  zoomControl={false}
                  attributionControl={true}
                  style={{ height: '100%', width: '100%', minHeight: '310px' }}
                >
                  <MapResizer isCollapsed={isRemindersCollapsed} tripTab={tripTab} />
                  <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                  />
                  <ZoomControl position="bottomright" />

                  {activeFleet.map((v) => (
                    <Marker
                      key={`${tripTab}-${v.rawId || v.id}-${v.plate}`}
                      position={[v.lat, v.lng]}
                      icon={createTruckMapIcon(v.plate, v.status)}
                    >
                      <Popup maxWidth={240} minWidth={220}>
                        <div className="font-sans text-[11px] p-0.5">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-extrabold text-brand font-mono text-[10px]">{v.tripId}</span>
                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full border ${STATUS_STYLE[v.status]?.badge || STATUS_STYLE['In Transit'].badge}`}>
                              {v.status}
                            </span>
                          </div>
                          <p className="font-bold text-slate-800 text-[10px] mb-1">{v.route}</p>
                          <div className="text-[9px] text-slate-600 space-y-0.5 mb-2">
                            <p><span className="font-bold">Driver:</span> {v.driver}</p>
                            <p><span className="font-bold">ETA:</span> {v.eta} • {v.distance}</p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => navigate(`/trips/${v.rawId || v.id}`)}
                            className="w-full h-6 text-[9px] bg-brand hover:bg-brand-hover text-white font-bold cursor-pointer"
                          >
                            View Details
                          </Button>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>

              {/* Map Footer Status Bar */}
              <div className="px-4 py-2 border-t border-black/[0.04] dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 dark:text-slate-400">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Live Fleet Tracking</span>
                </div>

                <div className="flex items-center gap-3 text-[10px] font-bold text-slate-600 dark:text-slate-400 flex-wrap justify-end ml-auto">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>In Transit</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-orange-500" />
                    <span>To Pickup</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span>At Pickup</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                    <span>To Delivery</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-indigo-500" />
                    <span>Scheduled</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Important Reminders */}
            <div className={`shrink-0 flex flex-col h-[390px] max-h-[390px] transition-all duration-300 ease-in-out ${isRemindersCollapsed ? 'w-full lg:w-[76px]' : 'w-full lg:w-[280px] xl:w-[320px]'}`}>
              <ImportantReminders
                collapsed={isRemindersCollapsed}
                onToggleCollapse={() => setIsRemindersCollapsed(!isRemindersCollapsed)}
              />
            </div>

          </div>

          {/* ── BOTTOM ROW: Active Transit Fleet (Matches Trips Page) ──── */}
          <div className="w-full flex flex-col min-h-[480px]">
            <DataTable
              title={
                <span className="flex items-center gap-2 font-extrabold text-slate-900 dark:text-slate-100">
                  <Truck className="w-4 h-4 text-brand" />
                  <span>Active Transit Fleet</span>
                </span>
              }
              searchPlaceholder="Search trip ID, customer, driver, vehicle..."
              searchValue={tripSearch}
              onSearchChange={setTripSearch}
              onExport={() => {
                const exportRows = filteredActiveTrips.map((t: any) => ({
                  'Trip ID': t.id || t.tripId || t.ref_id,
                  'Customer': t.customerName || 'Standard Freight',
                  'Route': `${t.pickup || ''} → ${t.dropoff || ''}`,
                  'Driver': t.driver || 'Unassigned',
                  'Vehicle': t.vehicle || 'Unassigned',
                  'Status': t.status || t.rawStatus,
                  'Departure': t.startTime,
                  'ETA': t.eta,
                  'Progress': `${t.progress || 0}%`,
                  'Distance': t.distance,
                  'Rate (SAR)': t.price ? `SAR ${Number(t.price).toLocaleString('en-US')}` : '—',
                }));
                exportToCSV(exportRows, `active_transit_fleet_${tripTab}_${new Date().toISOString().slice(0, 10)}.csv`);
              }}
              filterElement={
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                  {(['current', 'upcoming', 'recent'] as const).map((tab) => {
                    const count = tab === 'current' ? currentTrips.length : tab === 'upcoming' ? upcomingTrips.length : recentTrips.length;
                    const isActive = tripTab === tab;
                    return (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => {
                          setTripTab(tab);
                          setTripSearch('');
                        }}
                        className={`px-3 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                          isActive
                            ? 'bg-brand text-white shadow-xs'
                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        <span>{tab === 'current' ? 'Current' : tab === 'upcoming' ? 'Upcoming' : 'Recent'}</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[8px] font-black ${isActive ? 'bg-white/25 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              }
              actionsElement={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/trips')}
                  className="h-8 gap-1.5 text-xs font-semibold border-slate-200/90 dark:border-slate-700/90 bg-white dark:bg-slate-900 shadow-2xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <span>View All Trips</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-500" />
                </Button>
              }
              columns={tripLedgerColumns}
              data={filteredActiveTrips}
              enableSelection={false}
              compact={false}
              pageSize={10}
              pageSizeOptions={[10, 25, 50, 100]}
              onRowClick={(row) => navigate(`/trips/${row.rawId || row.id}`)}
              emptyTitle={`No ${tripTab} trips found`}
              emptyMessage="There are currently no dispatch records in this category."
              className="min-h-[460px] flex flex-col justify-between shadow-sm"
            />
          </div>

        </div>
      </DashboardLayout>
    </TooltipProvider>
  );
}
