import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  RotateCcw, 
  Plus, 
  CheckCircle2, 
  Navigation, 
  Clock,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  User,
  Truck,
  MapPin,
  Building2
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
import Btn from '@/components/ui/Btn';

export default function CreateTripPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<1 | 2 | 3>(1);

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
    label: `${d.first_name} ${d.last_name}`,
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

  // Auto-populate locations when customer changes
  useEffect(() => {
    if (selectedCustomer) {
      if (selectedCustomer.default_pickup_lat && selectedCustomer.default_pickup_lng) {
        setPickupLat(selectedCustomer.default_pickup_lat);
        setPickupLng(selectedCustomer.default_pickup_lng);
      }
      if (selectedCustomer.default_dropoff_lat && selectedCustomer.default_dropoff_lng) {
        setDropoffLat(selectedCustomer.default_dropoff_lat);
        setDropoffLng(selectedCustomer.default_dropoff_lng);
      }
    }
  }, [selectedCustomer]);

  // Create Trip Mutation
  const createMutation = useMutation({
    mutationFn: (payload: CreateTripPayload) => tripService.create(payload),
    onSuccess: async () => {
      // Auto-save locations to customer
      if (customerId && pickupLat && pickupLng && dropoffLat && dropoffLng) {
        try {
          await customerService.update(customerId, {
            default_pickup_lat: pickupLat,
            default_pickup_lng: pickupLng,
            default_dropoff_lat: dropoffLat,
            default_dropoff_lng: dropoffLng
          });
        } catch (e) {
          console.error("Failed to auto-save locations", e);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-performance'] });
      queryClient.invalidateQueries({ queryKey: ['customers-select'] });
      navigate('/trips');
    },
    onError: (err: any) => {
      setError(err.response?.data?.error?.message || err.message || 'Could not create the trip.');
    }
  });

  const handleReset = () => {
    setStep(1);
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

  const nextStep = () => {
    setError(null);
    if (step === 1 && !customerId) {
      setError('Please select a customer before proceeding.');
      return;
    }
    if (step === 2 && (!driverId || !vehicleId)) {
      setError('Please assign a driver and a vehicle before proceeding.');
      return;
    }
    setStep((s) => (s < 3 ? (s + 1) as 1 | 2 | 3 : 3));
  };

  const prevStep = () => {
    setError(null);
    setStep((s) => (s > 1 ? (s - 1) as 1 | 2 | 3 : 1));
  };

  const missingLocation = pickupLat == null || pickupLng == null || dropoffLat == null || dropoffLng == null;
  const isFormValid = customerId !== '' && driverId !== '' && vehicleId !== '' && !missingLocation;

  const handleSubmit = useCallback(() => {
    setError(null);

    if (pickupLat == null || pickupLng == null) {
      setError('Please select a pickup location on the map.');
      return;
    }
    if (dropoffLat == null || dropoffLng == null) {
      setError('Please select a dropoff location on the map.');
      return;
    }

    if (pickupTime && dropoffTime && dropoffTime <= pickupTime) {
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

  return (
    <DashboardLayout active="Trips" title="Create New Trip">
      <div className="px-4 sm:px-6 pb-6 space-y-5 animate-fade-in max-w-[1000px] mx-auto">
        
        {/* Top Scope & Action Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
              <Building2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>MERCON Fleet</span>
              <span>•</span>
              <span className="text-slate-900 dark:text-slate-100 font-bold">Dispatch & Operations</span>
            </div>
            <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-200 font-bold dark:bg-indigo-950/40 dark:text-indigo-300">
              Trip Dispatch Wizard
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Btn 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/trips')}
              className="h-9 gap-1.5 text-xs font-semibold border-slate-200 bg-white hover:bg-slate-50 shadow-2xs"
              label="Back to Trips"
              icon={<ArrowLeft className="w-3.5 h-3.5" />}
              shortcut={{ key: 'b', alt: true }}
            />
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleReset}
              className="h-9 gap-1.5 text-xs text-slate-500 hover:text-slate-900"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </Button>
          </div>
        </div>

        {/* Top Horizontal Live Manifest */}
        <Card className="border border-slate-200 dark:border-slate-800 shadow-2xs rounded-xl overflow-hidden bg-white dark:bg-slate-900">
          <div className="flex flex-col md:flex-row items-center divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-800">
            
            {/* Customer Box */}
            <div className={`flex-1 p-4 flex items-center gap-3 w-full ${step === 1 ? 'bg-slate-50 dark:bg-slate-800/40' : ''}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${selectedCustomer ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
                <User className="w-4.5 h-4.5" />
              </div>
              <div className="flex-1">
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">1. Customer</span>
                <p className={`text-sm font-bold truncate mt-0.5 ${selectedCustomer ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400'}`}>
                  {selectedCustomer ? selectedCustomer.name : 'Pending...'}
                </p>
              </div>
              {selectedCustomer && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
            </div>

            {/* Assignments Box */}
            <div className={`flex-1 p-4 flex items-center gap-3 w-full ${step === 2 ? 'bg-slate-50 dark:bg-slate-800/40' : ''}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${(selectedDriver && selectedVehicle) ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
                <Truck className="w-4.5 h-4.5" />
              </div>
              <div className="flex-1">
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">2. Assignments</span>
                <p className={`text-sm font-bold truncate mt-0.5 ${(selectedDriver && selectedVehicle) ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400'}`}>
                  {(selectedDriver && selectedVehicle) ? `${selectedDriver.first_name} • ${selectedVehicle.plate_number}` : 'Pending...'}
                </p>
              </div>
              {(selectedDriver && selectedVehicle) && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
            </div>

            {/* Route Box */}
            <div className={`flex-1 p-4 flex items-center gap-3 w-full ${step === 3 ? 'bg-slate-50 dark:bg-slate-800/40' : ''}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${!missingLocation ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
                <Navigation className="w-4.5 h-4.5" />
              </div>
              <div className="flex-1">
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">3. Route</span>
                <p className={`text-sm font-bold truncate mt-0.5 ${!missingLocation ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400'}`}>
                  {!missingLocation ? 'Geofences Set' : 'Pending...'}
                </p>
              </div>
              {!missingLocation && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
            </div>

          </div>
        </Card>

        {/* Wizard Error Banner */}
        {error && (
          <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-xs font-semibold border border-rose-200 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
            {error}
          </div>
        )}

        {/* Wizard Form Area */}
        <div className="mt-4">
          
          {/* STEP 1: Customer */}
          {step === 1 && (
            <Card className="border border-slate-200 dark:border-slate-800 shadow-2xs rounded-xl bg-white dark:bg-slate-900 animate-in fade-in slide-in-from-bottom-2">
              <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                <CardTitle className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                  Step 1: Customer Information
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Select the customer organization and specify the planned start time.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="customer_id" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Select Customer <span className="text-rose-500">*</span>
                  </Label>
                  <Select 
                    value={customerId} 
                    onValueChange={(val) => {
                      setCustomerId(val);
                      setError(null);
                    }}
                  >
                    <SelectTrigger id="customer_id" className="h-10 text-sm border-slate-200 bg-white">
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
                
                <div className="space-y-2 pt-2">
                  <Label htmlFor="planned_start" className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-slate-400" /> Planned Start Time
                  </Label>
                  <Input
                    id="planned_start"
                    type="datetime-local"
                    value={plannedStart}
                    onChange={(e) => setPlannedStart(e.target.value)}
                    className="h-10 text-sm font-mono border-slate-200 max-w-sm"
                  />
                </div>
              </CardContent>
              <CardFooter className="border-t border-slate-100 dark:border-slate-800 p-4 flex justify-end bg-slate-50 dark:bg-slate-900/50">
                <Btn 
                  label="Next Step"
                  icon={<ChevronRight className="w-4 h-4" />}
                  onClick={nextStep}
                  className="h-10 bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 px-6"
                  shortcut={{ key: 'Enter', metaOrControl: true }}
                />
              </CardFooter>
            </Card>
          )}

          {/* STEP 2: Assignments */}
          {step === 2 && (
            <Card className="border border-slate-200 dark:border-slate-800 shadow-2xs rounded-xl bg-white dark:bg-slate-900 animate-in fade-in slide-in-from-bottom-2">
              <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                <CardTitle className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                  Step 2: Driver & Vehicle Assignment
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Pair an available driver with a vehicle for this trip.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="driver_id" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Assigned Driver <span className="text-rose-500">*</span>
                      </Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsAddDriverOpen(true)}
                        className="h-6 px-2 text-[11px] text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 font-medium gap-1"
                      >
                        <Plus className="w-3 h-3" /> Add Driver
                      </Button>
                    </div>
                    <Combobox
                      id="driver_id"
                      value={driverId}
                      onChange={(val) => {
                        setDriverId(val);
                        setError(null);
                      }}
                      options={driverOptions}
                      placeholder="Choose available driver..."
                      searchPlaceholder="Search drivers..."
                      emptyText="No available drivers found."
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="vehicle_id" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Assigned Vehicle <span className="text-rose-500">*</span>
                      </Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsAddVehicleOpen(true)}
                        className="h-6 px-2 text-[11px] text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 font-medium gap-1"
                      >
                        <Plus className="w-3 h-3" /> Add Vehicle
                      </Button>
                    </div>
                    <Combobox
                      id="vehicle_id"
                      value={vehicleId}
                      onChange={(val) => {
                        setVehicleId(val);
                        setError(null);
                      }}
                      options={vehicleOptions}
                      placeholder="Choose available vehicle..."
                      searchPlaceholder="Search vehicles..."
                      emptyText="No available vehicles found."
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t border-slate-100 dark:border-slate-800 p-4 flex justify-between bg-slate-50 dark:bg-slate-900/50">
                <Btn 
                  variant="outline" 
                  onClick={prevStep} 
                  className="h-10 gap-1.5 px-6"
                  label="Back"
                  icon={<ChevronLeft className="w-4 h-4" />}
                  shortcut={{ key: 'Escape' }}
                />
                <Btn 
                  onClick={nextStep} 
                  className="h-10 bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 px-6"
                  label="Next Step"
                  icon={<ChevronRight className="w-4 h-4" />}
                  shortcut={{ key: 'Enter', metaOrControl: true }}
                />
              </CardFooter>
            </Card>
          )}

          {/* STEP 3: Route */}
          {step === 3 && (
            <Card className="border border-slate-200 dark:border-slate-800 shadow-2xs rounded-xl bg-white dark:bg-slate-900 animate-in fade-in slide-in-from-bottom-2">
              <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                <CardTitle className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                  Step 3: Route Stops & Geofencing
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Pinpoint the exact pickup and dropoff locations. Locations are auto-saved per customer.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                
                {/* Pickup Stop */}
                <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Pickup Stop (Sequence 1)
                    </span>
                    <span className="text-xs font-mono text-slate-500">
                      {pickupLat && pickupLng ? `${pickupLat.toFixed(4)}, ${pickupLng.toFixed(4)}` : 'Not Set'}
                    </span>
                  </div>

                  <LocationPickerMap
                    label="Pickup Location (Click map to pin)"
                    lat={pickupLat}
                    lng={pickupLng}
                    onChange={(lat: number, lng: number) => { setPickupLat(lat); setPickupLng(lng); setError(null); }}
                  />

                  <div className="space-y-1.5 pt-2">
                    <Label htmlFor="pickup_time" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Planned Pickup Arrival Time (Optional)
                    </Label>
                    <Input
                      id="pickup_time"
                      type="datetime-local"
                      value={pickupTime}
                      onChange={(e) => setPickupTime(e.target.value)}
                      className="h-9 text-xs font-mono border-slate-200 max-w-sm"
                    />
                  </div>
                </div>

                {/* Dropoff Stop */}
                <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Dropoff Stop (Sequence 2)
                    </span>
                    <span className="text-xs font-mono text-slate-500">
                      {dropoffLat && dropoffLng ? `${dropoffLat.toFixed(4)}, ${dropoffLng.toFixed(4)}` : 'Not Set'}
                    </span>
                  </div>

                  <LocationPickerMap
                    label="Dropoff Location (Click map to pin)"
                    lat={dropoffLat}
                    lng={dropoffLng}
                    onChange={(lat: number, lng: number) => { setDropoffLat(lat); setDropoffLng(lng); setError(null); }}
                  />

                  <div className="space-y-1.5 pt-2">
                    <Label htmlFor="dropoff_time" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Planned Dropoff Arrival Time (Optional)
                    </Label>
                    <Input
                      id="dropoff_time"
                      type="datetime-local"
                      value={dropoffTime}
                      onChange={(e) => setDropoffTime(e.target.value)}
                      className="h-9 text-xs font-mono border-slate-200 max-w-sm"
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t border-slate-100 dark:border-slate-800 p-4 flex justify-between bg-slate-50 dark:bg-slate-900/50">
                <Btn 
                  variant="outline" 
                  onClick={prevStep} 
                  className="h-10 gap-1.5 px-6"
                  label="Back"
                  icon={<ChevronLeft className="w-4 h-4" />}
                  shortcut={{ key: 'Escape' }}
                />
                <Btn 
                  onClick={handleSubmit} 
                  disabled={createMutation.isPending || !isFormValid}
                  className="h-10 bg-[#E8450F] hover:bg-[#d03d0c] text-white font-bold gap-1.5 px-8 shadow-xs"
                  label={createMutation.isPending ? 'Dispatching...' : 'Dispatch Trip'}
                  shortcut={{ key: 'Enter', metaOrControl: true }}
                />
              </CardFooter>
            </Card>
          )}

        </div>
      </div>

      <CreateDriverModal 
        isOpen={isAddDriverOpen} 
        onClose={() => setIsAddDriverOpen(false)} 
        onCreated={(newDriver) => { setDriverId(newDriver.id); setError(null); }} 
      />
      <CreateVehicleModal 
        isOpen={isAddVehicleOpen} 
        onClose={() => setIsAddVehicleOpen(false)} 
        onCreated={(newVehicle) => { setVehicleId(newVehicle.id); setError(null); }} 
      />
    </DashboardLayout>
  );
}
