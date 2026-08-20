import { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Edit2, FileText, Phone, MapPin, AlertTriangle,
  Eye, Trash2, Truck, ShieldCheck, User, IdCard,
  Plus, AlertCircle, Download, ChevronRight,
  RotateCw, Calendar, Gauge, Weight, CheckCircle2, Clock
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import DeletedBadge from '@/components/ui/DeletedBadge';
import { driverService } from '@/services/driverService';
import { documentService } from '@/services/documentService';
import { resolveFileUrl } from '@/lib/documents';
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
import { getUpcomingScheduledDates } from '@/utils/scheduleUtils';
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

  // Full-view photo lightbox modal state
  const [isPhotoFullViewOpen, setIsPhotoFullViewOpen] = useState(false);
  const [selectedDocIdForPreview, setSelectedDocIdForPreview] = useState<string | null>(null);

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

  const refreshDriver = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['driver', id] });
    await queryClient.invalidateQueries({ queryKey: ['documents', 'Driver', id] });
    setTimeout(() => setIsRefreshing(false), 400);
  };

  const deleteMutation = useMutation({
    mutationFn: () => driverService.delete(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['driver-stats'] });
      navigate('/drivers');
    },
    onError: (err: any) => {
      setDeleteError(err.response?.data?.error?.message || 'Failed to delete driver. Please check your admin password.');
    },
  });

  const handleDeleteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError('');
    if (!password) {
      setDeleteError('Admin password is required to delete a driver.');
      return;
    }
    deleteMutation.mutate();
  };

  const daysUntilExpiry = useMemo(() => {
    if (!driver?.license_expiry) return null;
    const expiry = new Date(driver.license_expiry);
    const now = new Date();
    const diffMs = expiry.getTime() - now.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }, [driver?.license_expiry]);

  const isLicenseExpired = daysUntilExpiry !== null && daysUntilExpiry < 0;
  const isLicenseExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry >= 0 && daysUntilExpiry <= 30;

  if (isLoading) {
    return (
      <DashboardLayout active="Drivers" title="Driver Details">
        <div className="px-4 sm:px-6 pb-6 w-full flex flex-col gap-6 animate-pulse">
          <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl w-1/4"></div>
          <div className="h-44 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
          <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !driver) {
    return (
      <DashboardLayout active="Drivers" title="Driver Details">
        <div className="px-4 sm:px-6 pb-6 w-full flex flex-col items-center justify-center text-center h-[60vh] gap-3">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">Driver Profile Not Found</h2>
          <p className="text-xs text-slate-500 max-w-md">
            The requested driver asset does not exist or may have been archived.
          </p>
          <Button onClick={() => navigate('/drivers')} size="sm" className="mt-2 text-xs font-bold bg-brand text-white">
            Return to Driver Roster
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const assignedVehicle = driver.assignedVehicle;
  const trips = driver.trips || [];
  const completedTripsCount = trips.filter(t => t.status === 'Completed').length;
  const totalTripsCount = trips.length;

  return (
    <DashboardLayout active="Drivers" title={`${driver.first_name} ${driver.last_name}`}>
      <div className="pt-8 sm:pt-10 px-4 sm:px-6 pb-6 w-full flex flex-col gap-6 animate-fade-in">
        
        {/* ── 1. TOP HEADER NAVIGATION & ACTIONS (No Outer Box) ───────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/drivers')}
              className="h-9 w-9 p-0 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-indigo-600 shadow-2xs shrink-0"
              title="Back to Drivers"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs font-bold text-slate-500">Driver Profile Ledger</span>
            {!driver.isActive && <DeletedBadge className="ml-1" />}
          </div>

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

        {/* ── 2. IDENTITY & OVERVIEW SECTION (No Outer Box) ───────────────────────── */}
        <div className="flex flex-col sm:flex-row items-start gap-6 pt-1">
          
          {/* Left: Compact Driver Avatar (w-24 h-24 / 96px) with Driver ID and Phone Aligned Under Photo */}
          <div className="flex flex-col items-center sm:items-start gap-1.5 shrink-0">
            <DriverAvatar
              src={driver.avatar_url}
              firstName={driver.first_name}
              lastName={driver.last_name}
              size="xl"
              status={driver.status}
              showStatusDot
              previewable
              className="[&>img]:w-24 [&>img]:h-24 [&>div]:w-24 [&>div]:h-24 [&>div]:text-2xl w-24 h-24 shrink-0 shadow-2xs cursor-pointer hover:opacity-90 transition-opacity"
              onPreview={() => setIsPhotoFullViewOpen(true)}
            />
            <div className="flex flex-col items-center sm:items-start space-y-0.5 pt-0.5">
              <span className="font-mono text-[11px] font-black text-slate-700 dark:text-slate-300">
                ID: {driver.ref_id || 'DRV-123'}
              </span>
              <PhoneDisplay phone={driver.phone_primary} variant="inline" showActions />
            </div>
          </div>

          {/* Right: Driver Name (Right Above Overview Stat Blocks) + 3 Small Overview Stat Cards */}
          <div className="flex-1 min-w-0 flex flex-col justify-between space-y-3 w-full">
            
            {/* Driver Name & Badges Directly Above 3 Small Cards */}
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-none">
                {driver.first_name} {driver.last_name}
              </h1>

              {/* Module & Duty Status Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800 font-extrabold text-xs px-2.5 py-0.5 gap-1.5 shadow-2xs">
                  <User className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Drivers Module
                </Badge>
                <StatusBadge status={driver.status} />
              </div>
            </div>

            {/* 3 Thinner Instrument-Tile Overview Stat Blocks */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 w-full">
              
              {/* Thinner Overview 1: Assigned Vehicle */}
              <div className="px-3.5 py-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-0.5 shadow-2xs">
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

              {/* Thinner Overview 2: Document Expiry */}
              <div className="px-3.5 py-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-0.5 shadow-2xs">
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

              {/* Thinner Overview 3: Dispatch Trips */}
              <div className="px-3.5 py-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-0.5 shadow-2xs">
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

        {/* ── 4. TECHNICAL SPECIFICATIONS & COMPLIANCE DATA GRID ─────────────── */}
        <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs overflow-hidden">
          <div className="px-4 py-3 bg-slate-50/70 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <IdCard className="w-4 h-4 text-indigo-600" />
              Driver Credentials & Commercial Compliance
            </span>
            <span className="text-[10px] font-mono text-slate-400">UUID: {driver.id.slice(0, 8)}...</span>
          </div>

          <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Column 1: Identity & Contact Details */}
            <div className="space-y-1">
              <h5 className="text-[11px] font-black uppercase text-indigo-600 dark:text-indigo-400 pb-1 border-b border-indigo-100 dark:border-indigo-950">
                Identity & Contact
              </h5>
              <InfoRow label="Full Name">
                <span className="font-bold text-slate-900 dark:text-slate-100">{driver.first_name} {driver.last_name}</span>
              </InfoRow>
              <InfoRow label="System Ref ID">
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{driver.ref_id || 'N/A'}</span>
              </InfoRow>
              <InfoRow label="Primary Phone">
                <PhoneDisplay phone={driver.phone_primary} variant="inline" showActions />
              </InfoRow>
              <InfoRow label="Duty Status">
                <StatusBadge status={driver.status} />
              </InfoRow>
            </div>

            {/* Column 2: Commercial License */}
            <div className="space-y-1">
              <h5 className="text-[11px] font-black uppercase text-indigo-600 dark:text-indigo-400 pb-1 border-b border-indigo-100 dark:border-indigo-950">
                Commercial License & Risk
              </h5>
              <InfoRow label="License Number">
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{driver.license_number || 'N/A'}</span>
              </InfoRow>
              <InfoRow label="License Expiry">
                <span className={cn('font-mono font-bold', isLicenseExpired ? 'text-rose-600' : 'text-slate-900 dark:text-slate-100')}>
                  {driver.license_expiry ? formatInDeploymentTz(driver.license_expiry, tz, 'dd MMM yyyy') : 'N/A'}
                </span>
              </InfoRow>
              <InfoRow label="AI Safety Risk Score">
                <div className="flex items-center justify-end gap-1.5">
                  <Badge variant="outline" className="text-[10px] font-mono font-bold bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {driver.ai_risk_score ?? 0} pts
                  </Badge>
                </div>
              </InfoRow>
              <InfoRow label="Active Status">
                <Badge className={driver.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}>
                  {driver.isActive ? 'Active Profile' : 'Archived'}
                </Badge>
              </InfoRow>
            </div>

            {/* Column 3: Linked Asset & Telematics */}
            <div className="space-y-1">
              <h5 className="text-[11px] font-black uppercase text-indigo-600 dark:text-indigo-400 pb-1 border-b border-indigo-100 dark:border-indigo-950">
                Assigned Vehicle Asset
              </h5>
              <InfoRow label="Assigned Vehicle">
                {assignedVehicle ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/vehicles/${assignedVehicle.id}`)}
                    className="h-6 p-0 font-mono font-extrabold text-blue-600 hover:underline gap-1"
                  >
                    <span>{assignedVehicle.plate_number}</span>
                    <ChevronRight className="w-3 h-3" />
                  </Button>
                ) : (
                  <span className="text-slate-400 font-medium italic">None assigned</span>
                )}
              </InfoRow>
              <InfoRow label="Vehicle Asset Type">
                <span className="font-semibold text-slate-700 dark:text-slate-300">{assignedVehicle?.asset_type || 'N/A'}</span>
              </InfoRow>
              <InfoRow label="Created Date">
                <span className="font-mono text-slate-600 dark:text-slate-400">
                  {driver.createdAt ? formatInDeploymentTz(driver.createdAt, tz, 'dd MMM yyyy') : 'N/A'}
                </span>
              </InfoRow>
              <InfoRow label="Last Updated">
                <span className="font-mono text-slate-600 dark:text-slate-400">
                  {(driver as any).updatedAt ? formatInDeploymentTz((driver as any).updatedAt, tz, 'dd MMM yyyy') : 'N/A'}
                </span>
              </InfoRow>
            </div>

          </div>
        </Card>

        {/* ── 5. DRIVER TRIP OPERATIONS & DISPATCH CALENDAR ────────────────── */}
        <DriverTripOperations driverId={driver.id} driverName={`${driver.first_name} ${driver.last_name}`} trips={driver.trips as any || []} />

      </div>

      {/* ── DELETE DRIVER CONFIRMATION MODAL ─────────────────────────── */}
      <Dialog open={isDeleteModalOpen} onOpenChange={(open) => !open && setIsDeleteModalOpen(false)}>
        <DialogContent className="max-w-md rounded-2xl p-0 overflow-hidden border-slate-200 dark:border-slate-800">
          <DialogHeader className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-rose-50/50 dark:bg-rose-950/20">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <DialogTitle className="text-base font-extrabold">Delete Driver Profile</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500 mt-1">
              Deleting driver <strong className="text-slate-900 dark:text-slate-100">{driver.first_name} {driver.last_name}</strong> will remove them from active dispatch rosters.
              {driverUsage && (
                driverUsage.totalTrips > 0 ? (
                  <>
                    {' '}This driver has {driverUsage.totalTrips} trip{driverUsage.totalTrips === 1 ? '' : 's'}
                    {driverUsage.activeTrips > 0 ? ` (${driverUsage.activeTrips} active)` : ''} linked.
                    They will be archived, not erased — those records will keep showing their name marked as Deleted.
                  </>
                ) : ' This driver has no linked trips.'
              )}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleDeleteSubmit}>
            <div className="px-6 py-4 space-y-4">
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

      {/* ── FULL-VIEW DRIVER PHOTO LIGHTBOX MODAL ── */}
      <Dialog open={isPhotoFullViewOpen} onOpenChange={setIsPhotoFullViewOpen}>
        <DialogContent className="max-w-2xl bg-slate-950/95 border-slate-800 text-white p-0 overflow-hidden shadow-2xl rounded-2xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-400" />
              <span className="font-extrabold text-sm text-slate-100">
                {driver.first_name} {driver.last_name} — Profile Photo
              </span>
            </div>
            <div className="flex items-center gap-2">
              {driver.avatar_url && (
                <a
                  href={resolveFileUrl(driver.avatar_url)}
                  download
                  target="_blank"
                  rel="noreferrer"
                  className="h-8 px-3 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-bold flex items-center gap-1.5 text-slate-200 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Download Photo
                </a>
              )}
            </div>
          </div>
          <div className="p-6 flex flex-col items-center justify-center min-h-[320px] bg-slate-950">
            {driver.avatar_url ? (
              <img
                src={resolveFileUrl(driver.avatar_url)}
                alt={`${driver.first_name} ${driver.last_name}`}
                className="max-h-[70vh] max-w-full object-contain rounded-xl shadow-2xl border border-slate-800"
              />
            ) : (
              <div className="w-48 h-48 rounded-full bg-emerald-950/60 border-2 border-emerald-500/40 text-emerald-400 flex items-center justify-center text-6xl font-black shadow-2xl">
                {driver.first_name?.[0]}{driver.last_name?.[0]}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <DocumentPreviewSheet
        documentId={selectedDocIdForPreview}
        onClose={() => setSelectedDocIdForPreview(null)}
      />

    </DashboardLayout>
  );
}
