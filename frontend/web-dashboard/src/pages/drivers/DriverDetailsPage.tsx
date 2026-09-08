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
      <div className="pt-4 px-4 sm:px-6 pb-10 w-full max-w-6xl mx-auto flex flex-col gap-6 animate-fade-in">
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* ── TOP LEFT: Profile Box ── */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl shadow-sm p-6 flex flex-col sm:flex-row items-center sm:items-start gap-6 relative">
            <div className="absolute top-4 right-4">
               <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <MoreVertical className="w-5 h-5 text-slate-500" />
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

            <DriverAvatar
              src={driver.avatar_url}
              firstName={driver.first_name}
              lastName={driver.last_name}
              size="2xl"
              status={driver.status}
              showStatusDot={true}
              previewable
              className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 shadow-md cursor-pointer hover:opacity-90 transition-opacity rounded-full border-4 border-white dark:border-slate-800"
              onPreview={() => setIsPhotoFullViewOpen(true)}
            />
            <div className="flex-1 text-center sm:text-left space-y-3 pt-2">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-none mb-1">
                  {driver.first_name} {driver.last_name}
                </h1>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  {driver.ref_id || 'DRV-123'}
                </p>
              </div>
              <Badge variant="outline" className={cn(
                'text-[10px] font-extrabold px-3 py-1 border shadow-xs uppercase tracking-wider',
                (driver.status || '').toLowerCase() === 'available' 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400'
                  : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400'
              )}>
                <span className={cn('w-2 h-2 rounded-full shrink-0 mr-2', (driver.status || '').toLowerCase() === 'available' ? 'bg-emerald-500' : 'bg-amber-500')} />
                {driver.status}
              </Badge>
              <div className="flex justify-center sm:justify-start gap-3 pt-3">
                <Button size="icon" variant="outline" className="rounded-full shadow-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                  <MessageSquare className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="outline" className="rounded-full shadow-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                  <Phone className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* ── TOP RIGHT: Current Trip Box ── */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl shadow-sm p-6 flex flex-col justify-between relative overflow-hidden">
            {activeTrip && (
              <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                 <Truck className="w-32 h-32" />
              </div>
            )}
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                  <Activity className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">
                  Current Trip
                </h3>
              </div>
              <Badge className={cn('px-2.5 py-0.5 text-[10px] font-extrabold uppercase shadow-sm', activeTrip ? 'bg-blue-100 hover:bg-blue-100 text-blue-700' : 'bg-slate-100 hover:bg-slate-100 text-slate-500')}>
                {activeTrip ? 'Active' : 'Standby'}
              </Badge>
            </div>

            {activeTrip ? (
              <div className="space-y-6 flex-1 flex flex-col justify-center relative z-10">
                <div className="flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800/80">
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Trip Ref</p>
                    <p className="text-lg font-black text-slate-900 dark:text-white cursor-pointer hover:text-[#FA634E] hover:underline" onClick={() => navigate(`/trips/${activeTrip.id}`)}>{activeTrip.ref_id}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Vehicle</p>
                    <p className="text-lg font-black text-slate-700 dark:text-slate-300">{assignedVehicle?.plate_number || 'N/A'}</p>
                  </div>
                </div>
                
                <div className="relative pl-6 space-y-5 py-2">
                  <div className="absolute left-1.5 top-2.5 bottom-2.5 w-0.5 bg-slate-200 dark:bg-slate-700"></div>
                  <div className="relative">
                    <div className="absolute -left-6 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 mt-0.5"></div>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Pickup</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{activeTripRoute.pickup}</p>
                  </div>
                  <div className="relative">
                    <div className="absolute -left-6 w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-white dark:border-slate-900 mt-0.5"></div>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Dropoff</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{activeTripRoute.dropoff}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3 opacity-60">
                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                   <Truck className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                </div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">No active assignment</p>
              </div>
            )}
          </div>

          {/* ── MIDDLE LEFT: Trips Overview (Matchy Graph) ── */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl shadow-sm p-6 flex flex-col justify-between min-h-[320px]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">
                  Trips Overview
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                  Weekly Activity
                </p>
              </div>
              <div className="text-right flex items-center gap-2 bg-slate-50 dark:bg-slate-950/50 px-3 py-2 rounded-xl border border-slate-100 dark:border-slate-800">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
                <div>
                  <span className="text-xl font-black text-slate-900 dark:text-white leading-none block">10.2h</span>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">Work Time</p>
                </div>
              </div>
            </div>

            <div className="h-44 w-full mt-4 -ml-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockWorkTimeData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FA634E" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#FA634E" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="hours" stroke="#FA634E" strokeWidth={4} fillOpacity={1} fill="url(#colorHours)" activeDot={{ r: 6, fill: "#FA634E", stroke: "#fff", strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            
            <div className="flex justify-between px-2 mt-2">
              {mockWorkTimeData.map((d) => (
                <span key={d.day} className="text-[10px] font-bold text-slate-400 uppercase">{d.day}</span>
              ))}
            </div>
          </div>

          {/* ── MIDDLE RIGHT: Driver Details ── */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl shadow-sm p-6 flex flex-col">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                <User className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">
                Driver Details
              </h3>
            </div>

            <div className="space-y-3 flex-1 flex flex-col justify-center">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 flex justify-between items-center hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors cursor-default">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Joined Date</span>
                <span className="text-sm font-black text-slate-900 dark:text-white">15 Mar 2023</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 flex justify-between items-center hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors cursor-default">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">License Number</span>
                <span className="text-sm font-mono font-black text-slate-900 dark:text-white">{driver.license_number || 'N/A'}</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 flex justify-between items-center hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors cursor-default">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">License Expiry</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono font-black text-slate-900 dark:text-white">
                    {driver.license_expiry ? formatInDeploymentTz(driver.license_expiry, tz, 'dd MMM yyyy') : 'N/A'}
                  </span>
                  {isLicenseExpired && (
                    <Badge className="bg-rose-100 text-rose-700 px-1.5 py-0 text-[9px] hover:bg-rose-100">EXP</Badge>
                  )}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 flex justify-between items-center hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors cursor-default">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phone</span>
                <span className="text-sm font-mono font-black text-slate-900 dark:text-white">{driver.phone_primary}</span>
              </div>
            </div>
          </div>

          {/* ── BOTTOM LEFT: Document Status ── */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl shadow-sm p-6 flex flex-col justify-between">
             <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                  <FolderOpen className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">
                  Document Status
                </h3>
              </div>
              <Badge className="bg-amber-100 hover:bg-amber-100 text-amber-800 border-none font-black text-sm px-3 shadow-none">
                {[licenseCheck, driverCardCheck, iqamaCheck, passportCheck].filter(c => c.label.includes('Valid')).length}/4
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
               {[
                  { name: 'Driver License', check: licenseCheck },
                  { name: 'Driver Card', check: driverCardCheck },
                  { name: 'IQAMA', check: iqamaCheck },
                  { name: 'Passport', check: passportCheck }
                ].map((item, idx) => {
                  const isOk = item.check.label.includes('Valid');
                  return (
                    <div key={idx} className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors cursor-default">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{item.name}</span>
                      {isOk ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                      )}
                    </div>
                  )
                })}
            </div>
            
            <div className="mt-4 text-center sm:text-right">
              <Button variant="link" onClick={() => navigate(`/drivers/${driver.id}/documents`)} className="text-xs font-black text-[#FA634E] hover:text-[#e05642] uppercase tracking-wider">
                Manage Documents →
              </Button>
            </div>
          </div>

          {/* ── BOTTOM RIGHT: Efficiency ── */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl shadow-sm p-6 flex flex-col justify-center items-center text-center space-y-8 min-h-[200px]">
            <div className="flex items-center gap-3">
               <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-900/30 text-[#FA634E]">
                  <Award className="w-5 h-5" />
                </div>
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">
                Efficiency
              </h3>
            </div>
            
            <div className="text-7xl font-black text-[#FA634E] tracking-tighter">
              90%
            </div>

            <div className="w-full max-w-sm space-y-3">
              <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                <div className="h-full bg-gradient-to-r from-amber-400 to-[#FA634E] w-[90%] rounded-full shadow-sm"></div>
              </div>
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider">
                <span className="text-slate-400">Delay Factor</span>
                <span className="text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-1 rounded-md border border-amber-200/50">Low (10%)</span>
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
                <h3 className="text-xl font-black text-white">{driver.first_name} {driver.last_name}</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">Ref ID: {driver.ref_id || 'DRV-123'}</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── DELETE DRIVER CONFIRMATION MODAL ── */}
        <Dialog open={isDeleteModalOpen} onOpenChange={(open) => !open && setIsDeleteModalOpen(false)}>
          <DialogContent className="max-w-md rounded-2xl p-0 overflow-hidden border-slate-200 dark:border-slate-800">
            <DialogHeader className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-rose-50/50 dark:bg-rose-955/20">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-450">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <DialogTitle className="text-base font-black">Delete Driver Account</DialogTitle>
              </div>
              <DialogDescription className="text-xs text-slate-500 mt-1">
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
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>{deleteError}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="admin_password" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Admin Password <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="admin_password"
                    type="password"
                    placeholder="Enter your admin password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-9 text-xs border-slate-200 dark:border-slate-800"
                    required
                  />
                </div>
              </div>

              <DialogFooter className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => { setIsDeleteModalOpen(false); setPassword(''); setDeleteError(''); }}
                  className="text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={deleteMutation.isPending}
                  className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 shadow-xs"
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
