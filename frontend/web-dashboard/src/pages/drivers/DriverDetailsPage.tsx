import { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Edit2, FileText, AlertTriangle,
  Eye, Trash2, Truck, ShieldCheck, User, IdCard,
  AlertCircle, Download, ChevronRight,
  Calendar, Gauge, Weight, CheckCircle2, Clock, MapPin,
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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { getUpcomingScheduledDates } from '@/utils/scheduleUtils';
import { cn } from '@/lib/utils';
import { useDeploymentTimezone, formatInDeploymentTz } from '@/lib/datetime';

/* ─── Sub-components ──────────────────────────────────────────────────────── */

/** Vertical KPI tile used in the sidebar */
function SideKpi({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone: 'emerald' | 'blue' | 'amber' | 'rose' | 'indigo' | 'brand';
}) {
  const bg = {
    brand:   'bg-brand/8 text-brand border-brand/15',
    emerald: 'bg-emerald-500/8 text-emerald-600 border-emerald-200/60 dark:border-emerald-800/40',
    blue:    'bg-blue-500/8 text-blue-600 border-blue-200/60 dark:border-blue-800/40',
    amber:   'bg-amber-500/8 text-amber-600 border-amber-200/60 dark:border-amber-800/40',
    rose:    'bg-rose-500/8 text-rose-600 border-rose-200/60 dark:border-rose-800/40',
    indigo:  'bg-indigo-500/8 text-indigo-600 border-indigo-200/60 dark:border-indigo-800/40',
  } as const;

  const iconBg = {
    brand:   'bg-brand/10 text-brand',
    emerald: 'bg-emerald-500/10 text-emerald-600',
    blue:    'bg-blue-500/10 text-blue-600',
    amber:   'bg-amber-500/10 text-amber-600',
    rose:    'bg-rose-500/10 text-rose-600',
    indigo:  'bg-indigo-500/10 text-indigo-600',
  } as const;

  return (
    <div className={cn('rounded-xl border p-3 flex items-center gap-3', bg[tone])}>
      <span className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', iconBg[tone])}>
        <Icon className="w-4 h-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-0.5">{label}</div>
        <div className="text-sm font-black text-slate-900 dark:text-slate-100 truncate leading-tight">{value}</div>
        {hint && <div className="text-[10px] opacity-60 truncate mt-0.5">{hint}</div>}
      </div>
    </div>
  );
}

/** Slim label / value row used in credential & vehicle blocks */
function DataRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 py-2 border-b border-slate-100 dark:border-slate-800/70 last:border-0">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">{label}</span>
      <span className="text-xs text-right min-w-0">{children}</span>
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────────────────────── */
export default function DriverDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate  = useNavigate();
  const queryClient = useQueryClient();
  const tz = useDeploymentTimezone();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [password, setPassword]   = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [selectedDocIdForPreview, setSelectedDocIdForPreview] = useState<string | null>(null);

  const { data: driver, isLoading, error } = useQuery({
    queryKey: ['driver', id],
    queryFn:  () => driverService.getById(id!),
    enabled:  !!id,
  });

  useEffect(() => {
    if (driver && driver.id && id !== driver.id) {
      navigate(`/drivers/${driver.id}`, { replace: true });
    }
  }, [driver?.id, id, navigate]);

  const { data: docsRes, isLoading: isLoadingDocs } = useQuery({
    queryKey: ['documents', 'Driver', id],
    queryFn:  () => documentService.getAll({ entity_type: 'Driver', entity_id: id, per_page: 50 }),
    enabled:  !!id,
  });
  const documents = docsRes?.data || [];

  const { data: driverUsage } = useQuery({
    queryKey: ['driver-usage', id],
    queryFn:  () => driverService.getUsage(id!),
    enabled:  !!id && isDeleteModalOpen,
  });

  const scheduledDates = useMemo(() => getUpcomingScheduledDates(driver?.trips), [driver?.trips]);

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
    if (!password) { setDeleteError('Admin password is required.'); return; }
    deleteMutation.mutate(password);
  };

  const handleExportDossier = async () => {
    if (!driver) return;
    const headers = ['Field', 'Details'];
    const rows = [
      ['Driver Ref ID',      driver.ref_id || driver.id],
      ['Full Name',          `${driver.first_name} ${driver.last_name}`],
      ['Primary Phone',      driver.phone_primary || 'N/A'],
      ['Duty Status',        driver.status],
      ['License Number',     driver.license_number || 'N/A'],
      ['License Expiry',     driver.license_expiry ? formatInDeploymentTz(driver.license_expiry, tz, 'dd/MM/yyyy') : 'N/A'],
      ['Assigned Vehicle',   driver.assignedVehicle?.plate_number || 'Unassigned'],
      ['Total Dispatch Trips', `${driver.trips?.length || 0}`],
    ];
    await exportExcelTable(
      `Driver Dossier - ${driver.first_name} ${driver.last_name}`,
      headers, rows,
      `driver_dossier_${driver.ref_id || driver.id}.xlsx`,
    );
  };

  /* ── Loading ────────────────────────────────────────────────────────────── */
  if (isLoading) {
    return (
      <DashboardLayout active="Drivers" title="Driver Details">
        <div className="flex gap-4 px-4 sm:px-6 pb-6 max-w-[1400px] mx-auto w-full animate-pulse">
          <div className="w-72 shrink-0 space-y-3">
            <div className="h-48 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
            <div className="h-28 bg-slate-200 dark:bg-slate-800 rounded-xl" />
            <div className="h-28 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          </div>
          <div className="flex-1 h-[560px] bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        </div>
      </DashboardLayout>
    );
  }

  /* ── Error ──────────────────────────────────────────────────────────────── */
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

  /* ── Derived values ─────────────────────────────────────────────────────── */
  const isLicenseExpired     = driver.license_expiry ? new Date(driver.license_expiry) < new Date() : false;
  const daysUntilExpiry      = driver.license_expiry
    ? Math.ceil((new Date(driver.license_expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const isLicenseExpiringSoon = !isLicenseExpired && daysUntilExpiry != null && daysUntilExpiry <= 30;

  const trips               = driver.trips || [];
  const completedTripsCount = trips.filter(t => t.status === 'Completed').length;
  const totalTripsCount     = trips.length;
  const assignedVehicle     = driver.assignedVehicle;

  const statusTone =
    driver.status === 'Available' ? 'emerald' :
    driver.status === 'OnTrip'    ? 'blue'    : 'amber';

  const getDocStatusBadge = (status: string) => {
    switch (status) {
      case 'Verified': return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800 text-[10px] font-bold">VERIFIED</Badge>;
      case 'Rejected': return <Badge className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800 text-[10px] font-bold">REJECTED</Badge>;
      case 'Expired':  return <Badge className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800 text-[10px] font-bold">EXPIRED</Badge>;
      default:         return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800 text-[10px] font-bold">PENDING</Badge>;
    }
  };

  /* ── Render ─────────────────────────────────────────────────────────────── */
  return (
    <DashboardLayout active="Drivers" title={`Driver: ${driver.ref_id || 'N/A'}`}>
      <div className="px-4 sm:px-6 pb-6 animate-fade-in max-w-[1400px] mx-auto w-full space-y-3">

        {/* ══ TOP ACTION BAR ════════════════════════════════════════════════ */}
        <div className="flex items-center justify-between gap-3 flex-wrap">

          {/* Left: back + title */}
          <div className="flex items-center gap-2.5 min-w-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/drivers')}
              className="h-8 w-8 p-0 shrink-0 text-brand border-slate-200 dark:border-slate-700 hover:border-brand/40"
              title="Back to roster"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-sm font-black text-slate-900 dark:text-slate-100 tracking-tight truncate">
                {driver.first_name} {driver.last_name}
              </h1>
              <span className="text-[11px] font-mono font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 shrink-0">
                {driver.ref_id || 'N/A'}
              </span>
              <StatusBadge status={driver.status} />
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Icon cluster */}
            <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden">
              <Button variant="ghost" size="sm" onClick={handleExportDossier}
                className="h-8 w-8 p-0 rounded-none text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" title="Export dossier">
                <Download className="w-3.5 h-3.5" />
              </Button>
              <span className="w-px h-4 bg-slate-200 dark:bg-slate-800" />
              <Button variant="ghost" size="sm" onClick={() => navigate(`/drivers/${driver.id}/documents`)}
                className="h-8 w-8 p-0 rounded-none text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/40" title="Document vault">
                <FileText className="w-3.5 h-3.5" />
              </Button>
              <span className="w-px h-4 bg-slate-200 dark:bg-slate-800" />
              <Button variant="ghost" size="sm" onClick={() => setIsDeleteModalOpen(true)}
                className="h-8 w-8 p-0 rounded-none text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30" title="Delete driver">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate(`/drivers/${driver.id}/edit`)}
              className="h-8 gap-1.5 text-xs font-semibold border-slate-200 dark:border-slate-800">
              <Edit2 className="w-3 h-3" /> Edit
            </Button>
            <Button size="sm" onClick={() => navigate(`/trips/new?driverId=${driver.id}`)}
              className="h-8 gap-1.5 text-xs font-bold bg-brand hover:bg-brand-hover text-white shadow-sm rounded-lg px-3.5">
              New Trip
            </Button>
          </div>
        </div>

        {/* ══ LICENSE ALERT (conditional) ═══════════════════════════════════ */}
        {(isLicenseExpired || isLicenseExpiringSoon) && (
          <div className={cn(
            'flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border p-3 shadow-2xs',
            isLicenseExpired
              ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60'
              : 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60',
          )}>
            <div className="flex items-center gap-2.5">
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                isLicenseExpired ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600')}>
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h4 className={cn('text-xs font-extrabold', isLicenseExpired ? 'text-rose-900 dark:text-rose-200' : 'text-amber-900 dark:text-amber-200')}>
                  {isLicenseExpired ? 'Driving license has expired' : `Expires in ${daysUntilExpiry} days`}
                </h4>
                <p className={cn('text-[11px] mt-0.5', isLicenseExpired ? 'text-rose-700 dark:text-rose-400' : 'text-amber-700 dark:text-amber-400')}>
                  {driver.license_number ? `License ${driver.license_number} · ` : ''}
                  Valid until {driver.license_expiry ? formatInDeploymentTz(driver.license_expiry, tz, 'MM/dd/yyyy') : 'N/A'}.
                </p>
              </div>
            </div>
            <Button size="sm" onClick={() => navigate(`/drivers/${driver.id}/documents`)}
              className={cn('h-7 px-3 gap-1.5 text-xs font-bold text-white shrink-0',
                isLicenseExpired ? 'bg-rose-600 hover:bg-rose-700' : 'bg-amber-600 hover:bg-amber-700')}>
              <FileText className="w-3 h-3" /> Update Documents
            </Button>
          </div>
        )}

        {/* ══ MAIN LAYOUT: sidebar LEFT + trip panel RIGHT ══════════════════ */}
        <div className="flex gap-4 items-start">

          {/* ── LEFT SIDEBAR ────────────────────────────────────────────── */}
          <div className="w-72 shrink-0 space-y-3">

            {/* Identity card */}
            <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden py-0 gap-0 shadow-sm">
              {/* Thin top accent rail */}
              <div className="h-[3px] bg-gradient-to-r from-brand via-indigo-500 to-emerald-500 w-full" />

              <div className="p-4 flex flex-col items-center text-center gap-3">
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
                <div>
                  <div className="text-sm font-black text-slate-900 dark:text-slate-100 leading-tight">
                    {driver.first_name} {driver.last_name}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 mt-0.5">{driver.ref_id || 'N/A'}</div>
                </div>

                {/* Phone + license pills */}
                <div className="w-full space-y-1.5">
                  <PhoneDisplay phone={driver.phone_primary} variant="badge" showActions />
                  {driver.license_number && (
                    <div className="flex items-center justify-center gap-1.5 text-[11px] font-mono font-semibold bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 rounded-md px-2 py-1.5 text-slate-600 dark:text-slate-300">
                      <IdCard className="w-3 h-3 text-slate-400 shrink-0" />
                      {driver.license_number}
                    </div>
                  )}
                  {assignedVehicle && (
                    <button
                      onClick={() => navigate(`/vehicles/${assignedVehicle.id}`)}
                      className="w-full flex items-center justify-center gap-1.5 text-[11px] font-mono font-semibold bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-400 rounded-md px-2 py-1.5 hover:bg-emerald-100 transition-colors"
                    >
                      <Truck className="w-3 h-3 shrink-0" />
                      {assignedVehicle.plate_number}
                    </button>
                  )}
                </div>
              </div>
            </Card>

            {/* KPI tiles — 2×2 grid */}
            <div className="grid grid-cols-2 gap-2">
              <SideKpi
                icon={User} label="Status"
                value={driver.status}
                hint={driver.status === 'Available' ? 'Ready' : driver.status === 'OnTrip' ? 'On trip' : 'Off duty'}
                tone={statusTone}
              />
              <SideKpi
                icon={Calendar} label="Expiry"
                value={isLicenseExpired ? 'Expired' : daysUntilExpiry != null ? `${daysUntilExpiry}d` : 'N/A'}
                hint={driver.license_expiry ? formatInDeploymentTz(driver.license_expiry, tz, 'MM/dd/yy') : '—'}
                tone={isLicenseExpired ? 'rose' : isLicenseExpiringSoon ? 'amber' : 'emerald'}
              />
              <SideKpi
                icon={MapPin} label="Trips"
                value={`${completedTripsCount}/${totalTripsCount}`}
                hint="Done / Total"
                tone="brand"
              />
              <SideKpi
                icon={Truck} label="Truck"
                value={assignedVehicle?.plate_number || '—'}
                hint={assignedVehicle?.asset_type || 'Unassigned'}
                tone="indigo"
              />
            </div>

            {/* Credentials card */}
            <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 py-0 gap-0 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30">
                <IdCard className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Credentials</span>
              </div>
              <div className="px-3 py-1">
                <DataRow label="Duty Status">
                  <StatusBadge status={driver.status} />
                </DataRow>
                <DataRow label="License No.">
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-[11px]">
                    {driver.license_number || 'N/A'}
                  </span>
                </DataRow>
                <DataRow label="License Expiry">
                  <span className={cn('font-mono font-bold text-[11px]',
                    isLicenseExpired ? 'text-rose-600' : isLicenseExpiringSoon ? 'text-amber-600' : 'text-slate-800 dark:text-slate-200')}>
                    {driver.license_expiry ? formatInDeploymentTz(driver.license_expiry, tz, 'MM/dd/yyyy') : 'N/A'}
                  </span>
                </DataRow>
                <DataRow label="Registered">
                  <span className="font-mono font-bold text-[11px] text-slate-800 dark:text-slate-200">
                    {formatInDeploymentTz(driver.createdAt, tz, 'MM/dd/yyyy')}
                  </span>
                </DataRow>
              </div>
            </Card>

            {/* Assigned vehicle card */}
            <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 py-0 gap-0 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30">
                <div className="flex items-center gap-2">
                  <Truck className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Assigned Vehicle</span>
                </div>
                {assignedVehicle && (
                  <button onClick={() => navigate(`/vehicles/${assignedVehicle.id}`)}
                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5">
                    Open <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className="p-3">
                {!assignedVehicle ? (
                  <div className="flex items-center gap-2 text-xs text-slate-400 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 px-3 py-2.5">
                    <Truck className="w-4 h-4 text-slate-300 shrink-0" /> No vehicle assigned.
                  </div>
                ) : (
                  <div className="rounded-xl border border-emerald-200/70 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 p-3 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-black text-slate-900 dark:text-slate-100 tracking-wide flex items-center gap-1.5">
                        {assignedVehicle.plate_number}
                        {assignedVehicle.deletedAt && <DeletedBadge />}
                      </span>
                      <StatusBadge status={assignedVehicle.status} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-lg bg-white/80 dark:bg-slate-900/60 border border-emerald-100 dark:border-emerald-900/40 px-2.5 py-1.5">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                          <Gauge className="w-3 h-3" /> Odometer
                        </span>
                        <div className="font-mono text-xs font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">
                          {assignedVehicle.current_odometer != null ? `${assignedVehicle.current_odometer.toLocaleString()} KM` : 'N/A'}
                        </div>
                      </div>
                      <div className="rounded-lg bg-white/80 dark:bg-slate-900/60 border border-emerald-100 dark:border-emerald-900/40 px-2.5 py-1.5">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                          <Weight className="w-3 h-3" /> Capacity
                        </span>
                        <div className="font-mono text-xs font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">
                          {assignedVehicle.capacity_kg != null ? `${assignedVehicle.capacity_kg.toLocaleString()} KG` : 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Documents card */}
            <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 py-0 gap-0 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30">
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Documents
                    {documents.length > 0 && (
                      <span className="ml-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 text-[10px] font-bold">{documents.length}</span>
                    )}
                  </span>
                </div>
                <button onClick={() => navigate(`/drivers/${driver.id}/documents`)}
                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5">
                  Vault <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              <div className="p-3">
                {isLoadingDocs ? (
                  <div className="space-y-2 animate-pulse">
                    {[1, 2].map(i => <div key={i} className="h-9 rounded-lg bg-slate-100 dark:bg-slate-800" />)}
                  </div>
                ) : documents.length === 0 ? (
                  <div className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 px-3 py-2.5">
                    <span className="text-xs text-slate-400">No documents yet.</span>
                    <Button size="sm" variant="outline" onClick={() => navigate(`/drivers/${driver.id}/documents`)}
                      className="h-6 text-[11px] font-bold shrink-0">Upload</Button>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-0.5">
                    {documents.map((doc) => {
                      const isExpired = doc.expiry_date && new Date(doc.expiry_date) < new Date();
                      return (
                        <div
                          key={doc.id}
                          onClick={() => setSelectedDocIdForPreview(doc.id)}
                          className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/40 cursor-pointer transition-colors group"
                          title="Preview document"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={cn('w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-colors',
                              isExpired
                                ? 'bg-rose-500/10 text-rose-600'
                                : 'bg-indigo-500/10 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white')}>
                              {isExpired ? <AlertCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                            </span>
                            <div className="min-w-0">
                              <div className="text-[11px] font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 truncate">{doc.doc_type}</div>
                              <div className="text-[9px] text-slate-400 flex items-center gap-0.5">
                                <Clock className="w-2 h-2" />
                                {doc.expiry_date
                                  ? `Exp: ${formatInDeploymentTz(doc.expiry_date, tz, 'MM/dd/yy')}`
                                  : `Added: ${formatInDeploymentTz(doc.createdAt, tz, 'MM/dd/yy')}`}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Eye className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                            {getDocStatusBadge(isExpired ? 'Expired' : doc.status)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>

          </div>
          {/* ── END LEFT SIDEBAR ─────────────────────────────────────────── */}

          {/* ── RIGHT: FULL-HEIGHT TRIP OPERATIONS ──────────────────────── */}
          <div className="flex-1 min-w-0">
            <DriverTripOperations
              driverId={driver.id}
              driverName={`${driver.first_name} ${driver.last_name}`}
              trips={driver.trips || []}
            />
          </div>

        </div>
        {/* ══ END MAIN LAYOUT ══════════════════════════════════════════════ */}

      </div>

      {/* ══ DELETE MODAL ══════════════════════════════════════════════════════ */}
      <Dialog open={isDeleteModalOpen} onOpenChange={(open) => !open && setIsDeleteModalOpen(false)}>
        <DialogContent className="max-w-md rounded-2xl p-0 overflow-hidden border-slate-200 dark:border-slate-800">
          <DialogHeader className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-rose-50/50 dark:bg-rose-950/20">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <DialogTitle className="text-base font-black">Delete Driver Account</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500 mt-1">
              Deleting driver <strong className="text-slate-900 dark:text-slate-100">{driver.first_name} {driver.last_name}</strong> will revoke access and archive roster records.
              {driverUsage && (
                driverUsage.totalTrips > 0 || driverUsage.expenses > 0 ? (
                  <> They have {driverUsage.totalTrips} trip{driverUsage.totalTrips === 1 ? '' : 's'}
                    {driverUsage.activeTrips > 0 ? ` (${driverUsage.activeTrips} active)` : ''} and {driverUsage.expenses} expense{driverUsage.expenses === 1 ? '' : 's'} linked.</>
                ) : ' They have no linked trips or records.'
              )}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDeleteSubmit}>
            <div className="p-6 space-y-4">
              {deleteError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" /><span>{deleteError}</span>
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="admin_password" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Admin Password <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="admin_password" type="password" placeholder="Enter your admin password"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  className="h-9 text-xs border-slate-200 dark:border-slate-800" required
                />
              </div>
            </div>
            <DialogFooter className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm"
                onClick={() => { setIsDeleteModalOpen(false); setPassword(''); setDeleteError(''); }}
                className="text-xs font-bold">Cancel</Button>
              <Button type="submit" size="sm" disabled={deleteMutation.isPending}
                className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 shadow-xs">
                {deleteMutation.isPending ? 'Deleting...' : 'Confirm Delete'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ══ MODALS ════════════════════════════════════════════════════════════ */}
      <DriverPreviewModal driver={driver} isOpen={isPreviewModalOpen} onClose={() => setIsPreviewModalOpen(false)} />
      <DocumentPreviewSheet documentId={selectedDocIdForPreview} onClose={() => setSelectedDocIdForPreview(null)} />

    </DashboardLayout>
  );
}
