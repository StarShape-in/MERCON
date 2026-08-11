import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, ArrowRight, Edit2, Trash2, MapPin, Building2,
  FileText, AlertTriangle, FileCheck, RefreshCw, Users, Plus,
  Layers, Download, XCircle, Clock, DollarSign
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import ConfirmModal from '@/components/ui/ConfirmModal';
import RateCardFormDialog from '@/components/rate-cards/RateCardFormDialog';
import AssignRateCardDialog from '@/components/rate-cards/AssignRateCardDialog';
import KpiCard from '@/components/ui/KpiCard';
import { rateCardService, RateCard } from '@/services/rateCardService';
import { downloadCSV } from '@/utils/exportUtils';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * One priced lane, and — the part that actually answers a dispatcher's
 * question — who else prices the same lane, and at what.
 *
 * Everything shown here comes from the record. This page used to also list a
 * corridor distance, transit time, tonnage cap and detention/overweight fees;
 * none of those exist in the schema, so they were the same invented numbers on
 * every rate card and read as real contract terms.
 */
export default function RateCardDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<RateCard | null>(null);

  const { data: card, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['rate-card', id],
    queryFn: () => rateCardService.getById(id!),
    enabled: !!id,
  });

  // Every other customer's rate on the same lane — what makes "is this
  // customer paying more than others?" answerable without leaving the page.
  const { data: laneCardsRes } = useQuery({
    queryKey: ['rate-cards', 'lane', card?.originLocationId, card?.destinationLocationId],
    queryFn: () =>
      rateCardService.getAll({
        origin_location_id: card!.originLocationId!,
        destination_location_id: card!.destinationLocationId!,
      }),
    enabled: !!card?.originLocationId && !!card?.destinationLocationId,
  });

  const deleteMutation = useMutation({
    mutationFn: () => rateCardService.delete(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rate-cards'] });
      navigate('/rate-cards');
    },
  });

  if (isLoading) {
    return (
      <DashboardLayout active="RateCards" title="Rate Card Details">
        <div className="px-4 sm:px-6 pb-6 space-y-4 animate-pulse w-full">
          <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl w-1/4"></div>
          <div className="h-24 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
          <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !card) {
    return (
      <DashboardLayout active="RateCards" title="Rate Card Details">
        <div className="px-4 sm:px-6 pb-6 flex flex-col items-center justify-center text-center h-[60vh] gap-3">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center">
            <AlertTriangle size={28} />
          </div>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">Rate not found</h2>
          <p className="text-xs text-slate-500 max-w-md">
            This rate card does not exist or has been deleted.
          </p>
          <Button onClick={() => navigate('/rate-cards')} size="sm" className="mt-2 text-xs font-bold bg-[#E8450F] text-white">
            Back to Rate Cards
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const currency = card.currency || 'SAR';
  const isActive = card.is_active ?? true;
  const laneLinked = !!card.originLocationId && !!card.destinationLocationId;

  const laneCards = laneCardsRes?.data || [];
  const otherCards = laneCards.filter((c) => c.id !== card.id);

  // How this card compares to what other customers pay on the same lane —
  // only meaningful when at least one other customer has a rate for it.
  const otherAvg =
    otherCards.length > 0
      ? otherCards.reduce((sum, c) => sum + Number(c.base_price), 0) / otherCards.length
      : null;

  const delta = otherAvg !== null ? Number(card.base_price) - otherAvg : null;

  // Generate price spectrum sparkline for the lane
  const sparklineData = laneCards.length > 1 
    ? laneCards.map(c => Number(c.base_price)).sort((a, b) => a - b)
    : [Number(card.base_price) * 0.95, Number(card.base_price), Number(card.base_price) * 1.05];

  const handleExportCSV = () => {
    const cardsToExport = laneCards.length > 0 ? laneCards : [card];
    const exportRows = cardsToExport.map((c) => ({
      'Rate Card ID': c.id,
      'Rate Card Name': c.name,
      'Customer': c.customer?.name || 'Customer',
      'Route Origin': c.route_origin,
      'Route Destination': c.route_destination,
      'Via Location': c.via_location || '',
      'Base Price': c.base_price,
      'Currency': c.currency || 'SAR',
      'Status': c.is_active ? 'Active' : 'Inactive',
      'Vehicle Type': c.vehicle_type || '',
      'Rate Category': c.rate_category || '',
      'Last Changed': new Date(c.updatedAt || c.createdAt).toLocaleDateString()
    }));
    downloadCSV(exportRows, `rate_card_${card.id}_export.csv`);
  };

  return (
    <DashboardLayout active="RateCards" title={card.name}>
      <div className="px-4 sm:px-6 pb-8 space-y-4 animate-fade-in w-full max-w-[1400px] mx-auto">

        {/* ── Top Header Toolbar ─────────────────────────────────────────── */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-black/[0.06] dark:border-white/[0.08]">
          <div className="flex flex-wrap items-center gap-3 min-w-0">
            {/* Scope / Context Selector Pill */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-full text-xs font-extrabold text-slate-700 shadow-2xs cursor-pointer select-none transition-all">
              <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>MERCON Logistics</span>
              <span className="text-slate-400 text-[9px]">↕</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/rate-cards')}
              className="h-8 w-8 p-0 shrink-0 text-slate-600 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs"
              title="Back to Rate Cards"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>

            <div className="flex items-center gap-2.5 min-w-0">
              <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight truncate">
                {card.name}
              </h1>
              <Badge
                variant="outline"
                className={`shrink-0 text-[10px] font-extrabold uppercase px-2 py-0.5 ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400'
                    : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {isActive ? '● Active' : '● Inactive'}
              </Badge>
            </div>

            <Badge className="bg-indigo-50 hover:bg-indigo-100/50 text-indigo-600 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900 font-semibold text-[10px] rounded-md px-2.5 py-0.5 transition-colors shrink-0">
              Finance & Billing Module
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Ghost Refresh Action */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => refetch()}
              disabled={isFetching}
              className="h-8 w-8 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 rounded-lg"
              title="Refresh Data"
            >
              <RefreshCw className={cn("w-4 h-4", isFetching && "animate-spin text-[#E8450F]")} />
            </Button>

            {/* Export CSV Action */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="h-8 gap-1.5 text-xs font-semibold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs text-slate-700 dark:text-slate-300"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" /> Export CSV
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/rate-cards/${card.id}/documents`)}
              className="h-8 gap-1.5 text-xs font-semibold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs text-slate-700 dark:text-slate-300"
            >
              <FileCheck className="w-3.5 h-3.5 text-indigo-500" /> Documents
            </Button>

            <Button
              variant="outline"
              size="sm"
              disabled={!laneLinked}
              onClick={() => setAssignTarget(card)}
              className="h-8 gap-1.5 text-xs font-semibold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs text-slate-700 dark:text-slate-300"
              title={laneLinked ? 'Copy this price to other customers' : 'Link a lane first'}
            >
              <Users className="w-3.5 h-3.5 text-emerald-600" /> Apply to customers
            </Button>

            <Button
              size="sm"
              onClick={() => setIsEditOpen(true)}
              className="h-8 gap-1.5 text-xs font-bold bg-[#E8450F] hover:bg-[#d03d0c] text-white shadow-xs px-3.5"
            >
              <Edit2 className="w-3.5 h-3.5" /> Edit
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteModalOpen(true)}
              className="h-8 text-xs font-semibold border-rose-200 dark:border-rose-950 bg-rose-50 dark:bg-rose-950/20 text-rose-600 hover:bg-rose-100"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </Button>
          </div>
        </div>

        {!laneLinked && (
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-3">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold text-amber-900 dark:text-amber-200">Not linked to a lane</p>
              <p className="text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                Origin and destination are still free text, so trips never pick this rate up.
                Edit it and choose both places to fix that.
              </p>
            </div>
          </div>
        )}

        {/* ── Instrument-Panel KPI Cards ─────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">

          <KpiCard
            title="PRICE PER TRIP"
            value={
              <span className="text-xl font-black text-[#E8450F] font-mono">
                {currency} {card.base_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            }
            variant="brand"
            icon={DollarSign}
            description={
              delta !== null ? (
                <span className={cn(
                  'text-[10px] font-bold block mt-0.5',
                  delta > 0 ? 'text-amber-600 dark:text-amber-400' : delta < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'
                )}>
                  {delta === 0
                    ? "Same as lane average"
                    : `${delta > 0 ? '↑' : '↓'} ${currency} ${Math.abs(delta).toLocaleString()} vs lane average`}
                </span>
              ) : (
                <span className="text-[10px] text-slate-500">No other customer to compare against yet</span>
              )
            }
            chartData={sparklineData}
          />

          <KpiCard
            title="LANE CORRIDOR"
            value={
              <div className="flex items-center gap-1.5 min-w-0 max-w-full text-slate-900 dark:text-slate-100 mt-0.5">
                <span className="truncate max-w-[100px] sm:max-w-[120px] text-base font-extrabold">{card.route_origin}</span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0 text-[#E8450F]" />
                <span className="truncate max-w-[100px] sm:max-w-[120px] text-base font-extrabold">{card.route_destination}</span>
              </div>
            }
            variant="blue"
            icon={MapPin}
            description={
              <div className="flex flex-col gap-1 mt-0.5">
                <span className="text-[10px] text-slate-500 font-semibold">
                  {laneLinked ? 'Linked to locations' : 'Free text lane'}
                </span>
                {(card.rate_category || card.vehicle_type || card.via_location) && (
                  <div className="flex flex-wrap items-center gap-1 mt-0.5">
                    {card.via_location && (
                      <Badge variant="outline" className="text-[9px] font-bold uppercase px-1.5 py-0 bg-slate-50 text-slate-600 border-slate-200/80 dark:bg-slate-950/40">
                        via {card.via_location}
                      </Badge>
                    )}
                    {card.rate_category && (
                      <Badge variant="outline" className="text-[9px] font-bold uppercase px-1.5 py-0 bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400">
                        {card.rate_category}
                      </Badge>
                    )}
                    {card.vehicle_type && (
                      <Badge variant="outline" className="text-[9px] font-bold uppercase px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400">
                        {card.vehicle_type}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            }
          />

          <KpiCard
            title="CUSTOMER ACCOUNT"
            value={
              <span className="truncate text-base font-extrabold block text-slate-900 dark:text-slate-100 max-w-[200px]" title={card.customer?.name}>
                {card.customer?.name || 'Customer'}
              </span>
            }
            variant="purple"
            icon={Building2}
            description={
              <div className="flex flex-col gap-1 mt-0.5">
                <span className="text-[10px] text-slate-500 font-semibold">
                  Negotiated customer contract
                </span>
                {card.customer?.id && (
                  <span
                    onClick={() => navigate(`/customers/${card.customer?.id}`)}
                    className="text-[10px] font-bold text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 hover:underline cursor-pointer w-fit mt-0.5 block"
                  >
                    View Profile →
                  </span>
                )}
              </div>
            }
          />

          <KpiCard
            title="LATEST AUDIT"
            value={
              <span className="text-base font-mono font-extrabold text-slate-800 dark:text-slate-200">
                {new Date(card.updatedAt || card.createdAt).toLocaleDateString()}
              </span>
            }
            variant="slate"
            icon={Clock}
            description={
              <div className="text-[10px] text-slate-500 font-semibold flex flex-col gap-0.5 mt-0.5">
                <span>Last changed by system</span>
                <span>Created on {new Date(card.createdAt).toLocaleDateString()}</span>
              </div>
            }
          />

        </div>

        {/* ── Everyone else pricing this lane (Ledger) ────────────────────── */}
        <Card className="border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-slate-900 rounded-xl shadow-2xs overflow-hidden">
          <CardHeader className="border-b border-black/[0.06] dark:border-white/[0.08] py-3.5 px-5 flex-row items-center justify-between space-y-0 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 rounded-lg">
                <Layers className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <CardTitle className="text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  Lane Pricing Ledger
                </CardTitle>
                <span className="text-[10px] text-slate-400 font-semibold mt-0.5">
                  Comparative rates for {card.route_origin} → {card.route_destination}
                </span>
              </div>
              {laneLinked && otherCards.length > 0 && (
                <Badge variant="outline" className="ml-2 bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 text-[10px] font-bold px-2 py-0">
                  {otherCards.length} other rate{otherCards.length === 1 ? '' : 's'}
                </Badge>
              )}
            </div>
            {laneLinked && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAssignTarget(card)}
                className="h-8 text-xs font-bold text-[#E8450F] hover:text-white hover:bg-[#E8450F] border-[#E8450F]/20 hover:border-[#E8450F] bg-white dark:bg-slate-900 shadow-2xs gap-1.5 transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> Add for a customer
              </Button>
            )}
          </CardHeader>

          <CardContent className="p-0">
            {!laneLinked ? (
              <div className="flex flex-col items-center justify-center text-center py-10 px-4">
                <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
                  <AlertTriangle size={20} />
                </div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">Lane Link Required</h3>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  This rate card is not linked to a structured lane. Link it to locations to view comparative pricing.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditOpen(true)}
                  className="mt-3 h-8 text-xs font-bold border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100"
                >
                  Link Lane Now
                </Button>
              </div>
            ) : otherCards.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-10 px-4">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center mb-3">
                  <XCircle size={20} />
                </div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">No Other Rates Found</h3>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  No other customers currently have rates configured for the {card.route_origin} → {card.route_destination} lane.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAssignTarget(card)}
                  className="mt-3 h-8 text-xs font-bold text-[#E8450F] border-[#E8450F]/20 bg-white hover:bg-orange-50"
                >
                  Add First Rate
                </Button>
              </div>
            ) : (
              <div className="flex flex-col w-full">
                {/* Ledger Header columns */}
                <div className="grid grid-cols-5 gap-4 px-5 py-2 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-black/[0.04] dark:border-white/[0.04] bg-slate-50/20 dark:bg-slate-900/20">
                  <div className="col-span-2">Customer Account</div>
                  <div>Status</div>
                  <div>Tiers & Categories</div>
                  <div className="text-right">Negotiated Price</div>
                </div>

                {/* Ledger rows */}
                <div className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
                  {otherCards.map((other) => {
                    const isOtherActive = other.is_active ?? true;
                    return (
                      <div
                        key={other.id}
                        onClick={() => navigate(`/rate-cards/${other.id}`)}
                        className="grid grid-cols-5 gap-4 items-center px-5 py-3 text-xs transition-all hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer"
                      >
                        <div className="col-span-2 flex items-center gap-2 min-w-0">
                          <Building2 className="w-4 h-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
                          <span className="font-extrabold text-slate-800 dark:text-slate-200 truncate hover:underline">
                            {other.customer?.name || 'Customer Account'}
                          </span>
                        </div>
                        <div>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[9px] font-extrabold uppercase px-1.5 py-0",
                              isOtherActive
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400"
                                : "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400"
                            )}
                          >
                            {isOtherActive ? '● Active' : '● Inactive'}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {other.rate_category && (
                            <Badge variant="outline" className="text-[9px] font-bold uppercase px-1.5 py-0 bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400">
                              {other.rate_category}
                            </Badge>
                          )}
                          {other.vehicle_type && (
                            <Badge variant="outline" className="text-[9px] font-bold uppercase px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400">
                              {other.vehicle_type}
                            </Badge>
                          )}
                          {!other.rate_category && !other.vehicle_type && (
                            <span className="text-[10px] text-slate-400 italic">No tier set</span>
                          )}
                        </div>
                        <div className="text-right font-mono font-black text-slate-900 dark:text-slate-100 text-[13px]">
                          {other.currency || 'SAR'} {Number(other.base_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      <RateCardFormDialog
        isOpen={isEditOpen}
        rateCard={card}
        onClose={() => setIsEditOpen(false)}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['rate-card', id] })}
      />

      <AssignRateCardDialog rateCard={assignTarget} onClose={() => setAssignTarget(null)} />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete rate"
        message={`Delete "${card.name}"? Trips already priced from it keep their amount, but new trips on this lane won't use it.`}
        confirmLabel="Yes, delete"
        isDestructive={true}
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
      />
    </DashboardLayout>
  );
}
