import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, ArrowRight, Edit2, Trash2, MapPin, Building2,
  FileCheck, RefreshCw, Users, Plus,
  Layers, Download, AlertTriangle, DollarSign,
  Truck, Tag, Search, ExternalLink
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import ConfirmModal from '@/components/ui/ConfirmModal';
import RateCardFormDialog from '@/components/rate-cards/RateCardFormDialog';
import AssignRateCardDialog from '@/components/rate-cards/AssignRateCardDialog';
import KpiCard from '@/components/ui/KpiCard';
import { rateCardService, RateCard } from '@/services/rateCardService';
import { tripService, TripStatus } from '@/services/tripService';
import { downloadCSV } from '@/utils/exportUtils';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export default function RateCardDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<RateCard | null>(null);

  // Trip filters state inside the Associated Trips tab
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
              <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
            ))}
          </div>
          <div className="h-80 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
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
          <Button onClick={() => navigate('/rate-cards')} size="sm" className="mt-2 text-xs font-bold bg-[#E8450F] text-white hover:bg-[#d03d0c]">
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

  // How this card compares to what other customers pay on the same lane
  const otherAvg =
    otherCards.length > 0
      ? otherCards.reduce((sum, c) => sum + Number(c.base_price), 0) / otherCards.length
      : null;

  const delta = otherAvg !== null ? Number(card.base_price) - otherAvg : null;

  // Generate price spectrum sparkline for the lane
  const sparklineData = laneCards.length > 1
    ? laneCards.map(c => Number(c.base_price)).sort((a, b) => a - b)
    : [Number(card.base_price) * 0.95, Number(card.base_price), Number(card.base_price) * 1.05];

  // Associated Trips processing
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

  // Helper for trip status badge styles
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
      <div className="px-4 sm:px-6 lg:px-8 pb-10 space-y-6 animate-fade-in w-full max-w-[1400px] mx-auto">

        {/* ── 1. Top Bar Header & Clean Toolbar ─────────────────────────────── */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">

          {/* Header Title & Status */}
          <div className="flex flex-wrap items-center gap-3 min-w-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/rate-cards')}
              className="h-9 w-9 p-0 shrink-0 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Back to Rate Cards"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>

            <div className="flex items-center gap-2.5 min-w-0">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight truncate">
                {card.name}
              </h1>
              <Badge
                variant="outline"
                className={`shrink-0 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400'
                    : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {isActive ? '● Active' : '● Inactive'}
              </Badge>
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
              className="h-9 w-9 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 rounded-lg"
              title="Refresh Data"
            >
              <RefreshCw className={cn("w-4 h-4", isFetching && "animate-spin text-[#E8450F]")} />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="h-9 gap-1.5 text-xs font-semibold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs text-slate-700 dark:text-slate-300"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" /> Export CSV
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/rate-cards/${card.id}/documents`)}
              className="h-9 gap-1.5 text-xs font-semibold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs text-slate-700 dark:text-slate-300"
            >
              <FileCheck className="w-3.5 h-3.5 text-indigo-500" /> Documents
            </Button>

            <Button
              variant="outline"
              size="sm"
              disabled={!laneLinked}
              onClick={() => setAssignTarget(card)}
              className="h-9 gap-1.5 text-xs font-semibold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs text-slate-700 dark:text-slate-300"
              title={laneLinked ? 'Apply this price to another customer' : 'Link a lane first'}
            >
              <Users className="w-3.5 h-3.5 text-emerald-600" /> Apply to Customers
            </Button>

            <Button
              size="sm"
              onClick={() => setIsEditOpen(true)}
              className="h-9 gap-1.5 text-xs font-bold bg-[#E8450F] hover:bg-[#d03d0c] text-white shadow-xs px-4"
            >
              <Edit2 className="w-3.5 h-3.5" /> Edit
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteModalOpen(true)}
              className="h-9 text-xs font-semibold border-rose-200 dark:border-rose-950 bg-rose-50 dark:bg-rose-950/20 text-rose-600 hover:bg-rose-100"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </Button>
          </div>
        </div>

        {/* Warning Banner if lane is unlinked */}
        {!laneLinked && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-3">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold text-amber-900 dark:text-amber-200">Unlinked Lane Location</p>
              <p className="text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                Origin and destination are currently text strings rather than structured system locations. Edit this rate card to link locations so trips automatically pick up negotiated rates.
              </p>
            </div>
          </div>
        )}

        {/* ── 2. Instrument-Panel KPI Cards ───────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* KPI 1: Price Per Trip */}
          <KpiCard
            title="PRICE PER TRIP"
            value={
              <span className="text-xl font-black text-[#E8450F] font-mono">
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
                  {laneLinked ? 'Linked to locations' : 'Free text origin & dest'}
                </span>
                {card.via_location && (
                  <Badge variant="outline" className="w-fit text-[9px] font-bold uppercase px-1.5 py-0 bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-950/40">
                    via {card.via_location}
                  </Badge>
                )}
              </div>
            }
          />

          {/* KPI 3: Customer Account */}
          <KpiCard
            title="CUSTOMER ACCOUNT"
            value={
              <span className="truncate text-base font-extrabold block text-slate-900 dark:text-slate-100 max-w-[200px]" title={card.customer?.name}>
                {card.customer?.name || 'Customer Account'}
              </span>
            }
            variant="purple"
            icon={Building2}
            description={
              <div className="flex flex-col gap-1 mt-0.5">
                <span className="text-[10px] text-slate-500 font-semibold">
                  Negotiated customer rate
                </span>
                {card.customer?.id && (
                  <span
                    onClick={() => navigate(`/customers/${card.customer?.id}`)}
                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 hover:underline cursor-pointer w-fit mt-0.5 flex items-center gap-1"
                  >
                    View Profile <ExternalLink className="w-2.5 h-2.5" />
                  </span>
                )}
              </div>
            }
          />

          {/* KPI 4: Vehicle Type & Rate Category Classification */}
          <KpiCard
            title="CLASSIFICATION & SPEC"
            value={
              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                {card.vehicle_type ? (
                  <Badge variant="outline" className="text-xs font-bold bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300">
                    <Truck className="w-3 h-3 mr-1 text-amber-600" />
                    {card.vehicle_type}
                  </Badge>
                ) : (
                  <span className="text-xs font-semibold text-slate-400">All Vehicles</span>
                )}
              </div>
            }
            variant="slate"
            icon={Tag}
            description={
              <div className="flex flex-col gap-1 mt-1">
                {card.rate_category ? (
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-500 font-semibold">Category:</span>
                    <Badge variant="outline" className="text-[9px] font-bold uppercase px-1.5 py-0 bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400">
                      {card.rate_category}
                    </Badge>
                  </div>
                ) : (
                  <span className="text-[10px] text-slate-400">No rate category set</span>
                )}
              </div>
            }
          />

        </div>

        {/* ── 3. Tabbed Content Section ────────────────────────────────────── */}
        <Tabs defaultValue="trips" className="w-full space-y-4">
          <TabsList className="bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-xl h-11 border border-slate-200/60 dark:border-slate-700/60 inline-flex w-full sm:w-auto">
            <TabsTrigger
              value="trips"
              className="text-xs font-bold px-4 py-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100 data-[state=active]:shadow-2xs gap-2"
            >
              <Truck className="w-3.5 h-3.5 text-blue-600" />
              <span>Trips Using Rate Card</span>
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-extrabold rounded-md">
                {trips.length}
              </Badge>
            </TabsTrigger>

            <TabsTrigger
              value="lane-ledger"
              className="text-xs font-bold px-4 py-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100 data-[state=active]:shadow-2xs gap-2"
            >
              <Layers className="w-3.5 h-3.5 text-orange-600" />
              <span>Comparative Lane Pricing</span>
              {laneLinked && otherCards.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-extrabold rounded-md">
                  {otherCards.length}
                </Badge>
              )}
            </TabsTrigger>

            <TabsTrigger
              value="specs"
              className="text-xs font-bold px-4 py-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100 data-[state=active]:shadow-2xs gap-2"
            >
              <Tag className="w-3.5 h-3.5 text-indigo-600" />
              <span>Specifications & Audit</span>
            </TabsTrigger>
          </TabsList>

          {/* ── TAB 1: Associated Trips Ledger ────────────────────────────── */}
          <TabsContent value="trips" className="mt-0">
            <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl shadow-2xs overflow-hidden">
              <CardHeader className="border-b border-slate-200/60 dark:border-slate-800 py-3.5 px-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-lg">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                      Trip Usage Ledger
                    </CardTitle>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                      Trips dispatched or billed using this rate card
                    </p>
                  </div>
                </div>

                {/* Filter and search control toolbar */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-56">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                    <Input
                      placeholder="Search trip ID, customer..."
                      value={tripSearch}
                      onChange={(e) => setTripSearch(e.target.value)}
                      className="pl-8 text-xs h-8 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                    />
                  </div>

                  <select
                    value={tripStatusFilter}
                    onChange={(e) => setTripStatusFilter(e.target.value)}
                    className="h-8 text-xs font-bold px-2.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 shadow-2xs focus:outline-none"
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
                    <RefreshCw className="w-4 h-4 animate-spin text-[#E8450F]" /> Loading trips...
                  </div>
                ) : filteredTrips.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center py-12 px-4">
                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-3">
                      <Truck size={22} />
                    </div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">No Trips Found</h3>
                    <p className="text-xs text-slate-500 max-w-sm mt-1">
                      {tripSearch || tripStatusFilter !== 'ALL'
                        ? 'No trips match the applied filter criteria.'
                        : 'No trips have been assigned or billed using this rate card yet.'}
                    </p>
                    <Button
                      size="sm"
                      onClick={() => navigate('/trips/new')}
                      className="mt-4 h-8 text-xs font-bold bg-[#E8450F] hover:bg-[#d03d0c] text-white gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Create New Trip
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200/60 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                          <th className="py-2.5 px-5">Trip Ref ID</th>
                          <th className="py-2.5 px-4">Customer</th>
                          <th className="py-2.5 px-4">Driver & Vehicle</th>
                          <th className="py-2.5 px-4">Status</th>
                          <th className="py-2.5 px-4 text-right">Billing Amount</th>
                          <th className="py-2.5 px-5 text-right">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {filteredTrips.map((t) => (
                          <tr
                            key={t.id}
                            onClick={() => navigate(`/trips/${t.id}`)}
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                          >
                            <td className="py-3 px-5 font-mono font-extrabold text-[#E8450F] hover:underline">
                              {t.ref_id}
                            </td>
                            <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
                              {t.customer?.name || 'Customer'}
                            </td>
                            <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                              {t.driver ? `${t.driver.first_name} ${t.driver.last_name}` : 'Unassigned'}
                              {t.vehicle && <span className="text-slate-400 ml-1">({t.vehicle.plate_number})</span>}
                            </td>
                            <td className="py-3 px-4">
                              <Badge
                                variant="outline"
                                className={cn("text-[9px] font-extrabold uppercase px-2 py-0.5", getStatusBadge(t.status))}
                              >
                                {t.status}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-black text-slate-900 dark:text-slate-100">
                              {currency} {Number(t.billing_amount || card.base_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-5 text-right text-slate-500 font-semibold text-[11px]">
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
          </TabsContent>

          {/* ── TAB 2: Comparative Lane Pricing Ledger ───────────────────────── */}
          <TabsContent value="lane-ledger" className="mt-0">
            <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl shadow-2xs overflow-hidden">
              <CardHeader className="border-b border-slate-200/60 dark:border-slate-800 py-3.5 px-5 flex flex-row items-center justify-between space-y-0 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 rounded-lg">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                      Lane Pricing Ledger
                    </CardTitle>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                      Comparative rates configured for {card.route_origin} → {card.route_destination}
                    </p>
                  </div>
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
                  <div className="flex flex-col items-center justify-center text-center py-12 px-4">
                    <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
                      <AlertTriangle size={22} />
                    </div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">Lane Link Required</h3>
                    <p className="text-xs text-slate-500 max-w-sm mt-1">
                      This rate card is not linked to structured locations. Link origin and destination to compare prices across customers.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditOpen(true)}
                      className="mt-4 h-8 text-xs font-bold border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100"
                    >
                      Link Lane Locations
                    </Button>
                  </div>
                ) : otherCards.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center py-12 px-4">
                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-3">
                      <Layers size={22} />
                    </div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">No Other Rates Configured</h3>
                    <p className="text-xs text-slate-500 max-w-sm mt-1">
                      No other customer currently has a rate card on the {card.route_origin} → {card.route_destination} lane.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAssignTarget(card)}
                      className="mt-4 h-8 text-xs font-bold text-[#E8450F] border-[#E8450F]/20 bg-white hover:bg-orange-50"
                    >
                      Apply Rate to Customer
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200/60 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                          <th className="py-2.5 px-5">Customer Account</th>
                          <th className="py-2.5 px-4">Status</th>
                          <th className="py-2.5 px-4">Tiers & Categories</th>
                          <th className="py-2.5 px-5 text-right">Negotiated Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {otherCards.map((other) => {
                          const isOtherActive = other.is_active ?? true;
                          return (
                            <tr
                              key={other.id}
                              onClick={() => navigate(`/rate-cards/${other.id}`)}
                              className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                            >
                              <td className="py-3 px-5 font-bold text-slate-800 dark:text-slate-200">
                                <div className="flex items-center gap-2">
                                  <Building2 className="w-4 h-4 text-indigo-500 shrink-0" />
                                  <span className="hover:underline">{other.customer?.name || 'Customer Account'}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4">
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
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex flex-wrap gap-1">
                                  {other.vehicle_type && (
                                    <Badge variant="outline" className="text-[9px] font-bold uppercase px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400">
                                      {other.vehicle_type}
                                    </Badge>
                                  )}
                                  {other.rate_category && (
                                    <Badge variant="outline" className="text-[9px] font-bold uppercase px-1.5 py-0 bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400">
                                      {other.rate_category}
                                    </Badge>
                                  )}
                                  {!other.vehicle_type && !other.rate_category && (
                                    <span className="text-[10px] text-slate-400 italic">Default rate</span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-5 text-right font-mono font-black text-slate-900 dark:text-slate-100">
                                {other.currency || 'SAR'} {Number(other.base_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── TAB 3: Specifications & Audit Details ───────────────────────── */}
          <TabsContent value="specs" className="mt-0">
            <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl shadow-2xs">
              <CardHeader className="border-b border-slate-200/60 dark:border-slate-800 py-3.5 px-5 bg-slate-50/50 dark:bg-slate-900/50">
                <CardTitle className="text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  Contract & System Attributes
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Rate Card ID</span>
                    <p className="font-mono text-slate-800 dark:text-slate-200 select-all">{card.id}</p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Base Currency</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{currency}</p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Via Location Stop</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{card.via_location || 'Direct Lane (No via stop)'}</p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Origin Location ID</span>
                    <p className="font-mono text-slate-800 dark:text-slate-200 select-all">{card.originLocationId || 'Not linked'}</p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Destination Location ID</span>
                    <p className="font-mono text-slate-800 dark:text-slate-200 select-all">{card.destinationLocationId || 'Not linked'}</p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Created Date</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{new Date(card.createdAt).toLocaleString()}</p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Last Modified</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{new Date(card.updatedAt || card.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

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
