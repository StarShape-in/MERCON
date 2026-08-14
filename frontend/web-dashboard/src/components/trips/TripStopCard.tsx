import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  MapPin,
  Search,
  Clock,
  Building2,
  Check,
  ChevronDown,
  Loader2,
  Map as MapIcon,
  Sparkles,
  Navigation,
  X
} from 'lucide-react';
import { TripScheduleSelector } from '@/components/trips/TripScheduleSelector';
import TripStopMap from '@/components/trips/TripStopMap';
import { locationService, Location } from '@/services/locationService';
import {
  createAddressSearchSession,
  AddressSearchSession,
  AddressSuggestion,
} from '@/services/addressSearch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
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

function findClosestLocationHub(lat: number, lng: number, locations: Location[], maxDistanceKm: number = 35): Location | null {
  if (!locations || locations.length === 0) return null;
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

export interface TripStopCardProps {
  tone: 'pickup' | 'dropoff';
  title: string;
  locationId: string;
  onLocationIdChange?: (id: string) => void;
  locationName?: string;
  onLocationNameChange?: (name: string) => void;
  lat: number | null;
  lng: number | null;
  onCoordinatesChange?: (lat: number | null, lng: number | null) => void;
  time: string;
  onTimeChange: (time: string) => void;
  name: string;
  onNameChange: (name: string) => void;
  address: string;
  onAddressChange: (address: string) => void;
  locations?: Location[];
  selectedLocation?: Location | null;
  distanceKm?: number | null;
  // Backwards compatibility props
  hubLabel?: string;
  hubPlaceholder?: string;
  onLocationChange?: (locationId: string, location: Location | null) => void;
  onCoordsChange?: (lat: number, lng: number) => void;
  timeLabel?: string;
  timePlaceholder?: string;
  presets?: { label: string; onClick: () => void }[];
  warning?: React.ReactNode;
  excludeLocationId?: string;
  minDate?: Date;
  timeError?: boolean;
  onApplyOffset?: (hours: number, setEod?: boolean) => void;
  hideSchedule?: boolean;
  autoFocusSearch?: boolean;
  shortcutBadge?: string;
}

export default function TripStopCard({
  tone,
  title,
  locationId,
  onLocationIdChange,
  locationName,
  onLocationNameChange,
  lat,
  lng,
  onCoordinatesChange,
  time,
  onTimeChange,
  name,
  onNameChange,
  address,
  onAddressChange,
  locations: providedLocations,
  selectedLocation: providedSelectedLocation,
  distanceKm,
  hubLabel,
  hubPlaceholder,
  onLocationChange,
  onCoordsChange,
  timeLabel,
  timePlaceholder,
  presets = [],
  warning,
  excludeLocationId,
  minDate,
  timeError,
  onApplyOffset,
  hideSchedule = false,
  autoFocusSearch,
  shortcutBadge,
}: TripStopCardProps) {
  const isPickup = tone === 'pickup';

  // Fetch locations if not provided
  const { data: locationsRes } = useQuery({
    queryKey: ['locations'],
    queryFn: () => locationService.getAll({ active_only: true }),
    enabled: !providedLocations,
  });

  const rawLocations = providedLocations || locationsRes?.data || [];
  const locations = excludeLocationId
    ? rawLocations.filter((l) => l.id !== excludeLocationId)
    : rawLocations;
  const activeSelectedLocation =
    providedSelectedLocation || locations.find((l) => l.id === locationId) || null;

  // Search state for single unified field
  const [query, setQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [googleSuggestions, setGoogleSuggestions] = useState<AddressSuggestion[]>([]);
  const [isSearchingGoogle, setIsSearchingGoogle] = useState(false);
  const [isResolvingPlace, setIsResolvingPlace] = useState(false);
  const [isMapExpanded, setIsMapExpanded] = useState(false);

  const searchSessionRef = useRef<AddressSearchSession | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isInitialMount = useRef(true);

  // Auto focus input when requested via keyboard shortcut
  useEffect(() => {
    if (autoFocusSearch) {
      inputRef.current?.focus();
      setIsDropdownOpen(true);
    }
  }, [autoFocusSearch]);

  // Initialize and sync query display with prop name
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (!name && activeSelectedLocation) {
        setQuery(activeSelectedLocation.name);
        onNameChange(activeSelectedLocation.name);
        return;
      }
    }
    setQuery(name || '');
  }, [name]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered saved Rate Card Locations matching query
  const matchingSavedLocations = useMemo(() => {
    if (!query.trim()) return locations.slice(0, 5);
    return locations.filter((l) => matchesSearch(query, [l.name, l.address]));
  }, [locations, query]);

  // Handle typing search
  const handleQueryChange = (val: string) => {
    setQuery(val);
    onNameChange(val);
    setIsDropdownOpen(true);

    if (!val.trim()) {
      onAddressChange('');
      updateLocationId('', null);
      setGoogleSuggestions([]);
      setIsSearchingGoogle(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.length < 2) {
      setGoogleSuggestions([]);
      setIsSearchingGoogle(false);
      return;
    }

    setIsSearchingGoogle(true);
    debounceRef.current = setTimeout(async () => {
      try {
        if (!searchSessionRef.current) {
          searchSessionRef.current = createAddressSearchSession();
        }
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

  // Helper callbacks to update props
  const updateLocationId = (id: string, locObj: Location | null) => {
    if (onLocationIdChange) onLocationIdChange(id);
    if (onLocationChange) onLocationChange(id, locObj);
  };

  const updateCoords = (newLat: number | null, newLng: number | null) => {
    if (onCoordinatesChange) onCoordinatesChange(newLat, newLng);
    if (onCoordsChange && newLat != null && newLng != null) onCoordsChange(newLat, newLng);
  };

  // Select a Saved Rate Card Location Hub directly
  const handleSelectSavedLocation = (loc: Location) => {
    setQuery(loc.name);
    onNameChange(loc.name);
    onAddressChange(loc.address || loc.name);
    if (loc.lat != null && loc.lng != null) {
      updateCoords(loc.lat, loc.lng);
    }
    updateLocationId(loc.id, loc);
    if (onLocationNameChange) onLocationNameChange(loc.name);
    setIsDropdownOpen(false);
  };

  // Select a Google Maps Place
  const handleSelectGooglePlace = async (suggestion: AddressSuggestion) => {
    if (!searchSessionRef.current) return;
    setIsResolvingPlace(true);
    try {
      const resolved = await searchSessionRef.current.resolve(suggestion.id);
      searchSessionRef.current = null; // Single use token

      if (resolved) {
        setQuery(resolved.name);
        onNameChange(resolved.name);
        onAddressChange(resolved.address || resolved.name);
        updateCoords(resolved.lat, resolved.lng);

        // Auto-match closest saved location hub
        const closestHub = findClosestLocationHub(resolved.lat, resolved.lng, locations);
        if (closestHub) {
          updateLocationId(closestHub.id, closestHub);
          if (onLocationNameChange) onLocationNameChange(closestHub.name);
        } else {
          updateLocationId('', null);
        }
      }
    } catch (e) {
      console.error('Failed to resolve place', e);
    } finally {
      setIsResolvingPlace(false);
      setIsDropdownOpen(false);
    }
  };

  return (
    <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-visible shadow-xs space-y-0 relative">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 rounded-t-2xl">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'w-2.5 h-2.5 rounded-full ring-4 shrink-0',
              isPickup ? 'bg-emerald-500 ring-emerald-500/20' : 'bg-brand ring-orange-500/20'
            )}
          />
          <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100">{title}</span>
        </div>

        <div className="flex items-center gap-1.5">
          {shortcutBadge && (
            <kbd className="font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.2 rounded text-[10px] text-slate-500 font-semibold shadow-2xs">
              {shortcutBadge}
            </kbd>
          )}
          {activeSelectedLocation && (
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 text-[10px] font-extrabold">
              Rate Hub: {activeSelectedLocation.name}
            </Badge>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* SINGLE UNIFIED LOCATION SEARCH FIELD (Google Maps & Saved Rate Card Hubs) */}
        <div className={cn("space-y-1.5 relative", isDropdownOpen ? "z-40" : "z-10")} ref={containerRef}>
          <Label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <MapPin className={cn('w-3.5 h-3.5', isPickup ? 'text-emerald-600' : 'text-brand')} />
              {isPickup ? 'Pickup Location' : 'Dropoff Location'} <span className="text-rose-500">*</span>
            </span>
            <span className="text-[10px] text-slate-400 font-semibold">Google Maps &amp; Rate Cards</span>
          </Label>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <Input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onFocus={() => setIsDropdownOpen(true)}
              placeholder={isPickup ? "Type pickup city, address or Google Maps place..." : "Type dropoff city, address or Google Maps place..."}
              className="h-10 pl-9 pr-8 rounded-xl text-xs font-semibold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus-visible:ring-brand/20 focus-visible:border-brand"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  onNameChange('');
                  onAddressChange('');
                  updateLocationId('', null);
                  setIsDropdownOpen(false);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Single Unified Search Autocomplete Dropdown */}
          {isDropdownOpen && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in-50 duration-150">
              
              {/* Section 1: Saved Rate Card Locations */}
              <div className="p-2 space-y-1">
                <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Saved Rate Card Hubs</span>
                  <Badge className="bg-indigo-50 text-indigo-700 text-[9px] px-1.5 py-0 font-bold">Auto Rate Match</Badge>
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
                        'w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-xs transition-colors cursor-pointer',
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

              {/* Section 2: Live Google Maps Places Search */}
              <div className="p-2 space-y-1 bg-slate-50/40 dark:bg-slate-900/40">
                <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Google Maps Places Search</span>
                  {isSearchingGoogle && <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />}
                </div>

                {isSearchingGoogle && (
                  <div className="px-2.5 py-2 text-xs text-slate-400 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" /> Searching Google Maps...
                  </div>
                )}

                {!isSearchingGoogle && googleSuggestions.length === 0 && query.length >= 2 && (
                  <div className="px-2.5 py-2 text-xs text-slate-400">No Google Maps places found</div>
                )}

                {googleSuggestions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleSelectGooglePlace(s)}
                    disabled={isResolvingPlace}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-xs hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <MapPin className="w-3.5 h-3.5 text-brand shrink-0" />
                    <span className="truncate">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Selected Location Summary & Map Toggle */}
        <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="space-y-0.5 min-w-0 flex-1">
              <span className="font-bold text-slate-900 dark:text-slate-100 block truncate">
                {name || activeSelectedLocation?.name || 'No location picked yet'}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
                {address || activeSelectedLocation?.address || 'Search above or pick on map'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsMapExpanded(!isMapExpanded)}
              className={cn(
                "ml-2 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all shadow-2xs flex items-center gap-1.5 shrink-0 cursor-pointer",
                isMapExpanded
                  ? isPickup
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300"
                    : "border-orange-300 bg-orange-50 text-brand dark:bg-orange-950/40 dark:border-orange-800 dark:text-orange-300"
                  : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              )}
            >
              <MapPin className={cn("w-3.5 h-3.5", isMapExpanded ? (isPickup ? "text-emerald-600" : "text-brand") : "text-slate-500")} />
              <span>{isMapExpanded ? 'Hide Map' : 'Map Pin'}</span>
            </button>
          </div>

          {/* Interactive Direct Map (1-click toggle, zero extra fields) */}
          {isMapExpanded && (
            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 animate-in fade-in-50 duration-200">
              <TripStopMap
                tone={tone}
                lat={lat}
                lng={lng}
                onChange={(la, ln) => updateCoords(la, ln)}
              />
            </div>
          )}
        </div>

        {warning}

        {/* Scheduled Arrival / Delivery Time */}
        {!hideSchedule && (
          <TripScheduleSelector
            tone={tone}
            label={timeLabel || (isPickup ? 'Scheduled Pickup Time' : 'Scheduled Delivery Time')}
            value={time}
            onChange={onTimeChange}
            placeholder={timePlaceholder}
            minDate={minDate}
            error={timeError}
            onApplyOffset={!isPickup ? onApplyOffset : undefined}
          />
        )}
      </div>
    </Card>
  );
}
