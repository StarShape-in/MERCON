import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Plus, FileText, Bell, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Eye, Phone, ChevronDown, DollarSign, AlertTriangle, ArrowUpRight,
  ShieldCheck, Clock, RotateCw, Download, Navigation, Maximize2
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import ImportantReminders from '@/components/dashboard/ImportantReminders';
import MonthlyOverview from '@/components/dashboard/MonthlyOverview';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { authStore } from '@/store/authStore';
import { reportsService } from '@/services/reportsService';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ─── Rich 3D-truck icon (mirrors VehicleListPage exactly) ──────────────────
function createTruckMapIcon(plate: string, status: string) {
  let imgFilter = '';
  let glowColor = 'rgba(100,116,139,0.4)';
  let borderColor = '#94A3B8';
  let ping = false;
  let badgeBg = '#64748B';

  if (status === 'In Transit') {
    imgFilter = 'hue-rotate(100deg) saturate(1.3) brightness(0.95) drop-shadow(0 4px 6px rgba(0,0,0,0.25))';
    glowColor  = 'rgba(16,185,129,0.65)';
    borderColor = '#10B981';
    badgeBg    = '#10B981';
    ping       = true;
  } else if (status === 'To Pickup') {
    imgFilter = 'hue-rotate(30deg) saturate(1.5) brightness(0.95) drop-shadow(0 4px 6px rgba(0,0,0,0.25))';
    glowColor  = 'rgba(249,115,22,0.65)';
    borderColor = '#F97316';
    badgeBg    = '#F97316';
    ping       = true;
  } else if (status === 'At Pickup') {
    imgFilter = 'hue-rotate(200deg) saturate(1.2) brightness(0.95) drop-shadow(0 4px 6px rgba(0,0,0,0.25))';
    glowColor  = 'rgba(59,130,246,0.65)';
    borderColor = '#3B82F6';
    badgeBg    = '#3B82F6';
    ping       = true;
  } else if (status === 'To Delivery') {
    imgFilter = 'hue-rotate(260deg) saturate(1.4) brightness(0.9) drop-shadow(0 4px 6px rgba(0,0,0,0.25))';
    glowColor  = 'rgba(139,92,246,0.65)';
    borderColor = '#8B5CF6';
    badgeBg    = '#8B5CF6';
    ping       = true;
  } else if (status === 'Issue' || status === 'Maintenance') {
    imgFilter = 'hue-rotate(335deg) saturate(2) brightness(0.85) drop-shadow(0 4px 6px rgba(0,0,0,0.25))';
    glowColor  = 'rgba(220,38,38,0.65)';
    borderColor = '#DC2626';
    badgeBg    = '#DC2626';
  }

  const svgHtml = `
    <div style="position:relative;width:58px;height:62px;display:flex;flex-direction:column;align-items:center;justify-content:center;">
      ${ping ? `<div class="animate-ping" style="position:absolute;width:36px;height:36px;border-radius:50%;background-color:${glowColor};opacity:0.35;z-index:1;"></div>` : ''}
      <div style="position:relative;z-index:2;transform:translateY(-3px);width:46px;height:46px;">
        <img
          src="/truck_3d_orange_transparent.png"
          alt="truck"
          style="width:100%;height:100%;object-fit:contain;filter:${imgFilter};"
        />
      </div>
      <div style="position:absolute;bottom:0px;background:white;color:${borderColor};font-family:monospace;font-size:8px;font-weight:800;padding:1.5px 5px;border-radius:4px;white-space:nowrap;border:1.5px solid ${borderColor};box-shadow:0 2px 6px rgba(0,0,0,0.18);z-index:3;">
        ${plate}
      </div>
    </div>
  `;
  return L.divIcon({ html: svgHtml, className: '', iconSize: [58, 62], iconAnchor: [29, 31] });
}

// ─── Tab-specific fleet & trip datasets ─────────────────────────────────────

