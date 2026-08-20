import { useState, useEffect, useRef, useMemo } from 'react';
import { MapPin, Search, Building2, Check, Loader2, Map as MapIcon, X } from 'lucide-react';
import TripStopMap from '@/components/trips/TripStopMap';
import { Location } from '@/services/locationService';
import {
  createAddressSearchSession,
  AddressSearchSession,
  AddressSuggestion,
  reverseGeocode,
} from '@/services/addressSearch';
import { isGoogleMapsUrl, resolveGoogleMapsLink } from '@/utils/googleMapsLink';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { matchesSearch } from '@/lib/search';

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function findClosestLocationHub(lat: number, lng: number, locations: Location[], maxDistanceKm = 35): Location | null {
  let closest: Location | null = null;
  let minDistance = maxDistanceKm;
  for (const loc of locations) {
    if (loc.lat != null && loc.lng != null) {
      const dist = getDistanceKm(lat, lng, loc.lat, loc.lng);
      if (dist < minDistance) {
        minDistance = dist;
        closest = loc;
      }
    }
  }
  return closest;
}

export interface TripLocationFieldProps {
  tone: 'pickup' | 'dropoff';
  label: string;
  locationId: string;
  onLocationChange: (locationId: string, location: Location | null) => void;
  lat: number | null;
  lng: number | null;
  onCoordsChange: (lat: number, lng: number) => void;
  name: string;
  onNameChange: (name: string) => void;
  address: string;
  onAddressChange: (address: string) => void;
  locations: Location[];
  autoFocusSearch?: boolean;
  shortcutBadge?: string;
}

/**
 * One-row location field: search + resolve in place, no separate "selected
 * location" panel duplicating the input, map tucked behind an icon button
 * instead of an inline expandable section. Replaces `TripStopCard` for
 * Create Trip's Route & Timing step.
 */
