import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Wrench, AlertTriangle, AlertCircle, ClipboardList, CheckCircle2, XCircle, CalendarDays, DollarSign, Phone, Truck } from 'lucide-react';

import WorkshopField from '@/components/fleet/WorkshopField';
import WorkDoneSelect from '@/components/maintenance/WorkDoneSelect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { maintenanceService, MaintenanceRecord, CreateMaintenancePayload, MaintenanceType, MaintenanceStatus } from '@/services/maintenanceService';
import { vehicleService } from '@/services/vehicleService';

const TODAY_ISO = new Date().toISOString().split('T')[0];

export interface MaintenanceRecordModalVehicle {
  id: string;
  plate_number: string;
  ref_id?: string | null;
  current_odometer?: number;
}

export interface MaintenanceRecordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialVehicleId?: string;
  bulkVehicles?: MaintenanceRecordModalVehicle[];
  editingRecord?: MaintenanceRecord | null;
  onSuccess?: () => void;
}

export default function MaintenanceRecordModal({
  open,
  onOpenChange,
  initialVehicleId,
  bulkVehicles = [],
  editingRecord = null,
  onSuccess,
}: MaintenanceRecordModalProps) {
  const queryClient = useQueryClient();

  const { data: vehiclesRes } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => vehicleService.getAll({ per_page: 100 }),
    enabled: open,
  });

  const vehicles = vehiclesRes?.data || [];

  const [formData, setFormData] = useState<CreateMaintenancePayload>({
    vehicle_id: '',
    workshop_name: '',
    workshop_contact: '',
    maintenance_type: 'Routine',
    status: 'Completed',
    start_date: TODAY_ISO,
    end_date: TODAY_ISO,
    work_done: '',
    odometer_reading: 0,
    cost: 0,
    remarks: '',
  });

  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    setFormError('');
    if (editingRecord) {
      setFormData({
        vehicle_id: editingRecord.vehicleId,
        workshop_name: editingRecord.workshop_name,
        workshop_contact: editingRecord.workshop_contact || '',
        maintenance_type: editingRecord.maintenance_type,
        status: editingRecord.status,
        start_date: editingRecord.start_date ? editingRecord.start_date.split('T')[0] : TODAY_ISO,
        end_date: editingRecord.end_date ? editingRecord.end_date.split('T')[0] : TODAY_ISO,
        work_done: editingRecord.work_done || '',
        odometer_reading: editingRecord.odometer_reading || 0,
        cost: editingRecord.cost || 0,
        remarks: editingRecord.remarks || '',
      });
    } else {
      const targetVehicleId = initialVehicleId || (bulkVehicles.length > 0 ? bulkVehicles[0].id : (vehicles[0]?.id || ''));
      const foundVehicle = vehicles.find((v) => v.id === targetVehicleId) || bulkVehicles.find((v) => v.id === targetVehicleId);

      setFormData({
        vehicle_id: targetVehicleId,
        workshop_name: '',
        workshop_contact: '',
        maintenance_type: 'Routine',
        status: 'Completed',
        start_date: TODAY_ISO,
        end_date: TODAY_ISO,
        work_done: '',
        odometer_reading: foundVehicle?.current_odometer || 0,
        cost: 0,
        remarks: '',
      });
    }
  }, [open, editingRecord, initialVehicleId, bulkVehicles, vehicles]);

  const handleVehicleChange = (val: string) => {
    const v = vehicles.find((item) => item.id === val);
    setFormData((prev) => ({
      ...prev,
      vehicle_id: val,
      odometer_reading: v?.current_odometer ?? prev.odometer_reading,
    }));
  };

  const invalidateCache = () => {
    queryClient.invalidateQueries({ queryKey: ['maintenance'] });
    queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    queryClient.invalidateQueries({ queryKey: ['vehicle'] });
    queryClient.invalidateQueries({ queryKey: ['workshops'] });
    queryClient.invalidateQueries({ queryKey: ['workItems'] });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const isBulk = !editingRecord && bulkVehicles.length > 1;

    if (!isBulk && !formData.vehicle_id) {
      setFormError('Please select a vehicle.');
      return;
    }
    if (!formData.workshop_name.trim()) {
      setFormError('Workshop / service center name is required.');
      return;
    }
    if (formData.end_date && formData.start_date && formData.end_date < formData.start_date) {
      setFormError('End date cannot be before the start date.');
      return;
    }

    setIsSaving(true);

    try {
      if (editingRecord) {
        await maintenanceService.update(editingRecord.id, formData);
      } else if (isBulk) {
        for (const v of bulkVehicles) {
          await maintenanceService.create({
            ...formData,
            vehicle_id: v.id,
            odometer_reading: v.current_odometer ?? formData.odometer_reading ?? 0,
          });
        }
      } else {
        await maintenanceService.create(formData);
      }

      invalidateCache();
      onSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      setFormError(err.response?.data?.error?.message || 'Failed to save maintenance record.');
    } finally {
      setIsSaving(false);
    }
  };

  const isBulk = !editingRecord && bulkVehicles.length > 1;

  const modalTitle = editingRecord
    ? 'Edit Maintenance Record'
    : isBulk
    ? `Add Maintenance (${bulkVehicles.length} Vehicles)`
    : 'Add Maintenance Record';

  const statusHint: Record<string, string> = {
    Scheduled: 'Future service — not yet started.',
    In_Progress: 'Vehicle is currently in the workshop.',
    Completed: 'Service finished — logging record.',
    Cancelled: 'Planned service that was cancelled.',
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !isSaving && onOpenChange(val)}>
      <DialogContent className="w-full max-w-[95vw] sm:max-w-xl md:max-w-2xl lg:max-w-3xl rounded-2xl p-0 overflow-hidden border-slate-200 dark:border-slate-800 max-h-[92vh] flex flex-col">
        
        {/* Header Bar */}
        <DialogHeader className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900 shrink-0">
          <DialogTitle className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-orange-50 dark:bg-orange-950/30 text-[#E8450F]">
              <ClipboardList className="w-5 h-5" />
            </div>
            <span>{modalTitle}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 mt-1">
            Log a completed repair, record an active workshop visit, or schedule future maintenance.
          </DialogDescription>
        </DialogHeader>

        {/* Form Body */}
        <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {isBulk && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Applying maintenance to {bulkVehicles.length} vehicles:{' '}
                {bulkVehicles.map((v) => v.plate_number).join(', ')}
              </span>
            </div>
          )}

          {/* Section 1: Asset & Status */}
          <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 space-y-3">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-[#E8450F]" />
              <span>Asset &amp; Classification</span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">

              {/* Vehicle Asset */}
              {!isBulk && (
                <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
                  <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">Vehicle Asset *</Label>
                  <Select
                    value={formData.vehicle_id}
                    onValueChange={handleVehicleChange}
                    disabled={!!editingRecord}
                  >
                    <SelectTrigger className="h-9 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-semibold">
                      <SelectValue placeholder="Select Vehicle" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.plate_number} ({v.ref_id || 'Ref N/A'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Maintenance Type */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">Maintenance Type *</Label>
                <Select
                  value={formData.maintenance_type}
                  onValueChange={(val: MaintenanceType) => setFormData(prev => ({ ...prev, maintenance_type: val }))}
                >
                  <SelectTrigger className="h-9 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
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

              {/* Status */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">Status *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(val: MaintenanceStatus) => setFormData(prev => ({ ...prev, status: val }))}
                >
                  <SelectTrigger className="h-9 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Completed">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <span>Completed</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="In_Progress">
                      <div className="flex items-center gap-1.5">
                        <Wrench className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        <span>In Progress</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="Scheduled">
                      <div className="flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                        <span>Scheduled</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="Cancelled">
                      <div className="flex items-center gap-1.5">
                        <XCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                        <span>Cancelled</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {statusHint[formData.status as string] && (
              <p className="text-[11px] text-slate-500 italic pt-0.5">{statusHint[formData.status as string]}</p>
            )}
          </div>

          {/* Section 2: Schedule & Workshop */}
          <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 space-y-3">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-[#E8450F]" />
              <span>Schedule &amp; Workshop Details</span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">

              {/* Start Date */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {formData.status === 'Scheduled' ? 'Scheduled Date *' : 'Service Date *'}
                </Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => {
                    const start_date = e.target.value;
                    setFormData(prev => ({
                      ...prev,
                      start_date,
                      end_date: prev.end_date && prev.end_date < start_date ? start_date : prev.end_date,
                    }));
                  }}
                  className="h-9 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                />
              </div>

              {/* End Date */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {formData.status === 'Scheduled' ? 'Expected Completion' : 'Completion Date'}
                </Label>
                <Input
                  type="date"
                  value={formData.end_date || ''}
                  min={formData.start_date || undefined}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                  className="h-9 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                />
              </div>

              {/* Workshop Name */}
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
                <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">Workshop / Service Center *</Label>
                <WorkshopField
                  value={formData.workshop_name}
                  onChange={(name) => setFormData(prev => ({ ...prev, workshop_name: name }))}
                  onPick={(w) => setFormData(prev => ({ ...prev, workshop_contact: w.contact ?? prev.workshop_contact }))}
                  placeholder="Select Saved Workshop"
                  className="h-9"
                />
              </div>

              {/* Workshop Contact */}
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
                <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">Workshop Contact Phone</Label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={formData.workshop_contact || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, workshop_contact: e.target.value }))}
                    placeholder="+966 5x xxx xxxx"
                    className="h-9 text-xs pl-8 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                  />
                </div>
              </div>

              {/* Expense Cost */}
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
                <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">Cost / Expense (SAR)</Label>
                <div className="relative">
                  <DollarSign className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.cost}
                    onChange={(e) => setFormData(prev => ({ ...prev, cost: parseFloat(e.target.value) || 0 }))}
                    placeholder="0.00"
                    className="h-9 text-xs pl-8 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-semibold"
                  />
                </div>
              </div>

            </div>
          </div>

          {/* Section 3: Work Done & Remarks */}
          <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 space-y-4">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5 text-[#E8450F]" />
              <span>Service Work &amp; Notes</span>
            </p>

            <WorkDoneSelect
              value={formData.work_done || ''}
              onChange={(text) => setFormData(prev => ({ ...prev, work_done: text }))}
            />

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">Additional Remarks / Internal Notes</Label>
              <textarea
                value={formData.remarks || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                placeholder="Internal notes, next service recommendations, spare parts installed..."
                rows={2.5}
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-[#E8450F] resize-none"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <DialogFooter className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
              className="text-xs h-9 font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSaving}
              className="text-xs h-9 bg-[#E8450F] hover:bg-[#d03c0b] text-white font-extrabold px-6 rounded-xl shadow-sm"
            >
              {isSaving ? 'Saving...' : editingRecord ? 'Update Record' : 'Save Maintenance Record'}
            </Button>
          </DialogFooter>

        </form>
      </DialogContent>
    </Dialog>
  );
}

// Re-export old name as alias so existing imports don't break during migration
export { MaintenanceRecordModal as ScheduleMaintenanceModal };
export type { MaintenanceRecordModalProps as ScheduleMaintenanceModalProps };
export type { MaintenanceRecordModalVehicle as ScheduleMaintenanceModalVehicle };
