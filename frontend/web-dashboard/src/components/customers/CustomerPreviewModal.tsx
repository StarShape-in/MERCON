import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, User, Phone, Mail, FileText, Edit2, ExternalLink,
  ShieldCheck, X, PlusCircle, CreditCard, Award, MessageSquare
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import PhoneDisplay from '@/components/ui/PhoneDisplay';
import { WhatsAppIcon } from '@/components/ui/whatsapp-icon';
import { Customer } from '@/services/customerService';
import { useDeploymentTimezone, formatInDeploymentTz } from '@/lib/datetime';

interface CustomerPreviewModalProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  onCreateTrip?: (customer: Customer) => void;
  onEdit?: (customer: Customer) => void;
}

export default function CustomerPreviewModal({
  customer,
  isOpen,
  onClose,
  onCreateTrip,
  onEdit,
}: CustomerPreviewModalProps) {
  const navigate = useNavigate();
  const tz = useDeploymentTimezone();

  if (!customer) return null;

  const handleOpenFullDetails = () => {
    onClose();
    navigate(`/customers/${customer.id}`);
  };

  const handleOpenEdit = () => {
    onClose();
    if (onEdit) {
      onEdit(customer);
    } else {
      navigate(`/customers/${customer.id}/edit`);
    }
  };

  const phoneToUse = customer.contact_phone || customer.primary_contact_phone || customer.phone;

  const handleWhatsApp = () => {
    if (customer.whatsapp_group_link) {
      window.open(customer.whatsapp_group_link, '_blank');
      return;
    }
    const cleanPhone = (customer.whatsapp_number || phoneToUse || '').replace(/[^0-9]/g, '');
    if (cleanPhone) {
      window.open(`https://wa.me/${cleanPhone}`, '_blank');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl w-[92vw] p-0 overflow-hidden rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-2xl">
        {/* Header Strip */}
        <DialogHeader className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex flex-row items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0 border border-brand/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-base font-extrabold text-slate-900 dark:text-slate-100 truncate">
                  Company / Customer Profile Preview
                </DialogTitle>
                <Badge className={customer.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600'}>
                  {customer.isActive ? 'Active Account' : 'Inactive'}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Client company dossier & commercial profile
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </Button>
        </DialogHeader>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Hero Identity Banner */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 p-4 rounded-2xl bg-gradient-to-br from-indigo-50/70 via-slate-50 to-white dark:from-indigo-950/20 dark:via-slate-900 dark:to-slate-900 border border-slate-200/80 dark:border-slate-800 relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand via-indigo-500 to-emerald-500" />

            <div className="w-16 h-16 rounded-2xl bg-brand text-white flex items-center justify-center text-xl font-black font-mono shrink-0 shadow-md overflow-hidden">
              {customer.logo_url || customer.avatar_url ? (
                <img src={customer.logo_url || customer.avatar_url || ''} alt={customer.name} className="w-full h-full object-cover" />
              ) : (
                <Building2 className="w-8 h-8 text-white" />
              )}
            </div>

            <div className="flex-1 min-w-0 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                  {customer.name}
                </h2>
                {customer.company_name && customer.company_name !== customer.name && (
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    ({customer.company_name})
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-2 text-xs">
                {phoneToUse && <PhoneDisplay phone={phoneToUse} showActions variant="badge" />}
                {customer.tax_number && (
                  <span className="flex items-center gap-1.5 font-mono font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1 text-slate-700 dark:text-slate-200 shadow-2xs">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    VAT/CR: {customer.tax_number}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-brand" /> Total Trips Booked
              </span>
              <div className="font-mono text-base font-black text-slate-900 dark:text-slate-100 pt-0.5">
                {customer._count?.trips ?? customer.trips?.length ?? 0} Trips
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-emerald-500" /> Credit Limit
              </span>
              <div className="font-mono text-base font-black text-slate-900 dark:text-slate-100 pt-0.5">
                SAR {(customer.credit_limit || 0).toLocaleString()}
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-500" /> Payment Terms
              </span>
              <div className="font-semibold text-xs text-slate-800 dark:text-slate-200 pt-1">
                {customer.payment_terms || 'Net 30 Days'}
              </div>
            </div>
          </div>

          {/* Dossier Summary Details */}
          <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 bg-white dark:bg-slate-900 space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-brand" /> Commercial Profile & Contacts
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Primary Contact Person:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {customer.primary_contact_person || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Primary Phone:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {customer.primary_contact_phone || customer.contact_phone || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Secondary Contact:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {customer.secondary_contact_person || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">WhatsApp Group:</span>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400 truncate max-w-[150px]">
                  {customer.whatsapp_group_name || (customer.whatsapp_group_link ? 'Group Connected' : 'N/A')}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Account Onboarding:</span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                  {formatInDeploymentTz(customer.createdAt, tz, 'MM/dd/yyyy')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <DialogFooter className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            {(phoneToUse || customer.whatsapp_group_link) && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleWhatsApp}
                className="h-8.5 text-xs font-bold gap-1.5 border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-400"
              >
                <WhatsAppIcon className="w-4 h-4 text-emerald-600" /> WhatsApp
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenEdit}
              className="h-8.5 text-xs font-bold gap-1.5 border-slate-200 dark:border-slate-700"
            >
              <Edit2 className="w-3.5 h-3.5 text-slate-500" /> Edit Customer
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {onCreateTrip && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  onCreateTrip(customer);
                }}
                className="h-8.5 text-xs font-bold gap-1.5 border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-400"
              >
                <PlusCircle className="w-3.5 h-3.5 text-indigo-600" /> + Dispatch Trip
              </Button>
            )}

            <Button
              size="sm"
              onClick={handleOpenFullDetails}
              className="h-8.5 text-xs font-bold bg-brand hover:bg-brand-hover text-white gap-1.5 px-4 shadow-sm"
            >
              Full Company Profile <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
