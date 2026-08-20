import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, User, Phone, FileText, CreditCard, Loader2 } from 'lucide-react';
import { customerService, Customer } from '@/services/customerService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import PhoneInput from '@/components/ui/PhoneInput';
import { Button } from '@/components/ui/button';

interface CreateCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (customer: Customer) => void;
}

export default function CreateCustomerModal({ isOpen, onClose, onSuccess }: CreateCustomerModalProps) {
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [primaryContactPerson, setPrimaryContactPerson] = useState('');
  const [creditLimit, setCreditLimit] = useState('50000');
  const [whatsappGroupLink, setWhatsappGroupLink] = useState('');
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: customerService.create,
    onSuccess: (customer) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      resetForm();
      if (customer) {
        onSuccess?.(customer);
      }
      onClose();
    },
    onError: (err: any) => {
      setError(err?.response?.data?.error?.message || err?.message || 'Failed to create customer profile');
    },
  });

  const resetForm = () => {
    setName('');
    setContactPhone('');
    setTaxNumber('');
    setPrimaryContactPerson('');
    setCreditLimit('50000');
    setWhatsappGroupLink('');
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Company / Customer name is required');
      return;
    }
    setError(null);

    createMutation.mutate({
      name: name.trim(),
      contact_phone: contactPhone.trim() || 'N/A',
      tax_number: taxNumber.trim() || undefined,
      primary_contact_person: primaryContactPerson.trim() || undefined,
      credit_limit: parseFloat(creditLimit) || 0,
      whatsapp_group_link: whatsappGroupLink.trim() || undefined,
    } as any);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <Building2 className="w-5 h-5 text-brand" />
            Add New Client Company / Customer Profile
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && (
            <div className="p-3 text-xs font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-900">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="company_name" className="text-xs font-bold flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              Company / Customer Name <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="company_name"
              placeholder="e.g. Saudi Aramco Logistics Division"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 text-xs"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="contact_person" className="text-xs font-semibold flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-500" /> Primary Contact Person
              </Label>
              <Input
                id="contact_person"
                placeholder="e.g. Faisal Al-Otaibi"
                value={primaryContactPerson}
                onChange={(e) => setPrimaryContactPerson(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contact_phone" className="text-xs font-semibold flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-500" /> Contact Phone
              </Label>
              <PhoneInput
                id="contact_phone"
                value={contactPhone}
                onChange={(val) => setContactPhone(val)}
                placeholder="50 123 4567"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tax_number" className="text-xs font-semibold flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-500" /> CR / VAT Tax ID
              </Label>
              <Input
                id="tax_number"
                placeholder="3100XXXXXXXXXXX"
                value={taxNumber}
                onChange={(e) => setTaxNumber(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="credit_limit" className="text-xs font-semibold flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-slate-500" /> Credit Limit (SAR)
              </Label>
              <Input
                id="credit_limit"
                type="number"
                placeholder="50000"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="whatsapp_link" className="text-xs font-semibold flex items-center gap-1.5">
              WhatsApp Dispatch Group Link (Optional)
            </Label>
            <Input
              id="whatsapp_link"
              placeholder="https://chat.whatsapp.com/..."
              value={whatsappGroupLink}
              onChange={(e) => setWhatsappGroupLink(e.target.value)}
              className="h-9 text-xs"
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
                'Save Customer Profile'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
