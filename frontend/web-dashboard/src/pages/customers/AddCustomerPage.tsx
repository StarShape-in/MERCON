import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  RotateCcw, 
  Plus, 
  Building2, 
  Phone, 
  Mail, 
  User,
  Trash2,
  CheckCircle2,
  Briefcase,
  Star,
  Users
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { customerService, CreateCustomerPayload } from '@/services/customerService';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export interface ContactPerson {
  id: string;
  name: string;
  title: string;
  phone: string;
  email: string;
  is_primary: boolean;
}

export default function AddCustomerPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    trade_alias: '',
    industry: 'Logistics',
    cr_number: '',
    vat_number: '',
    contact_phone: '',
    email: '',
    billing_address: '',
    isActive: true,
  });

  // Dynamic Contact Personnel List
  const [contacts, setContacts] = useState<ContactPerson[]>([
    {
      id: '1',
      name: '',
      title: 'Logistics Director',
      phone: '',
      email: '',
      is_primary: true,
    },
  ]);

  const handleChange = (field: string, value: string | boolean) => {
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
        title: '',
        phone: '',
        email: '',
        is_primary: prev.length === 0,
      },
    ]);
  };

  const removeContactPerson = (id: string) => {
    setContacts((prev) => {
      const filtered = prev.filter((c) => c.id !== id);
      if (filtered.length > 0 && !filtered.some((c) => c.is_primary)) {
        filtered[0].is_primary = true;
      }
      return filtered;
    });
  };

  const updateContactPerson = (id: string, field: keyof ContactPerson, value: any) => {
    setContacts((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          return { ...c, [field]: value };
        }
        if (field === 'is_primary' && value === true) {
          return { ...c, is_primary: false };
        }
        return c;
      })
    );
  };

  const setPrimaryContact = (id: string) => {
    setContacts((prev) =>
      prev.map((c) => ({
        ...c,
        is_primary: c.id === id,
      }))
    );
  };

  const handleReset = () => {
    setFormData({
      name: '',
      trade_alias: '',
      industry: 'Logistics',
      cr_number: '',
      vat_number: '',
      contact_phone: '',
      email: '',
      billing_address: '',
      isActive: true,
    });
    setContacts([
      {
        id: '1',
        name: '',
        title: 'Logistics Director',
        phone: '',
        email: '',
        is_primary: true,
      },
    ]);
    setError(null);
  };

  // Primary Contact details
  const primaryContact = contacts.find((c) => c.is_primary) || contacts[0];
  const effectivePhone = formData.contact_phone.trim() || primaryContact?.phone.trim() || '';

  // Mutation
  const createMutation = useMutation({
    mutationFn: (payload: CreateCustomerPayload) => customerService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      navigate('/customers');
    },
    onError: (err: any) => {
      setError(err.response?.data?.error?.message || err.message || 'Failed to create customer');
    },
  });

  const isFormValid = formData.name.trim() !== '' && (formData.contact_phone.trim() !== '' || primaryContact?.phone.trim() !== '');

  const handleSubmit = useCallback(() => {
    setError(null);

    if (!formData.name.trim()) {
      setError('Company Name is required');
      return;
    }
    if (!effectivePhone) {
      setError('Primary Contact Phone is required');
      return;
    }

    createMutation.mutate({
      name: formData.name.trim(),
      contact_phone: effectivePhone,
    });
  }, [formData, effectivePhone, createMutation]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (isFormValid && !createMutation.isPending) handleSubmit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        navigate('/customers');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSubmit, isFormValid, createMutation.isPending, navigate]);

  // Completion Tracking
  const completionFields = [
    { label: 'Company Name', filled: formData.name.trim() !== '' },
    { label: 'Primary Contact Phone', filled: effectivePhone !== '' },
    { label: 'Billing Email', filled: formData.email.trim() !== '' || primaryContact?.email.trim() !== '' },
    { label: 'CR Number', filled: formData.cr_number.trim() !== '' },
    { label: 'Contact Person', filled: primaryContact?.name.trim() !== '' },
  ];
  const filledCount = completionFields.filter(f => f.filled).length;
  const completionPct = Math.round((filledCount / completionFields.length) * 100);

  return (
    <DashboardLayout active="Customers" title="Add Customer">
      <div className="px-4 sm:px-6 pb-6 space-y-4 animate-fade-in max-w-[1300px] mx-auto">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-0.5">
              <button onClick={() => navigate('/customers')} className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                Customers
              </button>
              <span>/</span>
              <span className="text-brand font-bold">New Customer</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-brand" />
              New Customer Account
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/customers')}
              className="h-8 text-xs font-medium border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Cancel
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleReset}
              className="h-8 text-xs text-slate-600 dark:text-slate-400"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset
            </Button>
            <Button 
              size="sm" 
              onClick={handleSubmit}
              disabled={createMutation.isPending || !isFormValid}
              className="h-8 text-xs bg-brand hover:bg-brand-hover text-white font-bold px-4 shadow-xs"
            >
              {createMutation.isPending ? 'Saving...' : 'Save Customer'}
            </Button>
          </div>
        </div>

        {/* 2-Column Balanced Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* Main Form Card (8 Columns) */}
          <div className="lg:col-span-8 space-y-4">
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl shadow-2xs">
              <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-orange-500" /> Company & Contact Personnel
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Enter company details and add one or multiple key contact representatives.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-5 space-y-5">
                
                {/* 1. Company Profile */}
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Company Name <span className="text-rose-500">*</span>
                    </Label>
                    <Input 
                      id="name" 
                      placeholder="e.g. SABIC Logistics Co." 
                      value={formData.name} 
                      onChange={(e) => handleChange('name', e.target.value)} 
                      className="h-9 text-xs" 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="trade_alias" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Trade Name / Brand
                      </Label>
                      <Input 
                        id="trade_alias" 
                        placeholder="e.g. SABIC" 
                        value={formData.trade_alias} 
                        onChange={(e) => handleChange('trade_alias', e.target.value)} 
                        className="h-9 text-xs" 
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="industry" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Industry
                      </Label>
                      <Select value={formData.industry} onValueChange={(v) => handleChange('industry', v)}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Select industry" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Logistics" className="text-xs">Logistics</SelectItem>
                          <SelectItem value="Retail" className="text-xs">Retail & E-commerce</SelectItem>
                          <SelectItem value="Manufacturing" className="text-xs">Manufacturing</SelectItem>
                          <SelectItem value="FMCG" className="text-xs">FMCG</SelectItem>
                          <SelectItem value="Healthcare" className="text-xs">Healthcare</SelectItem>
                          <SelectItem value="Construction" className="text-xs">Construction</SelectItem>
                          <SelectItem value="General" className="text-xs">General</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="cr_number" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Commercial Reg. (CR) No.
                      </Label>
                      <Input 
                        id="cr_number" 
                        placeholder="1010XXXXXX" 
                        value={formData.cr_number} 
                        onChange={(e) => handleChange('cr_number', e.target.value)} 
                        className="h-9 text-xs font-mono" 
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="vat_number" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        VAT / Tax Number
                      </Label>
                      <Input 
                        id="vat_number" 
                        placeholder="310123456700003" 
                        value={formData.vat_number} 
                        onChange={(e) => handleChange('vat_number', e.target.value)} 
                        className="h-9 text-xs font-mono" 
                      />
                    </div>
                  </div>
                </div>

                <hr className="border-slate-100 dark:border-slate-800" />

                {/* 2. Key Contact Personnel (Dynamic List) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-500" />
                      <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        Key Contact Personnel ({contacts.length})
                      </h3>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addContactPerson}
                      className="h-7 text-xs font-semibold gap-1 text-brand border-orange-200 hover:bg-orange-50 dark:border-slate-700"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Contact Person
                    </Button>
                  </div>

                  {contacts.map((contact, idx) => (
                    <div
                      key={contact.id}
                      className={`p-3.5 rounded-xl border space-y-3 transition-all ${
                        contact.is_primary
                          ? 'border-orange-200 bg-orange-50/30 dark:bg-orange-950/20 dark:border-orange-900/50'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={contact.is_primary ? 'default' : 'outline'}
                            className={`text-[10px] font-bold cursor-pointer ${
                              contact.is_primary
                                ? 'bg-brand text-white hover:bg-brand-hover'
                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                            }`}
                            onClick={() => setPrimaryContact(contact.id)}
                          >
                            {contact.is_primary ? (
                              <span className="flex items-center gap-1">
                                <Star className="w-3 h-3 fill-current" /> Primary Contact #{idx + 1}
                              </span>
                            ) : (
                              `Contact Person #${idx + 1}`
                            )}
                          </Badge>
                          {!contact.is_primary && (
                            <button
                              type="button"
                              onClick={() => setPrimaryContact(contact.id)}
                              className="text-[10px] text-slate-400 hover:text-orange-600 font-semibold underline"
                            >
                              Set as primary
                            </button>
                          )}
                        </div>

                        {contacts.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeContactPerson(contact.id)}
                            className="h-6 w-6 p-0 text-slate-400 hover:text-rose-600"
                            title="Remove contact"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                            Full Name {contact.is_primary && <span className="text-rose-500">*</span>}
                          </Label>
                          <Input
                            placeholder="e.g. Eng. Tariq Al-Mansoor"
                            value={contact.name}
                            onChange={(e) => updateContactPerson(contact.id, 'name', e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                            Contact Phone {contact.is_primary && <span className="text-rose-500">*</span>}
                          </Label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1.5 text-[11px] font-bold text-slate-400 font-mono">+966</span>
                            <Input
                              placeholder="50XXXXXXX"
                              value={contact.phone}
                              onChange={(e) => {
                                updateContactPerson(contact.id, 'phone', e.target.value);
                                if (contact.is_primary) {
                                  handleChange('contact_phone', e.target.value);
                                }
                              }}
                              className="h-8 text-xs pl-12 font-mono"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                            Job Title / Role
                          </Label>
                          <Input
                            placeholder="e.g. Logistics Director"
                            value={contact.title}
                            onChange={(e) => updateContactPerson(contact.id, 'title', e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                            Email Address
                          </Label>
                          <Input
                            type="email"
                            placeholder="tariq@company.com"
                            value={contact.email}
                            onChange={(e) => {
                              updateContactPerson(contact.id, 'email', e.target.value);
                              if (contact.is_primary) {
                                handleChange('email', e.target.value);
                              }
                            }}
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <hr className="border-slate-100 dark:border-slate-800" />

                {/* 3. Address & Operational Status */}
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="billing_address" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Company Address & Notes
                    </Label>
                    <Textarea 
                      id="billing_address" 
                      placeholder="District 4, Building 829, King Fahd Road, Riyadh, Saudi Arabia" 
                      value={formData.billing_address} 
                      onChange={(e) => handleChange('billing_address', e.target.value)} 
                      className="min-h-[60px] text-xs" 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Account Status
                    </Label>
                    <div className="flex items-center gap-3 pt-0.5 max-w-xs">
                      <button
                        type="button"
                        onClick={() => handleChange('isActive', true)}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border text-center transition-all ${
                          formData.isActive
                            ? 'bg-emerald-600 text-white border-emerald-600 font-bold shadow-2xs'
                            : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        Active
                      </button>
                      <button
                        type="button"
                        onClick={() => handleChange('isActive', false)}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border text-center transition-all ${
                          !formData.isActive
                            ? 'bg-rose-600 text-white border-rose-600 font-bold shadow-2xs'
                            : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        Inactive
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button 
                    size="sm" 
                    onClick={handleSubmit} 
                    disabled={createMutation.isPending || !isFormValid}
                    className="h-9 text-xs bg-brand hover:bg-brand-hover text-white font-bold px-5 shadow-xs"
                  >
                    {createMutation.isPending ? 'Saving...' : 'Save Customer Account'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {error && (
              <div className="p-3 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 rounded-xl text-xs font-semibold border border-rose-200 dark:border-rose-800">
                {error}
              </div>
            )}
          </div>

          {/* Right Sidebar: Live Summary (4 Columns) */}
          <div className="lg:col-span-4 space-y-4">
            
            {/* Live Customer Summary */}
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-4 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Account Summary</span>
                <Badge variant="outline" className="text-[10px] font-mono text-brand border-orange-200">
                  {completionPct}% Complete
                </Badge>
              </div>

              <div className="space-y-3.5">
                <div className="flex items-start gap-3">
                  <Building2 className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Company</span>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {formData.name.trim() || 'New Customer Account'}
                    </p>
                    <span className="text-[11px] text-slate-500">{formData.industry}</span>
                  </div>
                </div>

                {/* Key Personnel List Summary */}
                <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Key Contacts ({contacts.length})
                  </span>
                  
                  {contacts.map((c, i) => (
                    <div key={c.id} className="flex items-start gap-2.5 text-xs">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${
                        c.is_primary ? 'bg-orange-100 text-brand dark:bg-orange-950/50' : 'bg-slate-100 text-slate-600 dark:bg-slate-800'
                      }`}>
                        {i + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 dark:text-slate-100 truncate">
                            {c.name.trim() || `Contact Person #${i + 1}`}
                          </span>
                          {c.is_primary && (
                            <Badge className="bg-orange-100 text-brand hover:bg-orange-100 text-[9px] px-1 py-0 font-bold border-none">
                              Primary
                            </Badge>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500 block truncate">
                          {c.title || 'Representative'} {c.phone ? `• +966 ${c.phone}` : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                <div className="flex justify-between text-[11px] font-semibold text-slate-500">
                  <span>Required fields</span>
                  <span>{filledCount} of {completionFields.length}</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-brand h-full transition-all duration-300 rounded-full"
                    style={{ width: `${completionPct}%` }}
                  />
                </div>
              </div>
            </Card>

          </div>

        </div>

      </div>
    </DashboardLayout>
  );
}
