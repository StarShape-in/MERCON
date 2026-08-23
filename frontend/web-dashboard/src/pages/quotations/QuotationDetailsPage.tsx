import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, ArrowRight, Edit2, Trash2, MapPin, Building2,
  FileText, RotateCw, Plus,
  Download, AlertTriangle, DollarSign,
  Truck, Tag, Search, ShieldCheck, Clock, ExternalLink,
  ChevronRight, Copy, Check, Filter, Calendar, Receipt, History,
  MoreHorizontal, Power, Zap, Route as RouteIcon, FileSpreadsheet,
  Info, CreditCard, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';

import DashboardLayout from '@/components/layout/DashboardLayout';
import ConfirmModal from '@/components/ui/ConfirmModal';
import QuotationFormDialog from '@/components/quotations/QuotationFormDialog';
import KpiCard from '@/components/ui/KpiCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { quotationService, surchargeRuleService, Quotation } from '@/services/quotationService';
import { tripService } from '@/services/tripService';
import { useDeploymentTimezone, formatInDeploymentTz } from '@/lib/datetime';
import { Skeleton } from '@/components/ui/skeleton';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

function getLineTypeLabel(lineType?: string | null): string {
  const lt = (lineType || '').toUpperCase();
  if (lt.includes('ROUND')) return 'Round Trip';
  if (lt.includes('10')) return '10 Hrs Duty';
  if (lt.includes('12')) return '12 Hrs Duty';
  return 'Single Trip';
}

function getBillingTypeLabel(billingType?: string | null): string {
  const bt = (billingType || '').toUpperCase();
  if (bt.includes('MONTHLY')) return 'Monthly';
  return 'Extra';
}

function getPricingBasisLabel(pricingBasis?: string | null): string {
  if (!pricingBasis) return 'Not Specified';
  if (pricingBasis === 'PER_TRIP') return 'Per Trip';
  if (pricingBasis === 'PER_MONTH') return 'Per Month';
  return pricingBasis;
}

