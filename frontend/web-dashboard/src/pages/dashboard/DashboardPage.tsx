import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Plus,
  FileText,
  RotateCw,
  Download,
  Maximize2,
  ArrowUpRight,
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import ImportantReminders from '@/components/dashboard/ImportantReminders';
import MonthlyOverview from '@/components/dashboard/MonthlyOverview';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { authStore } from '@/store/authStore';
import { reportsService } from '@/services/reportsService';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ─── Leaflet Map Auto-Resizer when Panels Expand/Collapse ───────────────────
function MapResizer({ isCollapsed }: { isCollapsed: boolean }) {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const t1 = setTimeout(() => map.invalidateSize(), 150);
    const t2 = setTimeout(() => map.invalidateSize(), 350);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isCollapsed, map]);
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

// ─── Fleet Datasets for Map ────────────────────────────────────────────────
const MAP_FLEET_CURRENT = [
  { plate: 'VSA-3871', status: 'In Transit',  lat: 26.20, lng: 43.80, driver: 'Mohammed Faizan', route: 'Dammam → Jeddah',    tripId: 'TRP-0030', eta: '2h 15m', progress: 76, distance: '1,234 km' },
  { plate: 'VRA-3356', status: 'To Pickup',   lat: 24.71, lng: 46.67, driver: 'Umar Farooq',    route: 'Riyadh → Dammam',    tripId: 'TRP-0029', eta: '3h 45m', progress: 50, distance: '1,876 km' },
  { plate: 'DRA-6484', status: 'At Pickup',   lat: 21.54, lng: 39.17, driver: 'Abdul Malik',    route: 'Abu Dhabi → Dammam', tripId: 'TRP-0028', eta: '4h 20m', progress: 42, distance: '2,145 km' },
  { plate: 'ERA-9380', status: 'To Delivery', lat: 23.20, lng: 45.10, driver: 'Liaqat Ali',     route: 'Jeddah → Riyadh',    tripId: 'TRP-0027', eta: '1h 30m', progress: 85, distance: '876 km'   },
  { plate: 'VRA-5510', status: 'In Transit',  lat: 26.32, lng: 50.10, driver: 'Kashif Ali',     route: 'Dammam → Riyadh',    tripId: 'TRP-0026', eta: '2h 50m', progress: 63, distance: '1,567 km' },
];

const MAP_FLEET_UPCOMING = [
  { plate: 'DRA-6485', status: 'To Pickup', lat: 24.68, lng: 46.72, driver: 'Khalid Saeed', route: 'Riyadh → Madinah', tripId: 'TRP-0033', eta: '5h 00m', progress: 0, distance: '310 km' },
  { plate: 'KSA-7712', status: 'To Pickup', lat: 21.38, lng: 39.86, driver: 'Mohammed Faizan', route: 'Jeddah → Taif', tripId: 'TRP-0032', eta: '2h 30m', progress: 0, distance: '98 km' },
];

const MAP_FLEET_RECENT = [
  { plate: 'DRA-9873', status: 'In Transit', lat: 22.00, lng: 45.00, driver: 'Faizan Malik', route: 'Riyadh → Qassim', tripId: 'TRP-0025', eta: 'Done', progress: 100, distance: '180 km' },
];

const STATUS_STYLE: Record<string, { dot: string; badge: string; label: string }> = {
  'In Transit':  { dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'In Transit' },
  'To Pickup':   { dot: 'bg-orange-500',  badge: 'bg-orange-50 text-orange-700 border-orange-200',   label: 'To Pickup' },
  'At Pickup':   { dot: 'bg-blue-500',    badge: 'bg-blue-50 text-blue-700 border-blue-200',         label: 'At Pickup' },
  'To Delivery': { dot: 'bg-purple-500',  badge: 'bg-purple-50 text-purple-700 border-purple-200',   label: 'To Delivery' },
  'Issue':       { dot: 'bg-red-500',     badge: 'bg-red-50 text-red-700 border-red-200',            label: 'Issue' },
};

