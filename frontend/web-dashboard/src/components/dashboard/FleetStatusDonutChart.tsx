import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip } from 'recharts';
import { ShieldCheck, AlertTriangle, Radio, Cpu } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TooltipProvider } from '@/components/ui/tooltip';
import { vehicleService, PhysicalGpsStatusSummary } from '@/services/vehicleService';

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; dot: string; icon: string }
> = {
  MOVING: {
    label: 'Moving',
    color: '#10B981',
    bg: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    dot: 'bg-emerald-500 animate-pulse',
    icon: '🟢',
  },
  IDLE: {
    label: 'Idle',
    color: '#3B82F6',
    bg: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
    dot: 'bg-blue-500',
    icon: '🔵',
  },
  STOPPED: {
    label: 'Stopped',
    color: '#EF4444',
    bg: 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800',
    dot: 'bg-red-500',
    icon: '🔴',
  },
  DEVICE_NO_SIGNAL: {
    label: 'No GPS Signal',
    color: '#F59E0B',
    bg: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    dot: 'bg-amber-500',
    icon: '🟡',
  },
  DEVICE_NOT_WORKING: {
    label: 'Device Not Working',
    color: '#E11D48',
    bg: 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
    dot: 'bg-rose-600',
    icon: '⚪',
  },
  TAMPER_WEIGHT: {
    label: 'Tamper / Weight Alert',
    color: '#8B5CF6',
    bg: 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
    dot: 'bg-purple-500',
    icon: '🔷',
  },
  COMMAND: {
    label: 'Command',
    color: '#64748B',
    bg: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    dot: 'bg-slate-400',
    icon: '⚙️',
  },
  ALERT: {
    label: 'Alert',
    color: '#D97706',
    bg: 'bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800',
    dot: 'bg-orange-500',
    icon: '⚠️',
  },
  ACCIDENT: {
    label: 'Accident',
    color: '#991B1B',
    bg: 'bg-red-100 text-red-900 border-red-300 dark:bg-red-950 dark:text-red-200 dark:border-red-800',
    dot: 'bg-red-800',
    icon: '🚨',
  },
  UNKNOWN: {
    label: 'Unknown',
    color: '#94A3B8',
    bg: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
    dot: 'bg-slate-400',
    icon: '❓',
  },
};

