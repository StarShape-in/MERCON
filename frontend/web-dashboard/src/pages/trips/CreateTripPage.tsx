import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  RotateCcw, 
  Plus, 
  MapPin, 
  UserCheck, 
  Truck, 
  AlertTriangle, 
  CheckCircle2, 
  Circle, 
  Navigation, 
  Package, 
  Clock,
  ArrowRight,
  Keyboard,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import LocationPickerMap from '@/components/trips/LocationPickerMap';
import { tripService, CreateTripPayload } from '@/services/tripService';
import { customerService } from '@/services/customerService';
import { driverService } from '@/services/driverService';
import { vehicleService } from '@/services/vehicleService';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function CreateTripPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'customer' | 'assignment' | 'route'>('customer');
  const [cargoType, setCargoType] = useState('General Goods');
  const [hazmat, setHazmat] = useState(false);
  const [plannedStart, setPlannedStart] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Stops
  const [pickupLat, setPickupLat] = useState<number | null>(24.7136); // Default Riyadh
  const [pickupLng, setPickupLng] = useState<number | null>(46.6753);
  const [pickupTime, setPickupTime] = useState('');

  const [dropoffLat, setDropoffLat] = useState<number | null>(21.5433); // Default Jeddah
  const [dropoffLng, setDropoffLng] = useState<number | null>(39.1728);
  const [dropoffTime, setDropoffTime] = useState('');

  // Fetch Customers, Drivers, Vehicles for Select inputs
  const { data: customersRes } = useQuery({
    queryKey: ['customers-select'],
    queryFn: () => customerService.getAll({ per_page: 100 }),
  });
  
  const { data: driversRes } = useQuery({
    queryKey: ['drivers-select'],
    queryFn: () => driverService.getAll({ per_page: 100, status: 'Available' }),
  });

  const { data: vehiclesRes } = useQuery({
    queryKey: ['vehicles-select'],
    queryFn: () => vehicleService.getAll({ per_page: 100, status: 'Available' }),
  });

  const customers = customersRes?.data || [];
  const drivers = driversRes?.data || [];
  const vehicles = vehiclesRes?.data || [];

  const selectedCustomer = customers.find(c => c.id === customerId);
  const selectedDriver = drivers.find(d => d.id === driverId);
  const selectedVehicle = vehicles.find(v => v.id === vehicleId);

  // Create Trip Mutation
  const createMutation = useMutation({
    mutationFn: (payload: CreateTripPayload) => tripService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-performance'] });
      navigate('/trips');
    },
    onError: (err: any) => {
      setError(err.response?.data?.error?.message || err.message || 'Could not create the trip.');
    }
  });

  const missingLocation = pickupLat == null || pickupLng == null || dropoffLat == null || dropoffLng == null;
  const isFormValid = customerId !== '' && driverId !== '' && vehicleId !== '' && cargoType.trim() !== '' && !missingLocation;

  const handleReset = () => {
    setActiveTab('customer');
    setCargoType('General Goods');
    setHazmat(false);
    setPlannedStart('');
    setCustomerId('');
    setDriverId('');
    setVehicleId('');
    setPickupLat(24.7136);
    setPickupLng(46.6753);
    setPickupTime('');
    setDropoffLat(21.5433);
    setDropoffLng(39.1728);
    setDropoffTime('');
    setError(null);
  };

  const handleSubmit = useCallback(() => {
    setError(null);

    if (!customerId) {
      setActiveTab('customer');
      setError('Please select a customer.');
      return;
    }
    if (!cargoType.trim()) {
      setActiveTab('customer');
      setError('Please enter or select a cargo type.');
      return;
    }
    if (!driverId) {
      setActiveTab('assignment');
      setError('Please assign a driver.');
      return;
    }
    if (!vehicleId) {
      setActiveTab('assignment');
      setError('Please assign a vehicle.');
      return;
    }
    if (pickupLat == null || pickupLng == null) {
      setActiveTab('route');
      setError('Please select a pickup location on the map.');
      return;
    }
    if (dropoffLat == null || dropoffLng == null) {
      setActiveTab('route');
      setError('Please select a dropoff location on the map.');
      return;
    }

    const payload: CreateTripPayload = {
      customer_id: customerId,
      driver_id: driverId,
      vehicle_id: vehicleId,
      cargo_type: cargoType,
      hazmat_flag: hazmat,
      planned_start: plannedStart || undefined,
      stops: [
        {
          stop_type: 'Pickup',
          lat: pickupLat,
          lng: pickupLng,
          planned_arrival: pickupTime || undefined,
        },
        {
          stop_type: 'Dropoff',
          lat: dropoffLat,
          lng: dropoffLng,
          planned_arrival: dropoffTime || undefined,
        },
      ],
    };

    createMutation.mutate(payload);
  }, [customerId, cargoType, driverId, vehicleId, pickupLat, pickupLng, dropoffLat, dropoffLng, hazmat, plannedStart, pickupTime, dropoffTime, createMutation]);

  // Tab Navigation Functions
  const goToNextTab = useCallback(() => {
    setActiveTab((prev) => {
      if (prev === 'customer') return 'assignment';
      if (prev === 'assignment') return 'route';
      return 'route';
    });
  }, []);

  const goToPrevTab = useCallback(() => {
    setActiveTab((prev) => {
      if (prev === 'route') return 'assignment';
      if (prev === 'assignment') return 'customer';
      return 'customer';
    });
  }, []);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcut if user is typing inside text input/textarea/select unless it's Ctrl+Enter
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';

      // 1. Dispatch Trip: Ctrl + Enter or Cmd + Enter
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (isFormValid && !createMutation.isPending) {
          handleSubmit();
        }
        return;
      }

      // 2. Tab Navigation: Alt + ArrowRight / Alt + ArrowLeft or Ctrl + Right / Left
      if ((e.altKey || e.ctrlKey) && e.key === 'ArrowRight') {
        e.preventDefault();
        goToNextTab();
        return;
      }

      if ((e.altKey || e.ctrlKey) && e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPrevTab();
        return;
      }

      // 3. Tab switching when not typing in inputs: Right/Left arrow
      if (!isInput) {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          goToNextTab();
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          goToPrevTab();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNextTab, goToPrevTab, handleSubmit, isFormValid, createMutation.isPending]);

  return (
    <DashboardLayout active="Trips" title="Create New Trip">
      <div className="px-6 pb-6 space-y-5 animate-fade-in max-w-[1400px] mx-auto">
        
        {/* Top Scope & Action Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted text-xs font-semibold text-muted-foreground border border-border/80">
              <span>🏢 MERCON Fleet</span>
              <span>•</span>
              <span className="text-foreground">Dispatch & Operations</span>
            </div>
            <Badge className="bg-indigo-500/10 text-indigo-600 border-indigo-200 font-semibold dark:bg-indigo-950/40 dark:text-indigo-300">
              Trip Dispatch Module
            </Badge>

            <div className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded bg-muted/60 text-[10px] text-muted-foreground font-mono">
              <Keyboard className="w-3 h-3" /> Shortcuts: <kbd className="bg-background px-1 rounded border">Alt+←/→</kbd> Tabs • <kbd className="bg-background px-1 rounded border">Ctrl+Enter</kbd> Dispatch
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/trips')}
              className="h-8 gap-1.5 text-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Trips
            </Button>

            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleReset}
              className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </Button>

            <Button 
              size="sm" 
              onClick={() => handleSubmit()}
              disabled={createMutation.isPending || !isFormValid}
              className="h-8 gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" /> {createMutation.isPending ? 'Dispatching...' : 'Dispatch Trip'}
              <kbd className="hidden sm:inline-block ml-1 text-[9px] bg-indigo-700/80 text-indigo-100 px-1 rounded font-mono">Ctrl+↵</kbd>
            </Button>
          </div>
        </div>

        {/* Header KPI Instrument Panel Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-3 bg-card border-border/70 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Cargo Class</span>
              <Package className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-base font-bold text-foreground truncate max-w-[140px]">{cargoType || 'General Goods'}</span>
              <Badge variant="outline" className={`text-[9px] px-1 py-0 ${hazmat ? 'bg-amber-50 text-amber-700 border-amber-300' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                {hazmat ? 'HAZMAT' : 'Standard'}
              </Badge>
            </div>
          </Card>

          <Card className="p-3 bg-card border-border/70 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Assigned Driver</span>
              <UserCheck className="w-4 h-4 text-blue-500" />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xs font-bold text-foreground truncate max-w-[130px]">
                {selectedDriver ? `${selectedDriver.first_name} ${selectedDriver.last_name}` : 'Unassigned'}
              </span>
              {selectedDriver && (
                <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-300">
                  Risk: {selectedDriver.ai_risk_score ?? 'Low'}
                </span>
              )}
            </div>
          </Card>

          <Card className="p-3 bg-card border-border/70 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Assigned Vehicle</span>
              <Truck className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xs font-bold text-foreground truncate max-w-[130px]">
                {selectedVehicle ? selectedVehicle.plate_number : 'Unassigned'}
              </span>
              {selectedVehicle && (
                <span className="text-[10px] text-muted-foreground">
                  {selectedVehicle.asset_type}
                </span>
              )}
            </div>
          </Card>

          <Card className="p-3 bg-card border-border/70 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Route Geofence</span>
              <Navigation className="w-4 h-4 text-purple-500" />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xs font-bold text-foreground">
                {pickupLat && dropoffLat ? '2 Stops Set' : 'Incomplete'}
              </span>
              <Badge variant="outline" className={`text-[9px] px-1 py-0 ${!missingLocation ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-muted text-muted-foreground'}`}>
                {!missingLocation ? 'Ready' : 'Pending'}
              </Badge>
            </div>
          </Card>
        </div>

        {/* Main 2-Column Content Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* Left Column: 3 Tabs Workspace (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            <Card className="border-border/80 shadow-xs">
              <CardHeader className="pb-3 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Navigation className="w-4 h-4 text-indigo-600" /> Dispatch Setup
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Configure customer, cargo type, assignments, and geofence locations.
                    </CardDescription>
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                    <Keyboard className="w-3 h-3 text-muted-foreground" /> <kbd className="bg-muted px-1 rounded">Alt+←/→</kbd>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-4">
                <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full">
                  
                  {/* Tabs Navigation Header */}
                  <TabsList className="grid grid-cols-3 w-full mb-4 bg-muted/70 p-1">
                    <TabsTrigger value="customer" className="text-xs font-semibold flex items-center gap-1">
                      1. Customer & Cargo
                    </TabsTrigger>
                    <TabsTrigger value="assignment" className="text-xs font-semibold flex items-center gap-1">
                      2. Driver & Vehicle
                    </TabsTrigger>
                    <TabsTrigger value="route" className="text-xs font-semibold flex items-center gap-1">
                      3. Route Stops
                    </TabsTrigger>
                  </TabsList>

                  {/* TAB 1: Customer & Cargo */}
                  <TabsContent value="customer" className="space-y-4 m-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor="customer_id" className="text-xs font-semibold">
                          Select Customer <span className="text-destructive">*</span>
                        </Label>
                        <Select 
                          value={customerId} 
                          onValueChange={(val) => setCustomerId(val)}
                        >
                          <SelectTrigger id="customer_id" className="h-9 text-xs">
                            <SelectValue placeholder="Choose customer organization..." />
                          </SelectTrigger>
                          <SelectContent>
                            {customers.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name} ({c.contact_phone || 'No Phone'})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor="cargo_type" className="text-xs font-semibold flex items-center justify-between">
                          <span>Cargo Type <span className="text-destructive">*</span></span>
                          <span className="text-[10px] text-indigo-600 font-semibold">Presets available</span>
                        </Label>
                        <Input
                          id="cargo_type"
                          placeholder="e.g. General Goods"
                          value={cargoType}
                          onChange={(e) => setCargoType(e.target.value)}
                          className="h-9 text-xs font-medium"
                        />
                        {/* Cargo Type Presets */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {['General Goods', 'Refrigerated Food', 'Industrial Machinery', 'Chemicals', 'Electronics'].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setCargoType(preset)}
                              className={`text-[11px] px-2 py-0.5 rounded border transition-colors ${
                                cargoType === preset 
                                  ? 'bg-indigo-600 text-white border-indigo-600 font-semibold' 
                                  : 'bg-muted/50 hover:bg-muted text-muted-foreground border-border'
                              }`}
                            >
                              {preset}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="planned_start" className="text-xs font-semibold flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground" /> Planned Start Time
                        </Label>
                        <Input
                          id="planned_start"
                          type="datetime-local"
                          value={plannedStart}
                          onChange={(e) => setPlannedStart(e.target.value)}
                          className="h-9 text-xs font-mono"
                        />
                      </div>

                      <div className="space-y-1.5 flex items-end">
                        <div className="flex items-center gap-2 p-2.5 rounded-md bg-muted/40 border border-border/50 w-full h-9">
                          <input
                            type="checkbox"
                            id="hazmat"
                            checked={hazmat}
                            onChange={(e) => setHazmat(e.target.checked)}
                            className="rounded border-input text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                          />
                          <Label htmlFor="hazmat" className="text-xs font-bold text-foreground cursor-pointer flex items-center gap-1.5">
                            <AlertTriangle className={`w-3.5 h-3.5 ${hazmat ? 'text-amber-500' : 'text-muted-foreground'}`} />
                            HAZMAT (Hazardous Cargo)
                          </Label>
                        </div>
                      </div>

                    </div>

                    <div className="pt-2 flex justify-end">
                      <Button 
                        type="button" 
                        size="sm"
                        onClick={goToNextTab}
                        className="h-8 text-xs gap-1.5"
                      >
                        Next: Assignments <ChevronRight className="w-3.5 h-3.5" />
                        <kbd className="text-[9px] bg-primary-foreground/20 px-1 rounded font-mono">Alt+→</kbd>
                      </Button>
                    </div>
                  </TabsContent>

                  {/* TAB 2: Driver & Vehicle Assignment */}
                  <TabsContent value="assignment" className="space-y-4 m-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      
                      <div className="space-y-1.5">
                        <Label htmlFor="driver_id" className="text-xs font-semibold">
                          Assigned Driver <span className="text-destructive">*</span>
                        </Label>
                        <Select 
                          value={driverId} 
                          onValueChange={(val) => setDriverId(val)}
                        >
                          <SelectTrigger id="driver_id" className="h-9 text-xs">
                            <SelectValue placeholder="Choose available driver..." />
                          </SelectTrigger>
                          <SelectContent>
                            {drivers.map((d) => (
                              <SelectItem key={d.id} value={d.id}>
                                {d.first_name} {d.last_name} (Risk: {d.ai_risk_score ?? 'Low'})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="vehicle_id" className="text-xs font-semibold">
                          Assigned Vehicle <span className="text-destructive">*</span>
                        </Label>
                        <Select 
                          value={vehicleId} 
                          onValueChange={(val) => setVehicleId(val)}
                        >
                          <SelectTrigger id="vehicle_id" className="h-9 text-xs">
                            <SelectValue placeholder="Choose available vehicle..." />
                          </SelectTrigger>
                          <SelectContent>
                            {vehicles.map((v) => (
                              <SelectItem key={v.id} value={v.id}>
                                {v.plate_number} ({v.asset_type} • {v.capacity_kg.toLocaleString()} kg)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                    </div>

                    {selectedDriver && selectedVehicle && (
                      <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-200 dark:border-emerald-800 text-xs flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <div>
                            <span className="font-bold text-foreground">{selectedDriver.first_name} {selectedDriver.last_name}</span> paired with <span className="font-bold text-foreground">{selectedVehicle.plate_number}</span>
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px]">
                          Pairing Ready
                        </Badge>
                      </div>
                    )}

                    <div className="pt-2 flex justify-between">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={goToPrevTab}
                        className="h-8 text-xs gap-1"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" /> Back <kbd className="text-[9px] bg-muted px-1 rounded font-mono">Alt+←</kbd>
                      </Button>
                      <Button 
                        type="button" 
                        size="sm"
                        onClick={goToNextTab}
                        className="h-8 text-xs gap-1.5"
                      >
                        Next: Route Stops <ChevronRight className="w-3.5 h-3.5" />
                        <kbd className="text-[9px] bg-primary-foreground/20 px-1 rounded font-mono">Alt+→</kbd>
                      </Button>
                    </div>
                  </TabsContent>

                  {/* TAB 3: Route Stops & Geofencing */}
                  <TabsContent value="route" className="space-y-4 m-0">
                    
                    {/* Pickup Stop */}
                    <div className="space-y-3 p-3 bg-muted/30 rounded-lg border border-border/60">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" /> Pickup Stop (Sequence 1)
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {pickupLat && pickupLng ? `${pickupLat.toFixed(4)}, ${pickupLng.toFixed(4)}` : 'Not Set'}
                        </span>
                      </div>

                      <LocationPickerMap
                        label="Pickup Location (Click map to pin)"
                        lat={pickupLat}
                        lng={pickupLng}
                        onChange={(lat: number, lng: number) => { setPickupLat(lat); setPickupLng(lng); }}
                      />

                      <div className="space-y-1.5">
                        <Label htmlFor="pickup_time" className="text-xs font-semibold">
                          Planned Pickup Arrival Time
                        </Label>
                        <Input
                          id="pickup_time"
                          type="datetime-local"
                          value={pickupTime}
                          onChange={(e) => setPickupTime(e.target.value)}
                          className="h-9 text-xs font-mono"
                        />
                      </div>
                    </div>

                    {/* Dropoff Stop */}
                    <div className="space-y-3 p-3 bg-muted/30 rounded-lg border border-border/60">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-rose-500" /> Dropoff Stop (Sequence 2)
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {dropoffLat && dropoffLng ? `${dropoffLat.toFixed(4)}, ${dropoffLng.toFixed(4)}` : 'Not Set'}
                        </span>
                      </div>

                      <LocationPickerMap
                        label="Dropoff Location (Click map to pin)"
                        lat={dropoffLat}
                        lng={dropoffLng}
                        onChange={(lat: number, lng: number) => { setDropoffLat(lat); setDropoffLng(lng); }}
                      />

                      <div className="space-y-1.5">
                        <Label htmlFor="dropoff_time" className="text-xs font-semibold">
                          Planned Dropoff Arrival Time
                        </Label>
                        <Input
                          id="dropoff_time"
                          type="datetime-local"
                          value={dropoffTime}
                          onChange={(e) => setDropoffTime(e.target.value)}
                          className="h-9 text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex justify-between">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={goToPrevTab}
                        className="h-8 text-xs gap-1"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" /> Back <kbd className="text-[9px] bg-muted px-1 rounded font-mono">Alt+←</kbd>
                      </Button>
                      <Button 
                        type="button" 
                        size="sm"
                        onClick={() => handleSubmit()}
                        disabled={createMutation.isPending || !isFormValid}
                        className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" /> Dispatch Trip
                        <kbd className="text-[9px] bg-indigo-700/80 text-indigo-100 px-1 rounded font-mono">Ctrl+↵</kbd>
                      </Button>
                    </div>

                  </TabsContent>

                </Tabs>
              </CardContent>
            </Card>

            {error && (
              <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-xs font-semibold border border-destructive/20 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                {error}
              </div>
            )}
          </div>

          {/* Right Column: Live Interactive Trip Manifest Card (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="border-border/80 shadow-xs overflow-hidden sticky top-4">
              <CardHeader className="pb-3 bg-gradient-to-r from-muted/50 to-muted/20 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="bg-background text-[10px] uppercase font-bold tracking-wider">
                    Live Trip Manifest
                  </Badge>
                  <span className="text-[10px] text-muted-foreground font-mono">DISPATCH-{Date.now().toString().slice(-4)}</span>
                </div>
                <CardTitle className="text-base font-bold mt-2">
                  {selectedCustomer ? selectedCustomer.name : 'Select Customer Organization'}
                </CardTitle>
                <CardDescription className="text-xs">
                  Real-time visualization of dispatch payload, route, and assignments.
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-4 space-y-4">
                
                {/* Visual Route Path Banner */}
                <div className="bg-gradient-to-r from-emerald-50 via-muted to-rose-50 dark:from-emerald-950/30 dark:via-muted/20 dark:to-rose-950/30 border border-border/80 rounded-lg p-3 space-y-2">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Route Visual Connector
                  </div>
                  
                  <div className="flex items-center justify-between gap-2 text-xs font-mono">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                      <span className="font-bold text-foreground truncate max-w-[90px]">
                        {pickupLat ? `Lat ${pickupLat.toFixed(2)}` : 'Origin'}
                      </span>
                    </div>

                    <div className="flex-1 flex items-center justify-center text-muted-foreground">
                      <span className="border-t border-dashed border-border w-full" />
                      <ArrowRight className="w-4 h-4 mx-1 shrink-0 text-indigo-500" />
                      <span className="border-t border-dashed border-border w-full" />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-foreground truncate max-w-[90px]">
                        {dropoffLat ? `Lat ${dropoffLat.toFixed(2)}` : 'Destination'}
                      </span>
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                    </div>
                  </div>
                </div>

                {/* Cargo & HAZMAT Badge Banner */}
                <div className="p-2.5 rounded-md bg-muted/40 border border-border/50 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[10px] text-muted-foreground">Cargo Category</span>
                    {hazmat && (
                      <Badge className="bg-amber-500 text-white text-[9px] px-1.5 py-0 flex items-center gap-1">
                        <AlertTriangle className="w-2.5 h-2.5" /> HAZMAT
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-indigo-500" /> {cargoType || 'General Goods'}
                  </div>
                </div>

                {/* Driver & Vehicle Pairing Spec */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-md bg-muted/40 border border-border/50">
                    <span className="text-[10px] text-muted-foreground block">Assigned Driver</span>
                    <span className="font-bold text-foreground mt-0.5 block truncate">
                      {selectedDriver ? `${selectedDriver.first_name} ${selectedDriver.last_name}` : 'Unassigned'}
                    </span>
                    {selectedDriver && (
                      <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-semibold block mt-0.5">
                        Risk Score: {selectedDriver.ai_risk_score ?? 'Low'}
                      </span>
                    )}
                  </div>

                  <div className="p-2.5 rounded-md bg-muted/40 border border-border/50">
                    <span className="text-[10px] text-muted-foreground block">Assigned Vehicle</span>
                    <span className="font-bold text-foreground mt-0.5 block font-mono">
                      {selectedVehicle ? selectedVehicle.plate_number : 'Unassigned'}
                    </span>
                    {selectedVehicle && (
                      <span className="text-[9px] text-muted-foreground block mt-0.5">
                        {selectedVehicle.asset_type} ({selectedVehicle.capacity_kg.toLocaleString()} kg)
                      </span>
                    )}
                  </div>
                </div>

                {/* Dispatch Readiness Checklist */}
                <div className="space-y-2 pt-1 border-t border-border/50">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Dispatch Validation</span>
                  
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        {customerId ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Circle className="w-3.5 h-3.5 text-muted" />}
                        Customer Selected
                      </span>
                      <span className="font-semibold text-[11px] truncate max-w-[120px]">{selectedCustomer ? selectedCustomer.name : 'Missing'}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        {driverId ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Circle className="w-3.5 h-3.5 text-muted" />}
                        Driver Assigned
                      </span>
                      <span className="font-semibold text-[11px] truncate max-w-[120px]">{selectedDriver ? selectedDriver.first_name : 'Missing'}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        {vehicleId ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Circle className="w-3.5 h-3.5 text-muted" />}
                        Vehicle Assigned
                      </span>
                      <span className="font-semibold font-mono text-[11px]">{selectedVehicle ? selectedVehicle.plate_number : 'Missing'}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        {!missingLocation ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Circle className="w-3.5 h-3.5 text-muted" />}
                        Pickup & Dropoff Geofences
                      </span>
                      <span className="font-semibold text-[11px]">{!missingLocation ? 'Ready' : 'Pending'}</span>
                    </div>
                  </div>
                </div>

              </CardContent>

              <CardFooter className="bg-muted/30 border-t border-border/50 p-3 flex justify-between items-center">
                <div className="text-[11px] text-muted-foreground">
                  Status: <span className="font-semibold text-indigo-600 dark:text-indigo-400">Ready to Dispatch</span>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleSubmit()}
                  disabled={createMutation.isPending || !isFormValid}
                  className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 gap-1"
                >
                  {createMutation.isPending ? 'Dispatching...' : 'Dispatch Trip'}
                  <kbd className="text-[9px] bg-indigo-700/80 text-indigo-100 px-1 rounded font-mono">Ctrl+↵</kbd>
                </Button>
              </CardFooter>
            </Card>
          </div>

        </div>

      </div>
    </DashboardLayout>
  );
}