// ─── Trips Table Rows ───────────────────────────────────────────────────────
const TRIPS_CURRENT = [
  { id: 'TRP-0030', route: 'Dammam → Jeddah',    driver: 'Mohammed Faizan', initials: 'MF', avatarBg: 'bg-blue-100 text-blue-700', vehicle: 'VSA-3871', status: 'In Transit',  startTime: '11 May, 08:30 AM', eta: '2h 15m', progress: 76, distance: '1,234 km' },
  { id: 'TRP-0029', route: 'Riyadh → Dammam',    driver: 'Umar Farooq',    initials: 'UF', avatarBg: 'bg-blue-100 text-blue-700', vehicle: 'VRA-3358', status: 'To Pickup',   startTime: '11 May, 07:45 AM', eta: '3h 45m', progress: 50, distance: '1,876 km' },
  { id: 'TRP-0028', route: 'Abu Dhabi → Dammam', driver: 'Abdul Malik',    initials: 'AM', avatarBg: 'bg-blue-100 text-blue-700', vehicle: 'DRA-6484', status: 'At Pickup',   startTime: '11 May, 07:10 AM', eta: '4h 20m', progress: 42, distance: '2,145 km' },
  { id: 'TRP-0027', route: 'Jeddah → Riyadh',    driver: 'Liaqat Ali',     initials: 'LA', avatarBg: 'bg-purple-100 text-purple-700', vehicle: 'ERA-9380', status: 'To Delivery', startTime: '11 May, 09:15 AM', eta: '1h 30m', progress: 85, distance: '876 km' },
  { id: 'TRP-0026', route: 'Dammam → Riyadh',    driver: 'Kashif Ali',     initials: 'KA', avatarBg: 'bg-blue-100 text-blue-700', vehicle: 'VRA-5510', status: 'In Transit',  startTime: '11 May, 06:50 AM', eta: '2h 50m', progress: 63, distance: '1,567 km' },
];

const TRIPS_UPCOMING = [
  { id: 'TRP-0033', route: 'Riyadh → Madinah',   driver: 'Khalid Saeed',   initials: 'KS', avatarBg: 'bg-blue-100 text-blue-700', vehicle: 'DRA-6485', status: 'To Pickup',   startTime: '12 May, 11:00 AM', eta: '5h 00m', progress: 0,  distance: '310 km' },
  { id: 'TRP-0032', route: 'Jeddah → Taif',      driver: 'Mohammed Faizan',initials: 'MF', avatarBg: 'bg-blue-100 text-blue-700', vehicle: 'KSA-7712', status: 'To Pickup',   startTime: '12 May, 12:30 PM', eta: '2h 30m', progress: 0,  distance: '98 km'  },
];

