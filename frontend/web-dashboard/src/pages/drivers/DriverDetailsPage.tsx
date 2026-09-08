import { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Edit2, FileText, Phone, MapPin, AlertTriangle,
  Trash2, Truck, ShieldCheck, User, Plus, AlertCircle, Download, 
  ChevronRight, Calendar, CheckCircle2, Clock, XCircle, ArrowUpRight,
  MoreVertical, X, Activity, Award, Lock, FolderOpen,
  TrendingUp, Star, DollarSign, Bolt, MessageSquare, ChevronDown, Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { AreaChart, Area, ResponsiveContainer, XAxis, Tooltip } from 'recharts';


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
import { resolveFileUrl } from '@/lib/documents';

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
    const pickup = resolveStopLocationName(pickupStop, trip.pickup || trip.origin_city || 'Depot');
    const dropoff = resolveStopLocationName(dropoffStop, trip.dropoff || trip.destination_city || 'Delivery');
    return { pickup, dropoff };
  }
  return {
    pickup: trip.pickup || trip.origin_city || 'Central Terminal',
    dropoff: trip.dropoff || trip.destination_city || 'Client Site',
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
      ['Assigned Vehicle', driver.assignedVehicle?.plate_number || 'Unassigned'],
      ['Total Dispatch Trips', `${driver.trips?.length || 0}`]
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
        <div className="px-4 sm:px-6 pb-6 max-w-[1200px] mx-auto w-full space-y-4 animate-pulse">
          <div className="h-36 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-[200px] bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
            <div className="h-[200px] bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
          </div>
          <div className="h-[240px] bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !driver) {
    return (
      <DashboardLayout active="Drivers" title="Driver Details">
        <div className="px-4 sm:px-6 pb-6 max-w-[1200px] mx-auto w-full flex flex-col items-center justify-center text-center h-[60vh] gap-3">
          <AlertTriangle className="w-8 h-8 text-rose-500 shrink-0" />
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">Driver Account Not Found</h2>
          <p className="text-xs text-slate-500 max-w-md">
            The requested driver profile does not exist or may have been deleted from the MERCON roster.
          </p>
          <Button onClick={() => navigate('/drivers')} size="sm" className="mt-2 text-xs font-bold bg-brand hover:bg-brand-hover text-white shadow-sm">
            Return to Driver Roster
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const isLicenseExpired = driver.license_expiry ? new Date(driver.license_expiry) < new Date() : false;
  const trips = driver.trips || [];
  const assignedVehicle = driver.assignedVehicle;

  // Categorize active/upcoming vs history
  const activeUpcomingTrips = trips.filter((t) => {
    const s = (t.status || '').toLowerCase();
    return s !== 'completed' && s !== 'invoiced' && s !== 'cancelled';
  });

  const historyTrips = trips.filter((t) => {
    const s = (t.status || '').toLowerCase();
    return s === 'completed' || s === 'invoiced' || s === 'cancelled';
  });

  // Active Trip: First active trip in activeUpcomingTrips
  const activeTrip = activeUpcomingTrips.find(t => {
    const s = (t.status || '').toLowerCase();
    return s === 'intransit' || s === 'atpickup' || s === 'atdelivery';
  }) || null;

  const activeTripRoute = activeTrip ? getTripRouteInfo(activeTrip) : { pickup: '', dropoff: '' };

  // Last Dispatch: Most recent completed trip from history
  const lastDispatchDate = (() => {
    const completedTrips = historyTrips.filter(t => (t.status || '').toLowerCase() === 'completed');
    if (completedTrips.length === 0) return null;
    const sorted = [...completedTrips].sort((a, b) => {
      const dateA = new Date(a.planned_start || a.createdAt || 0).getTime();
      const dateB = new Date(b.planned_start || b.createdAt || 0).getTime();
      return dateB - dateA;
    });
    return sorted[0].planned_start || sorted[0].createdAt || null;
  })();

  // Next Assignment: Next upcoming trip in activeUpcomingTrips that is not active yet
  const nextAssignment = (() => {
    const scheduled = activeUpcomingTrips.filter(t => t.id !== activeTrip?.id);
    if (scheduled.length === 0) return null;
    const sorted = [...scheduled].sort((a, b) => {
      const dateA = new Date(a.planned_start || a.createdAt || 0).getTime();
      const dateB = new Date(b.planned_start || b.createdAt || 0).getTime();
      return dateA - dateB;
    });
    return sorted[0];
  })();

  // Documents Check status
  const getDocCheck = (types: string[]) => {
    const doc = documents.find(d => types.some(t => d.doc_type.toLowerCase().includes(t.toLowerCase())));
    if (!doc) return { id: null, label: '⚠ Due', className: 'text-amber-600 bg-amber-50 dark:bg-amber-955/20 border-amber-250/50', icon: AlertTriangle };
    const isExpired = doc.expiry_date && new Date(doc.expiry_date) < new Date();
    if (isExpired) return { id: doc.id, label: '⚠ Expired', className: 'text-rose-600 bg-rose-50 dark:bg-rose-955/20 border-rose-200/50', icon: AlertTriangle };
    return { id: doc.id, label: '✓ Valid', className: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/25 border-emerald-250/50', icon: CheckCircle2 };
  };

  const licenseCheck = getDocCheck(['License', 'Driver License']);
  const driverCardCheck = getDocCheck(['Card', 'Driver Card']);
  const iqamaCheck = getDocCheck(['IQAMA', 'Iqama', 'ID', 'National ID']);
  const passportCheck = getDocCheck(['Passport']);
 
  // Recent Trips List: Most recent 5 completed trips
  const recentTripsList = (() => {
    const completed = historyTrips.filter(t => (t.status || '').toLowerCase() === 'completed');
    return [...completed].sort((a, b) => {
      const dateA = new Date(a.planned_start || a.createdAt || 0).getTime();
      const dateB = new Date(b.planned_start || b.createdAt || 0).getTime();
      return dateB - dateA;
    }).slice(0, 5);
  })();

  const mockWorkTimeData = [
    { day: 'Mon', hours: 8.5 },
    { day: 'Tue', hours: 9.2 },
    { day: 'Wed', hours: 7.8 },
    { day: 'Thu', hours: 10.5 },
    { day: 'Fri', hours: 8.0 },
    { day: 'Sat', hours: 4.5 },
    { day: 'Sun', hours: 0 },
  ];

  return (
    <DashboardLayout active="Drivers" title={`${driver.first_name} ${driver.last_name}`}>
      {/* One screen non-scrollable UI */}
      <div className="h-[calc(100vh-72px)] w-full p-4 flex flex-col overflow-hidden animate-fade-in">
        
        {/* Strict 12-column, 3-row grid with explicit box placement coordinates */}
        <div className="grid grid-cols-12 grid-rows-3 gap-4 w-full h-full min-h-0">
          
          {/* ── 1. DRIVER PROFILE (🔵 Very Light Blue) ── */}
          {/* Position: Column 1 (Left), Row 1 */}
          <div className="col-start-1 col-span-3 row-start-1 row-span-1 rounded-[24px] bg-sky-50/80 dark:bg-sky-950/25 border-2 border-sky-200/70 dark:border-sky-800/40 p-3.5 flex flex-col justify-between relative group overflow-hidden h-full shadow-xs">
            <div className="absolute top-2 right-2 z-10">
               <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full w-8 h-8 bg-white/70 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-900">
                      <MoreVertical className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44 rounded-xl">
                    <DropdownMenuItem onClick={() => navigate(`/drivers/${driver.id}/edit`)} className="font-bold cursor-pointer">
                      <Edit2 className="w-4 h-4 mr-2" /> Edit Driver
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportDossier} className="font-bold cursor-pointer">
                      <Download className="w-4 h-4 mr-2" /> Export Dossier
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setIsDeleteModalOpen(true)} className="text-rose-600 font-bold cursor-pointer">
                      <Trash2 className="w-4 h-4 mr-2" /> Delete Account
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <div className="flex-1 flex justify-center items-center pb-1">
              <DriverAvatar
                src={driver.avatar_url}
                firstName={driver.first_name}
                lastName={driver.last_name}
                size="2xl"
                status={driver.status}
                showStatusDot={false}
                previewable
                className="w-16 h-16 2xl:w-20 2xl:h-20 shrink-0 cursor-pointer hover:scale-105 transition-transform rounded-full border-4 border-white dark:border-slate-800 shadow-sm"
                onPreview={() => setIsPhotoFullViewOpen(true)}
              />
            </div>

            <div className="w-full bg-white dark:bg-slate-950 rounded-[16px] p-2.5 flex flex-col items-center justify-center text-center shadow-xs border border-sky-100 dark:border-sky-900/30">
              <h1 className="text-sm 2xl:text-base font-black text-slate-900 dark:text-slate-100 uppercase tracking-tighter leading-none mb-1 truncate w-full">
                {driver.first_name} {driver.last_name}
              </h1>
              <div className="flex items-center justify-center gap-2">
                <p className="text-[10px] font-mono font-bold text-sky-700 dark:text-sky-400 uppercase tracking-wider">
                  {driver.ref_id || 'DRV-123'}
                </p>
                <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                <Badge variant="outline" className={cn(
                  'text-[8px] font-extrabold px-1.5 py-0 border-0 uppercase tracking-wider',
                  (driver.status || '').toLowerCase() === 'available' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                )}>
                  {driver.status}
                </Badge>
              </div>
            </div>
          </div>

          {/* ── 2. WORK TIME & ANALYTICS (🟣 Very Light Lavender/Blue) ── */}
          {/* Position: Column 1 (Left), Rows 2 & 3 */}
          <div className="col-start-1 col-span-3 row-start-2 row-span-2 rounded-[24px] bg-indigo-50/70 dark:bg-indigo-950/20 border-2 border-indigo-200/70 dark:border-indigo-800/40 p-4 flex flex-col h-full min-h-0 overflow-hidden shadow-xs">
            <h3 className="text-xs font-black text-indigo-950 dark:text-indigo-200 uppercase tracking-widest mb-3 shrink-0 flex items-center gap-2">
               <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Work Time & Info
            </h3>

            <div className="flex-1 flex flex-col gap-2.5 overflow-y-auto scrollbar-none pb-1">
              <div className="p-3 rounded-2xl bg-white/90 dark:bg-slate-950/60 border border-indigo-100 dark:border-indigo-900/30 flex items-center justify-between shadow-2xs">
                <div>
                  <span className="text-[9px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider block">Weekly Driving</span>
                  <span className="text-sm font-black text-slate-900 dark:text-white">40.5 Hours</span>
                </div>
                <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 border-none text-[9px] font-bold">Optimal</Badge>
              </div>

              <div className="p-2.5 rounded-2xl bg-white/80 dark:bg-slate-950/50 border border-indigo-100/80 dark:border-indigo-900/30 flex flex-col">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Primary Phone</span>
                <span className="text-xs font-mono font-black text-slate-900 dark:text-white">{driver.phone_primary || 'N/A'}</span>
              </div>
              <div className="p-2.5 rounded-2xl bg-white/80 dark:bg-slate-950/50 border border-indigo-100/80 dark:border-indigo-900/30 flex flex-col">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">License Number</span>
                <span className="text-xs font-mono font-black text-slate-900 dark:text-white truncate">{driver.license_number || 'N/A'}</span>
              </div>
              <div className="p-2.5 rounded-2xl bg-white/80 dark:bg-slate-950/50 border border-indigo-100/80 dark:border-indigo-900/30 flex flex-col relative">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">License Expiry</span>
                <span className="text-xs font-mono font-black text-slate-900 dark:text-white">
                  {driver.license_expiry ? formatInDeploymentTz(driver.license_expiry, tz, 'dd MMM yyyy') : 'N/A'}
                </span>
                {isLicenseExpired && (
                  <Badge className="absolute top-2.5 right-2.5 bg-rose-100 text-rose-700 px-1.5 py-0 text-[8px]">EXP</Badge>
                )}
              </div>
            </div>
          </div>

          {/* ── 3. CURRENT TRIP (🟢 Very Light Green) ── */}
          {/* Position: Column 2 (Middle), Row 1 */}
          <div className="col-start-4 col-span-5 row-start-1 row-span-1 rounded-[24px] bg-emerald-50/70 dark:bg-emerald-950/20 border-2 border-emerald-200/70 dark:border-emerald-800/40 p-4 flex flex-col justify-between h-full relative overflow-hidden shadow-xs">
            {activeTrip && (
              <div className="absolute top-0 right-0 p-4 opacity-[0.04] pointer-events-none">
                 <Truck className="w-32 h-32 text-emerald-900" />
              </div>
            )}
            <div className="flex items-center justify-between mb-2 relative z-10 shrink-0">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-black text-emerald-950 dark:text-emerald-200 uppercase tracking-widest flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Current Trip
                </h3>
              </div>
              <Badge className={cn('px-2 py-0.5 text-[9px] font-extrabold uppercase shadow-none border-0', activeTrip ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600')}>
                {activeTrip ? 'Live On-Trip' : 'Standby'}
              </Badge>
            </div>

            {activeTrip ? (
              <div className="flex-1 flex items-center justify-between relative z-10 gap-4">
                <div className="bg-white/90 dark:bg-slate-950/60 p-2.5 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 shrink-0 shadow-2xs">
                  <p className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-0.5">Trip Ref</p>
                  <p className="text-base font-black text-slate-900 dark:text-white cursor-pointer hover:text-[#FA634E] hover:underline" onClick={() => navigate(`/trips/${activeTrip.id}`)}>{activeTrip.ref_id}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1 mb-0.5">Vehicle</p>
                  <p className="text-xs font-mono font-black text-slate-700 dark:text-slate-300">{assignedVehicle?.plate_number || 'N/A'}</p>
                </div>
                
                <div className="flex-1 relative pl-5 py-1">
                  <div className="absolute left-1.5 top-2 bottom-2 w-0.5 bg-emerald-200 dark:bg-emerald-800"></div>
                  <div className="relative mb-2">
                    <div className="absolute -left-[1.2rem] w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 top-1"></div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none">Pickup</p>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate mt-0.5">{activeTripRoute.pickup}</p>
                  </div>
                  <div className="relative">
                    <div className="absolute -left-[1.2rem] w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-white dark:border-slate-900 top-1"></div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none">Dropoff</p>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate mt-0.5">{activeTripRoute.dropoff}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-1 opacity-75">
                <Truck className="w-7 h-7 text-emerald-600/50 dark:text-emerald-400/50" />
                <p className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">Driver on standby — No active dispatch</p>
              </div>
            )}
          </div>

          {/* ── 4. TRIPS OVERVIEW (⚪ White + Very Light Blue Accents) ── */}
          {/* Position: Column 2 (Middle), Rows 2 & 3 */}
          <div className="col-start-4 col-span-5 row-start-2 row-span-2 rounded-[24px] bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between h-full min-h-0 shadow-xs">
            <div className="flex items-start justify-between shrink-0 mb-1">
              <div>
                <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-sky-500" /> Trips Overview
                </h3>
              </div>
              <div className="text-right flex items-center gap-2">
                <Badge className="bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300 border border-sky-200 dark:border-sky-800 font-extrabold text-[10px]">
                  {trips.length} Total Trips
                </Badge>
                <div className="text-right">
                  <span className="text-lg font-black text-slate-900 dark:text-white leading-none block">48.5h</span>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Work Hours</p>
                </div>
              </div>
            </div>

            <div className="flex-1 w-full min-h-0 -ml-3">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockWorkTimeData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorHoursBlue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '11px', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="hours" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorHoursBlue)" activeDot={{ r: 5, fill: "#0ea5e9", stroke: "#fff", strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-1 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-500 font-bold shrink-0">
              <span>Recent Dispatches:</span>
              <span className="text-sky-600 dark:text-sky-400 hover:underline cursor-pointer" onClick={() => navigate('/trips')}>View All Log →</span>
            </div>
          </div>

          {/* ── 5. EFFICIENCY (🟢 Very Light Green) ── */}
          {/* Position: Column 3 (Right), Row 1 */}
          <div className="col-start-9 col-span-4 row-start-1 row-span-1 rounded-[24px] bg-emerald-50/70 dark:bg-emerald-950/20 border-2 border-emerald-200/70 dark:border-emerald-800/40 p-4 flex flex-col justify-between h-full shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-emerald-950 dark:text-emerald-200 uppercase tracking-widest flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Efficiency
              </h3>
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">95%</span>
            </div>
            
            <div className="space-y-2.5">
              <div className="h-2.5 w-full bg-white dark:bg-slate-800/50 rounded-full overflow-hidden shadow-inner border border-emerald-100 dark:border-emerald-900/50">
                <div className="h-full bg-emerald-500 dark:bg-emerald-400 w-[95%] rounded-full"></div>
              </div>
              <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-wider">
                <span className="text-emerald-800/70 dark:text-emerald-400/70">On-Time Performance</span>
                <span className="text-emerald-700 bg-white dark:bg-slate-900/50 px-2 py-0.5 rounded-md shadow-2xs border border-emerald-100 dark:border-emerald-900/50">High Rating ★ 4.9</span>
              </div>
            </div>
          </div>

          {/* ── 6. DOCUMENT STATUS (🟠/🟡 Very Light Warm Neutral) ── */}
          {/* Position: Column 3 (Right), Rows 2 & 3 */}
          <div className="col-start-9 col-span-4 row-start-2 row-span-2 rounded-[24px] bg-amber-50/70 dark:bg-amber-950/20 border-2 border-amber-200/70 dark:border-amber-800/40 p-4 flex flex-col h-full shadow-xs">
            <div className="flex items-center justify-between mb-3 shrink-0">
              <h3 className="text-xs font-black text-amber-950 dark:text-amber-200 uppercase tracking-widest flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-amber-600 dark:text-amber-400" /> Document Status
              </h3>
              <Badge className="bg-white/90 dark:bg-slate-900 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-black text-xs px-2 shadow-none">
                {[licenseCheck, driverCardCheck, iqamaCheck, passportCheck].filter(c => c.label.includes('Valid')).length}/4 Compliant
              </Badge>
            </div>

            <div className="flex-1 flex flex-col gap-2 overflow-y-auto scrollbar-none pb-1">
               {[
                  { name: 'Driver License', check: licenseCheck },
                  { name: 'Driver Card', check: driverCardCheck },
                  { name: 'IQAMA', check: iqamaCheck },
                  { name: 'Passport', check: passportCheck }
                ].map((item, idx) => {
                  const isOk = item.check.label.includes('Valid');
                  return (
                    <div key={idx} className="p-2.5 rounded-2xl bg-white/80 dark:bg-slate-950/50 border border-amber-100 dark:border-amber-900/30 flex items-center justify-between hover:bg-white dark:hover:bg-slate-900 transition-colors cursor-default shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200">{item.name}</span>
                      {isOk ? (
                        <div className="flex items-center gap-1 text-[9px] font-extrabold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Valid
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-[9px] font-extrabold text-amber-600 bg-amber-100 dark:bg-amber-950/50 px-2 py-0.5 rounded-md">
                          <AlertTriangle className="w-3.5 h-3.5" /> Due Soon
                        </div>
                      )}
                    </div>
                  )
                })}
            </div>
            
            <div className="mt-2 text-right shrink-0">
              <Button variant="link" onClick={() => navigate(`/drivers/${driver.id}/documents`)} className="text-[9px] font-black text-amber-700 dark:text-amber-400 hover:text-amber-900 uppercase tracking-wider p-0 h-auto">
                Manage Documents →
              </Button>
            </div>
          </div>

        </div>

        {/* ... modals (Delete, Fullscreen Photo, DocumentPreview) ... */}
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
                <h3 className="text-xl font-black text-white">{driver.first_name} {driver.last_name}</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">Ref ID: {driver.ref_id || 'DRV-123'}</p>
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
                <DialogTitle className="text-base font-black">Delete Driver Account</DialogTitle>
              </div>
              <DialogDescription className="text-xs font-bold text-slate-500 mt-2">
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
                  <Label htmlFor="admin_password" className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">
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
