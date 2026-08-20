import { useCallback, useRef, useState } from 'react';
import {
  isGoogleMapsUrl,
  needsRemoteResolution,
  resolvePastedLocation,
} from '@/utils/googleMapsLink';
import { createAddressSearchSession, reverseGeocodeDetailed } from '@/services/addressSearch';

export interface PastedLocation {
  lat: number;
  lng: number;
  /** Short label for `location_name`. */
  name: string;
  /** Full postal address for `location_address` — what the driver navigates to. */
  address: string;
  addressEn: string | null;
  addressAr: string | null;
}

/** What the field should be telling the operator right now. */
export type PasteStatus =
  | { kind: 'idle' }
  /** Expanding a short link through the backend — the only slow leg. */
  | { kind: 'resolving' }
  /** Pin is already placed; the address is still being looked up. */
  | { kind: 'naming' }
  | { kind: 'done' }
  | { kind: 'error'; message: string };

/**
 * Turns a paste into a located, named place — and makes sure only the newest
 * paste is allowed to land.
 *
 * The guard is the reason this is a hook rather than five copies of an inline
 * async block. Resolving a link is two awaits deep (backend expand, then
 * reverse geocode), so an operator who pastes the wrong link and immediately
 * pastes the right one has two chains in flight at once. Without a generation
 * check the slower first one finishes last and quietly overwrites the second —
 * the field shows the address they wanted while the coordinates belong to the
 * link they abandoned, which is a truck sent to the wrong gate with nothing on
 * screen suggesting anything went wrong. Every state write below is therefore
 * gated on still being the current generation.
 */
export function usePastedLocation() {
  const [status, setStatus] = useState<PasteStatus>({ kind: 'idle' });
  const generation = useRef(0);

  /** Abandon any in-flight paste, e.g. when the operator edits the field by hand. */
  const reset = useCallback(() => {
    generation.current++;
    setStatus({ kind: 'idle' });
  }, []);

  /**
   * Returns the resolved place, or null when `text` held no location or the
   * paste was superseded. A null from a superseded paste is deliberately
   * indistinguishable from "nothing found" to the caller — either way it must
   * not write anything.
   *
   * `onCoords` fires as soon as the pin is known, before the address lookup
   * that follows it. The map is the slowest thing for an operator to re-orient
   * after, so it moves at the first possible moment rather than waiting on a
   * name it does not need.
   */
  const resolve = useCallback(async (
    text: string,
    onCoords?: (lat: number, lng: number) => void
  ): Promise<PastedLocation | null> => {
    if (!isGoogleMapsUrl(text)) {
      reset();
      return null;
    }

    const mine = ++generation.current;
    const current = () => mine === generation.current;

    // A full link or a bare coordinate pair resolves without a round trip, so
    // only announce "expanding" when there is actually a wait to explain.
    setStatus(needsRemoteResolution(text) ? { kind: 'resolving' } : { kind: 'naming' });

    const target = await resolvePastedLocation(text);
    if (!current()) return null;
    if (!target) {
      setStatus({ kind: 'error', message: "Couldn't read a location from that link." });
      return null;
    }

    // Links shared from the Maps app name a place without carrying its pin.
    // Look the name up through the same Places search the dropdown uses,
    // which is the only way to turn it into coordinates.
    if (target.kind === 'place') {
      setStatus({ kind: 'naming' });
      try {
        const session = createAddressSearchSession();
        const [first] = await session.search(target.query);
        if (!current()) return null;
        if (!first) {
          setStatus({ kind: 'error', message: `Couldn't find "${target.query}" on the map.` });
          return null;
        }
        const found = await session.resolve(first.id);
        if (!current()) return null;
        if (!found) {
          setStatus({ kind: 'error', message: `Couldn't find "${target.query}" on the map.` });
          return null;
        }
        onCoords?.(found.lat, found.lng);
        setStatus({ kind: 'done' });
        return {
          lat: found.lat,
          lng: found.lng,
          name: found.name,
          address: found.address || found.name,
          // Places answers in one language; the bilingual pair only exists
          // for pins we reverse geocode ourselves.
          addressEn: null,
          addressAr: null,
        };
      } catch (err) {
        console.warn('[usePastedLocation] place lookup failed', err);
        if (!current()) return null;
        setStatus({ kind: 'error', message: "Couldn't read a location from that link." });
        return null;
      }
    }

    onCoords?.(target.lat, target.lng);
    setStatus({ kind: 'naming' });
    const place = await reverseGeocodeDetailed(target.lat, target.lng);
    if (!current()) return null;

    const fallback = `${target.lat.toFixed(5)}, ${target.lng.toFixed(5)}`;
    setStatus({ kind: 'done' });
    return {
      lat: target.lat,
      lng: target.lng,
      name: place?.name || fallback,
      address: place?.address || fallback,
      addressEn: place?.addressEn ?? null,
      addressAr: place?.addressAr ?? null,
    };
  }, [reset]);

  return { status, resolve, reset };
}
