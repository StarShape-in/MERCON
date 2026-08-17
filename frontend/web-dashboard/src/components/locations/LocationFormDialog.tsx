import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Loader2, Info, Search, MapPin, Map as MapIcon, Globe, Navigation, Check, X, Building2, ExternalLink
} from 'lucide-react';

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
import { SAUDI_MAP_CONTAINER_PROPS } from '@/utils/saudiMapConfig';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { locationService, Location } from '@/services/locationService';
import {
  createAddressSearchSession,
  type AddressSearchSession,
  type AddressSuggestion,
} from '@/services/addressSearch';

const customPinIcon = L.divIcon({
  html: `
    <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
      <div style="
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: var(--color-brand);
        border: 3px solid #FFFFFF;
        box-shadow: 0 4px 12px rgba(232, 69, 15, 0.45);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      </div>
    </div>
  `,
  className: 'location-dialog-pin',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

/** Recenters map on pin placement */
function FlyToPin({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], Math.max(map.getZoom(), 13), { animate: true });
  }, [lat, lng, map]);
  return null;
}

/** Invalidate map size when modal animation completes */
function MapModalResizer() {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const t1 = setTimeout(() => map.invalidateSize(), 150);
    const t2 = setTimeout(() => map.invalidateSize(), 350);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [map]);
  return null;
}

/** Handles map click to update coordinates */
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

interface LocationFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Editing an existing place; omit to create. */
  location?: Location | null;
}

