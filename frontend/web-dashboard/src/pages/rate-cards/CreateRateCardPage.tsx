import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, Plus, Trash2 } from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import FormSection from '@/components/ui/FormSection';
import FormInput from '@/components/ui/FormInput';
import Btn from '@/components/ui/Btn';

export default function CreateRateCardPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    customerId: '',
    cargoType: 'General Cargo',
    baseRate: '',
    pricePerKm: '',
    minDistance: '',
    hazmatSurcharge: '',
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Mock save
    setTimeout(() => {
      setIsLoading(false);
      navigate('/rate-cards');
    }, 800);
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
          <Btn label="Cancel" variant="ghost" onClick={() => navigate('/rate-cards')} />
          <Btn label="Save Rate Card" icon={<Save size={14} />} onClick={handleSubmit} isLoading={isLoading} />
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
          <FormSection title="Customer & Cargo Type" description="Assign this rate card to a specific customer and cargo category.">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#111] mb-1.5">Customer / Client</label>
                <select 
                  className="w-full bg-white border border-black/[0.08] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#E8450F] transition-all"
                  value={formData.customerId}
                  onChange={(e) => handleChange('customerId', e.target.value)}
                  required
                >
                  <option value="" disabled>Select a customer</option>
                  <option value="1">SABIC</option>
                  <option value="2">Saudi Aramco</option>
                  <option value="3">Almarai</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111] mb-1.5">Cargo Type applicability</label>
                <select 
                  className="w-full bg-white border border-black/[0.08] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#E8450F] transition-all"
                  value={formData.cargoType}
                  onChange={(e) => handleChange('cargoType', e.target.value)}
                >
                  <option value="General Cargo">General Cargo</option>
                  <option value="Refrigerated">Refrigerated / Cold Chain</option>
                  <option value="Hazardous">Hazardous Materials (Hazmat)</option>
                  <option value="Liquid Bulk">Liquid Bulk</option>
                </select>
              </div>
            </div>
          </FormSection>

          <FormSection title="Pricing Structure" description="Define the base rates and distance-based pricing.">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FormInput
                label="Base Rate (SAR)"
                type="number"
                placeholder="e.g. 500"
                value={formData.baseRate}
                onChange={(e) => handleChange('baseRate', e.target.value)}
                required
              />
              <FormInput
                label="Price per Km (SAR)"
                type="number"
                step="0.01"
                placeholder="e.g. 1.20"
                value={formData.pricePerKm}
                onChange={(e) => handleChange('pricePerKm', e.target.value)}
                required
              />
              <FormInput
                label="Minimum Distance (Km)"
                type="number"
                placeholder="e.g. 100"
                value={formData.minDistance}
                onChange={(e) => handleChange('minDistance', e.target.value)}
              />
              <FormInput
                label="Hazmat / Special Surcharge (%)"
                type="number"
                placeholder="e.g. 15"
                value={formData.hazmatSurcharge}
                onChange={(e) => handleChange('hazmatSurcharge', e.target.value)}
              />
            </div>
          </FormSection>

          <div className="bg-[#FEF9C3] border border-[#CA8A04]/20 rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-[#CA8A04] mb-1">Pricing Example Preview</h3>
            <p className="text-xs text-[#CA8A04]/80 mb-3">A 500 km trip would cost approximately:</p>
            <div className="text-2xl font-bold text-[#CA8A04]">
              SAR {((parseFloat(formData.baseRate) || 0) + (500 * (parseFloat(formData.pricePerKm) || 0))).toLocaleString()}
            </div>
          </div>
        </form>

      </div>
    </DashboardLayout>
  );
}
