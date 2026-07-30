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
  CheckCircle2, 
  Circle, 
  Navigation, 
  Clock,
  ArrowRight,
  Keyboard,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import LocationPickerMap from '@/components/trips/LocationPickerMap';
import CreateDriverModal from '@/components/trips/CreateDriverModal';
import CreateVehicleModal from '@/components/trips/CreateVehicleModal';
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
import { Combobox } from '@/components/ui/combobox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function CreateTripPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'customer' | 'assignment' | 'route'>('customer');
  const [plannedStart, setPlannedStart] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [isAddDriverOpen, setIsAddDriverOpen] = useState(false);
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);

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

  const driverOptions = drivers.map((d) => ({
    value: d.id,
    label: `${d.first_name} ${d.last_name} (Risk: ${d.ai_risk_score ?? 'Low'})`,
    keywords: `${d.first_name} ${d.last_name}`,
  }));

  const vehicleOptions = vehicles.map((v) => ({
    value: v.id,
    label: `${v.plate_number} (${v.asset_type} • ${v.capacity_kg.toLocaleString()} kg)`,
    keywords: `${v.plate_number} ${v.asset_type}`,
  }));

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
  const isFormValid = customerId !== '' && driverId !== '' && vehicleId !== '' && !missingLocation;

  const handleReset = () => {
    setActiveTab('customer');
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

    // Client-side time ordering check (item 16)
    if (pickupTime && dropoffTime && dropoffTime <= pickupTime) {
      setActiveTab('route');
      setError('Dropoff time must be after pickup time.');
      return;
    }

    const payload: CreateTripPayload = {
      customer_id: customerId,
      driver_id: driverId,
      vehicle_id: vehicleId,
      cargo_type: 'General Goods',
      hazmat_flag: false,
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
  }, [customerId, driverId, vehicleId, pickupLat, pickupLng, dropoffLat, dropoffLng, plannedStart, pickupTime, dropoffTime, createMutation]);

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

      // 2. Direct Tab Jumping: Alt + 1, Alt + 2, Alt + 3
      if (e.altKey && e.key === '1') {
        e.preventDefault();
        setActiveTab('customer');
        return;
      }
      if (e.altKey && e.key === '2') {
        e.preventDefault();
        setActiveTab('assignment');
        return;
      }
      if (e.altKey && e.key === '3') {
        e.preventDefault();
        setActiveTab('route');
        return;
      }

      // 3. Tab Navigation: Alt + ArrowRight / Alt + ArrowLeft or Ctrl + Right / Left
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

      // 4. Tab switching when not typing in inputs: Right/Left arrow
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
      <div className="px-6 pb-6 space-y-4 animate-fade-in max-w-[1400px] mx-auto">
        
        {/* Top Scope & Action Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
              <span>🏢 MERCON Fleet</span>
              <span>•</span>
              <span className="text-slate-900 dark:text-slate-100 font-bold">Dispatch & Operations</span>
            </div>
            <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-200 font-bold dark:bg-indigo-950/40 dark:text-indigo-300">
              Trip Dispatch Module
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/trips')}
              className="h-9 gap-1.5 text-xs font-semibold border-slate-200 bg-white hover:bg-slate-50 shadow-2xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Trips
            </Button>

            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleReset}
              className="h-9 gap-1.5 text-xs text-slate-500 hover:text-slate-900"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </Button>

            <Button 
              size="sm" 
              onClick={() => handleSubmit()}
              disabled={createMutation.isPending || !isFormValid}
              className="h-9 gap-1.5 text-xs bg-[#E8450F] hover:bg-[#d03d0c] text-white font-bold shadow-xs rounded-md px-4"
            >
              <Plus className="w-3.5 h-3.5" /> {createMutation.isPending ? 'Dispatching...' : 'Dispatch Trip'}
              <kbd className="ml-1.5 px-1.5 py-0.5 text-[10px] font-mono font-bold bg-white/20 text-white rounded border border-white/30">
                Ctrl + ↵
              </kbd>
            </Button>
          </div>
        </div>

        {/* THEMED KEYBOARD QUICK CONTROLS BAR */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-3 px-4 shadow-2xs border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 flex items-center justify-center">
              <Keyboard className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <span className="font-bold text-slate-900 dark:text-slate-100">Keyboard Quick Controls:</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs">
            
            {/* Tab Switching Keycaps */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Switch Tabs:</span>
              <kbd className="px-1.5 py-0.5 text-[11px] font-mono font-bold bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded border border-slate-300 dark:border-slate-600 shadow-2xs">
                Alt
              </kbd>
              <span className="text-slate-400 font-bold">+</span>
              <kbd className="px-1.5 py-0.5 text-[11px] font-mono font-bold bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded border border-slate-300 dark:border-slate-600 shadow-2xs">
                ← / →
              </kbd>
            </div>

            {/* Jump to Tab Keycaps */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Jump Tab:</span>
              <kbd className="px-1.5 py-0.5 text-[11px] font-mono font-bold bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded border border-slate-300 dark:border-slate-600 shadow-2xs">
                Alt
              </kbd>
              <span className="text-slate-400 font-bold">+</span>
              <kbd className="px-1.5 py-0.5 text-[11px] font-mono font-bold bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded border border-slate-300 dark:border-slate-600 shadow-2xs">
                1 / 2 / 3
              </kbd>
            </div>

            {/* Submit Dispatch Keycaps */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Dispatch Trip:</span>
              <kbd className="px-1.5 py-0.5 text-[11px] font-mono font-bold bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded border border-slate-300 dark:border-slate-600 shadow-2xs">
                Ctrl + Enter ↵
              </kbd>
            </div>

          </div>
        </div>

        {/* Header KPI Instrument Panel Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Customer Org</span>
              <UserCheck className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate max-w-[130px]">
                {selectedCustomer ? selectedCustomer.name : 'Unselected'}
              </span>
              <Badge variant="outline" className={`text-[9px] px-1 py-0 font-bold ${selectedCustomer ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-300'}`}>
                {selectedCustomer ? 'Selected' : 'Required'}
              </Badge>
            </div>
          </Card>

          <Card className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Assigned Driver</span>
              <UserCheck className="w-4 h-4 text-blue-600" />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate max-w-[130px]">
                {selectedDriver ? `${selectedDriver.first_name} ${selectedDriver.last_name}` : 'Unassigned'}
              </span>
              {selectedDriver && (
                <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-300">
                  Risk: {selectedDriver.ai_risk_score ?? 'Low'}
                </span>
              )}
            </div>
          </Card>

          <Card className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Assigned Vehicle</span>
              <Truck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate max-w-[130px]">
                {selectedVehicle ? selectedVehicle.plate_number : 'Unassigned'}
              </span>
              {selectedVehicle && (
                <span className="text-[10px] text-slate-500 font-medium">
                  {selectedVehicle.asset_type}
                </span>
              )}
            </div>
          </Card>

          <Card className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Route Geofence</span>
              <Navigation className="w-4 h-4 text-purple-600" />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                {pickupLat && dropoffLat ? '2 Stops Set' : 'Incomplete'}
              </span>
              <Badge variant="outline" className={`text-[9px] px-1 py-0 font-bold ${!missingLocation ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                {!missingLocation ? 'Ready' : 'Pending'}
              </Badge>
            </div>
          </Card>
        </div>

        {/* Main 2-Column Content Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* Left Column: 3 Tabs Workspace (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            <Card className="border border-slate-200 dark:border-slate-800 shadow-2xs rounded-xl bg-white dark:bg-slate-900">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Navigation className="w-4.5 h-4.5 text-indigo-600" /> Dispatch Setup
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Configure customer organization, assignments, and geofence locations.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-4">
                <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full">
                  
                  {/* Tabs Navigation Header */}
                  <TabsList className="grid grid-cols-3 w-full mb-4 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    
                    <TabsTrigger value="customer" className="text-xs font-semibold flex items-center justify-between gap-1">
                      <span>1. Customer Info</span>
                      <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded border border-slate-200 dark:border-slate-700 shadow-2xs">
                        Alt+1
                      </kbd>
                    </TabsTrigger>

                    <TabsTrigger value="assignment" className="text-xs font-semibold flex items-center justify-between gap-1">
                      <span>2. Driver & Vehicle</span>
                      <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded border border-slate-200 dark:border-slate-700 shadow-2xs">
                        Alt+2
                      </kbd>
                    </TabsTrigger>

                    <TabsTrigger value="route" className="text-xs font-semibold flex items-center justify-between gap-1">
                      <span>3. Route Stops</span>
                      <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded border border-slate-200 dark:border-slate-700 shadow-2xs">
                        Alt+3
                      </kbd>
                    </TabsTrigger>

                  </TabsList>

                  {/* TAB 1: Customer Info */}
                  <TabsContent value="customer" className="space-y-4 m-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label htmlFor="customer_id" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Select Customer <span className="text-rose-500">*</span>
                        </Label>
                        <Select 
                          value={customerId} 
                          onValueChange={(val) => setCustomerId(val)}
                        >
                          <SelectTrigger id="customer_id" className="h-9 text-xs border-slate-200 bg-white">
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
                        <Label htmlFor="planned_start" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" /> Planned Start Time
                        </Label>
                        <Input
                          id="planned_start"
                          type="datetime-local"
                          value={plannedStart}
                          onChange={(e) => setPlannedStart(e.target.value)}
                          className="h-9 text-xs font-mono border-slate-200"
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <Button 
                        type="button" 
                        size="sm"
                        onClick={goToNextTab}
                        className="h-9 text-xs gap-1.5 bg-[#E8450F] hover:bg-[#d03d0c] text-white font-bold rounded-md px-4 shadow-xs"
                      >
                        Next: Assignments <ChevronRight className="w-3.5 h-3.5" />
                        <kbd className="ml-1 px-1.5 py-0.5 text-[10px] font-mono font-bold bg-white/20 text-white rounded border border-white/30">
                          Alt + →
                        </kbd>
                      </Button>
                    </div>
                  </TabsContent>

                  {/* TAB 2: Driver & Vehicle Assignment */}
                  <TabsContent value="assignment" className="space-y-4 m-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="driver_id" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Assigned Driver <span className="text-rose-500">*</span>
                          </Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsAddDriverOpen(true)}
                            className="h-6 px-2 text-[11px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 font-medium gap-1"
                          >
                            <Plus className="w-3 h-3" /> Add New Driver
                          </Button>
                        </div>
                        <Combobox
                          id="driver_id"
                          value={driverId}
                          onChange={setDriverId}
                          options={driverOptions}
                          placeholder="Choose available driver..."
                          searchPlaceholder="Search drivers..."
                          emptyText="No available drivers found."
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="vehicle_id" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Assigned Vehicle <span className="text-rose-500">*</span>
                          </Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsAddVehicleOpen(true)}
                            className="h-6 px-2 text-[11px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 font-medium gap-1"
                          >
                            <Plus className="w-3 h-3" /> Add New Vehicle
                          </Button>
                        </div>
                        <Combobox
                          id="vehicle_id"
                          value={vehicleId}
                          onChange={setVehicleId}
                          options={vehicleOptions}
                          placeholder="Choose available vehicle..."
                          searchPlaceholder="Search vehicles..."
                          emptyText="No available vehicles found."
                        />
                      </div>

                    </div>

                    {selectedDriver && selectedVehicle && (
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <div>
                            <span className="font-bold text-slate-900 dark:text-slate-100">{selectedDriver.first_name} {selectedDriver.last_name}</span> paired with <span className="font-bold text-slate-900 dark:text-slate-100">{selectedVehicle.plate_number}</span>
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px] font-bold">
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
                        className="h-9 text-xs gap-1 border-slate-200 bg-white"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" /> Back
                        <kbd className="ml-1 px-1.5 py-0.5 text-[10px] font-mono font-bold bg-slate-100 text-slate-700 rounded border border-slate-200">
                          Alt + ←
                        </kbd>
                      </Button>

                      <Button 
                        type="button" 
                        size="sm"
                        onClick={goToNextTab}
                        className="h-9 text-xs gap-1.5 bg-[#E8450F] hover:bg-[#d03d0c] text-white font-bold rounded-md px-4 shadow-xs"
                      >
                        Next: Route Stops <ChevronRight className="w-3.5 h-3.5" />
                        <kbd className="ml-1 px-1.5 py-0.5 text-[10px] font-mono font-bold bg-white/20 text-white rounded border border-white/30">
                          Alt + →
                        </kbd>
                      </Button>
                    </div>
                  </TabsContent>

                  {/* TAB 3: Route Stops & Geofencing */}
                  <TabsContent value="route" className="space-y-4 m-0">
                    
                    {/* Pickup Stop */}
                    <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Pickup Stop (Sequence 1)
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
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
                        <Label htmlFor="pickup_time" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Planned Pickup Arrival Time
                        </Label>
                        <Input
                          id="pickup_time"
                          type="datetime-local"
                          value={pickupTime}
                          onChange={(e) => setPickupTime(e.target.value)}
                          className="h-9 text-xs font-mono border-slate-200"
                        />
                      </div>
                    </div>

                    {/* Dropoff Stop */}
                    <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Dropoff Stop (Sequence 2)
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
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
                        <Label htmlFor="dropoff_time" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Planned Dropoff Arrival Time
                        </Label>
                        <Input
                          id="dropoff_time"
                          type="datetime-local"
                          value={dropoffTime}
                          onChange={(e) => setDropoffTime(e.target.value)}
                          className="h-9 text-xs font-mono border-slate-200"
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex justify-between">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={goToPrevTab}
                        className="h-9 text-xs gap-1 border-slate-200 bg-white"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" /> Back
                        <kbd className="ml-1 px-1.5 py-0.5 text-[10px] font-mono font-bold bg-slate-100 text-slate-700 rounded border border-slate-200">
                          Alt + ←
                        </kbd>
                      </Button>

                      <Button 
                        type="button" 
                        size="sm"
                        onClick={() => handleSubmit()}
                        disabled={createMutation.isPending || !isFormValid}
                        className="h-9 text-xs bg-[#E8450F] hover:bg-[#d03d0c] text-white font-bold gap-1.5 shadow-xs rounded-md px-4"
                      >
                        <Plus className="w-3.5 h-3.5" /> Dispatch Trip
                        <kbd className="ml-1.5 px-1.5 py-0.5 text-[10px] font-mono font-bold bg-white/20 text-white rounded border border-white/30">
                          Ctrl + ↵
                        </kbd>
                      </Button>
                    </div>

                  </TabsContent>

                </Tabs>
              </CardContent>
            </Card>

            {error && (
              <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-xs font-semibold border border-rose-200 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
                {error}
              </div>
            )}
          </div>

          {/* Right Column: Live Interactive Trip Manifest Card (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="border border-slate-200 dark:border-slate-800 shadow-2xs rounded-xl overflow-hidden sticky top-4 bg-white dark:bg-slate-900">
              <CardHeader className="pb-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="bg-white text-[10px] uppercase font-bold tracking-wider text-slate-700 border-slate-200">
                    Live Trip Manifest
                  </Badge>
                  <span className="text-[10px] text-slate-400 font-mono">DISPATCH-{Date.now().toString().slice(-4)}</span>
                </div>
                <CardTitle className="text-base font-extrabold text-slate-900 dark:text-slate-100 mt-2">
                  {selectedCustomer ? selectedCustomer.name : 'Select Customer Organization'}
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Real-time visualization of dispatch payload, route, and assignments.
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-4 space-y-4">
                
                {/* Visual Route Path Banner */}
                <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl p-3 space-y-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Route Visual Connector
                  </div>
                  
                  <div className="flex items-center justify-between gap-2 text-xs font-mono">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                      <span className="font-bold text-slate-900 dark:text-slate-100 truncate max-w-[90px]">
                        {pickupLat ? `Lat ${pickupLat.toFixed(2)}` : 'Origin'}
                      </span>
                    </div>

                    <div className="flex-1 flex items-center justify-center text-slate-400">
                      <span className="border-t border-dashed border-slate-300 dark:border-slate-700 w-full" />
                      <ArrowRight className="w-4 h-4 mx-1 shrink-0 text-[#E8450F]" />
                      <span className="border-t border-dashed border-slate-300 dark:border-slate-700 w-full" />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 dark:text-slate-100 truncate max-w-[90px]">
                        {dropoffLat ? `Lat ${dropoffLat.toFixed(2)}` : 'Destination'}
                      </span>
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                    </div>
                  </div>
                </div>



                {/* Driver & Vehicle Pairing Spec */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-500 block">Assigned Driver</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100 mt-0.5 block truncate">
                      {selectedDriver ? `${selectedDriver.first_name} ${selectedDriver.last_name}` : 'Unassigned'}
                    </span>
                    {selectedDriver && (
                      <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-semibold block mt-0.5">
                        Risk Score: {selectedDriver.ai_risk_score ?? 'Low'}
                      </span>
                    )}
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-500 block">Assigned Vehicle</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100 mt-0.5 block font-mono">
                      {selectedVehicle ? selectedVehicle.plate_number : 'Unassigned'}
                    </span>
                    {selectedVehicle && (
                      <span className="text-[9px] text-slate-500 block mt-0.5">
                        {selectedVehicle.asset_type} ({selectedVehicle.capacity_kg.toLocaleString()} kg)
                      </span>
                    )}
                  </div>
                </div>

                {/* Dispatch Readiness Checklist */}
                <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Dispatch Validation</span>
                  
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                        {customerId ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <Circle className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
                        Customer Selected
                      </span>
                      <span className="font-semibold text-[11px] truncate max-w-[120px]">{selectedCustomer ? selectedCustomer.name : 'Missing'}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                        {driverId ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <Circle className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
                        Driver Assigned
                      </span>
                      <span className="font-semibold text-[11px] truncate max-w-[120px]">{selectedDriver ? selectedDriver.first_name : 'Missing'}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                        {vehicleId ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <Circle className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
                        Vehicle Assigned
                      </span>
                      <span className="font-semibold font-mono text-[11px]">{selectedVehicle ? selectedVehicle.plate_number : 'Missing'}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                        {!missingLocation ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <Circle className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
                        Pickup & Dropoff Geofences
                      </span>
                      <span className="font-semibold text-[11px]">{!missingLocation ? 'Ready' : 'Pending'}</span>
                    </div>
                  </div>
                </div>

              </CardContent>

              <CardFooter className="bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 p-3 flex justify-between items-center">
                <div className="text-[11px] text-slate-500">
                  Status: <span className="font-bold text-indigo-600 dark:text-indigo-400">Ready to Dispatch</span>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleSubmit()}
                  disabled={createMutation.isPending || !isFormValid}
                  className="h-9 text-xs bg-[#E8450F] hover:bg-[#d03d0c] text-white font-bold px-4 gap-1.5 shadow-xs rounded-md"
                >
                  {createMutation.isPending ? 'Dispatching...' : 'Dispatch Trip'}
                  <kbd className="ml-1.5 px-1.5 py-0.5 text-[10px] font-mono font-bold bg-white/20 text-white rounded border border-white/30">
                    Ctrl + ↵
                  </kbd>
                </Button>
              </CardFooter>
            </Card>
          </div>

        </div>

      </div>

        <CreateDriverModal 
          isOpen={isAddDriverOpen} 
          onClose={() => setIsAddDriverOpen(false)} 
          onCreated={(newDriver) => setDriverId(newDriver.id)} 
        />
        <CreateVehicleModal 
          isOpen={isAddVehicleOpen} 
          onClose={() => setIsAddVehicleOpen(false)} 
          onCreated={(newVehicle) => setVehicleId(newVehicle.id)} 
        />
      </DashboardLayout>
    );
  }
