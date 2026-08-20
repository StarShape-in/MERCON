import { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Edit2, FileText, Phone, MapPin, AlertTriangle,
  Eye, Trash2, Truck, ShieldCheck, User, IdCard,
  Plus, AlertCircle, Download, ChevronRight,
  RotateCw, Calendar, Gauge, Weight, CheckCircle2, Clock,
  Star, Activity, TrendingUp, Zap
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

/* ─────────────────────────────────────────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────────────────────────────────────────── */

/** Green-themed KPI tile used in the hero strip */
function GreenKpiTile({
  icon: Icon,
  label,
  value,
  hint,
  accent = 'emerald',
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  accent?: 'emerald' | 'teal' | 'green' | 'lime' | 'rose' | 'amber';
}) {
  const accents = {
    emerald: 'bg-emerald-500/15 text-emerald-600',
    teal:    'bg-teal-500/15 text-teal-600',
    green:   'bg-green-500/15 text-green-600',
    lime:    'bg-lime-500/15 text-lime-600',
    rose:    'bg-rose-500/15 text-rose-600',
    amber:   'bg-amber-500/15 text-amber-600',
  } as const;

  return (
    <div className="flex items-center gap-3 px-5 py-4 min-w-0 group">
      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm', accents[accent])}>
        <Icon className="w-5 h-5" />
      </span>
      <div className="min-w-0">
        <div className="text-[9px] font-black uppercase tracking-[0.12em] text-emerald-700/60 dark:text-emerald-400/50">{label}</div>
        <div className="text-sm font-black text-slate-900 dark:text-slate-100 truncate leading-tight mt-0.5">
          {value}
        </div>
        {hint && <div className="text-[10px] text-emerald-700/50 dark:text-emerald-400/40 truncate leading-tight mt-0.5">{hint}</div>}
      </div>
    </div>
  );
}

/** Section header row used inside profile card panels */
function PanelSectionHeader({ icon: Icon, label, action }: {
  icon: React.ElementType;
  label: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-700/70 dark:text-emerald-400/60">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </span>
      {action}
    </div>
  );
}

/** Single credential row */
function CredRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-emerald-100/70 dark:border-emerald-900/30 last:border-0">
      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 shrink-0">{label}</span>
      <span className="text-xs text-right min-w-0">{children}</span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────────────────────────── */
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
      ['Total Dispatch Trips', `${driver.trips?.length || 0}`],
    ];
    await exportExcelTable(
      `Driver Dossier - ${driver.first_name} ${driver.last_name}`,
      headers,
      rows,
      `driver_dossier_${driver.ref_id || driver.id}.xlsx`
    );
  };

  /* ── Loading skeleton ──────────────────────────────────────────────────── */
  if (isLoading) {
    return (
      <DashboardLayout active="Drivers" title="Driver Details">
        <div className="pb-8 max-w-[1440px] mx-auto w-full space-y-4 animate-pulse">
          <div className="h-56 bg-emerald-100/60 dark:bg-emerald-900/20 rounded-none" />
          <div className="px-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 h-[500px] bg-slate-100 dark:bg-slate-800 rounded-2xl" />
            <div className="h-[500px] bg-slate-100 dark:bg-slate-800 rounded-2xl" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  /* ── Error / not found ─────────────────────────────────────────────────── */
  if (error || !driver) {
    return (
      <DashboardLayout active="Drivers" title="Driver Details">
        <div className="px-6 pb-6 max-w-[1440px] mx-auto w-full flex flex-col items-center justify-center text-center h-[60vh] gap-3">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center border border-rose-200 dark:border-rose-900/50 shadow-sm">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">Driver Account Not Found</h2>
          <p className="text-xs text-slate-500 max-w-md">
            The requested driver profile does not exist or may have been deleted from the MERCON roster.
          </p>
          <Button onClick={() => navigate('/drivers')} size="sm" className="mt-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
            Return to Driver Roster
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  /* ── Derived values ──────────────────────────────────────────────────── */
  const isLicenseExpired   = driver.license_expiry ? new Date(driver.license_expiry) < new Date() : false;
  const daysUntilExpiry    = driver.license_expiry ? Math.ceil((new Date(driver.license_expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
  const isLicenseExpiringSoon = !isLicenseExpired && daysUntilExpiry != null && daysUntilExpiry <= 30;

  const trips              = driver.trips || [];
  const completedTripsCount = trips.filter(t => t.status === 'Completed').length;
  const totalTripsCount    = trips.length;
  const assignedVehicle    = driver.assignedVehicle;

  const statusDot =
    driver.status === 'Available'  ? 'bg-emerald-400' :
    driver.status === 'OnTrip'     ? 'bg-blue-400'    :
                                     'bg-amber-400';

  const getDocStatusBadge = (status: string) => {
    switch (status) {
      case 'Verified':
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">VERIFIED</Badge>;
      case 'Rejected':
        return <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold">REJECTED</Badge>;
      case 'Expired':
        return <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold">EXPIRED</Badge>;
      default:
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold">PENDING</Badge>;
    }
  };

  /* ── Render ────────────────────────────────────────────────────────────── */
  return (
    <DashboardLayout active="Drivers" title={`Driver: ${driver.ref_id || 'N/A'}`}>
      <div className="pb-8 animate-fade-in">

        {/* ══════════════════════════════════════════════════════════════════
            HERO BANNER — full-width green gradient cover
        ══════════════════════════════════════════════════════════════════ */}
        <div className="relative w-full overflow-hidden">
          {/* Green gradient backdrop */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-500" />
          {/* Subtle noise texture overlay */}
          <div className="absolute inset-0 opacity-[0.06] bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2240%22%20height%3D%2240%22%20viewBox%3D%220%200%2040%2040%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22%23fff%22%20fill-opacity%3D%221%22%3E%3Cpath%20d%3D%22M0%200h40v40H0z%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E')]" />
          {/* Decorative circles */}
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute top-4 right-1/3 w-24 h-24 rounded-full bg-emerald-400/10 pointer-events-none" />

          {/* Inner content */}
          <div className="relative z-10 max-w-[1440px] mx-auto px-6 pt-5 pb-0">

            {/* Top bar: back + actions */}
            <div className="flex items-center justify-between gap-4 mb-5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/drivers')}
                className="h-8 gap-1.5 text-xs font-bold text-white/80 hover:text-white hover:bg-white/10 border border-white/20 px-3"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Driver Roster
              </Button>

              {/* Action cluster */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  className="h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-white/10 border border-white/20"
                  title="Refresh profile"
                >
                  <RotateCw className={cn('w-3.5 h-3.5', isRefreshing && 'animate-spin')} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleExportDossier}
                  className="h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-white/10 border border-white/20"
                  title="Export dossier"
                >
                  <Download className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/drivers/${driver.id}/documents`)}
                  className="h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-white/10 border border-white/20"
                  title="Document vault"
                >
                  <FileText className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="h-8 w-8 p-0 text-white/70 hover:text-rose-300 hover:bg-rose-500/20 border border-white/20"
                  title="Delete driver"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/drivers/${driver.id}/edit`)}
                  className="h-8 gap-1.5 text-xs font-bold border-white/30 bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  onClick={() => navigate(`/trips/new?driverId=${driver.id}`)}
                  className="h-8 gap-1.5 text-xs font-bold bg-white text-emerald-700 hover:bg-emerald-50 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Trip
                </Button>
              </div>
            </div>

            {/* Identity row */}
            <div className="flex items-end gap-5">
              {/* Avatar with green ring */}
              <div className="relative shrink-0">
                <div className="w-20 h-20 rounded-2xl ring-4 ring-white/40 ring-offset-2 ring-offset-emerald-600 shadow-xl overflow-hidden">
                  <DriverAvatar
                    src={driver.avatar_url}
                    firstName={driver.first_name}
                    lastName={driver.last_name}
                    size="lg"
                    status={driver.status}
                    showStatusDot={false}
                    previewable
                    onPreview={() => setIsPreviewModalOpen(true)}
                  />
                </div>
                {/* Live status dot */}
                <span className={cn('absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white shadow', statusDot)} />
              </div>

              {/* Name + meta */}
              <div className="mb-3 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl font-black text-white tracking-tight leading-tight">
                    {driver.first_name} {driver.last_name}
                  </h1>
                  <span className="text-[11px] font-mono font-bold text-emerald-100 bg-white/10 border border-white/20 px-2 py-0.5 rounded-md backdrop-blur-sm">
                    {driver.ref_id || 'N/A'}
                  </span>
                  <Badge className={cn(
                    'text-[10px] font-black border',
                    driver.status === 'Available' ? 'bg-emerald-400/20 text-emerald-100 border-emerald-300/40' :
                    driver.status === 'OnTrip'    ? 'bg-blue-400/20 text-blue-100 border-blue-300/40' :
                                                    'bg-amber-400/20 text-amber-100 border-amber-300/40'
                  )}>
                    {driver.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 flex-wrap mt-2 text-emerald-100/80 text-[11px]">
                  <PhoneDisplay phone={driver.phone_primary} variant="badge" showActions />
                  {driver.license_number && (
                    <span className="flex items-center gap-1.5 font-mono font-semibold bg-white/10 border border-white/20 rounded-md px-2 py-1 backdrop-blur-sm">
                      <IdCard className="w-3 h-3 shrink-0" />
                      {driver.license_number}
                    </span>
                  )}
                  {assignedVehicle && (
                    <button
                      onClick={() => navigate(`/vehicles/${assignedVehicle.id}`)}
                      className="flex items-center gap-1.5 font-mono font-semibold bg-white/15 border border-white/25 text-white rounded-md px-2 py-1 hover:bg-white/25 transition-colors backdrop-blur-sm"
                      title="Open assigned vehicle"
                    >
                      <Truck className="w-3 h-3 shrink-0" />
                      {assignedVehicle.plate_number}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── KPI STRIP — glassy shelf sitting over the bottom of the banner ── */}
          <div className="relative z-10 max-w-[1440px] mx-auto px-6">
            <div className="mt-4 rounded-t-2xl bg-white dark:bg-slate-900 border border-b-0 border-emerald-100 dark:border-emerald-900/30 shadow-[0_-4px_24px_rgba(16,185,129,0.10)] grid grid-cols-2 lg:grid-cols-4 divide-x divide-emerald-100 dark:divide-emerald-900/30">
              <GreenKpiTile
                icon={Activity}
                label="Duty Status"
                value={driver.status}
                hint={driver.status === 'Available' ? 'Ready for dispatch' : driver.status === 'OnTrip' ? 'Active on trip' : 'Off-duty'}
                accent={driver.status === 'Available' ? 'emerald' : driver.status === 'OnTrip' ? 'teal' : 'amber'}
              />
              <GreenKpiTile
                icon={Calendar}
                label="License Expiry"
                value={isLicenseExpired ? 'Expired' : daysUntilExpiry != null ? `${daysUntilExpiry} days left` : 'N/A'}
                hint={driver.license_expiry ? formatInDeploymentTz(driver.license_expiry, tz, 'MM/dd/yyyy') : 'No expiry on file'}
                accent={isLicenseExpired ? 'rose' : isLicenseExpiringSoon ? 'amber' : 'emerald'}
              />
              <GreenKpiTile
                icon={TrendingUp}
                label="Dispatch Trips"
                value={`${completedTripsCount} / ${totalTripsCount}`}
                hint="Completed / Total"
                accent="teal"
              />
              <GreenKpiTile
                icon={Truck}
                label="Assigned Vehicle"
                value={assignedVehicle?.plate_number || 'Unassigned'}
                hint={assignedVehicle?.asset_type || 'No vehicle on file'}
                accent="green"
              />
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            BODY — two-column layout below the hero
        ══════════════════════════════════════════════════════════════════ */}
        <div className="max-w-[1440px] mx-auto px-6 space-y-4">

          {/* License compliance alert */}
          {(isLicenseExpired || isLicenseExpiringSoon) && (
            <div className={cn(
              'flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border p-3.5 shadow-2xs mt-4',
              isLicenseExpired
                ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60'
                : 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60'
            )}>
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                  isLicenseExpired ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
                )}>
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className={cn('text-xs font-extrabold', isLicenseExpired ? 'text-rose-900 dark:text-rose-200' : 'text-amber-900 dark:text-amber-200')}>
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
                className={cn('h-8 px-3 gap-1.5 text-xs font-bold text-white shadow-xs shrink-0', isLicenseExpired ? 'bg-rose-600 hover:bg-rose-700' : 'bg-amber-600 hover:bg-amber-700')}
              >
                <FileText className="w-3.5 h-3.5" />
                Update Documents
              </Button>
            </div>
          )}

          {/* Main grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start pt-4">

            {/* ── LEFT / MAIN: Trip Operations ──────────────────────────── */}
            <div className="lg:col-span-2">
              <DriverTripOperations
                driverId={driver.id}
                driverName={`${driver.first_name} ${driver.last_name}`}
                trips={driver.trips || []}
              />
            </div>

            {/* ── RIGHT: Profile sidebar card ───────────────────────────── */}
            <div className="space-y-3">

              {/* ── Credentials panel ──────────────────────────────────── */}
              <Card className="rounded-2xl border border-emerald-100 dark:border-emerald-900/30 bg-white dark:bg-slate-900 overflow-hidden py-0 gap-0 shadow-[0_2px_16px_rgba(16,185,129,0.08)]">
                {/* Green panel header bar */}
                <div className="px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-500 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-sm font-black text-white tracking-tight">Driver Profile</h3>
                </div>

                <div className="p-4 space-y-4">
                  {/* Credentials block */}
                  <div>
                    <PanelSectionHeader icon={IdCard} label="Credentials" />
                    <div className="rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 px-3 py-1">
                      <CredRow label="Duty Status">
                        <StatusBadge status={driver.status} />
                      </CredRow>
                      <CredRow label="License No.">
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {driver.license_number || 'N/A'}
                        </span>
                      </CredRow>
                      <CredRow label="License Expiry">
                        <span className={cn('font-mono font-bold', isLicenseExpired ? 'text-rose-600' : isLicenseExpiringSoon ? 'text-amber-600' : 'text-emerald-700 dark:text-emerald-400')}>
                          {driver.license_expiry ? formatInDeploymentTz(driver.license_expiry, tz, 'MM/dd/yyyy') : 'N/A'}
                        </span>
                      </CredRow>
                      <CredRow label="Registered">
                        <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                          {formatInDeploymentTz(driver.createdAt, tz, 'MM/dd/yyyy')}
                        </span>
                      </CredRow>
                    </div>
                  </div>

                  {/* Assigned vehicle block */}
                  <div>
                    <PanelSectionHeader
                      icon={Truck}
                      label="Assigned Vehicle"
                      action={assignedVehicle && (
                        <button
                          onClick={() => navigate(`/vehicles/${assignedVehicle.id}`)}
                          className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5"
                        >
                          Open <ChevronRight className="w-3 h-3" />
                        </button>
                      )}
                    />

                    {!assignedVehicle ? (
                      <div className="flex items-center gap-2 text-xs text-slate-500 rounded-xl border border-dashed border-emerald-200 dark:border-emerald-900/40 px-3 py-3">
                        <Truck className="w-4 h-4 text-emerald-300 shrink-0" /> No vehicle currently assigned.
                      </div>
                    ) : (
                      <div className="rounded-xl border border-emerald-200/70 dark:border-emerald-900/50 bg-gradient-to-br from-emerald-50 to-teal-50/40 dark:from-emerald-950/30 dark:to-teal-950/20 p-3">
                        <div className="flex items-center justify-between gap-2 mb-2.5">
                          <span className="font-mono text-sm font-black text-slate-900 dark:text-slate-100 tracking-wide flex items-center gap-1.5">
                            {assignedVehicle.plate_number}
                            {assignedVehicle.deletedAt && <DeletedBadge />}
                          </span>
                          <StatusBadge status={assignedVehicle.status} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded-lg bg-white/80 dark:bg-slate-900/60 border border-emerald-100 dark:border-emerald-900/40 px-2.5 py-2">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-600/60 flex items-center gap-1">
                              <Gauge className="w-3 h-3" /> Odometer
                            </span>
                            <div className="font-mono text-xs font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">
                              {assignedVehicle.current_odometer != null ? `${assignedVehicle.current_odometer.toLocaleString()} KM` : 'N/A'}
                            </div>
                          </div>
                          <div className="rounded-lg bg-white/80 dark:bg-slate-900/60 border border-emerald-100 dark:border-emerald-900/40 px-2.5 py-2">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-600/60 flex items-center gap-1">
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

                  {/* Documents block */}
                  <div>
                    <PanelSectionHeader
                      icon={FileText}
                      label={`Documents${documents.length > 0 ? ` · ${documents.length}` : ''}`}
                      action={
                        <button
                          onClick={() => navigate(`/drivers/${driver.id}/documents`)}
                          className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5"
                        >
                          Vault <ChevronRight className="w-3 h-3" />
                        </button>
                      }
                    />

                    {isLoadingDocs ? (
                      <div className="space-y-2 animate-pulse">
                        {[1, 2].map(i => <div key={i} className="h-10 rounded-lg bg-emerald-100/60 dark:bg-emerald-900/20" />)}
                      </div>
                    ) : documents.length === 0 ? (
                      <div className="flex items-center justify-between gap-2 rounded-xl border border-dashed border-emerald-200 dark:border-emerald-900/40 px-3 py-3">
                        <span className="text-xs text-slate-500">No documents uploaded yet.</span>
                        <Button size="sm" variant="outline" onClick={() => navigate(`/drivers/${driver.id}/documents`)} className="h-7 text-[11px] font-bold shrink-0 border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                          Upload
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-0.5">
                        {documents.map((doc) => {
                          const isExpired = doc.expiry_date && new Date(doc.expiry_date) < new Date();
                          return (
                            <div
                              key={doc.id}
                              onClick={() => setSelectedDocIdForPreview(doc.id)}
                              className="flex items-center justify-between gap-2 py-2 px-2.5 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 hover:border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer transition-colors group"
                              title="Click to preview document details & OCR metadata"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={cn(
                                  'w-7 h-7 rounded-md flex items-center justify-center shrink-0 transition-colors',
                                  isExpired ? 'bg-rose-500/10 text-rose-600' : 'bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white'
                                )}>
                                  {isExpired ? <AlertCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                </span>
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-emerald-700 truncate">{doc.doc_type}</div>
                                  <div className="text-[10px] text-slate-500 flex items-center gap-1">
                                    <Clock className="w-2.5 h-2.5" />
                                    {doc.expiry_date
                                      ? `Exp: ${formatInDeploymentTz(doc.expiry_date, tz, 'MM/dd/yyyy')}`
                                      : `Uploaded: ${formatInDeploymentTz(doc.createdAt, tz, 'MM/dd/yyyy')}`}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Eye className="w-3.5 h-3.5 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                {getDocStatusBadge(isExpired ? 'Expired' : doc.status)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </Card>

            </div>
          </div>
        </div>
      </div>

      {/* ══ DELETE DRIVER CONFIRMATION MODAL ══════════════════════════════════ */}
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

      {/* ══ DRIVER PROFILE PREVIEW & DOCUMENT PREVIEW MODALS ══════════════════ */}
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
