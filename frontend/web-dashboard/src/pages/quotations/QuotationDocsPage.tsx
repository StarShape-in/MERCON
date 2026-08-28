import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  FileSpreadsheet,
  Building2,
  MapPin,
  Truck,
  Banknote,
  Calendar,
  Clock,
  History,
  Info,
  ExternalLink,
  ShieldCheck,
  Tag,
  Download,
  AlertCircle,
  FileCode,
  Folder
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { quotationService, Quotation } from '@/services/quotationService';
import { useDeploymentTimezone, formatInDeploymentTz } from '@/lib/datetime';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function getLineTypeLabel(lineType?: string | null): string {
  const lt = (lineType || '').toUpperCase();
  if (lt.includes('ROUND')) return 'Round Trip';
  if (lt.includes('10')) return '10 Hrs Duty';
  if (lt.includes('12')) return '12 Hrs Duty';
  return 'Single Trip';
}

function getPricingBasisLabel(pricingBasis?: string | null): string {
  if (!pricingBasis) return 'Not Specified';
  if (pricingBasis === 'PER_TRIP') return 'Per Trip';
  if (pricingBasis === 'PER_MONTH') return 'Per Month';
  return pricingBasis;
}

function getSourceTypeLabel(sourceType?: string | null): string {
  const st = (sourceType || '').toUpperCase();
  if (st.includes('EXCEL') || st.includes('SHEET')) return 'Excel Quotation Sheet';
  if (st.includes('CONTRACT')) return 'Contract Agreement';
  if (st.includes('QUOTATION')) return 'Operational Quotation Doc';
  if (st.includes('MANUAL')) return 'Manual Entry';
  return sourceType || 'Not Specified';
}

