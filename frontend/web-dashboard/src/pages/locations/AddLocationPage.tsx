import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  Save,
  Search,
  Building2,
  Loader2,
  AlertTriangle,
  Map as MapIcon,
  CheckCircle2,
  Plus,
  ExternalLink,
  Lock,
  X,
  Compass,
  Link2,
  RotateCcw,
  Check,
  Info,
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Combobox } from '@/components/ui/combobox';
import CreateCustomerModal from '@/components/customers/CreateCustomerModal';
import { SAUDI_MAP_CONTAINER_PROPS } from '@/utils/saudiMapConfig';
import { locationService, CoordinatePrecision } from '@/services/locationService';
import { customerService } from '@/services/customerService';
import {
  createAddressSearchSession,
  reverseGeocodeDetailed,
  type AddressSearchSession,
  type AddressSuggestion,
} from '@/services/addressSearch';
import { isGoogleMapsUrl } from '@/utils/googleMapsLink';
import { usePastedLocation } from '@/hooks/usePastedLocation';

const customPinIcon = L.divIcon({
  html: `
    <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
      <div style="
        width: 30px;
        height: 30px;
        border-radius: 50%;
        background: #E8450F;
        border: 3px solid #FFFFFF;
        box-shadow: 0 4px 12px rgba(232, 69, 15, 0.45);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      </div>
    </div>
  `,
  className: 'location-page-pin',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
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

// Helper to detect city from coordinates in Saudi Arabia
function detectCityFromCoords(lat: number, lng: number): string | null {
  if (lat >= 24.4 && lat <= 25.1 && lng >= 46.4 && lng <= 47.0) return 'Riyadh';
  if (lat >= 21.3 && lat <= 21.8 && lng >= 39.0 && lng <= 39.4) return 'Jeddah';
  if (lat >= 26.2 && lat <= 26.6 && lng >= 49.9 && lng <= 50.3) return 'Dammam';
  if (lat >= 21.3 && lat <= 21.6 && lng >= 39.7 && lng <= 40.0) return 'Makkah';
  if (lat >= 24.3 && lat <= 24.7 && lng >= 39.4 && lng <= 39.8) return 'Madinah';
  if (lat >= 26.2 && lat <= 26.4 && lng >= 50.1 && lng <= 50.3) return 'Khobar';
  if (lat >= 18.1 && lat <= 18.4 && lng >= 42.4 && lng <= 42.7) return 'Abha';
  if (lat >= 28.3 && lat <= 28.5 && lng >= 36.5 && lng <= 36.7) return 'Tabuk';
  if (lat >= 27.4 && lat <= 27.7 && lng >= 41.6 && lng <= 41.8) return 'Hail';
  if (lat >= 27.0 && lat <= 27.2 && lng >= 49.5 && lng <= 49.7) return 'Jubail';
  if (lat >= 23.9 && lat <= 24.2 && lng >= 38.0 && lng <= 38.3) return 'Yanbu';
  if (lat >= 26.2 && lat <= 26.4 && lng >= 43.9 && lng <= 44.1) return 'Buraidah';
  return null;
}

export default function AddLocationPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { customerId: routeCustomerId } = useParams<{ customerId?: string }>();

  // Customer Context & Lock State
  const isCustomerLocked = !!routeCustomerId;
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(routeCustomerId || '');
  const [isCreateCustomerOpen, setIsCreateCustomerOpen] = useState(false);

  // Form Fields State (City is blank by default, NO hardcoded 'Riyadh')
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country] = useState('Saudi Arabia');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [precision, setPrecision] = useState<CoordinatePrecision>('UNKNOWN');
  const [error, setError] = useState<string | null>(null);

  // Resolution State
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [resolvedLocation, setResolvedLocation] = useState<{
    address: string;
    lat: number;
    lng: number;
    city?: string;
    source: 'search' | 'paste' | 'pin';
  } | null>(null);
  const [inconsistencyDismissed, setInconsistencyDismissed] = useState(false);

  const paste = usePastedLocation();
  const sessionRef = useRef<AddressSearchSession | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Fetch Customers for Selector
  const { data: customersRes } = useQuery({
    queryKey: ['customers-select'],
    queryFn: () => customerService.getAll({ per_page: 200 }),
  });
  const customers = customersRes?.data || [];

  // Fetch Selected Customer Details
  const { data: lockedCustomerRes } = useQuery({
    queryKey: ['customer-details', selectedCustomerId],
    queryFn: () => customerService.getById(selectedCustomerId),
    enabled: !!selectedCustomerId,
  });
  const currentCustomer = lockedCustomerRes;

  // Fetch Existing Locations for Selected Customer to perform live Duplicate Code check
  const { data: customerLocationsRes } = useQuery({
    queryKey: ['locations', selectedCustomerId],
    queryFn: () => locationService.getAll({ customerId: selectedCustomerId }),
    enabled: !!selectedCustomerId,
  });
  const existingLocations = customerLocationsRes?.data || [];

  // Duplicate Check
  const duplicateLocation = useMemo(() => {
    if (!code.trim() || !selectedCustomerId) return null;
    const normCode = code.trim().toUpperCase();
    return existingLocations.find((l) => l.code.toUpperCase() === normCode) || null;
  }, [code, selectedCustomerId, existingLocations]);

  // Coordinates Validation
  const numericLat = parseFloat(lat);
  const numericLng = parseFloat(lng);
  const hasValidCoords = !isNaN(numericLat) && !isNaN(numericLng) && numericLat >= -90 && numericLat <= 90 && numericLng >= -180 && numericLng <= 180;

  // Detect Inconsistency between typed address/city and pin coordinates
  const detectedInconsistency = useMemo(() => {
    if (!hasValidCoords || inconsistencyDismissed) return null;
    const pinCity = detectCityFromCoords(numericLat, numericLng);
    if (!pinCity) return null;

    const fullText = `${city} ${address}`.trim().toLowerCase();
    if (!fullText) return null;

    const knownCities = [
      'riyadh', 'jeddah', 'dammam', 'makkah', 'madinah', 'khobar', 'abha', 'tabuk', 'hail', 'jubail', 'yanbu', 'buraidah',
    ];

    const mentionedCity = knownCities.find((c) => fullText.includes(c));
    if (mentionedCity && mentionedCity !== pinCity.toLowerCase()) {
      const formatCityName = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
      return {
        pinCity,
        textCity: formatCityName(mentionedCity),
      };
    }

    return null;
  }, [hasValidCoords, numericLat, numericLng, city, address, inconsistencyDismissed]);

  // Click Outside Dropdown Handler
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync CustomerId from route if changed
  useEffect(() => {
    if (routeCustomerId) {
      setSelectedCustomerId(routeCustomerId);
    }
  }, [routeCustomerId]);

  // Auto Code Generation Candidate Suggestion
  const handleNameChange = (val: string) => {
    setName(val);
    setError(null);

    if (!code.trim() && val.trim().length >= 2) {
      const words = val.trim().toUpperCase().replace(/[^A-Z0-9\s]/g, '').split(/\s+/).filter(Boolean);
      let gen = '';
      if (words.length >= 3) {
        gen = words[0][0] + words[1][0] + words[2][0];
      } else if (words.length === 2) {
        gen = words[0].substring(0, 2) + words[1][0];
      } else if (words.length === 1 && words[0].length >= 3) {
        gen = words[0].substring(0, 3);
      } else {
        gen = words[0];
      }
      setCode(gen.substring(0, 5));
    }
  };

  // Unified Location Resolver Function
  const applyResolvedLocation = (
    retLat: number,
    retLng: number,
    resolvedAddr?: string,
    resolvedCity?: string,
    source: 'search' | 'paste' | 'pin' = 'search'
  ) => {
    setLat(retLat.toFixed(6));
    setLng(retLng.toFixed(6));
    if (precision === 'UNKNOWN') {
      setPrecision('APPROXIMATE');
    }

    const detected = resolvedCity || detectCityFromCoords(retLat, retLng) || '';
    if (!city.trim() && detected) {
      setCity(detected);
    }

    const addrToUse = resolvedAddr || (detected ? `${detected}, Saudi Arabia` : '');
    if (!address.trim() && addrToUse) {
      setAddress(addrToUse);
    }

    setResolvedLocation({
      address: resolvedAddr || addrToUse || `Coordinates (${retLat.toFixed(4)}, ${retLng.toFixed(4)})`,
      lat: retLat,
      lng: retLng,
      city: detected || undefined,
      source,
    });
    setInconsistencyDismissed(false);
  };

  // Search or Paste Input Handler
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setError(null);
    if (!query.trim()) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    // Google Maps Link Paste
    if (isGoogleMapsUrl(query.trim())) {
      (async () => {
        setIsSearching(true);
        const place = await paste.resolve(query.trim(), (retLat, retLng) => {
          applyResolvedLocation(retLat, retLng, undefined, undefined, 'paste');
        });
        setIsSearching(false);

        if (!place) return;
        if (!name.trim()) setName(place.name);
        applyResolvedLocation(place.lat, place.lng, place.address || place.name, undefined, 'paste');
        setShowDropdown(false);
      })();
      return;
    }

    // Raw Coordinates Paste e.g. "24.7136, 46.6753"
    const coordMatch = query.trim().match(/^\(?\s*(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)\s*\)?$/);
    if (coordMatch) {
      const rawLat = parseFloat(coordMatch[1]);
      const rawLng = parseFloat(coordMatch[3]);
      if (!isNaN(rawLat) && !isNaN(rawLng)) {
        applyResolvedLocation(rawLat, rawLng, `Coordinates (${rawLat.toFixed(4)}, ${rawLng.toFixed(4)})`, undefined, 'paste');
        setShowDropdown(false);
        return;
      }
    }

    // Debounced Address Search
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(async () => {
      if (!sessionRef.current) {
        sessionRef.current = createAddressSearchSession();
      }

      setIsSearching(true);
      try {
        const rows = await sessionRef.current.search(query);
        setSuggestions(rows);
        setShowDropdown(rows.length > 0);
      } catch (err) {
        console.error('Address search failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);
  };

  const handleSelectSuggestion = async (suggestion: AddressSuggestion) => {
    if (!sessionRef.current) return;

    setIsSearching(true);
    setShowDropdown(false);
    try {
      const place = await sessionRef.current.resolve(suggestion.id);
      if (place) {
        if (!name.trim()) setName(place.name);
        applyResolvedLocation(place.lat, place.lng, place.address || place.name, undefined, 'search');
      }
    } catch (err) {
      console.error('Select suggestion error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Map Click Handler
  const handleMapClick = async (clickedLat: number, clickedLng: number) => {
    applyResolvedLocation(clickedLat, clickedLng, undefined, undefined, 'pin');

    if (!address.trim()) {
      try {
        const detail = await reverseGeocodeDetailed(clickedLat, clickedLng);
        if (detail?.address) {
          setAddress(detail.address);
          if ((detail as any)?.city && !city.trim()) setCity((detail as any).city);
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Re-resolve address text from current pin
  const handleReResolveAddress = async () => {
    if (!hasValidCoords) return;
    try {
      const detail = await reverseGeocodeDetailed(numericLat, numericLng);
      if (detail?.address) {
        setAddress(detail.address);
      }
      const detected = detectCityFromCoords(numericLat, numericLng);
      if (detected) setCity(detected);
      setInconsistencyDismissed(true);
      toast.success('Address re-resolved from pin coordinates');
    } catch {
      toast.error('Could not reverse geocode pin location');
    }
  };

  // Precision Selection Handlers
  const handlePrecisionChange = (newPrec: CoordinatePrecision) => {
    setPrecision(newPrec);
    if (newPrec === 'UNKNOWN') {
      setLat('');
      setLng('');
      setResolvedLocation(null);
    } else if ((!lat || !lng) && (newPrec === 'EXACT' || newPrec === 'APPROXIMATE')) {
      setLat('24.7136');
      setLng('46.6753');
      applyResolvedLocation(24.7136, 46.6753, 'Default Pin (Saudi Arabia)', 'Riyadh', 'pin');
    }
  };

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCustomerId) {
        throw new Error('Please select a customer for this location.');
      }
      if (!code.trim()) {
        throw new Error('Location code is required (e.g. RUH, JED).');
      }
      if (duplicateLocation) {
        throw new Error(`Location code "${code.trim().toUpperCase()}" is already used for this customer.`);
      }
      if (!name.trim()) {
        throw new Error('Location name is required.');
      }
      if ((precision === 'EXACT' || precision === 'APPROXIMATE') && !hasValidCoords) {
        throw new Error('Valid map coordinates are required for EXACT or APPROXIMATE precision.');
      }

      const payload = {
        customerId: selectedCustomerId,
        code: code.trim().toUpperCase(),
        name: name.trim(),
        address: address.trim() || null,
        city: city.trim() || null,
        postalCode: postalCode.trim() || null,
        lat: precision === 'UNKNOWN' ? null : numericLat,
        lng: precision === 'UNKNOWN' ? null : numericLng,
        coordinate_precision: precision,
      };

      return locationService.create(payload);
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      queryClient.invalidateQueries({ queryKey: ['locations-all'] });
      queryClient.invalidateQueries({ queryKey: ['customer-locations', selectedCustomerId] });
      toast.success(`Location "${saved.name}" (${saved.code}) created successfully`);

      if (isCustomerLocked) {
        navigate(`/customers/${selectedCustomerId}`);
      } else {
        navigate('/locations');
      }
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error?.message || err.message || 'Could not save the location.';
      setError(msg);
      toast.error(msg);
    },
  });

  const customerOptions = useMemo(() => {
    return customers.map((c) => ({
      value: c.id,
      label: c.name,
      keywords: `${c.name} ${c.company_name || ''} ${c.tax_number || ''}`,
    }));
  }, [customers]);

  const backUrl = isCustomerLocked ? `/customers/${selectedCustomerId}` : '/locations';

  return (
    <DashboardLayout active="Locations" title="Create Customer Location">
      <div className="space-y-5 max-w-7xl mx-auto pb-8">

        {/* ── Top Header Row ── */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Create Customer Location
            </h1>
            {isCustomerLocked && (
              <Badge variant="outline" className="text-[10px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200">
                Locked Context
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate(backUrl)}
              className="h-8 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={saveMutation.isPending || !selectedCustomerId || !code.trim() || !name.trim() || !!duplicateLocation}
              onClick={() => saveMutation.mutate()}
              className="h-8 text-xs font-extrabold bg-brand hover:bg-brand-hover text-white shadow-xs gap-1.5 cursor-pointer"
            >
              {saveMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              Save Location
            </Button>
          </div>
        </div>

        {/* ── Error Alert Banner ── */}
        {error && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 flex items-center justify-between text-red-700 dark:text-red-400 text-xs font-semibold">
            <div className="flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg cursor-pointer">
              <X size={14} />
            </button>
          </div>
        )}

        {/* ── Main 2-Column High-Density Layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

          {/* ───────────────────────── LEFT 8 COLS: UNIFIED WORKFLOW STACK ───────────────────────── */}
          <div className="lg:col-span-8 space-y-5">

            {/* 1. CUSTOMER & IDENTITY CARD */}
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl shadow-2xs">
              <CardContent className="p-4 space-y-3.5">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 pb-1 border-b border-slate-100 dark:border-slate-800">
                  <Building2 size={15} className="text-brand" />
                  Customer & Identity
                </div>

                {/* Customer Picker Row */}
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    CUSTOMER ACCOUNT <span className="text-brand">*</span>
                  </Label>

                  {isCustomerLocked ? (
                    <div className="p-2 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded bg-indigo-600 text-white flex items-center justify-center font-black text-xs shrink-0">
                          {currentCustomer?.name?.substring(0, 2).toUpperCase() || 'CU'}
                        </div>
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {currentCustomer?.name || 'Loading Customer...'}
                        </span>
                      </div>
                      <Badge className="bg-indigo-600 text-white text-[10px] font-bold gap-1">
                        <Lock size={10} /> Locked Context
                      </Badge>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Combobox
                        value={selectedCustomerId}
                        onChange={(val: string) => {
                          setSelectedCustomerId(val);
                          setError(null);
                        }}
                        options={customerOptions}
                        placeholder="Select customer account..."
                        searchPlaceholder="Type customer name..."
                        emptyText="No customer accounts found."
                        className="w-full text-xs"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsCreateCustomerOpen(true)}
                        className="h-9 px-2.5 text-xs font-bold shrink-0 gap-1 text-brand border-brand/30 hover:bg-brand/5 cursor-pointer"
                      >
                        <Plus size={13} /> New
                      </Button>
                    </div>
                  )}
                </div>

                {/* Name & Code Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      LOCATION NAME <span className="text-brand">*</span>
                    </Label>
                    <Input
                      value={name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="e.g. Riyadh Sorting Center"
                      className="text-xs font-medium h-9"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      LOCATION CODE <span className="text-brand">*</span>
                    </Label>
                    <Input
                      value={code}
                      onChange={(e) => {
                        setCode(e.target.value.toUpperCase());
                        setError(null);
                      }}
                      placeholder="e.g. RUH"
                      className="font-mono uppercase font-bold text-xs h-9"
                    />
                  </div>
                </div>

                {/* Duplicate Location Warning Banner */}
                {duplicateLocation && (
                  <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-400">
                      <AlertTriangle size={15} className="shrink-0 text-amber-600" />
                      <span>
                        Code <strong className="font-mono">{duplicateLocation.code}</strong> already exists for {duplicateLocation.name}.
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/locations?search=${duplicateLocation.code}`)}
                      className="h-7 text-xs font-bold border-amber-300 text-amber-900 dark:text-amber-300 hover:bg-amber-100 gap-1 cursor-pointer"
                    >
                      View Existing <ExternalLink size={12} />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 2. FIND & RESOLVE LOCATION CARD */}
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl shadow-2xs">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    <Search size={15} className="text-emerald-600" />
                    Find Location Position
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">Search facility, paste Google link, or enter coords</span>
                </div>

                <div className="space-y-1 relative" ref={dropdownRef}>
                  <div className="relative">
                    <Input
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      placeholder="Search facility name, address, landmark OR paste Google Maps link (24.7136, 46.6753)..."
                      className="text-xs pl-9 pr-24 h-9 font-medium"
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    {isSearching && (
                      <div className="absolute right-3 top-2.5 flex items-center gap-1 text-[10px] text-slate-500 font-semibold">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-brand" /> Resolving...
                      </div>
                    )}
                  </div>

                  {/* Autocomplete Suggestions Dropdown */}
                  {showDropdown && suggestions.length > 0 && (
                    <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden max-h-56 overflow-y-auto">
                      {suggestions.map((sugg) => (
                        <button
                          key={sugg.id}
                          type="button"
                          onClick={() => handleSelectSuggestion(sugg)}
                          className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800/60 last:border-0 transition-colors flex items-start gap-2.5 cursor-pointer"
                        >
                          <MapPin size={14} className="text-brand shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                              {(sugg as any).text || (sugg as any).label || sugg.id}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate">
                              {(sugg as any).secondaryText || (sugg as any).description || ''}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Resolved Location Confirmation Banner */}
                {resolvedLocation && (
                  <div className="p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-emerald-900 dark:text-emerald-300">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">✓ LOCATION FOUND</span>
                          <span className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400">({resolvedLocation.lat.toFixed(4)}, {resolvedLocation.lng.toFixed(4)})</span>
                        </div>
                        <span className="text-[11px] block font-normal text-emerald-800 dark:text-emerald-300 mt-0.5">
                          {resolvedLocation.address}
                        </span>
                      </div>
                    </div>
                    {hasValidCoords && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${numericLat},${numericLng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 shrink-0"
                      >
                        Open Maps <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                )}

                {/* Inconsistency Warning Banner */}
                {detectedInconsistency && (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 space-y-2">
                    <div className="flex items-start gap-2 text-xs font-bold text-amber-900 dark:text-amber-300">
                      <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <div>Address and map position appear inconsistent.</div>
                        <div className="text-[11px] font-normal text-amber-800 dark:text-amber-400 mt-0.5">
                          The pin is in <strong>{detectedInconsistency.pinCity}</strong>, while the entered address mentions <strong>{detectedInconsistency.textCity}</strong>.
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setInconsistencyDismissed(true)}
                        className="h-7 text-[11px] font-bold border-amber-300 text-amber-900 dark:text-amber-300 hover:bg-amber-100 cursor-pointer"
                      >
                        Keep Pin & Address
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleReResolveAddress}
                        className="h-7 text-[11px] font-bold border-amber-300 text-amber-900 dark:text-amber-300 hover:bg-amber-100 gap-1 cursor-pointer"
                      >
                        <RotateCcw size={11} /> Re-resolve Address
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handlePrecisionChange('UNKNOWN')}
                        className="h-7 text-[11px] font-bold text-amber-700 hover:text-amber-900 hover:bg-amber-100 cursor-pointer"
                      >
                        Reset Pin
                      </Button>
                    </div>
                  </div>
                )}

                {/* Address Details Fields */}
                <div className="pt-2 space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      STREET / FACILITY ADDRESS
                    </Label>
                    <Textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      rows={2}
                      placeholder="e.g. Exit 18, Southern Ring Road, Gate 4"
                      className="text-xs resize-none font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        CITY
                      </Label>
                      <Input
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="e.g. Riyadh"
                        className="text-xs h-9 font-medium"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        POSTAL CODE
                      </Label>
                      <Input
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value)}
                        placeholder="e.g. 11564"
                        className="text-xs font-mono h-9"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        COUNTRY
                      </Label>
                      <Input
                        value={country}
                        disabled
                        className="text-xs bg-slate-50 dark:bg-slate-800 text-slate-500 font-semibold h-9"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 3. MAP CARD (Directly Underneath Resolved Location) */}
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl shadow-2xs overflow-hidden">
              <div className="py-2.5 px-4 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  <MapIcon size={15} className="text-brand" />
                  Map & Pin Position
                </div>
                <Badge variant="outline" className="text-[10px] font-mono font-semibold bg-white dark:bg-slate-900">
                  {hasValidCoords ? `${numericLat.toFixed(4)}, ${numericLng.toFixed(4)}` : 'Location Not Pinned'}
                </Badge>
              </div>
              <CardContent className="p-0">
                <div className="h-[270px] w-full relative">
                  {hasValidCoords ? (
                    <MapContainer
                      className="h-full w-full"
                      {...SAUDI_MAP_CONTAINER_PROPS}
                    >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; Esri'
                      />
                      <TileLayer
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                      />
                      <FlyToPin lat={numericLat} lng={numericLng} />
                      <MapClickHandler onMapClick={handleMapClick} />
                      <Marker
                        position={[numericLat, numericLng]}
                        icon={customPinIcon}
                        draggable
                        eventHandlers={{
                          dragend(e) {
                            const marker = e.target;
                            const pos = marker.getLatLng();
                            handleMapClick(pos.lat, pos.lng);
                          },
                        }}
                      />
                    </MapContainer>
                  ) : (
                    <div className="h-full w-full bg-slate-100/70 dark:bg-slate-800/40 flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                      <MapPin className="w-5 h-5 text-amber-600 shrink-0" />
                      <p className="text-xs font-extrabold text-slate-700 dark:text-slate-200">
                        Location not pinned yet
                      </p>
                      <p className="text-[11px] text-slate-500 max-w-sm mt-0.5">
                        Search address above, paste a Google Maps link, or click anywhere on the map below to drop a pin.
                      </p>
                    </div>
                  )}
                </div>

                {/* Precision Controls Row */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Precision Status:
                    </span>
                    {precision === 'EXACT' && (
                      <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                        ✓ Exact Facility Pin
                      </Badge>
                    )}
                    {precision === 'APPROXIMATE' && (
                      <Badge className="bg-indigo-600 text-white text-[10px] font-bold">
                        ≈ Area Pin
                      </Badge>
                    )}
                    {precision === 'UNKNOWN' && (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold">
                        ○ Not Pinned
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handlePrecisionChange('UNKNOWN')}
                      className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all border cursor-pointer ${
                        precision === 'UNKNOWN'
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100'
                      }`}
                    >
                      ○ UNKNOWN
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePrecisionChange('APPROXIMATE')}
                      className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all border cursor-pointer ${
                        precision === 'APPROXIMATE'
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100'
                      }`}
                    >
                      ≈ AREA
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePrecisionChange('EXACT')}
                      className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all border cursor-pointer ${
                        precision === 'EXACT'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100'
                      }`}
                    >
                      ✓ EXACT
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>

          {/* ───────────────────────── RIGHT 4 COLS: STICKY LOCATION STATUS & READINESS ───────────────────────── */}
          <div className="lg:col-span-4 lg:sticky lg:top-4 space-y-4">

            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl shadow-2xs">
              <CardContent className="p-4 space-y-3 text-xs">
                <div className="pb-2 border-b border-slate-100 dark:border-slate-800 text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span>Location Status</span>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {code.toUpperCase() || 'NEW'}
                  </Badge>
                </div>

                {/* Identity Summary */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Customer:</span>
                    <span className="font-extrabold text-slate-900 dark:text-slate-100 truncate max-w-[160px]">
                      {currentCustomer?.name || (selectedCustomerId ? 'Selected' : 'Not Selected')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Location Code:</span>
                    <span className="font-mono font-black text-slate-900 dark:text-slate-100">
                      {code.toUpperCase() || '—'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Location Name:</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100 truncate max-w-[160px]">
                      {name || '—'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">City:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {city || '—'}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Position</div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">GPS Coordinates:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {hasValidCoords ? `${numericLat.toFixed(4)}, ${numericLng.toFixed(4)}` : 'Not Pinned'}
                    </span>
                  </div>

                  {hasValidCoords && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${numericLat},${numericLng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 pt-0.5"
                    >
                      <Compass size={12} /> Open in Google Maps <ExternalLink size={10} />
                    </a>
                  )}
                </div>

                {/* Data Quality Checklist */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Data Quality</div>

                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                      <span className={selectedCustomerId ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                        {selectedCustomerId ? '✓' : '○'}
                      </span>
                      <span>Customer</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                      <span className={code.trim() ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                        {code.trim() ? '✓' : '○'}
                      </span>
                      <span>Code</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                      <span className={name.trim() ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                        {name.trim() ? '✓' : '○'}
                      </span>
                      <span>Name</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                      <span className={address.trim() ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                        {address.trim() ? '✓' : '○'}
                      </span>
                      <span>Address</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                      <span className={hasValidCoords ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                        {hasValidCoords ? '✓' : '○'}
                      </span>
                      <span>GPS Pin</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                      <span className={precision !== 'UNKNOWN' ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                        {precision !== 'UNKNOWN' ? '✓' : '○'}
                      </span>
                      <span>Precision</span>
                    </div>
                  </div>
                </div>

                {/* Validation Guard Alert */}
                {duplicateLocation ? (
                  <div className="mt-2 p-2.5 rounded-xl bg-red-50 text-red-700 border border-red-200 text-[11px] font-bold flex items-center gap-1.5">
                    <AlertTriangle size={14} className="shrink-0 text-red-600" />
                    <span>Duplicate code for customer.</span>
                  </div>
                ) : !selectedCustomerId || !code.trim() || !name.trim() ? (
                  <div className="mt-2 p-2.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-semibold flex items-center gap-1.5">
                    <Info size={14} className="shrink-0 text-amber-600" />
                    <span>Fill customer, code, & name to save.</span>
                  </div>
                ) : (
                  <div className="mt-2 p-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
                    <span>Ready for operational save.</span>
                  </div>
                )}

                <Button
                  type="button"
                  disabled={saveMutation.isPending || !selectedCustomerId || !code.trim() || !name.trim() || !!duplicateLocation}
                  onClick={() => saveMutation.mutate()}
                  className="w-full mt-2 text-xs font-bold bg-brand hover:bg-brand-hover text-white shadow-xs gap-1.5 h-9 cursor-pointer"
                >
                  {saveMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Save Location
                </Button>
              </CardContent>
            </Card>

          </div>

        </div>

      </div>

      {/* ── Create Customer Modal ── */}
      <CreateCustomerModal
        isOpen={isCreateCustomerOpen}
        onClose={() => setIsCreateCustomerOpen(false)}
        onSuccess={(newCustomer) => {
          queryClient.invalidateQueries({ queryKey: ['customers-select'] });
          setSelectedCustomerId(newCustomer.id);
          toast.success(`Customer "${newCustomer.name}" created & selected`);
        }}
      />
    </DashboardLayout>
  );
}
