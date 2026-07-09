import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, Plus, Trash2 } from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import FormSection from '@/components/ui/FormSection';
import FormInput from '@/components/ui/FormInput';
import Btn from '@/components/ui/Btn';
import { useMutation, useQuery } from '@tanstack/react-query';
import { rateCardService } from '@/services/rateCardService';
import { customerService } from '@/services/customerService';

export default function CreateRateCardPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    customerId: '',
    route_origin: '',
    route_destination: '',
    base_price: '',
    currency: 'SAR',
  });
  const [error, setError] = useState<string | null>(null);

  // Fetch active customers for the dropdown
  const { data: customersResponse } = useQuery({
    queryKey: ['customers', 'Active'],
    queryFn: () => customerService.getAll({ is_active: true })
  });
  const customers = customersResponse?.data || [];

  const createMutation = useMutation({
    mutationFn: rateCardService.create,
    onSuccess: () => {
      navigate('/rate-cards');
    },
    onError: (err: any) => {
      setError(err.response?.data?.error?.message || err.message || 'Failed to create rate card');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    createMutation.mutate({
      name: formData.name,
      customerId: formData.customerId,
      route_origin: formData.route_origin,
      route_destination: formData.route_destination,
      base_price: parseFloat(formData.base_price),
      currency: formData.currency,
    });
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <DashboardLayout 
      active="Customers" 
      title="Create Rate Card"
      breadcrumb="Rate Cards"
      pageTitle="Create New Rate Card" 
      actions={
        <div className="flex gap-2">
          <Btn label="Cancel" variant="ghost" onClick={() => navigate('/rate-cards')} disabled={createMutation.isPending} />
          <Btn label="Save Rate Card" icon={<Save size={14} />} onClick={handleSubmit} isLoading={createMutation.isPending} />
        </div>
      }
    >
      <div className="px-6 pb-6 max-w-4xl mx-auto w-full">
        <button 
          onClick={() => navigate('/rate-cards')}
          className="flex items-center gap-2 text-sm font-semibold text-[#6E6E80] hover:text-[#111] transition-colors mb-6"
        >
          <ArrowLeft size={16} /> Back to Rate Cards
        </button>

        <form onSubmit={handleSubmit} className="space-y-6">
          <FormSection title="General Details" description="Assign this rate card to a specific customer and name the agreement.">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FormInput
                label="Rate Card Name"
                placeholder="e.g. SABIC Dammam Route 2024"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                required
              />
              <div>
                <label className="block text-xs font-bold text-[#111] mb-1.5">Customer / Client</label>
                <select 
                  className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-2.5 text-sm font-medium text-[#111] focus:bg-white focus:border-[#E8450F] focus:ring-4 focus:ring-[#E8450F]/10 outline-none transition-all"
                  value={formData.customerId}
                  onChange={(e) => handleChange('customerId', e.target.value)}
                  required
                >
                  <option value="" disabled>Select a customer</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </FormSection>

          <FormSection title="Route & Pricing" description="Define the origin, destination, and fixed price.">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FormInput
                label="Route Origin"
                placeholder="e.g. Riyadh"
                value={formData.route_origin}
                onChange={(e) => handleChange('route_origin', e.target.value)}
                required
              />
              <FormInput
                label="Route Destination"
                placeholder="e.g. Dammam"
                value={formData.route_destination}
                onChange={(e) => handleChange('route_destination', e.target.value)}
                required
              />
              <FormInput
                label="Base Price"
                type="number"
                step="0.01"
                placeholder="e.g. 1500.00"
                value={formData.base_price}
                onChange={(e) => handleChange('base_price', e.target.value)}
                required
              />
              <div>
                <label className="block text-xs font-bold text-[#111] mb-1.5">Currency</label>
                <select 
                  className="w-full bg-[#F5F5F7] border border-transparent rounded-xl px-4 py-2.5 text-sm font-medium text-[#111] focus:bg-white focus:border-[#E8450F] focus:ring-4 focus:ring-[#E8450F]/10 outline-none transition-all"
                  value={formData.currency}
                  onChange={(e) => handleChange('currency', e.target.value)}
                  required
                >
                  <option value="SAR">SAR (Saudi Riyal)</option>
                  <option value="USD">USD (US Dollar)</option>
                </select>
              </div>
            </div>
          </FormSection>

          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-semibold border border-red-100">
              {error}
            </div>
          )}

          <div className="bg-[#FEF9C3] border border-[#CA8A04]/20 rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-[#CA8A04] mb-1">Pricing Example Preview</h3>
            <p className="text-xs text-[#CA8A04]/80 mb-3">This route will cost exactly:</p>
            <div className="text-2xl font-bold text-[#CA8A04]">
              {formData.currency} {parseFloat(formData.base_price || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>
        </form>

      </div>
    </DashboardLayout>
  );
}
