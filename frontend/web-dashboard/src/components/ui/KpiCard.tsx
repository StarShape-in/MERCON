import * as React from 'react'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'
import { Card } from '@/components/ui/card'
import { ChartContainer } from '@/components/ui/chart'
import { cn } from '@/lib/utils'

export type KpiCardVariant = 'brand' | 'blue' | 'emerald' | 'amber' | 'purple' | 'rose' | 'slate'

export interface UrgencySegment {
  label?: string
  value: number
  color: string
}

export interface LivePulseTrack {
  statusText: string
  subText?: string
  pulseColor?: string
}

export interface CompletionGauge {
  percentage: number
  label: string
  subtext?: string
}

export interface PipelineStage {
  name: string
  count: number
  color: string
}

export interface SemiCircleGaugeSegment {
  label: string
  count: number
  color: string
  dotColor?: string
}

export interface SemiCircleGauge {
  segments: SemiCircleGaugeSegment[]
}

export interface RouteHealthBreakdown {
  onSchedule: number
  delayed: number
  stopped: number
}

export interface KpiCardProps extends Omit<React.ComponentProps<typeof Card>, 'title' | 'value'> {
  title?: string
  label?: string
  value: React.ReactNode
  description?: React.ReactNode
  subtitle?: React.ReactNode
  icon?: React.ReactNode | React.ElementType
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  variant?: KpiCardVariant
  chartData?: (number | { value: number; [key: string]: any })[]
  progressSegments?: UrgencySegment[]
  livePulseTrack?: LivePulseTrack
  routeHealthBreakdown?: RouteHealthBreakdown
  completionGauge?: CompletionGauge
  pipelineStages?: PipelineStage[]
  semiCircleGauge?: SemiCircleGauge
  isActive?: boolean
  onStageClick?: (stageName: string) => void
  onHealthClick?: (healthType: string) => void
  customFooter?: React.ReactNode

  // Backward compatibility props
  delta?: string | number | null
  up?: boolean | null
  color?: string
  bg?: string
  iconVariant?: 'solid' | 'light'
}

const variantStyles: Record<KpiCardVariant, {
  hex: string
  iconContainer: string
  activeRing: string
}> = {
  brand: {
    hex: '#E8450F',
    iconContainer: 'bg-[#E8450F]/10 text-[#E8450F]',
    activeRing: 'shadow-[0_0_15px_rgba(232,69,15,0.18)] border-[#E8450F] scale-[1.01] transition-all',
  },
  blue: {
    hex: '#2563EB',
    iconContainer: 'bg-blue-600/10 text-blue-600 dark:text-blue-400',
    activeRing: 'shadow-[0_0_15px_rgba(37,99,235,0.18)] border-blue-500 scale-[1.01] transition-all',
  },
  emerald: {
    hex: '#16A34A',
    iconContainer: 'bg-emerald-600/10 text-emerald-600 dark:text-emerald-400',
    activeRing: 'shadow-[0_0_15px_rgba(22,163,74,0.18)] border-emerald-500 scale-[1.01] transition-all',
  },
  amber: {
    hex: '#D97706',
    iconContainer: 'bg-amber-600/10 text-amber-600 dark:text-amber-400',
    activeRing: 'shadow-[0_0_15px_rgba(217,119,6,0.18)] border-amber-500 scale-[1.01] transition-all',
  },
  purple: {
    hex: '#7C3AED',
    iconContainer: 'bg-purple-600/10 text-purple-600 dark:text-purple-400',
    activeRing: 'shadow-[0_0_15px_rgba(124,58,237,0.18)] border-purple-500 scale-[1.01] transition-all',
  },
  rose: {
    hex: '#DC2626',
    iconContainer: 'bg-rose-600/10 text-rose-600 dark:text-rose-400',
    activeRing: 'shadow-[0_0_15px_rgba(220,38,38,0.18)] border-rose-500 scale-[1.01] transition-all',
  },
  slate: {
    hex: '#52525B',
    iconContainer: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400',
    activeRing: 'shadow-[0_0_15px_rgba(82,82,91,0.18)] border-zinc-400 scale-[1.01] transition-all',
  },
}

const trendChipStyles = {
  up: 'bg-emerald-600/10 text-emerald-700 dark:text-emerald-400',
  down: 'bg-rose-600/10 text-rose-700 dark:text-rose-400',
  neutral: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400',
} as const

const trendGlyph = {
  up: '↑',
  down: '↓',
  neutral: '→',
} as const

/** Accepts either a hex color ('#10B981') or a Tailwind bg class ('bg-emerald-500'). */
function swatch(color: string): { className?: string; style?: React.CSSProperties } {
  return color.startsWith('#')
    ? { style: { backgroundColor: color } }
    : { className: color }
}

