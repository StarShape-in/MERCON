import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
  ArrowLeft, Edit2, FileText, AlertTriangle, Trash2,
  Wrench, Radio, AlertCircle, DollarSign, Plus, Gauge,
  TrendingUp, TrendingDown, UploadCloud, FileCheck, ExternalLink,
  CheckCircle2, ChevronDown, Calendar, XCircle, Eye, Download, LayoutGrid, List,
  Car, ShieldCheck, Activity, Layers, ArrowUpRight, User, Truck, MapPin, Compass, Navigation, Clock
} from 'lucide-react';

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import WorkshopField from '@/components/fleet/WorkshopField';
import MaintenanceRecordModal from '@/components/maintenance/MaintenanceRecordModal';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import UploadDocumentModal from '@/components/ui/UploadDocumentModal';
import DocumentViewerModal, { isImageFile, isPdfFile } from '@/components/ui/DocumentViewerModal';
import { vehicleService, AssetStatus } from '@/services/vehicleService';
import { maintenanceService, CreateMaintenancePayload, MaintenanceRecord } from '@/services/maintenanceService';
import { documentService, DocType, MerconDocument } from '@/services/documentService';
import { resolveFileUrl, docTypeLabel } from '@/lib/documents';
import { getUpcomingScheduledDates } from '@/utils/scheduleUtils';
import { useDeploymentTimezone, formatInDeploymentTz } from '@/lib/datetime';
import { GpsHealthBadge } from '@/components/fleet/GpsHealthBadge';
import { getGpsHealthInfo, formatTimeAgo } from '@/utils/gpsHealth';

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
}

