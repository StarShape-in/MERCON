import { useState, useRef, useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronDown, MapPin, Plus, Loader2, Building2, AlertTriangle, Sparkles, Globe } from 'lucide-react';
import { toast } from 'sonner';

import { cn, isUuid } from '@/lib/utils';
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
import { matchesSearch } from '@/lib/search';
import { createAddressSearchSession, AddressSearchSession, AddressSuggestion } from '@/services/addressSearch';
import { isGoogleMapsUrl, extractCityFromAddress, parsePastedAddressText } from '@/utils/googleMapsLink';
import { usePastedLocation } from '@/hooks/usePastedLocation';
import PasteLocationStatus from '@/components/ui/PasteLocationStatus';
import LocationFormDialog, { LocationFormInitialData } from '@/components/locations/LocationFormDialog';

interface LocationComboboxProps {
  id?: string;
  value: string;
  onChange: (locationId: string, location: Location | null) => void;
  placeholder?: string;
  disabled?: boolean;
  newLocationLat?: number | null;
  newLocationLng?: number | null;
  excludeLocationId?: string;
  triggerClassName?: string;
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

  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [pendingLocationData, setPendingLocationData] = useState<LocationFormInitialData | null>(null);
  const [createdLocation, setCreatedLocation] = useState<Location | null>(null);

  const [googleSuggestions, setGoogleSuggestions] = useState<AddressSuggestion[]>([]);
  const [isSearchingGoogle, setIsSearchingGoogle] = useState(false);
  const searchSessionRef = useRef<AddressSearchSession | null>(null);
  const paste = usePastedLocation();

  const { data: locationsRes, isLoading } = useQuery({
    queryKey: ['locations', customerId],
    queryFn: () => locationService.getAll({ customerId, active_only: true }),
  });

  const locations = useMemo(() => {
    const list = locationsRes?.data || [];
    return list.filter((l) => l.id !== excludeLocationId);
  }, [locationsRes?.data, excludeLocationId]);

  const selected = useMemo(() => {
    const found = locations.find((l) => l.id === value || l.code === value || l.name === value || (value && l.name.trim().toLowerCase() === value.trim().toLowerCase()));
    if (found) return found;
    if (createdLocation && (createdLocation.id === value || createdLocation.code === value || createdLocation.name === value)) {
      return createdLocation;
    }
    return null;
  }, [locations, value, createdLocation]);

  const trimmedSearch = search.trim();
  const matchingLocations = useMemo(() => {
    return locations.filter((loc) => {
      return trimmedSearch ? matchesSearch(trimmedSearch, [loc.code, loc.name, loc.city, loc.address]) : true;
    });
  }, [locations, trimmedSearch]);

  const alreadyExists = locations.some(
    (l) => l.name.trim().toLowerCase() === trimmedSearch.toLowerCase() || l.code.trim().toLowerCase() === trimmedSearch.toLowerCase()
  );

  const canCreate = trimmedSearch.length > 0 && !alreadyExists && !isGoogleMapsUrl(trimmedSearch);

  const displayLabel = selected 
    ? `${selected.code} — ${selected.name}` 
    : createdLocation && (createdLocation.id === value || createdLocation.code === value)
    ? `${createdLocation.code} — ${createdLocation.name}`
    : value && !isUuid(value) 
    ? value 
    : '';


