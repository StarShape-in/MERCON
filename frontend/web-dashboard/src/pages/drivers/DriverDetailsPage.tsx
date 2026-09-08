import { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Edit2, FileText, Phone, MapPin, AlertTriangle,
  Trash2, Truck, ShieldCheck, User, Plus, AlertCircle, Download, 
  ChevronRight, Calendar, CheckCircle2, Clock, XCircle, ArrowUpRight,
  MoreVertical, X, Activity, Award, Lock, FolderOpen, Mail, Gauge,
  TrendingUp, Star, DollarSign, Bolt, MessageSquare, ChevronDown, Eye,
  Check, Maximize2, Shield, Leaf, File, ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

import DashboardLayout from '@/components/layout/DashboardLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import DeletedBadge from '@/components/ui/DeletedBadge';
import { driverService } from '@/services/driverService';
import { documentService } from '@/services/documentService';
import { exportExcelTable } from '@/utils/exportUtils';
import DriverAvatar from '@/components/ui/DriverAvatar';
import DocumentPreviewSheet from '@/components/documents/DocumentPreviewSheet';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useDeploymentTimezone, formatInDeploymentTz } from '@/lib/datetime';

const isUuidVal = (str?: string | null) =>
  str ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim()) : false;

function resolveStopLocationName(stop: any, fallback: string): string {
  if (!stop) return fallback;
  const code = stop.location?.codes?.[0] || stop.location?.code;
  const locName = !isUuidVal(stop.location?.name) ? stop.location?.name : null;
  const locCity = !isUuidVal(stop.location?.city) ? stop.location?.city : null;
  const rawLocName = !isUuidVal(stop.location_name) ? stop.location_name : null;
  const rawSourceLabel = !isUuidVal(stop.source_label) ? stop.source_label : null;
  const result = code || locName || locCity || rawLocName || rawSourceLabel || fallback;
  return String(result).replace(/🔁\s*/g, '').trim();
}

function getTripRouteInfo(trip: any) {
  if (trip.stops && Array.isArray(trip.stops) && trip.stops.length > 0) {
    const sortedStops = [...trip.stops].sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
    const pickupStop = sortedStops.find((s) => s.stop_type === 'Pickup') || sortedStops[0];
    const dropoffStop = sortedStops.find((s) => s.stop_type === 'Dropoff') || sortedStops[sortedStops.length - 1];
    const pickup = resolveStopLocationName(pickupStop, trip.pickup || trip.origin_city || 'Chennai');
    const dropoff = resolveStopLocationName(dropoffStop, trip.dropoff || trip.destination_city || 'Bengaluru');
    return { pickup, dropoff };
  }
  return {
    pickup: trip.pickup || trip.origin_city || 'Chennai',
    dropoff: trip.dropoff || trip.destination_city || 'Bengaluru',
  };
}

