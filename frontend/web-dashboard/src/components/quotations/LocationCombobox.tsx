import { useState, useRef, useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronDown, MapPin, Plus, Loader2, Building2, AlertTriangle } from 'lucide-react';

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
    return locations.find((l) => l.id === value || l.code === value || l.name === value || (value && l.name.trim().toLowerCase() === value.trim().toLowerCase())) || null;
  }, [locations, value]);

  const trimmedSearch = search.trim();
  const matchingLocations = useMemo(() => {
    return locations.filter((loc) => {
      return trimmedSearch ? matchesSearch(trimmedSearch, [loc.code, loc.name, loc.city, loc.address]) : true;
    });
  }, [locations, trimmedSearch]);

  const alreadyExists = locations.some(
    (l) => l.name.trim().toLowerCase() === trimmedSearch.toLowerCase() || l.code.trim().toLowerCase() === trimmedSearch.toLowerCase()
  );

  const canCreate = customerId && trimmedSearch.length > 0 && !alreadyExists && !isGoogleMapsUrl(trimmedSearch);

  const displayLabel = selected ? `${selected.code} — ${selected.name}` : value ? value : '';

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

  const createMutation = useMutation({
    mutationFn: (name: string) => {
      if (!customerId) throw new Error('Customer is required');
      const code = name.trim().toUpperCase().substring(0, 3);
      return locationService.create({
        customerId,
        code,
        name,
        lat: newLocationLat ?? null,
        lng: newLocationLng ?? null,
        coordinate_precision: newLocationLat != null ? 'APPROXIMATE' : 'UNKNOWN',
      });
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      onChange(created.id, created);
      setSearch('');
      setOpen(false);
    },
  });

  const handleSearchChange = (val: string) => {
    setSearch(val);

    if (isGoogleMapsUrl(val.trim())) {
      void (async () => {
        const place = await paste.resolve(val.trim());
        if (!place) return;
        if (!customerId) return;
        const code = place.name.trim().toUpperCase().substring(0, 3);
        const created = await locationService.create({
          customerId,
          code,
          name: place.name,
          address: place.address,
          lat: place.lat,
          lng: place.lng,
          coordinate_precision: 'APPROXIMATE',
        });
        queryClient.invalidateQueries({ queryKey: ['locations'] });
        onChange(created.id, created);
        setSearch('');
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
            {isLoading && (
              <div className="py-4 text-center text-xs text-muted-foreground">Loading locations...</div>
            )}

            <CommandGroup
              heading={
                <div className="flex items-center justify-between px-1 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  <span>Customer Locations</span>
                  <Badge className="bg-indigo-50 text-indigo-700 text-[9px] px-1.5 py-0 font-bold border border-indigo-200/60 shadow-2xs shrink-0">
                    CUSTOMER SCOPED
                  </Badge>
                </div>
              }
            >
              {matchingLocations.length === 0 ? (
                <div className="px-2.5 py-3 text-xs text-slate-400 text-center">
                  {customerId ? 'No matching locations found for this customer.' : 'Select a customer first to view locations.'}
                </div>
              ) : (
                matchingLocations.map((loc) => {
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
                          <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[9px] font-bold">
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
                })
              )}
            </CommandGroup>

            {canCreate && (
              <CommandGroup heading="Create New Location">
                <CommandItem
                  onSelect={() => createMutation.mutate(trimmedSearch)}
                  className="text-xs font-bold text-brand cursor-pointer flex items-center gap-2 py-2 px-2.5"
                >
                  <Plus className="w-4 h-4 text-brand" />
                  <span>Create "{trimmedSearch}" for selected customer</span>
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
