import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, User, Phone, Mail, MapPin, FileText, Edit2, ExternalLink,
  ShieldCheck, X, Truck
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import PhoneDisplay from '@/components/ui/PhoneDisplay';
import { WhatsAppIcon } from '@/components/ui/whatsapp-icon';
import { ThirdPartyProvider } from '@/services/thirdPartyService';
import { useDeploymentTimezone, formatInDeploymentTz } from '@/lib/datetime';

interface ThirdPartyPreviewModalProps {
  provider: ThirdPartyProvider | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (provider: ThirdPartyProvider) => void;
}

export default function ThirdPartyPreviewModal({
  provider,
  isOpen,
  onClose,
  onEdit,
}: ThirdPartyPreviewModalProps) {
  const navigate = useNavigate();
  const tz = useDeploymentTimezone();

  if (!provider) return null;

  const handleOpenFullDetails = () => {
    onClose();
    navigate(`/third-party/${provider.id}`);
  };

  const handleOpenEdit = () => {
    onClose();
    if (onEdit) {
      onEdit(provider);
    }
  };

  const handleWhatsApp = () => {
    if (!provider.phone) return;
    const cleanPhone = provider.phone.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl w-[92vw] p-0 overflow-hidden rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-2xl">
        {/* Header Strip */}
        <DialogHeader className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex flex-row items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <Building2 className="w-6 h-6 text-purple-600 dark:text-purple-400 shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-base font-extrabold text-slate-900 dark:text-slate-100 truncate">
                  Third-Party Provider Preview
                </DialogTitle>
                <Badge className={provider.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600'}>
                  {provider.isActive ? 'Active Partner' : 'Inactive'}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Subcontractor & Rental Logistics Carrier Dossier
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
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 p-4 rounded-2xl bg-gradient-to-br from-purple-50/70 via-slate-50 to-white dark:from-purple-950/20 dark:via-slate-900 dark:to-slate-900 border border-slate-200/80 dark:border-slate-800 relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-emerald-500" />

            <Truck className="w-7 h-7 text-white shrink-0" />

            <div className="flex-1 min-w-0 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                  {provider.name}
                </h2>
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-2 text-xs">
                {provider.phone && <PhoneDisplay phone={provider.phone} showActions variant="badge" />}
                {provider.tax_id && (
                  <span className="flex items-center gap-1.5 font-mono font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1 text-slate-700 dark:text-slate-200 shadow-2xs">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    Tax/CR: {provider.tax_id}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-purple-500" /> Primary Representative
              </span>
              <div className="font-bold text-xs text-slate-800 dark:text-slate-200 pt-0.5">
                {provider.contact_person || 'N/A'}
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-indigo-500" /> Total Subcontract Trips
              </span>
              <div className="font-mono text-base font-black text-slate-900 dark:text-slate-100 pt-0.5">
                {(provider as any)._count?.trips ?? (provider as any).trips?.length ?? 0} Trips
              </div>
            </div>
          </div>

          {/* Detailed Dossier */}
          <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 bg-white dark:bg-slate-900 space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-purple-600" /> Provider Profile & Terms
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Email Address:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {provider.email || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Yard / Office Address:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[180px]">
                  {provider.address || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800 sm:col-span-2">
                <span className="text-slate-500">Internal Notes / Terms:</span>
                <span className="font-medium text-slate-700 dark:text-slate-300 italic">
                  {provider.notes || 'No specific terms recorded.'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <DialogFooter className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            {provider.phone && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleWhatsApp}
                className="h-8.5 text-xs font-bold gap-1.5 border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-400"
              >
                <WhatsAppIcon className="w-4 h-4 text-emerald-600" /> WhatsApp
              </Button>
            )}
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenEdit}
                className="h-8.5 text-xs font-bold gap-1.5 border-slate-200 dark:border-slate-700"
              >
                <Edit2 className="w-3.5 h-3.5 text-slate-500" /> Edit Provider
              </Button>
            )}
          </div>

          <Button
            size="sm"
            onClick={handleOpenFullDetails}
            className="h-8.5 text-xs font-bold bg-brand hover:bg-brand-hover text-white gap-1.5 px-4 shadow-sm"
          >
            Full Provider Dossier <ExternalLink className="w-3.5 h-3.5" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
