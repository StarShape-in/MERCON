import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  ArrowLeft,
  Edit2,
  Save,
  RotateCw,
  Search,
  Building2,
  Loader2,
  AlertTriangle,
  Map as MapIcon,
  CheckCircle2,
  ExternalLink,
  Lock,
  X,
  Copy,
  Check,
  MoreVertical,
  Trash2,
  Eye,
  FileText,
  Truck,
  Layers,
  ChevronRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import ConfirmModal from '@/components/ui/ConfirmModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SAUDI_MAP_CONTAINER_PROPS } from '@/utils/saudiMapConfig';
import { locationService, CoordinatePrecision, Location } from '@/services/locationService';
import {
  createAddressSearchSession,
  reverseGeocodeDetailed,
  type AddressSearchSession,
  type AddressSuggestion,
} from '@/services/addressSearch';
import { isGoogleMapsUrl } from '@/utils/googleMapsLink';
import { usePastedLocation } from '@/hooks/usePastedLocation';
import { cn } from '@/lib/utils';

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

function MapClickHandler({ onMapClick, enabled }: { onMapClick: (lat: number, lng: number) => void; enabled: boolean }) {
  useMapEvents({
    click(e) {
      if (enabled) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

export default function LocationDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedCoords, setCopiedCoords] = useState(false);
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);

  // Fetch Location Data
  const { data: location, isLoading, isError, error, refetch } = useQuery<Location & { quotationStops?: any[]; tripStops?: any[] }>({
    queryKey: ['location-detail', id],
    queryFn: () => locationService.getById(id!),
    enabled: !!id,
  });

  // Editable Form State
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country] = useState('Saudi Arabia');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [precision, setPrecision] = useState<CoordinatePrecision>('UNKNOWN');
  const [formError, setFormError] = useState<string | null>(null);

  // Resolution State
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const paste = usePastedLocation();

  const sessionRef = useRef<AddressSearchSession | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Sync Form State when Location Data Loads or Edit Mode Toggles
  useEffect(() => {
    if (location) {
      setCode(location.code || '');
      setName(location.name || '');
      setAddress(location.address || '');
      setCity(location.city || 'Riyadh');
      setPostalCode(location.postalCode || '');
      setLat(location.lat != null ? String(location.lat) : '');
      setLng(location.lng != null ? String(location.lng) : '');
      setPrecision(location.coordinate_precision || 'UNKNOWN');
      setFormError(null);
    }
  }, [location, isEditing]);

  // Click Outside Resolution Dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: async (payload: Partial<Location> & { is_active?: boolean }) => {
      if (!id) throw new Error('No location ID');
      return locationService.update(id, payload);
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['location-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast.success(`Location "${updated.name}" updated successfully`);
      setIsEditing(false);
      setFormError(null);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error?.message || err.message || 'Failed to update location.';
      setFormError(msg);
      toast.error(msg);
    },
  });

  // Resolution / Google Maps Paste Handler
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setFormError(null);
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
        setShowDropdown(false);
        toast.info('Google Maps link resolved. Precision set to Area (≈ APPROXIMATE).');
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
        setShowDropdown(false);
        toast.info(`Coordinates (${rawLat.toFixed(4)}, ${rawLng.toFixed(4)}) set.`);
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
        console.error('Address search error:', err);
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
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  // Map Click Handler in Edit mode
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

  const numericLat = parseFloat(lat);
  const numericLng = parseFloat(lng);
  const hasValidCoords = !isNaN(numericLat) && !isNaN(numericLng) && numericLat >= -90 && numericLat <= 90 && numericLng >= -180 && numericLng <= 180;

  const handleCopyId = () => {
    if (location?.id) {
      navigator.clipboard.writeText(location.id);
      setCopiedId(true);
      toast.success('Location ID copied to clipboard');
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleCopyCoordinates = () => {
    if (hasValidCoords) {
      navigator.clipboard.writeText(`${numericLat.toFixed(6)}, ${numericLng.toFixed(6)}`);
      setCopiedCoords(true);
      toast.success('Coordinates copied');
      setTimeout(() => setCopiedCoords(false), 2000);
    }
  };

  const openGoogleMaps = () => {
    if (hasValidCoords) {
      const url = `https://www.google.com/maps/search/?api=1&query=${numericLat},${numericLng}`;
      window.open(url, '_blank');
    }
  };

  const handleSaveForm = () => {
    if (!code.trim()) {
      setFormError('Location code is required.');
      return;
    }
    if (!name.trim()) {
      setFormError('Location name is required.');
      return;
    }
    if ((precision === 'EXACT' || precision === 'APPROXIMATE') && !hasValidCoords) {
      setFormError('Valid coordinates are required for EXACT or APPROXIMATE precision.');
      return;
    }

    updateMutation.mutate({
      code: code.trim().toUpperCase(),
      name: name.trim(),
      address: address.trim() || null,
      city: city.trim() || null,
      postalCode: postalCode.trim() || null,
      lat: precision === 'UNKNOWN' ? null : numericLat,
      lng: precision === 'UNKNOWN' ? null : numericLng,
      coordinate_precision: precision,
    });
  };

  const handleToggleActive = () => {
    if (!location) return;
    const nextStatus = !location.is_active;
    updateMutation.mutate(
      { is_active: nextStatus },
      {
        onSuccess: () => {
          setIsDeactivateModalOpen(false);
          toast.success(`Location ${nextStatus ? 'restored to Active' : 'deactivated'}`);
        },
      }
    );
  };

  // Quotation & Trip Usage metrics
  const quotationCount = location?._count?.quotationStops || location?.quotationStops?.length || 0;
  const tripCount = location?._count?.tripStops || location?.tripStops?.length || 0;

  if (isLoading) {
    return (
      <DashboardLayout active="Locations" title="Location Details">
        <div className="flex flex-col items-center justify-center min-h-[450px] space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-brand" />
          <p className="text-xs font-bold text-slate-500">Loading location operational record...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (isError || !location) {
    return (
      <DashboardLayout active="Locations" title="Location Details">
        <div className="max-w-xl mx-auto my-12 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-sm">
          <AlertTriangle className="w-8 h-8 text-rose-600 shrink-0" />
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-slate-100">Location Not Found</h2>
            <p className="text-xs text-slate-500 mt-1">
              {(error as any)?.message || 'The requested location operational record could not be loaded or may have been deleted.'}
            </p>
          </div>
          <Button onClick={() => navigate('/locations')} size="sm" className="bg-brand text-white text-xs font-bold">
            ← Back to Locations Directory
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout active="Locations" title={`Location: ${location.code} - ${location.name}`}>
      <div className="space-y-4 max-w-7xl mx-auto pb-10">

        {/* ── 1. HEADER BAR ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/locations')}
              className="h-8 gap-1 text-xs font-bold border-slate-200 dark:border-slate-800"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Locations
            </Button>

            <div className="flex items-center gap-2.5">
              <MapPin className="w-6 h-6 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
                {location.code}
              </span>
              <h1 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">
                {location.name}
              </h1>
              <Badge variant={location.is_active ? 'default' : 'outline'} className={cn(
                "text-[10px] font-bold",
                location.is_active ? "bg-emerald-600 text-white" : "text-slate-400 border-slate-300"
              )}>
                {location.is_active ? 'ACTIVE' : 'INACTIVE'}
              </Badge>
            </div>
          </div>

          {/* Action Group */}
          <div className="flex items-center gap-2 shrink-0">
            {isEditing ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsEditing(false);
                    setFormError(null);
                  }}
                  className="h-8 text-xs font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={updateMutation.isPending}
                  onClick={handleSaveForm}
                  className="h-8 text-xs font-extrabold bg-brand hover:bg-brand-hover text-white shadow-xs gap-1.5"
                >
                  {updateMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  Save Changes
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="h-8 text-xs font-extrabold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 shadow-xs gap-1.5"
                >
                  <Edit2 size={13} /> Edit Location
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 text-xs font-bold gap-1">
                      More <MoreVertical size={13} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 text-xs font-medium">
                    <DropdownMenuItem onClick={() => navigate(`/customers/${location.customerId}`)}>
                      <Building2 className="w-3.5 h-3.5 text-indigo-600 mr-2" /> View Customer
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleCopyId}>
                      <Copy className="w-3.5 h-3.5 text-slate-500 mr-2" /> Copy Location ID
                    </DropdownMenuItem>
                    {hasValidCoords && (
                      <DropdownMenuItem onClick={openGoogleMaps}>
                        <ExternalLink className="w-3.5 h-3.5 text-emerald-600 mr-2" /> Open in Google Maps
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    {location.is_active ? (
                      <DropdownMenuItem
                        onClick={() => setIsDeactivateModalOpen(true)}
                        className="text-rose-600 focus:text-rose-600"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-2" /> Deactivate Location
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        onClick={handleToggleActive}
                        className="text-emerald-600 focus:text-emerald-600 font-bold"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-2" /> Restore Location
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        </div>

        {/* ── Error Banner ── */}
        {formError && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 flex items-center justify-between text-red-700 dark:text-red-400 text-xs font-semibold">
            <div className="flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0" />
              <span>{formError}</span>
            </div>
            <button onClick={() => setFormError(null)} className="p-1 hover:bg-red-100 rounded-lg">
              <X size={14} />
            </button>
          </div>
        )}

        {/* ── 2. HERO / OPERATIONAL IDENTITY STRIP ── */}
        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl shadow-2xs">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-800">

              {/* Customer */}
              <div className="space-y-1">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Customer Account</div>
                <div className="flex items-center gap-1.5">
                  <Link
                    to={`/customers/${location.customerId}`}
                    className="text-xs font-black text-indigo-600 dark:text-indigo-400 hover:underline truncate"
                  >
                    {location.customer?.name || 'Customer Account'}
                  </Link>
                  <ExternalLink size={11} className="text-indigo-400 shrink-0" />
                </div>
              </div>

              {/* Code & Name */}
              <div className="space-y-1 md:pl-4 pt-2 md:pt-0">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Location Code & Name</div>
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                  <span className="font-mono font-black text-brand mr-1.5">{location.code}</span>
                  {location.name}
                </div>
              </div>

              {/* City */}
              <div className="space-y-1 md:pl-4 pt-2 md:pt-0">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">City / Region</div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {location.city || 'Riyadh'}
                </div>
              </div>

              {/* Precision */}
              <div className="space-y-1 md:pl-4 pt-2 md:pt-0">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Coordinate Precision</div>
                <div>
                  {location.coordinate_precision === 'EXACT' && (
                    <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                      ✓ EXACT
                    </Badge>
                  )}
                  {location.coordinate_precision === 'APPROXIMATE' && (
                    <Badge className="bg-indigo-600 text-white text-[10px] font-bold">
                      ≈ APPROXIMATE
                    </Badge>
                  )}
                  {location.coordinate_precision === 'UNKNOWN' && (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold">
                      ○ UNKNOWN
                    </Badge>
                  )}
                </div>
              </div>

              {/* Usage Count */}
              <div className="space-y-1 md:pl-4 pt-2 md:pt-0">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Operational Usage</div>
                <div className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                  {quotationCount} Quotes • {tripCount} Trip Stops
                </div>
              </div>

            </div>
          </CardContent>
        </Card>

        {/* ── 3. MAIN 2-COLUMN GRID ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">

          {/* ───────────────────────── LEFT 8 COLS ───────────────────────── */}
          <div className="lg:col-span-8 space-y-4">

            {/* 1. LOCATION IDENTITY & ADDRESS (VIEW / EDIT MODE) */}
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl shadow-2xs">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    <Building2 size={15} className="text-brand" />
                    Identity & Address Details
                  </div>
                  {isEditing && (
                    <Badge variant="outline" className="text-[10px] font-semibold text-amber-600 border-amber-200 bg-amber-50">
                      Editing Mode
                    </Badge>
                  )}
                </div>

                {isEditing ? (
                  /* EDIT MODE FIELDS */
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          LOCATION CODE <span className="text-brand">*</span>
                        </Label>
                        <Input
                          value={code}
                          onChange={(e) => setCode(e.target.value.toUpperCase())}
                          className="font-mono uppercase font-bold text-xs h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          LOCATION NAME <span className="text-brand">*</span>
                        </Label>
                        <Input
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="text-xs font-medium h-9"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        STREET / FACILITY ADDRESS
                      </Label>
                      <Textarea
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        rows={2}
                        className="text-xs resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">CITY</Label>
                        <Input value={city} onChange={(e) => setCity(e.target.value)} className="text-xs h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">POSTAL CODE</Label>
                        <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} className="text-xs font-mono h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">COUNTRY</Label>
                        <Input value={country} disabled className="text-xs bg-slate-50 dark:bg-slate-800 text-slate-500 font-semibold h-9" />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* VIEW MODE DISPLAY */
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-2">
                      <div>
                        <span className="text-slate-400 font-medium block text-[10px] uppercase">Location Code & Slug</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono font-black text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                            {location.code}
                          </span>
                          <span className="text-slate-500 font-mono text-[11px] truncate">
                            {location.slug}
                          </span>
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-400 font-medium block text-[10px] uppercase">Street Address</span>
                        <p className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">
                          {location.address || 'No street address specified.'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <span className="text-slate-400 font-medium block text-[10px] uppercase">City & Region</span>
                        <p className="font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                          {location.city || 'Riyadh'}, Saudi Arabia
                        </p>
                      </div>

                      <div>
                        <span className="text-slate-400 font-medium block text-[10px] uppercase">Postal Code</span>
                        <p className="font-mono font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                          {location.postalCode || '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 2. GOOGLE MAPS RESOLUTION WORKFLOW (AVAILABLE IN BOTH VIEW & EDIT MODE) */}
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl shadow-2xs">
              <CardContent className="p-4 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 pb-1">
                  <Search size={15} className="text-emerald-600" />
                  Google Maps & Location Resolver
                </div>

                <div className="space-y-1 relative" ref={dropdownRef}>
                  <div className="relative">
                    <Input
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      placeholder="Paste Google Maps link, WhatsApp share text, or raw coordinates (24.7136, 46.6753)..."
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
              </CardContent>
            </Card>

            {/* 3. COMMERCIAL QUOTATIONS USAGE PANEL */}
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl shadow-2xs">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    <FileText size={15} className="text-indigo-600" />
                    Commercial Quotations Usage ({quotationCount})
                  </div>
                </div>

                {location.quotationStops && location.quotationStops.length > 0 ? (
                  <div className="space-y-2">
                    {location.quotationStops.map((qs: any) => {
                      const q = qs.quotation;
                      if (!q) return null;
                      const origin = q.stops?.[0]?.location?.code || '—';
                      const dest = q.stops?.[q.stops.length - 1]?.location?.code || '—';
                      return (
                        <div
                          key={qs.id}
                          className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-black text-slate-900 dark:text-slate-100">
                              {q.quotationNumber}
                            </span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">
                              {origin} → {dest}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {q.vehicle_class || q.billing_type || 'Per Trip'}
                            </span>
                            <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                              SAR {q.rate_amount != null ? Number(q.rate_amount).toLocaleString() : '—'}
                            </span>
                          </div>
                          <Link
                            to={`/quotations/${q.id}`}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 flex items-center gap-1"
                          >
                            View Quote <ChevronRight size={13} />
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-4 text-center text-slate-400 text-xs">
                    No commercial quotations currently link this location.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 4. RECENT TRIPS USAGE PANEL */}
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl shadow-2xs">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    <Truck size={15} className="text-brand" />
                    Recent Trip Stops ({tripCount})
                  </div>
                </div>

                {location.tripStops && location.tripStops.length > 0 ? (
                  <div className="space-y-2">
                    {location.tripStops.map((ts: any) => {
                      const t = ts.trip;
                      if (!t) return null;
                      const origin = t.stops?.[0]?.location?.code || t.stops?.[0]?.location_name || '—';
                      const dest = t.stops?.[t.stops.length - 1]?.location?.code || t.stops?.[t.stops.length - 1]?.location_name || '—';
                      return (
                        <div
                          key={ts.id}
                          className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-black text-slate-900 dark:text-slate-100">
                              {t.ref_id || t.id.substring(0, 8)}
                            </span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">
                              {origin} → {dest}
                            </span>
                            <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[10px] font-semibold">
                              {ts.stop_type || 'Stop'}
                            </Badge>
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                              {t.status || 'Active'}
                            </Badge>
                          </div>
                          <Link
                            to={`/trips/${t.id}`}
                            className="text-xs font-bold text-brand hover:underline flex items-center gap-1"
                          >
                            View Trip <ChevronRight size={13} />
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-4 text-center text-slate-400 text-xs">
                    No trips currently reference this location.
                  </div>
                )}
              </CardContent>
            </Card>

          </div>

          {/* ───────────────────────── RIGHT 4 COLS ───────────────────────── */}
          <div className="lg:col-span-4 lg:sticky lg:top-4 space-y-4">

            {/* MAP & PRECISION DISPLAY CARD */}
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl shadow-2xs overflow-hidden">
              <div className="py-2.5 px-4 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  <MapIcon size={15} className="text-brand" />
                  Map & Location Position
                </div>
                <Badge variant="outline" className="text-[10px] font-mono bg-white dark:bg-slate-900">
                  {hasValidCoords ? `${numericLat.toFixed(4)}, ${numericLng.toFixed(4)}` : 'No Pin'}
                </Badge>
              </div>

              <CardContent className="p-0">
                <div className="h-[250px] w-full relative">
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
                      <MapClickHandler onMapClick={handleMapClick} enabled={isEditing} />
                      <Marker
                        position={[numericLat, numericLng]}
                        icon={customPinIcon}
                        draggable={isEditing}
                        eventHandlers={{
                          dragend(e) {
                            if (isEditing) {
                              const pos = e.target.getLatLng();
                              handleMapClick(pos.lat, pos.lng);
                            }
                          },
                        }}
                      />
                    </MapContainer>
                  ) : (
                    <div className="h-full w-full bg-slate-100 dark:bg-slate-800/40 flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                      <MapPin size={28} className="opacity-40 mb-1" />
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        ○ Location Not Pinned
                      </p>
                      <p className="text-[10px] text-slate-500 max-w-xs mt-0.5">
                        No GPS coordinates available. Location remains operationally usable for trips & quotes.
                      </p>
                    </div>
                  )}
                </div>

                {/* Precision UX Banner */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 space-y-2.5">

                  {precision === 'EXACT' && (
                    <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block">✓ Exact Facility Location</strong>
                        <span className="text-[11px] font-normal text-emerald-700 dark:text-emerald-400">
                          The pin has been explicitly confirmed as the customer facility dock/gate.
                        </span>
                      </div>
                    </div>
                  )}

                  {precision === 'APPROXIMATE' && (
                    <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-xs font-semibold text-indigo-800 dark:text-indigo-300 flex items-start gap-2">
                      <ShieldCheck size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block">≈ Area Location</strong>
                        <span className="text-[11px] font-normal text-indigo-700 dark:text-indigo-400">
                          This pin represents the known area/hub, not necessarily the exact facility.
                        </span>
                      </div>
                    </div>
                  )}

                  {precision === 'UNKNOWN' && (
                    <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-start gap-2">
                      <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block">○ Location Not Pinned</strong>
                        <span className="text-[11px] font-normal text-amber-700 dark:text-amber-400">
                          No GPS coordinates are currently set. Resolve location using Google Maps link above.
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Actions for Map Pinning */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {hasValidCoords && (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={openGoogleMaps}
                          className="h-7 px-2 text-[11px] font-bold border-slate-300 text-slate-700 dark:text-slate-300 gap-1"
                        >
                          <ExternalLink size={12} /> Google Maps
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleCopyCoordinates}
                          className="h-7 px-2 text-[11px] font-bold border-slate-300 text-slate-700 dark:text-slate-300 gap-1"
                        >
                          {copiedCoords ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                          Coordinates
                        </Button>
                      </>
                    )}

                    {precision === 'APPROXIMATE' && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          setPrecision('EXACT');
                          if (!isEditing) {
                            updateMutation.mutate({ coordinate_precision: 'EXACT' });
                          }
                        }}
                        className="h-7 px-2.5 text-[11px] font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                      >
                        ✓ Confirm Exact
                      </Button>
                    )}
                  </div>

                </div>
              </CardContent>
            </Card>

            {/* CUSTOMER RELATIONSHIP CARD (READ-ONLY) */}
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl shadow-xs">
              <CardContent className="p-4 space-y-2.5 text-xs">
                <div className="pb-1.5 border-b border-slate-100 dark:border-slate-800 text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Customer Ownership Context
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500 font-medium">Customer:</span>
                  <Link
                    to={`/customers/${location.customerId}`}
                    className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    {location.customer?.name}
                  </Link>
                </div>

                <div className="p-2 rounded bg-slate-50 dark:bg-slate-800 text-[10px] text-slate-500 font-medium">
                  Customer ownership is locked to preserve commercial quotation and dispatch data safety.
                </div>
              </CardContent>
            </Card>

          </div>

        </div>

      </div>

      {/* ── Confirm Deactivate Modal ── */}
      <ConfirmModal
        isOpen={isDeactivateModalOpen}
        onClose={() => setIsDeactivateModalOpen(false)}
        onConfirm={handleToggleActive}
        title="Deactivate Location?"
        message={`Are you sure you want to deactivate "${location.name}" (${location.code})? It is currently referenced by ${quotationCount} quotation stops and ${tripCount} trip stops. Historical references will remain intact.`}
        confirmLabel="Deactivate Location"
        isLoading={updateMutation.isPending}
      />
    </DashboardLayout>
  );
}
