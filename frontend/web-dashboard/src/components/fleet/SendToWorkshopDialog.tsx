import { useEffect, useState } from 'react';
import { AlertCircle, Wrench } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { maintenanceService, MaintenanceType } from '@/services/maintenanceService';
import WorkshopField from '@/components/fleet/WorkshopField';

export interface WorkshopVehicle {
  id: string;
  plate_number: string;
  current_odometer?: number;
}

interface SendToWorkshopDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicles: WorkshopVehicle[];
  onSuccess: () => void;
}

/**
 * Puts a vehicle in the workshop the only way that keeps both modules honest: by opening a
 * real service order (`In_Progress`), which the API then reflects onto `Vehicle.status`.
 *
 * Writing `Vehicle.status = 'Maintenance'` straight from the Vehicles page is what caused
 * the confusion this replaces — the vehicle said "Maintenance" while the Maintenance page
 * had nothing to show for it, and nothing existed to later mark completed.
 */
export default function SendToWorkshopDialog({
  open,
  onOpenChange,
  vehicles,
  onSuccess,
}: SendToWorkshopDialogProps) {
  const single = vehicles.length === 1 ? vehicles[0] : null;

  const [workshopName, setWorkshopName] = useState('');
  const [workshopContact, setWorkshopContact] = useState('');
  const [maintenanceType, setMaintenanceType] = useState<MaintenanceType>('Repair');
  const [odometer, setOdometer] = useState('');
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Reopening for another vehicle must not inherit the previous one's odometer.
  useEffect(() => {
    if (!open) return;
    setWorkshopName('');
    setWorkshopContact('');
    setMaintenanceType('Repair');
    setOdometer(single?.current_odometer != null ? String(single.current_odometer) : '');
    setRemarks('');
    setError('');
  }, [open, single?.id, single?.current_odometer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workshopName.trim()) {
      setError('Workshop name is required.');
      return;
    }

    setIsSaving(true);
    setError('');
    try {
      for (const vehicle of vehicles) {
        await maintenanceService.create({
          vehicle_id: vehicle.id,
          workshop_name: workshopName.trim(),
          workshop_contact: workshopContact.trim() || undefined,
          maintenance_type: maintenanceType,
          status: 'In_Progress',
          // Per-vehicle reading on a bulk send; the typed value only applies to a single one.
          odometer_reading: single
            ? parseFloat(odometer) || 0
            : vehicle.current_odometer ?? 0,
          remarks: remarks.trim() || undefined,
        });
      }
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to open the service order.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !isSaving && onOpenChange(next)}>
      <DialogContent className="max-w-lg rounded-2xl p-0 overflow-hidden border-slate-200 dark:border-slate-800">
        <DialogHeader className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900">
          <DialogTitle className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-amber-500" />
            {single ? `Send ${single.plate_number} to workshop` : `Send ${vehicles.length} vehicles to workshop`}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 mt-1">
            This opens a service order on the Maintenance page and moves the{' '}
            {single ? 'vehicle' : 'vehicles'} into Maintenance. Closing the order — or
            "Return to service" — brings {single ? 'it' : 'them'} back to Available.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!single && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-[11px] font-semibold text-amber-800 dark:text-amber-300">
              {vehicles.map((v) => v.plate_number).join(', ')}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Workshop *</Label>
              <WorkshopField
                value={workshopName}
                onChange={setWorkshopName}
                onPick={(w) => setWorkshopContact(w.contact ?? '')}
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Workshop contact</Label>
              <Input
                value={workshopContact}
                onChange={(e) => setWorkshopContact(e.target.value)}
                placeholder="Optional phone / contact"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Type *</Label>
              <Select value={maintenanceType} onValueChange={(v) => setMaintenanceType(v as MaintenanceType)}>
                <SelectTrigger className="h-9 text-xs font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Routine">Routine Service</SelectItem>
                  <SelectItem value="Repair">Repair</SelectItem>
                  <SelectItem value="Inspection">Inspection</SelectItem>
                  <SelectItem value="Renewal">Renewal / Istimara</SelectItem>
                  <SelectItem value="Emergency">Emergency Repair</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {single && (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Odometer (km)</Label>
                <Input
                  type="number"
                  value={odometer}
                  onChange={(e) => setOdometer(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Reason / remarks</Label>
            <Textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="What is going into the workshop for?"
              className="text-xs min-h-[70px]"
            />
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
              className="h-9 text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="h-9 text-xs font-extrabold bg-amber-600 hover:bg-amber-700 text-white gap-2"
            >
              <Wrench className="w-3.5 h-3.5" />
              {isSaving ? 'Opening…' : 'Open service order'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
