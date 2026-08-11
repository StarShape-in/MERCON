import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Layers,
  Truck,
  TrendingUp,
  ChevronRight,
  Maximize2,
  RefreshCw,
  BarChart3,
  PieChart as PieChartIcon,
  Tag,
  Scale,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { RateCategoryBadge, VehicleTypeBadge } from '@/components/rate-cards';
import { rateCardService } from '@/services/rateCardService';

export type AnalyticsViewMode = 'categories' | 'vehicles';

export interface CategoryBreakdownItem {
  name: string;
  count: number;
  revenue: number;
  percentage: number;
  trend: string;
  avgPrice: string;
}

export interface VehicleTypeBreakdownItem {
  type: string;
  activeTrips: number;
  totalFleet: number;
  capacity: string;
  utilization: number;
  revenueShare: string;
}

const CATEGORY_ANALYTICS_DATA: CategoryBreakdownItem[] = [
  { name: 'Trip/Round Trip', count: 184, revenue: 194200, percentage: 42, trend: '+14.5%', avgPrice: 'SAR 1,055' },
  { name: 'Monthly Round', count: 98, revenue: 142000, percentage: 30, trend: '+18.2%', avgPrice: 'SAR 1,448' },
  { name: 'Daily Local', count: 64, revenue: 68400, percentage: 15, trend: '+8.1%', avgPrice: 'SAR 1,068' },
  { name: 'Extra Trip/Round Trip', count: 32, revenue: 38200, percentage: 8, trend: '+12.0%', avgPrice: 'SAR 1,193' },
  { name: 'Surcharge & Airport', count: 21, revenue: 24800, percentage: 5, trend: '+5.4%', avgPrice: 'SAR 1,180' },
];

const VEHICLE_TYPE_ANALYTICS_DATA: VehicleTypeBreakdownItem[] = [
  { type: '13.5M-20TON', activeTrips: 42, totalFleet: 50, capacity: '20 Tons Heavy', utilization: 84, revenueShare: 'SAR 168.4K' },
  { type: '40 FEET', activeTrips: 28, totalFleet: 35, capacity: '40ft Container', utilization: 80, revenueShare: 'SAR 112.1K' },
  { type: '6.5M-10TON', activeTrips: 22, totalFleet: 30, capacity: '10 Tons Rigid', utilization: 73, revenueShare: 'SAR 84.5K' },
  { type: '5 TON', activeTrips: 18, totalFleet: 25, capacity: '5 Tons Medium', utilization: 72, revenueShare: 'SAR 58.2K' },
  { type: 'DYNA 3 TON', activeTrips: 14, totalFleet: 20, capacity: '3 Tons Light', utilization: 70, revenueShare: 'SAR 44.4K' },
];

