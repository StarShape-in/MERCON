import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronDown, MapPin, Plus, Loader2, Building2, Star } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { locationService, Location } from '@/services/locationService';
import { customerSavedLocationService } from '@/services/customerSavedLocationService';
import { matchesSearch } from '@/lib/search';
import { createAddressSearchSession, AddressSearchSession, AddressSuggestion } from '@/services/addressSearch';
import { isGoogleMapsUrl } from '@/utils/googleMapsLink';
import { usePastedLocation } from '@/hooks/usePastedLocation';
import PasteLocationStatus from '@/components/ui/PasteLocationStatus';

interface LocationComboboxProps {
  id?: string;
  value: string;
  onChange: (locationId: string, location: Location | null) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Coordinates to stamp on a place created from here (e.g. the map pin). */
  newLocationLat?: number | null;
  newLocationLng?: number | null;
  /** Hidden from the list — stops a lane being priced from a place to itself. */
  excludeLocationId?: string;
  triggerClassName?: string;
  /** When given, shows this customer's own saved precise pickup/dropoff
   *  points (e.g. "IMILE Riyadh HQ") above the generic city list. Picking one
   *  still resolves to the matching city Location for rate lookup — only the
   *  label shown differs — since the real precision is applied server-side
   *  when the trip is actually created. */
  customerId?: string;
}

