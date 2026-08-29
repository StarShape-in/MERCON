import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building2,
  MapPin,
  Plus,
  Lock,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TaxonomyBadge } from '@/components/common/TaxonomyBadge';
import { quotationService, Quotation } from '@/services/quotationService';

interface QuotationSelectionCardProps {
  customerId: string;
  customerName?: string;
  originLocationId?: string | null;
  destinationLocationId?: string | null;
  originName?: string;
  destinationName?: string;
  vehicleClass?: string | null;
  lineType?: string | null;
  billingType?: string | null;

  selectedQuotationId?: string | null;
  onSelectQuotation: (quotation: Quotation | null) => void;
  onAddNewRoute?: () => void;
}

function getLineTypeLabel(lineType?: string | null): string {
  const lt = (lineType || '').toUpperCase();
  if (lt.includes('ROUND')) return 'Round Trip';
  if (lt.includes('10')) return '10 Hrs Duty';
  if (lt.includes('12')) return '12 Hrs Duty';
  return 'Single Trip';
}

function getPricingBasisLabel(pricingBasis?: string | null): string {
  if (!pricingBasis) return 'Not specified';
  if (pricingBasis === 'PER_TRIP') return 'Per Trip';
  if (pricingBasis === 'PER_MONTH') return 'Per Month';
  return pricingBasis;
}