export default function QuotationDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
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
  const { data: tripsRes } = useQuery({
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

  const handleToggleActive = async () => {
    if (!quotation) return;
    try {
      await quotationService.update(quotation.id, { is_active: !quotation.is_active });
      toast.success(`Quotation ${quotation.is_active ? 'deactivated' : 'activated'} successfully`);
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      queryClient.invalidateQueries({ queryKey: ['quotation', id] });
      setIsDeactivateModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update quotation status');
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
        <div className="space-y-6 pb-16">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
            <Skeleton className="h-8 w-64 rounded-xl" />
            <Skeleton className="h-9 w-32 rounded-xl" />
          </div>
          <Skeleton className="h-32 w-full rounded-2xl" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-48 w-full rounded-2xl" />
              <Skeleton className="h-48 w-full rounded-2xl" />
            </div>
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !quotation) {
    return (
      <DashboardLayout active="Quotations" title="Quotation Details">
        <div className="py-20 text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center mx-auto text-2xl border border-amber-200 dark:border-amber-900">
            ⚠️
          </div>
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">
            Quotation Not Found
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            This quotation may have been deleted or is no longer available.
          </p>
          <Button onClick={() => navigate('/quotations')} size="sm" className="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 rounded-xl">
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
        {/* Header Navigation & Top Bar Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
              <button
                onClick={() => navigate('/quotations')}
                className="hover:text-indigo-600 flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Quotations
              </button>
              <span>/</span>
              <span className="text-slate-900 dark:text-slate-100 font-bold">
                {quotation.customer?.name || 'Customer Quotation'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {originName} → {destName}
              </h1>
              {quotation.is_active ? (
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50 font-semibold text-xs px-2.5 py-0.5">Active</Badge>
              ) : (
                <Badge className="bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 text-xs">Inactive</Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/quotations/${id}/edit`)}
              className="h-9 gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold"
            >
              <Edit2 className="h-4 w-4 text-slate-500" />
              <span>Edit Quotation</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 rounded-xl border-slate-200 dark:border-slate-800"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 text-xs">
                <DropdownMenuLabel>Quotation Options</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { setSelectedQuotation({ ...quotation, id: undefined as any }); setIsEditModalOpen(true); }}>
                  <Copy className="h-3.5 w-3.5 mr-2 text-indigo-500" />
                  <span>Duplicate</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsDeactivateModalOpen(true)}>
                  <Power className="h-3.5 w-3.5 mr-2 text-amber-500" />
                  <span>{quotation.is_active ? 'Deactivate' : 'Activate'}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setIsDeleteModalOpen(true)} className="text-rose-600 dark:text-rose-400 focus:text-rose-600">
                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                  <span>Delete</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => refetch()}
              title="Refresh Data"
              className="h-9 w-9 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl"
            >
              <RotateCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
            </Button>
          </div>
        </div>

        {/* Quotation Hero / Commercial Summary Card */}
        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="text-[11px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500">
              Commercial Rate
            </div>
            <div className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 flex items-baseline gap-2">
              <span>{quotation.currency || 'SAR'} {Number(quotation.rate ?? quotation.base_price ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                / {getPricingBasisLabel(quotation.pricing_basis)}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50 font-semibold text-xs">
                {getBillingTypeLabel(quotation.billing_type)} Billing
              </Badge>
              <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900/50 font-semibold text-xs">
                {getLineTypeLabel(quotation.line_type || quotation.rate_category)}
              </Badge>
              <Badge className="bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 font-semibold text-xs">
                {quotation.vehicle_class || 'Standard'}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-4 border-t md:border-t-0 border-slate-100 dark:border-slate-800 pt-4 md:pt-0">
            <div className="text-center px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 min-w-[100px]">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Linked Trips</div>
              <div className="text-xl font-bold text-slate-900 dark:text-slate-100">{totalLinkedTrips}</div>
            </div>
            <div className="text-center px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 min-w-[100px]">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Surcharges</div>
              <div className="text-xl font-bold text-slate-900 dark:text-slate-100">{applicableSurcharges.length}</div>
            </div>
          </div>
        </div>

        {/* Main Content Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2 Cols): Route & Commercial Terms & History */}
          <div className="lg:col-span-2 space-y-6">
            {/* Sequential Ordered Route Corridor */}
            <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <RouteIcon className="h-4 w-4 text-indigo-600" /> Route Corridor & Sequential Stops
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 pb-6">
                {stops.length > 0 ? (
                  <div className="relative pl-6 space-y-6 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
                    {stops.map((s, idx) => {
                      const isPickup = s.sequence === 1 || s.stop_type === 'Pickup';
                      const isDropoff = idx === stops.length - 1 || s.stop_type === 'Dropoff';

                      return (
                        <div key={s.id || idx} className="relative flex items-start gap-4">
                          <div className={cn(
                            "absolute -left-6 top-0.5 h-6 w-6 rounded-full flex items-center justify-center font-bold text-[11px] border shadow-2xs",
                            isPickup ? "bg-emerald-600 text-white border-emerald-700" : isDropoff ? "bg-rose-600 text-white border-rose-700" : "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300"
                          )}>
                            {idx + 1}
                          </div>
                          <div className="flex-1 bg-slate-50/60 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                {s.source_label || s.location?.name || `Stop ${idx + 1}`}
                              </span>
                              <Badge className={cn(
                                "text-[10px] font-semibold",
                                isPickup ? "bg-emerald-50 text-emerald-700 border-emerald-200" : isDropoff ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-slate-100 text-slate-600"
                              )}>
                                {isPickup ? 'Pickup' : isDropoff ? 'Dropoff' : 'Via Stop'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="font-bold text-xs text-slate-800 dark:text-slate-200">{originName}</div>
                    <ArrowRight className="h-4 w-4 text-slate-400" />
                    <div className="font-bold text-xs text-slate-800 dark:text-slate-200">{destName}</div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Commercial Terms Breakdown */}
            <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-xs">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-indigo-600" /> Commercial Terms
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block mb-1">Customer</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{quotation.customer?.name || 'Customer'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Billing Type</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{getBillingTypeLabel(quotation.billing_type)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Line Type</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{getLineTypeLabel(quotation.line_type || quotation.rate_category)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Pricing Basis</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{getPricingBasisLabel(quotation.pricing_basis)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Commercial Rate</span>
                  <span className="font-extrabold text-slate-900 dark:text-slate-100">{quotation.currency || 'SAR'} {Number(quotation.rate ?? quotation.base_price ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Currency</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{quotation.currency || 'SAR'}</span>
                </div>
              </CardContent>
            </Card>

            {/* Vehicle Requirement Card */}
            <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-xs">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Truck className="h-4 w-4 text-indigo-600" /> Vehicle Requirement
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="text-slate-400 block mb-1">Normalized Vehicle Class (Primary)</span>
                    <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{quotation.vehicle_class || 'Standard'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1">Customer Wording (Secondary)</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{quotation.source_vehicle_label || quotation.vehicle_type || '—'}</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-2">
                  <Info className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
                  <span>
                    This section specifies the commercial vehicle requirement agreed in the customer contract. The actual physical truck assigned to a trip (<code className="text-indigo-600 dark:text-indigo-400">vehicleId</code>) is selected at dispatch and does not overwrite this commercial specification.
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Rate Revision History & Audit Log */}
            <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-xs">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <History className="h-4 w-4 text-indigo-600" /> Quotation Rate History & Revision Log
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {priceHistory.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400">
                    No rate revisions recorded for this quotation yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {priceHistory.map((h) => (
                      <div key={h.id} className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 text-xs flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-900 dark:text-slate-100">
                            {h.old_base_price != null || h.old_rate != null
                              ? `Rate adjusted: SAR ${h.old_rate || h.old_base_price} → SAR ${h.new_rate || h.new_base_price}`
                              : `Initial Rate Set: SAR ${h.new_rate || h.new_base_price}`}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            By {h.changed_by_name || 'System User'} • Reason: {h.reason || 'Operational adjustment'}
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {formatInDeploymentTz(h.createdAt, tz, 'dd MMM yyyy, hh:mm a')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column (1 Col): Validity & Provenance & Surcharges */}
          <div className="space-y-6">
            {/* Validity Section */}
            <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-xs">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-indigo-600" /> Validity & Active Period
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block mb-0.5">Valid From</span>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                    {quotation.valid_from ? quotation.valid_from.substring(0, 10) : 'Not Specified'}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block mb-0.5">Valid Until</span>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                    {quotation.valid_to ? quotation.valid_to.substring(0, 10) : 'Not Specified'}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block mb-0.5">Status</span>
                  <div>
                    {quotation.is_active ? (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50 font-semibold text-xs">Active</Badge>
                    ) : (
                      <Badge className="bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 text-xs">Inactive</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Source & Provenance Card */}
            <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-xs">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-indigo-600" /> Source & Provenance
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block mb-0.5">Source Type</span>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                    {quotation.source_type || 'Operational Quotation'}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block mb-0.5">Source Reference</span>
                  <div className="font-mono text-slate-700 dark:text-slate-300 text-[11px] break-all">
                    {quotation.source_reference || 'Not Specified'}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block mb-0.5">Quotation ID</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-700 dark:text-slate-300 text-[11px] truncate">{quotation.id}</span>
                    <button onClick={() => copyToClipboard(quotation.id)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                      {copiedId === quotation.id ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Applicable Surcharges Card */}
            <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-xs">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Tag className="h-4 w-4 text-indigo-600" /> Additional Surcharge Fees
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {applicableSurcharges.length === 0 ? (
                  <div className="py-4 text-center text-xs text-slate-400">
                    No additional surcharge rules configured for this quotation.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {applicableSurcharges.map((s) => (
                      <div key={s.id} className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 text-xs flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-900 dark:text-slate-100">{s.charge_type}</div>
                          <div className="text-[10px] text-slate-400">{s.unit || 'per instance'}</div>
                        </div>
                        <div className="font-extrabold text-emerald-700 dark:text-emerald-400">
                          {s.currency} {Number(s.rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

      {/* Edit Dialog */}
      <QuotationFormDialog
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        quotation={selectedQuotation || quotation}
        onSaved={() => refetch()}
      />

      {/* Deactivate Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeactivateModalOpen}
        onClose={() => setIsDeactivateModalOpen(false)}
        onConfirm={handleToggleActive}
        title={quotation.is_active ? 'Deactivate Commercial Quotation?' : 'Activate Commercial Quotation?'}
        message={quotation.is_active
          ? 'This quotation will no longer be selected for new trip pricing. Historical trip records will remain unchanged.'
          : 'This quotation will become active for automatic trip rate matching.'}
        confirmLabel={quotation.is_active ? 'Deactivate Quotation' : 'Activate Quotation'}
        isDestructive={quotation.is_active}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Commercial Quotation"
        message="Are you sure you want to delete this commercial quotation? Historical trips billed with this quotation will retain their commercial snapshot."
        confirmLabel="Delete Quotation"
        isDestructive
      />
    </DashboardLayout>
  );
}

export const RateCardDetailsPage = QuotationDetailsPage;
