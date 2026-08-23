import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, ArrowRight, Edit2, Trash2, MapPin, Building2,
  FileCheck, RefreshCw, Plus,
  Layers, Download, AlertTriangle, DollarSign,
  Truck, Tag, Search, ShieldCheck, Clock, ExternalLink,
  ChevronRight, Copy, Check, Filter, Calendar, Receipt, History
} from 'lucide-react';
import { toast } from 'sonner';

import DashboardLayout from '@/components/layout/DashboardLayout';
import ConfirmModal from '@/components/ui/ConfirmModal';
import QuotationFormDialog from '@/components/rate-cards/RateCardFormDialog';
import KpiCard from '@/components/ui/KpiCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { quotationService, surchargeRuleService, Quotation } from '@/services/quotationService';
import { tripService } from '@/services/tripService';
import { useDeploymentTimezone, formatInDeploymentTz } from '@/lib/datetime';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function QuotationDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const tz = useDeploymentTimezone();

  // 1. Fetch Quotation details
  const { data: quotation, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['quotation', id],
    queryFn: () => quotationService.getById(id!),
    enabled: !!id,
  });

  // 2. Surcharge fees linked to this quotation/customer
  const { data: applicableSurcharges = [] } = useQuery({
    queryKey: ['surcharge-rules', quotation?.customerId, quotation?.id],
    queryFn: () => surchargeRuleService.list({ customerId: quotation!.customerId, quotationId: quotation!.id, active_only: true }),
    enabled: !!quotation?.id && !!quotation?.customerId,
  });

  // 3. Price History & Audit Log
  const { data: priceHistory = [] } = useQuery({
    queryKey: ['quotation-history', id],
    queryFn: () => quotationService.getHistory(id!),
    enabled: !!id,
  });

  // 4. Linked Trips count
  const { data: tripsRes, isLoading: isTripsLoading } = useQuery({
    queryKey: ['trips', 'quotation', id],
    queryFn: () => tripService.getAll({ quotation_id: id, per_page: 50 }),
    enabled: !!id,
  });

  const linkedTrips = tripsRes?.data || [];
  const totalLinkedTrips = tripsRes?.meta?.total || linkedTrips.length;

  const handleDelete = async () => {
    if (!quotation) return;
    try {
      await quotationService.delete(quotation.id);
      toast.success('Quotation deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      navigate('/quotations');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete quotation');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    toast.success('Copied ID to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (isLoading) {
    return (
      <DashboardLayout active="Quotations" title="Quotation Details">
        <div className="py-20 text-center text-xs text-slate-400">
          Loading commercial quotation details...
        </div>
      </DashboardLayout>
    );
  }

  if (error || !quotation) {
    return (
      <DashboardLayout active="Quotations" title="Quotation Details">
        <div className="py-20 text-center space-y-3">
          <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">
            Quotation Not Found
          </h2>
          <p className="text-xs text-slate-500">
            The requested quotation could not be loaded or was deleted.
          </p>
          <Button onClick={() => navigate('/quotations')} size="sm" className="mt-2 text-xs">
            Back to Quotations
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const stops = quotation.stops || [];
  const pickup = stops.find((s) => s.stop_type === 'Pickup') || stops[0];
  const dropoff = [...stops].reverse().find((s) => s.stop_type === 'Dropoff') || stops[stops.length - 1];

  const originName = pickup?.source_label || pickup?.location?.name || quotation.route_origin || 'Origin';
  const destName = dropoff?.source_label || dropoff?.location?.name || quotation.route_destination || 'Destination';

  return (
    <DashboardLayout active="Quotations" title="Quotation Details">
      <div className="space-y-6 pb-16">
        {/* Header Breadcrumb & Top Bar Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
              <button
                onClick={() => navigate('/quotations')}
                className="hover:text-indigo-600 flex items-center gap-1"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Commercial Quotations
              </button>
              <span>/</span>
              <span className="text-slate-900 dark:text-slate-100 font-bold">
                {quotation.name || 'Quotation Details'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {quotation.customer?.name || 'Customer Agreement'}
              </h1>
              {quotation.is_active ? (
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Active</Badge>
              ) : (
                <Badge className="bg-slate-100 text-slate-500 border-slate-200">Inactive</Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditModalOpen(true)}
              className="h-9 gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              <Edit2 className="h-4 w-4 text-slate-500" />
              <span>Edit Quotation</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteModalOpen(true)}
              className="h-9 gap-1.5 border-rose-200 text-rose-700 hover:bg-rose-50"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => refetch()}
              className="h-9 w-9 text-slate-500"
            >
              <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
            </Button>
          </div>
        </div>

        {/* Commercial Rate Banner */}
        <div className="p-6 bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="text-xs uppercase tracking-wider font-semibold text-indigo-300">
              Commercial Quotation Rate
            </div>
            <div className="text-3xl font-extrabold tracking-tight text-white flex items-baseline gap-2">
              <span>{quotation.currency || 'SAR'} {Number(quotation.rate ?? quotation.base_price ?? 0).toLocaleString()}</span>
              <span className="text-xs font-normal text-indigo-200">
                / {quotation.pricing_basis === 'PER_TRIP' ? 'per trip' : quotation.pricing_basis === 'PER_MONTH' ? 'per month' : 'specified rate'}
              </span>
            </div>
            <div className="text-xs text-slate-300 flex items-center gap-3 pt-1">
              <span>Line: <strong>{quotation.line_type || quotation.rate_category || 'Single Trip'}</strong></span>
              <span>•</span>
              <span>Billing: <strong>{quotation.billing_type || 'Extra'}</strong></span>
              <span>•</span>
              <span>Basis: <strong>{quotation.pricing_basis ? (quotation.pricing_basis === 'PER_TRIP' ? 'Per Trip' : 'Per Month') : 'Not specified'}</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-4 border-t md:border-t-0 border-indigo-800/80 pt-4 md:pt-0">
            <div className="text-center px-4 py-2 bg-indigo-950/60 rounded-xl border border-indigo-800/50">
              <div className="text-[10px] text-indigo-300 uppercase font-semibold">Linked Trips</div>
              <div className="text-xl font-bold text-white">{totalLinkedTrips}</div>
            </div>
            <div className="text-center px-4 py-2 bg-indigo-950/60 rounded-xl border border-indigo-800/50">
              <div className="text-[10px] text-indigo-300 uppercase font-semibold">Surcharge Rules</div>
              <div className="text-xl font-bold text-white">{applicableSurcharges.length}</div>
            </div>
          </div>
        </div>

        {/* Content Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2 Cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Ordered Visual Route Corridor */}
            <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-indigo-600" /> Visual Route Corridor
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 pb-6">
                {stops.length > 0 ? (
                  <div className="space-y-4">
                    {stops.map((s, idx) => (
                      <div key={s.id || idx} className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 font-bold text-xs border border-indigo-200">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {s.source_label || s.location?.name || `Stop ${idx + 1}`}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Type: {s.stop_type}
                          </div>
                        </div>
                        {idx < stops.length - 1 && (
                          <div className="text-slate-300 dark:text-slate-600">↓</div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="font-semibold text-sm text-slate-800 dark:text-slate-200">{originName}</div>
                    <div className="text-slate-400 font-bold">→</div>
                    <div className="font-semibold text-sm text-slate-800 dark:text-slate-200">{destName}</div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Commercial Terms Breakdown */}
            <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-indigo-600" /> Commercial Terms Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block mb-1">Normalized Vehicle Class</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{quotation.vehicle_class || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Customer Source Vehicle Label</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{quotation.source_vehicle_label || quotation.vehicle_type || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Line Type</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{quotation.line_type || quotation.rate_category || 'SINGLE_TRIP'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Billing Type</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{quotation.billing_type || 'EXTRA'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Pricing Basis</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{quotation.pricing_basis ? (quotation.pricing_basis === 'PER_TRIP' ? 'Per Trip' : 'Per Month') : 'Not specified'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Source Type & Reference</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{quotation.source_type || 'MANUAL'} {quotation.source_reference ? `(${quotation.source_reference})` : ''}</span>
                </div>
              </CardContent>
            </Card>

            {/* Audit History & Rate Revisions */}
            <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <History className="h-4 w-4 text-indigo-600" /> Quotation Rate History & Audit Log
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {priceHistory.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400">
                    No rate adjustments recorded for this quotation yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {priceHistory.map((h) => (
                      <div key={h.id} className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 text-xs flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {h.old_base_price != null ? `Rate updated: SAR ${h.old_base_price} → SAR ${h.new_base_price}` : `Initial Rate Set: SAR ${h.new_base_price}`}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            By {h.changed_by_name || 'System User'} • Reason: {h.reason || 'No reason specified'}
                          </div>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {formatInDeploymentTz(h.createdAt, tz, 'dd MMM yyyy, hh:mm a')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column (1 Col): Metadata & Surcharges */}
          <div className="space-y-6">
            {/* Quotation Metadata Card */}
            <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-indigo-600" /> Agreement Metadata
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block mb-0.5">Quotation ID</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-700 dark:text-slate-300 text-[11px] truncate">{quotation.id}</span>
                    <button onClick={() => copyToClipboard(quotation.id)} className="text-slate-400 hover:text-slate-600">
                      {copiedId === quotation.id ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block mb-0.5">Validity Dates</span>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    {quotation.valid_from ? `${quotation.valid_from.substring(0, 10)} to ${quotation.valid_to ? quotation.valid_to.substring(0, 10) : 'Ongoing'}` : 'Ongoing Agreement'}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block mb-0.5">Created At</span>
                  <div className="font-medium text-slate-700 dark:text-slate-300">
                    {formatInDeploymentTz(quotation.createdAt, tz, 'dd MMM yyyy, hh:mm a')}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Applicable Surcharge Fees */}
            <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-600" /> Applicable Surcharge Rules
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {applicableSurcharges.length === 0 ? (
                  <div className="py-4 text-center text-xs text-slate-400">
                    No specific surcharge rules linked to this quotation.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {applicableSurcharges.map((s) => (
                      <div key={s.id} className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 text-xs flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-800 dark:text-slate-200">{s.charge_type}</div>
                          <div className="text-[10px] text-slate-400">{s.unit || 'per instance'}</div>
                        </div>
                        <div className="font-bold text-emerald-700 dark:text-emerald-400">
                          {s.currency} {s.rate}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Modals */}
      <QuotationFormDialog
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        quotation={quotation}
        onSaved={() => refetch()}
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Quotation"
        message="Are you sure you want to delete this commercial quotation?"
        confirmLabel="Delete Quotation"
        isDestructive
      />
    </DashboardLayout>
  );
}

export const RateCardDetailsPage = QuotationDetailsPage;
