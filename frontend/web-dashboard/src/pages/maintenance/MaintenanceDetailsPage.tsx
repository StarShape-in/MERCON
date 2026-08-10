import { useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Edit2, Wrench, Truck, Clock, CheckCircle2,
  AlertTriangle, FileText, Phone, Building2, Gauge,
  Trash2, ExternalLink, AlertCircle, RotateCw, CalendarClock,
  ChevronDown, Download, Receipt, Banknote, XCircle,
  Upload, Paperclip, Printer, Hash, ClipboardList,
} from 'lucide-react';

import WorkshopField from '@/components/fleet/WorkshopField';
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
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import {
  maintenanceService,
  MAINTENANCE_ENTITY_TYPE,
  CreateMaintenancePayload,
  MaintenanceType,
  MaintenanceStatus,
} from '@/services/maintenanceService';
import { documentService, MerconDocument } from '@/services/documentService';
import { exportToCSV } from '@/utils/exportUtils';
import { cn } from '@/lib/utils';

const STATUS_META: Record<string, { label: string; className: string }> = {
  Scheduled: { label: 'Scheduled', className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
  In_Progress: { label: 'In Progress', className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  'In Progress': { label: 'In Progress', className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
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

const formatDate = (value?: string | null) => {
  if (!value) return EMPTY;
  const d = new Date(value);
  return isNaN(d.getTime()) ? EMPTY : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatSAR = (value?: number | null) =>
  `SAR ${(value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Small labelled row used across the detail cards. */
function Field({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 border-b border-slate-100 dark:border-slate-800/70 last:border-0">
      <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
      <span className={cn('text-xs font-semibold text-slate-900 dark:text-slate-100 text-right', mono && 'font-mono')}>
        {value}
      </span>
    </div>
  );
}

/** Compact metric tile for the summary strip. */
function Metric({
  label, value, hint, icon: Icon, tone,
}: {
  label: string; value: string; hint: string;
  icon: React.ElementType; tone: string;
}) {
  return (
    <Card className="p-3.5 rounded-xl gap-0">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{label}</span>
        <Icon className={cn('w-3.5 h-3.5', tone)} />
      </div>
      <div className="text-lg font-mono font-black text-slate-900 dark:text-slate-100 mt-1.5 truncate">{value}</div>
      <div className="text-[10px] text-slate-500 mt-1 truncate">{hint}</div>
    </Card>
  );
}

export default function MaintenanceDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [docToDelete, setDocToDelete] = useState<MerconDocument | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const { data: docsRes } = useQuery({
    queryKey: ['documents', MAINTENANCE_ENTITY_TYPE, id],
    queryFn: () => documentService.getAll({ entity_type: MAINTENANCE_ENTITY_TYPE, entity_id: id, per_page: 50 }),
    enabled: !!id,
  });

  const invoiceDocs = docsRes?.data ?? [];

  const updateMutation = useMutation({
    mutationFn: (payload: any) => maintenanceService.update(id!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      // Closing/reopening an order moves the vehicle in or out of the workshop.
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['workshops'] });
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
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      if (record?.vehicleId) {
        queryClient.invalidateQueries({ queryKey: ['vehicle', record.vehicleId] });
      }
      navigate('/maintenance');
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entity_type', MAINTENANCE_ENTITY_TYPE);
      formData.append('entity_id', id!);
      formData.append('doc_type', 'Invoice');
      return documentService.upload(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', MAINTENANCE_ENTITY_TYPE, id] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-detail', id] });
      setInvoiceFile(null);
      setUploadError('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    onError: (err: any) => {
      setUploadError(err.response?.data?.error?.message || 'Failed to upload the invoice.');
    },
  });

  const deleteDocMutation = useMutation({
    mutationFn: (docId: string) => documentService.delete(docId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', MAINTENANCE_ENTITY_TYPE, id] });
      setDocToDelete(null);
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

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editFormData.end_date && editFormData.start_date && editFormData.end_date < editFormData.start_date) {
      setEditError('End date cannot be before the start date.');
      return;
    }
    if (
      editFormData.next_service_due && editFormData.start_date &&
      editFormData.next_service_due < editFormData.start_date
    ) {
      setEditError('Next service due cannot be before the start date.');
      return;
    }
    updateMutation.mutate(editFormData);
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
              <Skeleton key={i} className="h-24 rounded-xl" />
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

  const orderNo = record.ref_id || `MNT-${record.id.slice(0, 8)}`;
  const isCancelled = record.status === 'Cancelled';
  const normalizedStatus = (record.status as string) === 'In Progress' ? 'In_Progress' : record.status;
  const currentStep = LIFECYCLE.indexOf(normalizedStatus as MaintenanceStatus);
  // Fill the rail up to the active milestone; a completed order fills it entirely.
  const progressPct = isCancelled ? 0 : (Math.max(0, currentStep) / (LIFECYCLE.length - 1)) * 100;

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
    <DashboardLayout active="Vehicles" title={`Service Order ${orderNo}`}>
      <div className="px-4 sm:px-6 pb-8 space-y-5 animate-fade-in max-w-[1400px] mx-auto w-full">

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
              <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                <Hash className="w-3 h-3" /> Service order
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight truncate font-mono">
                {orderNo}
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
              onClick={() => window.print()}
              className="h-9 gap-1.5 text-xs font-bold"
              title="Print work report"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              Print
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToCSV([record], `maintenance_${orderNo}.csv`)}
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

        {/* ── Slim lifecycle rail ────────────────────────────────────────── */}
        {isCancelled ? (
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-rose-500/5 border border-rose-500/20 text-rose-600 dark:text-rose-400">
            <XCircle className="w-4 h-4 shrink-0" />
            <span className="text-xs font-extrabold">This service order was cancelled</span>
            <span className="text-[11px] text-slate-500">· no further work is expected</span>
          </div>
        ) : (
          <div className="px-1">
            <div className="relative h-1 rounded-full bg-slate-200 dark:bg-slate-800">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-[#E8450F] transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
              {LIFECYCLE.map((step, index) => (
                <span
                  key={step}
                  className={cn(
                    'absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-950 transition-colors',
                    index <= currentStep ? 'bg-[#E8450F]' : 'bg-slate-300 dark:bg-slate-700',
                  )}
                  style={{ left: `${(index / (LIFECYCLE.length - 1)) * 100}%` }}
                />
              ))}
            </div>
            <div className="flex justify-between mt-2">
              {LIFECYCLE.map((step, index) => (
                <div
                  key={step}
                  className={cn(
                    'text-[10px] font-bold uppercase tracking-wide',
                    index === 0 && 'text-left',
                    index === LIFECYCLE.length - 1 && 'text-right',
                    index <= currentStep ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400',
                  )}
                >
                  {STATUS_META[step].label}
                  {step === 'Scheduled' && (
                    <span className="block font-mono font-medium normal-case text-slate-400">
                      {formatDate(record.start_date)}
                    </span>
                  )}
                  {step === 'Completed' && (
                    <span className="block font-mono font-medium normal-case text-slate-400">
                      {formatDate(record.end_date)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Summary metrics ────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Metric
            label="Cost"
            value={formatSAR(record.cost)}
            hint={`Invoice ${record.invoice_number || EMPTY}`}
            icon={Banknote}
            tone="text-rose-500"
          />
          <Metric
            label="Odometer at service"
            value={record.odometer_reading ? `${record.odometer_reading.toLocaleString()} km` : EMPTY}
            hint={odoSinceService !== null ? `+${odoSinceService.toLocaleString()} km driven since` : 'Vehicle odometer unavailable'}
            icon={Gauge}
            tone="text-indigo-500"
          />
          <Metric
            label="Downtime"
            value={durationDays !== null ? `${durationDays} ${durationDays === 1 ? 'day' : 'days'}` : EMPTY}
            hint={record.end_date ? `Closed ${formatDate(record.end_date)}` : 'Not closed yet'}
            icon={Clock}
            tone="text-amber-500"
          />
          <Metric
            label="Next service due"
            value={formatDate(record.next_service_due)}
            hint={record.next_service_due ? 'Scheduled follow-up' : 'No follow-up recorded'}
            icon={CalendarClock}
            tone="text-emerald-500"
          />
        </div>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

          {/* ── Work report ─────────────────────────────────────────────── */}
          <Card className="lg:col-span-2 rounded-2xl overflow-hidden gap-0 py-0">

            {/* Report letterhead */}
            <div className="px-5 sm:px-6 py-4 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 text-[#E8450F]">
                    <ClipboardList className="w-4 h-4" />
                    <span className="text-[10px] font-extrabold uppercase tracking-[0.14em]">Workshop work report</span>
                  </div>
                  <div className="text-lg font-black text-slate-900 dark:text-slate-100 mt-1">
                    {record.workshop_name || 'Unnamed workshop'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {typeMeta.label} · {vehicle ? vehicle.plate_number : 'No vehicle linked'}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Order no.</div>
                  <div className="text-sm font-mono font-black text-slate-900 dark:text-slate-100">{orderNo}</div>
                  <div className="text-[10px] text-slate-500 mt-1 font-mono">{formatDate(record.service_date)}</div>
                </div>
              </div>
            </div>

            <CardContent className="px-5 sm:px-6 py-5 space-y-5">

              {/* Scope of work */}
              <section>
                <h3 className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400 mb-2">
                  Scope of work performed
                </h3>
                {record.work_done ? (
                  <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed border-l-2 border-[#E8450F]/40 pl-3.5">
                    {record.work_done}
                  </p>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-slate-500 py-5 justify-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                    <AlertCircle className="w-4 h-4" />
                    No work details recorded for this service order.
                  </div>
                )}
              </section>

              {record.remarks && (
                <section>
                  <h3 className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400 mb-2">
                    Technician remarks
                  </h3>
                  <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed rounded-xl bg-slate-50 dark:bg-slate-800/40 p-3.5 border border-slate-100 dark:border-slate-800">
                    {record.remarks}
                  </p>
                </section>
              )}

              <Separator />

              {/* Service record */}
              <section>
                <h3 className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400 mb-1">
                  Service record
                </h3>
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
              </section>
            </CardContent>
          </Card>

          {/* ── Side column ─────────────────────────────────────────────── */}
          <div className="space-y-5">

            {/* Vehicle */}
            <Card className="rounded-2xl">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3 flex flex-row items-center justify-between gap-3">
                <CardTitle className="text-sm font-extrabold flex items-center gap-2">
                  <Truck className="w-4 h-4 text-[#E8450F]" /> Vehicle
                </CardTitle>
                {vehicle && (
                  <button
                    type="button"
                    onClick={() => navigate(`/vehicles/${vehicle.id}`)}
                    className="text-[11px] font-bold text-[#E8450F] hover:underline inline-flex items-center gap-1"
                  >
                    View <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </CardHeader>

              <CardContent className="px-4 pb-4">
                {vehicle ? (
                  <>
                    <div className="rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 px-3.5 py-3 mb-1">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Plate number</div>
                      <div className="text-lg font-mono font-black text-slate-900 dark:text-slate-100 tracking-wider">
                        {vehicle.plate_number}
                      </div>
                    </div>
                    <Field label="Reference ID" value={vehicle.ref_id || EMPTY} mono />
                    <Field label="Asset type" value={vehicle.asset_type} />
                    <Field label="Vehicle status" value={vehicle.status} />
                    <Field
                      label="Current odometer"
                      value={`${(vehicle.current_odometer || 0).toLocaleString()} km`}
                      mono
                    />
                  </>
                ) : (
                  <p className="text-xs text-slate-500 py-4 text-center">No vehicle is linked to this record.</p>
                )}
              </CardContent>
            </Card>

            {/* Workshop */}
            <Card className="rounded-2xl">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <CardTitle className="text-sm font-extrabold flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-500" /> Workshop
                </CardTitle>
              </CardHeader>

              <CardContent className="px-4 pb-4 space-y-3">
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
        </div>

        {/* ── Invoice ────────────────────────────────────────────────────── */}
        <Card className="rounded-2xl">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3 flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="text-sm font-extrabold flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-500" /> Invoice
              </CardTitle>
              <CardDescription className="text-xs">
                Billing recorded against this order, plus the invoice issued by the workshop.
              </CardDescription>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Total</div>
              <div className="text-xl font-mono font-black text-slate-900 dark:text-slate-100">
                {formatSAR(record.cost)}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Billing summary */}
            <div>
              <h3 className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400 mb-1">
                Billing details
              </h3>
              <Field label="Invoice number" value={record.invoice_number || EMPTY} mono />
              <Field label="Workshop" value={record.workshop_name || EMPTY} />
              <Field label="Maintenance type" value={typeMeta.label} />
              <Field label="Status" value={statusMeta.label} />
              <Field label="Recorded on" value={formatDate(record.createdAt)} mono />
            </div>

            {/* Uploaded workshop invoices */}
            <div>
              <h3 className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400 mb-2">
                Workshop invoice ({invoiceDocs.length})
              </h3>

              <div className="space-y-2">
                {invoiceDocs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center gap-1.5 py-6 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                    <Paperclip className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                    <p className="text-xs text-slate-500">No invoice uploaded yet.</p>
                    <p className="text-[10px] text-slate-400">Attach the bill issued by the workshop below.</p>
                  </div>
                ) : (
                  invoiceDocs.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30"
                    >
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {doc.file_url.split('/').pop()}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {formatDate(doc.createdAt)} · {doc.status}
                        </div>
                      </div>
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 shrink-0"
                        title="Open invoice"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={() => setDocToDelete(doc)}
                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 shrink-0"
                        title="Remove invoice"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Upload */}
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                {uploadError && (
                  <div className="mb-2 p-2.5 rounded-lg bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 text-[11px] font-bold flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={(e) => {
                      setInvoiceFile(e.target.files?.[0] ?? null);
                      setUploadError('');
                    }}
                    className="h-9 text-xs file:text-xs file:font-bold file:mr-2 cursor-pointer"
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={!invoiceFile || uploadMutation.isPending}
                    onClick={() => invoiceFile && uploadMutation.mutate(invoiceFile)}
                    className="h-9 shrink-0 gap-1.5 text-xs font-bold bg-[#E8450F] hover:bg-[#d03c0b] text-white"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {uploadMutation.isPending ? 'Uploading…' : 'Upload'}
                  </Button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5">PDF or image, up to the server upload limit.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Edit modal ───────────────────────────────────────────────────── */}
      <Dialog open={isEditModalOpen} onOpenChange={(open) => !open && setIsEditModalOpen(false)}>
        <DialogContent className="max-w-3xl rounded-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
          <DialogHeader className="px-6 py-3.5 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <DialogTitle className="text-base font-extrabold flex items-center gap-2">
              <Wrench className="w-5 h-5 text-[#E8450F]" /> Edit service order {orderNo}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-0.5">
              Changes are applied immediately to the maintenance record.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="flex-1 overflow-y-auto p-5 space-y-3.5 text-xs">
            {editError && (
              <div className="p-3 rounded-lg bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Maintenance type *</Label>
                <Select
                  value={editFormData.maintenance_type}
                  onValueChange={(val: MaintenanceType) => setEditFormData(prev => ({ ...prev, maintenance_type: val }))}
                >
                  <SelectTrigger className="h-8.5 text-xs w-full">
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

              <div className="space-y-1">
                <Label className="text-xs font-bold">Status *</Label>
                <Select
                  value={editFormData.status}
                  onValueChange={(val: MaintenanceStatus) => setEditFormData(prev => ({ ...prev, status: val }))}
                >
                  <SelectTrigger className="h-8.5 text-xs w-full">
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

              <div className="space-y-1">
                <Label className="text-xs font-bold">Cost (SAR) *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editFormData.cost}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, cost: parseFloat(e.target.value) || 0 }))}
                  className="h-8.5 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Start date</Label>
                <Input
                  type="date"
                  value={editFormData.start_date}
                  onChange={(e) => {
                    const start_date = e.target.value;
                    setEditFormData(prev => ({
                      ...prev,
                      start_date,
                      end_date: prev.end_date && prev.end_date < start_date ? start_date : prev.end_date,
                    }));
                  }}
                  className="h-8.5 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Completion date</Label>
                <Input
                  type="date"
                  value={editFormData.end_date || ''}
                  min={editFormData.start_date || undefined}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, end_date: e.target.value }))}
                  className="h-8.5 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Next service due</Label>
                <Input
                  type="date"
                  value={editFormData.next_service_due || ''}
                  min={editFormData.start_date || undefined}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, next_service_due: e.target.value }))}
                  className="h-8.5 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Workshop name *</Label>
                <WorkshopField
                  value={editFormData.workshop_name}
                  onChange={(name) => setEditFormData(prev => ({ ...prev, workshop_name: name }))}
                  onPick={(w) => setEditFormData(prev => ({ ...prev, workshop_contact: w.contact ?? prev.workshop_contact }))}
                  className="h-8.5"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Workshop contact</Label>
                <Input
                  value={editFormData.workshop_contact || ''}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, workshop_contact: e.target.value }))}
                  className="h-8.5 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Odometer reading (km)</Label>
                <Input
                  type="number"
                  min="0"
                  value={editFormData.odometer_reading}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, odometer_reading: parseFloat(e.target.value) || 0 }))}
                  className="h-8.5 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Invoice number</Label>
                <Input
                  value={editFormData.invoice_number || ''}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, invoice_number: e.target.value }))}
                  className="h-8.5 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Work done *</Label>
                <Textarea
                  value={editFormData.work_done || ''}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, work_done: e.target.value }))}
                  rows={2.5}
                  className="text-xs resize-none p-2.5"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Remarks</Label>
                <Textarea
                  value={editFormData.remarks || ''}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, remarks: e.target.value }))}
                  rows={2.5}
                  className="text-xs resize-none p-2.5"
                />
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 shrink-0">
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditModalOpen(false)} className="text-xs h-8.5">
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={updateMutation.isPending}
                className="text-xs h-8.5 bg-[#E8450F] hover:bg-[#d03c0b] text-white font-bold px-4"
              >
                {updateMutation.isPending ? 'Saving…' : 'Save changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete record modal ──────────────────────────────────────────── */}
      <Dialog open={isDeleteModalOpen} onOpenChange={(open) => !open && setIsDeleteModalOpen(false)}>
        <DialogContent className="max-w-md rounded-2xl p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <DialogTitle className="text-base font-extrabold">Delete service order</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500 mt-1">
              This deletes service order <strong className="font-mono text-slate-900 dark:text-slate-100">{orderNo}</strong>
              {vehicle ? <> for vehicle <strong className="text-slate-900 dark:text-slate-100">{vehicle.plate_number}</strong></> : null}.
              The order number is released and will be reused by the next service order.
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

      {/* ── Delete invoice modal ─────────────────────────────────────────── */}
      <Dialog open={!!docToDelete} onOpenChange={(open) => !open && setDocToDelete(null)}>
        <DialogContent className="max-w-md rounded-2xl p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <DialogTitle className="text-base font-extrabold">Remove invoice</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500 mt-1">
              Remove <strong className="text-slate-900 dark:text-slate-100">{docToDelete?.file_url.split('/').pop()}</strong> from
              this service order?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setDocToDelete(null)} className="text-xs">
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={deleteDocMutation.isPending}
              onClick={() => docToDelete && deleteDocMutation.mutate(docToDelete.id)}
              className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold px-4"
            >
              {deleteDocMutation.isPending ? 'Removing…' : 'Remove invoice'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </DashboardLayout>
  );
}