const TRIPS_RECENT = [
  { id: 'TRP-0025', route: 'Riyadh → Qassim',    driver: 'Faizan Malik',   initials: 'FM', avatarBg: 'bg-blue-100 text-blue-700', vehicle: 'DRA-9873', status: 'In Transit',  startTime: '10 May, 04:00 AM', eta: 'Done',   progress: 100, distance: '180 km' },
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const [tripTab, setTripTab] = useState<'current' | 'upcoming' | 'recent'>('current');
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  const [isRemindersCollapsed, setIsRemindersCollapsed] = useState(false);
  const user = authStore.getUser();
  const userName = user?.name ? user.name.split(' ')[0] : 'Mercon';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <TooltipProvider>
      <DashboardLayout active="Dashboard" title="Dashboard" hideBackButton>
        <div className="px-4 sm:px-6 lg:px-8 pb-8 h-full flex flex-col gap-5 animate-fade-in">

          {/* ── Page Subheader / Context Bar ─────────────────────────────── */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1 pb-1 border-b border-black/[0.04]">
            {/* Left: Greeting & Module Badge */}
            <div className="flex items-center gap-2.5">
              <h1 className="text-[17px] font-extrabold text-slate-900 tracking-tight">
                {greeting}, <span className="text-slate-900">{userName}</span>
              </h1>
              <Badge className="bg-[#EEF2FF] text-[#4F46E5] border-[#C7D2FE] font-semibold text-[10px] px-2.5 py-0.5 rounded-full">
                Operations Module
              </Badge>
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
                className="h-8 gap-1.5 px-3.5 bg-[#E8450F] hover:bg-[#C7380A] text-white text-xs font-extrabold rounded-lg shadow-sm transition-all active:scale-[0.97]"
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
                  <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#E8450F]' : ''}`} />
                </TooltipTrigger>
                <TooltipContent><p className="text-xs">Refresh dashboard data</p></TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* ── TOP ROW: 3 Cards Side-by-Side ────────────────────────────── */}
          <div className="flex flex-col lg:flex-row gap-5 items-stretch transition-all duration-300 ease-in-out">

            {/* 1. Monthly Overview (Left ~32%) */}
            <div className="w-full lg:w-[33%] xl:w-[32%] shrink-0 flex flex-col transition-all duration-300 ease-in-out">
              <MonthlyOverview />
            </div>

            {/* 2. Active Trips Live Map (expands when reminders collapses) */}
            <div className="flex-1 min-w-0 flex flex-col bg-white rounded-[18px] border border-black/[0.06] shadow-sm overflow-hidden transition-all duration-300 ease-in-out">

              {/* Map Canvas with Overlays */}
              <div className="relative flex-1 min-h-[310px] w-full z-0" style={{ background: '#EAECEF' }}>
                {/* Overlay HUD: Active Trips Badge (Bold, Ultra-Visible & Floating over Leaflet) */}
                <div className="absolute top-3 left-3 z-[1000] px-4 py-2 rounded-xl shadow-lg border border-slate-900/15 bg-white text-slate-900 flex items-center gap-2.5 pointer-events-auto">
                  <span className="relative flex h-3 w-3 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                  </span>
                  <span className="text-xs sm:text-sm font-black tracking-wide uppercase text-slate-900">
                    {activeFleet.length} ACTIVE TRIPS
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
                  <MapResizer isCollapsed={isRemindersCollapsed} />
                  <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                  />
                  <ZoomControl position="bottomright" />

                  {activeFleet.map((v, i) => (
                    <Marker
                      key={i}
                      position={[v.lat, v.lng]}
                      icon={createTruckMapIcon(v.plate, v.status)}
                    >
                      <Popup maxWidth={240} minWidth={220}>
                        <div className="font-sans text-[11px] p-0.5">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-extrabold text-[#E8450F] font-mono text-[10px]">{v.tripId}</span>
                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full border ${STATUS_STYLE[v.status]?.badge}`}>
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
                            onClick={() => navigate('/trips')}
                            className="w-full h-6 text-[9px] bg-[#E8450F] hover:bg-[#C7380A] text-white font-bold"
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
              <div className="px-4 py-2 border-t border-black/[0.04] bg-slate-50/50 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3 text-[10px] font-bold text-slate-600 flex-wrap w-full justify-between">
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
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span>Issue</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Important Reminders */}
            <div className={`shrink-0 flex flex-col transition-all duration-300 ease-in-out ${isRemindersCollapsed ? 'w-full lg:w-[76px]' : 'w-full lg:w-[280px] xl:w-[320px]'}`}>
              <ImportantReminders
                collapsed={isRemindersCollapsed}
                onToggleCollapse={() => setIsRemindersCollapsed(!isRemindersCollapsed)}
              />
            </div>

          </div>

          {/* ── BOTTOM ROW: Active Transit Overview Table (Full Width) ──── */}
          <div className="w-full bg-white rounded-[18px] border border-black/[0.06] shadow-sm overflow-hidden flex flex-col">
            {/* Table Header */}
            <div className="px-5 py-3.5 border-b border-black/[0.04] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/40">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-extrabold text-slate-900 uppercase tracking-wider">
                    Active Transit Overview
                  </span>
                  <Badge className="bg-[#DCFCE7] text-[#16A34A] border-[#BBF7D0] text-[9px] font-extrabold px-2 py-0 h-4 rounded-full">
                    {activeTrips.length} Active
                  </Badge>
                </div>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">Real-time overview of all active trips</p>
              </div>

              <div className="flex items-center gap-4">
                {/* Tab Pills */}
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/80">
                  {(['current', 'upcoming', 'recent'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setTripTab(tab)}
                      className={`px-3 py-1 rounded-md text-[9px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                        tripTab === tab
                          ? 'bg-[#E8450F] text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {tab === 'current' ? 'Current' : tab === 'upcoming' ? 'Upcoming' : 'Recent'}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => navigate('/trips')}
                  className="text-[11px] font-extrabold text-[#E8450F] hover:underline flex items-center gap-1 whitespace-nowrap cursor-pointer"
                >
                  View Full Dispatch Map <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full whitespace-nowrap text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/20 text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
                    <th className="px-5 py-2.5">Trip ID</th>
                    <th className="px-5 py-2.5">Route</th>
                    <th className="px-5 py-2.5">Driver</th>
                    <th className="px-5 py-2.5">Vehicle</th>
                    <th className="px-5 py-2.5">Status</th>
                    <th className="px-5 py-2.5">Start Time</th>
                    <th className="px-5 py-2.5">ETA</th>
                    <th className="px-5 py-2.5">Progress</th>
                    <th className="px-5 py-2.5 text-right">Distance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/70 text-xs">
                  {activeTrips.map((trip, i) => {
                    const s = STATUS_STYLE[trip.status] || STATUS_STYLE['In Transit'];
                    return (
                      <tr
                        key={i}
                        onClick={() => navigate('/trips')}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                      >
                        {/* Trip ID */}
                        <td className="px-5 py-3">
                          <span className="font-extrabold text-[#E8450F] font-mono text-[11px]">
                            {trip.id}
                          </span>
                        </td>

                        {/* Route */}
                        <td className="px-5 py-3">
                          <span className="font-bold text-slate-800 text-[11px]">
                            {trip.route}
                          </span>
                        </td>

                        {/* Driver */}
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-extrabold ${trip.avatarBg}`}>
                              {trip.initials}
                            </div>
                            <span className="font-bold text-slate-800 text-[11px]">
                              {trip.driver}
                            </span>
                          </div>
                        </td>

                        {/* Vehicle */}
                        <td className="px-5 py-3">
                          <span className="text-[10px] font-bold font-mono text-slate-700">
                            {trip.vehicle}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center gap-1.5 text-[9px] font-bold px-2 py-0.5 rounded-full border ${s.badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                            {trip.status}
                          </span>
                        </td>

                        {/* Start Time */}
                        <td className="px-5 py-3">
                          <span className="text-[10px] text-slate-500 font-medium">
                            {trip.startTime}
                          </span>
                        </td>

                        {/* ETA */}
                        <td className="px-5 py-3">
                          <span className="text-[11px] font-extrabold text-slate-900">
                            {trip.eta}
                          </span>
                        </td>

                        {/* Progress */}
                        <td className="px-5 py-3 w-40">
                          <div className="flex items-center gap-2.5">
                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#E8450F] rounded-full transition-all"
                                style={{ width: `${trip.progress}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-extrabold text-blue-600 shrink-0">
                              {trip.progress}%
                            </span>
                          </div>
                        </td>

                        {/* Distance */}
                        <td className="px-5 py-3 text-right">
                          <span className="text-[10px] font-semibold text-slate-600">
                            {trip.distance}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </DashboardLayout>
    </TooltipProvider>
  );
}
