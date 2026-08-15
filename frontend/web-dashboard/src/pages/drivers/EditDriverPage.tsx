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
  CheckCircle2,
  Circle,
  ShieldCheck,
  AlertTriangle,
  Eye,
  HelpCircle,
  Building2,
  Sparkles,
  Clock,
  IdCard,
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { driverService, DriverStatus } from '@/services/driverService';
import { vehicleService } from '@/services/vehicleService';
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
import { cn } from '@/lib/utils';

export default function EditDriverPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [error, setError] = useState<string | null>(null);
  const [showHelpGuide, setShowHelpGuide] = useState(true);

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
      toast.info('Form reset to saved driver values');
    }
  };

  const updateMutation = useMutation({
    mutationFn: (payload: any) => driverService.update(id!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver', id] });
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast.success('Driver profile updated successfully');
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

  // License compliance calculations
  const getDaysUntilExpiry = (expiryDate: string) => {
    if (!expiryDate) return 0;
    const exp = new Date(expiryDate);
    if (isNaN(exp.getTime())) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = exp.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const daysUntilExpiry = getDaysUntilExpiry(formData.license_expiry);
  const isExpired = formData.license_expiry !== '' && daysUntilExpiry <= 0;
  const isExpiringSoon = formData.license_expiry !== '' && daysUntilExpiry > 0 && daysUntilExpiry <= 30;

  // Assigned vehicle lookup
  const assignedVehicle = vehicles.find((v) => v.id === formData.assigned_vehicle_id) || driver?.assignedVehicle;

  // Live checklist items
  const checklist = [
    {
      label: 'Driver Name',
      value: `${formData.first_name} ${formData.last_name}`.trim(),
      done: formData.first_name.trim() !== '' && formData.last_name.trim() !== '',
      icon: User,
      hint: 'First and last name required',
    },
    {
      label: 'Primary Phone',
      value: formData.phone_primary.trim(),
      done: formData.phone_primary.trim() !== '',
      icon: Phone,
      hint: 'Saudi mobile contact',
    },
    {
      label: 'License Number',
      value: formData.license_number.trim(),
      done: formData.license_number.trim() !== '',
      icon: FileText,
      hint: 'Valid Saudi driver license ID',
    },
    {
      label: 'License Expiry',
      value: formData.license_expiry,
      done: formData.license_expiry !== '' && !isExpired,
      icon: Calendar,
      hint: isExpired ? 'Expired license!' : isExpiringSoon ? 'Expiring soon!' : 'Valid future-dated expiry',
    },
    {
      label: 'Vehicle Assignment',
      value: assignedVehicle ? assignedVehicle.plate_number : 'Optional',
      done: !!formData.assigned_vehicle_id,
      icon: Truck,
      hint: assignedVehicle ? `Plate ${assignedVehicle.plate_number}` : 'No default vehicle assigned',
    },
  ];

  const completedCount = checklist.filter((item) => item.done).length;
  const completionPercentage = Math.round((completedCount / checklist.length) * 100);

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
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 pb-8 space-y-6 animate-fade-in">
        
        {/* Module Header Bar & Scope Selector Pill */}
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

          <button
            type="button"
            onClick={() => setShowHelpGuide(!showHelpGuide)}
            className="flex items-center gap-1.5 text-xs text-brand font-semibold hover:underline"
          >
            <HelpCircle size={14} />
            {showHelpGuide ? 'Hide Operational Guide' : 'Driver Editing Guide'}
          </button>
        </div>

        {/* Operational Guidance Callout */}
        {showHelpGuide && (
          <div className="bg-gradient-to-br from-indigo-50/80 via-purple-50/40 to-white dark:from-slate-900 dark:via-slate-900/90 dark:to-card rounded-xl p-5 border border-indigo-200/80 dark:border-indigo-900/50 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 rounded-lg shrink-0 mt-0.5">
                <Sparkles size={18} />
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Managing & Updating Driver Profiles
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Driver profile records sync across the <strong>MERCON Web Dashboard</strong> and the <strong>Driver Mobile App</strong>. Keeping phone numbers, status badges, and license expiry dates up to date ensures seamless trip dispatching, automated compliance warnings, and SMS push alerts.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 4-Column Instrument-Panel KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Roster Status */}
          <Card className="rounded-xl p-4 border bg-card shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Roster Status</span>
              <div className="p-2 rounded-lg bg-brand/10 text-brand">
                <User size={16} />
              </div>
            </div>
            <div className="mt-2.5 flex items-center gap-2">
              <StatusBadge status={formData.status} />
            </div>
            <div className="mt-2 text-[11px] text-muted-foreground flex items-center gap-1">
              <Clock size={12} className="text-brand shrink-0" />
              <span>Mobile app dispatch status</span>
            </div>
          </Card>

          {/* Card 2: License Compliance */}
          <Card className="rounded-xl p-4 border bg-card shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">License Compliance</span>
              <div className={cn(
                "p-2 rounded-lg",
                isExpired ? "bg-rose-500/10 text-rose-600" : isExpiringSoon ? "bg-amber-500/10 text-amber-600" : "bg-emerald-500/10 text-emerald-600"
              )}>
                <ShieldCheck size={16} />
              </div>
            </div>
            <div className="mt-2 text-sm font-black text-foreground truncate">
              {formData.license_expiry ? formData.license_expiry : 'Not Specified'}
            </div>
            <div className="mt-1 text-[11px] font-medium">
              {isExpired ? (
                <span className="text-rose-600 font-bold flex items-center gap-1"><AlertTriangle size={12} /> License Expired</span>
              ) : isExpiringSoon ? (
                <span className="text-amber-600 font-bold flex items-center gap-1"><Clock size={12} /> Expiring in {daysUntilExpiry} days</span>
              ) : (
                <span className="text-emerald-600 font-bold flex items-center gap-1"><CheckCircle2 size={12} /> Valid ({daysUntilExpiry} days left)</span>
              )}
            </div>
          </Card>

          {/* Card 3: Assigned Vehicle */}
          <Card className="rounded-xl p-4 border bg-card shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Assigned Vehicle</span>
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600">
                <Truck size={16} />
              </div>
            </div>
            <div className="mt-2 text-sm font-black text-foreground truncate">
              {assignedVehicle ? assignedVehicle.plate_number : 'Unassigned'}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground truncate">
              {assignedVehicle ? `${assignedVehicle.asset_type} • ${assignedVehicle.capacity_kg?.toLocaleString() || 0} kg` : 'No default vehicle linked'}
            </div>
          </Card>

          {/* Card 4: Profile Health */}
          <Card className="rounded-xl p-4 border bg-card shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Profile Completeness</span>
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                <Sparkles size={16} />
              </div>
            </div>
            <div className="mt-2 text-sm font-black text-foreground">
              {completionPercentage}% Complete
            </div>
            <div className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden border">
                <div className="bg-brand h-full rounded-full transition-all duration-300" style={{ width: `${completionPercentage}%` }} />
              </div>
            </div>
          </Card>

        </div>

        {/* Main Edit Form Workspace */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3 items-start">
            
            {/* Form Fields Column */}
            <Card className="lg:col-span-2 rounded-xl shadow-sm border border-border">
              <CardHeader className="border-b px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold text-foreground">Driver Information</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground mt-0.5">
                      Update personal contact information, operational status, and license credentials.
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-xs font-semibold">
                    ID: {id?.slice(0, 8)}...
                  </Badge>
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
                      <p className="text-[10px] text-muted-foreground">Saudi mobile number (+966)</p>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="status" className="text-xs font-semibold flex items-center gap-1">
                        Operational Roster Status
                      </Label>
                      <select
                        id="status"
                        value={formData.status}
                        onChange={(e) => handleChange('status', e.target.value)}
                        className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs font-medium text-foreground focus:border-brand focus:outline-none transition-colors"
                      >
                        <option value="Available">Available — Ready for Dispatch</option>
                        <option value="OnTrip">On Trip — Currently Active on Shipment</option>
                        <option value="OffDuty">Off Duty — On Break or Shift Off</option>
                        <option value="Inactive">Inactive — Deactivated from Roster</option>
                      </select>
                      <p className="text-[10px] text-muted-foreground">Controls availability in dispatch picker</p>
                    </div>
                  </div>
                </section>

                <Separator />

                {/* Section 2: Licensing & Compliance */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 border-b pb-2">
                    <IdCard className="w-4 h-4 text-brand" />
                    <h3 className="text-xs font-bold uppercase tracking-wide text-foreground">
                      Licensing & Regulatory Compliance
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
                      {isExpired && (
                        <p className="text-[10px] text-rose-600 font-bold flex items-center gap-1 mt-1">
                          <AlertTriangle size={11} /> Saudi Transport Regulations require a valid future license date.
                        </p>
                      )}
                      {isExpiringSoon && (
                        <p className="text-[10px] text-amber-600 font-bold flex items-center gap-1 mt-1">
                          <Clock size={11} /> License expires in {daysUntilExpiry} days. Plan renewal soon.
                        </p>
                      )}
                    </div>
                  </div>
                </section>

                <Separator />

                {/* Section 3: Default Vehicle Assignment */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 border-b pb-2">
                    <Truck className="w-4 h-4 text-brand" />
                    <h3 className="text-xs font-bold uppercase tracking-wide text-foreground">
                      Default Vehicle Roster Assignment
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
                        searchPlaceholder="Search vehicle plate or type..."
                        emptyText="No vehicles found."
                      />
                      <p className="text-[10px] text-muted-foreground">Pre-filled automatically when dispatching new trips.</p>
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
                    <AlertTitle className="text-xs font-bold">Error Updating Driver</AlertTitle>
                    <AlertDescription className="text-xs">{error}</AlertDescription>
                  </Alert>
                )}

              </CardContent>

              <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-t bg-slate-50/50 dark:bg-slate-900/50 rounded-b-xl">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Press <kbd className="px-1.5 py-0.5 bg-black/5 dark:bg-white/10 rounded text-[10px] font-mono">Ctrl + Enter</kbd> to save</span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleReset}
                    className="h-9 text-xs gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Reset Form
                  </Button>
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
                    label={updateMutation.isPending ? 'Saving Driver...' : 'Save Driver Changes'}
                    icon={<Save className="w-3.5 h-3.5" />}
                    shortcut={{ key: 'Enter', metaOrControl: true }}
                  />
                </div>
              </div>

            </Card>

            {/* Live Profile Audit & Roster Sidebar */}
            <div className="space-y-6">
              
              {/* Audit Checklist Card */}
              <Card className="rounded-xl border shadow-sm p-4 space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-brand" /> Live Profile Audit
                  </h3>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] font-bold px-2 py-0.5",
                      completedCount === checklist.length ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"
                    )}
                  >
                    {completedCount} / {checklist.length} Passed
                  </Badge>
                </div>

                <div className="space-y-3">
                  {checklist.map((item, idx) => {
                    const ItemIcon = item.icon;
                    return (
                      <div key={idx} className="flex items-start gap-2.5 text-xs">
                        {item.done ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0 mt-0.5" />
                        )}
                        <div className="min-w-0">
                          <div className="font-semibold text-foreground flex items-center gap-1">
                            <ItemIcon className="w-3 h-3 text-muted-foreground" />
                            {item.label}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {item.value || <span className="italic opacity-75">{item.hint}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Separator />

                <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg border border-slate-200/80 dark:border-slate-800 text-[11px] text-muted-foreground space-y-1">
                  <p className="font-semibold text-foreground flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-brand" /> Driver Credentials Note
                  </p>
                  <p className="leading-relaxed">
                    Driver updates apply immediately across active dispatch boards. Driver mobile app login uses the primary phone number.
                  </p>
                </div>
              </Card>

            </div>

          </div>
        </form>

      </div>
    </DashboardLayout>
  );
}