interface BarSegment {
  label?: string
  value: number
  color: string
  count?: number
  onClick?: () => void
}

/** A slim segmented distribution bar with a small dot legend underneath. */
function SegmentBar({ segments }: { segments: BarSegment[] }) {
  const visible = segments.filter(s => s.value > 0)
  const total = visible.reduce((acc, s) => acc + s.value, 0)
  const labeled = segments.filter(s => s.label)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-1.5 w-full gap-[3px] overflow-hidden">
        {total > 0 ? (
          visible.map((seg, idx) => {
            const s = swatch(seg.color)
            return (
              <div
                key={idx}
                className={cn('h-full rounded-full transition-all duration-300', s.className)}
                style={{ width: `${(seg.value / total) * 100}%`, minWidth: 6, ...s.style }}
                title={seg.label}
              />
            )
          })
        ) : (
          <div className="h-full w-full rounded-full bg-black/[0.05] dark:bg-white/[0.08]" />
        )}
      </div>
      {labeled.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-semibold leading-none text-[#6E6E80] dark:text-slate-400">
          {labeled.map((seg, idx) => {
            const s = swatch(seg.color)
            return (
              <span
                key={idx}
                onClick={seg.onClick && ((e) => { e.stopPropagation(); seg.onClick!() })}
                className={cn(
                  'flex items-center gap-1.5',
                  seg.onClick && 'cursor-pointer transition-opacity hover:opacity-70'
                )}
              >
                <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', s.className)} style={s.style} />
                {seg.label}
                {seg.count !== undefined && (
                  <span className="font-bold text-[#111111] dark:text-slate-100">{seg.count}</span>
                )}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function KpiCard({
  title,
  label,
  value,
  description,
  subtitle,
  icon,
  trend,
  trendValue,
  variant,
  chartData,
  progressSegments,
  livePulseTrack,
  routeHealthBreakdown,
  completionGauge,
  pipelineStages,
  semiCircleGauge,
  isActive,
  onStageClick,
  onHealthClick,
  customFooter,
  className,
  delta,
  up,
  color,
  bg,
  iconVariant,
  ...props
}: KpiCardProps) {
  const displayTitle = title || label || ''
  const displayDescription = description || subtitle

  let computedTrend = trend
  let computedTrendValue = trendValue

  if (!computedTrend && delta !== undefined && delta !== null) {
    const isUp = up === true || (typeof delta === 'number' && delta >= 0)
    computedTrend = isUp ? 'up' : 'down'
    if (!computedTrendValue) {
      computedTrendValue = typeof delta === 'number' ? `${Math.abs(delta)}%` : String(delta).replace(/^[+-]/, '')
    }
  }

  let activeVariant: KpiCardVariant = variant || 'brand'
  if (!variant) {
    if (color === '#E8450F') activeVariant = 'brand'
    else if (color === '#2563EB') activeVariant = 'blue'
    else if (color === '#16A34A') activeVariant = 'emerald'
    else if (color === '#D97706') activeVariant = 'amber'
    else if (computedTrend === 'up') activeVariant = 'emerald'
    else if (computedTrend === 'down') activeVariant = 'rose'
    else activeVariant = 'brand'
  }

  const selectedStyle = variantStyles[activeVariant] || variantStyles.brand

  let renderedIcon: React.ReactNode = null
  if (icon) {
    if (React.isValidElement(icon)) {
      renderedIcon = React.cloneElement(icon as React.ReactElement<any>, { className: 'size-[18px]' })
    } else if (typeof icon === 'function' || typeof icon === 'object') {
      renderedIcon = React.createElement(icon as React.ElementType, { className: 'size-[18px]' })
    } else {
      renderedIcon = icon
    }
  }

  const gradientId = React.useId()

  const normalizedChartData = React.useMemo(() => {
    if (!chartData || chartData.length === 0) return null
    return chartData.map((item, i) =>
      typeof item === 'number' ? { index: i, value: item } : { index: i, ...item }
    )
  }, [chartData])

  // Collapse every distribution-style prop into the same quiet segmented bar
  let barSegments: BarSegment[] | null = null
  if (semiCircleGauge && semiCircleGauge.segments.length > 0) {
    barSegments = semiCircleGauge.segments.map(s => ({
      label: s.label,
      value: s.count,
      count: s.count,
      color: s.color,
    }))
  } else if (routeHealthBreakdown) {
    barSegments = [
      { label: 'On-Time', value: routeHealthBreakdown.onSchedule, count: routeHealthBreakdown.onSchedule, color: '#16A34A', onClick: onHealthClick && (() => onHealthClick('onSchedule')) },
      { label: 'Delayed', value: routeHealthBreakdown.delayed, count: routeHealthBreakdown.delayed, color: '#D97706', onClick: onHealthClick && (() => onHealthClick('delayed')) },
      { label: 'Stopped', value: routeHealthBreakdown.stopped, count: routeHealthBreakdown.stopped, color: '#DC2626', onClick: onHealthClick && (() => onHealthClick('stopped')) },
    ].filter(s => s.value > 0 || s.label === 'On-Time')
  } else if (progressSegments && progressSegments.length > 0) {
    barSegments = progressSegments.map(s => ({ label: s.label, value: s.value, color: s.color }))
  }

  const hasFooter = Boolean(barSegments || completionGauge || livePulseTrack || (pipelineStages && pipelineStages.length > 0) || normalizedChartData || customFooter)

  return (
    <Card
      className={cn(
        'group relative gap-0 rounded-xl border border-black/[0.06] bg-white p-5 shadow-sm transition-all duration-150 dark:border-white/[0.08] dark:bg-card',
        props.onClick && 'cursor-pointer hover:border-black/[0.14] dark:hover:border-white/[0.16]',
        isActive && selectedStyle.activeRing,
        className
      )}
      {...props}
    >
      {/* Header: label + tinted icon */}
      <div className="flex items-start justify-between gap-3">
        <span className="pt-1 text-[10px] font-bold uppercase tracking-wider text-[#9898A4]">
          {displayTitle}
        </span>
        {renderedIcon && (
          <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', selectedStyle.iconContainer)}>
            {renderedIcon}
          </span>
        )}
      </div>

      {/* Value */}
      <div 
        className="mt-1 text-[32px] font-bold leading-none tracking-tight transition-colors duration-150"
        style={{ color: selectedStyle.hex }}
      >
        {value}
      </div>

      {/* Context line: trend chip + description */}
      {(displayDescription || (computedTrend && computedTrendValue)) && (
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          {computedTrend && computedTrendValue && (
            <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none', trendChipStyles[computedTrend])}>
              <span aria-hidden="true">{trendGlyph[computedTrend]}</span>
              {computedTrendValue}
            </span>
          )}
          {displayDescription && (
            <span className="text-xs leading-none text-[#6E6E80] dark:text-slate-400">{displayDescription}</span>
          )}
        </div>
      )}

      {/* Quiet visual footer — one style per data shape, never decorative */}
      {hasFooter && (
        <div className="mt-4">
          {customFooter ? (
            customFooter
          ) : barSegments ? (
            <SegmentBar segments={barSegments} />
          ) : completionGauge ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between text-[10px] font-semibold leading-none text-[#6E6E80] dark:text-slate-400">
                <span>{completionGauge.subtext || completionGauge.label}</span>
                <span className="text-[11px] font-bold text-[#111111] dark:text-slate-100">
                  {Math.round(completionGauge.percentage)}%
                </span>
              </div>
              <div
                className="h-1.5 w-full overflow-hidden rounded-full"
                style={{ backgroundColor: `${selectedStyle.hex}1F` }}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, completionGauge.percentage))}%`, backgroundColor: selectedStyle.hex }}
                />
              </div>
            </div>
          ) : livePulseTrack ? (
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-xs font-semibold leading-none text-[#111111] dark:text-slate-100">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ backgroundColor: selectedStyle.hex }} />
                  <span className="relative inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: selectedStyle.hex }} />
                </span>
                {livePulseTrack.statusText}
              </span>
              {livePulseTrack.subText && (
                <span className="text-[10px] leading-none text-[#9898A4]">{livePulseTrack.subText}</span>
              )}
            </div>
          ) : pipelineStages && pipelineStages.length > 0 ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              {pipelineStages.map((stage, idx) => {
                const s = swatch(stage.color)
                return (
                  <span
                    key={idx}
                    onClick={onStageClick && ((e) => { e.stopPropagation(); onStageClick(stage.name) })}
                    className={cn(
                      'flex items-center gap-1.5 text-[10px] font-semibold leading-none text-[#6E6E80] dark:text-slate-400',
                      onStageClick && 'cursor-pointer transition-opacity hover:opacity-70'
                    )}
                  >
                    <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', s.className)} style={s.style} />
                    {stage.name}
                    <span className="text-xs font-bold text-[#111111] dark:text-slate-100">{stage.count}</span>
                  </span>
                )
              })}
            </div>
          ) : normalizedChartData ? (
            <div className="h-10 mt-4 -mx-5 -mb-5 overflow-hidden rounded-b-2xl">
              <ChartContainer
                config={{ value: { label: 'Value', color: selectedStyle.hex } }}
                className="aspect-auto h-full w-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={normalizedChartData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={selectedStyle.hex} stopOpacity={0.16} />
                        <stop offset="100%" stopColor={selectedStyle.hex} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={selectedStyle.hex}
                      strokeWidth={1.8}
                      fill={`url(#${gradientId})`}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          ) : null}
        </div>
      )}
    </Card>
  )
}

export default KpiCard
