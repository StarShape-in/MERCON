import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { User, Phone, FileText, Calendar, ArrowLeft } from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import FormSection from '@/components/ui/FormSection';
import FormInput from '@/components/ui/FormInput';
import Btn from '@/components/ui/Btn';
import { driverService, DriverStatus } from '@/services/driverService';

export default function EditDriverPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: driver, isLoading } = useQuery({
    queryKey: ['driver', id],
    queryFn: () => driverService.getById(id!),
    enabled: !!id,
  });

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone_primary: '',
    license_number: '',
    license_expiry: '',
    status: 'Available' as DriverStatus,
  });

  useEffect(() => {
    if (driver) {
      setFormData({
        first_name: driver.first_name,
        last_name: driver.last_name,
        phone_primary: driver.phone_primary,
        license_number: driver.license_number,
        license_expiry: new Date(driver.license_expiry).toISOString().split('T')[0],
        status: driver.status,
      });
    }
  }, [driver]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (!id) throw new Error('Driver ID missing');
      await driverService.update(id, formData);
      navigate(`/drivers/${id}`);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to update driver');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout active="Drivers" title="Edit Driver">
        <div className="p-6">
          <div className="animate-pulse flex flex-col gap-6">
            <div className="h-64 bg-black/5 rounded-2xl"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout active="Drivers" title="Edit Driver">
      <div className="px-6 pb-6 max-w-4xl">
        <button 
          onClick={() => navigate('/drivers')}
          className="flex items-center gap-2 text-sm font-semibold text-[#6E6E80] hover:text-[#111] transition-colors mb-6"
        >
          <ArrowLeft size={16} /> Back to Drivers
        </button>

        <form onSubmit={handleSubmit} className="space-y-6">
          <FormSection 
            title="Personal Information" 
            description="Basic contact and identification details."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput 
                label="First Name" 
                name="first_name" 
                icon={<User size={16} />} 
                value={formData.first_name}
                onChange={handleChange}
                required
              />
              <FormInput 
                label="Last Name" 
                name="last_name" 
                icon={<User size={16} />} 
                value={formData.last_name}
                onChange={handleChange}
                required
              />
              <FormInput 
                label="Primary Phone" 
                name="phone_primary" 
                icon={<Phone size={16} />} 
                value={formData.phone_primary}
                onChange={handleChange}
                required
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#111]">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-2.5 text-sm font-medium text-[#111] focus:bg-white focus:border-[#E8450F] focus:ring-4 focus:ring-[#E8450F]/10 outline-none transition-all"
                >
                  <option value="Available">Available</option>
                  <option value="OnTrip">On Trip</option>
                  <option value="OffDuty">Off Duty</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
          </FormSection>

          <FormSection 
            title="Licensing & Compliance" 
            description="Driving license credentials."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput 
                label="License Number" 
                name="license_number" 
                icon={<FileText size={16} />} 
                value={formData.license_number}
                onChange={handleChange}
                required
              />
              <FormInput 
                label="License Expiry" 
                name="license_expiry" 
                type="date"
                icon={<Calendar size={16} />} 
                value={formData.license_expiry}
                onChange={handleChange}
                required
              />
            </div>
          </FormSection>

          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-semibold border border-red-100">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-black/[0.06]">
            <Btn 
              label="Cancel" 
              variant="outline" 
              type="button" 
              onClick={() => navigate('/drivers')} 
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
