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
      <div className="px-6 pb-6 space-y-5 animate-fade-in max-w-[1400px] mx-auto">
        
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
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/vehicles')}
              className="h-9 gap-1.5 text-xs font-semibold border-slate-200 bg-white hover:bg-slate-50 shadow-2xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Vehicles
            </Button>

            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleReset}
              className="h-9 gap-1.5 text-xs text-slate-500 hover:text-slate-900"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Form
            </Button>

            <Button 
              size="sm" 
              onClick={() => handleSubmit()}
              disabled={isSubmitting || !isFormValid}
              className="h-9 gap-1.5 text-xs bg-[#E8450F] hover:bg-[#d03d0c] text-white font-bold shadow-xs rounded-md px-4"
            >
              <Plus className="w-3.5 h-3.5" /> {isSubmitting ? 'Registering...' : 'Register Vehicle'}
            </Button>
          </div>
        </div>

        {/* Header KPI Instrument Panel Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Asset Class</span>
              {getAssetIcon(formData.asset_type)}
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-base font-extrabold text-slate-900 dark:text-slate-100">{formData.asset_type}</span>
              <span className="text-[10px] text-slate-500 font-medium">Tractor Unit</span>
            </div>
          </Card>

          <Card className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Payload Capacity</span>
              <Package className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-base font-extrabold text-emerald-700 dark:text-emerald-400 font-mono">
                {totalCapacity > 0 ? `${totalCapacity.toLocaleString()} kg` : '0 kg'}
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                {hasTrailer ? 'Tractor + Trailer' : 'Standalone'}
              </span>
            </div>
          </Card>

          <Card className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Telematics</span>
              <Radio className={`w-4 h-4 ${formData.gps_device_id ? 'text-blue-600' : 'text-slate-400'}`} />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate max-w-[120px]">
                {formData.gps_device_id || 'No GPS Attached'}
              </span>
              <Badge 
                variant="outline" 
                className={`text-[9px] px-1 py-0 font-bold ${
                  formData.gps_device_id 
                    ? 'bg-blue-50 text-blue-600 border-blue-200' 
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}
              >
                {formData.gps_device_id ? 'Connected' : 'Pending'}
              </Badge>
            </div>
          </Card>

          <Card className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">ICCES Tracker</span>
              <ShieldCheck className={`w-4 h-4 ${formData.icces_device_id ? 'text-emerald-600' : 'text-slate-400'}`} />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate max-w-[120px]">
                {formData.icces_device_id || 'Optional'}
              </span>
              <Badge 
                variant="outline" 
                className={`text-[9px] px-1 py-0 font-bold ${
                  formData.icces_device_id 
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}
              >
                {formData.icces_device_id ? 'Verified' : 'Optional'}
              </Badge>
            </div>
          </Card>
        </div>

        {/* Main 2-Column Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* Left Column: 3 Form Sections Stacked (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* SECTION 1: Tractor Specs */}
            <Card className="border border-slate-200 dark:border-slate-800 shadow-2xs rounded-xl bg-white dark:bg-slate-900">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Truck className="w-4.5 h-4.5 text-[#E8450F]" /> 1. Tractor Specifications
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Primary tractor vehicle identity, plate number, asset type, and payload capacity.
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  <div className="space-y-1.5">
                    <Label htmlFor="plate_number" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>Plate Number <span className="text-rose-500">*</span></span>
                      <span className="text-[10px] text-slate-400 font-normal">e.g. ABC 1234</span>
                    </Label>
                    <Input
                      id="plate_number"
                      placeholder="e.g. ABC 1234"
                      value={formData.plate_number}
                      onChange={(e) => handleChange('plate_number', e.target.value.toUpperCase())}
                      className="h-9 text-xs uppercase font-mono font-medium border-slate-200"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="asset_type" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Asset Type <span className="text-rose-500">*</span>
                    </Label>
                    <Select 
                      value={formData.asset_type} 
                      onValueChange={(val) => handleChange('asset_type', val as AssetType)}
                    >
                      <SelectTrigger id="asset_type" className="h-9 text-xs border-slate-200 bg-white">
                        <SelectValue placeholder="Select asset type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Flatbed">Flatbed (Heavy Cargo)</SelectItem>
                        <SelectItem value="Reefer">Reefer (Temperature Controlled)</SelectItem>
                        <SelectItem value="Box">Box Truck (Dry Van)</SelectItem>
                        <SelectItem value="Tanker">Tanker (Liquid / Bulk)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="capacity_kg" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>Payload Capacity (kg) <span className="text-rose-500">*</span></span>
                      <span className="text-[10px] text-indigo-600 font-semibold">Presets available</span>
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="capacity_kg"
                        type="number"
                        placeholder="20000"
                        value={formData.capacity_kg}
                        onChange={(e) => handleChange('capacity_kg', e.target.value)}
                        className="h-9 text-xs font-mono border-slate-200"
                      />
                    </div>
                    {/* Capacity Presets */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {['15000', '20000', '25000', '30000', '40000'].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => handleChange('capacity_kg', preset)}
                          className={`text-[11px] px-2.5 py-1 rounded-md border transition-all ${
                            formData.capacity_kg === preset 
                              ? 'bg-[#E8450F] text-white border-[#E8450F] font-bold shadow-2xs' 
                              : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {Number(preset).toLocaleString()} kg
                        </button>
                      ))}
                    </div>
                  </div>

                </div>
              </CardContent>
            </Card>

            {/* SECTION 2: Telematics */}
            <Card className="border border-slate-200 dark:border-slate-800 shadow-2xs rounded-xl bg-white dark:bg-slate-900">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Navigation className="w-4.5 h-4.5 text-blue-600" /> 2. Telematics & Sensors
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  GPS tracker IDs and Saudi ICCES transport telemetry integration.
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  <div className="space-y-1.5">
                    <Label htmlFor="gps_device_id" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-blue-600" /> GPS Device ID
                    </Label>
                    <Input
                      id="gps_device_id"
                      placeholder="e.g. GPS-8821-X"
                      value={formData.gps_device_id}
                      onChange={(e) => handleChange('gps_device_id', e.target.value)}
                      className="h-9 text-xs font-mono border-slate-200"
                    />
                    <p className="text-[10px] text-slate-500">Used for real-time location telemetry & trip route tracking.</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="icces_device_id" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-indigo-600" /> ICCES Tracker ID
                    </Label>
                    <Input
                      id="icces_device_id"
                      placeholder="e.g. 351777091234"
                      value={formData.icces_device_id}
                      onChange={(e) => handleChange('icces_device_id', e.target.value)}
                      className="h-9 text-xs font-mono border-slate-200"
                    />
                    <p className="text-[10px] text-slate-500">Saudi Transport ICCES telemetry compliance device ID.</p>
                  </div>

                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                  <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" /> Automatic Integration Ready
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Once saved, telemetry sensors automatically link to active trip telemetry streams for instant dispatch tracking.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* SECTION 3: Trailer (Optional) */}
            <Card className="border border-slate-200 dark:border-slate-800 shadow-2xs rounded-xl bg-white dark:bg-slate-900">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Layers className="w-4.5 h-4.5 text-[#E8450F]" /> 3. Trailer Unit (Optional)
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Attach or configure a secondary trailer linked to this tractor.
                    </CardDescription>
                  </div>
                  <button
                    type="button"
                    onClick={() => setHasTrailer(!hasTrailer)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      hasTrailer ? 'bg-[#E8450F]' : 'bg-slate-200 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        hasTrailer ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </CardHeader>

              <CardContent className="pt-4">
                {hasTrailer ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
                    <div className="space-y-1.5">
                      <Label htmlFor="trailer_number" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Trailer Number / Plate
                      </Label>
                      <Input
                        id="trailer_number"
                        placeholder="e.g. TRL-9920"
                        value={formData.trailer_number}
                        onChange={(e) => handleChange('trailer_number', e.target.value.toUpperCase())}
                        className="h-9 text-xs font-mono border-slate-200"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="trailer_type" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Trailer Type
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
              </CardContent>
            </Card>

            {error && (
              <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-xs font-semibold border border-rose-200 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
                {error}
              </div>
            )}
          </div>

          {/* Right Column: Live Visual Asset Preview Card (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="border border-slate-200 dark:border-slate-800 shadow-2xs rounded-xl overflow-hidden sticky top-4 bg-white dark:bg-slate-900">
              <CardHeader className="pb-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="bg-white text-[10px] uppercase font-bold tracking-wider text-slate-700 border-slate-200">
                    Live Asset Preview
                  </Badge>
                  <span className="text-[10px] text-slate-400 font-mono">VIN: TEMP-{Date.now().toString().slice(-4)}</span>
                </div>
                <CardTitle className="text-base font-extrabold text-slate-900 dark:text-slate-100 mt-2 flex items-center gap-2">
                  {formData.plate_number ? formData.plate_number : '--- ----'}
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Real-time visualization of registered fleet unit metadata.
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-4 space-y-4">
                
                {/* Saudi License Plate Preview */}
                <div className="bg-amber-50/80 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700/60 rounded-xl p-3 text-center shadow-2xs relative">
                  <div className="absolute top-1.5 left-2.5 text-[9px] font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                    <span>KSA</span> <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block" />
                  </div>
                  <div className="text-xl font-black font-mono tracking-widest text-amber-950 dark:text-amber-100 pt-2">
                    {formData.plate_number || 'ABC 1234'}
                  </div>
                  <div className="text-[9px] uppercase tracking-wider font-bold text-amber-700/80 dark:text-amber-300/80 mt-0.5">
                    Kingdom of Saudi Arabia • Commercial Transport
                  </div>
                </div>

                {/* Asset Spec Summary Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-500 block font-medium">Tractor Type</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 mt-0.5">
                      {getAssetIcon(formData.asset_type)} {formData.asset_type}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-500 block font-medium">Gross Capacity</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400 mt-0.5 block font-mono">
                      {totalCapacity > 0 ? `${totalCapacity.toLocaleString()} kg` : '0 kg'}
                    </span>
                  </div>
                </div>

                {/* Capacity Meter Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px]">
                    <span className="font-semibold text-slate-500">Payload Allocation</span>
                    <span className="font-mono text-slate-900 dark:text-slate-100 font-extrabold">{totalCapacity.toLocaleString()} kg</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                    <div 
                      className="bg-[#E8450F] h-full transition-all duration-300" 
                      style={{ width: `${Math.min(100, (tractorCap / 50000) * 100)}%` }} 
                    />
                    {hasTrailer && (
                      <div 
                        className="bg-emerald-500 h-full transition-all duration-300" 
                        style={{ width: `${Math.min(100, (trailerCap / 50000) * 100)}%` }} 
                      />
                    )}
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-500 font-medium">
                    <span>Tractor: {tractorCap.toLocaleString()} kg</span>
                    {hasTrailer && <span>Trailer: {trailerCap.toLocaleString()} kg</span>}
                  </div>
                </div>

                {/* Readiness Checklist */}
                <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Registration Readiness</span>
                  
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                        {formData.plate_number ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <Circle className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
                        Plate Number Provided
                      </span>
                      <span className="font-semibold font-mono text-[11px]">{formData.plate_number || 'Missing'}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                        {tractorCap > 0 ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <Circle className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
                        Tractor Payload Capacity
                      </span>
                      <span className="font-semibold font-mono text-[11px]">{tractorCap > 0 ? `${tractorCap.toLocaleString()} kg` : '0 kg'}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                        {formData.gps_device_id ? <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" /> : <Circle className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
                        GPS Telematics Linked
                      </span>
                      <span className="font-semibold text-[11px]">{formData.gps_device_id ? 'Yes' : 'Optional'}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                        {hasTrailer ? <CheckCircle2 className="w-3.5 h-3.5 text-[#E8450F] shrink-0" /> : <Circle className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
                        Attached Trailer Unit
                      </span>
                      <span className="font-semibold text-[11px]">{hasTrailer ? formData.trailer_number || 'Attached' : 'None'}</span>
                    </div>
                  </div>
                </div>

              </CardContent>

              <CardFooter className="bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 p-3 flex justify-between items-center">
                <div className="text-[11px] text-slate-500">
                  Status: <span className="font-bold text-emerald-600 dark:text-emerald-400">Available on Register</span>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleSubmit()}
                  disabled={isSubmitting || !isFormValid}
                  className="h-9 text-xs bg-[#E8450F] hover:bg-[#d03d0c] text-white font-bold px-4 rounded-md shadow-xs"
                >
                  {isSubmitting ? 'Saving...' : 'Submit Vehicle'}
                </Button>
              </CardFooter>
            </Card>
          </div>

        </div>

      </div>
    </DashboardLayout>
  );
}
