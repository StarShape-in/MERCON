import { useState } from 'react';
import { toast } from 'sonner';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Edit2, Trash2, MapPin, Building2,
  RotateCw, Plus, AlertTriangle,
  Truck, Tag, ShieldCheck,
  Copy, Calendar, Receipt, History,
  MoreHorizontal, Power, Route as RouteIcon, FileSpreadsheet,
  Info, Sparkles, CheckCircle2, Hash
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import ConfirmModal from '@/components/ui/ConfirmModal';
import SurchargeRuleModal from '@/components/quotations/SurchargeRuleModal';
import { quotationService, surchargeRuleService, QuotationHistory, SurchargeRule } from '@/services/quotationService';
import { tripService } from '@/services/tripService';
import { useDeploymentTimezone, formatInDeploymentTz } from '@/lib/datetime';
import { Skeleton } from '@/components/ui/skeleton';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
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

  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'surcharges'>('overview');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);

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
  const { data: applicableSurcharges = [] } = useQuery({
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
      toast.error(err.message || 'Failed to update quotation state.');
    },
  });

  // Toggle Surcharge Rule Active State Mutation
  const toggleSurchargeMutation = useMutation({
    mutationFn: async (rule: SurchargeRule) => {
      return surchargeRuleService.update(rule.id, { is_active: !rule.is_active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surcharge-rules'] });
      toast.success('Surcharge rule updated successfully.');
      setRuleToDeactivate(null);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update surcharge rule.');
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
      toast.success('Commercial quotation deleted successfully.');
      navigate('/quotations');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to delete quotation.');
    },
  });

  if (isLoading) {
    return (
      <DashboardLayout active="Quotations" title="Quotation Workspace">
        <div className="p-6 space-y-4 max-w-7xl mx-auto">
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
      <DashboardLayout active="Quotations" title="Quotation Workspace">
        <div className="p-12 text-center space-y-4 max-w-xl mx-auto">
          <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Quotation Record Not Found</h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            The requested commercial quotation record does not exist or has been removed.
          </p>
          <Button variant="outline" size="sm" onClick={() => navigate('/quotations')}>
            Back to Commercial Quotations
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const stops = quotation.stops || [];
  const pickup = stops.find((s: any) => s.stop_type === 'Pickup') || stops[0];
  const dropoff = [...stops].reverse().find((s: any) => s.stop_type === 'Dropoff') || stops[stops.length - 1];

  const originName = pickup?.source_label || pickup?.location?.name || quotation.route_origin || 'Origin';
  const destName = dropoff?.source_label || dropoff?.location?.name || quotation.route_destination || 'Destination';
  const currentRate = Number(quotation.rate ?? quotation.base_price ?? 0);
  const driverPayoutNum = quotation.driver_payout != null ? Number(quotation.driver_payout) : null;
  const hasDriverPayout = driverPayoutNum != null && !isNaN(driverPayoutNum);
  const netMargin = hasDriverPayout ? currentRate - driverPayoutNum : currentRate;

  const quotationRefId = quotation.agreement_ref || `QT-${quotation.id.substring(0, 8).toUpperCase()}`;
  const activeSurchargesCount = applicableSurcharges.filter((s) => s.is_active).length;
  const inactiveSurchargesCount = applicableSurcharges.length - activeSurchargesCount;

  return (
    <DashboardLayout active="Quotations" title="Quotation Workspace">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-4 pb-16 animate-fade-in">
        
        {/* Header Navigation & Top Bar Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4 dark:border-slate-800">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
              <button
                onClick={() => navigate('/quotations')}
                className="hover:text-amber-600 flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Commercial Quotations
              </button>
              <span>/</span>
              <span className="text-slate-900 dark:text-slate-100 font-bold">
                {quotation.customer?.name || 'Customer Agreement'}
              </span>
              {quotation.customer?.id && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/customers/${quotation.customer!.id}`)}
                  className="h-5 px-2 text-[10px] font-bold gap-1 text-amber-700 hover:text-amber-800 bg-amber-50/70 hover:bg-amber-100/70 border-amber-200 dark:bg-amber-950/40 dark:border-amber-900/60 dark:text-amber-400 rounded-md ml-1"
                >
                  <Building2 className="w-3 h-3" />
                  <span>Customer Profile</span>
                </Button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                {originName} → {destName}
              </h1>
              
              <div className="flex items-center gap-1 px-2.5 py-0.5 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-lg font-mono font-black text-xs shadow-2xs">
                <Hash className="w-3 h-3 text-amber-400 dark:text-amber-600" />
                <span>{quotationRefId}</span>
              </div>

              {quotation.is_active ? (
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50 font-bold text-xs px-2.5 py-0.5">
                  ● Active Agreement
                </Badge>
              ) : (
                <Badge className="bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 font-bold text-xs px-2.5 py-0.5">
                  ● Inactive
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="default"
              size="sm"
              onClick={() => navigate(`/quotations/${id}/edit`)}
              className="h-9 px-4 gap-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs shadow-md transition-all hover:scale-[1.02] active:scale-95"
            >
              <Edit2 className="h-3.5 w-3.5" />
              <span>Edit Quotation</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 rounded-xl gap-1"
                >
                  <MoreHorizontal className="h-4 w-4" />
                  <span>More</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 text-xs font-medium">
                <DropdownMenuLabel>Quotation Options</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate(`/quotations/new?customer_id=${quotation.customerId}&origin_id=${quotation.originLocationId || ''}&dest_id=${quotation.destinationLocationId || ''}`)}>
                  <Copy className="h-3.5 w-3.5 mr-2 text-amber-600" />
                  <span>Duplicate Agreement</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate(`/quotations/${id}/documents`)}>
                  <FileSpreadsheet className="h-3.5 w-3.5 mr-2 text-emerald-600" />
                  <span>View Source Documents</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsDeactivateModalOpen(true)}>
                  <Power className="h-3.5 w-3.5 mr-2 text-amber-500" />
                  <span>{quotation.is_active ? 'Deactivate Agreement' : 'Activate Agreement'}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setIsDeleteModalOpen(true)} className="text-rose-600 dark:text-rose-400 focus:text-rose-600">
                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                  <span>Delete Record</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => refetch()}
              title="Refresh Data"
              className="h-9 w-9 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 rounded-xl"
            >
              <RotateCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
            </Button>
          </div>
        </div>

        {/* Top Instrument KPI Cards Panel */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* KPI 1: Commercial Rate */}
          <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-amber-200/80 dark:border-amber-900/60 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
              <span>Agreed Rate</span>
              <Receipt className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              {quotation.currency || 'SAR'} {currentRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-xs font-semibold text-slate-400"> / {getPricingBasisLabel(quotation.pricing_basis)}</span>
            </div>
            <div className="text-[10px] text-blue-600 dark:text-blue-400 font-extrabold truncate">
              Net Balance: {quotation.currency || 'SAR'} {netMargin.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>

          {/* KPI 2: Customer */}
          <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <span>Customer Name</span>
              <Building2 className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="text-sm font-black text-slate-900 dark:text-slate-100 truncate">
              {quotation.customer?.name || 'Unassigned Customer'}
            </div>
            <div className="text-[10px] text-slate-400 font-semibold truncate">
              Ref: <span className="font-mono text-slate-700 dark:text-slate-300">{quotationRefId}</span>
            </div>
          </div>

          {/* KPI 3: Ordered Stops */}
          <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <span>Route Sequence</span>
              <RouteIcon className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="text-sm font-black text-slate-900 dark:text-slate-100 truncate flex items-center gap-1">
              <span>{originName}</span>
              <span className="text-slate-400 font-normal">→</span>
              <span>{destName}</span>
            </div>
            <div className="text-[10px] text-slate-500 font-bold">
              {stops.length} Total Sequential Stops
            </div>
          </div>

          {/* KPI 4: Vehicle & Service */}
          <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <span>Vehicle & Service</span>
              <Truck className="w-3.5 h-3.5 text-indigo-500" />
            </div>
            <div className="text-sm font-black text-slate-900 dark:text-slate-100 truncate">
              {quotation.vehicle_class || 'Standard'} · <span className="text-amber-600 dark:text-amber-400">{getBillingTypeLabel(quotation.billing_type)}</span>
            </div>
            <div className="text-[10px] text-slate-500 font-bold">
              Line: {getLineTypeLabel(quotation.line_type || quotation.rate_category)}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
          <Button
            variant={activeTab === 'overview' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('overview')}
            className={cn(
              "h-8.5 text-xs font-bold rounded-xl gap-1.5 cursor-pointer",
              activeTab === 'overview' ? "bg-amber-600 hover:bg-amber-700 text-white shadow-xs" : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
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
              "h-8.5 text-xs font-bold rounded-xl gap-1.5 cursor-pointer",
              activeTab === 'history' ? "bg-amber-600 hover:bg-amber-700 text-white shadow-xs" : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
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
              "h-8.5 text-xs font-bold rounded-xl gap-1.5 cursor-pointer",
              activeTab === 'surcharges' ? "bg-amber-600 hover:bg-amber-700 text-white shadow-xs" : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
            )}
          >
            <Tag className="h-3.5 w-3.5 text-amber-400" />
            <span>Additional Charges</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-white/20 text-current border-current">
              {applicableSurcharges.length}
            </Badge>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/quotations/${id}/documents`)}
            className="h-8.5 text-xs font-bold rounded-xl gap-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-400 cursor-pointer"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            <span>Source Documents</span>
          </Button>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              
              {/* Left Side: Route Sequence Timeline (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden bg-white dark:bg-slate-900">
                  <CardHeader className="py-3 px-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex flex-row items-center justify-between">
                    <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <RouteIcon className="h-4 w-4 text-amber-600" />
                      Ordered Commercial Route Corridor
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px] font-bold bg-white dark:bg-slate-900">
                      {stops.length} Sequential {stops.length === 1 ? 'Stop' : 'Stops'}
                    </Badge>
                  </CardHeader>

                  <CardContent className="p-5 space-y-4">
                    {stops.length > 0 ? (
                      <div className="relative pl-6 space-y-5 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
                        {stops.map((s: any, idx: number) => {
                          const isPickup = s.sequence === 1 || s.stop_type === 'Pickup';
                          const isDropoff = idx === stops.length - 1 || s.stop_type === 'Dropoff';

                          return (
                            <div key={s.id || idx} className="relative flex items-start gap-4">
                              <div className={cn(
                                "absolute -left-6 top-0.5 h-6 w-6 rounded-full flex items-center justify-center font-bold text-[10px] border shadow-2xs",
                                isPickup ? "bg-emerald-600 text-white border-emerald-700" : isDropoff ? "bg-rose-600 text-white border-rose-700" : "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300"
                              )}>
                                {idx + 1}
                              </div>
                              <div className="flex-1 bg-slate-50/60 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-amber-300 transition-colors space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                                    {s.source_label || s.location?.name || `Stop ${idx + 1}`}
                                  </span>
                                  <Badge className={cn(
                                    "text-[10px] font-bold px-2 py-0.5",
                                    isPickup ? "bg-emerald-50 text-emerald-700 border-emerald-200" : isDropoff ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-slate-100 text-slate-600"
                                  )}>
                                    {isPickup ? 'Pickup (Origin)' : isDropoff ? 'Dropoff (Destination)' : 'Intermediate Stop'}
                                  </Badge>
                                </div>
                                {s.location?.name && (
                                  <div className="text-[11px] text-slate-500 font-medium">
                                    System Master: <strong className="text-slate-700 dark:text-slate-300">{s.location.name}</strong>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-center text-xs font-semibold text-slate-600">
                        {originName} → {destName}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right Side: Commercial Terms Ledger (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-2xs bg-white dark:bg-slate-900 overflow-hidden">
                  <CardHeader className="py-3 px-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                    <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-amber-600" /> Commercial Terms Ledger
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500 font-medium">Customer</span>
                      <span className="font-extrabold text-slate-900 dark:text-slate-100">{quotation.customer?.name || 'Customer'}</span>
                    </div>

                    <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500 font-medium">Quotation Reference ID</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{quotationRefId}</span>
                    </div>

                    <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500 font-medium">Billing Rate</span>
                      <span className="font-black text-sm text-emerald-700 dark:text-emerald-400">
                        {quotation.currency || 'SAR'} {currentRate.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500 font-medium">Driver Charge / Payout</span>
                      <span className="font-bold text-amber-700 dark:text-amber-400">
                        {hasDriverPayout ? `${quotation.currency || 'SAR'} ${driverPayoutNum!.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500 font-medium">Net Margin Balance</span>
                      <span className="font-extrabold text-blue-600 dark:text-blue-400">
                        {hasDriverPayout ? `${quotation.currency || 'SAR'} ${netMargin.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500 font-medium">Billing & Line Type</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {getBillingTypeLabel(quotation.billing_type)} · {getLineTypeLabel(quotation.line_type)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500 font-medium">Vehicle Class</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">{quotation.vehicle_class || 'Standard'}</span>
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <span className="text-slate-500 font-medium">Validity Period</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {quotation.valid_from ? quotation.valid_from.substring(0, 10) : '01 Aug 2026'} → {quotation.valid_to ? quotation.valid_to.substring(0, 10) : 'Ongoing'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

            </div>
          </div>
        )}

        {/* TAB 2: QUOTATION HISTORY */}
        {activeTab === 'history' && (
          <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              
              {/* Active Version Box */}
              <div className="lg:col-span-5 space-y-4">
                <Card className="rounded-2xl border-amber-200/80 dark:border-amber-900/60 shadow-2xs bg-amber-50/30 dark:bg-amber-950/20 overflow-hidden">
                  <CardHeader className="py-3 px-4 border-b border-amber-100 dark:border-amber-900/50 bg-amber-100/40 dark:bg-amber-950/40 flex flex-row items-center justify-between">
                    <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                      CURRENT ACTIVE AGREEMENT
                    </CardTitle>
                    <Badge className="bg-emerald-600 text-white text-[10px] font-extrabold px-2 py-0.5">
                      ● ACTIVE
                    </Badge>
                  </CardHeader>

                  <CardContent className="p-5 space-y-3.5 text-xs">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Agreed Billing Rate</span>
                      <div className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                        {quotation.currency || 'SAR'} {currentRate.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="bg-white dark:bg-slate-900 text-xs font-semibold">
                        {getBillingTypeLabel(quotation.billing_type)} · {getLineTypeLabel(quotation.line_type)}
                      </Badge>
                      <Badge variant="outline" className="bg-white dark:bg-slate-900 text-xs font-semibold">
                        {quotation.vehicle_class || '10 TON'}
                      </Badge>
                    </div>

                    <div className="pt-3 border-t border-amber-100 dark:border-amber-900/50 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Valid From</span>
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

                {/* Safety Banner */}
                <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-2xs bg-white dark:bg-slate-900">
                  <CardHeader className="py-2.5 px-4 border-b border-slate-100 dark:border-slate-800">
                    <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      HISTORICAL TRIPS SAFETY
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-2 text-xs text-slate-600 dark:text-slate-400">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      Quotation changes do not overwrite commercial rates on historical trips.
                    </p>
                    <p className="text-[11px] leading-relaxed">
                      Completed or dispatched trips retain the exact commercial rate recorded at dispatch.
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Timeline (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-2xs bg-white dark:bg-slate-900 overflow-hidden">
                  <CardHeader className="py-3 px-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                    <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <History className="h-4 w-4 text-amber-600" />
                      REVISION TIMELINE & COMMERCIAL AUDIT
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="p-5">
                    {priceHistory.length === 0 ? (
                      <div className="py-10 text-center space-y-2">
                        <History className="h-8 w-8 text-slate-300 mx-auto" />
                        <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">No quotation revisions yet</h4>
                        <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                          This quotation rate has remained unchanged since creation on {formatInDeploymentTz(quotation.createdAt, tz, 'dd MMM yyyy')}.
                        </p>
                      </div>
                    ) : (
                      <div className="relative pl-6 space-y-5 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
                        {priceHistory.map((h, idx) => {
                          const oldVal = Number(h.old_rate ?? h.old_base_price ?? 0);
                          const newVal = Number(h.new_rate ?? h.new_base_price ?? 0);

                          return (
                            <div key={h.id || idx} className="relative flex items-start gap-4">
                              <div className="absolute -left-6 top-1 h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-[10px]">
                                {priceHistory.length - idx}
                              </div>

                              <div className="flex-1 p-4 bg-slate-50/60 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-2">
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
                                  <span className="text-amber-600 dark:text-amber-400">{quotation.currency || 'SAR'} {newVal.toLocaleString()}</span>
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

        {/* TAB 3: ADDITIONAL SURCHARGES */}
        {activeTab === 'surcharges' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <div className="flex items-center gap-4">
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Base Commercial Rate</span>
                  <div className="text-lg font-black text-slate-900 dark:text-slate-100">
                    {quotation.currency || 'SAR'} {currentRate.toLocaleString(undefined, { minimumFractionDigits: 2 })} / {getPricingBasisLabel(quotation.pricing_basis)}
                  </div>
                </div>
                <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold text-xs">
                    {activeSurchargesCount} Active Rules
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
                className="h-9 px-4 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-md rounded-xl gap-1.5 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Add Charge Rule</span>
              </Button>
            </div>

            {applicableSurcharges.length === 0 ? (
              <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-2xs bg-white dark:bg-slate-900">
                <CardContent className="p-10 text-center space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50 flex items-center justify-center mx-auto">
                    <Tag className="h-6 w-6" />
                  </div>
                  <div className="space-y-1 max-w-sm mx-auto">
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">No surcharge rules configured</h4>
                    <p className="text-xs text-slate-500 font-medium">
                      This quotation currently has no secondary accessorial charges configured.
                    </p>
                  </div>
                  <div className="pt-2">
                    <Button
                      size="sm"
                      onClick={() => { setEditingSurchargeRule(null); setIsSurchargeModalOpen(true); }}
                      className="h-8 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-xl gap-1.5"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Charge Rule</span>
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
                      "rounded-2xl border shadow-2xs space-y-3 bg-white dark:bg-slate-900 p-4",
                      rule.is_active ? "border-slate-200/80 dark:border-slate-800" : "border-slate-200/50 dark:border-slate-800/50 opacity-60"
                    )}
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                      <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100 truncate">
                        {rule.charge_type}
                      </span>
                      {rule.is_active ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-slate-400">
                          Inactive
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Rate</span>
                      <div className="text-base font-black text-slate-900 dark:text-slate-100">
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
                  </Card>
                ))}
              </div>
            )}
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
          title={ruleToDeactivate.is_active ? 'Deactivate Surcharge Rule' : 'Activate Surcharge Rule'}
          message={`Are you sure you want to ${ruleToDeactivate.is_active ? 'deactivate' : 'activate'} '${ruleToDeactivate.charge_type}' (${ruleToDeactivate.currency} ${ruleToDeactivate.rate} / ${ruleToDeactivate.unit})?`}
          confirmLabel={ruleToDeactivate.is_active ? 'Deactivate' : 'Activate'}
          isLoading={toggleSurchargeMutation.isPending}
        />
      )}

      {/* Deactivate / Activate Quotation Confirm Modal */}
      <ConfirmModal
        isOpen={isDeactivateModalOpen}
        onClose={() => setIsDeactivateModalOpen(false)}
        onConfirm={() => toggleActiveMutation.mutate()}
        title={quotation?.is_active ? 'Deactivate Commercial Quotation' : 'Activate Commercial Quotation'}
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
