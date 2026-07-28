import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Phone, FileText, Calendar, ArrowLeft } from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import FormSection from '@/components/ui/FormSection';
import FormInput from '@/components/ui/FormInput';
import Btn from '@/components/ui/Btn';
import { driverService } from '@/services/driverService';

export default function AddDriverPage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone_primary: '',
    license_number: '',
    license_expiry: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Basic validation
      if (!formData.first_name || !formData.last_name || !formData.phone_primary || !formData.license_number || !formData.license_expiry) {
        throw new Error('All fields are required');
      }

      await driverService.create(formData);
      navigate('/drivers');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to create driver');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout active="Drivers" title="Add New Driver">
      <div className="mx-auto w-full max-w-4xl px-6 pb-6">
        <button
          onClick={() => navigate('/drivers')}
          className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors mb-6"
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
                placeholder="Ahmed" 
                icon={<User size={16} />} 
                value={formData.first_name}
                onChange={handleChange}
                required
              />
              <FormInput 
                label="Last Name" 
                name="last_name" 
                placeholder="Al-Farsi" 
                icon={<User size={16} />} 
                value={formData.last_name}
                onChange={handleChange}
                required
              />
              <FormInput 
                label="Primary Phone" 
                name="phone_primary" 
                placeholder="+966 50 123 4567" 
                icon={<Phone size={16} />} 
                value={formData.phone_primary}
                onChange={handleChange}
                required
              />
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
                placeholder="DL-XXXX-XXXX" 
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
            <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm font-semibold border border-destructive/20">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Btn 
              label="Cancel" 
              variant="outline" 
              type="button" 
              onClick={() => navigate('/drivers')} 
              disabled={isSubmitting} 
            />
            <Btn 
              label={isSubmitting ? 'Creating...' : 'Create Driver'} 
              type="submit" 
              disabled={isSubmitting} 
            />
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
