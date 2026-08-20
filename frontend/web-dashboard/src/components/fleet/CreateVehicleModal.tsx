import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Truck, Gauge, Layers, Radio, FileText, Loader2, X } from 'lucide-react';
import { vehicleService, Vehicle, AssetType } from '@/services/vehicleService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CreateVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (vehicle: Vehicle) => void;
}

const ASSET_TYPES: AssetType[] = ['Flatbed', 'Reefer', 'Box', 'Tanker'];

export default function CreateVehicleModal({ isOpen, onClose, onSuccess }: CreateVehicleModalProps) {
  const queryClient = useQueryClient();

  const [plateNumber, setPlateNumber] = useState('');
  const [assetType, setAssetType] = useState<AssetType>('Flatbed');
  const [capacityTon, setCapacityTon] = useState<string>('20');
  const [trailerNumber, setTrailerNumber] = useState('');
  const [gpsDeviceId, setGpsDeviceId] = useState('');
  const [iccesDeviceId, setIccesDeviceId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: vehicleService.create,
    onSuccess: (vehicle) => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      resetForm();
      if (vehicle) {
        onSuccess?.(vehicle);
      }
      onClose();
    },
    onError: (err: any) => {
      setError(err?.response?.data?.error?.message || err?.message || 'Failed to create vehicle');
    },
  });

  const resetForm = () => {
    setPlateNumber('');
    setAssetType('Flatbed');
    setCapacityTon('20');
    setTrailerNumber('');
    setGpsDeviceId('');
    setIccesDeviceId('');
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!plateNumber.trim()) {
      setError('Vehicle plate number is required');
      return;
    }
    setError(null);
    const capacityKg = parseFloat(capacityTon) * 1000 || 20000;

    createMutation.mutate({
      plate_number: plateNumber.trim(),
      asset_type: assetType,
      capacity_kg: capacityKg,
      trailer_number: trailerNumber.trim() || undefined,
      gps_device_id: gpsDeviceId.trim() || undefined,
      icces_device_id: iccesDeviceId.trim() || undefined,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <Truck className="w-5 h-5 text-brand" />
            Add New Vehicle Profile
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
              <Label htmlFor="plate_number" className="text-xs font-bold flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-slate-500" />
                Plate Number <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="plate_number"
                placeholder="e.g. 8492-LRA"
                value={plateNumber}
                onChange={(e) => setPlateNumber(e.target.value)}
                className="h-9 text-xs font-mono"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="asset_type" className="text-xs font-semibold flex items-center gap-1.5">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="capacity" className="text-xs font-semibold flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-slate-500" /> Payload Capacity (Tons)
              </Label>
              <Input
                id="capacity"
                type="number"
                step="0.5"
                placeholder="e.g. 25"
                value={capacityTon}
                onChange={(e) => setCapacityTon(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="trailer_number" className="text-xs font-semibold flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-500" /> Trailer Number
              </Label>
              <Input
                id="trailer_number"
                placeholder="e.g. TRL-9012"
                value={trailerNumber}
                onChange={(e) => setTrailerNumber(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="gps_device_id" className="text-xs font-semibold flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-slate-500" /> GPS Device ID
              </Label>
              <Input
                id="gps_device_id"
                placeholder="e.g. GPS-88219"
                value={gpsDeviceId}
                onChange={(e) => setGpsDeviceId(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="icces_device_id" className="text-xs font-semibold flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-slate-500" /> ICCES Telematics ID
              </Label>
              <Input
                id="icces_device_id"
                placeholder="e.g. ICCES-4401"
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
              disabled={createMutation.isPending}
              size="sm"
              className="h-9 text-xs bg-brand hover:bg-brand/90 text-white font-bold"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Saving...
                </>
              ) : (
                'Save Vehicle'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
