import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, Search, Plus } from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import FormSection from '@/components/ui/FormSection';
import Btn from '@/components/ui/Btn';
import StatusBadge from '@/components/ui/StatusBadge';

export default function CreateInvoicePage() {
  const navigate = useNavigate();
  const [customer, setCustomer] = useState('');
  const [selectedTrips, setSelectedTrips] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Mock Trips
  const trips = [
    { id: '1', ref: 'TRP-9021', date: '2026-07-01', amount: 3500 },
    { id: '2', ref: 'TRP-9022', date: '2026-07-03', amount: 4200 },
    { id: '3', ref: 'TRP-9024', date: '2026-07-05', amount: 2800 },
    { id: '4', ref: 'TRP-9026', date: '2026-07-06', amount: 5100 },
  ];

  const totalAmount = trips
    .filter(t => selectedTrips.includes(t.id))
    .reduce((acc, curr) => acc + curr.amount, 0);

  const toggleTrip = (id: string) => {
    setSelectedTrips(prev => 
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const handleGenerate = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      navigate('/invoices'); // Redirect to invoice list
    }, 1000);
  };

  return (
    <DashboardLayout 
      active="Invoices" 
      title="Generate Invoice"
      breadcrumb="Invoices"
      pageTitle="Generate Invoice" 
      actions={
        <div className="flex gap-2">
          <Btn label="Cancel" variant="ghost" onClick={() => navigate('/invoices')} />
          <Btn label="Generate & Save" icon={<Save size={14} />} onClick={handleGenerate} isLoading={isLoading} disabled={selectedTrips.length === 0} />
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
                className="w-full bg-white border border-black/[0.08] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#E8450F] transition-all"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
              >
                <option value="" disabled>Select a customer...</option>
                <option value="1">SABIC</option>
                <option value="2">Saudi Aramco</option>
                <option value="3">Almarai</option>
              </select>
            </div>
          </FormSection>

          {customer && (
            <FormSection title="Select Trips" description="Choose the un-invoiced, completed trips to include.">
              <div className="bg-white border border-black/[0.08] rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-black/[0.04] bg-[#FAFAFA] flex justify-between items-center">
                  <span className="text-xs font-bold text-[#111]">Un-invoiced Trips</span>
                  <span className="text-[10px] font-bold bg-[#E8450F] text-white px-2 py-0.5 rounded-full">
                    {selectedTrips.length} Selected
                  </span>
                </div>
                <div className="divide-y divide-black/[0.04]">
                  {trips.map((trip) => (
                    <label key={trip.id} className={`flex items-center gap-4 p-4 cursor-pointer hover:bg-[#FAFAFA] transition-colors ${selectedTrips.includes(trip.id) ? 'bg-[#FFF0EB]/30' : ''}`}>
                      <input 
                        type="checkbox" 
                        checked={selectedTrips.includes(trip.id)}
                        onChange={() => toggleTrip(trip.id)}
                        className="w-4 h-4 rounded text-[#E8450F] border-gray-300 focus:ring-[#E8450F]"
                      />
                      <div className="flex-1 flex justify-between items-center">
                        <div>
                          <p className="text-sm font-bold text-[#111] font-mono">{trip.ref}</p>
                          <p className="text-xs text-[#6E6E80] mt-0.5">{trip.date}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-[#111]">SAR {trip.amount.toLocaleString()}</p>
                          <StatusBadge status="Completed" />
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {selectedTrips.length > 0 && (
                <div className="mt-6 p-5 bg-[#F0FDF4] border border-[#16A34A]/20 rounded-xl flex justify-between items-center shadow-sm">
                  <div>
                    <h4 className="text-sm font-bold text-[#16A34A]">Invoice Total</h4>
                    <p className="text-xs text-[#16A34A]/80">Based on {selectedTrips.length} trips</p>
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