export default function LocationCombobox({
  id,
  value,
  onChange,
  placeholder = 'Select location...',
  disabled,
  newLocationLat,
  newLocationLng,
  excludeLocationId,
  triggerClassName,
  customerId,
}: LocationComboboxProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const [googleSuggestions, setGoogleSuggestions] = useState<AddressSuggestion[]>([]);
  const [isSearchingGoogle, setIsSearchingGoogle] = useState(false);
  const [isResolvingPlace, setIsResolvingPlace] = useState(false);
  const searchSessionRef = useRef<AddressSearchSession | null>(null);
  const paste = usePastedLocation();

  const { data: locationsRes, isLoading } = useQuery({
    queryKey: ['locations'],
    queryFn: () => locationService.getAll({ active_only: true }),
  });

  const { data: savedPlaces = [] } = useQuery({
    queryKey: ['customer-saved-locations', customerId],
    queryFn: () => customerSavedLocationService.list({ customerId, active_only: true }),
    enabled: !!customerId,
  });

  const locations = (locationsRes?.data || []).filter((l) => l.id !== excludeLocationId);

  const trimmedSearchForSaved = search.trim().toLowerCase();
  const matchingSavedPlaces = savedPlaces.filter((p) =>
    trimmedSearchForSaved
      ? p.label.toLowerCase().includes(trimmedSearchForSaved) || (p.address ?? '').toLowerCase().includes(trimmedSearchForSaved)
      : true
  );

  /** A saved place's label/address usually names the city it's in ("Riyadh
   *  HQ") -- match that against the real city Location list so picking it
   *  still sets a proper originLocationId for rate lookup. */
  const resolveCityForSavedPlace = (label: string, address: string | null) => {
    const haystack = `${label} ${address ?? ''}`.toLowerCase();
    return locations.find((l) => haystack.includes(l.name.toLowerCase())) ?? null;
  };
  const selected = locations.find((l) => l.id === value || l.name === value || (value && l.name.trim().toLowerCase() === value.trim().toLowerCase())) || null;

  const createMutation = useMutation({
    mutationFn: (name: string) =>
      locationService.create({ name, lat: newLocationLat ?? null, lng: newLocationLng ?? null }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      onChange(created.name, created);
      setSearch('');
      setOpen(false);
    },
  });

  /**
   * A pasted pin becomes a hub carrying its real coordinates and address —
   * unlike the plain "Add as a new location" path below, which can only stamp
   * whatever pin the surrounding form happened to have.
   */
  const pasteCreateMutation = useMutation({
    mutationFn: (p: { name: string; address: string; lat: number; lng: number }) =>
      locationService.create({ name: p.name, address: p.address, lat: p.lat, lng: p.lng }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      onChange(created.name, created);
      setSearch('');
      setOpen(false);
    },
  });

  /**
   * Pasting a Google Maps link or a bare `lat, lng` here resolves to a place
   * rather than being typed at Places autocomplete, which only ever answers
   * "No Google Maps places found" for a URL. An existing hub of the same name
   * is reused so pasting does not quietly fork a second "Qatif"; otherwise a
   * new hub is created with the pasted coordinates.
   */
  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (!isGoogleMapsUrl(val)) {
      paste.reset();
      return;
    }
    void (async () => {
      const place = await paste.resolve(val);
      if (!place) return;
      const existing = locations.find(
        (l) => l.name.trim().toLowerCase() === place.name.trim().toLowerCase()
      );
      if (existing) {
        onChange(existing.name || existing.id, existing);
        setSearch('');
        setOpen(false);
        return;
      }
      pasteCreateMutation.mutate(place);
    })();
  };

  const trimmedSearch = search.trim();
  const matchingSavedLocations = locations.filter((loc) =>
    trimmedSearch ? matchesSearch(trimmedSearch, [loc.name, loc.address]) : true
  );

  const alreadyExists = locations.some(
    (l) => l.name.trim().toLowerCase() === trimmedSearch.toLowerCase()
  );
  // Never offer to save a raw URL as a location's name — the paste path is
  // already turning it into a real place.
  const canCreate =
    trimmedSearch.length > 0 && !alreadyExists && !isGoogleMapsUrl(trimmedSearch);

  const displayLabel = selected ? selected.name : value ? value : '';

  useEffect(() => {
    if (!open) return;
    // A pasted link is handled by `handleSearchChange`; sending the URL to
    // Places as well only produces "No Google Maps places found" underneath
    // the resolution that is already running.
    if (isGoogleMapsUrl(search)) {
      setGoogleSuggestions([]);
      setIsSearchingGoogle(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingGoogle(true);
      try {
        if (!searchSessionRef.current) {
          searchSessionRef.current = createAddressSearchSession();
        }
        if (trimmedSearch.length >= 2) {
          const results = await searchSessionRef.current.search(trimmedSearch);
          setGoogleSuggestions(results);
        } else {
          // Default Google places suggestions when search is brief
          setGoogleSuggestions([
            { id: 'g-riyadh', label: 'Riyadh, Saudi Arabia' },
            { id: 'g-jeddah', label: 'Jeddah, Saudi Arabia' },
            { id: 'g-dammam', label: 'Dammam, Saudi Arabia' },
          ]);
        }
      } catch (e) {
        console.error('Google Maps search error', e);
      } finally {
        setIsSearchingGoogle(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [trimmedSearch, open, search]);

  const handleSelectGooglePlace = async (sugg: AddressSuggestion) => {
    try {
      setIsResolvingPlace(true);
      if (!searchSessionRef.current) {
        searchSessionRef.current = createAddressSearchSession();
      }
      const resolved = await searchSessionRef.current.resolve(sugg.id);
      const placeName = resolved ? resolved.name : sugg.label;

      const existing = locations.find((l) => l.name.trim().toLowerCase() === placeName.trim().toLowerCase());
      if (existing) {
        onChange(existing.name || existing.id, existing);
        setOpen(false);
      } else {
        createMutation.mutate(placeName);
      }
    } catch {
      onChange(sugg.label, null);
      setOpen(false);
    } finally {
      setIsResolvingPlace(false);
    }
  };

  return (
    <Popover open={disabled ? false : open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'h-10 w-full justify-between text-xs font-medium border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 rounded-xl px-3',
            !displayLabel && 'text-muted-foreground',
            triggerClassName
          )}
        >
          <span className="flex items-center gap-2 truncate">
            <MapPin className={cn('h-3.5 w-3.5 shrink-0', displayLabel ? 'text-brand' : 'text-slate-400')} />
            <span className="truncate">{displayLabel || placeholder}</span>
          </span>
          <ChevronDown className="ml-1.5 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={4}
        className="w-[--radix-popover-trigger-width] min-w-[320px] max-w-[var(--radix-popover-trigger-width)] p-0 shadow-xl border-slate-200/90 overflow-hidden rounded-xl z-50"
      >
        <Command shouldFilter={false} className="w-full overflow-hidden">
          <CommandInput
            placeholder="Search, or paste a Google Maps link..."
            className="text-xs"
            value={search}
            onValueChange={handleSearchChange}
          />
          {(paste.status.kind !== 'idle' || pasteCreateMutation.isPending) && (
            <div className="px-2 pt-1.5">
              <PasteLocationStatus
                status={pasteCreateMutation.isPending ? { kind: 'naming' } : paste.status}
              />
            </div>
          )}
          <CommandList className="max-h-72 overflow-y-auto overscroll-contain divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading && (
              <div className="py-4 text-center text-xs text-muted-foreground">Loading locations...</div>
            )}

            {/* Section 0: This customer's own saved precise pickup/dropoff points */}
            {customerId && matchingSavedPlaces.length > 0 && (
              <CommandGroup
                heading={
                  <div className="flex items-center justify-between px-1 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    <span>Company's Saved Places</span>
                    <Badge className="bg-amber-50 text-amber-700 text-[9px] px-1.5 py-0 font-bold border border-amber-200/60 shadow-2xs shrink-0">
                      PRECISE
                    </Badge>
                  </div>
                }
              >
                {matchingSavedPlaces.map((place) => {
                  const city = resolveCityForSavedPlace(place.label, place.address);
                  return (
                    <CommandItem
                      key={place.id}
                      value={place.id}
                      className="text-xs flex items-center justify-between py-2 px-2.5 cursor-pointer hover:bg-amber-50/60 min-w-0"
                      onSelect={() => {
                        if (city) {
                          onChange(city.name, city);
                        } else {
                          onChange(place.label, null);
                        }
                        setOpen(false);
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Star className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-semibold text-slate-800">{place.label}</div>
                          {place.address && (
                            <div className="truncate text-[10px] text-slate-400">{place.address}</div>
                          )}
                        </div>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}

            {/* Section 1: Saved Rate Card Hubs */}
            <CommandGroup
              heading={
                <div className="flex items-center justify-between px-1 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  <span>Saved Rate Card Hubs</span>
                  <Badge className="bg-indigo-50 text-indigo-700 text-[9px] px-1.5 py-0 font-bold border border-indigo-200/60 shadow-2xs shrink-0">
                    AUTO RATE MATCH
                  </Badge>
                </div>
              }
            >
              {matchingSavedLocations.length === 0 ? (
                <div className="px-2.5 py-2 text-xs text-slate-400">No matching saved hubs</div>
              ) : (
                matchingSavedLocations.map((location) => (
                  <CommandItem
                    key={location.id}
                    value={location.id}
                    className="text-xs flex items-center justify-between py-2 px-2.5 cursor-pointer hover:bg-slate-50 min-w-0"
                    onSelect={() => {
                      onChange(location.name || location.id, location);
                      setOpen(false);
                    }}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Building2 className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                      <span className="truncate min-w-0 flex-1 font-semibold text-slate-800">{location.name}</span>
                    </div>
                    {value === location.id && <Check className="h-3.5 w-3.5 text-brand shrink-0 ml-1.5" />}
                  </CommandItem>
                ))
              )}
            </CommandGroup>

            {/* Section 2: Google Maps Places Search */}
            <CommandGroup
              heading={
                <div className="flex items-center justify-between px-1 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  <span>Google Maps Places Search</span>
                  {isSearchingGoogle && <Loader2 className="h-3 w-3 animate-spin text-indigo-600 shrink-0" />}
                </div>
              }
            >
              {isSearchingGoogle && googleSuggestions.length === 0 ? (
                <div className="px-2.5 py-2 text-xs text-slate-400 flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600 shrink-0" /> Searching Google Maps...
                </div>
              ) : googleSuggestions.length === 0 && trimmedSearch.length >= 2 ? (
                <div className="px-2.5 py-2 text-xs text-slate-400">No Google Maps places found</div>
              ) : (
                googleSuggestions.map((sugg) => (
                  <CommandItem
                    key={sugg.id}
                    value={sugg.id}
                    disabled={isResolvingPlace}
                    className="text-xs flex items-center gap-2 py-2 px-2.5 cursor-pointer hover:bg-slate-50 min-w-0"
                    onSelect={() => handleSelectGooglePlace(sugg)}
                  >
                    <MapPin className="h-3.5 w-3.5 text-brand shrink-0" />
                    <span className="truncate min-w-0 flex-1 text-slate-700" title={sugg.label}>
                      {sugg.label}
                    </span>
                  </CommandItem>
                ))
              )}
            </CommandGroup>
          </CommandList>

          {canCreate && (
            <div className="border-t border-slate-100 dark:border-slate-800 p-1.5">
              <button
                type="button"
                disabled={createMutation.isPending}
                onClick={() => createMutation.mutate(trimmedSearch)}
                className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-semibold text-brand hover:bg-brand/10 transition-colors disabled:opacity-60"
              >
                {createMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                Add "{trimmedSearch}" as a new location
              </button>
              {createMutation.isError && (
                <p className="px-2 pt-1 text-[11px] text-rose-600">Could not add that location.</p>
              )}
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
