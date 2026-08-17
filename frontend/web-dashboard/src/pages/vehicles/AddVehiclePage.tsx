import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Truck,
  ArrowLeft,
  RotateCcw,
  Plus,
  CheckCircle2,
  Circle,
  Package,
  Radio,
  Layers,
  Container,
  Flame,
  ThermometerSnowflake,
  Box,
  Building2,
  AlertCircle,
  Keyboard,
  UserRound,
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import CreateDriverModal from '@/components/trips/CreateDriverModal';
import { vehicleService, AssetType, CreateVehiclePayload } from '@/services/vehicleService';
import { driverService, Driver } from '@/services/driverService';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import Btn from '@/components/ui/Btn';

const EMPTY_FORM = {
  plate_number: '',
  asset_type: 'Flatbed' as AssetType,
  capacity_kg: '20000',
  trailer_number: '',
  trailer_type: 'Flatbed' as AssetType,
  trailer_capacity_kg: '',
  gps_device_id: '',
  icces_device_id: '',
  assigned_driver_id: '',
};

export default function AddVehiclePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [hasTrailer, setHasTrailer] = useState(false);
  const [isAddDriverOpen, setIsAddDriverOpen] = useState(false);

  const { data: driversRes, refetch: refetchDrivers } = useQuery({
    queryKey: ['drivers-select'],
    queryFn: () => driverService.getAll({ per_page: 200 }),
  });
  // A driver can only be assigned to one vehicle at a time (assignedVehicleId
  // is unique) — offering an already-assigned driver here would just silently
  // steal them from whatever truck they're on.
  const unassignedDrivers = (driversRes?.data || []).filter((d) => !d.assignedVehicleId);
  const driverOptions = unassignedDrivers.map((d) => ({
    value: d.id,
    label: `${d.first_name} ${d.last_name} (${d.license_number})`,
    keywords: `${d.first_name} ${d.last_name} ${d.license_number} ${d.phone_primary}`,
  }));

  const handleDriverCreated = (newDriver: Driver) => {
    refetchDrivers();
    setFormData((prev) => ({ ...prev, assigned_driver_id: newDriver.id }));
  };

  const assignDriverMutation = useMutation({
    mutationFn: ({ driverId, vehicleId }: { driverId: string; vehicleId: string }) =>
      driverService.update(driverId, { assigned_vehicle_id: vehicleId }),
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateVehiclePayload) => vehicleService.create(payload),
    onSuccess: async (newVehicle) => {
      if (formData.assigned_driver_id) {
        try {
          await assignDriverMutation.mutateAsync({ driverId: formData.assigned_driver_id, vehicleId: newVehicle.id });
          queryClient.invalidateQueries({ queryKey: ['drivers'] });
        } catch {
          // Vehicle registration itself succeeded — surface the assignment
          // failure separately rather than blocking navigation on it.
          setError('Vehicle registered, but the driver could not be assigned. Assign them from the Drivers page.');
        }
      }
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-performance'] });
      navigate('/vehicles');
    },
    onError: (err: any) => {
      setError(err.response?.data?.error?.message || err.message || 'Failed to add vehicle');
    },
  });

  const handleChange = (field: keyof typeof EMPTY_FORM, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleReset = () => {
    setFormData(EMPTY_FORM);
    setHasTrailer(false);
    setError(null);
  };

  const tractorCap = Number(formData.capacity_kg) || 0;
  const trailerCap = hasTrailer ? (Number(formData.trailer_capacity_kg) || 0) : 0;
  const totalCapacity = tractorCap + trailerCap;

  const checklist = [
    { label: 'Plate number', value: formData.plate_number, done: formData.plate_number.trim() !== '', icon: Truck, placeholder: 'Saudi license plate' },
    { label: 'Tractor capacity', value: tractorCap > 0 ? `${tractorCap.toLocaleString()} kg` : '', done: tractorCap > 0, icon: Package, placeholder: 'Gross payload (kg)' },
    { label: 'Trailer configuration', value: hasTrailer ? (formData.trailer_number || 'Attached') : 'Not attached', done: !hasTrailer || formData.trailer_number.trim() !== '', icon: Layers, placeholder: 'Optional' },
    { label: 'Telematics', value: formData.gps_device_id, done: formData.gps_device_id.trim() !== '', icon: Radio, placeholder: 'Optional GPS ID' },
  ];

  const isFormValid = formData.plate_number.trim() !== '' && tractorCap > 0 && (!hasTrailer || formData.trailer_number.trim() !== '');

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);

    if (!formData.plate_number.trim()) return setError('Plate number is required');
    if (!formData.capacity_kg || tractorCap <= 0) return setError('Valid tractor capacity (kg) is required');
    if (hasTrailer && !formData.trailer_number.trim()) return setError('Trailer plate number is required when a trailer is attached');

    const payload: CreateVehiclePayload = {
      plate_number: formData.plate_number,
      asset_type: formData.asset_type,
      capacity_kg: tractorCap,
      trailer_number: hasTrailer && formData.trailer_number ? formData.trailer_number : undefined,
      trailer_type: hasTrailer ? formData.trailer_type : undefined,
      trailer_capacity_kg: hasTrailer && formData.trailer_capacity_kg ? Number(formData.trailer_capacity_kg) : undefined,
      gps_device_id: formData.gps_device_id || undefined,
      icces_device_id: formData.icces_device_id || undefined,
    };

    createMutation.mutate(payload);
  };

  const getAssetIcon = (type: AssetType) => {
    switch (type) {
      case 'Reefer': return <ThermometerSnowflake className="w-4 h-4 text-primary" />;
      case 'Tanker': return <Flame className="w-4 h-4 text-primary" />;
      case 'Box': return <Box className="w-4 h-4 text-primary" />;
      case 'Flatbed':
      default: return <Container className="w-4 h-4 text-primary" />;
    }
  };

  return (
    <DashboardLayout active="Vehicles" title="Register New Vehicle">
      <form
        onSubmit={handleSubmit}
        className="mx-auto w-full max-w-6xl px-4 sm:px-6 pb-6 space-y-4 animate-fade-in"
      >
        {/* Scope & actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-md border bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
              <Building2 className="w-3.5 h-3.5" />
              MERCON Fleet
              <span className="text-muted-foreground/50">/</span>
              <span className="text-foreground font-bold">Operations</span>
            </span>
            <Badge variant="outline" className="font-semibold">Vehicle Registration</Badge>
          </div>

          <div className="flex items-center gap-2">
            <Btn
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate('/vehicles')}
              className="h-9 text-xs"
              label="Back"
              icon={<ArrowLeft className="w-3.5 h-3.5" />}
              shortcut={{ key: 'b', alt: true }}
            />
            <Button type="button" variant="ghost" size="sm" onClick={handleReset} className="h-9 text-xs gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </Button>
            <Btn
              type="submit"
              size="sm"
              disabled={createMutation.isPending || !isFormValid}
              className="h-9 px-4 text-xs rounded-md"
              label={createMutation.isPending ? 'Registering...' : 'Register Vehicle'}
              icon={<Plus className="w-3.5 h-3.5" />}
              shortcut={{ key: 'Enter', metaOrControl: true }}
            />
          </div>
        </div>

        {/* Workspace: form + live summary side by side */}
        <div className="grid gap-4 lg:grid-cols-3 items-start">
          {/* Form */}
          <Card className="lg:col-span-2 rounded-xl">
            <CardHeader className="border-b">
              <CardTitle className="text-sm font-bold">Vehicle details</CardTitle>
              <CardDescription className="text-xs">
                Register a heavy transport truck unit or tractor, including attached trailer and telematics.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              <section className="space-y-3">
                <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  <Truck className="w-3.5 h-3.5" /> Primary asset identifier
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="plate_number" className="text-xs font-semibold">
                      Saudi license plate <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="plate_number"
                      autoFocus
                      placeholder="e.g. ABC 1234"
                      value={formData.plate_number}
                      onChange={(e) => handleChange('plate_number', e.target.value.toUpperCase())}
                      className="font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="asset_type" className="text-xs font-semibold">
                      Asset classification <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.asset_type}
                      onValueChange={(val) => handleChange('asset_type', val as AssetType)}
                    >
                      <SelectTrigger id="asset_type" className="w-full">
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
              </section>

              <Separator />

              <section className="space-y-3">
                <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  <Package className="w-3.5 h-3.5" /> Payload &amp; telematics
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="capacity_kg" className="text-xs font-semibold">
                      Tractor gross payload (kg) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="capacity_kg"
                      type="number"
                      placeholder="e.g. 25000"
                      value={formData.capacity_kg}
                      onChange={(e) => handleChange('capacity_kg', e.target.value)}
                      className="font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="gps_device_id" className="text-xs font-semibold">
                      GPS telematics hardware ID
                    </Label>
                    <Input
                      id="gps_device_id"
                      placeholder="GPS-XXXXXX-M"
                      value={formData.gps_device_id}
                      onChange={(e) => handleChange('gps_device_id', e.target.value)}
                      className="font-mono"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="icces_device_id" className="text-xs font-semibold">
                      Saudi ICCES security tracking ID <span className="text-muted-foreground font-normal">(optional)</span>
                    </Label>
                    <Input
                      id="icces_device_id"
                      placeholder="ICCES-9988-TRACK"
                      value={formData.icces_device_id}
                      onChange={(e) => handleChange('icces_device_id', e.target.value)}
                      className="font-mono"
                    />
                  </div>
                </div>
              </section>

              <Separator />

              <section className="space-y-3">
                <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  <UserRound className="w-3.5 h-3.5" /> Assign driver <span className="text-muted-foreground font-normal normal-case">(optional)</span>
                </h3>

                <div className="space-y-1.5">
                  <Label htmlFor="assigned_driver_id" className="text-xs font-semibold">
                    Driver
                  </Label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Combobox
                        id="assigned_driver_id"
                        value={formData.assigned_driver_id}
                        onChange={(val) => handleChange('assigned_driver_id', val)}
                        options={driverOptions}
                        placeholder="Search unassigned drivers..."
                        searchPlaceholder="Search by name, license, or phone..."
                        emptyText="No unassigned drivers found."
                      />
                    </div>
                    <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5 text-xs shrink-0" onClick={() => setIsAddDriverOpen(true)}>
                      <Plus className="w-3.5 h-3.5" /> New Driver
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Only drivers not already assigned to another vehicle are listed. You can also assign or change this later from the Drivers page.
                  </p>
                </div>
              </section>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle />
                  <AlertTitle>Cannot register this vehicle</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>

            <CardFooter className="rounded-b-xl">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Keyboard className="w-3.5 h-3.5" /> Press Ctrl + Enter to submit
              </span>
            </CardFooter>
          </Card>

          {/* Live summary */}
          <Card className="rounded-xl lg:sticky lg:top-2">
            <CardHeader className="border-b">
              <CardTitle className="text-sm font-bold">Registration summary</CardTitle>
              <CardDescription className="text-xs">
                {checklist.filter((i) => i.done).length} of {checklist.length} requirements complete
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  {getAssetIcon(formData.asset_type)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold font-mono">
                    {formData.plate_number || 'ABC 1234'}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formData.asset_type} · {totalCapacity.toLocaleString()} kg{hasTrailer ? ' (with trailer)' : ''}
                  </p>
                </div>
              </div>

              <Separator />

              <ul className="space-y-2.5">
                {checklist.map((item) => (
                  <li key={item.label} className="flex items-start gap-2.5">
                    {item.done ? (
                      <CheckCircle2 className="mt-0.5 w-4 h-4 shrink-0 text-emerald-500" />
                    ) : (
                      <Circle className="mt-0.5 w-4 h-4 shrink-0 text-muted-foreground/40" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold">{item.label}</p>
                      <p className={`truncate text-xs ${item.done ? 'text-muted-foreground' : 'text-muted-foreground/60'}`}>
                        {item.value || item.placeholder}
                      </p>
                    </div>
                    <item.icon className="mt-0.5 w-3.5 h-3.5 shrink-0 text-muted-foreground/40" />
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter className="rounded-b-xl">
              <p className="text-xs text-muted-foreground">
                {isFormValid
                  ? 'All checks passed — ready to register.'
                  : 'Complete every requirement to enable registration.'}
              </p>
            </CardFooter>
          </Card>
        </div>
      </form>

      <CreateDriverModal
        isOpen={isAddDriverOpen}
        onClose={() => setIsAddDriverOpen(false)}
        onCreated={handleDriverCreated}
      />
    </DashboardLayout>
  );
}
