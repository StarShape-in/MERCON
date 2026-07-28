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
  Box
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { vehicleService, AssetType, CreateVehiclePayload } from '@/services/vehicleService';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AddVehiclePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('tractor');

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
      setActiveTab('tractor');
      setError('Plate number is required');
      return;
    }

    if (!formData.capacity_kg || Number(formData.capacity_kg) <= 0) {
      setActiveTab('tractor');
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
      case 'Reefer': return <ThermometerSnowflake className="w-4 h-4 text-blue-500" />;
      case 'Tanker': return <Flame className="w-4 h-4 text-amber-500" />;
      case 'Box': return <Box className="w-4 h-4 text-purple-500" />;
      case 'Flatbed':
      default: return <Container className="w-4 h-4 text-indigo-500" />;
    }
  };

  const isFormValid = formData.plate_number.trim() !== '' && tractorCap > 0;

  return (
    <DashboardLayout active="Vehicles" title="Register New Vehicle">
      <div className="px-6 pb-6 space-y-5 animate-fade-in max-w-[1400px] mx-auto">
        
        {/* Top Scope & Action Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted text-xs font-semibold text-muted-foreground border border-border/80">
              <span>🏢 MERCON Fleet</span>
              <span>•</span>
              <span className="text-foreground">Vehicle Registration</span>
            </div>
            <Badge className="bg-indigo-500/10 text-indigo-600 border-indigo-200 font-semibold dark:bg-indigo-950/40 dark:text-indigo-300">
              Operations Module
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/vehicles')}
              className="h-8 gap-1.5 text-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Vehicles
            </Button>

            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleReset}
              className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Form
            </Button>

            <Button 
              size="sm" 
              onClick={() => handleSubmit()}
              disabled={isSubmitting || !isFormValid}
              className="h-8 gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" /> {isSubmitting ? 'Registering...' : 'Register Vehicle'}
            </Button>
          </div>
        </div>

        {/* Header KPI Instrument Panel Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-3 bg-card border-border/70 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Asset Class</span>
              {getAssetIcon(formData.asset_type)}
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-base font-bold text-foreground">{formData.asset_type}</span>
              <span className="text-[10px] text-muted-foreground">Tractor Unit</span>
            </div>
          </Card>

          <Card className="p-3 bg-card border-border/70 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Payload Capacity</span>
              <Package className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                {totalCapacity > 0 ? `${totalCapacity.toLocaleString()} kg` : '0 kg'}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {hasTrailer ? 'Tractor + Trailer' : 'Standalone'}
              </span>
            </div>
          </Card>

          <Card className="p-3 bg-card border-border/70 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Telematics</span>
              <Radio className={`w-4 h-4 ${formData.gps_device_id ? 'text-blue-500' : 'text-muted-foreground'}`} />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xs font-bold text-foreground truncate max-w-[120px]">
                {formData.gps_device_id || 'No GPS Attached'}
              </span>
              <Badge variant="outline" className={`text-[9px] px-1 py-0 ${formData.gps_device_id ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-muted text-muted-foreground'}`}>
                {formData.gps_device_id ? 'Connected' : 'Pending'}
              </Badge>
            </div>
          </Card>

          <Card className="p-3 bg-card border-border/70 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">ICCES Tracker</span>
              <ShieldCheck className={`w-4 h-4 ${formData.icces_device_id ? 'text-indigo-500' : 'text-muted-foreground'}`} />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xs font-bold text-foreground truncate max-w-[120px]">
                {formData.icces_device_id || 'Optional'}
              </span>
              <Badge variant="outline" className={`text-[9px] px-1 py-0 ${formData.icces_device_id ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-muted text-muted-foreground'}`}>
                {formData.icces_device_id ? 'Verified' : 'Optional'}
              </Badge>
            </div>
          </Card>
        </div>

        {/* Main 2-Column Content Layout (Low Scroll) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* Left Column: Form Tabs Workspace (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            <Card className="border-border/80 shadow-xs">
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Truck className="w-4 h-4 text-indigo-600" /> Vehicle Registration Setup
                </CardTitle>
                <CardDescription className="text-xs">
                  Fill in tractor specifications, telematics sensors, and optional trailer details.
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-4">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid grid-cols-3 w-full mb-4 bg-muted/70 p-1">
                    <TabsTrigger value="tractor" className="text-xs font-semibold">
                      1. Tractor Specs
                    </TabsTrigger>
                    <TabsTrigger value="telematics" className="text-xs font-semibold">
                      2. Telematics
                    </TabsTrigger>
                    <TabsTrigger value="trailer" className="text-xs font-semibold">
                      3. Trailer (Optional)
                    </TabsTrigger>
                  </TabsList>

                  {/* TAB 1: Tractor Specifications */}
                  <TabsContent value="tractor" className="space-y-4 m-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      
                      <div className="space-y-1.5">
                        <Label htmlFor="plate_number" className="text-xs font-semibold flex items-center justify-between">
                          <span>Plate Number <span className="text-destructive">*</span></span>
                          <span className="text-[10px] text-muted-foreground font-normal">e.g. ABC 1234</span>
                        </Label>
                        <Input
                          id="plate_number"
                          placeholder="e.g. ABC 1234"
                          value={formData.plate_number}
                          onChange={(e) => handleChange('plate_number', e.target.value.toUpperCase())}
                          className="h-9 text-xs uppercase font-mono font-medium"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="asset_type" className="text-xs font-semibold">
                          Asset Type <span className="text-destructive">*</span>
                        </Label>
                        <Select 
                          value={formData.asset_type} 
                          onValueChange={(val) => handleChange('asset_type', val)}
                        >
                          <SelectTrigger id="asset_type" className="h-9 text-xs">
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
                        <Label htmlFor="capacity_kg" className="text-xs font-semibold flex items-center justify-between">
                          <span>Payload Capacity (kg) <span className="text-destructive">*</span></span>
                          <span className="text-[10px] text-indigo-600 font-semibold">Presets available</span>
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            id="capacity_kg"
                            type="number"
                            placeholder="20000"
                            value={formData.capacity_kg}
                            onChange={(e) => handleChange('capacity_kg', e.target.value)}
                            className="h-9 text-xs font-mono"
                          />
                        </div>
                        {/* Capacity Presets */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {['15000', '20000', '25000', '30000', '40000'].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => handleChange('capacity_kg', preset)}
                              className={`text-[11px] px-2 py-0.5 rounded border transition-colors ${
                                formData.capacity_kg === preset 
                                  ? 'bg-indigo-600 text-white border-indigo-600 font-semibold' 
                                  : 'bg-muted/50 hover:bg-muted text-muted-foreground border-border'
                              }`}
                            >
                              {Number(preset).toLocaleString()} kg
                            </button>
                          ))}
                        </div>
                      </div>

                    </div>

                    <div className="pt-2 flex justify-end">
                      <Button 
                        type="button" 
                        size="sm"
                        onClick={() => setActiveTab('telematics')}
                        className="h-8 text-xs gap-1"
                      >
                        Next: Telematics Integration →
                      </Button>
                    </div>
                  </TabsContent>

                  {/* TAB 2: Telematics & ICCES */}
                  <TabsContent value="telematics" className="space-y-4 m-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      
                      <div className="space-y-1.5">
                        <Label htmlFor="gps_device_id" className="text-xs font-semibold flex items-center gap-1.5">
                          <Navigation className="w-3.5 h-3.5 text-blue-500" /> GPS Device ID
                        </Label>
                        <Input
                          id="gps_device_id"
                          placeholder="e.g. GPS-8821-X"
                          value={formData.gps_device_id}
                          onChange={(e) => handleChange('gps_device_id', e.target.value)}
                          className="h-9 text-xs font-mono"
                        />
                        <p className="text-[10px] text-muted-foreground">Used for real-time location telemetry & trip route tracking.</p>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="icces_device_id" className="text-xs font-semibold flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-indigo-500" /> ICCES Tracker ID
                        </Label>
                        <Input
                          id="icces_device_id"
                          placeholder="e.g. 351777091234"
                          value={formData.icces_device_id}
                          onChange={(e) => handleChange('icces_device_id', e.target.value)}
                          className="h-9 text-xs font-mono"
                        />
                        <p className="text-[10px] text-muted-foreground">Saudi Transport ICCES telemetry compliance device ID.</p>
                      </div>

                    </div>

                    <div className="p-3 bg-muted/40 rounded-lg border border-border/50 text-xs space-y-1">
                      <div className="font-semibold text-foreground flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" /> Automatic Integration Ready
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Once saved, telemetry sensors automatically link to active trip telemetry streams for instant dispatch tracking.
                      </p>
                    </div>

                    <div className="pt-2 flex justify-between">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => setActiveTab('tractor')}
                        className="h-8 text-xs"
                      >
                        ← Back
                      </Button>
                      <Button 
                        type="button" 
                        size="sm"
                        onClick={() => setActiveTab('trailer')}
                        className="h-8 text-xs gap-1"
                      >
                        Next: Trailer Setup →
                      </Button>
                    </div>
                  </TabsContent>

                  {/* TAB 3: Trailer Unit (Optional) */}
                  <TabsContent value="trailer" className="space-y-4 m-0">
                    
                    <div className="flex items-center justify-between p-3 rounded-lg border border-border/80 bg-muted/30">
                      <div className="space-y-0.5">
                        <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-indigo-500" /> Attach Trailer Unit
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Toggle if this tractor operates with a coupled trailer.
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setHasTrailer(!hasTrailer)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          hasTrailer ? 'bg-indigo-600' : 'bg-muted'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                            hasTrailer ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {hasTrailer ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in pt-1">
                        <div className="space-y-1.5">
                          <Label htmlFor="trailer_number" className="text-xs font-semibold">
                            Trailer Number / Plate
                          </Label>
                          <Input
                            id="trailer_number"
                            placeholder="e.g. TRL-9920"
                            value={formData.trailer_number}
                            onChange={(e) => handleChange('trailer_number', e.target.value.toUpperCase())}
                            className="h-9 text-xs font-mono"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="trailer_type" className="text-xs font-semibold">
                            Trailer Type
                          </Label>
                          <Select 
                            value={formData.trailer_type} 
                            onValueChange={(val) => handleChange('trailer_type', val)}
                          >
                            <SelectTrigger id="trailer_type" className="h-9 text-xs">
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
                          <Label htmlFor="trailer_capacity_kg" className="text-xs font-semibold">
                            Trailer Capacity (kg)
                          </Label>
                          <Input
                            id="trailer_capacity_kg"
                            type="number"
                            placeholder="15000"
                            value={formData.trailer_capacity_kg}
                            onChange={(e) => handleChange('trailer_capacity_kg', e.target.value)}
                            className="h-9 text-xs font-mono"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 text-center rounded-lg border border-dashed border-border text-muted-foreground text-xs">
                        No trailer unit attached. Tractor will register as a standalone unit.
                      </div>
                    )}

                    <div className="pt-2 flex justify-between">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => setActiveTab('telematics')}
                        className="h-8 text-xs"
                      >
                        ← Back
                      </Button>
                      <Button 
                        type="button" 
                        size="sm"
                        onClick={() => handleSubmit()}
                        disabled={isSubmitting || !isFormValid}
                        className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" /> Register Vehicle Now
                      </Button>
                    </div>
                  </TabsContent>

                </Tabs>
              </CardContent>

            </Card>

            {error && (
              <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-xs font-semibold border border-destructive/20 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                {error}
              </div>
            )}
          </div>

          {/* Right Column: Live Visual Asset Preview Card (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="border-border/80 shadow-xs overflow-hidden sticky top-4">
              <CardHeader className="pb-3 bg-gradient-to-r from-muted/50 to-muted/20 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="bg-background text-[10px] uppercase font-bold tracking-wider">
                    Live Asset Preview
                  </Badge>
                  <span className="text-[10px] text-muted-foreground font-mono">VIN: TEMP-{Date.now().toString().slice(-4)}</span>
                </div>
                <CardTitle className="text-base font-bold mt-2 flex items-center gap-2">
                  {formData.plate_number ? formData.plate_number : '--- ----'}
                </CardTitle>
                <CardDescription className="text-xs">
                  Real-time visualization of registered fleet unit metadata.
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-4 space-y-4">
                
                {/* Saudi License Plate Preview */}
                <div className="bg-gradient-to-br from-amber-50 to-amber-100/60 dark:from-amber-950/40 dark:to-amber-900/20 border-2 border-amber-300 dark:border-amber-700/60 rounded-lg p-3 text-center shadow-2xs relative">
                  <div className="absolute top-1 left-2 text-[9px] font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                    <span>KSA</span> <span>🇸🇦</span>
                  </div>
                  <div className="text-xl font-black font-mono tracking-widest text-amber-950 dark:text-amber-100 pt-2">
                    {formData.plate_number || 'ABC 1234'}
                  </div>
                  <div className="text-[9px] uppercase tracking-wider font-semibold text-amber-700/80 dark:text-amber-300/80 mt-0.5">
                    Kingdom of Saudi Arabia • Commercial Transport
                  </div>
                </div>

                {/* Asset Spec Summary Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-md bg-muted/40 border border-border/50">
                    <span className="text-[10px] text-muted-foreground block">Tractor Type</span>
                    <span className="font-bold text-foreground flex items-center gap-1.5 mt-0.5">
                      {getAssetIcon(formData.asset_type)} {formData.asset_type}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-md bg-muted/40 border border-border/50">
                    <span className="text-[10px] text-muted-foreground block">Gross Capacity</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block font-mono">
                      {totalCapacity > 0 ? `${totalCapacity.toLocaleString()} kg` : '0 kg'}
                    </span>
                  </div>
                </div>

                {/* Capacity Meter Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px]">
                    <span className="font-semibold text-muted-foreground">Payload Allocation</span>
                    <span className="font-mono text-foreground font-semibold">{totalCapacity.toLocaleString()} kg</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden flex">
                    <div 
                      className="bg-indigo-600 h-full transition-all duration-300" 
                      style={{ width: `${Math.min(100, (tractorCap / 50000) * 100)}%` }} 
                    />
                    {hasTrailer && (
                      <div 
                        className="bg-emerald-500 h-full transition-all duration-300" 
                        style={{ width: `${Math.min(100, (trailerCap / 50000) * 100)}%` }} 
                      />
                    )}
                  </div>
                  <div className="flex justify-between text-[9px] text-muted-foreground">
                    <span>Tractor: {tractorCap.toLocaleString()} kg</span>
                    {hasTrailer && <span>Trailer: {trailerCap.toLocaleString()} kg</span>}
                  </div>
                </div>

                {/* Readiness Checklist */}
                <div className="space-y-2 pt-1 border-t border-border/50">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Registration Readiness</span>
                  
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        {formData.plate_number ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Circle className="w-3.5 h-3.5 text-muted" />}
                        Plate Number Provided
                      </span>
                      <span className="font-semibold font-mono text-[11px]">{formData.plate_number || 'Missing'}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        {tractorCap > 0 ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Circle className="w-3.5 h-3.5 text-muted" />}
                        Tractor Payload Capacity
                      </span>
                      <span className="font-semibold font-mono text-[11px]">{tractorCap > 0 ? `${tractorCap.toLocaleString()} kg` : '0 kg'}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        {formData.gps_device_id ? <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" /> : <Circle className="w-3.5 h-3.5 text-muted" />}
                        GPS Telematics Linked
                      </span>
                      <span className="font-semibold text-[11px]">{formData.gps_device_id ? 'Yes' : 'Optional'}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        {hasTrailer ? <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" /> : <Circle className="w-3.5 h-3.5 text-muted" />}
                        Attached Trailer Unit
                      </span>
                      <span className="font-semibold text-[11px]">{hasTrailer ? formData.trailer_number || 'Attached' : 'None'}</span>
                    </div>
                  </div>
                </div>

              </CardContent>

              <CardFooter className="bg-muted/30 border-t border-border/50 p-3 flex justify-between items-center">
                <div className="text-[11px] text-muted-foreground">
                  Status: <span className="font-semibold text-emerald-600 dark:text-emerald-400">Available on Register</span>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleSubmit()}
                  disabled={isSubmitting || !isFormValid}
                  className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4"
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
