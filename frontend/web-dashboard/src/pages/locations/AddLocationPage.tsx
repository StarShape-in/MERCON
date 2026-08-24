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
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
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
    <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
      <div style="
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: var(--color-brand);
        border: 2.5px solid #FFFFFF;
        box-shadow: 0 3px 10px rgba(232, 69, 15, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      </div>
    </div>
  `,
  className: 'location-page-pin',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
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
      <div className="space-y-4 max-w-7xl mx-auto pb-8">

        {/* ── Top Header Row (Clean, No Back Arrow, No Module Chip, No Paragraph Subtitle) ── */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Create Customer Location
            </h1>
            {isCustomerLocked && (
              <Badge variant="outline" className="text-[10px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200">
                Locked to Customer
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate(backUrl)}
              className="h-8 text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={saveMutation.isPending || !selectedCustomerId || !code.trim() || !name.trim() || !!duplicateLocation}
              onClick={() => saveMutation.mutate()}
              className="h-8 text-xs font-extrabold bg-brand hover:bg-brand-hover text-white shadow-xs gap-1.5"
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
            <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg">
              <X size={14} />
            </button>
          </div>
        )}

        {/* ── Main 2-Column High-Density Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

          {/* ───────────────────────── LEFT 8 COLS: FORM ───────────────────────── */}
          <div className="lg:col-span-8 space-y-4">

            {/* 1. COMPACT LOCATION IDENTIFICATION & ADDRESS CARD */}
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl shadow-2xs">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 py-3 px-4">
                <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Building2 size={15} className="text-brand" />
                  Customer & Location Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3.5">

                {/* Customer Picker Row */}
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    CUSTOMER ACCOUNT <span className="text-brand">*</span>
                  </Label>

                  {isCustomerLocked ? (
                    <div className="p-2.5 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-md bg-indigo-600 text-white flex items-center justify-center font-black text-xs shrink-0">
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
                    <div className="space-y-1">
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
                          className="h-9 px-2.5 text-xs font-bold shrink-0 gap-1 text-brand border-brand/30 hover:bg-brand/5"
                        >
                          <Plus size={13} /> New
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Code & Name Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      className="h-7 text-xs font-bold border-amber-300 text-amber-900 dark:text-amber-300 hover:bg-amber-100 gap-1"
                    >
                      View Existing <ExternalLink size={12} />
                    </Button>
                  </div>
                )}

                {/* Address Field */}
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    STREET / FACILITY ADDRESS
                  </Label>
                  <Textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={2}
                    placeholder="e.g. Exit 18, Southern Ring Road, Gate 4"
                    className="text-xs resize-none"
                  />
                </div>

                {/* City, Postal Code, Country Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      CITY
                    </Label>
                    <Input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Riyadh"
                      className="text-xs h-9"
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

              </CardContent>
            </Card>

            {/* 2. GOOGLE MAPS LINK & RESOLUTION CARD */}
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl shadow-2xs">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 py-3 px-4">
                <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Search size={15} className="text-emerald-600" />
                  Google Maps & Location Resolution
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="space-y-1 relative" ref={dropdownRef}>
                  <div className="relative">
                    <Input
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      placeholder="Paste Google Maps URL, raw coordinates (24.7136, 46.6753), or WhatsApp link..."
                      className="text-xs pl-9 pr-24 h-9"
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
                          className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800/60 last:border-0 transition-colors flex items-start gap-2.5"
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
                  <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                      <div>
                        <span>Resolved: </span>
                        <strong className="font-mono">{resolvedResult.lat.toFixed(4)}, {resolvedResult.lng.toFixed(4)}</strong>
                        <span className="text-[10px] block font-normal text-emerald-700 dark:text-emerald-400">
                          {resolvedResult.address}
                        </span>
                      </div>
                    </div>
                    <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-bold shrink-0">
                      ≈ Area Pin
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 3. MAP PINNING & PRECISION CARD */}
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl shadow-2xs overflow-hidden">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 py-3 px-4 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <MapIcon size={15} className="text-brand" />
                  Map & Pin Precision
                </CardTitle>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {hasValidCoords ? `${numericLat.toFixed(4)}, ${numericLng.toFixed(4)}` : 'No Pin'}
                </Badge>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[260px] w-full relative">
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
                    <div className="h-full w-full bg-slate-100 dark:bg-slate-800/40 flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                      <MapPin size={28} className="opacity-40 mb-1" />
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        No map coordinates set.
                      </p>
                      <p className="text-[10px] text-slate-500 max-w-xs">
                        Paste a Google Maps link or click EXACT/APPROXIMATE precision to set pin.
                      </p>
                    </div>
                  )}
                </div>

                {/* Precision Controls Row */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {hasValidCoords && (
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={precision === 'EXACT'}
                        onChange={(e) => setPrecision(e.target.checked ? 'EXACT' : 'APPROXIMATE')}
                        className="rounded border-slate-300 text-brand focus:ring-brand w-4 h-4"
                      />
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        Confirm exact facility pin
                      </span>
                    </label>
                  )}

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handlePrecisionChange('EXACT')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all border ${
                        precision === 'EXACT'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100'
                      }`}
                    >
                      ✓ EXACT
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePrecisionChange('APPROXIMATE')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all border ${
                        precision === 'APPROXIMATE'
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100'
                      }`}
                    >
                      ≈ AREA
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePrecisionChange('UNKNOWN')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all border ${
                        precision === 'UNKNOWN'
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100'
                      }`}
                    >
                      ○ UNKNOWN
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>

          {/* ───────────────────────── RIGHT 4 COLS: STICKY SUMMARY ───────────────────────── */}
          <div className="lg:col-span-4 lg:sticky lg:top-4 space-y-4">

            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl shadow-xs">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 py-3 px-4">
                <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Location Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2.5 text-xs">

                <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 font-medium">Customer:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100 truncate max-w-[160px]">
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
                  <span className="font-bold text-slate-900 dark:text-slate-100 truncate max-w-[160px]">
                    {name || '—'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 font-medium">City:</span>
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
                        ✓ Exact Pin
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
                </div>

                {/* Validation Guard Alert */}
                {duplicateLocation ? (
                  <div className="mt-2 p-2 rounded-lg bg-red-50 text-red-700 border border-red-200 text-[11px] font-semibold flex items-center gap-1.5">
                    <AlertTriangle size={13} className="shrink-0" />
                    <span>Duplicate code for customer.</span>
                  </div>
                ) : !selectedCustomerId || !code.trim() || !name.trim() ? (
                  <div className="mt-2 p-2 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-semibold">
                    Fill customer, code, & name to save.
                  </div>
                ) : (
                  <div className="mt-2 p-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="shrink-0 text-emerald-600" />
                    <span>Ready for operational save.</span>
                  </div>
                )}

                <Button
                  type="button"
                  disabled={saveMutation.isPending || !selectedCustomerId || !code.trim() || !name.trim() || !!duplicateLocation}
                  onClick={() => saveMutation.mutate()}
                  className="w-full mt-2 text-xs font-bold bg-brand hover:bg-brand-hover text-white shadow-xs gap-1.5 h-9"
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
