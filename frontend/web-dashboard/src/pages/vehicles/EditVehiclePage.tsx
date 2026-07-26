import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Truck, Navigation, Activity, ArrowLeft } from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import FormSection from '@/components/ui/FormSection';
import FormInput from '@/components/ui/FormInput';
import Btn from '@/components/ui/Btn';
import { vehicleService, AssetType, AssetStatus } from '@/services/vehicleService';

export default function EditVehiclePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: vehicle, isLoading } = useQuery({
    queryKey: ['vehicle', id],
    queryFn: () => vehicleService.getById(id!),
    enabled: !!id,
  });

  const [formData, setFormData] = useState({
    plate_number: '',
    asset_type: 'Flatbed' as AssetType,
    capacity_kg: '',
    trailer_number: '',
    trailer_type: 'Flatbed' as AssetType,
    trailer_capacity_kg: '',
    gps_device_id: '',
    icces_device_id: '',
    status: 'Available' as AssetStatus,
  });

  useEffect(() => {
    if (vehicle) {
      setFormData({
        plate_number: vehicle.plate_number,
        asset_type: vehicle.asset_type,
        capacity_kg: vehicle.capacity_kg.toString(),
        trailer_number: vehicle.trailer_number || '',
        trailer_type: vehicle.trailer_type || 'Flatbed',
        trailer_capacity_kg: vehicle.trailer_capacity_kg?.toString() || '',
        gps_device_id: vehicle.gps_device_id || '',
        icces_device_id: vehicle.icces_device_id || '',
        status: vehicle.status,
      });
    }
  }, [vehicle]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (!id) throw new Error('Vehicle ID missing');
      
      const payload: any = {
        plate_number: formData.plate_number,
        asset_type: formData.asset_type,
        capacity_kg: Number(formData.capacity_kg),
        status: formData.status,
        gps_device_id: formData.gps_device_id || null,
        icces_device_id: formData.icces_device_id || null,
        trailer_number: formData.trailer_number || null,
        trailer_type: formData.trailer_number ? formData.trailer_type : null,
        trailer_capacity_kg: formData.trailer_capacity_kg ? Number(formData.trailer_capacity_kg) : null,
      };

      await vehicleService.update(id, payload);
      navigate(`/vehicles/${id}`);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to update vehicle');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout active="Vehicles" title="Edit Vehicle">
        <div className="p-6">
          <div className="animate-pulse flex flex-col gap-6">
            <div className="h-64 bg-black/5 rounded-lg"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout active="Vehicles" title="Edit Vehicle">
      <div className="px-6 pb-6 max-w-4xl">
        <button 
          onClick={() => navigate('/vehicles')}
          className="flex items-center gap-2 text-sm font-semibold text-[#6E6E80] hover:text-[#111] transition-colors mb-6"
        >
          <ArrowLeft size={16} /> Back to Vehicles
        </button>

        <form onSubmit={handleSubmit} className="space-y-6">
          <FormSection 
            title="Tractor Information" 
            description="Details about the main vehicle unit."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput 
                label="Plate Number" 
                name="plate_number" 
                icon={<Truck size={16} />} 
                value={formData.plate_number}
                onChange={handleChange}
                required
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#111]">Asset Type</label>
                <select
                  name="asset_type"
                  value={formData.asset_type}
                  onChange={handleChange}
                  className="w-full bg-[#F5F5F7] border border-transparent rounded-lg px-4 py-2.5 text-sm font-medium text-[#111] focus:bg-white focus:border-[#E8450F] focus:ring-4 focus:ring-[#E8450F]/10 outline-none transition-all"
                >
                  <option value="Flatbed">Flatbed</option>
                  <option value="Reefer">Reefer</option>
                  <option value="Box">Box</option>
                  <option value="Tanker">Tanker</option>
                </select>
              </div>
              <FormInput 
                label="Capacity (kg)" 
                name="capacity_kg" 
                type="number"
                icon={<Activity size={16} />} 
                value={formData.capacity_kg}
                onChange={handleChange}
                required
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#111]">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full bg-[#F5F5F7] border border-transparent rounded-lg px-4 py-2.5 text-sm font-medium text-[#111] focus:bg-white focus:border-[#E8450F] focus:ring-4 focus:ring-[#E8450F]/10 outline-none transition-all"
                >
                  <option value="Available">Available</option>
                  <option value="OnTrip">On Trip</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <FormInput 
                label="GPS Device ID (Optional)" 
                name="gps_device_id" 
                placeholder="GPS-XXXX" 
                icon={<Navigation size={16} />} 
                value={formData.gps_device_id}
                onChange={handleChange}
              />
              <FormInput 
                label="ICCES Tracker ID (Optional)" 
                name="icces_device_id" 
                placeholder="351777..." 
                icon={<Activity size={16} />} 
                value={formData.icces_device_id}
                onChange={handleChange}
              />
            </div>
          </FormSection>

          <FormSection 
            title="Trailer Information" 
            description="Details about an attached trailer (Optional)."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput 
                label="Trailer Number" 
                name="trailer_number" 
                icon={<Truck size={16} />} 
                value={formData.trailer_number}
                onChange={handleChange}
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#111]">Trailer Type</label>
                <select
                  name="trailer_type"
                  value={formData.trailer_type}
                  onChange={handleChange}
                  className="w-full bg-[#F5F5F7] border border-transparent rounded-lg px-4 py-2.5 text-sm font-medium text-[#111] focus:bg-white focus:border-[#E8450F] focus:ring-4 focus:ring-[#E8450F]/10 outline-none transition-all"
                >
                  <option value="Flatbed">Flatbed</option>
                  <option value="Reefer">Reefer</option>
                  <option value="Box">Box</option>
                  <option value="Tanker">Tanker</option>
                </select>
              </div>
              <FormInput 
                label="Trailer Capacity (kg)" 
                name="trailer_capacity_kg" 
                type="number"
                icon={<Activity size={16} />} 
                value={formData.trailer_capacity_kg}
                onChange={handleChange}
              />
            </div>
          </FormSection>

          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm font-semibold border border-red-100">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-black/[0.06]">
            <Btn 
              label="Cancel" 
              variant="outline" 
              type="button" 
              onClick={() => navigate('/vehicles')} 
              disabled={isSubmitting} 
            />
            <Btn 
              label={isSubmitting ? 'Saving...' : 'Save Changes'} 
              type="submit" 
              disabled={isSubmitting} 
            />
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
