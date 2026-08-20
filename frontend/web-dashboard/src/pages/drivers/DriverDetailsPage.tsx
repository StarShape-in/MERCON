import { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Edit2, FileText, MapPin, AlertTriangle,
  Trash2, Truck, IdCard, Plus, AlertCircle, Download, ChevronRight,
  RotateCw, Calendar, Gauge, Weight, CheckCircle2, Clock
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
import { getUpcomingScheduledDates } from '@/utils/scheduleUtils';
import { cn } from '@/lib/utils';
import { useDeploymentTimezone, formatInDeploymentTz } from '@/lib/datetime';

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

  const handleRefresh = async () => {
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
          <div className="h-48 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
          <div className="h-[460px] bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
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
  const assignedVehicle = driver.assignedVehicle;

  return (
    <DashboardLayout active="Drivers" title={`Driver: ${driver.ref_id || 'N/A'}`}>
      <div className="px-4 sm:px-6 pb-6 space-y-4 animate-fade-in max-w-[1400px] mx-auto w-full">

        {/* ── 1. DRIVER PROFILE HERO HEADER CARD ───────────────────────────── */}
        <Card className="p-5 border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm space-y-5">
          {/* Header Row: Navigation & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-4">
            <div className="flex items-center gap-3 min-w-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/drivers')}
                className="h-9 gap-1.5 text-xs font-bold border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 shadow-2xs hover:bg-slate-50"
              >
                <ArrowLeft className="w-4 h-4 text-slate-500" />
                Back
              </Button>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight truncate">
                    {driver.first_name} {driver.last_name}
                  </h1>
                  <span className="text-[11px] font-mono font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200/80 dark:border-slate-700">
                    Driver ID: {driver.ref_id || 'DEV-123'}
                  </span>
                  <StatusBadge status={driver.status} />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="h-9 w-9 p-0 text-slate-600 dark:text-slate-400"
                title="Refresh"
              >
                <RotateCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportDossier}
                className="h-9 gap-1.5 text-xs font-semibold"
              >
                <Download className="w-4 h-4" />
                Export Dossier
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/drivers/${driver.id}/documents`)}
                className="h-9 gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400"
              >
                <FileText className="w-4 h-4" />
                Document Vault
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/drivers/${driver.id}/edit`)}
                className="h-9 gap-1.5 text-xs font-semibold"
              >
                <Edit2 className="w-4 h-4 text-slate-500" />
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
                className="h-9 gap-1.5 text-xs font-bold bg-brand hover:bg-brand-hover text-white shadow-sm px-3.5"
              >
                + New Trip
              </Button>
            </div>
          </div>

          {/* Identity & Information Cards Grid */}
          <div className="flex flex-col lg:flex-row items-start gap-6">
            {/* Driver Photo & Contact */}
            <div className="flex flex-col items-center sm:items-start gap-3 shrink-0">
              <DriverAvatar
                src={driver.avatar_url}
                firstName={driver.first_name}
                lastName={driver.last_name}
                size="lg"
                status={driver.status}
                showStatusDot
                previewable
                onPreview={() => setIsPreviewModalOpen(true)}
              />
              <PhoneDisplay phone={driver.phone_primary} variant="badge" showActions />
            </div>

            {/* Information Cards Grid: Assigned Vehicle & Credentials */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 w-full">
              
              {/* Card 1: ASSIGNED VEHICLE */}
              <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-emerald-600" /> Assigned Vehicle
                  </span>
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
                  <div className="flex items-center gap-2 text-xs text-slate-500 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 px-3 py-4 bg-white dark:bg-slate-900">
                    <Truck className="w-4 h-4 text-slate-400 shrink-0" /> No vehicle currently assigned.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-sm font-black text-slate-900 dark:text-slate-100 tracking-wide flex items-center gap-1.5">
                        Vehicle: {assignedVehicle.plate_number}
                        {assignedVehicle.deletedAt && <DeletedBadge />}
                      </span>
                      <StatusBadge status={assignedVehicle.status} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-2.5">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Asset Type</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{assignedVehicle.asset_type || 'N/A'}</span>
                      </div>
                      <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-2.5">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Odometer</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {assignedVehicle.current_odometer != null ? `${assignedVehicle.current_odometer.toLocaleString()} KM` : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Card 2: VEHICLE / DOCUMENT INFO */}
              <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <IdCard className="w-4 h-4 text-brand" /> Vehicle / Document Info
                  </span>
                  <button
                    onClick={() => navigate(`/drivers/${driver.id}/documents`)}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5"
                  >
                    Vault <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-2.5">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">License / ID</span>
                    <span className="font-mono font-extrabold text-slate-900 dark:text-slate-100">
                      {driver.license_number || 'XXXXXXXX'}
                    </span>
                  </div>
                  <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-2.5">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Expiry</span>
                    <span className={cn('font-mono font-extrabold', isLicenseExpired ? 'text-rose-600' : isLicenseExpiringSoon ? 'text-amber-600' : 'text-slate-900 dark:text-slate-100')}>
                      {driver.license_expiry ? formatInDeploymentTz(driver.license_expiry, tz, 'dd MMM yyyy') : 'N/A'}
                    </span>
                  </div>
                  <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-2.5">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Status</span>
                    <span className={cn('font-bold flex items-center gap-1.5', isLicenseExpired ? 'text-rose-600' : 'text-emerald-600 dark:text-emerald-400')}>
                      <span className={cn('w-2 h-2 rounded-full', isLicenseExpired ? 'bg-rose-500' : 'bg-emerald-500')} />
                      {isLicenseExpired ? 'Expired' : 'Valid'}
                    </span>
                  </div>
                  <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-2.5">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Registered</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {formatInDeploymentTz(driver.createdAt, tz, 'dd MMM yyyy')}
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </Card>

        {/* ── 2. LICENSE ALERT ────────────────────────────────────────────── */}
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
                  'text-xs font-extrabold',
                  isLicenseExpired ? 'text-rose-900 dark:text-rose-200' : 'text-amber-900 dark:text-amber-200'
                )}>
                  {isLicenseExpired ? 'Driving license has expired' : `Driving license expires in ${daysUntilExpiry} days`}
                </h4>
                <p className={cn('text-[11px] mt-0.5', isLicenseExpired ? 'text-rose-700 dark:text-rose-400' : 'text-amber-700 dark:text-amber-400')}>
                  {driver.license_number ? `License ${driver.license_number} · ` : ''}
                  Valid until {driver.license_expiry ? formatInDeploymentTz(driver.license_expiry, tz, 'MM/dd/yyyy') : 'N/A'}. Renew and upload the new copy to the document vault.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => navigate(`/drivers/${driver.id}/documents`)}
              className={cn(
                'h-8 px-3 gap-1.5 text-xs font-bold text-white shadow-xs shrink-0',
                isLicenseExpired ? 'bg-rose-600 hover:bg-rose-700' : 'bg-amber-600 hover:bg-amber-700'
              )}
            >
              <FileText className="w-3.5 h-3.5" />
              Update Documents
            </Button>
          </div>
        )}

        {/* ── 3. TRIPS OPERATIONS (Real Screen Component) ─────────────────── */}
        <div>
          <DriverTripOperations
            driverId={driver.id}
            driverName={`${driver.first_name} ${driver.last_name}`}
            trips={driver.trips || []}
          />
        </div>

      </div>

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
