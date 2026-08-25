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
  Info, CreditCard, Sparkles, X, CheckCircle2, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

import DashboardLayout from '@/components/layout/DashboardLayout';
import ConfirmModal from '@/components/ui/ConfirmModal';
import SurchargeRuleModal from '@/components/quotations/SurchargeRuleModal';
import { quotationService, surchargeRuleService, Quotation, QuotationHistory, SurchargeRule } from '@/services/quotationService';
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
  if (!pricingBasis) return 'Not specified';
  if (pricingBasis === 'PER_TRIP') return 'Per Trip';
  if (pricingBasis === 'PER_MONTH') return 'Per Month';
  return pricingBasis;
}

export default function QuotationDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'surcharges' | 'documents'>('overview');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<QuotationHistory | null>(null);

  // Surcharge Rule Modal State
  const [isSurchargeModalOpen, setIsSurchargeModalOpen] = useState(false);
  const [editingSurchargeRule, setEditingSurchargeRule] = useState<SurchargeRule | null>(null);
  const [ruleToDeactivate, setRuleToDeactivate] = useState<SurchargeRule | null>(null);

  const tz = useDeploymentTimezone();

  // 1. Fetch Quotation details
  const { data: quotation, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['quotation', id],
    queryFn: () => quotationService.getById(id!),
    enabled: !!id,
  });

  // 2. Surcharge fees linked to this quotation/customer
  const { data: applicableSurcharges = [], refetch: refetchSurcharges } = useQuery({
    queryKey: ['surcharge-rules', quotation?.customerId, quotation?.id],
    queryFn: () => surchargeRuleService.list({ customerId: quotation!.customerId, quotationId: quotation!.id }),
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

  // Deactivate / Activate Mutation for Quotation
  const toggleActiveMutation = useMutation({
    mutationFn: async () => {
      if (!quotation) return;
      return quotationService.update(quotation.id, { is_active: !quotation.is_active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotation', id] });
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      toast.success(`Quotation ${quotation?.is_active ? 'deactivated' : 'activated'} successfully.`);
      setIsDeactivateModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update quotation status.');
    },
  });

  // Toggle Surcharge Rule Active State Mutation
  const toggleSurchargeMutation = useMutation({
    mutationFn: async (rule: SurchargeRule) => {
      return surchargeRuleService.update(rule.id, { is_active: !rule.is_active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surcharge-rules'] });
      toast.success('Additional charge status updated.');
      setRuleToDeactivate(null);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update charge status.');
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!quotation) return;
      return quotationService.delete(quotation.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      toast.success('Quotation deleted successfully.');
      navigate('/quotations');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to delete quotation.');
    },
  });

  if (isLoading) {
    return (
      <DashboardLayout active="Quotations" title="Quotation Details">
        <div className="p-8 space-y-4">
          <Skeleton className="h-8 w-64 rounded-lg" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="lg:col-span-2 h-96 rounded-xl" />
            <Skeleton className="h-96 rounded-xl" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !quotation) {
    return (
      <DashboardLayout active="Quotations" title="Quotation Details">
        <div className="p-12 text-center space-y-4">
          <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Quotation Not Found</h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            The requested quotation record does not exist or has been removed.
          </p>
          <Button variant="outline" size="sm" onClick={() => navigate('/quotations')}>
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
  const currentRate = Number(quotation.rate ?? quotation.base_price ?? 0);

  const activeSurchargesCount = applicableSurcharges.filter((s) => s.is_active).length;
  const inactiveSurchargesCount = applicableSurcharges.length - activeSurchargesCount;

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
              {quotation.customer?.id && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/customers/${quotation.customer!.id}`)}
                  className="h-6 px-2.5 text-[11px] font-bold gap-1 text-indigo-600 hover:text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100/70 border-indigo-200 dark:bg-indigo-950/40 dark:border-indigo-900/60 dark:text-indigo-400 rounded-lg ml-1"
                >
                  <Building2 className="w-3 h-3" />
                  <span>View Customer</span>
                </Button>
              )}
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
                <DropdownMenuItem onClick={() => navigate(`/quotations/new?customer_id=${quotation.customerId}&origin_id=${quotation.originLocationId || ''}&dest_id=${quotation.destinationLocationId || ''}`)}>
                  <Copy className="h-3.5 w-3.5 mr-2 text-indigo-500" />
                  <span>Duplicate</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate(`/quotations/${id}/documents`)}>
                  <FileSpreadsheet className="h-3.5 w-3.5 mr-2 text-emerald-600" />
                  <span>View Source Documents</span>
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

        {/* Section Segmented Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
          <Button
            variant={activeTab === 'overview' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('overview')}
            className={cn(
              "h-8 text-xs font-bold rounded-lg gap-1.5",
              activeTab === 'overview' ? "bg-indigo-600 text-white" : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
            )}
          >
            <Receipt className="h-3.5 w-3.5" />
            <span>Overview</span>
          </Button>

          <Button
            variant={activeTab === 'history' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('history')}
            className={cn(
              "h-8 text-xs font-bold rounded-lg gap-1.5",
              activeTab === 'history' ? "bg-indigo-600 text-white" : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
            )}
          >
            <History className="h-3.5 w-3.5" />
            <span>Quotation History</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-white/20 text-current border-current">
              {priceHistory.length}
            </Badge>
          </Button>

          <Button
            variant={activeTab === 'surcharges' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('surcharges')}
            className={cn(
              "h-8 text-xs font-bold rounded-lg gap-1.5",
              activeTab === 'surcharges' ? "bg-indigo-600 text-white" : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
            )}
          >
            <Tag className="h-3.5 w-3.5 text-amber-500" />
            <span>Surcharges</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-white/20 text-current border-current">
              {applicableSurcharges.length}
            </Badge>
          </Button>

          <Button
            variant={activeTab === 'documents' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => navigate(`/quotations/${id}/documents`)}
            className="h-8 text-xs font-bold rounded-lg gap-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-400"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            <span>Documents & Source</span>
          </Button>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fade-in">
            {/* Hero / Commercial Summary Card */}
            <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="text-[11px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500">
                  Commercial Rate
                </div>
                <div className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 flex items-baseline gap-2">
                  <span>{quotation.currency || 'SAR'} {currentRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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

            {/* Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
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
                      <span className="text-slate-400 block mb-1">Billing Rate</span>
                      <span className="font-extrabold text-emerald-700 dark:text-emerald-400">{quotation.currency || 'SAR'} {currentRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-1">Driver Charge</span>
                      <span className="font-extrabold text-indigo-700 dark:text-indigo-400">
                        {quotation.driver_payout != null ? `${quotation.currency || 'SAR'} ${Number(quotation.driver_payout).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-1">Balance</span>
                      <span className="font-extrabold text-blue-700 dark:text-blue-400">
                        {quotation.driver_payout != null ? `${quotation.currency || 'SAR'} ${(currentRate - Number(quotation.driver_payout)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-1">Currency</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">{quotation.currency || 'SAR'}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
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
                        {quotation.valid_to ? quotation.valid_to.substring(0, 10) : 'Ongoing'}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-xs">
                  <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Source Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3 text-xs">
                    <div>
                      <span className="text-slate-400 block mb-0.5">Source Type</span>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {quotation.source_type || 'Manual Entry'}
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-400 block mb-0.5">Source Reference</span>
                      <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {quotation.source_reference || 'Not specified'}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: QUOTATION HISTORY */}
        {activeTab === 'history' && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Side: Current Active Version Box (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                <Card className="rounded-2xl border-indigo-200/80 dark:border-indigo-900/60 shadow-xs bg-indigo-50/30 dark:bg-indigo-950/20 overflow-hidden">
                  <CardHeader className="py-3 px-4 border-b border-indigo-100 dark:border-indigo-900/50 bg-indigo-100/40 dark:bg-indigo-950/40 flex flex-row items-center justify-between">
                    <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                      CURRENT ACTIVE QUOTATION
                    </CardTitle>
                    <Badge className="bg-emerald-600 text-white text-[10px] font-extrabold px-2 py-0.5">
                      ● ACTIVE
                    </Badge>
                  </CardHeader>

                  <CardContent className="p-5 space-y-4 text-xs">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Current Rate</span>
                      <div className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                        {quotation.currency || 'SAR'} {currentRate.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="bg-white dark:bg-slate-900 text-xs font-semibold">
                        {getBillingTypeLabel(quotation.billing_type)} · {getLineTypeLabel(quotation.line_type)} · {getPricingBasisLabel(quotation.pricing_basis)}
                      </Badge>
                      <Badge variant="outline" className="bg-white dark:bg-slate-900 text-xs font-semibold">
                        {quotation.vehicle_class || '10 TON'}
                      </Badge>
                    </div>

                    <div className="pt-3 border-t border-indigo-100 dark:border-indigo-900/50 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Effective From</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {quotation.valid_from ? quotation.valid_from.substring(0, 10) : '01 Aug 2026'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Valid Until</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {quotation.valid_to ? quotation.valid_to.substring(0, 10) : 'Ongoing'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Historical Safety Notice Box */}
                <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900">
                  <CardHeader className="py-2.5 px-4 border-b border-slate-100 dark:border-slate-800">
                    <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      HISTORICAL TRIPS SAFETY
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-2 text-xs text-slate-600 dark:text-slate-400">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      Quotation changes do not overwrite commercial rates already recorded on historical trips.
                    </p>
                    <p className="text-[11px] leading-relaxed">
                      Existing completed or in-transit trips retain the recorded commercial snapshot applied at dispatch. Rate adjustments apply only to future trip dispatch matching effective from the specified revision date.
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Right Side: Timeline (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900 overflow-hidden">
                  <CardHeader className="py-3 px-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                    <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <History className="h-4 w-4 text-indigo-600" />
                      REVISION TIMELINE & COMMERCIAL AUDIT
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="p-5">
                    {priceHistory.length === 0 ? (
                      <div className="py-10 text-center space-y-2">
                        <History className="h-8 w-8 text-slate-300 mx-auto" />
                        <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">No quotation revisions yet</h4>
                        <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                          This commercial quotation has not been modified since creation on {formatInDeploymentTz(quotation.createdAt, tz, 'dd MMM yyyy')}.
                        </p>
                      </div>
                    ) : (
                      <div className="relative pl-6 space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
                        {priceHistory.map((h, idx) => {
                          const oldVal = Number(h.old_rate ?? h.old_base_price ?? 0);
                          const newVal = Number(h.new_rate ?? h.new_base_price ?? 0);

                          return (
                            <div
                              key={h.id || idx}
                              onClick={() => setSelectedHistoryItem(h)}
                              className="relative flex items-start gap-4 cursor-pointer group"
                            >
                              <div className="absolute -left-6 top-1 h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-[10px] group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                {priceHistory.length - idx}
                              </div>

                              <div className="flex-1 p-4 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100/80 dark:hover:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-800 transition-all space-y-2">
                                <div className="flex items-center justify-between">
                                  <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 text-[10px] font-extrabold">
                                    RATE CHANGE
                                  </Badge>
                                  <span className="text-[11px] font-bold text-slate-400">
                                    {formatInDeploymentTz(h.createdAt, tz, 'dd MMM yyyy · hh:mm a')}
                                  </span>
                                </div>

                                <div className="flex items-center gap-3 text-sm font-black text-slate-900 dark:text-slate-100">
                                  <span>{quotation.currency || 'SAR'} {oldVal > 0 ? oldVal.toLocaleString() : '0.00'}</span>
                                  <span className="text-slate-400 font-bold">→</span>
                                  <span className="text-indigo-600 dark:text-indigo-400">{quotation.currency || 'SAR'} {newVal.toLocaleString()}</span>
                                </div>

                                <div className="space-y-0.5 text-xs text-slate-600 dark:text-slate-400">
                                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                                    Reason: <span className="font-normal italic">{h.reason || 'Annual contract renewal'}</span>
                                  </div>
                                  <div className="text-[11px] text-slate-400">
                                    Changed by: {h.changed_by_name || 'Operational Admin'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

            </div>
          </div>
        )}

        {/* TAB 3: SURCHARGES / ADDITIONAL CHARGES */}
        {activeTab === 'surcharges' && (
          <div className="space-y-6 animate-fade-in">
            
            {/* Header Metrics & Primary Add Action */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div className="flex items-center gap-4">
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Base Quotation Rate</span>
                  <div className="text-xl font-black text-slate-900 dark:text-slate-100">
                    {quotation.currency || 'SAR'} {currentRate.toLocaleString(undefined, { minimumFractionDigits: 2 })} / {getPricingBasisLabel(quotation.pricing_basis)}
                  </div>
                </div>
                <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold text-xs">
                    {activeSurchargesCount} Active Charges
                  </Badge>
                  {inactiveSurchargesCount > 0 && (
                    <Badge variant="outline" className="text-xs text-slate-400">
                      {inactiveSurchargesCount} Inactive
                    </Badge>
                  )}
                </div>
              </div>

              <Button
                size="sm"
                onClick={() => { setEditingSurchargeRule(null); setIsSurchargeModalOpen(true); }}
                className="h-9 px-4 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs rounded-xl gap-1.5"
              >
                <Plus className="h-4 w-4" />
                <span>+ Add Additional Charge</span>
              </Button>
            </div>

            {/* Surcharges Rules List */}
            {applicableSurcharges.length === 0 ? (
              <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900">
                <CardContent className="p-10 text-center space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50 flex items-center justify-center mx-auto">
                    <Tag className="h-6 w-6" />
                  </div>
                  <div className="space-y-1 max-w-sm mx-auto">
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">No additional charges configured</h4>
                    <p className="text-xs text-slate-500 font-medium">
                      This commercial quotation currently has no secondary customer surcharge rules configured.
                    </p>
                  </div>
                  <div className="pt-2">
                    <Button
                      size="sm"
                      onClick={() => { setEditingSurchargeRule(null); setIsSurchargeModalOpen(true); }}
                      className="h-8 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg gap-1.5"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>+ Add Additional Charge</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {applicableSurcharges.map((rule) => (
                  <Card
                    key={rule.id}
                    className={cn(
                      "rounded-xl border shadow-2xs overflow-hidden transition-all bg-white dark:bg-slate-900",
                      rule.is_active ? "border-slate-200/80 dark:border-slate-800" : "border-slate-200/50 dark:border-slate-800/50 opacity-60"
                    )}
                  >
                    <CardHeader className="py-2.5 px-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-row items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100 truncate">
                        {rule.charge_type}
                      </span>
                      {rule.is_active ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px] font-bold">
                          ● Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-slate-400">
                          ○ Inactive
                        </Badge>
                      )}
                    </CardHeader>

                    <CardContent className="p-4 space-y-3 text-xs">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Charge Amount</span>
                        <div className="text-lg font-black text-slate-900 dark:text-slate-100">
                          {rule.currency || 'SAR'} {Number(rule.rate || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400"> / {rule.unit || 'Per Unit'}</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 font-medium">Vehicle Class:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{rule.vehicle_type || 'All Vehicles'}</span>
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setEditingSurchargeRule(rule); setIsSurchargeModalOpen(true); }}
                          className="h-7 px-2.5 text-[11px] font-semibold border-slate-200 dark:border-slate-800 rounded-md"
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setRuleToDeactivate(rule)}
                          className={cn(
                            "h-7 px-2 text-[11px] font-semibold rounded-md",
                            rule.is_active ? "text-amber-600 hover:bg-amber-50" : "text-emerald-600 hover:bg-emerald-50"
                          )}
                        >
                          {rule.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Surcharge Safety Banner */}
            <div className="p-3.5 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900/50 text-xs text-blue-700 dark:text-blue-300 font-medium flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
              <span>
                ⓘ Additional charges are applied to trips at dispatch when incurred (e.g. 2 additional stops = 2 × SAR 50.00). Surcharge rule changes apply to future trip dispatch calculations. Existing trip charges retain their recorded historical values.
              </span>
            </div>

          </div>
        )}

      </div>

      {/* Surcharge Rule Modal */}
      <SurchargeRuleModal
        isOpen={isSurchargeModalOpen}
        onClose={() => { setIsSurchargeModalOpen(false); setEditingSurchargeRule(null); }}
        customerId={quotation.customerId}
        quotationId={quotation.id}
        customerName={quotation.customer?.name}
        editingRule={editingSurchargeRule}
      />

      {/* Surcharge Rule Deactivate Confirm Modal */}
      {ruleToDeactivate && (
        <ConfirmModal
          isOpen={!!ruleToDeactivate}
          onClose={() => setRuleToDeactivate(null)}
          onConfirm={() => toggleSurchargeMutation.mutate(ruleToDeactivate)}
          title={ruleToDeactivate.is_active ? 'Deactivate Additional Charge' : 'Activate Additional Charge'}
          message={`Are you sure you want to ${ruleToDeactivate.is_active ? 'deactivate' : 'activate'} '${ruleToDeactivate.charge_type}' (${ruleToDeactivate.currency} ${ruleToDeactivate.rate} / ${ruleToDeactivate.unit})? Existing trip charges will remain unchanged.`}
          confirmLabel={ruleToDeactivate.is_active ? 'Deactivate' : 'Activate'}
          isLoading={toggleSurchargeMutation.isPending}
        />
      )}

      {/* Deactivate / Activate Quotation Confirm Modal */}
      <ConfirmModal
        isOpen={isDeactivateModalOpen}
        onClose={() => setIsDeactivateModalOpen(false)}
        onConfirm={() => toggleActiveMutation.mutate()}
        title={quotation?.is_active ? 'Deactivate Quotation' : 'Activate Quotation'}
        message={`Are you sure you want to ${quotation?.is_active ? 'deactivate' : 'activate'} this commercial quotation?`}
        confirmLabel={quotation?.is_active ? 'Deactivate' : 'Activate'}
        isLoading={toggleActiveMutation.isPending}
      />

      {/* Delete Quotation Confirm Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="Delete Commercial Quotation"
        message="Are you sure you want to permanently delete this quotation? This action cannot be undone."
        confirmLabel="Delete Quotation"
        isDestructive={true}
        isLoading={deleteMutation.isPending}
      />
    </DashboardLayout>
  );
}
