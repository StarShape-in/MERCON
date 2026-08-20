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
  Navigation,
  Check,
  X,
  Loader2,
  AlertCircle,
  Map as MapIcon,
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SAUDI_MAP_CONTAINER_PROPS } from '@/utils/saudiMapConfig';
import { locationService } from '@/services/locationService';
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
  className: 'location-page-pin',
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

/** Handles map click to update coordinates */
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

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState('24.7136');
  const [lng, setLng] = useState('46.6753');
  const [error, setError] = useState<string | null>(null);

  // Google Maps Search Autocomplete state
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const sessionRef = useRef<AddressSearchSession | null>(null);
  const searchGen = useRef(0);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

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

  // Requirement completion tracking
  const completionFields = [
    { label: 'Location Name', filled: name.trim() !== '' },
    { label: 'Address Details', filled: address.trim() !== '' },
    { label: 'Coordinates', filled: isLatValid && isLngValid },
  ];
  const filledCount = completionFields.filter(f => f.filled).length;
  const completionPct = Math.round((filledCount / completionFields.length) * 100);

  return (
    <DashboardLayout active="Locations" title="Add Location">
      <div className="px-3 sm:px-5 pb-4 space-y-3 animate-fade-in max-w-[1350px] mx-auto">
        
        {/* Slim Top Action Strip */}
        <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Badge className="bg-orange-100 text-brand dark:bg-orange-950/50 dark:text-orange-400 font-bold border-none text-[11px] px-2 py-0.5">
              <MapPin className="w-3 h-3 mr-1 inline" /> Add Location Hub
            </Badge>
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">
              Saudi Fleet Location Directory & Yard Registry
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleReset}
              className="h-7 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 px-2"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/locations')}
              className="h-7 text-xs font-medium border-slate-200 dark:border-slate-800 px-2.5"
            >
              Cancel
            </Button>
            <Button 
              size="sm" 
              onClick={handleSubmit}
              disabled={saveMutation.isPending || !isFormValid}
              className="h-7 text-xs bg-brand hover:bg-brand-hover text-white font-bold px-3 shadow-xs"
            >
              {saveMutation.isPending ? 'Saving...' : 'Save Location'}
            </Button>
          </div>
        </div>

        {/* 2-Column High-Density Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          
          {/* Form Column (7 cols) */}
          <div className="lg:col-span-7 space-y-3">
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl shadow-2xs">
              <CardContent className="p-3.5 sm:p-4 space-y-3.5">

                {/* Section 1: Google Places Autocomplete */}
                <div className="space-y-2 relative" ref={dropdownRef}>
                  <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Search className="w-3.5 h-3.5 text-brand" /> Quick Search (Google Maps Autocomplete)
                    </h2>
                    <span className="text-[10px] text-slate-400 font-mono">Auto-fills name & coordinates</span>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-2.5 top-2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <Input
                      type="text"
                      placeholder="Type building, district, or yard name in Saudi Arabia..."
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="pl-9 pr-8 h-8 text-xs font-medium"
                    />
                    {isSearching && (
                      <Loader2 className="absolute right-2.5 top-2 h-4 w-4 animate-spin text-brand" />
                    )}
                  </div>

                  {/* Dropdown Suggestions */}
                  {showDropdown && suggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-900 max-h-60 overflow-y-auto">
                      <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Google Places Matches
                      </div>
                      {suggestions.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectSuggestion(item)}
                          className="w-full flex items-start gap-2 rounded-lg p-2 text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <MapPin className="h-4 w-4 text-brand shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-slate-900 dark:text-slate-100 truncate">{item.label}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Section 2: Location Identity */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-blue-500" /> Location Details
                    </h2>
                    <span className="text-[10px] text-slate-400 font-mono">* Required fields</span>
                  </div>

                  <div className="space-y-2">
                    <div className="space-y-1">
                      <Label htmlFor="name" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        Location / Yard Name <span className="text-rose-500">*</span>
                      </Label>
                      <Input
                        id="name"
                        type="text"
                        placeholder="e.g. Riyadh Industrial Sorting Yard B"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="h-8 text-xs font-medium"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="address" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        Street Address / District <span className="text-rose-500">*</span>
                      </Label>
                      <Textarea
                        id="address"
                        placeholder="Full street or yard address..."
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="min-h-[60px] text-xs font-medium resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: Geolocation Coordinates */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-emerald-500" /> Geolocation Coordinates
                    </h2>
                    <span className="text-[10px] text-slate-400 font-medium">Click map to auto-update pin</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <Label htmlFor="lat" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        Latitude <span className="text-rose-500">*</span>
                      </Label>
                      <Input
                        id="lat"
                        type="text"
                        placeholder="24.7136"
                        value={lat}
                        onChange={(e) => setLat(e.target.value)}
                        className="h-8 text-xs font-mono font-medium"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="lng" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        Longitude <span className="text-rose-500">*</span>
                      </Label>
                      <Input
                        id="lng"
                        type="text"
                        placeholder="46.6753"
                        value={lng}
                        onChange={(e) => setLng(e.target.value)}
                        className="h-8 text-xs font-mono font-medium"
                      />
                    </div>
                  </div>
                </div>

              </CardContent>
            </Card>

            {error && (
              <div className="p-2.5 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 rounded-lg text-xs font-semibold border border-rose-200 dark:border-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Interactive Map & Summary Column (5 cols) */}
          <div className="lg:col-span-5 space-y-3 sticky top-2">
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-3.5 space-y-3 shadow-2xs overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <MapIcon className="w-3.5 h-3.5 text-brand" /> Interactive Pin Placement
                </span>
                <Badge variant="outline" className="text-[10px] font-mono text-brand border-orange-200">
                  {completionPct}% Complete
                </Badge>
              </div>

              {/* Leaflet Map Display */}
              <div className="h-64 w-full rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 relative z-10 shadow-inner">
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

                <div className="absolute bottom-2 left-2 right-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs p-1.5 rounded-md border border-slate-200 dark:border-slate-800 text-[10px] font-medium text-slate-600 dark:text-slate-400 text-center z-[400] shadow-xs">
                  💡 Click anywhere on map to pin coordinates
                </div>
              </div>

              {/* Location Summary Details */}
              <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                  <span className="text-slate-400 font-semibold">Location Name:</span>
                  <span className="font-bold truncate max-w-[180px]">{name || 'Unnamed Location'}</span>
                </div>
                <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                  <span className="text-slate-400 font-semibold">Coordinates:</span>
                  <span className="font-mono text-[11px] font-bold text-brand">
                    {isLatValid && isLngValid ? `${parsedLat.toFixed(4)}, ${parsedLng.toFixed(4)}` : 'Invalid'}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
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

              <Button 
                size="sm" 
                onClick={handleSubmit} 
                disabled={saveMutation.isPending || !isFormValid}
                className="w-full h-8 text-xs bg-brand hover:bg-brand-hover text-white font-bold shadow-xs mt-1"
              >
                {saveMutation.isPending ? 'Saving...' : 'Save Location'}
              </Button>
            </Card>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}
