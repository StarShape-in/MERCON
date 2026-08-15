import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
  ArrowLeft, Edit2, FileText, AlertTriangle, Trash2,
  Wrench, Radio, AlertCircle, DollarSign, Plus, Gauge,
  TrendingUp, TrendingDown, UploadCloud, FileCheck, ExternalLink,
  CheckCircle2, ChevronDown, Calendar, XCircle
} from 'lucide-react';

import WorkshopField from '@/components/fleet/WorkshopField';
import MaintenanceRecordModal from '@/components/maintenance/MaintenanceRecordModal';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import UploadDocumentModal from '@/components/ui/UploadDocumentModal';
import { vehicleService, AssetStatus } from '@/services/vehicleService';
import { maintenanceService, CreateMaintenancePayload, MaintenanceRecord } from '@/services/maintenanceService';
import { documentService, DocType, MerconDocument } from '@/services/documentService';
import { getUpcomingScheduledDates } from '@/utils/scheduleUtils';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Maintenance Modal State
  const [isLogMaintModalOpen, setIsLogMaintModalOpen] = useState(false);
  const [maintRecordToEdit, setMaintRecordToEdit] = useState<MaintenanceRecord | null>(null);

  // Upload Document Modal State
  const [isUploadDocModalOpen, setIsUploadDocModalOpen] = useState(false);

  // Queries
  const { data: vehicle, isLoading, error } = useQuery({
    queryKey: ['vehicle', id],
    queryFn: () => vehicleService.getById(id!),
    enabled: !!id,
  });

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

  const maintenanceRecords = maintenanceRes?.data || [];
  const documents = docsRes?.data || [];

  // Open Add / Edit Maintenance Modal helper
  const openLogMaintModal = (recordToEdit?: MaintenanceRecord | null) => {
    setMaintRecordToEdit(recordToEdit || null);
    setIsLogMaintModalOpen(true);
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

  /** Closes the open service order(s), which is what releases the vehicle to Available. */
  const handleReturnToService = async () => {
    if (!id) return;
    try {
      const { closed_orders } = await maintenanceService.returnVehicleToService(id);
      toast.success(
        closed_orders > 0
          ? `${vehicle?.plate_number || 'Vehicle'} back in service — ${closed_orders} service order(s) closed`
          : `${vehicle?.plate_number || 'Vehicle'} back in service`,
      );
      refreshVehicle();
    } catch {
      toast.error('Failed to return the vehicle to service.');
    }
  };

  const handleStatusUpdate = async (newStatus: AssetStatus) => {
    if (!id || newStatus === vehicle?.status) return;
    // The workshop state belongs to the service order, so route those two through it.
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
          <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">Vehicle Not Found</h2>
          <p className="text-xs text-slate-500 max-w-md">
            The requested vehicle asset does not exist or may have been removed from the MERCON fleet.
          </p>
          <Button onClick={() => navigate('/vehicles')} size="sm" className="mt-2 text-xs font-bold bg-brand text-white">
            Return to Fleet Roster
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const capacityTons = ((vehicle.capacity_kg || 24000) / 1000).toFixed(1);

  // Parse plate numbers into English representation
  const rawPlate = vehicle.plate_number || '7821-LSA';
  const plateParts = rawPlate.split('-');
  const plateNum = plateParts[0] || '7821';
  const plateLetters = plateParts[1] || 'LSA';

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
      <div className="px-4 sm:px-6 pb-6 space-y-6 animate-fade-in max-w-[1400px] mx-auto w-full">

        {/* ── Page Header & Top Bar Actions ────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/vehicles')}
              className="h-9 w-9 p-0 text-slate-600 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs"
              title="Back to Fleet Roster"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2">
              <span 
                onClick={() => navigate('/vehicles')}
                className="text-sm font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Vehicles
              </span>
              <span className="text-slate-400 text-sm">/</span>
              <h1 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                Vehicle Details
              </h1>
              <Badge className="bg-indigo-50 text-indigo-600 border-indigo-200 font-semibold text-[11px] ml-1">
                Fleet Asset
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsUploadDocModalOpen(true)}
              className="h-9 gap-1.5 text-xs font-semibold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 shadow-2xs"
            >
              <UploadCloud className="w-3.5 h-3.5 text-indigo-500" />
              Upload Document
            </Button>

            <Button
              size="sm"
              onClick={() => openLogMaintModal()}
              className="h-9 gap-1.5 text-xs font-bold bg-brand hover:bg-[#d03c0b] text-white shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Maintenance
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/vehicles/${vehicle.id}/edit`)}
              className="h-9 gap-1.5 text-xs font-semibold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 shadow-2xs"
            >
              <Edit2 className="w-3.5 h-3.5 text-slate-500" />
              Edit
            </Button>

            <Button
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
          const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
          const dateRange = maint
            ? maint.end_date
              ? `${fmtDate(maint.start_date)} → ${fmtDate(maint.end_date)}`
              : `From ${fmtDate(maint.start_date)} (ongoing)`
            : null;
          return (
            <div className="bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                  <Wrench className="w-5 h-5" />
                </div>
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

        {/* Upcoming Scheduled Maintenance Notice (vehicle Available but has a future maintenance window) */}
        {vehicle.status !== 'Maintenance' && vehicle.active_maintenance && vehicle.active_maintenance.status === 'Scheduled' && (() => {
          const maint = vehicle.active_maintenance!;
          const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
          const dateRange = maint.end_date
            ? `${fmtDate(maint.start_date)} → ${fmtDate(maint.end_date)}`
            : `From ${fmtDate(maint.start_date)}`;
          return (
            <div className="bg-yellow-50/80 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-yellow-100 dark:bg-yellow-900/50 flex items-center justify-center text-yellow-600 dark:text-yellow-400 shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-yellow-900 dark:text-yellow-200">
                    Scheduled Maintenance Upcoming
                  </h4>
                  <p className="text-xs font-bold text-yellow-700 dark:text-yellow-300 mt-0.5">
                    {dateRange}
                    {maint.workshop_name && <span className="font-normal opacity-75 ml-1">· {maint.workshop_name}</span>}
                  </p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-0.5">
                    This vehicle cannot be assigned to trips on the above dates.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(`/maintenance?vehicle=${encodeURIComponent(vehicle.plate_number)}`)}
                className="h-8 px-3 gap-1.5 text-xs font-bold border-yellow-300 text-yellow-800 hover:bg-yellow-100 shrink-0"
              >
                <Wrench className="w-3.5 h-3.5" />
                View Schedule
              </Button>
            </div>
          );
        })()}

        {/* ── Visual Hero Command Panel ─────────────────────────────────── */}
        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-3xl shadow-xs p-6 overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            
            {/* Left: Authentic Dual-Language Saudi Plate Card (Bigger, featuring Ref ID, Capacity & Mileage inside) */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-6 w-full lg:w-auto">
              
              {/* Bigger Saudi License Plate Card with Embedded Vehicle Specs */}
              <div className="w-72 h-36 rounded-2xl border-2 border-slate-900 dark:border-slate-100 bg-slate-50 dark:bg-slate-950 p-3.5 shadow-md flex flex-col justify-between shrink-0 select-none relative">
                
                {/* Header row: English & Arabic Plate Code */}
                <div className="flex items-center justify-between border-b-2 border-slate-900/60 dark:border-slate-100/60 pb-1.5 font-bold">
                  <span className="font-mono text-xl text-slate-900 dark:text-slate-100 tracking-wider font-extrabold">{plateNum} {plateLetters}</span>
                  <span className="text-xs text-slate-500 font-mono font-bold">KSA 🇸🇦</span>
                </div>

                {/* Specs Row inside Plate Card: Ref ID, Capacity & Mileage */}
                <div className="grid grid-cols-3 gap-1.5 py-1 text-center">
                  
                  {/* Ref ID */}
                  <div className="bg-slate-200/80 dark:bg-slate-800/80 rounded-lg p-1">
                    <span className="text-[8px] font-extrabold text-slate-500 uppercase block leading-none">Ref ID</span>
                    <span className="font-mono text-[10px] font-extrabold text-slate-900 dark:text-slate-100 truncate block mt-0.5">
                      {vehicle.ref_id || `VEH-${vehicle.id.slice(0, 4).toUpperCase()}`}
                    </span>
                  </div>

                  {/* Capacity */}
                  <div className="bg-indigo-50 dark:bg-indigo-950/60 rounded-lg p-1 border border-indigo-200/60 dark:border-indigo-900/50">
                    <span className="text-[8px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase block leading-none">Capacity</span>
                    <span className="font-mono text-[10px] font-extrabold text-indigo-700 dark:text-indigo-300 block mt-0.5">
                      {capacityTons}T
                    </span>
                  </div>

                  {/* Mileage */}
                  <div className="bg-emerald-50 dark:bg-emerald-950/60 rounded-lg p-1 border border-emerald-200/60 dark:border-emerald-900/50">
                    <span className="text-[8px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase block leading-none">Mileage</span>
                    <span className="font-mono text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 block mt-0.5">
                      {(vehicle.current_odometer ?? 0).toLocaleString()}k
                    </span>
                  </div>

                </div>

                {/* Footer bar */}
                <div className="flex items-center justify-between text-[9px] font-extrabold text-slate-400 uppercase tracking-widest pt-1 border-t border-slate-200/80 dark:border-slate-800">
                  <span>SAUDI ARABIA</span>
                  <span className="font-mono text-brand">{vehicle.asset_type || 'HEAVY TRUCK'}</span>
                </div>
              </div>

              {/* Primary Asset Specification Metadata */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  {vehicle.asset_type && (
                    <Badge className="bg-brand-light text-brand border-brand/30 text-xs font-extrabold uppercase font-mono px-3 py-1">
                      {vehicle.asset_type}
                    </Badge>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="group flex items-center gap-1 focus:outline-none rounded-full transition-transform hover:scale-105" title="Quick change status">
                        <StatusBadge status={vehicle.status} />
                        <ChevronDown size={12} className="text-slate-400 opacity-60 group-hover:opacity-100 transition-opacity" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-44 p-1">
                      <DropdownMenuLabel className="text-[10px] font-bold uppercase text-slate-400 px-2 py-1">Quick Status Change</DropdownMenuLabel>
                      <DropdownMenuItem 
                        onClick={() => handleStatusUpdate('Available')}
                        className={cn("text-xs font-semibold gap-2 py-1.5 cursor-pointer", vehicle.status === 'Available' && "bg-slate-100 dark:bg-slate-800 font-bold")}
                      >
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                        Available (Active)
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleStatusUpdate('Maintenance')}
                        className={cn("text-xs font-semibold gap-2 py-1.5 cursor-pointer", vehicle.status === 'Maintenance' && "bg-slate-100 dark:bg-slate-800 font-bold")}
                      >
                        <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                        Maintenance (In Shop)
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleStatusUpdate('Inactive')}
                        className={cn("text-xs font-semibold gap-2 py-1.5 cursor-pointer", vehicle.status === 'Inactive' && "bg-slate-100 dark:bg-slate-800 font-bold")}
                      >
                        <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                        Inactive (Off Duty)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-400 font-medium space-y-1">
                  <p>
                    <span className="text-slate-400">Ref ID:</span> <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{vehicle.ref_id || `VEH-${vehicle.id.slice(0, 6).toUpperCase()}`}</span>
                    {vehicle.trailer_number ? ` • Trailer: ${vehicle.trailer_number}` : ''}
                  </p>
                  <p>
                    <span className="text-slate-400">Payload Rating:</span> <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{capacityTons} Tons ({vehicle.capacity_kg ? vehicle.capacity_kg.toLocaleString() : '24,000'} kg)</span>
                  </p>
                  <p>
                    <span className="text-slate-400">Odometer Mileage:</span> <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{(vehicle.current_odometer ?? 0).toLocaleString()} km</span>
                  </p>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-500 font-mono pt-0.5">
                  {vehicle.gps_device_id && (
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                      <Radio className="w-3.5 h-3.5" /> GPS: {vehicle.gps_device_id}
                    </span>
                  )}
                  {vehicle.icces_device_id && (
                    <>
                      {vehicle.gps_device_id && <span>•</span>}
                      <span>ICCES: {vehicle.icces_device_id}</span>
                    </>
                  )}
                  {!vehicle.gps_device_id && !vehicle.icces_device_id && (
                    <span className="text-slate-400 italic">No Telematics Tracker Linked</span>
                  )}
                </div>
              </div>

            </div>

            {/* Right: Net Profit & Services Summary Cards */}
            <div className="grid grid-cols-2 gap-3 border-t lg:border-t-0 lg:border-l border-slate-100 dark:border-slate-800 pt-4 lg:pt-0 lg:pl-6 shrink-0">
              
              {/* Net Profit Tile */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-center min-w-[130px]">
                <div className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider flex items-center justify-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-brand" /> Net Profit
                </div>
                <div className={cn(
                  "text-base font-mono font-extrabold mt-1",
                  (financials?.summary.net_profit ?? 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600"
                )}>
                  SAR {(financials?.summary.net_profit ?? 0).toLocaleString()}
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5">P&L Financials</span>
              </div>

              {/* Service Logs Tile */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-center min-w-[130px]">
                <div className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider flex items-center justify-center gap-1">
                  <Wrench className="w-3.5 h-3.5 text-amber-500" /> Services
                </div>
                <div className="text-base font-mono font-extrabold text-slate-900 dark:text-slate-100 mt-1">
                  {financials?.summary.total_maintenance_count ?? maintenanceRecords.length} <span className="text-xs font-sans text-slate-500">Logs</span>
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5">Workshop History</span>
              </div>

            </div>

          </div>
        </Card>

        {/* ── Main Dashboard 2-Column Grid ───────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Scheduled Trip Days Section */}
          <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600" /> Scheduled Trip Days & Availability
              </CardTitle>
              <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold text-xs">
                {getUpcomingScheduledDates(vehicle.trips).length} Scheduled Days
              </Badge>
            </CardHeader>
            <CardContent className="p-4">
              {getUpcomingScheduledDates(vehicle.trips).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-2">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No Scheduled Trips</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">This vehicle has no active or upcoming trips assigned.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {getUpcomingScheduledDates(vehicle.trips).map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-xl border border-indigo-100 bg-indigo-50/40 dark:bg-indigo-950/20 dark:border-indigo-900/40 hover:border-indigo-300 transition-all cursor-pointer"
                      onClick={() => (item.tripId || item.tripRef) && navigate(`/trips/${item.tripId || item.tripRef}`)}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-black text-slate-900 dark:text-slate-100">
                            {item.formattedDate}
                          </span>
                          <span className="text-[10px] font-mono text-indigo-600 font-bold truncate">
                            {item.tripRef ? `Trip ${item.tripRef}` : 'Assigned Trip'}
                          </span>
                        </div>
                      </div>
                      {item.status && <StatusBadge status={item.status as any} />}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Left Column (Financial P&L Summary & Maintenance Service Ledger) */}
          <div className="lg:col-span-2 space-y-6">

            {/* Section 1: Vehicle Financial & Profitability Overview (P&L) */}
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
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/vehicles/${vehicle.id}/financials`)}
                  className="h-8 text-xs font-bold border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 gap-1.5 shadow-2xs"
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
                    <div className="bg-indigo-50/60 dark:bg-indigo-950/20 p-3.5 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
                      <span className="text-[10px] font-extrabold uppercase text-indigo-700 dark:text-indigo-400 block">
                        Net Profit
                      </span>
                      <div className={cn(
                        "text-base font-mono font-extrabold mt-1",
                        financials.summary.net_profit >= 0 ? "text-indigo-700 dark:text-indigo-300" : "text-rose-600"
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

            {/* Section 2: Workshop Maintenance & Service History Ledger */}
            <DataTable
              title={
                <span className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-amber-500" />
                  <span>Vehicle Maintenance Service History</span>
                </span>
              }
              actionsElement={
                <Button
                  size="sm"
                  onClick={() => openLogMaintModal()}
                  className="h-7 text-xs font-bold bg-brand hover:bg-[#d03c0b] text-white gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Maintenance
                </Button>
              }
              columns={[
                {
                  header: 'Start / End Date',
                  accessor: (m: any) => (
                    <div className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                      <div>{m.start_date ? new Date(m.start_date).toLocaleDateString() : (m.service_date ? new Date(m.service_date).toLocaleDateString() : 'N/A')}</div>
                      {m.end_date && (
                        <div className="text-[10px] text-slate-400">to {new Date(m.end_date).toLocaleDateString()}</div>
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

          {/* Right Column (REAL Documents Vault & Telematics Radar) */}
          <div className="space-y-6">

            {/* REAL Vehicle Documents Vault */}
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" /> Vehicle Documents Vault
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsUploadDocModalOpen(true)}
                    className="h-7 text-xs font-bold border-indigo-200 text-indigo-600 hover:bg-indigo-50 gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Upload
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-3">
                {isDocsLoading ? (
                  <div className="py-6 text-center text-slate-400 animate-pulse text-xs font-semibold">
                    Loading vehicle documents...
                  </div>
                ) : documents.length === 0 ? (
                  <div className="py-8 text-center space-y-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No Documents Uploaded</p>
                      <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs mx-auto">
                        Upload Istimara, Insurance policy, or Customs clearance for this vehicle asset.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setIsUploadDocModalOpen(true)}
                      className="h-8 text-xs font-bold bg-indigo-600 text-white gap-1"
                    >
                      <UploadCloud className="w-3.5 h-3.5" /> Upload First Document
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {documents.map((doc: MerconDocument) => (
                      <div
                        key={doc.id}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center shrink-0">
                            <FileCheck className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                              {getDocTypeLabel(doc.doc_type)}
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                              {doc.expiry_date ? (
                                <span>Expires: {new Date(doc.expiry_date).toLocaleDateString()}</span>
                              ) : (
                                <span>Uploaded: {new Date(doc.createdAt).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Badge className={cn(
                            "text-[9px] font-bold",
                            doc.status === 'Verified' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                            doc.status === 'Expired' ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-amber-50 text-amber-700 border-amber-200"
                          )}>
                            {(doc.status || 'PENDING').toUpperCase()}
                          </Badge>

                          {doc.file_url && (
                            <a
                              href={doc.file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:border-indigo-200 bg-white dark:bg-slate-900 transition-colors"
                              title="View Document"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}

                          <Button
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
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

          </div>

        </div>

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
