import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { customerSavedLocationService } from '@/services/customerSavedLocationService';

interface AddSavedLocationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
}

/**
 * Adds one of this customer's own precise pickup/dropoff points — their
 * actual warehouse coordinates, as opposed to the shared city-level Location
 * rate cards are priced against. Surfaced as a quick pick in trip creation.
 */
export default function AddSavedLocationDialog({ isOpen, onClose, customerId }: AddSavedLocationDialogProps) {
  const queryClient = useQueryClient();
  const [label, setLabel] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLabel('');
      setAddress('');
      setLat('');
      setLng('');
      setError(null);
    }
  }, [isOpen]);

  const saveMutation = useMutation({
    mutationFn: () =>
      customerSavedLocationService.create({
        customerId,
        label: label.trim(),
        address: address.trim() || null,
        lat: Number(lat),
        lng: Number(lng),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-saved-locations', customerId] });
      onClose();
    },
    onError: (err: any) => {
      setError(err.response?.data?.error?.message || err.message || 'Could not save this place.');
    },
  });

  const numericLat = parseFloat(lat);
  const numericLng = parseFloat(lng);
  const isValid = label.trim().length > 0 && !isNaN(numericLat) && !isNaN(numericLng);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Add Saved Place</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Their real warehouse/HQ coordinates — shown as a quick pick when creating a trip for them.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label className="text-xs font-medium">Label</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Riyadh HQ"
              className="h-9 text-xs"
            />
          </div>

          <div className="grid gap-1.5">
            <Label className="text-xs font-medium">
              Address <span className="text-[11px] text-muted-foreground">(optional)</span>
            </Label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street address"
              className="h-9 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1.5">
              <Label className="text-xs font-medium">Latitude</Label>
              <Input
                type="number"
                step="0.000001"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="24.638916"
                className="h-9 text-xs font-mono"
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs font-medium">Longitude</Label>
              <Input
                type="number"
                step="0.000001"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="46.716010"
                className="h-9 text-xs font-mono"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="mt-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose} className="h-8 text-xs">
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => { setError(null); saveMutation.mutate(); }}
            disabled={!isValid || saveMutation.isPending}
            className="h-8 gap-1.5 bg-brand text-xs font-medium text-white hover:bg-brand-hover"
          >
            {saveMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
