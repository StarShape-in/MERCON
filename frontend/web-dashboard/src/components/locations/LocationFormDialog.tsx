import { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin, Search, Building2, Check, AlertTriangle, Info, CheckCircle2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

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
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { locationService, Location, CoordinatePrecision } from '@/services/locationService';
import { customerService } from '@/services/customerService';
import { isGoogleMapsUrl, extractCityFromAddress, parsePastedAddressText } from '@/utils/googleMapsLink';
import { usePastedLocation } from '@/hooks/usePastedLocation';
import { createAddressSearchSession, AddressSearchSession, AddressSuggestion } from '@/services/addressSearch';
import PasteLocationStatus from '@/components/ui/PasteLocationStatus';

export interface LocationFormInitialData {
  code?: string;
  name?: string;
  city?: string;
  postalCode?: string;
  address?: string;
  lat?: number | string | null;
  lng?: number | string | null;
  coordinate_precision?: CoordinatePrecision;
  sourceUrl?: string;
}

interface LocationFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  location?: Location | null;
  defaultCustomerId?: string;
  initialData?: LocationFormInitialData | null;
  onSuccessLocation?: (location: Location) => void;
}

export default function LocationFormDialog({
  isOpen,
  onClose,
  location,
  defaultCustomerId,
  initialData,
  onSuccessLocation,
}: LocationFormDialogProps) {
  const queryClient = useQueryClient();

  const [customerId, setCustomerId] = useState(defaultCustomerId || '');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [precision, setPrecision] = useState<CoordinatePrecision>('UNKNOWN');
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [googleSuggestions, setGoogleSuggestions] = useState<AddressSuggestion[]>([]);
  const [isSearchingGoogle, setIsSearchingGoogle] = useState(false);
  const searchSessionRef = useRef<AddressSearchSession | null>(null);
  const paste = usePastedLocation();

  const isEditing = !!location;

  const { data: customersRes } = useQuery({
    queryKey: ['customers-select'],
    queryFn: () => customerService.getAll(),
    enabled: isOpen && !defaultCustomerId,
  });
  const customers = customersRes?.data || [];

  useEffect(() => {
    if (location) {
      setCustomerId(location.customerId || defaultCustomerId || '');
      setCode(location.code || '');
      setName(location.name || '');
      setCity(location.city || '');
      setPostalCode(location.postalCode || '');
      setAddress(location.address || '');
      setLat(location.lat != null ? String(location.lat) : '');
      setLng(location.lng != null ? String(location.lng) : '');
      setPrecision(location.coordinate_precision || (location.lat != null ? 'APPROXIMATE' : 'UNKNOWN'));
      setSearch(location.address || location.name || '');
    } else if (initialData) {
      setCustomerId(defaultCustomerId || '');
      setCode(initialData.code || '');
      setName(initialData.name || '');
      const computedCity = initialData.city || extractCityFromAddress(initialData.address || '', initialData.name || '');
      setCity(computedCity);
      setPostalCode(initialData.postalCode || '');
      setAddress(initialData.address || '');
      setLat(initialData.lat != null ? String(initialData.lat) : '');
      setLng(initialData.lng != null ? String(initialData.lng) : '');
      setPrecision(initialData.coordinate_precision || (initialData.lat != null ? 'APPROXIMATE' : 'UNKNOWN'));
      setSearch(initialData.sourceUrl || initialData.address || initialData.name || '');
    } else {
      setCustomerId(defaultCustomerId || '');
      setCode('');
      setName('');
      setCity('');
      setPostalCode('');
      setAddress('');
      setLat('');
      setLng('');
      setPrecision('UNKNOWN');
      setSearch('');
    }
    setError(null);
    setGoogleSuggestions([]);
  }, [location, defaultCustomerId, initialData, isOpen]);

  // Update precision state when coordinates change
  const hasCoords = lat.trim() !== '' && lng.trim() !== '' && !isNaN(Number(lat)) && !isNaN(Number(lng));

  useEffect(() => {
    if (!hasCoords) {
      setPrecision('UNKNOWN');
    } else if (precision === 'UNKNOWN') {
      setPrecision('APPROXIMATE');
    }
  }, [hasCoords, precision]);

  const handleNameChange = (val: string) => {
    setName(val);
  };

  const handleSearchGoogle = async (val: string) => {
    setSearch(val);
    if (!val.trim()) {
      setGoogleSuggestions([]);
      return;
    }

    if (isGoogleMapsUrl(val.trim())) {
      const place = await paste.resolve(val.trim());
      if (place) {
        if (!name) setName(place.name);
        setAddress(place.address || '');
        const computedCity = extractCityFromAddress(place.address || '', place.name);
        if (computedCity) setCity(computedCity);
        setLat(String(place.lat));
        setLng(String(place.lng));
        setPrecision('EXACT');
        setGoogleSuggestions([]);
      }
      return;
    }

    setIsSearchingGoogle(true);
    try {
      if (!searchSessionRef.current) searchSessionRef.current = createAddressSearchSession();
      const suggestions = await searchSessionRef.current.search(val);
      setGoogleSuggestions(suggestions);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearchingGoogle(false);
    }
  };

  const handleSelectGooglePlace = async (sugg: AddressSuggestion) => {
    if (!searchSessionRef.current) return;
    try {
      const resolved = await searchSessionRef.current.resolve(sugg.id);
      if (resolved) {
        if (!name) setName(resolved.name);
        setAddress(resolved.address || resolved.name);
        const computedCity = extractCityFromAddress(resolved.address || '', resolved.name);
        if (computedCity) setCity(computedCity);
        setLat(String(resolved.lat));
        setLng(String(resolved.lng));
        setPrecision('EXACT');
        setSearch(resolved.address || resolved.name);
        setGoogleSuggestions([]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const saveMutation = useMutation({
    mutationFn: (data: any) => {
      return isEditing ? locationService.update(location.id, data) : locationService.create(data);
    },
    onSuccess: (created: Location) => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast.success(isEditing ? 'Location updated successfully' : 'Location created successfully');
      onSuccessLocation?.(created);
      onClose();
    },
    onError: (err: any) => {
      setError(err.response?.data?.error?.message || 'Failed to save location.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const activeCustId = customerId || defaultCustomerId;
    if (!activeCustId) {
      setError('Please select a customer for this location.');
      return;
    }
    if (!code.trim()) {
      setError('Location code is required (e.g. RUH, KHA).');
      return;
    }
    if (!name.trim()) {
      setError('Location name is required.');
      return;
    }

    const numericLat = lat.trim() !== '' ? Number(lat) : null;
    const numericLng = lng.trim() !== '' ? Number(lng) : null;

    if (precision !== 'UNKNOWN' && (numericLat === null || numericLng === null || isNaN(numericLat) || isNaN(numericLng))) {
      setError('Coordinates are required for EXACT or APPROXIMATE precision.');
      return;
    }

    saveMutation.mutate({
      customerId: activeCustId,
      code: code.trim().toUpperCase(),
      name: name.trim(),
      city: city.trim() || null,
      postalCode: postalCode.trim() || null,
      address: address.trim() || null,
      lat: precision === 'UNKNOWN' ? null : numericLat,
      lng: precision === 'UNKNOWN' ? null : numericLng,
      coordinate_precision: precision,
    });
  };

  const isFromGoogleMaps = !isEditing && initialData && (initialData.lat != null || initialData.address);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[520px] p-6 rounded-2xl">
        <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <DialogTitle className="text-base font-extrabold flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-brand" />
              <span>
                {isEditing
                  ? 'Edit Customer Location'
                  : isFromGoogleMaps
                  ? 'How do you want to save this location?'
                  : 'Create Customer Location'}
              </span>
            </div>
            {isFromGoogleMaps && (
              <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] font-bold shrink-0 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-600" /> Google Maps Pin
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            {isFromGoogleMaps
              ? 'Exact address found from Google Maps. Specify how to name and code this location.'
              : 'Canonical operational hub scoped to customer.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          {/* Customer Selection */}
          {!defaultCustomerId && (
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Customer <span className="text-rose-500">*</span>
              </Label>
              <Select value={customerId} onValueChange={setCustomerId} disabled={isEditing}>
                <SelectTrigger className="h-9 text-xs font-semibold">
                  <SelectValue placeholder="Select Customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs font-semibold">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Code & Name Row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1 col-span-1">
              <Label className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Code <span className="text-rose-500">*</span>
              </Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="RUH"
                maxLength={10}
                className="h-9 text-xs font-mono font-bold uppercase"
              />
            </div>
            <div className="space-y-1 col-span-2">
              <Label className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Location Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Riyadh Sorting Center"
                className="h-9 text-xs font-semibold"
              />
            </div>
          </div>

          {/* City & Address */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1 col-span-1">
              <Label className="text-xs font-bold text-slate-900 dark:text-slate-100">City</Label>
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Riyadh"
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1 col-span-2">
              <Label className="text-xs font-bold text-slate-900 dark:text-slate-100">Address / Zone</Label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Industrial Area, Exit 18..."
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Google Places Search */}
          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
              <span>Google Maps Pin Resolution</span>
              <span className="text-[10px] text-slate-400 font-normal">Optional</span>
            </Label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => handleSearchGoogle(e.target.value)}
                placeholder="Search Google Maps place or paste link..."
                className="h-9 pl-9 text-xs"
              />
            </div>
            {googleSuggestions.length > 0 && (
              <div className="border rounded-xl p-1 bg-white shadow-md max-h-36 overflow-y-auto space-y-1">
                {googleSuggestions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleSelectGooglePlace(s)}
                    className="w-full text-left p-1.5 hover:bg-slate-50 text-xs rounded truncate flex items-center gap-1.5"
                  >
                    <MapPin className="w-3.5 h-3.5 text-brand shrink-0" />
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Lat & Lng */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-900 dark:text-slate-100">Latitude</Label>
              <Input
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="24.7136"
                className="h-9 text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-900 dark:text-slate-100">Longitude</Label>
              <Input
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="46.6753"
                className="h-9 text-xs font-mono"
              />
            </div>
          </div>

          {/* Coordinate Precision Selector */}
          <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
            <Label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
              <span>Coordinate Precision</span>
              {precision === 'EXACT' && (
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                  ✓ Exact location
                </Badge>
              )}
              {precision === 'APPROXIMATE' && (
                <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-bold">
                  ≈ Area location
                </Badge>
              )}
              {precision === 'UNKNOWN' && (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold">
                  ○ Location not pinned
                </Badge>
              )}
            </Label>

            {hasCoords ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPrecision('APPROXIMATE')}
                    className={`p-2 rounded-lg border text-left text-xs transition-all ${
                      precision === 'APPROXIMATE'
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 font-bold text-indigo-900 dark:text-indigo-200'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1">
                      <span>≈ Approximate</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-normal">General area / hub position</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPrecision('EXACT')}
                    className={`p-2 rounded-lg border text-left text-xs transition-all ${
                      precision === 'EXACT'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 font-bold text-emerald-900 dark:text-emerald-200'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Exact Facility</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-normal">Confirmed building / dock pin</div>
                  </button>
                </div>

                {precision === 'APPROXIMATE' && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPrecision('EXACT')}
                    className="w-full h-7 text-[11px] font-bold text-emerald-700 border-emerald-300 hover:bg-emerald-50 gap-1"
                  >
                    <Check className="w-3 h-3 text-emerald-600" />
                    Confirm: This is the exact facility
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-slate-500">
                Coordinates are missing. Precision is automatically set to <strong>UNKNOWN (○ Location not pinned)</strong>. Enter coordinates or resolve via Google Maps to select precision.
              </p>
            )}
          </div>

          <DialogFooter className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={saveMutation.isPending}
              className="bg-brand hover:bg-brand-hover text-white font-bold"
            >
              {saveMutation.isPending ? 'Saving...' : isEditing ? 'Update Location' : 'Create Location'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
