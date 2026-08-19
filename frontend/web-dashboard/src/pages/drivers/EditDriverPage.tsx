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
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  Unlink,
  ExternalLink,
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
import { Combobox } from '@/components/ui/combobox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import StatusBadge from '@/components/ui/StatusBadge';
import Btn from '@/components/ui/Btn';
import DriverImageUploader from '@/components/ui/DriverImageUploader';
import DriverAvatar from '@/components/ui/DriverAvatar';

export default function EditDriverPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [error, setError] = useState<string | null>(null);
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

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
    toast.success(`Vehicle ${newVehicle.plate_number} created & assigned`);
  };

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone_primary: '',
    license_number: '',
    license_expiry: '',
    status: 'Available' as DriverStatus,
    assigned_vehicle_id: '',
    avatar_url: null as string | null,
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
        avatar_url: driver.avatar_url || null,
      });
    }
  }, [driver]);

  const handleChange = (field: string, value: string | null) => {
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
        avatar_url: driver.avatar_url || null,
      });
      setError(null);
      toast.info('Form reset to original values');
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
          <p className="text-xs text-muted-foreground font-medium">Loading driver profile details...</p>
        </div>
      </DashboardLayout>
    );
  }

  const driverFullName = driver ? `${driver.first_name} ${driver.last_name}` : 'Driver Profile';
  const selectedVehicle = vehicles.find((v) => v.id === formData.assigned_vehicle_id);

  // License Expiry calculation
  let daysUntilExpiry: number | null = null;
  if (formData.license_expiry) {
    const expiryDate = new Date(formData.license_expiry);
    const now = new Date();
    const diffTime = expiryDate.getTime() - now.getTime();
    daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

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
            <ArrowLeft className="w-3.5 h-3.5" /> Roster
          </Button>
          <Btn
            type="button"
            size="sm"
            onClick={() => handleSubmit()}
            disabled={updateMutation.isPending}
            className="h-8 px-4 text-xs font-bold rounded-lg shadow-sm"
            label={updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            icon={<Save className="w-3.5 h-3.5" />}
          />
        </div>
      }
    >
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 pb-8 space-y-4 animate-fade-in">
        
        {/* Module Scope Header Bar (MERCON Specification) */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-card p-3.5 rounded-xl border border-border shadow-xs">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-brand/10 text-brand border border-brand/20 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" /> MERCON Logistics Roster ↕
            </span>
            <Badge className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200/80 font-semibold text-xs">
              Fleet Operations
            </Badge>
            {driver?.ref_id && (
              <Badge variant="outline" className="font-mono text-xs text-muted-foreground bg-slate-50 dark:bg-slate-900">
                Ref: {driver.ref_id}
              </Badge>
            )}
            <StatusBadge status={formData.status} />
          </div>

          <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            Registered: {driver?.createdAt ? new Date(driver.createdAt).toLocaleDateString() : 'N/A'}
          </div>
        </div>

        {/* Main 2-Column Dashboard Layout (Zero scrolling required!) */}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* Left Column: Sticky Profile Summary Card (4 cols) */}
          <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-4">
            <Card className="rounded-xl border border-border shadow-sm bg-white dark:bg-card overflow-hidden">
              <CardHeader className="bg-slate-50/70 dark:bg-slate-900/50 border-b p-4 text-center">
                <div className="flex justify-center pb-1">
                  <DriverAvatar
                    src={formData.avatar_url}
                    firstName={formData.first_name}
                    lastName={formData.last_name}
                    size="xl"
                  />
                </div>
                <CardTitle className="text-base font-bold text-foreground mt-2">
                  {formData.first_name || 'First'} {formData.last_name || 'Last'}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <Phone className="w-3 h-3 text-muted-foreground" /> {formData.phone_primary || 'No primary phone'}
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4 space-y-3.5 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-dashed">
                  <span className="text-muted-foreground font-medium">Ref ID</span>
                  <span className="font-mono font-bold text-foreground">{driver?.ref_id || id?.slice(0, 8)}</span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-dashed">
                  <span className="text-muted-foreground font-medium">Status</span>
                  <StatusBadge status={formData.status} />
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-dashed">
                  <span className="text-muted-foreground font-medium">License #</span>
                  <span className="font-mono font-bold text-foreground uppercase">
                    {formData.license_number || 'N/A'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-dashed">
                  <span className="text-muted-foreground font-medium">Assigned Asset</span>
                  <span className="font-medium text-foreground truncate max-w-[140px]">
                    {selectedVehicle ? selectedVehicle.plate_number : 'None'}
                  </span>
                </div>

                {/* Direct Cropper & Image Upload trigger */}
                <div className="pt-2">
                  <DriverImageUploader
                    value={formData.avatar_url}
                    onChange={(url) => handleChange('avatar_url', url)}
                    firstName={formData.first_name}
                    lastName={formData.last_name}
                  />
                </div>

                {error && (
                  <Alert variant="destructive" className="rounded-lg p-3">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle className="text-xs font-bold">Error</AlertTitle>
                    <AlertDescription className="text-[11px] mt-0.5">{error}</AlertDescription>
                  </Alert>
                )}
              </CardContent>

              {/* Sidebar Action Footer */}
              <div className="p-3 bg-slate-50/50 dark:bg-slate-900/50 border-t flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset
                </Button>
                <Btn
                  type="submit"
                  size="sm"
                  disabled={updateMutation.isPending}
                  className="h-8 px-4 text-xs font-bold rounded-md"
                  label={updateMutation.isPending ? 'Saving...' : 'Save Driver'}
                  icon={<Save className="w-3.5 h-3.5" />}
                />
              </div>
            </Card>
          </div>

          {/* Right Column: Tabbed Edit Workspace (8 cols) */}
          <div className="lg:col-span-8">
            <Card className="rounded-xl border border-border shadow-sm bg-white dark:bg-card">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <CardHeader className="border-b px-5 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-sm font-bold text-foreground">Driver Credentials & Settings</CardTitle>
                      <CardDescription className="text-xs text-muted-foreground">
                        Manage contact info, status, license credentials, and assigned vehicle.
                      </CardDescription>
                    </div>

                    <TabsList className="bg-slate-100 dark:bg-slate-800/80 p-1 h-9">
                      <TabsTrigger value="general" className="text-xs font-semibold gap-1.5 px-3">
                        <User className="w-3.5 h-3.5" /> General
                      </TabsTrigger>
                      <TabsTrigger value="licensing" className="text-xs font-semibold gap-1.5 px-3">
                        <IdCard className="w-3.5 h-3.5" /> Licensing
                      </TabsTrigger>
                      <TabsTrigger value="vehicle" className="text-xs font-semibold gap-1.5 px-3">
                        <Truck className="w-3.5 h-3.5" /> Vehicle
                      </TabsTrigger>
                    </TabsList>
                  </div>
                </CardHeader>

                <CardContent className="p-6">
                  
                  {/* TAB 1: General & Contact Information */}
                  <TabsContent value="general" className="mt-0 space-y-5 focus-visible:outline-none">
                    <div className="flex items-center gap-2 border-b pb-2">
                      <User className="w-4 h-4 text-brand" />
                      <h3 className="text-xs font-bold uppercase tracking-wide text-foreground">
                        Personal & Operational Details
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
                          Primary Phone Number <span className="text-destructive">*</span>
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
                          onChange={(e) => handleChange('status', e.target.value as DriverStatus)}
                          className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs font-medium text-foreground focus:border-brand focus:outline-none transition-colors"
                        >
                          <option value="Available">Available</option>
                          <option value="OnTrip">On Trip</option>
                          <option value="OffDuty">Off Duty</option>
                          <option value="Inactive">Inactive</option>
                        </select>
                      </div>
                    </div>

                    <div className="pt-3 flex justify-end">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setActiveTab('licensing')}
                        className="h-8 text-xs font-semibold gap-1.5"
                      >
                        Next: Licensing <IdCard className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TabsContent>

                  {/* TAB 2: Licensing & Compliance */}
                  <TabsContent value="licensing" className="mt-0 space-y-5 focus-visible:outline-none">
                    <div className="flex items-center gap-2 border-b pb-2">
                      <IdCard className="w-4 h-4 text-brand" />
                      <h3 className="text-xs font-bold uppercase tracking-wide text-foreground">
                        Driving License Credentials
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

                    {/* Expiry Status Alert Banner */}
                    {daysUntilExpiry !== null && (
                      <div
                        className={`p-3.5 rounded-xl border flex items-center gap-3 text-xs ${
                          daysUntilExpiry < 0
                            ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                            : daysUntilExpiry < 30
                            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'
                            : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                        }`}
                      >
                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                        <div>
                          <p className="font-bold">
                            {daysUntilExpiry < 0
                              ? 'License Expired'
                              : daysUntilExpiry < 30
                              ? 'License Expiring Soon'
                              : 'License Compliant & Active'}
                          </p>
                          <p className="text-[11px] opacity-90">
                            {daysUntilExpiry < 0
                              ? `Expired ${Math.abs(daysUntilExpiry)} days ago. Please renew license immediately to assign trips.`
                              : daysUntilExpiry < 30
                              ? `License expires in ${daysUntilExpiry} days. Schedule renewal.`
                              : `Driving license is verified valid until ${formData.license_expiry}.`}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="pt-3 flex justify-between">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveTab('general')}
                        className="h-8 text-xs font-semibold"
                      >
                        Back: General
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setActiveTab('vehicle')}
                        className="h-8 text-xs font-semibold gap-1.5"
                      >
                        Next: Vehicle <Truck className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TabsContent>

                  {/* TAB 3: Vehicle Assignment */}
                  <TabsContent value="vehicle" className="mt-0 space-y-5 focus-visible:outline-none">
                    <div className="flex items-center gap-2 border-b pb-2">
                      <Truck className="w-4 h-4 text-brand" />
                      <h3 className="text-xs font-bold uppercase tracking-wide text-foreground">
                        Default Vehicle Assignment
                      </h3>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="assigned_vehicle_id" className="text-xs font-semibold flex items-center justify-between">
                          <span>Select Assigned Fleet Vehicle</span>
                          <button
                            type="button"
                            onClick={() => setIsAddVehicleOpen(true)}
                            className="text-xs text-brand font-bold hover:underline flex items-center gap-1"
                          >
                            + Create New Vehicle
                          </button>
                        </Label>
                        <Combobox
                          id="assigned_vehicle_id"
                          value={formData.assigned_vehicle_id}
                          onChange={(val) => handleChange('assigned_vehicle_id', val)}
                          options={vehicleOptions}
                          placeholder="No vehicle assigned (Unassigned)..."
                          searchPlaceholder="Search by plate number or asset type..."
                          emptyText="No matching vehicles found."
                          onAddNew={() => setIsAddVehicleOpen(true)}
                          addNewLabel="Add New Vehicle"
                        />
                      </div>

                      {/* Selected Vehicle Card Preview */}
                      {selectedVehicle ? (
                        <div className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-900 bg-indigo-50/40 dark:bg-indigo-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
                              <Truck className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold font-mono text-slate-900 dark:text-slate-100">
                                  {selectedVehicle.plate_number}
                                </span>
                                <Badge variant="outline" className="text-[10px] bg-white dark:bg-slate-900 font-semibold">
                                  {selectedVehicle.asset_type}
                                </Badge>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">
                                Capacity: {selectedVehicle.capacity_kg.toLocaleString()} kg • Status: {selectedVehicle.status}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/vehicles/${selectedVehicle.id}`)}
                              className="h-8 text-xs gap-1"
                            >
                              <ExternalLink className="w-3 h-3" /> Details
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleChange('assigned_vehicle_id', '')}
                              className="h-8 text-xs gap-1 text-rose-600 hover:bg-rose-50 border-rose-200"
                            >
                              <Unlink className="w-3.5 h-3.5" /> Unassign
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-1 bg-slate-50/50 dark:bg-slate-900/40">
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            No default vehicle assigned
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Assigning a default vehicle speeds up trip dispatching for this driver.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 flex justify-between">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveTab('licensing')}
                        className="h-8 text-xs font-semibold"
                      >
                        Back: Licensing
                      </Button>
                      <Btn
                        type="submit"
                        size="sm"
                        disabled={updateMutation.isPending}
                        className="h-8 px-5 text-xs font-bold rounded-md"
                        label={updateMutation.isPending ? 'Saving...' : 'Save All Changes'}
                        icon={<Save className="w-3.5 h-3.5" />}
                      />
                    </div>
                  </TabsContent>

                </CardContent>
              </Tabs>
            </Card>
          </div>

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
