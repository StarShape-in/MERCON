import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Info } from 'lucide-react';

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
import { Textarea } from '@/components/ui/textarea';
import { locationService, Location } from '@/services/locationService';

interface LocationFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Editing an existing place; omit to create. */
  location?: Location | null;
}

/**
 * Add or correct a lane endpoint.
 *
 * Renaming here is the fix for a misspelled place: the API cascades the new
 * name into every rate card that quotes it, so the lane keeps working and the
 * lists stop showing the old spelling. It is not a merge — if both "Madina"
 * and "Madinah" already exist as separate rows, renaming one to match the
 * other is refused as a duplicate, and the rate cards have to be re-pointed by
 * hand first.
 */
export default function LocationFormDialog({ isOpen, onClose, location }: LocationFormDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = !!location;

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setName(location?.name ?? '');
    setAddress(location?.address ?? '');
    setLat(location?.lat != null ? String(location.lat) : '');
    setLng(location?.lng != null ? String(location.lng) : '');
  }, [isOpen, location]);

  const parsedLat = lat.trim() === '' ? null : Number(lat);
  const parsedLng = lng.trim() === '' ? null : Number(lng);
  const coordsValid =
    (parsedLat === null && parsedLng === null) ||
    (parsedLat !== null && parsedLng !== null &&
      !isNaN(parsedLat) && !isNaN(parsedLng) &&
      Math.abs(parsedLat) <= 90 && Math.abs(parsedLng) <= 180);

  const isValid = name.trim() !== '' && coordsValid;

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: name.trim(),
        address: address.trim() || null,
        lat: parsedLat,
        lng: parsedLng,
      };
      return location
        ? locationService.update(location.id, payload)
        : locationService.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      // A rename rewrites the names printed on rate cards, so their lists are
      // stale the moment this succeeds.
      queryClient.invalidateQueries({ queryKey: ['rate-cards'] });
      onClose();
    },
    onError: (err: any) => {
      setError(err.response?.data?.error?.message || err.message || 'Could not save this location.');
    },
  });

  const handleSubmit = () => {
    setError(null);
    if (!name.trim()) return setError('Give this place a name.');
    if (!coordsValid) return setError('Enter both coordinates, or leave both blank.');
    saveMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-extrabold">
            {isEditing ? 'Edit location' : 'Add location'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            A place lanes are priced between, and that trip stops sit inside.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="loc_name" className="text-xs font-semibold">
              Name <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="loc_name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Jeddah"
              className="h-9 text-xs"
            />
            {isEditing && name.trim() !== location?.name && (
              <p className="text-[11px] text-amber-700 flex items-start gap-1.5">
                <Info className="w-3 h-3 shrink-0 mt-0.5" />
                Renaming updates this place on every rate card that uses it.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="loc_address" className="text-xs font-semibold">
              Address <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="loc_address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Full address — trip stops here default to it, and drivers see it"
              rows={2}
              maxLength={500}
              className="text-xs resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="loc_lat" className="text-xs font-semibold">Latitude</Label>
              <Input
                id="loc_lat"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="21.4858"
                className="h-9 font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="loc_lng" className="text-xs font-semibold">Longitude</Label>
              <Input
                id="loc_lng"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="39.1925"
                className="h-9 font-mono text-xs"
              />
            </div>
            <p className="col-span-2 text-[11px] text-muted-foreground">
              The default map pin for this place. A trip stop still keeps its own exact
              coordinates — leave these blank if you're not sure.
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} className="h-9 text-xs">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!isValid || saveMutation.isPending}
            className="h-9 gap-1.5 bg-[#E8450F] text-xs font-bold text-white hover:bg-[#d03d0c]"
          >
            {saveMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isEditing ? 'Save changes' : 'Add location'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
