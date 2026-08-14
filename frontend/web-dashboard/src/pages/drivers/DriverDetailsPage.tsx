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
import { driverService } from '@/services/driverService';
import { documentService } from '@/services/documentService';
import { exportExcelTable } from '@/utils/exportUtils';
import CreateTripModal from '@/components/trips/CreateTripModal';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getUpcomingScheduledDates } from '@/utils/scheduleUtils';
import { cn } from '@/lib/utils';

/** One integrated stat tile living inside the hero card — no separate KPI row, no extra scroll. */
function HeroStat({
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
  tone: 'brand' | 'emerald' | 'blue' | 'amber' | 'rose' | 'indigo';
}) {
  const tones = {
    brand: 'bg-brand/10 text-brand',
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    indigo: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  } as const;

  return (
    <div className="flex items-center gap-3 px-4 py-3 min-w-0">
      <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', tones[tone])}>
        <Icon className="w-[18px] h-[18px]" />
      </span>
      <div className="min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
        <div className="text-sm font-black text-slate-900 dark:text-slate-100 truncate leading-tight mt-0.5">
          {value}
        </div>
        {hint && <div className="text-[10px] text-slate-500 truncate leading-tight">{hint}</div>}
      </div>
    </div>
  );
}

/** Label/value line used by the joined right-hand profile card. */
function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">{label}</span>
      <span className="text-xs min-w-0 text-right">{children}</span>
    </div>
  );
}

