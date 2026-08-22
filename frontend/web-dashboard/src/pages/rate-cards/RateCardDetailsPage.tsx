import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, ArrowRight, Edit2, Trash2, MapPin, Building2,
  FileCheck, RefreshCw, Plus,
  Layers, Download, AlertTriangle, DollarSign,
  Truck, Tag, Search, ShieldCheck, Clock, ExternalLink,
  ChevronRight, Copy, Check, Filter
} from 'lucide-react';
import { toast } from 'sonner';

import DashboardLayout from '@/components/layout/DashboardLayout';
import ConfirmModal from '@/components/ui/ConfirmModal';
import RateCardFormDialog from '@/components/rate-cards/RateCardFormDialog';
import KpiCard from '@/components/ui/KpiCard';
import DriverAvatar from '@/components/ui/DriverAvatar';
import StatusBadge from '@/components/ui/StatusBadge';
import { rateCardService, surchargeRuleService } from '@/services/rateCardService';
import { tripService, TripStatus, Trip } from '@/services/tripService';
import { downloadCSV } from '@/utils/exportUtils';
import { useDeploymentTimezone, formatInDeploymentTz } from '@/lib/datetime';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export default function RateCardDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const tz = useDeploymentTimezone();

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

  // 2b. Surcharge fees that apply to this lane
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
      toast.success('Rate card deleted successfully');
      navigate('/rate-cards');
    },
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(label);
    toast.success(`Copied ${label} to clipboard`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRefreshAll = async () => {
    await Promise.all([refetch(), refetchTrips()]);
    toast.info('Data refreshed');
  };

  if (isLoading) {
    return (
      <DashboardLayout active="RateCards" title="Rate Card Details">
        <div className="px-3 sm:px-5 py-6 space-y-4 animate-pulse w-full max-w-[1350px] mx-auto">
          <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl w-1/3"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-8 h-96 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
            <div className="lg:col-span-4 h-96 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
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
            This rate card does not exist or may have been removed.
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
  const deltaPct = otherAvg !== null && otherAvg > 0 ? Math.round(((Number(card.base_price) - otherAvg) / otherAvg) * 100) : null;

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
      'Contract Name': c.name,
      'Customer': c.customer?.name || 'Customer Account',
      'Route Origin': c.route_origin,
      'Route Destination': c.route_destination,
      'Via Location': c.via_location || 'Direct',
      'Base Price': c.base_price,
      'Currency': c.currency || 'SAR',
      'Status': c.is_active ? 'Active' : 'Inactive',
      'Vehicle Type': c.vehicle_type || 'Any Vehicle',
      'Rate Category': c.rate_category || 'Standard Freight',
      'Last Changed': formatInDeploymentTz(c.updatedAt || c.createdAt, tz, 'MM/dd/yyyy')
    }));
    downloadCSV(exportRows, `rate_card_${card.name.replace(/\s+/g, '_')}_export.csv`);
  };

  const getTripStatusBadge = (status: TripStatus) => {
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
    <DashboardLayout active="RateCards" title="" hideBackButton={true}>
      <div className="px-3 sm:px-5 pb-10 space-y-4 animate-fade-in w-full max-w-[1350px] mx-auto">

        {/* ── 1. Top Bar Header & Action Strip ─────────────────────────────── */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800">

          {/* Title, Badge & Scope Pills */}
          <div className="flex flex-wrap items-center gap-2.5 min-w-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/rate-cards')}
              className="h-8 w-8 p-0 shrink-0 text-brand dark:text-orange-400 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:border-brand/40"
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
                className={`shrink-0 text-[10.5px] font-bold px-2 py-0.5 rounded-full border ${
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
                  className="flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 px-2.5 py-0.5 rounded-full hover:bg-slate-200 cursor-pointer transition-colors"
                >
                  <Building2 className="w-3 h-3 text-indigo-500" />
                  <span>{card.customer.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Group */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
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
              onClick={() => navigate(`/rate-cards/${card.id}/edit`)}
              className="h-8 gap-1.5 text-xs font-bold bg-brand hover:bg-brand-hover text-white shadow-2xs px-3"
            >
              <Edit2 className="w-3.5 h-3.5" /> Edit Rate
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
          <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/90 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-2.5 text-xs shadow-2xs">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
              <div>
                <span className="font-bold text-amber-900 dark:text-amber-200 mr-2">Unlinked Lane Location</span>
                <span className="text-amber-800/80 dark:text-amber-300/80">
                  Origin and destination are currently unlinked text strings. Link them to enable automatic rate matching for dispatched trips.
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/rate-cards/${card.id}/edit`)}
              className="h-7 text-[11px] font-bold border-amber-300 text-amber-800 bg-white hover:bg-amber-100 shrink-0"
            >
              Link Now
            </Button>
          </div>
        )}

        {/* ── 2. Prominent Customer & Agreement Summary Hero Block ────────────────────── */}
        <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl shadow-xs overflow-hidden">
          <div className="p-6 sm:p-8 flex flex-col md:flex-row justify-between gap-6">
            {/* Left side: Highlighted Customer Name & Details */}
            <div className="space-y-4 flex-1">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Customer Account</span>
                <div className="flex items-center gap-3">
                  <span className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
                    <Building2 className="w-6 h-6" />
                  </span>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-none">
                    {card.customer?.name || 'Customer Account'}
                  </h2>
                </div>
              </div>

              {/* Lane Route Coordinates */}
              <div className="pt-2 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-slate-100 dark:border-slate-800">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Lane Route</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-extrabold text-sm text-slate-880 dark:text-slate-200">{card.route_origin}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-extrabold text-sm text-slate-880 dark:text-slate-200">{card.route_destination}</span>
                    {card.via_location && (
                      <span className="text-xs font-semibold text-slate-400">
                        (via {card.via_location})
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Vehicle Class</span>
                  <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 block mt-0.5">
                    {card.vehicle_type || 'Any Vehicle'}
                  </span>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Rate Category</span>
                  <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 block mt-0.5">
                    {card.rate_category || 'Standard Freight'}
                  </span>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Agreement Status</span>
                  <span className="block mt-0.5">
                    <Badge className={isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold' : 'bg-slate-100 text-slate-600 border-slate-200 font-semibold'}>
                      {isActive ? '● Active' : '● Inactive'}
                    </Badge>
                  </span>
                </div>
              </div>
            </div>

            {/* Right side: Prominent Price & System Details */}
            <div className="flex flex-col justify-between items-start md:items-end gap-4 shrink-0 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 min-w-[240px]">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase text-slate-400 block md:text-right">Price per trip</span>
                <span className="text-3xl font-black text-brand dark:text-orange-400 font-mono tracking-tight block mt-0.5">
                  {currency} {Number(card.base_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                {delta !== null && (
                  <span className={cn(
                    'text-[10.5px] font-bold block mt-1 md:text-right',
                    delta > 0 ? 'text-rose-600 dark:text-rose-400' : delta < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'
                  )}>
                    {delta === 0
                      ? "Matches lane average"
                      : `${delta > 0 ? '↑' : '↓'} ${currency} ${Math.abs(delta).toLocaleString()} (${deltaPct}% vs avg)`}
                  </span>
                )}
              </div>

              <div className="w-full flex items-center justify-between border-t border-slate-200/40 dark:border-slate-800 pt-3 mt-1 text-[10px] text-slate-400 font-medium">
                <button
                  type="button"
                  onClick={() => copyToClipboard(card.id, 'Rate Card ID')}
                  className="font-mono text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 px-2 py-0.5 rounded cursor-pointer"
                  title="Copy ID"
                >
                  {copiedId === 'Rate Card ID' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{card.id.slice(0, 8)}...</span>
                </button>
                <div className="text-right">
                  <span>Updated: {formatInDeploymentTz(card.updatedAt || card.createdAt, tz, 'MM/dd/yyyy')}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* ── 3. Main 2-Column Content Layout (8 cols / 4 cols) ────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

          {/* ── LEFT COLUMN (8 cols): Billed Trips Ledger & Surcharges ─────────────── */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-5">
            
            {/* Associated Trips Ledger */}
            <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl shadow-2xs overflow-hidden">
              <CardHeader className="border-b border-slate-200/60 dark:border-slate-800 py-3 px-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-md">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                        Billed Trips Ledger
                      </CardTitle>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold rounded-md">
                        {trips.length} {trips.length === 1 ? 'Trip' : 'Trips'}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-slate-400 font-semibold">
                      Trips dispatched and billed on this agreement
                    </p>
                  </div>
                </div>

                {/* Filter and search control toolbar */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-48">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                    <Input
                      placeholder="Search trip ID, driver..."
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
                    <RefreshCw className="w-4 h-4 animate-spin text-brand" /> Loading trips ledger...
                  </div>
                ) : filteredTrips.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center py-10 px-4">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-2">
                      <Truck size={18} />
                    </div>
                    <h3 className="text-xs font-extrabold text-slate-900 dark:text-slate-100">No Trips Found</h3>
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
                          <th className="py-2.5 px-4">Trip Ref</th>
                          <th className="py-2.5 px-3">Driver & Vehicle</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-right">Billed Amount</th>
                          <th className="py-2.5 px-4 text-right">Date</th>
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
                              <div className="flex items-center gap-2">
                                {t.driver && (
                                  <DriverAvatar
                                    src={(t.driver as any)?.avatar_url || (t.driver as any)?.avatarUrl}
                                    firstName={t.driver.first_name}
                                    lastName={t.driver.last_name}
                                    size="xs"
                                  />
                                )}
                                <div>
                                  <span className="font-bold text-slate-900 dark:text-slate-100 block truncate max-w-[140px]">
                                    {t.driver ? `${t.driver.first_name} ${t.driver.last_name}` : 'Unassigned'}
                                  </span>
                                  {t.vehicle && (
                                    <span className="text-slate-400 font-mono text-[10px]">
                                      {t.vehicle.plate_number}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <Badge
                                variant="outline"
                                className={cn("text-[9px] font-extrabold uppercase px-1.5 py-0", getTripStatusBadge(t.status))}
                              >
                                {t.status}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900 dark:text-slate-100">
                              {currency} {Number(t.billing_amount || card.base_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-4 text-right text-slate-400 font-medium text-[11px]">
                              {formatInDeploymentTz(t.createdAt, tz, 'MM/dd/yyyy')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Applicable Surcharge Fees Card */}
            {applicableSurcharges.length > 0 && (
              <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl shadow-2xs overflow-hidden">
                <CardHeader className="border-b border-slate-200/60 dark:border-slate-800 py-3 px-4 bg-slate-50/50 dark:bg-slate-900/50 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-3.5 h-3.5 text-amber-500" />
                    <CardTitle className="text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                      Applicable Surcharge Rules
                    </CardTitle>
                  </div>
                  <Badge variant="secondary" className="text-[10px] font-bold px-2 py-0.5">
                    {applicableSurcharges.length} Active Rules
                  </Badge>
                </CardHeader>
                <CardContent className="p-0 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {applicableSurcharges.map((rule) => (
                    <div key={rule.id} className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <div>
                        <span className="font-extrabold text-slate-900 dark:text-slate-100">{rule.charge_type}</span>
                        {rule.unit && <span className="text-slate-400 font-medium"> ({rule.unit})</span>}
                        <span className="block text-[10.5px] text-slate-500 mt-0.5">
                          {rule.rateCardId ? 'Lane-specific surcharge fee' : 'Account-wide surcharge fee'}
                        </span>
                      </div>
                      <span className="font-mono font-black text-slate-900 dark:text-slate-100 text-sm">
                        {rule.currency || currency} {Number(rule.rate).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

          </div>

          {/* ── RIGHT COLUMN (4 cols): Comparative Pricing ── */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-4">

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
                    {otherCards.map((other) => {
                      const otherPrice = Number(other.base_price);
                      const currentPrice = Number(card.base_price);
                      const diff = currentPrice - otherPrice;
                      const diffPct = otherPrice > 0 ? Math.round(((currentPrice - otherPrice) / otherPrice) * 100) : 0;

                      return (
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
                              {other.currency || 'SAR'} {otherPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                            <span className={`text-[9.5px] font-bold ${
                              diff > 0 ? 'text-amber-600' : diff < 0 ? 'text-emerald-600' : 'text-slate-400'
                            }`}>
                              {diff === 0 ? 'Equal Rate' : `${diff > 0 ? '+' : ''}${diffPct}%`}
                            </span>
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

      <RateCardFormDialog
        isOpen={isEditModalOpen}
        rateCard={card}
        onClose={() => setIsEditModalOpen(false)}
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
