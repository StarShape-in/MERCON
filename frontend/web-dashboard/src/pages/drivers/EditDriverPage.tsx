import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  User,
  Phone,
  Truck,
  RotateCcw,
  Plus,
  ShieldCheck,
  AlertCircle,
  Eye,
  FileText,
  UploadCloud,
  X,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Mail,
  CreditCard,
  Calendar,
  MapPin,
  Fingerprint,
  Car,
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import CreateVehicleModal from '@/components/trips/CreateVehicleModal';
import { driverService, DriverStatus } from '@/services/driverService';
import { vehicleService, Vehicle } from '@/services/vehicleService';
import { Card, CardContent } from '@/components/ui/card';
import PhoneInput from '@/components/ui/PhoneInput';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Combobox } from '@/components/ui/combobox';
import StatusBadge from '@/components/ui/StatusBadge';
import DriverImageUploader from '@/components/ui/DriverImageUploader';
import { cn } from '@/lib/utils';

export interface DriverDocumentFile {
  id: string;
  name: string;
  size: string;
  type: string;
}

export default function EditDriverPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [error, setError] = useState<string | null>(null);
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);
  const [files, setFiles] = useState<DriverDocumentFile[]>([]);

  // Fetch driver data
  const { data: driver, isLoading } = useQuery({
    queryKey: ['driver', id],
    queryFn: () => driverService.getById(id!),
    enabled: !!id,
  });

  // Fetch vehicles for assignment selector
  const { data: vehiclesRes, refetch: refetchVehicles } = useQuery({
    queryKey: ['vehicles-select'],
    queryFn: () => vehicleService.getAll({ per_page: 200, mode: 'lookup' }),
  });

  const vehicles = vehiclesRes?.data || [];
  const vehicleOptions = vehicles.map((v) => ({
    value: v.id,
    label: `${v.plate_number} (${v.asset_type} • ${v.capacity_kg ? `${v.capacity_kg.toLocaleString()} kg` : 'N/A'})`,
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
        license_expiry: driver.license_expiry
          ? new Date(driver.license_expiry).toISOString().split('T')[0]
          : '',
        status: driver.status || 'Available',
        assigned_vehicle_id: driver.assignedVehicleId || '',
        avatar_url: driver.avatar_url || null,
      });
    }
  }, [driver]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const uploadedFiles = Array.from(e.target.files).map((f, i) => ({
        id: String(Date.now() + i),
        name: f.name,
        size: (f.size / 1024).toFixed(1) + ' KB',
        type: f.type || 'Document',
      }));
      setFiles((prev) => [...prev, ...uploadedFiles]);
    }
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleReset = () => {
    if (driver) {
      setFormData({
        first_name: driver.first_name || '',
        last_name: driver.last_name || '',
        phone_primary: driver.phone_primary || '',
        license_number: driver.license_number || '',
        license_expiry: driver.license_expiry
          ? new Date(driver.license_expiry).toISOString().split('T')[0]
          : '',
        status: driver.status || 'Available',
        assigned_vehicle_id: driver.assignedVehicleId || '',
        avatar_url: driver.avatar_url || null,
      });
      setFiles([]);
      setError(null);
      toast.info('Form reset to original values');
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

  const validateSaudiPhone = (phone: string) => {
    const clean = phone.replace(/[\s-]/g, '');
    return /^(\+966|00966|0)?5\d{8}$/.test(clean);
  };

  const validateSaudiLicense = (license: string) => {
    return /^[12]\d{9}$/.test(license.trim());
  };

  const isExpiryValid = formData.license_expiry ? new Date(formData.license_expiry) > new Date() : false;
  const isExpired = formData.license_expiry !== '' && !isExpiryValid;
  const isPhoneValid = validateSaudiPhone(formData.phone_primary);
  const isLicenseValid = validateSaudiLicense(formData.license_number);

  const isFormValid =
    formData.first_name.trim() !== '' &&
    formData.last_name.trim() !== '' &&
    isPhoneValid &&
    isLicenseValid &&
    formData.license_expiry !== '' &&
    isExpiryValid;

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);

    if (!formData.first_name.trim()) return setError('First name is required.');
    if (!formData.last_name.trim()) return setError('Last name is required.');
    if (!formData.phone_primary.trim()) return setError('Primary phone number is required.');
    if (!isPhoneValid) return setError('Invalid Saudi phone number. Must start with 5 and be exactly 9 digits.');
    if (!formData.license_number.trim()) return setError('License number is required.');
    if (!isLicenseValid)
      return setError('Invalid Saudi ID/Iqama/License. Must be exactly 10 digits starting with 1 or 2.');
    if (!formData.license_expiry || Number.isNaN(new Date(formData.license_expiry).getTime())) {
      setError('License Expiry is required and must be a valid date.');
      return;
    }
    if (!isExpiryValid) {
      setError('License is already expired. Driver must have a future-dated valid license.');
      return;
    }
    if (!id) return;

    updateMutation.mutate({
      ...formData,
      assigned_vehicle_id: formData.assigned_vehicle_id || null,
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout active="Drivers" title="Edit Driver">
        <div className="p-12 flex flex-col items-center justify-center gap-3">
          <div className="h-8 w-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-muted-foreground font-medium">Loading driver profile...</p>
        </div>
      </DashboardLayout>
    );
  }

  const driverFullName = driver ? `${driver.first_name} ${driver.last_name}` : 'Driver Profile';
  const selectedVehicle = vehicles.find((v) => v.id === formData.assigned_vehicle_id);

  // Completion Tracking
  const completionFields = [
    { label: 'First Name', filled: formData.first_name.trim() !== '' },
    { label: 'Last Name', filled: formData.last_name.trim() !== '' },
    { label: 'Phone Number', filled: isPhoneValid },
    { label: 'License Number', filled: isLicenseValid },
    { label: 'License Expiry', filled: formData.license_expiry !== '' && isExpiryValid },
  ];
  const filledCount = completionFields.filter((f) => f.filled).length;
  const completionPct = Math.round((filledCount / completionFields.length) * 100);

  const getStatusColor = (status: DriverStatus) => {
    switch (status) {
      case 'Available': return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400';
      case 'OnTrip': return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400';
      case 'OffDuty': return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400';
      case 'Inactive': return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <DashboardLayout active="Drivers" title={`Edit: ${driverFullName}`}>
      <div className="px-4 sm:px-6 pb-6 pt-1 space-y-4 animate-fade-in max-w-[1200px] mx-auto">

        {/* ── Slim Page Header ── */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/drivers/${id}`)}
              className="h-8 w-8 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:bg-slate-100 shrink-0"
            >
              <ArrowLeft className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-base font-black text-[#3E3C3D] dark:text-white tracking-tight truncate">
                Edit Driver
              </h1>
              <p className="text-[11px] text-slate-400 font-mono font-medium leading-none mt-0.5">
                {driver?.ref_id || id?.slice(0, 8)} · {driverFullName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-8 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 px-2.5 gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/drivers/${id}`)}
              className="h-8 text-xs font-medium border-slate-200 dark:border-slate-800 px-3"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={updateMutation.isPending || !isFormValid}
              className="h-8 text-xs bg-[#FA634E] hover:bg-[#e8533e] text-white font-bold px-4 shadow-xs"
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        {/* ── 2-Column Layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">

          {/* ── Main Form (8 cols) ── */}
          <div className="lg:col-span-8 space-y-3">

            {/* Section 1: Personal Profile & Photo */}
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs">
              <CardContent className="p-4 sm:p-5 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="w-7 h-7 rounded-lg bg-[#3E3C3D] dark:bg-slate-800 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-[#FA634E]" />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-[#3E3C3D] dark:text-slate-200">
                      Personal Details
                    </h2>
                  </div>
                  <span className="ml-auto text-[10px] text-slate-400 font-mono">* Required</span>
                </div>

                {/* Driver Photo Upload Block (Top Full-Width Header inside Card) */}
                <div className="w-full">
                  <DriverImageUploader
                    value={formData.avatar_url}
                    onChange={(url) => handleChange('avatar_url', url)}
                    firstName={formData.first_name}
                    lastName={formData.last_name}
                  />
                </div>

                {/* Form Fields: Clean Full-Width 2-Column Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  {/* First Name */}
                  <div className="space-y-1.5">
                    <Label htmlFor="first_name" className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      First Name <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="first_name"
                      placeholder="e.g. Ahmed"
                      value={formData.first_name}
                      onChange={(e) => handleChange('first_name', e.target.value)}
                      className="h-10 text-sm font-medium rounded-xl border-slate-200 dark:border-slate-800 px-3.5 focus-visible:ring-1 focus-visible:ring-[#FA634E]"
                    />
                  </div>

                  {/* Last Name */}
                  <div className="space-y-1.5">
                    <Label htmlFor="last_name" className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Last Name <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="last_name"
                      placeholder="e.g. Al-Mansoor"
                      value={formData.last_name}
                      onChange={(e) => handleChange('last_name', e.target.value)}
                      className="h-10 text-sm font-medium rounded-xl border-slate-200 dark:border-slate-800 px-3.5 focus-visible:ring-1 focus-visible:ring-[#FA634E]"
                    />
                  </div>

                  {/* Primary Phone */}
                  <div className="space-y-1.5">
                    <Label htmlFor="phone_primary" className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      Primary Phone Number <span className="text-rose-500">*</span>
                    </Label>
                    <PhoneInput
                      id="phone_primary"
                      value={formData.phone_primary}
                      onChange={(val) => handleChange('phone_primary', val)}
                      placeholder="50 000 0000"
                      className="rounded-xl border-slate-200 dark:border-slate-800 h-10"
                    />
                    {formData.phone_primary.trim() !== '' && !isPhoneValid && (
                      <p className="text-[10px] text-rose-500 font-semibold mt-0.5">
                        Must start with 5 and be exactly 9 digits.
                      </p>
                    )}
                  </div>

                  {/* Operational Status */}
                  <div className="space-y-1.5">
                    <Label htmlFor="status" className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Operational Status
                    </Label>
                    <Select
                      value={formData.status}
                      onValueChange={(val: DriverStatus) => handleChange('status', val)}
                    >
                      <SelectTrigger id="status" className="h-10 text-sm font-medium rounded-xl border-slate-200 dark:border-slate-800 px-3.5">
                        <SelectValue placeholder="Select status..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Available" className="text-sm font-medium">Available (On Roster)</SelectItem>
                        <SelectItem value="OnTrip" className="text-sm font-medium">On Trip (Active)</SelectItem>
                        <SelectItem value="OffDuty" className="text-sm font-medium">Off Duty (Rest / Leave)</SelectItem>
                        <SelectItem value="Inactive" className="text-sm font-medium">Inactive (Decommissioned)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 2: Commercial Driving License */}
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs">
              <CardContent className="p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-500" />
                    </div>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-[#3E3C3D] dark:text-slate-200">
                      Commercial Driving License
                    </h2>
                  </div>
                  {formData.license_expiry && (
                    <span
                      className={cn(
                        'text-[10px] font-bold px-2 py-0.5 rounded-full border inline-flex items-center gap-1',
                        isExpiryValid
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
                      )}
                    >
                      {isExpiryValid ? (
                        <><CheckCircle2 className="w-3 h-3" /><span>Valid</span></>
                      ) : (
                        <><AlertTriangle className="w-3 h-3" /><span>Expired</span></>
                      )}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="license_number" className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Fingerprint className="w-3.5 h-3.5 text-slate-400" />
                      Saudi License / Iqama ID <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="license_number"
                      type="text"
                      placeholder="e.g. 1012345678"
                      value={formData.license_number}
                      onChange={(e) => handleChange('license_number', e.target.value)}
                      className="h-10 text-sm font-mono font-medium rounded-xl border-slate-200 dark:border-slate-800 px-3.5 focus-visible:ring-1 focus-visible:ring-[#FA634E]"
                    />
                    {formData.license_number.trim() !== '' && !isLicenseValid && (
                      <p className="text-[10px] text-rose-500 font-semibold mt-0.5">
                        Must be exactly 10 digits starting with 1 or 2.
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="license_expiry" className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      License Expiry Date <span className="text-rose-500">*</span>
                    </Label>
                    <DatePicker
                      id="license_expiry"
                      value={formData.license_expiry}
                      onChange={(_, dateStr) => handleChange('license_expiry', dateStr)}
                      placeholder="Select expiry date..."
                      error={isExpired}
                      minDate={new Date()}
                      buttonClassName="h-10 text-sm font-medium rounded-xl border-slate-200 dark:border-slate-800 px-3.5"
                    />
                    {isExpired && (
                      <p className="text-[10px] text-rose-500 font-semibold mt-0.5">
                        License is expired — choose a future date.
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 3: Vehicle Assignment */}
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs">
              <CardContent className="p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#FA634E]/10 flex items-center justify-center">
                      <Truck className="w-3.5 h-3.5 text-[#FA634E]" />
                    </div>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-[#3E3C3D] dark:text-slate-200">
                      Default Vehicle Assignment
                    </h2>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setIsAddVehicleOpen(true)}
                    className="h-7 text-[10px] font-bold bg-slate-800 hover:bg-slate-900 text-white rounded-lg px-2.5 gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    New Vehicle
                  </Button>
                </div>

                <div className="space-y-1.5">
                  <Combobox
                    id="assigned_vehicle_id"
                    value={formData.assigned_vehicle_id}
                    onChange={(val) => handleChange('assigned_vehicle_id', val)}
                    options={[
                      { value: '', label: '— No default vehicle (Float Driver) —' },
                      ...vehicleOptions,
                    ]}
                    placeholder="Select default vehicle (optional)..."
                    searchPlaceholder="Search by plate number or type..."
                    emptyText="No vehicles found."
                    onAddNew={() => setIsAddVehicleOpen(true)}
                    addNewLabel="Add New Vehicle"
                    triggerClassName="h-10 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-sm font-medium w-full px-3.5"
                  />
                  <p className="text-[10px] text-slate-400">
                    Pre-fills automatically when this driver is assigned to a trip.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Section 4: Documents */}
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs">
              <CardContent className="p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center">
                      <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-500" />
                    </div>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-[#3E3C3D] dark:text-slate-200">
                      Driver Documents
                    </h2>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">Iqama / ID Copy, License Copy</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                  <label className="sm:col-span-4 border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-[#FA634E] dark:hover:border-[#FA634E] rounded-xl p-4 text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-900/50 block group">
                    <input type="file" multiple onChange={handleFileUpload} className="hidden" accept=".pdf,.png,.jpg,.jpeg" />
                    <UploadCloud className="w-5 h-5 mx-auto text-slate-300 group-hover:text-[#FA634E] mb-1.5 transition-colors" />
                    <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 group-hover:text-slate-800">
                      Upload Documents
                    </p>
                    <p className="text-[9px] text-slate-400 mt-0.5">PDF, PNG, JPG · Max 10 MB</p>
                  </label>

                  <div className="sm:col-span-8 space-y-1.5 min-h-[80px]">
                    {files.length === 0 ? (
                      <div className="h-full min-h-[80px] flex items-center justify-center border border-slate-100 dark:border-slate-800 rounded-xl text-[10px] text-slate-400 italic">
                        No documents attached yet
                      </div>
                    ) : (
                      files.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between p-2 px-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200/60 dark:border-slate-700/60"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-3.5 h-3.5 text-[#FA634E] shrink-0" />
                            <span className="truncate text-[11px] font-medium text-slate-800 dark:text-slate-200">{file.name}</span>
                            <span className="text-[9px] text-slate-400 font-mono shrink-0">({file.size})</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(file.id)}
                            className="text-slate-400 hover:text-rose-500 p-0.5 ml-2 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Error Banner */}
            {error && (
              <div className="p-3 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 rounded-xl text-xs font-semibold border border-rose-200 dark:border-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* ── Right Sidebar (4 cols) ── */}
          <div className="lg:col-span-4 space-y-3 lg:sticky lg:top-4">

            {/* Driver Summary Card */}
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs overflow-hidden">
              {/* Card top accent */}
              <div className="h-1 bg-gradient-to-r from-[#FA634E] to-[#3E3C3D]" />
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Driver Summary</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] font-bold border px-2 py-0.5',
                      completionPct === 100
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40'
                        : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40'
                    )}
                  >
                    {completionPct}% Complete
                  </Badge>
                </div>

                {/* Avatar + Name */}
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-sm text-slate-700 dark:text-slate-300 border-2 border-slate-200 dark:border-slate-700 overflow-hidden shrink-0">
                    {formData.avatar_url ? (
                      <img src={formData.avatar_url} alt="Driver" className="w-full h-full object-cover" />
                    ) : (
                      `${formData.first_name[0] || 'D'}${formData.last_name[0] || 'R'}`
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-slate-900 dark:text-slate-100 truncate leading-tight">
                      {formData.first_name || formData.last_name
                        ? `${formData.first_name} ${formData.last_name}`.trim()
                        : 'Driver Name'}
                    </p>
                    <div className="mt-0.5">
                      <span
                        className={cn(
                          'inline-flex items-center text-[9px] font-bold px-2 py-0.5 rounded-full border',
                          getStatusColor(formData.status)
                        )}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current mr-1 opacity-70" />
                        {formData.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Info Rows */}
                <div className="space-y-2 pt-1">
                  {/* Phone */}
                  <div className="flex items-center justify-between gap-2 py-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      <Phone className="w-3 h-3" />
                      Phone
                    </span>
                    <span className="text-[11px] font-mono font-bold text-slate-800 dark:text-slate-200 truncate">
                      {formData.phone_primary
                        ? `+966 ${formData.phone_primary.replace(/^(\+966|00966|0)/, '').replace(/[\s-]/g, '')}`
                        : <span className="text-slate-400 italic font-normal">Not set</span>}
                    </span>
                  </div>

                  {/* License */}
                  <div className="flex items-center justify-between gap-2 py-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      <CreditCard className="w-3 h-3" />
                      License
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-mono font-bold text-slate-800 dark:text-slate-200 truncate">
                        {formData.license_number || <span className="text-slate-400 italic font-normal">Not set</span>}
                      </span>
                      {formData.license_expiry && (
                        <span
                          className={cn(
                            'text-[9px] font-bold px-1.5 py-0.5 rounded-full',
                            isExpiryValid
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60'
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60'
                          )}
                        >
                          {isExpiryValid ? 'Valid' : 'Expired'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Expiry */}
                  {formData.license_expiry && (
                    <div className="flex items-center justify-between gap-2 py-2 border-t border-slate-100 dark:border-slate-800">
                      <span className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        <Calendar className="w-3 h-3" />
                        Expiry
                      </span>
                      <span className="text-[11px] font-mono font-bold text-slate-800 dark:text-slate-200">
                        {new Date(formData.license_expiry).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  )}

                  {/* Vehicle */}
                  <div className="flex items-center justify-between gap-2 py-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      <Car className="w-3 h-3" />
                      Vehicle
                    </span>
                    <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate text-right max-w-[130px]">
                      {selectedVehicle
                        ? selectedVehicle.plate_number
                        : <span className="text-slate-400 italic font-normal">Float Driver</span>}
                    </span>
                  </div>

                  {/* Documents */}
                  <div className="flex items-center justify-between gap-2 py-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      <FileText className="w-3 h-3" />
                      Documents
                    </span>
                    <Badge variant="secondary" className="text-[9px] font-bold px-2 py-0.5 h-5">
                      {files.length} {files.length === 1 ? 'File' : 'Files'}
                    </Badge>
                  </div>
                </div>

                {/* Progress Strip */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="flex justify-between text-[10px] font-semibold text-slate-500">
                    <span>Required Fields</span>
                    <span className={filledCount === completionFields.length ? 'text-emerald-600' : ''}>
                      {filledCount} / {completionFields.length}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full transition-all duration-300 rounded-full',
                        completionPct === 100 ? 'bg-emerald-500' : 'bg-[#FA634E]'
                      )}
                      style={{ width: `${completionPct}%` }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {completionFields.map((f) => (
                      <span
                        key={f.label}
                        className={cn(
                          'inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full',
                          f.filled
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40'
                            : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                        )}
                      >
                        {f.filled ? <CheckCircle2 className="w-2.5 h-2.5" /> : <AlertCircle className="w-2.5 h-2.5" />}
                        {f.label}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Save Button */}
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={updateMutation.isPending || !isFormValid}
                  className="w-full h-9 text-xs bg-[#FA634E] hover:bg-[#e8533e] text-white font-black shadow-xs mt-1"
                >
                  {updateMutation.isPending ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/drivers/${id}`)}
                  className="w-full h-7 text-xs text-slate-500 hover:text-slate-700"
                >
                  View Driver Profile
                </Button>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>

      {/* Modal: Create new vehicle on-the-fly */}
      <CreateVehicleModal
        isOpen={isAddVehicleOpen}
        onClose={() => setIsAddVehicleOpen(false)}
        onCreated={handleVehicleCreated}
      />
    </DashboardLayout>
  );
}