function createVehicleMapMarkerIcon(plateNumber: string) {
  return L.divIcon({
    className: 'vehicle-details-map-marker',
    html: `
      <div style="display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
        <div style="background: #0F172A; border: 2px solid #2563EB; color: #F8FAFC; padding: 2px 8px; border-radius: 6px; font-weight: 900; font-size: 10px; font-family: monospace; box-shadow: 0 4px 12px rgba(0,0,0,0.25); white-space: nowrap; display: flex; align-items: center; gap: 5px;">
          <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #10B981;"></span>
          ${plateNumber}
        </div>
        <div style="width: 26px; height: 26px; background: #2563EB; border-radius: 50%; border: 3px solid #FFFFFF; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(37,99,235,0.5); margin-top: 2px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
            <path d="M15 18H9"/>
            <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>
            <circle cx="7.5" cy="18.5" r="2.5"/>
            <circle cx="17.5" cy="18.5" r="2.5"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel 
} from '@/components/ui/dropdown-menu';
import DataTable from '@/components/ui/DataTable';
import { cn } from '@/lib/utils';

export default function VehicleDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const tz = useDeploymentTimezone();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Maintenance Modal State
  const [isLogMaintModalOpen, setIsLogMaintModalOpen] = useState(false);
  const [maintRecordToEdit, setMaintRecordToEdit] = useState<MaintenanceRecord | null>(null);

  // Upload Document Modal State
  const [isUploadDocModalOpen, setIsUploadDocModalOpen] = useState(false);

  // Document Viewer Modal State & Vault View Mode
  const [viewingDoc, setViewingDoc] = useState<MerconDocument | null>(null);

  // Active Tab Mode: Overview, Maintenance, Financials, Documents
  const [activeTab, setActiveTab] = useState<'overview' | 'maintenance' | 'financials' | 'documents'>('overview');

  // Scheduled trips expand toggle state
  const [isTripsExpanded, setIsTripsExpanded] = useState(false);

  // Odometer quick-edit popover state
  const [isOdometerPopoverOpen, setIsOdometerPopoverOpen] = useState(false);
  const [odometerDraft, setOdometerDraft] = useState('');

  // Queries
  const { data: vehicle, isLoading, error } = useQuery({
    queryKey: ['vehicle', id],
    queryFn: () => vehicleService.getById(id!),
    enabled: !!id,
  });

  // URL normalization: if navigated using ref_id or plate, replace with canonical UUID
  useEffect(() => {
    if (vehicle && vehicle.id && id !== vehicle.id) {
      navigate(`/vehicles/${vehicle.id}`, { replace: true });
    }
  }, [vehicle?.id, id, navigate]);

  const { data: maintenanceRes, isLoading: isMaintLoading } = useQuery({
    queryKey: ['maintenance', id],
    queryFn: () => maintenanceService.getAll({ vehicle_id: id }),
    enabled: !!id,
  });

  const { data: financials, isLoading: isFinancialsLoading } = useQuery({
    queryKey: ['vehicle-financials', id],
    queryFn: () => vehicleService.getFinancials(id!),
    enabled: !!id,
  });

  const { data: docsRes, isLoading: isDocsLoading } = useQuery({
    queryKey: ['documents', 'Vehicle', id],
    queryFn: () => documentService.getAll({ entity_type: 'Vehicle', entity_id: id, per_page: 50 }),
    enabled: !!id,
  });

  // Only fetched once the delete dialog is open — confirmation detail
  const { data: vehicleUsage } = useQuery({
    queryKey: ['vehicle-usage', id],
    queryFn: () => vehicleService.getUsage(id!),
    enabled: !!id && isDeleteModalOpen,
  });

  const maintenanceRecords = maintenanceRes?.data || [];
  const documents = docsRes?.data || [];

  // Open Add / Edit Maintenance Modal helper
  const openLogMaintModal = (recordToEdit?: MaintenanceRecord | null) => {
    if (recordToEdit) {
      setMaintRecordToEdit(recordToEdit);
      setIsLogMaintModalOpen(true);
    } else {
      navigate(`/maintenance/new?vehicle_id=${vehicle?.id || id}`);
    }
  };

  // Mutations
  const createMaintMutation = useMutation({
    mutationFn: (payload: CreateMaintenancePayload) => maintenanceService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle', id] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance', id] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-financials', id] });
      queryClient.invalidateQueries({ queryKey: ['workshops'] });
      setIsLogMaintModalOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => vehicleService.delete(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      navigate('/vehicles');
    },
    onError: (err: any) => {
      setDeleteError(err.response?.data?.error?.message || 'Failed to delete vehicle asset.');
    },
  });

  const updateOdometerMutation = useMutation({
    mutationFn: (value: number) => vehicleService.update(id!, { current_odometer: value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle', id] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setIsOdometerPopoverOpen(false);
      toast.success('Odometer reading updated.');
    },
    onError: () => {
      toast.error('Failed to update odometer reading.');
    },
  });

  const deleteDocMutation = useMutation({
    mutationFn: (docId: string) => documentService.delete(docId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', 'Vehicle', id] });
    },
  });

  const handleDeleteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError('');
    deleteMutation.mutate();
  };

  const refreshVehicle = () => {
    queryClient.invalidateQueries({ queryKey: ['vehicle', id] });
    queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    queryClient.invalidateQueries({ queryKey: ['maintenance', id] });
    queryClient.invalidateQueries({ queryKey: ['maintenance'] });
  };

  const handleStatusUpdate = async (newStatus: AssetStatus) => {
    if (!id || newStatus === vehicle?.status) return;
    if (newStatus === 'Maintenance') {
      openLogMaintModal();
      return;
    }
    if (vehicle?.status === 'Maintenance') {
      toast.info(`Vehicle ${vehicle.plate_number} is in maintenance. Please complete its service order on the Maintenance page to return it to service.`);
      return navigate(`/maintenance?vehicle=${encodeURIComponent(vehicle.plate_number)}`);
    }
    try {
      await vehicleService.bulkUpdateStatus([id], newStatus);
      toast.success(`Vehicle ${vehicle?.plate_number || 'asset'} status updated to ${newStatus}`);
      queryClient.invalidateQueries({ queryKey: ['vehicle', id] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    } catch {
      toast.error('Failed to update vehicle status.');
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout active="Vehicles" title="Vehicle Details">
        <div className="px-4 sm:px-6 pb-6 max-w-[1400px] mx-auto w-full space-y-5 animate-pulse">
          <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl w-1/4"></div>
          <div className="h-44 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
          <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !vehicle) {
    return (
      <DashboardLayout active="Vehicles" title="Vehicle Details">
        <div className="px-4 sm:px-6 pb-6 max-w-[1400px] mx-auto w-full flex flex-col items-center justify-center text-center h-[60vh] gap-3">
          <AlertTriangle className="w-8 h-8 text-rose-500 shrink-0" />
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">Vehicle Not Found</h2>
          <p className="text-xs text-slate-500 max-w-md">
            The requested vehicle asset does not exist or may have been removed from the MERCON fleet.
          </p>
          <Button onClick={() => navigate('/vehicles')} size="sm" className="mt-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white">
            Return to Fleet Roster
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const capacityTons = ((vehicle.capacity_kg || 24000) / 1000).toFixed(1);
  const upcomingTrips = getUpcomingScheduledDates(vehicle.trips);
  const displayedTrips = isTripsExpanded ? upcomingTrips : upcomingTrips.slice(0, 3);

  const assignedDriver = vehicle.assignedDriver || (vehicle as any).driver || (vehicle.trips?.find((t: any) => t.driver)?.driver);
  const driverName = assignedDriver
    ? `${assignedDriver.first_name || ''} ${assignedDriver.last_name || ''}`.trim() || assignedDriver.name || 'Assigned Driver'
    : 'Unassigned';

  const getDocTypeLabel = (type: DocType) => {
    switch (type) {
      case 'VehicleRegistration': return 'Saudi Istimara Registration';
      case 'Insurance': return 'Najm Commercial Insurance';
      case 'CustomsClearance': return 'Customs Clearance';
      default: return type;
    }
  };

  return (
    <DashboardLayout active="Vehicles" title="Vehicle Details">
      <div className="pt-8 sm:pt-10 px-4 sm:px-6 pb-6 space-y-5 animate-fade-in max-w-[1400px] mx-auto w-full">

        {/* ── Top Header Bar with Big Truck Number & Positioned Small Details ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800 mb-6">
          <div className="flex items-center gap-4 min-w-0">
            <Truck className="w-7 h-7 text-blue-600 shrink-0" />
            <div className="flex flex-col gap-1.5 min-w-0">
              {/* Big Truck Number */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black font-mono text-slate-900 dark:text-slate-100 tracking-tight leading-none">
                {vehicle.plate_number}
              </h1>

              {/* Positioned Tags Directly Underneath the Big Truck Number */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800 font-semibold text-xs px-2.5 py-0.5 shadow-2xs">
                  Vehicles Module
                </Badge>
                {vehicle.ref_id && (
                  <span className="text-[10px] font-mono font-extrabold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200/80 dark:border-slate-700">
                    Ref: {vehicle.ref_id}
                  </span>
                )}
                <StatusBadge status={vehicle.status} />
                <span className="text-[10px] font-bold font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200/80 dark:border-slate-700">
                  {vehicle.asset_type}
                </span>
              </div>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsUploadDocModalOpen(true)}
              className="h-9 gap-1.5 text-xs font-semibold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-blue-200 hover:text-blue-600 shadow-2xs"
            >
              <UploadCloud className="w-3.5 h-3.5 text-blue-600" />
              Upload Document
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => openLogMaintModal()}
              className="h-9 gap-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs px-4"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Maintenance
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate(`/vehicles/${vehicle.id}/edit`)}
              className="h-9 gap-1.5 text-xs font-semibold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 shadow-2xs"
            >
              <Edit2 className="w-3.5 h-3.5 text-slate-500" />
              Edit
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteModalOpen(true)}
              className="h-9 gap-1.5 text-xs font-semibold border-rose-200 bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-700 shadow-2xs dark:bg-slate-900 dark:border-rose-900/50"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              Delete
            </Button>
          </div>
        </div>

        {/* Zero-friction Maintenance Banner */}
        {vehicle.status === 'Maintenance' && (() => {
          const maint = vehicle.active_maintenance;
          const fmtDate = (d: string) => formatInDeploymentTz(d, tz, 'dd MMM yyyy');
          const dateRange = maint
            ? maint.end_date
              ? `${fmtDate(maint.start_date)} → ${fmtDate(maint.end_date)}`
              : `From ${fmtDate(maint.start_date)} (ongoing)`
            : null;
          return (
            <div className="bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
              <div className="flex items-center gap-3">
                <Wrench className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <h4 className="text-sm font-extrabold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                    <span>Vehicle Currently In Maintenance</span>
                    <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] font-bold">
                      IN SHOP
                    </Badge>
                  </h4>
                  {dateRange && (
                    <p className="text-xs font-bold text-amber-700 dark:text-amber-300 mt-0.5 flex items-center gap-1">
                      <Calendar className="w-3 h-3 shrink-0" />
                      {dateRange}
                      {maint?.workshop_name && (
                        <span className="font-normal opacity-75 ml-1">· {maint.workshop_name}</span>
                      )}
                    </p>
                  )}
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                    Repairs or servicing in progress. To return this vehicle to service, complete its service order on the Maintenance page.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => navigate(`/maintenance?vehicle=${encodeURIComponent(vehicle.plate_number)}`)}
                  className="h-9 px-4 gap-2 text-xs font-extrabold bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
                >
                  <Wrench className="w-4 h-4" />
                  In Maintenance (View Details)
                </Button>
              </div>
            </div>
          );
        })()}

        {/* Keyframe style for slow marquee text scrolling */}
        <style>{`
          @keyframes marqueeSlow {
            0%, 20% { transform: translateX(0%); }
            65%, 80% { transform: translateX(calc(-100% + 80px)); }
            100% { transform: translateX(0%); }
          }
          .animate-marquee-slow {
            display: inline-block;
            white-space: nowrap;
            animation: marqueeSlow 7s ease-in-out infinite;
          }
        `}</style>

        {/* ── Asset Specifications & Telematics Section (No outer card borders) ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
              <Car className="w-3.5 h-3.5 text-blue-600" /> Asset Specifications & Telematics
            </h3>
            <span className="text-[10px] font-mono font-bold text-slate-400">
              Ref: {vehicle.ref_id || `TRK-${vehicle.id.slice(0, 4).toUpperCase()}`}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-2.5">

            {/* 1. Assigned Driver (Blue Theme - Same size as other boxes, clickable to profile) */}
            <div
              onClick={() => assignedDriver?.id && navigate(`/drivers/${assignedDriver.id}`)}
              className={cn(
                "bg-blue-50/70 dark:bg-blue-950/40 p-2.5 rounded-xl border border-blue-200/80 dark:border-blue-900/60 flex items-center gap-2.5 transition-all shadow-2xs group",
                assignedDriver?.id ? "cursor-pointer hover:border-blue-400 hover:bg-blue-100/60 dark:hover:bg-blue-900/60" : "opacity-85"
              )}
              title={assignedDriver?.id ? `View Driver Profile (${driverName})` : 'No driver assigned'}
            >
              <User className="w-4 h-4 text-blue-600 shrink-0" />
              <div className="min-w-0 flex-1 overflow-hidden">
                <span className="text-[9px] font-black uppercase text-blue-600/80 dark:text-blue-400/80 tracking-wider block leading-none">
                  Driver
                </span>
                <div className="overflow-hidden whitespace-nowrap w-full mt-0.5">
                  <span
                    className={cn(
                      "font-mono text-xs font-black text-blue-900 dark:text-blue-100 block",
                      driverName.length > 11 ? "animate-marquee-slow" : "truncate"
                    )}
                  >
                    {driverName}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Asset Type (Indigo Theme) */}
            <div className="bg-indigo-50/70 dark:bg-indigo-950/40 p-2.5 rounded-xl border border-indigo-200/80 dark:border-indigo-900/60 flex items-center gap-2.5 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all shadow-2xs">
              <Layers className="w-4 h-4 text-indigo-600 shrink-0" />
              <div className="min-w-0">
                <span className="text-[9px] font-black uppercase text-indigo-600/80 dark:text-indigo-400/80 tracking-wider block leading-none">Asset Type</span>
                <span className="font-mono text-xs font-black text-indigo-900 dark:text-indigo-100 truncate block mt-0.5">{vehicle.asset_type}</span>
              </div>
            </div>

            {/* 3. Payload Capacity (Amber Theme) */}
            <div className="bg-amber-50/70 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-200/80 dark:border-amber-900/60 flex items-center gap-2.5 hover:border-amber-300 dark:hover:border-amber-700 transition-all shadow-2xs">
              <Activity className="w-4 h-4 text-amber-600 shrink-0" />
              <div className="min-w-0">
                <span className="text-[9px] font-black uppercase text-amber-700/80 dark:text-amber-400/80 tracking-wider block leading-none">Capacity</span>
                <span className="font-mono text-xs font-black text-amber-900 dark:text-amber-100 truncate block mt-0.5">{capacityTons} Tons</span>
              </div>
            </div>



            {/* 6. Physical GPS Tracker (Real-time Health Status) */}
            <div className="bg-slate-50/80 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2 transition-all shadow-2xs col-span-2 sm:col-span-4 lg:col-span-1">
              <div className="min-w-0 flex-1">
                <span className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider block leading-none mb-1">
                  GPS Tracker Health
                </span>
                <GpsHealthBadge vehicle={vehicle} showDeviceId={true} showTimeAgo={true} compact={false} />
              </div>
            </div>

          </div>
        </div>

        {/* ── Interactive View Mode Tabs (Seamless Tab Switching Without Page Jump) ──── */}
        <div className="flex items-center gap-6 border-b border-slate-200 dark:border-slate-800 pb-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={cn(
              "pb-3 text-xs font-black gap-2 flex items-center transition-all border-b-2 tracking-wider uppercase whitespace-nowrap",
              activeTab === 'overview'
                ? "border-blue-600 text-blue-600 dark:text-blue-400 font-extrabold"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            )}
          >
            <Car className="w-3.5 h-3.5" />
            <span>Overview & Schedule</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('maintenance')}
            className={cn(
              "pb-3 text-xs font-black gap-2 flex items-center transition-all border-b-2 tracking-wider uppercase whitespace-nowrap",
              activeTab === 'maintenance'
                ? "border-blue-600 text-blue-600 dark:text-blue-400 font-extrabold"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            )}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Maintenance Ledger ({maintenanceRecords.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('financials')}
            className={cn(
              "pb-3 text-xs font-black gap-2 flex items-center transition-all border-b-2 tracking-wider uppercase whitespace-nowrap",
              activeTab === 'financials'
                ? "border-blue-600 text-blue-600 dark:text-blue-400 font-extrabold"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            )}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>P&L Financials</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('documents')}
            className={cn(
              "pb-3 text-xs font-black gap-2 flex items-center transition-all border-b-2 tracking-wider uppercase whitespace-nowrap",
              activeTab === 'documents'
                ? "border-blue-600 text-blue-600 dark:text-blue-400 font-extrabold"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            )}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Document Vault ({documents.length})</span>
          </button>
        </div>

        {/* ── Tab Content Area ───────────────────────────────────────────── */}

        {/* TAB 1: OVERVIEW & SCHEDULED TRIPS */}
        {activeTab === 'overview' && (
          <div className="space-y-6">

            {/* Real-time Interactive GPS Location & Live Telematics Radar Card */}
            {(() => {
              const gpsHealth = getGpsHealthInfo(vehicle);
              const hasCoords = vehicle.last_lat != null && vehicle.last_lng != null;
              const isMoving = vehicle.last_speed_kph != null && vehicle.last_speed_kph > 0;
              const isOfflineOrStale = gpsHealth.state === 'OFFLINE' || gpsHealth.state === 'STALE';
              const isNotConnected = gpsHealth.state === 'NOT_CONNECTED';
              const isUnreported = gpsHealth.state === 'UNREPORTED';

              return (
                <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs w-full overflow-hidden">
                  <CardHeader className="border-b border-slate-100 dark:border-slate-800 py-3 px-4 flex flex-row items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <Radio className="w-4 h-4 text-emerald-600 animate-pulse shrink-0" />
                        <span>GPS LOCATION & TELEMATICS RADAR</span>
                      </CardTitle>
                      {vehicle.icces_device_id && (
                        <Badge variant="outline" className="text-[10px] font-mono font-bold bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                          IMEI: {vehicle.icces_device_id}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <GpsHealthBadge vehicle={vehicle} showDeviceId={false} showTimeAgo={true} compact={true} />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/vehicles?search=${encodeURIComponent(vehicle.plate_number)}&view=map`)}
                        className="h-7 px-2.5 text-[11px] font-bold gap-1 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <ExternalLink className="w-3 h-3 text-slate-500" />
                        <span>Open in Fleet Map</span>
                      </Button>
                    </div>
                  </CardHeader>

                  {/* Interactive Leaflet Map Container */}
                  <div className="relative w-full h-72 bg-slate-100 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 overflow-hidden">
                    {hasCoords ? (
                      <MapContainer
                        center={[vehicle.last_lat!, vehicle.last_lng!]}
                        zoom={13}
                        scrollWheelZoom={false}
                        className="w-full h-full z-0"
                        style={{ height: '100%', width: '100%', zIndex: 0 }}
                      >
                        <RecenterMap lat={vehicle.last_lat!} lng={vehicle.last_lng!} />
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <Marker
                          position={[vehicle.last_lat!, vehicle.last_lng!]}
                          icon={createVehicleMapMarkerIcon(vehicle.plate_number)}
                        >
                          <Popup className="vehicle-popup font-sans">
                            <div className="p-1 space-y-1">
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{vehicle.ref_id || 'VEHICLE'}</p>
                              <p className="text-sm font-black">{vehicle.plate_number}</p>
                              <p className="text-xs text-slate-600 font-medium">
                                Speed: {vehicle.last_speed_kph != null ? `${vehicle.last_speed_kph} km/h` : '0 km/h'}
                                {vehicle.last_heading != null ? ` • Heading: ${vehicle.last_heading}°` : ''}
                              </p>
                              {vehicle.last_seen_at && (
                                <p className="text-[10px] text-slate-400 font-mono mt-1">
                                  Updated: {formatTimeAgo(vehicle.last_seen_at)}
                                </p>
                              )}
                            </div>
                          </Popup>
                        </Marker>
                      </MapContainer>
                    ) : (
                      /* Graceful Empty / Unconnected Map Placeholder */
                      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-slate-900/90 text-white relative overflow-hidden">
                        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />
                        <div className="relative z-10 space-y-2 max-w-md">
                          <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto shadow-inner text-slate-400">
                            <Compass className="w-6 h-6" />
                          </div>
                          <h4 className="text-sm font-black tracking-wide text-slate-200">
                            {isNotConnected
                              ? 'No Physical GPS Tracker Connected'
                              : isUnreported
                              ? 'Never Reported — No GPS Satellite Telemetry'
                              : 'No GPS Location Available'}
                          </h4>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            {isNotConnected
                              ? 'This vehicle has no physical ICCES tracker assigned. Pair a physical tracker IMEI to enable real-time GPS map tracking.'
                              : isUnreported
                              ? 'Physical GPS tracker assigned but no satellite signal has been received yet.'
                              : 'No coordinate data available for this vehicle.'}
                          </p>
                          <Badge variant="outline" className="text-[10px] font-mono bg-slate-800 text-slate-300 border-slate-700">
                            Status: {gpsHealth.label}
                          </Badge>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Footer HUD Telemetry Bar */}
                  <CardContent className="p-3.5 bg-slate-50/50 dark:bg-slate-900/50 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block leading-none">
                          {isOfflineOrStale ? 'Last Known Location' : 'Current GPS Coordinates'}
                        </span>
                        <span className="font-mono font-black text-slate-900 dark:text-slate-100 block truncate mt-0.5">
                          {hasCoords
                            ? `${vehicle.last_lat!.toFixed(6)}, ${vehicle.last_lng!.toFixed(6)}`
                            : 'No Coordinates'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 min-w-0">
                      <Gauge className="w-4 h-4 text-amber-600 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block leading-none">
                          Speed & Direction
                        </span>
                        <span className="font-mono font-black text-slate-900 dark:text-slate-100 block truncate mt-0.5">
                          {vehicle.last_speed_kph != null ? `${Math.round(vehicle.last_speed_kph)} km/h` : '0 km/h'}
                          {vehicle.last_heading != null ? ` • ${Math.round(vehicle.last_heading)}°` : ''}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 min-w-0">
                      <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block leading-none">
                          Telemetry Update
                        </span>
                        <span className="font-mono font-black text-slate-900 dark:text-slate-100 block truncate mt-0.5">
                          {isOfflineOrStale
                            ? `Last updated: ${formatTimeAgo(vehicle.last_seen_at)}`
                            : vehicle.last_seen_at
                            ? `Updated: ${formatTimeAgo(vehicle.last_seen_at)}`
                            : 'Never Reported'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })()}

            {/* Wider Full-Width Scheduled Trip Days Card (Compact & Expandable) */}
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs w-full">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3.5 flex flex-row items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Calendar className="w-4.5 h-4.5 text-blue-600" /> Scheduled Trip Days & Availability
                  </CardTitle>
                  <Badge className="bg-blue-50 text-blue-700 border-blue-200 font-extrabold text-xs">
                    {upcomingTrips.length} Days
                  </Badge>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => navigate(`/trips/new?vehicle_id=${vehicle.id}`)}
                  className="h-8 px-3 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-2xs"
                >
                  + Assign Trip
                </Button>
              </CardHeader>

              <CardContent className="p-4 space-y-3">
                {upcomingTrips.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Calendar className="w-7 h-7 text-blue-600 shrink-0" />
                    <p className="text-xs font-black text-slate-900 dark:text-slate-100">No Scheduled Trips</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 max-w-xs">
                      This vehicle currently has no active or upcoming trips assigned.
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => navigate(`/trips/new?vehicle_id=${vehicle.id}`)}
                      className="mt-3 h-8 px-3 text-xs font-extrabold bg-blue-600 text-white"
                    >
                      + Create First Trip
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {displayedTrips.map((item, idx) => (
                      <div
                        key={idx}
                        className="w-full flex items-center justify-between p-3.5 rounded-xl border border-blue-100 bg-blue-50/40 dark:bg-blue-950/20 dark:border-blue-900/40 hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer shadow-3xs group"
                        onClick={() => (item.tripId || item.tripRef) && navigate(`/trips/${item.tripId || item.tripRef}`)}
                      >
                        <div className="flex items-center gap-3">
                          <Calendar className="w-5 h-5 text-white shrink-0" />
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-black text-slate-900 dark:text-slate-100">
                              {item.formattedDate}
                            </span>
                            <span className="text-[11px] font-mono text-blue-600 dark:text-blue-400 font-extrabold truncate">
                              {item.tripRef ? `Trip #${item.tripRef}` : 'Assigned Trip'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.status && <StatusBadge status={item.status as any} />}
                          <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                  {upcomingTrips.length > 3 ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsTripsExpanded(!isTripsExpanded)}
                      className="h-8 text-xs font-bold text-blue-600 border-blue-200 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950/50 gap-1.5 shadow-2xs"
                    >
                      <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200", isTripsExpanded && "rotate-180")} />
                      {isTripsExpanded ? 'Show Less' : `Show More (${upcomingTrips.length - 3} More Trips)`}
                    </Button>
                  ) : (
                    <span className="text-xs font-bold text-slate-500">View All Trips Calendar</span>
                  )}

                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => navigate('/trips/monthly')}
                    className="h-7 text-xs font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 p-1 px-2"
                  >
                    Monthly Schedule →
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Maintenance Logs Table Placed Directly Underneath Scheduled Trip Days */}
            <DataTable
              title={
                <span className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-amber-500" />
                  <span>Recent Maintenance Logs</span>
                </span>
              }
              columns={[
                {
                  header: 'Date',
                  accessor: (m: any) => (
                    <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                      {m.start_date ? formatInDeploymentTz(m.start_date, tz, 'MM/dd/yyyy') : 'N/A'}
                    </span>
                  ),
                },
                {
                  header: 'Type',
                  accessor: (m: any) => <Badge variant="outline" className="text-[10px] font-bold">{m.maintenance_type}</Badge>,
                },
                {
                  header: 'Workshop',
                  accessor: (m: any) => <span className="font-semibold text-slate-800 dark:text-slate-200">{m.workshop_name}</span>,
                },
                {
                  header: 'Cost',
                  accessor: (m: any) => <span className="font-mono font-bold text-rose-600">SAR {(m.cost || 0).toLocaleString()}</span>,
                },
                {
                  header: 'Status',
                  accessor: (m: any) => (
                    <Badge className={cn(
                      "text-[10px] font-bold",
                      m.status === 'Completed' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                      m.status === 'In_Progress' ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-slate-100 text-slate-700"
                    )}>
                      {(m.status || 'COMPLETED').toUpperCase()}
                    </Badge>
                  ),
                },
              ]}
              data={maintenanceRecords.slice(0, 5)}
              compact={true}
              enableSelection={false}
              isLoading={isMaintLoading}
              emptyTitle="No Maintenance Logs"
              emptyMessage="No maintenance records logged for this vehicle yet."
            />

          </div>
        )}

        {/* TAB 2: MAINTENANCE HISTORY LEDGER */}
        {activeTab === 'maintenance' && (
          <div className="space-y-6">
            <DataTable
              title={
                <span className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-amber-500" />
                  <span>Vehicle Maintenance Service History</span>
                </span>
              }
              actionsElement={
                <Button
                  type="button"
                  size="sm"
                  onClick={() => openLogMaintModal()}
                  className="h-8 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white gap-1 shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Maintenance
                </Button>
              }
              columns={[
                {
                  header: 'Start / End Date',
                  accessor: (m: any) => (
                    <div className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                      <div>{m.start_date ? formatInDeploymentTz(m.start_date, tz, 'MM/dd/yyyy') : (m.service_date ? formatInDeploymentTz(m.service_date, tz, 'MM/dd/yyyy') : 'N/A')}</div>
                      {m.end_date && (
                        <div className="text-[10px] text-slate-400">to {formatInDeploymentTz(m.end_date, tz, 'MM/dd/yyyy')}</div>
                      )}
                    </div>
                  ),
                },
                {
                  header: 'Type',
                  accessor: (m: any) => (
                    <Badge variant="outline" className="text-[10px] font-bold">
                      {m.maintenance_type}
                    </Badge>
                  ),
                },
                {
                  header: 'Work Done / Details',
                  accessor: (m: any) => (
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{m.workshop_name}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-xs">{m.work_done || m.remarks || 'Standard Service'}</div>
                    </div>
                  ),
                },
                {
                  header: 'Expense',
                  accessor: (m: any) => (
                    <span className="font-mono font-extrabold text-rose-600 dark:text-rose-400 text-xs">
                      SAR {(m.cost || 0).toLocaleString()}
                    </span>
                  ),
                },
                {
                  header: 'Status',
                  accessor: (m: any) => (
                    <Badge className={cn(
                      "text-[10px] font-bold",
                      m.status === 'Completed' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                      m.status === 'In_Progress' ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-slate-100 text-slate-700"
                    )}>
                      {m.status.toUpperCase()}
                    </Badge>
                  ),
                },
                {
                  header: 'Actions',
                  headerClassName: 'text-right',
                  className: 'text-right',
                  accessor: (m: any) => (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openLogMaintModal(m);
                      }}
                      className="h-7 w-7 p-0 text-slate-600 hover:text-slate-900"
                      title="Edit Log"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                  ),
                },
              ]}
              data={maintenanceRecords}
              compact={true}
              enableSelection={false}
              isLoading={isMaintLoading}
              emptyTitle="No Maintenance Logs"
              emptyMessage="No maintenance records logged for this vehicle yet."
            />
          </div>
        )}

        {/* TAB 3: FINANCIAL P&L LEDGER */}
        {activeTab === 'financials' && (
          <div className="space-y-6">
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs overflow-hidden">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-500" /> Vehicle Profit & Loss (P&L) Summary
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Gross Trip Income vs Operational Service Expenses for this truck.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/vehicles/${vehicle.id}/financials`)}
                  className="h-8 text-xs font-bold border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 gap-1.5 shadow-2xs"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  View Full P&L Report →
                </Button>
              </CardHeader>

              <CardContent className="p-5">
                {isFinancialsLoading ? (
                  <div className="py-6 text-center text-slate-400 animate-pulse text-xs font-semibold">
                    Calculating vehicle P&L financials...
                  </div>
                ) : financials ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    
                    {/* Income */}
                    <div className="bg-emerald-50/60 dark:bg-emerald-950/20 p-3.5 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
                      <span className="text-[10px] font-extrabold uppercase text-emerald-700 dark:text-emerald-400 block">
                        Total Income
                      </span>
                      <div className="text-base font-mono font-extrabold text-emerald-700 dark:text-emerald-300 mt-1">
                        SAR {financials.summary.total_income.toLocaleString()}
                      </div>
                      <span className="text-[10px] text-slate-500 block mt-0.5 font-medium">
                        {financials.summary.completed_trips_count} trips
                      </span>
                    </div>

                    {/* Expenses */}
                    <div className="bg-rose-50/60 dark:bg-rose-950/20 p-3.5 rounded-xl border border-rose-100 dark:border-rose-900/50">
                      <span className="text-[10px] font-extrabold uppercase text-rose-700 dark:text-rose-400 block">
                        Total Expenses
                      </span>
                      <div className="text-base font-mono font-extrabold text-rose-700 dark:text-rose-300 mt-1">
                        SAR {financials.summary.total_expenses.toLocaleString()}
                      </div>
                      <span className="text-[10px] text-slate-500 block mt-0.5 font-medium">
                        {financials.summary.total_maintenance_count} services
                      </span>
                    </div>

                    {/* Net Profit */}
                    <div className="bg-blue-50/60 dark:bg-blue-950/20 p-3.5 rounded-xl border border-blue-100 dark:border-blue-900/50">
                      <span className="text-[10px] font-extrabold uppercase text-blue-700 dark:text-blue-400 block">
                        Net Profit
                      </span>
                      <div className={cn(
                        "text-base font-mono font-extrabold mt-1",
                        financials.summary.net_profit >= 0 ? "text-blue-700 dark:text-blue-300" : "text-rose-600"
                      )}>
                        SAR {financials.summary.net_profit.toLocaleString()}
                      </div>
                      <span className="text-[10px] text-slate-500 block mt-0.5 font-medium">
                        Income - Expenses
                      </span>
                    </div>

                    {/* Margin */}
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] font-extrabold uppercase text-slate-500 block">
                        Profit Margin
                      </span>
                      <div className="text-base font-mono font-extrabold text-slate-900 dark:text-slate-100 mt-1 flex items-center gap-1">
                        {financials.summary.margin_percent >= 0 ? (
                          <TrendingUp className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-rose-500" />
                        )}
                        <span>{financials.summary.margin_percent}%</span>
                      </div>
                      <span className="text-[10px] text-slate-500 block mt-0.5 font-medium">
                        Asset Margin
                      </span>
                    </div>

                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        )}

        {/* TAB 4: DOCUMENT VAULT */}
        {activeTab === 'documents' && (
          <div className="space-y-6">
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Vehicle Documents Vault
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                    {documents.length} {documents.length === 1 ? 'file' : 'files'}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-4">
                {isDocsLoading ? (
                  <div className="py-8 text-center text-slate-400 animate-pulse text-xs font-semibold">
                    Loading vehicle documents...
                  </div>
                ) : documents.length === 0 ? (
                  <div className="py-8 text-center space-y-3">
                    <FileText className="w-5 h-5 text-slate-400 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No Documents Uploaded</p>
                      <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs mx-auto">
                        Upload Istimara, Insurance policy, or Customs clearance for this vehicle asset.
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Grid Mode with rich Image Previews */
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {documents.map((doc: MerconDocument) => {
                      const isImg = isImageFile(doc.file_url, doc.mime_type);
                      const isPdf = isPdfFile(doc.file_url, doc.mime_type);
                      const resolvedUrl = resolveFileUrl(doc.file_url);

                      return (
                        <div
                          key={doc.id}
                          className="group border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/80 overflow-hidden flex flex-col hover:shadow-md transition-all duration-200 hover:border-blue-200 dark:hover:border-blue-800"
                        >
                          {/* Thumbnail Container */}
                          <div
                            onClick={() => setViewingDoc(doc)}
                            className="h-32 bg-slate-100 dark:bg-slate-950 relative overflow-hidden flex items-center justify-center cursor-pointer group/thumb"
                          >
                            {isImg ? (
                              <img
                                src={resolvedUrl}
                                alt={getDocTypeLabel(doc.doc_type)}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover/thumb:scale-105"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : isPdf ? (
                              <div className="flex flex-col items-center gap-1.5 p-3 text-center text-rose-600 dark:text-rose-400">
                                <FileText className="w-5 h-5 text-rose-600 shrink-0" />
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">PDF Document</span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-1.5 p-3 text-center text-blue-600 dark:text-blue-400">
                                <FileCheck className="w-5 h-5 text-blue-600 shrink-0" />
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Document File</span>
                              </div>
                            )}

                            {/* Status Badge Overlay */}
                            <div className="absolute top-2 left-2 pointer-events-none">
                              <Badge className={cn(
                                "text-[9px] font-bold shadow-2xs",
                                doc.status === 'Verified' ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300" :
                                doc.status === 'Expired' ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300" : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300"
                              )}>
                                {(doc.status || 'PENDING').toUpperCase()}
                              </Badge>
                            </div>

                            {/* Hover Eye Overlay button */}
                            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] opacity-0 group-hover/thumb:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs font-bold gap-1">
                              <Eye className="w-4 h-4 text-white shrink-0" />
                              <span>Click to View Modal</span>
                            </div>
                          </div>

                          {/* Card Details */}
                          <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                            <div>
                              <div
                                onClick={() => setViewingDoc(doc)}
                                className="text-xs font-bold text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer truncate"
                                title={getDocTypeLabel(doc.doc_type)}
                              >
                                {getDocTypeLabel(doc.doc_type)}
                              </div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                {doc.expiry_date ? (
                                  <span>Expires: {formatInDeploymentTz(doc.expiry_date, tz, 'MM/dd/yyyy')}</span>
                                ) : (
                                  <span>Uploaded: {formatInDeploymentTz(doc.createdAt, tz, 'MM/dd/yyyy')}</span>
                                )}
                              </div>
                            </div>

                            {/* Action Row */}
                            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => setViewingDoc(doc)}
                                className="h-7 text-[11px] font-bold text-blue-600 border-blue-200 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950/50 gap-1 px-2.5"
                              >
                                <Eye className="w-3.5 h-3.5" /> View
                              </Button>

                              <div className="flex items-center gap-1">
                                {resolvedUrl && (
                                  <a
                                    href={resolvedUrl}
                                    download
                                    className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:border-blue-200 bg-white dark:bg-slate-900 transition-colors"
                                    title="Download File"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </a>
                                )}

                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteDocMutation.mutate(doc.id)}
                                  className="w-7 h-7 p-0 text-slate-400 hover:text-rose-600"
                                  title="Delete Document"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Document Viewer Modal */}
            <DocumentViewerModal
              document={viewingDoc}
              isOpen={!!viewingDoc}
              onClose={() => setViewingDoc(null)}
              onDelete={(docId) => deleteDocMutation.mutate(docId)}
              vehiclePlate={vehicle?.plate_number}
            />
          </div>
        )}

      </div>

      {/* ── Upload Document Modal Component ───────────────────────────── */}
      <UploadDocumentModal
        isOpen={isUploadDocModalOpen}
        onClose={() => setIsUploadDocModalOpen(false)}
        entityType="Vehicle"
        entityId={id || ''}
        docType="VehicleRegistration"
        onUploadSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['documents', 'Vehicle', id] });
        }}
      />

      {/* ── Maintenance Record Modal ─────────────────────── */}
      <MaintenanceRecordModal
        open={isLogMaintModalOpen}
        onOpenChange={(open) => {
          setIsLogMaintModalOpen(open);
          if (!open) setMaintRecordToEdit(null);
        }}
        initialVehicleId={vehicle?.id || id}
        editingRecord={maintRecordToEdit}
        onSuccess={refreshVehicle}
      />

      {/* ── Delete Vehicle Confirmation Modal ────────────────────────────── */}
      <Dialog open={isDeleteModalOpen} onOpenChange={(open) => !open && setIsDeleteModalOpen(false)}>
        <DialogContent className="max-w-md rounded-2xl p-0 overflow-hidden border-slate-200 dark:border-slate-800">
          <DialogHeader className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-rose-50/50 dark:bg-rose-950/20">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <DialogTitle className="text-base font-extrabold">Delete Vehicle Asset</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500 mt-1">
              Deleting vehicle <strong className="text-slate-900 dark:text-slate-100">{vehicle.plate_number}</strong> will remove it from active fleet rosters.
              {vehicleUsage && (
                vehicleUsage.totalTrips > 0 || vehicleUsage.maintenanceRecords > 0 || vehicleUsage.expenses > 0 ? (
                  <>
                    {' '}It has {vehicleUsage.totalTrips} trip{vehicleUsage.totalTrips === 1 ? '' : 's'}
                    {vehicleUsage.activeTrips > 0 ? ` (${vehicleUsage.activeTrips} active)` : ''}, {vehicleUsage.maintenanceRecords} maintenance record{vehicleUsage.maintenanceRecords === 1 ? '' : 's'}, and {vehicleUsage.expenses} expense{vehicleUsage.expenses === 1 ? '' : 's'} linked to it.
                    It will be archived, not erased — those records will keep showing its plate marked as Deleted.
                  </>
                ) : ' It has no linked trips or records.'
              )}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleDeleteSubmit}>
            {deleteError && (
              <div className="p-4 mx-6 mt-4 rounded-lg bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <DialogFooter className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex justify-end gap-2 mt-4">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => { setIsDeleteModalOpen(false); setDeleteError(''); }}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={deleteMutation.isPending}
                className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold px-4"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Confirm Delete'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
