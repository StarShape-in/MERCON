import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, ArrowRight, Edit2, Trash2, MapPin, Building2, Globe2,
  FileText, AlertTriangle, FileCheck, RefreshCw, Users, Plus,
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import ConfirmModal from '@/components/ui/ConfirmModal';
import RateCardFormDialog from '@/components/rate-cards/RateCardFormDialog';
import AssignRateCardDialog from '@/components/rate-cards/AssignRateCardDialog';
import { rateCardService, RateCard } from '@/services/rateCardService';

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

  // Every other rate on the same lane — the standard one plus any customer
  // overrides. This is what makes "is this customer paying more than usual?"
  // answerable without leaving the page.
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
  const isStandard = !card.customerId;
  const laneLinked = !!card.originLocationId && !!card.destinationLocationId;

  const laneCards = laneCardsRes?.data || [];
  const standardOnLane = laneCards.find((c) => !c.customerId) || null;
  const customerCardsOnLane = laneCards.filter((c) => !!c.customerId);
  const otherCustomerCards = customerCardsOnLane.filter((c) => c.id !== card.id);

  // How this card compares to the lane's standard price — only meaningful for a
  // customer override, and only when a standard exists to compare against.
  const delta =
    !isStandard && standardOnLane
      ? Number(card.base_price) - Number(standardOnLane.base_price)
      : null;

  return (
    <DashboardLayout active="RateCards" title={card.name}>
      <div className="px-4 sm:px-6 pb-8 space-y-4 animate-fade-in w-full max-w-[1400px] mx-auto">

        {/* ── Top Header Toolbar ─────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
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
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="h-8 gap-1.5 text-xs font-semibold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-[#E8450F]' : 'text-slate-500'}`} />
              Refresh
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

        {/* ── Facts strip ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">

          <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl shadow-2xs p-4">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Price per trip</span>
            <div className="text-xl font-mono font-black text-[#E8450F] mt-1">
              {currency} {card.base_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            {delta !== null && (
              <span className={cn(
                'text-[10px] font-mono font-bold block mt-0.5',
                delta > 0 ? 'text-amber-600' : delta < 0 ? 'text-emerald-600' : 'text-slate-400'
              )}>
                {delta === 0
                  ? 'Same as the standard rate'
                  : `${delta > 0 ? '+' : '−'}${currency} ${Math.abs(delta).toLocaleString()} vs standard`}
              </span>
            )}
          </Card>

          <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl shadow-2xs p-4">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Lane</span>
            <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 mt-1 min-w-0">
              <span className="truncate">{card.route_origin}</span>
              {card.via_location && (
                <span className="shrink-0 text-[10px] font-semibold text-slate-400">via {card.via_location}</span>
              )}
              <ArrowRight className="w-3.5 h-3.5 shrink-0 text-[#E8450F]" />
              <span className="truncate">{card.route_destination}</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
              {laneLinked ? 'Linked to both locations' : 'Free text — not linked'}
            </span>
            {(card.rate_category || card.vehicle_type) && (
              <div className="flex flex-wrap items-center gap-1 mt-2">
                {card.rate_category && (
                  <Badge variant="outline" className="text-[9px] font-bold uppercase px-1.5 py-0 bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40">
                    {card.rate_category}
                  </Badge>
                )}
                {card.vehicle_type && (
                  <Badge variant="outline" className="text-[9px] font-bold uppercase px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40">
                    {card.vehicle_type}
                  </Badge>
                )}
              </div>
            )}
          </Card>

          <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl shadow-2xs p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Applies to</span>
              {card.customer?.id && (
                <span
                  onClick={() => navigate(`/customers/${card.customer?.id}`)}
                  className="text-[10px] font-bold text-cyan-600 hover:underline cursor-pointer"
                >
                  View →
                </span>
              )}
            </div>
            <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate mt-1 flex items-center gap-1.5">
              {isStandard ? (
                <><Globe2 className="w-3.5 h-3.5 shrink-0 text-[#E8450F]" /> All customers</>
              ) : (
                <><Building2 className="w-3.5 h-3.5 shrink-0 text-indigo-600" /> {card.customer?.name || 'Customer'}</>
              )}
            </div>
            <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
              {isStandard ? 'Standard rate for this lane' : 'Overrides the standard rate'}
            </span>
          </Card>

          <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl shadow-2xs p-4">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Last changed</span>
            <div className="text-sm font-mono font-extrabold text-slate-800 dark:text-slate-200 mt-1">
              {new Date(card.updatedAt || card.createdAt).toLocaleDateString()}
            </div>
            <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
              Created {new Date(card.createdAt).toLocaleDateString()}
            </span>
          </Card>

        </div>

        {/* ── Everyone else pricing this lane ────────────────────────────── */}
        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl shadow-2xs">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 py-3 px-4 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#E8450F]" />
              Other rates on {card.route_origin} → {card.route_destination}
            </CardTitle>
            {laneLinked && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAssignTarget(card)}
                className="h-7 px-2 text-[11px] font-semibold text-[#E8450F] hover:bg-[#E8450F]/10 gap-1"
              >
                <Plus className="w-3 h-3" /> Add for a customer
              </Button>
            )}
          </CardHeader>

          <CardContent className="p-4">
            {!laneLinked ? (
              <p className="py-6 text-center text-xs text-slate-500">
                Link this rate to a lane to see how it compares.
              </p>
            ) : laneCards.length <= 1 ? (
              <p className="py-6 text-center text-xs text-slate-500">
                This is the only rate on this lane.
                {isStandard && ' Every customer uses it.'}
              </p>
            ) : (
              <div className="space-y-1.5">
                {[standardOnLane, ...otherCustomerCards]
                  .filter((c): c is RateCard => !!c)
                  .map((other) => {
                    const isThisCard = other.id === card.id;
                    return (
                      <div
                        key={other.id}
                        onClick={() => !isThisCard && navigate(`/rate-cards/${other.id}`)}
                        className={cn(
                          'flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-xs transition-colors',
                          isThisCard
                            ? 'border-[#E8450F]/40 bg-[#E8450F]/5'
                            : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer'
                        )}
                      >
                        <span className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200 min-w-0">
                          {other.customerId ? (
                            <Building2 className="w-3.5 h-3.5 shrink-0 text-indigo-600" />
                          ) : (
                            <Globe2 className="w-3.5 h-3.5 shrink-0 text-[#E8450F]" />
                          )}
                          <span className="truncate">
                            {other.customerId ? other.customer?.name || 'Customer' : 'Standard — all customers'}
                          </span>
                          {isThisCard && (
                            <Badge variant="outline" className="shrink-0 text-[9px] font-bold uppercase">
                              This one
                            </Badge>
                          )}
                          {!other.is_active && (
                            <Badge variant="outline" className="shrink-0 text-[9px] font-bold uppercase text-slate-500">
                              Inactive
                            </Badge>
                          )}
                        </span>
                        <span className="shrink-0 font-mono font-extrabold text-slate-900 dark:text-slate-100">
                          {other.currency || 'SAR'} {Number(other.base_price).toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
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