// Current — vehicles actively moving right now
const MAP_FLEET_CURRENT = [
  { plate: 'VSA-3871', status: 'In Transit',  lat: 26.10, lng: 44.30, driver: 'Mohammed F.', route: 'Dammam → Jeddah',    tripId: 'TRP-0030', eta: '2h 15m', progress: 76, distance: '122 KM' },
  { plate: 'VRA-3358', status: 'To Pickup',   lat: 24.71, lng: 46.67, driver: 'Umar Farooq', route: 'Riyadh → Dammam',    tripId: 'TRP-0029', eta: '3h 45m', progress: 50, distance: '190 KM' },
  { plate: 'DRA-6484', status: 'At Pickup',   lat: 21.54, lng: 39.17, driver: 'Abdul Malik', route: 'Abu Dhabi → Dammam', tripId: 'TRP-0028', eta: '4h 20m', progress: 42, distance: '256 KM' },
  { plate: 'ERA-9380', status: 'To Delivery', lat: 23.10, lng: 45.30, driver: 'Liaqat Ali',  route: 'Jeddah → Riyadh',    tripId: 'TRP-0027', eta: '1h 30m', progress: 85, distance: '86 KM'  },
  { plate: 'VRA-5510', status: 'In Transit',  lat: 26.32, lng: 50.10, driver: 'Kashif Ali',  route: 'Dammam → Riyadh',    tripId: 'TRP-0026', eta: '2h 50m', progress: 63, distance: '165 KM' },
];

// Upcoming — vehicles staged or en-route to start point
const MAP_FLEET_UPCOMING = [
  { plate: 'DRA-6485', status: 'To Pickup', lat: 24.68, lng: 46.72, driver: 'Khalid S.',    route: 'Riyadh → Madinah', tripId: 'TRP-0033', eta: '5h 00m', progress: 0, distance: '310 KM' },
  { plate: 'KSA-7712', status: 'To Pickup', lat: 21.38, lng: 39.86, driver: 'Faizan M.',    route: 'Jeddah → Taif',    tripId: 'TRP-0032', eta: '2h 30m', progress: 0, distance: '98 KM'  },
  { plate: 'ERA-3531', status: 'To Pickup', lat: 19.50, lng: 40.50, driver: 'Omar K.',      route: 'Yanbu → Madinah',  tripId: 'TRP-0031', eta: '1h 50m', progress: 0, distance: '200 KM' },
];

// Recent — completed trips (greyed out / Maintenance style)
const MAP_FLEET_RECENT = [
  { plate: 'VTA-8821', status: 'Maintenance', lat: 23.50, lng: 46.00, driver: 'In Workshop', route: 'Completed', tripId: 'TRP-0022', eta: 'Done', progress: 100, distance: '—'      },
  { plate: 'DRA-3309', status: 'Maintenance', lat: 26.21, lng: 50.20, driver: 'Saeed A.',    route: 'Completed', tripId: 'TRP-0023', eta: 'Done', progress: 100, distance: '97 KM'  },
  { plate: 'VTA-2241', status: 'Maintenance', lat: 18.30, lng: 42.73, driver: 'Akram Y.',    route: 'Completed', tripId: 'TRP-0024', eta: 'Done', progress: 100, distance: '214 KM' },
  { plate: 'DRA-9873', status: 'Maintenance', lat: 22.00, lng: 45.00, driver: 'Bilal R.',    route: 'Completed', tripId: 'TRP-0025', eta: 'Done', progress: 100, distance: '180 KM' },
];

const STATUS_STYLE: Record<string, { dot: string; badge: string; label: string }> = {
  'In Transit':  { dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'In Transit' },
  'To Pickup':   { dot: 'bg-orange-500',  badge: 'bg-orange-50 text-orange-700 border-orange-200',   label: 'To Pickup' },
  'At Pickup':   { dot: 'bg-blue-500',    badge: 'bg-blue-50 text-blue-700 border-blue-200',         label: 'At Pickup' },
  'To Delivery': { dot: 'bg-violet-500',  badge: 'bg-violet-50 text-violet-700 border-violet-200',   label: 'To Delivery' },
  'Issue':       { dot: 'bg-red-500',     badge: 'bg-red-50 text-red-700 border-red-200',            label: 'Issue' },
  'Maintenance': { dot: 'bg-slate-300',   badge: 'bg-slate-100 text-slate-500 border-slate-200',     label: 'Completed' },
};

