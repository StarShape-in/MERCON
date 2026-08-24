import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
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
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Map as MapIcon,
  Info,
  CheckCircle2,
  Plus,
  ExternalLink,
  Lock,
  X,
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Combobox } from '@/components/ui/combobox';
import CreateCustomerModal from '@/components/customers/CreateCustomerModal';
import { SAUDI_MAP_CONTAINER_PROPS } from '@/utils/saudiMapConfig';
import { locationService, Location, CoordinatePrecision } from '@/services/locationService';
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
  const { customerId: routeCustomerId } = useParams<{ customerId?: string }>();

  // Customer Context & Lock State
  const isCustomerLocked = !!routeCustomerId;
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(routeCustomerId || '');
  const [isCreateCustomerOpen, setIsCreateCustomerOpen] = useState(false);

  // Form Fields State
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Riyadh');
  const [postalCode, setPostalCode] = useState('');
  const [country] = useState('Saudi Arabia');
  const [lat, setLat] = useState('24.7136');
  const [lng, setLng] = useState('46.6753');
  const [precision, setPrecision] = useState<CoordinatePrecision>('UNKNOWN');
  const [error, setError] = useState<string | null>(null);

  // Resolution & Paste State
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [resolvedResult, setResolvedResult] = useState<{ address: string; lat: number; lng: number } | null>(null);
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

  // Fetch Selected Customer Details if locked or selected
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

  // Auto Code Generation Candidate
  const handleNameChange = (val: string) => {
    setName(val);
    setError(null);

    // Auto-generate code candidate if code field is empty
    if (!code.trim() && val.trim().length >= 2) {
      const words = val.trim().toUpperCase().split(/\s+/).filter(Boolean);
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

  // Google Maps / Address Search / Link Resolution
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setError(null);
    if (!query.trim()) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    if (isGoogleMapsUrl(query.trim())) {
      (async () => {
        setIsSearching(true);
        const place = await paste.resolve(query.trim(), (retLat, retLng) => {
          setLat(retLat.toFixed(6));
          setLng(retLng.toFixed(6));
          setPrecision('APPROXIMATE');
        });
        setIsSearching(false);

        if (!place) return;
        if (!name.trim()) setName(place.name);
        if (place.address) setAddress(place.address);
        setLat(place.lat.toFixed(6));
        setLng(place.lng.toFixed(6));
        setPrecision('APPROXIMATE');
        setResolvedResult({ address: place.address || place.name, lat: place.lat, lng: place.lng });
        setShowDropdown(false);
      })();
      return;
    }

    // Check if raw coordinates like "24.7136, 46.6753" or "(24.7136, 46.6753)"
    const coordMatch = query.trim().match(/^\(?\s*(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)\s*\)?$/);
    if (coordMatch) {
      const rawLat = parseFloat(coordMatch[1]);
      const rawLng = parseFloat(coordMatch[3]);
      if (!isNaN(rawLat) && !isNaN(rawLng)) {
        setLat(rawLat.toFixed(6));
        setLng(rawLng.toFixed(6));
        setPrecision('APPROXIMATE');
        setResolvedResult({ address: `Coordinates (${rawLat.toFixed(4)}, ${rawLng.toFixed(4)})`, lat: rawLat, lng: rawLng });
        setShowDropdown(false);
        return;
      }
    }

    // Debounced Google Places Autocomplete
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
        setAddress(place.address || place.name);
        setLat(place.lat.toFixed(6));
        setLng(place.lng.toFixed(6));
        setPrecision('APPROXIMATE');
        setResolvedResult({ address: place.address || place.name, lat: place.lat, lng: place.lng });
      }
    } catch (err) {
      console.error('Select suggestion error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Map Click Handler
  const handleMapClick = async (clickedLat: number, clickedLng: number) => {
    setLat(clickedLat.toFixed(6));
    setLng(clickedLng.toFixed(6));
    setPrecision('APPROXIMATE');

    if (!address.trim()) {
      try {
        const detail = await reverseGeocodeDetailed(clickedLat, clickedLng);
        if (detail?.address) {
          setAddress(detail.address);
          if ((detail as any)?.city) setCity((detail as any).city);
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Precision Selection Handlers
  const handlePrecisionChange = (newPrec: CoordinatePrecision) => {
    setPrecision(newPrec);
    if (newPrec === 'UNKNOWN') {
      setLat('');
      setLng('');
    } else if ((!lat || !lng) && (newPrec === 'EXACT' || newPrec === 'APPROXIMATE')) {
      setLat('24.7136');
      setLng('46.6753');
    }
  };

  const numericLat = parseFloat(lat);
  const numericLng = parseFloat(lng);
  const hasValidCoords = !isNaN(numericLat) && !isNaN(numericLng) && numericLat >= -90 && numericLat <= 90 && numericLng >= -180 && numericLng <= 180;

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
      <div className="space-y-6 max-w-7xl mx-auto pb-12">

        {/* ── Top Header Row ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <Link
              to={backUrl}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
            >
              <ArrowLeft size={16} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 text-[10px] font-bold uppercase tracking-wider">
                  Locations Module
                </Badge>
                {isCustomerLocked && (
                  <Badge variant="outline" className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    Locked to Customer Context
                  </Badge>
                )}
              </div>
              <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight mt-0.5">
                Create Customer Location
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Add an operational pickup or dropoff location used for rate matching, dispatches, and driver navigation.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate(backUrl)}
              className="text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={saveMutation.isPending || !selectedCustomerId || !code.trim() || !name.trim() || !!duplicateLocation}
              onClick={() => saveMutation.mutate()}
              className="text-xs font-bold bg-brand hover:bg-brand-hover text-white shadow-xs gap-1.5"
            >
              {saveMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save Location
            </Button>
          </div>
        </div>

        {/* ── Error Banner ── */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 flex items-center justify-between text-red-700 dark:text-red-400 text-xs font-semibold">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg">
              <X size={14} />
            </button>
          </div>
        )}

        {/* ── Main 2-Column Responsive Layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* ───────────────────────── LEFT 8 COLS: FORM ───────────────────────── */}
          <div className="lg:col-span-8 space-y-6">

            {/* 1. CUSTOMER & IDENTIFIERS CARD */}
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Building2 size={16} className="text-brand" />
                  Customer & Location Code
                </CardTitle>
                <CardDescription className="text-xs">
                  Canonical customer ownership and unique code identifier.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-4">

                {/* Customer Picker / Locked Card */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    CUSTOMER ACCOUNT <span className="text-brand">*</span>
                  </Label>

                  {isCustomerLocked ? (
                    <div className="p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black text-xs shrink-0">
                          {currentCustomer?.name?.substring(0, 2).toUpperCase() || 'CU'}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                            {currentCustomer?.name || 'Loading Customer...'}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                            ID: {selectedCustomerId}
                          </span>
                        </div>
                      </div>
                      <Badge className="bg-indigo-600 text-white text-[10px] font-bold gap-1">
                        <Lock size={10} /> Locked Context
                      </Badge>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Combobox
                        value={selectedCustomerId}
                        onChange={(val: string) => {
                          setSelectedCustomerId(val);
                          setError(null);
                        }}
                        options={customerOptions}
                        placeholder="Search and select customer account..."
                        searchPlaceholder="Type customer name..."
                        emptyText="No matching customer accounts found."
                        className="w-full"
                      />
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>Locations are strictly customer-scoped.</span>
                        <button
                          type="button"
                          onClick={() => setIsCreateCustomerOpen(true)}
                          className="font-bold text-brand hover:underline flex items-center gap-1"
                        >
                          <Plus size={12} /> Create Customer
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Code & Name Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      LOCATION CODE <span className="text-brand">*</span>
                    </Label>
                    <Input
                      value={code}
                      onChange={(e) => {
                        setCode(e.target.value.toUpperCase());
                        setError(null);
                      }}
                      placeholder="e.g. RUH, JED, KHA"
                      className="font-mono uppercase font-bold text-sm"
                    />
                    <div className="text-[10px] text-slate-500">
                      Unique per customer (e.g. <span className="font-mono font-bold">RUH</span>).
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      LOCATION NAME <span className="text-brand">*</span>
                    </Label>
                    <Input
                      value={name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="e.g. Riyadh Sorting Center"
                      className="text-sm font-medium"
                    />
                    <div className="text-[10px] text-slate-500">
                      Human-readable operational yard/depot name.
                    </div>
                  </div>
                </div>

                {/* Duplicate Location Warning Banner */}
                {duplicateLocation && (
                  <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-400">
                      <AlertTriangle size={16} className="shrink-0 text-amber-600" />
                      <span>
                        Code <strong className="font-mono">{duplicateLocation.code}</strong> already exists for this customer ({duplicateLocation.name}).
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/locations?search=${duplicateLocation.code}`)}
                      className="h-7 text-xs font-bold border-amber-300 text-amber-900 dark:text-amber-300 hover:bg-amber-100 gap-1"
                    >
                      View Existing <ExternalLink size={12} />
                    </Button>
                  </div>
                )}

              </CardContent>
            </Card>

            {/* 2. POSTAL ADDRESS & REGION CARD */}
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <MapPin size={16} className="text-indigo-600" />
                  Address & Region
                </CardTitle>
                <CardDescription className="text-xs">
                  Physical street address and city details for driver dispatch notes.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    STREET / FACILITY ADDRESS
                  </Label>
                  <Textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={2}
                    placeholder="e.g. Exit 18, Southern Ring Road, Industrial Zone 2, Gate 4"
                    className="text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      CITY
                    </Label>
                    <Input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Riyadh"
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      POSTAL CODE
                    </Label>
                    <Input
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="e.g. 11564"
                      className="text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      COUNTRY
                    </Label>
                    <Input
                      value={country}
                      disabled
                      className="text-xs bg-slate-50 dark:bg-slate-800 text-slate-500 font-semibold"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 3. GOOGLE MAPS / LINK RESOLUTION CARD */}
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Search size={16} className="text-emerald-600" />
                  Location Resolution & Google Maps Link
                </CardTitle>
                <CardDescription className="text-xs">
                  Paste a Google Maps link, raw coordinates (24.7136, 46.6753), or search for a place.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="space-y-1.5 relative" ref={dropdownRef}>
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    RESOLVE GOOGLE MAPS LINK / SEARCH PLACE
                  </Label>
                  <div className="relative">
                    <Input
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      placeholder="Paste https://maps.app.goo.gl/... or type Riyadh Sorting..."
                      className="text-xs pl-9 pr-24"
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    {isSearching && (
                      <div className="absolute right-3 top-2.5 flex items-center gap-1 text-[10px] text-slate-500 font-semibold">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-brand" /> Resolving...
                      </div>
                    )}
                  </div>

                  {/* Autocomplete Dropdown */}
                  {showDropdown && suggestions.length > 0 && (
                    <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                      {suggestions.map((sugg) => (
                        <button
                          key={sugg.id}
                          type="button"
                          onClick={() => handleSelectSuggestion(sugg)}
                          className="w-full text-left px-3.5 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800/60 last:border-0 transition-colors flex items-start gap-2.5"
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

                {/* Resolution Result Banner */}
                {resolvedResult && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                      <div>
                        <span>Resolved Position: </span>
                        <strong className="font-mono">{resolvedResult.lat.toFixed(4)}, {resolvedResult.lng.toFixed(4)}</strong>
                        <span className="text-[10px] block font-normal text-emerald-700 dark:text-emerald-400">
                          {resolvedResult.address}
                        </span>
                      </div>
                    </div>
                    <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-bold shrink-0">
                      Defaulted to ≈ Area Precision
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 4. INTERACTIVE LEAFLET MAP CARD */}
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs overflow-hidden">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <MapIcon size={16} className="text-brand" />
                    Interactive Map Pinning
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Click map or drag the marker to position the location pin.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {hasValidCoords ? `${numericLat.toFixed(4)}, ${numericLng.toFixed(4)}` : 'No Pin Dropped'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[340px] w-full relative">
                  {hasValidCoords ? (
                    <MapContainer
                      className="h-full w-full"
                      {...SAUDI_MAP_CONTAINER_PROPS}
                    >
                      <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                        attribution="&copy; OpenStreetMap contributors &copy; CARTO"
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
                    <div className="h-full w-full bg-slate-100 dark:bg-slate-800/50 flex flex-col items-center justify-center text-slate-400 p-6 text-center space-y-2">
                      <MapPin size={32} className="opacity-50" />
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        No coordinates set for this location.
                      </p>
                      <p className="text-[11px] max-w-xs text-slate-500">
                        Paste a Google Maps link above or select EXACT / APPROXIMATE precision to set map coordinates.
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirm Exact Facility Pin Control */}
                {hasValidCoords && (
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={precision === 'EXACT'}
                        onChange={(e) => setPrecision(e.target.checked ? 'EXACT' : 'APPROXIMATE')}
                        className="rounded border-slate-300 text-brand focus:ring-brand w-4 h-4"
                      />
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        I confirm this pin represents the exact customer facility / gate.
                      </span>
                    </label>

                    <Badge className={precision === 'EXACT' ? 'bg-emerald-600 text-white' : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'}>
                      {precision === 'EXACT' ? '✓ EXACT FACILITY' : '≈ AREA PIN'}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 5. COORDINATE PRECISION SEGMENT CONTROL CARD */}
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Info size={16} className="text-amber-600" />
                  Coordinate Precision Level
                </CardTitle>
                <CardDescription className="text-xs">
                  Operational accuracy communicated to drivers and dispatchers.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

                  {/* EXACT */}
                  <button
                    type="button"
                    onClick={() => handlePrecisionChange('EXACT')}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      precision === 'EXACT'
                        ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-xs text-emerald-700 dark:text-emerald-400 mb-1">
                      <span>✓ EXACT</span>
                      {precision === 'EXACT' && <CheckCircle2 size={14} />}
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      Exact facility / warehouse gate coordinates confirmed.
                    </p>
                  </button>

                  {/* APPROXIMATE */}
                  <button
                    type="button"
                    onClick={() => handlePrecisionChange('APPROXIMATE')}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      precision === 'APPROXIMATE'
                        ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-xs text-indigo-700 dark:text-indigo-400 mb-1">
                      <span>≈ APPROXIMATE</span>
                      {precision === 'APPROXIMATE' && <CheckCircle2 size={14} />}
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      General area or industrial zone pin. Navigable for drivers.
                    </p>
                  </button>

                  {/* UNKNOWN */}
                  <button
                    type="button"
                    onClick={() => handlePrecisionChange('UNKNOWN')}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      precision === 'UNKNOWN'
                        ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 ring-2 ring-amber-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-xs text-amber-700 dark:text-amber-400 mb-1">
                      <span>○ UNKNOWN</span>
                      {precision === 'UNKNOWN' && <CheckCircle2 size={14} />}
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      No coordinates available. Saved with postal address text.
                    </p>
                  </button>

                </div>
              </CardContent>
            </Card>

          </div>

          {/* ───────────────────────── RIGHT 4 COLS: STICKY SUMMARY ───────────────────────── */}
          <div className="lg:col-span-4 lg:sticky lg:top-6 space-y-6">

            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Location Summary
                </CardTitle>
                <CardDescription className="text-[11px]">
                  Live validation preview of the location record.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">

                <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 font-medium">Customer:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {currentCustomer?.name || (selectedCustomerId ? 'Selected' : 'Not Selected')}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 font-medium">Location Code:</span>
                  <span className="font-mono font-black text-slate-900 dark:text-slate-100">
                    {code.toUpperCase() || '—'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 font-medium">Location Name:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100 text-right truncate max-w-[180px]">
                    {name || '—'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 font-medium">City / Region:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {city || 'Riyadh'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 font-medium">Coordinates:</span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {hasValidCoords ? `${numericLat.toFixed(4)}, ${numericLng.toFixed(4)}` : 'Not Available'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 font-medium">Precision:</span>
                  <div>
                    {precision === 'EXACT' && (
                      <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                        ✓ Exact Location
                      </Badge>
                    )}
                    {precision === 'APPROXIMATE' && (
                      <Badge className="bg-indigo-600 text-white text-[10px] font-bold">
                        ≈ Area Location
                      </Badge>
                    )}
                    {precision === 'UNKNOWN' && (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold">
                        ○ Not Pinned
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500 font-medium">Account Status:</span>
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                    Active
                  </Badge>
                </div>

                {/* Validation Guard Alert */}
                {duplicateLocation ? (
                  <div className="mt-2 p-2.5 rounded-xl bg-red-50 text-red-700 border border-red-200 text-[11px] font-semibold flex items-center gap-2">
                    <AlertTriangle size={14} className="shrink-0" />
                    <span>Duplicate code blocked for this customer.</span>
                  </div>
                ) : !selectedCustomerId || !code.trim() || !name.trim() ? (
                  <div className="mt-2 p-2.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-semibold flex items-center gap-2">
                    <Info size={14} className="shrink-0" />
                    <span>Fill customer, code, and name to enable save.</span>
                  </div>
                ) : (
                  <div className="mt-2 p-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold flex items-center gap-2">
                    <CheckCircle2 size={14} className="shrink-0" />
                    <span>Ready for operational save.</span>
                  </div>
                )}

                <Button
                  type="button"
                  disabled={saveMutation.isPending || !selectedCustomerId || !code.trim() || !name.trim() || !!duplicateLocation}
                  onClick={() => saveMutation.mutate()}
                  className="w-full mt-3 text-xs font-bold bg-brand hover:bg-brand-hover text-white shadow-sm gap-1.5"
                >
                  {saveMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Save Location
                </Button>

              </CardContent>
            </Card>

          </div>

        </div>

      </div>

      {/* ── Create Customer Modal (For inline Customer Creation) ── */}
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