export default function QuotationSelectionCard({
  customerId,
  customerName,
  originLocationId,
  destinationLocationId,
  originName = 'Origin',
  destinationName = 'Destination',
  vehicleClass,
  lineType,
  billingType,
  selectedQuotationId,
  onSelectQuotation,
  onAddNewRoute,
}: QuotationSelectionCardProps) {
  // Fetch active quotations matching criteria
  const {
    data: quotationsRes,
    isLoading,
  } = useQuery({
    queryKey: [
      'quotation-matching',
      customerId,
      originLocationId,
      destinationLocationId,
      vehicleClass,
      lineType,
      billingType,
    ],
    queryFn: async () => {
      if (!customerId) return [];
      const res = await quotationService.getAll({
        customerId,
        origin_location_id: originLocationId || undefined,
        destination_location_id: destinationLocationId || undefined,
        vehicle_class: vehicleClass || undefined,
        line_type: lineType || undefined,
        billing_type: billingType || undefined,
        active_only: true,
        per_page: 50,
      });
      return res.data || [];
    },
    enabled: !!customerId && (!!originLocationId || !!destinationLocationId),
  });

  const candidateQuotations = quotationsRes || [];
  const selectedQuotation = candidateQuotations.find((q) => q.id === selectedQuotationId);

  // Auto-select single exact match when 1 candidate is returned
  useEffect(() => {
    if (candidateQuotations.length === 1 && !selectedQuotationId) {
      onSelectQuotation(candidateQuotations[0]);
    }
  }, [candidateQuotations, selectedQuotationId, onSelectQuotation]);

  // Clear selection if context parameters change
  useEffect(() => {
    if (selectedQuotationId && candidateQuotations.length > 0) {
      const matchStillValid = candidateQuotations.some((q) => q.id === selectedQuotationId);
      if (!matchStillValid) {
        onSelectQuotation(null);
      }
    }
  }, [customerId, originLocationId, destinationLocationId, vehicleClass, lineType, billingType]);

  if (!customerId || (!originLocationId && !destinationLocationId)) {
    return (
      <Card className="rounded-xl border-slate-200/80 dark:border-slate-800 shadow-2xs bg-white dark:bg-slate-900">
        <CardContent className="p-4 text-center text-xs text-slate-400 font-medium italic">
          Select customer and route corridor to trigger automatic commercial agreement matching...
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="rounded-xl border-slate-200/80 dark:border-slate-800 shadow-2xs bg-white dark:bg-slate-900">
        <CardContent className="p-4 flex items-center justify-center gap-2 text-xs font-semibold text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
          <span>Finding applicable commercial agreement routes...</span>
        </CardContent>
      </Card>
    );
  }

  // Selected Quotation State
  if (selectedQuotation) {
    return (
      <Card className="rounded-xl border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-2xs overflow-hidden">
        <CardHeader className="py-2.5 px-4 border-b border-emerald-200/60 dark:border-emerald-900/50 bg-emerald-100/50 dark:bg-emerald-950/40 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
              APPLIED AGREEMENT ROUTE
              <Lock className="w-3 h-3 text-emerald-600 ml-1" />
            </CardTitle>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onSelectQuotation(null)}
            className="h-7 px-2 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100/60 rounded-md"
          >
            Change Route
          </Button>
        </CardHeader>

        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-extrabold text-slate-900 dark:text-slate-100">
                <Building2 className="h-3.5 w-3.5 text-amber-600" />
                <span>{selectedQuotation.customer?.name || customerName || 'Customer'}</span>
              </div>
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-amber-600" />
                <span>{originName} → {destinationName}</span>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {(selectedQuotation.billing_type || '').toLowerCase().includes('monthly') ? 'Monthly Contract' : 'Billing Rate / Trip'}
                </span>
                <div className="text-lg font-black text-emerald-700 dark:text-emerald-400 tracking-tight">
                  {selectedQuotation.currency || 'SAR'} {Number(selectedQuotation.rate ?? selectedQuotation.base_price ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                {(selectedQuotation.billing_type || '').toLowerCase().includes('monthly') && Number(selectedQuotation.rate ?? selectedQuotation.base_price ?? 0) > 0 && (
                  <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 block">
                    ≈ SAR {(Number(selectedQuotation.rate ?? selectedQuotation.base_price ?? 0) / 30).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / day
                  </span>
                )}
              </div>

              {selectedQuotation.driver_payout != null && Number(selectedQuotation.driver_payout) > 0 && (
                <div className="text-right border-l border-emerald-200 dark:border-emerald-900 pl-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Driver Charge / Trip</span>
                  <div className="text-lg font-extrabold text-amber-700 dark:text-amber-400 tracking-tight">
                    SAR {Number(selectedQuotation.driver_payout).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            <TaxonomyBadge category="OPERATION_TYPE" value={selectedQuotation.billing_type} size="sm" />
            <TaxonomyBadge category="LINE_TYPE" value={selectedQuotation.line_type} size="sm" />
            <TaxonomyBadge category="VEHICLE_CLASS" value={selectedQuotation.vehicle_class} size="sm" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Multiple Candidates State
  if (candidateQuotations.length > 1) {
    return (
      <Card className="rounded-xl border-slate-200/80 dark:border-slate-800 shadow-2xs bg-white dark:bg-slate-900 overflow-hidden">
        <CardHeader className="py-2.5 px-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100">
              COMMERCIAL AGREEMENT ROUTES ({candidateQuotations.length})
            </CardTitle>
          </div>
          {onAddNewRoute && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onAddNewRoute}
              className="h-7 px-2.5 text-[11px] font-bold text-amber-800 border-amber-200 bg-amber-50/50 hover:bg-amber-100 rounded-md gap-1"
            >
              <Plus className="w-3.5 h-3.5 text-amber-600" />
              + Add Route
            </Button>
          )}
        </CardHeader>

        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 gap-2.5">
            {candidateQuotations.map((q) => (
              <div
                key={q.id}
                className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-700 bg-slate-50/40 dark:bg-slate-800/30 transition-all flex items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-amber-50 text-amber-800 border-amber-200 text-[10px] font-bold">
                      {q.billing_type || 'EXTRA'}
                    </Badge>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {getLineTypeLabel(q.line_type)} · {getPricingBasisLabel(q.pricing_basis)}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500 font-medium flex items-center gap-2">
                    <span>{q.vehicle_class || '10 TON'}</span>
                    {q.driver_payout != null && Number(q.driver_payout) > 0 && (
                      <span className="text-amber-700 font-semibold">· Driver Charge: SAR {Number(q.driver_payout).toLocaleString()}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100 block">
                      {q.currency || 'SAR'} {Number(q.rate ?? q.base_price ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => onSelectQuotation(q)}
                    className="h-8 px-3 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg"
                  >
                    Apply Route
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // No Match State — WORKFLOW B
  return (
    <Card className="rounded-xl border-amber-200/80 dark:border-amber-900/60 bg-amber-50/30 dark:bg-amber-950/20 shadow-2xs overflow-hidden">
      <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <div>
            <h4 className="font-extrabold text-amber-950 dark:text-amber-200 text-xs">NO COMMERCIAL AGREEMENT ROUTE FOUND</h4>
            <p className="text-[11px] text-amber-800 dark:text-amber-300 font-medium">
              A Trip must <strong>NEVER</strong> introduce its own commercial price. Please add this route to the customer's Commercial Agreement.
            </p>
          </div>
        </div>

        {onAddNewRoute && (
          <Button
            type="button"
            size="sm"
            onClick={onAddNewRoute}
            className="h-8 px-3.5 text-xs font-bold bg-brand hover:bg-brand/90 text-white rounded-lg shrink-0 gap-1.5 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            + Add Route to Commercial Agreement
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
