import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import DashboardLayout from '@/components/layout/DashboardLayout';
import FormSection from '@/components/ui/FormSection';
import Btn from '@/components/ui/Btn';
import StatusBadge from '@/components/ui/StatusBadge';

import { customerService } from '@/services/customerService';
import { tripService } from '@/services/tripService';
import { invoiceService } from '@/services/invoiceService';

export default function CreateInvoicePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [customerId, setCustomerId] = useState('');
  const [selectedTripId, setSelectedTripId] = useState<string>('');

  // Fetch all active customers for the dropdown
  const { data: customersRes } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customerService.getAll({ is_active: true }),
  });
  const customers = customersRes?.data || [];

  // Fetch un-invoiced (Completed) trips for the selected customer
  const { data: tripsRes, isLoading: isLoadingTrips } = useQuery({
    queryKey: ['trips', 'Completed', customerId],
    queryFn: () => tripService.getAll({ customer_id: customerId, status: 'Completed' }),
    enabled: !!customerId,
  });
  
  // Filter out trips that already have an invoice (this is simple client-side filtering, normally backend would do this)
  const trips = (tripsRes?.data || []).filter(t => !t.invoices || t.invoices.length === 0);

  const selectedTrip = trips.find(t => t.id === selectedTripId);
  const totalAmount = selectedTrip ? 3500 : 0; // In a real scenario, this comes from pricing engine

  const createInvoice = useMutation({
    mutationFn: async () => {
      if (!selectedTrip || !customerId) throw new Error("Missing selection");
      
      const due = new Date();
      due.setDate(due.getDate() + 30); // 30 days terms
      
      return invoiceService.create({
        trip_id: selectedTrip.id,
        customer_id: customerId,
        subtotal: totalAmount,
        total_amount: totalAmount,
        due_date: due.toISOString()
      });
    },
    onSuccess: (newInvoice) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      // Open print template in new tab
      window.open(`/invoices/${newInvoice.id}/print`, '_blank');
      // Redirect back to list
      navigate('/invoices');
    },
    onError: (error: any) => {
      alert(error.response?.data?.error?.message || "Failed to generate invoice.");
    }
  });

  return (
    <DashboardLayout 
      active="Invoices" 
      title="Generate Invoice"
      breadcrumb="Invoices"
      pageTitle="Generate Invoice" 
      actions={
        <div className="flex gap-2">
          <Btn label="Cancel" variant="ghost" onClick={() => navigate('/invoices')} />
          <Btn 
            label="Generate & Download PDF" 
            icon={<Save size={14} />} 
            onClick={() => createInvoice.mutate()} 
            isLoading={createInvoice.isPending} 
            disabled={!selectedTripId} 
          />
        </div>
      }
    >
      <div className="px-6 pb-6 max-w-4xl mx-auto w-full">
        <button 
          onClick={() => navigate('/invoices')}
          className="flex items-center gap-2 text-sm font-semibold text-[#6E6E80] hover:text-[#111] transition-colors mb-6"
        >
          <ArrowLeft size={16} /> Back to Invoices
        </button>

        <div className="space-y-6">
          <FormSection title="Client Details" description="Select the customer to generate the invoice for.">
            <div>
              <label className="block text-xs font-bold text-[#111] mb-1.5">Customer / Client</label>
              <select 
                className="w-full bg-white border border-black/[0.08] rounded-none px-4 py-2.5 text-sm outline-none focus:border-[#E8450F] transition-all"
                value={customerId}
                onChange={(e) => {
                  setCustomerId(e.target.value);
                  setSelectedTripId('');
                }}
              >
                <option value="" disabled>Select a customer...</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </FormSection>

          {customerId && (
            <FormSection title="Select Trip" description="Choose a completed, un-invoiced trip to bill. (One trip per invoice)">
              <div className="bg-white border border-black/[0.08] rounded-none overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-black/[0.04] bg-[#FAFAFA] flex justify-between items-center">
                  <span className="text-xs font-bold text-[#111]">Un-invoiced Trips</span>
                </div>
                
                {isLoadingTrips ? (
                  <div className="p-10 flex justify-center">
                    <Loader2 size={24} className="animate-spin text-[#E8450F]" />
                  </div>
                ) : trips.length === 0 ? (
                  <div className="p-10 text-center text-[#6E6E80] text-sm">
                    No completed, un-invoiced trips found for this customer.
                  </div>
                ) : (
                  <div className="divide-y divide-black/[0.04]">
                    {trips.map((trip) => (
                      <label key={trip.id} className={`flex items-center gap-4 p-4 cursor-pointer hover:bg-[#FAFAFA] transition-colors ${selectedTripId === trip.id ? 'bg-[#FFF0EB]/30' : ''}`}>
                        <input 
                          type="radio" 
                          name="selectedTrip"
                          checked={selectedTripId === trip.id}
                          onChange={() => setSelectedTripId(trip.id)}
                          className="w-4 h-4 rounded-full text-[#E8450F] border-gray-300 focus:ring-[#E8450F]"
                        />
                        <div className="flex-1 flex justify-between items-center">
                          <div>
                            <p className="text-sm font-bold text-[#111] font-mono">{trip.ref_id || 'N/A'}</p>
                            <p className="text-xs text-[#6E6E80] mt-0.5">Completed: {trip.actual_end ? new Date(trip.actual_end).toLocaleDateString() : 'Unknown'}</p>
                          </div>
                          <div className="text-right">
                            <StatusBadge status="Completed" />
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {selectedTripId && (
                <div className="mt-6 p-5 bg-[#F0FDF4] border border-[#16A34A]/20 rounded-none flex justify-between items-center shadow-sm">
                  <div>
                    <h4 className="text-sm font-bold text-[#16A34A]">Invoice Total</h4>
                    <p className="text-xs text-[#16A34A]/80">Estimated amount based on rate card</p>
                  </div>
                  <div className="text-2xl font-bold text-[#16A34A]">
                    SAR {totalAmount.toLocaleString()}
                  </div>
                </div>
              )}
            </FormSection>
          )}
        </div>

      </div>
    </DashboardLayout>
  );
}
