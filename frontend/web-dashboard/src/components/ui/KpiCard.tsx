import * as React from 'react'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'
import { ChartContainer } from '@/components/ui/chart'
import { cn } from '@/lib/utils'

export type KpiCardVariant = 'brand' | 'blue' | 'emerald' | 'amber' | 'purple' | 'rose' | 'slate' | 'teal'

export interface UrgencySegment {
  label?: string
  value: number
  color: string
  count?: number
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

function swatch(color: string): { className?: string; style?: React.CSSProperties } {
  if (color.startsWith('#') || color.startsWith('rgb')) {
    return { style: { backgroundColor: color } };
  }
  return { className: color };
}

export interface KpiCardProps extends Omit<React.ComponentProps<'div'>, 'title' | 'value'> {
  title?: string
  label?: string
  value: React.ReactNode
  description?: React.ReactNode
  subtitle?: React.ReactNode
  headerAction?: React.ReactNode
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
  standaloneIcon?: boolean

  // Backward compatibility props
  delta?: string | number | null
  up?: boolean | null
  color?: string
  bg?: string
  iconVariant?: 'solid' | 'light'
}

/** Strictly standardizes variant styling to Green (emerald), Red (rose), or Neutral (slate). */
const variantStyles: Record<'emerald' | 'rose' | 'slate', {
  hex: string
  iconBg: string
  iconColor: string
  valueColor: string
  activeRing: string
}> = {
  emerald: {
    hex: '#10B981',
    iconBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    valueColor: 'text-emerald-600 dark:text-emerald-400',
    activeRing: 'border-emerald-500 ring-1 ring-emerald-500/30 transition-all',
  },
  rose: {
    hex: '#EF4444',
    iconBg: 'bg-rose-50 dark:bg-rose-950/40',
    iconColor: 'text-rose-600 dark:text-rose-400',
    valueColor: 'text-rose-600 dark:text-rose-400',
    activeRing: 'border-rose-500 ring-1 ring-rose-500/30 transition-all',
  },
  slate: {
    hex: '#64748B',
    iconBg: 'bg-slate-100 dark:bg-slate-800/80',
    iconColor: 'text-slate-600 dark:text-slate-400',
    valueColor: 'text-slate-900 dark:text-slate-100',
    activeRing: 'border-slate-400 ring-1 ring-slate-400/30 transition-all',
  },
}

const trendChipStyles = {
  up: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/50',
  down: 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/50',
  neutral: 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
} as const

const trendGlyph = {
  up: '↑',
  down: '↓',
  neutral: '→',
} as const

/** Maps arbitrary non-standard segment colors strictly to green, red, or neutral slate. */
function sanitizeColor(color: string): { className?: string; style?: React.CSSProperties } {
  if (!color) return { className: 'bg-slate-400 dark:bg-slate-600' }
  
  const c = color.toLowerCase()
  if (c.includes('emerald') || c.includes('green') || c === '#10b981' || c === '#16a34a' || c === '#22c55e') {
    return { className: 'bg-emerald-500' }
  }
  if (c.includes('rose') || c.includes('red') || c.includes('danger') || c === '#ef4444' || c === '#dc2626') {
    return { className: 'bg-rose-500' }
  }
  if (color.startsWith('#')) {
    return { style: { backgroundColor: color } }
  }
  return { className: color }
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
            const s = sanitizeColor(seg.color)
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
            const s = sanitizeColor(seg.color)
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
  headerAction,
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
  const { standaloneIcon } = props

  let computedTrend = trend
  let computedTrendValue = trendValue

  if (!computedTrend && delta !== undefined && delta !== null) {
    const isUp = up === true || (typeof delta === 'number' && delta >= 0)
    computedTrend = isUp ? 'up' : 'down'
    if (!computedTrendValue) {
      computedTrendValue = typeof delta === 'number' ? `${Math.abs(delta)}%` : String(delta).replace(/^[+-]/, '')
    }
  }

  // Strictly map variant to emerald (green), rose (red), or slate (neutral)
  let normalizedVariant: 'emerald' | 'rose' | 'slate' = 'slate'
  if (variant === 'emerald' || variant === 'rose') {
    normalizedVariant = variant
  } else if (variant === 'amber') {
    normalizedVariant = 'rose' // Amber/warning mapped to rose (action required)
  } else if (color === '#10B981' || color === '#16A34A') {
    normalizedVariant = 'emerald'
  } else if (color === '#EF4444' || color === '#DC2626') {
    normalizedVariant = 'rose'
  } else if (computedTrend === 'up') {
    normalizedVariant = 'emerald'
  } else if (computedTrend === 'down') {
    normalizedVariant = 'rose'
  }

  const selectedStyle = variantStyles[normalizedVariant]

  let renderedIcon: React.ReactNode = null
  if (icon) {
    const defaultIconClass = standaloneIcon ? 'size-5 shrink-0' : 'size-[18px]'
    if (React.isValidElement(icon)) {
      renderedIcon = React.cloneElement(icon as React.ReactElement<any>, {
        className: cn(defaultIconClass, (icon.props as any).className)
      })
    } else if (typeof icon === 'function' || typeof icon === 'object') {
      renderedIcon = React.createElement(icon as React.ElementType, { className: defaultIconClass })
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
      { label: 'On-Time', value: routeHealthBreakdown.onSchedule, count: routeHealthBreakdown.onSchedule, color: '#10B981', onClick: onHealthClick && (() => onHealthClick('onSchedule')) },
      { label: 'Delayed', value: routeHealthBreakdown.delayed, count: routeHealthBreakdown.delayed, color: '#F59E0B', onClick: onHealthClick && (() => onHealthClick('delayed')) },
      { label: 'Stopped', value: routeHealthBreakdown.stopped, count: routeHealthBreakdown.stopped, color: '#EF4444', onClick: onHealthClick && (() => onHealthClick('stopped')) },
    ].filter(s => s.value > 0 || s.label === 'On-Time')
  } else if (progressSegments && progressSegments.length > 0) {
    barSegments = progressSegments.map(s => ({ label: s.label, value: s.value, color: s.color }))
  }

  const hasFooter = Boolean(barSegments || completionGauge || livePulseTrack || (pipelineStages && pipelineStages.length > 0) || normalizedChartData || customFooter)
  const hasFullBleedFooter = Boolean(customFooter || normalizedChartData)

  return (
    <div
      className={cn(
        'group relative flex min-h-[130px] flex-col gap-0 rounded-lg border border-black/[0.06] bg-white pt-4 px-4 pb-4 shadow-xs transition-all duration-150 dark:border-white/[0.08] dark:bg-card overflow-hidden',
        hasFullBleedFooter && 'pb-0',
        props.onClick && 'cursor-pointer hover:border-black/[0.14] dark:hover:border-white/[0.16]',
        isActive && selectedStyle.activeRing,
        className
      )}
      {...props}
    >
      {/* Upper content wrapper to push footer to the absolute bottom */}
      <div className="flex-1 flex flex-col">
        {/* Header: label + extra action + tinted icon */}
        <div className="flex items-center justify-between gap-2 min-h-[36px]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#9898A4] truncate">
            {displayTitle}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            {headerAction}
            {renderedIcon && (
              standaloneIcon ? (
                <span className="shrink-0 flex items-center justify-center">
                  {renderedIcon}
                </span>
              ) : (
                <span className={cn('shrink-0 flex items-center justify-center p-1.5 rounded-md', selectedStyle.iconBg, selectedStyle.iconColor)}>
                  {renderedIcon}
                </span>
              )
            )}
          </div>
        </div>

        {/* Value */}
        <div className={cn('mt-1.5 text-[30px] font-bold leading-none tracking-tight transition-colors duration-150', selectedStyle.valueColor)}>
          {value}
        </div>

        {/* Context line: trend chip */}
        {computedTrend && computedTrendValue && (
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none', trendChipStyles[computedTrend])}>
              <span aria-hidden="true">{trendGlyph[computedTrend]}</span>
              {computedTrendValue}
            </span>
          </div>
        )}
      </div>

      {/* Quiet visual footer — one style per data shape, never decorative */}
      {hasFooter && (
        customFooter ? (
          customFooter
        ) : normalizedChartData ? (
          <div className="h-10 mt-4 -mx-4 overflow-hidden rounded-b-lg">
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
        ) : (
          <div className="mt-4">
            {barSegments ? (
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
                  const s = sanitizeColor(stage.color)
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
            ) : null}
          </div>
        )
      )}
    </div>
  )
}

export default KpiCard