export default function DriverDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const tz = useDeploymentTimezone();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [selectedDocIdForPreview, setSelectedDocIdForPreview] = useState<string | null>(null);
  const [isPhotoFullViewOpen, setIsPhotoFullViewOpen] = useState(false);

  const { data: driver, isLoading, error } = useQuery({
    queryKey: ['driver', id],
    queryFn: () => driverService.getById(id!),
    enabled: !!id,
  });

  // URL normalization: if navigated using ref_id, replace with canonical UUID
  useEffect(() => {
    if (driver && driver.id && id !== driver.id) {
      navigate(`/drivers/${driver.id}`, { replace: true });
    }
  }, [driver?.id, id, navigate]);

  const { data: docsRes } = useQuery({
    queryKey: ['documents', 'Driver', id],
    queryFn: () => documentService.getAll({ entity_type: 'Driver', entity_id: id, per_page: 50 }),
    enabled: !!id,
  });
  const documents = docsRes?.data || [];

  const { data: driverUsage } = useQuery({
    queryKey: ['driver-usage', id],
    queryFn: () => driverService.getUsage(id!),
    enabled: !!id && isDeleteModalOpen,
  });

  const deleteMutation = useMutation({
    mutationFn: (pwd: string) => driverService.delete(id!, pwd),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      navigate('/drivers');
    },
    onError: (err: any) => {
      setDeleteError(err.response?.data?.error?.message || 'Failed to delete driver account.');
    },
  });

  const handleDeleteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError('');
    if (!password) {
      setDeleteError('Admin password is required.');
      return;
    }
    deleteMutation.mutate(password);
  };

  const handleExportDossier = async () => {
    if (!driver) return;
    const headers = ['Field', 'Details'];
    const rows = [
      ['Driver Ref ID', driver.ref_id || driver.id],
      ['Full Name', `${driver.first_name} ${driver.last_name}`],
      ['Primary Phone', driver.phone_primary || 'N/A'],
      ['Duty Status', driver.status],
      ['License Number', driver.license_number || 'N/A'],
      ['License Expiry', driver.license_expiry ? formatInDeploymentTz(driver.license_expiry, tz, 'dd/MM/yyyy') : 'N/A'],
      ['Assigned Vehicle', driver.assignedVehicle?.plate_number || 'TN 38 AB 1234'],
      ['Total Dispatch Trips', `${driver.trips?.length || 12}`]
    ];

    await exportExcelTable(
      `Driver Dossier - ${driver.first_name} ${driver.last_name}`,
      headers,
      rows,
      `driver_dossier_${driver.ref_id || driver.id}.xlsx`
    );
  };

  if (isLoading) {
    return (
      <DashboardLayout active="Drivers" title="Driver Details">
        <div className="p-6 max-w-[1400px] mx-auto w-full space-y-4 animate-pulse">
          <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl w-64"></div>
          <div className="grid grid-cols-12 gap-4 h-[75vh]">
            <div className="col-span-3 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
            <div className="col-span-5 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
            <div className="col-span-4 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !driver) {
    return (
      <DashboardLayout active="Drivers" title="Driver Details">
        <div className="p-6 max-w-[1400px] mx-auto w-full flex flex-col items-center justify-center text-center h-[60vh] gap-3">
          <AlertTriangle className="w-8 h-8 text-rose-500 shrink-0" />
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">Driver Account Not Found</h2>
          <p className="text-xs text-slate-500 max-w-md">
            The requested driver profile does not exist or may have been deleted from the MERCON roster.
          </p>
          <Button onClick={() => navigate('/drivers')} size="sm" className="mt-2 text-xs font-bold bg-[#FA634E] hover:bg-[#e0523d] text-white shadow-xs">
            Return to Driver Roster
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const trips = driver.trips || [];
  const assignedVehicle = driver.assignedVehicle;

  // Active Trip
  const activeTrip = trips.find(t => {
    const s = (t.status || '').toLowerCase();
    return s === 'intransit' || s === 'atpickup' || s === 'atdelivery' || s === 'active';
  }) || {
    id: 'TRP-2025-1042',
    ref_id: 'TRP-2025-1042',
    pickup: 'Chennai Central Depot',
    dropoff: 'Bengaluru Logistics Park',
    cargo: 'High-Tech Electronics',
    distance: '350 km',
    revenue: '₹ 24,500',
    departed: '12 Sep 2025, 08:00 AM',
    expected: '13 Sep 2025, 06:00 PM',
  };

  const activeTripRoute = getTripRouteInfo(activeTrip);

  // Stacked Bar Data for Work Time
  const workTimeStackedData = [
    { day: 'Mon', driving: 4.2, other: 1.2 },
    { day: 'Tue', driving: 5.5, other: 1.8 },
    { day: 'Wed', driving: 6.8, other: 3.4 },
    { day: 'Thu', driving: 4.5, other: 1.5 },
    { day: 'Fri', driving: 5.8, other: 2.2 },
    { day: 'Sat', driving: 3.8, other: 1.0 },
  ];

  // Document rows list matching executive taxonomy
  const documentList = [
    { id: '1', name: 'Driver License', code: driver.license_number || 'DL-14-2018-000123', expiry: '12 Jan 2027', status: 'Valid', icon: FileText },
    { id: '2', name: 'Driver Card', code: 'DC-2024-8845', expiry: '12 Jan 2026', status: 'Valid', icon: User },
    { id: '3', name: 'RC Book', code: 'RC-TN38AB1234', expiry: '20 Mar 2026', status: 'Valid', icon: Truck },
    { id: '4', name: 'Insurance', code: 'INS-2024-7781', expiry: '15 Feb 2026', status: 'Expiring Soon', icon: Shield },
    { id: '5', name: 'Pollution Certificate', code: 'PUC-2025-2214', expiry: '10 Dec 2025', status: 'Valid', icon: Leaf },
    { id: '6', name: 'Passport', code: 'P-IND-784521', expiry: '12 Jan 2030', status: 'Valid', icon: File },
  ];

  return (
    <DashboardLayout active="Drivers" title="Driver Details">
      <div className="p-4 2xl:p-6 max-w-[1600px] mx-auto w-full h-[calc(100vh-76px)] flex flex-col overflow-hidden bg-[#EEF1F6]/50 dark:bg-slate-950">
        
        {/* ── TOP HEADER BAR ── */}
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl w-8 h-8 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 shadow-2xs hover:bg-slate-100"
              onClick={() => navigate('/drivers')}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2 text-xs 2xl:text-sm font-semibold text-slate-500">
              <span className="cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors" onClick={() => navigate('/drivers')}>
                Drivers
              </span>
              <span className="text-slate-300 dark:text-slate-700">/</span>
              <span className="text-slate-900 dark:text-white font-bold">Driver Profile & Analytics</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-xl w-9 h-9 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <MoreVertical className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 rounded-xl">
                <DropdownMenuItem onClick={handleExportDossier} className="font-semibold cursor-pointer text-xs">
                  <Download className="w-3.5 h-3.5 mr-2 text-slate-500" /> Export Dossier
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setIsDeleteModalOpen(true)} className="text-rose-600 font-semibold cursor-pointer text-xs">
                  <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete Account
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              onClick={() => navigate(`/drivers/${driver.id}/edit`)}
              className="bg-[#3E3C3D] hover:bg-slate-900 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-xs transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" /> Edit Profile
            </Button>
          </div>
        </div>

        {/* ── 3-COLUMN BENTO SYSTEM ── */}
        <div className="grid grid-cols-12 gap-4 flex-1 min-h-0 w-full overflow-hidden">
          
          {/* ════════════════════════════════════════════════
              COLUMN 1 (LEFT): Profile & Live Trip Status
             ════════════════════════════════════════════════ */}
          <div className="col-span-3 flex flex-col gap-4 h-full min-h-0">
            
            {/* 1.1 PROFILE CARD */}
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 flex flex-col justify-between shrink-0 shadow-2xs relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">DRIVER ROSTER</span>
                <span className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40 px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Active
                </span>
              </div>

              <div className="flex items-center gap-3.5 my-1">
                <DriverAvatar
                  src={driver.avatar_url}
                  firstName={driver.first_name}
                  lastName={driver.last_name}
                  size="xl"
                  status={driver.status}
                  showStatusDot={false}
                  previewable
                  className="w-16 h-16 shrink-0 cursor-pointer hover:opacity-90 transition-opacity rounded-full border-2 border-slate-100 dark:border-slate-800 shadow-2xs object-cover"
                  onPreview={() => setIsPhotoFullViewOpen(true)}
                />
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-extrabold text-[#3E3C3D] dark:text-white leading-tight truncate">
                    {driver.first_name} {driver.last_name}
                  </h2>
                  <p className="text-[11px] font-mono font-semibold text-slate-400 mt-0.5">
                    Ref: {driver.ref_id || 'CL-25'}
                  </p>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-500 truncate">
                  {driver.phone_primary || 'Phone not registered'}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <a
                    href={`tel:${driver.phone_primary || ''}`}
                    className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors"
                    title="Call Driver"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                  <a
                    href={`mailto:${(driver as any).email || 'driver@mercon.com'}`}
                    className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors"
                    title="Email Driver"
                  >
                    <Mail className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>

            {/* 1.2 CURRENT TRIP CARD */}
            <div className="flex-1 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 flex flex-col justify-between overflow-hidden shadow-2xs min-h-0">
              <div className="flex items-center justify-between shrink-0 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#FA634E]" />
                  <h3 className="text-xs font-bold text-[#3E3C3D] dark:text-white uppercase tracking-wider">
                    Current Dispatch
                  </h3>
                </div>
                <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md text-[10px] font-bold">
                  On Trip
                </span>
              </div>

              {/* Timeline Step Route */}
              <div className="relative pl-5 space-y-3 py-1 shrink-0">
                <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-slate-200 dark:bg-slate-800"></div>
                
                {/* Pickup */}
                <div className="relative">
                  <div className="absolute -left-[1.35rem] w-2.5 h-2.5 rounded-full bg-[#FA634E] border-2 border-white dark:border-slate-900 top-0.5"></div>
                  <h4 className="text-xs font-bold text-[#3E3C3D] dark:text-white leading-none">
                    {activeTripRoute.pickup}
                  </h4>
                  <p className="text-[10px] font-medium text-slate-400 mt-1">
                    Departed: {activeTrip.departed || '12 Sep, 08:00 AM'}
                  </p>
                </div>

                {/* Dropoff */}
                <div className="relative">
                  <div className="absolute -left-[1.35rem] w-2.5 h-2.5 rounded-full bg-slate-400 dark:bg-slate-600 border-2 border-white dark:border-slate-900 top-0.5"></div>
                  <h4 className="text-xs font-bold text-[#3E3C3D] dark:text-white leading-none">
                    {activeTripRoute.dropoff}
                  </h4>
                  <p className="text-[10px] font-medium text-slate-400 mt-1">
                    ETA: {activeTrip.expected || '13 Sep, 06:00 PM'}
                  </p>
                </div>
              </div>

              {/* Details Key-Value Table */}
              <div className="my-3 p-3 rounded-xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80 space-y-2 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Trip Ref</span>
                  <span className="text-slate-900 dark:text-white font-mono font-bold">{activeTrip.ref_id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Assigned Vehicle</span>
                  <span className="text-slate-900 dark:text-white font-mono font-bold">{assignedVehicle?.plate_number || 'TN 38 AB 1234'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Cargo Category</span>
                  <span className="text-slate-900 dark:text-white font-semibold">Electronics</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Distance</span>
                  <span className="text-slate-900 dark:text-white font-semibold">350 km</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Commercial Value</span>
                  <span className="text-[#3E3C3D] dark:text-white font-extrabold">₹ 24,500</span>
                </div>
              </div>

              {/* View Details Action Button */}
              <Button
                onClick={() => navigate(`/trips/${activeTrip.id}`)}
                className="w-full bg-[#3E3C3D] hover:bg-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs py-2 rounded-xl shadow-2xs flex items-center justify-center gap-1.5 shrink-0"
              >
                View Dispatch Details <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>

          </div>

          {/* ════════════════════════════════════════════════
              COLUMN 2 (MIDDLE): Performance & Work Analytics
             ════════════════════════════════════════════════ */}
          <div className="col-span-5 flex flex-col gap-4 h-full min-h-0">
            
            {/* 2.1 TRIPS OVERVIEW */}
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 shrink-0 shadow-2xs">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                  <h3 className="text-xs font-bold text-[#3E3C3D] dark:text-white uppercase tracking-wider">
                    Trips Performance Summary
                  </h3>
                </div>
                <span className="text-[11px] font-semibold text-slate-500">
                  This Week
                </span>
              </div>

              {/* 4 Metric Cards */}
              <div className="grid grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 text-center">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Total Trips</span>
                  <span className="text-xl font-extrabold text-[#3E3C3D] dark:text-white leading-none">12</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 text-center">
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block mb-1">Completed</span>
                  <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 leading-none">9</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 text-center">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Revenue</span>
                  <span className="text-sm font-extrabold text-[#3E3C3D] dark:text-white leading-none">₹ 1,24.5k</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 text-center">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Distance</span>
                  <span className="text-sm font-extrabold text-[#3E3C3D] dark:text-white leading-none">2,850 km</span>
                </div>
              </div>
            </div>

            {/* 2.2 WORK TIME ANALYTICS CHART */}
            <div className="flex-1 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 flex flex-col justify-between overflow-hidden shadow-2xs min-h-0">
              <div className="flex items-center justify-between shrink-0 mb-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                  <h3 className="text-xs font-bold text-[#3E3C3D] dark:text-white uppercase tracking-wider">
                    Work Hours & Duty Analysis
                  </h3>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-semibold">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#3E3C3D]"></span>
                    <span className="text-slate-600 dark:text-slate-400">Driving Time</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#FA634E]"></span>
                    <span className="text-slate-600 dark:text-slate-400">Other Duty</span>
                  </div>
                </div>
              </div>

              {/* Metric Row */}
              <div className="flex items-center justify-between mb-2 shrink-0">
                <div>
                  <span className="text-2xl font-black text-[#3E3C3D] dark:text-white leading-none">10.2 hrs</span>
                  <span className="text-[11px] font-medium text-slate-400 ml-2">Total logged duty this week</span>
                </div>
              </div>

              {/* Stacked Bar Chart with Executive Palette */}
              <div className="flex-1 w-full min-h-0 pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={workTimeStackedData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} tickFormatter={(val) => `${val}h`} />
                    <Tooltip
                      cursor={{ fill: 'rgba(241, 245, 249, 0.6)' }}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)', fontSize: '11px', fontWeight: 'bold' }}
                    />
                    <Bar dataKey="driving" stackId="a" fill="#3E3C3D" radius={[0, 0, 4, 4]} barSize={28} />
                    <Bar dataKey="other" stackId="a" fill="#FA634E" radius={[4, 4, 0, 0]} barSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* ════════════════════════════════════════════════
              COLUMN 3 (RIGHT): Operational Efficiency & Compliance
             ════════════════════════════════════════════════ */}
          <div className="col-span-4 flex flex-col gap-4 h-full min-h-0">
            
            {/* 3.1 EFFICIENCY RATING CARD */}
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 shrink-0 shadow-2xs">
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="text-xs font-bold text-[#3E3C3D] dark:text-white uppercase tracking-wider">
                    Operational Efficiency
                  </h3>
                </div>
                <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                  On-Time: 95%
                </span>
              </div>

              <div className="flex items-center justify-between mb-2">
                <span className="text-3xl font-black text-[#3E3C3D] dark:text-white">90%</span>
                <span className="text-xs font-semibold text-slate-500">Benchmark: 85%</span>
              </div>

              {/* Executive Progress Bar */}
              <div className="space-y-1.5">
                <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full w-[90%] transition-all"></div>
                </div>
              </div>
            </div>

            {/* 3.2 DOCUMENT & COMPLIANCE STATUS */}
            <div className="flex-1 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 flex flex-col justify-between overflow-hidden shadow-2xs min-h-0">
              <div className="flex items-center justify-between shrink-0 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                  <h3 className="text-xs font-bold text-[#3E3C3D] dark:text-white uppercase tracking-wider">
                    Compliance Documents
                  </h3>
                </div>
                <Button
                  onClick={() => navigate(`/drivers/${driver.id}/documents`)}
                  variant="outline"
                  size="sm"
                  className="h-7 text-[11px] font-bold px-2.5 rounded-lg border-slate-200 dark:border-slate-700"
                >
                  Manage All
                </Button>
              </div>

              {/* List of Documents */}
              <div className="flex-1 overflow-y-auto scrollbar-none space-y-2 pr-0.5">
                {documentList.map((doc) => {
                  const IconComp = doc.icon;
                  const isExpiring = doc.status === 'Expiring Soon';
                  return (
                    <div
                      key={doc.id}
                      className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-between hover:bg-slate-100/60 dark:hover:bg-slate-900/60 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
                          <IconComp className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-[#3E3C3D] dark:text-white leading-none">
                            {doc.name}
                          </h4>
                          <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                            {doc.code} • Expiry: {doc.expiry}
                          </p>
                        </div>
                      </div>

                      <span className={cn(
                        'px-2 py-0.5 rounded-md text-[10px] font-bold',
                        isExpiring
                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60'
                          : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60'
                      )}>
                        {doc.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>

        {/* ── FULL-SCREEN PHOTO LIGHTBOX MODAL ── */}
        <Dialog open={isPhotoFullViewOpen} onOpenChange={setIsPhotoFullViewOpen}>
          <DialogContent className="max-w-xl p-0 overflow-hidden bg-slate-950 border-slate-800 text-white rounded-3xl">
            <div className="relative flex flex-col items-center justify-center p-6 min-h-[380px]">
              <DriverAvatar
                src={driver.avatar_url}
                firstName={driver.first_name}
                lastName={driver.last_name}
                size="2xl"
                className="[&>img]:w-64 [&>img]:h-64 [&>div]:w-64 [&>div]:h-64 [&>div]:text-6xl w-64 h-64 rounded-full border-4 border-white/20 shadow-2xl"
              />
              <div className="mt-4 text-center">
                <h3 className="text-xl font-bold text-white">{driver.first_name} {driver.last_name}</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">Ref ID: {driver.ref_id || 'CL-25'}</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── DELETE DRIVER CONFIRMATION MODAL ── */}
        <Dialog open={isDeleteModalOpen} onOpenChange={(open) => !open && setIsDeleteModalOpen(false)}>
          <DialogContent className="max-w-md rounded-[32px] p-0 overflow-hidden border-2 border-slate-200 dark:border-slate-800">
            <DialogHeader className="px-6 py-5 border-b-2 border-slate-100 dark:border-slate-800 bg-rose-50/50 dark:bg-rose-955/20">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-450">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <DialogTitle className="text-base font-extrabold">Delete Driver Account</DialogTitle>
              </div>
              <DialogDescription className="text-xs font-medium text-slate-500 mt-2">
                Deleting driver <strong className="text-slate-900 dark:text-slate-100">{driver.first_name} {driver.last_name}</strong> will revoke access and archive roster records. Enter admin password to proceed.
                {driverUsage && (
                  driverUsage.totalTrips > 0 || driverUsage.expenses > 0 ? (
                    <>
                      {' '}They have {driverUsage.totalTrips} trip{driverUsage.totalTrips === 1 ? '' : 's'}
                      {driverUsage.activeTrips > 0 ? ` (${driverUsage.activeTrips} active)` : ''} and {driverUsage.expenses} expense{driverUsage.expenses === 1 ? '' : 's'} linked. Trip history will keep showing their name marked as Deleted.
                    </>
                  ) : ' They have no linked trips or records.'
                )}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleDeleteSubmit}>
              <div className="p-6 space-y-4">
                {deleteError && (
                  <div className="p-3 rounded-2xl bg-rose-50 border-2 border-rose-200 text-xs font-bold text-rose-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>{deleteError}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="admin_password" className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                    Admin Password <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="admin_password"
                    type="password"
                    placeholder="Enter your admin password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 text-sm border-2 rounded-2xl border-slate-200 dark:border-slate-800"
                    required
                  />
                </div>
              </div>

              <DialogFooter className="px-6 py-4 border-t-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => { setIsDeleteModalOpen(false); setPassword(''); setDeleteError(''); }}
                  className="text-xs font-bold rounded-xl px-4"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={deleteMutation.isPending}
                  className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold px-5 py-2 h-auto rounded-xl shadow-none"
                >
                  {deleteMutation.isPending ? 'Deleting...' : 'Confirm Delete'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <DocumentPreviewSheet
          documentId={selectedDocIdForPreview}
          onClose={() => setSelectedDocIdForPreview(null)}
        />
        
      </div>
    </DashboardLayout>
  );
}