export default function TripLocationField({
  tone,
  label,
  locationId,
  onLocationChange,
  lat,
  lng,
  onCoordsChange,
  name,
  onNameChange,
  address,
  onAddressChange,
  locations,
  autoFocusSearch,
  shortcutBadge,
}: TripLocationFieldProps) {
  const isPickup = tone === 'pickup';

  const activeSelectedLocation = useMemo(
    () => locations.find((l) => l.id === locationId) || null,
    [locations, locationId]
  );

  const [query, setQuery] = useState(name || '');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [googleSuggestions, setGoogleSuggestions] = useState<AddressSuggestion[]>([]);
  const [isSearchingGoogle, setIsSearchingGoogle] = useState(false);
  const [isResolvingPlace, setIsResolvingPlace] = useState(false);

  const searchSessionRef = useRef<AddressSearchSession | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocusSearch) {
      inputRef.current?.focus();
      setIsDropdownOpen(true);
    }
  }, [autoFocusSearch]);

  useEffect(() => {
    setQuery(name || '');
  }, [name]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const matchingSavedLocations = useMemo(() => {
    if (!query.trim()) return locations.slice(0, 5);
    return locations.filter((l) => matchesSearch(query, [l.name, l.address]));
  }, [locations, query]);

  const handleQueryChange = (val: string) => {
    setQuery(val);
    onNameChange(val);
    setIsDropdownOpen(true);

    if (!val.trim()) {
      onAddressChange('');
      onLocationChange('', null);
      setGoogleSuggestions([]);
      setIsSearchingGoogle(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    // A pasted Google Maps link (full or short) carries a pin, not a place
    // name to search for — resolve it straight to coordinates instead of
    // running it through Places autocomplete, which would find nothing.
    if (isGoogleMapsUrl(val.trim())) {
      setGoogleSuggestions([]);
      setIsSearchingGoogle(true);
      setIsDropdownOpen(false);
      void (async () => {
        const linkText = val.trim();
        const coords = await resolveGoogleMapsLink(linkText);
        setIsSearchingGoogle(false);
        if (!coords) return;
        onCoordsChange(coords.lat, coords.lng);
        const placeName = await reverseGeocode(coords.lat, coords.lng);
        const label = placeName || `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`;
        setQuery(label);
        onNameChange(label);
        onAddressChange(label);
        const closestHub = findClosestLocationHub(coords.lat, coords.lng, locations);
        onLocationChange(closestHub?.id || '', closestHub);
      })();
      return;
    }

    if (val.length < 2) {
      setGoogleSuggestions([]);
      setIsSearchingGoogle(false);
      return;
    }

    setIsSearchingGoogle(true);
    debounceRef.current = setTimeout(async () => {
      try {
        if (!searchSessionRef.current) searchSessionRef.current = createAddressSearchSession();
        const suggestions = await searchSessionRef.current.search(val);
        setGoogleSuggestions(suggestions);
      } catch (e) {
        console.error('Google Maps place search failed', e);
        setGoogleSuggestions([]);
      } finally {
        setIsSearchingGoogle(false);
      }
    }, 280);
  };

  const handleSelectSavedLocation = (loc: Location) => {
    setQuery(loc.name);
    onNameChange(loc.name);
    onAddressChange(loc.address || loc.name);
    if (loc.lat != null && loc.lng != null) onCoordsChange(loc.lat, loc.lng);
    onLocationChange(loc.id, loc);
    setIsDropdownOpen(false);
  };

  const handleSelectGooglePlace = async (suggestion: AddressSuggestion) => {
    if (!searchSessionRef.current) return;
    setIsResolvingPlace(true);
    try {
      const resolved = await searchSessionRef.current.resolve(suggestion.id);
      searchSessionRef.current = null;

      if (resolved) {
        setQuery(resolved.name);
        onNameChange(resolved.name);
        onAddressChange(resolved.address || resolved.name);
        onCoordsChange(resolved.lat, resolved.lng);

        const closestHub = findClosestLocationHub(resolved.lat, resolved.lng, locations);
        onLocationChange(closestHub?.id || '', closestHub);
      }
    } catch (e) {
      console.error('Failed to resolve place', e);
    } finally {
      setIsResolvingPlace(false);
      setIsDropdownOpen(false);
    }
  };

  const resolvedAddress = address || activeSelectedLocation?.address;
  const hasPin = lat != null && lng != null;

  return (
    <div className="space-y-1" ref={containerRef}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
          <MapPin className={cn('w-3.5 h-3.5', isPickup ? 'text-emerald-600' : 'text-brand')} />
          {label} <span className="text-rose-500">*</span>
        </span>
        {shortcutBadge && (
          <kbd className="font-mono bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.2 rounded text-[10px] text-slate-500 font-semibold">
            {shortcutBadge}
          </kbd>
        )}
      </div>

      <div className={cn('relative', isDropdownOpen ? 'z-40' : 'z-10')}>
        <div className="relative flex items-center gap-1.5">
          <div className="relative flex-1 min-w-0">
            {!isDropdownOpen && isSearchingGoogle ? (
              <Loader2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500 animate-spin pointer-events-none" />
            ) : (
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            )}
            <Input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onFocus={() => setIsDropdownOpen(true)}
              placeholder={isPickup ? 'Search, paste a Google Maps link, or pick a saved hub...' : 'Search, paste a Google Maps link, or pick a saved hub...'}
              className="h-10 pl-9 pr-8 rounded-xl text-xs font-semibold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus-visible:ring-brand/20 focus-visible:border-brand"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  onNameChange('');
                  onAddressChange('');
                  onLocationChange('', null);
                  setIsDropdownOpen(false);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <Popover open={isMapOpen} onOpenChange={setIsMapOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  'h-10 w-10 shrink-0 rounded-xl border flex items-center justify-center transition-all cursor-pointer',
                  hasPin
                    ? isPickup
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800'
                      : 'border-orange-300 bg-orange-50 text-brand dark:bg-orange-950/40 dark:border-orange-800'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                )}
                title="Adjust pin on map"
              >
                <MapIcon className="w-4 h-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-2.5 rounded-xl" align="end">
              <TripStopMap tone={tone} lat={lat} lng={lng} onChange={(la, ln) => onCoordsChange(la, ln)} height={180} />
            </PopoverContent>
          </Popover>
        </div>

        {isDropdownOpen && (
          <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in-50 duration-150">
            <div className="p-1.5 space-y-0.5">
              <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Saved Rate Card Hubs
              </div>
              {matchingSavedLocations.length === 0 ? (
                <div className="px-2.5 py-1.5 text-xs text-slate-400">No matching saved hubs</div>
              ) : (
                matchingSavedLocations.map((loc) => (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => handleSelectSavedLocation(loc)}
                    className={cn(
                      'w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors cursor-pointer',
                      locationId === loc.id
                        ? 'bg-orange-50 dark:bg-orange-950/40 text-brand font-extrabold'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200'
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span className="truncate font-semibold">{loc.name}</span>
                    </div>
                    {locationId === loc.id && <Check className="w-4 h-4 text-brand shrink-0" />}
                  </button>
                ))
              )}
            </div>

            <div className="p-1.5 space-y-0.5 bg-slate-50/40 dark:bg-slate-900/40">
              <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Google Maps Places</span>
                {isSearchingGoogle && <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />}
              </div>
              {!isSearchingGoogle && googleSuggestions.length === 0 && query.length >= 2 && (
                <div className="px-2.5 py-1.5 text-xs text-slate-400">No places found</div>
              )}
              {googleSuggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleSelectGooglePlace(s)}
                  disabled={isResolvingPlace}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <MapPin className="w-3.5 h-3.5 text-brand shrink-0" />
                  <span className="truncate">{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Resolved address — one line, no separate summary panel */}
      {linkError ? (
        <p className="text-[11px] text-rose-600 dark:text-rose-400 truncate pl-1">{linkError}</p>
      ) : (
        resolvedAddress && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate pl-1">{resolvedAddress}</p>
        )
      )}
    </div>
  );
}
