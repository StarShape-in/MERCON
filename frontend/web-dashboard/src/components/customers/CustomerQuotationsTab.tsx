import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Layers, Plus, Search, Eye, Edit2, CheckCircle2, AlertTriangle, ArrowRight,
  Truck, Tag, Filter, FileText, Calendar, Building2, MapPin, ChevronRight, X
} from 'lucide-react';
import { quotationService, Quotation } from '@/services/quotationService';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DataTable from '@/components/ui/DataTable';
import { formatInDeploymentTz, useDeploymentTimezone } from '@/lib/datetime';

interface CustomerQuotationsTabProps {
  customerId: string;
  customerName: string;
  onOpenAddQuotation: () => void;
  onOpenEditQuotation: (quotation: Quotation) => void;
}

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
  if (!pricingBasis || pricingBasis === 'UNSPECIFIED') return 'Not specified';
  if (pricingBasis === 'PER_TRIP') return 'Per Trip';
  if (pricingBasis === 'PER_MONTH') return 'Per Month';
  return pricingBasis;
}

export default function CustomerQuotationsTab({
  customerId,
  customerName,
  onOpenAddQuotation,
  onOpenEditQuotation,
}: CustomerQuotationsTabProps) {
  const navigate = useNavigate();
  const tz = useDeploymentTimezone();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [lineTypeFilter, setLineTypeFilter] = useState<string>('ALL');
  const [billingTypeFilter, setBillingTypeFilter] = useState<string>('ALL');

  // Fetch quotations for this customer only
  const { data: quotationsRes, isLoading } = useQuery({
    queryKey: ['quotations', 'customer-tab', customerId],
    queryFn: () => quotationService.getAll({ customerId, per_page: 'all' }),
    enabled: !!customerId,
  });

  const quotations = quotationsRes?.data || [];

  // Summary Metrics
  const activeQuotations = useMemo(() => quotations.filter((q) => q.is_active), [quotations]);
  const historicalQuotations = useMemo(() => quotations.filter((q) => !q.is_active), [quotations]);

  const uniqueRoutes = useMemo(() => {
    const set = new Set<string>();
    quotations.forEach((q) => {
      const stops = q.stops || [];
      const origin = stops[0]?.source_label || stops[0]?.location?.name || q.route_origin || 'Origin';
      const dest = stops[stops.length - 1]?.source_label || stops[stops.length - 1]?.location?.name || q.route_destination || 'Destination';
      set.add(`${origin} → ${dest}`);
    });
    return Array.from(set);
  }, [quotations]);

  const uniqueVehicleClasses = useMemo(() => {
    const set = new Set<string>();
    quotations.forEach((q) => {
      const label = q.source_vehicle_label || q.vehicle_class || q.vehicle_type;
      if (label) set.add(label);
    });
    return Array.from(set);
  }, [quotations]);

  const uniqueLineTypes = useMemo(() => {
    const set = new Set<string>();
    quotations.forEach((q) => {
      const lt = getLineTypeLabel(q.line_type || q.rate_category);
      set.add(lt);
    });
    return Array.from(set);
  }, [quotations]);

  const uniqueBillingTypes = useMemo(() => {
    const set = new Set<string>();
    quotations.forEach((q) => {
      const bt = getBillingTypeLabel(q.billing_type);
      set.add(bt);
    });
    return Array.from(set);
  }, [quotations]);

  // Filtered Quotations
  const filteredQuotations = useMemo(() => {
    return quotations.filter((q) => {
      // Status Filter
      if (statusFilter === 'ACTIVE' && !q.is_active) return false;
      if (statusFilter === 'INACTIVE' && q.is_active) return false;

      // Line Type Filter
      if (lineTypeFilter !== 'ALL') {
        const lt = getLineTypeLabel(q.line_type || q.rate_category);
        if (lt !== lineTypeFilter) return false;
      }

      // Billing Type Filter
      if (billingTypeFilter !== 'ALL') {
        const bt = getBillingTypeLabel(q.billing_type);
        if (bt !== billingTypeFilter) return false;
      }

      // Search Filter
      if (search.trim()) {
        const term = search.trim().toLowerCase();
        const stops = q.stops || [];
        const routeStr = stops.map((s) => s.source_label || s.location?.name || '').join(' ').toLowerCase();
        const nameMatch = (q.name || '').toLowerCase().includes(term);
        const routeMatch = routeStr.includes(term) || (q.route_origin || '').toLowerCase().includes(term) || (q.route_destination || '').toLowerCase().includes(term);
        const vehicleMatch = (q.source_vehicle_label || q.vehicle_class || '').toLowerCase().includes(term);
        const refMatch = (q.source_reference || '').toLowerCase().includes(term);
        if (!nameMatch && !routeMatch && !vehicleMatch && !refMatch) return false;
      }

      return true;
    });
  }, [quotations, statusFilter, lineTypeFilter, billingTypeFilter, search]);

  return (
    <div className="space-y-6">
      
      {/* Top Instrument-Panel Commercial Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            <span>Active Rates</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100">{activeQuotations.length}</div>
          <div className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
            <span>Commercial live rates</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            <span>Historical</span>
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="text-2xl font-black text-slate-700 dark:text-slate-300">{historicalQuotations.length}</div>
          <div className="text-[10px] text-slate-500 font-semibold">Deactivated rate history</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            <span>Lanes Covered</span>
            <MapPin className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{uniqueRoutes.length}</div>
          <div className="text-[10px] text-indigo-600 font-semibold">Unique route pairs</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            <span>Vehicle Classes</span>
            <Truck className="w-3.5 h-3.5 text-violet-600" />
          </div>
          <div className="text-2xl font-black text-violet-600 dark:text-violet-400">{uniqueVehicleClasses.length}</div>
          <div className="text-[10px] text-violet-600 font-semibold">Configured fleet classes</div>
        </div>
      </div>

      {/* Commercial Coverage Summary Bar */}
      {quotations.length > 0 && (
        <Card className="border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-600" /> Commercial Coverage Overview
            </h4>
            <span className="text-[10px] font-medium text-slate-500">{customerName} Negotiated Profile</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {/* Routes Covered */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Routes Covered</span>
              <div className="flex flex-wrap gap-1">
                {uniqueRoutes.slice(0, 4).map((r, i) => (
                  <Badge key={i} variant="outline" className="bg-white dark:bg-slate-800 text-[10px] font-semibold text-slate-700 dark:text-slate-300 border-slate-200">
                    {r}
                  </Badge>
                ))}
                {uniqueRoutes.length > 4 && (
                  <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-bold">
                    +{uniqueRoutes.length - 4} more
                  </Badge>
                )}
              </div>
            </div>

            {/* Fleet Classes */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Vehicle Classes</span>
              <div className="flex flex-wrap gap-1">
                {uniqueVehicleClasses.map((vc, i) => (
                  <Badge key={i} variant="outline" className="bg-white dark:bg-slate-800 text-[10px] font-semibold text-slate-700 dark:text-slate-300 border-slate-200">
                    {vc}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Billing Types */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Line & Billing Terms</span>
              <div className="flex flex-wrap gap-1">
                {uniqueLineTypes.map((lt, i) => (
                  <Badge key={i} className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-bold">
                    {lt}
                  </Badge>
                ))}
                {uniqueBillingTypes.map((bt, i) => (
                  <Badge key={i} className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                    {bt}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Main Quotation Ledger Table & Controls */}
      <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-indigo-600" /> Commercial Quotation Ledger
            </CardTitle>
            <CardDescription className="text-[11px] mt-0.5">
              Active and historical negotiated rates for {customerName}.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              onClick={onOpenAddQuotation}
              className="h-8 gap-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" /> + New Quotation
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-4">
          
          {/* Controls Bar: Search & Dropdown Filters */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <Input
                type="text"
                placeholder="Search route, location, vehicle..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-lg"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
              <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-lg w-[120px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="ACTIVE">Active Only</SelectItem>
                  <SelectItem value="INACTIVE">Inactive Only</SelectItem>
                </SelectContent>
              </Select>

              <Select value={lineTypeFilter} onValueChange={(v: any) => setLineTypeFilter(v)}>
                <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-lg w-[130px]">
                  <SelectValue placeholder="Line Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Line Types</SelectItem>
                  <SelectItem value="Single Trip">Single Trip</SelectItem>
                  <SelectItem value="Round Trip">Round Trip</SelectItem>
                  <SelectItem value="10 Hrs Duty">10 Hrs Duty</SelectItem>
                  <SelectItem value="12 Hrs Duty">12 Hrs Duty</SelectItem>
                </SelectContent>
              </Select>

              <Select value={billingTypeFilter} onValueChange={(v: any) => setBillingTypeFilter(v)}>
                <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-lg w-[130px]">
                  <SelectValue placeholder="Billing Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Billing</SelectItem>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                  <SelectItem value="Extra">Extra</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Quotations Data Table */}
          {isLoading ? (
            <div className="p-8 text-center text-xs text-slate-500 animate-pulse">
              Loading customer commercial quotations...
            </div>
          ) : filteredQuotations.length === 0 ? (
            <div className="p-8 text-center space-y-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center mx-auto">
                <Receipt className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">No Active Commercial Quotations</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {historicalQuotations.length > 0
                    ? `No active commercial quotations matched your filters. (Historical quotations available: ${historicalQuotations.length})`
                    : 'This customer currently has no negotiated commercial quotations.'}
                </p>
              </div>
              <Button
                size="sm"
                onClick={onOpenAddQuotation}
                className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Create Quotation
              </Button>
            </div>
          ) : (
            <DataTable
              columns={[
                {
                  header: 'Commercial Route',
                  accessor: (q: Quotation) => {
                    const stops = q.stops || [];
                    const origin = stops[0]?.source_label || stops[0]?.location?.name || q.route_origin || 'Origin';
                    const dest = stops[stops.length - 1]?.source_label || stops[stops.length - 1]?.location?.name || q.route_destination || 'Destination';
                    const via = stops.length > 2 ? stops.slice(1, -1).map(s => s.source_label || s.location?.name).filter(Boolean).join(', ') : null;

                    return (
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-slate-100">
                          <span>{origin}</span>
                          <ArrowRight className="w-3 h-3 text-indigo-600 shrink-0" />
                          <span>{dest}</span>
                        </div>
                        {via && (
                          <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                            <span>Via:</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">{via}</span>
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400 font-mono line-clamp-1">{q.name}</div>
                      </div>
                    );
                  },
                },
                {
                  header: 'Vehicle Class',
                  accessor: (q: Quotation) => {
                    const label = q.source_vehicle_label || q.vehicle_class || q.vehicle_type || 'General Fleet';
                    return (
                      <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 font-semibold text-[10px]">
                        {label}
                      </Badge>
                    );
                  },
                },
                {
                  header: 'Terms & Basis',
                  accessor: (q: Quotation) => {
                    const lt = getLineTypeLabel(q.line_type || q.rate_category);
                    const bt = getBillingTypeLabel(q.billing_type);
                    const pb = getPricingBasisLabel(q.pricing_basis);
                    return (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1">
                          <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[9px] font-bold px-1.5 py-0">
                            {lt}
                          </Badge>
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px] font-bold px-1.5 py-0">
                            {bt}
                          </Badge>
                        </div>
                        <span className="text-[10px] text-slate-500 font-medium">Basis: {pb}</span>
                      </div>
                    );
                  },
                },
                {
                  header: 'Rate',
                  accessor: (q: Quotation) => {
                    const rateVal = Number(q.rate ?? q.base_price ?? 0);
                    return (
                      <div className="font-mono font-extrabold text-xs text-indigo-600 dark:text-indigo-400">
                        {q.currency || 'SAR'} {rateVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    );
                  },
                },
                {
                  header: 'Status',
                  accessor: (q: Quotation) => (
                    q.is_active ? (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px] font-bold">Active</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-slate-100 text-slate-500 border-slate-200 text-[9px] font-bold">Inactive</Badge>
                    )
                  ),
                },
                {
                  header: 'Actions',
                  headerClassName: 'text-right',
                  className: 'text-right',
                  accessor: (q: Quotation) => (
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/quotations/${q.id}`)}
                        className="h-7 w-7 p-0 text-slate-500 hover:text-indigo-600"
                        title="View Quotation"
                      >
                        <Eye size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onOpenEditQuotation(q)}
                        className="h-7 w-7 p-0 text-slate-500 hover:text-indigo-600"
                        title="Edit Quotation"
                      >
                        <Edit2 size={14} />
                      </Button>
                    </div>
                  ),
                },
              ]}
              data={filteredQuotations}
              compact={true}
              enableSelection={false}
              emptyTitle="No Quotations Found"
              emptyMessage="No quotations matched your filters."
              onRowClick={(q: Quotation) => navigate(`/quotations/${q.id}`)}
            />
          )}

        </CardContent>
      </Card>

    </div>
  );
}
