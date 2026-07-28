import * as React from 'react'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer } from '@/components/ui/chart'
import { cn } from '@/lib/utils'

export type KpiCardVariant = 'brand' | 'blue' | 'emerald' | 'amber' | 'purple' | 'rose' | 'slate'

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

  // Backward compatibility props
  delta?: string | number | null
  up?: boolean | null
  color?: string
  bg?: string
  iconVariant?: 'solid' | 'light'
}

const variantStyles: Record<KpiCardVariant, {
  cardBg: string
  accentLine: string
  iconContainer: string
  textColor: string
  chartColor: string
}> = {
  brand: {
    cardBg: 'to-[#E8450F]/[0.03] dark:to-[#E8450F]/[0.015]',
    accentLine: 'bg-[#E8450F] group-hover:bg-[#E8450F]',
    iconContainer: 'bg-[#E8450F]/10 border-[#E8450F]/25 text-[#E8450F] group-hover:bg-[#E8450F]/20 group-hover:border-[#E8450F]/40',
    textColor: 'text-[#E8450F]',
    chartColor: '#E8450F',
  },
  blue: {
    cardBg: 'to-blue-500/[0.03] dark:to-blue-400/[0.015]',
    accentLine: 'bg-blue-500 group-hover:bg-blue-600',
    iconContainer: 'bg-blue-500/10 border-blue-500/25 text-blue-600 dark:text-blue-400 group-hover:bg-blue-500/20 group-hover:border-blue-500/40',
    textColor: 'text-blue-600 dark:text-blue-400',
    chartColor: '#2563EB',
  },
  emerald: {
    cardBg: 'to-emerald-500/[0.03] dark:to-emerald-400/[0.015]',
    accentLine: 'bg-emerald-500 group-hover:bg-emerald-600',
    iconContainer: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500/20 group-hover:border-emerald-500/40',
    textColor: 'text-emerald-600 dark:text-emerald-400',
    chartColor: '#16A34A',
  },
  amber: {
    cardBg: 'to-amber-500/[0.03] dark:to-amber-400/[0.015]',
    accentLine: 'bg-amber-500 group-hover:bg-amber-600',
    iconContainer: 'bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500/20 group-hover:border-amber-500/40',
    textColor: 'text-amber-600 dark:text-amber-400',
    chartColor: '#D97706',
  },
  purple: {
    cardBg: 'to-purple-500/[0.03] dark:to-purple-400/[0.015]',
    accentLine: 'bg-purple-500 group-hover:bg-purple-600',
    iconContainer: 'bg-purple-500/10 border-purple-500/25 text-purple-600 dark:text-purple-400 group-hover:bg-purple-500/20 group-hover:border-purple-500/40',
    textColor: 'text-purple-600 dark:text-purple-400',
    chartColor: '#7C3AED',
  },
  rose: {
    cardBg: 'to-rose-500/[0.03] dark:to-rose-400/[0.015]',
    accentLine: 'bg-rose-500 group-hover:bg-rose-600',
    iconContainer: 'bg-rose-500/10 border-rose-500/25 text-rose-600 dark:text-rose-400 group-hover:bg-rose-500/20 group-hover:border-rose-500/40',
    textColor: 'text-rose-600 dark:text-rose-400',
    chartColor: '#DC2626',
  },
  slate: {
    cardBg: 'to-slate-500/[0.02]',
    accentLine: 'bg-border/60 group-hover:bg-border',
    iconContainer: 'bg-muted/40 border-border/50 text-muted-foreground group-hover:border-border group-hover:text-foreground',
    textColor: 'text-muted-foreground',
    chartColor: '#94A3B8',
  },
}

const trendGlyph = {
  up: '↑',
  down: '↓',
  neutral: '→',
} as const

const defaultChartData = [
  { index: 0, value: 24 },
  { index: 1, value: 32 },
  { index: 2, value: 28 },
  { index: 3, value: 45 },
  { index: 4, value: 39 },
  { index: 5, value: 52 },
  { index: 6, value: 60 },
]

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

  // Derive color variant
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

  const rawData = (chartData && chartData.length > 0) ? chartData : defaultChartData
  const normalizedChartData = React.useMemo(() => {
    return rawData.map((item, i) => {
      if (typeof item === 'number') {
        return { index: i, value: item }
      }
      return { index: i, ...item }
    })
  }, [rawData])

  let renderedIcon: React.ReactNode = null
  if (icon) {
    if (React.isValidElement(icon)) {
      renderedIcon = React.cloneElement(icon as React.ReactElement<any>, { className: 'size-3.5' })
    } else if (typeof icon === 'function' || typeof icon === 'object') {
      renderedIcon = React.createElement(icon as React.ElementType, { className: 'size-3.5' })
    } else {
      renderedIcon = icon
    }
  }

  const gradientId = React.useId()

  return (
    <Card
      className={cn(
        'group relative rounded-lg border border-border/80 shadow-xs transition-all duration-200 hover:border-border hover:shadow-sm py-4 gap-0 bg-gradient-to-b from-card via-card',
        selectedStyle.cardBg,
        className
      )}
      {...props}
    >
      {/* Top accent rule — lights up on hover */}
      <div
        className={cn(
          'absolute inset-x-0 top-0 h-[2px] opacity-70 transition-opacity duration-200 group-hover:opacity-100',
          selectedStyle.accentLine
        )}
      />

      {/* Corner ticks — instrument-panel reference */}
      <span className="pointer-events-none absolute left-0 top-0 h-2 w-2 border-l border-t border-border/30 transition-colors duration-200 group-hover:border-border" />
      <span className="pointer-events-none absolute bottom-0 right-0 h-2 w-2 border-b border-r border-border/30 transition-colors duration-200 group-hover:border-border" />

      <CardHeader className="flex flex-row items-center justify-between gap-4 px-4 pb-2.5 pt-0">
        <CardTitle className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          {displayTitle}
        </CardTitle>
        {renderedIcon && (
          <div className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center border rounded-md transition-all duration-200",
            selectedStyle.iconContainer
          )}>
            {renderedIcon}
          </div>
        )}
      </CardHeader>

      <div className="mx-4 h-px bg-border/40" />

      <CardContent className="flex flex-col gap-1.5 px-4 pt-2.5 pb-0">
        <div className="font-mono text-2xl font-bold leading-none tracking-tight text-foreground tabular-nums">
          {value}
        </div>

        {(displayDescription || computedTrendValue) && (
          <div className="flex items-baseline gap-1.5 text-[11px]">
            {computedTrend && computedTrendValue && (
              <span className={cn('inline-flex items-center gap-0.5 font-mono font-semibold tabular-nums', selectedStyle.textColor)}>
                <span aria-hidden="true">{trendGlyph[computedTrend]}</span>
                {computedTrendValue}
              </span>
            )}
            {displayDescription && (
              <span className="text-muted-foreground">{displayDescription}</span>
            )}
          </div>
        )}

        {/* Mini Chart / Sparkline Area Chart */}
        <div className="mt-3 -mx-4 -mb-4 h-10 overflow-hidden">
          <ChartContainer
            config={{
              value: {
                label: 'Value',
                color: selectedStyle.chartColor,
              },
            }}
            className="aspect-auto h-full w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={normalizedChartData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={selectedStyle.chartColor} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={selectedStyle.chartColor} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={selectedStyle.chartColor}
                  strokeWidth={1.5}
                  fill={`url(#${gradientId})`}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  )
}

export default KpiCard
