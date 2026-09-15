import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TaxonomyBadge } from '@/components/common/TaxonomyBadge';
import {
  ArrowRight,
  Edit2,
  FileText,
  Tag,
  Building2,
  Hash,
  ExternalLink,
  Calendar,
  Truck,
  Layers,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { tripService } from '@/services/tripService';
import type { Quotation } from '@mercon/shared-types';

interface QuotationRouteDrawerProps {
  quotation: Quotation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerName?: string;
  onOpenCustomerSurcharges?: () => void;
}

export function QuotationRouteDrawer({
  quotation,
  open,
  onOpenChange,
  customerName,
  onOpenCustomerSurcharges,
}: QuotationRouteDrawerProps) {
  const navigate = useNavigate();

  const stops = (quotation?.stops || (quotation as any)?.via_stops || (quotation as any)?.viaStops || []) as any[];

  // Determine canonical stop details in exact sequence
  const stopDetails = useMemo(() => {
    if (!quotation) return [];
    if (stops.length > 0) {
      return stops.map((s: any) => {
        const shortName = s.source_label || s.location?.code || s.name || s.label || 'Location';
        const canonicalName =
          s.location?.name && s.location.name.trim().toLowerCase() !== shortName.trim().toLowerCase()
            ? s.location.name
            : null;
        const city = s.location?.city || null;
        return {
          shortName,
          canonicalName,
          city,
          stop_type: s.stop_type,
          location: s.location,
        };
      });
    }
    const origin = quotation.route_origin || 'Origin';
    const dest = quotation.route_destination || 'Destination';
    return [
      { shortName: origin, canonicalName: null, city: null, stop_type: 'Pickup', location: null },
      { shortName: dest, canonicalName: null, city: null, stop_type: 'Dropoff', location: null },
    ];
  }, [stops, quotation]);

  // Backward compatible stop names array
  const stopNames = useMemo(() => stopDetails.map((s) => s.shortName), [stopDetails]);

  // Fetch trips consuming this specific rate / quotation (Always called unconditionally at top level)
  const { data: tripsRes, isLoading: isLoadingTrips } = useQuery({
    queryKey: ['trips-using-rate', quotation?.id],
    queryFn: async () => {
      if (!quotation?.id) return [];
      try {
        const res = await tripService.getAll({
          quotation_id: quotation.id,
          quotationId: quotation.id,
          rate_card_id: quotation.id,
          per_page: 50,
        } as any);

        if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
          return res.data;
        }

        // Fallback search by customer to match quotation reference
        const custId = quotation.customerId || (quotation as any).customer_id;
        if (custId) {
          const custRes = await tripService.getAll({ customer_id: custId, per_page: 100 });
          if (custRes?.data && Array.isArray(custRes.data)) {
            return custRes.data.filter(
              (t: any) =>
                t.quotationId === quotation.id ||
                t.quotation_id === quotation.id ||
                t.rateCardId === quotation.id ||
                t.rate_card_id === quotation.id
            );
          }
        }
        return [];
      } catch {
        return [];
      }
    },
    enabled: open && !!quotation?.id,
  });

  const matchedTrips = tripsRes || [];
  const totalTripsCount = matchedTrips.length;

  // Filter latest 3-5 trips sorted by date
  const recentTrips = useMemo(() => {
    return [...matchedTrips]
      .sort((a: any, b: any) => {
        const dA = new Date(a.planned_start || a.createdAt || 0).getTime();
        const dB = new Date(b.planned_start || b.createdAt || 0).getTime();
        return dB - dA;
      })
      .slice(0, 4);
  }, [matchedTrips]);

  if (!quotation) return null;

  const firstStop = stopDetails[0] || { shortName: 'Origin', canonicalName: null };
  const lastStop = stopDetails[stopDetails.length - 1] || { shortName: 'Destination', canonicalName: null };
  const intermediateStops = stopNames.slice(1, -1);
  const totalStops = Math.max(stopDetails.length, 2);

  // Line 2 subtitle generation
  let viaText = 'Direct';
  if (intermediateStops.length > 0) {
    if (intermediateStops.length <= 2) {
      viaText = `via ${intermediateStops.join(', ')}`;
    } else {
      viaText = `via ${intermediateStops[0]}, ${intermediateStops[1]}...`;
    }
  }

  // Validity calculation
  const now = new Date();
  const validFrom = quotation.valid_from ? new Date(quotation.valid_from) : null;
  const validTo = quotation.valid_to ? new Date(quotation.valid_to) : null;
  const isExpired = validTo ? validTo < now : false;

  let statusBadge = (
    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold text-[11px] px-2 py-0.5">
      Active
    </Badge>
  );
  if (!quotation.is_active) {
    statusBadge = (
      <Badge variant="outline" className="text-slate-400 text-[11px] px-2 py-0.5">
        Inactive
      </Badge>
    );
  } else if (isExpired) {
    statusBadge = (
      <Badge className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 font-bold text-[11px] px-2 py-0.5">
        Expired
      </Badge>
    );
  }

  // Driver Payout calculation
  const driverPayoutText =
    (quotation as any).driver_payout != null && !isNaN(Number((quotation as any).driver_payout))
      ? `SAR ${Number((quotation as any).driver_payout).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
      : '—';

  // Surcharge rules extraction
  const surchargeRules = ((quotation as any)?.surchargeRules || (quotation as any)?.surcharge_rules || []) as any[];

  // Document attachment extraction
  const docName = (quotation as any)?.file_path || (quotation as any)?.document_url || (quotation as any)?.document || (quotation as any)?.documentName;

  const quotationRefId =
    (quotation as any).agreement_ref || `QT-${quotation.id.substring(0, 8).toUpperCase()}`;

  const handleViewAllTrips = () => {
    onOpenChange(false);
    navigate(`/trips?quotation_id=${quotation.id}`);
  };

  const getTripSnapshotAmount = (t: any): string => {
    const amt = t.billing_amount ?? t.trip_charges ?? t.base_price ?? t.rate ?? quotation.rate ?? 0;
    return `SAR ${Number(amt).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatTripDate = (dateStr?: string | Date | null): string => {
    if (!dateStr) return 'Date TBD';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return 'Date TBD';
    }
  };

  const renderTripStatusBadge = (status?: string | null) => {
    const norm = (status || '').toLowerCase().replace(/[\s_]/g, '');
    if (norm === 'completed' || norm === 'invoiced') {
      return (
        <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 font-semibold text-[10px] px-2 py-0">
          Completed
        </Badge>
      );
    }
    if (norm === 'intransit' || norm === 'atpickup' || norm === 'atdelivery') {
      return (
        <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/60 font-semibold text-[10px] px-2 py-0">
          In Transit
        </Badge>
      );
    }
    if (norm === 'cancelled') {
      return (
        <Badge className="bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200/60 font-semibold text-[10px] px-2 py-0">
          Cancelled
        </Badge>
      );
    }
    return (
      <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200/60 font-semibold text-[10px] px-2 py-0">
        Scheduled
      </Badge>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md md:max-w-lg p-0 flex flex-col bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl z-[9999]"
      >
        {/* Drawer Header */}
        <SheetHeader className="p-5 pb-4 border-b border-slate-100 dark:border-slate-800 space-y-2 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Route Details
              </span>
              {statusBadge}
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-[#2D2B2C] text-white rounded-lg font-mono font-bold text-[11px] shadow-2xs">
              <Hash className="w-3 h-3 text-[#FA634E]" />
              <span>{quotationRefId}</span>
            </div>
          </div>

          <SheetTitle className="text-base font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2 pt-1">
            <div className="flex flex-col min-w-0">
              <span className="truncate">{firstStop.shortName}</span>
              {firstStop.canonicalName && (
                <span className="text-[11px] font-semibold text-[#FA634E] dark:text-[#FA634E] tracking-normal font-sans truncate">
                  {firstStop.canonicalName}
                </span>
              )}
            </div>
            <ArrowRight className="w-4 h-4 text-[#FA634E] shrink-0 my-auto" />
            <div className="flex flex-col min-w-0">
              <span className="truncate">{lastStop.shortName}</span>
              {lastStop.canonicalName && (
                <span className="text-[11px] font-semibold text-[#FA634E] dark:text-[#FA634E] tracking-normal font-sans truncate">
                  {lastStop.canonicalName}
                </span>
              )}
            </div>
          </SheetTitle>

          <div className="text-xs text-slate-500 font-medium flex items-center justify-between gap-2">
            <span>
              {viaText} · <strong className="font-mono text-slate-700 dark:text-slate-300">{totalStops} stops</strong>
            </span>

            {customerName && (
              <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[200px]">
                <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{customerName}</span>
              </span>
            )}
          </div>
        </SheetHeader>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* SECTION 1: ROUTE SEQUENCE (Vertical Timeline) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#FA634E]" />
                Route Sequence
              </span>
              <Badge variant="outline" className="text-[10px] font-mono font-semibold px-2 py-0.5 bg-slate-50 dark:bg-slate-800">
                {totalStops} Stops Total
              </Badge>
            </div>

            {/* Timeline Container */}
            <div className="relative pl-3 pr-1 py-1 space-y-0 max-h-64 overflow-y-auto">
              {stopDetails.map((stop, idx) => {
                const isFirst = idx === 0;
                const isLast = idx === stopDetails.length - 1;
                const rawStop = stops[idx];
                const semanticType = stop.stop_type || rawStop?.stop_type; // Only render if explicitly present

                return (
                  <div key={idx} className="relative flex items-start gap-3.5 pb-4 last:pb-0">
                    {/* Vertical connecting line */}
                    {!isLast && (
                      <div className="absolute left-[13px] top-6 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700" />
                    )}

                    {/* Numbered node */}
                    <div
                      className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-mono font-black shrink-0 z-10 shadow-2xs mt-0.5",
                        isFirst || isLast
                          ? "bg-[#FA634E] text-white"
                          : "bg-slate-200 text-[#3E3C3D] dark:bg-slate-800 dark:text-slate-300"
                      )}
                    >
                      {String(idx + 1).padStart(2, '0')}
                    </div>

                    {/* Location Info */}
                    <div className="flex-1 min-w-0 pt-0.5 bg-slate-50/70 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/80">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-[#3E3C3D] dark:text-slate-100 truncate">
                          {stop.shortName}
                        </span>
                        {semanticType ? (
                          <Badge
                            variant="outline"
                            className="text-[9px] font-mono font-bold uppercase px-1.5 py-0 shrink-0 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                          >
                            {semanticType}
                          </Badge>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-mono shrink-0">
                            Stop {idx + 1}
                          </span>
                        )}
                      </div>
                      {(stop.canonicalName || stop.city) && (
                        <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate flex items-center gap-1 mt-0.5">
                          {stop.canonicalName && <span className="font-semibold text-slate-700 dark:text-slate-300">{stop.canonicalName}</span>}
                          {stop.canonicalName && stop.city && <span className="text-slate-300">·</span>}
                          {stop.city && <span className="font-mono text-[10px] text-slate-400">{stop.city}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 2: COMMERCIAL TERMS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="text-xs font-black uppercase tracking-wider text-[#3E3C3D] dark:text-slate-100 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-[#FA634E]" />
                Commercial Terms
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Vehicle Class</div>
                <div>
                  <TaxonomyBadge category="VEHICLE_CLASS" value={quotation.vehicle_class} fallbackText="Standard" />
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Operation Type</div>
                <div>
                  <TaxonomyBadge category="OPERATION_TYPE" value={quotation.operation_type || quotation.billing_type} fallbackText="Extra" />
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Line Type</div>
                <div>
                  <TaxonomyBadge category="LINE_TYPE" value={quotation.line_type || quotation.rate_category} fallbackText="Single Trip" />
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase">
                  {(quotation.pricing_basis === 'PER_MONTH' || (quotation.billing_type || '').toLowerCase().includes('monthly')) ? 'Monthly Billing Rate' : 'Billing Rate / Trip'}
                </div>
                <div className="font-mono font-black text-[#3E3C3D] dark:text-slate-100 text-sm">
                  SAR {Number(quotation.rate ?? quotation.base_price ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  {(quotation.pricing_basis === 'PER_MONTH' || (quotation.billing_type || '').toLowerCase().includes('monthly')) && (
                    <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 block font-sans">
                      ≈ SAR {(Number(quotation.rate ?? quotation.base_price ?? 0) / 30).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / day
                    </span>
                  )}
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Driver Charge</div>
                <div className="font-mono font-bold text-slate-700 dark:text-slate-300">
                  {driverPayoutText}
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Validity Period</div>
                <div className="font-semibold text-slate-700 dark:text-slate-300 text-[11px] truncate">
                  {quotation.valid_from ? new Date(quotation.valid_from).toLocaleDateString() : 'Immediate'} →{' '}
                  {quotation.valid_to ? new Date(quotation.valid_to).toLocaleDateString() : 'Ongoing'}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: SURCHARGE RULES */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-amber-500" />
                Surcharge Rules ({surchargeRules.length})
              </span>
              {onOpenCustomerSurcharges && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpenCustomerSurcharges()}
                  className="h-6 px-2 text-[11px] font-bold text-[#FA634E] hover:text-[#DF4834] hover:bg-orange-50 dark:hover:bg-orange-950/30 rounded-md"
                >
                  Manage Surcharges →
                </Button>
              )}
            </div>

            {surchargeRules.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-400 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                No surcharge rules configured
              </div>
            ) : (
              <div className="space-y-1.5 text-xs">
                {surchargeRules.map((rule: any, idx: number) => {
                  const feeType = rule.fee_name || rule.fee_type || rule.name || 'Additional Fee';
                  const amount =
                    rule.amount != null
                      ? `SAR ${Number(rule.amount).toLocaleString()}`
                      : rule.rate != null
                      ? `SAR ${Number(rule.rate).toLocaleString()}`
                      : '—';
                  const unit = rule.unit ? `/ ${rule.unit}` : '';

                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800"
                    >
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {feeType}
                      </span>
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                        {amount} {unit}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SECTION 4: TRIPS USING THIS RATE */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-[#3E3C3D] dark:text-slate-100 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#FA634E]" />
                  Trips Using This Rate
                </span>
                <Badge className="bg-slate-100 dark:bg-slate-800 text-[#3E3C3D] dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[10px] font-bold font-mono px-1.5 py-0">
                  {totalTripsCount}
                </Badge>
              </div>

              <button
                type="button"
                onClick={handleViewAllTrips}
                className="text-xs font-bold text-[#FA634E] hover:underline flex items-center gap-1 cursor-pointer transition-all"
              >
                <span>View all trips</span>
                <span className="text-sm font-black">→</span>
              </button>
            </div>

            {isLoadingTrips ? (
              <div className="p-3 text-center text-xs text-slate-400 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 animate-pulse">
                Loading trip usage...
              </div>
            ) : totalTripsCount === 0 ? (
              <div className="p-3 text-center text-xs text-slate-400 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                No trips have used this commercial rate yet.
              </div>
            ) : (
              <div className="space-y-1.5">
                {recentTrips.map((trip: any) => {
                  const tripRef = trip.ref_id || `TRP-${trip.id.substring(0, 4).toUpperCase()}`;
                  const dateFormatted = formatTripDate(trip.planned_start || trip.createdAt);
                  const snapshotRate = getTripSnapshotAmount(trip);

                  return (
                    <div
                      key={trip.id}
                      onClick={() => {
                        onOpenChange(false);
                        navigate(`/trips/${trip.id}`);
                      }}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-[#EEF1F6]/70 dark:bg-slate-800/50 hover:bg-[#EEF1F6] dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-800 cursor-pointer transition-all group text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="font-mono font-black text-[#3E3C3D] dark:text-slate-100 group-hover:text-[#FA634E] transition-colors">
                          {tripRef}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium truncate">
                          {dateFormatted}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {renderTripStatusBadge(trip.status)}
                        <span className="font-mono font-bold text-xs text-[#3E3C3D] dark:text-slate-100">
                          {snapshotRate}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SECTION 5: SOURCE DOCUMENT */}
          {docName ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-500" />
                  Source Document
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-2 truncate pr-2">
                  <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                  <span className="font-medium text-slate-900 dark:text-slate-100 truncate">
                    {docName}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/quotations/${quotation.id}/documents`)}
                  className="h-7 text-xs font-bold rounded-lg border-slate-200 dark:border-slate-700 shrink-0 gap-1"
                >
                  <span>View</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-[11px] text-slate-400 italic">
              No source document attached.
            </div>
          )}
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          <Button
            onClick={() => {
              onOpenChange(false);
              navigate(`/quotations/${quotation.id}/edit`);
            }}
            className="w-full h-9 text-xs font-bold bg-[#FA634E] hover:bg-[#DF4834] text-white shadow-md shadow-[#FA634E]/20 rounded-xl gap-2 cursor-pointer border-0"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit Commercial Route</span>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
