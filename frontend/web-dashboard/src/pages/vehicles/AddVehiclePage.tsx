import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Truck, 
  Navigation, 
  Activity, 
  ArrowLeft, 
  RotateCcw, 
  CheckCircle2, 
  Circle, 
  ShieldCheck, 
  Radio, 
  Package, 
  Plus, 
  Layers,
  Container,
  Flame,
  ThermometerSnowflake,
  Box,
  Building2
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { vehicleService, AssetType, CreateVehiclePayload } from '@/services/vehicleService';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Btn from '@/components/ui/Btn';

export default function AddVehiclePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    plate_number: '',
    asset_type: 'Flatbed' as AssetType,
    capacity_kg: '20000',
    trailer_number: '',
    trailer_type: 'Flatbed' as AssetType,
    trailer_capacity_kg: '',
    gps_device_id: '',
    icces_device_id: '',
  });

  const [hasTrailer, setHasTrailer] = useState(false);

  const createMutation = useMutation({
    mutationFn: (payload: CreateVehiclePayload) => vehicleService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-performance'] });
      navigate('/vehicles');
    },
    onError: (err: any) => {
      setError(err.response?.data?.error?.message || err.message || 'Failed to add vehicle');
    },
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleReset = () => {
    setFormData({
      plate_number: '',
      asset_type: 'Flatbed',
      capacity_kg: '20000',
      trailer_number: '',
      trailer_type: 'Flatbed',
      trailer_capacity_kg: '',
      gps_device_id: '',
      icces_device_id: '',
    });
    setHasTrailer(false);
    setError(null);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    if (!formData.plate_number.trim()) {
      setError('Plate number is required');
      return;
    }

    if (!formData.capacity_kg || Number(formData.capacity_kg) <= 0) {
      setError('Valid tractor capacity (kg) is required');
      return;
    }

    const payload: CreateVehiclePayload = {
      plate_number: formData.plate_number,
      asset_type: formData.asset_type,
      capacity_kg: Number(formData.capacity_kg),
      trailer_number: hasTrailer && formData.trailer_number ? formData.trailer_number : undefined,
      trailer_type: hasTrailer ? formData.trailer_type : undefined,
      trailer_capacity_kg: hasTrailer && formData.trailer_capacity_kg ? Number(formData.trailer_capacity_kg) : undefined,
      gps_device_id: formData.gps_device_id || undefined,
      icces_device_id: formData.icces_device_id || undefined,
    };

    createMutation.mutate(payload);
  };

  const isSubmitting = createMutation.isPending;

  const tractorCap = Number(formData.capacity_kg) || 0;
  const trailerCap = hasTrailer ? (Number(formData.trailer_capacity_kg) || 0) : 0;
  const totalCapacity = tractorCap + trailerCap;

  const getAssetIcon = (type: AssetType) => {
    switch (type) {
      case 'Reefer': return <ThermometerSnowflake className="w-4 h-4 text-blue-600" />;
      case 'Tanker': return <Flame className="w-4 h-4 text-amber-600" />;
      case 'Box': return <Box className="w-4 h-4 text-purple-600" />;
      case 'Flatbed':
      default: return <Container className="w-4 h-4 text-[#E8450F]" />;
    }
  };

  const isFormValid = formData.plate_number.trim() !== '' && tractorCap > 0;

  return (
    <DashboardLayout active="Vehicles" title="Register New Vehicle">
      <div className="px-4 sm:px-6 pb-6 space-y-5 animate-fade-in max-w-[1400px] mx-auto">
        
        {/* Top Scope & Action Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
              <Building2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>MERCON Fleet</span>
              <span>•</span>
              <span className="text-slate-900 dark:text-slate-100 font-bold">Vehicle Registration</span>
            </div>
            <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-200 font-bold dark:bg-indigo-950/40 dark:text-indigo-300">
              Operations Module
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Btn 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/vehicles')}
              className="h-9 gap-1.5 text-xs font-semibold border-slate-200 bg-white hover:bg-slate-50 shadow-2xs"
              label="Back to Vehicles"
              icon={<ArrowLeft className="w-3.5 h-3.5" />}
              shortcut={{ key: 'b', alt: true }}
            />

            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleReset}
              className="h-9 gap-1.5 text-xs text-slate-500 hover:text-slate-900"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Form
            </Button>

            <Btn 
              size="sm" 
              onClick={() => handleSubmit()}
              disabled={isSubmitting || !isFormValid}
              className="h-9 gap-1.5 text-xs bg-[#E8450F] hover:bg-[#d03d0c] text-white font-bold shadow-xs rounded-md px-4"
              label={isSubmitting ? 'Registering...' : 'Register Vehicle'}
              icon={<Plus className="w-3.5 h-3.5" />}
              shortcut={{ key: 'Enter', metaOrControl: true }}
            />
          </div>
        </div>

        {/* Top Horizontal Live Preview / Manifest */}
        <Card className="border border-slate-200 dark:border-slate-800 shadow-2xs rounded-xl overflow-hidden bg-white dark:bg-slate-900">
          <div className="flex flex-col md:flex-row items-center divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-800">
            
            {/* Vehicle Unit Segment */}
            <div className="flex-1 p-4 flex items-center gap-3 w-full">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400 shrink-0">
                {getAssetIcon(formData.asset_type)}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Vehicle Unit</span>
                <p className="text-sm font-bold truncate mt-0.5 text-slate-900 dark:text-slate-100 font-mono">
                  {formData.plate_number ? formData.plate_number : 'ABC 1234'} ({formData.asset_type})
                </p>
              </div>
              {formData.plate_number && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
            </div>

            {/* Capacity Segment */}
            <div className="flex-1 p-4 flex items-center gap-3 w-full">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400 shrink-0">
                <Package className="w-4.5 h-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Total Capacity</span>
                <p className="text-sm font-bold truncate mt-0.5 text-slate-900 dark:text-slate-100 font-mono">
                  {totalCapacity.toLocaleString()} kg {hasTrailer ? '(with Trailer)' : ''}
                </p>
              </div>
              {totalCapacity > 0 && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
            </div>

            {/* Devices Linked Segment */}
            <div className="flex-1 p-4 flex items-center gap-3 w-full">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 shrink-0">
                <Radio className="w-4.5 h-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">GPS & ICCES Telematics</span>
                <p className="text-sm font-bold truncate mt-0.5 text-slate-900 dark:text-slate-100 font-mono">
                  {formData.gps_device_id ? `GPS Connected` : 'No GPS linked'}
                </p>
              </div>
              {formData.gps_device_id && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
            </div>

          </div>
        </Card>

        {/* Main Content Workspace (Single Column Centered) */}
        <div className="max-w-4xl mx-auto w-full pt-2">
          <Card className="border border-slate-200 dark:border-slate-800 shadow-2xs rounded-xl bg-white dark:bg-slate-900">
            <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Truck className="w-4.5 h-4.5 text-indigo-600" /> Vehicle Registration Details
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    Register a heavy transport truck unit or tractor including attached trailers.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-6 space-y-6">
              
              {/* SECTION 1: Asset Core Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                  <Truck className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    1. Primary Asset Identifier
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="plate_number" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Saudi License Plate Number <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="plate_number"
                      placeholder="e.g. ABC 1234"
                      value={formData.plate_number}
                      onChange={(e) => handleChange('plate_number', e.target.value.toUpperCase())}
                      className="h-9 text-xs font-mono border-slate-200"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="asset_type" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Asset Classification Type <span className="text-rose-500">*</span>
                    </Label>
                    <Select 
                      value={formData.asset_type} 
                      onValueChange={(val) => handleChange('asset_type', val as AssetType)}
                    >
                      <SelectTrigger id="asset_type" className="h-9 text-xs border-slate-200 bg-white">
                        <SelectValue placeholder="Select class type..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Flatbed">Flatbed Tractor Unit</SelectItem>
                        <SelectItem value="Reefer">Reefer / Coldchain Unit</SelectItem>
                        <SelectItem value="Box">Box Truck (Dry Van)</SelectItem>
                        <SelectItem value="Tanker">Liquid Tanker Unit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* SECTION 2: Payload Capacity & Weight */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                  <Package className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    2. Tractor Payload Weight Specs
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="capacity_kg" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Tractor Gross Payload Capacity (kg) <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="capacity_kg"
                      type="number"
                      placeholder="e.g. 25000"
                      value={formData.capacity_kg}
                      onChange={(e) => handleChange('capacity_kg', e.target.value)}
                      className="h-9 text-xs font-mono border-slate-200"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="gps_device_id" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      GPS Telematics Hardware ID
                    </Label>
                    <Input
                      id="gps_device_id"
                      placeholder="GPS-XXXXXX-M"
                      value={formData.gps_device_id}
                      onChange={(e) => handleChange('gps_device_id', e.target.value)}
                      className="h-9 text-xs font-mono border-slate-200"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="icces_device_id" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Saudi ICCES Security Tracking ID (Optional)
                    </Label>
                    <Input
                      id="icces_device_id"
                      placeholder="ICCES-9988-TRACK"
                      value={formData.icces_device_id}
                      onChange={(e) => handleChange('icces_device_id', e.target.value)}
                      className="h-9 text-xs font-mono border-slate-200"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: Optional Trailer Configuration */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      3. Attached Trailer Configuration
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setHasTrailer(!hasTrailer)}
                      className={`text-[11px] px-2.5 py-1 rounded-md border font-bold transition-all ${
                        hasTrailer 
                          ? 'bg-purple-600 text-white border-purple-600 shadow-2xs' 
                          : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {hasTrailer ? '✓ Trailer Attached' : '+ Attach Trailer'}
                    </button>
                  </div>
                </div>

                {hasTrailer ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border border-purple-100 bg-purple-50/20 dark:border-purple-900/40 dark:bg-purple-950/10 animate-fade-in">
                    <div className="space-y-1.5">
                      <Label htmlFor="trailer_number" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Trailer Plate / Registration ID <span className="text-rose-500">*</span>
                      </Label>
                      <Input
                        id="trailer_number"
                        placeholder="TR-8812-B"
                        value={formData.trailer_number}
                        onChange={(e) => handleChange('trailer_number', e.target.value.toUpperCase())}
                        className="h-9 text-xs font-mono border-slate-200"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="trailer_type" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Trailer Body Classification <span className="text-rose-500">*</span>
                      </Label>
                      <Select 
                        value={formData.trailer_type} 
                        onValueChange={(val) => handleChange('trailer_type', val as AssetType)}
                      >
                        <SelectTrigger id="trailer_type" className="h-9 text-xs border-slate-200 bg-white">
                          <SelectValue placeholder="Select trailer type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Flatbed">Flatbed Trailer</SelectItem>
                          <SelectItem value="Reefer">Reefer Trailer</SelectItem>
                          <SelectItem value="Box">Box Trailer</SelectItem>
                          <SelectItem value="Tanker">Tanker Trailer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="trailer_capacity_kg" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Trailer Capacity (kg)
                      </Label>
                      <Input
                        id="trailer_capacity_kg"
                        type="number"
                        placeholder="15000"
                        value={formData.trailer_capacity_kg}
                        onChange={(e) => handleChange('trailer_capacity_kg', e.target.value)}
                        className="h-9 text-xs font-mono border-slate-200"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-4 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-500 text-xs">
                    No trailer unit attached. Toggle above to configure attached trailer specifications.
                  </div>
                )}
              </div>

            </CardContent>

            <CardFooter className="bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 p-4 flex justify-between items-center rounded-b-xl">
              <Btn 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={handleReset}
                className="h-9 text-xs font-semibold border-slate-200 bg-white"
                label="Reset Form"
              />

              <Btn 
                type="button" 
                size="sm"
                onClick={() => handleSubmit()}
                disabled={isSubmitting || !isFormValid}
                className="h-9 text-xs bg-[#E8450F] hover:bg-[#d03d0c] text-white font-bold px-5 shadow-xs gap-1.5 rounded-md"
                label={isSubmitting ? 'Registering...' : 'Register Vehicle'}
                icon={<Plus className="w-4 h-4" />}
                shortcut={{ key: 'Enter', metaOrControl: true }}
              />
            </CardFooter>
          </Card>

          {error && (
            <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-xs font-semibold border border-rose-200 flex items-center gap-2 mt-4">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
              {error}
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  );
}
