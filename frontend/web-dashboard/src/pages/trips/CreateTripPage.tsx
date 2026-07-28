import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, MapPin } from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import FormSection from '@/components/ui/FormSection';
import FormInput from '@/components/ui/FormInput';
import Btn from '@/components/ui/Btn';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { tripService, CreateTripPayload } from '@/services/tripService';
import { customerService } from '@/services/customerService';
import { driverService } from '@/services/driverService';
import { vehicleService } from '@/services/vehicleService';
import LocationPickerMap from '@/components/trips/LocationPickerMap';

export default function CreateTripPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cargoType, setCargoType] = useState('General Goods');
  const [hazmat, setHazmat] = useState(false);
  const [plannedStart, setPlannedStart] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [vehicleId, setVehicleId] = useState('');

  // Stops
  const [pickupLat, setPickupLat] = useState<number | null>(null);
  const [pickupLng, setPickupLng] = useState<number | null>(null);
  const [pickupTime, setPickupTime] = useState('');

  const [dropoffLat, setDropoffLat] = useState<number | null>(null);
  const [dropoffLng, setDropoffLng] = useState<number | null>(null);
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

  // Create Trip Mutation
  const createMutation = useMutation({
    mutationFn: (payload: CreateTripPayload) => tripService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      navigate('/trips');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !cargoType || !driverId || !vehicleId) return;
    if (pickupLat == null || pickupLng == null || dropoffLat == null || dropoffLng == null) return;

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
  };

  const missingLocation = pickupLat == null || pickupLng == null || dropoffLat == null || dropoffLng == null;

  return (
    <DashboardLayout 
      active="Trips" 
      title="Create Trip" 
      breadcrumb="Trips" 
      pageTitle="Create New Trip"
      actions={
        <Btn 
          label="Back" 
          variant="secondary" 
          size="sm" 
          icon={<ArrowLeft size={13} />} 
          onClick={() => navigate('/trips')} 
        />
      }
    >
      <form onSubmit={handleSubmit} className="mx-auto w-full max-w-4xl px-6 pb-6 animate-fade-in">
        
        {/* Customer & Route Details */}
        <FormSection title="Customer & Route Information">
          <FormInput
            label="Customer"
            type="select"
            required
            placeholder="Select Customer"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            options={customers.map(c => ({ value: c.id, label: c.name }))}
          />
          <FormInput
            label="Cargo Type"
            type="text"
            required
            value={cargoType}
            onChange={(e) => setCargoType(e.target.value)}
          />
          <FormInput
            label="Planned Start Time"
            type="datetime-local"
            value={plannedStart}
            onChange={(e) => setPlannedStart(e.target.value)}
          />
          <div className="flex items-center gap-2 pt-5">
            <Checkbox
              id="hazmat"
              checked={hazmat}
              onCheckedChange={(checked) => setHazmat(checked === true)}
            />
            <Label htmlFor="hazmat" className="text-xs font-bold text-foreground cursor-pointer">
              Contains HAZMAT (Hazardous Materials)
            </Label>
          </div>
        </FormSection>

        {/* Assignment details */}
        <FormSection title="Assignments">
          <FormInput
            label="Assigned Driver"
            type="select"
            required
            placeholder="Select Driver"
            value={driverId}
            onChange={(e) => setDriverId(e.target.value)}
            options={drivers.map(d => ({ value: d.id, label: `${d.first_name} ${d.last_name} (Risk: ${d.ai_risk_score})` }))}
          />
          <FormInput
            label="Assigned Vehicle"
            type="select"
            required
            placeholder="Select Vehicle"
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
            options={vehicles.map(v => ({ value: v.id, label: `${v.plate_number} (${v.asset_type})` }))}
          />
        </FormSection>

        {/* Stop details */}
        <FormSection title="Pickup Stop (Sequence 1)">
          <LocationPickerMap
            label="Pickup Location"
            lat={pickupLat}
            lng={pickupLng}
            onChange={(lat, lng) => { setPickupLat(lat); setPickupLng(lng); }}
          />
          <FormInput
            label="Planned Pickup Arrival Time"
            type="datetime-local"
            value={pickupTime}
            onChange={(e) => setPickupTime(e.target.value)}
          />
        </FormSection>

        <FormSection title="Dropoff Stop (Sequence 2)">
          <LocationPickerMap
            label="Dropoff Location"
            lat={dropoffLat}
            lng={dropoffLng}
            onChange={(lat, lng) => { setDropoffLat(lat); setDropoffLng(lng); }}
          />
          <FormInput
            label="Planned Dropoff Arrival Time"
            type="datetime-local"
            value={dropoffTime}
            onChange={(e) => setDropoffTime(e.target.value)}
          />
        </FormSection>

        {/* Error feedback */}
        {createMutation.isError && (
          <div className="mt-4 rounded-lg border border-destructive/20 bg-destructive/10 px-3.5 py-2.5 text-sm font-medium text-destructive">
            {(createMutation.error as any)?.response?.data?.error?.message
              || 'Could not create the trip. Please check the fields and try again.'}
          </div>
        )}

        {/* Form Action Controls */}
        <div className="flex gap-3 mt-4">
          <Btn 
            label="Cancel" 
            variant="secondary" 
            type="button" 
            onClick={() => navigate('/trips')} 
          />
          <Btn
            label="Save Trip"
            type="submit"
            icon={<Save size={14} />}
            disabled={createMutation.isPending || missingLocation}
          />
        </div>

      </form>
    </DashboardLayout>
  );
}
