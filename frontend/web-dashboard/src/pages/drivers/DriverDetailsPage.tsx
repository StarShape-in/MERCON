import { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Edit2, FileText, Phone, MapPin, AlertTriangle,
  Eye, Trash2, Truck, ShieldCheck, User, IdCard,
  Plus, AlertCircle, Download, ChevronRight,
  RotateCw, Calendar, Gauge, Weight, CheckCircle2, Clock, X
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import DeletedBadge from '@/components/ui/DeletedBadge';
import { driverService } from '@/services/driverService';
import { documentService } from '@/services/documentService';
import { exportExcelTable } from '@/utils/exportUtils';
import DriverAvatar from '@/components/ui/DriverAvatar';
import PhoneDisplay from '@/components/ui/PhoneDisplay';
import DriverPreviewModal from '@/components/drivers/DriverPreviewModal';
import DocumentPreviewSheet from '@/components/documents/DocumentPreviewSheet';
import DriverTripOperations from '@/components/drivers/DriverTripOperations';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useDeploymentTimezone, formatInDeploymentTz } from '@/lib/datetime';

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-slate-100 dark:border-slate-800/80 last:border-0">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">{label}</span>
      <span className="text-xs min-w-0 text-right">{children}</span>
    </div>
  );
}

export default function DriverDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const tz = useDeploymentTimezone();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
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

  const { data: docsRes, isLoading: isLoadingDocs } = useQuery({
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

  const refreshDriver = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['driver', id] });
    await queryClient.invalidateQueries({ queryKey: ['documents', 'Driver', id] });
    setTimeout(() => setIsRefreshing(false), 500);
  };

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
        <div className="px-4 sm:px-6 pb-6 max-w-[1400px] mx-auto w-full space-y-4 animate-pulse">
          <div className="h-36 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-[280px] bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
            <div className="h-[280px] bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
            <div className="h-[280px] bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
          </div>
          <div className="h-[400px] bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !driver) {
    return (
      <DashboardLayout active="Drivers" title="Driver Details">
        <div className="px-4 sm:px-6 pb-6 max-w-[1400px] mx-auto w-full flex flex-col items-center justify-center text-center h-[60vh] gap-3">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center border border-rose-200 dark:border-rose-900/50 shadow-sm">
            <AlertTriangle size={32} />
          </div>
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
  const daysUntilExpiry = driver.license_expiry ? Math.ceil((new Date(driver.license_expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
  const isLicenseExpiringSoon = !isLicenseExpired && daysUntilExpiry != null && daysUntilExpiry <= 30;
  const trips = driver.trips || [];
  const completedTripsCount = trips.filter(t => t.status === 'Completed').length;
  const totalTripsCount = trips.length;
  const assignedVehicle = driver.assignedVehicle;

  const getDocStatusBadge = (status: string) => {
    switch (status) {
      case 'Verified':
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800 text-[10px] font-bold">VERIFIED</Badge>;
      case 'Rejected':
        return <Badge className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800 text-[10px] font-bold">REJECTED</Badge>;
      case 'Expired':
        return <Badge className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800 text-[10px] font-bold">EXPIRED</Badge>;
      default:
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800 text-[10px] font-bold">PENDING</Badge>;
    }
  };

  return (
    <DashboardLayout active="Drivers" title={`${driver.first_name} ${driver.last_name}`}>
      <div className="pt-2 sm:pt-4 px-4 sm:px-6 pb-6 w-full flex flex-col gap-6 animate-fade-in max-w-[1400px] mx-auto">
        
        {/* ── 1. TOP HEADER BAR: Horizontal Driver Avatar Photo + Driver Name & Tags Placed Directly Under Name ── */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-2 border-b border-slate-200/80 dark:border-slate-800">
          
          {/* Left: Horizontal Photo Avatar + Driver Name with Tags Underneath (Identical to Customer Details layout) */}
          <div className="flex items-start gap-4 min-w-0">
            
            {/* Standalone Profile Photo Avatar */}
            <DriverAvatar
              src={driver.avatar_url}
              firstName={driver.first_name}
              lastName={driver.last_name}
              size="2xl"
              status={driver.status}
              showStatusDot
              previewable
              className="[&>img]:w-24 [&>img]:h-24 [&>div]:w-24 [&>div]:h-24 [&>div]:text-3xl w-24 h-24 sm:[&>img]:w-28 sm:[&>img]:h-28 sm:[&>div]:w-28 sm:[&>div]:h-28 sm:w-28 sm:h-28 shrink-0 shadow-2xs cursor-pointer hover:opacity-90 transition-opacity mt-0.5"
              onPreview={() => setIsPhotoFullViewOpen(true)}
            />

            {/* Driver Name + Badges & Details Directly Under Name */}
            <div className="flex flex-col min-w-0">
              <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-black text-slate-900 dark:text-slate-100 tracking-tight leading-none">
                {driver.first_name} {driver.last_name}
              </h1>

              {/* Badges & Tags Under the Name */}
              <div className="flex flex-col gap-2 mt-2.5">
                {/* Status & ID Tags Row */}
                <div className="flex items-center gap-2 flex-wrap">
                  <StatusBadge status={driver.status} />
                  <span className="text-xs font-mono font-extrabold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-slate-700">
                    ID: {driver.ref_id || 'DRV-123'}
                  </span>
                  {!driver.isActive && <DeletedBadge />}
                </div>

                {/* Contact Phone Details Directly Under the Tags (Clean Decent Design without Capsule Box) */}
                <div className="flex items-center gap-2 mt-0.5 pt-0.5">
                  <Phone className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <PhoneDisplay
                    phone={driver.phone_primary}
                    variant="inline"
                    showActions
                    className="text-sm font-mono font-extrabold text-slate-900 dark:text-slate-100 tracking-tight"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshDriver}
              disabled={isRefreshing}
              className="h-9 w-9 p-0 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 shadow-2xs"
              title="Refresh Profile Data"
            >
              <RotateCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin text-brand")} />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportDossier}
              className="h-9 gap-1.5 text-xs font-semibold"
              title="Export Driver Dossier"
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/drivers/${driver.id}/documents`)}
              className="h-9 gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400"
              title="Document Vault"
            >
              <FileText className="w-4 h-4" />
              Vault
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/drivers/${driver.id}/edit`)}
              className="h-9 gap-1.5 text-xs font-semibold"
            >
              <Edit2 className="w-3.5 h-3.5 text-slate-500" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteModalOpen(true)}
              className="h-9 w-9 p-0 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
              title="Delete Driver"
            >
              <Trash2 className="w-4 h-4" />
            </Button>

            <Button
              size="sm"
              onClick={() => navigate(`/trips/new?driverId=${driver.id}`)}
              className="h-9 gap-1.5 text-xs font-bold bg-brand hover:bg-brand-hover text-white shadow-sm rounded-lg px-4"
            >
              <Plus className="w-4 h-4" />
              New Trip
            </Button>
          </div>
        </div>

        {/* ── 2. OVERVIEW INSTRUMENT-TILE STAT BLOCKS (3 Columns) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 w-full">
          
          {/* Overview 1: Assigned Vehicle */}
          <div className="px-4 py-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-1 shadow-2xs">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-emerald-600" /> Assigned Vehicle
            </div>
            <div className="font-mono text-base font-black text-slate-900 dark:text-slate-100 truncate leading-tight">
              {assignedVehicle ? assignedVehicle.plate_number : 'Unassigned'}
            </div>
            <div className="text-[10px] font-medium text-slate-500 truncate">
              {assignedVehicle ? assignedVehicle.asset_type || 'Vehicle Asset' : 'No truck linked'}
            </div>
          </div>

          {/* Overview 2: Document Expiry */}
          <div className="px-4 py-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-1 shadow-2xs">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" /> Document Expiry
            </div>
            <div className={cn(
              'font-mono text-base font-black truncate leading-tight',
              isLicenseExpired ? 'text-rose-600' : isLicenseExpiringSoon ? 'text-amber-600' : 'text-slate-900 dark:text-slate-100'
            )}>
              {isLicenseExpired ? 'Expired' : daysUntilExpiry != null ? `${daysUntilExpiry} days left` : 'N/A'}
            </div>
            <div className="text-[10px] font-medium text-slate-500 truncate">
              {driver.license_expiry ? formatInDeploymentTz(driver.license_expiry, tz, 'dd MMM yyyy') : 'No expiry set'}
            </div>
          </div>

          {/* Overview 3: Dispatch Trips */}
          <div className="px-4 py-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-1 shadow-2xs">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-brand" /> Dispatch Trips
            </div>
            <div className="font-mono text-base font-black text-slate-900 dark:text-slate-100 truncate leading-tight">
              {completedTripsCount} / {totalTripsCount}
            </div>
            <div className="text-[10px] font-medium text-slate-500 truncate">
              Completed Dispatches
            </div>
          </div>

        </div>

        {/* ── 3. LICENSE COMPLIANCE ALERT (only when expired/expiring) ────────────── */}
        {(isLicenseExpired || isLicenseExpiringSoon) && (
          <div className={cn(
            'flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border p-3.5 shadow-2xs',
            isLicenseExpired
              ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60'
              : 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60'
          )}>
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                isLicenseExpired ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-600' : 'bg-amber-100 dark:bg-amber-900/60 text-amber-600'
              )}>
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h4 className={cn(
                  'text-xs font-bold',
                  isLicenseExpired ? 'text-rose-900 dark:text-rose-200' : 'text-amber-900 dark:text-amber-200'
                )}>
                  {isLicenseExpired ? 'Driver License Expired' : 'Driver License Expiring Soon'}
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                  License #{driver.license_number || 'N/A'} {isLicenseExpired ? 'expired on' : 'expires on'} {driver.license_expiry ? formatInDeploymentTz(driver.license_expiry, tz, 'dd MMM yyyy') : 'N/A'}. Please update compliance records.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate(`/drivers/${driver.id}/edit`)}
              className="h-8 text-xs font-bold shrink-0 bg-white dark:bg-slate-900 shadow-2xs"
            >
              Update License
            </Button>
          </div>
        )}

        {/* ── 4. DRIVER CREDENTIALS & COMMERCIAL COMPLIANCE (3 PROMINENT CARD BOXES) ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
          
          {/* Box 1: Driver Credentials */}
          <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-brand" /> Driver Credentials
                </h3>
                <StatusBadge status={driver.status} />
              </div>
              <div className="space-y-1.5">
                <InfoRow label="Duty Status">
                  <span className="font-bold text-slate-900 dark:text-slate-100">{driver.status}</span>
                </InfoRow>
                <InfoRow label="License Number">
                  <span className="font-mono font-extrabold text-slate-900 dark:text-slate-100">
                    {driver.license_number || 'N/A'}
                  </span>
                </InfoRow>
                <InfoRow label="License Expiry">
                  <span className={cn('font-mono font-bold', isLicenseExpired ? 'text-rose-600' : isLicenseExpiringSoon ? 'text-amber-600' : 'text-slate-900 dark:text-slate-100')}>
                    {driver.license_expiry ? formatInDeploymentTz(driver.license_expiry, tz, 'dd MMM yyyy') : 'N/A'}
                  </span>
                </InfoRow>
                <InfoRow label="Registration Date">
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {formatInDeploymentTz(driver.createdAt, tz, 'dd MMM yyyy')}
                  </span>
                </InfoRow>
              </div>
            </div>
          </Card>

          {/* Box 2: Assigned Vehicle Details */}
          <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-emerald-600" /> Vehicle Details
                </h3>
                {assignedVehicle && (
                  <button
                    onClick={() => navigate(`/vehicles/${assignedVehicle.id}`)}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5"
                  >
                    Open Details <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {!assignedVehicle ? (
                <div className="flex items-center gap-2 text-xs text-slate-500 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 p-4 mt-2">
                  <Truck className="w-4 h-4 text-slate-400 shrink-0" /> No vehicle currently assigned.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-base font-black text-slate-900 dark:text-slate-100 tracking-wide flex items-center gap-1.5">
                      {assignedVehicle.plate_number}
                      {assignedVehicle.deletedAt && <DeletedBadge />}
                    </span>
                    <StatusBadge status={assignedVehicle.status} />
                  </div>
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 p-3">
                      <span className="text-[9px] font-bold uppercase text-slate-400 flex items-center gap-1">
                        <Gauge className="w-3 h-3" /> Odometer
                      </span>
                      <div className="font-mono text-xs font-extrabold text-slate-900 dark:text-slate-100 mt-1">
                        {assignedVehicle.current_odometer != null ? `${assignedVehicle.current_odometer.toLocaleString()} KM` : 'N/A'}
                      </div>
                    </div>
                    <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 p-3">
                      <span className="text-[9px] font-bold uppercase text-slate-400 flex items-center gap-1">
                        <Weight className="w-3 h-3" /> Capacity
                      </span>
                      <div className="font-mono text-xs font-extrabold text-slate-900 dark:text-slate-100 mt-1">
                        {assignedVehicle.capacity_kg != null ? `${assignedVehicle.capacity_kg.toLocaleString()} KG` : 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Box 3: Compliance Documents Vault */}
          <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" /> Documents Vault
                  {documents.length > 0 && (
                    <span className="rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 text-[10px] font-bold">
                      {documents.length}
                    </span>
                  )}
                </h3>
                <button
                  onClick={() => navigate(`/drivers/${driver.id}/documents`)}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5"
                >
                  Vault <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {isLoadingDocs ? (
                <div className="space-y-2 animate-pulse mt-2">
                  {[1, 2].map(i => <div key={i} className="h-10 rounded-lg bg-slate-100 dark:bg-slate-800" />)}
                </div>
              ) : documents.length === 0 ? (
                <div className="flex items-center justify-between gap-2 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 p-4 mt-2">
                  <span className="text-xs text-slate-500">No documents uploaded.</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/drivers/${driver.id}/documents`)}
                    className="h-7 text-[11px] font-bold shrink-0"
                  >
                    Upload
                  </Button>
                </div>
              ) : (
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-0.5">
                  {documents.map((doc) => {
                    const isExpired = doc.expiry_date && new Date(doc.expiry_date) < new Date();
                    return (
                      <div
                        key={doc.id}
                        onClick={() => setSelectedDocIdForPreview(doc.id)}
                        className="flex items-center justify-between gap-2 py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 cursor-pointer transition-colors group"
                        title="Click to preview document details & OCR metadata"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={cn(
                            'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                            isExpired ? 'bg-rose-500/10 text-rose-600' : 'bg-indigo-500/10 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white'
                          )}>
                            {isExpired ? <AlertCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          </span>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate">{doc.doc_type}</div>
                          </div>
                        </div>
                        {getDocStatusBadge(isExpired ? 'Expired' : doc.status)}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>

        </div>

        {/* ── 5. DRIVER TRIP OPERATIONS (Active & Scheduled / Dispatch History) ── */}
        <div>
          <DriverTripOperations
            driverId={driver.id}
            driverName={`${driver.first_name} ${driver.last_name}`}
            trips={driver.trips || []}
          />
        </div>

      </div>

      {/* ── FULL-SCREEN PHOTO LIGHTBOX MODAL ─────────────────────────────── */}
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

      {/* ── DELETE DRIVER CONFIRMATION MODAL ────────────────────────────── */}
      <Dialog open={isDeleteModalOpen} onOpenChange={(open) => !open && setIsDeleteModalOpen(false)}>
        <DialogContent className="max-w-md rounded-2xl p-0 overflow-hidden border-slate-200 dark:border-slate-800">
          <DialogHeader className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-rose-50/50 dark:bg-rose-950/20">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
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

      {/* ── DRIVER PROFILE PREVIEW & DOCUMENT PREVIEW MODALS ── */}
      <DriverPreviewModal
        driver={driver}
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
      />

      <DocumentPreviewSheet
        documentId={selectedDocIdForPreview}
        onClose={() => setSelectedDocIdForPreview(null)}
      />

    </DashboardLayout>
  );
}