export const FleetStatusDonutChart: React.FC = () => {
  const { data: summary, isLoading, isError } = useQuery<PhysicalGpsStatusSummary>({
    queryKey: ['physical-gps-summary'],
    queryFn: () => vehicleService.getIccesSummary(),
    refetchInterval: 15_000,
  });

  if (isLoading) {
    return (
      <Card className="border-black/[0.06] shadow-sm rounded-2xl bg-white dark:bg-slate-900 overflow-hidden p-6 flex items-center justify-center h-full min-h-[300px]">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
          <Radio className="w-4 h-4 animate-spin text-brand" />
          <span>Loading physical GPS fleet telemetry...</span>
        </div>
      </Card>
    );
  }

  if (isError || !summary) {
    return (
      <Card className="border-black/[0.06] shadow-sm rounded-2xl bg-white dark:bg-slate-900 overflow-hidden p-6 flex flex-col items-center justify-center h-full min-h-[300px] text-center">
        <AlertTriangle className="w-8 h-8 text-amber-500 mb-2" />
        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
          Physical GPS Telemetry Unavailable
        </p>
        <p className="text-[11px] text-slate-500 mt-1">
          Could not fetch live physical tracker breakdown from ICCES poller.
        </p>
      </Card>
    );
  }

  const {
    mercon_total,
    physical_gps_total,
    not_connected_total,
    reconciliation_valid,
    status_counts,
  } = summary;

  // Build chart dataset
  const chartData = Object.entries(status_counts)
    .filter(([, count]) => count > 0)
    .map(([key, count]) => {
      const config = STATUS_CONFIG[key] || STATUS_CONFIG.UNKNOWN;
      return {
        name: config.label,
        key,
        value: count,
        color: config.color,
      };
    });

  // Fallback slice if 0 devices are moving/stopped
  const displayChartData =
    chartData.length > 0
      ? chartData
      : [{ name: 'No Devices Active', key: 'UNKNOWN', value: physical_gps_total, color: '#CBD5E1' }];

  return (
    <TooltipProvider>
      <Card className="border-black/[0.06] shadow-md rounded-2xl bg-white dark:bg-slate-900 overflow-hidden h-full flex flex-col justify-between">
        <CardHeader className="p-4 pb-3 border-b border-black/[0.04] dark:border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <CardTitle className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                  Physical GPS Fleet Status
                </CardTitle>
                <Badge variant="outline" className="text-[10px] font-mono bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">
                  ICCES Telemetry
                </Badge>
              </div>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Real-time hardware status reported by ICCES physical vehicle trackers
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              {reconciliation_valid ? (
                <Badge variant="outline" className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Reconciled ({physical_gps_total})</span>
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] font-bold bg-amber-50 text-amber-800 border-amber-300 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                  <span>Count Mismatch</span>
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-3.5 flex-1 flex flex-col justify-between">
          {/* Top Disambiguation Strip */}
          <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs font-semibold">
            <div className="flex flex-col">
              <span className="text-[9px] uppercase font-bold text-slate-500 dark:text-slate-400">
                MERCON Fleet
              </span>
              <span className="text-sm font-black text-slate-900 dark:text-slate-100 font-mono">
                {mercon_total} <span className="text-[10px] font-normal text-slate-500">Vehicles</span>
              </span>
            </div>

            <div className="flex flex-col border-l border-slate-200 dark:border-slate-700 pl-2.5">
              <span className="text-[9px] uppercase font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Radio className="w-3 h-3 text-emerald-500" /> Tracked
              </span>
              <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {physical_gps_total} <span className="text-[10px] font-normal text-slate-500">Devices</span>
              </span>
            </div>

            <div className="flex flex-col border-l border-slate-200 dark:border-slate-700 pl-2.5">
              <span className="text-[9px] uppercase font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Cpu className="w-3 h-3 text-slate-400" /> Unregistered
              </span>
              <span className="text-sm font-black text-slate-700 dark:text-slate-300 font-mono">
                {not_connected_total} <span className="text-[10px] font-normal text-slate-500">Vehicles</span>
              </span>
            </div>
          </div>

          {/* Donut Chart + Categorized Legend Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
            {/* Donut Chart with Center Summary */}
            <div className="sm:col-span-5 relative h-[160px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={displayChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={68}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {displayChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(value: any, name: any) => [`${value} Vehicles`, name]}
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      color: '#F8FAFC',
                      fontSize: '12px',
                      fontWeight: 'bold',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Center Donut Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black font-mono text-slate-900 dark:text-slate-100">
                  {physical_gps_total}
                </span>
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
                  Physical GPS
                </span>
              </div>
            </div>

            {/* Provider Category Legend Breakdown Grid */}
            <div className="sm:col-span-7 grid grid-cols-2 gap-1.5 max-h-[175px] overflow-y-auto pr-1">
              {Object.entries(STATUS_CONFIG).map(([key, config]) => {
                const count = status_counts[key as keyof typeof status_counts] ?? 0;
                const isZero = count === 0;
                return (
                  <div
                    key={key}
                    className={`flex items-center justify-between p-1.5 rounded-lg border text-xs transition-colors ${
                      isZero
                        ? 'opacity-40 bg-slate-50 dark:bg-slate-800/30 border-slate-200/60 dark:border-slate-800'
                        : config.bg
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`w-2 h-2 rounded-full ${config.dot} shrink-0`} />
                      <span className="font-bold truncate text-[10px]" title={config.label}>
                        {config.label}
                      </span>
                    </div>
                    <span className="font-mono font-black text-xs shrink-0 ml-1">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

export default FleetStatusDonutChart;
