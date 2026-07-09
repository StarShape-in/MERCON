import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, MapPin } from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import FormSection from '@/components/ui/FormSection';
import FormInput from '@/components/ui/FormInput';
import Btn from '@/components/ui/Btn';
import { tripService, CreateTripPayload } from '@/services/tripService';
import { customerService } from '@/services/customerService';
import { driverService } from '@/services/driverService';
import { vehicleService } from '@/services/vehicleService';

export default function CreateTripPage() {
  const navigate = useNavigate();
  const [cargoType, setCargoType] = useState('General Goods');
  const [hazmat, setHazmat] = useState(false);
  const [plannedStart, setPlannedStart] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [vehicleId, setVehicleId] = useState('');

  // Stops
  const [pickupLat, setPickupLat] = useState('24.7136');
  const [pickupLng, setPickupLng] = useState('46.6753');
  const [pickupTime, setPickupTime] = useState('');

  const [dropoffLat, setDropoffLat] = useState('26.3927');
  const [dropoffLng, setDropoffLng] = useState('49.9777');
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
      navigate('/trips');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !cargoType) return;

    const payload: CreateTripPayload = {
      customer_id: customerId,
      driver_id: driverId || undefined,
      vehicle_id: vehicleId || undefined,
      cargo_type: cargoType,
      hazmat_flag: hazmat,
      planned_start: plannedStart || undefined,
      stops: [
        {
          stop_type: 'Pickup',
          lat: parseFloat(pickupLat),
          lng: parseFloat(pickupLng),
          planned_arrival: pickupTime || undefined,
        },
        {
          stop_type: 'Dropoff',
          lat: parseFloat(dropoffLat),
          lng: parseFloat(dropoffLng),
          planned_arrival: dropoffTime || undefined,
        },
      ],
    };

    createMutation.mutate(payload);
  };

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
      <form onSubmit={handleSubmit} className="px-6 pb-6 max-w-4xl animate-fade-in">
        
        {/* Customer & Route Details */}
        <FormSection title="Customer & Route Information">
          <FormInput
            label="Customer"
            type="select"
            required
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            options={[
              { value: '', label: 'Select Customer' },
              ...customers.map(c => ({ value: c.id, label: c.name }))
            ]}
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
            <input 
              type="checkbox" 
              id="hazmat"
              checked={hazmat}
              onChange={(e) => setHazmat(e.target.checked)}
              className="w-4 h-4 accent-[#E8450F] rounded"
            />
            <label htmlFor="hazmat" className="text-xs font-bold text-[#111] cursor-pointer">
              Contains HAZMAT (Hazardous Materials)
            </label>
          </div>
        </FormSection>

        {/* Assignment details */}
        <FormSection title="Assignments">
          <FormInput
            label="Assigned Driver (Optional)"
            type="select"
            value={driverId}
            onChange={(e) => setDriverId(e.target.value)}
            options={[
              { value: '', label: 'Leave Unassigned' },
              ...drivers.map(d => ({ value: d.id, label: `${d.first_name} ${d.last_name} (Risk: ${d.ai_risk_score})` }))
            ]}
          />
          <FormInput
            label="Assigned Vehicle (Optional)"
            type="select"
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
            options={[
              { value: '', label: 'Leave Unassigned' },
              ...vehicles.map(v => ({ value: v.id, label: `${v.plate_number} (${v.asset_type})` }))
            ]}
          />
        </FormSection>

        {/* Stop details */}
        <FormSection title="Pickup Stop (Sequence 1)">
          <FormInput
            label="Pickup Latitude"
            type="number"
            step="0.000001"
            required
            value={pickupLat}
            onChange={(e) => setPickupLat(e.target.value)}
          />
          <FormInput
            label="Pickup Longitude"
            type="number"
            step="0.000001"
            required
            value={pickupLng}
            onChange={(e) => setPickupLng(e.target.value)}
          />
          <FormInput
            label="Planned Pickup Arrival Time"
            type="datetime-local"
            value={pickupTime}
            onChange={(e) => setPickupTime(e.target.value)}
          />
        </FormSection>

        <FormSection title="Dropoff Stop (Sequence 2)">
          <FormInput
            label="Dropoff Latitude"
            type="number"
            step="0.000001"
            required
            value={dropoffLat}
            onChange={(e) => setDropoffLat(e.target.value)}
          />
          <FormInput
            label="Dropoff Longitude"
            type="number"
            step="0.000001"
            required
            value={dropoffLng}
            onChange={(e) => setDropoffLng(e.target.value)}
          />
          <FormInput
            label="Planned Dropoff Arrival Time"
            type="datetime-local"
            value={dropoffTime}
            onChange={(e) => setDropoffTime(e.target.value)}
          />
        </FormSection>

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
            disabled={createMutation.isPending}
          />
        </div>

      </form>
    </DashboardLayout>
  );
}
