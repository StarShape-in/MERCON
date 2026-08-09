import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, MapPin } from 'lucide-react';
import {
  createAddressSearchSession,
  type AddressSearchSession,
  type AddressSuggestion,
} from '@/services/addressSearch';

const pinIcon = L.divIcon({
  html: `<div style="background-color: #E8450F; color: white; padding: 5px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); box-shadow: 0 4px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; width: 26px; height: 26px;"></div>`,
  className: '',
  iconSize: [26, 26],
  iconAnchor: [13, 26],
});

interface LocationPickerMapProps {
  label: string;
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
  /** Center the map here until a pin is placed. */
  defaultCenter?: [number, number];
  /** What this place is called, shown as the route label in delay reports. */
  name: string;
  onNameChange: (name: string) => void;
  /**
   * The full postal address behind the pin. Separate from `name` because the
   * name is a short label reports group by, while this is what the driver's
   * app needs to actually find the place — truncating one into the other is
   * lossy and can't be undone. Optional so callers that only want a pin and a
   * label (the older screens) don't have to care.
   */
  address?: string;
  onAddressChange?: (address: string) => void;
}

function ClickToPlacePin({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/** Recenters the map when a pin is set via address search (not on every render). */
function FlyToPin({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], Math.max(map.getZoom(), 13), { animate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng]);
  return null;
}

export default function LocationPickerMap({ label, lat, lng, onChange, name, onNameChange, address, onAddressChange, defaultCenter = [24.7136, 46.6753] }: LocationPickerMapProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AddressSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextSearch = useRef(false);
  /**
   * The current search interaction. Held across keystrokes so all of them
   * share one billing session, and dropped after a pick — the session ends
   * with the Place Details lookup, so the next search must start a new one.
   */
  const sessionRef = useRef<AddressSearchSession | null>(null);
  /**
   * Identifies the only search whose response we still want. Debouncing does
   * not make searches mutually exclusive — clearing a timer that has already
   * fired does nothing, so a slow request stays in flight while the next one
   * starts, and responses can arrive out of order. Anything whose generation
   * no longer matches was superseded, by a later keystroke or by a pick, and
   * must not touch state.
   */
  const searchGeneration = useRef(0);

  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return;
    }
    if (!query.trim()) {
      setResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const generation = ++searchGeneration.current;
      const current = () => generation === searchGeneration.current;
      setSearching(true);
      try {
        if (!sessionRef.current) sessionRef.current = createAddressSearchSession();
        const rows = await sessionRef.current.search(query);
        if (!current()) return;
        setResults(rows);
        setShowResults(true);
      } catch {
        if (current()) setResults([]);
      } finally {
        // Only the live request owns the spinner; a superseded one clearing it
        // would report "done" while the newest search is still running.
        if (current()) setSearching(false);
      }
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const pickResult = async (s: AddressSuggestion) => {
    const session = sessionRef.current;
    if (!session) return;
    // Retire any search still in flight. Without this, one landing after the
    // pick would re-open the dropdown over a session that is already spent.
    searchGeneration.current++;
    // Close the dropdown first: resolving is a network round trip, and leaving
    // the list open through it invites a second click on a spent session.
    setShowResults(false);
    const picked = await session.resolve(s.id);
    // The session is spent whether or not it answered — a token is billed once.
    sessionRef.current = null;
    if (!picked) return;

    onChange(picked.lat, picked.lng);
    // Fill the name from the address that was just searched, so the common
    // path costs no extra typing. Overwrites deliberately: a new pin is a new
    // place, and carrying the old label over would silently mislabel it.
    onNameChange(picked.name);
    // Keep the whole address too. This used to be thrown away the moment the
    // label was extracted, which is why a driver only ever received two
    // coordinates and no way to tell where they were going.
    onAddressChange?.(picked.address);
    skipNextSearch.current = true;
    setQuery(picked.address);
  };

  const center: [number, number] = lat != null && lng != null ? [lat, lng] : defaultCenter;

  return (
    <div className="col-span-1 md:col-span-2 flex flex-col gap-1.5">
      <label className="text-xs font-bold text-[#111]">{label}</label>

      <div className="relative">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6E6E80]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setShowResults(true)}
            placeholder="Search an address…"
            className="w-full h-9 rounded-md bg-[#F5F5F7] border border-transparent focus:border-[#E8450F]/30 focus:bg-white pl-8 pr-3 text-sm outline-none transition-colors"
          />
        </div>
        {showResults && results.length > 0 && (
          <div className="absolute z-[500] mt-1 w-full bg-white rounded-md shadow-lg border border-black/[0.06] max-h-52 overflow-y-auto">
            {results.map((r) => (
              <button
                type="button"
                key={r.id}
                onClick={() => void pickResult(r)}
                className="w-full text-left px-3 py-2 text-xs text-[#111] hover:bg-[#F5F5F7] border-b border-black/[0.04] last:border-b-0"
              >
                {r.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <input
        type="text"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder="Location name — e.g. Khamis Sorting Center"
        maxLength={120}
        className="w-full h-9 rounded-md bg-[#F5F5F7] border border-transparent focus:border-[#E8450F]/30 focus:bg-white px-3 text-sm outline-none transition-colors"
      />

      {/* Editable so a pin dropped by hand (never searched) can still be given
          an address — otherwise the driver gets coordinates and nothing else. */}
      {onAddressChange && (
        <textarea
          value={address ?? ''}
          onChange={(e) => onAddressChange(e.target.value)}
          placeholder="Full address the driver will see — filled in when you search, editable"
          rows={2}
          maxLength={500}
          className="w-full rounded-md bg-[#F5F5F7] border border-transparent focus:border-[#E8450F]/30 focus:bg-white px-3 py-2 text-xs outline-none transition-colors resize-none"
        />
      )}

      <div className="rounded-xl overflow-hidden border border-black/[0.06] h-[220px] relative z-0">
        <MapContainer center={center} zoom={lat != null ? 14 : 6} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickToPlacePin onPick={onChange} />
          {lat != null && lng != null && (
            <>
              <FlyToPin lat={lat} lng={lng} />
              <Marker
                position={[lat, lng]}
                icon={pinIcon}
                draggable
                eventHandlers={{
                  dragend: (e) => {
                    const m = e.target as L.Marker;
                    const pos = m.getLatLng();
                    onChange(pos.lat, pos.lng);
                  },
                }}
              />
            </>
          )}
        </MapContainer>
      </div>

      <div className="flex items-center gap-1.5 text-[10px] text-[#6E6E80]">
        <MapPin size={11} />
        {lat != null && lng != null ? (
          <span>{lat.toFixed(6)}, {lng.toFixed(6)}</span>
        ) : (
          <span>Search an address or click the map to drop a pin</span>
        )}
      </div>
    </div>
  );
}
