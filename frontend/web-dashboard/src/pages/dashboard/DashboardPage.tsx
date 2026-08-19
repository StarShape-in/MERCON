import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Plus,
  FileText,
  RotateCw,
  Maximize2,
  ArrowUpRight,
  Truck,
  Building2,
  X,
  Navigation,
  Calendar,
  Search,
  LayoutGrid,
  List,
  Download,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Filter,
  ChevronDown,
  Users,
  Receipt,
  MapPin,
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import ImportantReminders from '@/components/dashboard/ImportantReminders';
import MonthlyOverview from '@/components/dashboard/MonthlyOverview';
import OperatorActionCenter from '@/components/dashboard/OperatorActionCenter';
import DataTable, { Column } from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { authStore } from '@/store/authStore';
import { reportsService } from '@/services/reportsService';
import { tripService, Trip, TripStatus } from '@/services/tripService';
import { customerService } from '@/services/customerService';
import TripKanbanBoard from '@/components/trips/kanban/TripKanbanBoard';
import CompanyTripKanbanBoard from '@/components/trips/kanban/CompanyTripKanbanBoard';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import ExportModal, { ExportColumn } from '@/components/ui/ExportModal';
import { exportToCSV } from '@/utils/exportUtils';
import { cn } from '@/lib/utils';
import { SAUDI_MAP_CONTAINER_PROPS } from '@/utils/saudiMapConfig';
import { useDeploymentTimezone, formatInDeploymentTz } from '@/lib/datetime';
import { AutoFitVehiclesMapBounds, HoverScrollZoomListener } from '@/components/maps/MapBoundsController';
import SaudiRedBorderOverlay from '@/components/maps/SaudiRedBorderOverlay';

const DATE_FILTER_OPTIONS = [
  { label: 'All Dates', value: 'all' },
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'This Week', value: 'this_week' },
  { label: 'This Month', value: 'this_month' },
  { label: 'Upcoming', value: 'upcoming' },
];

function matchesDateFilter(dateStr: string | null | undefined, filter: string, tz: string): boolean {
  if (!dateStr || filter === 'all') return true;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return true;

  const now = new Date();
  const dateFormatted = formatInDeploymentTz(d, tz, 'yyyy-MM-dd');
  const todayFormatted = formatInDeploymentTz(now, tz, 'yyyy-MM-dd');

  if (filter === 'today') {
    return dateFormatted === todayFormatted;
  }
  if (filter === 'yesterday') {
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    return dateFormatted === formatInDeploymentTz(yesterday, tz, 'yyyy-MM-dd');
  }
  if (filter === 'this_week') {
    const diffDays = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= -7 && diffDays <= 7;
  }
  if (filter === 'this_month') {
    return formatInDeploymentTz(d, tz, 'yyyy-MM') === formatInDeploymentTz(now, tz, 'yyyy-MM');
  }
  if (filter === 'upcoming') {
    return d.getTime() > now.getTime();
  }
  return true;
}

const DASHBOARD_EXPORT_COLUMNS: ExportColumn<any>[] = [
  { id: 'id', label: 'Trip ID', accessor: (t) => t.id || t.tripId || t.ref_id },
  { id: 'customer', label: 'Customer', accessor: (t) => t.customerName || t.customer?.name || '—' },
  { id: 'route', label: 'Route', accessor: (t) => t.route || `${t.pickup || t.stops?.[0]?.location_name || ''} → ${t.dropoff || t.stops?.[t.stops?.length - 1]?.location_name || ''}` },
  { id: 'driver', label: 'Driver', accessor: (t) => t.driver ? (typeof t.driver === 'string' ? t.driver : `${t.driver.first_name} ${t.driver.last_name}`) : '—' },
  { id: 'vehicle', label: 'Vehicle Plate', accessor: (t) => t.vehicle ? (typeof t.vehicle === 'string' ? t.vehicle : t.vehicle.plate_number) : t.plate || '—' },
  { id: 'status', label: 'Status', accessor: (t) => t.status || t.rawStatus },
  { id: 'departure', label: 'Departure', accessor: (t) => t.startTime || (t.planned_start ? formatInDeploymentTz(t.planned_start, 'Asia/Riyadh', 'yyyy-MM-dd') : '—') },
  { id: 'eta', label: 'ETA', accessor: (t) => t.eta || '—' },
  { id: 'progress', label: 'Progress', accessor: (t) => `${t.progress || 0}%` },
  { id: 'distance', label: 'Distance', accessor: (t) => t.distance || `${t.planned_distance || 0} km` },
  { id: 'price', label: 'Rate (SAR)', accessor: (t) => (t.price || t.billing_amount ? `SAR ${Number(t.price || t.billing_amount).toLocaleString('en-US')}` : '—') },
];

import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ─── Leaflet Map Auto-Resizer when Panels Expand/Collapse ───────────────────
function MapResizer({ isCollapsed, isMapFullscreen }: { isCollapsed: boolean; isMapFullscreen: boolean }) {
  const map = useMap();
  useEffect(() => {
    const safeInvalidate = () => {
      try {
        if (map && (map as any)._container) {
          map.invalidateSize();
        }
      } catch {}
    };

    safeInvalidate();
    const t1 = setTimeout(safeInvalidate, 100);
    const t2 = setTimeout(safeInvalidate, 300);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isCollapsed, isMapFullscreen, map]);
  return null;
}

// ─── Leaflet Map Popup Event Listener to Auto-Hide Overlapping Badges ────────
function MapPopupEventListener({ onPopupOpen, onPopupClose }: { onPopupOpen: () => void; onPopupClose: () => void }) {
  useMapEvents({
    popupopen: () => onPopupOpen(),
    popupclose: () => onPopupClose(),
  });
  return null;
}

// ─── 3D Truck Map Marker Generator ──────────────────────────────────────────
const STATUS_MARKER_BOX_STYLE: Record<string, { bg: string; text: string; border: string; shadow: string; ping: string }> = {
  'Scheduled':   { bg: '#EEF2FF', text: '#4338CA', border: '#6366F1', shadow: 'rgba(99, 102, 241, 0.4)', ping: 'rgba(99, 102, 241, 0.4)' },
  'Loading':     { bg: '#F0F9FF', text: '#0369A1', border: '#0EA5E9', shadow: 'rgba(14, 165, 233, 0.4)', ping: 'rgba(14, 165, 233, 0.4)' },
  'At Pickup':   { bg: '#F0F9FF', text: '#0369A1', border: '#0EA5E9', shadow: 'rgba(14, 165, 233, 0.4)', ping: 'rgba(14, 165, 233, 0.4)' },
  'To Pickup':   { bg: '#F0F9FF', text: '#0369A1', border: '#0EA5E9', shadow: 'rgba(14, 165, 233, 0.4)', ping: 'rgba(14, 165, 233, 0.4)' },
  'In Transit':  { bg: '#FFFBEB', text: '#B45309', border: '#F59E0B', shadow: 'rgba(245, 158, 11, 0.4)', ping: 'rgba(245, 158, 11, 0.4)' },
  'To Delivery': { bg: '#FFFBEB', text: '#B45309', border: '#F59E0B', shadow: 'rgba(245, 158, 11, 0.4)', ping: 'rgba(245, 158, 11, 0.4)' },
  'Delayed':     { bg: '#FFF1F2', text: '#BE123C', border: '#F43F5E', shadow: 'rgba(244, 63, 94, 0.4)', ping: 'rgba(244, 63, 94, 0.4)' },
  'Completed':   { bg: '#ECFDF5', text: '#047857', border: '#10B981', shadow: 'rgba(16, 185, 129, 0.4)', ping: 'rgba(16, 185, 129, 0.4)' },
};

