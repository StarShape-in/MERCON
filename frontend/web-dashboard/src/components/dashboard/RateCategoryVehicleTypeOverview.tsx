import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Layers,
  Truck,
  TrendingUp,
  ChevronRight,
  RefreshCw,
  Tag,
  ArrowUpRight,
  Filter,
  Sparkles,
  BarChart2,
  SlidersHorizontal,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { RateCategoryBadge, VehicleTypeBadge } from '@/components/rate-cards';
import { rateCardService } from '@/services/rateCardService';

export interface CategoryStat {
  id: string;
  category: string;
  quoteCount: number;
  revenue: number;
  percentage: number;
  avgRate: number;
  trend: string;
  accentColor: string;
  bgColor: string;
}

const CATEGORY_STATS: CategoryStat[] = [
  {
    id: 'cat-1',
    category: 'Trip/Round Trip',
    quoteCount: 184,
    revenue: 194200,
    percentage: 42,
    avgRate: 1055,
    trend: '+14.5%',
    accentColor: '#4F46E5', // Indigo
    bgColor: 'bg-indigo-500',
  },
  {
    id: 'cat-2',
    category: 'Monthly Round',
    quoteCount: 98,
    revenue: 142000,
    percentage: 30,
    avgRate: 1448,
    trend: '+18.2%',
    accentColor: '#10B981', // Emerald
    bgColor: 'bg-emerald-500',
  },
  {
    id: 'cat-3',
    category: 'Daily Local',
    quoteCount: 64,
    revenue: 68400,
    percentage: 16,
    avgRate: 1068,
    trend: '+8.1%',
    accentColor: '#8B5CF6', // Violet
    bgColor: 'bg-violet-500',
  },
  {
    id: 'cat-4',
    category: 'Extra Trip/Round Trip',
    quoteCount: 32,
    revenue: 38200,
    percentage: 8,
    avgRate: 1193,
    trend: '+12.0%',
    accentColor: '#F59E0B', // Amber
    bgColor: 'bg-amber-500',
  },
  {
    id: 'cat-5',
    category: 'Airport & Surcharge',
    quoteCount: 21,
    revenue: 24800,
    percentage: 4,
    avgRate: 1180,
    trend: '+5.4%',
    accentColor: '#EC4899', // Pink
    bgColor: 'bg-pink-500',
  },
];

const VEHICLE_SPECS_SUMMARY = [
  { spec: '13.5M-20TON', activeTrips: 42, share: '38%' },
  { spec: '40 FEET', activeTrips: 28, share: '24%' },
  { spec: '6.5M-10TON', activeTrips: 22, share: '18%' },
  { spec: '5 TON', activeTrips: 18, share: '12%' },
  { spec: 'DYNA 3 TON', activeTrips: 14, share: '8%' },
];