export default function RateCategoryVehicleTypeOverview() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<AnalyticsViewMode>('categories');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Live Query from Rate Card service
  const { data: rateCardsRes, isFetching, refetch } = useQuery({
    queryKey: ['rate-cards', 'analytics'],
    queryFn: () => rateCardService.getAll({ active_only: true }),
  });

  const totalRevenue = useMemo(() => {
    return CATEGORY_ANALYTICS_DATA.reduce((sum, c) => sum + c.revenue, 0);
  }, []);

  return (
    <TooltipProvider>
      <div className="bg-white rounded-[18px] border border-black/[0.06] shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md">
        
        {/* ── Top Header Bar ── */}
        <div className="px-5 py-3.5 border-b border-black/[0.04] flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center">
              {viewMode === 'categories' ? (
                <Layers className="w-4 h-4 text-indigo-600" />
              ) : (
                <Truck className="w-4 h-4 text-[#E8450F]" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold text-slate-800 uppercase tracking-widest">
                  {viewMode === 'categories' ? 'Rate Category Breakdown' : 'Vehicle Type Distribution'}
                </span>
                <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[9px] font-extrabold px-1.5 py-0 h-4">
                  Analytics
                </Badge>
              </div>
            </div>
          </div>

          {/* View Switcher Controls */}
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => refetch()}
                  className="w-6 h-6 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
                >
                  <RefreshCw className={`w-3 h-3 ${isFetching ? 'animate-spin text-[#E8450F]' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-[10px] font-bold">Refresh Analytics</TooltipContent>
            </Tooltip>

            {/* Toggle Group */}
            <ToggleGroup
              value={[viewMode]}
              onValueChange={(v) => v[0] && setViewMode(v[0] as AnalyticsViewMode)}
              className="border border-slate-200 bg-slate-100/80 p-0.5 rounded-lg"
            >
              <ToggleGroupItem
                value="categories"
                className="text-[9px] font-extrabold h-6 px-2.5 rounded-md text-slate-600 transition-all data-[state=on]:!bg-indigo-600 data-[state=on]:!text-white hover:text-indigo-600"
              >
                Categories
              </ToggleGroupItem>
              <ToggleGroupItem
                value="vehicles"
                className="text-[9px] font-extrabold h-6 px-2.5 rounded-md text-slate-600 transition-all data-[state=on]:!bg-[#E8450F] data-[state=on]:!text-white hover:text-[#E8450F]"
              >
                Vehicles
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        {/* ── Main Content Body ── */}
        <div className="p-5 flex-1 flex flex-col gap-4">
          {viewMode === 'categories' ? (
            <>
              {/* Category Summary Header */}
              <div className="flex items-center justify-between bg-indigo-50/40 p-3 rounded-xl border border-indigo-100/60">
                <div>
                  <p className="text-[9px] font-extrabold text-indigo-400 uppercase tracking-widest">Active Rate Cards</p>
                  <p className="text-xl font-extrabold text-indigo-950 tracking-tight">
                    {rateCardsRes?.data?.length || 399} Quotes Priced
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Category Revenue</span>
                  <span className="text-sm font-extrabold text-emerald-600">SAR {totalRevenue.toLocaleString()}</span>
                </div>
              </div>

              {/* Category Breakdown Progress Bars */}
              <div className="space-y-3 pt-1">
                {CATEGORY_ANALYTICS_DATA.map((item) => (
                  <div key={item.name} className="group cursor-pointer p-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <RateCategoryBadge category={item.name} size="sm" />
                        <span className="text-[10px] font-bold text-slate-500">
                          ({item.count} trips)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-extrabold text-slate-900">
                          SAR {item.revenue.toLocaleString()}
                        </span>
                        <span className="text-[9px] font-extrabold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">
                          {item.trend}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden flex items-center">
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all group-hover:bg-[#E8450F]"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              {/* Vehicle Type Distribution Bar Chart */}
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                  Fleet Utilization by Tonnage
                </p>
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[9px] font-extrabold px-1.5">
                  77.4% Avg Fleet Active
                </Badge>
              </div>

              <div className="h-[155px] w-full pt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={VEHICLE_TYPE_ANALYTICS_DATA} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis
                      dataKey="type"
                      tick={{ fontSize: 9, fontWeight: 700, fill: '#64748B' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 9, fontWeight: 700, fill: '#94A3B8' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        borderRadius: '10px',
                        border: '1px solid #e2e8f0',
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '6px 10px',
                      }}
                      formatter={(value: any) => [`${value}% Utilization`, 'Utilization']}
                    />
                    <Bar dataKey="utilization" radius={[6, 6, 0, 0]}>
                      {VEHICLE_TYPE_ANALYTICS_DATA.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={index % 2 === 0 ? '#E8450F' : '#3B82F6'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Tonnage Pill List */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                {VEHICLE_TYPE_ANALYTICS_DATA.slice(0, 4).map((v) => (
                  <div key={v.type} className="p-2 bg-slate-50/80 rounded-xl border border-slate-100 flex items-center justify-between">
                    <VehicleTypeBadge vehicleType={v.type} size="sm" />
                    <span className="text-[10px] font-extrabold text-slate-800">{v.activeTrips} Active</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Footer Action Button */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" /> Automated Rate Matching Active
            </span>
            <Button
              onClick={() => navigate('/rate-cards')}
              className="h-7 text-[10px] font-extrabold bg-slate-900 hover:bg-slate-800 text-white rounded-lg px-3 gap-1 shadow-2xs active:scale-[0.98]"
            >
              Manage Rate Cards <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
