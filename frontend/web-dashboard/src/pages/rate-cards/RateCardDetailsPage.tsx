import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, ArrowRight, Edit2, Trash2, MapPin, Building2,
  FileCheck, RefreshCw, Plus,
  Layers, Download, AlertTriangle, DollarSign,
  Truck, Tag, Search, ShieldCheck, Clock
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import ConfirmModal from '@/components/ui/ConfirmModal';
import RateCardFormDialog from '@/components/rate-cards/RateCardFormDialog';
import KpiCard from '@/components/ui/KpiCard';
import { rateCardService, surchargeRuleService } from '@/services/rateCardService';
import { tripService, TripStatus } from '@/services/tripService';
import { downloadCSV } from '@/utils/exportUtils';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export default function RateCardDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Trip filters state
  const [tripSearch, setTripSearch] = useState('');
  const [tripStatusFilter, setTripStatusFilter] = useState<string>('ALL');

  // 1. Fetch Rate Card details
  const { data: card, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['rate-card', id],
    queryFn: () => rateCardService.getById(id!),
    enabled: !!id,
  });

  // 2. Fetch comparative rate cards for the same lane
  const { data: laneCardsRes } = useQuery({
    queryKey: ['rate-cards', 'lane', card?.originLocationId, card?.destinationLocationId],
    queryFn: () =>
      rateCardService.getAll({
        origin_location_id: card!.originLocationId!,
        destination_location_id: card!.destinationLocationId!,
      }),
    enabled: !!card?.originLocationId && !!card?.destinationLocationId,
  });

  // 2b. Surcharge fees that apply to this lane — scoped to it specifically,
  // plus this customer's any-lane fees.
  const { data: applicableSurcharges = [] } = useQuery({
    queryKey: ['surcharge-rules', card?.customerId, card?.id],
    queryFn: () => surchargeRuleService.list({ customerId: card!.customerId, rateCardId: card!.id, active_only: true }),
    enabled: !!card?.id && !!card?.customerId,
  });

  // 3. Fetch trips that used this rate card
  const { data: tripsRes, isLoading: isTripsLoading, refetch: refetchTrips } = useQuery({
    queryKey: ['trips', 'rate-card', id],
    queryFn: () => tripService.getAll({ rate_card_id: id, per_page: 50 }),
    enabled: !!id,
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
        <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-pulse w-full max-w-[1400px] mx-auto">
          <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl w-1/3"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-7 h-96 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
            <div className="lg:col-span-5 h-96 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !card) {
    return (
      <DashboardLayout active="RateCards" title="Rate Card Details">
        <div className="px-4 sm:px-6 py-12 flex flex-col items-center justify-center text-center h-[60vh] gap-3">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">Rate Card Not Found</h2>
          <p className="text-xs text-slate-500 max-w-md">
            This rate card does not exist or may have been deleted.
          </p>
          <Button onClick={() => navigate('/rate-cards')} size="sm" className="mt-2 text-xs font-bold bg-brand text-white hover:bg-brand-hover">
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

  // Price comparison calculation
  const otherAvg =
    otherCards.length > 0
      ? otherCards.reduce((sum, c) => sum + Number(c.base_price), 0) / otherCards.length
      : null;

  const delta = otherAvg !== null ? Number(card.base_price) - otherAvg : null;

  // Price sparkline data
  const sparklineData = laneCards.length > 1
    ? laneCards.map(c => Number(c.base_price)).sort((a, b) => a - b)
    : [Number(card.base_price) * 0.95, Number(card.base_price), Number(card.base_price) * 1.05];

  // Associated Trips filtering
  const trips = tripsRes?.data || [];
  const filteredTrips = trips.filter((t) => {
    const matchesSearch =
      !tripSearch ||
      t.ref_id.toLowerCase().includes(tripSearch.toLowerCase()) ||
      (t.customer?.name && t.customer.name.toLowerCase().includes(tripSearch.toLowerCase())) ||
      (t.driver && `${t.driver.first_name} ${t.driver.last_name}`.toLowerCase().includes(tripSearch.toLowerCase()));

    const matchesStatus = tripStatusFilter === 'ALL' || t.status === tripStatusFilter;
    return matchesSearch && matchesStatus;
  });

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

  const getStatusBadge = (status: TripStatus) => {
    switch (status) {
      case 'Completed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400';
      case 'InTransit':
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400';
      case 'Dispatched':
        return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400';
      case 'Draft':
        return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300';
      case 'Cancelled':
        return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400';
      case 'Invoiced':
        return 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-400';
      case 'AtPickup':
      case 'AtDelivery':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <DashboardLayout active="RateCards" title={card.name}>
      <div className="px-4 sm:px-6 lg:px-8 pb-10 space-y-5 animate-fade-in w-full max-w-[1400px] mx-auto">

        {/* ── 1. Top Bar Header & Clean Toolbar ─────────────────────────────── */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800">

          {/* Header Title & Status Badges */}
          <div className="flex flex-wrap items-center gap-2.5 min-w-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/rate-cards')}
              className="h-8 w-8 p-0 shrink-0 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Back to Rate Cards"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>

            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight truncate">
                {card.name}
              </h1>
              <Badge
                variant="outline"
                className={`shrink-0 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400'
                    : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {isActive ? '● Active' : '● Inactive'}
              </Badge>

              {card.customer && (
                <div
                  onClick={() => navigate(`/customers/${card.customer?.id}`)}
                  className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 px-2.5 py-0.5 rounded-full hover:bg-indigo-100 cursor-pointer transition-colors"
                >
                  <Building2 className="w-3 h-3" />
                  <span>{card.customer.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Group */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                refetch();
                refetchTrips();
              }}
              disabled={isFetching}
              className="h-8 w-8 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 rounded-lg"
              title="Refresh Data"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isFetching && "animate-spin text-brand")} />
            </Button>

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
              size="sm"
              onClick={() => setIsEditOpen(true)}
              className="h-8 gap-1.5 text-xs font-bold bg-brand hover:bg-brand-hover text-white shadow-xs px-3"
            >
              <Edit2 className="w-3.5 h-3.5" /> Edit
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteModalOpen(true)}
              className="h-8 text-xs font-semibold border-rose-200 dark:border-rose-950 bg-rose-50 dark:bg-rose-950/20 text-rose-600 hover:bg-rose-100 px-3"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </Button>
          </div>
        </div>

        {/* Warning Banner if lane is unlinked */}
        {!laneLinked && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/90 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-2.5 text-xs">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
              <div>
                <span className="font-bold text-amber-900 dark:text-amber-200 mr-2">Unlinked Lane Location</span>
                <span className="text-amber-800/80 dark:text-amber-300/80">
                  Origin and destination are currently unlinked text strings. Link them to enable automatic rate matching.
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditOpen(true)}
              className="h-7 text-[11px] font-bold border-amber-300 text-amber-800 bg-white hover:bg-amber-100 shrink-0"
            >
              Link Now
            </Button>
          </div>
        )}

        {/* ── 2. Instrument-Panel KPI Cards (4 Columns) ────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">

          {/* KPI 1: Base Price */}
          <KpiCard
            title="BASE PRICE RATE"
            value={
              <span className="text-xl font-black text-brand font-mono">
                {currency} {Number(card.base_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
                    ? "Matches lane average"
                    : `${delta > 0 ? '↑' : '↓'} ${currency} ${Math.abs(delta).toLocaleString()} vs lane avg`}
                </span>
              ) : (
                <span className="text-[10px] text-slate-500">Sole rate card for this lane</span>
              )
            }
            chartData={sparklineData}
          />

          {/* KPI 2: Lane Corridor */}
          <KpiCard
            title="LANE CORRIDOR"
            value={
              <div className="flex items-center gap-1.5 min-w-0 max-w-full text-slate-900 dark:text-slate-100 mt-0.5">
                <span className="truncate max-w-[95px] text-sm font-extrabold">{card.route_origin}</span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0 text-brand" />
                <span className="truncate max-w-[95px] text-sm font-extrabold">{card.route_destination}</span>
              </div>
            }
            variant="blue"
            icon={MapPin}
            description={
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[10px] text-slate-500 font-semibold truncate">
                  {card.via_location ? `via ${card.via_location}` : laneLinked ? 'Direct linked lane' : 'Free text lane'}
                </span>
              </div>
            }
          />

          {/* KPI 3: Vehicle Type (Separately Highlighted) */}
          <KpiCard
            title="VEHICLE TYPE"
            value={
              <div className="flex items-center gap-1.5 mt-0.5">
                {card.vehicle_type ? (
                  <Badge variant="outline" className="text-xs font-extrabold bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                    <Truck className="w-3 h-3 mr-1 text-amber-600 shrink-0" />
                    <span className="truncate">{card.vehicle_type}</span>
                  </Badge>
                ) : (
                  <span className="text-xs font-semibold text-slate-500">All Vehicle Types</span>
                )}
              </div>
            }
            variant="purple"
            icon={Truck}
            description={
              <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">
                {card.vehicle_type ? 'Specified rolling stock class' : 'Applies to any fleet vehicle'}
              </span>
            }
          />

          {/* KPI 4: Rate Category (Separately Highlighted) */}
          <KpiCard
            title="RATE CATEGORY"
            value={
              <div className="flex items-center gap-1.5 mt-0.5">
                {card.rate_category ? (
                  <Badge variant="outline" className="text-xs font-extrabold bg-indigo-50 text-indigo-900 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800">
                    <Tag className="w-3 h-3 mr-1 text-indigo-600 shrink-0" />
                    <span className="truncate">{card.rate_category}</span>
                  </Badge>
                ) : (
                  <span className="text-xs font-semibold text-slate-500">Standard Freight</span>
                )}
              </div>
            }
            variant="slate"
            icon={Tag}
            description={
              <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">
                {card.rate_category ? 'Assigned contract category' : 'Default rate classification'}
              </span>
            }
          />

        </div>

        {/* ── 3. Single View Main Content Layout (2 Columns Grid) ────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

          {/* ── LEFT COLUMN (8 cols): Associated Trips Ledger ─────────────── */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-5">
            <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl shadow-2xs overflow-hidden">
              <CardHeader className="border-b border-slate-200/60 dark:border-slate-800 py-3 px-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-md">
                    <Truck className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                        Trips Using Rate Card
                      </CardTitle>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold rounded-md">
                        {trips.length}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-slate-400 font-semibold">
                      Historical and active trips dispatched on this rate
                    </p>
                  </div>
                </div>

                {/* Filter and search control toolbar */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-48">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                    <Input
                      placeholder="Search ref ID, driver..."
                      value={tripSearch}
                      onChange={(e) => setTripSearch(e.target.value)}
                      className="pl-8 text-xs h-7 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                    />
                  </div>

                  <select
                    value={tripStatusFilter}
                    onChange={(e) => setTripStatusFilter(e.target.value)}
                    className="h-7 text-xs font-bold px-2 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 shadow-2xs focus:outline-none"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="Completed">Completed</option>
                    <option value="InTransit">In Transit</option>
                    <option value="Dispatched">Dispatched</option>
                    <option value="Draft">Draft</option>
                    <option value="Invoiced">Invoiced</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {isTripsLoading ? (
                  <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-brand" /> Loading trips...
                  </div>
                ) : filteredTrips.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center py-10 px-4">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-2">
                      <Truck size={18} />
                    </div>
                    <h3 className="text-xs font-extrabold text-slate-900 dark:text-slate-100">No Trips Billed</h3>
                    <p className="text-[11px] text-slate-500 max-w-xs mt-0.5">
                      {tripSearch || tripStatusFilter !== 'ALL'
                        ? 'No trips match the applied search filter.'
                        : 'No trips have been assigned or billed using this rate card yet.'}
                    </p>
                    <Button
                      size="sm"
                      onClick={() => navigate('/trips/new')}
                      className="mt-3 h-7 text-[11px] font-bold bg-brand hover:bg-brand-hover text-white gap-1 px-3"
                    >
                      <Plus className="w-3 h-3" /> Create Trip
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200/60 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                          <th className="py-2 px-4">Trip Ref</th>
                          <th className="py-2 px-3">Driver & Vehicle</th>
                          <th className="py-2 px-3">Status</th>
                          <th className="py-2 px-3 text-right">Billing</th>
                          <th className="py-2 px-4 text-right">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {filteredTrips.map((t) => (
                          <tr
                            key={t.id}
                            onClick={() => navigate(`/trips/${t.id}`)}
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                          >
                            <td className="py-2.5 px-4 font-mono font-extrabold text-brand hover:underline">
                              {t.ref_id}
                            </td>
                            <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                              <span className="font-semibold">{t.driver ? `${t.driver.first_name} ${t.driver.last_name}` : 'Unassigned'}</span>
                              {t.vehicle && <span className="text-slate-400 text-[10px] ml-1">({t.vehicle.plate_number})</span>}
                            </td>
                            <td className="py-2.5 px-3">
                              <Badge
                                variant="outline"
                                className={cn("text-[9px] font-extrabold uppercase px-1.5 py-0", getStatusBadge(t.status))}
                              >
                                {t.status}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900 dark:text-slate-100">
                              {currency} {Number(t.billing_amount || card.base_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-4 text-right text-slate-400 font-medium text-[11px]">
                              {new Date(t.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── RIGHT COLUMN (5 cols): Specifications + Comparative Pricing ── */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-4">

            {/* Specification & System Audit Box */}
            <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl shadow-2xs overflow-hidden">
              <CardHeader className="border-b border-slate-200/60 dark:border-slate-800 py-3 px-4 bg-slate-50/50 dark:bg-slate-900/50 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                  <CardTitle className="text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    Specifications & Audit
                  </CardTitle>
                </div>
                <Badge variant="outline" className="text-[9px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-500">
                  ID: {card.id.slice(0, 8)}...
                </Badge>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">

                {/* Account & Details breakdown */}
                <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Customer Account</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100 truncate block mt-0.5">
                      {card.customer?.name || 'Customer Account'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Base Currency</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100 block mt-0.5">{currency}</span>
                  </div>
                </div>

                {/* Classifications breakdown */}
                <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Vehicle Type</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block mt-0.5">
                      {card.vehicle_type || 'Any Vehicle'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Rate Category</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block mt-0.5">
                      {card.rate_category || 'Standard Freight'}
                    </span>
                  </div>
                </div>

                {/* Location linkage IDs */}
                <div className="space-y-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400 font-semibold">Origin Location ID</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300 text-[10px] select-all bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                      {card.originLocationId || 'Not linked'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400 font-semibold">Destination Location ID</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300 text-[10px] select-all bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                      {card.destinationLocationId || 'Not linked'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400 font-semibold">Via Stop Location</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
                      {card.via_location || 'Direct Lane'}
                    </span>
                  </div>
                </div>

                {/* Audit Timestamps */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Created: {new Date(card.createdAt).toLocaleDateString()}
                  </span>
                  <span>
                    Updated: {new Date(card.updatedAt || card.createdAt).toLocaleDateString()}
                  </span>
                </div>

              </CardContent>
            </Card>

            {/* Surcharge Fees Box */}
            {applicableSurcharges.length > 0 && (
              <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl shadow-2xs overflow-hidden">
                <CardHeader className="border-b border-slate-200/60 dark:border-slate-800 py-3 px-4 bg-slate-50/50 dark:bg-slate-900/50 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-3.5 h-3.5 text-amber-500" />
                    <CardTitle className="text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                      Applicable Surcharge Fees
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-2 text-xs">
                  {applicableSurcharges.map((rule) => (
                    <div key={rule.id} className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-0 last:pb-0">
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{rule.charge_type}</span>
                        {rule.unit && <span className="text-slate-400"> ({rule.unit})</span>}
                        <span className="block text-[10px] text-slate-400">
                          {rule.rateCardId ? 'This lane only' : 'Every lane for this customer'}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {rule.currency} {Number(rule.rate).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Comparative Lane Pricing Box */}
            <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl shadow-2xs overflow-hidden">
              <CardHeader className="border-b border-slate-200/60 dark:border-slate-800 py-3 px-4 bg-slate-50/50 dark:bg-slate-900/50 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-orange-500" />
                  <CardTitle className="text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    Comparative Lane Pricing
                  </CardTitle>
                </div>
                {laneLinked && otherCards.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold rounded-md">
                    {otherCards.length}
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="p-0">
                {!laneLinked ? (
                  <div className="p-4 text-center text-xs">
                    <p className="text-slate-500 text-[11px]">Origin and destination are unlinked text strings.</p>
                  </div>
                ) : otherCards.length === 0 ? (
                  <div className="p-5 text-center text-xs text-slate-400">
                    <p className="font-semibold text-slate-700 dark:text-slate-300 text-xs">Sole rate on this lane</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">No other customer rate cards configured for {card.route_origin} → {card.route_destination}.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {otherCards.map((other) => (
                      <div
                        key={other.id}
                        onClick={() => navigate(`/rate-cards/${other.id}`)}
                        className="p-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                            {other.customer?.name || 'Customer Account'}
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {other.vehicle_type && (
                              <span className="text-[9px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1 py-0 rounded">
                                {other.vehicle_type}
                              </span>
                            )}
                            {other.rate_category && (
                              <span className="text-[9px] font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-1 py-0 rounded">
                                {other.rate_category}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono font-black text-slate-900 dark:text-slate-100 block">
                            {other.currency || 'SAR'} {Number(other.base_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline">
                            View Rate →
                          </span>
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

      <RateCardFormDialog
        isOpen={isEditOpen}
        rateCard={card}
        onClose={() => setIsEditOpen(false)}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['rate-card', id] })}
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete rate card"
        message={`Are you sure you want to delete "${card.name}"? Existing trips created with this rate will maintain their historical pricing, but no new trips will match this rate card.`}
        confirmLabel="Yes, delete rate"
        isDestructive={true}
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
      />
    </DashboardLayout>
  );
}
