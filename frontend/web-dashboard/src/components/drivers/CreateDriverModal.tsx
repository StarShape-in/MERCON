import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { User, IdCard, Calendar, Phone, Loader2 } from 'lucide-react';
import { driverService, Driver } from '@/services/driverService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import PhoneInput from '@/components/ui/PhoneInput';
import { Button } from '@/components/ui/button';

interface CreateDriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (driver: Driver) => void;
}

export default function CreateDriverModal({ isOpen, onClose, onSuccess }: CreateDriverModalProps) {
  const queryClient = useQueryClient();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phonePrimary, setPhonePrimary] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseExpiry, setLicenseExpiry] = useState('');
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: driverService.create,
    onSuccess: (driver) => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      resetForm();
      if (driver) {
        onSuccess?.(driver);
      }
      onClose();
    },
    onError: (err: any) => {
      setError(err?.response?.data?.error?.message || err?.message || 'Failed to create driver profile');
    },
  });

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setPhonePrimary('');
    setLicenseNumber('');
    setLicenseExpiry('');
    setError(null);
  };

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

    createMutation.mutate({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      phone_primary: phonePrimary.trim(),
      license_number: licenseNumber.trim() || 'LIC-PENDING',
      license_expiry: licenseExpiry.trim() || new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0],
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <User className="w-5 h-5 text-brand" />
            Add New Driver Profile
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
              <Label htmlFor="first_name" className="text-xs font-bold flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-500" />
                First Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="first_name"
                placeholder="e.g. Tariq"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="h-9 text-xs"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="last_name" className="text-xs font-bold flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-500" />
                Last Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="last_name"
                placeholder="e.g. Al-Mansoor"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone_primary" className="text-xs font-bold flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-500" /> Primary Phone Number <span className="text-rose-500">*</span>
            </Label>
            <PhoneInput
              id="phone_primary"
              value={phonePrimary}
              onChange={(val) => setPhonePrimary(val)}
              placeholder="50 123 4567"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="license_number" className="text-xs font-semibold flex items-center gap-1.5">
                <IdCard className="w-3.5 h-3.5 text-slate-500" /> Saudi Driving License No.
              </Label>
              <Input
                id="license_number"
                placeholder="1092837465"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="license_expiry" className="text-xs font-semibold flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" /> License Expiry Date
              </Label>
              <Input
                id="license_expiry"
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
              disabled={createMutation.isPending}
              size="sm"
              className="h-9 text-xs bg-brand hover:bg-brand/90 text-white font-bold"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Saving...
                </>
              ) : (
                'Save Driver Profile'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
