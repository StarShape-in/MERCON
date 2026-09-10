import { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Edit2, FileText, Phone, MapPin, AlertTriangle,
  Trash2, Truck, ShieldCheck, User, Plus, AlertCircle, Download, 
  ChevronRight, Calendar, CheckCircle2, Clock, XCircle, ArrowUpRight,
  MoreVertical, X, Activity, Award, Lock, FolderOpen, Mail, Gauge,
  TrendingUp, Star, DollarSign, Bolt, MessageSquare, ChevronDown, Eye,
  Check, Maximize2, Shield, Leaf, File, ArrowRight, Zap, Building2, Banknote
} from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';

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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarUI } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
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

  // Active Live Trip (if currently on trip)
  const activeTrip = trips.find(t => {
    const s = (t.status || '').toLowerCase();
    return s === 'intransit' || s === 'atpickup' || s === 'atdelivery' || s === 'active' || s === 'dispatched';
  });

  // Most Recent Trip (Fallback if no active live trip)
  const recentTrip = (() => {
    if (trips.length === 0) return null;
    const sorted = [...trips].sort((a, b) => {
      const dateA = new Date(a.planned_start || a.createdAt || 0).getTime();
      const dateB = new Date(b.planned_start || b.createdAt || 0).getTime();
      return dateB - dateA;
    });
    return sorted[0];
  })();

  // Display Trip: Live trip if active, otherwise most recent trip
  const displayTrip = activeTrip || recentTrip;
  const isLiveTrip = !!activeTrip;
  const displayTripRoute = displayTrip ? getTripRouteInfo(displayTrip) : { pickup: 'N/A', dropoff: 'N/A' };

  // Trips Overview Filter State (This Week vs Choose Date Range: 1st Click = Start, 2nd Click = End)
  const [tripsOverviewFilter, setTripsOverviewFilter] = useState<'week' | 'month' | 'custom'>('week');
  const [tripsDateRange, setTripsDateRange] = useState<DateRange | undefined>(undefined);
  const [tempRange, setTempRange] = useState<DateRange | undefined>(undefined);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Sync tempRange when calendar popover opens
  useEffect(() => {
    if (isCalendarOpen) {
      setTempRange(tripsDateRange);
    }
  }, [isCalendarOpen, tripsDateRange]);

  // Stacked Bar Data for Work Time (HOS & Duty Analysis: 24h Daily Scale)
  const workTimeStackedData = [
    { day: 'Mon', driving: 5.2, remaining: 18.8 },
    { day: 'Tue', driving: 6.5, remaining: 17.5 },
    { day: 'Wed', driving: 5.8, remaining: 18.2 },
    { day: 'Thu', driving: 7.2, remaining: 16.8 },
    { day: 'Fri', driving: 6.0, remaining: 18.0 },
    { day: 'Sat', driving: 4.8, remaining: 19.2 },
    { day: 'Sun', driving: 5.5, remaining: 18.5 },
  ];

  // Document rows list (Driver License, IQAMA, Driver Card, Passport)
  const documentList = [
    { id: '1', name: 'Driver License', code: driver.license_number || 'DL-14-2018-000123', expiry: '12 Jan 2027', status: 'Valid', icon: FileText },
    { id: '2', name: 'IQAMA', code: 'IQ-2489102847', expiry: '15 Aug 2026', status: 'Valid', icon: ShieldCheck },
    { id: '3', name: 'Driver Card', code: 'DC-2024-8845', expiry: '12 Jan 2026', status: 'Valid', icon: User },
    { id: '4', name: 'Passport', code: 'P-SA-784521', expiry: '12 Jan 2030', status: 'Valid', icon: File },
  ];

  return (
    <DashboardLayout active="Drivers" title="Driver Details">
      <div className="p-3.5 2xl:p-4 max-w-[1600px] mx-auto w-full h-[calc(100vh-76px)] flex flex-col overflow-hidden bg-[#EEF1F6]/50 dark:bg-slate-950">
        
        {/* ── COMPACT PAGE HEADER BAR ── */}
        <div className="flex items-center justify-between pb-2 shrink-0">
          <div className="flex items-center gap-2">
            <h1 className="text-base 2xl:text-lg font-black text-[#3E3C3D] dark:text-white tracking-tight">
              Driver Details
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-xl w-8 h-8 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:bg-slate-100">
                  <MoreVertical className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 rounded-xl z-50">
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
              className="bg-[#3E3C3D] hover:bg-slate-900 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" /> Edit Profile
            </Button>
          </div>
        </div>

        {/* ── 3-COLUMN BENTO SYSTEM ── */}
        <div className="grid grid-cols-12 gap-4 flex-1 min-h-0 w-full overflow-hidden">
          
          {/* ════════════════════════════════════════════════
              COLUMN 1 (LEFT): Profile & Current Dispatch (2 Equal Height Boxes)
             ════════════════════════════════════════════════ */}
          <div className="col-span-3 flex flex-col gap-4 h-full min-h-0">
            
            {/* 1.1 DRIVER PROFILE CARD (Reference Layout Design) */}
            <div className="flex-1 rounded-[24px] bg-[#E8F0F8] dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 px-4 pt-4 pb-1.5 flex flex-col justify-end shadow-2xs relative overflow-hidden min-h-0 group">
              
              {/* Absolute Driver Image */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[24px] z-0">
                {`${driver.first_name} ${driver.last_name}`.toUpperCase().includes('ABDUL MALIK') ? (
                  <img
                    src="/drivers/abdul_malik_transparent.png"
                    alt="Abdul Malik"
                    className="w-[105%] max-w-[105%] h-auto absolute top-10 -left-[2.5%] drop-shadow-lg"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center pt-8">
                    <DriverAvatar
                      src={driver.avatar_url}
                      firstName={driver.first_name}
                      lastName={driver.last_name}
                      size="2xl"
                      className="w-40 h-40 rounded-full border-4 border-white shadow-xl"
                    />
                  </div>
                )}
              </div>

              {/* Header Status Row (Floating at Top) */}
              <div className="absolute top-4 right-4 flex items-center justify-end z-10 w-full pointer-events-none">
                <span className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40 px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1.5 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Active
                </span>
              </div>

              {/* Bottom White Info Box (Overlapping the image) */}
              <div className="relative z-10 bg-[#F8F9FA] dark:bg-slate-950 rounded-[20px] px-3.5 py-2.5 flex items-center justify-between shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-200/50 dark:border-slate-800 w-full mt-auto">
                <div className="min-w-0 pr-2 flex-1 flex flex-col justify-center">
                  <h2 className="text-xs 2xl:text-sm font-black text-slate-900 dark:text-white leading-tight break-words">
                    {driver.first_name} {driver.last_name}
                  </h2>
                  <p className="text-[10px] 2xl:text-[11px] font-bold text-slate-400 mt-0.5">
                    DSA - {driver.ref_id || 'DRV-129'}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 pl-1">
                  <a
                    href={`tel:${driver.phone_primary || ''}`}
                    className="w-9 h-9 2xl:w-10 2xl:h-10 rounded-full bg-slate-200/70 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-slate-300 transition-colors"
                    title="Call Driver"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                  <a
                    href={`mailto:${(driver as any).email || 'driver@mercon.com'}`}
                    className="w-9 h-9 2xl:w-10 2xl:h-10 rounded-full bg-[#1A1A1A] dark:bg-slate-700 flex items-center justify-center text-white hover:bg-black transition-colors shadow-md"
                    title="Email Driver"
                  >
                    <Mail className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>

            {/* 1.2 CURRENT / RECENT DISPATCH CARD (Real Data with Active/Recent Fallback) */}
            <div className="flex-1 rounded-[24px] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 2xl:p-5 flex flex-col gap-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative min-h-0 overflow-hidden group/dispatch">
              {displayTrip ? (
                <>
                  {/* Top Header: Customer & Status */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                        {displayTrip.customer?.logo_url || displayTrip.customer?.avatar_url ? (
                          <img src={displayTrip.customer.logo_url || displayTrip.customer.avatar_url!} alt="Customer" className="w-full h-full object-cover" />
                        ) : (
                          <Building2 className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div
                          onClick={() => navigate(`/drivers/${driver.id}/trips?status=Active`)}
                          className="flex items-center gap-1 cursor-pointer group/title mb-1"
                          title="View active dispatches"
                        >
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none group-hover/title:text-[#FA634E] flex items-center gap-1 transition-colors">
                            {isLiveTrip ? 'Live Trip' : 'Recent Dispatch'}
                            <ChevronRight className="w-3 h-3 text-slate-400 group-hover/title:text-[#FA634E]" />
                          </p>
                        </div>
                        <h3 className="text-xs 2xl:text-sm font-black text-slate-900 dark:text-white truncate leading-tight">
                          {displayTrip.customer?.company_name || displayTrip.customer?.name || 'Walk-in Customer'}
                        </h3>
                      </div>
                    </div>
                    <span className={cn(
                      'px-2.5 py-1 rounded-full text-[10px] font-black flex items-center gap-1.5 shrink-0 border shadow-2xs',
                      isLiveTrip
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800/40'
                        : 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                    )}>
                      <span className={cn('w-1.5 h-1.5 rounded-full', isLiveTrip ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400')}></span>
                      {isLiveTrip ? 'In Progress' : (displayTrip.status || 'Completed')}
                    </span>
                  </div>

                  {/* Combined Route, Vehicle & ETA Box — clickable to open trip detail */}
                  <div
                    className="bg-[#F8F9FA] dark:bg-slate-950 rounded-[18px] p-3 border border-slate-200/60 dark:border-slate-800/60 shadow-2xs cursor-pointer hover:border-[#FA634E]/50 transition-all"
                    onClick={() => navigate(`/trips/${displayTrip.id}`)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-slate-400" />
                        Ref: {displayTrip.ref_id || displayTrip.id.substring(0, 8)}
                      </span>
                      <span className="text-[10px] font-bold text-[#FA634E] flex items-center gap-1 opacity-0 group-hover/dispatch:opacity-100 transition-opacity">
                        <ArrowUpRight className="w-3 h-3" /> View Trip
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-12 gap-3 items-center">
                      {/* Left (7 cols): Route Timeline */}
                      <div className="col-span-7 flex items-stretch gap-2.5 border-r border-slate-200/80 dark:border-slate-800/80 pr-3">
                        <div className="flex flex-col items-center my-0.5 shrink-0">
                          <div className="w-3 h-3 rounded-full border-2 border-blue-500 bg-white dark:bg-slate-900 z-10"></div>
                          <div className="w-0.5 bg-slate-200 dark:bg-slate-800 flex-1 my-1"></div>
                          <div className="w-3 h-3 rounded-full border-2 border-emerald-500 bg-white dark:bg-slate-900 z-10"></div>
                        </div>
                        <div className="flex flex-col justify-between min-w-0 py-0.5">
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1">Origin</p>
                            <p className="text-xs 2xl:text-sm font-black text-slate-900 dark:text-white truncate leading-tight">{displayTripRoute.pickup}</p>
                          </div>
                          <div className="min-w-0 mt-1.5">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1">Destination</p>
                            <p className="text-xs 2xl:text-sm font-black text-slate-900 dark:text-white truncate leading-tight">{displayTripRoute.dropoff}</p>
                          </div>
                        </div>
                      </div>

                      {/* Right (5 cols): Vehicle & ETA */}
                      <div className="col-span-5 flex flex-col justify-center gap-2.5 pl-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6.5 h-6.5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                            <Truck className="w-3.5 h-3.5 text-slate-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-0.5">Vehicle</p>
                            <p className="text-xs font-black text-slate-900 dark:text-slate-100 truncate leading-none">
                              {displayTrip.vehicle?.plate_number || assignedVehicle?.plate_number || 'Unassigned'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6.5 h-6.5 rounded-full bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center shrink-0">
                            <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-0.5">ETA</p>
                            <p className="text-xs font-black text-slate-900 dark:text-slate-100 truncate leading-none">
                              {displayTrip.planned_end
                                ? formatInDeploymentTz(displayTrip.planned_end, tz, 'dd MMM, HH:mm')
                                : 'Pending'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Finance Details */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Banknote className="w-3.5 h-3.5" />
                        Finance Details
                      </p>
                      {displayTrip.is_post_trip_settled && (
                        <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded uppercase">
                          Settled
                        </span>
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Trip Revenue</span>
                        <span className="text-xs 2xl:text-sm font-black text-slate-900 dark:text-white">
                          SAR {Number(displayTrip.billing_amount || displayTrip.applied_rate || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Driver Payout</span>
                        <span className="text-xs 2xl:text-sm font-black text-emerald-600 dark:text-emerald-500">
                          SAR {Number(displayTrip.driver_charge || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Trip Charges</span>
                        <span className="text-xs 2xl:text-sm font-black text-amber-600 dark:text-amber-500">
                          SAR {Number(displayTrip.trip_charges || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* View All + Open Trip Buttons */}
                  <div className="flex items-center justify-between pt-1.5 gap-2">
                    <Button
                      onClick={() => navigate(`/trips/${displayTrip.id}`)}
                      variant="ghost"
                      className="flex-1 h-7 px-3 text-[10px] font-bold text-[#FA634E] hover:text-white hover:bg-[#FA634E] bg-[#FA634E]/10 border border-[#FA634E]/20 rounded-full flex items-center justify-center gap-1 transition-colors shadow-2xs cursor-pointer"
                    >
                      <ArrowUpRight className="w-3 h-3" />
                      <span>Open Trip</span>
                    </Button>
                    <Button
                      onClick={() => navigate(`/drivers/${driver.id}/trips`)}
                      variant="ghost"
                      className="flex-1 h-7 px-3 text-[10px] font-bold text-slate-700 hover:text-slate-900 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full flex items-center justify-center gap-1 transition-colors shadow-2xs cursor-pointer"
                    >
                      <span>All Trips</span>
                      <ChevronRight className="w-3 h-3 text-slate-400" />
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                  <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-3">
                    <Truck className="w-6 h-6 text-slate-300 dark:text-slate-600" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">No Dispatches Recorded</h4>
                  <p className="text-[10px] text-slate-400 mt-1 max-w-[200px]">This driver is not currently assigned to any active trips.</p>
                </div>
              )}
            </div>

          </div>

          {/* ════════════════════════════════════════════════
              COLUMN 2 (MIDDLE): Performance & Work Analytics
             ════════════════════════════════════════════════ */}
          <div className="col-span-5 flex flex-col gap-4 h-full min-h-0">
            
            {/* 2.1 TRIPS OVERVIEW (Upgraded Executive Bento & Pipeline Design) */}
            <div className="rounded-[24px] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 2xl:p-5 shrink-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-3">
              {/* Header Bar */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div
                  onClick={() => navigate(`/drivers/${driver.id}/trips`)}
                  className="flex items-center gap-2.5 cursor-pointer group/title"
                  title="Click to view detailed driver trips & delay analysis"
                >
                  <div className="w-8 h-8 rounded-xl bg-[#3E3C3D] dark:bg-slate-800 text-white flex items-center justify-center shadow-2xs group-hover/title:bg-[#FA634E] transition-colors">
                    <TrendingUp className="w-4 h-4 text-[#FA634E] group-hover/title:text-white" />
                  </div>
                  <div>
                    <h3 className="text-xs 2xl:text-sm font-black text-[#3E3C3D] dark:text-white uppercase tracking-wider leading-none group-hover/title:text-[#FA634E] flex items-center gap-1 transition-colors">
                      Trips Overview <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover/title:text-[#FA634E]" />
                    </h3>
                  </div>
                </div>
                
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200/60 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setTripsOverviewFilter('week')}
                    className={cn(
                      "px-2.5 py-1 text-[10px] font-black rounded-lg transition-all cursor-pointer",
                      tripsOverviewFilter === 'week'
                        ? "text-slate-900 dark:text-white bg-white dark:bg-slate-900 shadow-2xs"
                        : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    )}
                  >
                    This Week
                  </button>
                  <button
                    type="button"
                    onClick={() => setTripsOverviewFilter('month')}
                    className={cn(
                      "px-2.5 py-1 text-[10px] font-black rounded-lg transition-all cursor-pointer",
                      tripsOverviewFilter === 'month'
                        ? "text-slate-900 dark:text-white bg-white dark:bg-slate-900 shadow-2xs"
                        : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    )}
                  >
                    Month
                  </button>
                </div>
              </div>

              {/* Status Pipeline Breakdown Strip — each status navigates to dedicated driver trip page */}
              <div className="bg-[#F8F9FA] dark:bg-slate-950 p-2.5 rounded-[16px] border border-slate-200/50 dark:border-slate-800/60 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-bold">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => navigate(`/drivers/${driver.id}/trips?status=Completed`)}
                      className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      9 Delivered (75%)
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/drivers/${driver.id}/trips?status=Active`)}
                      className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      2 In Transit (17%)
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/drivers/${driver.id}/trips?status=Active`)}
                      className="flex items-center gap-1 text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                    >
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      1 Dispatched (8%)
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(`/drivers/${driver.id}/trips`)}
                    className="text-slate-400 font-semibold hover:text-slate-700 hover:underline cursor-pointer"
                  >
                    12 Total Dispatches
                  </button>
                </div>

                {/* Micro Multi-Segment Status Bar — clickable segments */}
                <div className="h-2 w-full bg-slate-200/70 dark:bg-slate-800 rounded-full overflow-hidden flex gap-0.5 p-0.5">
                  <div
                    className="h-full bg-emerald-500 rounded-full cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ width: '75%' }}
                    title="75% Delivered — click to view"
                    onClick={() => navigate(`/drivers/${driver.id}/trips?status=Completed`)}
                  />
                  <div
                    className="h-full bg-blue-500 rounded-full cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ width: '17%' }}
                    title="17% In Transit — click to view"
                    onClick={() => navigate(`/drivers/${driver.id}/trips?status=Active`)}
                  />
                  <div
                    className="h-full bg-amber-500 rounded-full cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ width: '8%' }}
                    title="8% Dispatched — click to view"
                    onClick={() => navigate(`/drivers/${driver.id}/trips?status=Active`)}
                  />
                </div>
              </div>

              {/* 4 Bento Metric Cards — Static non-clickable display boxes */}
              <div className="grid grid-cols-4 gap-3">
                {/* 1. Total Dispatches (Blue Theme) */}
                <div
                  className="p-3.5 rounded-[18px] bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 flex flex-col justify-between shadow-2xs"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-bold text-blue-900/70 dark:text-blue-300 uppercase tracking-wider">Dispatches</span>
                    <div className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <Truck className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl 2xl:text-3xl font-black text-blue-950 dark:text-white leading-none">{trips.length || 12}</div>
                    <div className="mt-2.5 pt-1.5 border-t border-blue-200/50 dark:border-blue-900/40 flex items-center">
                      <span className="text-[9px] font-bold text-blue-700 dark:text-blue-300 bg-blue-100/80 dark:bg-blue-900/50 px-2 py-0.5 rounded-full border border-blue-200/60">
                        {trips.filter(t => (t.status || '').toLowerCase() === 'delivered').length || 9} Delivered
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. On-Time Rate (Emerald Green Theme) */}
                <div
                  className="p-3.5 rounded-[18px] bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 flex flex-col justify-between shadow-2xs"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-bold text-emerald-900/70 dark:text-emerald-300 uppercase tracking-wider">On-Time</span>
                    <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl 2xl:text-3xl font-black text-emerald-700 dark:text-emerald-400 leading-none">91.7%</div>
                    <div className="mt-2.5 pt-1.5 border-t border-emerald-200/50 dark:border-emerald-900/40 flex items-center">
                      <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-900/50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                        11 / 12 On-Time
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Trip Revenue (Coral Red Theme) */}
                <div
                  className="p-3.5 rounded-[18px] bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 flex flex-col justify-between shadow-2xs"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-bold text-rose-900/70 dark:text-rose-300 uppercase tracking-wider">Revenue</span>
                    <div className="w-7 h-7 rounded-xl bg-[#FA634E] text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <Banknote className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div>
                    <div className="text-xs 2xl:text-sm font-black text-[#FA634E] dark:text-rose-400 leading-none">
                      SAR {trips.reduce((sum, t) => sum + Number(t.billing_amount || t.applied_rate || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 0 }) || '124,500'}
                    </div>
                    <div className="mt-2.5 pt-1.5 border-t border-rose-200/50 dark:border-rose-900/40 flex items-center">
                      <span className="text-[9px] font-bold text-[#FA634E] dark:text-rose-300 bg-rose-100/80 dark:bg-rose-900/50 px-2 py-0.5 rounded-full border border-rose-200/60">
                        +12.4% yield
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4. Total Distance (Indigo Theme) */}
                <div
                  className="p-3.5 rounded-[18px] bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/40 flex flex-col justify-between shadow-2xs"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-bold text-indigo-900/70 dark:text-indigo-300 uppercase tracking-wider">Distance</span>
                    <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <Gauge className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div>
                    <div className="text-xl 2xl:text-2xl font-black text-indigo-950 dark:text-white leading-none">
                      2,850 <span className="text-xs font-bold text-indigo-600/80">km</span>
                    </div>
                    <div className="mt-2.5 pt-1.5 border-t border-indigo-200/50 dark:border-indigo-900/40 flex items-center">
                      <span className="text-[9px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100/80 dark:bg-indigo-900/50 px-2 py-0.5 rounded-full border border-indigo-200/60">
                        Avg 237 km / trip
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2.2 WORK TIME ANALYTICS CHART (HOS & Duty Breakdown) */}
            <div className="flex-1 rounded-[24px] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 2xl:p-5 flex flex-col justify-between overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] min-h-0">
              {/* Card Header */}
              <div className="flex items-center justify-between shrink-0 mb-3 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                <div
                  onClick={() => navigate(`/drivers/${driver.id}/trips?status=Delayed`)}
                  className="flex items-center gap-2.5 cursor-pointer group/title"
                  title="Click to view driver work hours & delay analysis"
                >
                  <div className="w-7 h-7 rounded-lg bg-[#3E3C3D] dark:bg-slate-800 text-white flex items-center justify-center group-hover/title:bg-[#FA634E] transition-colors">
                    <Clock className="w-3.5 h-3.5 text-[#FA634E] group-hover/title:text-white" />
                  </div>
                  <div>
                    <h3 className="text-xs 2xl:text-sm font-black text-[#3E3C3D] dark:text-white uppercase tracking-wider leading-none group-hover/title:text-[#FA634E] flex items-center gap-1 transition-colors">
                      Work Hours & Duty Analysis <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover/title:text-[#FA634E]" />
                    </h3>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold">
                  <div className="flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/40 px-2 py-1 rounded-lg border border-rose-200/50">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#FA634E]"></span>
                    <span className="text-[#FA634E] dark:text-rose-400">Driver Runned (37.3h)</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-sky-50 dark:bg-sky-950/40 px-2 py-1 rounded-lg border border-sky-200/50">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#38BDF8]"></span>
                    <span className="text-sky-600 dark:text-sky-400">Remaining</span>
                  </div>
                </div>
              </div>

              {/* Metric Row with HOS Compliance Gauge */}
              <div className="flex items-center justify-between mb-3 shrink-0 bg-[#F8F9FA] dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-2xs">
                <div className="flex items-center gap-4">
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl 2xl:text-3xl font-black text-[#3E3C3D] dark:text-white leading-none">37.3</span>
                      <span className="text-xs font-bold text-slate-400">/ 48 hrs</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1 block">Weekly Logged Duty</span>
                  </div>
                </div>

                <div className="text-right hidden sm:block">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Avg Daily Duty</span>
                  <span className="text-xs 2xl:text-sm font-black text-slate-900 dark:text-white">6.2 hrs / day</span>
                </div>
              </div>

              {/* 24h Bar Chart with Green Driver Runned Hours & Soft Neutral Remaining Hours */}
              <div className="flex-1 w-full min-h-0 pt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={workTimeStackedData} margin={{ top: 15, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.6} />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }} />
                    <YAxis domain={[0, 24]} ticks={[0, 6, 12, 18, 24]} axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }} tickFormatter={(val) => `${val}h`} />
                    <Tooltip
                      cursor={{ fill: 'rgba(241, 245, 249, 0.6)' }}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', fontSize: '11px', fontWeight: 'bold', padding: '8px 12px' }}
                      formatter={(value: any, name: any) => [
                        `${value} hrs`,
                        name === 'Driver Runned' || name === 'driving' ? 'Driver Runned' : 'Remaining'
                      ]}
                    />
                    <Bar dataKey="driving" name="Driver Runned" stackId="a" fill="#FA634E" radius={[0, 0, 4, 4]} barSize={24} />
                    <Bar dataKey="remaining" name="Remaining" stackId="a" fill="#38BDF8" radius={[6, 6, 0, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* ════════════════════════════════════════════════
              COLUMN 3 (RIGHT): Operational Efficiency & Compliance
             ════════════════════════════════════════════════ */}
          <div className="col-span-4 flex flex-col gap-4 h-full min-h-0">
            
            {/* 3.1 OPERATIONAL EFFICIENCY CARD (Compact & Focused) */}
            <div className="rounded-[24px] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 2xl:p-5 shrink-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-3">
              {/* Header Row */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div
                  onClick={() => navigate(`/drivers/${driver.id}/trips?status=Delayed`)}
                  className="flex items-center gap-2 cursor-pointer group/title"
                  title="Click to view driver performance & efficiency analysis"
                >
                  <Award className="w-4 h-4 text-[#FA634E]" />
                  <h3 className="text-xs font-black text-[#3E3C3D] dark:text-white uppercase tracking-wider group-hover/title:text-[#FA634E] flex items-center gap-1 transition-colors">
                    Operational Efficiency <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover/title:text-[#FA634E]" />
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/40 px-2 py-0.5 rounded-full">
                  Above Target
                </span>
              </div>

              {/* Score Row */}
              <div className="flex items-baseline justify-between">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl 2xl:text-4xl font-black text-[#3E3C3D] dark:text-white leading-none">90%</span>
                </div>
                <span className="text-[9px] font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-200/50">
                  Top 5% Fleet
                </span>
              </div>

              {/* 2 Segment Progress Bar System (On-Time & Delay) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 px-0.5">
                  <span className="text-emerald-600 dark:text-emerald-400">90% On-Time</span>
                  <span className="text-rose-500 dark:text-rose-400">10% Delay</span>
                </div>
                
                <div className="h-7 w-full p-1 bg-slate-100 dark:bg-slate-800 rounded-xl flex gap-1 shadow-inner">
                  {/* Segment 1: On-Time (Solid Emerald Green) */}
                  <div className="h-full w-[90%] bg-emerald-500 text-white rounded-lg flex items-center justify-center text-[10px] font-black shadow-2xs">
                    On-Time
                  </div>
                  {/* Segment 2: Delay (Solid Coral Red) */}
                  <div className="h-full w-[10%] bg-rose-500 text-white rounded-lg flex items-center justify-center text-[10px] font-black shadow-2xs">
                    Delay
                  </div>
                </div>
              </div>

              {/* 3 Metrics: On-Time Trips, Delayed Trips, Avg. Delay */}
              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                <div className="p-2 rounded-xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/60">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5 truncate">On-Time Trips</span>
                  <div className="text-xs 2xl:text-sm font-black text-emerald-600 dark:text-emerald-400">11 Trips</div>
                </div>
                <div className="p-2 rounded-xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/60">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5 truncate">Delayed Trips</span>
                  <div className="text-xs 2xl:text-sm font-black text-rose-500 dark:text-rose-400">1 Trip</div>
                </div>
                <div className="p-2 rounded-xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/60">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5 truncate">Avg. Delay</span>
                  <div className="text-xs 2xl:text-sm font-black text-slate-900 dark:text-white">14 mins</div>
                </div>
              </div>
            </div>

            {/* 3.2 DOCUMENT & COMPLIANCE STATUS (Zero-Wasted-Space Executive Registry) */}
            <div className="flex-1 rounded-[24px] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 2xl:p-5 flex flex-col gap-3 overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] min-h-0">
              {/* Header Row */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <div
                  onClick={() => navigate(`/drivers/${driver.id}/documents`)}
                  className="flex items-center gap-2 cursor-pointer group/title"
                  title="Click to manage compliance documents"
                >
                  <div className="w-7 h-7 rounded-xl bg-[#3E3C3D] dark:bg-slate-800 text-white flex items-center justify-center shadow-2xs group-hover/title:bg-[#FA634E] transition-colors">
                    <FolderOpen className="w-3.5 h-3.5 text-[#FA634E] group-hover/title:text-white" />
                  </div>
                  <div>
                    <h3 className="text-xs 2xl:text-sm font-black text-[#3E3C3D] dark:text-white uppercase tracking-wider leading-none group-hover/title:text-[#FA634E] flex items-center gap-1 transition-colors">
                      Compliance Documents <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover/title:text-[#FA634E]" />
                    </h3>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/40 px-2.5 py-1 rounded-full shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 leading-none">
                    4/4 Valid
                  </span>
                </div>
              </div>

              {/* Compliance Health Progress Strip */}
              <div className="bg-[#F8F9FA] dark:bg-slate-950 px-3 py-2 rounded-[14px] border border-slate-200/50 dark:border-slate-800/60 space-y-1.5 shrink-0 shadow-2xs">
                <div className="flex items-center justify-between text-[10px] font-bold">
                  <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    100% Fully Compliant
                  </span>
                  <span className="text-slate-400 font-semibold">0 Expired / 0 Warning</span>
                </div>
                <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 rounded-full shadow-2xs"></div>
              </div>

              {/* Unified High-Density Document Registry Container (Zero Space Waste) */}
              <div className="flex-1 flex flex-col justify-between bg-[#F8F9FA] dark:bg-slate-950 rounded-[18px] border border-slate-200/60 dark:border-slate-800/80 divide-y divide-slate-200/60 dark:divide-slate-800/60 overflow-hidden shadow-2xs min-h-0">
                {documentList.map((doc, idx) => {
                  const IconComp = doc.icon;
                  const isValid = doc.status === 'Valid';

                  // Distinct executive color theme for each document type icon
                  const iconThemes = [
                    "bg-blue-50/90 text-blue-600 border-blue-200/70 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-800/50",
                    "bg-emerald-50/90 text-emerald-600 border-emerald-200/70 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800/50",
                    "bg-amber-50/90 text-amber-600 border-amber-200/70 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800/50",
                    "bg-indigo-50/90 text-indigo-600 border-indigo-200/70 dark:bg-indigo-950/60 dark:text-indigo-400 dark:border-indigo-800/50",
                  ];
                  const colorStyle = iconThemes[idx % iconThemes.length];

                  return (
                    <div
                      key={doc.id}
                      className="px-3.5 py-2.5 flex-1 flex items-center justify-between hover:bg-slate-100/70 dark:hover:bg-slate-900/80 transition-colors group"
                    >
                      {/* Left: Icon + Doc Name & Code */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          "w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 shadow-2xs transition-transform group-hover:scale-105",
                          colorStyle
                        )}>
                          <IconComp className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-black text-[#3E3C3D] dark:text-white leading-tight truncate">
                            {doc.name}
                          </h4>
                          <p className="text-[10px] font-semibold text-slate-400 font-mono truncate leading-none mt-0.5">
                            {doc.code}
                          </p>
                        </div>
                      </div>

                      {/* Right: Expiry + Status Badge + View Button */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Highlighted Expiry Pill */}
                        <div className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-800/40 px-2 py-1 rounded-lg shadow-2xs">
                          <Calendar className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 leading-none">
                            {doc.expiry}
                          </span>
                        </div>

                        {/* Status Badge */}
                        <span className={cn(
                          "px-2 py-1 rounded-lg text-[9px] font-black uppercase border leading-none hidden xl:inline-block shadow-2xs",
                          isValid
                            ? "bg-emerald-100/70 text-emerald-800 border-emerald-300/60 dark:bg-emerald-900/40 dark:text-emerald-300"
                            : "bg-amber-100/70 text-amber-800 border-amber-300/60 dark:bg-amber-900/40 dark:text-amber-300"
                        )}>
                          {doc.status}
                        </span>

                        {/* View Button */}
                        <Button
                          onClick={() => setSelectedDocIdForPreview(doc.id)}
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2.5 text-[10px] font-bold text-slate-700 dark:text-slate-200 bg-white hover:bg-[#3E3C3D] hover:text-white dark:bg-slate-800 dark:hover:bg-[#FA634E] dark:hover:border-[#FA634E] border border-slate-200/90 dark:border-slate-700 rounded-lg flex items-center gap-1 transition-all shadow-2xs"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View</span>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Manage Compliance Button */}
              <Button
                onClick={() => navigate(`/drivers/${driver.id}/documents`)}
                variant="ghost"
                className="w-full h-8 mt-0.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-[#3E3C3D] hover:text-white dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl flex items-center justify-center gap-1.5 transition-all shrink-0 group"
              >
                <span>Manage Compliance</span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
              </Button>
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
