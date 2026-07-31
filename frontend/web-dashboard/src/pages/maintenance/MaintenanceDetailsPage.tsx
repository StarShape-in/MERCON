import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, Edit2, Wrench, Truck, Calendar, Clock, CheckCircle2, 
  AlertTriangle, DollarSign, FileText, Phone, Building2, Gauge, 
  Trash2, ShieldCheck, Tag, ExternalLink, AlertCircle, RotateCw
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

import { maintenanceService, MaintenanceRecord, CreateMaintenancePayload, MaintenanceType, MaintenanceStatus } from '@/services/maintenanceService';
import { vehicleService } from '@/services/vehicleService';
import { cn } from '@/lib/utils';

export default function MaintenanceDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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
    remarks: '',
  });
  const [editError, setEditError] = useState('');

  // Fetch single maintenance record
  const { data: record, isLoading, error, refetch } = useQuery({
    queryKey: ['maintenance-detail', id],
    queryFn: () => maintenanceService.getById(id!),
    enabled: !!id,
  });

  // Mutations
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
        <div className="px-6 pb-6 max-w-[1400px] mx-auto w-full space-y-5 animate-pulse">
          <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl w-1/4"></div>
          <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
          <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !record) {
    return (
      <DashboardLayout active="Vehicles" title="Maintenance Details">
        <div className="px-6 pb-6 max-w-[1400px] mx-auto w-full flex flex-col items-center justify-center text-center h-[60vh] gap-3">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">Record Not Found</h2>
          <p className="text-xs text-slate-500 max-w-md">
            The requested maintenance record does not exist or has been removed from the MERCON roster.
          </p>
          <Button onClick={() => navigate('/maintenance')} size="sm" className="mt-2 text-xs font-bold bg-[#E8450F] text-white">
            Return to Maintenance List
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const vehicle = record.vehicle;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'In_Progress':
      case 'In Progress':
        return <Badge className="bg-amber-50 text-amber-700 border-amber-200 font-bold">IN PROGRESS</Badge>;
      case 'Scheduled':
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200 font-bold">SCHEDULED</Badge>;
      case 'Completed':
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold">COMPLETED</Badge>;
      case 'Cancelled':
        return <Badge className="bg-rose-50 text-rose-700 border-rose-200 font-bold">CANCELLED</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'Renewal':
        return <Badge className="bg-purple-50 text-purple-700 border-purple-200 font-bold">RENEWAL / ISTIMARA</Badge>;
      case 'Repair':
        return <Badge className="bg-rose-50 text-rose-700 border-rose-200 font-bold">REPAIR</Badge>;
      case 'Inspection':
        return <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 font-bold">INSPECTION</Badge>;
      case 'Emergency':
        return <Badge className="bg-amber-50 text-amber-700 border-amber-200 font-bold">EMERGENCY</Badge>;
      default:
        return <Badge className="bg-slate-100 text-slate-700 border-slate-200 font-bold">ROUTINE SERVICE</Badge>;
    }
  };

  // Status timeline steps
  const steps = [
    { label: 'Scheduled', key: 'Scheduled', isDone: true },
    { label: 'In Progress', key: 'In_Progress', isDone: record.status === 'In_Progress' || record.status === 'Completed' },
    { label: 'Completed', key: 'Completed', isDone: record.status === 'Completed' },
  ];

  return (
    <DashboardLayout active="Vehicles" title={`Maintenance: ${record.id.slice(0, 8)}`}>
      <div className="px-6 pb-6 space-y-6 animate-fade-in max-w-[1400px] mx-auto w-full">

        {/* ── 1. Page Header & Actions ──────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/maintenance')}
              className="h-9 w-9 p-0 text-slate-600 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs"
              title="Back to Maintenance List"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                  Maintenance Log #{record.id.slice(0, 8)}
                </h1>
                {getStatusBadge(record.status)}
                {getTypeBadge(record.maintenance_type)}
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Vehicle: <span className="font-extrabold text-slate-900 dark:text-slate-100">{vehicle?.plate_number || 'N/A'}</span> • Ref: <span className="font-mono text-slate-700 font-bold">{vehicle?.ref_id || 'TRK-N/A'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {record.status === 'Scheduled' && (
              <Button
                size="sm"
                onClick={() => handleQuickStatusChange('In_Progress')}
                className="h-9 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white"
              >
                Mark In Progress
              </Button>
            )}
            {record.status !== 'Completed' && (
              <Button
                size="sm"
                onClick={() => handleQuickStatusChange('Completed')}
                className="h-9 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Mark Completed
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenEditModal}
              className="h-9 gap-1.5 text-xs font-semibold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs text-slate-700 dark:text-slate-300"
            >
              <Edit2 className="w-3.5 h-3.5 text-slate-500" />
              Edit Record
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteModalOpen(true)}
              className="h-9 gap-1.5 text-xs font-semibold border-rose-200 bg-white hover:bg-rose-50 text-rose-600 shadow-2xs dark:bg-slate-900 dark:border-rose-900/50"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              Delete Record
            </Button>
          </div>
        </div>

        {/* ── 2. Maintenance Lifecycle Status Progress Tracker ─────────────── */}
        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs p-5">
          <div className="text-xs font-extrabold uppercase text-slate-400 tracking-wider mb-3">
            Service Execution Timeline Status
          </div>
          
          <div className="flex items-center justify-between relative">
            {/* Progress line */}
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-slate-100 dark:bg-slate-800 z-0"></div>
            
            {steps.map((step, idx) => (
              <div key={step.key} className="relative z-10 flex flex-col items-center gap-1.5 bg-white dark:bg-slate-900 px-3">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors",
                  step.isDone
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-400"
                )}>
                  {step.isDone ? <CheckCircle2 className="w-4 h-4 text-white" /> : idx + 1}
                </div>
                <span className={cn("text-xs font-extrabold", step.isDone ? "text-slate-900 dark:text-slate-100" : "text-slate-400")}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* ── 3. Main Details 2-Column Grid ───────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left Column (Work Done & Financial Expense) */}
          <div className="lg:col-span-2 space-y-6">

            {/* Section 1: Work Done Details Report */}
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-[#E8450F]" /> Service Work Performed ("What All Was Done")
                </CardTitle>
              </CardHeader>

              <CardContent className="p-5 space-y-4 text-xs">
                
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-2">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                    Full Service Summary & Replaced Components
                  </span>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                    {record.work_done || record.remarks || 'Standard routine maintenance and diagnostic inspection.'}
                  </p>
                </div>

                {/* Key Timestamps & Odometer */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Start Date ("When Put")</span>
                    <span className="text-xs font-mono font-extrabold text-slate-900 dark:text-slate-100 mt-1 block">
                      {record.start_date ? new Date(record.start_date).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Completion Date ("When Ends")</span>
                    <span className="text-xs font-mono font-extrabold text-slate-900 dark:text-slate-100 mt-1 block">
                      {record.end_date ? new Date(record.end_date).toLocaleDateString() : 'Pending Completion'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Odometer at Service</span>
                    <span className="text-xs font-mono font-extrabold text-indigo-600 dark:text-indigo-400 mt-1 block">
                      {(record.odometer_reading || 0).toLocaleString()} km
                    </span>
                  </div>

                </div>

                {record.remarks && (
                  <div className="p-3 rounded-xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50">
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 block uppercase">
                      Additional Technician Remarks
                    </span>
                    <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5">
                      {record.remarks}
                    </p>
                  </div>
                )}

              </CardContent>
            </Card>

            {/* Section 2: Expense & Financial Card */}
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-500" /> Maintenance Expense & Invoice Details
                </CardTitle>
              </CardHeader>

              <CardContent className="p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Expense Amount */}
                  <div className="p-4 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 flex flex-col justify-between">
                    <span className="text-[10px] font-extrabold uppercase text-rose-700 dark:text-rose-400">
                      Operational Expense Cost
                    </span>
                    <div className="text-2xl font-mono font-black text-rose-700 dark:text-rose-300 mt-2">
                      SAR {(record.cost || 0).toLocaleString()}
                    </div>
                    <span className="text-[10px] text-slate-500 font-semibold mt-1">
                      Calculated as vehicle expense
                    </span>
                  </div>

                  {/* Invoice Reference */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400">
                      Invoice Reference
                    </span>
                    <div className="text-lg font-mono font-extrabold text-slate-900 dark:text-slate-100 mt-2">
                      {record.invoice_number || 'INV-NOT-PROVIDED'}
                    </div>
                    <span className="text-[10px] text-slate-500 font-semibold mt-1">
                      Workshop billing ref
                    </span>
                  </div>

                </div>
              </CardContent>
            </Card>

          </div>

          {/* Right Column (Workshop Contact & Vehicle Identity) */}
          <div className="space-y-6">

            {/* Card 1: Workshop Info & Contact */}
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-500" /> Workshop Service Center
                </CardTitle>
              </CardHeader>

              <CardContent className="p-4 space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <div className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                    {record.workshop_name}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Authorized Heavy Commercial Workshop
                  </p>
                </div>

                {record.workshop_contact && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Contact Phone</div>
                      <div className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                        {record.workshop_contact}
                      </div>
                    </div>
                    <a
                      href={`tel:${record.workshop_contact}`}
                      className="p-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-300"
                      title="Call Workshop"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Card 2: Parent Vehicle Profile Link */}
            {vehicle && (
              <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Truck className="w-4 h-4 text-[#E8450F]" /> Vehicle Asset Profile
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => navigate(`/vehicles/${vehicle.id}`)}
                    className="h-7 text-xs font-bold text-indigo-600"
                  >
                    Profile →
                  </Button>
                </CardHeader>

                <CardContent className="p-4 space-y-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                        {vehicle.plate_number}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                        Ref: {vehicle.ref_id || 'TRK-N/A'} • {vehicle.asset_type}
                      </div>
                    </div>
                    <Badge variant="outline" className="font-bold text-[10px]">
                      {vehicle.status}
                    </Badge>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Current Vehicle Odometer</div>
                    <div className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                      {(vehicle.current_odometer || 0).toLocaleString()} km
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

          </div>

        </div>

      </div>

      {/* ── 4. Edit Record Modal ────────────────────────────────────────── */}
      <Dialog open={isEditModalOpen} onOpenChange={(open) => !open && setIsEditModalOpen(false)}>
        <DialogContent className="max-w-xl rounded-2xl p-0 overflow-hidden border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col">
          <DialogHeader className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 shrink-0">
            <DialogTitle className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-[#E8450F]" /> Edit Maintenance Record #{record.id.slice(0, 8)}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={(e) => {
            e.preventDefault();
            updateMutation.mutate(editFormData);
          }} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
            
            {editError && (
              <div className="p-3 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Maintenance Type *</Label>
                <Select
                  value={editFormData.maintenance_type}
                  onValueChange={(val: MaintenanceType) => setEditFormData(prev => ({ ...prev, maintenance_type: val }))}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Routine">Routine Service</SelectItem>
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
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select Status" />
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
                <Label className="text-xs font-bold">Cost / Expense (SAR) *</Label>
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
                <Label className="text-xs font-bold">Odometer Reading (km)</Label>
                <Input
                  type="number"
                  value={editFormData.odometer_reading}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, odometer_reading: parseFloat(e.target.value) || 0 }))}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Start Date</Label>
                <Input
                  type="date"
                  value={editFormData.start_date}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, start_date: e.target.value }))}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Completion Date</Label>
                <Input
                  type="date"
                  value={editFormData.end_date || ''}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, end_date: e.target.value }))}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Workshop Name *</Label>
                <Input
                  value={editFormData.workshop_name}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, workshop_name: e.target.value }))}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Workshop Contact Phone</Label>
                <Input
                  value={editFormData.workshop_contact || ''}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, workshop_contact: e.target.value }))}
                  className="h-9 text-xs"
                />
              </div>

            </div>

            <div className="space-y-1.5 pt-2">
              <Label className="text-xs font-bold">Work Done Details *</Label>
              <textarea
                value={editFormData.work_done || ''}
                onChange={(e) => setEditFormData(prev => ({ ...prev, work_done: e.target.value }))}
                rows={3}
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-[#E8450F]"
              />
            </div>

            <DialogFooter className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsEditModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={updateMutation.isPending}
                className="text-xs bg-[#E8450F] hover:bg-[#d03c0b] text-white font-bold px-4"
              >
                {updateMutation.isPending ? 'Updating...' : 'Update Record'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── 5. Delete Confirmation Modal ───────────────────────────────── */}
      <Dialog open={isDeleteModalOpen} onOpenChange={(open) => !open && setIsDeleteModalOpen(false)}>
        <DialogContent className="max-w-md rounded-2xl p-0 overflow-hidden border-slate-200 dark:border-slate-800">
          <DialogHeader className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-rose-50/50 dark:bg-rose-950/20">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <DialogTitle className="text-base font-extrabold">Delete Maintenance Record</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500 mt-1">
              Are you sure you want to delete this maintenance record for vehicle <strong className="text-slate-900 dark:text-slate-100">{vehicle?.plate_number}</strong>?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsDeleteModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
              className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold px-4"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Confirm Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </DashboardLayout>
  );
}
