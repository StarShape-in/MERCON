import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Building2, 
  Phone, 
  DollarSign, 
  RotateCcw, 
  Save, 
  Eye, 
  Users, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Plus,
  Trash2,
  Globe
} from 'lucide-react';
import { toast } from 'sonner';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { customerService } from '@/services/customerService';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WhatsAppIcon } from '@/components/ui/whatsapp-icon';
import PhoneInput from '@/components/ui/PhoneInput';
import PhoneDisplay from '@/components/ui/PhoneDisplay';
import StatusBadge from '@/components/ui/StatusBadge';
import CustomerImageUploader from '@/components/ui/CustomerImageUploader';
import { useFormKeyboardShortcuts } from '@/hooks/useFormKeyboardShortcuts';
import { KbdBadge } from '@/components/ui/KbdBadge';

export interface ContactPerson {
  id: string;
  name: string;
  title: string;
  phone: string;
  email: string;
  is_primary: boolean;
}

export default function EditCustomerPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch existing customer details
  const { data: customer, isLoading, refetch } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => customerService.getById(id!),
    enabled: !!id,
  });

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    trade_alias: '',
    logo_url: null as string | null,
    industry: 'Logistics',
    cr_number: '',
    vat_number: '',
    contact_phone: '',
    whatsapp_number: '',
    whatsapp_group_link: '',
    whatsapp_group_name: '',
    email: '',
    billing_address: '',
    payment_terms: 'Net 30 Days',
    isActive: true,
  });

  // Dynamic Contact Personnel List
  const [contacts, setContacts] = useState<ContactPerson[]>([]);

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || '',
        trade_alias: customer.company_name || '',
        logo_url: customer.logo_url || customer.avatar_url || null,
        industry: 'Logistics',
        cr_number: '',
        vat_number: '',
        contact_phone: customer.contact_phone || customer.primary_contact_phone || customer.phone || '',
        whatsapp_number: customer.whatsapp_number || '',
        whatsapp_group_link: customer.whatsapp_group_link || '',
        whatsapp_group_name: customer.whatsapp_group_name || '',
        email: '',
        billing_address: '',
        payment_terms: customer.payment_terms || 'Net 30 Days',
        isActive: customer.isActive ?? true,
      });

      // Populate contacts if available
      const initialContacts: ContactPerson[] = [];
      if (customer.primary_contact_person || customer.primary_contact_phone) {
        initialContacts.push({
          id: '1',
          name: customer.primary_contact_person || '',
          title: 'Primary Logistics Manager',
          phone: customer.primary_contact_phone || customer.contact_phone || '',
          email: '',
          is_primary: true,
        });
      }
      if (customer.secondary_contact_person || customer.secondary_contact_phone) {
        initialContacts.push({
          id: '2',
          name: customer.secondary_contact_person || '',
          title: 'Operations Coordinator',
          phone: customer.secondary_contact_phone || '',
          email: '',
          is_primary: false,
        });
      }
      if (initialContacts.length === 0) {
        initialContacts.push({
          id: '1',
          name: '',
          title: 'Primary Contact',
          phone: customer.contact_phone || '',
          email: '',
          is_primary: true,
        });
      }
      setContacts(initialContacts);
    }
  }, [customer]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Contact Personnel Actions
  const addContactPerson = () => {
    const newId = String(Date.now());
    setContacts((prev) => [
      ...prev,
      {
        id: newId,
        name: '',
        title: 'Operations Contact',
        phone: '',
        email: '',
        is_primary: prev.length === 0,
      },
    ]);
  };

  const removeContactPerson = (cid: string) => {
    setContacts((prev) => {
      const filtered = prev.filter((c) => c.id !== cid);
      if (filtered.length > 0 && !filtered.some((c) => c.is_primary)) {
        filtered[0].is_primary = true;
      }
      return filtered;
    });
  };

  const updateContactPerson = (cid: string, field: keyof ContactPerson, value: any) => {
    setContacts((prev) =>
      prev.map((c) => {
        if (c.id === cid) {
          return { ...c, [field]: value };
        }
        if (field === 'is_primary' && value === true) {
          return { ...c, is_primary: false };
        }
        return c;
      })
    );
  };

  const handleReset = () => {
    if (customer) {
      setFormData({
        name: customer.name || '',
        trade_alias: customer.company_name || '',
        logo_url: customer.logo_url || customer.avatar_url || null,
        industry: 'Logistics',
        cr_number: '',
        vat_number: '',
        contact_phone: customer.contact_phone || customer.phone || '',
        whatsapp_number: customer.whatsapp_number || '',
        whatsapp_group_link: customer.whatsapp_group_link || '',
        whatsapp_group_name: customer.whatsapp_group_name || '',
        email: '',
        billing_address: '',
        payment_terms: customer.payment_terms || 'Net 30 Days',
        isActive: customer.isActive ?? true,
      });
      setError(null);
      toast.info('Form reset to original customer details');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const primary = contacts.find((c) => c.is_primary) || contacts[0];
    const secondary = contacts.find((c) => !c.is_primary);
    const effectivePhone = formData.contact_phone.trim() || primary?.phone?.trim() || '';

    if (!formData.name.trim()) {
      setError('Company name is required');
      return;
    }
    if (!effectivePhone) {
      setError('Primary contact phone is required');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      if (!id) throw new Error('Customer ID missing');

      await customerService.update(id, {
        name: formData.name.trim(),
        contact_phone: effectivePhone,
        logo_url: formData.logo_url || undefined,
        avatar_url: formData.logo_url || undefined,
        whatsapp_number: formData.whatsapp_number.trim() || undefined,
        whatsapp_group_link: formData.whatsapp_group_link.trim() || undefined,
        whatsapp_group_name: formData.whatsapp_group_name.trim() || undefined,
        company_name: formData.trade_alias.trim() || undefined,
        primary_contact_person: primary?.name || undefined,
        primary_contact_phone: primary?.phone || effectivePhone,
        secondary_contact_person: secondary?.name || undefined,
        secondary_contact_phone: secondary?.phone || undefined,
        payment_terms: formData.payment_terms || undefined,
        isActive: formData.isActive,
      });

      await queryClient.invalidateQueries({ queryKey: ['customer', id] });
      await queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer corporate account updated successfully');
      navigate(`/customers/${id}`);
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.message || 'Failed to update customer';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Requirement Completion Progress
  const calculateCompletion = () => {
    let completed = 0;
    const total = 4;
    if (formData.name.trim()) completed += 1;
    if (formData.contact_phone.trim()) completed += 1;
    if (formData.vat_number.trim() || formData.cr_number.trim()) completed += 1;
    if (contacts.some((c) => c.name.trim())) completed += 1;
    return Math.round((completed / total) * 100);
  };

  const completionPct = calculateCompletion();

  // Keyboard Shortcuts Integration
  useFormKeyboardShortcuts({
    onSave: () => {
      handleSubmit({ preventDefault: () => {} } as any);
    },
    onCancel: () => navigate(`/customers/${id}`),
    onNewRow: addContactPerson,
    isSubmitting,
  });

  if (isLoading || !customer) {
    return (
      <DashboardLayout active="Customers" title="Edit Customer">
        <div className="p-12 flex flex-col items-center justify-center gap-3">
          <div className="h-8 w-8 border-2 border-brand border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-muted-foreground font-medium">Loading customer account details...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout active="Customers" title={`Edit Customer: ${customer.name}`}>
      <div className="px-3 sm:px-5 pb-4 space-y-3 animate-fade-in max-w-[1350px] mx-auto w-full">
        
        {/* Slim Top Action Strip */}
        <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400 font-bold border-none text-[11px] px-2 py-0.5">
              <Building2 className="w-3 h-3 mr-1 inline text-indigo-600" /> Customer Directory
            </Badge>
            <span className="text-xs text-slate-400 font-mono font-medium hidden sm:inline">
              Ref ID: {customer.id.slice(0, 8)}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="h-7 text-xs text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 px-2"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1 text-slate-500" /> Reset
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate(`/customers/${id}`)}
              className="h-7 text-xs text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 px-2.5"
            >
              Cancel <KbdBadge keys="Esc" />
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="h-7 text-xs bg-brand hover:bg-brand-hover text-white font-bold px-3 shadow-2xs"
            >
              <Save className="w-3.5 h-3.5 mr-1" />
              {isSubmitting ? 'Saving...' : 'Save Customer Changes'} <KbdBadge keys="Ctrl+S" />
            </Button>
          </div>
        </div>

        {/* 2-Column Form Layout (7 cols Form / 5 cols Live Summary) */}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
          
          {/* Main Form Column (7 cols) */}
          <div className="lg:col-span-7 space-y-3">
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl shadow-2xs overflow-hidden">
              <CardContent className="p-3.5 space-y-3.5">
                
                {/* Section 1: Corporate Identity */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-blue-500" /> Corporate Identity & Information
                    </h2>
                    <span className="text-[10px] text-slate-400 font-mono">* Required fields</span>
                  </div>

                  {/* Company Logo Uploader */}
                  <CustomerImageUploader
                    value={formData.logo_url}
                    onChange={(val) => handleChange('logo_url', val)}
                    companyName={formData.name || formData.trade_alias}
                    className="mb-2"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1 sm:col-span-2">
                      <Label htmlFor="name" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        Official Company Name <span className="text-rose-500">*</span>
                      </Label>
                      <Input
                        id="name"
                        type="text"
                        placeholder="e.g. Al-Futtaim Logistics KSA"
                        value={formData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        className="h-8 text-xs font-medium"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="trade_alias" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        Trade Alias / Brand Name
                      </Label>
                      <Input
                        id="trade_alias"
                        type="text"
                        placeholder="e.g. Al-Futtaim Express"
                        value={formData.trade_alias}
                        onChange={(e) => handleChange('trade_alias', e.target.value)}
                        className="h-8 text-xs font-medium"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="industry" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        Industry Sector
                      </Label>
                      <Select
                        value={formData.industry}
                        onValueChange={(val) => handleChange('industry', val)}
                      >
                        <SelectTrigger id="industry" className="h-8 text-xs">
                          <SelectValue placeholder="Select industry..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Logistics">Logistics & FMCG Shipping</SelectItem>
                          <SelectItem value="Retail">Retail & E-Commerce</SelectItem>
                          <SelectItem value="Manufacturing">Manufacturing & Heavy Industry</SelectItem>
                          <SelectItem value="OilGas">Oil & Gas Energy</SelectItem>
                          <SelectItem value="Construction">Building Materials & Construction</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="cr_number" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        Commercial Registration (CR) #
                      </Label>
                      <Input
                        id="cr_number"
                        type="text"
                        placeholder="e.g. 1010839201"
                        value={formData.cr_number}
                        onChange={(e) => handleChange('cr_number', e.target.value)}
                        className="h-8 text-xs font-mono font-medium"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="vat_number" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        VAT / Tax Registration #
                      </Label>
                      <Input
                        id="vat_number"
                        type="text"
                        placeholder="e.g. 310938201900003"
                        value={formData.vat_number}
                        onChange={(e) => handleChange('vat_number', e.target.value)}
                        className="h-8 text-xs font-mono font-medium"
                      />
                    </div>



                    <div className="space-y-1">
                      <Label htmlFor="payment_terms" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        Payment Terms
                      </Label>
                      <Select
                        value={formData.payment_terms}
                        onValueChange={(val) => handleChange('payment_terms', val)}
                      >
                        <SelectTrigger id="payment_terms" className="h-8 text-xs">
                          <SelectValue placeholder="Select terms" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Net 15 Days">Net 15 Days</SelectItem>
                          <SelectItem value="Net 30 Days">Net 30 Days</SelectItem>
                          <SelectItem value="Net 45 Days">Net 45 Days</SelectItem>
                          <SelectItem value="Net 60 Days">Net 60 Days</SelectItem>
                          <SelectItem value="Cash / Advance">Cash / Advance</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* WhatsApp Dispatch Integration Fields */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <WhatsAppIcon className="w-3.5 h-3.5 fill-emerald-600 dark:fill-emerald-400" /> Saved WhatsApp Dispatch Contacts
                      </h3>
                      <span className="text-[10px] text-slate-400">Auto-filled in WhatsApp Dispatcher</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="space-y-1">
                        <Label htmlFor="whatsapp_number" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          Saved WhatsApp Number
                        </Label>
                        <PhoneInput
                          id="whatsapp_number"
                          placeholder="50 000 0000"
                          value={formData.whatsapp_number}
                          onChange={(val) => handleChange('whatsapp_number', val)}
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="whatsapp_group_name" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          WhatsApp Group Name
                        </Label>
                        <Input
                          id="whatsapp_group_name"
                          placeholder="e.g. SABIC Operations Group"
                          value={formData.whatsapp_group_name}
                          onChange={(e) => handleChange('whatsapp_group_name', e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="whatsapp_group_link" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          WhatsApp Group Link
                        </Label>
                        <Input
                          id="whatsapp_group_link"
                          placeholder="https://chat.whatsapp.com/..."
                          value={formData.whatsapp_group_link}
                          onChange={(e) => handleChange('whatsapp_group_link', e.target.value)}
                          className="h-8 text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Contact Personnel Roster */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-emerald-500" /> Contact Personnel Roster
                    </h2>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={addContactPerson}
                      className="h-6 text-[10px] text-brand hover:text-brand-hover font-bold p-0"
                    >
                      <Plus className="w-3 h-3 mr-0.5" /> Add Contact
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <Label htmlFor="contact_phone" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          Primary Switchboard Phone <span className="text-rose-500">*</span>
                        </Label>
                        <PhoneInput
                          id="contact_phone"
                          value={formData.contact_phone}
                          onChange={(val) => handleChange('contact_phone', val)}
                          placeholder="50 123 4567"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="email" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          Corporate Billing Email
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="billing@alfuttaim.sa"
                          value={formData.email}
                          onChange={(e) => handleChange('email', e.target.value)}
                          className="h-8 text-xs font-medium"
                        />
                      </div>
                    </div>

                    {/* Personnel List Cards */}
                    <div className="space-y-2 pt-1">
                      {contacts.map((c, idx) => (
                        <div key={c.id} className="p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-brand"></span>
                              Personnel #{idx + 1} {c.is_primary && '(Primary Contact)'}
                            </span>
                            {contacts.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeContactPerson(c.id)}
                                className="text-slate-400 hover:text-rose-600 transition-colors p-0.5"
                                title="Remove personnel"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <Input
                              placeholder="Full Name"
                              value={c.name}
                              onChange={(e) => updateContactPerson(c.id, 'name', e.target.value)}
                              className="h-7 text-xs"
                            />
                            <Input
                              placeholder="Title (e.g. Director)"
                              value={c.title}
                              onChange={(e) => updateContactPerson(c.id, 'title', e.target.value)}
                              className="h-7 text-xs"
                            />
                            <PhoneInput
                              value={c.phone}
                              onChange={(val) => updateContactPerson(c.id, 'phone', val)}
                              placeholder="50 000 0000"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>



              </CardContent>
            </Card>

            {error && (
              <div className="p-2.5 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 rounded-lg text-xs font-semibold border border-rose-200 dark:border-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Right Summary Column (5 cols) */}
          <div className="lg:col-span-5 space-y-3 sticky top-2">
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-3.5 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-brand" /> Live Corporate Profile
                </span>
                <Badge variant="outline" className="text-[10px] font-mono text-brand border-orange-200">
                  {completionPct}% Complete
                </Badge>
              </div>

              {/* Customer Live Card Preview */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden shrink-0">
                    {formData.logo_url ? (
                      <img src={formData.logo_url} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <Building2 className="w-4 h-4 text-brand" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {formData.name || 'Corporate Account Name'}
                      </h3>
                      <StatusBadge status={formData.isActive ? 'Available' : 'Inactive'} />
                    </div>
                    <p className="text-[11px] font-mono text-slate-500">
                      Phone: {formData.contact_phone ? `+966 ${formData.contact_phone}` : 'Not provided'}
                    </p>
                  </div>
                </div>

              </div>

              {/* Saved Locations & Activity Quick Links */}
              <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-xl space-y-1.5 text-xs">
                <p className="font-bold text-indigo-950 dark:text-indigo-200 text-[11.5px]">
                  Account Directory & Operations
                </p>
                <p className="text-[10.5px] text-slate-500">
                  This corporate account has {customer.trips?.length || 0} active trip manifests associated with it.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-8 text-xs bg-brand hover:bg-brand-hover text-white font-bold shadow-xs"
                >
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  {isSubmitting ? 'Saving Customer...' : 'Save Customer Changes'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`/customers/${id}`)}
                  className="w-full h-8 text-xs font-semibold text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800"
                >
                  Cancel & Exit
                </Button>
              </div>
            </Card>
          </div>

        </form>
      </div>
    </DashboardLayout>
  );
}
