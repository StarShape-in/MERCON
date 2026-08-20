import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Wrench,
  RotateCcw,
  Truck,
  Calendar,
  DollarSign,
  Gauge,
  Phone,
  UploadCloud,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  Building2,
  FileSpreadsheet
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import WorkshopField from '@/components/fleet/WorkshopField';
import WorkDoneSelect from '@/components/maintenance/WorkDoneSelect';
import { 
  maintenanceService, 
  CreateMaintenancePayload, 
  MaintenanceType, 
  MaintenanceStatus 
} from '@/services/maintenanceService';
import { vehicleService } from '@/services/vehicleService';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const TODAY_ISO = new Date().toISOString().split('T')[0];

export interface MaintenanceDocumentFile {
  id: string;
  name: string;
  size: string;
  type: string;
}

export default function AddMaintenancePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const initialVehicleId = searchParams.get('vehicle_id') || searchParams.get('vehicle') || '';

  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<CreateMaintenancePayload>({
    vehicle_id: initialVehicleId,
    workshop_name: '',
    workshop_contact: '',
    maintenance_type: 'Routine',
    status: 'In_Progress',
    start_date: TODAY_ISO,
    end_date: TODAY_ISO,
    work_done: '',
    odometer_reading: 0,
    cost: 0,
    invoice_number: '',
    remarks: '',
  });

  const [costInput, setCostInput] = useState<string>('');
  const [odometerInput, setOdometerInput] = useState<string>('');
  const [files, setFiles] = useState<MaintenanceDocumentFile[]>([]);

  // Fetch Vehicles for dropdown
  const { data: vehiclesRes } = useQuery({
    queryKey: ['vehicles-select'],
    queryFn: () => vehicleService.getAll({ per_page: 200, mode: 'lookup' }),
  });

  const vehicles = vehiclesRes?.data || [];

  // When vehicles load or vehicle selection changes, update default vehicle & odometer
  useEffect(() => {
    if (vehicles.length > 0) {
      const selectedId = formData.vehicle_id || initialVehicleId || vehicles[0].id;
      const foundVehicle = vehicles.find((v) => v.id === selectedId);
      const odo = foundVehicle?.current_odometer || 0;

      if (!formData.vehicle_id || formData.vehicle_id !== selectedId) {
        setFormData((prev) => ({
          ...prev,
          vehicle_id: selectedId,
          odometer_reading: prev.odometer_reading || odo,
        }));
        setOdometerInput((prev) => prev || (odo ? String(odo) : ''));
      }
    }
  }, [vehicles, initialVehicleId]);

  const selectedVehicle = vehicles.find((v) => v.id === formData.vehicle_id);

  const handleVehicleChange = (val: string) => {
    const v = vehicles.find((item) => item.id === val);
    const newOdo = v?.current_odometer || 0;
    setFormData((prev) => ({
      ...prev,
      vehicle_id: val,
      odometer_reading: newOdo,
    }));
    setOdometerInput(newOdo ? String(newOdo) : '');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const uploadedFiles = Array.from(e.target.files).map((f, i) => ({
        id: String(Date.now() + i),
        name: f.name,
        size: (f.size / 1024).toFixed(1) + ' KB',
        type: f.type || 'Invoice/Document',
      }));
      setFiles((prev) => [...prev, ...uploadedFiles]);
    }
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleReset = () => {
    const defaultVehicle = vehicles[0];
    const defaultOdo = defaultVehicle?.current_odometer || 0;
    setFormData({
      vehicle_id: defaultVehicle?.id || '',
      workshop_name: '',
      workshop_contact: '',
      maintenance_type: 'Routine',
      status: 'In_Progress',
      start_date: TODAY_ISO,
      end_date: TODAY_ISO,
      work_done: '',
      odometer_reading: defaultOdo,
      cost: 0,
      invoice_number: '',
      remarks: '',
    });
    setCostInput('');
    setOdometerInput(defaultOdo ? String(defaultOdo) : '');
    setFiles([]);
    setError(null);
  };

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: (payload: CreateMaintenancePayload) => maintenanceService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-performance'] });
      navigate('/maintenance');
    },
    onError: (err: any) => {
      setError(err.response?.data?.error?.message || err.message || 'Failed to record maintenance');
    },
  });

  const isFormValid = formData.vehicle_id !== '' && formData.workshop_name.trim() !== '';

  const handleSubmit = useCallback(() => {
    setError(null);

    if (!formData.vehicle_id) {
      setError('Please select a vehicle');
      return;
    }
    if (!formData.workshop_name.trim()) {
      setError('Workshop / Service Center name is required');
      return;
    }

    createMutation.mutate(formData);
  }, [formData, createMutation]);

  // Completion Tracking
  const completionFields = [
    { label: 'Vehicle Selection', filled: formData.vehicle_id !== '' },
    { label: 'Workshop Name', filled: formData.workshop_name.trim() !== '' },
    { label: 'Maintenance Type', filled: !!formData.maintenance_type },
    { label: 'Service Cost', filled: (formData.cost || 0) > 0 },
    { label: 'Odometer Reading', filled: (formData.odometer_reading || 0) > 0 },
  ];
  const filledCount = completionFields.filter(f => f.filled).length;
  const completionPct = Math.round((filledCount / completionFields.length) * 100);

  return (
    <DashboardLayout active="Maintenance" title="Log New Maintenance">
      <div className="px-3 sm:px-5 pb-4 space-y-3 animate-fade-in max-w-[1350px] mx-auto">
        
        {/* Slim Top Action Strip */}
        <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-400 font-bold border-none text-[11px] px-2 py-0.5">
              <Wrench className="w-3 h-3 mr-1 inline text-rose-600" /> New Maintenance Log
            </Badge>
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">• Fleet Maintenance & Garage Orders</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleReset}
              className="h-7 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 px-2"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/maintenance')}
              className="h-7 text-xs font-medium border-slate-200 dark:border-slate-800 px-2.5"
            >
              Cancel
            </Button>
            <Button 
              size="sm" 
              onClick={handleSubmit}
              disabled={createMutation.isPending || !isFormValid}
              className="h-7 text-xs bg-brand hover:bg-brand-hover text-white font-bold px-3 shadow-xs"
            >
              {createMutation.isPending ? 'Saving...' : 'Save Maintenance Record'}
            </Button>
          </div>
        </div>

        {/* 2-Column Balanced Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          
          {/* Main Form Column (8 cols) */}
          <div className="lg:col-span-8 space-y-3">
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl shadow-2xs">
              <CardContent className="p-3.5 sm:p-4 space-y-3.5">

                {/* Section 1: Vehicle & Classification */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-brand" /> Vehicle & Maintenance Type
                    </h2>
                    <span className="text-[10px] text-slate-400 font-mono">* Required fields</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="space-y-1 sm:col-span-1">
                      <Label htmlFor="vehicle_id" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        Target Vehicle <span className="text-rose-500">*</span>
                      </Label>
                      <Select
                        value={formData.vehicle_id}
                        onValueChange={handleVehicleChange}
                      >
                        <SelectTrigger id="vehicle_id" className="h-8 text-xs font-medium">
                          <SelectValue placeholder="Select vehicle..." />
                        </SelectTrigger>
                        <SelectContent>
                          {vehicles.map((v) => (
                            <SelectItem key={v.id} value={v.id} className="text-xs font-mono">
                              {v.plate_number} ({v.asset_type}) • {v.current_odometer ? `${v.current_odometer.toLocaleString()} km` : 'No odo'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="maintenance_type" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        Maintenance Type <span className="text-rose-500">*</span>
                      </Label>
                      <Select
                        value={formData.maintenance_type}
                        onValueChange={(val: MaintenanceType) => setFormData(prev => ({ ...prev, maintenance_type: val }))}
                      >
                        <SelectTrigger id="maintenance_type" className="h-8 text-xs">
                          <SelectValue placeholder="Select type..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Routine" className="text-xs">Routine Service / Maintenance</SelectItem>
                          <SelectItem value="Repair" className="text-xs">Repair & Mechanical Fix</SelectItem>
                          <SelectItem value="Inspection" className="text-xs">Periodic Inspection (Fahs)</SelectItem>
                          <SelectItem value="Renewal" className="text-xs">Renewal / Registration</SelectItem>
                          <SelectItem value="Emergency" className="text-xs">Emergency Breakdown</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="status" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        Status <span className="text-rose-500">*</span>
                      </Label>
                      <Select
                        value={formData.status}
                        onValueChange={(val: MaintenanceStatus) => setFormData(prev => ({ ...prev, status: val }))}
                      >
                        <SelectTrigger id="status" className="h-8 text-xs">
                          <SelectValue placeholder="Select status..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Scheduled" className="text-xs">Scheduled (Upcoming)</SelectItem>
                          <SelectItem value="In_Progress" className="text-xs">In Progress (At Workshop)</SelectItem>
                          <SelectItem value="Completed" className="text-xs">Completed (Done)</SelectItem>
                          <SelectItem value="Cancelled" className="text-xs">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Section 2: Service Timing & Odometer */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-blue-500" /> Service Dates & Odometer
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="space-y-1">
                      <Label htmlFor="start_date" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        Start Date
                      </Label>
                      <Input
                        id="start_date"
                        type="date"
                        value={formData.start_date || TODAY_ISO}
                        onChange={(e) => {
                          const start = e.target.value;
                          setFormData(prev => ({
                            ...prev,
                            start_date: start,
                            end_date: prev.end_date && prev.end_date < start ? start : prev.end_date,
                          }));
                        }}
                        className="h-8 text-xs font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="end_date" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        {formData.status === 'Scheduled' ? 'Expected Completion' : 'Completion Date'}
                      </Label>
                      <Input
                        id="end_date"
                        type="date"
                        value={formData.end_date || ''}
                        min={formData.start_date || undefined}
                        onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                        className="h-8 text-xs font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="odometer_reading" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        Odometer Reading (KM)
                      </Label>
                      <div className="relative">
                        <Gauge className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                        <Input
                          id="odometer_reading"
                          type="number"
                          min="0"
                          step="1"
                          value={odometerInput}
                          onChange={(e) => {
                            const val = e.target.value;
                            setOdometerInput(val);
                            const parsed = parseInt(val, 10);
                            setFormData(prev => ({ ...prev, odometer_reading: isNaN(parsed) ? 0 : parsed }));
                          }}
                          placeholder="0"
                          className="h-8 pl-8 text-xs font-mono font-semibold"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 3: Workshop / Service Center */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-purple-500" /> Workshop & Service Garage
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="space-y-1 sm:col-span-2">
                      <Label htmlFor="workshop_name" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        Workshop / Garage Name <span className="text-rose-500">*</span>
                      </Label>
                      <WorkshopField
                        value={formData.workshop_name}
                        onChange={(name) => setFormData(prev => ({ ...prev, workshop_name: name }))}
                        onPick={(w) => setFormData(prev => ({
                          ...prev,
                          workshop_name: w.name,
                          workshop_contact: (w.contact !== undefined && w.contact !== null) ? w.contact : prev.workshop_contact,
                        }))}
                        placeholder="Select from directory or enter garage name..."
                        className="h-8 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="workshop_contact" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        Garage Contact Phone
                      </Label>
                      <div className="relative">
                        <Phone className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                        <Input
                          id="workshop_contact"
                          value={formData.workshop_contact || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, workshop_contact: e.target.value }))}
                          placeholder="+966 5X XXX XXXX"
                          className="h-8 pl-8 text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 4: Cost & Invoicing */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Financials & Invoicing
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <Label htmlFor="cost" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        Total Maintenance Cost (SAR)
                      </Label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1.5 font-mono text-xs font-bold text-slate-400">SAR</span>
                        <Input
                          id="cost"
                          type="number"
                          min="0"
                          step="0.01"
                          value={costInput}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCostInput(val);
                            const parsed = parseFloat(val);
                            setFormData(prev => ({ ...prev, cost: isNaN(parsed) ? 0 : parsed }));
                          }}
                          placeholder="0.00"
                          className="h-8 pl-12 text-xs font-mono font-semibold"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="invoice_number" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        Garage Invoice #
                      </Label>
                      <Input
                        id="invoice_number"
                        placeholder="e.g. INV-2026-0091"
                        value={formData.invoice_number || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, invoice_number: e.target.value }))}
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 5: Service Scope & Work Done */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-500" /> Work Performed & Notes
                    </h2>
                  </div>

                  <div className="space-y-2">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        Quick Work Items
                      </Label>
                      <WorkDoneSelect
                        value={formData.work_done || ''}
                        onChange={(val) => setFormData(prev => ({ ...prev, work_done: val }))}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="remarks" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        Detailed Service Remarks / Operational Notes
                      </Label>
                      <Textarea
                        id="remarks"
                        rows={2}
                        placeholder="Enter extra details, replaced parts, technician recommendations..."
                        value={formData.remarks || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                        className="min-h-[50px] text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 6: Maintenance Attachments & Invoices */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-emerald-500" /> Maintenance Attachments ({files.length})
                    </h2>
                    <span className="text-[10px] text-slate-400 font-medium">Workshop Receipts, Invoices, Inspection Sheet</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                    <label className="sm:col-span-5 border border-dashed border-slate-300 dark:border-slate-700 hover:border-brand dark:hover:border-brand rounded-lg p-2.5 text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-900/50 block">
                      <input type="file" multiple onChange={handleFileUpload} className="hidden" />
                      <UploadCloud className="w-4 h-4 mx-auto text-slate-400 mb-0.5" />
                      <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        Upload Invoices / Receipts
                      </p>
                      <p className="text-[9px] text-slate-400">PDF, PNG, JPG (Max 10MB)</p>
                    </label>

                    <div className="sm:col-span-7 space-y-1 max-h-[100px] overflow-y-auto pr-1">
                      {files.length === 0 ? (
                        <div className="p-2 border border-slate-100 dark:border-slate-800 rounded-md text-[10px] text-slate-400 italic text-center">
                          No workshop documents attached yet
                        </div>
                      ) : (
                        files.map((file) => (
                          <div key={file.id} className="flex items-center justify-between p-1.5 px-2 bg-slate-100/70 dark:bg-slate-800/60 rounded-md border border-slate-200/60 dark:border-slate-700/60 text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="w-3.5 h-3.5 text-brand shrink-0" />
                              <span className="truncate text-[11px] font-medium text-slate-800 dark:text-slate-200">{file.name}</span>
                              <span className="text-[9px] text-slate-400 font-mono shrink-0">({file.size})</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFile(file.id)}
                              className="text-slate-400 hover:text-rose-500 p-0.5 ml-1"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

              </CardContent>
            </Card>

            {error && (
              <div className="p-2.5 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 rounded-lg text-xs font-semibold border border-rose-200 dark:border-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Right Sidebar Column (4 cols) */}
          <div className="lg:col-span-4 space-y-3 sticky top-2">
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-3.5 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Maintenance Summary</span>
                <Badge variant="outline" className="text-[10px] font-mono text-brand border-orange-200">
                  {completionPct}% Complete
                </Badge>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 flex items-center justify-center font-bold text-xs shrink-0 border border-rose-200 dark:border-rose-900/50">
                    <Wrench className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {formData.maintenance_type} Service
                    </p>
                    <span className="text-[10px] text-slate-500 block">
                      Status: <strong className="text-slate-800 dark:text-slate-200">{formData.status}</strong>
                    </span>
                  </div>
                </div>

                {/* Selected Vehicle Details */}
                <div className="space-y-1 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[9px] text-slate-400 uppercase font-bold block">Target Vehicle</span>
                  <p className="text-[11px] font-mono font-bold text-slate-800 dark:text-slate-200 truncate">
                    {selectedVehicle ? `${selectedVehicle.plate_number} (${selectedVehicle.asset_type})` : 'Vehicle Not Selected'}
                  </p>
                  {formData.odometer_reading > 0 && (
                    <span className="text-[10px] text-slate-500 font-mono block">
                      Odometer: {formData.odometer_reading.toLocaleString()} km
                    </span>
                  )}
                </div>

                {/* Workshop Details */}
                <div className="space-y-1 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[9px] text-slate-400 uppercase font-bold block">Service Workshop</span>
                  <p className="text-[11px] font-medium text-slate-800 dark:text-slate-200 truncate">
                    {formData.workshop_name || 'Garage Not Specified'}
                  </p>
                  {formData.workshop_contact && (
                    <span className="text-[10px] text-slate-500 font-mono block">
                      Contact: {formData.workshop_contact}
                    </span>
                  )}
                </div>

                {/* Cost & Invoice */}
                <div className="space-y-1 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[9px] text-slate-400 uppercase font-bold block">Total Expense</span>
                  <p className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    SAR {(formData.cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  {formData.invoice_number && (
                    <span className="text-[10px] text-slate-500 font-mono block">
                      Invoice: {formData.invoice_number}
                    </span>
                  )}
                </div>

                {/* Documents Summary */}
                <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[10px]">
                  <span className="text-slate-500 font-semibold">Attached Invoices</span>
                  <Badge variant="secondary" className="text-[9px] font-bold px-1.5 py-0 h-4">
                    {files.length} {files.length === 1 ? 'File' : 'Files'}
                  </Badge>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
                <div className="flex justify-between text-[10px] font-semibold text-slate-500">
                  <span>Requirements</span>
                  <span>{filledCount} of {completionFields.length}</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-brand h-full transition-all duration-300 rounded-full"
                    style={{ width: `${completionPct}%` }}
                  />
                </div>
              </div>

              <Button 
                size="sm" 
                onClick={handleSubmit} 
                disabled={createMutation.isPending || !isFormValid}
                className="w-full h-8 text-xs bg-brand hover:bg-brand-hover text-white font-bold shadow-xs mt-1"
              >
                {createMutation.isPending ? 'Saving...' : 'Save Maintenance Record'}
              </Button>
            </Card>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}