export default function LocationFormDialog({ isOpen, onClose, location }: LocationFormDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = !!location;

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Google Maps Search Autocomplete state
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMap, setShowMap] = useState(true);

  const sessionRef = useRef<AddressSearchSession | null>(null);
  const searchGen = useRef(0);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setName(location?.name ?? '');
    setAddress(location?.address ?? '');
    setLat(location?.lat != null ? String(location.lat) : '');
    setLng(location?.lng != null ? String(location.lng) : '');
    setSearchQuery('');
    setSuggestions([]);
    setShowDropdown(false);
    sessionRef.current = null;
  }, [isOpen, location]);

  // Click outside to close Google Maps autocomplete suggestions dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search input handler with Google Places Autocomplete API
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(async () => {
      if (!sessionRef.current) {
        sessionRef.current = createAddressSearchSession();
      }

      const gen = ++searchGen.current;
      setIsSearching(true);

      try {
        const rows = await sessionRef.current.search(query);
        if (searchGen.current === gen) {
          setSuggestions(rows);
          setShowDropdown(rows.length > 0);
        }
      } catch (err) {
        console.error('Google Maps address search failed:', err);
      } finally {
        if (searchGen.current === gen) {
          setIsSearching(false);
        }
      }
    }, 250);
  };

  // Select place from Google Maps dropdown
  const handleSelectSuggestion = async (suggestion: AddressSuggestion) => {
    if (!sessionRef.current) return;
    setShowDropdown(false);
    setIsSearching(true);

    try {
      const resolved = await sessionRef.current.resolve(suggestion.id);
      // Reset session after resolving so next search gets fresh billing token
      sessionRef.current = null;

      if (resolved) {
        setName(resolved.name);
        setAddress(resolved.address);
        setLat(resolved.lat.toFixed(6));
        setLng(resolved.lng.toFixed(6));
        setSearchQuery(resolved.name);
      }
    } catch (err) {
      console.error('Failed to resolve Google Maps place:', err);
      setError('Could not fetch place details from Google Maps.');
    } finally {
      setIsSearching(false);
    }
  };

  const parsedLat = lat.trim() === '' ? null : Number(lat);
  const parsedLng = lng.trim() === '' ? null : Number(lng);
  const coordsValid =
    (parsedLat === null && parsedLng === null) ||
    (parsedLat !== null && parsedLng !== null &&
      !isNaN(parsedLat) && !isNaN(parsedLng) &&
      Math.abs(parsedLat) <= 90 && Math.abs(parsedLng) <= 180);

  const isValid = name.trim() !== '' && coordsValid;

  const mapCenter: [number, number] =
    parsedLat !== null && parsedLng !== null
      ? [parsedLat, parsedLng]
      : [24.7136, 46.6753]; // Default to Riyadh if unmapped

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
      <DialogContent className="max-w-xl rounded-2xl overflow-hidden p-0 gap-0 border border-slate-200 dark:border-slate-800 shadow-2xl">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900/50">
              <MapPin className="w-5 h-5 text-brand" />
            </div>
            <div>
              <DialogTitle className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                {isEditing ? 'Edit Location' : 'Add Location'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Connect with Google Maps to auto-fill location name, street address, and coordinates.
              </DialogDescription>
            </div>
          </div>
          <Badge className="bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200/80 font-bold text-[10px] flex items-center gap-1">
            <Globe className="w-3 h-3 text-blue-500" />
            Google Maps Integrated
          </Badge>
        </div>

        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          
          {/* 1. Google Maps Autocomplete Search Input */}
          <div className="space-y-1.5 relative" ref={dropdownRef}>
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-brand" />
                Search Google Maps Place / Address
              </Label>
              <span className="text-[10px] text-slate-400 font-medium">Auto-fills name, address & coords</span>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
                placeholder="Type a location name or address (e.g. Jeddah Port, Riyadh Depot)..."
                className="pl-9 pr-9 h-10 text-xs bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus-visible:ring-brand"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand animate-spin" />
              )}
            </div>

            {/* Dropdown Suggestions */}
            {showDropdown && suggestions.length > 0 && (
              <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-h-56 overflow-y-auto p-1 animate-in fade-in-50 zoom-in-95">
                <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 border-b border-slate-100 dark:border-slate-800">
                  <Globe className="w-3 h-3 text-blue-500" />
                  Google Places Autocomplete
                </div>
                {suggestions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectSuggestion(item)}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 hover:bg-orange-50 dark:hover:bg-orange-950/40 hover:text-brand rounded-lg transition-colors flex items-start gap-2 cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5 text-brand shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-4">
            
            {/* 2. Name & Address Fields */}
            <div className="space-y-1.5">
              <Label htmlFor="loc_name" className="text-xs font-semibold">
                Location Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="loc_name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Jeddah Central Hub"
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
                Street Address <span className="font-normal text-slate-400">(optional)</span>
              </Label>
              <Textarea
                id="loc_address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Full postal address for driver navigation..."
                rows={2}
                maxLength={500}
                className="text-xs resize-none"
              />
            </div>

            {/* 3. Coordinates & Interactive Map Picker Toggle */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-indigo-500" />
                  Geographic Coordinates (Latitude / Longitude)
                </Label>
                <button
                  type="button"
                  onClick={() => setShowMap(!showMap)}
                  className="text-[11px] font-bold text-brand hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <MapIcon className="w-3 h-3" />
                  <span>{showMap ? 'Hide Map Picker' : 'Show Map Picker'}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="loc_lat" className="text-[11px] text-slate-500 font-medium">Latitude</Label>
                  <Input
                    id="loc_lat"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    placeholder="21.4858"
                    className="h-9 font-mono text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="loc_lng" className="text-[11px] text-slate-500 font-medium">Longitude</Label>
                  <Input
                    id="loc_lng"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    placeholder="39.1925"
                    className="h-9 font-mono text-xs"
                  />
                </div>
              </div>

              {/* 4. Interactive Leaflet Map Pin Picker */}
              {showMap && (
                <div className="mt-2 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 h-48 relative shadow-inner">
                  <MapContainer
                    center={mapCenter}
                    zoom={12}
                    minZoom={SAUDI_MAP_CONTAINER_PROPS.minZoom}
                    maxZoom={SAUDI_MAP_CONTAINER_PROPS.maxZoom}
                    maxBounds={SAUDI_MAP_CONTAINER_PROPS.maxBounds}
                    maxBoundsViscosity={SAUDI_MAP_CONTAINER_PROPS.maxBoundsViscosity}
                    style={{ height: '100%', width: '100%' }}
                    zoomControl={false}
                  >
                    <MapModalResizer />
                    <TileLayer
                      url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                      attribution='&copy; OpenStreetMap &copy; CARTO'
                    />
                    <MapClickHandler
                      onMapClick={(clickedLat, clickedLng) => {
                        setLat(clickedLat.toFixed(6));
                        setLng(clickedLng.toFixed(6));
                      }}
                    />
                    {parsedLat !== null && parsedLng !== null && (
                      <>
                        <Marker position={[parsedLat, parsedLng]} icon={customPinIcon} />
                        <FlyToPin lat={parsedLat} lng={parsedLng} />
                      </>
                    )}
                  </MapContainer>

                  <div className="absolute top-2 left-2 z-[1000] bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm px-2.5 py-1 rounded-lg text-[10px] font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 flex items-center gap-1 shadow-xs">
                    <MapPin className="w-3 h-3 text-brand" />
                    <span>Click anywhere on map to position pin</span>
                  </div>
                </div>
              )}
            </div>

          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <Button variant="outline" size="sm" onClick={onClose} className="h-9 text-xs font-bold">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!isValid || saveMutation.isPending}
            className="h-9 gap-1.5 bg-brand text-xs font-bold text-white hover:bg-brand-hover"
          >
            {saveMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isEditing ? 'Save Changes' : 'Add Location'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