function createTruckMapIcon(plate: string, status: string) {
  const boxStyle = STATUS_MARKER_BOX_STYLE[status] || {
    bg: '#F8FAFC',
    text: '#334155',
    border: '#94A3B8',
    shadow: 'rgba(148, 163, 184, 0.3)',
    ping: 'rgba(148, 163, 184, 0.3)',
  };

  // 2nd image design: 3D Blue Truck HD render
  const truckFilter = 'hue-rotate(200deg) saturate(1.25) brightness(0.95) drop-shadow(0 4px 8px rgba(0,0,0,0.3))';
  const showPing = status !== 'Scheduled' && status !== 'Issue';

  const svgHtml = `
    <div style="position:relative;width:58px;height:62px;display:flex;flex-direction:column;align-items:center;justify-content:center;">
      ${showPing ? `<div class="animate-ping" style="position:absolute;top:4px;width:38px;height:38px;border-radius:50%;background-color:${boxStyle.ping};opacity:0.35;z-index:1;"></div>` : ''}
      
      <!-- 3D Blue Truck Asset (Matches 2nd image design) -->
      <div style="position:relative;z-index:2;transform:translateY(-2px);width:44px;height:44px;">
        <img 
          src="/truck_3d_orange_transparent.png" 
          style="width:100%;height:100%;object-fit:contain;filter:${truckFilter};" 
        />
      </div>

      <!-- Distinct Color-Coded Badge Box per Status -->
      <div style="position:absolute;bottom:0px;background:${boxStyle.bg};color:${boxStyle.text};font-family:monospace;font-size:8px;font-weight:800;padding:1.5px 6px;border-radius:5px;white-space:nowrap;border:1.5px solid ${boxStyle.border};box-shadow:0 2px 8px ${boxStyle.shadow};z-index:3;letter-spacing:0.3px;">
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
  'Scheduled':   { dot: 'bg-indigo-500',  badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',   label: 'Scheduled' },
  'Loading':     { dot: 'bg-sky-500',     badge: 'bg-sky-50 text-sky-700 border-sky-200',           label: 'Loading' },
  'At Pickup':   { dot: 'bg-sky-500',     badge: 'bg-sky-50 text-sky-700 border-sky-200',           label: 'Loading' },
  'To Pickup':   { dot: 'bg-sky-500',     badge: 'bg-sky-50 text-sky-700 border-sky-200',           label: 'Loading' },
  'In Transit':  { dot: 'bg-amber-500',   badge: 'bg-amber-50 text-amber-700 border-amber-200',       label: 'In Transit' },
  'To Delivery': { dot: 'bg-amber-500',   badge: 'bg-amber-50 text-amber-700 border-amber-200',       label: 'In Transit' },
  'Delayed':     { dot: 'bg-rose-500',    badge: 'bg-rose-50 text-rose-700 border-rose-200',         label: 'Delayed' },
  'Completed':   { dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Completed' },
  'Cancelled':   { dot: 'bg-slate-400',   badge: 'bg-slate-100 text-slate-600 border-slate-200',     label: 'Cancelled' },
};

const FALLBACK_KANBAN_TRIPS: Trip[] = [
  {
    id: 'TRP-0134',
    ref_id: 'TRP-0134',
    status: 'InTransit',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    planned_start: new Date().toISOString(),
    customer: { id: 'c1', name: 'IMILE DELIVERY SAUDI LOGISTICS', contact_phone: '+966 50 111 2222', credit_limit: 50000, isActive: true, createdAt: new Date().toISOString() },
    driver: { id: 'd1', first_name: 'Nouman', last_name: 'Ashraf', phone: '+966 50 123 4567', iqama_number: '2345678901', license_number: 'LIC-9988', is_active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    vehicle: { id: 'v1', plate_number: 'USA-6010', ref_id: 'VEH-010', type: 'Reefer Truck', is_active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    stops: [
      { id: 's1', trip_id: 'TRP-0134', stop_type: 'Pickup', sequence: 1, location_name: 'Dammam Warehouse', location_lat: 26.42, location_lng: 50.08, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 's2', trip_id: 'TRP-0134', stop_type: 'Dropoff', sequence: 2, location_name: 'Jeddah Main Station', location_lat: 21.54, location_lng: 39.17, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ],
    billing_amount: 3325,
    planned_distance: 1350,
  } as any,
  {
    id: 'TRP-0030',
    ref_id: 'TRP-0030',
    status: 'InTransit',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    planned_start: new Date().toISOString(),
    customer: { id: 'c2', name: 'Saudi Aramco Logistics', contact_phone: '+966 50 222 3333', credit_limit: 100000, isActive: true, createdAt: new Date().toISOString() },
    driver: { id: 'd2', first_name: 'Mohammed', last_name: 'Faizan', phone: '+966 50 234 5678', iqama_number: '2345678902', license_number: 'LIC-9989', is_active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    vehicle: { id: 'v2', plate_number: 'VSA-3871', ref_id: 'VEH-011', type: 'Flatbed Trailer', is_active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    stops: [
      { id: 's3', trip_id: 'TRP-0030', stop_type: 'Pickup', sequence: 1, location_name: 'Dammam Port', location_lat: 26.42, location_lng: 50.08, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 's4', trip_id: 'TRP-0030', stop_type: 'Dropoff', sequence: 2, location_name: 'Jeddah Gateway', location_lat: 21.54, location_lng: 39.17, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ],
    billing_amount: 3450,
    planned_distance: 1234,
  } as any,
  {
    id: 'TRP-0029',
    ref_id: 'TRP-0029',
    status: 'Dispatched',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    planned_start: new Date().toISOString(),
    customer: { id: 'c3', name: 'SABIC Petrochemicals', contact_phone: '+966 50 333 4444', credit_limit: 80000, isActive: true, createdAt: new Date().toISOString() },
    driver: { id: 'd3', first_name: 'Umar', last_name: 'Farooq', phone: '+966 50 345 6789', iqama_number: '2345678903', license_number: 'LIC-9990', is_active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    vehicle: { id: 'v3', plate_number: 'VRA-3356', ref_id: 'VEH-012', type: 'Curtainsider', is_active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    stops: [
      { id: 's5', trip_id: 'TRP-0029', stop_type: 'Pickup', sequence: 1, location_name: 'Riyadh Central', location_lat: 24.71, location_lng: 46.67, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 's6', trip_id: 'TRP-0029', stop_type: 'Dropoff', sequence: 2, location_name: 'Dammam City', location_lat: 26.42, location_lng: 50.08, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ],
    billing_amount: 2100,
    planned_distance: 1876,
  } as any,
  {
    id: 'TRP-0028',
    ref_id: 'TRP-0028',
    status: 'AtPickup',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    planned_start: new Date().toISOString(),
    customer: { id: 'c4', name: 'Almarai Dairy Fleet', contact_phone: '+966 50 444 5555', credit_limit: 120000, isActive: true, createdAt: new Date().toISOString() },
    driver: { id: 'd4', first_name: 'Abdul', last_name: 'Malik', phone: '+966 50 456 7890', iqama_number: '2345678904', license_number: 'LIC-9991', is_active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    vehicle: { id: 'v4', plate_number: 'DRA-6484', ref_id: 'VEH-013', type: 'Reefer Trailer', is_active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    stops: [
      { id: 's7', trip_id: 'TRP-0028', stop_type: 'Pickup', sequence: 1, location_name: 'Al-Kharj Plant', location_lat: 24.15, location_lng: 47.31, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 's8', trip_id: 'TRP-0028', stop_type: 'Dropoff', sequence: 2, location_name: 'Dammam Depot', location_lat: 26.42, location_lng: 50.08, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ],
    billing_amount: 4200,
    planned_distance: 2145,
  } as any,
  {
    id: 'TRP-0027',
    ref_id: 'TRP-0027',
    status: 'AtDelivery',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    planned_start: new Date().toISOString(),
    customer: { id: 'c5', name: 'Panda Retail Operations', contact_phone: '+966 50 555 6666', credit_limit: 60000, isActive: true, createdAt: new Date().toISOString() },
    driver: { id: 'd5', first_name: 'Liaqat', last_name: 'Ali', phone: '+966 50 567 8901', iqama_number: '2345678905', license_number: 'LIC-9992', is_active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    vehicle: { id: 'v5', plate_number: 'ERA-9380', ref_id: 'VEH-014', type: 'Box Truck', is_active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    stops: [
      { id: 's9', trip_id: 'TRP-0027', stop_type: 'Pickup', sequence: 1, location_name: 'Jeddah DC', location_lat: 21.54, location_lng: 39.17, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 's10', trip_id: 'TRP-0027', stop_type: 'Dropoff', sequence: 2, location_name: 'Riyadh Store 4', location_lat: 24.71, location_lng: 46.67, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ],
    billing_amount: 1850,
    planned_distance: 876,
  } as any,
  {
    id: 'TRP-0025',
    ref_id: 'TRP-0025',
    status: 'Completed',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    planned_start: new Date().toISOString(),
    customer: { id: 'c6', name: 'Al-Othaim Commercial', contact_phone: '+966 50 666 7777', credit_limit: 75000, isActive: true, createdAt: new Date().toISOString() },
    driver: { id: 'd6', first_name: 'Faizan', last_name: 'Malik', phone: '+966 50 678 9012', iqama_number: '2345678906', license_number: 'LIC-9993', is_active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    vehicle: { id: 'v6', plate_number: 'DRA-9873', ref_id: 'VEH-015', type: 'Flatbed', is_active: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    stops: [
      { id: 's11', trip_id: 'TRP-0025', stop_type: 'Pickup', sequence: 1, location_name: 'Riyadh Terminal', location_lat: 24.71, location_lng: 46.67, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 's12', trip_id: 'TRP-0025', stop_type: 'Dropoff', sequence: 2, location_name: 'Qassim Hub', location_lat: 26.32, location_lng: 43.97, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ],
    billing_amount: 2600,
    planned_distance: 180,
  } as any,
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const tz = useDeploymentTimezone();

  const [dashboardViewMode, setDashboardViewMode] = useState<'kanban' | 'ledger'>('ledger');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [tripSearch, setTripSearch] = useState('');
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRemindersCollapsed, setIsRemindersCollapsed] = useState(false);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [isMapPopupOpen, setIsMapPopupOpen] = useState(false);
  const [isMouseOverMap, setIsMouseOverMap] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMapFullscreen) {
        setIsMapFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMapFullscreen]);

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

  const { data: tripsRes, refetch: refetchTrips, isLoading: isTripsLoading, isError: isTripsError } = useQuery({
    queryKey: ['dashboard-trips'],
    queryFn: () => tripService.getAll({ per_page: 200 }),
  });

  const { data: customersRes } = useQuery({
    queryKey: ['dashboard-customers-list'],
    queryFn: () => customerService.getAll({ per_page: 200 }),
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([isAdmin ? refetchSummary() : Promise.resolve(), refetchTrips()]);
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const handleKanbanStatusChange = async (trip: Trip, targetStatus: TripStatus) => {
    try {
      await tripService.updateStatus(trip.id, targetStatus);
      queryClient.invalidateQueries({ queryKey: ['dashboard-trips'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      toast.success(`Updated ${trip.ref_id} status to ${targetStatus}`);
    } catch (e) {
      toast.error(`Failed to update status for ${trip.ref_id}`);
    }
  };

  const rawTrips = tripsRes?.data || [];

  // Base active trips for Kanban board (only active transit fleet)
  const baseTripsForKanban: Trip[] = useMemo(() => {
    const pool = (rawTrips && rawTrips.length > 0) ? (rawTrips as Trip[]) : [];
    const active = pool.filter((t) => {
      const s = String(t.status || '').toLowerCase().replace(/[\s_-]/g, '');
      const isDelayed =
        ['dispatched', 'atpickup', 'intransit', 'atdelivery'].includes(s) &&
        t.planned_end != null &&
        new Date(t.planned_end).getTime() < Date.now();
      if (isDelayed) return true;
      return ['intransit', 'dispatched', 'atpickup', 'atdelivery', 'delayed', 'topickup', 'todelivery'].includes(s);
    });
    if (active.length > 0) {
      return active;
    }
    return FALLBACK_KANBAN_TRIPS;
  }, [rawTrips]);

  // Extract unique companies from trips and database customers (prioritize companies with active trips first)
  const companyOptions = useMemo(() => {
    const map = new Map<string, number>();
    baseTripsForKanban.forEach((t) => {
      const name = t.customer?.name || (t as any).customerName;
      if (name) {
        map.set(name, (map.get(name) || 0) + 1);
      }
    });
    (customersRes?.data || []).forEach((c) => {
      if (c.name && !map.has(c.name)) {
        map.set(c.name, 0);
      }
    });
    return Array.from(map.entries()).sort((a, b) => {
      if (a[1] > 0 && b[1] === 0) return -1;
      if (a[1] === 0 && b[1] > 0) return 1;
      if (a[1] !== b[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    });
  }, [baseTripsForKanban, customersRes]);

  // Filtered trips for Kanban board (Active only: Search and Active Status Filter)
  const filteredTripsForKanban: Trip[] = useMemo(() => {
    return baseTripsForKanban.filter((t) => {
      // 1. Status filter (Active tracking statuses)
      if (selectedStatusFilter !== 'all') {
        if (selectedStatusFilter === 'Delayed') {
          const isDelayed =
            ['Dispatched', 'AtPickup', 'InTransit', 'AtDelivery'].includes(t.status) &&
            t.planned_end != null &&
            new Date(t.planned_end).getTime() < Date.now();
          if (!isDelayed) return false;
        } else if (t.status !== selectedStatusFilter) {
          return false;
        }
      }

      // 2. Search filter
      if (tripSearch.trim()) {
        const q = tripSearch.toLowerCase().trim();
        const refStr = (t.ref_id || t.id || '').toLowerCase();
        const custStr = (t.customer?.name || (t as any).customerName || '').toLowerCase();
        const driverStr = t.driver
          ? (typeof t.driver === 'string' ? t.driver : `${t.driver.first_name} ${t.driver.last_name}`).toLowerCase()
          : '';
        const vehicleStr = t.vehicle
          ? (typeof t.vehicle === 'string' ? t.vehicle : t.vehicle.plate_number).toLowerCase()
          : (t as any).plate ? (t as any).plate.toLowerCase() : '';
        const pickupStr = (t.stops?.[0]?.location_name || (t as any).pickup || '').toLowerCase();
        const dropoffStr = (t.stops?.[t.stops.length - 1]?.location_name || (t as any).dropoff || '').toLowerCase();

        const matches =
          refStr.includes(q) ||
          custStr.includes(q) ||
          driverStr.includes(q) ||
          vehicleStr.includes(q) ||
          pickupStr.includes(q) ||
          dropoffStr.includes(q);

        if (!matches) return false;
      }

      return true;
    });
  }, [baseTripsForKanban, selectedStatusFilter, tripSearch]);

  // Categorize live trips into current, upcoming, completed for Ledger table
  const { currentTrips, upcomingTrips, completedTrips } = useMemo(() => {
    const current: any[] = [];
    const upcoming: any[] = [];
    const completed: any[] = [];

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

      const nowMs = Date.now();
      const isDelayed =
        ['Dispatched', 'AtPickup', 'InTransit', 'AtDelivery'].includes(t.status) &&
        t.planned_end != null &&
        new Date(t.planned_end).getTime() < nowMs;

      if (isDelayed) {
        mappedStatus = 'Delayed';
        progress = 85;
        eta = 'Delayed';
      } else if (t.status === 'Draft') {
        mappedStatus = 'Scheduled';
        progress = 0;
        eta = 'Pending';
      } else if (t.status === 'Dispatched' || t.status === 'AtPickup') {
        mappedStatus = 'Loading';
        progress = 35;
        eta = 'Loading';
      } else if (t.status === 'InTransit' || t.status === 'AtDelivery') {
        mappedStatus = 'In Transit';
        progress = 75;
        eta = '2h 45m';
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
          ? formatInDeploymentTz(t.planned_start, tz, 'd MMM')
          : formatInDeploymentTz(t.createdAt, tz, 'd MMM'),
        eta,
        progress,
        distance: `${t.planned_distance || 850} km`,
        lat: coords[0],
        lng: coords[1],
        plate: vehiclePlate,
        tripId: t.ref_id || `TRP-${t.id.slice(0, 6).toUpperCase()}`,
        planned_start: t.planned_start,
        createdAt: t.createdAt,
      };

      if (['InTransit', 'Dispatched', 'AtPickup', 'AtDelivery'].includes(t.status)) {
        current.push(item);
      } else if (t.status === 'Draft' || (t.planned_start && new Date(t.planned_start) > new Date())) {
        upcoming.push(item);
      } else if (t.status === 'Completed' || t.status === 'Invoiced') {
        completed.push(item);
      }
    });

    // Fallback seed trips if system is fresh with 0 database records
    const fallbackCurrent = [
      { id: 'TRP-0030', rawId: 'TRP-0030', pickup: 'Dammam', dropoff: 'Jeddah', route: 'Dammam → Jeddah', customerName: 'Saudi Aramco Logistics', price: 3450, driver: 'Mohammed Faizan', initials: 'MF', avatarBg: 'bg-blue-100 text-blue-700', vehicle: 'VSA-3871', plate: 'VSA-3871', tripId: 'TRP-0030', status: 'In Transit', rawStatus: 'InTransit', startTime: 'Today', eta: '2h 15m', progress: 76, distance: '1,234 km', lat: 26.20, lng: 43.80, planned_start: new Date().toISOString() },
      { id: 'TRP-0029', rawId: 'TRP-0029', pickup: 'Riyadh', dropoff: 'Dammam', route: 'Riyadh → Dammam', customerName: 'SABIC Petrochemicals', price: 2100, driver: 'Umar Farooq', initials: 'UF', avatarBg: 'bg-blue-100 text-blue-700', vehicle: 'VRA-3356', plate: 'VRA-3356', tripId: 'TRP-0029', status: 'To Pickup', rawStatus: 'Dispatched', startTime: 'Today', eta: '3h 45m', progress: 50, distance: '1,876 km', lat: 24.71, lng: 46.67, planned_start: new Date().toISOString() },
      { id: 'TRP-0028', rawId: 'TRP-0028', pickup: 'Abu Dhabi', dropoff: 'Dammam', route: 'Abu Dhabi → Dammam', customerName: 'Almarai Dairy Fleet', price: 4200, driver: 'Abdul Malik', initials: 'AM', avatarBg: 'bg-blue-100 text-blue-700', vehicle: 'DRA-6484', plate: 'DRA-6484', tripId: 'TRP-0028', status: 'At Pickup', rawStatus: 'AtPickup', startTime: 'Today', eta: '4h 20m', progress: 42, distance: '2,145 km', lat: 21.54, lng: 39.17, planned_start: new Date().toISOString() },
      { id: 'TRP-0027', rawId: 'TRP-0027', pickup: 'Jeddah', dropoff: 'Riyadh', route: 'Jeddah → Riyadh', customerName: 'Panda Retail Operations', price: 1850, driver: 'Liaqat Ali', initials: 'LA', avatarBg: 'bg-purple-100 text-purple-700', vehicle: 'ERA-9380', plate: 'ERA-9380', tripId: 'TRP-0027', status: 'To Delivery', rawStatus: 'AtDelivery', startTime: 'Today', eta: '1h 30m', progress: 85, distance: '876 km', lat: 23.20, lng: 45.10, planned_start: new Date().toISOString() },
    ];

    const fallbackUpcoming = [
      { id: 'TRP-0033', rawId: 'TRP-0033', pickup: 'Riyadh', dropoff: 'Madinah', route: 'Riyadh → Madinah', customerName: 'Jarir Marketing Co.', price: 1950, driver: 'Khalid Saeed', initials: 'KS', avatarBg: 'bg-blue-100 text-blue-700', vehicle: 'DRA-6485', plate: 'DRA-6485', tripId: 'TRP-0033', status: 'Scheduled', rawStatus: 'Draft', startTime: 'Tomorrow', eta: '5h 00m', progress: 0, distance: '310 km', lat: 24.68, lng: 46.72, planned_start: new Date(Date.now() + 86400000).toISOString() },
      { id: 'TRP-0032', rawId: 'TRP-0032', pickup: 'Jeddah', dropoff: 'Taif', route: 'Jeddah → Taif', customerName: 'BinDawood Superstores', price: 1200, driver: 'Mohammed Faizan', initials: 'MF', avatarBg: 'bg-blue-100 text-blue-700', vehicle: 'KSA-7712', plate: 'KSA-7712', tripId: 'TRP-0032', status: 'Scheduled', rawStatus: 'Draft', startTime: 'Tomorrow', eta: '2h 30m', progress: 0, distance: '98 km', lat: 21.38, lng: 39.86, planned_start: new Date(Date.now() + 86400000).toISOString() },
    ];

    const fallbackCompleted = [
      { id: 'TRP-0025', rawId: 'TRP-0025', pickup: 'Riyadh', dropoff: 'Qassim', route: 'Riyadh → Qassim', customerName: 'Al-Othaim Commercial', price: 2600, driver: 'Faizan Malik', initials: 'FM', avatarBg: 'bg-blue-100 text-blue-700', vehicle: 'DRA-9873', plate: 'DRA-9873', tripId: 'TRP-0025', status: 'Completed', rawStatus: 'Completed', startTime: 'Yesterday', eta: 'Done', progress: 100, distance: '180 km', lat: 26.32, lng: 43.97, planned_start: new Date(Date.now() - 86400000).toISOString() },
    ];

    return {
      currentTrips: current.length ? current : fallbackCurrent,
      upcomingTrips: upcoming.length ? upcoming : fallbackUpcoming,
      completedTrips: completed.length ? completed : fallbackCompleted,
    };
  }, [rawTrips]);

  const companyFilteredCurrent = useMemo(() => {
    return currentTrips.filter((t: any) => {
      if (selectedCompany !== 'all' && t.customerName !== selectedCompany) return false;
      return true;
    });
  }, [currentTrips, selectedCompany]);

  const activeTrips = companyFilteredCurrent;
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

  // Active fleet vehicles to display on the live map (directly connected to the current active view & filters)
  const mapFleetVehicles = useMemo(() => {
    // If in Kanban mode, use filteredTripsForKanban
    // If in Ledger mode, use filteredActiveTrips
    const sourceTrips = dashboardViewMode === 'kanban' ? filteredTripsForKanban : filteredActiveTrips;

    return sourceTrips.map((t: any, idx: number) => {
      const plate = t.vehicle?.plate_number || t.vehicle?.ref_id || t.plate || (typeof t.vehicle === 'string' ? t.vehicle : 'VEH-PENDING');
      const tripId = t.ref_id || t.id || t.tripId || `TRP-${idx}`;
      const rawId = t.rawId || t.id;
      
      const driverName = t.driver
        ? (typeof t.driver === 'string' ? t.driver : `${t.driver.first_name || ''} ${t.driver.last_name || ''}`.trim())
        : (t.is_third_party ? (t.third_party_driver_name || '3PL Driver') : 'Unassigned Driver');

      const customerName = t.customer?.name || t.customerName || 'MERCON Partner';

      const pickup = t.stops?.[0]?.location_name || t.pickup || (t.route ? t.route.split('→')[0]?.trim() : 'Riyadh Hub');
      const dropoff = t.stops?.[t.stops.length - 1]?.location_name || t.dropoff || (t.route ? t.route.split('→')[1]?.trim() : 'Jeddah Gateway');
      const route = t.route || `${pickup} → ${dropoff}`;

      let status = t.status || t.rawStatus || 'In Transit';
      if (status === 'Dispatched') status = 'To Pickup';
      if (status === 'AtPickup') status = 'Loading';
      if (status === 'InTransit') status = 'In Transit';
      if (status === 'AtDelivery') status = 'To Delivery';

      let lat = t.lat;
      let lng = t.lng;
      if (!lat || !lng) {
        if (t.stops?.[0]?.location_lat && t.stops?.[0]?.location_lng) {
          lat = t.stops[0].location_lat;
          lng = t.stops[0].location_lng;
        } else {
          const coords = getApproxCoords(pickup, idx);
          lat = coords[0];
          lng = coords[1];
        }
      }

      return {
        id: tripId,
        rawId,
        tripId,
        plate,
        driver: driverName,
        customerName,
        pickup,
        dropoff,
        route,
        status,
        rawStatus: t.rawStatus || t.status,
        eta: t.eta || '2h 15m',
        distance: t.distance ? (typeof t.distance === 'string' ? t.distance : `${t.distance} km`) : (t.planned_distance ? `${t.planned_distance} km` : '1,200 km'),
        progress: t.progress ?? 65,
        lat,
        lng,
      };
    });
  }, [dashboardViewMode, filteredTripsForKanban, filteredActiveTrips]);

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
                onClick={() => navigate('/trips/new')}
                className="h-8 gap-1.5 px-3.5 bg-brand hover:bg-brand-hover text-white text-xs font-extrabold rounded-lg shadow-sm transition-all active:scale-[0.97]"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                New Trip
              </Button>

              {/* More Actions Dropdown Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1 text-xs font-bold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                    title="More Actions"
                  >
                    <span>More</span>
                    <ChevronDown className="h-3 w-3 text-slate-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 p-1.5 shadow-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl z-50">
                  <DropdownMenuLabel className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-2 py-1">
                    Quick Workflows
                  </DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => navigate('/vehicles/new')} className="cursor-pointer text-xs font-semibold py-1.5 px-2 rounded-md">
                    <Truck className="w-3.5 h-3.5 mr-2 text-blue-600" /> Register Vehicle
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/drivers/new')} className="cursor-pointer text-xs font-semibold py-1.5 px-2 rounded-md">
                    <Users className="w-3.5 h-3.5 mr-2 text-emerald-600" /> Onboard Driver
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-1 bg-slate-200/50 dark:bg-slate-800" />
                  <DropdownMenuItem onClick={() => navigate('/rate-cards')} className="cursor-pointer text-xs font-semibold py-1.5 px-2 rounded-md">
                    <FileText className="w-3.5 h-3.5 mr-2 text-brand" /> Create Rate Card
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/invoices/new')} className="cursor-pointer text-xs font-semibold py-1.5 px-2 rounded-md">
                    <Receipt className="w-3.5 h-3.5 mr-2 text-purple-600" /> Generate Invoice
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/documents')}
                className="h-8 gap-1.5 text-xs font-semibold border-slate-200 bg-white shadow-2xs text-slate-700 hover:bg-slate-50"
              >
                <FileText className="w-3.5 h-3.5 text-slate-500" /> Add Document
              </Button>
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
              <div 
                onMouseEnter={() => setIsMouseOverMap(true)}
                onMouseLeave={() => {
                  setIsMouseOverMap(false);
                  setIsMapPopupOpen(false);
                }}
                className={isMapFullscreen 
                  ? "fixed inset-0 z-[9999] w-screen h-screen m-0 p-0 rounded-none border-none bg-[#EAECEF]"
                  : "relative flex-1 min-h-[310px] w-full z-0 bg-[#EAECEF]"
                }
              >
                {/* Overlay HUD: Small Active Trips Badge & Trips Link (Fades out when track popup is open) */}
                <div 
                  className={cn(
                    "absolute top-3 left-3 z-[10000] flex items-center gap-2 pointer-events-auto transition-all duration-300 ease-in-out",
                    isMapPopupOpen ? "opacity-0 pointer-events-none -translate-y-2" : "opacity-100 translate-y-0"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => navigate('/trips')}
                    title="Click to view Trips Page"
                    className="px-2.5 py-1 rounded-lg shadow-md border border-slate-900/15 bg-white/95 backdrop-blur-md text-slate-900 flex items-center gap-1.5 hover:bg-slate-900 hover:text-white transition-all cursor-pointer group"
                  >
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    <span className="text-[10px] sm:text-xs font-extrabold tracking-wide uppercase">
                      {selectedCompany !== 'all' ? `${selectedCompany.slice(0, 14)}: ` : ''}{mapFleetVehicles.length} FLEET TRIPS
                    </span>
                  </button>

                  {isMapFullscreen && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMapFullscreen(false);
                        navigate('/trips');
                      }}
                      className="px-2.5 py-1 rounded-lg shadow-md border border-slate-900/15 bg-slate-900 text-white text-[10px] sm:text-xs font-bold hover:bg-black flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                    >
                      <Navigation className="w-3 h-3 text-brand" /> Go to Trips Page
                    </button>
                  )}
                </div>

                {/* Overlay: Full Map / Close Map Button */}
                {isMapFullscreen ? (
                  <button
                    type="button"
                    onClick={() => setIsMapFullscreen(false)}
                    className="absolute top-3 right-3 z-[10000] px-3.5 py-1.5 rounded-xl shadow-2xl border border-red-500/40 bg-red-600 hover:bg-red-700 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                  >
                    <X className="w-4 h-4" /> Close Map
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsMapFullscreen(true)}
                    className="absolute top-3 right-3 z-[10000] px-2.5 py-1 rounded-lg shadow-md border border-slate-900/15 bg-white/95 backdrop-blur-md text-slate-800 text-[10px] sm:text-xs font-extrabold hover:bg-slate-900 hover:text-white flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                  >
                    <Maximize2 className="w-3 h-3" /> Full Map
                  </button>
                )}

                <MapContainer
                  center={SAUDI_MAP_CONTAINER_PROPS.center}
                  zoom={SAUDI_MAP_CONTAINER_PROPS.zoom}
                  minZoom={SAUDI_MAP_CONTAINER_PROPS.minZoom}
                  maxZoom={SAUDI_MAP_CONTAINER_PROPS.maxZoom}
                  maxBounds={SAUDI_MAP_CONTAINER_PROPS.maxBounds}
                  maxBoundsViscosity={SAUDI_MAP_CONTAINER_PROPS.maxBoundsViscosity}
                  scrollWheelZoom={true}
                  zoomControl={false}
                  attributionControl={true}
                  style={{ height: '100%', width: '100%', minHeight: isMapFullscreen ? '100vh' : '310px' }}
                >
                  <MapResizer isCollapsed={isRemindersCollapsed} isMapFullscreen={isMapFullscreen} />
                  <MapPopupEventListener 
                    onPopupOpen={() => setIsMapPopupOpen(true)} 
                    onPopupClose={() => setIsMapPopupOpen(false)} 
                  />
                  <AutoFitVehiclesMapBounds vehicles={mapFleetVehicles} padding={[50, 50]} maxZoom={12} />
                  <HoverScrollZoomListener isHovered={isMouseOverMap} />
                  <SaudiRedBorderOverlay />
                  <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                  />
                  <ZoomControl position="bottomright" />

                  {mapFleetVehicles.map((v: any) => (
                    <Marker
                      key={`map-${v.rawId || v.id}-${v.plate}`}
                      position={[v.lat, v.lng]}
                      icon={createTruckMapIcon(v.plate, v.status)}
                    >
                      <Popup maxWidth={260} minWidth={230}>
                        <div className="font-sans text-[11px] p-1">
                          <div className="flex items-center justify-between mb-1.5 border-b border-slate-100 dark:border-slate-800 pb-1">
                            <span className="font-extrabold text-brand font-mono text-xs">{v.tripId}</span>
                            <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${STATUS_STYLE[v.status]?.badge || STATUS_STYLE['In Transit'].badge}`}>
                              {v.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-slate-800 dark:text-slate-200 font-bold text-xs mb-1">
                            <Building2 className="w-3.5 h-3.5 text-brand shrink-0" />
                            <span className="truncate">{v.customerName}</span>
                          </div>
                          <p className="font-semibold text-slate-600 dark:text-slate-400 text-[10px] mb-2 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{v.route}</span>
                          </p>
                          <div className="text-[10px] text-slate-600 dark:text-slate-400 space-y-1 mb-2.5 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                            <p className="flex justify-between"><span className="text-slate-500 font-medium">Driver:</span> <span className="font-bold text-slate-800 dark:text-slate-200">{v.driver}</span></p>
                            <p className="flex justify-between"><span className="text-slate-500 font-medium">Plate:</span> <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{v.plate}</span></p>
                            <p className="flex justify-between"><span className="text-slate-500 font-medium">ETA / Dist:</span> <span className="font-bold text-slate-800 dark:text-slate-200">{v.eta} • {v.distance}</span></p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Button
                              size="sm"
                              onClick={() => navigate(`/trips/${v.rawId || v.id}`)}
                              className="flex-1 h-7 text-[10px] bg-brand hover:bg-brand-hover text-white font-bold cursor-pointer"
                            >
                              View Trip
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(`/trips/tracking?tripId=${v.rawId || v.id}`)}
                              className="h-7 px-2 text-[10px] border-slate-200 font-bold hover:bg-slate-50 text-slate-700 cursor-pointer"
                              title="Live GPS Tracking"
                            >
                              <Navigation className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>

              {/* Map Footer Status Bar (Interactive Live Filters) */}
              <div className="px-3.5 py-2 border-t border-black/[0.04] dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between flex-wrap gap-1.5">
                <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] font-bold text-slate-600 dark:text-slate-400 flex-wrap w-full justify-between sm:justify-start">
                  <button
                    type="button"
                    onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'Dispatched' ? 'all' : 'Dispatched')}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                      selectedStatusFilter === 'Dispatched'
                        ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-extrabold ring-1 ring-indigo-400'
                        : 'hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
                    }`}
                    title="Filter Dispatched trips"
                  >
                    <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                    <span>Dispatched</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'AtPickup' ? 'all' : 'AtPickup')}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                      selectedStatusFilter === 'AtPickup'
                        ? 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-extrabold ring-1 ring-sky-400'
                        : 'hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
                    }`}
                    title="Filter Loading trips"
                  >
                    <div className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />
                    <span>Loading</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'InTransit' ? 'all' : 'InTransit')}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                      selectedStatusFilter === 'InTransit'
                        ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-extrabold ring-1 ring-amber-400'
                        : 'hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
                    }`}
                    title="Filter In Transit trips"
                  >
                    <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                    <span>In Transit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'AtDelivery' ? 'all' : 'AtDelivery')}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                      selectedStatusFilter === 'AtDelivery'
                        ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-extrabold ring-1 ring-purple-400'
                        : 'hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
                    }`}
                    title="Filter At Delivery trips"
                  >
                    <div className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                    <span>At Delivery</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'Delayed' ? 'all' : 'Delayed')}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                      selectedStatusFilter === 'Delayed'
                        ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-extrabold ring-1 ring-rose-400'
                        : 'hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
                    }`}
                    title="Filter Delayed trips"
                  >
                    <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                    <span>Delayed</span>
                  </button>

                  {selectedStatusFilter !== 'all' && (
                    <button
                      type="button"
                      onClick={() => setSelectedStatusFilter('all')}
                      className="text-[9px] text-brand hover:underline font-extrabold ml-auto cursor-pointer flex items-center gap-0.5"
                    >
                      <X className="w-2.5 h-2.5" /> Reset
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 3. Important Reminders */}
            <div className={`shrink-0 flex flex-col h-[390px] max-h-[390px] transition-all duration-300 ease-in-out ${isRemindersCollapsed ? 'w-full lg:w-[76px]' : 'w-full lg:w-[330px] xl:w-[360px]'}`}>
              <ImportantReminders
                collapsed={isRemindersCollapsed}
                onToggleCollapse={() => setIsRemindersCollapsed(!isRemindersCollapsed)}
              />
            </div>

          </div>

          {/* ── BOTTOM ROW: Active Transit Fleet (Kanban Board by default with Ledger switch) ──── */}
          <div className="w-full flex flex-col bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-sm gap-4">
            
            {/* Header Control Bar (All filters & actions right-aligned) */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              
              {/* Left: Title + Pill Counter */}
              <div className="flex items-center gap-2.5 shrink-0">
                <div className="p-2 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200/60 dark:border-orange-900/50">
                  <Truck className="w-4 h-4 text-brand shrink-0" />
                </div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                    Active Transit Fleet
                  </h2>
                  <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200/70 dark:border-slate-700/70">
                    {dashboardViewMode === 'kanban' ? filteredTripsForKanban.length : filteredActiveTrips.length} {((dashboardViewMode === 'kanban' ? filteredTripsForKanban.length : filteredActiveTrips.length) === 1) ? 'trip' : 'trips'}
                  </span>
                </div>
              </div>

              {/* Right: Filters & Action Group */}
              <div className="flex flex-wrap items-center justify-end gap-2 ml-auto">
                
                {/* 🔍 Search Input */}
                <div className="relative min-w-[170px] sm:min-w-[210px]">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="text"
                    value={tripSearch}
                    onChange={(e) => setTripSearch(e.target.value)}
                    placeholder="Search trip ID, driver, vehicle..."
                    className="h-8 pl-8 pr-7 text-xs font-medium border-slate-200/90 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 rounded-lg focus-visible:ring-brand"
                  />
                  {tripSearch && (
                    <button
                      onClick={() => setTripSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* 🏢 Compact Highlighted Company Filter Button (Ledger mode) */}
                {dashboardViewMode === 'ledger' && (
                  <div
                    className={`flex items-center gap-1 rounded-lg px-2 py-0.5 shadow-2xs transition-all ${
                      selectedCompany !== 'all'
                        ? 'bg-orange-50 dark:bg-orange-950/50 border border-orange-300 dark:border-orange-700/80 text-brand'
                        : 'bg-slate-100 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
                    }`}
                  >
                    <Building2
                      className={`w-3.5 h-3.5 shrink-0 ${
                        selectedCompany !== 'all' ? 'text-brand' : 'text-slate-500 dark:text-slate-400'
                      }`}
                    />
                    <Select
                      value={selectedCompany}
                      onValueChange={(val) => {
                        setSelectedCompany(val);
                        setTripSearch('');
                      }}
                    >
                      <SelectTrigger
                        className={`h-7 text-xs border-0 bg-transparent shadow-none px-1 focus:ring-0 focus:ring-offset-0 truncate cursor-pointer ${
                          selectedCompany !== 'all'
                            ? 'font-extrabold text-brand dark:text-orange-400 max-w-[140px]'
                            : 'font-semibold text-slate-700 dark:text-slate-200 max-w-[110px]'
                        }`}
                      >
                        <SelectValue placeholder="Company">
                          {selectedCompany === 'all' ? 'Company' : selectedCompany}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="max-h-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl rounded-xl">
                        <SelectItem value="all" className="text-xs font-bold text-brand cursor-pointer">
                          All Companies (Show All)
                        </SelectItem>
                        {companyOptions.map(([name, tripCount]) => (
                          <SelectItem key={name} value={name} className="text-xs cursor-pointer">
                            <span className="font-semibold">{name}</span>
                            {tripCount > 0 && (
                              <span className="ml-1.5 text-[10px] text-slate-400 font-mono">
                                ({tripCount})
                              </span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {selectedCompany !== 'all' && (
                      <button
                        type="button"
                        onClick={() => setSelectedCompany('all')}
                        className="p-0.5 -mr-0.5 rounded-full hover:bg-orange-200/80 dark:hover:bg-orange-900 text-orange-600 dark:text-orange-300 transition-colors cursor-pointer"
                        title="Clear company filter"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}

                {/* 🔀 Active Status Filter Dropdown (Only in Kanban mode) */}
                {dashboardViewMode === 'kanban' && (
                  <div
                    className={`flex items-center gap-1 rounded-lg px-2 py-0.5 shadow-2xs transition-all ${
                      selectedStatusFilter !== 'all'
                        ? 'bg-orange-50 dark:bg-orange-950/50 border border-orange-300 dark:border-orange-700/80 text-brand'
                        : 'bg-slate-100 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
                    }`}
                  >
                    <Filter
                      className={`w-3.5 h-3.5 shrink-0 ${
                        selectedStatusFilter !== 'all' ? 'text-brand' : 'text-slate-500 dark:text-slate-400'
                      }`}
                    />
                    <Select
                      value={selectedStatusFilter}
                      onValueChange={(val) => setSelectedStatusFilter(val)}
                    >
                      <SelectTrigger
                        className={`h-7 text-xs border-0 bg-transparent shadow-none px-1 focus:ring-0 focus:ring-offset-0 truncate cursor-pointer ${
                          selectedStatusFilter !== 'all'
                            ? 'font-extrabold text-brand dark:text-orange-400 max-w-[150px]'
                            : 'font-semibold text-slate-700 dark:text-slate-200 max-w-[120px]'
                        }`}
                      >
                        <SelectValue placeholder="Status">
                          {selectedStatusFilter === 'all'
                            ? 'All Statuses'
                            : selectedStatusFilter === 'Dispatched'
                            ? 'Dispatched'
                            : selectedStatusFilter === 'AtPickup'
                            ? 'At Pickup'
                            : selectedStatusFilter === 'InTransit'
                            ? 'In Transit'
                            : selectedStatusFilter === 'AtDelivery'
                            ? 'At Delivery'
                            : selectedStatusFilter === 'Delayed'
                            ? 'Delayed'
                            : selectedStatusFilter}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="max-h-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl rounded-xl">
                        <SelectItem value="all" className="text-xs font-bold text-brand cursor-pointer">
                          All Active Statuses
                        </SelectItem>
                        <SelectItem value="Dispatched" className="text-xs font-semibold cursor-pointer">
                          Dispatched (To Pickup)
                        </SelectItem>
                        <SelectItem value="AtPickup" className="text-xs font-semibold cursor-pointer">
                          Loading (At Pickup)
                        </SelectItem>
                        <SelectItem value="InTransit" className="text-xs font-semibold cursor-pointer">
                          In Transit
                        </SelectItem>
                        <SelectItem value="AtDelivery" className="text-xs font-semibold cursor-pointer">
                          At Delivery
                        </SelectItem>
                        <SelectItem value="Delayed" className="text-xs font-semibold cursor-pointer">
                          Delayed
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    {selectedStatusFilter !== 'all' && (
                      <button
                        type="button"
                        onClick={() => setSelectedStatusFilter('all')}
                        className="p-0.5 -mr-0.5 rounded-full hover:bg-orange-200/80 dark:hover:bg-orange-900 text-orange-600 dark:text-orange-300 transition-colors cursor-pointer"
                        title="Clear status filter"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}

                {/* View Switcher [ 🎛 Kanban | ☰ Ledger ] */}
                <div className="bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg flex items-center border border-slate-200/80 dark:border-slate-700 shadow-2xs shrink-0">
                  <button
                    type="button"
                    onClick={() => setDashboardViewMode('kanban')}
                    className={`px-2.5 py-1 rounded-md text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                      dashboardViewMode === 'kanban'
                        ? 'bg-white dark:bg-slate-900 text-brand shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                    title="Kanban Board View"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Kanban</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDashboardViewMode('ledger')}
                    className={`px-2.5 py-1 rounded-md text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                      dashboardViewMode === 'ledger'
                        ? 'bg-white dark:bg-slate-900 text-brand shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                    title="Ledger Table View"
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>Ledger</span>
                  </button>
                </div>

              </div>

            </div>

            {/* View Canvas Body */}
            {dashboardViewMode === 'kanban' ? (
              <div className="w-full flex-1 min-h-[460px] flex flex-col">
                <CompanyTripKanbanBoard
                  trips={filteredTripsForKanban}
                  companies={companyOptions.map(([name]) => name)}
                  onStatusChange={handleKanbanStatusChange}
                  isLoading={isTripsLoading}
                  isError={isTripsError}
                  onRetry={() => refetchTrips()}
                  statusFilter={selectedStatusFilter}
                  onStatusFilterChange={setSelectedStatusFilter}
                  onCreateTrip={() => navigate('/trips/new')}
                />
              </div>
            ) : (
              <div className="w-full flex flex-col min-h-[440px]">
                <DataTable
                  title={null}
                  columns={tripLedgerColumns}
                  data={filteredActiveTrips}
                  enableSelection={false}
                  compact={false}
                  pageSize={10}
                  pageSizeOptions={[10, 25, 50, 100]}
                  onRowClick={(row) => navigate(`/trips/${row.rawId || row.id}`)}
                  emptyTitle={
                    selectedCompany !== 'all'
                      ? `No active trips for ${selectedCompany}`
                      : 'No active trips found'
                  }
                  emptyMessage={
                    selectedCompany !== 'all'
                      ? `There are currently no active dispatch records for ${selectedCompany}.`
                      : 'There are currently no active dispatch records in transit or loading.'
                  }
                  className="min-h-[440px] flex flex-col justify-between shadow-none border-0"
                />
              </div>
            )}

          </div>

        </div>

        {/* ── Universal Export Modal ─────────────────────────────────── */}
        <ExportModal
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
          title="Export Active Transit Fleet"
          description="Choose your export preferences, filters, and columns."
          fileNamePrefix="active_transit_fleet"
          sheetName="Transit Fleet"
          subtitle={
            selectedCompany !== 'all'
              ? `Filtered by Company: ${selectedCompany}`
              : 'MERCON Logistics Active Transit Fleet'
          }
          filteredData={dashboardViewMode === 'kanban' ? filteredTripsForKanban : filteredActiveTrips}
          allData={dashboardViewMode === 'kanban' ? baseTripsForKanban : activeTrips}
          totalCount={dashboardViewMode === 'kanban' ? baseTripsForKanban.length : activeTrips.length}
          columns={DASHBOARD_EXPORT_COLUMNS}
          formats={['xlsx', 'csv', 'pdf']}
        />

      </DashboardLayout>
    </TooltipProvider>
  );
}
