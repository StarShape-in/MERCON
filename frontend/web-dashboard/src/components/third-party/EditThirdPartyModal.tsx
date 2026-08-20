import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, User, Phone, Mail, MapPin, FileText, Loader2 } from 'lucide-react';
import { thirdPartyService, ThirdPartyProvider } from '@/services/thirdPartyService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import PhoneInput from '@/components/ui/PhoneInput';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

interface EditThirdPartyModalProps {
  isOpen: boolean;
  provider: ThirdPartyProvider;
  onClose: () => void;
}

export default function EditThirdPartyModal({ isOpen, provider, onClose }: EditThirdPartyModalProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(provider.name || '');
  const [contactPerson, setContactPerson] = useState(provider.contact_person || '');
  const [phone, setPhone] = useState(provider.phone || '');
  const [email, setEmail] = useState(provider.email || '');
  const [address, setAddress] = useState(provider.address || '');
  const [taxId, setTaxId] = useState(provider.tax_id || '');
  const [notes, setNotes] = useState(provider.notes || '');
  const [isActive, setIsActive] = useState(provider.isActive ?? true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(provider.name || '');
    setContactPerson(provider.contact_person || '');
    setPhone(provider.phone || '');
    setEmail(provider.email || '');
    setAddress(provider.address || '');
    setTaxId(provider.tax_id || '');
    setNotes(provider.notes || '');
    setIsActive(provider.isActive ?? true);
    setError(null);
  }, [provider]);

  const updateMutation = useMutation({
    mutationFn: (data: Parameters<typeof thirdPartyService.update>[1]) =>
      thirdPartyService.update(provider.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['third-party-providers'] });
      onClose();
    },
    onError: (err: any) => {
      setError(err?.response?.data?.error?.message || err?.message || 'Failed to update provider');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Provider name is required');
      return;
    }
    setError(null);
    updateMutation.mutate({
      name: name.trim(),
      contact_person: contactPerson.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      tax_id: taxId.trim() || undefined,
      notes: notes.trim() || undefined,
      isActive,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <Building2 className="w-5 h-5 text-brand" />
            Edit Third-Party Provider
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && (
            <div className="p-3 text-xs font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-900">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="edit_provider_name" className="text-xs font-bold flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              Company / Provider Name <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="edit_provider_name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit_contact_person" className="text-xs font-semibold flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-500" /> Contact Person
              </Label>
              <Input
                id="edit_contact_person"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit_phone" className="text-xs font-semibold flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-500" /> Phone Number
              </Label>
              <PhoneInput
                id="edit_phone"
                value={phone}
                onChange={(val) => setPhone(val)}
                placeholder="50 123 4567"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit_email" className="text-xs font-semibold flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-500" /> Email Address
              </Label>
              <Input
                id="edit_email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit_tax_id" className="text-xs font-semibold flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-500" /> Tax / Commercial Reg. ID
              </Label>
              <Input
                id="edit_tax_id"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit_address" className="text-xs font-semibold flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-500" /> Office / Yard Address
            </Label>
            <Input
              id="edit_address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit_notes" className="text-xs font-semibold flex items-center gap-1.5">
              Notes &amp; Internal Terms
            </Label>
            <textarea
              id="edit_notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-md border border-slate-200 dark:border-slate-800 bg-transparent px-3 py-2 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand min-h-[70px]"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Checkbox
              id="edit_is_active"
              checked={isActive}
              onCheckedChange={(c) => setIsActive(!!c)}
            />
            <Label htmlFor="edit_is_active" className="text-xs font-semibold cursor-pointer">
              Active Partner Status
            </Label>
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
