import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Truck, Gauge, Layers, Radio, FileText, Loader2 } from 'lucide-react';
import { vehicleService, Vehicle, AssetType, AssetStatus } from '@/services/vehicleService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface EditVehicleModalProps {
  isOpen: boolean;
  vehicle: Vehicle | null;
  onClose: () => void;
  onSuccess?: (updated: Vehicle) => void;
}

const ASSET_TYPES: AssetType[] = ['Flatbed', 'Reefer', 'Box', 'Tanker'];
const ASSET_STATUSES: AssetStatus[] = ['Available', 'OnTrip', 'Maintenance', 'Inactive'];

export default function EditVehicleModal({ isOpen, vehicle, onClose, onSuccess }: EditVehicleModalProps) {
  const queryClient = useQueryClient();

  const [plateNumber, setPlateNumber] = useState('');
  const [assetType, setAssetType] = useState<AssetType>('Flatbed');
  const [status, setStatus] = useState<AssetStatus>('Available');
  const [capacityTon, setCapacityTon] = useState<string>('20');
  const [currentOdometer, setCurrentOdometer] = useState<string>('0');
  const [trailerNumber, setTrailerNumber] = useState('');
  const [iccesDeviceId, setIccesDeviceId] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (vehicle) {
      setPlateNumber(vehicle.plate_number || '');
      setAssetType(vehicle.asset_type || 'Flatbed');
      setStatus(vehicle.status || 'Available');
      setCapacityTon(vehicle.capacity_kg ? (vehicle.capacity_kg / 1000).toString() : '20');
      setCurrentOdometer((vehicle.current_odometer || 0).toString());
      setTrailerNumber(vehicle.trailer_number || '');
      setIccesDeviceId(vehicle.icces_device_id || '');
      setError(null);
    }
  }, [vehicle]);

  const updateMutation = useMutation({
    mutationFn: (payload: any) => vehicleService.update(vehicle!.id, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle', vehicle?.id] });
      onSuccess?.(updated);
      onClose();
    },
    onError: (err: any) => {
      setError(err?.response?.data?.error?.message || err?.message || 'Failed to update vehicle profile');
    },
  });

  if (!vehicle) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!plateNumber.trim()) {
      setError('Vehicle plate number is required');
      return;
    }
    setError(null);
    const capacityKg = parseFloat(capacityTon) * 1000 || 20000;

    updateMutation.mutate({
      plate_number: plateNumber.trim(),
      asset_type: assetType,
      status: status,
      capacity_kg: capacityKg,
      current_odometer: parseFloat(currentOdometer) || 0,
      trailer_number: trailerNumber.trim() || undefined,
      icces_device_id: iccesDeviceId.trim() || undefined,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <Truck className="w-5 h-5 text-brand" />
            Edit Vehicle Profile
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && (
            <div className="p-3 text-xs font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-900">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit_plate_number" className="text-xs font-bold flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-slate-500" />
                Plate Number <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="edit_plate_number"
                value={plateNumber}
                onChange={(e) => setPlateNumber(e.target.value)}
                className="h-9 text-xs font-mono"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit_asset_type" className="text-xs font-semibold flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-500" /> Asset / Trailer Type
              </Label>
              <Select value={assetType} onValueChange={(val) => setAssetType(val as AssetType)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {ASSET_TYPES.map((type) => (
                    <SelectItem key={type} value={type} className="text-xs">
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit_status" className="text-xs font-semibold">Duty Status</Label>
              <Select value={status} onValueChange={(val) => setStatus(val as AssetStatus)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {ASSET_STATUSES.map((st) => (
                    <SelectItem key={st} value={st} className="text-xs">
                      {st}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit_capacity" className="text-xs font-semibold flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-slate-500" /> Capacity (Tons)
              </Label>
              <Input
                id="edit_capacity"
                type="number"
                step="0.5"
                value={capacityTon}
                onChange={(e) => setCapacityTon(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit_odometer" className="text-xs font-semibold flex items-center gap-1.5">
                Odometer (KM)
              </Label>
              <Input
                id="edit_odometer"
                type="number"
                value={currentOdometer}
                onChange={(e) => setCurrentOdometer(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit_trailer_number" className="text-xs font-semibold flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-500" /> Trailer Number
              </Label>
              <Input
                id="edit_trailer_number"
                value={trailerNumber}
                onChange={(e) => setTrailerNumber(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit_icces_device_id" className="text-xs font-semibold flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-slate-500" /> Saudi ICCES ID (GPS Tracker)
              </Label>
              <Input
                id="edit_icces_device_id"
                value={iccesDeviceId}
                onChange={(e) => setIccesDeviceId(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} size="sm" className="h-9 text-xs">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateMutation.isPending}
              size="sm"
              className="h-9 text-xs bg-brand hover:bg-brand/90 text-white font-bold"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
