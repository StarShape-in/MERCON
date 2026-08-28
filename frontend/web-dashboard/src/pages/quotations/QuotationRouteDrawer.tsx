import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import type { Quotation } from '@mercon/shared-types';

interface QuotationRouteDrawerProps {
  quotation: Quotation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerName?: string;
}

export function QuotationRouteDrawer({
  quotation,
  open,
  onOpenChange,
  customerName,
}: QuotationRouteDrawerProps) {
  const navigate = useNavigate();

  const stops = (quotation?.stops || quotation?.via_stops || (quotation as any)?.viaStops || []) as any[];

  // Determine canonical stop names in exact sequence
  const stopNames = useMemo(() => {
    if (!quotation) return ['Origin', 'Destination'];
    if (stops.length > 0) {
      return stops.map(
        (s: any) => s.source_label || s.location?.name || s.name || s.label || 'Location'
      );
    }
    const origin = quotation.route_origin || 'Origin';
    const dest = quotation.route_destination || 'Destination';
    return [origin, dest];
  }, [stops, quotation]);

  if (!quotation) return null;

  const firstStop = stopNames[0] || 'Origin';
  const lastStop = stopNames[stopNames.length - 1] || 'Destination';
  const intermediateStops = stopNames.slice(1, -1);
  const totalStops = Math.max(stopNames.length, 2);

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
    quotation.driver_payout != null && !isNaN(Number(quotation.driver_payout))
      ? `SAR ${Number(quotation.driver_payout).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
      : '—';

  // Surcharge rules extraction
  const surchargeRules = (quotation.surchargeRules || quotation.surcharge_rules || []) as any[];

  // Document attachment extraction
  const docName = quotation.file_path || quotation.document_url || (quotation as any).documentName;

  const quotationRefId =
    quotation.agreement_ref || `QT-${quotation.id.substring(0, 8).toUpperCase()}`;

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
            <span>{firstStop}</span>
            <ArrowRight className="w-4 h-4 text-[#FA634E] shrink-0" />
            <span>{lastStop}</span>
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
              {stopNames.map((name, idx) => {
                const isFirst = idx === 0;
                const isLast = idx === stopNames.length - 1;
                const rawStop = stops[idx];
                const semanticType = rawStop?.stop_type; // Only render if explicitly present

                return (
                  <div key={idx} className="relative flex items-start gap-3.5 pb-4 last:pb-0">
                    {/* Vertical connecting line */}
                    {!isLast && (
                      <div className="absolute left-[13px] top-6 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700" />
                    )}

                    {/* Numbered node */}
                    <div
                      className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-mono font-black shrink-0 z-10 border shadow-2xs",
                        isFirst
                          ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300"
                          : isLast
                          ? "bg-indigo-50 text-indigo-700 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300"
                          : "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300"
                      )}
                    >
                      {String(idx + 1).padStart(2, '0')}
                    </div>

                    {/* Location Info */}
                    <div className="flex-1 min-w-0 pt-0.5 flex items-center justify-between gap-2 bg-slate-50/70 dark:bg-slate-800/40 p-2 rounded-lg border border-slate-100 dark:border-slate-800/80">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {name}
                      </span>
                      {semanticType ? (
                        <Badge
                          variant="outline"
                          className="text-[9px] font-mono font-bold uppercase px-1.5 py-0 shrink-0 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                        >
                          {semanticType}
                        </Badge>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">
                          Stop {idx + 1}
                        </span>
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
              <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-[#FA634E]" />
                Commercial Terms
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Vehicle Class</div>
                <div className="font-extrabold text-slate-900 dark:text-slate-100">
                  {quotation.vehicle_class || 'Standard'}
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Operation Type</div>
                <div className="font-extrabold text-slate-900 dark:text-slate-100">
                  {quotation.billing_type || 'Extra'}
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Line Type</div>
                <div className="font-extrabold text-slate-900 dark:text-slate-100">
                  {quotation.line_type || quotation.rate_category || 'Single Trip'}
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Billing Rate</div>
                <div className="font-mono font-black text-[#FA634E]">
                  SAR {Number(quotation.rate ?? quotation.base_price ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
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

          {/* SECTION 4: SOURCE DOCUMENT */}
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
