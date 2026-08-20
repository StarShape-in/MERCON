import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
  ArrowLeft, Edit2, FileText, AlertTriangle, Trash2,
  Wrench, Radio, AlertCircle, DollarSign, Plus, Gauge,
  TrendingUp, TrendingDown, UploadCloud, FileCheck, ExternalLink,
  CheckCircle2, ChevronDown, Calendar, XCircle, Eye, Download, LayoutGrid, List,
  Car, ShieldCheck, Activity, Layers, ArrowUpRight
} from 'lucide-react';

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
  const [docVaultViewMode, setDocVaultViewMode] = useState<'grid' | 'list'>('grid');

  // Active Tab Mode: Overview, Maintenance, Financials, Documents
  const [activeTab, setActiveTab] = useState<'overview' | 'maintenance' | 'financials' | 'documents'>('overview');

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
          <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center">
            <AlertTriangle size={32} />
          </div>
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

        {/* ── Top Header Bar with Big Truck Number & Positioned Small Details ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate('/vehicles')}
              className="h-10 w-10 p-0 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-blue-600 hover:border-blue-200 dark:hover:border-blue-800 transition-colors shadow-2xs shrink-0"
              title="Back to Fleet Roster"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Big Truck Number */}
              <h1 className="text-3xl sm:text-4xl font-black font-mono text-slate-900 dark:text-slate-100 tracking-tight">
                {vehicle.plate_number}
              </h1>

              {/* Positioned Small Details Right Next to the Big Truck Number */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800 font-extrabold text-xs px-2.5 py-1 gap-1.5 shadow-2xs">
                  <Car className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  Vehicles Module
                </Badge>
                {vehicle.ref_id && (
                  <span className="text-xs font-mono font-extrabold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-slate-700">
                    {vehicle.ref_id}
                  </span>
                )}
                <StatusBadge status={vehicle.status} />
                <span className="text-xs font-bold font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-slate-700">
                  ({vehicle.asset_type})
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

        {/* ── Standard & Bold KPI Cards (3 Clean Responsive Columns) ────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          {/* Card 1: Current Odometer */}
          <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-2xs relative overflow-hidden group hover:border-blue-300 dark:hover:border-blue-700 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">CURRENT ODOMETER</span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                <Gauge className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="text-2xl font-black font-mono text-slate-900 dark:text-slate-100">
                {(vehicle.current_odometer ?? 0).toLocaleString()} <span className="text-xs font-sans text-slate-500 font-extrabold">km</span>
              </span>
              <Popover
                open={isOdometerPopoverOpen}
                onOpenChange={(open) => {
                  setIsOdometerPopoverOpen(open);
                  if (open) setOdometerDraft((vehicle.current_odometer ?? 0).toString());
                }}
              >
                <PopoverTrigger asChild>
                  <Button type="button" size="sm" variant="outline" className="h-7 px-2.5 text-xs font-extrabold text-blue-600 border-blue-200 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950/50">
                    <Edit2 className="w-3 h-3 mr-1" /> Edit
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-56 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl z-[9999]">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">Update Odometer (km)</p>
                  <Input
                    type="number"
                    min={0}
                    value={odometerDraft}
                    onChange={(e) => setOdometerDraft(e.target.value)}
                    placeholder="Odometer (km)"
                    className="h-8 text-xs mb-2 font-mono font-bold"
                    autoFocus
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={!odometerDraft || updateOdometerMutation.isPending}
                    onClick={() => {
                      const value = Number(odometerDraft);
                      if (!Number.isFinite(value) || value < 0) return;
                      updateOdometerMutation.mutate(value);
                    }}
                    className="h-8 w-full text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {updateOdometerMutation.isPending ? 'Saving...' : 'Save Odometer'}
                  </Button>
                </PopoverContent>
              </Popover>
            </div>
            <div className="mt-3 text-xs font-extrabold text-slate-500 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-2.5">
              <span>{vehicle.odometer_updated_at ? `Updated ${formatInDeploymentTz(vehicle.odometer_updated_at, tz, 'dd MMM yyyy')}` : 'Verified Reading'}</span>
              <span className="text-slate-400 font-mono">Live Tracking</span>
            </div>
          </Card>

          {/* Card 2: Asset Net Profit */}
          <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-2xs relative overflow-hidden group hover:border-blue-300 dark:hover:border-blue-700 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">ASSET NET PROFIT</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <DollarSign className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className={cn(
                "text-2xl font-black font-mono",
                (financials?.summary.net_profit ?? 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600"
              )}>
                SAR {(financials?.summary.net_profit ?? 0).toLocaleString()}
              </span>
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-black">
                {(financials?.summary.margin_percent ?? 0)}% Margin
              </Badge>
            </div>
            <div className="mt-3 text-xs font-extrabold text-slate-500 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-2.5">
              <span>{financials?.summary.completed_trips_count ?? 0} Completed Trips</span>
              <button type="button" onClick={(e) => { e.preventDefault(); setActiveTab('financials'); }} className="text-emerald-600 dark:text-emerald-400 hover:underline font-black cursor-pointer">
                P&L Ledger →
              </button>
            </div>
          </Card>

          {/* Card 3: Document Health */}
          <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-2xs relative overflow-hidden group hover:border-blue-300 dark:hover:border-blue-700 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">DOCUMENT VAULT</span>
              <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                <FileCheck className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="text-2xl font-black font-mono text-slate-900 dark:text-slate-100">
                {documents.length} <span className="text-xs font-sans font-extrabold text-slate-500">Files</span>
              </span>
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-black">
                COMPLIANT
              </Badge>
            </div>
            <div className="mt-3 text-xs font-black text-blue-600 dark:text-blue-400 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-2.5">
              <button type="button" onClick={(e) => { e.preventDefault(); setActiveTab('documents'); }} className="hover:underline cursor-pointer">
                Istimara & Insurance Vault →
              </button>
              <span className="text-slate-400 font-mono">Vault Active</span>
            </div>
          </Card>

        </div>

        {/* ── Interactive View Mode Tabs (Seamless Tab Switching Without Page Jump) ──── */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
          <Button
            type="button"
            size="sm"
            variant={activeTab === 'overview' ? 'default' : 'ghost'}
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('overview');
            }}
            className={cn(
              "h-9 text-xs font-bold gap-2 px-4 rounded-xl transition-all cursor-pointer",
              activeTab === 'overview' ? "bg-blue-600 text-white hover:bg-blue-700 shadow-2xs" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            <Car className="w-4 h-4" />
            Overview & Schedule
          </Button>

          <Button
            type="button"
            size="sm"
            variant={activeTab === 'maintenance' ? 'default' : 'ghost'}
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('maintenance');
            }}
            className={cn(
              "h-9 text-xs font-bold gap-2 px-4 rounded-xl transition-all cursor-pointer",
              activeTab === 'maintenance' ? "bg-blue-600 text-white hover:bg-blue-700 shadow-2xs" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            <Wrench className="w-4 h-4" />
            Maintenance Ledger ({maintenanceRecords.length})
          </Button>

          <Button
            type="button"
            size="sm"
            variant={activeTab === 'financials' ? 'default' : 'ghost'}
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('financials');
            }}
            className={cn(
              "h-9 text-xs font-bold gap-2 px-4 rounded-xl transition-all cursor-pointer",
              activeTab === 'financials' ? "bg-blue-600 text-white hover:bg-blue-700 shadow-2xs" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            <DollarSign className="w-4 h-4" />
            P&L Financials
          </Button>

          <Button
            type="button"
            size="sm"
            variant={activeTab === 'documents' ? 'default' : 'ghost'}
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('documents');
            }}
            className={cn(
              "h-9 text-xs font-bold gap-2 px-4 rounded-xl transition-all cursor-pointer",
              activeTab === 'documents' ? "bg-blue-600 text-white hover:bg-blue-700 shadow-2xs" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            <FileText className="w-4 h-4" />
            Document Vault ({documents.length})
          </Button>
        </div>

        {/* ── Tab Content Area ───────────────────────────────────────────── */}

        {/* TAB 1: OVERVIEW & SCHEDULED TRIPS */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

            {/* Scheduled Trip Days Section (Compact organized box without empty white space) */}
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3 flex flex-row items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Calendar className="w-4.5 h-4.5 text-blue-600" /> Scheduled Trip Days
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
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 mb-2 border border-blue-100 dark:border-blue-900">
                      <Calendar className="w-5 h-5" />
                    </div>
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
                  <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                    {upcomingTrips.map((item, idx) => (
                      <div
                        key={idx}
                        className="w-full flex items-center justify-between p-3 rounded-xl border border-blue-100 bg-blue-50/40 dark:bg-blue-950/20 dark:border-blue-900/40 hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer shadow-3xs group"
                        onClick={() => (item.tripId || item.tripRef) && navigate(`/trips/${item.tripId || item.tripRef}`)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                            <Calendar className="w-4 h-4" />
                          </div>
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

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">View All Trips Calendar</span>
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

            {/* Asset Technical Specifications & Financial Preview */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Asset Technical Specifications Card */}
              <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3.5">
                  <CardTitle className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Car className="w-4.5 h-4.5 text-blue-600" /> Asset Technical Specifications & Telematics
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700">
                      <span className="text-[10px] font-extrabold uppercase text-slate-400 block">License Plate</span>
                      <span className="font-mono text-base font-black text-slate-900 dark:text-slate-100 mt-1 block">{vehicle.plate_number}</span>
                    </div>

                    <div className="bg-blue-50/60 dark:bg-blue-950/40 p-3.5 rounded-xl border border-blue-100 dark:border-blue-900/50">
                      <span className="text-[10px] font-extrabold uppercase text-blue-600 dark:text-blue-400 block">Asset Type</span>
                      <span className="font-mono text-base font-black text-blue-700 dark:text-blue-300 mt-1 block">{vehicle.asset_type}</span>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700">
                      <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Payload Capacity</span>
                      <span className="font-mono text-base font-black text-slate-900 dark:text-slate-100 mt-1 block">{capacityTons} Tons</span>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700">
                      <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Trailer Number</span>
                      <span className="font-mono text-sm font-bold text-slate-800 dark:text-slate-200 mt-1 block">{vehicle.trailer_number || 'None'}</span>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700">
                      <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Trailer Type</span>
                      <span className="font-mono text-sm font-bold text-slate-800 dark:text-slate-200 mt-1 block">{vehicle.trailer_type || 'N/A'}</span>
                    </div>

                    <div className="bg-emerald-50/60 dark:bg-emerald-950/40 p-3.5 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
                      <span className="text-[10px] font-extrabold uppercase text-emerald-700 dark:text-emerald-400 block">Telematics Tracker</span>
                      <span className="font-mono text-xs font-black text-emerald-700 dark:text-emerald-300 mt-1 flex items-center gap-1 truncate">
                        <Radio className="w-3.5 h-3.5 shrink-0" /> {vehicle.gps_device_id || 'GPS Active'}
                      </span>
                    </div>

                  </div>
                </CardContent>
              </Card>

              {/* Maintenance Preview */}
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
                ]}
                data={maintenanceRecords.slice(0, 3)}
                compact={true}
                enableSelection={false}
                isLoading={isMaintLoading}
                emptyTitle="No Maintenance Logs"
                emptyMessage="No maintenance records logged for this vehicle yet."
              />

            </div>

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
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" /> Vehicle Documents Vault
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                    {documents.length} {documents.length === 1 ? 'file' : 'files'}
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  {/* View Switcher: Grid vs List */}
                  <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setDocVaultViewMode('grid')}
                      className={cn(
                        "p-1 rounded-md text-xs transition-colors cursor-pointer",
                        docVaultViewMode === 'grid' ? "bg-white dark:bg-slate-900 text-blue-600 shadow-2xs" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                      )}
                      title="Grid View with Image Previews"
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDocVaultViewMode('list')}
                      className={cn(
                        "p-1 rounded-md text-xs transition-colors cursor-pointer",
                        docVaultViewMode === 'list' ? "bg-white dark:bg-slate-900 text-blue-600 shadow-2xs" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                      )}
                      title="List View"
                    >
                      <List className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setIsUploadDocModalOpen(true)}
                    className="h-7 text-xs font-bold border-blue-200 text-blue-600 hover:bg-blue-50 gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Upload
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-4">
                {isDocsLoading ? (
                  <div className="py-8 text-center text-slate-400 animate-pulse text-xs font-semibold">
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
                      type="button"
                      size="sm"
                      onClick={() => setIsUploadDocModalOpen(true)}
                      className="h-8 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white gap-1"
                    >
                      <UploadCloud className="w-3.5 h-3.5" /> Upload First Document
                    </Button>
                  </div>
                ) : docVaultViewMode === 'grid' ? (
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
                                <div className="w-10 h-10 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 flex items-center justify-center shadow-xs">
                                  <FileText className="w-5 h-5 text-rose-600" />
                                </div>
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">PDF Document</span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-1.5 p-3 text-center text-blue-600 dark:text-blue-400">
                                <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900 flex items-center justify-center shadow-xs">
                                  <FileCheck className="w-5 h-5 text-blue-600" />
                                </div>
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
                              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shadow-lg">
                                <Eye className="w-4 h-4 text-white" />
                              </div>
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
                                <Eye className="w-3 h-3" /> View
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
                ) : (
                  /* List Mode */
                  <div className="space-y-2.5">
                    {documents.map((doc: MerconDocument) => {
                      const isImg = isImageFile(doc.file_url, doc.mime_type);
                      const resolvedUrl = resolveFileUrl(doc.file_url);

                      return (
                        <div
                          key={doc.id}
                          className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 group hover:border-blue-200 dark:hover:border-blue-800 transition-all"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              onClick={() => setViewingDoc(doc)}
                              className="w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center shrink-0 overflow-hidden cursor-pointer relative group/thumb"
                            >
                              {isImg ? (
                                <img
                                  src={resolvedUrl}
                                  alt={getDocTypeLabel(doc.doc_type)}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <FileCheck className="w-5 h-5 text-blue-600" />
                              )}
                              <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center text-white">
                                <Eye className="w-3.5 h-3.5" />
                              </div>
                            </div>

                            <div className="min-w-0">
                              <div
                                onClick={() => setViewingDoc(doc)}
                                className="text-xs font-bold text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer truncate"
                              >
                                {getDocTypeLabel(doc.doc_type)}
                              </div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                {doc.expiry_date ? (
                                  <span>Expires: {formatInDeploymentTz(doc.expiry_date, tz, 'MM/dd/yyyy')}</span>
                                ) : (
                                  <span>Uploaded: {formatInDeploymentTz(doc.createdAt, tz, 'MM/dd/yyyy')}</span>
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

                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => setViewingDoc(doc)}
                              className="h-7 text-xs font-bold border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-200 dark:border-slate-700 dark:text-slate-300 dark:hover:text-blue-400 gap-1 px-2.5"
                            >
                              <Eye className="w-3.5 h-3.5" /> View
                            </Button>

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
