import * as React from 'react'
import { Area, AreaChart } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer } from '@/components/ui/chart'
import { cn } from '@/lib/utils'

export interface KpiCardProps extends Omit<React.ComponentProps<typeof Card>, 'value'> {
  title?: string
  label?: string
  value: React.ReactNode
  description?: React.ReactNode
  subtitle?: string
  icon?: React.ReactNode | React.ElementType
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  chartData?: (number | { value: number; [key: string]: any })[]
  
  // Backward compatibility
  delta?: string | number | null
  up?: boolean | null
  color?: string
  bg?: string
}

const trendColor = {
  up: 'text-emerald-600 dark:text-emerald-400',
  down: 'text-rose-600 dark:text-rose-400',
  neutral: 'text-muted-foreground',
} as const

const trendAccent = {
  up: 'bg-emerald-500/50 group-hover:bg-emerald-500',
  down: 'bg-rose-500/50 group-hover:bg-rose-500',
  neutral: 'bg-border/50 group-hover:bg-border',
} as const

const trendGlyph = {
  up: '↑',
  down: '↓',
  neutral: '→',
} as const

export default function KpiCard({
  title,
  label,
  value,
  description,
  subtitle,
  icon,
  trend,
  trendValue,
  chartData,
  className,
  delta,
  up,
  color,
  bg,
  ...props
}: KpiCardProps) {
  const displayTitle = title || label || '';
  const displayDescription = description || subtitle;
  
  let computedTrend = trend;
  let computedTrendValue = trendValue;

  if (!computedTrend && delta !== undefined && delta !== null) {
    const isUp = up === true || (typeof delta === 'number' && delta >= 0);
    computedTrend = isUp ? 'up' : 'down';
    if (!computedTrendValue) {
      computedTrendValue = typeof delta === 'number' ? `${Math.abs(delta)}%` : String(delta).replace(/^[+-]/, '');
    }
  }

  const hasChart = chartData && chartData.length > 0
  const normalizedChartData = React.useMemo(() => {
    if (!hasChart) return []
    return chartData.map((item, i) => {
      if (typeof item === 'number') {
        return { index: i, value: item }
      }
      return { index: i, ...item }
    })
  }, [chartData, hasChart])

  let renderedIcon = icon;
  if (icon && !React.isValidElement(icon)) {
    // Treat as component type — render large, tinted with the card's brand color
    renderedIcon = React.createElement(icon as React.ElementType, { className: 'h-9 w-9', style: color ? { color } : undefined });
  } else if (React.isValidElement(icon)) {
    renderedIcon = React.cloneElement(icon as React.ReactElement<any>, { className: 'h-9 w-9', style: color ? { color } : undefined });
  }

  return (
    <Card
      className={cn(
        'flex-1 w-full group relative rounded-xl bg-white border border-black/[0.06] shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 py-4 gap-0',

        className
      )}
      {...props}
    >
      {/* Top accent rule — visible but quiet by default, lights up on hover */}
      <div
        className={cn(
          'absolute inset-x-0 top-0 h-px opacity-40 transition-opacity duration-200 group-hover:opacity-100',
          computedTrend ? trendAccent[computedTrend] : 'bg-border'
        )}
      />

      {/* Corner ticks — signature detail, instrument-panel reference */}
      <span className="pointer-events-none absolute left-0 top-0 h-2 w-2 border-l border-t border-border/20 transition-colors duration-200 group-hover:border-border" />
      <span className="pointer-events-none absolute bottom-0 right-0 h-2 w-2 border-b border-r border-border/20 transition-colors duration-200 group-hover:border-border" />

      <CardHeader className="flex flex-row items-center justify-between gap-4 px-4 pb-2.5 pt-0">
        <CardTitle className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {displayTitle}
        </CardTitle>
      </CardHeader>

      <div className="mx-4 h-px bg-border/60" />

      <CardContent className="flex flex-col gap-1.5 px-4 pt-2.5 pb-0">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 font-mono text-2xl font-semibold leading-none tracking-tight text-foreground tabular-nums truncate">
            {value as any}
          </div>
          {renderedIcon && (
            <div className="shrink-0" aria-hidden="true">
              {renderedIcon as React.ReactNode}
            </div>
          )}
        </div>

        {(displayDescription || computedTrendValue) && (
          <div className="flex items-baseline gap-1.5 text-[11px]">
            {computedTrend && computedTrendValue && (
              <span className={cn('inline-flex items-center gap-0.5 font-mono font-medium tabular-nums', trendColor[computedTrend])}>
                <span aria-hidden="true">{trendGlyph[computedTrend]}</span>
                {computedTrendValue}
              </span>
            )}
            {displayDescription && (
              <span className="text-muted-foreground">{displayDescription}</span>
            )}
          </div>
        )}

        {hasChart && (
          <div className={cn(
            "mt-2 -mx-4 -mb-4 h-8 overflow-hidden",
            computedTrend === 'up' && "text-emerald-500/80 dark:text-emerald-400/80",
            computedTrend === 'down' && "text-rose-500/80 dark:text-rose-400/80",
            (!computedTrend || computedTrend === 'neutral') && "text-muted-foreground/30"
          )}>
            <ChartContainer
              config={{
                value: {
                  label: 'Value',
                },
              }}
              className="aspect-auto h-full w-full"
            >
              <AreaChart data={normalizedChartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="currentColor"
                  strokeWidth={1}
                  fill="currentColor"
                  fillOpacity={0.04}
                />
              </AreaChart>
            </ChartContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
