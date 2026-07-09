import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import FormSection from '@/components/ui/FormSection';
import FormInput from '@/components/ui/FormInput';
import Btn from '@/components/ui/Btn';
import { tripService, TripStatus } from '@/services/tripService';

export default function EditTripPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<TripStatus>('Draft');

  const { data: trip, isLoading } = useQuery({
    queryKey: ['trip', id],
    queryFn: () => tripService.getById(id!),
    enabled: !!id,
  });

  useEffect(() => {
    if (trip) {
      setStatus(trip.status);
    }
  }, [trip]);

  const updateMutation = useMutation({
    mutationFn: (newStatus: TripStatus) => tripService.updateStatus(id!, newStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', id] });
      navigate(`/trips/${id}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(status);
  };

  if (isLoading || !trip) {
    return (
      <DashboardLayout active="Trips" title="Edit Trip">
        <div className="p-8 flex items-center justify-center">
          <div className="h-8 w-8 border-2 border-[#E8450F] border-t-transparent rounded-full animate-spin"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      active="Trips" 
      title="Edit Trip" 
      breadcrumb={`Trips / ${trip.ref_id || 'Edit'}`} 
      pageTitle="Edit Trip Status"
      actions={
        <Btn 
          label="Back" 
          variant="secondary" 
          size="sm" 
          icon={<ArrowLeft size={13} />} 
          onClick={() => navigate(`/trips/${id}`)} 
        />
      }
    >
      <form onSubmit={handleSubmit} className="px-6 pb-6 max-w-xl animate-fade-in">
        <FormSection title="Modify Status Machine State" description="Advance or revert this shipment's state.">
          <FormInput
            label="Current Status"
            type="select"
            value={status}
            onChange={(e) => setStatus(e.target.value as TripStatus)}
            options={[
              { value: 'Draft', label: 'Draft' },
              { value: 'Dispatched', label: 'Dispatched' },
              { value: 'AtPickup', label: 'At Pickup' },
              { value: 'InTransit', label: 'In Transit' },
              { value: 'AtDelivery', label: 'At Delivery' },
              { value: 'Completed', label: 'Completed' },
              { value: 'Invoiced', label: 'Invoiced' },
              { value: 'Cancelled', label: 'Cancelled' },
            ]}
          />
        </FormSection>

        <div className="flex gap-3">
          <Btn 
            label="Cancel" 
            variant="secondary" 
            type="button" 
            onClick={() => navigate(`/trips/${id}`)} 
          />
          <Btn 
            label="Update Status" 
            type="submit" 
            icon={<Save size={14} />}
            disabled={updateMutation.isPending}
          />
        </div>
      </form>
    </DashboardLayout>
  );
}