export default function RateCategoryVehicleTypeOverview() {
  const navigate = useNavigate();
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);

  // Live query for active rate cards
  const { data: rateCardsRes, isFetching, refetch } = useQuery({
    queryKey: ['rate-cards', 'dashboard-minimal'],
    queryFn: () => rateCardService.getAll({ active_only: true }),
  });

  const totalRevenue = useMemo(() => {
    return CATEGORY_STATS.reduce((sum, item) => sum + item.revenue, 0);
  }, []);

  const totalQuotes = useMemo(() => {
    return rateCardsRes?.data?.length || CATEGORY_STATS.reduce((sum, item) => sum + item.quoteCount, 0);
  }, [rateCardsRes]);

  const filteredCategories = useMemo(() => {
    if (!selectedCategoryFilter) return CATEGORY_STATS;
    return CATEGORY_STATS.filter((c) => c.category === selectedCategoryFilter);
  }, [selectedCategoryFilter]);

  return (
    <TooltipProvider>
      <div className="bg-white rounded-[18px] border border-black/[0.06] shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md">
        
        {/* ── Minimal Header Bar ─────────────────────────────────────────── */}
        <div className="px-5 py-4 border-b border-slate-100/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                  Rate Category Breakdown
                </h3>
                <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 text-[9px] font-extrabold px-2 py-0.5">
                  Commercial Pricing
                </Badge>
              </div>
              <p className="text-[11px] font-medium text-slate-400">
                Priced lanes distribution & active vehicle specs breakdown
              </p>
            </div>
          </div>

          {/* Controls: Filter & Refresh & View Full List */}
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                  className="h-8 w-8 p-0 border-slate-200 bg-white text-slate-500 hover:text-slate-900 shadow-2xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-[#E8450F]' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-[10px] font-bold">Refresh pricing data</TooltipContent>
            </Tooltip>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/rate-cards')}
              className="h-8 gap-1.5 text-xs font-extrabold border-slate-200 text-slate-700 bg-white hover:bg-slate-50 shadow-2xs"
            >
              <span>Manage Rate Cards</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
            </Button>
          </div>
        </div>

        {/* ── KPI Summary Cards Bar ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 border-b border-slate-100 divide-x divide-slate-100 bg-slate-50/40">
          <div className="p-4 flex flex-col justify-between">
            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Total Rate Cards</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-extrabold text-slate-900">{totalQuotes}</span>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 rounded-full border border-emerald-200">+12%</span>
            </div>
            <span className="text-[10px] text-slate-400 font-semibold mt-0.5">Across 42 lanes</span>
          </div>

          <div className="p-4 flex flex-col justify-between">
            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Top Category</span>
            <div className="mt-1">
              <span className="text-sm font-extrabold text-slate-900 block truncate">Trip / Round Trip</span>
              <span className="text-[10px] font-semibold text-indigo-600">42% of volume (184 quotes)</span>
            </div>
          </div>

          <div className="p-4 flex flex-col justify-between">
            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Category Revenue</span>
            <div className="mt-1">
              <span className="text-xl font-extrabold text-emerald-600">SAR {(totalRevenue / 1000).toFixed(1)}K</span>
              <span className="text-[10px] text-slate-400 font-semibold block">SAR 1,180 avg rate</span>
            </div>
          </div>

          <div className="p-4 flex flex-col justify-between">
            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Active Tonnage</span>
            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
              <Badge variant="outline" className="bg-orange-50 text-[#E8450F] border-orange-200 text-[9px] font-extrabold px-1.5">
                20 TON
              </Badge>
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[9px] font-extrabold px-1.5">
                40 FEET
              </Badge>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[9px] font-extrabold px-1.5">
                10 TON
              </Badge>
            </div>
          </div>
        </div>

        {/* ── Segmented Multi-Category Ratio Bar ────────────────────────── */}
        <div className="px-5 py-3 border-b border-slate-100 bg-white">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 mb-2">
            <span>Category Volume Distribution</span>
            <span>100% Total Share</span>
          </div>

          <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden flex shadow-2xs">
            {CATEGORY_STATS.map((cat) => (
              <Tooltip key={cat.id}>
                <TooltipTrigger>
                  <div
                    style={{ width: `${cat.percentage}%`, background: cat.accentColor }}
                    className="h-full transition-all hover:brightness-110 cursor-pointer border-r border-white/40 last:border-none"
                    onClick={() =>
                      setSelectedCategoryFilter(
                        selectedCategoryFilter === cat.category ? null : cat.category
                      )
                    }
                  />
                </TooltipTrigger>
                <TooltipContent className="text-[10px] font-bold">
                  {cat.category}: {cat.percentage}% ({cat.quoteCount} quotes)
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>

        {/* ── Clean Data Table Ledger ───────────────────────────────────── */}
        <div className="p-5 flex-1 bg-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                Category Ledger & Volume
              </span>
              {selectedCategoryFilter && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedCategoryFilter(null)}
                  className="h-5 text-[10px] font-bold text-rose-600 hover:bg-rose-50 px-1.5 rounded-md"
                >
                  Reset Filter
                </Button>
              )}
            </div>
            <span className="text-[10px] font-bold text-slate-400">
              Showing {filteredCategories.length} categories
            </span>
          </div>

          <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden shadow-2xs">
            {filteredCategories.map((item) => (
              <div
                key={item.id}
                className="p-3.5 flex items-center justify-between gap-4 bg-white hover:bg-slate-50/80 transition-colors"
              >
                {/* Left: Category Badge & Details */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className="w-2.5 h-8 rounded-full shrink-0"
                    style={{ background: item.accentColor }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <RateCategoryBadge category={item.category} size="sm" />
                      <span className="text-[10px] font-bold text-slate-400">
                        {item.percentage}% Share
                      </span>
                    </div>
                    <p className="text-[11px] font-semibold text-slate-500 mt-1">
                      {item.quoteCount} active lane quotes • Average Rate: <span className="text-slate-900 font-extrabold">SAR {item.avgRate.toLocaleString()}</span>
                    </p>
                  </div>
                </div>

                {/* Right: Revenue & Trend */}
                <div className="text-right shrink-0">
                  <p className="text-xs font-extrabold text-slate-900">
                    SAR {item.revenue.toLocaleString()}
                  </p>
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-600 mt-0.5">
                    <TrendingUp className="w-3 h-3" />
                    {item.trend} vs prior
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* ── Vehicle Type Specs Quick Pills ─────────────────────────── */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-slate-500" /> Active Vehicle Specs:
            </span>

            <div className="flex items-center gap-1.5 flex-wrap">
              {VEHICLE_SPECS_SUMMARY.map((v) => (
                <div
                  key={v.spec}
                  className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center gap-1.5 text-[10px] font-semibold transition-colors hover:bg-slate-100 cursor-pointer"
                  onClick={() => navigate(`/rate-cards?vehicle_type=${encodeURIComponent(v.spec)}`)}
                >
                  <VehicleTypeBadge vehicleType={v.spec} size="sm" showIcon={false} />
                  <span className="font-extrabold text-slate-900">{v.activeTrips}</span>
                  <span className="text-[9px] text-slate-400">({v.share})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
