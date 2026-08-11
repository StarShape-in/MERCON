import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Wrench, AlertTriangle, AlertCircle } from 'lucide-react';

import WorkshopField from '@/components/fleet/WorkshopField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { maintenanceService, MaintenanceRecord, CreateMaintenancePayload, MaintenanceType, MaintenanceStatus } from '@/services/maintenanceService';
import { vehicleService } from '@/services/vehicleService';

const TODAY_ISO = new Date().toISOString().split('T')[0];

export interface ScheduleMaintenanceModalVehicle {
  id: string;
  plate_number: string;
  ref_id?: string | null;
  current_odometer?: number;
}

export interface ScheduleMaintenanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialVehicleId?: string;
  bulkVehicles?: ScheduleMaintenanceModalVehicle[];
  editingRecord?: MaintenanceRecord | null;
  onSuccess?: () => void;
}

export default function ScheduleMaintenanceModal({
  open,
  onOpenChange,
  initialVehicleId,
  bulkVehicles = [],
  editingRecord = null,
  onSuccess,
}: ScheduleMaintenanceModalProps) {
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
    status: 'In_Progress',
    start_date: TODAY_ISO,
    end_date: TODAY_ISO,
    work_done: '',
    odometer_reading: 0,
    cost: 0,
    invoice_number: '',
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
        invoice_number: editingRecord.invoice_number || '',
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
        status: 'In_Progress',
        start_date: TODAY_ISO,
        end_date: TODAY_ISO,
        work_done: '',
        odometer_reading: foundVehicle?.current_odometer || 0,
        cost: 0,
        invoice_number: '',
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
      setFormError('Workshop name is required.');
      return;
    }
    if (!editingRecord && formData.start_date && formData.start_date < TODAY_ISO) {
      setFormError('Start date cannot be in the past — pick today or a later date.');
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
            odometer_reading: v.current_odometer ?? formData.odometer_reading,
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

  return (
    <Dialog open={open} onOpenChange={(val) => !isSaving && onOpenChange(val)}>
      <DialogContent className="max-w-3xl rounded-2xl p-0 overflow-hidden border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col">
        
        <DialogHeader className="px-6 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 shrink-0">
          <DialogTitle className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-[#E8450F]" />
            {editingRecord ? 'Edit Maintenance Record' : isBulk ? `Schedule Maintenance (${bulkVehicles.length} Vehicles)` : 'Schedule New Maintenance'}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 mt-0.5">
            Enter vehicle maintenance details, dates, costs, workshop information, and scope of work.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-5 space-y-3.5 text-xs">
          
          {formError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {isBulk && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Applying maintenance to {bulkVehicles.length} vehicles:{' '}
                {bulkVehicles.map((v) => v.plate_number).join(', ')}
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            
            {/* Vehicle Selection */}
            {!isBulk && (
              <div className="space-y-1">
                <Label className="text-xs font-bold">Vehicle Asset *</Label>
                <Select
                  value={formData.vehicle_id}
                  onValueChange={handleVehicleChange}
                  disabled={!!editingRecord}
                >
                  <SelectTrigger className="h-8.5 text-xs">
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
            <div className="space-y-1">
              <Label className="text-xs font-bold">Maintenance Type *</Label>
              <Select
                value={formData.maintenance_type}
                onValueChange={(val: MaintenanceType) => setFormData(prev => ({ ...prev, maintenance_type: val }))}
              >
                <SelectTrigger className="h-8.5 text-xs">
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
            <div className="space-y-1">
              <Label className="text-xs font-bold">Maintenance Status *</Label>
              <Select
                value={formData.status}
                onValueChange={(val: MaintenanceStatus) => setFormData(prev => ({ ...prev, status: val }))}
              >
                <SelectTrigger className="h-8.5 text-xs">
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

            {/* Start Date */}
            <div className="space-y-1">
              <Label className="text-xs font-bold">Start Date ("When Put") *</Label>
              <Input
                type="date"
                value={formData.start_date}
                min={editingRecord ? undefined : TODAY_ISO}
                onChange={(e) => {
                  const start_date = e.target.value;
                  setFormData(prev => ({
                    ...prev,
                    start_date,
                    end_date: prev.end_date && prev.end_date < start_date ? start_date : prev.end_date,
                  }));
                }}
                className="h-8.5 text-xs"
              />
            </div>

            {/* End Date */}
            <div className="space-y-1">
              <Label className="text-xs font-bold">End Date ("When Ends")</Label>
              <Input
                type="date"
                value={formData.end_date || ''}
                min={formData.start_date || (editingRecord ? undefined : TODAY_ISO)}
                onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                className="h-8.5 text-xs"
              />
            </div>

            {/* Expense Cost */}
            <div className="space-y-1">
              <Label className="text-xs font-bold">Cost / Renewal Expense (SAR) *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.cost}
                onChange={(e) => setFormData(prev => ({ ...prev, cost: parseFloat(e.target.value) || 0 }))}
                placeholder="0.00"
                className="h-8.5 text-xs"
              />
            </div>

            {/* Workshop Name */}
            <div className="space-y-1">
              <Label className="text-xs font-bold">Workshop / Service Center *</Label>
              <WorkshopField
                value={formData.workshop_name}
                onChange={(name) => setFormData(prev => ({ ...prev, workshop_name: name }))}
                onPick={(w) => setFormData(prev => ({ ...prev, workshop_contact: w.contact ?? prev.workshop_contact }))}
                placeholder="e.g. Al-Riyadh Heavy Fleet Service"
                className="h-8.5"
              />
            </div>

            {/* Workshop Contact */}
            <div className="space-y-1">
              <Label className="text-xs font-bold">Workshop Contact Phone</Label>
              <Input
                value={formData.workshop_contact || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, workshop_contact: e.target.value }))}
                placeholder="+966 5x xxx xxxx"
                className="h-8.5 text-xs"
              />
            </div>

            {/* Odometer Reading */}
            {!isBulk && (
              <div className="space-y-1">
                <Label className="text-xs font-bold">Odometer Reading (km)</Label>
                <Input
                  type="number"
                  value={formData.odometer_reading}
                  onChange={(e) => setFormData(prev => ({ ...prev, odometer_reading: parseFloat(e.target.value) || 0 }))}
                  placeholder="184500"
                  className="h-8.5 text-xs"
                />
              </div>
            )}

            {/* Invoice Number */}
            <div className="space-y-1">
              <Label className="text-xs font-bold">Invoice Ref Number</Label>
              <Input
                value={formData.invoice_number || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, invoice_number: e.target.value }))}
                placeholder="INV-9921"
                className="h-8.5 text-xs"
              />
            </div>

          </div>

          {/* Bottom section: Work details and remarks in 2 columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Work Done Details</Label>
              <textarea
                value={formData.work_done || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, work_done: e.target.value }))}
                placeholder="Specify all repairs, replaced parts, engine oil specs, brake pad renewals..."
                rows={2.5 as any}
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-[#E8450F] resize-none"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Additional Remarks / Notes</Label>
              <textarea
                value={formData.remarks || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                placeholder="Internal notes or next service recommendations"
                rows={2.5 as any}
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-[#E8450F] resize-none"
              />
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
              className="text-xs h-8.5"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSaving}
              className="text-xs h-8.5 bg-[#E8450F] hover:bg-[#d03c0b] text-white font-bold px-4"
            >
              {isSaving ? 'Saving...' : editingRecord ? 'Update Record' : 'Save Maintenance'}
            </Button>
          </DialogFooter>

        </form>
      </DialogContent>
    </Dialog>
  );
}
