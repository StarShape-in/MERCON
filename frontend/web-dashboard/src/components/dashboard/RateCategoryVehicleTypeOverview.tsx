import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Layers,
  Truck,
  ArrowUpRight,
  RefreshCw,
  TrendingUp,
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
  accentColor: string;
}

const CATEGORY_STATS: CategoryStat[] = [
  { id: 'cat-1', category: 'Trip/Round Trip', quoteCount: 184, revenue: 194200, percentage: 42, accentColor: '#4F46E5' },
  { id: 'cat-2', category: 'Monthly Round', quoteCount: 98, revenue: 142000, percentage: 30, accentColor: '#10B981' },
  { id: 'cat-3', category: 'Daily Local', quoteCount: 64, revenue: 68400, percentage: 16, accentColor: '#8B5CF6' },
  { id: 'cat-4', category: 'Extra Trip/Round Trip', quoteCount: 32, revenue: 38200, percentage: 8, accentColor: '#F59E0B' },
  { id: 'cat-5', category: 'Airport & Surcharge', quoteCount: 21, revenue: 24800, percentage: 4, accentColor: '#EC4899' },
];

const VEHICLE_SPECS_SUMMARY = [
  { spec: '13.5M-20TON', activeTrips: 42 },
  { spec: '40 FEET', activeTrips: 28 },
  { spec: '6.5M-10TON', activeTrips: 22 },
  { spec: '5 TON', activeTrips: 18 },
  { spec: 'DYNA 3 TON', activeTrips: 14 },
];

export default function RateCategoryVehicleTypeOverview() {
  const navigate = useNavigate();

  const { data: rateCardsRes, isFetching, refetch } = useQuery({
    queryKey: ['rate-cards', 'dashboard-compact'],
    queryFn: () => rateCardService.getAll({ active_only: true }),
  });

  const totalQuotes = useMemo(() => {
    return rateCardsRes?.data?.length || 399;
  }, [rateCardsRes]);

  return (
    <TooltipProvider>
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-3.5 flex flex-col gap-3 transition-all hover:shadow-xs">
        
        {/* ── Compact Header Line ── */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
              <Layers className="w-3.5 h-3.5 stroke-[2.2]" />
            </div>
            <h4 className="text-xs font-extrabold text-slate-900 tracking-tight whitespace-nowrap">
              Rate Category Volume
            </h4>
            <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200/80 text-[9px] font-extrabold px-1.5 py-0 h-4">
              {totalQuotes} Quotes
            </Badge>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Tooltip>
              <TooltipTrigger>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refetch()}
                  className="h-6 w-6 p-0 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md"
                >
                  <RefreshCw className={`w-3 h-3 ${isFetching ? 'animate-spin text-[#E8450F]' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-[10px] font-bold">Refresh rates</TooltipContent>
            </Tooltip>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/rate-cards')}
              className="h-6 text-[10px] font-extrabold text-slate-600 hover:text-[#E8450F] hover:bg-orange-50 px-2 gap-1 rounded-md"
            >
              <span>Manage Cards</span>
              <ArrowUpRight className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* ── Slim Segment Bar ── */}
        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden flex shadow-2xs">
          {CATEGORY_STATS.map((cat) => (
            <Tooltip key={cat.id}>
              <TooltipTrigger>
                <div
                  style={{ width: `${cat.percentage}%`, background: cat.accentColor }}
                  className="h-full border-r border-white/40 last:border-none hover:brightness-110 transition-all cursor-pointer"
                />
              </TooltipTrigger>
              <TooltipContent className="text-[10px] font-bold">
                {cat.category}: {cat.percentage}% ({cat.quoteCount} quotes • SAR {(cat.revenue / 1000).toFixed(1)}K)
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        {/* ── Category Inline Summary Grid ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 pt-0.5">
          {CATEGORY_STATS.map((item) => (
            <div
              key={item.id}
              onClick={() => navigate('/rate-cards')}
              className="p-2 rounded-xl bg-slate-50/70 border border-slate-100 flex flex-col justify-between transition-colors hover:bg-slate-100/70 cursor-pointer"
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <RateCategoryBadge category={item.category} size="sm" showIcon={false} />
                <span className="text-[9px] font-extrabold text-slate-400">{item.percentage}%</span>
              </div>
              <div className="flex items-baseline justify-between text-[10px]">
                <span className="font-extrabold text-slate-900">{item.quoteCount} quotes</span>
                <span className="font-bold text-emerald-600">SAR {(item.revenue / 1000).toFixed(0)}K</span>
              </div>
            </div>
          ))}
        </div>

        {/* ── Vehicle Specs Inline Strip ── */}
        <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between gap-2 text-[10px]">
          <span className="font-bold text-slate-400 flex items-center gap-1 shrink-0">
            <Truck className="w-3 h-3 text-slate-400" /> Specs:
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {VEHICLE_SPECS_SUMMARY.map((v) => (
              <span key={v.spec} className="whitespace-nowrap">
                <VehicleTypeBadge vehicleType={v.spec} size="sm" showIcon={false} />
                <span className="ml-1 font-bold text-slate-700">({v.activeTrips})</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
