import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  User,
  Phone,
  FileText,
  Calendar,
  Truck,
  ArrowLeft,
  RotateCcw,
  Save,
  RotateCw,
  AlertTriangle,
  Eye,
  IdCard,
  Building2,
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import CreateVehicleModal from '@/components/trips/CreateVehicleModal';
import { driverService, DriverStatus } from '@/services/driverService';
import { vehicleService, Vehicle } from '@/services/vehicleService';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Combobox } from '@/components/ui/combobox';
import StatusBadge from '@/components/ui/StatusBadge';
import Btn from '@/components/ui/Btn';

export default function EditDriverPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [error, setError] = useState<string | null>(null);
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);

  // Fetch driver data
  const { data: driver, isLoading, refetch } = useQuery({
    queryKey: ['driver', id],
    queryFn: () => driverService.getById(id!),
    enabled: !!id,
  });

  // Fetch vehicles for assignment selector
  const { data: vehiclesRes, refetch: refetchVehicles } = useQuery({
    queryKey: ['vehicles-select'],
    queryFn: () => vehicleService.getAll({ per_page: 100 }),
  });

  const vehicles = vehiclesRes?.data || [];
  const vehicleOptions = vehicles.map((v) => ({
    value: v.id,
    label: `${v.plate_number} (${v.asset_type} • ${v.capacity_kg.toLocaleString()} kg)`,
    keywords: `${v.plate_number} ${v.asset_type}`,
  }));

  const handleVehicleCreated = (newVehicle: Vehicle) => {
    refetchVehicles();
    setFormData((prev) => ({ ...prev, assigned_vehicle_id: newVehicle.id }));
  };

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone_primary: '',
    license_number: '',
    license_expiry: '',
    status: 'Available' as DriverStatus,
    assigned_vehicle_id: '',
  });

  useEffect(() => {
    if (driver) {
      setFormData({
        first_name: driver.first_name || '',
        last_name: driver.last_name || '',
        phone_primary: driver.phone_primary || '',
        license_number: driver.license_number || '',
        license_expiry: driver.license_expiry ? new Date(driver.license_expiry).toISOString().split('T')[0] : '',
        status: driver.status || 'Available',
        assigned_vehicle_id: driver.assignedVehicleId || '',
      });
    }
  }, [driver]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleReset = () => {
    if (driver) {
      setFormData({
        first_name: driver.first_name || '',
        last_name: driver.last_name || '',
        phone_primary: driver.phone_primary || '',
        license_number: driver.license_number || '',
        license_expiry: driver.license_expiry ? new Date(driver.license_expiry).toISOString().split('T')[0] : '',
        status: driver.status || 'Available',
        assigned_vehicle_id: driver.assignedVehicleId || '',
      });
      setError(null);
      toast.info('Form reset');
    }
  };

  const updateMutation = useMutation({
    mutationFn: (payload: any) => driverService.update(id!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver', id] });
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast.success('Driver updated successfully');
      navigate(`/drivers/${id}`);
    },
    onError: (err: any) => {
      const details = err.response?.data?.error?.details as { path: string; message: string }[] | undefined;
      const detailMessage = details?.map((d) => `${d.path}: ${d.message}`).join('; ');
      const msg = detailMessage || err.response?.data?.error?.message || err.message || 'Failed to update driver';
      setError(msg);
      toast.error(msg);
    },
  });

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);

    if (!formData.first_name.trim()) return setError('First name is required.');
    if (!formData.last_name.trim()) return setError('Last name is required.');
    if (!formData.phone_primary.trim()) return setError('Primary phone number is required.');
    if (!formData.license_number.trim()) return setError('License number is required.');
    if (!formData.license_expiry || Number.isNaN(new Date(formData.license_expiry).getTime())) {
      setError('License Expiry is required and must be a valid date.');
      return;
    }

    if (!id) return;

    updateMutation.mutate({
      ...formData,
      assigned_vehicle_id: formData.assigned_vehicle_id || null,
    });
  };

  const handleRefresh = async () => {
    await Promise.all([refetch(), refetchVehicles()]);
    toast.success('Driver data refreshed');
  };

  if (isLoading) {
    return (
      <DashboardLayout active="Drivers" title="Edit Driver">
        <div className="p-12 flex flex-col items-center justify-center gap-3">
          <div className="h-8 w-8 border-2 border-brand border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-muted-foreground font-medium">Loading driver details...</p>
        </div>
      </DashboardLayout>
    );
  }

  const driverFullName = driver ? `${driver.first_name} ${driver.last_name}` : 'Driver Profile';

  return (
    <DashboardLayout
      active="Drivers"
      title="Edit Driver"
      breadcrumb={`Drivers / ${driverFullName} / Edit`}
      pageTitle={`Edit Driver: ${driverFullName}`}
      actions={
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <RotateCw className="w-3.5 h-3.5" /> Refresh
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate(`/drivers/${id}`)}
            className="h-8 text-xs gap-1.5"
          >
            <Eye className="w-3.5 h-3.5" /> View Profile
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate('/drivers')}
            className="h-8 text-xs gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Roster
          </Button>
        </div>
      }
    >
      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 pb-8 space-y-6 animate-fade-in">
        
        {/* Module Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-card p-4 rounded-xl border border-border shadow-sm">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-brand/10 text-brand border border-brand/20 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" /> MERCON Logistics Roster
            </span>
            <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200/80 font-semibold">
              Fleet Operations
            </Badge>
            {driver?.ref_id && (
              <Badge variant="outline" className="font-mono text-xs text-muted-foreground">
                Ref: {driver.ref_id}
              </Badge>
            )}
            <StatusBadge status={formData.status} />
          </div>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSubmit}>
          <Card className="rounded-xl shadow-sm border border-border">
            <CardHeader className="border-b px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-foreground">Driver Details</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Update personal contact info, status, license credentials, and assigned vehicle.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              
              {/* Section 1: Personal Profile */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 border-b pb-2">
                  <User className="w-4 h-4 text-brand" />
                  <h3 className="text-xs font-bold uppercase tracking-wide text-foreground">
                    Personal & Contact Details
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="first_name" className="text-xs font-semibold flex items-center gap-1">
                      First Name <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                      <Input
                        id="first_name"
                        className="pl-9 h-9 text-xs"
                        placeholder="e.g. Ahmed"
                        value={formData.first_name}
                        onChange={(e) => handleChange('first_name', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="last_name" className="text-xs font-semibold flex items-center gap-1">
                      Last Name <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                      <Input
                        id="last_name"
                        className="pl-9 h-9 text-xs"
                        placeholder="e.g. Al-Mansoor"
                        value={formData.last_name}
                        onChange={(e) => handleChange('last_name', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="phone_primary" className="text-xs font-semibold flex items-center gap-1">
                      Primary Phone <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                      <Input
                        id="phone_primary"
                        className="pl-9 h-9 text-xs font-mono"
                        placeholder="e.g. 0501234567"
                        value={formData.phone_primary}
                        onChange={(e) => handleChange('phone_primary', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="status" className="text-xs font-semibold flex items-center gap-1">
                      Operational Status
                    </Label>
                    <select
                      id="status"
                      value={formData.status}
                      onChange={(e) => handleChange('status', e.target.value)}
                      className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs font-medium text-foreground focus:border-brand focus:outline-none transition-colors"
                    >
                      <option value="Available">Available</option>
                      <option value="OnTrip">On Trip</option>
                      <option value="OffDuty">Off Duty</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </section>

              <Separator />

              {/* Section 2: Licensing & Compliance */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 border-b pb-2">
                  <IdCard className="w-4 h-4 text-brand" />
                  <h3 className="text-xs font-bold uppercase tracking-wide text-foreground">
                    Licensing & Compliance
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="license_number" className="text-xs font-semibold flex items-center gap-1">
                      License Number <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <FileText className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                      <Input
                        id="license_number"
                        className="pl-9 h-9 text-xs font-mono uppercase"
                        placeholder="e.g. DL-992014"
                        value={formData.license_number}
                        onChange={(e) => handleChange('license_number', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="license_expiry" className="text-xs font-semibold flex items-center gap-1">
                      License Expiry Date <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                      <Input
                        id="license_expiry"
                        type="date"
                        className="pl-9 h-9 text-xs font-mono"
                        value={formData.license_expiry}
                        onChange={(e) => handleChange('license_expiry', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </section>

              <Separator />

              {/* Section 3: Default Vehicle Assignment */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 border-b pb-2">
                  <Truck className="w-4 h-4 text-brand" />
                  <h3 className="text-xs font-bold uppercase tracking-wide text-foreground">
                    Vehicle Assignment
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="assigned_vehicle_id" className="text-xs font-semibold flex items-center gap-1">
                      Assigned Vehicle
                    </Label>
                    <Combobox
                      id="assigned_vehicle_id"
                      value={formData.assigned_vehicle_id}
                      onChange={(val) => handleChange('assigned_vehicle_id', val)}
                      options={vehicleOptions}
                      placeholder="No default vehicle..."
                      searchPlaceholder="Search vehicle..."
                      emptyText="No vehicles found."
                      onAddNew={() => setIsAddVehicleOpen(true)}
                      addNewLabel="Add New Vehicle"
                    />
                  </div>

                  {formData.assigned_vehicle_id && (
                    <div className="flex items-end pb-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleChange('assigned_vehicle_id', '')}
                        className="h-9 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 border-rose-200"
                      >
                        Unassign Vehicle
                      </Button>
                    </div>
                  )}
                </div>
              </section>

              {error && (
                <Alert variant="destructive" className="rounded-lg">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle className="text-xs font-bold">Error</AlertTitle>
                  <AlertDescription className="text-xs">{error}</AlertDescription>
                </Alert>
              )}

            </CardContent>

            <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-t bg-slate-50/50 dark:bg-slate-900/50 rounded-b-xl">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="h-9 text-xs gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset Form
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/drivers')}
                  className="h-9 text-xs"
                >
                  Cancel
                </Button>
                <Btn
                  type="submit"
                  size="sm"
                  disabled={updateMutation.isPending}
                  className="h-9 px-5 text-xs rounded-md"
                  label={updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                  icon={<Save className="w-3.5 h-3.5" />}
                  shortcut={{ key: 'Enter', metaOrControl: true }}
                />
              </div>
            </div>

          </Card>
        </form>

      </div>

      <CreateVehicleModal
        isOpen={isAddVehicleOpen}
        onClose={() => setIsAddVehicleOpen(false)}
        onCreated={handleVehicleCreated}
      />
    </DashboardLayout>
  );
}
