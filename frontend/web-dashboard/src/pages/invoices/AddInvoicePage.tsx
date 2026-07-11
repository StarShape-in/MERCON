import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileText, DollarSign, ArrowLeft, Truck, Building2 } from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import FormSection from '@/components/ui/FormSection';
import FormInput from '@/components/ui/FormInput';
import Btn from '@/components/ui/Btn';
import { invoiceService } from '@/services/invoiceService';
import { tripService } from '@/services/tripService';
import { customerService } from '@/services/customerService';

export default function AddInvoicePage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    trip_id: '',
    customer_id: '',
    subtotal: '',
    total_amount: '',
    due_date: '',
  });

  const { data: tripsRes } = useQuery({
    queryKey: ['trips-completed'],
    queryFn: () => tripService.getAll({ status: 'Completed', per_page: 50 }),
  });
  const trips = tripsRes?.data || [];

  const { data: customersRes } = useQuery({
    queryKey: ['customers-all'],
    queryFn: () => customerService.getAll({ per_page: 100 }),
  });
  const customers = customersRes?.data || [];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleTripChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tripId = e.target.value;
    const selectedTrip = trips.find(t => t.id === tripId);
    
    setFormData(prev => ({
      ...prev,
      trip_id: tripId,
      customer_id: selectedTrip?.customer?.id || prev.customer_id,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (!formData.trip_id || !formData.customer_id || !formData.subtotal || !formData.total_amount || !formData.due_date) {
        throw new Error('All fields are required');
      }

      await invoiceService.create({
        trip_id: formData.trip_id,
        customer_id: formData.customer_id,
        subtotal: Number(formData.subtotal),
        total_amount: Number(formData.total_amount),
        due_date: new Date(formData.due_date).toISOString(),
      });
      navigate('/invoices');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to create invoice');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout active="Invoices" title="Create Invoice">
      <div className="px-6 pb-6 max-w-4xl">
        <button 
          onClick={() => navigate('/invoices')}
          className="flex items-center gap-2 text-sm font-semibold text-[#6E6E80] hover:text-[#111] transition-colors mb-6"
        >
          <ArrowLeft size={16} /> Back to Invoices
        </button>

        <form onSubmit={handleSubmit} className="space-y-6">
          <FormSection 
            title="Link to Trip & Customer" 
            description="Select the completed trip to bill for."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#111]">Completed Trip</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Truck size={16} className="text-[#9898A4]" />
                  </div>
                  <select
                    name="trip_id"
                    value={formData.trip_id}
                    onChange={handleTripChange}
                    className="w-full bg-[#F5F5F7] border border-transparent rounded-none pl-11 pr-4 py-2.5 text-sm font-medium text-[#111] outline-none"
                    required
                  >
                    <option value="">Select a Trip</option>
                    {trips.map(t => (
                      <option key={t.id} value={t.id}>{t.ref_id} - {t.customer?.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#111]">Customer</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Building2 size={16} className="text-[#9898A4]" />
                  </div>
                  <select
                    name="customer_id"
                    value={formData.customer_id}
                    onChange={handleChange}
                    className="w-full bg-[#F5F5F7] border border-transparent rounded-none pl-11 pr-4 py-2.5 text-sm font-medium text-[#111] outline-none"
                    required
                  >
                    <option value="">Select Customer</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </FormSection>

          <FormSection 
            title="Billing Details" 
            description="Enter the invoice amounts and due date."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput 
                label="Subtotal (SAR)" 
                name="subtotal" 
                type="number"
                placeholder="0.00" 
                icon={<DollarSign size={16} />} 
                value={formData.subtotal}
                onChange={handleChange}
                required
              />
              <FormInput 
                label="Total Amount (SAR)" 
                name="total_amount" 
                type="number"
                placeholder="0.00" 
                icon={<DollarSign size={16} />} 
                value={formData.total_amount}
                onChange={handleChange}
                required
              />
              <FormInput 
                label="Due Date" 
                name="due_date" 
                type="date"
                icon={<FileText size={16} />} 
                value={formData.due_date}
                onChange={handleChange}
                required
              />
            </div>
          </FormSection>

          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-none text-sm font-semibold border border-red-100">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-black/[0.06]">
            <Btn 
              label="Cancel" 
              variant="outline" 
              type="button" 
              onClick={() => navigate('/invoices')} 
              disabled={isSubmitting} 
            />
            <Btn 
              label={isSubmitting ? 'Creating...' : 'Create Invoice'} 
              type="submit" 
              disabled={isSubmitting} 
            />
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