// Ledger rows per tab
const TRIPS_CURRENT = [
  { id: 'TRP-0030', route: 'Dammam → Jeddah',    driver: 'Mohammed Faizan', initials: 'MF', vehicle: 'VSA-3871', status: 'In Transit',  startTime: '08:30 AM', eta: '2h 15m', progress: 76, distance: '122 KM' },
  { id: 'TRP-0029', route: 'Riyadh → Dammam',    driver: 'Umar Farooq',    initials: 'UF', vehicle: 'VRA-3358', status: 'To Pickup',   startTime: '07:45 AM', eta: '3h 45m', progress: 50, distance: '190 KM' },
  { id: 'TRP-0028', route: 'Abu Dhabi → Dammam', driver: 'Abdul Malik',    initials: 'AM', vehicle: 'DRA-6484', status: 'At Pickup',   startTime: '07:10 AM', eta: '4h 20m', progress: 42, distance: '256 KM' },
  { id: 'TRP-0027', route: 'Jeddah → Riyadh',    driver: 'Liaqat Ali',     initials: 'LA', vehicle: 'ERA-9380', status: 'To Delivery', startTime: '09:15 AM', eta: '1h 30m', progress: 85, distance: '86 KM' },
  { id: 'TRP-0026', route: 'Dammam → Riyadh',    driver: 'Kashif Ali',     initials: 'KA', vehicle: 'VRA-5510', status: 'In Transit',  startTime: '06:50 AM', eta: '2h 50m', progress: 63, distance: '165 KM' },
];

const TRIPS_UPCOMING = [
  { id: 'TRP-0033', route: 'Riyadh → Madinah',   driver: 'Khalid Saeed',   initials: 'KS', vehicle: 'DRA-6485', status: 'To Pickup',   startTime: '11:00 AM', eta: '5h 00m', progress: 0,  distance: '310 KM' },
  { id: 'TRP-0032', route: 'Jeddah → Taif',      driver: 'Mohammed Faizan',initials: 'MF', vehicle: 'KSA-7712', status: 'To Pickup',   startTime: '12:30 PM', eta: '2h 30m', progress: 0,  distance: '98 KM'  },
  { id: 'TRP-0031', route: 'Yanbu → Madinah',    driver: 'Omar Khatri',    initials: 'OK', vehicle: 'ERA-3531', status: 'To Pickup',   startTime: '01:45 PM', eta: '1h 50m', progress: 0,  distance: '200 KM' },
];

const TRIPS_RECENT = [
  { id: 'TRP-0025', route: 'Riyadh → Qassim',    driver: 'Faizan Malik',   initials: 'FM', vehicle: 'DRA-9873', status: 'Maintenance', startTime: '04:00 AM', eta: 'Done',   progress: 100, distance: '180 KM' },
  { id: 'TRP-0024', route: 'Jizan → Abha',       driver: 'Akram Yousuf',   initials: 'AY', vehicle: 'VTA-2241', status: 'Maintenance', startTime: '03:15 AM', eta: 'Done',   progress: 100, distance: '214 KM' },
  { id: 'TRP-0023', route: 'Dammam → Jubail',    driver: 'Saeed Anwar',    initials: 'SA', vehicle: 'DRA-3309', status: 'Maintenance', startTime: '02:50 AM', eta: 'Done',   progress: 100, distance: '97 KM'  },
  { id: 'TRP-0022', route: 'Riyadh → Workshop',  driver: 'In Workshop',    initials: 'IW', vehicle: 'VTA-8821', status: 'Maintenance', startTime: '01:00 AM', eta: 'Done',   progress: 100, distance: '—'      },
];

const DONUT_DATA = [
  { name: 'Fuel',        value: 6420 },
  { name: 'Maintenance', value: 4230 },
  { name: 'Labor',       value: 2120 },
  { name: 'Other',       value: 1550 },
];

const REMINDERS = [
  { count: 3, label: 'Licenses\nExpiring',     period: 'This Month', color: 'text-slate-900',  bg: 'bg-slate-50',    border: 'border-slate-200',  icon: ShieldCheck, iconColor: 'text-slate-500'  },
  { count: 2, label: 'Inspections\nDue',        period: 'This Week',  color: 'text-orange-500', bg: 'bg-orange-50/50', border: 'border-orange-200', icon: AlertTriangle, iconColor: 'text-orange-500' },
  { count: 2, label: 'Insurance\nRenewals',     period: 'This Month', color: 'text-emerald-500',bg: 'bg-emerald-50/50',border: 'border-emerald-200',icon: ShieldCheck, iconColor: 'text-emerald-500'},
  { count: 1, label: 'Documents\nExpiring',     period: 'This Week',  color: 'text-slate-900',  bg: 'bg-slate-50',    border: 'border-slate-200',  icon: Clock, iconColor: 'text-slate-500'       },
];

