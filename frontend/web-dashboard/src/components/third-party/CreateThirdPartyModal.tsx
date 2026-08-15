import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, User, Phone, Mail, MapPin, FileText, Star, Loader2 } from 'lucide-react';
import { thirdPartyService, ThirdPartyProvider } from '@/services/thirdPartyService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface CreateThirdPartyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (provider: ThirdPartyProvider) => void;
}

export default function CreateThirdPartyModal({ isOpen, onClose, onSuccess }: CreateThirdPartyModalProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [taxId, setTaxId] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: thirdPartyService.create,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['third-party-providers'] });
      resetForm();
      if (res.data?.data) {
        onSuccess?.(res.data.data);
      }
      onClose();
    },
    onError: (err: any) => {
      setError(err?.response?.data?.error?.message || err?.message || 'Failed to create provider');
    },
  });

  const resetForm = () => {
    setName('');
    setContactPerson('');
    setPhone('');
    setEmail('');
    setAddress('');
    setTaxId('');
    setNotes('');
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Provider name is required');
      return;
    }
    setError(null);
    createMutation.mutate({
      name: name.trim(),
      contact_person: contactPerson.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      tax_id: taxId.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <Building2 className="w-5 h-5 text-brand" />
            Add Third-Party Provider / Rental Carrier
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && (
            <div className="p-3 text-xs font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-900">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="provider_name" className="text-xs font-bold flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              Company / Provider Name <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="provider_name"
              placeholder="e.g. Al-Madina Rental Transport Co."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 text-xs"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="contact_person" className="text-xs font-semibold flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-500" /> Contact Person
              </Label>
              <Input
                id="contact_person"
                placeholder="e.g. Tariq Mansoor"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-xs font-semibold flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-500" /> Phone Number
              </Label>
              <Input
                id="phone"
                placeholder="e.g. +966 50 123 4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-500" /> Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="dispatch@provider.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tax_id" className="text-xs font-semibold flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-500" /> Tax / Commercial Reg. ID
              </Label>
              <Input
                id="tax_id"
                placeholder="3000XXXXXXXXXXX"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="address" className="text-xs font-semibold flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-500" /> Office / Yard Address
            </Label>
            <Input
              id="address"
              placeholder="e.g. Industrial Area 2, Riyadh"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-xs font-semibold flex items-center gap-1.5">
              Notes &amp; Internal Terms
            </Label>
            <textarea
              id="notes"
              placeholder="Add payment terms, preferred truck types, or vehicle availability notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-md border border-slate-200 dark:border-slate-800 bg-transparent px-3 py-2 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand min-h-[70px]"
            />
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
                'Save Provider'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
