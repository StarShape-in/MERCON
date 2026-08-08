import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Edit2, Wrench, Truck, Clock, CheckCircle2,
  AlertTriangle, FileText, Phone, Building2, Gauge,
  Trash2, ExternalLink, AlertCircle, RotateCw, CalendarClock,
  ChevronDown, Download, Receipt, Banknote, XCircle,
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { maintenanceService, CreateMaintenancePayload, MaintenanceType, MaintenanceStatus } from '@/services/maintenanceService';
import { exportToCSV } from '@/utils/exportUtils';
import { cn } from '@/lib/utils';

const STATUS_META: Record<string, { label: string; className: string }> = {
  Scheduled: { label: 'Scheduled', className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
  In_Progress: { label: 'In Progress', className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  Completed: { label: 'Completed', className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
  Cancelled: { label: 'Cancelled', className: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' },
};

const TYPE_META: Record<string, { label: string; className: string }> = {
  Routine: { label: 'Routine', className: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20' },
  Repair: { label: 'Repair', className: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' },
  Inspection: { label: 'Inspection', className: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20' },
  Renewal: { label: 'Renewal / Istimara', className: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' },
  Emergency: { label: 'Emergency', className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
};

const LIFECYCLE: MaintenanceStatus[] = ['Scheduled', 'In_Progress', 'Completed'];

const EMPTY = '—';

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : EMPTY;

const formatSAR = (value?: number | null) =>
  `SAR ${(value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Small labelled row used across the detail cards. */
function Field({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
      <span className={cn('text-xs font-semibold text-slate-900 dark:text-slate-100 text-right', mono && 'font-mono')}>
        {value}
      </span>
    </div>
  );
}

export default function MaintenanceDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('overview');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [editFormData, setEditFormData] = useState<CreateMaintenancePayload>({
    vehicle_id: '',
    workshop_name: '',
    workshop_contact: '',
    maintenance_type: 'Routine',
    status: 'Completed',
    start_date: '',
    end_date: '',
    work_done: '',
    odometer_reading: 0,
    cost: 0,
    invoice_number: '',
    next_service_due: '',
    remarks: '',
  });
  const [editError, setEditError] = useState('');

  const { data: record, isLoading, error } = useQuery({
    queryKey: ['maintenance-detail', id],
    queryFn: () => maintenanceService.getById(id!),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (payload: any) => maintenanceService.update(id!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      if (record?.vehicleId) {
        queryClient.invalidateQueries({ queryKey: ['vehicle', record.vehicleId] });
        queryClient.invalidateQueries({ queryKey: ['vehicle-financials', record.vehicleId] });
      }
      setIsEditModalOpen(false);
      setEditError('');
    },
    onError: (err: any) => {
      setEditError(err.response?.data?.error?.message || 'Failed to update record.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => maintenanceService.delete(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      navigate('/maintenance');
    },
  });

  const handleOpenEditModal = () => {
    if (!record) return;
    setEditFormData({
      vehicle_id: record.vehicleId,
      workshop_name: record.workshop_name,
      workshop_contact: record.workshop_contact || '',
      maintenance_type: record.maintenance_type,
      status: record.status,
      start_date: record.start_date ? record.start_date.split('T')[0] : '',
      end_date: record.end_date ? record.end_date.split('T')[0] : '',
      work_done: record.work_done || '',
      odometer_reading: record.odometer_reading || 0,
      cost: record.cost || 0,
      invoice_number: record.invoice_number || '',
      next_service_due: record.next_service_due ? record.next_service_due.split('T')[0] : '',
      remarks: record.remarks || '',
    });
    setEditError('');
    setIsEditModalOpen(true);
  };

  const handleQuickStatusChange = (newStatus: MaintenanceStatus) => {
    updateMutation.mutate({ status: newStatus });
  };

  if (isLoading) {
    return (
      <DashboardLayout active="Vehicles" title="Maintenance Details">
        <div className="px-4 sm:px-6 pb-6 max-w-[1400px] mx-auto w-full space-y-6">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-7 w-64" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !record) {
    return (
      <DashboardLayout active="Vehicles" title="Maintenance Details">
        <div className="px-4 sm:px-6 pb-6 max-w-[1400px] mx-auto w-full flex flex-col items-center justify-center text-center h-[60vh] gap-3">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">Record not found</h2>
          <p className="text-xs text-slate-500 max-w-md">
            This maintenance record does not exist or has been deleted.
          </p>
          <Button onClick={() => navigate('/maintenance')} size="sm" className="mt-2 text-xs font-bold bg-[#E8450F] hover:bg-[#d03c0b] text-white">
            Back to maintenance
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const vehicle = record.vehicle;
  const statusMeta = STATUS_META[record.status] ?? { label: record.status, className: '' };
  const typeMeta = TYPE_META[record.maintenance_type] ?? { label: record.maintenance_type, className: '' };

  const isCancelled = record.status === 'Cancelled';
  const currentStep = LIFECYCLE.indexOf(record.status as MaintenanceStatus);

  const durationDays =
    record.start_date && record.end_date
      ? Math.max(
          0,
          Math.round(
            (new Date(record.end_date).getTime() - new Date(record.start_date).getTime()) / 86_400_000,
          ),
        )
      : null;

  const odoSinceService =
    vehicle && record.odometer_reading
      ? Math.max(0, (vehicle.current_odometer || 0) - record.odometer_reading)
      : null;

  return (
    <DashboardLayout active="Vehicles" title={`Maintenance #${record.id.slice(0, 8)}`}>
      <div className="px-4 sm:px-6 pb-8 space-y-6 animate-fade-in max-w-[1400px] mx-auto w-full">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">

          <div className="flex items-start gap-3 min-w-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/maintenance')}
              className="h-9 w-9 p-0 shrink-0 rounded-xl"
              title="Back to maintenance list"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>

            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight truncate">
                Service Order #{record.id.slice(0, 8)}
              </h1>
              <div className="flex items-center gap-2 flex-wrap mt-1.5">
                <Badge className={cn('font-bold text-[10px] uppercase tracking-wide', typeMeta.className)}>
                  {typeMeta.label}
                </Badge>
                <Badge className={cn('font-bold text-[10px] uppercase tracking-wide', statusMeta.className)}>
                  {statusMeta.label}
                </Badge>
                {vehicle && (
                  <button
                    type="button"
                    onClick={() => navigate(`/vehicles/${vehicle.id}`)}
                    className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300 hover:text-[#E8450F] transition-colors"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    {vehicle.plate_number}
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToCSV([record], `maintenance_${record.id.slice(0, 8)}.csv`)}
              className="h-9 gap-1.5 text-xs font-bold"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              Export
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="h-9 gap-1.5 text-xs font-bold bg-[#E8450F] hover:bg-[#d03c0b] text-white">
                  Update status
                  <ChevronDown className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 text-xs font-semibold">
                <DropdownMenuLabel className="text-[10px] text-slate-400 uppercase">Set status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleQuickStatusChange('Scheduled')}>
                  <Clock className="w-3.5 h-3.5 mr-2 text-blue-500" /> Scheduled
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleQuickStatusChange('In_Progress')}>
                  <RotateCw className="w-3.5 h-3.5 mr-2 text-amber-500" /> In Progress
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleQuickStatusChange('Completed')}>
                  <CheckCircle2 className="w-3.5 h-3.5 mr-2 text-emerald-500" /> Completed
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleQuickStatusChange('Cancelled')}>
                  <XCircle className="w-3.5 h-3.5 mr-2 text-rose-500" /> Cancelled
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="outline" size="sm" onClick={handleOpenEditModal} className="h-9 gap-1.5 text-xs font-bold">
              <Edit2 className="w-3.5 h-3.5 text-slate-500" />
              Edit
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteModalOpen(true)}
              className="h-9 w-9 p-0 border-rose-200 hover:bg-rose-50 dark:border-rose-900/50 dark:hover:bg-rose-950/30"
              title="Delete record"
            >
              <Trash2 className="w-4 h-4 text-rose-500" />
            </Button>
          </div>
        </div>

        {/* ── KPI row ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          <Card className="p-4 rounded-2xl gap-0">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Cost</span>
              <Banknote className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-2xl font-mono font-black text-slate-900 dark:text-slate-100 mt-2">
              {formatSAR(record.cost)}
            </div>
            <div className="text-[10px] text-slate-500 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              Invoice {record.invoice_number || EMPTY}
            </div>
          </Card>

          <Card className="p-4 rounded-2xl gap-0">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Odometer at service</span>
              <Gauge className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-mono font-black text-slate-900 dark:text-slate-100 mt-2">
              {record.odometer_reading ? `${record.odometer_reading.toLocaleString()} km` : EMPTY}
            </div>
            <div className="text-[10px] text-slate-500 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              {odoSinceService !== null ? `+${odoSinceService.toLocaleString()} km driven since` : 'Vehicle odometer unavailable'}
            </div>
          </Card>

          <Card className="p-4 rounded-2xl gap-0">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Downtime</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-mono font-black text-slate-900 dark:text-slate-100 mt-2">
              {durationDays !== null ? `${durationDays} ${durationDays === 1 ? 'day' : 'days'}` : EMPTY}
            </div>
            <div className="text-[10px] text-slate-500 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              {record.end_date ? `Closed ${formatDate(record.end_date)}` : 'Not closed yet'}
            </div>
          </Card>

          <Card className="p-4 rounded-2xl gap-0">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Next service due</span>
              <CalendarClock className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-mono font-black text-slate-900 dark:text-slate-100 mt-2">
              {formatDate(record.next_service_due)}
            </div>
            <div className="text-[10px] text-slate-500 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              {record.next_service_due ? 'Scheduled follow-up' : 'No follow-up recorded'}
            </div>
          </Card>

        </div>

        {/* ── Lifecycle stepper ──────────────────────────────────────────── */}
        <Card className="p-4 sm:p-5 rounded-2xl">
          {isCancelled ? (
            <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
              <XCircle className="w-5 h-5 shrink-0" />
              <div>
                <div className="text-sm font-extrabold">This service order was cancelled</div>
                <div className="text-xs text-slate-500">No further work is expected on this record.</div>
              </div>
            </div>
          ) : (
            <div className="flex items-center">
              {LIFECYCLE.map((step, index) => {
                const reached = index <= currentStep;
                return (
                  <div key={step} className={cn('flex items-center', index < LIFECYCLE.length - 1 && 'flex-1')}>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <div
                        className={cn(
                          'w-7 h-7 rounded-full flex items-center justify-center border-2 transition-colors',
                          reached
                            ? 'bg-[#E8450F] border-[#E8450F] text-white'
                            : 'border-slate-200 dark:border-slate-700 text-slate-400',
                        )}
                      >
                        {reached ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-[11px] font-bold">{index + 1}</span>}
                      </div>
                      <div className="hidden sm:block">
                        <div className={cn('text-xs font-extrabold', reached ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400')}>
                          {STATUS_META[step].label}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {step === 'Scheduled' && formatDate(record.start_date)}
                          {step === 'Completed' && formatDate(record.end_date)}
                        </div>
                      </div>
                    </div>
                    {index < LIFECYCLE.length - 1 && (
                      <div
                        className={cn(
                          'h-0.5 flex-1 mx-3 rounded-full',
                          index < currentStep ? 'bg-[#E8450F]' : 'bg-slate-200 dark:bg-slate-800',
                        )}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* ── Tabs ───────────────────────────────────────────────────────── */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">

          <TabsList className="h-auto p-1.5 bg-slate-100/80 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 w-full sm:w-auto flex flex-wrap sm:inline-flex gap-1.5">
            {[
              { value: 'overview', icon: Wrench, label: 'Work report' },
              { value: 'financial', icon: Receipt, label: 'Invoice' },
              { value: 'vehicle', icon: Truck, label: 'Vehicle' },
            ].map(({ value, icon: Icon, label }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="px-4 py-2.5 sm:px-5 min-h-[44px] text-xs sm:text-sm font-extrabold gap-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:shadow-sm cursor-pointer transition-all"
              >
                <Icon className="w-4 h-4" /> {label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ── Work report ─────────────────────────────────────────────── */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              <Card className="lg:col-span-2 rounded-2xl">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <CardTitle className="text-sm font-extrabold flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#E8450F]" /> Work performed
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Activities and technical notes recorded by the workshop.
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-5 space-y-4">
                  {record.work_done ? (
                    <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                      {record.work_done}
                    </p>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-slate-500 py-6 justify-center">
                      <AlertCircle className="w-4 h-4" />
                      No work details recorded for this service order.
                    </div>
                  )}

                  {record.remarks && (
                    <>
                      <Separator />
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Remarks</span>
                        <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 whitespace-pre-line">{record.remarks}</p>
                      </div>
                    </>
                  )}

                  <Separator />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                    <Field label="Start date" value={formatDate(record.start_date)} mono />
                    <Field label="Completion date" value={formatDate(record.end_date)} mono />
                    <Field label="Service date" value={formatDate(record.service_date)} mono />
                    <Field label="Next service due" value={formatDate(record.next_service_due)} mono />
                    <Field
                      label="Odometer at service"
                      value={record.odometer_reading ? `${record.odometer_reading.toLocaleString()} km` : EMPTY}
                      mono
                    />
                    <Field label="Last updated" value={formatDate(record.updatedAt)} mono />
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl h-fit">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <CardTitle className="text-sm font-extrabold flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-indigo-500" /> Workshop
                  </CardTitle>
                </CardHeader>

                <CardContent className="p-4 space-y-3">
                  <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                    {record.workshop_name || EMPTY}
                  </div>

                  {record.workshop_contact ? (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Contact</div>
                        <div className="text-xs font-mono font-extrabold text-slate-900 dark:text-slate-100 mt-0.5 truncate">
                          {record.workshop_contact}
                        </div>
                      </div>
                      <a
                        href={`tel:${record.workshop_contact}`}
                        className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20 dark:text-indigo-300 shrink-0"
                        title="Call workshop"
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">No contact number on file.</p>
                  )}
                </CardContent>
              </Card>

            </div>
          </TabsContent>

          {/* ── Invoice ─────────────────────────────────────────────────── */}
          <TabsContent value="financial">
            <Card className="rounded-2xl">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3 flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-sm font-extrabold flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-emerald-500" /> Invoice
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Billing information recorded against this service order.
                  </CardDescription>
                </div>
                <span className="text-xl font-mono font-black text-slate-900 dark:text-slate-100 shrink-0">
                  {formatSAR(record.cost)}
                </span>
              </CardHeader>

              <CardContent className="p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 divide-y sm:divide-y-0 divide-slate-100 dark:divide-slate-800">
                  <Field label="Invoice number" value={record.invoice_number || EMPTY} mono />
                  <Field label="Workshop" value={record.workshop_name || EMPTY} />
                  <Field label="Maintenance type" value={typeMeta.label} />
                  <Field label="Status" value={statusMeta.label} />
                  <Field label="Recorded on" value={formatDate(record.createdAt)} mono />
                  <Field
                    label="Invoice document"
                    value={
                      record.invoice_url ? (
                        <a
                          href={record.invoice_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[#E8450F] hover:underline"
                        >
                          Open <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        EMPTY
                      )
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Vehicle ─────────────────────────────────────────────────── */}
          <TabsContent value="vehicle">
            {vehicle ? (
              <Card className="rounded-2xl">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3 flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-sm font-extrabold flex items-center gap-2">
                      <Truck className="w-4 h-4 text-[#E8450F]" /> Vehicle
                    </CardTitle>
                    <CardDescription className="text-xs">Asset this service order belongs to.</CardDescription>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/vehicles/${vehicle.id}`)}
                    className="text-xs font-bold gap-1.5 shrink-0"
                  >
                    View vehicle <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                </CardHeader>

                <CardContent className="p-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                    <Field label="Plate number" value={vehicle.plate_number} mono />
                    <Field label="Reference ID" value={vehicle.ref_id || EMPTY} mono />
                    <Field label="Asset type" value={vehicle.asset_type} />
                    <Field label="Vehicle status" value={vehicle.status} />
                    <Field
                      label="Current odometer"
                      value={`${(vehicle.current_odometer || 0).toLocaleString()} km`}
                      mono
                    />
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="rounded-2xl p-10 text-center text-xs text-slate-500">
                No vehicle is linked to this maintenance record.
              </Card>
            )}
          </TabsContent>

        </Tabs>
      </div>

      {/* ── Edit modal ───────────────────────────────────────────────────── */}
      <Dialog open={isEditModalOpen} onOpenChange={(open) => !open && setIsEditModalOpen(false)}>
        <DialogContent className="max-w-xl rounded-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
          <DialogHeader className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <DialogTitle className="text-base font-extrabold flex items-center gap-2">
              <Wrench className="w-5 h-5 text-[#E8450F]" /> Edit service order #{record.id.slice(0, 8)}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Changes are applied immediately to the maintenance record.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateMutation.mutate(editFormData);
            }}
            className="flex-1 overflow-y-auto p-6 space-y-4"
          >
            {editError && (
              <div className="p-3 rounded-lg bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Maintenance type *</Label>
                <Select
                  value={editFormData.maintenance_type}
                  onValueChange={(val: MaintenanceType) => setEditFormData(prev => ({ ...prev, maintenance_type: val }))}
                >
                  <SelectTrigger className="h-9 text-xs w-full">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Routine">Routine</SelectItem>
                    <SelectItem value="Repair">Repair</SelectItem>
                    <SelectItem value="Inspection">Inspection</SelectItem>
                    <SelectItem value="Renewal">Renewal / Istimara</SelectItem>
                    <SelectItem value="Emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Status *</Label>
                <Select
                  value={editFormData.status}
                  onValueChange={(val: MaintenanceStatus) => setEditFormData(prev => ({ ...prev, status: val }))}
                >
                  <SelectTrigger className="h-9 text-xs w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Scheduled">Scheduled</SelectItem>
                    <SelectItem value="In_Progress">In Progress</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Cost (SAR) *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editFormData.cost}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, cost: parseFloat(e.target.value) || 0 }))}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Odometer reading (km)</Label>
                <Input
                  type="number"
                  value={editFormData.odometer_reading}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, odometer_reading: parseFloat(e.target.value) || 0 }))}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Start date</Label>
                <Input
                  type="date"
                  value={editFormData.start_date}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, start_date: e.target.value }))}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Completion date</Label>
                <Input
                  type="date"
                  value={editFormData.end_date || ''}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, end_date: e.target.value }))}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Workshop name *</Label>
                <Input
                  value={editFormData.workshop_name}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, workshop_name: e.target.value }))}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Workshop contact</Label>
                <Input
                  value={editFormData.workshop_contact || ''}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, workshop_contact: e.target.value }))}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Invoice number</Label>
                <Input
                  value={editFormData.invoice_number || ''}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, invoice_number: e.target.value }))}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Next service due</Label>
                <Input
                  type="date"
                  value={editFormData.next_service_due || ''}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, next_service_due: e.target.value }))}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Work done *</Label>
              <Textarea
                value={editFormData.work_done || ''}
                onChange={(e) => setEditFormData(prev => ({ ...prev, work_done: e.target.value }))}
                rows={3}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Remarks</Label>
              <Textarea
                value={editFormData.remarks || ''}
                onChange={(e) => setEditFormData(prev => ({ ...prev, remarks: e.target.value }))}
                rows={2}
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 shrink-0">
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditModalOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={updateMutation.isPending}
                className="text-xs bg-[#E8450F] hover:bg-[#d03c0b] text-white font-bold px-4"
              >
                {updateMutation.isPending ? 'Saving…' : 'Save changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete modal ─────────────────────────────────────────────────── */}
      <Dialog open={isDeleteModalOpen} onOpenChange={(open) => !open && setIsDeleteModalOpen(false)}>
        <DialogContent className="max-w-md rounded-2xl p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <DialogTitle className="text-base font-extrabold">Delete service order</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500 mt-1">
              This permanently deletes maintenance record #{record.id.slice(0, 8)}
              {vehicle ? <> for vehicle <strong className="text-slate-900 dark:text-slate-100">{vehicle.plate_number}</strong></> : null}. This cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsDeleteModalOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
              className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold px-4"
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete record'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </DashboardLayout>
  );
}