// ─── Component ──────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const navigate = useNavigate();
  const [tripTab, setTripTab] = useState<'current' | 'upcoming' | 'recent'>('current');
  const [chartPeriod, setChartPeriod] = useState<'monthly' | '6months' | 'yearly'>('monthly');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Derived data — changes whenever the tab changes
  const activeFleet = tripTab === 'current' ? MAP_FLEET_CURRENT : tripTab === 'upcoming' ? MAP_FLEET_UPCOMING : MAP_FLEET_RECENT;
  const activeTrips = tripTab === 'current' ? TRIPS_CURRENT     : tripTab === 'upcoming' ? TRIPS_UPCOMING     : TRIPS_RECENT;

  const { refetch } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: reportsService.getSummary,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const user = authStore.getUser();
  const userName = user?.name ? user.name.split(' ')[0] : 'Operator';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <TooltipProvider>
      <DashboardLayout active="Dashboard" title="Dashboard" hideBackButton>
        <div className="px-4 sm:px-6 lg:px-8 pb-8 h-full flex flex-col gap-5 animate-fade-in">

          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1 pb-1 border-b border-black/[0.05]">
            {/* Left: title */}
            <div className="flex items-center gap-2">
              <h1 className="text-[17px] font-extrabold text-slate-900 tracking-tight">
                {`${greeting}, `}<span className="text-[#E8450F]">{userName}</span> 👋
              </h1>
              <Badge className="bg-indigo-50 text-indigo-600 border-indigo-200 font-semibold text-[10px]">
                Operations Module
              </Badge>
            </div>

            {/* Right: actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs font-semibold border-slate-200 bg-white shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" /> Export CSV
              </Button>

              <Button
                onClick={() => navigate('/trips/new')}
                className="h-8 gap-1.5 px-4 bg-[#E8450F] hover:bg-[#C7380A] text-white text-xs font-extrabold rounded-lg shadow-sm transition-all active:scale-[0.97]"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                New Trip
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs font-semibold border-slate-200 bg-white shadow-2xs"
              >
                <FileText className="w-3.5 h-3.5 text-slate-500" /> Add Document
              </Button>

              <Tooltip>
                <TooltipTrigger
                  onClick={handleRefresh}
                  className="h-8 w-8 p-0 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white shadow-2xs text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                </TooltipTrigger>
                <TooltipContent><p className="text-xs">Refresh dashboard data</p></TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* ── Main 2-Column Grid ───────────────────────────────────────── */}
          <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-5 pb-4">

            {/* ━━━━ LEFT COLUMN (4/12) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
            <div className="xl:col-span-4 flex flex-col gap-5">

              {/* ━━━━ 2. Monthly Overview Financial Component ━━━━ */}
              <MonthlyOverview />

              {/* ── 3. Important Reminders ───────────────────────────── */}
              <ImportantReminders />
            </div>

            {/* ━━━━ RIGHT COLUMN (8/12) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
            <div className="xl:col-span-8 flex flex-col gap-5">

              {/* ── 4. Active Trips Live Map ─────────────────────────── */}
              <div className="bg-white rounded-[18px] border border-black/[0.06] shadow-sm overflow-hidden flex flex-col">
                {/* Map header */}
                <div className="px-5 py-3.5 border-b border-black/[0.04] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60">
                  <div className="flex items-center gap-3">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-indigo-500 leading-none">{activeFleet.length}</span>
                      <span className="text-base font-semibold text-slate-700 leading-none">Active Trips</span>
                    </div>
                  </div>

                  {/* Status legend */}
                  <div className="flex flex-wrap items-center gap-3 text-[9px] font-bold text-slate-500">
                    {Object.entries(STATUS_STYLE).slice(0, 5).map(([key, s]) => (
                      <div key={key} className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${s.dot}`} />
                        {s.label}
                      </div>
                    ))}
                    <button
                      className="ml-1 flex items-center gap-1 px-2 py-1 rounded-lg border border-black/[0.08] bg-white text-[9px] font-extrabold text-slate-600 hover:bg-slate-50 shadow-2xs"
                      onClick={() => navigate('/vehicles')}
                    >
                      <Maximize2 className="w-3 h-3" /> Full Map
                    </button>
                  </div>
                </div>

                {/* Map canvas */}
                <div className="h-[360px] w-full relative z-0" style={{ background: '#F4F5F7' }}>
                  <MapContainer
                    center={[23.5, 44.5]}
                    zoom={5}
                    scrollWheelZoom={true}
                    zoomControl={false}
                    attributionControl={false}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                      attribution="&copy; OpenStreetMap contributors &copy; CARTO"
                    />
                    {activeFleet.map((v, i) => (
                      <Marker
                        key={i}
                        position={[v.lat, v.lng]}
                        icon={createTruckMapIcon(v.plate, v.status)}
                      >
                        <Popup maxWidth={260} minWidth={240}>
                          <div className="font-sans" style={{ minWidth: '230px', fontSize: '11px' }}>

                            {/* Header: Trip ID + status */}
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[10px] font-extrabold text-[#E8450F] font-mono">{v.tripId}</span>
                              <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-full border ${STATUS_STYLE[v.status]?.badge || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                {STATUS_STYLE[v.status]?.label || v.status}
                              </span>
                            </div>

                            {/* Route */}
                            <p className="text-[10px] font-bold text-slate-700 mb-1.5 truncate">{v.route}</p>

                            {/* Data row: plate · driver · ETA · dist */}
                            <div className="grid grid-cols-4 gap-1 mb-1.5">
                              {[
                                { label: 'Plate',   value: v.plate },
                                { label: 'Driver',  value: v.driver },
                                { label: 'ETA',     value: v.eta },
                                { label: 'Dist',    value: v.distance },
                              ].map(({ label, value }) => (
                                <div key={label} className="bg-slate-50 rounded p-1 min-w-0">
                                  <p className="text-[7px] font-extrabold text-slate-400 uppercase tracking-wider leading-none mb-0.5">{label}</p>
                                  <p className="text-[8px] font-bold text-slate-800 truncate leading-none">{value}</p>
                                </div>
                              ))}
                            </div>

                            {/* Progress bar */}
                            <div className="flex items-center gap-1.5 mb-2">
                              <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-indigo-500" style={{ width: `${v.progress}%` }} />
                              </div>
                              <span className="text-[8px] font-extrabold text-blue-600 shrink-0">{v.progress}%</span>
                            </div>

                            {/* CTA buttons */}
                            <div className="flex gap-1.5">
                              <button
                                className="flex-1 h-6 rounded bg-[#E8450F] hover:bg-[#C7380A] text-white text-[9px] font-extrabold flex items-center justify-center gap-1 transition-colors"
                                onClick={() => navigate(`/trips/${v.tripId}`)}
                              >
                                <Eye className="w-2.5 h-2.5" /> View Details
                              </button>
                              <button
                                className="h-6 px-2 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-[9px] font-extrabold flex items-center justify-center gap-1 transition-colors"
                                onClick={() => navigate(`/trips/${v.tripId}/track`)}
                              >
                                <Navigation className="w-2.5 h-2.5" /> Track
                              </button>
                            </div>

                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>

                  {/* Fleet count HUD */}
                  <div className="absolute top-3 left-3 z-[400] px-3 py-1.5 rounded-xl shadow-md border bg-white/90 backdrop-blur-xl border-black/[0.08] text-xs flex items-center gap-2 font-mono font-bold text-slate-800">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    {activeFleet.length} VEHICLES IN RANGE
                  </div>
                </div>
              </div>

              {/* ── 5. Active Transit Overview Table ─────────────────── */}
              <div className="bg-white rounded-[18px] border border-black/[0.06] shadow-sm overflow-hidden flex flex-col">
                {/* Table header */}
                <div className="px-5 py-3.5 border-b border-black/[0.04] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
                        Active Transit Overview
                      </span>
                      <Badge className="bg-emerald-50 text-emerald-600 border-emerald-200 text-[9px] font-extrabold px-2">
                        {activeTrips.length} {tripTab === 'recent' ? 'Completed' : tripTab === 'upcoming' ? 'Upcoming' : 'Active'}
                      </Badge>
                    </div>
                    <p className="text-[9px] text-slate-400 font-medium mt-0.5">Real-time overview of all active trips</p>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Tab pills */}
                    <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/80">
                      {(['current', 'upcoming', 'recent'] as const).map(tab => (
                        <button
                          key={tab}
                          onClick={() => setTripTab(tab)}
                          className={`px-2.5 py-1 rounded-md text-[9px] font-extrabold uppercase tracking-wider transition-all ${
                            tripTab === tab
                              ? 'bg-[#E8450F] text-white shadow-sm'
                              : 'text-slate-500 hover:text-slate-900'
                          }`}
                        >
                          {tab === 'current' ? 'Current' : tab === 'upcoming' ? 'Upcoming' : 'Recent'}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => navigate('/trips')}
                      className="text-[10px] font-extrabold text-[#E8450F] hover:underline flex items-center gap-0.5 whitespace-nowrap"
                    >
                      View Full Dispatch Map <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/40">
                        {['Trip ID', 'Route', 'Driver', 'Vehicle', 'Status', 'Start Time', 'ETA', 'Progress', 'Distance', 'Actions'].map(h => (
                          <th key={h} className="px-4 py-2.5 text-left text-[9px] font-extrabold uppercase tracking-widest text-slate-400">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {activeTrips.map((trip, i) => {
                        const s = STATUS_STYLE[trip.status] || STATUS_STYLE['In Transit'];
                        return (
                          <tr
                            key={i}
                            className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                            onClick={() => navigate('/trips')}
                          >
                            {/* Trip ID */}
                            <td className="px-4 py-3">
                              <span className="text-[11px] font-extrabold text-[#E8450F] font-mono">{trip.id}</span>
                            </td>

                            {/* Route */}
                            <td className="px-4 py-3">
                              <span className="text-[11px] font-bold text-slate-700">{trip.route}</span>
                            </td>

                            {/* Driver */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                <div className="w-6 h-6 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[9px] font-extrabold text-indigo-600 shrink-0">
                                  {trip.initials}
                                </div>
                                <span className="text-[11px] font-bold text-slate-700">{trip.driver}</span>
                              </div>
                            </td>

                            {/* Vehicle */}
                            <td className="px-4 py-3">
                              <Badge variant="outline" className="text-[9px] font-extrabold font-mono bg-slate-50 border-slate-200 text-slate-600">
                                {trip.vehicle}
                              </Badge>
                            </td>

                            {/* Status */}
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${s.badge}`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                                {trip.status}
                              </span>
                            </td>

                            {/* Start Time */}
                            <td className="px-4 py-3">
                              <span className="text-[10px] font-bold text-slate-500">11 May, {trip.startTime}</span>
                            </td>

                            {/* ETA */}
                            <td className="px-4 py-3">
                              <span className="text-[11px] font-extrabold text-slate-800">{trip.eta}</span>
                            </td>

                            {/* Progress */}
                            <td className="px-4 py-3 w-32">
                              <div className="flex items-center gap-2">
                                <Progress value={trip.progress} className="h-1.5 w-16 bg-slate-100" />
                                <span className="text-[10px] font-extrabold text-blue-600">{trip.progress}%</span>
                              </div>
                            </td>

                            {/* Distance */}
                            <td className="px-4 py-3">
                              <span className="text-[10px] font-bold text-slate-600">{trip.distance}</span>
                            </td>

                            {/* Actions */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                                <Tooltip>
                                  <TooltipTrigger className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors cursor-pointer">
                                    <Eye className="w-3.5 h-3.5" />
                                  </TooltipTrigger>
                                  <TooltipContent><p className="text-xs">View trip details</p></TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 transition-colors cursor-pointer">
                                    <Phone className="w-3.5 h-3.5" />
                                  </TooltipTrigger>
                                  <TooltipContent><p className="text-xs">Call driver</p></TooltipContent>
                                </Tooltip>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/40">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                    <span>Rows per page:</span>
                    <select className="border-none bg-transparent outline-none font-extrabold text-slate-900 cursor-pointer text-[10px]">
                      <option>10</option>
                      <option>25</option>
                    </select>
                    <span className="ml-2 text-slate-400">Showing 1–{activeTrips.length} of {activeTrips.length} entries</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {[ChevronsLeft, ChevronLeft].map((Icon, i) => (
                      <Button key={i} variant="outline" size="sm" className="h-6 w-6 p-0 border-slate-200 text-slate-400 bg-white">
                        <Icon className="w-3 h-3" />
                      </Button>
                    ))}
                    {[1, 2, 3].map(p => (
                      <Button
                        key={p}
                        variant="outline"
                        size="sm"
                        className={`h-6 w-6 p-0 text-[10px] font-extrabold border-slate-200 ${p === 1 ? 'bg-[#E8450F] text-white border-[#E8450F] hover:bg-[#C7380A]' : 'bg-white text-slate-500'}`}
                      >
                        {p}
                      </Button>
                    ))}
                    {[ChevronRight, ChevronsRight].map((Icon, i) => (
                      <Button key={i} variant="outline" size="sm" className="h-6 w-6 p-0 border-slate-200 text-slate-400 bg-white">
                        <Icon className="w-3 h-3" />
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </DashboardLayout>
    </TooltipProvider>
  );
}
