import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Search } from 'lucide-react';

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { customerSavedLocationService } from '@/services/customerSavedLocationService';
import { customerService } from '@/services/customerService';
import { isGoogleMapsUrl } from '@/utils/googleMapsLink';
import { usePastedLocation } from '@/hooks/usePastedLocation';
import AddressLanguagePicker from '@/components/ui/AddressLanguagePicker';
import PasteLocationStatus from '@/components/ui/PasteLocationStatus';

interface AddSavedLocationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Locks the place to one customer (used from that customer's own detail page).
   *  Omit to show a customer picker (used from the consolidated Saved Places view). */
  customerId?: string;
}

/**
 * Adds a customer's own precise pickup/dropoff point — their actual
 * warehouse coordinates, as opposed to the shared city-level Location rate
 * cards are priced against. Surfaced as a quick pick in trip creation.
 */
export default function AddSavedLocationDialog({ isOpen, onClose, customerId: lockedCustomerId }: AddSavedLocationDialogProps) {
  const queryClient = useQueryClient();
  const [customerId, setCustomerId] = useState('');
  const [label, setLabel] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pasteInput, setPasteInput] = useState('');
  const paste = usePastedLocation();
  /** Both renderings of the last pasted pin, so the operator can switch. */
  const [addressOptions, setAddressOptions] = useState<{ en: string | null; ar: string | null }>({
    en: null,
    ar: null,
  });

  const { data: customersRes } = useQuery({
    queryKey: ['customers-select'],
    queryFn: () => customerService.getAll({ per_page: 100 }),
    enabled: isOpen && !lockedCustomerId,
  });
  const customers = customersRes?.data || [];

  useEffect(() => {
    if (isOpen) {
      setCustomerId(lockedCustomerId || '');
      setLabel('');
      setAddress('');
      setLat('');
      setLng('');
      setError(null);
      setPasteInput('');
      setAddressOptions({ en: null, ar: null });
      paste.reset();
    }
  }, [isOpen, lockedCustomerId]);

  const effectiveCustomerId = lockedCustomerId || customerId;

  /**
   * The paste target is its own field here, matching every other location
   * screen. It used to be the Address box, which meant this dialog taught a
   * different habit than the rest of the app — and left the raw URL sitting in
   * a field that gets saved if the lookup failed.
   */
  const handlePasteFieldChange = (val: string) => {
    setPasteInput(val);
    setError(null);
    setAddressOptions({ en: null, ar: null });
    if (!isGoogleMapsUrl(val.trim())) {
      paste.reset();
      return;
    }

    void (async () => {
      const place = await paste.resolve(val.trim(), (la: number, ln: number) => {
        // Drop the pin the moment it is known, before the address lookup.
        setLat(la.toFixed(6));
        setLng(ln.toFixed(6));
      });
      if (!place) return;
      setAddress(place.address);
      setAddressOptions({ en: place.addressEn, ar: place.addressAr });
      setLabel((prev) => prev.trim() || place.name);
      setPasteInput(place.name);
    })();
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      customerSavedLocationService.create({
        customerId: effectiveCustomerId,
        label: label.trim(),
        address: address.trim() || null,
        lat: Number(lat),
        lng: Number(lng),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-saved-locations'] });
      onClose();
    },
    onError: (err: any) => {
      setError(err.response?.data?.error?.message || err.message || 'Could not save this place.');
    },
  });

  const numericLat = parseFloat(lat);
  const numericLng = parseFloat(lng);
  const isValid = !!effectiveCustomerId && label.trim().length > 0 && !isNaN(numericLat) && !isNaN(numericLng);

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
          {!lockedCustomerId && (
            <div className="grid gap-1.5">
              <Label className="text-xs font-medium">Customer</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select a customer..." />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Same paste-first entry point as every other location screen. */}
          <div className="grid gap-1.5">
            <Label className="text-xs font-medium">Paste location</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                value={pasteInput}
                onChange={(e) => handlePasteFieldChange(e.target.value)}
                placeholder="Paste a Google Maps link or coordinates"
                className="h-9 pl-8 pr-8 text-xs"
              />
              {(paste.status.kind === 'resolving' || paste.status.kind === 'naming') && (
                <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
              )}
            </div>
            <PasteLocationStatus status={paste.status} />
          </div>

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
            <AddressLanguagePicker
              addressEn={addressOptions.en}
              addressAr={addressOptions.ar}
              value={address}
              onChange={setAddress}
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
