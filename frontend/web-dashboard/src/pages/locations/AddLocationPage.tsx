import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  RotateCcw,
  Save,
  Search,
  Building2,
  Globe,
  ArrowLeft,
  ArrowRight,
  Check,
  X,
  Loader2,
  AlertCircle,
  Map as MapIcon,
  Info,
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SAUDI_MAP_CONTAINER_PROPS } from '@/utils/saudiMapConfig';
import { locationService } from '@/services/locationService';
import {
  createAddressSearchSession,
  reverseGeocodeDetailed,
  type AddressSearchSession,
  type AddressSuggestion,
} from '@/services/addressSearch';
import { isGoogleMapsUrl } from '@/utils/googleMapsLink';
import { usePastedLocation } from '@/hooks/usePastedLocation';
import AddressLanguagePicker from '@/components/ui/AddressLanguagePicker';
import PasteLocationStatus from '@/components/ui/PasteLocationStatus';

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
  className: 'location-page-pin',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

function FlyToPin({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], Math.max(map.getZoom(), 13), { animate: true });
  }, [lat, lng, map]);
  return null;
}

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function AddLocationPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [customerId, setCustomerId] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState('24.7136');
  const [lng, setLng] = useState('46.6753');
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [addressOptions, setAddressOptions] = useState<{ en: string | null; ar: string | null }>({
    en: null,
    ar: null,
  });
  const paste = usePastedLocation();

  const sessionRef = useRef<AddressSearchSession | null>(null);
  const searchGen = useRef(0);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setError(null);
    setAddressOptions({ en: null, ar: null });
    if (!query.trim()) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    if (isGoogleMapsUrl(query.trim())) {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      setSuggestions([]);
      setShowDropdown(false);
      setIsSearching(false);
      void (async () => {
        const place = await paste.resolve(query.trim(), (lat, lng) => {
          setLat(lat.toFixed(6));
          setLng(lng.toFixed(6));
        });
        if (!place) return;
        setName((prev) => prev.trim() || place.name);
        setAddress((prev) => prev.trim() || place.address);
        setAddressOptions({ en: place.addressEn, ar: place.addressAr });
        setSearchQuery(place.name);
      })();
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

  const handleSelectSuggestion = async (suggestion: AddressSuggestion) => {
    if (!sessionRef.current) return;
    setShowDropdown(false);
    setIsSearching(true);

    try {
      const resolved = await sessionRef.current.resolve(suggestion.id);
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

  const handleMapPinClick = (newLat: number, newLng: number) => {
    setLat(newLat.toFixed(6));
    setLng(newLng.toFixed(6));
  };

  const handleReset = () => {
    setName('');
    setAddress('');
    setLat('24.7136');
    setLng('46.6753');
    setSearchQuery('');
    setSuggestions([]);
    setShowDropdown(false);
    setError(null);
    toast.info('Form reset to original values');
  };

  const parsedLat = parseFloat(lat);
  const parsedLng = parseFloat(lng);
  const isLatValid = !isNaN(parsedLat) && parsedLat >= -90 && parsedLat <= 90;
  const isLngValid = !isNaN(parsedLng) && parsedLng >= -180 && parsedLng <= 180;
  const isFormValid = name.trim() !== '' && address.trim() !== '' && isLatValid && isLngValid;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        customerId: customerId || 'default-customer-id',
        name: name.trim(),
        address: address.trim(),
        lat: parsedLat,
        lng: parsedLng,
      };
      return locationService.create(payload);
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      queryClient.invalidateQueries({ queryKey: ['locations-all'] });
      toast.success(`Location "${saved.name}" registered successfully`);
      navigate('/locations');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error?.message || err.message || 'Could not save the location.';
      setError(msg);
      toast.error(msg);
    },
  });

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);

    if (!name.trim()) return setError('Location name is required.');
    if (!address.trim()) return setError('Street / postal address is required.');
    if (!isLatValid || !isLngValid) return setError('Valid latitude and longitude coordinates are required.');

    saveMutation.mutate();
  };

  const completionFields = [
    { label: 'Location Name', filled: name.trim() !== '' },
    { label: 'Address Details', filled: address.trim() !== '' },
    { label: 'Coordinates', filled: isLatValid && isLngValid },
  ];
  const filledCount = completionFields.filter(f => f.filled).length;
  const completionPct = Math.round((filledCount / completionFields.length) * 100);

  return (
    <DashboardLayout active="Locations" title="Add Location">
      <div className="px-3 sm:px-5 pb-10 space-y-6 animate-fade-in w-full max-w-[1350px] mx-auto">
        
        {/* ── 1. Top Bar Header & Action Strip ─────────────────────────────── */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2.5 min-w-0">
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight truncate">
                Add Location
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleReset}
              className="h-9 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 font-semibold rounded-xl cursor-pointer"
              type="button"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/locations')}
              className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 text-xs font-semibold h-9 rounded-xl cursor-pointer"
              disabled={saveMutation.isPending}
              type="button"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => handleSubmit()}
              className="h-9 gap-1.5 text-xs bg-brand hover:bg-brand-hover text-white font-bold shadow-xs rounded-xl px-4 cursor-pointer"
              disabled={!isFormValid || saveMutation.isPending}
              type="button"
            >
              <Save className="w-3.5 h-3.5" /> Save Location
            </Button>
          </div>
        </div>

        {/* 2-Column Form Layout */}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column (lg:col-span-7 space-y-6) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Card 1: Google Autocomplete Search */}
            <Card className="shadow-xs border-slate-200 dark:border-slate-800 rounded-xl relative z-20" ref={dropdownRef}>
              <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 pb-4">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-brand" /> Quick Search
                </CardTitle>
                <CardDescription className="text-xs">
                  Lookup a address, place, or paste a Google Maps link to auto-fill location details.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-5 space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                  <Input
                    type="text"
                    placeholder="Type name/address, or paste a Google Maps link..."
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-10 pr-10 h-10 text-xs font-medium rounded-xl"
                  />
                  {(isSearching || paste.status.kind === 'resolving' || paste.status.kind === 'naming') && (
                    <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-brand" />
                  )}
                </div>
                <PasteLocationStatus status={paste.status} />

                {/* Autocomplete Dropdown */}
                {showDropdown && suggestions.length > 0 && (
                  <div className="absolute left-3 right-3 mt-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-900 max-h-60 overflow-y-auto animate-fade-in">
                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Google Places Matches
                    </div>
                    {suggestions.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectSuggestion(item)}
                        className="w-full flex items-start gap-2 rounded-lg p-2 text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <MapPin className="h-4 w-4 text-brand shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-900 dark:text-slate-100 truncate">{item.label}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Card 2: Identity & Details */}
            <Card className="shadow-xs border-slate-200 dark:border-slate-800 rounded-xl">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 pb-4">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-indigo-500" /> Identity Details
                </CardTitle>
                <CardDescription className="text-xs">
                  Assign a descriptive name and full address coordinates to register this yard.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-5 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Location / Yard Name <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="e.g. Riyadh Industrial Sorting Yard B"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-10 text-xs font-medium rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="address" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Street Address / District <span className="text-rose-500">*</span>
                  </Label>
                  <Textarea
                    id="address"
                    placeholder="Full street or yard address..."
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="min-h-[80px] text-xs font-medium resize-none rounded-xl"
                  />
                  <AddressLanguagePicker
                    addressEn={addressOptions.en}
                    addressAr={addressOptions.ar}
                    value={address}
                    onChange={setAddress}
                  />
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Right Column (lg:col-span-5 space-y-6) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Card 3: Coordinates & Map */}
            <Card className="shadow-xs border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 pb-4">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-emerald-500" /> Geolocation &amp; Map
                </CardTitle>
                <CardDescription className="text-xs">
                  Drag, type, or click the interactive map to configure spatial coordinates.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="lat" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Latitude <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="lat"
                      type="text"
                      placeholder="24.7136"
                      value={lat}
                      onChange={(e) => setLat(e.target.value)}
                      className="h-10 text-xs font-mono font-medium rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="lng" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Longitude <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="lng"
                      type="text"
                      placeholder="46.6753"
                      value={lng}
                      onChange={(e) => setLng(e.target.value)}
                      className="h-10 text-xs font-mono font-medium rounded-xl"
                    />
                  </div>
                </div>

                {/* Leaflet Map display widget */}
                <div className="h-64 w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 relative z-10 shadow-inner">
                  <MapContainer
                    className="h-full w-full"
                    {...SAUDI_MAP_CONTAINER_PROPS}
                    center={[isLatValid ? parsedLat : 24.7136, isLngValid ? parsedLng : 46.6753]}
                    zoom={12}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; OpenStreetMap'
                    />
                    {isLatValid && isLngValid && (
                      <>
                        <Marker position={[parsedLat, parsedLng]} icon={customPinIcon} />
                        <FlyToPin lat={parsedLat} lng={parsedLng} />
                      </>
                    )}
                    <MapClickHandler onMapClick={handleMapPinClick} />
                  </MapContainer>

                  <div className="absolute bottom-2 left-2 right-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs p-1.5 rounded-md border border-slate-200 dark:border-slate-800 text-[10px] font-medium text-slate-600 dark:text-slate-400 text-center z-[400] shadow-xs flex items-center justify-center gap-1.5">
                    <Info className="w-3 h-3 text-brand shrink-0" />
                    <span>Click anywhere on map to pin coordinates</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
                  <div className="flex justify-between text-[10px] font-semibold text-slate-500">
                    <span>Requirements</span>
                    <span>{filledCount} of {completionFields.length}</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-brand h-full transition-all duration-300 rounded-full"
                      style={{ width: `${completionPct}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {error && (
              <div className="p-3.5 bg-destructive/10 text-destructive dark:text-rose-400 rounded-xl text-xs font-semibold border border-destructive/20 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

          </div>

        </form>

      </div>
    </DashboardLayout>
  );
}