export default function QuotationDocsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const tz = useDeploymentTimezone();

  // Fetch Quotation Details
  const { data: quotation, isLoading, error } = useQuery({
    queryKey: ['quotation', id],
    queryFn: () => quotationService.getById(id!),
    enabled: !!id,
  });

  // Fetch Quotation History for rate divergence check
  const { data: priceHistory = [] } = useQuery({
    queryKey: ['quotation-history', id],
    queryFn: () => quotationService.getHistory(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <DashboardLayout active="Quotations" title="Quotation Documents">
        <div className="p-12 text-center text-xs font-semibold text-slate-500">
          Loading quotation document records...
        </div>
      </DashboardLayout>
    );
  }

  if (error || !quotation) {
    return (
      <DashboardLayout active="Quotations" title="Quotation Documents">
        <div className="p-12 text-center space-y-3">
          <p className="text-xs font-bold text-rose-600">Quotation record not found.</p>
          <Button variant="outline" size="sm" onClick={() => navigate('/quotations')}>
            Return to Quotations List
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
  const initialHistory = priceHistory[priceHistory.length - 1];
  const originalRate = initialHistory ? Number(initialHistory.old_rate ?? initialHistory.new_rate) : currentRate;
  const isRateRevised = priceHistory.length > 0 && currentRate !== originalRate;

  return (
    <DashboardLayout active="Quotations" title="Quotation Documents">
      <div className="px-4 sm:px-6 pb-16 w-full max-w-7xl mx-auto space-y-5 animate-fade-in">
        
        {/* Page Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-200/80 dark:border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <button
                onClick={() => navigate(`/quotations/${id}`)}
                className="hover:text-amber-600 flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Quotation Details
              </button>
              <span>/</span>
              <span className="text-slate-900 dark:text-slate-100 font-bold">Documents & Traceability</span>
            </div>

            <div className="flex items-center gap-3">
              <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                Quotation Documents
              </h1>
              <Badge className="bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 text-[11px] font-semibold">
                Commercial Source
              </Badge>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 font-bold">
              {quotation.customer?.name || 'Customer'} · <span className="text-slate-900 dark:text-slate-100">{originName} → {destName}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/quotations/${id}`)}
              className="h-8 text-xs font-semibold border-slate-200 dark:border-slate-800 rounded-lg gap-1.5"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Quotation</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/quotations/${id}`)}
              className="h-8 text-xs font-semibold border-slate-200 dark:border-slate-800 rounded-lg gap-1.5 text-amber-700 dark:text-amber-400"
            >
              <History className="h-3.5 w-3.5" />
              <span>View Quotation History</span>
            </Button>
          </div>
        </div>

        {/* 1. Contextual Source Summary (Read-Only Banner) */}
        <Card className="rounded-xl border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 shadow-2xs overflow-hidden">
          <CardHeader className="py-2 px-4 border-b border-slate-100 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-800/60">
            <CardTitle className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-amber-600" />
              COMMERCIAL CONTEXT SUMMARY
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Customer</span>
              <span className="font-extrabold text-slate-900 dark:text-slate-100 truncate block">{quotation.customer?.name || '—'}</span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Route</span>
              <span className="font-extrabold text-slate-900 dark:text-slate-100 truncate block">{originName} → {destName}</span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Vehicle</span>
              <span className="font-extrabold text-slate-900 dark:text-slate-100 block">{quotation.vehicle_class || '10 TON'}</span>
              {quotation.source_vehicle_label && (
                <span className="text-[10px] text-slate-400 font-normal truncate block">{quotation.source_vehicle_label}</span>
              )}
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Line Type</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 block">{getLineTypeLabel(quotation.line_type)}</span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Billing</span>
              <span className="font-semibold text-amber-700 dark:text-amber-400 block">{quotation.billing_type || 'EXTRA'}</span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Pricing Basis</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 block">{getPricingBasisLabel(quotation.pricing_basis)}</span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Current Rate</span>
              <span className="font-black text-slate-900 dark:text-slate-100 block">
                {quotation.currency || 'SAR'} {currentRate.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* 2-Column Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* Left Column: Primary Source Card & Traceability (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Primary Source Document Card */}
            <Card className="rounded-xl border-slate-200/80 dark:border-slate-800 shadow-2xs bg-white dark:bg-slate-900 overflow-hidden">
              <CardHeader className="py-3 px-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                    PRIMARY SOURCE DOCUMENT
                  </CardTitle>
                </div>
                {quotation.source_reference ? (
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900 text-[10px] font-bold">
                    Source Available
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] text-slate-400">
                    No Document Attached
                  </Badge>
                )}
              </CardHeader>

              <CardContent className="p-5 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="h-6 w-6" />
                  </div>
                  <div className="space-y-1 flex-1 min-w-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      {getSourceTypeLabel(quotation.source_type)}
                    </span>
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 truncate">
                      {quotation.source_reference || 'Not specified'}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Commercial source reference backing this pricing agreement.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div className="p-3 bg-slate-50/60 dark:bg-slate-800/40 rounded-lg border border-slate-200/60 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Source Type</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                      {quotation.source_type ? getSourceTypeLabel(quotation.source_type) : 'Not specified'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50/60 dark:bg-slate-800/40 rounded-lg border border-slate-200/60 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Source Reference</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                      {quotation.source_reference || 'Not specified'}
                    </span>
                  </div>
                </div>

                {/* Rate Divergence Callout Notice */}
                {isRateRevised && (
                  <div className="p-3.5 bg-amber-50/80 dark:bg-amber-950/40 rounded-xl border border-amber-300/80 dark:border-amber-800 space-y-1.5 text-xs">
                    <div className="flex items-center gap-1.5 font-extrabold text-amber-900 dark:text-amber-200">
                      <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                      <span>Rate Differs From Source Document</span>
                    </div>
                    <p className="text-[11px] text-amber-800 dark:text-amber-300 font-medium">
                      The commercial rate was subsequently revised from {quotation.currency} {originalRate.toLocaleString()} to {quotation.currency} {currentRate.toLocaleString()}. The original source document provides evidence for the initial agreement.
                    </p>
                    <div className="pt-1">
                      <button
                        onClick={() => navigate(`/quotations/${id}`)}
                        className="text-[11px] font-extrabold text-amber-900 dark:text-amber-200 underline hover:text-amber-700"
                      >
                        See Quotation History for full commercial revision audit →
                      </button>
                    </div>
                  </div>
                )}

              </CardContent>
            </Card>

            {/* Source Traceability Breakdown */}
            <Card className="rounded-xl border-slate-200/80 dark:border-slate-800 shadow-2xs bg-white dark:bg-slate-900 overflow-hidden">
              <CardHeader className="py-3 px-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  HOW THIS QUOTATION WAS SOURCED
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">
                <div className="space-y-2">
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="font-medium text-slate-500">Source Category</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {quotation.source_type ? getSourceTypeLabel(quotation.source_type) : 'Manual Entry'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="font-medium text-slate-500">Reference File / Contract</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                      {quotation.source_reference || 'Not specified'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="font-medium text-slate-500">Imported / Added Date</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {formatInDeploymentTz(quotation.createdAt, tz, 'dd MMM yyyy')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1.5">
                    <span className="font-medium text-slate-500">Active Commercial Rate</span>
                    <span className="font-extrabold text-amber-700 dark:text-amber-400">
                      {quotation.currency || 'SAR'} {currentRate.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-500 space-y-1">
                  <span className="font-bold text-slate-700 dark:text-slate-300 block">Commercial Authority Hierarchy:</span>
                  <p>1. Signed / Approved Source Document (Evidence)</p>
                  <p>2. Active Mercon Quotation (Live Dispatch Matching)</p>
                  <p>3. Trip Snapshot (Historical Billing Snapshot)</p>
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Right Column: Document Preview & File Placeholder (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="rounded-xl border-slate-200/80 dark:border-slate-800 shadow-2xs bg-white dark:bg-slate-900 overflow-hidden">
              <CardHeader className="py-3 px-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-amber-600" />
                  DOCUMENT PREVIEW
                </CardTitle>
                <Badge variant="outline" className="text-[10px]">
                  Reference View
                </Badge>
              </CardHeader>

              <CardContent className="p-5 space-y-4 text-center">
                {quotation.source_reference ? (
                  <div className="p-8 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 flex items-center justify-center mx-auto">
                      <FileSpreadsheet className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 font-mono break-all">
                        {quotation.source_reference}
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Document reference recorded on {formatInDeploymentTz(quotation.createdAt, tz, 'MMM dd, yyyy')}
                      </p>
                    </div>
                    <div className="pt-2">
                      <Badge className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 text-[10px] font-semibold">
                        Document preview unavailable
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                      <Folder className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-200">
                        No source document attached
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        This quotation does not currently have a supporting document attached.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                onClick={() => navigate(`/quotations/${id}`)}
                className="w-full h-9 text-xs font-bold border-slate-200 dark:border-slate-800 rounded-lg justify-center gap-2 text-slate-700 dark:text-slate-200"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Return to Quotation Details</span>
              </Button>
            </div>
          </div>

        </div>

      </div>
    </DashboardLayout>
  );
}
