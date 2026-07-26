import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Phone, DollarSign, ArrowLeft } from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import FormSection from '@/components/ui/FormSection';
import FormInput from '@/components/ui/FormInput';
import Btn from '@/components/ui/Btn';
import { customerService } from '@/services/customerService';

export default function AddCustomerPage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    contact_phone: '',
    credit_limit: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (!formData.name || !formData.contact_phone) {
        throw new Error('Name and contact phone are required');
      }

      await customerService.create({
        ...formData,
        credit_limit: formData.credit_limit ? Number(formData.credit_limit) : 0,
      });
      navigate('/customers');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to add customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout active="Customers" title="Add New Customer">
      <div className="px-6 pb-6 max-w-4xl">
        <button 
          onClick={() => navigate('/customers')}
          className="flex items-center gap-2 text-sm font-semibold text-[#6E6E80] hover:text-[#111] transition-colors mb-6"
        >
          <ArrowLeft size={16} /> Back to Customers
        </button>

        <form onSubmit={handleSubmit} className="space-y-6">
          <FormSection 
            title="Company Information" 
            description="Basic corporate details and contact information."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput 
                label="Company Name" 
                name="name" 
                placeholder="Almarai Logistics" 
                icon={<Building2 size={16} />} 
                value={formData.name}
                onChange={handleChange}
                required
              />
              <FormInput 
                label="Contact Phone" 
                name="contact_phone" 
                placeholder="+966 50 123 4567" 
                icon={<Phone size={16} />} 
                value={formData.contact_phone}
                onChange={handleChange}
                required
              />
            </div>
          </FormSection>

          <FormSection 
            title="Financial Setup" 
            description="Credit limits and billing parameters."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput 
                label="Credit Limit (SAR)" 
                name="credit_limit" 
                type="number"
                placeholder="50000" 
                icon={<DollarSign size={16} />} 
                value={formData.credit_limit}
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
              onClick={() => navigate('/customers')} 
              disabled={isSubmitting} 
            />
            <Btn 
              label={isSubmitting ? 'Adding...' : 'Add Customer'} 
              type="submit" 
              disabled={isSubmitting} 
            />
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