export default function DriverDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCreateTripOpen, setIsCreateTripOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

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
    const headers = [
      'Field', 'Details'
    ];
    const rows = [
      ['Driver Ref ID', driver.ref_id || driver.id],
      ['Full Name', `${driver.first_name} ${driver.last_name}`],
      ['Primary Phone', driver.phone_primary || 'N/A'],
      ['Duty Status', driver.status],
      ['License Number', driver.license_number || 'N/A'],
      ['License Expiry', driver.license_expiry ? new Date(driver.license_expiry).toLocaleDateString('en-GB') : 'N/A'],
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
          <div className="h-44 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 h-[460px] bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
            <div className="h-[460px] bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
          </div>
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
  const initials = `${driver.first_name?.[0] || ''}${driver.last_name?.[0] || ''}`.toUpperCase() || 'DR';
  const trips = driver.trips || [];
  const completedTripsCount = trips.filter(t => t.status === 'Completed').length;
  const totalTripsCount = trips.length;
  const assignedVehicle = driver.assignedVehicle;

  const statusTone = driver.status === 'Available' ? 'emerald' : driver.status === 'OnTrip' ? 'blue' : 'amber';
  const statusRing =
    driver.status === 'Available' ? 'ring-emerald-400/60'
      : driver.status === 'OnTrip' ? 'ring-blue-400/60'
        : 'ring-amber-400/60';

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
    <DashboardLayout active="Drivers" title={`Driver: ${driver.ref_id || 'N/A'}`}>
      <div className="px-4 sm:px-6 pb-6 space-y-4 animate-fade-in max-w-[1400px] mx-auto w-full">

        {/* ── HERO: identity + actions + integrated stats, all in ONE card ─────── */}
        <Card className="relative overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-12px_rgba(16,24,40,0.12)] py-0 gap-0 ring-0">
          {/* brand accent rail */}
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand via-indigo-500 to-emerald-500" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 pt-5">
            <div className="flex items-center gap-3 min-w-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/drivers')}
                className="h-9 w-9 p-0 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:bg-slate-100 shrink-0"
                title="Back to Driver Roster"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>

              <div className={cn(
                'relative w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-700 dark:to-slate-900',
                'flex items-center justify-center text-white text-base font-black shrink-0 shadow-md ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-900',
                statusRing
              )}>
                {initials}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight truncate">
                    {driver.first_name} {driver.last_name}
                  </h1>
                  <StatusBadge status={driver.status} />
                  <span className="text-[11px] font-mono font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200/80 dark:border-slate-700">
                    {driver.ref_id || 'N/A'}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                  <span className="flex items-center gap-1.5 font-mono font-semibold bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 rounded-md px-2 py-1">
                    <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                    {driver.phone_primary || 'No phone'}
                  </span>
                  {driver.license_number && (
                    <span className="flex items-center gap-1.5 font-mono font-semibold bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 rounded-md px-2 py-1">
                      <IdCard className="w-3 h-3 text-slate-400 shrink-0" />
                      {driver.license_number}
                    </span>
                  )}
                  {assignedVehicle && (
                    <button
                      onClick={() => navigate(`/vehicles/${assignedVehicle.id}`)}
                      className="flex items-center gap-1.5 font-mono font-semibold bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-400 rounded-md px-2 py-1 hover:bg-emerald-100 transition-colors"
                      title="Open assigned vehicle"
                    >
                      <Truck className="w-3 h-3 shrink-0" />
                      {assignedVehicle.plate_number}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap shrink-0">
              <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  className="h-9 w-9 p-0 rounded-none text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Refresh Data"
                >
                  <RotateCw className={cn('w-4 h-4', isRefreshing && 'animate-spin text-brand')} />
                </Button>
                <span className="w-px h-5 bg-slate-200 dark:bg-slate-800" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleExportDossier}
                  className="h-9 w-9 p-0 rounded-none text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Export Driver Dossier"
                >
                  <Download className="w-4 h-4" />
                </Button>
                <span className="w-px h-5 bg-slate-200 dark:bg-slate-800" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/drivers/${driver.id}/documents`)}
                  className="h-9 w-9 p-0 rounded-none text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                  title="Document Vault"
                >
                  <FileText className="w-4 h-4" />
                </Button>
                <span className="w-px h-5 bg-slate-200 dark:bg-slate-800" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="h-9 w-9 p-0 rounded-none text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                  title="Delete Driver Account"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/drivers/${driver.id}/edit`)}
                className="h-9 gap-1.5 text-xs font-semibold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 shadow-2xs hover:bg-slate-50"
              >
                <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                Edit
              </Button>

              <Button
                size="sm"
                onClick={() => setIsCreateTripOpen(true)}
                className="h-9 gap-1.5 text-xs font-bold bg-brand hover:bg-brand-hover text-white shadow-sm rounded-lg px-3.5"
              >
                <Plus className="w-4 h-4" />
                New Trip
              </Button>
            </div>
          </div>

          {/* Integrated stat strip — replaces the old standalone KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 border-t border-slate-100 dark:border-slate-800 divide-x divide-y lg:divide-y-0 divide-slate-100 dark:divide-slate-800 bg-slate-50/40 dark:bg-slate-800/20">
            <HeroStat
              icon={User}
              label="Duty Status"
              value={driver.status}
              hint={driver.status === 'Available' ? 'Ready for dispatch' : driver.status === 'OnTrip' ? 'Active on trip' : 'Off-duty / Inactive'}
              tone={statusTone}
            />
            <HeroStat
              icon={Calendar}
              label="License Expiry"
              value={isLicenseExpired ? 'Expired' : daysUntilExpiry != null ? `${daysUntilExpiry} days left` : 'N/A'}
              hint={driver.license_expiry ? new Date(driver.license_expiry).toLocaleDateString() : 'No expiry on file'}
              tone={isLicenseExpired ? 'rose' : isLicenseExpiringSoon ? 'amber' : 'emerald'}
            />
            <HeroStat
              icon={MapPin}
              label="Dispatch Trips"
              value={`${completedTripsCount} / ${totalTripsCount}`}
              hint="Completed / Total"
              tone="brand"
            />
            <HeroStat
              icon={Truck}
              label="Assigned Vehicle"
              value={assignedVehicle?.plate_number || 'Unassigned'}
              hint={assignedVehicle?.asset_type || 'No vehicle on file'}
              tone="indigo"
            />
          </div>
        </Card>

        {/* ── LICENSE COMPLIANCE ALERT (only when it matters) ─────────────────── */}
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
                  Valid until {driver.license_expiry ? new Date(driver.license_expiry).toLocaleDateString() : 'N/A'}. Renew and upload the new copy to the document vault.
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

        {/* ── MAIN GRID: trips (tabbed, one card) + joined profile card ───────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">

          {/* Trips: schedule + history joined into a single tabbed card */}
          <Card className="lg:col-span-2 border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-16px_rgba(16,24,40,0.14)] py-0 gap-0 ring-0 overflow-hidden">
            <Tabs defaultValue="schedule" className="gap-0">
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-brand" /> Trip Operations
                </h3>
                <TabsList className="h-8 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
                  <TabsTrigger value="schedule" className="h-7 gap-1.5 rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900">
                    Upcoming
                    <span className="rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-1.5 text-[10px] font-bold">
                      {scheduledDates.length}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger value="history" className="h-7 gap-1.5 rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900">
                    History
                    <span className="rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-1.5 text-[10px] font-bold">
                      {totalTripsCount}
                    </span>
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Upcoming scheduled days */}
              <TabsContent value="schedule" className="mt-0 p-4">
                {scheduledDates.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-2.5">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No Scheduled Trips</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 max-w-xs">
                      This driver has no active or upcoming trips assigned.
                    </p>
                    <Button
                      size="sm"
                      onClick={() => setIsCreateTripOpen(true)}
                      className="mt-3 h-8 gap-1.5 text-xs font-bold bg-brand hover:bg-brand-hover text-white shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" /> Schedule a Trip
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 max-h-[380px] overflow-y-auto pr-0.5">
                    {scheduledDates.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => (item.tripId || item.tripRef) && navigate(`/trips/${item.tripId || item.tripRef}`)}
                        className="group flex items-center justify-between gap-2 p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-950/20 text-left hover:border-indigo-300 hover:bg-indigo-50 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                            <Calendar className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-black text-slate-900 dark:text-slate-100 leading-tight">
                              {item.formattedDate}
                            </span>
                            <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-bold truncate">
                              {item.tripRef ? `Trip ${item.tripRef}` : 'Assigned Trip'}
                            </span>
                          </div>
                        </div>
                        {item.status && <StatusBadge status={item.status as any} />}
                      </button>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Dispatch history */}
              <TabsContent value="history" className="mt-0">
                {totalTripsCount === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-2.5">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No Trips Recorded</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">No dispatch trips recorded for this driver yet.</p>
                  </div>
                ) : (
                  <div className="max-h-[420px] overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 z-10 bg-white dark:bg-slate-900">
                        <TableRow className="border-slate-100 dark:border-slate-800 hover:bg-transparent">
                          <TableHead className="h-9 text-[10px] font-bold uppercase tracking-wider text-slate-400">Trip ID</TableHead>
                          <TableHead className="h-9 text-[10px] font-bold uppercase tracking-wider text-slate-400">Dispatch Date</TableHead>
                          <TableHead className="h-9 text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</TableHead>
                          <TableHead className="h-9 w-10" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {trips.map((trip: any) => (
                          <TableRow
                            key={trip.id}
                            onClick={() => navigate(`/trips/${trip.id}`)}
                            className="cursor-pointer border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                          >
                            <TableCell className="py-2.5">
                              <span className="font-mono text-xs font-extrabold text-brand">{trip.ref_id}</span>
                            </TableCell>
                            <TableCell className="py-2.5">
                              <span className="text-slate-600 dark:text-slate-300 font-mono text-xs">
                                {new Date(trip.createdAt).toLocaleDateString()}
                              </span>
                            </TableCell>
                            <TableCell className="py-2.5">
                              <StatusBadge status={trip.status} />
                            </TableCell>
                            <TableCell className="py-2.5 text-right">
                              <Eye size={14} className="inline text-slate-400" />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </Card>

          {/* Right: credentials + vehicle + documents joined into ONE card */}
          <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-16px_rgba(16,24,40,0.14)] py-0 gap-0 ring-0 overflow-hidden">

            {/* Credentials */}
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-brand" /> Driver Profile
              </h3>
            </div>

            <div className="p-4 divide-y divide-slate-100 dark:divide-slate-800">
              <div className="pb-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-1.5">
                  <IdCard className="w-3.5 h-3.5 text-slate-400" /> Credentials
                </span>
                <InfoRow label="Duty Status">
                  <StatusBadge status={driver.status} />
                </InfoRow>
                <InfoRow label="License No.">
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {driver.license_number || 'N/A'}
                  </span>
                </InfoRow>
                <InfoRow label="License Expiry">
                  <span className={cn(
                    'font-mono font-bold',
                    isLicenseExpired ? 'text-rose-600' : isLicenseExpiringSoon ? 'text-amber-600' : 'text-slate-800 dark:text-slate-200'
                  )}>
                    {driver.license_expiry ? new Date(driver.license_expiry).toLocaleDateString() : 'N/A'}
                  </span>
                </InfoRow>
                <InfoRow label="Registered">
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {new Date(driver.createdAt).toLocaleDateString()}
                  </span>
                </InfoRow>
              </div>

              {/* Assigned vehicle */}
              <div className="py-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-emerald-600" /> Assigned Vehicle
                  </span>
                  {assignedVehicle && (
                    <button
                      onClick={() => navigate(`/vehicles/${assignedVehicle.id}`)}
                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5"
                    >
                      Open <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {!assignedVehicle ? (
                  <div className="flex items-center gap-2 text-xs text-slate-500 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 px-3 py-3">
                    <Truck className="w-4 h-4 text-slate-300 shrink-0" /> No vehicle currently assigned.
                  </div>
                ) : (
                  <div className="rounded-xl border border-emerald-200/70 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-sm font-black text-slate-900 dark:text-slate-100 tracking-wide">
                        {assignedVehicle.plate_number}
                      </span>
                      <StatusBadge status={assignedVehicle.status} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2.5">
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

              {/* Compliance documents */}
              <div className="pt-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-600" /> Documents
                    {documents.length > 0 && (
                      <span className="rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 text-[10px] font-bold">
                        {documents.length}
                      </span>
                    )}
                  </span>
                  <button
                    onClick={() => navigate(`/drivers/${driver.id}/documents`)}
                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5"
                  >
                    Vault <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                {isLoadingDocs ? (
                  <div className="space-y-2 animate-pulse">
                    {[1, 2].map(i => <div key={i} className="h-10 rounded-lg bg-slate-100 dark:bg-slate-800" />)}
                  </div>
                ) : documents.length === 0 ? (
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 px-3 py-3">
                    <span className="text-xs text-slate-500">No documents uploaded yet.</span>
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
                  <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-0.5">
                    {documents.map((doc) => {
                      const isExpired = doc.expiry_date && new Date(doc.expiry_date) < new Date();
                      return (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between gap-2 py-2 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={cn(
                              'w-7 h-7 rounded-md flex items-center justify-center shrink-0',
                              isExpired ? 'bg-rose-500/10 text-rose-600' : 'bg-indigo-500/10 text-indigo-600'
                            )}>
                              {isExpired ? <AlertCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            </span>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{doc.doc_type}</div>
                              <div className="text-[10px] text-slate-500 flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" />
                                {doc.expiry_date
                                  ? `Exp: ${new Date(doc.expiry_date).toLocaleDateString()}`
                                  : `Uploaded: ${new Date(doc.createdAt).toLocaleDateString()}`}
                              </div>
                            </div>
                          </div>
                          {getDocStatusBadge(isExpired ? 'Expired' : doc.status)}
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

      <CreateTripModal
        isOpen={isCreateTripOpen}
        onClose={() => setIsCreateTripOpen(false)}
        initialDriverId={id}
      />
    </DashboardLayout>
  );
}