  useEffect(() => {
    if (!open) return;
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

  const handleSelectGoogleSuggestion = async (sug: AddressSuggestion) => {
    if (!searchSessionRef.current) return;
    setIsSearchingGoogle(true);
    try {
      const resolved = await searchSessionRef.current.resolve(sug.id);
      if (!resolved) {
        toast.error('Could not resolve location coordinates from map.');
        return;
      }

      const extractedCity = extractCityFromAddress(resolved.address || resolved.name || '', resolved.name);
      setPendingLocationData({
        name: resolved.name,
        address: resolved.address || resolved.name,
        city: extractedCity,
        lat: resolved.lat,
        lng: resolved.lng,
        code: '',
        coordinate_precision: 'EXACT',
        sourceUrl: sug.label,
      });
      setIsSaveModalOpen(true);
      setOpen(false);
    } catch (err) {
      console.error('Failed to resolve Google suggestion', err);
      toast.error('Failed to resolve map location.');
    } finally {
      setIsSearchingGoogle(false);
    }
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);

    if (isGoogleMapsUrl(val.trim())) {
      void (async () => {
        const place = await paste.resolve(val.trim());
        if (!place) return;

        const urlPasted = val.trim();
        const extractedCity = extractCityFromAddress(place.address || place.name || '', place.name);
        setPendingLocationData({
          name: place.name,
          address: place.address || place.name,
          city: extractedCity,
          lat: place.lat,
          lng: place.lng,
          code: '',
          coordinate_precision: 'EXACT',
          sourceUrl: urlPasted,
        });
        setIsSaveModalOpen(true);
        setOpen(false);
      })();
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between font-normal text-xs h-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800',
            !selected && 'text-slate-400',
            triggerClassName
          )}
        >
          <span className="flex items-center gap-2 truncate">
            <MapPin className={cn('h-3.5 w-3.5 shrink-0', selected ? 'text-brand' : 'text-slate-400')} />
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
            placeholder="Search code, location name, address or paste Google Maps URL..."
            className="text-xs"
            value={search}
            onValueChange={handleSearchChange}
          />
          {paste.status.kind !== 'idle' && (
            <div className="px-2 pt-1.5">
              <PasteLocationStatus status={paste.status} />
            </div>
          )}
          <CommandList className="max-h-72 overflow-y-auto overscroll-contain divide-y divide-slate-100 dark:divide-slate-800">
            {(isLoading || isSearchingGoogle) && (
              <div className="py-2.5 px-3 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-brand" />
                <span>Searching locations &amp; map places...</span>
              </div>
            )}

            {matchingLocations.length > 0 ? (
              <CommandGroup
                heading={
                  <div className="flex items-center justify-between px-1 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    <span>Customer Locations</span>
                    <Badge className="bg-amber-50 text-amber-800 text-[9px] px-1.5 py-0 font-bold border border-amber-200/60 shadow-2xs shrink-0">
                      CUSTOMER SCOPED
                    </Badge>
                  </div>
                }
              >
                {matchingLocations.map((loc) => {
                  const prec = loc.coordinate_precision || (loc.lat != null ? 'APPROXIMATE' : 'UNKNOWN');
                  return (
                    <CommandItem
                      key={loc.id}
                      value={loc.id}
                      className="text-xs flex items-center justify-between py-2 px-2.5 cursor-pointer hover:bg-slate-50 min-w-0"
                      onSelect={() => {
                        onChange(loc.id, loc);
                        setOpen(false);
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="font-mono text-[10px] font-black text-slate-900 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded shrink-0">
                          {loc.code}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-semibold text-slate-900 dark:text-slate-100">{loc.name}</div>
                          {loc.address && (
                            <div className="truncate text-[10px] text-slate-400">{loc.address}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {prec === 'EXACT' && (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px] font-bold">
                            ✓ Exact
                          </Badge>
                        )}
                        {prec === 'APPROXIMATE' && (
                          <Badge className="bg-amber-50 text-amber-800 border-amber-200 text-[9px] font-bold">
                            ≈ Area
                          </Badge>
                        )}
                        {prec === 'UNKNOWN' && (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[9px] font-bold">
                            ○ Not Pinned
                          </Badge>
                        )}
                        {selected?.id === loc.id && <Check className="h-3.5 w-3.5 text-brand shrink-0" />}
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ) : !trimmedSearch ? (
              <CommandGroup
                heading={
                  <div className="flex items-center justify-between px-1 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    <span>Customer Locations</span>
                    <Badge className="bg-amber-50 text-amber-800 text-[9px] px-1.5 py-0 font-bold border border-amber-200/60 shadow-2xs shrink-0">
                      CUSTOMER SCOPED
                    </Badge>
                  </div>
                }
              >
                <div className="px-2.5 py-3 text-xs text-slate-400 text-center">
                  {customerId ? 'No locations found for this customer.' : 'Select a customer first to view customer locations.'}
                </div>
              </CommandGroup>
            ) : null}

            {/* Live Google Maps & Address Search Results */}
            {googleSuggestions.length > 0 && (
              <CommandGroup
                heading={
                  <div className="flex items-center justify-between px-1 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    <span>Google Maps & Address Search</span>
                    <Badge className="bg-emerald-50 text-emerald-800 text-[9px] px-1.5 py-0 font-bold border border-emerald-200/60 shadow-2xs shrink-0 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-600" /> LIVE MAP
                    </Badge>
                  </div>
                }
              >
                {googleSuggestions.map((sug) => (
                  <CommandItem
                    key={sug.id}
                    value={`google-${sug.id}-${sug.label}`}
                    className="text-xs flex items-center justify-between py-2 px-2.5 cursor-pointer hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30"
                    onSelect={() => handleSelectGoogleSuggestion(sug)}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate font-medium text-slate-800 dark:text-slate-200">{sug.label}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {canCreate && (
              <CommandGroup heading="Create Custom Location">
                <CommandItem
                  onSelect={() => {
                    const parsed = parsePastedAddressText(trimmedSearch);
                    setPendingLocationData({
                      name: parsed.name,
                      address: parsed.address,
                      city: parsed.city,
                      postalCode: parsed.postalCode,
                      code: '',
                      lat: newLocationLat ?? null,
                      lng: newLocationLng ?? null,
                      coordinate_precision: newLocationLat != null ? 'APPROXIMATE' : 'UNKNOWN',
                    });
                    setIsSaveModalOpen(true);
                    setOpen(false);
                  }}
                  className="text-xs font-bold text-brand cursor-pointer flex items-center gap-2 py-2 px-2.5 hover:bg-orange-50 dark:hover:bg-orange-950/40"
                >
                  <Plus className="w-4 h-4 text-brand shrink-0" />
                  <span>+ Create "{trimmedSearch}"</span>
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>

      <LocationFormDialog
        isOpen={isSaveModalOpen}
        onClose={() => {
          setIsSaveModalOpen(false);
          setPendingLocationData(null);
        }}
        defaultCustomerId={customerId}
        initialData={pendingLocationData}
        onSuccessLocation={(created) => {
          setCreatedLocation(created);

          const updateCache = (old: any) => {
            if (!old) return { data: [created] };
            if (Array.isArray(old)) return [created, ...old];
            if (Array.isArray(old.data)) return { ...old, data: [created, ...old.data] };
            return old;
          };

          if (customerId) queryClient.setQueryData(['locations', customerId], updateCache);
          if (created.customerId) queryClient.setQueryData(['locations', created.customerId], updateCache);
          queryClient.setQueryData(['locations'], updateCache);
          queryClient.setQueryData(['locations-lookup-all'], updateCache);

          queryClient.invalidateQueries({ queryKey: ['locations'] });
          onChange(created.id, created);
          setSearch('');
        }}
      />
    </Popover>
  );
}
