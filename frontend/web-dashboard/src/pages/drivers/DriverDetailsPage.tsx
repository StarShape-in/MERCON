import { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Edit2, FileText, Phone, MapPin, AlertTriangle,
  Trash2, Truck, ShieldCheck, User, Plus, AlertCircle, Download, 
  ChevronRight, Calendar, CheckCircle2, Clock, XCircle, ArrowUpRight,
  MoreVertical, X, Activity, Award, Lock, FolderOpen
} from 'lucide-react';
import { toast } from 'sonner';

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
  const idCheck = getDocCheck(['ID', 'Iqama', 'National ID']);
  const medicalCheck = getDocCheck(['Medical', 'Health']);

  // Recent Trips List: Most recent 2 completed trips
  const recentTripsList = (() => {
    const completed = historyTrips.filter(t => (t.status || '').toLowerCase() === 'completed');
    return [...completed].sort((a, b) => {
      const dateA = new Date(a.planned_start || a.createdAt || 0).getTime();
      const dateB = new Date(b.planned_start || b.createdAt || 0).getTime();
      return dateB - dateA;
    }).slice(0, 2);
  })();

  return (
    <DashboardLayout active="Drivers" title={`${driver.first_name} ${driver.last_name}`}>
      <div className="pt-2 sm:pt-4 px-4 sm:px-6 pb-10 w-full flex flex-col gap-6 animate-fade-in max-w-[1200px] mx-auto">
        
        {/* Back Navigation Row */}
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/drivers')} 
            className="gap-1.5 p-0 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-transparent font-bold text-xs cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </Button>
        </div>

        {/* ── 1. DRIVER PROFILE HEADER CARD ── */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-3xs p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden bg-gradient-to-r from-white via-white to-orange-50/15 dark:to-orange-950/5">
          <div className="flex items-start sm:items-center gap-5 min-w-0 flex-1">
            {/* Driver Avatar with overlay status dot */}
            <div className="relative shrink-0">
              <DriverAvatar
                src={driver.avatar_url}
                firstName={driver.first_name}
                lastName={driver.last_name}
                size="2xl"
                status={driver.status}
                showStatusDot={true}
                previewable
                className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 shadow-3xs cursor-pointer hover:opacity-90 transition-opacity rounded-full border border-slate-100 dark:border-slate-800"
                onPreview={() => setIsPhotoFullViewOpen(true)}
              />
            </div>
            
            <div className="min-w-0 flex-1 space-y-2">
              {/* Name & Availability */}
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-none">
                  {driver.first_name} {driver.last_name}
                </h1>
                
                {/* Available Status Badge */}
                <Badge variant="outline" className={cn(
                  'text-[10px] font-extrabold px-2.5 py-0.5 border gap-1 shadow-3xs uppercase tracking-wider',
                  (driver.status || '').toLowerCase() === 'available' 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400'
                    : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400'
                )}>
                  <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', (driver.status || '').toLowerCase() === 'available' ? 'bg-emerald-500' : 'bg-amber-500')} />
                  {driver.status}
                </Badge>
              </div>

              {/* ID & Phone line */}
              <p className="text-xs font-mono font-bold text-slate-500 dark:text-slate-450 tracking-tight">
                {driver.ref_id || 'DRV-131'} &nbsp;·&nbsp; {driver.phone_primary}
              </p>

              {/* Assigned Vehicle */}
              <div className="space-y-0.5 pt-0.5">
                <div className="text-sm font-black text-slate-850 dark:text-slate-200 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-slate-400" />
                  {assignedVehicle ? (
                    <span>
                      {assignedVehicle.plate_number} &nbsp;·&nbsp; {assignedVehicle.asset_type || 'Box'} &nbsp;·&nbsp; {assignedVehicle.capacity_kg ? `${assignedVehicle.capacity_kg.toLocaleString()} KG` : 'N/A'}
                    </span>
                  ) : (
                    <span className="text-slate-400 italic">Unassigned</span>
                  )}
                </div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-6">Assigned Vehicle</span>
              </div>
            </div>
          </div>

          {/* Action Buttons Row */}
          <div className="flex items-center gap-2 self-end md:self-center shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/drivers/${driver.id}/edit`)}
              className="h-9 text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 shadow-3xs cursor-pointer gap-1.5 rounded-xl px-4"
            >
              <Edit2 className="w-3.5 h-3.5" /> Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/drivers/${driver.id}/documents`)}
              className="h-9 text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 shadow-3xs cursor-pointer gap-1.5 rounded-xl px-4"
            >
              <FolderOpen className="w-3.5 h-3.5" /> Vault
            </Button>
            <Button
              size="sm"
              onClick={() => navigate(`/trips/new?driverId=${driver.id}`)}
              className="h-9 text-xs font-black bg-[#FA634E] hover:bg-[#FA634E]/90 text-white shadow-2xs rounded-xl px-4 cursor-pointer gap-1.5"
            >
              <Plus className="w-4 h-4" /> New Trip
            </Button>

            {/* Dropdown Menu for Delete/Export */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl cursor-pointer">
                  <MoreVertical className="w-4 h-4 text-slate-505" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 p-1 shadow-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl z-50">
                <DropdownMenuItem onClick={handleExportDossier} className="text-xs font-bold text-slate-700 dark:text-slate-355 px-2.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer flex items-center gap-2">
                  <Download className="w-3.5 h-3.5" /> Export Dossier
                </DropdownMenuItem>
                <DropdownMenuSeparator className="border-t border-slate-100 dark:border-slate-800/80 my-1" />
                <DropdownMenuItem onClick={() => setIsDeleteModalOpen(true)} className="text-xs font-bold text-rose-600 dark:text-rose-455 px-2.5 py-2 hover:bg-rose-50 dark:hover:bg-rose-955/20 rounded-lg cursor-pointer flex items-center gap-2">
                  <Trash2 className="w-3.5 h-3.5" /> Delete Account
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* ── 2. ROW 1: TWO COLUMN GRID ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          
          {/* Card A: Current Operation */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-3xs p-5 flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
                <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">
                  Current Operation
                </h3>
              </div>

              {/* Inner Status Block */}
              <div className="rounded-xl border border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-950/20 p-4 space-y-1">
                <div className="flex items-center gap-2">
                  <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', activeTrip ? 'bg-blue-500 animate-pulse' : 'bg-emerald-500')} />
                  <span className="text-sm font-black text-slate-900 dark:text-slate-100">
                    {activeTrip ? 'On Trip' : 'Available'}
                  </span>
                </div>
                <p className="text-xs text-slate-450 pl-4.5 font-bold uppercase tracking-wider">
                  {activeTrip ? `${activeTrip.ref_id || 'TRIP'} · ${activeTripRoute.pickup} → ${activeTripRoute.dropoff}` : 'No active trip'}
                </p>
              </div>
            </div>

            {/* Parameters Divider Row */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <div className="flex flex-col items-start gap-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Current Location</span>
                <div className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{(driver as any).current_location || 'Riyadh'}</span>
                </div>
              </div>

              <div className="flex flex-col items-start gap-1 border-l border-slate-100 dark:border-slate-800/80 pl-4">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Last Dispatch</span>
                <div className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mt-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">
                    {lastDispatchDate ? formatInDeploymentTz(lastDispatchDate, tz, 'dd MMM yyyy') : '—'}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-start gap-1 border-l border-slate-100 dark:border-slate-800/80 pl-4">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Next Assignment</span>
                <div className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mt-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">
                    {nextAssignment ? (
                      <button 
                        onClick={() => navigate(`/trips/${nextAssignment.id}`)}
                        className="hover:underline text-[#FA634E] text-left font-black"
                      >
                        {nextAssignment.ref_id || 'TRIP'}
                      </button>
                    ) : '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card B: Driver & License */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-3xs p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-4 flex-1">
              <div className="flex items-center gap-2">
                <Award className="w-4.5 h-4.5 text-indigo-500 shrink-0" />
                <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">
                  Driver & License
                </h3>
              </div>

              <div className="divide-y divide-slate-105 dark:divide-slate-800/80 text-xs">
                <div className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-semibold">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>Joining Date</span>
                  </div>
                  <span className="font-extrabold text-slate-800 dark:text-slate-200">
                    {formatInDeploymentTz(driver.createdAt, tz, 'dd MMM yyyy')}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-semibold">
                    <FileText className="w-4 h-4 text-slate-400" />
                    <span>License Number</span>
                  </div>
                  <span className="font-mono font-black text-slate-900 dark:text-slate-100">
                    {driver.license_number || '—'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-semibold">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>License Expiry</span>
                  </div>
                  <span className="font-mono font-black text-slate-800 dark:text-slate-200">
                    {driver.license_expiry ? formatInDeploymentTz(driver.license_expiry, tz, 'dd MMM yyyy') : '—'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-semibold">
                    <ShieldCheck className="w-4 h-4 text-slate-400" />
                    <span>License Status</span>
                  </div>
                  <span className={cn('font-black uppercase tracking-wider text-[10px]', isLicenseExpired ? 'text-rose-600' : 'text-emerald-600')}>
                    {isLicenseExpired ? 'Expired' : 'Valid'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── 3. DOCUMENT STATUS ── */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-3xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-955/20 text-indigo-650 dark:text-indigo-400">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-850 dark:text-slate-200 uppercase tracking-widest">
                  Document Status
                </h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                  Overview of important documents
                </p>
              </div>
            </div>
            
            <Button
              variant="link"
              onClick={() => navigate(`/drivers/${driver.id}/documents`)}
              className="p-0 h-auto text-xs font-black text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
            >
              View Vault →
            </Button>
          </div>

          {/* Three Slot Cards Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: 'Driver License', check: licenseCheck },
              { name: 'ID Document', check: idCheck },
              { name: 'Medical Certificate', check: medicalCheck }
            ].map((item, idx) => {
              const isOk = item.check.label.includes('Valid');
              return (
                <div 
                  key={idx} 
                  onClick={() => item.check.id && setSelectedDocIdForPreview(item.check.id)}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-950/10",
                    item.check.id && "cursor-pointer hover:border-indigo-250 dark:hover:border-indigo-850 transition-colors"
                  )}
                >
                  <div className={cn(
                    "p-2.5 rounded-full flex items-center justify-center shrink-0",
                    isOk 
                      ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400" 
                      : "bg-amber-50 dark:bg-amber-955/20 text-amber-600 dark:text-amber-400"
                  )}>
                    {isOk ? <ShieldCheck className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200 block truncate">
                      {item.name}
                    </span>
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-wider block mt-0.5",
                      isOk ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-405"
                    )}>
                      {isOk ? 'Valid' : 'Due'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 4. RECENT TRIPS ── */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-3xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-955/20 text-[#FA634E]">
                <Truck className="w-5 h-5" />
              </div>
              <h3 className="text-xs font-black text-slate-850 dark:text-slate-200 uppercase tracking-widest">
                Recent Trips
              </h3>
            </div>
            
            <Button
              variant="link"
              onClick={() => navigate('/trips')}
              className="p-0 h-auto text-xs font-black text-[#FA634E] hover:text-[#FA634E]/90 flex items-center gap-1 cursor-pointer"
            >
              View All →
            </Button>
          </div>

          {recentTripsList.length === 0 ? (
            <div className="text-xs text-slate-400 py-6 italic text-center">
              No completed trips yet.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto scrollbar-none">
                <table className="w-full text-xs text-left border-collapse min-w-[500px]">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      <th className="pb-3 font-black pl-3 w-[120px]">Trip ID</th>
                      <th className="pb-3 font-black">Route</th>
                      <th className="pb-3 font-black w-[150px]">Date</th>
                      <th className="pb-3 font-black w-[120px]">Status</th>
                      <th className="pb-3 font-black text-right pr-3 w-[40px]"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {recentTripsList.map((trip) => {
                      const route = getTripRouteInfo(trip);
                      const dateVal = trip.planned_start || trip.createdAt;
                      const dateStr = dateVal ? formatInDeploymentTz(dateVal, tz, 'dd MMM yyyy') : '—';
                      return (
                        <tr 
                          key={trip.id} 
                          onClick={() => navigate(`/trips/${trip.id}`)}
                          className="group cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors"
                        >
                          <td className="py-3 font-mono font-bold text-slate-805 dark:text-slate-200 pl-3">
                            {trip.ref_id || 'TRIP'}
                          </td>
                          <td className="py-3 font-semibold text-slate-800 dark:text-slate-200">
                            {route.pickup} &nbsp;→&nbsp; {route.dropoff}
                          </td>
                          <td className="py-3 text-slate-500 font-bold flex items-center gap-1.5 mt-0.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{dateStr}</span>
                          </td>
                          <td className="py-3">
                            <Badge className="bg-emerald-50 hover:bg-emerald-50 text-emerald-700 border border-emerald-150 text-[10px] font-extrabold tracking-wider uppercase px-2 py-0.5 shadow-3xs gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Completed
                            </Badge>
                          </td>
                          <td className="py-3 text-right pr-3 text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors">
                            <ChevronRight className="w-4 h-4 ml-auto" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold text-center uppercase tracking-wider pt-2 border-t border-slate-105/50 dark:border-slate-800/30">
                Showing last 2 completed trips
              </p>
            </div>
          )}
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

    </DashboardLayout>
  );
}
