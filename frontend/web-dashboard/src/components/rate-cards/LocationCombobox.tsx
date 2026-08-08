import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronDown, MapPin, Plus, Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { locationService, Location } from '@/services/locationService';

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
}

/**
 * Picks a lane endpoint, and creates one inline when the place isn't on the
 * list yet. The inline create matters: the dispatcher hits a new lane
 * mid-dispatch, and sending them to a separate admin screen to add "Madinah"
 * before they can price the trip is how free-text spellings crept in.
 */
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
}: LocationComboboxProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data: locationsRes, isLoading } = useQuery({
    queryKey: ['locations'],
    queryFn: () => locationService.getAll({ active_only: true }),
  });

  const locations = (locationsRes?.data || []).filter((l) => l.id !== excludeLocationId);
  const selected = locations.find((l) => l.id === value) || null;

  const createMutation = useMutation({
    mutationFn: (name: string) =>
      locationService.create({ name, lat: newLocationLat ?? null, lng: newLocationLng ?? null }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      onChange(created.id, created);
      setSearch('');
      setOpen(false);
    },
  });

  const trimmedSearch = search.trim();
  const alreadyExists = locations.some(
    (l) => l.name.trim().toLowerCase() === trimmedSearch.toLowerCase()
  );
  const canCreate = trimmedSearch.length > 0 && !alreadyExists;

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
            'h-9 w-full justify-between text-xs font-normal border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700',
            !selected && 'text-muted-foreground',
            triggerClassName
          )}
        >
          <span className="flex items-center gap-1.5 truncate">
            <MapPin className={cn('h-3.5 w-3.5 shrink-0', selected ? 'text-[#E8450F]' : 'opacity-50')} />
            <span className="truncate">{selected ? selected.name : placeholder}</span>
          </span>
          <ChevronDown className="ml-1.5 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command
          filter={(itemValue, searchTerm) => {
            const option = locations.find((l) => l.id === itemValue);
            if (!option) return 0;
            return option.name.toLowerCase().includes(searchTerm.toLowerCase()) ? 1 : 0;
          }}
        >
          <CommandInput
            placeholder="Search or type a new place..."
            className="text-xs"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {isLoading ? (
              <div className="py-4 text-center text-xs text-muted-foreground">Loading locations...</div>
            ) : (
              <CommandEmpty className="py-3 text-xs text-center text-muted-foreground">
                {trimmedSearch ? 'No match — add it below.' : 'No locations yet.'}
              </CommandEmpty>
            )}

            <CommandGroup>
              {locations.map((location) => (
                <CommandItem
                  key={location.id}
                  value={location.id}
                  className="text-xs"
                  onSelect={() => {
                    onChange(location.id, location);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn('mr-2 h-3.5 w-3.5', value === location.id ? 'opacity-100' : 'opacity-0')}
                  />
                  <span className="truncate">{location.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>

          {canCreate && (
            <div className="border-t border-slate-100 dark:border-slate-800 p-1.5">
              <button
                type="button"
                disabled={createMutation.isPending}
                onClick={() => createMutation.mutate(trimmedSearch)}
                className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-semibold text-[#E8450F] hover:bg-[#E8450F]/10 transition-colors disabled:opacity-60"
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
