import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { User, IdCard, Calendar, Phone, Loader2 } from 'lucide-react';
import { driverService, Driver, DriverStatus } from '@/services/driverService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import PhoneInput from '@/components/ui/PhoneInput';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface EditDriverModalProps {
  isOpen: boolean;
  driver: Driver | null;
  onClose: () => void;
  onSuccess?: (updated: Driver) => void;
}

const DRIVER_STATUSES: DriverStatus[] = ['Available', 'OnTrip', 'OffDuty', 'Inactive'];

export default function EditDriverModal({ isOpen, driver, onClose, onSuccess }: EditDriverModalProps) {
  const queryClient = useQueryClient();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phonePrimary, setPhonePrimary] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseExpiry, setLicenseExpiry] = useState('');
  const [status, setStatus] = useState<DriverStatus>('Available');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (driver) {
      setFirstName(driver.first_name || '');
      setLastName(driver.last_name || '');
      setPhonePrimary(driver.phone_primary || '');
      setLicenseNumber(driver.license_number || '');
      setLicenseExpiry(driver.license_expiry ? driver.license_expiry.split('T')[0] : '');
      setStatus(driver.status || 'Available');
      setError(null);
    }
  }, [driver]);

  const updateMutation = useMutation({
    mutationFn: (payload: any) => driverService.update(driver!.id, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['driver', driver?.id] });
      onSuccess?.(updated);
      onClose();
    },
    onError: (err: any) => {
      setError(err?.response?.data?.error?.message || err?.message || 'Failed to update driver profile');
    },
  });

  if (!driver) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setError('First and last name are required');
      return;
    }
    if (!phonePrimary.trim()) {
      setError('Primary phone number is required');
      return;
    }
    setError(null);

    updateMutation.mutate({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      phone_primary: phonePrimary.trim(),
      license_number: licenseNumber.trim() || undefined,
      license_expiry: licenseExpiry.trim() || undefined,
      status,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <User className="w-5 h-5 text-brand" />
            Edit Driver Profile
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && (
            <div className="p-3 text-xs font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-900">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit_first_name" className="text-xs font-bold flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-500" />
                First Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="edit_first_name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="h-9 text-xs"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit_last_name" className="text-xs font-bold flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-500" />
                Last Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="edit_last_name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit_phone_primary" className="text-xs font-bold flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-500" /> Primary Phone <span className="text-rose-500">*</span>
              </Label>
              <PhoneInput
                id="edit_phone_primary"
                value={phonePrimary}
                onChange={(val) => setPhonePrimary(val)}
                placeholder="50 123 4567"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit_driver_status" className="text-xs font-semibold">Duty Status</Label>
              <Select value={status} onValueChange={(val) => setStatus(val as DriverStatus)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {DRIVER_STATUSES.map((st) => (
                    <SelectItem key={st} value={st} className="text-xs">
                      {st}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit_license_number" className="text-xs font-semibold flex items-center gap-1.5">
                <IdCard className="w-3.5 h-3.5 text-slate-500" /> Saudi Driving License No.
              </Label>
              <Input
                id="edit_license_number"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit_license_expiry" className="text-xs font-semibold flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" /> License Expiry Date
              </Label>
              <Input
                id="edit_license_expiry"
                type="date"
                value={licenseExpiry}
                onChange={(e) => setLicenseExpiry(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} size="sm" className="h-9 text-xs">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateMutation.isPending}
              size="sm"
              className="h-9 text-xs bg-brand hover:bg-brand/90 text-white font-bold"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
