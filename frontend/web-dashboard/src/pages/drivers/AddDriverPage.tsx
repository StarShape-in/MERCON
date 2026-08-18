import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Phone,
  FileText,
  Calendar,
  Truck,
  ArrowLeft,
  RotateCcw,
  Plus,
  CheckCircle2,
  Circle,
  ShieldCheck,
  Keyboard,
  AlertCircle,
  Building2,
  X,
  Loader2,
  Check,
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import CreateVehicleModal from '@/components/trips/CreateVehicleModal';
import { driverService, CreateDriverPayload } from '@/services/driverService';
import { vehicleService, Vehicle } from '@/services/vehicleService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Combobox } from '@/components/ui/combobox';
import DriverImageUploader from '@/components/ui/DriverImageUploader';

const EMPTY_FORM = {
  first_name: '',
  last_name: '',
  phone_primary: '',
  license_number: '',
  license_expiry: '',
  assigned_vehicle_id: '',
  avatar_url: null as string | null,
};

export default function AddDriverPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);

  const { data: vehiclesRes, refetch: refetchVehicles } = useQuery({
    queryKey: ['vehicles-select'],
    queryFn: () => vehicleService.getAll({ per_page: 100 }),
  });

  const vehicles = vehiclesRes?.data || [];
  const vehicleOptions = vehicles.map((v) => ({
    value: v.id,
    label: `${v.plate_number} (${v.asset_type} • ${v.capacity_kg ? `${v.capacity_kg.toLocaleString()} kg` : 'N/A'})`,
    keywords: `${v.plate_number} ${v.asset_type}`,
  }));

  const assignedVehicle = vehicles.find((v) => v.id === formData.assigned_vehicle_id);

  const handleVehicleCreated = (newVehicle: Vehicle) => {
    refetchVehicles();
    setFormData((prev) => ({ ...prev, assigned_vehicle_id: newVehicle.id }));
  };

  const handleChange = (field: keyof typeof EMPTY_FORM, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleReset = () => {
    setFormData(EMPTY_FORM);
    setError(null);
  };

  const createMutation = useMutation({
    mutationFn: (payload: CreateDriverPayload) => driverService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-performance'] });
      navigate('/drivers');
    },
    onError: (err: any) => {
      setError(err.response?.data?.error?.message || err.message || 'Failed to create driver');
    },
  });

  const isExpiryValid = formData.license_expiry ? new Date(formData.license_expiry) > new Date() : false;
  const isExpired = formData.license_expiry !== '' && !isExpiryValid;

  const isFormValid =
    formData.first_name.trim() !== '' &&
    formData.last_name.trim() !== '' &&
    formData.phone_primary.trim() !== '' &&
    formData.license_number.trim() !== '' &&
    formData.license_expiry !== '' &&
    isExpiryValid;

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);

    if (!formData.first_name.trim()) return setError('First name is required');
    if (!formData.last_name.trim()) return setError('Last name is required');
    if (!formData.phone_primary.trim()) return setError('Primary phone number is required');
    if (!formData.license_number.trim()) return setError('License number is required');
    if (!formData.license_expiry) return setError('License expiry date is required');
    if (!isExpiryValid) {
      return setError('License is already expired. Only drivers with a valid, future-dated license can be added.');
    }

    createMutation.mutate({
      first_name: formData.first_name.trim(),
      last_name: formData.last_name.trim(),
      phone_primary: formData.phone_primary.trim(),
      license_number: formData.license_number.trim(),
      license_expiry: formData.license_expiry,
      assigned_vehicle_id: formData.assigned_vehicle_id || undefined,
      avatar_url: formData.avatar_url || undefined,
    });
  };

  return (
    <DashboardLayout active="Drivers" title="Add New Driver">
      <div className="mx-auto w-full max-w-5xl px-3 sm:px-4 pb-4">
        {/* Main Card Container */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-black/[0.08] shadow-sm flex flex-col overflow-hidden max-h-[calc(100vh-8.5rem)]">
          {/* Header Bar */}
          <div className="px-5 py-3 border-b border-black/[0.06] flex items-center justify-between shrink-0 bg-white dark:bg-slate-900">
            <div className="flex items-center gap-2.5">
              <span className="flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <Building2 className="w-3.5 h-3.5 text-brand" />
                MERCON Fleet
                <span className="text-slate-300 dark:text-slate-600">/</span>
                <span className="text-slate-900 dark:text-white font-bold">Human Capital</span>
              </span>
              <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-bold">
                Driver Profile
              </Badge>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => navigate('/drivers')}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form Body - Zero-scroll 2-column cockpit layout */}
          <form
            onSubmit={handleSubmit}
            className="flex-1 overflow-y-auto p-4 sm:p-5 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4"
          >
            {/* Main Form Input Panels */}
            <div className="lg:col-span-12 max-w-2xl mx-auto w-full space-y-3.5">
              {error && (
                <div className="p-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-800 text-xs flex items-start gap-2 shadow-2xs">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Validation Error</p>
                    <p className="text-[11px] text-rose-700">{error}</p>
                  </div>
                </div>
              )}

              {/* Panel 1: Personal Profile & Photo */}
              <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/40 space-y-3">
                <div className="flex items-center gap-1.5 border-b border-slate-200/60 pb-1.5">
                  <User className="w-3.5 h-3.5 text-brand" />
                  <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    1. Personal Profile & Photo
                  </span>
                </div>

                <div className="space-y-3.5">
                  {/* Photo Uploader */}
                  <DriverImageUploader
                    value={formData.avatar_url}
                    onChange={(url) => setFormData((prev) => ({ ...prev, avatar_url: url }))}
                    firstName={formData.first_name}
                    lastName={formData.last_name}
                  />

                  {/* Name & Phone Inputs */}
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label htmlFor="first_name" className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                          First Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          id="first_name"
                          type="text"
                          autoFocus
                          placeholder="e.g. Ahmed"
                          value={formData.first_name}
                          onChange={(e) => handleChange('first_name', e.target.value)}
                          className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-none focus:border-brand bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label htmlFor="last_name" className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                          Last Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          id="last_name"
                          type="text"
                          placeholder="e.g. Al-Mansoor"
                          value={formData.last_name}
                          onChange={(e) => handleChange('last_name', e.target.value)}
                          className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-none focus:border-brand bg-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="phone_primary" className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                        Primary Phone Number <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-2 font-mono text-xs font-bold text-slate-400">
                          +966
                        </span>
                        <input
                          id="phone_primary"
                          type="tel"
                          inputMode="tel"
                          placeholder="50XXXXXXX"
                          value={formData.phone_primary}
                          onChange={(e) => handleChange('phone_primary', e.target.value)}
                          className="w-full h-8 pl-14 pr-2.5 rounded-lg border border-slate-200 text-xs font-mono font-semibold focus:outline-none focus:border-brand bg-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Panel 2: Commercial Saudi License */}
              <div className="p-3.5 rounded-xl border border-emerald-200/80 bg-emerald-50/20 space-y-3">
                <div className="flex items-center justify-between border-b border-emerald-100 pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-[10px] font-bold text-emerald-950 uppercase tracking-wider">
                      2. Commercial Driving License
                    </span>
                  </div>
                  {formData.license_expiry && (
                    <span
                      className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${
                        isExpiryValid
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      {isExpiryValid ? '✓ Valid Future Date' : '⚠ Expired License'}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="license_number" className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                      Saudi License ID <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="license_number"
                      type="text"
                      placeholder="e.g. 10XXXXXXXX"
                      value={formData.license_number}
                      onChange={(e) => handleChange('license_number', e.target.value)}
                      className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs font-mono font-semibold focus:outline-none focus:border-emerald-500 bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="license_expiry" className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                      License Expiry Date <span className="text-rose-500">*</span>
                    </label>
                    <DatePicker
                      id="license_expiry"
                      value={formData.license_expiry}
                      onChange={(_, dateStr) => handleChange('license_expiry', dateStr)}
                      placeholder="Select expiry date..."
                      error={isExpired}
                      minDate={new Date()}
                    />
                  </div>
                </div>
              </div>

              {/* Panel 3: Default Vehicle Assignment */}
              <div className="p-3.5 rounded-xl border border-orange-200/80 bg-orange-50/20 space-y-2.5">
                <div className="flex items-center justify-between border-b border-orange-100 pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-brand" />
                    <span className="text-[10px] font-bold text-orange-950 uppercase tracking-wider">
                      3. Default Vehicle Assignment
                    </span>
                  </div>
                  <Button
                    type="button"
                    onClick={() => setIsAddVehicleOpen(true)}
                    className="h-6 px-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold rounded-lg flex items-center gap-1 shadow-sm transition-all border-none"
                  >
                    <Plus className="w-3 h-3 text-white" />
                    Add Vehicle
                  </Button>
                </div>

                <div className="space-y-1">
                  <Combobox
                    id="assigned_vehicle_id"
                    value={formData.assigned_vehicle_id}
                    onChange={(val) => handleChange('assigned_vehicle_id', val)}
                    options={[
                      { value: '', label: '-- No default vehicle (Float Driver) --' },
                      ...vehicleOptions,
                    ]}
                    placeholder="Select default vehicle (optional)..."
                    searchPlaceholder="Search vehicles by plate or type..."
                    emptyText="No vehicles found."
                    onAddNew={() => setIsAddVehicleOpen(true)}
                    addNewLabel="Add New Vehicle"
                    triggerClassName="h-8 rounded-lg bg-white border-slate-200 text-xs font-medium w-full"
                  />
                  <p className="text-[10px] text-slate-400">
                    Pre-fills automatically when this driver is selected on a trip. Can still be modified per trip.
                  </p>
                </div>
              </div>
            </div>
          </form>

          {/* Sticky Guided Footer Action Bar */}
          <div className="px-5 py-2.5 border-t border-black/[0.06] bg-white dark:bg-slate-900 flex items-center justify-between shrink-0">
            <div>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/drivers')}
                className="h-9 rounded-xl border border-slate-200/65 text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-500 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                disabled={createMutation.isPending || !isFormValid}
                onClick={() => handleSubmit()}
                className="h-9 rounded-xl px-6 text-xs font-bold bg-brand hover:bg-[#d13d0d] text-white shadow-none disabled:opacity-50"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-1.5" />
                    Add Driver
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal for creating a new vehicle on-the-fly */}
      <CreateVehicleModal
        isOpen={isAddVehicleOpen}
        onClose={() => setIsAddVehicleOpen(false)}
        onCreated={handleVehicleCreated}
      />
    </DashboardLayout>
  );
}
